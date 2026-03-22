const express = require('express');
const pool = require('../db');
const path = require('path');
const planComptable = require(path.join(__dirname, '..', 'data', 'plan_comptable_sycebnl.json'));
const pcNums = new Set(planComptable.map(c => c.numero));
const logger = require('../logger');

// Verifier un compte paddé : "101100" → cherche "1011", "101", "10" etc.
const isCompteValide = (numero) => {
  if (pcNums.has(numero)) return true;
  // Retirer les 0 de padding à droite progressivement
  let trimmed = numero.replace(/0+$/, '');
  while (trimmed.length >= 2) {
    if (pcNums.has(trimmed)) return true;
    trimmed = trimmed.slice(0, -1);
  }
  return false;
};

const router = express.Router();

// Creer une ecriture avec ses lignes
router.post('/', async (req, res) => {
  const { entite_id, exercice_id, date_ecriture, journal, numero_piece, libelle, lignes } = req.body;

  if (!entite_id || !exercice_id || !date_ecriture || !libelle || !lignes || lignes.length < 2) {
    return res.status(400).json({ error: 'Donnees incompletes. Minimum 2 lignes.' });
  }

  // Verifier equilibre debit = credit
  const totalDebit = lignes.reduce((s, l) => s + (parseFloat(l.debit) || 0), 0);
  const totalCredit = lignes.reduce((s, l) => s + (parseFloat(l.credit) || 0), 0);
  if (Math.abs(totalDebit - totalCredit) > 0.01) {
    return res.status(400).json({ error: 'Ecriture desequilibree. Debit: ' + totalDebit + ', Credit: ' + totalCredit });
  }

  // Valider que tous les comptes existent dans le plan comptable SYCEBNL
  const comptesInvalides = lignes
    .filter(l => l.numero_compte && (parseFloat(l.debit) || parseFloat(l.credit)))
    .filter(l => !isCompteValide(l.numero_compte))
    .map(l => l.numero_compte);
  if (comptesInvalides.length > 0) {
    return res.status(400).json({ error: 'Comptes invalides (absents du plan comptable SYCEBNL) : ' + comptesInvalides.join(', ') });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const ecr = await client.query(
      `INSERT INTO ecritures (entite_id, exercice_id, date_ecriture, journal, numero_piece, libelle)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [entite_id, exercice_id, date_ecriture, journal || 'OD', numero_piece || null, libelle]
    );
    const ecritureId = ecr.rows[0].id;

    for (const l of lignes) {
      await client.query(
        `INSERT INTO ecriture_lignes (ecriture_id, numero_compte, libelle_compte, debit, credit, tiers_id)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [ecritureId, l.numero_compte, l.libelle_compte || '', parseFloat(l.debit) || 0, parseFloat(l.credit) || 0, l.tiers_id || null]
      );
    }

    await client.query('COMMIT');
    res.status(201).json({ message: 'Ecriture enregistree.', ecriture: ecr.rows[0] });
  } catch (err) {
    await client.query('ROLLBACK');
    logger.error(err.message || err);
    res.status(500).json({ error: 'Erreur serveur.' });
  } finally {
    client.release();
  }
});

// Lister ecritures d'un exercice (avec filtres optionnels)
router.get('/:entite_id/:exercice_id', async (req, res) => {
  const { journal, statut, date_du, date_au, search } = req.query;
  try {
    let query = `
      SELECT e.*, json_agg(
        json_build_object('id', el.id, 'numero_compte', el.numero_compte, 'libelle_compte', el.libelle_compte, 'debit', el.debit, 'credit', el.credit, 'tiers_id', el.tiers_id, 'tiers_nom', t.nom)
        ORDER BY el.id
      ) AS lignes
      FROM ecritures e
      JOIN ecriture_lignes el ON el.ecriture_id = e.id
      LEFT JOIN tiers t ON t.id = el.tiers_id
      WHERE e.entite_id = $1 AND e.exercice_id = $2`;
    const params = [req.params.entite_id, req.params.exercice_id];
    let idx = 3;

    if (journal) {
      query += ` AND e.journal = $${idx}`;
      params.push(journal);
      idx++;
    }
    if (statut) {
      query += ` AND e.statut = $${idx}`;
      params.push(statut);
      idx++;
    }
    if (date_du) {
      query += ` AND e.date_ecriture >= $${idx}`;
      params.push(date_du);
      idx++;
    }
    if (date_au) {
      query += ` AND e.date_ecriture <= $${idx}`;
      params.push(date_au);
      idx++;
    }
    if (search) {
      query += ` AND (e.libelle ILIKE $${idx} OR e.numero_piece ILIKE $${idx})`;
      params.push('%' + search + '%');
      idx++;
    }

    query += ` GROUP BY e.id ORDER BY e.date_ecriture, e.id`;
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    logger.error(err.message || err);
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

// Valider une ou plusieurs ecritures
router.post('/valider', async (req, res) => {
  const { ids, user_id } = req.body;
  if (!ids || !Array.isArray(ids) || ids.length === 0) {
    return res.status(400).json({ error: 'Aucune ecriture selectionnee.' });
  }
  try {
    const result = await pool.query(
      `UPDATE ecritures SET statut = 'validee', validee_par = $1, date_validation = NOW()
       WHERE id = ANY($2) AND statut = 'brouillard'
       RETURNING id`,
      [user_id || null, ids]
    );
    res.json({ message: result.rowCount + ' ecriture(s) validee(s).', validated: result.rows.map(r => r.id) });
  } catch (err) {
    logger.error(err.message || err);
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

// Devalider une ecriture (repasser en brouillard)
router.post('/devalider', async (req, res) => {
  const { ids } = req.body;
  if (!ids || !Array.isArray(ids) || ids.length === 0) {
    return res.status(400).json({ error: 'Aucune ecriture selectionnee.' });
  }
  try {
    const result = await pool.query(
      `UPDATE ecritures SET statut = 'brouillard', validee_par = NULL, date_validation = NULL
       WHERE id = ANY($1) AND statut = 'validee'
       RETURNING id`,
      [ids]
    );
    res.json({ message: result.rowCount + ' ecriture(s) repassee(s) en brouillard.', devalidated: result.rows.map(r => r.id) });
  } catch (err) {
    logger.error(err.message || err);
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

// Modifier une ecriture (brouillard uniquement)
router.put('/:id', async (req, res) => {
  const { date_ecriture, journal, numero_piece, libelle, lignes } = req.body;

  if (!date_ecriture || !libelle || !lignes || lignes.length < 2) {
    return res.status(400).json({ error: 'Donnees incompletes.' });
  }

  // Verifier que l'ecriture est en brouillard
  const check = await pool.query('SELECT statut FROM ecritures WHERE id = $1', [req.params.id]);
  if (check.rows.length === 0) return res.status(404).json({ error: 'Ecriture non trouvee.' });
  if (check.rows[0].statut === 'validee') {
    return res.status(403).json({ error: 'Impossible de modifier une ecriture validee. Contrepassez-la.' });
  }

  const totalDebit = lignes.reduce((s, l) => s + (parseFloat(l.debit) || 0), 0);
  const totalCredit = lignes.reduce((s, l) => s + (parseFloat(l.credit) || 0), 0);
  if (Math.abs(totalDebit - totalCredit) > 0.01) {
    return res.status(400).json({ error: 'Ecriture desequilibree.' });
  }

  const comptesInvalides = lignes
    .filter(l => l.numero_compte && (parseFloat(l.debit) || parseFloat(l.credit)))
    .filter(l => !isCompteValide(l.numero_compte))
    .map(l => l.numero_compte);
  if (comptesInvalides.length > 0) {
    return res.status(400).json({ error: 'Comptes invalides : ' + comptesInvalides.join(', ') });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    await client.query(
      `UPDATE ecritures SET date_ecriture = $1, journal = $2, numero_piece = $3, libelle = $4 WHERE id = $5`,
      [date_ecriture, journal || 'OD', numero_piece || null, libelle, req.params.id]
    );

    await client.query('DELETE FROM ecriture_lignes WHERE ecriture_id = $1', [req.params.id]);

    for (const l of lignes) {
      await client.query(
        `INSERT INTO ecriture_lignes (ecriture_id, numero_compte, libelle_compte, debit, credit, tiers_id)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [req.params.id, l.numero_compte, l.libelle_compte || '', parseFloat(l.debit) || 0, parseFloat(l.credit) || 0, l.tiers_id || null]
      );
    }

    await client.query('COMMIT');
    res.json({ message: 'Ecriture modifiee.' });
  } catch (err) {
    await client.query('ROLLBACK');
    logger.error(err.message || err);
    res.status(500).json({ error: 'Erreur serveur.' });
  } finally {
    client.release();
  }
});

// Supprimer une ecriture (brouillard uniquement)
router.delete('/:id', async (req, res) => {
  try {
    const check = await pool.query('SELECT statut FROM ecritures WHERE id = $1', [req.params.id]);
    if (check.rows.length === 0) return res.status(404).json({ error: 'Ecriture non trouvee.' });
    if (check.rows[0].statut === 'validee') {
      return res.status(403).json({ error: 'Impossible de supprimer une ecriture validee.' });
    }
    const result = await pool.query('DELETE FROM ecritures WHERE id = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Ecriture non trouvee.' });
    res.json({ message: 'Ecriture supprimee.' });
  } catch (err) {
    logger.error(err.message || err);
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

// Grand livre : mouvements par compte
router.get('/grand-livre/:entite_id/:exercice_id', async (req, res) => {
  const { compte, journal, date_du, date_au } = req.query;
  try {
    let query = `
      SELECT el.numero_compte, el.libelle_compte, el.debit, el.credit,
             e.date_ecriture, e.libelle AS libelle_ecriture, e.numero_piece, e.journal
      FROM ecriture_lignes el
      JOIN ecritures e ON e.id = el.ecriture_id
      WHERE e.entite_id = $1 AND e.exercice_id = $2 AND e.statut = 'validee'`;
    const params = [req.params.entite_id, req.params.exercice_id];
    let idx = 3;

    if (compte) {
      query += ` AND el.numero_compte LIKE $${idx}`;
      params.push(compte + '%');
      idx++;
    }
    if (journal) {
      query += ` AND e.journal = $${idx}`;
      params.push(journal);
      idx++;
    }
    if (date_du) {
      query += ` AND e.date_ecriture >= $${idx}`;
      params.push(date_du);
      idx++;
    }
    if (date_au) {
      query += ` AND e.date_ecriture <= $${idx}`;
      params.push(date_au);
      idx++;
    }

    query += ` ORDER BY el.numero_compte, e.date_ecriture, e.id`;
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    logger.error(err.message || err);
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

// Balance generee depuis les ecritures
router.get('/balance/:entite_id/:exercice_id', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT el.numero_compte,
              MAX(el.libelle_compte) AS libelle_compte,
              SUM(el.debit) AS debit,
              SUM(el.credit) AS credit,
              GREATEST(SUM(el.debit) - SUM(el.credit), 0) AS solde_debiteur,
              GREATEST(SUM(el.credit) - SUM(el.debit), 0) AS solde_crediteur
       FROM ecriture_lignes el
       JOIN ecritures e ON e.id = el.ecriture_id
       WHERE e.entite_id = $1 AND e.exercice_id = $2 AND e.statut = 'validee'
       GROUP BY el.numero_compte
       ORDER BY el.numero_compte`,
      [req.params.entite_id, req.params.exercice_id]
    );
    res.json(result.rows);
  } catch (err) {
    logger.error(err.message || err);
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

// Grand livre tiers : mouvements groupes par tiers
router.get('/grand-livre-tiers/:entite_id/:exercice_id', async (req, res) => {
  const { tiers_id, type_tiers, date_du, date_au } = req.query;
  try {
    let query = `
      SELECT el.numero_compte, el.libelle_compte, el.debit, el.credit, el.tiers_id,
             t.nom AS tiers_nom, t.code_tiers, t.type AS tiers_type,
             e.date_ecriture, e.libelle AS libelle_ecriture, e.numero_piece, e.journal
      FROM ecriture_lignes el
      JOIN ecritures e ON e.id = el.ecriture_id
      JOIN tiers t ON t.id = el.tiers_id
      WHERE e.entite_id = $1 AND e.exercice_id = $2 AND e.statut = 'validee' AND el.tiers_id IS NOT NULL`;
    const params = [req.params.entite_id, req.params.exercice_id];
    let idx = 3;

    if (tiers_id) {
      query += ` AND el.tiers_id = $${idx}`;
      params.push(tiers_id);
      idx++;
    }
    if (type_tiers) {
      query += ` AND t.type = $${idx}`;
      params.push(type_tiers);
      idx++;
    }
    if (date_du) {
      query += ` AND e.date_ecriture >= $${idx}`;
      params.push(date_du);
      idx++;
    }
    if (date_au) {
      query += ` AND e.date_ecriture <= $${idx}`;
      params.push(date_au);
      idx++;
    }

    query += ` ORDER BY t.nom, e.date_ecriture, e.id`;
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    logger.error(err.message || err);
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

// Balance tiers : soldes par tiers
router.get('/balance-tiers/:entite_id/:exercice_id', async (req, res) => {
  const { type_tiers, date_du, date_au } = req.query;
  try {
    let query = `
      SELECT el.tiers_id,
             t.nom AS tiers_nom, t.code_tiers, t.type AS tiers_type, t.compte_comptable,
             SUM(el.debit) AS debit,
             SUM(el.credit) AS credit,
             GREATEST(SUM(el.debit) - SUM(el.credit), 0) AS solde_debiteur,
             GREATEST(SUM(el.credit) - SUM(el.debit), 0) AS solde_crediteur
      FROM ecriture_lignes el
      JOIN ecritures e ON e.id = el.ecriture_id
      JOIN tiers t ON t.id = el.tiers_id
      WHERE e.entite_id = $1 AND e.exercice_id = $2 AND e.statut = 'validee' AND el.tiers_id IS NOT NULL`;
    const params = [req.params.entite_id, req.params.exercice_id];
    let idx = 3;

    if (type_tiers) {
      query += ` AND t.type = $${idx}`;
      params.push(type_tiers);
      idx++;
    }
    if (date_du) {
      query += ` AND e.date_ecriture >= $${idx}`;
      params.push(date_du);
      idx++;
    }
    if (date_au) {
      query += ` AND e.date_ecriture <= $${idx}`;
      params.push(date_au);
      idx++;
    }

    query += ` GROUP BY el.tiers_id, t.nom, t.code_tiers, t.type, t.compte_comptable
               ORDER BY t.type, t.nom`;
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    logger.error(err.message || err);
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

// Stats rapides pour le dashboard compta
router.get('/stats/:entite_id/:exercice_id', async (req, res) => {
  try {
    const nbEcritures = await pool.query(
      'SELECT COUNT(*) FROM ecritures WHERE entite_id = $1 AND exercice_id = $2',
      [req.params.entite_id, req.params.exercice_id]
    );
    const totaux = await pool.query(
      `SELECT COALESCE(SUM(el.debit), 0) AS total_debit, COALESCE(SUM(el.credit), 0) AS total_credit
       FROM ecriture_lignes el
       JOIN ecritures e ON e.id = el.ecriture_id
       WHERE e.entite_id = $1 AND e.exercice_id = $2`,
      [req.params.entite_id, req.params.exercice_id]
    );
    const nbComptes = await pool.query(
      `SELECT COUNT(DISTINCT el.numero_compte) AS nb
       FROM ecriture_lignes el
       JOIN ecritures e ON e.id = el.ecriture_id
       WHERE e.entite_id = $1 AND e.exercice_id = $2`,
      [req.params.entite_id, req.params.exercice_id]
    );
    res.json({
      nb_ecritures: parseInt(nbEcritures.rows[0].count),
      total_debit: parseFloat(totaux.rows[0].total_debit),
      total_credit: parseFloat(totaux.rows[0].total_credit),
      nb_comptes: parseInt(nbComptes.rows[0].nb),
    });
  } catch (err) {
    logger.error(err.message || err);
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

// ============ RAPPORTS ============

// Journal centralisateur : totaux par journal et par mois
router.get('/rapports/journal-centralisateur/:entite_id/:exercice_id', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT e.journal,
             EXTRACT(MONTH FROM e.date_ecriture)::int AS mois,
             COUNT(DISTINCT e.id) AS nb_ecritures,
             COALESCE(SUM(el.debit), 0) AS total_debit,
             COALESCE(SUM(el.credit), 0) AS total_credit
      FROM ecritures e
      JOIN ecriture_lignes el ON el.ecriture_id = e.id
      WHERE e.entite_id = $1 AND e.exercice_id = $2 AND e.statut = 'validee'
      GROUP BY e.journal, EXTRACT(MONTH FROM e.date_ecriture)
      ORDER BY e.journal, mois
    `, [req.params.entite_id, req.params.exercice_id]);
    res.json(result.rows);
  } catch (err) { logger.error(err.message || err); res.status(500).json({ error: 'Erreur serveur.' }); }
});

// Balance agee des tiers : creances/dettes par tranche d'anciennete
router.get('/rapports/balance-agee/:entite_id/:exercice_id', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT el.tiers_id, t.nom AS tiers_nom, t.code_tiers, t.type AS tiers_type,
             e.date_ecriture, el.debit, el.credit, el.lettrage_code
      FROM ecriture_lignes el
      JOIN ecritures e ON e.id = el.ecriture_id
      JOIN tiers t ON t.id = el.tiers_id
      WHERE e.entite_id = $1 AND e.exercice_id = $2 AND e.statut = 'validee'
        AND el.tiers_id IS NOT NULL
        AND (el.lettrage_code IS NULL OR el.lettrage_code = '')
      ORDER BY t.nom, e.date_ecriture
    `, [req.params.entite_id, req.params.exercice_id]);
    res.json(result.rows);
  } catch (err) { logger.error(err.message || err); res.status(500).json({ error: 'Erreur serveur.' }); }
});

// Suivi de tresorerie : mouvements mensuels sur comptes 5x
router.get('/rapports/tresorerie/:entite_id/:exercice_id', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT EXTRACT(MONTH FROM e.date_ecriture)::int AS mois,
             el.numero_compte,
             COALESCE(SUM(el.debit), 0) AS total_debit,
             COALESCE(SUM(el.credit), 0) AS total_credit
      FROM ecriture_lignes el
      JOIN ecritures e ON e.id = el.ecriture_id
      WHERE e.entite_id = $1 AND e.exercice_id = $2 AND e.statut = 'validee'
        AND el.numero_compte LIKE '5%'
      GROUP BY mois, el.numero_compte
      ORDER BY el.numero_compte, mois
    `, [req.params.entite_id, req.params.exercice_id]);
    res.json(result.rows);
  } catch (err) { logger.error(err.message || err); res.status(500).json({ error: 'Erreur serveur.' }); }
});

// Repartition des charges : totaux par classe 6 (charges)
router.get('/rapports/repartition-charges/:entite_id/:exercice_id', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT LEFT(el.numero_compte, 2) AS poste,
             el.numero_compte, el.libelle_compte,
             COALESCE(SUM(el.debit), 0) AS total_debit,
             COALESCE(SUM(el.credit), 0) AS total_credit
      FROM ecriture_lignes el
      JOIN ecritures e ON e.id = el.ecriture_id
      WHERE e.entite_id = $1 AND e.exercice_id = $2 AND e.statut = 'validee'
        AND el.numero_compte LIKE '6%'
      GROUP BY el.numero_compte, el.libelle_compte
      ORDER BY el.numero_compte
    `, [req.params.entite_id, req.params.exercice_id]);
    res.json(result.rows);
  } catch (err) { logger.error(err.message || err); res.status(500).json({ error: 'Erreur serveur.' }); }
});

// Comparatif N/N-1 : balance par classe pour 2 exercices
router.get('/rapports/comparatif/:entite_id/:exercice_id', async (req, res) => {
  const { exercice_id_n1 } = req.query;
  try {
    const balN = await pool.query(`
      SELECT LEFT(el.numero_compte, 2) AS poste,
             COALESCE(SUM(el.debit), 0) AS debit, COALESCE(SUM(el.credit), 0) AS credit
      FROM ecriture_lignes el JOIN ecritures e ON e.id = el.ecriture_id
      WHERE e.entite_id = $1 AND e.exercice_id = $2 AND e.statut = 'validee'
      GROUP BY LEFT(el.numero_compte, 2) ORDER BY poste
    `, [req.params.entite_id, req.params.exercice_id]);

    let balN1 = { rows: [] };
    if (exercice_id_n1) {
      balN1 = await pool.query(`
        SELECT LEFT(el.numero_compte, 2) AS poste,
               COALESCE(SUM(el.debit), 0) AS debit, COALESCE(SUM(el.credit), 0) AS credit
        FROM ecriture_lignes el JOIN ecritures e ON e.id = el.ecriture_id
        WHERE e.entite_id = $1 AND e.exercice_id = $2 AND e.statut = 'validee'
        GROUP BY LEFT(el.numero_compte, 2) ORDER BY poste
      `, [req.params.entite_id, exercice_id_n1]);
    }
    res.json({ n: balN.rows, n1: balN1.rows });
  } catch (err) { logger.error(err.message || err); res.status(500).json({ error: 'Erreur serveur.' }); }
});

// Tableau de bord : indicateurs cles
router.get('/rapports/tableau-bord/:entite_id/:exercice_id', async (req, res) => {
  try {
    // Totaux par classe
    const classes = await pool.query(`
      SELECT LEFT(el.numero_compte, 1) AS classe,
             COALESCE(SUM(el.debit), 0) AS debit, COALESCE(SUM(el.credit), 0) AS credit
      FROM ecriture_lignes el JOIN ecritures e ON e.id = el.ecriture_id
      WHERE e.entite_id = $1 AND e.exercice_id = $2 AND e.statut = 'validee'
      GROUP BY LEFT(el.numero_compte, 1) ORDER BY classe
    `, [req.params.entite_id, req.params.exercice_id]);

    // Evolution mensuelle produits/charges
    const mensuel = await pool.query(`
      SELECT EXTRACT(MONTH FROM e.date_ecriture)::int AS mois,
             COALESCE(SUM(CASE WHEN el.numero_compte LIKE '7%' THEN el.credit - el.debit ELSE 0 END), 0) AS produits,
             COALESCE(SUM(CASE WHEN el.numero_compte LIKE '6%' THEN el.debit - el.credit ELSE 0 END), 0) AS charges
      FROM ecriture_lignes el JOIN ecritures e ON e.id = el.ecriture_id
      WHERE e.entite_id = $1 AND e.exercice_id = $2 AND e.statut = 'validee'
      GROUP BY mois ORDER BY mois
    `, [req.params.entite_id, req.params.exercice_id]);

    // Tresorerie
    const treso = await pool.query(`
      SELECT COALESCE(SUM(el.debit), 0) AS debit, COALESCE(SUM(el.credit), 0) AS credit
      FROM ecriture_lignes el JOIN ecritures e ON e.id = el.ecriture_id
      WHERE e.entite_id = $1 AND e.exercice_id = $2 AND e.statut = 'validee' AND el.numero_compte LIKE '5%'
    `, [req.params.entite_id, req.params.exercice_id]);

    res.json({ classes: classes.rows, mensuel: mensuel.rows, tresorerie: treso.rows[0] });
  } catch (err) { logger.error(err.message || err); res.status(500).json({ error: 'Erreur serveur.' }); }
});

// Echeancier : ecritures tiers avec montants dus/payes
router.get('/rapports/echeancier/:entite_id/:exercice_id', async (req, res) => {
  const { type_tiers, date_du, date_au, statut } = req.query;
  try {
    let query = `
      SELECT el.id, el.debit, el.credit, el.lettrage_code, el.tiers_id,
             t.nom AS tiers_nom, t.type AS tiers_type,
             e.date_ecriture AS date_echeance, e.numero_piece, e.libelle
      FROM ecriture_lignes el
      JOIN ecritures e ON e.id = el.ecriture_id
      JOIN tiers t ON t.id = el.tiers_id
      WHERE e.entite_id = $1 AND e.exercice_id = $2 AND e.statut = 'validee' AND el.tiers_id IS NOT NULL`;
    const params = [req.params.entite_id, req.params.exercice_id];
    let idx = 3;
    if (type_tiers) { query += ` AND t.type = $${idx}`; params.push(type_tiers); idx++; }
    if (date_du) { query += ` AND e.date_ecriture >= $${idx}`; params.push(date_du); idx++; }
    if (date_au) { query += ` AND e.date_ecriture <= $${idx}`; params.push(date_au); idx++; }
    query += ` ORDER BY e.date_ecriture, t.nom`;
    const result = await pool.query(query, params);
    // Compute montant, montant_paye, montant_du
    const rows = result.rows.map(r => {
      const montant = Math.abs(parseFloat(r.debit) - parseFloat(r.credit));
      const paye = r.lettrage_code ? montant : 0;
      return { ...r, montant, montant_paye: paye, montant_du: montant - paye };
    });
    if (statut === 'du') res.json(rows.filter(r => r.montant_du > 0));
    else if (statut === 'paye') res.json(rows.filter(r => r.montant_du === 0));
    else res.json(rows);
  } catch (err) { logger.error(err.message || err); res.status(500).json({ error: 'Erreur serveur.' }); }
});

// ============ LETTRAGE ============

// Liste des tiers avec solde pour le panneau gauche du lettrage
router.get('/lettrage/tiers/:entite_id/:exercice_id', async (req, res) => {
  const { type_tiers } = req.query;
  try {
    let query = `
      SELECT t.id, t.nom, t.code_tiers, t.type, t.compte_comptable,
             COALESCE(SUM(el.debit), 0) AS total_debit,
             COALESCE(SUM(el.credit), 0) AS total_credit,
             COALESCE(SUM(el.debit), 0) - COALESCE(SUM(el.credit), 0) AS solde
      FROM tiers t
      LEFT JOIN ecriture_lignes el ON el.tiers_id = t.id
      LEFT JOIN ecritures e ON e.id = el.ecriture_id AND e.entite_id = $1 AND e.exercice_id = $2 AND e.statut = 'validee'
      WHERE t.entite_id = $1 AND t.actif = TRUE`;
    const params = [req.params.entite_id, req.params.exercice_id];
    let idx = 3;
    if (type_tiers) {
      const types = type_tiers.split(',');
      query += ` AND t.type = ANY($${idx}::text[])`;
      params.push(types);
      idx++;
    }
    query += ` GROUP BY t.id, t.nom, t.code_tiers, t.type, t.compte_comptable ORDER BY t.type, t.nom`;
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    logger.error(err.message || err);
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

// Ecritures d'un tiers pour lettrage (avec filtre lettré/non lettré)
router.get('/lettrage/ecritures/:entite_id/:exercice_id/:tiers_id', async (req, res) => {
  const { statut, annee_de, annee_a } = req.query;
  try {
    let query = `
      SELECT el.id, el.numero_compte, el.libelle_compte, el.debit, el.credit, el.lettrage_code, el.tiers_id,
             e.date_ecriture, e.libelle AS libelle_ecriture, e.numero_piece, e.journal, e.id AS ecriture_id
      FROM ecriture_lignes el
      JOIN ecritures e ON e.id = el.ecriture_id
      WHERE e.entite_id = $1 AND e.exercice_id = $2 AND el.tiers_id = $3 AND e.statut = 'validee'`;
    const params = [req.params.entite_id, req.params.exercice_id, req.params.tiers_id];
    let idx = 4;

    if (statut === 'non_lettrees') {
      query += ` AND (el.lettrage_code IS NULL OR el.lettrage_code = '')`;
    } else if (statut === 'lettrees') {
      query += ` AND el.lettrage_code IS NOT NULL AND el.lettrage_code != ''`;
    }
    if (annee_de) {
      query += ` AND EXTRACT(YEAR FROM e.date_ecriture) >= $${idx}`;
      params.push(parseInt(annee_de));
      idx++;
    }
    if (annee_a) {
      query += ` AND EXTRACT(YEAR FROM e.date_ecriture) <= $${idx}`;
      params.push(parseInt(annee_a));
      idx++;
    }

    query += ` ORDER BY e.date_ecriture, e.id, el.id`;
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    logger.error(err.message || err);
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

// Lettrer des lignes (affecter un code lettrage)
router.post('/lettrage/lettrer', async (req, res) => {
  const { ligne_ids, entite_id } = req.body;
  if (!ligne_ids || ligne_ids.length < 2) {
    return res.status(400).json({ error: 'Au moins 2 lignes requises.' });
  }
  try {
    // Verifier que le solde des lignes selectionnees est nul
    const check = await pool.query(
      `SELECT COALESCE(SUM(debit), 0) - COALESCE(SUM(credit), 0) AS ecart FROM ecriture_lignes WHERE id = ANY($1::int[])`,
      [ligne_ids]
    );
    const ecart = parseFloat(check.rows[0].ecart);
    if (Math.abs(ecart) > 0.01) {
      return res.status(400).json({ error: `Ecart non nul: ${ecart.toFixed(2)}. Les lignes selectionnees doivent s'equilibrer.` });
    }
    // Verifier qu'aucune ligne n'est deja lettree
    const already = await pool.query(
      `SELECT COUNT(*) FROM ecriture_lignes WHERE id = ANY($1::int[]) AND lettrage_code IS NOT NULL AND lettrage_code != ''`,
      [ligne_ids]
    );
    if (parseInt(already.rows[0].count) > 0) {
      return res.status(400).json({ error: 'Certaines lignes sont deja lettrees.' });
    }
    // Generer un code lettrage unique (AAA, AAB, ..., ZZZ)
    const lastCode = await pool.query(
      `SELECT MAX(lettrage_code) AS last_code FROM ecriture_lignes el
       JOIN ecritures e ON e.id = el.ecriture_id
       WHERE e.entite_id = $1 AND el.lettrage_code IS NOT NULL AND el.lettrage_code != ''`,
      [entite_id]
    );
    let newCode = 'AAA';
    if (lastCode.rows[0].last_code) {
      const lc = lastCode.rows[0].last_code;
      let chars = lc.split('').map(c => c.charCodeAt(0));
      chars[2]++;
      if (chars[2] > 90) { chars[2] = 65; chars[1]++; }
      if (chars[1] > 90) { chars[1] = 65; chars[0]++; }
      newCode = chars.map(c => String.fromCharCode(c)).join('');
    }
    await pool.query(
      `UPDATE ecriture_lignes SET lettrage_code = $1 WHERE id = ANY($2::int[])`,
      [newCode, ligne_ids]
    );
    res.json({ code: newCode, count: ligne_ids.length });
  } catch (err) {
    logger.error(err.message || err);
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

// Delettrer des lignes (retirer le code lettrage)
router.post('/lettrage/delettrer', async (req, res) => {
  const { lettrage_code, entite_id } = req.body;
  if (!lettrage_code) {
    return res.status(400).json({ error: 'Code lettrage requis.' });
  }
  try {
    const result = await pool.query(
      `UPDATE ecriture_lignes SET lettrage_code = NULL
       WHERE lettrage_code = $1 AND ecriture_id IN (SELECT id FROM ecritures WHERE entite_id = $2)`,
      [lettrage_code, entite_id]
    );
    res.json({ deleted: result.rowCount });
  } catch (err) {
    logger.error(err.message || err);
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

module.exports = router;
