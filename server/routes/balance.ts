import express, { Request, Response } from 'express';
import logger from '../logger';
import * as balanceService from '../services/balance.service';

const router = express.Router();

function getErrorMessage(err: { message?: string } | null): string {
  if (err && typeof err === 'object' && 'message' in err) return err.message || 'Erreur inconnue';
  return String(err);
}

// Creer/obtenir exercice
router.post('/exercice', async (req: Request, res: Response) => {
  const { annee, duree_mois, date_debut, date_fin } = req.body;
  const schema = req.tenantSchema;
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

// Lister exercices d'une entite
router.get('/exercices/:entite_id', async (req: Request, res: Response) => {
  const schema = req.tenantSchema;
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
  try {
    const result = await balanceService.cloturerExercice(schema, req.params.id);
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
  try {
    const result = await balanceService.rouvrirExercice(schema, req.params.id);
    if (!result) return res.status(404).json({ error: 'Exercice non trouve ou deja ouvert.' });
    res.json(result);
  } catch (err) {
    logger.error(getErrorMessage(err as { message?: string }));
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

// Importer balance
router.post('/import', async (req: Request, res: Response) => {
  const { exercice_id, type_balance, nom_fichier, lignes } = req.body;
  const schema = req.tenantSchema;

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
  try {
    const deleted = await balanceService.deleteBalance(schema, req.params.balance_id);
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
  const { numero_compte, libelle_compte, si_debit, si_credit, debit, credit, solde_debiteur, solde_crediteur } = req.body;
  try {
    const result = await balanceService.updateBalanceLigne(schema, req.params.ligne_id, { numero_compte, libelle_compte, si_debit, si_credit, debit, credit, solde_debiteur, solde_crediteur });
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
  const { exercice_id, type_balance } = req.params;
  try {
    const data = await balanceService.getBalance(schema, exercice_id, type_balance);
    res.json(data);
  } catch (err) {
    logger.error(getErrorMessage(err as { message?: string }));
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

// Revision : mettre a jour une ligne
router.put('/revision/:ligne_id', async (req: Request, res: Response) => {
  const schema = req.tenantSchema;
  const { debit_revise, credit_revise, solde_debiteur_revise, solde_crediteur_revise, note_revision } = req.body;
  try {
    const result = await balanceService.updateRevisionLigne(schema, req.params.ligne_id, {
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
  const { statut, revision_notes, user_id } = req.body;
  if (!['brut', 'revise', 'valide'].includes(statut)) {
    return res.status(400).json({ error: 'Statut invalide.' });
  }
  try {
    const result = await balanceService.updateBalanceStatut(schema, req.params.balance_id, statut, user_id, revision_notes);
    if (!result) return res.status(404).json({ error: 'Balance non trouvee.' });
    res.json(result);
  } catch (err) {
    logger.error(getErrorMessage(err as { message?: string }));
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

export default router;
