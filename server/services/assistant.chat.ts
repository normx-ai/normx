// ===================== ASSISTANT CHAT (LLM call + memory extraction) =====================

import { createHash } from 'crypto';
import Anthropic from '@anthropic-ai/sdk';
import pool from '../db';
import logger from '../logger';
import { AGENTS, KBArticle, ChatMessage, ContentBlock } from './assistant.agents';
import { searchVectoriel, searchForAgent, formatContext } from './assistant.search';
import { stripMarkdown, generateTitle, detectAgent, COMMON_RULES, CLAUDE_MODEL } from '../utils/assistant.utils';
import { getAnthropicClient } from '../utils/anthropic.client';
import { assertCanWriteConversation, Visibility } from './assistant.service';
import { getValidatedSchemaName } from '../utils/tenant.utils';
import { getTenantSettingFlag } from './tenant.service';
import { redactPii, redactMemoryEntries, RedactionResult } from './assistant.redact';

function getClient(): Anthropic {
  return getAnthropicClient();
}

export interface ChatResult {
  response: string;
  articles_references: { numero: string; titre: string }[];
  conversationId: number | null;
  agent: string;
}

export interface HandleChatOptions {
  message: string;
  conversationId: number | null;
  localUserId: string;
  typeActivite?: string;
  schema: string;
  visibility?: Visibility;
  entiteId?: number | null;
}

export async function handleChat(opts: HandleChatOptions): Promise<ChatResult> {
  const { message, typeActivite, localUserId, visibility, entiteId } = opts;
  const schema = getValidatedSchemaName(opts.schema);
  let convId = opts.conversationId;

  // Verifier l'acces a la conversation existante (private = createur seul)
  if (convId) {
    const r = await pool.query(
      `SELECT visibility, created_by_user_id FROM "${schema}".conversations WHERE id = $1`,
      [convId],
    );
    if (r.rowCount === 0) {
      throw new Error(`Conversation ${convId} introuvable`);
    }
    assertCanWriteConversation(
      { visibility: r.rows[0].visibility, created_by_user_id: r.rows[0].created_by_user_id },
      localUserId,
    );
  }

  // Creation a la volee si pas de convId
  if (!convId) {
    const convResult = await pool.query(
      `INSERT INTO "${schema}".conversations
         (created_by_user_id, titre, visibility, entite_id)
       VALUES ($1, $2, $3, $4)
       RETURNING id`,
      [localUserId, generateTitle(message), visibility ?? 'shared', entiteId ?? null],
    );
    convId = convResult.rows[0].id;
  }

  // Save user message
  if (convId) {
    await pool.query(
      `INSERT INTO "${schema}".conversation_messages (conversation_id, role, content) VALUES ($1, $2, $3)`,
      [convId, 'user', message]
    );
  }

  // Load memory : personnelle du user + partagee du tenant
  const memResult = await pool.query(
    `SELECT cle, valeur FROM "${schema}".assistant_memory
     WHERE (scope = 'personal' AND user_id = $1) OR scope = 'shared'
     ORDER BY updated_at DESC LIMIT 20`,
    [localUserId],
  );
  let memoryEntries: { cle: string; valeur: string }[] = memResult.rows;

  // Load conversation history
  let dbHistory: ChatMessage[] = [];
  if (convId) {
    const histResult = await pool.query(
      `SELECT role, content FROM "${schema}".conversation_messages WHERE conversation_id = $1 ORDER BY created_at ASC`,
      [convId]
    );
    dbHistory = histResult.rows;
  }

  // PII redaction : par defaut on redacte avant envoi a Claude. Le tenant peut
  // opter pour un envoi non redacte via settings.allow_external_llm = true
  // (consentement explicite trace en audit_log).
  const allowExternalLlm = await getTenantSettingFlag(schema, 'allow_external_llm');
  let messageForLlm = message;
  let historyForLlm = dbHistory;
  let redactionStats: RedactionResult['redactions'] = [];

  if (!allowExternalLlm) {
    const r = redactPii(message);
    messageForLlm = r.text;
    redactionStats = r.redactions;
    memoryEntries = redactMemoryEntries(memoryEntries);
    historyForLlm = dbHistory.map((h) => ({ role: h.role, content: redactPii(h.content).text }));
  }

  const memoryContext = memoryEntries.length > 0
    ? '\n\nMemoire :\n' + memoryEntries.map((m) => '- ' + m.cle + ' : ' + m.valeur).join('\n')
    : '';

  // Route to the right agent
  const agentId = detectAgent(message, typeActivite);
  const agent = AGENTS[agentId];
  logger.info('Agent selectionne: ' + agent.name + ' pour: ' + message.substring(0, 60));

  // Search relevant articles -- vectoriel (Qdrant) avec fallback mots-cles
  let relevantArticles = await searchVectoriel(agentId, message);
  const searchMode = relevantArticles ? 'vectoriel' : 'mots-cles';
  if (!relevantArticles) {
    relevantArticles = searchForAgent(agentId, message);
  }
  logger.info('Recherche ' + searchMode + ': ' + relevantArticles.length + ' resultats');
  const kbContext = relevantArticles.length > 0
    ? formatContext(relevantArticles)
    : 'Aucun article pertinent trouve dans la base de connaissance.';

  // Build system prompt
  const systemPrompt = agent.systemPrompt + '\n'
    + 'Base de connaissance disponible :\n\n'
    + kbContext + '\n'
    + memoryContext + '\n\n'
    + COMMON_RULES;

  // Build messages (versions redactees si !allowExternalLlm)
  const chatMessages: ChatMessage[] = historyForLlm.slice(-20).map((h: ChatMessage) => ({ role: h.role, content: h.content }));
  if (chatMessages.length === 0 || chatMessages[chatMessages.length - 1].content !== messageForLlm) {
    chatMessages.push({ role: 'user', content: messageForLlm });
  }

  // Audit trail : trace chaque appel sortant vers Anthropic (RGPD / TIA).
  await logExternalLlmCall(schema, localUserId, {
    allowExternalLlm,
    redactionStats,
    messageHashRedacted: createHash('sha256').update(messageForLlm).digest('hex').slice(0, 16),
  });

  const client = getClient();
  const response = await client.messages.create({
    model: CLAUDE_MODEL,
    max_tokens: 2048,
    system: systemPrompt,
    messages: chatMessages as Anthropic.MessageParam[],
  });

  let assistantMessage = stripMarkdown((response.content[0] as ContentBlock).text);

  // Extract and save memory items (scope=personal par defaut, lie au user)
  const memoryMatches = assistantMessage.matchAll(/\[MEMORISER:\s*(.+?)\s*\|\s*(.+?)\s*\]/g);
  for (const match of memoryMatches) {
    const cle = match[1].trim();
    const valeur = match[2].trim();
    const existing = await pool.query(
      `SELECT id FROM "${schema}".assistant_memory
       WHERE user_id = $1 AND cle = $2 AND scope = 'personal'`,
      [localUserId, cle],
    );
    if (existing.rows.length > 0) {
      await pool.query(
        `UPDATE "${schema}".assistant_memory SET valeur = $1, updated_at = NOW() WHERE id = $2`,
        [valeur, existing.rows[0].id],
      );
    } else {
      await pool.query(
        `INSERT INTO "${schema}".assistant_memory (user_id, cle, valeur, scope)
         VALUES ($1, $2, $3, 'personal')`,
        [localUserId, cle, valeur],
      );
    }
  }
  assistantMessage = assistantMessage.replace(/\[MEMORISER:\s*.+?\s*\|\s*.+?\s*\]/g, '').trim();

  const articlesRefs = relevantArticles.map((a: KBArticle) => ({ numero: a.numero, titre: a.titre }));

  // Save assistant response
  if (convId) {
    await pool.query(
      `INSERT INTO "${schema}".conversation_messages (conversation_id, role, content, articles_refs) VALUES ($1, $2, $3, $4)`,
      [convId, 'assistant', assistantMessage, JSON.stringify(articlesRefs)]
    );
    await pool.query(
      `UPDATE "${schema}".conversations SET updated_at = NOW() WHERE id = $1`,
      [convId]
    );
  }

  return {
    response: assistantMessage,
    articles_references: articlesRefs,
    conversationId: convId,
    agent: agent.name,
  };
}

interface LlmCallAudit {
  allowExternalLlm: boolean;
  redactionStats: RedactionResult['redactions'];
  messageHashRedacted: string;
}

/**
 * Trace chaque envoi sortant a Anthropic dans audit_log.
 * Conformite RGPD / TIA Anthropic (cf. memoire reference_tia_anthropic).
 * Erreur ici : log warn et on continue (audit ne doit pas bloquer le chat).
 */
async function logExternalLlmCall(
  schema: string,
  localUserId: string,
  audit: LlmCallAudit,
): Promise<void> {
  try {
    await pool.query(
      `INSERT INTO "${schema}".audit_log
         (utilisateur_id, action, module, entite, entite_id, details)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        localUserId,
        'external_llm_call',
        'assistant',
        'anthropic',
        audit.messageHashRedacted,
        JSON.stringify({
          provider: 'anthropic',
          model: CLAUDE_MODEL,
          allow_external_llm: audit.allowExternalLlm,
          redaction_stats: audit.redactionStats,
        }),
      ],
    );
  } catch (err) {
    logger.warn(
      'Audit external_llm_call echoue : %s',
      err instanceof Error ? err.message : String(err),
    );
  }
}
