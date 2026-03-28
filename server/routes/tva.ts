import express, { Request, Response } from 'express';
import path from 'path';
import logger from '../logger';
import * as tvaService from '../services/tva.service';

interface PlanCompte {
  numero: string;
  libelle: string;
  classe: number;
}

const router = express.Router();

function getErrorMessage(err: { message?: string } | null): string {
  if (err && typeof err === 'object' && 'message' in err) return err.message || 'Erreur inconnue';
  return String(err);
}

// GET /declarations/:entiteId/:exerciceId
router.get('/declarations/:entiteId/:exerciceId', async (req: Request, res: Response) => {
  const schema = req.tenantSchema;
  try {
    const rows = await tvaService.getDeclarations(schema, req.params.exerciceId);
    res.json(rows);
  } catch (err) {
    logger.error(getErrorMessage(err as { message?: string }));
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

// GET /declaration/:id
router.get('/declaration/:id', async (req: Request, res: Response) => {
  const schema = req.tenantSchema;
  try {
    const data = await tvaService.getDeclarationDetail(schema, req.params.id);
    if (!data) return res.status(404).json({ error: 'Declaration non trouvee.' });
    res.json(data);
  } catch (err) {
    logger.error(getErrorMessage(err as { message?: string }));
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

// GET /lignes/:declarationId/:onglet
router.get('/lignes/:declarationId/:onglet', async (req: Request, res: Response) => {
  const schema = req.tenantSchema;
  try {
    const rows = await tvaService.getLignesByOnglet(schema, req.params.declarationId, req.params.onglet);
    res.json(rows);
  } catch (err) {
    logger.error(getErrorMessage(err as { message?: string }));
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

// GET /montants-comptes/:entiteId/:exerciceId
router.get('/montants-comptes/:entiteId/:exerciceId', async (req: Request, res: Response) => {
  const schema = req.tenantSchema;
  const { mois, comptes } = req.query;
  if (!mois || !comptes) {
    return res.status(400).json({ error: 'Parametres mois et comptes requis.' });
  }
  try {
    const data = await tvaService.getMontantsComptes(schema, req.params.exerciceId, mois, comptes);
    if (!data) return res.status(404).json({ error: 'Exercice non trouve.' });
    res.json(data);
  } catch (err) {
    logger.error(getErrorMessage(err as { message?: string }));
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

// GET /plan-comptable-44
router.get('/plan-comptable-44', (_req: Request, res: Response) => {
  try {
    const planComptable: PlanCompte[] = require(path.join(__dirname, '..', 'data', 'plan_comptable_sycebnl.json'));
    const comptes44 = planComptable.filter((c: PlanCompte) => c.numero.startsWith('44'));
    res.json(comptes44);
  } catch (err) {
    logger.error(getErrorMessage(err as { message?: string }));
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

// POST /ligne
router.post('/ligne', async (req: Request, res: Response) => {
  const schema = req.tenantSchema;
  const { declaration_id, onglet, groupe, reference, libelle, montant_net, taux_taxe, montant_taxe, date_document, avoir } = req.body;
  if (!declaration_id || !onglet) {
    return res.status(400).json({ error: 'declaration_id et onglet sont requis.' });
  }
  try {
    const result = await tvaService.addLigne(schema, { declaration_id, onglet, groupe, reference, libelle, montant_net, taux_taxe, montant_taxe, date_document, avoir });
    res.status(201).json(result);
  } catch (err) {
    logger.error(getErrorMessage(err as { message?: string }));
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

// PUT /ligne/:id
router.put('/ligne/:id', async (req: Request, res: Response) => {
  const schema = req.tenantSchema;
  const { onglet, groupe, reference, libelle, montant_net, taux_taxe, montant_taxe, date_document, avoir } = req.body;
  try {
    const result = await tvaService.updateLigne(schema, req.params.id, { onglet, groupe, reference, libelle, montant_net, taux_taxe, montant_taxe, date_document, avoir });
    if (!result) return res.status(404).json({ error: 'Ligne non trouvee.' });
    res.json(result);
  } catch (err) {
    logger.error(getErrorMessage(err as { message?: string }));
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

// DELETE /ligne/:id
router.delete('/ligne/:id', async (req: Request, res: Response) => {
  const schema = req.tenantSchema;
  try {
    const result = await tvaService.deleteLigne(schema, req.params.id);
    if (!result) return res.status(404).json({ error: 'Ligne non trouvee.' });
    res.json({ message: 'Ligne supprimee.', totals: result.totals });
  } catch (err) {
    logger.error(getErrorMessage(err as { message?: string }));
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

// POST /importer-ecritures/:declarationId
router.post('/importer-ecritures/:declarationId', async (req: Request, res: Response) => {
  const schema = req.tenantSchema;
  try {
    const result = await tvaService.importerEcritures(schema, req.params.declarationId);
    if (result.notFound) return res.status(404).json({ error: result.notFound });
    res.json({
      message: `Import termine : ${result.nb_collectee} lignes TVA collectee, ${result.nb_deductible} lignes TVA deductible.`,
      nb_collectee: result.nb_collectee,
      nb_deductible: result.nb_deductible,
      totals: result.totals,
    });
  } catch (err) {
    logger.error(getErrorMessage(err as { message?: string }));
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

// PUT /declaration/:id/statut
router.put('/declaration/:id/statut', async (req: Request, res: Response) => {
  const schema = req.tenantSchema;
  const { statut } = req.body;
  try {
    const result = await tvaService.updateDeclarationStatut(schema, req.params.id, statut);
    if (result.notFound) return res.status(404).json({ error: 'Declaration non trouvee.' });
    if (result.forbidden) return res.status(400).json({ error: result.message });
    res.json(result.declaration);
  } catch (err) {
    logger.error(getErrorMessage(err as { message?: string }));
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

export default router;
