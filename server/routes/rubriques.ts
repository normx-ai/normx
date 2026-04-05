import express, { Request, Response } from 'express';
import * as rubriquesService from '../services/rubriques.service';
import { asyncHandler } from '../middleware/asyncHandler';

const router = express.Router();

// ============ LIST ALL RUBRIQUES ============

router.get('/', asyncHandler(async (req: Request, res: Response) => {
  const schema = req.tenantSchema;
  if (!schema) return res.status(400).json({ error: 'Contexte tenant manquant.' });

  const rubriques = await rubriquesService.getRubriques(schema);
  res.json({ rubriques });
}));

// ============ LIST BY TYPE ============

router.get('/type/:type', asyncHandler(async (req: Request, res: Response) => {
  const schema = req.tenantSchema;
  if (!schema) return res.status(400).json({ error: 'Contexte tenant manquant.' });

  const { type } = req.params;

  const rubriques = await rubriquesService.getRubriquesByType(schema, type);
  res.json({ rubriques });
}));

// ============ CREATE ============

router.post('/', asyncHandler(async (req: Request, res: Response) => {
  const schema = req.tenantSchema;
  if (!schema) return res.status(400).json({ error: 'Contexte tenant manquant.' });

  const { code, libelle, type, mode } = req.body;
  if (!code || !libelle || !type || !mode) {
    return res.status(400).json({ error: 'code, libelle, type et mode requis.' });
  }

  const rubrique = await rubriquesService.createRubrique(schema, req.body);
  res.status(201).json({ rubrique });
}));

// ============ UPDATE ============

router.put('/:id', asyncHandler(async (req: Request, res: Response) => {
  const schema = req.tenantSchema;
  if (!schema) return res.status(400).json({ error: 'Contexte tenant manquant.' });

  const { id } = req.params;

  const rubrique = await rubriquesService.updateRubrique(schema, Number(id), req.body);
  if (!rubrique) return res.status(404).json({ error: 'Rubrique non trouvee.' });
  res.json({ rubrique });
}));

// ============ DELETE (SOFT) ============

router.delete('/:id', asyncHandler(async (req: Request, res: Response) => {
  const schema = req.tenantSchema;
  if (!schema) return res.status(400).json({ error: 'Contexte tenant manquant.' });

  const { id } = req.params;

  const deleted = await rubriquesService.deleteRubrique(schema, Number(id));
  if (!deleted) return res.status(404).json({ error: 'Rubrique non trouvee.' });
  res.json({ message: 'Rubrique desactivee.' });
}));

// ============ INIT DEFAULTS ============

router.post('/init', asyncHandler(async (req: Request, res: Response) => {
  const schema = req.tenantSchema;
  if (!schema) return res.status(400).json({ error: 'Contexte tenant manquant.' });

  const rubriques = await rubriquesService.initRubriquesDefaut(schema);
  res.json({ rubriques });
}));

export default router;
