import express, { Request, Response } from 'express';
import logger from '../logger';
import * as tiersService from '../services/tiers.service';
import { getErrorMessage } from '../utils/routeHelpers';

const router = express.Router();

// Lister les tiers (avec filtres optionnels)
router.get('/:entite_id', async (req: Request, res: Response) => {
  const schema = req.tenantSchema;
  if (!schema) return res.status(400).json({ error: 'Contexte tenant manquant.' });
  const { type, search, actif } = req.query;
  try {
    const rows = await tiersService.listTiers(schema, { type: type as string, search: search as string, actif: actif as string });
    res.json(rows);
  } catch (err) {
    logger.error(getErrorMessage(err as { message?: string }));
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

// Obtenir un tiers par ID
router.get('/detail/:id', async (req: Request, res: Response) => {
  const schema = req.tenantSchema;
  if (!schema) return res.status(400).json({ error: 'Contexte tenant manquant.' });
  try {
    const tiers = await tiersService.getTiersById(schema, parseInt(req.params.id, 10));
    if (!tiers) return res.status(404).json({ error: 'Tiers non trouve.' });
    res.json(tiers);
  } catch (err) {
    logger.error(getErrorMessage(err as { message?: string }));
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

// Creer un tiers
router.post('/', async (req: Request, res: Response) => {
  const schema = req.tenantSchema;
  if (!schema) return res.status(400).json({ error: 'Contexte tenant manquant.' });
  const { type, code_tiers, nom, compte_comptable, telephone, email, adresse, data } = req.body;
  if (!type || !nom) {
    return res.status(400).json({ error: 'Champs obligatoires: type, nom.' });
  }
  try {
    const tiers = await tiersService.createTiers(schema, { type, code_tiers, nom, compte_comptable, telephone, email, adresse, data });
    res.status(201).json(tiers);
  } catch (err) {
    logger.error(getErrorMessage(err as { message?: string }));
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

// Modifier un tiers
router.put('/:id', async (req: Request, res: Response) => {
  const schema = req.tenantSchema;
  if (!schema) return res.status(400).json({ error: 'Contexte tenant manquant.' });
  const { type, code_tiers, nom, compte_comptable, telephone, email, adresse, data, actif } = req.body;
  if (!nom) return res.status(400).json({ error: 'Le nom est obligatoire.' });
  try {
    const tiers = await tiersService.updateTiers(schema, parseInt(req.params.id, 10), { type, code_tiers, nom, compte_comptable, telephone, email, adresse, data, actif });
    if (!tiers) return res.status(404).json({ error: 'Tiers non trouve.' });
    res.json(tiers);
  } catch (err) {
    logger.error(getErrorMessage(err as { message?: string }));
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

// Supprimer un tiers
router.delete('/:id', async (req: Request, res: Response) => {
  const schema = req.tenantSchema;
  if (!schema) return res.status(400).json({ error: 'Contexte tenant manquant.' });
  try {
    const deleted = await tiersService.deleteTiers(schema, parseInt(req.params.id, 10));
    if (!deleted) return res.status(404).json({ error: 'Tiers non trouve.' });
    res.json({ message: 'Tiers supprime.' });
  } catch (err) {
    logger.error(getErrorMessage(err as { message?: string }));
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

export default router;
