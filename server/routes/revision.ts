import express, { Request, Response } from 'express';
import * as revisionService from '../services/revision.service';
import { asyncHandler } from '../middleware/asyncHandler';

const router = express.Router();

// GET /api/revision/:entite_id/:exercice_id/all-od
// IMPORTANT : cette route doit etre AVANT la route generique /:section
router.get('/:entite_id/:exercice_id/all-od', asyncHandler(async (req: Request, res: Response) => {
  const schema = req.tenantSchema;
  if (!schema) return res.status(400).json({ error: 'Contexte tenant manquant.' });
  const { exercice_id } = req.params;
  const allOd = await revisionService.getAllOd(schema, parseInt(exercice_id, 10));
  res.json({ odEcritures: allOd });
}));

// GET /api/revision/:entite_id/:exercice_id/:section
router.get('/:entite_id/:exercice_id/:section', asyncHandler(async (req: Request, res: Response) => {
  const schema = req.tenantSchema;
  if (!schema) return res.status(400).json({ error: 'Contexte tenant manquant.' });
  const { exercice_id, section } = req.params;
  const data = await revisionService.getSection(schema, parseInt(exercice_id, 10), section);
  res.json(data);
}));

// PUT /api/revision/:entite_id/:exercice_id/:section
router.put('/:entite_id/:exercice_id/:section', asyncHandler(async (req: Request, res: Response) => {
  const schema = req.tenantSchema;
  if (!schema) return res.status(400).json({ error: 'Contexte tenant manquant.' });
  const { exercice_id, section } = req.params;
  const data = req.body;
  await revisionService.saveSection(schema, parseInt(exercice_id, 10), section, data);
  res.json({ message: 'Sauvegarde.' });
}));

export default router;
