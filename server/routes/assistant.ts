import express, { type Request, type Response } from 'express';
import fs from 'fs';
import path from 'path';
import logger from '../logger';
import { asyncHandler } from '../middleware/asyncHandler';
import { requirePermission } from '../middleware/permissions.middleware';
import { validateBody, validateParams, validateQuery } from '../middleware/validate';
import { getValidatedSchemaName } from '../utils/tenant.utils';
import { resolveLocalUserId } from '../utils/userResolver';
import { AGENTS, KB, KBArticle, FonctionnementArticle } from '../services/assistant.agents';
import { searchArticles, isQdrantReady, qdrantModule, QdrantCollectionInfo } from '../services/assistant.search';
import { handleChat } from '../services/assistant.chat';
import * as assistantService from '../services/assistant.service';
import {
  createConversationBody,
  chatBody,
  fonctionnementComptesBody,
  conversationIdParam,
  memoryIdParam,
  articlesQuery,
} from '../schemas/assistant.schema';

const router = express.Router();

// Les erreurs metier (HttpError) sont propagees par asyncHandler au middleware
// central de server/index.ts qui mappe status/code/details automatiquement.

// ===================== CONVERSATIONS =====================

router.get(
  '/conversations',
  requirePermission('assistant', 'lire'),
  asyncHandler(async (req: Request, res: Response) => {
    const schema = getValidatedSchemaName(req.tenantSchema!);
    const userId = await resolveLocalUserId(schema, req.user!.sub);
    const conversations = await assistantService.listConversations(schema, userId);
    res.json(conversations);
  }),
);

router.post(
  '/conversations',
  requirePermission('assistant', 'creer'),
  validateBody(createConversationBody),
  asyncHandler(async (req: Request, res: Response) => {
    const schema = getValidatedSchemaName(req.tenantSchema!);
    const userId = await resolveLocalUserId(schema, req.user!.sub);
    const conv = await assistantService.createConversation(schema, userId, {
      titre: req.body.titre,
      visibility: req.body.visibility,
      entiteId: req.body.entiteId,
    });
    res.status(201).json(conv);
  }),
);

router.get(
  '/conversations/:convId/messages',
  requirePermission('assistant', 'lire'),
  validateParams(conversationIdParam),
  asyncHandler(async (req: Request, res: Response) => {
    const schema = getValidatedSchemaName(req.tenantSchema!);
    const userId = await resolveLocalUserId(schema, req.user!.sub);
    const messages = await assistantService.listMessages(
      schema,
      Number(req.params.convId),
      userId,
    );
    res.json(messages);
  }),
);

router.delete(
  '/conversations/:convId',
  requirePermission('assistant', 'supprimer'),
  validateParams(conversationIdParam),
  asyncHandler(async (req: Request, res: Response) => {
    const schema = getValidatedSchemaName(req.tenantSchema!);
    const userId = await resolveLocalUserId(schema, req.user!.sub);
    await assistantService.deleteConversation(schema, Number(req.params.convId), userId);
    res.json({ ok: true });
  }),
);

// ===================== CHAT =====================

router.post(
  '/chat',
  requirePermission('assistant', 'creer'),
  validateBody(chatBody),
  asyncHandler(async (req: Request, res: Response) => {
    const schema = getValidatedSchemaName(req.tenantSchema!);
    const userId = await resolveLocalUserId(schema, req.user!.sub);
    const result = await handleChat({
      message: req.body.message,
      conversationId: req.body.conversationId ?? null,
      localUserId: userId,
      typeActivite: req.body.typeActivite,
      schema,
      visibility: req.body.visibility,
      entiteId: req.body.entiteId ?? null,
    });
    res.json(result);
  }),
);

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

router.get(
  '/memory',
  requirePermission('assistant', 'lire'),
  asyncHandler(async (req: Request, res: Response) => {
    const schema = getValidatedSchemaName(req.tenantSchema!);
    const userId = await resolveLocalUserId(schema, req.user!.sub);
    const memory = await assistantService.listMemory(schema, userId);
    res.json(memory);
  }),
);

router.delete(
  '/memory/:id',
  requirePermission('assistant', 'supprimer'),
  validateParams(memoryIdParam),
  asyncHandler(async (req: Request, res: Response) => {
    const schema = getValidatedSchemaName(req.tenantSchema!);
    const userId = await resolveLocalUserId(schema, req.user!.sub);
    await assistantService.deleteMemory(schema, Number(req.params.id), userId);
    res.json({ ok: true });
  }),
);

// ===================== ARTICLES SEARCH =====================

router.get(
  '/articles',
  requirePermission('assistant', 'lire'),
  validateQuery(articlesQuery),
  asyncHandler(async (req: Request, res: Response) => {
    const q = req.query.q as string | undefined;
    if (!q) {
      res.json([]);
      return;
    }

    if (isQdrantReady()) {
      try {
        const results = (await qdrantModule.search('normx_kb', q, 10)) as Array<{
          payload: {
            numero?: string;
            titre?: string;
            texte?: string;
            mots_cles?: string[];
            source?: string;
          };
          score: number;
        }>;
        if (results && results.length > 0) {
          res.json(
            results.map((r) => ({
              numero: r.payload.numero || '',
              titre: r.payload.titre || '',
              texte: (r.payload.texte || '').substring(0, 300) + '...',
              mots_cles: r.payload.mots_cles || [],
              score: r.score,
              source: r.payload.source,
            })),
          );
          return;
        }
      } catch (err) {
        logger.warn(
          'Qdrant search fallback to keyword: ' +
            (err instanceof Error ? err.message : String(err)),
        );
      }
    }

    const allArticles = [...KB.sycebnl, ...KB.syscohada];
    const results = searchArticles(allArticles, q, 10);
    res.json(
      results.map((a: KBArticle) => ({
        numero: a.numero,
        titre: a.titre,
        texte: Array.isArray(a.texte)
          ? a.texte.join(' ').substring(0, 300) + '...'
          : (a.texte || '').substring(0, 300) + '...',
        mots_cles: a.mots_cles || [],
      })),
    );
  }),
);

// ===================== QDRANT STATUS =====================

router.get(
  '/qdrant/status',
  asyncHandler(async (_req: Request, res: Response) => {
    const health = await qdrantModule.healthCheck();
    let collectionInfo: QdrantCollectionInfo | null = null;
    if (health.ok) {
      try {
        const info = await qdrantModule.qdrant.getCollection('normx_kb');
        collectionInfo = {
          points_count: info.points_count,
          indexed_vectors_count: info.indexed_vectors_count,
          status: info.status,
        };
      } catch (err) {
        logger.warn(
          'Qdrant collection info indisponible: ' +
            (err instanceof Error ? err.message : String(err)),
        );
      }
    }
    res.json({
      qdrant_available: health.ok,
      search_mode: isQdrantReady() ? 'vectoriel' : 'mots-cles',
      collection: collectionInfo
        ? {
            name: 'normx_kb',
            points_count: collectionInfo.points_count,
            indexed_vectors_count: collectionInfo.indexed_vectors_count,
            status: collectionInfo.status,
          }
        : null,
    });
  }),
);

// ===================== FONCTIONNEMENT DES COMPTES =====================

// Cache lazy : les fichiers font plusieurs Mo et etaient relus a chaque requete.
let fonctionnementCache: FonctionnementArticle[] | null = null;

function getFonctionnementArticles(): FonctionnementArticle[] {
  if (fonctionnementCache !== null) return fonctionnementCache;
  const localKbDir = path.join(__dirname, '..', '..', 'knowledge-base');
  const files = fs
    .readdirSync(localKbDir)
    .filter((f: string) => f.startsWith('fonctionnement_comptes_classe') && f.endsWith('.json'));
  const all: FonctionnementArticle[] = [];
  for (const file of files) {
    try {
      const data = JSON.parse(fs.readFileSync(path.join(localKbDir, file), 'utf-8'));
      const articles: FonctionnementArticle[] = data.articles || [];
      for (const a of articles) {
        all.push({
          numero: String(a.numero || ''),
          titre: a.titre || '',
          contenu: a.contenu || '',
          fonctionnement: a.fonctionnement || null,
          exclusions: a.exclusions || [],
          controles: a.controles || [],
          commentaires: a.commentaires || [],
          sens: a.sens || '',
        });
      }
    } catch (err) {
      logger.warn(
        'Fichier KB malforme ignore (' + file + '): ' +
          (err instanceof Error ? err.message : String(err)),
      );
    }
  }
  fonctionnementCache = all;
  logger.info('Fonctionnement comptes charge en memoire: %d articles', all.length);
  return fonctionnementCache;
}

router.post(
  '/fonctionnement-comptes',
  requirePermission('assistant', 'lire'),
  validateBody(fonctionnementComptesBody),
  asyncHandler(async (req: Request, res: Response) => {
    const prefixes = req.body.prefixes as string[];

    const all = getFonctionnementArticles();
    const matched = all.filter((a) =>
      prefixes.some(
        (p: string) => a.numero === p || a.numero.startsWith(p) || p.startsWith(a.numero),
      ),
    );

    const seen = new Set<string>();
    const unique = matched
      .filter((r) => {
        if (seen.has(r.numero)) return false;
        seen.add(r.numero);
        return true;
      })
      .sort((a, b) => a.numero.localeCompare(b.numero));

    res.json(unique);
  }),
);

export default router;
