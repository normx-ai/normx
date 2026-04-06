import express, { Request, Response } from 'express';
import Anthropic from '@anthropic-ai/sdk';
import fs from 'fs';
import path from 'path';
import pool from '../db';
import logger from '../logger';
import * as qdrantModule from '../qdrant';
import { getErrorMessage } from '../utils/routeHelpers';
import { getValidatedSchemaName } from '../utils/tenant.utils';

// ===================== TYPES =====================

interface KBArticle {
  numero: string;
  titre: string;
  texte: string[] | string;
  mots_cles: string[];
  statut?: string;
  _score?: number;
  _source?: string;
}

interface AgentDef {
  name: string;
  description: string;
  kbKeys: string[];
  systemPrompt: string;
}

interface QdrantSearchResult {
  payload: {
    numero?: string;
    titre?: string;
    texte?: string;
    mots_cles?: string[];
    statut?: string;
    source?: string;
  };
  score: number;
}

interface QdrantCollectionInfo {
  points_count: number;
  vectors_count: number;
  status: string;
}

interface FonctionnementArticle {
  numero: string;
  titre: string;
  contenu: string;
  fonctionnement: string | null;
  exclusions: string[];
  controles: string[];
  commentaires: string[];
  sens: string;
}

interface ChatMessage {
  role: string;
  content: string;
}

interface ContentBlock {
  type: string;
  text: string;
}

// ===================== KNOWLEDGE BASES =====================

const kbDir = path.join(__dirname, '..', '..', 'knowledge-base');

function loadKB(filename: string): KBArticle[] {
  try {
    const raw = fs.readFileSync(path.join(kbDir, filename), 'utf-8');
    const data = JSON.parse(raw);
    const articles: KBArticle[] = data.articles || data;
    logger.info('KB chargee: ' + filename + ' (' + articles.length + ' articles)');
    return articles;
  } catch (err) {
    const msg = err && typeof err === 'object' && 'message' in err ? (err as { message: string }).message : String(err);
    logger.error('Erreur chargement ' + filename + ': ' + msg);
    return [];
  }
}

// Load all knowledge bases at startup
const KB: Record<string, KBArticle[]> = {
  sycebnl: loadKB('sycebnl_complet_2000_2179.json'),
  syscohada: loadKB('syscohada_fonctionnement_comptes.json'),
  smt: loadKB('smt_complet.json'),
  sig: loadKB('sig_chapitre_11.json'),
};

// ===================== AGENTS SPECIALISES =====================

const AGENTS: Record<string, AgentDef> = {
  syscohada: {
    name: 'Agent SYSCOHADA',
    description: 'Expert du plan comptable OHADA SYSCOHADA (entreprises commerciales)',
    kbKeys: ['syscohada', 'sig'],
    systemPrompt:
      'Tu es un agent expert en comptabilite OHADA, specialise dans le SYSCOHADA revise (Systeme Comptable OHADA pour les entreprises).\n'
      + 'Tu maitrises parfaitement :\n'
      + '- Le plan comptable SYSCOHADA (classes 1 a 9)\n'
      + '- Le fonctionnement de chaque compte (debit/credit)\n'
      + '- Les ecritures comptables courantes et de cloture\n'
      + '- Les regles d\'evaluation et de comptabilisation\n'
      + '- Les etats financiers SYSCOHADA (Bilan, Compte de resultat, TAFIRE, Etat annexe)\n'
      + '- Les operations de regularisation (provisions, amortissements, depreciations)\n'
      + '- Les operations HAO (hors activites ordinaires)\n'
      + '- Les engagements hors bilan (classe 9)\n',
  },

  sycebnl: {
    name: 'Agent SYCEBNL',
    description: 'Expert du referentiel SYCEBNL (entites a but non lucratif)',
    kbKeys: ['sycebnl'],
    systemPrompt:
      'Tu es un agent expert en comptabilite OHADA, specialise dans le SYCEBNL (Systeme Comptable des Entites a But Non Lucratif).\n'
      + 'Tu aides les utilisateurs a comprendre et appliquer les normes comptables SYCEBNL pour produire leurs etats financiers.\n'
      + 'Tu maitrises parfaitement :\n'
      + '- Le referentiel SYCEBNL et ses specificites par rapport au SYSCOHADA\n'
      + '- Les comptes specifiques aux entites a but non lucratif\n'
      + '- Les etats financiers SYCEBNL\n'
      + '- La comptabilite des associations, ONG, fondations, partis politiques, syndicats\n',
  },

  projet: {
    name: 'Agent Projets de Developpement',
    description: 'Expert en comptabilite des projets de developpement (bailleurs, ONG)',
    kbKeys: ['sycebnl'],
    systemPrompt:
      'Tu es un agent expert en comptabilite des PROJETS DE DEVELOPPEMENT selon le SYCEBNL.\n'
      + 'Tu maitrises parfaitement :\n\n'
      + 'COMPTES SPECIFIQUES AUX PROJETS :\n'
      + '- Fonds affectes aux investissements (comptes 162, 163, 164) : ressources recues des bailleurs pour financer les immobilisations du projet.\n'
      + '- Fonds d\'administration (comptes 462, 463, 464) : ressources recues des bailleurs pour couvrir les charges de fonctionnement.\n'
      + '- Quote-part fonds d\'administration transferes (compte 702) : neutralisation des charges via transfert des fonds d\'administration consommes en produits.\n'
      + '- Fonds affectes aux investissements non consommes (compte 1651) : solde des fonds d\'investissement non encore utilises.\n'
      + '- Avances de fonds a justifier (compte 161) : avances recues des bailleurs en attente de justification.\n'
      + '- Fournisseurs d\'investissements (compte 481) : dettes envers les fournisseurs d\'immobilisations du projet.\n'
      + '- Fonds d\'administration a recevoir (compte 469) : creances sur les bailleurs pour les fonds de fonctionnement.\n\n'
      + 'REGLES SPECIFIQUES :\n'
      + '- Pas d\'amortissement pour les immobilisations des projets (§2256 du SYCEBNL).\n'
      + '- Neutralisation des charges : les charges de fonctionnement sont neutralisees par le credit du compte 702.\n\n'
      + 'ETATS FINANCIERS DU PROJET (6 etats) :\n'
      + '1. Tableau Emplois-Ressources (TER)\n'
      + '2. Execution budgetaire\n'
      + '3. Reconciliation de tresorerie\n'
      + '4. Bilan\n'
      + '5. Compte d\'exploitation\n'
      + '6. Notes annexes\n\n',
  },

  smt: {
    name: 'Agent SMT',
    description: 'Expert du Systeme Minimal de Tresorerie (SMT) pour les tres petites entites',
    kbKeys: ['smt', 'syscohada'],
    systemPrompt:
      'Tu es un agent expert en comptabilite OHADA, specialise dans le Systeme Minimal de Tresorerie (SMT).\n'
      + 'Tu maitrises parfaitement :\n'
      + '- Le SMT et ses conditions d\'application (seuils : negoce < 60M FCFA, artisanal < 40M FCFA, services < 30M FCFA)\n'
      + '- La comptabilite de tresorerie (recettes/depenses) vs la comptabilite en partie double\n'
      + '- Le journal unique de tresorerie (ventilation recettes : Ventes, Autres ; ventilation depenses : Materiel, Achats marchandises, Achats matieres, Loyers, Salaires, Impots, Autres)\n'
      + '- Le journal de suivi des creances impayees et le journal de suivi des dettes a payer\n'
      + '- Les etats financiers SMT : Bilan (Actif: GA Immobilisations, GB Stocks, GC Adherents/Debiteurs, GD Caisse, GE Banque ; Passif: HA Dotations, HB Resultat, HC Autres fonds propres, HD Fournisseurs/Crediteurs)\n'
      + '- Le Compte de resultat SMT (Recettes: KA principales, KB autres ; Depenses: JA Achats, JB Loyers, JC Salaires, JD Impots, JE Interets, JF Autres, JG Amortissements)\n'
      + '- Les notes annexes SMT : Tableau de suivi du materiel/mobilier/cautions, Etat des stocks, Etat des creances et dettes non echues\n'
      + '- L\'inventaire extra-comptable de fin d\'exercice (creances, dettes, stocks, immobilisations, emprunts)\n'
      + '- L\'amortissement lineaire sans prorata temporis\n'
      + '- Le passage du SMT au systeme normal ou allege\n',
  },

  revision: {
    name: 'Agent Revision Comptable',
    description: 'Expert en revision et controle des comptes',
    kbKeys: ['syscohada', 'sycebnl'],
    systemPrompt:
      'Tu es un agent expert en REVISION et CONTROLE DES COMPTES selon les normes OHADA.\n'
      + 'Tu maitrises parfaitement :\n'
      + '- La demarche de revision des comptes par cycle (capitaux propres, immobilisations, stocks, tiers, tresorerie, etc.)\n'
      + '- La detection des anomalies comptables et des ecarts\n'
      + '- Les ecritures de regularisation et de correction\n'
      + '- Le controle de coherence entre balance N et N-1\n'
      + '- Les procedures de confirmation des tiers\n'
      + '- Le rapprochement bancaire\n'
      + '- Le controle des amortissements et provisions\n'
      + '- La verification de la cut-off (separation des exercices)\n'
      + '- Les ajustements de cloture\n\n'
      + 'Quand tu detectes un ecart ou une anomalie, propose systematiquement :\n'
      + '1. L\'analyse de l\'ecart (cause probable)\n'
      + '2. L\'ecriture de regularisation (Debit/Credit avec montants)\n'
      + '3. Les points de vigilance pour le commissaire aux comptes\n',
  },
};

// ===================== AGENT ROUTING =====================

function detectAgent(message: string, typeActivite: string | undefined): string {
  const msg = message.toLowerCase();

  // Explicit type from frontend
  if (typeActivite === 'smt') return 'smt';
  if (typeActivite === 'projet_developpement') return 'projet';

  // Revision keywords
  const revisionTerms = ['revision', 'reviser', 'controle des comptes', 'anomalie', 'ecart',
    'regularisation', 'rapprochement', 'cut-off', 'cloture', 'ajustement',
    'commissaire', 'audit', 'verification', 'balance n-1', 'balance n',
    'cycle de revision', 'confirmation des tiers', 'circularisation'];
  if (revisionTerms.some(t => msg.includes(t))) return 'revision';

  // SMT keywords
  const smtTerms = ['smt', 'systeme minimal', 'tresorerie minimale', 'journal de tresorerie',
    'tres petite entite', 'comptabilite de tresorerie', 'recettes depenses',
    'creances impayees', 'dettes a payer', 'inventaire extra-comptable',
    'seuil 60 millions', 'seuil 40 millions', 'seuil 30 millions'];
  if (smtTerms.some(t => msg.includes(t))) return 'smt';

  // SYCEBNL keywords
  const sycebnlTerms = ['sycebnl', 'but non lucratif', 'association', 'ong', 'fondation',
    'parti politique', 'syndicat', 'projet de developpement', 'bailleur',
    'fonds affectes', 'fonds d\'administration'];
  if (sycebnlTerms.some(t => msg.includes(t))) return 'sycebnl';

  // SYSCOHADA keywords (default for accounting questions)
  const syscohadaTerms = ['syscohada', 'plan comptable', 'compte 1', 'compte 2', 'compte 3',
    'compte 4', 'compte 5', 'compte 6', 'compte 7', 'compte 8', 'compte 9',
    'ecriture comptable', 'fonctionnement du compte', 'classe 1', 'classe 2',
    'classe 3', 'classe 4', 'classe 5', 'classe 6', 'classe 7', 'classe 8',
    'immobilisation', 'amortissement', 'provision', 'tresorerie', 'fournisseur',
    'client', 'tva', 'capital', 'emprunt', 'stock', 'vente', 'achat',
    'charge', 'produit', 'resultat', 'bilan', 'hao', 'cession'];
  if (syscohadaTerms.some(t => msg.includes(t))) return 'syscohada';

  // Default: SYSCOHADA for general accounting, SYCEBNL if entity type suggests it
  if (typeActivite && ['association', 'ong', 'fondation', 'parti_politique', 'syndicat'].includes(typeActivite)) {
    return 'sycebnl';
  }

  return 'syscohada';
}

// ===================== SEARCH ENGINE =====================

function searchArticles(articles: KBArticle[], query: string, maxResults = 8): KBArticle[] {
  const queryLower = query.toLowerCase();
  const terms = queryLower.split(/\s+/).filter(t => t.length > 2);

  const scored = articles.map(article => {
    let score = 0;
    const texteStr = Array.isArray(article.texte) ? article.texte.join(' ') : (article.texte || '');
    const searchText = (article.numero || '') + ' ' + (article.titre || '') + ' ' + texteStr + ' ' + (article.mots_cles || []).join(' ');
    const searchLower = searchText.toLowerCase();

    for (const term of terms) {
      if ((article.titre || '').toLowerCase().includes(term)) score += 10;
      if ((article.mots_cles || []).some(k => k.toLowerCase().includes(term))) score += 5;
      const matches = (searchLower.match(new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length;
      score += Math.min(matches, 5);
    }
    if (queryLower.includes(String(article.numero))) score += 20;
    return { article, score };
  });

  return scored
    .filter(s => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, maxResults)
    .map(s => s.article);
}

function searchForAgent(agentId: string, query: string): KBArticle[] {
  const agent = AGENTS[agentId];
  if (!agent) return [];

  let allArticles: KBArticle[] = [];
  for (const key of agent.kbKeys) {
    if (KB[key]) allArticles = allArticles.concat(KB[key]);
  }

  return searchArticles(allArticles, query);
}

// ===================== RECHERCHE VECTORIELLE (QDRANT) =====================

let qdrantReady = false;

async function initQdrant(): Promise<void> {
  try {
    const health = await qdrantModule.healthCheck();
    if (health.ok) {
      qdrantReady = true;
      logger.info('Qdrant connecte — recherche vectorielle activee');
    } else {
      logger.warn('Qdrant non disponible — fallback recherche par mots-cles');
    }
  } catch (err) {
    const msg = err && typeof err === 'object' && 'message' in err ? (err as { message: string }).message : String(err);
    logger.warn('Qdrant non disponible: ' + msg + ' — fallback mots-cles');
  }
}
initQdrant();

async function searchVectoriel(agentId: string, query: string, maxResults = 8): Promise<KBArticle[] | null> {
  if (!qdrantReady) return null; // fallback

  try {
    // Filtrer par source selon l'agent
    const agent = AGENTS[agentId];
    const sourcesFilter: string[] = [];
    for (const key of agent.kbKeys) {
      sourcesFilter.push(key);
      if (key === 'syscohada') sourcesFilter.push('syscohada_enriched');
    }

    const filter = {
      should: sourcesFilter.map(s => ({
        key: 'source',
        match: { value: s },
      })),
    };

    const results = await qdrantModule.search('normx_kb', query, maxResults, filter) as QdrantSearchResult[];

    if (!results || results.length === 0) return null;

    // Convertir en format article compatible
    return results.map((r: QdrantSearchResult) => ({
      numero: r.payload.numero || '',
      titre: r.payload.titre || '',
      texte: r.payload.texte ? [r.payload.texte] : [],
      mots_cles: r.payload.mots_cles || [],
      statut: r.payload.statut || 'actif',
      _score: r.score,
      _source: r.payload.source,
    }));
  } catch (err) {
    const msg = err && typeof err === 'object' && 'message' in err ? (err as { message: string }).message : String(err);
    logger.warn('Erreur recherche Qdrant: ' + msg + ' — fallback mots-cles');
    return null;
  }
}

function formatContext(articles: KBArticle[]): string {
  return articles.map(a => {
    const texteStr = Array.isArray(a.texte) ? a.texte.join('\n') : (a.texte || '');
    let text = '--- ' + a.numero + ': ' + a.titre + ' ---\n' + texteStr;
    if (a.mots_cles && a.mots_cles.length > 0) {
      text += '\nMots-cles: ' + a.mots_cles.join(', ');
    }
    return text;
  }).join('\n\n');
}

// ===================== UTILS =====================

function getClient(): Anthropic {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY non configuree');
  return new Anthropic({ apiKey });
}

function stripMarkdown(text: string): string {
  return text.replace(/\*\*/g, '').replace(/##\s?/g, '').replace(/`{1,3}/g, '');
}

function generateTitle(message: string): string {
  const clean = message.replace(/[?!.]/g, '').trim();
  if (clean.length <= 50) return clean;
  return clean.substring(0, 47) + '...';
}

const COMMON_RULES =
  'Regles :\n'
  + '- Reponds toujours en francais.\n'
  + '- N\'utilise JAMAIS de markdown (pas de **, ##, *, ``). Texte brut uniquement.\n'
  + '- Ecris de facon professionnelle, structuree et claire.\n'
  + '- Base tes reponses sur les articles fournis dans la base de connaissance.\n'
  + '- Cite les references (numeros de comptes, articles) quand tu references le referentiel.\n'
  + '- Si la question depasse la base de connaissance, indique-le.\n'
  + '- Pour les ecritures comptables : Debit: [compte - libelle] / Credit: [compte - libelle] avec montants.\n'
  + '- Si l\'utilisateur te demande de retenir ou memoriser quelque chose, reponds en confirmant et inclus dans ta reponse la balise [MEMORISER: cle | valeur] pour chaque element a retenir.\n'
  + '- Si l\'utilisateur demande ce que tu sais sur lui, consulte la memoire utilisateur ci-dessus.';

// ===================== CONVERSATIONS =====================

const router = express.Router();

router.get('/conversations/:userId', async (req: Request, res: Response) => {
  try {
    const s = getValidatedSchemaName(req.tenantSchema!);
    const { userId } = req.params;
    const result = await pool.query(
      `SELECT id, titre, created_at, updated_at FROM "${s}".conversations WHERE user_id = $1 ORDER BY updated_at DESC`,
      [userId]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: getErrorMessage(err as { message?: string }) });
  }
});

router.post('/conversations', async (req: Request, res: Response) => {
  try {
    const s = getValidatedSchemaName(req.tenantSchema!);
    const { userId, titre } = req.body;
    const result = await pool.query(
      `INSERT INTO "${s}".conversations (user_id, titre) VALUES ($1, $2) RETURNING *`,
      [userId, titre || 'Nouvelle conversation']
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: getErrorMessage(err as { message?: string }) });
  }
});

router.get('/conversations/:convId/messages', async (req: Request, res: Response) => {
  try {
    const s = getValidatedSchemaName(req.tenantSchema!);
    const { convId } = req.params;
    const result = await pool.query(
      `SELECT id, role, content, articles_refs, created_at FROM "${s}".conversation_messages WHERE conversation_id = $1 ORDER BY created_at ASC`,
      [convId]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: getErrorMessage(err as { message?: string }) });
  }
});

router.delete('/conversations/:convId', async (req: Request, res: Response) => {
  try {
    const s = getValidatedSchemaName(req.tenantSchema!);
    await pool.query(`DELETE FROM "${s}".conversations WHERE id = $1`, [req.params.convId]);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: getErrorMessage(err as { message?: string }) });
  }
});

// ===================== CHAT (MULTI-AGENT) =====================

router.post('/chat', async (req: Request, res: Response) => {
  try {
    const { message, conversationId, userId, typeActivite } = req.body;
    if (!message || !message.trim()) {
      return res.status(400).json({ error: 'Message requis' });
    }

    const s = getValidatedSchemaName(req.tenantSchema!);
    let convId: number | null = conversationId;

    if (!convId && userId) {
      const convResult = await pool.query(
        `INSERT INTO "${s}".conversations (user_id, titre) VALUES ($1, $2) RETURNING id`,
        [userId, generateTitle(message)]
      );
      convId = convResult.rows[0].id;
    }

    if (convId) {
      await pool.query(
        `INSERT INTO "${s}".conversation_messages (conversation_id, role, content) VALUES ($1, $2, $3)`,
        [convId, 'user', message]
      );
    }

    // Load memory
    let memoryContext = '';
    if (userId) {
      const memResult = await pool.query(
        `SELECT cle, valeur FROM "${s}".assistant_memory WHERE user_id = $1 ORDER BY updated_at DESC LIMIT 20`,
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
        `SELECT role, content FROM "${s}".conversation_messages WHERE conversation_id = $1 ORDER BY created_at ASC`,
        [convId]
      );
      dbHistory = histResult.rows;
    }

    // Route to the right agent
    const agentId = detectAgent(message, typeActivite);
    const agent = AGENTS[agentId];
    logger.info('Agent selectionne: ' + agent.name + ' pour: ' + message.substring(0, 60));

    // Search relevant articles — vectoriel (Qdrant) avec fallback mots-cles
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
      model: 'claude-sonnet-4-20250514',
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
          `SELECT id FROM "${s}".assistant_memory WHERE user_id = $1 AND cle = $2`,
          [userId, cle]
        );
        if (existing.rows.length > 0) {
          await pool.query(
            `UPDATE "${s}".assistant_memory SET valeur = $1, updated_at = NOW() WHERE id = $2`,
            [valeur, existing.rows[0].id]
          );
        } else {
          await pool.query(
            `INSERT INTO "${s}".assistant_memory (user_id, cle, valeur) VALUES ($1, $2, $3)`,
            [userId, cle, valeur]
          );
        }
      }
    }
    assistantMessage = assistantMessage.replace(/\[MEMORISER:\s*.+?\s*\|\s*.+?\s*\]/g, '').trim();

    const articlesRefs = relevantArticles.map((a: KBArticle) => ({ numero: a.numero, titre: a.titre }));

    if (convId) {
      await pool.query(
        `INSERT INTO "${s}".conversation_messages (conversation_id, role, content, articles_refs) VALUES ($1, $2, $3, $4)`,
        [convId, 'assistant', assistantMessage, JSON.stringify(articlesRefs)]
      );
      await pool.query(
        `UPDATE "${s}".conversations SET updated_at = NOW() WHERE id = $1`,
        [convId]
      );
    }

    res.json({
      response: assistantMessage,
      articles_references: articlesRefs,
      conversationId: convId,
      agent: agent.name,
    });
  } catch (err) {
    logger.error('Erreur assistant : ' + getErrorMessage(err as { message?: string }));
    res.status(500).json({ error: getErrorMessage(err as { message?: string }) });
  }
});

// ===================== AGENTS INFO =====================

router.get('/agents', (_req: Request, res: Response) => {
  const list = Object.entries(AGENTS).map(([id, a]) => ({
    id,
    name: a.name,
    description: a.description,
    kbSources: a.kbKeys,
  }));
  res.json(list);
});

// ===================== MEMORY =====================

router.get('/memory/:userId', async (req: Request, res: Response) => {
  try {
    const s = getValidatedSchemaName(req.tenantSchema!);
    const result = await pool.query(
      `SELECT id, cle, valeur, updated_at FROM "${s}".assistant_memory WHERE user_id = $1 ORDER BY updated_at DESC`,
      [req.params.userId]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: getErrorMessage(err as { message?: string }) });
  }
});

router.delete('/memory/:id', async (req: Request, res: Response) => {
  try {
    const s = getValidatedSchemaName(req.tenantSchema!);
    await pool.query(`DELETE FROM "${s}".assistant_memory WHERE id = $1`, [req.params.id]);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: getErrorMessage(err as { message?: string }) });
  }
});

// ===================== ARTICLES SEARCH =====================

router.get('/articles', async (req: Request, res: Response) => {
  const { q } = req.query;
  if (!q) return res.json([]);

  // Essayer Qdrant d'abord
  if (qdrantReady) {
    try {
      const results = await qdrantModule.search('normx_kb', q as string, 10) as QdrantSearchResult[];
      if (results && results.length > 0) {
        return res.json(results.map((r: QdrantSearchResult) => ({
          numero: r.payload.numero || '',
          titre: r.payload.titre || '',
          texte: (r.payload.texte || '').substring(0, 300) + '...',
          mots_cles: r.payload.mots_cles || [],
          score: r.score,
          source: r.payload.source,
        })));
      }
    } catch (_ignored) { /* fallback to keyword search */ }
  }

  // Fallback mots-cles
  const allArticles = [...KB.sycebnl, ...KB.syscohada];
  const results = searchArticles(allArticles, q as string, 10);
  res.json(results.map((a: KBArticle) => ({
    numero: a.numero,
    titre: a.titre,
    texte: Array.isArray(a.texte) ? a.texte.join(' ').substring(0, 300) + '...' : (a.texte || '').substring(0, 300) + '...',
    mots_cles: a.mots_cles || [],
  })));
});

// ===================== QDRANT STATUS =====================

router.get('/qdrant/status', async (_req: Request, res: Response) => {
  try {
    const health = await qdrantModule.healthCheck();
    let collectionInfo: QdrantCollectionInfo | null = null;
    if (health.ok) {
      try {
        collectionInfo = await qdrantModule.qdrant.getCollection('normx_kb') as unknown as QdrantCollectionInfo;
      } catch (_ignored) { /* collection may not exist */ }
    }
    res.json({
      qdrant_available: health.ok,
      search_mode: qdrantReady ? 'vectoriel' : 'mots-cles',
      collection: collectionInfo ? {
        name: 'normx_kb',
        points_count: collectionInfo.points_count,
        vectors_count: collectionInfo.vectors_count,
        status: collectionInfo.status,
      } : null,
    });
  } catch (err) {
    res.status(500).json({ error: getErrorMessage(err as { message?: string }) });
  }
});

// ===================== FONCTIONNEMENT DES COMPTES (pour la revision) =====================

router.post('/fonctionnement-comptes', async (req: Request, res: Response) => {
  try {
    const { prefixes } = req.body;
    if (!prefixes || !Array.isArray(prefixes) || prefixes.length === 0) {
      return res.json([]);
    }

    // Charger les fichiers de fonctionnement
    const result: FonctionnementArticle[] = [];
    const localKbDir = path.join(__dirname, '..', '..', 'knowledge-base');
    const files = fs.readdirSync(localKbDir).filter((f: string) => f.startsWith('fonctionnement_comptes_classe') && f.endsWith('.json'));

    for (const file of files) {
      try {
        const raw = fs.readFileSync(path.join(localKbDir, file), 'utf-8');
        const data = JSON.parse(raw);
        const articles: FonctionnementArticle[] = data.articles || [];
        for (const a of articles) {
          const num = String(a.numero || '');
          if (prefixes.some((p: string) => num === p || num.startsWith(p) || p.startsWith(num))) {
            result.push({
              numero: num,
              titre: a.titre || '',
              contenu: a.contenu || '',
              fonctionnement: a.fonctionnement || null,
              exclusions: a.exclusions || [],
              controles: a.controles || [],
              commentaires: a.commentaires || [],
              sens: a.sens || '',
            });
          }
        }
      } catch (_ignored) { /* skip malformed files */ }
    }

    // Dedupliquer et trier
    const seen = new Set<string>();
    const unique = result.filter(r => {
      if (seen.has(r.numero)) return false;
      seen.add(r.numero);
      return true;
    }).sort((a, b) => a.numero.localeCompare(b.numero));

    res.json(unique);
  } catch (err) {
    logger.error('Erreur fonctionnement-comptes: ' + getErrorMessage(err as { message?: string }));
    res.status(500).json({ error: getErrorMessage(err as { message?: string }) });
  }
});

export default router;
