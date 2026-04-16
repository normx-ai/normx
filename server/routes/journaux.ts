import express, { Request, Response } from 'express';
import { asyncHandler } from '../middleware/asyncHandler';
import pool from '../db';
import { getValidatedSchemaName } from '../utils/tenant.utils';
import logger from '../logger';

const router = express.Router();

interface JournalRow {
  id: number;
  code: string;
  libelle: string;
  type: 'achat' | 'vente' | 'tresorerie' | 'od';
  contrepartie_defaut: string | null;
  actif: boolean;
  nb_ecritures: number;
  created_at: string;
}

// GET /api/journaux — liste tous les journaux du tenant avec le nombre d'écritures
router.get('/', asyncHandler(async (req: Request, res: Response) => {
  if (!req.tenantSchema) return res.status(400).json({ error: 'Contexte tenant manquant.' });
  const schema = getValidatedSchemaName(req.tenantSchema);
  const r = await pool.query(
    `SELECT j.id, j.code, j.libelle, j.type, j.contrepartie_defaut, j.actif, j.created_at,
            COALESCE(COUNT(e.id), 0)::int AS nb_ecritures
     FROM "${schema}".journaux j
     LEFT JOIN "${schema}".ecritures e ON e.journal = j.code
     GROUP BY j.id
     ORDER BY j.code`
  );
  res.json(r.rows as JournalRow[]);
}));

// POST /api/journaux — créer un journal
router.post('/', asyncHandler(async (req: Request, res: Response) => {
  if (!req.tenantSchema) return res.status(400).json({ error: 'Contexte tenant manquant.' });
  const { code, libelle, type, contrepartie_defaut } = req.body as {
    code?: string; libelle?: string; type?: string; contrepartie_defaut?: string | null;
  };
  if (!code?.trim() || !libelle?.trim()) {
    return res.status(400).json({ error: 'Code et libellé sont obligatoires.' });
  }
  if (!type || !['achat','vente','tresorerie','od'].includes(type)) {
    return res.status(400).json({ error: 'Type invalide (achat|vente|tresorerie|od).' });
  }
  const schema = getValidatedSchemaName(req.tenantSchema);
  try {
    const r = await pool.query(
      `INSERT INTO "${schema}".journaux (code, libelle, type, contrepartie_defaut)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [code.trim().toUpperCase(), libelle.trim(), type, contrepartie_defaut || null]
    );
    res.status(201).json(r.rows[0]);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes('duplicate key') || msg.includes('unique')) {
      return res.status(409).json({ error: 'Un journal avec ce code existe déjà.' });
    }
    logger.error('Erreur création journal: %s', msg);
    res.status(500).json({ error: 'Erreur serveur.' });
  }
}));

// PUT /api/journaux/:id — modifier un journal
router.put('/:id', asyncHandler(async (req: Request, res: Response) => {
  if (!req.tenantSchema) return res.status(400).json({ error: 'Contexte tenant manquant.' });
  const id = parseInt(req.params.id, 10);
  const { libelle, type, contrepartie_defaut, actif } = req.body as {
    libelle?: string; type?: string; contrepartie_defaut?: string | null; actif?: boolean;
  };
  const schema = getValidatedSchemaName(req.tenantSchema);
  const updates: string[] = [];
  const values: (string | number | boolean | null)[] = [];
  let idx = 1;
  if (libelle !== undefined) { updates.push(`libelle = $${idx++}`); values.push(libelle); }
  if (type !== undefined) {
    if (!['achat','vente','tresorerie','od'].includes(type)) {
      return res.status(400).json({ error: 'Type invalide.' });
    }
    updates.push(`type = $${idx++}`); values.push(type);
  }
  if (contrepartie_defaut !== undefined) {
    updates.push(`contrepartie_defaut = $${idx++}`); values.push(contrepartie_defaut || null);
  }
  if (actif !== undefined) { updates.push(`actif = $${idx++}`); values.push(actif); }
  if (updates.length === 0) return res.status(400).json({ error: 'Aucun champ à mettre à jour.' });
  updates.push(`updated_at = NOW()`);
  values.push(id);
  const r = await pool.query(
    `UPDATE "${schema}".journaux SET ${updates.join(', ')} WHERE id = $${idx} RETURNING *`,
    values
  );
  if (r.rows.length === 0) return res.status(404).json({ error: 'Journal introuvable.' });
  res.json(r.rows[0]);
}));

// DELETE /api/journaux/:id — supprimer un journal (bloqué si écritures liées)
router.delete('/:id', asyncHandler(async (req: Request, res: Response) => {
  if (!req.tenantSchema) return res.status(400).json({ error: 'Contexte tenant manquant.' });
  const id = parseInt(req.params.id, 10);
  const schema = getValidatedSchemaName(req.tenantSchema);
  // Blocage si le journal porte des écritures : on ne supprime pas, on déconseille.
  const journal = await pool.query(
    `SELECT code FROM "${schema}".journaux WHERE id = $1`, [id]
  );
  if (journal.rows.length === 0) return res.status(404).json({ error: 'Journal introuvable.' });
  const code = journal.rows[0].code as string;
  const countRes = await pool.query(
    `SELECT COUNT(*)::int AS n FROM "${schema}".ecritures WHERE journal = $1`, [code]
  );
  const nb = countRes.rows[0].n as number;
  if (nb > 0) {
    return res.status(409).json({
      error: `Ce journal porte ${nb} écriture(s). Désactivez-le plutôt que de le supprimer pour préserver l'historique.`,
      code: 'JOURNAL_HAS_ECRITURES',
    });
  }
  await pool.query(`DELETE FROM "${schema}".journaux WHERE id = $1`, [id]);
  res.status(204).end();
}));

export default router;
