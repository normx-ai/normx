import express, { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import pool from '../db';
import logger from '../logger';
import { getErrorMessage } from '../utils/routeHelpers';
import { getValidatedSchemaName } from '../utils/tenant.utils';
import { AGENTS, KB, KBArticle, FonctionnementArticle } from '../services/assistant.agents';
import { searchArticles, searchForAgent, searchVectoriel, formatContext, isQdrantReady, qdrantModule, QdrantCollectionInfo } from '../services/assistant.search';
import { handleChat } from '../services/assistant.chat';

const router = express.Router();

// ===================== CONVERSATIONS =====================

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

// ===================== CHAT =====================

router.post('/chat', async (req: Request, res: Response) => {
  try {
    const { message, conversationId, userId, typeActivite } = req.body;
    if (!message || !message.trim()) {
      return res.status(400).json({ error: 'Message requis' });
    }
    const s = getValidatedSchemaName(req.tenantSchema!);
    const result = await handleChat(message, conversationId, userId, typeActivite, s);
    res.json(result);
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

  if (isQdrantReady()) {
    try {
      const results = await qdrantModule.search('normx_kb', q as string, 10) as Array<{ payload: { numero?: string; titre?: string; texte?: string; mots_cles?: string[]; source?: string }; score: number }>;
      if (results && results.length > 0) {
        return res.json(results.map(r => ({
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
      search_mode: isQdrantReady() ? 'vectoriel' : 'mots-cles',
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

// ===================== FONCTIONNEMENT DES COMPTES =====================

router.post('/fonctionnement-comptes', async (req: Request, res: Response) => {
  try {
    const { prefixes } = req.body;
    if (!prefixes || !Array.isArray(prefixes) || prefixes.length === 0) {
      return res.json([]);
    }

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
