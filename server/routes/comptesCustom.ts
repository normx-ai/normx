import express, { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import { asyncHandler } from '../middleware/asyncHandler';
import pool from '../db';
import { getValidatedSchemaName } from '../utils/tenant.utils';
import logger from '../logger';

const router = express.Router();

interface CompteStandard {
  numero: string;
  libelle: string;
  classe?: number | string | null;
  sens?: 'debiteur' | 'crediteur' | 'mixte' | null;
}

interface CompteCustomRow {
  id: number;
  numero: string;
  libelle: string | null;
  classe: number | null;
  sens: 'debiteur' | 'crediteur' | 'mixte' | null;
  type: 'custom' | 'disabled';
  created_at: string;
  updated_at: string;
}

// Chargement lazy du plan comptable SYSCOHADA officiel
let planOfficiel: CompteStandard[] | null = null;
function getPlanOfficiel(): CompteStandard[] {
  if (!planOfficiel) {
    const filePath = path.join(__dirname, '..', 'data', 'plan_comptable_syscohada_6.json');
    if (fs.existsSync(filePath)) {
      planOfficiel = JSON.parse(fs.readFileSync(filePath, 'utf-8')) as CompteStandard[];
    } else {
      planOfficiel = [];
    }
  }
  return planOfficiel ?? [];
}

// GET /api/comptes-custom — liste des overrides du tenant (custom + disabled)
router.get('/', asyncHandler(async (req: Request, res: Response) => {
  if (!req.tenantSchema) return res.status(400).json({ error: 'Contexte tenant manquant.' });
  const schema = getValidatedSchemaName(req.tenantSchema);
  const r = await pool.query(
    `SELECT id, numero, libelle, classe, sens, type, created_at, updated_at
     FROM "${schema}".comptes_custom ORDER BY numero`
  );
  res.json(r.rows as CompteCustomRow[]);
}));

// GET /api/comptes-custom/plan-fusionne — plan SYSCOHADA + overrides tenant.
// Chaque compte retourné a un champ `source` : 'syscohada' | 'custom' | 'syscohada_disabled'.
// Les comptes désactivés (type=disabled dans comptes_custom) sont marqués mais
// conservés dans la liste pour info. Les comptes custom ajoutés sont fusionnés
// en priorité (écrasent un compte officiel du même numéro si collision).
router.get('/plan-fusionne', asyncHandler(async (req: Request, res: Response) => {
  if (!req.tenantSchema) return res.status(400).json({ error: 'Contexte tenant manquant.' });
  const schema = getValidatedSchemaName(req.tenantSchema);
  const r = await pool.query(
    `SELECT numero, libelle, classe, sens, type FROM "${schema}".comptes_custom`
  );
  const overrides = r.rows as Pick<CompteCustomRow, 'numero' | 'libelle' | 'classe' | 'sens' | 'type'>[];
  const disabledSet = new Set(overrides.filter(o => o.type === 'disabled').map(o => o.numero));
  const customMap = new Map(
    overrides.filter(o => o.type === 'custom').map(o => [o.numero, o])
  );

  const merged = getPlanOfficiel().map(c => {
    const override = customMap.get(c.numero);
    if (override) {
      return {
        numero: c.numero,
        libelle: override.libelle || c.libelle,
        classe: override.classe ?? c.classe,
        sens: override.sens || c.sens,
        source: 'custom' as const,
        disabled: disabledSet.has(c.numero),
      };
    }
    return {
      numero: c.numero,
      libelle: c.libelle,
      classe: c.classe,
      sens: c.sens,
      source: disabledSet.has(c.numero) ? ('syscohada_disabled' as const) : ('syscohada' as const),
      disabled: disabledSet.has(c.numero),
    };
  });

  // Ajouter les comptes custom qui n'existent pas dans le plan officiel
  const existingNumeros = new Set(merged.map(c => c.numero));
  for (const [numero, override] of customMap) {
    if (!existingNumeros.has(numero)) {
      merged.push({
        numero,
        libelle: override.libelle || '',
        classe: override.classe,
        sens: override.sens,
        source: 'custom' as const,
        disabled: false,
      });
    }
  }
  merged.sort((a, b) => a.numero.localeCompare(b.numero));
  res.json(merged);
}));

// POST /api/comptes-custom — ajouter un compte personnalisé
router.post('/', asyncHandler(async (req: Request, res: Response) => {
  if (!req.tenantSchema) return res.status(400).json({ error: 'Contexte tenant manquant.' });
  const { numero, libelle, sens, type } = req.body as {
    numero?: string; libelle?: string; sens?: string; type?: string;
  };
  if (!numero?.trim()) {
    return res.status(400).json({ error: 'Numéro obligatoire.' });
  }
  const numeroClean = numero.trim();
  const typeFinal = type === 'disabled' ? 'disabled' : 'custom';
  if (typeFinal === 'custom' && !libelle?.trim()) {
    return res.status(400).json({ error: 'Libellé obligatoire pour un compte personnalisé.' });
  }
  if (sens && !['debiteur', 'crediteur', 'mixte'].includes(sens)) {
    return res.status(400).json({ error: 'Sens invalide (debiteur|crediteur|mixte).' });
  }
  const classe = numeroClean.charAt(0).match(/[1-9]/) ? parseInt(numeroClean.charAt(0), 10) : null;
  const schema = getValidatedSchemaName(req.tenantSchema);
  try {
    const r = await pool.query(
      `INSERT INTO "${schema}".comptes_custom (numero, libelle, classe, sens, type)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [numeroClean, libelle?.trim() || null, classe, sens || null, typeFinal]
    );
    res.status(201).json(r.rows[0] as CompteCustomRow);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes('duplicate key') || msg.includes('unique')) {
      return res.status(409).json({ error: 'Un override existe déjà pour ce numéro.' });
    }
    logger.error('Erreur création compte custom: %s', msg);
    res.status(500).json({ error: 'Erreur serveur.' });
  }
}));

// PUT /api/comptes-custom/:id — modifier un compte perso
router.put('/:id', asyncHandler(async (req: Request, res: Response) => {
  if (!req.tenantSchema) return res.status(400).json({ error: 'Contexte tenant manquant.' });
  const id = parseInt(req.params.id, 10);
  const { libelle, sens } = req.body as { libelle?: string; sens?: string };
  if (sens && !['debiteur', 'crediteur', 'mixte'].includes(sens)) {
    return res.status(400).json({ error: 'Sens invalide.' });
  }
  const schema = getValidatedSchemaName(req.tenantSchema);
  const updates: string[] = [];
  const values: (string | null)[] = [];
  let idx = 1;
  if (libelle !== undefined) { updates.push(`libelle = $${idx++}`); values.push(libelle || null); }
  if (sens !== undefined) { updates.push(`sens = $${idx++}`); values.push(sens || null); }
  if (updates.length === 0) return res.status(400).json({ error: 'Aucun champ à mettre à jour.' });
  updates.push(`updated_at = NOW()`);
  values.push(String(id));
  const r = await pool.query(
    `UPDATE "${schema}".comptes_custom SET ${updates.join(', ')} WHERE id = $${idx} RETURNING *`,
    values
  );
  if (r.rows.length === 0) return res.status(404).json({ error: 'Compte introuvable.' });
  res.json(r.rows[0] as CompteCustomRow);
}));

// DELETE /api/comptes-custom/:id — retirer un override
router.delete('/:id', asyncHandler(async (req: Request, res: Response) => {
  if (!req.tenantSchema) return res.status(400).json({ error: 'Contexte tenant manquant.' });
  const id = parseInt(req.params.id, 10);
  const schema = getValidatedSchemaName(req.tenantSchema);
  const r = await pool.query(
    `DELETE FROM "${schema}".comptes_custom WHERE id = $1 RETURNING id`,
    [id]
  );
  if (r.rows.length === 0) return res.status(404).json({ error: 'Compte introuvable.' });
  res.status(204).end();
}));

export default router;
