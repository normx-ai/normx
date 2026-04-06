// ===================== ASSISTANT CHAT (LLM call + memory extraction) =====================

import Anthropic from '@anthropic-ai/sdk';
import pool from '../db';
import logger from '../logger';
import { AGENTS, KBArticle, ChatMessage, ContentBlock } from './assistant.agents';
import { searchVectoriel, searchForAgent, formatContext } from './assistant.search';
import { stripMarkdown, generateTitle, detectAgent, COMMON_RULES, CLAUDE_MODEL } from '../utils/assistant.utils';

function getClient(): Anthropic {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY non configuree');
  return new Anthropic({ apiKey });
}

export interface ChatResult {
  response: string;
  articles_references: { numero: string; titre: string }[];
  conversationId: number | null;
  agent: string;
}

export async function handleChat(
  message: string,
  conversationId: number | null,
  userId: string | null,
  typeActivite: string | undefined,
  schema: string,
): Promise<ChatResult> {
  let convId = conversationId;

  // Create conversation if needed
  if (!convId && userId) {
    const convResult = await pool.query(
      `INSERT INTO "${schema}".conversations (user_id, titre) VALUES ($1, $2) RETURNING id`,
      [userId, generateTitle(message)]
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

  // Load memory
  let memoryContext = '';
  if (userId) {
    const memResult = await pool.query(
      `SELECT cle, valeur FROM "${schema}".assistant_memory WHERE user_id = $1 ORDER BY updated_at DESC LIMIT 20`,
      [userId]
    );
    if (memResult.rows.length > 0) {
      memoryContext = '\n\nMemoire utilisateur :\n' + memResult.rows.map((m: { cle: string; valeur: string }) => '- ' + m.cle + ' : ' + m.valeur).join('\n');
    }
  }

  // Load conversation history
  let dbHistory: ChatMessage[] = [];
  if (convId) {
    const histResult = await pool.query(
      `SELECT role, content FROM "${schema}".conversation_messages WHERE conversation_id = $1 ORDER BY created_at ASC`,
      [convId]
    );
    dbHistory = histResult.rows;
  }

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

  // Build messages
  const chatMessages: ChatMessage[] = dbHistory.slice(-20).map((h: ChatMessage) => ({ role: h.role, content: h.content }));
  if (chatMessages.length === 0 || chatMessages[chatMessages.length - 1].content !== message) {
    chatMessages.push({ role: 'user', content: message });
  }

  const client = getClient();
  const response = await client.messages.create({
    model: CLAUDE_MODEL,
    max_tokens: 2048,
    system: systemPrompt,
    messages: chatMessages as Anthropic.MessageParam[],
  });

  let assistantMessage = stripMarkdown((response.content[0] as ContentBlock).text);

  // Extract and save memory items
  const memoryMatches = assistantMessage.matchAll(/\[MEMORISER:\s*(.+?)\s*\|\s*(.+?)\s*\]/g);
  for (const match of memoryMatches) {
    const cle = match[1].trim();
    const valeur = match[2].trim();
    if (userId) {
      const existing = await pool.query(
        `SELECT id FROM "${schema}".assistant_memory WHERE user_id = $1 AND cle = $2`,
        [userId, cle]
      );
      if (existing.rows.length > 0) {
        await pool.query(
          `UPDATE "${schema}".assistant_memory SET valeur = $1, updated_at = NOW() WHERE id = $2`,
          [valeur, existing.rows[0].id]
        );
      } else {
        await pool.query(
          `INSERT INTO "${schema}".assistant_memory (user_id, cle, valeur) VALUES ($1, $2, $3)`,
          [userId, cle, valeur]
        );
      }
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
