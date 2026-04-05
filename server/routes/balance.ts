import express, { Request, Response } from 'express';
import logger from '../logger';
import * as balanceService from '../services/balance.service';
import { getErrorMessage } from '../utils/routeHelpers';
import { validateBody } from '../middleware/validate';
import { createExerciceBody, importBalanceBody } from '../schemas/balance.schema';

const router = express.Router();

/**
 * @swagger
 * /balance/exercice:
 *   post:
 *     summary: Creer un exercice comptable
 *     tags: [Balance]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [annee]
 *             properties:
 *               annee:
 *                 type: integer
 *                 example: 2025
 *               duree_mois:
 *                 type: integer
 *                 default: 12
 *               date_debut:
 *                 type: string
 *                 format: date
 *               date_fin:
 *                 type: string
 *                 format: date
 *     responses:
 *       201:
 *         description: Exercice cree
 *       200:
 *         description: Exercice existant retourne
 *       400:
 *         description: Erreur de validation
 */
// Creer/obtenir exercice
router.post('/exercice', validateBody(createExerciceBody), async (req: Request, res: Response) => {
  const { annee, duree_mois, date_debut, date_fin } = req.body;
  const schema = req.tenantSchema;
  if (!schema) return res.status(400).json({ error: 'Contexte tenant manquant.' });
  if (!annee) return res.status(400).json({ error: 'annee requis.' });

  const duree = parseInt(duree_mois, 10) || 12;

  // Valider la duree : 7-12 mois ou exactement 18 mois
  if (duree === 18) {
    // OK
  } else if (duree >= 7 && duree <= 12) {
    // OK
  } else {
    return res.status(400).json({ error: 'Duree invalide (' + duree + ' mois). Autorise : 7 a 12 mois ou 18 mois.' });
  }

  try {
    const result = await balanceService.createExercice(schema, annee, duree, date_debut, date_fin);
    if (result.error) return res.status(400).json({ error: result.error });
    if (result.existing) return res.json(result.existing);
    res.status(201).json(result.created);
  } catch (err) {
    logger.error(getErrorMessage(err as { message?: string }));
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

/**
 * @swagger
 * /balance/exercices/{entite_id}:
 *   get:
 *     summary: Lister les exercices d'une entite
 *     tags: [Balance]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: entite_id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID de l'entite
 *     responses:
 *       200:
 *         description: Liste des exercices
 *       400:
 *         description: Contexte tenant manquant
 */
// Lister exercices d'une entite
router.get('/exercices/:entite_id', async (req: Request, res: Response) => {
  const schema = req.tenantSchema;
  if (!schema) return res.status(400).json({ error: 'Contexte tenant manquant.' });
  try {
    const rows = await balanceService.listExercices(schema);
    res.json(rows);
  } catch (err) {
    logger.error(getErrorMessage(err as { message?: string }));
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

// Cloturer un exercice
router.put('/exercice/:id/cloturer', async (req: Request, res: Response) => {
  const schema = req.tenantSchema;
  if (!schema) return res.status(400).json({ error: 'Contexte tenant manquant.' });
  try {
    const result = await balanceService.cloturerExercice(schema, parseInt(req.params.id, 10));
    if (!result) return res.status(404).json({ error: 'Exercice non trouve ou deja cloture.' });
    res.json(result);
  } catch (err) {
    logger.error(getErrorMessage(err as { message?: string }));
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

// Rouvrir un exercice
router.put('/exercice/:id/rouvrir', async (req: Request, res: Response) => {
  const schema = req.tenantSchema;
  if (!schema) return res.status(400).json({ error: 'Contexte tenant manquant.' });
  try {
    const result = await balanceService.rouvrirExercice(schema, parseInt(req.params.id, 10));
    if (!result) return res.status(404).json({ error: 'Exercice non trouve ou deja ouvert.' });
    res.json(result);
  } catch (err) {
    logger.error(getErrorMessage(err as { message?: string }));
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

/**
 * @swagger
 * /balance/import:
 *   post:
 *     summary: Importer une balance comptable
 *     tags: [Balance]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [exercice_id, type_balance, lignes]
 *             properties:
 *               exercice_id:
 *                 type: integer
 *                 example: 1
 *               type_balance:
 *                 type: string
 *                 enum: [ouverture, generale, cloture]
 *                 example: generale
 *               nom_fichier:
 *                 type: string
 *                 example: balance_2025.xlsx
 *               lignes:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     numero_compte:
 *                       type: string
 *                     libelle_compte:
 *                       type: string
 *                     debit:
 *                       type: number
 *                     credit:
 *                       type: number
 *     responses:
 *       201:
 *         description: Balance importee
 *       400:
 *         description: Donnees incompletes
 */
// Importer balance
router.post('/import', validateBody(importBalanceBody), async (req: Request, res: Response) => {
  const { exercice_id, type_balance, nom_fichier, lignes } = req.body;
  const schema = req.tenantSchema;
  if (!schema) return res.status(400).json({ error: 'Contexte tenant manquant.' });

  if (!exercice_id || !type_balance || !lignes || !lignes.length) {
    return res.status(400).json({ error: 'Donnees incompletes.' });
  }

  try {
    const result = await balanceService.importBalance(schema, { exercice_id, type_balance, nom_fichier, lignes });
    res.status(201).json({
      message: `Balance ${type_balance} importee (${result.nb_lignes} lignes).`,
      balance: result.balance,
      nb_lignes: result.nb_lignes,
    });
  } catch (err) {
    logger.error(getErrorMessage(err as { message?: string }));
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

// Supprimer une balance importee
router.delete('/:balance_id', async (req: Request, res: Response) => {
  const schema = req.tenantSchema;
  if (!schema) return res.status(400).json({ error: 'Contexte tenant manquant.' });
  try {
    const deleted = await balanceService.deleteBalance(schema, parseInt(req.params.balance_id, 10));
    if (!deleted) return res.status(404).json({ error: 'Balance introuvable.' });
    res.json({ message: 'Balance supprimee.' });
  } catch (err) {
    logger.error(getErrorMessage(err as { message?: string }));
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

// Modifier une ligne de balance
router.put('/ligne/:ligne_id', async (req: Request, res: Response) => {
  const schema = req.tenantSchema;
  if (!schema) return res.status(400).json({ error: 'Contexte tenant manquant.' });
  const { numero_compte, libelle_compte, si_debit, si_credit, debit, credit, solde_debiteur, solde_crediteur } = req.body;
  try {
    const result = await balanceService.updateBalanceLigne(schema, parseInt(req.params.ligne_id, 10), { numero_compte, libelle_compte, si_debit, si_credit, debit, credit, solde_debiteur, solde_crediteur });
    if (result === null) return res.status(404).json({ error: 'Ligne introuvable.' });
    if (result.noUpdate) return res.status(400).json({ error: 'Aucun champ a modifier.' });
    res.json(result);
  } catch (err) {
    logger.error(getErrorMessage(err as { message?: string }));
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

// Obtenir balance avec lignes
router.get('/:entite_id/:exercice_id/:type_balance', async (req: Request, res: Response) => {
  const schema = req.tenantSchema;
  if (!schema) return res.status(400).json({ error: 'Contexte tenant manquant.' });
  const { exercice_id, type_balance } = req.params;
  try {
    const data = await balanceService.getBalance(schema, parseInt(exercice_id, 10), type_balance);
    res.json(data);
  } catch (err) {
    logger.error(getErrorMessage(err as { message?: string }));
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

// Revision : mettre a jour une ligne
router.put('/revision/:ligne_id', async (req: Request, res: Response) => {
  const schema = req.tenantSchema;
  if (!schema) return res.status(400).json({ error: 'Contexte tenant manquant.' });
  const { debit_revise, credit_revise, solde_debiteur_revise, solde_crediteur_revise, note_revision } = req.body;
  try {
    const result = await balanceService.updateRevisionLigne(schema, parseInt(req.params.ligne_id, 10), {
      debit_revise: debit_revise !== undefined ? debit_revise : null,
      credit_revise: credit_revise !== undefined ? credit_revise : null,
      solde_debiteur_revise: solde_debiteur_revise !== undefined ? solde_debiteur_revise : null,
      solde_crediteur_revise: solde_crediteur_revise !== undefined ? solde_crediteur_revise : null,
      note_revision,
    });
    if (!result) return res.status(404).json({ error: 'Ligne non trouvee.' });
    res.json(result);
  } catch (err) {
    logger.error(getErrorMessage(err as { message?: string }));
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

// Valider/changer statut balance
router.put('/statut/:balance_id', async (req: Request, res: Response) => {
  const schema = req.tenantSchema;
  if (!schema) return res.status(400).json({ error: 'Contexte tenant manquant.' });
  const { statut, revision_notes, user_id } = req.body;
  if (!['brut', 'revise', 'valide'].includes(statut)) {
    return res.status(400).json({ error: 'Statut invalide.' });
  }
  try {
    const result = await balanceService.updateBalanceStatut(schema, parseInt(req.params.balance_id, 10), statut, user_id, revision_notes);
    if (!result) return res.status(404).json({ error: 'Balance non trouvee.' });
    res.json(result);
  } catch (err) {
    logger.error(getErrorMessage(err as { message?: string }));
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

export default router;
