import express, { Request, Response } from 'express';
import logger from '../logger';
import * as service from '../services/resultatFiscal.service';
import { getErrorMessage } from '../utils/routeHelpers';
import { validateBody } from '../middleware/validate';
import { replaceLignesBody } from '../schemas/resultatFiscal.schema';

const router = express.Router();

// GET /api/resultat-fiscal/:exerciceId/lignes
router.get('/:exerciceId/lignes', async (req: Request, res: Response) => {
  const schema = req.tenantSchema;
  if (!schema) return res.status(400).json({ error: 'Contexte tenant manquant.' });
  const exerciceId = parseInt(req.params.exerciceId, 10);
  if (!Number.isFinite(exerciceId) || exerciceId <= 0) {
    return res.status(400).json({ error: 'exerciceId invalide.' });
  }
  try {
    const lignes = await service.listLignes(schema, exerciceId);
    res.json({ lignes });
  } catch (err) {
    logger.error(getErrorMessage(err as { message?: string }));
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

// PUT /api/resultat-fiscal/:exerciceId/lignes — remplace toutes les lignes
router.put(
  '/:exerciceId/lignes',
  validateBody(replaceLignesBody),
  async (req: Request, res: Response) => {
    const schema = req.tenantSchema;
    if (!schema) return res.status(400).json({ error: 'Contexte tenant manquant.' });
    const exerciceId = parseInt(req.params.exerciceId, 10);
    if (!Number.isFinite(exerciceId) || exerciceId <= 0) {
      return res.status(400).json({ error: 'exerciceId invalide.' });
    }
    try {
      const lignes = await service.replaceLignes(schema, exerciceId, req.body.lignes);
      res.json({ lignes });
    } catch (err) {
      logger.error(getErrorMessage(err as { message?: string }));
      res.status(500).json({ error: 'Erreur serveur.' });
    }
  },
);

export default router;
