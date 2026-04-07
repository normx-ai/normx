/**
 * Routes OCR Import — NormX
 * Upload de documents comptables + extraction via Claude Vision
 */

import express, { Request, Response } from 'express';
import multer from 'multer';
import { fromBuffer } from 'file-type';
import logger from '../logger';
import { processDocument } from '../services/ocr-import.service';

const router = express.Router();

const ALLOWED_MIMES = [
  'image/jpeg', 'image/png', 'image/webp',
  'application/pdf',
];

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_MIMES.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Format non supporte. Utilisez PDF, JPG, PNG ou WEBP.'));
    }
  },
});

// POST /api/ocr-import/extract — Extraire les donnees d'un document comptable
router.post('/extract', upload.single('file'), async (req: Request, res: Response) => {
  const schema = req.tenantSchema;
  if (!schema) {
    return res.status(400).json({ error: 'Contexte tenant manquant.' });
  }

  if (!req.file) {
    return res.status(400).json({ error: 'Fichier requis.' });
  }

  // Verification magic bytes : le contenu reel doit correspondre au MIME declare
  const detected = await fromBuffer(req.file.buffer);
  if (!detected || !ALLOWED_MIMES.includes(detected.mime)) {
    return res.status(400).json({ error: 'Le contenu du fichier ne correspond pas au format declare.' });
  }

  try {
    const result = await processDocument(req.file.buffer, detected.mime, schema);
    res.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error('OCR Import erreur: %s', message);

    if (message.includes('JSON')) {
      return res.status(422).json({ error: 'Impossible d\'extraire les donnees du document. Essayez avec une meilleure image.' });
    }
    res.status(500).json({ error: 'Erreur lors de l\'analyse du document.' });
  }
});

export default router;
