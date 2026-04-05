import express, { Request, Response } from 'express';
import * as tiersService from '../services/tiers.service';
import { asyncHandler } from '../middleware/asyncHandler';

const router = express.Router();

// Lister les tiers (avec filtres optionnels)
router.get('/:entite_id', asyncHandler(async (req: Request, res: Response) => {
  const schema = req.tenantSchema;
  if (!schema) return res.status(400).json({ error: 'Contexte tenant manquant.' });
  const { type, search, actif } = req.query;
  const rows = await tiersService.listTiers(schema, { type: type as string, search: search as string, actif: actif as string });
  res.json(rows);
}));

// Obtenir un tiers par ID
router.get('/detail/:id', asyncHandler(async (req: Request, res: Response) => {
  const schema = req.tenantSchema;
  if (!schema) return res.status(400).json({ error: 'Contexte tenant manquant.' });
  const tiers = await tiersService.getTiersById(schema, parseInt(req.params.id, 10));
  if (!tiers) return res.status(404).json({ error: 'Tiers non trouve.' });
  res.json(tiers);
}));

// Creer un tiers
router.post('/', asyncHandler(async (req: Request, res: Response) => {
  const schema = req.tenantSchema;
  if (!schema) return res.status(400).json({ error: 'Contexte tenant manquant.' });
  const { type, code_tiers, nom, compte_comptable, telephone, email, adresse, data } = req.body;
  if (!type || !nom) {
    return res.status(400).json({ error: 'Champs obligatoires: type, nom.' });
  }
  const tiers = await tiersService.createTiers(schema, { type, code_tiers, nom, compte_comptable, telephone, email, adresse, data });
  res.status(201).json(tiers);
}));

// Modifier un tiers
router.put('/:id', asyncHandler(async (req: Request, res: Response) => {
  const schema = req.tenantSchema;
  if (!schema) return res.status(400).json({ error: 'Contexte tenant manquant.' });
  const { type, code_tiers, nom, compte_comptable, telephone, email, adresse, data, actif } = req.body;
  if (!nom) return res.status(400).json({ error: 'Le nom est obligatoire.' });
  const tiers = await tiersService.updateTiers(schema, parseInt(req.params.id, 10), { type, code_tiers, nom, compte_comptable, telephone, email, adresse, data, actif });
  if (!tiers) return res.status(404).json({ error: 'Tiers non trouve.' });
  res.json(tiers);
}));

// Supprimer un tiers
router.delete('/:id', asyncHandler(async (req: Request, res: Response) => {
  const schema = req.tenantSchema;
  if (!schema) return res.status(400).json({ error: 'Contexte tenant manquant.' });
  const deleted = await tiersService.deleteTiers(schema, parseInt(req.params.id, 10));
  if (!deleted) return res.status(404).json({ error: 'Tiers non trouve.' });
  res.json({ message: 'Tiers supprime.' });
}));

export default router;
