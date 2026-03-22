const express = require('express');
const pool = require('../db');
const logger = require('../logger');

const router = express.Router();

// Creer/obtenir exercice
router.post('/exercice', async (req, res) => {
  const { entite_id, annee, duree_mois, date_debut, date_fin } = req.body;
  if (!entite_id || !annee) return res.status(400).json({ error: 'entite_id et annee requis.' });

  const duree = parseInt(duree_mois, 10) || 12;

  // Valider la duree : 7-12 mois ou exactement 18 mois
  if (duree === 18) {
    // OK — exercice de 18 mois autorise
  } else if (duree >= 7 && duree <= 12) {
    // OK — exercice standard
  } else {
    return res.status(400).json({ error: 'Durée invalide (' + duree + ' mois). Autorisé : 7 à 12 mois ou 18 mois.' });
  }

  try {
    // Limiter a 2 exercices par entite
    const countResult = await pool.query('SELECT COUNT(*) FROM exercices WHERE entite_id = $1', [entite_id]);
    if (parseInt(countResult.rows[0].count, 10) >= 2) {
      return res.status(400).json({ error: 'Maximum 2 exercices par entité.' });
    }

    const existing = await pool.query('SELECT * FROM exercices WHERE entite_id = $1 AND annee = $2', [entite_id, annee]);
    if (existing.rows.length > 0) return res.json(existing.rows[0]);

    // Utiliser les dates envoyees par le frontend ou calculer
    const dateDebut = date_debut || `${annee}-01-01`;
    const dateFin = date_fin || (() => {
      if (duree <= 12) {
        const dernierJour = new Date(annee, duree, 0).getDate();
        return `${annee}-${duree.toString().padStart(2, '0')}-${dernierJour.toString().padStart(2, '0')}`;
      }
      const moisRestant = duree - 12;
      const dernierJour = new Date(annee + 1, moisRestant, 0).getDate();
      return `${annee + 1}-${moisRestant.toString().padStart(2, '0')}-${dernierJour.toString().padStart(2, '0')}`;
    })();

    const result = await pool.query(
      'INSERT INTO exercices (entite_id, annee, date_debut, date_fin, duree_mois) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [entite_id, annee, dateDebut, dateFin, duree]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    logger.error(err.message || err);
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

// Lister exercices d'une entite
router.get('/exercices/:entite_id', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM exercices WHERE entite_id = $1 ORDER BY annee DESC',
      [req.params.entite_id]
    );
    res.json(result.rows);
  } catch (err) {
    logger.error(err.message || err);
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

// Cloturer un exercice
router.put('/exercice/:id/cloturer', async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query(
      "UPDATE exercices SET statut = 'cloture' WHERE id = $1 AND statut = 'ouvert' RETURNING *",
      [id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Exercice non trouvé ou déjà clôturé.' });
    res.json(result.rows[0]);
  } catch (err) {
    logger.error(err.message || err);
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

// Rouvrir un exercice
router.put('/exercice/:id/rouvrir', async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query(
      "UPDATE exercices SET statut = 'ouvert' WHERE id = $1 AND statut = 'cloture' RETURNING *",
      [id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Exercice non trouvé ou déjà ouvert.' });
    res.json(result.rows[0]);
  } catch (err) {
    logger.error(err.message || err);
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

// Importer balance (CSV parse cote client, envoie JSON)
router.post('/import', async (req, res) => {
  const { entite_id, exercice_id, type_balance, nom_fichier, lignes } = req.body;

  if (!entite_id || !exercice_id || !type_balance || !lignes || !lignes.length) {
    return res.status(400).json({ error: 'Donnees incompletes.' });
  }

  try {
    // Supprimer ancienne balance du meme type pour cet exercice
    const oldBalance = await pool.query(
      'SELECT id FROM balances WHERE entite_id = $1 AND exercice_id = $2 AND type_balance = $3',
      [entite_id, exercice_id, type_balance]
    );
    if (oldBalance.rows.length > 0) {
      await pool.query('DELETE FROM balances WHERE id = $1', [oldBalance.rows[0].id]);
      // Si c'est une balance N, supprimer les données de révision associées
      if (type_balance === 'N') {
        await pool.query(
          'DELETE FROM revision_data WHERE entite_id = $1 AND exercice_id = $2',
          [entite_id, exercice_id]
        );
      }
    }

    // Creer la balance
    const balResult = await pool.query(
      'INSERT INTO balances (entite_id, exercice_id, type_balance, nom_fichier) VALUES ($1, $2, $3, $4) RETURNING *',
      [entite_id, exercice_id, type_balance, nom_fichier || null]
    );
    const balanceId = balResult.rows[0].id;

    // Inserer les lignes
    for (const l of lignes) {
      await pool.query(
        `INSERT INTO balance_lignes (balance_id, numero_compte, libelle_compte, si_debit, si_credit, debit, credit, solde_debiteur, solde_crediteur)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [
          balanceId,
          l.numero_compte || '',
          l.libelle_compte || '',
          parseFloat(l.si_debit) || 0,
          parseFloat(l.si_credit) || 0,
          parseFloat(l.debit) || 0,
          parseFloat(l.credit) || 0,
          parseFloat(l.solde_debiteur) || 0,
          parseFloat(l.solde_crediteur) || 0,
        ]
      );
    }

    res.status(201).json({
      message: `Balance ${type_balance} importee (${lignes.length} lignes).`,
      balance: balResult.rows[0],
      nb_lignes: lignes.length,
    });
  } catch (err) {
    logger.error(err.message || err);
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

// Supprimer une balance importée
router.delete('/:balance_id', async (req, res) => {
  const { balance_id } = req.params;
  try {
    const result = await pool.query('DELETE FROM balances WHERE id = $1 RETURNING *', [balance_id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Balance introuvable.' });
    }
    // Si c'est la balance N qui est supprimée, supprimer aussi les données de révision
    const deleted = result.rows[0];
    if (deleted.type_balance === 'N') {
      await pool.query(
        'DELETE FROM revision_data WHERE entite_id = $1 AND exercice_id = $2',
        [deleted.entite_id, deleted.exercice_id]
      );
    }
    res.json({ message: 'Balance supprimée.' });
  } catch (err) {
    logger.error(err.message || err);
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

// Modifier le numero de compte d'une ligne de balance
router.put('/ligne/:ligne_id', async (req, res) => {
  const { ligne_id } = req.params;
  const { numero_compte } = req.body;
  if (!numero_compte) return res.status(400).json({ error: 'numero_compte requis.' });
  try {
    const result = await pool.query(
      'UPDATE balance_lignes SET numero_compte = $1 WHERE id = $2 RETURNING *',
      [numero_compte.trim(), ligne_id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Ligne introuvable.' });
    res.json(result.rows[0]);
  } catch (err) {
    logger.error(err.message || err);
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

// Obtenir balance avec lignes
router.get('/:entite_id/:exercice_id/:type_balance', async (req, res) => {
  const { entite_id, exercice_id, type_balance } = req.params;

  try {
    const balResult = await pool.query(
      'SELECT * FROM balances WHERE entite_id = $1 AND exercice_id = $2 AND type_balance = $3',
      [entite_id, exercice_id, type_balance]
    );
    if (balResult.rows.length === 0) return res.json({ balance: null, lignes: [] });

    const balance = balResult.rows[0];
    const lignesResult = await pool.query(
      'SELECT * FROM balance_lignes WHERE balance_id = $1 ORDER BY numero_compte',
      [balance.id]
    );

    res.json({ balance, lignes: lignesResult.rows });
  } catch (err) {
    logger.error(err.message || err);
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

// Revision : mettre a jour une ligne
router.put('/revision/:ligne_id', async (req, res) => {
  const { debit_revise, credit_revise, solde_debiteur_revise, solde_crediteur_revise, note_revision } = req.body;

  try {
    const result = await pool.query(
      `UPDATE balance_lignes SET
        debit_revise = $1, credit_revise = $2,
        solde_debiteur_revise = $3, solde_crediteur_revise = $4,
        note_revision = $5
       WHERE id = $6 RETURNING *`,
      [
        debit_revise !== undefined ? debit_revise : null,
        credit_revise !== undefined ? credit_revise : null,
        solde_debiteur_revise !== undefined ? solde_debiteur_revise : null,
        solde_crediteur_revise !== undefined ? solde_crediteur_revise : null,
        note_revision || null,
        req.params.ligne_id,
      ]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Ligne non trouvee.' });
    res.json(result.rows[0]);
  } catch (err) {
    logger.error(err.message || err);
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

// Valider/changer statut balance
router.put('/statut/:balance_id', async (req, res) => {
  const { statut, revision_notes, user_id } = req.body;
  if (!['brut', 'revise', 'valide'].includes(statut)) {
    return res.status(400).json({ error: 'Statut invalide.' });
  }

  try {
    const updates = ['statut = $1'];
    const values = [statut];
    let idx = 2;

    if (statut === 'revise' || statut === 'valide') {
      updates.push(`revise_par = $${idx}`);
      values.push(user_id);
      idx++;
      updates.push(`date_revision = NOW()`);
    }
    if (revision_notes !== undefined) {
      updates.push(`revision_notes = $${idx}`);
      values.push(revision_notes);
      idx++;
    }

    values.push(req.params.balance_id);
    const result = await pool.query(
      `UPDATE balances SET ${updates.join(', ')} WHERE id = $${idx} RETURNING *`,
      values
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Balance non trouvee.' });
    res.json(result.rows[0]);
  } catch (err) {
    logger.error(err.message || err);
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

module.exports = router;
