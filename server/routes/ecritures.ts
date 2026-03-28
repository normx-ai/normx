import express, { Request, Response } from 'express';
import path from 'path';
import logger from '../logger';
import * as ecrituresService from '../services/ecritures.service';

interface PlanCompte {
  numero: string;
  libelle: string;
  classe: number;
}

interface EcritureLigne {
  numero_compte: string;
  debit: string;
  credit: string;
  libelle?: string;
  tiers_id?: number;
}

interface EcheancierRow {
  debit: string;
  credit: string;
  lettrage_code: string | null;
}

const planComptable: PlanCompte[] = require(path.join(__dirname, '..', 'data', 'plan_comptable_sycebnl.json'));
const pcNums = new Set(planComptable.map((c: PlanCompte) => c.numero));

// Verifier un compte padde : "101100" -> cherche "1011", "101", "10" etc.
const isCompteValide = (numero: string): boolean => {
  if (pcNums.has(numero)) return true;
  let trimmed = numero.replace(/0+$/, '');
  while (trimmed.length >= 2) {
    if (pcNums.has(trimmed)) return true;
    trimmed = trimmed.slice(0, -1);
  }
  return false;
};

function getErrorMessage(err: { message?: string } | null): string {
  if (err && typeof err === 'object' && 'message' in err) return err.message || 'Erreur inconnue';
  return String(err);
}

const router = express.Router();

// Creer une ecriture avec ses lignes
router.post('/', async (req: Request, res: Response) => {
  const { exercice_id, date_ecriture, journal, numero_piece, libelle, lignes } = req.body;
  const schema = req.tenantSchema;

  if (!exercice_id || !date_ecriture || !libelle || !lignes || lignes.length < 2) {
    return res.status(400).json({ error: 'Donnees incompletes. Minimum 2 lignes.' });
  }

  const totalDebit = lignes.reduce((s: number, l: EcritureLigne) => s + (parseFloat(l.debit) || 0), 0);
  const totalCredit = lignes.reduce((s: number, l: EcritureLigne) => s + (parseFloat(l.credit) || 0), 0);
  if (Math.abs(totalDebit - totalCredit) > 0.01) {
    return res.status(400).json({ error: 'Ecriture desequilibree. Debit: ' + totalDebit + ', Credit: ' + totalCredit });
  }

  const comptesInvalides = lignes
    .filter((l: EcritureLigne) => l.numero_compte && (parseFloat(l.debit) || parseFloat(l.credit)))
    .filter((l: EcritureLigne) => !isCompteValide(l.numero_compte))
    .map((l: EcritureLigne) => l.numero_compte);
  if (comptesInvalides.length > 0) {
    return res.status(400).json({ error: 'Comptes invalides (absents du plan comptable SYCEBNL) : ' + comptesInvalides.join(', ') });
  }

  try {
    const ecriture = await ecrituresService.createEcriture(schema, { exercice_id, date_ecriture, journal, numero_piece, libelle, lignes });
    res.status(201).json({ message: 'Ecriture enregistree.', ecriture });
  } catch (err) {
    logger.error(getErrorMessage(err as { message?: string }));
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

// Lister ecritures d'un exercice
router.get('/:entite_id/:exercice_id', async (req: Request, res: Response) => {
  const schema = req.tenantSchema;
  const { journal, statut, date_du, date_au, search } = req.query;
  try {
    const rows = await ecrituresService.listEcritures(schema, req.params.exercice_id, { journal, statut, date_du, date_au, search });
    res.json(rows);
  } catch (err) {
    logger.error(getErrorMessage(err as { message?: string }));
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

// Valider une ou plusieurs ecritures
router.post('/valider', async (req: Request, res: Response) => {
  const { ids, user_id } = req.body;
  const schema = req.tenantSchema;
  if (!ids || !Array.isArray(ids) || ids.length === 0) {
    return res.status(400).json({ error: 'Aucune ecriture selectionnee.' });
  }
  try {
    const result = await ecrituresService.validerEcritures(schema, ids, user_id || null);
    res.json({ message: result.rowCount + ' ecriture(s) validee(s).', validated: result.rows.map((r: { id: number }) => r.id) });
  } catch (err) {
    logger.error(getErrorMessage(err as { message?: string }));
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

// Devalider une ecriture
router.post('/devalider', async (req: Request, res: Response) => {
  const { ids } = req.body;
  const schema = req.tenantSchema;
  if (!ids || !Array.isArray(ids) || ids.length === 0) {
    return res.status(400).json({ error: 'Aucune ecriture selectionnee.' });
  }
  try {
    const result = await ecrituresService.devaliderEcritures(schema, ids);
    res.json({ message: result.rowCount + ' ecriture(s) repassee(s) en brouillard.', devalidated: result.rows.map((r: { id: number }) => r.id) });
  } catch (err) {
    logger.error(getErrorMessage(err as { message?: string }));
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

// Modifier une ecriture (brouillard uniquement)
router.put('/:id', async (req: Request, res: Response) => {
  const { date_ecriture, journal, numero_piece, libelle, lignes } = req.body;
  const schema = req.tenantSchema;

  if (!date_ecriture || !libelle || !lignes || lignes.length < 2) {
    return res.status(400).json({ error: 'Donnees incompletes.' });
  }

  const totalDebit = lignes.reduce((s: number, l: EcritureLigne) => s + (parseFloat(l.debit) || 0), 0);
  const totalCredit = lignes.reduce((s: number, l: EcritureLigne) => s + (parseFloat(l.credit) || 0), 0);
  if (Math.abs(totalDebit - totalCredit) > 0.01) {
    return res.status(400).json({ error: 'Ecriture desequilibree.' });
  }

  const comptesInvalides = lignes
    .filter((l: EcritureLigne) => l.numero_compte && (parseFloat(l.debit) || parseFloat(l.credit)))
    .filter((l: EcritureLigne) => !isCompteValide(l.numero_compte))
    .map((l: EcritureLigne) => l.numero_compte);
  if (comptesInvalides.length > 0) {
    return res.status(400).json({ error: 'Comptes invalides : ' + comptesInvalides.join(', ') });
  }

  try {
    const result = await ecrituresService.updateEcriture(schema, req.params.id, { date_ecriture, journal, numero_piece, libelle, lignes });
    if (result.notFound) return res.status(404).json({ error: 'Ecriture non trouvee.' });
    if (result.forbidden) return res.status(403).json({ error: 'Impossible de modifier une ecriture validee. Contrepassez-la.' });
    res.json({ message: 'Ecriture modifiee.' });
  } catch (err) {
    logger.error(getErrorMessage(err as { message?: string }));
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

// Supprimer une ecriture (brouillard uniquement)
router.delete('/:id', async (req: Request, res: Response) => {
  const schema = req.tenantSchema;
  try {
    const result = await ecrituresService.deleteEcriture(schema, req.params.id);
    if (result.notFound) return res.status(404).json({ error: 'Ecriture non trouvee.' });
    if (result.forbidden) return res.status(403).json({ error: 'Impossible de supprimer une ecriture validee.' });
    res.json({ message: 'Ecriture supprimee.' });
  } catch (err) {
    logger.error(getErrorMessage(err as { message?: string }));
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

// Grand livre
router.get('/grand-livre/:entite_id/:exercice_id', async (req: Request, res: Response) => {
  const schema = req.tenantSchema;
  const { compte, journal, date_du, date_au } = req.query;
  try {
    const rows = await ecrituresService.getGrandLivre(schema, req.params.exercice_id, { compte, journal, date_du, date_au });
    res.json(rows);
  } catch (err) {
    logger.error(getErrorMessage(err as { message?: string }));
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

// Balance generee depuis les ecritures
router.get('/balance/:entite_id/:exercice_id', async (req: Request, res: Response) => {
  const schema = req.tenantSchema;
  try {
    const rows = await ecrituresService.getBalanceFromEcritures(schema, req.params.exercice_id);
    res.json(rows);
  } catch (err) {
    logger.error(getErrorMessage(err as { message?: string }));
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

// Grand livre tiers
router.get('/grand-livre-tiers/:entite_id/:exercice_id', async (req: Request, res: Response) => {
  const schema = req.tenantSchema;
  const { tiers_id, type_tiers, date_du, date_au } = req.query;
  try {
    const rows = await ecrituresService.getGrandLivreTiers(schema, req.params.exercice_id, { tiers_id, type_tiers, date_du, date_au });
    res.json(rows);
  } catch (err) {
    logger.error(getErrorMessage(err as { message?: string }));
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

// Balance tiers
router.get('/balance-tiers/:entite_id/:exercice_id', async (req: Request, res: Response) => {
  const schema = req.tenantSchema;
  const { type_tiers, date_du, date_au } = req.query;
  try {
    const rows = await ecrituresService.getBalanceTiers(schema, req.params.exercice_id, { type_tiers, date_du, date_au });
    res.json(rows);
  } catch (err) {
    logger.error(getErrorMessage(err as { message?: string }));
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

// Stats
router.get('/stats/:entite_id/:exercice_id', async (req: Request, res: Response) => {
  const schema = req.tenantSchema;
  try {
    const stats = await ecrituresService.getStats(schema, req.params.exercice_id);
    res.json(stats);
  } catch (err) {
    logger.error(getErrorMessage(err as { message?: string }));
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

// ============ RAPPORTS ============

router.get('/rapports/journal-centralisateur/:entite_id/:exercice_id', async (req: Request, res: Response) => {
  const schema = req.tenantSchema;
  try {
    const rows = await ecrituresService.getJournalCentralisateur(schema, req.params.exercice_id);
    res.json(rows);
  } catch (err) { logger.error(getErrorMessage(err as { message?: string })); res.status(500).json({ error: 'Erreur serveur.' }); }
});

router.get('/rapports/balance-agee/:entite_id/:exercice_id', async (req: Request, res: Response) => {
  const schema = req.tenantSchema;
  try {
    const rows = await ecrituresService.getBalanceAgee(schema, req.params.exercice_id);
    res.json(rows);
  } catch (err) { logger.error(getErrorMessage(err as { message?: string })); res.status(500).json({ error: 'Erreur serveur.' }); }
});

router.get('/rapports/tresorerie/:entite_id/:exercice_id', async (req: Request, res: Response) => {
  const schema = req.tenantSchema;
  try {
    const rows = await ecrituresService.getTresorerie(schema, req.params.exercice_id);
    res.json(rows);
  } catch (err) { logger.error(getErrorMessage(err as { message?: string })); res.status(500).json({ error: 'Erreur serveur.' }); }
});

router.get('/rapports/repartition-charges/:entite_id/:exercice_id', async (req: Request, res: Response) => {
  const schema = req.tenantSchema;
  try {
    const rows = await ecrituresService.getRepartitionCharges(schema, req.params.exercice_id);
    res.json(rows);
  } catch (err) { logger.error(getErrorMessage(err as { message?: string })); res.status(500).json({ error: 'Erreur serveur.' }); }
});

router.get('/rapports/comparatif/:entite_id/:exercice_id', async (req: Request, res: Response) => {
  const schema = req.tenantSchema;
  const { exercice_id_n1 } = req.query;
  try {
    const data = await ecrituresService.getComparatif(schema, req.params.exercice_id, exercice_id_n1 || null);
    res.json(data);
  } catch (err) { logger.error(getErrorMessage(err as { message?: string })); res.status(500).json({ error: 'Erreur serveur.' }); }
});

router.get('/rapports/tableau-bord/:entite_id/:exercice_id', async (req: Request, res: Response) => {
  const schema = req.tenantSchema;
  try {
    const data = await ecrituresService.getTableauBord(schema, req.params.exercice_id);
    res.json(data);
  } catch (err) { logger.error(getErrorMessage(err as { message?: string })); res.status(500).json({ error: 'Erreur serveur.' }); }
});

router.get('/rapports/echeancier/:entite_id/:exercice_id', async (req: Request, res: Response) => {
  const schema = req.tenantSchema;
  const { type_tiers, date_du, date_au, statut } = req.query;
  try {
    const rows = await ecrituresService.getEcheancier(schema, req.params.exercice_id, { type_tiers, date_du, date_au });
    const mapped = rows.map((r: EcheancierRow) => {
      const montant = Math.abs(parseFloat(r.debit) - parseFloat(r.credit));
      const paye = r.lettrage_code ? montant : 0;
      return { ...r, montant, montant_paye: paye, montant_du: montant - paye };
    });
    if (statut === 'du') res.json(mapped.filter((r: { montant_du: number }) => r.montant_du > 0));
    else if (statut === 'paye') res.json(mapped.filter((r: { montant_du: number }) => r.montant_du === 0));
    else res.json(mapped);
  } catch (err) { logger.error(getErrorMessage(err as { message?: string })); res.status(500).json({ error: 'Erreur serveur.' }); }
});

// ============ LETTRAGE ============

router.get('/lettrage/tiers/:entite_id/:exercice_id', async (req: Request, res: Response) => {
  const schema = req.tenantSchema;
  const { type_tiers } = req.query;
  try {
    const rows = await ecrituresService.getLettreTiers(schema, req.params.exercice_id, type_tiers);
    res.json(rows);
  } catch (err) {
    logger.error(getErrorMessage(err as { message?: string }));
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

router.get('/lettrage/ecritures/:entite_id/:exercice_id/:tiers_id', async (req: Request, res: Response) => {
  const schema = req.tenantSchema;
  const { statut, annee_de, annee_a } = req.query;
  try {
    const rows = await ecrituresService.getLettreEcritures(schema, req.params.exercice_id, req.params.tiers_id, { statut, annee_de, annee_a });
    res.json(rows);
  } catch (err) {
    logger.error(getErrorMessage(err as { message?: string }));
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

router.post('/lettrage/lettrer', async (req: Request, res: Response) => {
  const { ligne_ids } = req.body;
  const schema = req.tenantSchema;
  if (!ligne_ids || ligne_ids.length < 2) {
    return res.status(400).json({ error: 'Au moins 2 lignes requises.' });
  }
  try {
    const result = await ecrituresService.lettrer(schema, ligne_ids);
    if (result.error) return res.status(400).json({ error: result.error });
    res.json(result);
  } catch (err) {
    logger.error(getErrorMessage(err as { message?: string }));
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

router.post('/lettrage/delettrer', async (req: Request, res: Response) => {
  const { lettrage_code } = req.body;
  const schema = req.tenantSchema;
  if (!lettrage_code) {
    return res.status(400).json({ error: 'Code lettrage requis.' });
  }
  try {
    const result = await ecrituresService.delettrer(schema, lettrage_code);
    res.json(result);
  } catch (err) {
    logger.error(getErrorMessage(err as { message?: string }));
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

export default router;
