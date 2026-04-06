/**
 * Routes Workflow Bulletin — NormX Paie
 * Gestion des statuts et cloture de periode.
 */

import express, { Request, Response } from 'express';
import * as workflowService from '../services/workflow.service';
import { asyncHandler } from '../middleware/asyncHandler';

const router = express.Router();

// ============ SAUVEGARDER UN BULLETIN ============

router.post('/bulletins', asyncHandler(async (req: Request, res: Response) => {
  const schema = req.tenantSchema;
  if (!schema) return res.status(400).json({ error: 'Contexte tenant manquant.' });

  const { salarie_id, mois, annee, data } = req.body;
  if (!salarie_id || !mois || !annee) {
    return res.status(400).json({ error: 'salarie_id, mois et annee requis.' });
  }

  const bulletin = await workflowService.saveBulletin(
    schema,
    Number(salarie_id),
    Number(mois),
    Number(annee),
    data || {},
  );
  res.json({ bulletin });
}));

// ============ RECUPERER UN BULLETIN ============

router.get('/bulletin', asyncHandler(async (req: Request, res: Response) => {
  const schema = req.tenantSchema;
  if (!schema) return res.status(400).json({ error: 'Contexte tenant manquant.' });

  const { salarie_id, mois, annee } = req.query;
  if (!salarie_id || !mois || !annee) {
    return res.status(400).json({ error: 'salarie_id, mois et annee requis.' });
  }

  const bulletin = await workflowService.getBulletin(
    schema,
    Number(salarie_id),
    Number(mois),
    Number(annee),
  );
  res.json({ bulletin });
}));

// ============ GENERER BULLETINS EN BATCH ============

router.post('/bulletins/batch', asyncHandler(async (req: Request, res: Response) => {
  const schema = req.tenantSchema;
  if (!schema) return res.status(400).json({ error: 'Contexte tenant manquant.' });

  const { mois, annee, bulletins } = req.body;
  if (!mois || !annee || !Array.isArray(bulletins)) {
    return res.status(400).json({ error: 'mois, annee et bulletins[] requis.' });
  }

  const count = await workflowService.genererBulletinsBatch(
    schema,
    Number(mois),
    Number(annee),
    bulletins.map((b: { salarieId: number; data: workflowService.BulletinData }) => ({
      salarieId: b.salarieId,
      data: b.data || {},
    })),
  );
  res.json({ count, message: `${count} bulletins generes.` });
}));

// ============ BULLETINS PAR PERIODE ============

router.get('/bulletins', asyncHandler(async (req: Request, res: Response) => {
  const schema = req.tenantSchema;
  if (!schema) return res.status(400).json({ error: 'Contexte tenant manquant.' });

  const { mois, annee } = req.query;
  if (!mois || !annee) {
    return res.status(400).json({ error: 'mois et annee requis.' });
  }

  const bulletins = await workflowService.getBulletinsByPeriode(
    schema,
    Number(mois),
    Number(annee),
  );
  res.json({ bulletins });
}));

// ============ MISE A JOUR STATUT ============

router.put('/bulletins/:id/statut', asyncHandler(async (req: Request, res: Response) => {
  const schema = req.tenantSchema;
  if (!schema) return res.status(400).json({ error: 'Contexte tenant manquant.' });

  const { id } = req.params;
  const { statut, valide_par } = req.body;

  if (!statut) {
    return res.status(400).json({ error: 'statut requis.' });
  }

  const statutsValides: string[] = ['brouillon', 'valide', 'verrouille'];
  if (!statutsValides.includes(statut)) {
    return res.status(400).json({ error: 'Statut invalide. Valeurs acceptees : brouillon, valide, verrouille.' });
  }

  const bulletin = await workflowService.updateStatutBulletin(
    schema,
    id,
    statut as workflowService.StatutBulletin,
    valide_par || null,
  );
  if (!bulletin) {
    return res.status(404).json({ error: 'Bulletin non trouve.' });
  }
  res.json({ bulletin });
}));

// ============ CLOTURE PERIODE ============

router.get('/cloture', asyncHandler(async (req: Request, res: Response) => {
  const schema = req.tenantSchema;
  if (!schema) return res.status(400).json({ error: 'Contexte tenant manquant.' });

  const { mois, annee } = req.query;
  if (!mois || !annee) {
    return res.status(400).json({ error: 'mois et annee requis.' });
  }

  const periode = await workflowService.getCloturePeriode(
    schema,
    Number(mois),
    Number(annee),
  );
  res.json({ periode });
}));

// POST /cloture — garde son propre try/catch car renvoie err.message en 400 (pas 500)
router.post('/cloture', async (req: Request, res: Response) => {
  const schema = req.tenantSchema;
  if (!schema) return res.status(400).json({ error: 'Contexte tenant manquant.' });

  const { mois, annee } = req.body;
  if (!mois || !annee) {
    return res.status(400).json({ error: 'mois et annee requis.' });
  }

  try {
    const periode = await workflowService.cloturerPeriodeDB(
      schema,
      Number(mois),
      Number(annee),
    );
    res.json({ periode });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erreur serveur.';
    res.status(400).json({ error: message });
  }
});

// ============ CUMULS ANNUELS ============

router.get('/cumuls', asyncHandler(async (req: Request, res: Response) => {
  const schema = req.tenantSchema;
  if (!schema) return res.status(400).json({ error: 'Contexte tenant manquant.' });

  const { annee } = req.query;
  if (!annee) {
    return res.status(400).json({ error: 'annee requis.' });
  }

  const cumuls = await workflowService.getCumulsAnnuels(
    schema,
    Number(annee),
  );
  res.json({ cumuls });
}));

export default router;
