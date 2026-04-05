import express, { Request, Response } from 'express';
import * as paieService from '../services/paie.service';
import { getPagination, paginatedResponse } from '../utils/pagination';
import { asyncHandler } from '../middleware/asyncHandler';

const router = express.Router();

// ============ CONFIG PAIE ============

router.get('/config', asyncHandler(async (req: Request, res: Response) => {
  const schema = req.tenantSchema;
  if (!schema) return res.status(400).json({ error: 'Contexte tenant manquant.' });

  const config = await paieService.getConfig(schema);
  res.json({ config });
}));

router.put('/config', asyncHandler(async (req: Request, res: Response) => {
  const schema = req.tenantSchema;
  if (!schema) return res.status(400).json({ error: 'Contexte tenant manquant.' });

  const config = await paieService.upsertConfig(schema, req.body);
  res.json({ config });
}));

// ============ ETABLISSEMENTS ============

router.get('/etablissements', asyncHandler(async (req: Request, res: Response) => {
  const schema = req.tenantSchema;
  if (!schema) return res.status(400).json({ error: 'Contexte tenant manquant.' });

  const etablissements = await paieService.getEtablissements(schema);
  res.json({ etablissements });
}));

router.post('/etablissements', asyncHandler(async (req: Request, res: Response) => {
  const schema = req.tenantSchema;
  if (!schema) return res.status(400).json({ error: 'Contexte tenant manquant.' });

  const { raison_sociale } = req.body;
  if (!raison_sociale) {
    return res.status(400).json({ error: 'raison_sociale requis.' });
  }

  const etablissement = await paieService.createEtablissement(schema, req.body);
  res.status(201).json({ etablissement });
}));

router.put('/etablissements/:id', asyncHandler(async (req: Request, res: Response) => {
  const schema = req.tenantSchema;
  if (!schema) return res.status(400).json({ error: 'Contexte tenant manquant.' });

  const { id } = req.params;

  const etablissement = await paieService.updateEtablissement(schema, id, req.body);
  if (!etablissement) return res.status(404).json({ error: 'Etablissement non trouve.' });
  res.json({ etablissement });
}));

router.delete('/etablissements/:id', asyncHandler(async (req: Request, res: Response) => {
  const schema = req.tenantSchema;
  if (!schema) return res.status(400).json({ error: 'Contexte tenant manquant.' });

  const { id } = req.params;

  const deleted = await paieService.deleteEtablissement(schema, id);
  if (!deleted) return res.status(404).json({ error: 'Etablissement non trouve.' });
  res.json({ message: 'Etablissement supprime.' });
}));

// ============ SALARIES ============

router.get('/salaries', asyncHandler(async (req: Request, res: Response) => {
  const schema = req.tenantSchema;
  if (!schema) return res.status(400).json({ error: 'Contexte tenant manquant.' });

  const pagination = getPagination(req);
  const { rows, total } = await paieService.getSalaries(schema, { limit: pagination.limit, offset: pagination.offset });
  res.json(paginatedResponse(rows, total, pagination));
}));

router.post('/salaries', asyncHandler(async (req: Request, res: Response) => {
  const schema = req.tenantSchema;
  if (!schema) return res.status(400).json({ error: 'Contexte tenant manquant.' });

  const salarie = await paieService.createSalarie(schema, req.body);
  res.status(201).json({ salarie });
}));

router.put('/salaries/:id', asyncHandler(async (req: Request, res: Response) => {
  const schema = req.tenantSchema;
  if (!schema) return res.status(400).json({ error: 'Contexte tenant manquant.' });

  const { id } = req.params;

  const salarie = await paieService.updateSalarie(schema, id, req.body);
  if (!salarie) return res.status(404).json({ error: 'Salarie non trouve.' });
  res.json({ salarie });
}));

router.delete('/salaries/:id', asyncHandler(async (req: Request, res: Response) => {
  const schema = req.tenantSchema;
  if (!schema) return res.status(400).json({ error: 'Contexte tenant manquant.' });

  const { id } = req.params;

  const deleted = await paieService.deleteSalarie(schema, id);
  if (!deleted) return res.status(404).json({ error: 'Salarie non trouve.' });
  res.json({ message: 'Salarie supprime.' });
}));

export default router;
