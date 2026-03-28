import express, { Request, Response } from 'express';
import logger from '../logger';
import * as revisionService from '../services/revision.service';

const router = express.Router();

function getErrorMessage(err: { message?: string } | null): string {
  if (err && typeof err === 'object' && 'message' in err) return err.message || 'Erreur inconnue';
  return String(err);
}

// GET /api/revision/:entite_id/:exercice_id/all-od
// IMPORTANT : cette route doit etre AVANT la route generique /:section
router.get('/:entite_id/:exercice_id/all-od', async (req: Request, res: Response) => {
  const schema = req.tenantSchema;
  const { exercice_id } = req.params;
  try {
    const allOd = await revisionService.getAllOd(schema, exercice_id);
    res.json({ odEcritures: allOd });
  } catch (err) {
    logger.error(getErrorMessage(err as { message?: string }));
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

// GET /api/revision/:entite_id/:exercice_id/:section
router.get('/:entite_id/:exercice_id/:section', async (req: Request, res: Response) => {
  const schema = req.tenantSchema;
  const { exercice_id, section } = req.params;
  try {
    const data = await revisionService.getSection(schema, exercice_id, section);
    res.json(data);
  } catch (err) {
    logger.error(getErrorMessage(err as { message?: string }));
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

// PUT /api/revision/:entite_id/:exercice_id/:section
router.put('/:entite_id/:exercice_id/:section', async (req: Request, res: Response) => {
  const schema = req.tenantSchema;
  const { exercice_id, section } = req.params;
  const data = req.body;
  try {
    await revisionService.saveSection(schema, exercice_id, section, data);
    res.json({ message: 'Sauvegarde.' });
  } catch (err) {
    logger.error(getErrorMessage(err as { message?: string }));
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

export default router;
