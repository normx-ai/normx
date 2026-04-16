import express, { Request, Response } from 'express';
import { asyncHandler } from '../middleware/asyncHandler';
import pool from '../db';
import { getValidatedSchemaName } from '../utils/tenant.utils';
import logger from '../logger';

const router = express.Router();

const VALID_REGIMES = ['normal', 'simplifie', 'non_assujetti'] as const;
type Regime = typeof VALID_REGIMES[number];

interface TvaConfigRow {
  id: number;
  taux_normal: string; // NUMERIC retourné en string par pg
  taux_reduit: string | null;
  regime: Regime;
  numero_assujetti: string | null;
  updated_at: string;
}

// GET /api/tva-config — retourne la config unique du tenant.
// Si aucune ligne (cas rare), retourne les valeurs par défaut Congo (18% / 5% / normal).
router.get('/', asyncHandler(async (req: Request, res: Response) => {
  if (!req.tenantSchema) return res.status(400).json({ error: 'Contexte tenant manquant.' });
  const schema = getValidatedSchemaName(req.tenantSchema);
  const r = await pool.query(
    `SELECT id, taux_normal, taux_reduit, regime, numero_assujetti, updated_at
     FROM "${schema}".tva_config WHERE id = 1`
  );
  if (r.rows.length === 0) {
    // Si la migration n'a pas tourné ou que la ligne a été supprimée, on seed.
    await pool.query(
      `INSERT INTO "${schema}".tva_config (id, taux_normal, taux_reduit, regime) VALUES (1, 18.00, 5.00, 'normal')`
    );
    return res.json({
      id: 1, taux_normal: '18.00', taux_reduit: '5.00', regime: 'normal',
      numero_assujetti: null, updated_at: new Date().toISOString(),
    } as TvaConfigRow);
  }
  res.json(r.rows[0] as TvaConfigRow);
}));

// PUT /api/tva-config — met à jour la config unique (upsert sur id = 1)
router.put('/', asyncHandler(async (req: Request, res: Response) => {
  if (!req.tenantSchema) return res.status(400).json({ error: 'Contexte tenant manquant.' });
  const { taux_normal, taux_reduit, regime, numero_assujetti } = req.body as {
    taux_normal?: number | string; taux_reduit?: number | string | null;
    regime?: string; numero_assujetti?: string | null;
  };

  if (taux_normal === undefined || taux_normal === null) {
    return res.status(400).json({ error: 'taux_normal obligatoire.' });
  }
  const tNormal = Number(taux_normal);
  if (!Number.isFinite(tNormal) || tNormal < 0 || tNormal > 100) {
    return res.status(400).json({ error: 'taux_normal invalide (0-100).' });
  }
  let tReduit: number | null = null;
  if (taux_reduit !== undefined && taux_reduit !== null && taux_reduit !== '') {
    tReduit = Number(taux_reduit);
    if (!Number.isFinite(tReduit) || tReduit < 0 || tReduit > 100) {
      return res.status(400).json({ error: 'taux_reduit invalide (0-100).' });
    }
  }
  if (!regime || !VALID_REGIMES.includes(regime as Regime)) {
    return res.status(400).json({ error: 'regime invalide (normal|simplifie|non_assujetti).' });
  }

  const schema = getValidatedSchemaName(req.tenantSchema);
  try {
    const r = await pool.query(
      `INSERT INTO "${schema}".tva_config (id, taux_normal, taux_reduit, regime, numero_assujetti)
       VALUES (1, $1, $2, $3, $4)
       ON CONFLICT (id) DO UPDATE SET
         taux_normal = EXCLUDED.taux_normal,
         taux_reduit = EXCLUDED.taux_reduit,
         regime = EXCLUDED.regime,
         numero_assujetti = EXCLUDED.numero_assujetti,
         updated_at = NOW()
       RETURNING *`,
      [tNormal, tReduit, regime, numero_assujetti || null]
    );
    res.json(r.rows[0] as TvaConfigRow);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error('Erreur update TVA config: %s', msg);
    res.status(500).json({ error: 'Erreur serveur.' });
  }
}));

export default router;
