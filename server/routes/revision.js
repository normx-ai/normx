const express = require('express');
const pool = require('../db');
const logger = require('../logger');

const router = express.Router();

// GET /api/revision/:entite_id/:exercice_id/all-od — toutes les OD de toutes les sections
// IMPORTANT : cette route doit être AVANT la route générique /:section
router.get('/:entite_id/:exercice_id/all-od', async (req, res) => {
  const { entite_id, exercice_id } = req.params;
  try {
    const result = await pool.query(
      'SELECT data FROM revision_data WHERE entite_id = $1 AND exercice_id = $2',
      [entite_id, exercice_id]
    );
    const allOd = [];
    for (const row of result.rows) {
      const revData = typeof row.data === 'string' ? JSON.parse(row.data) : row.data;
      if (revData.odEcritures && Array.isArray(revData.odEcritures)) {
        allOd.push(...revData.odEcritures);
      }
    }
    res.json({ odEcritures: allOd });
  } catch (err) {
    logger.error(err.message || err);
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

// GET /api/revision/:entite_id/:exercice_id/:section
router.get('/:entite_id/:exercice_id/:section', async (req, res) => {
  const { entite_id, exercice_id, section } = req.params;
  try {
    const result = await pool.query(
      'SELECT data FROM revision_data WHERE entite_id = $1 AND exercice_id = $2 AND section = $3',
      [entite_id, exercice_id, section]
    );
    if (result.rows.length === 0) {
      return res.json({ lignes: [] });
    }
    res.json(result.rows[0].data);
  } catch (err) {
    logger.error(err.message || err);
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

// PUT /api/revision/:entite_id/:exercice_id/:section
router.put('/:entite_id/:exercice_id/:section', async (req, res) => {
  const { entite_id, exercice_id, section } = req.params;
  const data = req.body;
  try {
    const existing = await pool.query(
      'SELECT id FROM revision_data WHERE entite_id = $1 AND exercice_id = $2 AND section = $3',
      [entite_id, exercice_id, section]
    );
    if (existing.rows.length > 0) {
      await pool.query(
        'UPDATE revision_data SET data = $1, updated_at = NOW() WHERE id = $2',
        [JSON.stringify(data), existing.rows[0].id]
      );
    } else {
      await pool.query(
        'INSERT INTO revision_data (entite_id, exercice_id, section, data) VALUES ($1, $2, $3, $4)',
        [entite_id, exercice_id, section, JSON.stringify(data)]
      );
    }

    // Appliquer les OD sur la balance N (solde_*_revise)
    await applyOdToBalance(entite_id, exercice_id);

    res.json({ message: 'Sauvegardé.' });
  } catch (err) {
    logger.error(err.message || err);
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

// Appliquer les écritures OD sur les soldes révisés de la balance N
async function applyOdToBalance(entiteId, exerciceId) {
  // Trouver la balance N
  const balResult = await pool.query(
    "SELECT id FROM balances WHERE entite_id = $1 AND exercice_id = $2 AND type_balance = 'N'",
    [entiteId, exerciceId]
  );
  if (balResult.rows.length === 0) return;
  const balanceId = balResult.rows[0].id;

  // Calculer l'impact net par compte (tous les OD de toutes les sections)
  // D'abord récupérer TOUS les OD de toutes les sections pour cet exercice
  const allRevisions = await pool.query(
    'SELECT data FROM revision_data WHERE entite_id = $1 AND exercice_id = $2',
    [entiteId, exerciceId]
  );

  const impactParCompte = {};
  for (const row of allRevisions.rows) {
    const revData = typeof row.data === 'string' ? JSON.parse(row.data) : row.data;
    if (!revData.odEcritures) continue;
    for (const od of revData.odEcritures) {
      const montant = parseFloat(od.montant) || 0;
      if (montant === 0) continue;
      // Débit = augmente le débiteur
      if (od.compteDebit && od.compteDebit !== '______') {
        if (!impactParCompte[od.compteDebit]) impactParCompte[od.compteDebit] = { debit: 0, credit: 0 };
        impactParCompte[od.compteDebit].debit += montant;
      }
      // Crédit = augmente le créditeur
      if (od.compteCredit && od.compteCredit !== '______') {
        if (!impactParCompte[od.compteCredit]) impactParCompte[od.compteCredit] = { debit: 0, credit: 0 };
        impactParCompte[od.compteCredit].credit += montant;
      }
    }
  }

  // Récupérer les lignes de balance concernées
  const comptesImpactes = Object.keys(impactParCompte);
  if (comptesImpactes.length === 0) {
    // Aucun OD → reset tous les soldes révisés de cette balance
    await pool.query(
      'UPDATE balance_lignes SET solde_debiteur_revise = NULL, solde_crediteur_revise = NULL WHERE balance_id = $1',
      [balanceId]
    );
    return;
  }

  // Reset d'abord tous les soldes révisés
  await pool.query(
    'UPDATE balance_lignes SET solde_debiteur_revise = NULL, solde_crediteur_revise = NULL WHERE balance_id = $1',
    [balanceId]
  );

  // Appliquer les impacts
  for (const compte of comptesImpactes) {
    const impact = impactParCompte[compte];
    // Récupérer les soldes bruts
    const ligneResult = await pool.query(
      'SELECT id, solde_debiteur, solde_crediteur FROM balance_lignes WHERE balance_id = $1 AND numero_compte = $2',
      [balanceId, compte]
    );
    if (ligneResult.rows.length === 0) continue;

    const ligne = ligneResult.rows[0];
    const sd = parseFloat(ligne.solde_debiteur) || 0;
    const sc = parseFloat(ligne.solde_crediteur) || 0;

    // Solde net = (SC - SD) + crédits OD - débits OD
    const soldeNet = (sc - sd) + impact.credit - impact.debit;

    const newSD = soldeNet < 0 ? Math.abs(soldeNet) : 0;
    const newSC = soldeNet >= 0 ? soldeNet : 0;

    await pool.query(
      'UPDATE balance_lignes SET solde_debiteur_revise = $1, solde_crediteur_revise = $2 WHERE id = $3',
      [newSD, newSC, ligne.id]
    );
  }
}

module.exports = router;
