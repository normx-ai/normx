// ===================== ASSISTANT SEARCH (keyword + vectoriel) =====================

import logger from '../logger';
import * as qdrantModule from '../qdrant';
import { AGENTS, KB, KBArticle } from './assistant.agents';

// ===================== TYPES =====================

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

export interface QdrantCollectionInfo {
  points_count: number;
  vectors_count: number;
  status: string;
}

// ===================== QDRANT STATE =====================

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

export function isQdrantReady(): boolean {
  return qdrantReady;
}

export { qdrantModule };

// ===================== KEYWORD SEARCH =====================

export function searchArticles(articles: KBArticle[], query: string, maxResults = 8): KBArticle[] {
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

export function searchForAgent(agentId: string, query: string): KBArticle[] {
  const agent = AGENTS[agentId];
  if (!agent) return [];

  let allArticles: KBArticle[] = [];
  for (const key of agent.kbKeys) {
    if (KB[key]) allArticles = allArticles.concat(KB[key]);
  }

  return searchArticles(allArticles, query);
}

// ===================== VECTOR SEARCH (QDRANT) =====================

export async function searchVectoriel(agentId: string, query: string, maxResults = 8): Promise<KBArticle[] | null> {
  if (!qdrantReady) return null;

  try {
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

// ===================== FORMAT =====================

export function formatContext(articles: KBArticle[]): string {
  return articles.map(a => {
    const texteStr = Array.isArray(a.texte) ? a.texte.join('\n') : (a.texte || '');
    let text = '--- ' + a.numero + ': ' + a.titre + ' ---\n' + texteStr;
    if (a.mots_cles && a.mots_cles.length > 0) {
      text += '\nMots-cles: ' + a.mots_cles.join(', ');
    }
    return text;
  }).join('\n\n');
}
