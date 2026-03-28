import express, { Request, Response } from 'express';
import logger from '../logger';
import * as entitesService from '../services/entites.service';

const router = express.Router();

function getErrorMessage(err: { message?: string } | null): string {
  if (err && typeof err === 'object' && 'message' in err) return err.message || 'Erreur inconnue';
  return String(err);
}

// GET entite complete (avec data JSONB)
router.get('/:id', async (req: Request, res: Response) => {
  const schema = req.tenantSchema as string;
  try {
    const entite = await entitesService.getEntiteById(schema, req.params.id);
    if (!entite) return res.status(404).json({ error: 'Entite non trouvee.' });
    res.json(entite);
  } catch (err) {
    logger.error(getErrorMessage(err as { message?: string }));
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

export default router;
