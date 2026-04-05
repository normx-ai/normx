/**
 * Routes Rapprochement Bancaire — NormX
 * Import releves PDF/CSV/Excel + rapprochement auto
 */

import express, { Request, Response } from 'express';
import multer from 'multer';
import logger from '../logger';
import {
  parseCSV,
  parseExcel,
  parsePDF,
  rapprochementAuto,
  saveRapprochement,
} from '../services/rapprochement.service';
import type { LigneReleve, ReleveImport } from '../services/rapprochement.service';

const router = express.Router();
const ALLOWED_MIMES = [
  'text/csv', 'text/plain',
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel',
];
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_MIMES.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Type de fichier non autorise. Formats acceptes : CSV, PDF, Excel.'));
    }
  },
});

// ══ POST /api/rapprochement/import — Upload et parse un releve bancaire ══

router.post('/import', upload.single('file'), async (req: Request, res: Response) => {
  const schema = req.tenantSchema;
  if (!schema) return res.status(400).json({ error: 'Contexte tenant manquant.' });

  const file = req.file;
  if (!file) return res.status(400).json({ error: 'Fichier requis.' });

  try {
    let lignes: LigneReleve[] = [];
    let format: 'pdf' | 'csv' | 'xlsx' = 'csv';

    const ext = (file.originalname || '').toLowerCase();

    if (ext.endsWith('.pdf')) {
      lignes = await parsePDF(file.buffer);
      format = 'pdf';
    } else if (ext.endsWith('.xlsx') || ext.endsWith('.xls')) {
      lignes = parseExcel(file.buffer);
      format = 'xlsx';
    } else {
      // CSV par defaut
      const content = file.buffer.toString('utf-8');
      lignes = parseCSV(content);
      format = 'csv';
    }

    if (lignes.length === 0) {
      return res.status(400).json({
        error: 'Aucune ligne detectee dans le releve. Verifiez le format du fichier.',
        format,
      });
    }

    // Calculer soldes
    const totalDebit = lignes.reduce((s, l) => s + l.debit, 0);
    const totalCredit = lignes.reduce((s, l) => s + l.credit, 0);

    res.json({
      format,
      nb_lignes: lignes.length,
      total_debit: Math.round(totalDebit),
      total_credit: Math.round(totalCredit),
      lignes,
    });
  } catch (err) {
    logger.error('[rapprochement/import]', err);
    res.status(500).json({ error: 'Erreur lors du parsing du releve.' });
  }
});

// ══ POST /api/rapprochement/auto — Rapprochement automatique ══

router.post('/auto', async (req: Request, res: Response) => {
  const schema = req.tenantSchema;
  if (!schema) return res.status(400).json({ error: 'Contexte tenant manquant.' });

  const { entite_id, exercice_id, compte_bancaire, lignes } = req.body;

  if (!entite_id || !exercice_id || !compte_bancaire || !Array.isArray(lignes)) {
    return res.status(400).json({ error: 'entite_id, exercice_id, compte_bancaire et lignes requis.' });
  }

  try {
    const result = await rapprochementAuto(
      schema,
      Number(entite_id),
      Number(exercice_id),
      String(compte_bancaire),
      lignes as LigneReleve[],
    );

    res.json({
      result,
      lignes, // retourner les lignes avec le flag rapprochee mis a jour
    });
  } catch (err) {
    logger.error('[rapprochement/auto]', err);
    res.status(500).json({ error: 'Erreur lors du rapprochement automatique.' });
  }
});

// ══ POST /api/rapprochement/save — Sauvegarder le rapprochement ══

router.post('/save', async (req: Request, res: Response) => {
  const schema = req.tenantSchema;
  if (!schema) return res.status(400).json({ error: 'Contexte tenant manquant.' });

  const { entite_id, exercice_id, banque, compte_bancaire, mois, annee, solde_debut, solde_fin, lignes, result } = req.body;

  if (!entite_id || !exercice_id || !lignes) {
    return res.status(400).json({ error: 'Donnees manquantes.' });
  }

  try {
    const data: ReleveImport = {
      banque: banque || '',
      compte_bancaire: compte_bancaire || '521',
      mois: Number(mois) || new Date().getMonth() + 1,
      annee: Number(annee) || new Date().getFullYear(),
      solde_debut: Number(solde_debut) || 0,
      solde_fin: Number(solde_fin) || 0,
      lignes,
      format: 'csv',
    };

    const saved = await saveRapprochement(schema, Number(entite_id), Number(exercice_id), data, result);
    res.json({ id: saved.id, message: 'Rapprochement sauvegarde.' });
  } catch (err) {
    logger.error('[rapprochement/save]', err);
    res.status(500).json({ error: 'Erreur lors de la sauvegarde.' });
  }
});

// ══ GET /api/rapprochement/list — Liste des rapprochements ══

router.get('/list', async (req: Request, res: Response) => {
  const schema = req.tenantSchema;
  if (!schema) return res.status(400).json({ error: 'Contexte tenant manquant.' });

  const { entite_id, exercice_id } = req.query;
  if (!entite_id || !exercice_id) {
    return res.status(400).json({ error: 'entite_id et exercice_id requis.' });
  }

  try {
    const s = (await import('../utils/tenant.utils')).getValidatedSchemaName(schema);
    const result = await (await import('../db')).default.query(
      `SELECT id, banque, compte_bancaire, mois, annee, solde_debut, solde_fin,
              nb_lignes, nb_rapprochees, ecart, created_at
       FROM "${s}".rapprochements_bancaires
       WHERE entite_id = $1 AND exercice_id = $2
       ORDER BY created_at DESC`,
      [Number(entite_id), Number(exercice_id)],
    );
    res.json({ rapprochements: result.rows });
  } catch (err) {
    logger.error('[rapprochement/list]', err);
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

export default router;
