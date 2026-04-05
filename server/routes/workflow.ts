/**
 * Routes Workflow Bulletin — NormX Paie
 * Gestion des statuts et cloture de periode.
 */

import express, { Request, Response } from 'express';
import logger from '../logger';
import * as workflowService from '../services/workflow.service';

const router = express.Router();

// ============ SAUVEGARDER UN BULLETIN ============

router.post('/bulletins', async (req: Request, res: Response) => {
  const schema = req.tenantSchema;
  if (!schema) return res.status(400).json({ error: 'Contexte tenant manquant.' });

  const { salarie_id, mois, annee, data } = req.body;
  if (!salarie_id || !mois || !annee) {
    return res.status(400).json({ error: 'salarie_id, mois et annee requis.' });
  }

  try {
    const bulletin = await workflowService.saveBulletin(
      schema,
      Number(salarie_id),
      Number(mois),
      Number(annee),
      data || {},
    );
    res.json({ bulletin });
  } catch (err) {
    logger.error('Erreur route workflow: ' + (err instanceof Error ? err.message : String(err)));
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

// ============ RECUPERER UN BULLETIN ============

router.get('/bulletin', async (req: Request, res: Response) => {
  const schema = req.tenantSchema;
  if (!schema) return res.status(400).json({ error: 'Contexte tenant manquant.' });

  const { salarie_id, mois, annee } = req.query;
  if (!salarie_id || !mois || !annee) {
    return res.status(400).json({ error: 'salarie_id, mois et annee requis.' });
  }

  try {
    const bulletin = await workflowService.getBulletin(
      schema,
      Number(salarie_id),
      Number(mois),
      Number(annee),
    );
    res.json({ bulletin });
  } catch (err) {
    logger.error('Erreur route workflow: ' + (err instanceof Error ? err.message : String(err)));
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

// ============ GENERER BULLETINS EN BATCH ============

router.post('/bulletins/batch', async (req: Request, res: Response) => {
  const schema = req.tenantSchema;
  if (!schema) return res.status(400).json({ error: 'Contexte tenant manquant.' });

  const { mois, annee, bulletins } = req.body;
  if (!mois || !annee || !Array.isArray(bulletins)) {
    return res.status(400).json({ error: 'mois, annee et bulletins[] requis.' });
  }

  try {
    const count = await workflowService.genererBulletinsBatch(
      schema,
      Number(mois),
      Number(annee),
      bulletins.map((b: { salarieId: number; data: Record<string, unknown> }) => ({
        salarieId: b.salarieId,
        data: b.data || {},
      })),
    );
    res.json({ count, message: `${count} bulletins generes.` });
  } catch (err) {
    logger.error('Erreur route workflow: ' + (err instanceof Error ? err.message : String(err)));
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

// ============ BULLETINS PAR PERIODE ============

router.get('/bulletins', async (req: Request, res: Response) => {
  const schema = req.tenantSchema;
  if (!schema) return res.status(400).json({ error: 'Contexte tenant manquant.' });

  const { mois, annee } = req.query;
  if (!mois || !annee) {
    return res.status(400).json({ error: 'mois et annee requis.' });
  }

  try {
    const bulletins = await workflowService.getBulletinsByPeriode(
      schema,
      Number(mois),
      Number(annee),
    );
    res.json({ bulletins });
  } catch (err) {
    logger.error('Erreur route workflow: ' + (err instanceof Error ? err.message : String(err)));
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

// ============ MISE A JOUR STATUT ============

router.put('/bulletins/:id/statut', async (req: Request, res: Response) => {
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

  try {
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
  } catch (err) {
    logger.error('Erreur route workflow: ' + (err instanceof Error ? err.message : String(err)));
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

// ============ CLOTURE PERIODE ============

router.get('/cloture', async (req: Request, res: Response) => {
  const schema = req.tenantSchema;
  if (!schema) return res.status(400).json({ error: 'Contexte tenant manquant.' });

  const { mois, annee } = req.query;
  if (!mois || !annee) {
    return res.status(400).json({ error: 'mois et annee requis.' });
  }

  try {
    const periode = await workflowService.getCloturePeriode(
      schema,
      Number(mois),
      Number(annee),
    );
    res.json({ periode });
  } catch (err) {
    logger.error('Erreur route workflow: ' + (err instanceof Error ? err.message : String(err)));
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

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

router.get('/cumuls', async (req: Request, res: Response) => {
  const schema = req.tenantSchema;
  if (!schema) return res.status(400).json({ error: 'Contexte tenant manquant.' });

  const { annee } = req.query;
  if (!annee) {
    return res.status(400).json({ error: 'annee requis.' });
  }

  try {
    const cumuls = await workflowService.getCumulsAnnuels(
      schema,
      Number(annee),
    );
    res.json({ cumuls });
  } catch (err) {
    logger.error('Erreur route workflow: ' + (err instanceof Error ? err.message : String(err)));
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

export default router;
