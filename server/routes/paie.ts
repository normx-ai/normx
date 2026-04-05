import express, { Request, Response } from 'express';
import logger from '../logger';
import * as paieService from '../services/paie.service';
import { getPagination, paginatedResponse } from '../utils/pagination';

const router = express.Router();

// ============ CONFIG PAIE ============

router.get('/config', async (req: Request, res: Response) => {
  const schema = req.tenantSchema;
  if (!schema) return res.status(400).json({ error: 'Contexte tenant manquant.' });

  try {
    const config = await paieService.getConfig(schema);
    res.json({ config });
  } catch (err) {
    logger.error('Erreur route paie: ' + (err instanceof Error ? err.message : String(err)));
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

router.put('/config', async (req: Request, res: Response) => {
  const schema = req.tenantSchema;
  if (!schema) return res.status(400).json({ error: 'Contexte tenant manquant.' });

  try {
    const config = await paieService.upsertConfig(schema, req.body);
    res.json({ config });
  } catch (err) {
    logger.error('Erreur route paie: ' + (err instanceof Error ? err.message : String(err)));
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

// ============ ETABLISSEMENTS ============

router.get('/etablissements', async (req: Request, res: Response) => {
  const schema = req.tenantSchema;
  if (!schema) return res.status(400).json({ error: 'Contexte tenant manquant.' });

  try {
    const etablissements = await paieService.getEtablissements(schema);
    res.json({ etablissements });
  } catch (err) {
    logger.error('Erreur route paie: ' + (err instanceof Error ? err.message : String(err)));
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

router.post('/etablissements', async (req: Request, res: Response) => {
  const schema = req.tenantSchema;
  if (!schema) return res.status(400).json({ error: 'Contexte tenant manquant.' });

  const { raison_sociale } = req.body;
  if (!raison_sociale) {
    return res.status(400).json({ error: 'raison_sociale requis.' });
  }

  try {
    const etablissement = await paieService.createEtablissement(schema, req.body);
    res.status(201).json({ etablissement });
  } catch (err) {
    logger.error('Erreur route paie: ' + (err instanceof Error ? err.message : String(err)));
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

router.put('/etablissements/:id', async (req: Request, res: Response) => {
  const schema = req.tenantSchema;
  if (!schema) return res.status(400).json({ error: 'Contexte tenant manquant.' });

  const { id } = req.params;

  try {
    const etablissement = await paieService.updateEtablissement(schema, id, req.body);
    if (!etablissement) return res.status(404).json({ error: 'Etablissement non trouve.' });
    res.json({ etablissement });
  } catch (err) {
    logger.error('Erreur route paie: ' + (err instanceof Error ? err.message : String(err)));
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

router.delete('/etablissements/:id', async (req: Request, res: Response) => {
  const schema = req.tenantSchema;
  if (!schema) return res.status(400).json({ error: 'Contexte tenant manquant.' });

  const { id } = req.params;

  try {
    const deleted = await paieService.deleteEtablissement(schema, id);
    if (!deleted) return res.status(404).json({ error: 'Etablissement non trouve.' });
    res.json({ message: 'Etablissement supprime.' });
  } catch (err) {
    logger.error('Erreur route paie: ' + (err instanceof Error ? err.message : String(err)));
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

// ============ SALARIES ============

router.get('/salaries', async (req: Request, res: Response) => {
  const schema = req.tenantSchema;
  if (!schema) return res.status(400).json({ error: 'Contexte tenant manquant.' });

  const pagination = getPagination(req);
  try {
    const { rows, total } = await paieService.getSalaries(schema, { limit: pagination.limit, offset: pagination.offset });
    res.json(paginatedResponse(rows, total, pagination));
  } catch (err) {
    logger.error('Erreur route paie: ' + (err instanceof Error ? err.message : String(err)));
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

router.post('/salaries', async (req: Request, res: Response) => {
  const schema = req.tenantSchema;
  if (!schema) return res.status(400).json({ error: 'Contexte tenant manquant.' });

  try {
    const salarie = await paieService.createSalarie(schema, req.body);
    res.status(201).json({ salarie });
  } catch (err) {
    logger.error('Erreur route paie: ' + (err instanceof Error ? err.message : String(err)));
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

router.put('/salaries/:id', async (req: Request, res: Response) => {
  const schema = req.tenantSchema;
  if (!schema) return res.status(400).json({ error: 'Contexte tenant manquant.' });

  const { id } = req.params;

  try {
    const salarie = await paieService.updateSalarie(schema, id, req.body);
    if (!salarie) return res.status(404).json({ error: 'Salarie non trouve.' });
    res.json({ salarie });
  } catch (err) {
    logger.error('Erreur route paie: ' + (err instanceof Error ? err.message : String(err)));
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

router.delete('/salaries/:id', async (req: Request, res: Response) => {
  const schema = req.tenantSchema;
  if (!schema) return res.status(400).json({ error: 'Contexte tenant manquant.' });

  const { id } = req.params;

  try {
    const deleted = await paieService.deleteSalarie(schema, id);
    if (!deleted) return res.status(404).json({ error: 'Salarie non trouve.' });
    res.json({ message: 'Salarie supprime.' });
  } catch (err) {
    logger.error('Erreur route paie: ' + (err instanceof Error ? err.message : String(err)));
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

export default router;
