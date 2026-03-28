import express, { Request, Response } from 'express';
import * as rubriquesService from '../services/rubriques.service';

const router = express.Router();

// ============ LIST ALL RUBRIQUES ============

router.get('/', async (req: Request, res: Response) => {
  const schema = req.tenantSchema;
  if (!schema) return res.status(400).json({ error: 'Contexte tenant manquant.' });

  try {
    const rubriques = await rubriquesService.getRubriques(schema);
    res.json({ rubriques });
  } catch {
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

// ============ LIST BY TYPE ============

router.get('/type/:type', async (req: Request, res: Response) => {
  const schema = req.tenantSchema;
  if (!schema) return res.status(400).json({ error: 'Contexte tenant manquant.' });

  const { type } = req.params;

  try {
    const rubriques = await rubriquesService.getRubriquesByType(schema, type);
    res.json({ rubriques });
  } catch {
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

// ============ CREATE ============

router.post('/', async (req: Request, res: Response) => {
  const schema = req.tenantSchema;
  if (!schema) return res.status(400).json({ error: 'Contexte tenant manquant.' });

  const { code, libelle, type, mode } = req.body;
  if (!code || !libelle || !type || !mode) {
    return res.status(400).json({ error: 'code, libelle, type et mode requis.' });
  }

  try {
    const rubrique = await rubriquesService.createRubrique(schema, req.body);
    res.status(201).json({ rubrique });
  } catch {
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

// ============ UPDATE ============

router.put('/:id', async (req: Request, res: Response) => {
  const schema = req.tenantSchema;
  if (!schema) return res.status(400).json({ error: 'Contexte tenant manquant.' });

  const { id } = req.params;

  try {
    const rubrique = await rubriquesService.updateRubrique(schema, Number(id), req.body);
    if (!rubrique) return res.status(404).json({ error: 'Rubrique non trouvee.' });
    res.json({ rubrique });
  } catch {
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

// ============ DELETE (SOFT) ============

router.delete('/:id', async (req: Request, res: Response) => {
  const schema = req.tenantSchema;
  if (!schema) return res.status(400).json({ error: 'Contexte tenant manquant.' });

  const { id } = req.params;

  try {
    const deleted = await rubriquesService.deleteRubrique(schema, Number(id));
    if (!deleted) return res.status(404).json({ error: 'Rubrique non trouvee.' });
    res.json({ message: 'Rubrique desactivee.' });
  } catch {
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

// ============ INIT DEFAULTS ============

router.post('/init', async (req: Request, res: Response) => {
  const schema = req.tenantSchema;
  if (!schema) return res.status(400).json({ error: 'Contexte tenant manquant.' });

  try {
    const rubriques = await rubriquesService.initRubriquesDefaut(schema);
    res.json({ rubriques });
  } catch {
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

export default router;
