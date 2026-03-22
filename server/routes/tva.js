const pool = require('../db');
const router = require('express').Router();
const logger = require('../logger');

// Helper : recalculer les totaux d'une declaration
async function recalcTotals(declarationId, client) {
  const db = client || pool;
  const result = await db.query(
    `SELECT
       COALESCE(SUM(CASE WHEN onglet = 'collectee' THEN montant_taxe ELSE 0 END), 0) AS tva_collectee,
       COALESCE(SUM(CASE WHEN onglet = 'deductible' THEN montant_taxe ELSE 0 END), 0) AS tva_deductible
     FROM declaration_tva_lignes
     WHERE declaration_id = $1`,
    [declarationId]
  );
  const collectee = parseFloat(result.rows[0].tva_collectee);
  const deductible = parseFloat(result.rows[0].tva_deductible);
  const payer = collectee - deductible;
  await db.query(
    `UPDATE declarations_tva
     SET montant_tva_collectee = $1, montant_tva_deductible = $2, montant_tva_payer = $3, updated_at = NOW()
     WHERE id = $4`,
    [collectee, deductible, payer, declarationId]
  );
  return { collectee, deductible, payer };
}

// GET /declarations/:entiteId/:exerciceId — Lister les 12 declarations mensuelles
router.get('/declarations/:entiteId/:exerciceId', async (req, res) => {
  const { entiteId, exerciceId } = req.params;
  try {
    // Verifier si les declarations existent deja
    const existing = await pool.query(
      `SELECT id, mois, type_declaration, statut, montant_tva_collectee, montant_tva_deductible, montant_tva_payer
       FROM declarations_tva
       WHERE entite_id = $1 AND exercice_id = $2
       ORDER BY mois`,
      [entiteId, exerciceId]
    );

    if (existing.rows.length > 0) {
      return res.json(existing.rows);
    }

    // Auto-creation des 12 mois
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      for (let mois = 1; mois <= 12; mois++) {
        await client.query(
          `INSERT INTO declarations_tva (entite_id, exercice_id, mois)
           VALUES ($1, $2, $3)
           ON CONFLICT (entite_id, exercice_id, mois, type_declaration) DO NOTHING`,
          [entiteId, exerciceId, mois]
        );
      }
      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }

    const result = await pool.query(
      `SELECT id, mois, type_declaration, statut, montant_tva_collectee, montant_tva_deductible, montant_tva_payer
       FROM declarations_tva
       WHERE entite_id = $1 AND exercice_id = $2
       ORDER BY mois`,
      [entiteId, exerciceId]
    );
    res.json(result.rows);
  } catch (err) {
    logger.error(err.message || err);
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

// GET /declaration/:id — Detail d'une declaration avec ses lignes groupees par onglet
router.get('/declaration/:id', async (req, res) => {
  try {
    const decl = await pool.query(
      `SELECT * FROM declarations_tva WHERE id = $1`,
      [req.params.id]
    );
    if (decl.rows.length === 0) {
      return res.status(404).json({ error: 'Declaration non trouvee.' });
    }

    const lignes = await pool.query(
      `SELECT * FROM declaration_tva_lignes WHERE declaration_id = $1 ORDER BY onglet, id`,
      [req.params.id]
    );

    // Grouper les lignes par onglet
    const lignesParOnglet = {};
    for (const ligne of lignes.rows) {
      if (!lignesParOnglet[ligne.onglet]) {
        lignesParOnglet[ligne.onglet] = [];
      }
      lignesParOnglet[ligne.onglet].push(ligne);
    }

    res.json({ ...decl.rows[0], lignes: lignesParOnglet });
  } catch (err) {
    logger.error(err.message || err);
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

// GET /lignes/:declarationId/:onglet — Lignes d'un onglet specifique
router.get('/lignes/:declarationId/:onglet', async (req, res) => {
  const { declarationId, onglet } = req.params;
  try {
    const result = await pool.query(
      `SELECT * FROM declaration_tva_lignes
       WHERE declaration_id = $1 AND onglet = $2
       ORDER BY id`,
      [declarationId, onglet]
    );
    res.json(result.rows);
  } catch (err) {
    logger.error(err.message || err);
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

// GET /montants-comptes/:entiteId/:exerciceId — Montants par comptes pour un mois donné
// Query params: mois (1-12), comptes (comma-separated account prefixes like "443,445,4471")
router.get('/montants-comptes/:entiteId/:exerciceId', async (req, res) => {
  const { entiteId, exerciceId } = req.params;
  const { mois, comptes } = req.query;
  if (!mois || !comptes) {
    return res.status(400).json({ error: 'Paramètres mois et comptes requis.' });
  }

  try {
    // Recuperer l'annee de l'exercice
    const exResult = await pool.query('SELECT annee FROM exercices WHERE id = $1', [exerciceId]);
    if (exResult.rows.length === 0) return res.status(404).json({ error: 'Exercice non trouvé.' });
    const annee = exResult.rows[0].annee;
    const m = parseInt(mois);
    const dateDebut = `${annee}-${String(m).padStart(2, '0')}-01`;
    const lastDay = new Date(annee, m, 0).getDate();
    const dateFin = `${annee}-${String(m).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

    // Construire les conditions LIKE pour chaque prefixe de compte
    const comptePrefixes = comptes.split(',').map(c => c.trim()).filter(Boolean);
    if (comptePrefixes.length === 0) return res.json({ lignes: [], total_debit: 0, total_credit: 0, solde: 0 });

    const likeConditions = comptePrefixes.map((_, i) => `el.numero_compte LIKE $${i + 5}`).join(' OR ');
    const params = [entiteId, exerciceId, dateDebut, dateFin, ...comptePrefixes.map(p => p + '%')];

    const result = await pool.query(`
      SELECT el.numero_compte, el.libelle_compte,
             e.date_ecriture, e.libelle AS libelle_ecriture, e.numero_piece,
             el.debit, el.credit
      FROM ecriture_lignes el
      JOIN ecritures e ON e.id = el.ecriture_id
      WHERE e.entite_id = $1 AND e.exercice_id = $2 AND e.statut = 'validee'
        AND e.date_ecriture >= $3 AND e.date_ecriture <= $4
        AND (${likeConditions})
      ORDER BY el.numero_compte, e.date_ecriture
    `, params);

    const totalDebit = result.rows.reduce((s, r) => s + parseFloat(r.debit || 0), 0);
    const totalCredit = result.rows.reduce((s, r) => s + parseFloat(r.credit || 0), 0);

    res.json({
      lignes: result.rows,
      total_debit: totalDebit,
      total_credit: totalCredit,
      solde: totalCredit - totalDebit,
    });
  } catch (err) {
    logger.error(err.message || err);
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

// GET /plan-comptable-44 — Liste des comptes 44x du plan comptable
router.get('/plan-comptable-44', (req, res) => {
  try {
    const path = require('path');
    const planComptable = require(path.join(__dirname, '..', 'data', 'plan_comptable_sycebnl.json'));
    const comptes44 = planComptable.filter(c => c.numero.startsWith('44'));
    res.json(comptes44);
  } catch (err) {
    logger.error(err.message || err);
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

// POST /ligne — Ajouter une ligne a une declaration
router.post('/ligne', async (req, res) => {
  const { declaration_id, onglet, groupe, reference, libelle, montant_net, taux_taxe, montant_taxe, date_document, avoir } = req.body;

  if (!declaration_id || !onglet) {
    return res.status(400).json({ error: 'declaration_id et onglet sont requis.' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const result = await client.query(
      `INSERT INTO declaration_tva_lignes
       (declaration_id, onglet, groupe, reference, libelle, montant_net, taux_taxe, montant_taxe, date_document, avoir)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING *`,
      [
        declaration_id,
        onglet,
        groupe || null,
        reference || null,
        libelle || null,
        parseFloat(montant_net) || 0,
        parseFloat(taux_taxe) || 0,
        parseFloat(montant_taxe) || 0,
        date_document || null,
        avoir || false
      ]
    );

    const totals = await recalcTotals(declaration_id, client);
    await client.query('COMMIT');

    res.status(201).json({ ligne: result.rows[0], totals });
  } catch (err) {
    await client.query('ROLLBACK');
    logger.error(err.message || err);
    res.status(500).json({ error: 'Erreur serveur.' });
  } finally {
    client.release();
  }
});

// PUT /ligne/:id — Modifier une ligne
router.put('/ligne/:id', async (req, res) => {
  const { onglet, groupe, reference, libelle, montant_net, taux_taxe, montant_taxe, date_document, avoir } = req.body;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Recuperer la ligne pour connaitre la declaration
    const existing = await client.query(
      `SELECT declaration_id FROM declaration_tva_lignes WHERE id = $1`,
      [req.params.id]
    );
    if (existing.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Ligne non trouvee.' });
    }
    const declarationId = existing.rows[0].declaration_id;

    const result = await client.query(
      `UPDATE declaration_tva_lignes SET
         onglet = COALESCE($1, onglet),
         groupe = $2,
         reference = $3,
         libelle = $4,
         montant_net = COALESCE($5, montant_net),
         taux_taxe = COALESCE($6, taux_taxe),
         montant_taxe = COALESCE($7, montant_taxe),
         date_document = $8,
         avoir = COALESCE($9, avoir)
       WHERE id = $10
       RETURNING *`,
      [
        onglet || null,
        groupe !== undefined ? groupe : null,
        reference !== undefined ? reference : null,
        libelle !== undefined ? libelle : null,
        montant_net !== undefined ? parseFloat(montant_net) : null,
        taux_taxe !== undefined ? parseFloat(taux_taxe) : null,
        montant_taxe !== undefined ? parseFloat(montant_taxe) : null,
        date_document || null,
        avoir !== undefined ? avoir : null,
        req.params.id
      ]
    );

    const totals = await recalcTotals(declarationId, client);
    await client.query('COMMIT');

    res.json({ ligne: result.rows[0], totals });
  } catch (err) {
    await client.query('ROLLBACK');
    logger.error(err.message || err);
    res.status(500).json({ error: 'Erreur serveur.' });
  } finally {
    client.release();
  }
});

// DELETE /ligne/:id — Supprimer une ligne
router.delete('/ligne/:id', async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Recuperer la declaration avant suppression
    const existing = await client.query(
      `SELECT declaration_id FROM declaration_tva_lignes WHERE id = $1`,
      [req.params.id]
    );
    if (existing.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Ligne non trouvee.' });
    }
    const declarationId = existing.rows[0].declaration_id;

    await client.query(
      `DELETE FROM declaration_tva_lignes WHERE id = $1`,
      [req.params.id]
    );

    const totals = await recalcTotals(declarationId, client);
    await client.query('COMMIT');

    res.json({ message: 'Ligne supprimee.', totals });
  } catch (err) {
    await client.query('ROLLBACK');
    logger.error(err.message || err);
    res.status(500).json({ error: 'Erreur serveur.' });
  } finally {
    client.release();
  }
});

// POST /importer-ecritures/:declarationId — Importer les lignes TVA depuis les ecritures comptables
router.post('/importer-ecritures/:declarationId', async (req, res) => {
  const client = await pool.connect();
  try {
    // Recuperer la declaration
    const declResult = await client.query(
      'SELECT * FROM declarations_tva WHERE id = $1',
      [req.params.declarationId]
    );
    if (declResult.rows.length === 0) {
      client.release();
      return res.status(404).json({ error: 'Déclaration non trouvée.' });
    }
    const decl = declResult.rows[0];

    // Recuperer les dates de l'exercice pour calculer le mois
    const exResult = await client.query(
      'SELECT * FROM exercices WHERE id = $1',
      [decl.exercice_id]
    );
    if (exResult.rows.length === 0) {
      client.release();
      return res.status(404).json({ error: 'Exercice non trouvé.' });
    }
    const exercice = exResult.rows[0];
    const annee = exercice.annee;
    const mois = decl.mois;

    // Plage de dates du mois
    const dateDebut = `${annee}-${String(mois).padStart(2, '0')}-01`;
    const lastDay = new Date(annee, mois, 0).getDate();
    const dateFin = `${annee}-${String(mois).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

    await client.query('BEGIN');

    // Supprimer les anciennes lignes importees (on reimporte tout)
    await client.query(
      'DELETE FROM declaration_tva_lignes WHERE declaration_id = $1',
      [decl.id]
    );

    // TVA collectee : comptes 443x (TVA facturee)
    // On cherche les ecritures validees du mois avec des lignes sur comptes 443x
    const collectee = await client.query(`
      SELECT el.numero_compte, el.libelle_compte,
             e.date_ecriture, e.libelle AS libelle_ecriture, e.numero_piece,
             el.debit, el.credit
      FROM ecriture_lignes el
      JOIN ecritures e ON e.id = el.ecriture_id
      WHERE e.entite_id = $1 AND e.exercice_id = $2 AND e.statut = 'validee'
        AND e.date_ecriture >= $3 AND e.date_ecriture <= $4
        AND el.numero_compte LIKE '443%'
      ORDER BY e.date_ecriture, e.id
    `, [decl.entite_id, decl.exercice_id, dateDebut, dateFin]);

    // Inserer les lignes collectees
    for (const row of collectee.rows) {
      const montantTaxe = parseFloat(row.credit) - parseFloat(row.debit);
      if (Math.abs(montantTaxe) < 0.01) continue;
      // Determiner le taux (18% par defaut, 5% si compte 4435)
      const taux = row.numero_compte.startsWith('4435') ? 5 : 18;
      const montantNet = Math.round((Math.abs(montantTaxe) / taux) * 100);
      await client.query(
        `INSERT INTO declaration_tva_lignes
         (declaration_id, onglet, groupe, reference, libelle, montant_net, taux_taxe, montant_taxe, date_document, avoir)
         VALUES ($1, 'collectee', $2, $3, $4, $5, $6, $7, $8, $9)`,
        [
          decl.id,
          row.numero_compte,
          row.numero_piece || '',
          row.libelle_ecriture || row.libelle_compte || '',
          Math.abs(montantNet),
          taux,
          Math.abs(montantTaxe),
          row.date_ecriture,
          montantTaxe < 0,
        ]
      );
    }

    // TVA deductible : comptes 445x (TVA recuperable)
    const deductible = await client.query(`
      SELECT el.numero_compte, el.libelle_compte,
             e.date_ecriture, e.libelle AS libelle_ecriture, e.numero_piece,
             el.debit, el.credit
      FROM ecriture_lignes el
      JOIN ecritures e ON e.id = el.ecriture_id
      WHERE e.entite_id = $1 AND e.exercice_id = $2 AND e.statut = 'validee'
        AND e.date_ecriture >= $3 AND e.date_ecriture <= $4
        AND el.numero_compte LIKE '445%'
      ORDER BY e.date_ecriture, e.id
    `, [decl.entite_id, decl.exercice_id, dateDebut, dateFin]);

    // Inserer les lignes deductibles
    for (const row of deductible.rows) {
      const montantTaxe = parseFloat(row.debit) - parseFloat(row.credit);
      if (Math.abs(montantTaxe) < 0.01) continue;
      const taux = row.numero_compte.startsWith('4455') ? 5 : 18;
      const montantNet = Math.round((Math.abs(montantTaxe) / taux) * 100);
      await client.query(
        `INSERT INTO declaration_tva_lignes
         (declaration_id, onglet, groupe, reference, libelle, montant_net, taux_taxe, montant_taxe, date_document, avoir)
         VALUES ($1, 'deductible', $2, $3, $4, $5, $6, $7, $8, $9)`,
        [
          decl.id,
          row.numero_compte,
          row.numero_piece || '',
          row.libelle_ecriture || row.libelle_compte || '',
          Math.abs(montantNet),
          taux,
          Math.abs(montantTaxe),
          row.date_ecriture,
          montantTaxe < 0,
        ]
      );
    }

    // Recalculer les totaux
    const totals = await recalcTotals(decl.id, client);

    // Passer en brouillon si nouvelle
    if (decl.statut === 'nouvelle') {
      await client.query(
        "UPDATE declarations_tva SET statut = 'brouillon', updated_at = NOW() WHERE id = $1",
        [decl.id]
      );
    }

    await client.query('COMMIT');

    res.json({
      message: `Import terminé : ${collectee.rows.length} lignes TVA collectée, ${deductible.rows.length} lignes TVA déductible.`,
      nb_collectee: collectee.rows.length,
      nb_deductible: deductible.rows.length,
      totals,
    });
  } catch (err) {
    await client.query('ROLLBACK');
    logger.error(err.message || err);
    res.status(500).json({ error: 'Erreur serveur.' });
  } finally {
    client.release();
  }
});

// PUT /declaration/:id/statut — Changer le statut d'une declaration
router.put('/declaration/:id/statut', async (req, res) => {
  const { statut } = req.body;
  const transitions = {
    nouvelle: ['brouillon'],
    brouillon: ['validee', 'nouvelle'],
    validee: ['transmise', 'brouillon'],
    transmise: []
  };

  try {
    const decl = await pool.query(
      `SELECT statut FROM declarations_tva WHERE id = $1`,
      [req.params.id]
    );
    if (decl.rows.length === 0) {
      return res.status(404).json({ error: 'Declaration non trouvee.' });
    }

    const currentStatut = decl.rows[0].statut;
    const allowed = transitions[currentStatut] || [];
    if (!allowed.includes(statut)) {
      return res.status(400).json({
        error: `Transition non autorisee: ${currentStatut} → ${statut}. Transitions possibles: ${allowed.join(', ') || 'aucune'}`
      });
    }

    const result = await pool.query(
      `UPDATE declarations_tva SET statut = $1, updated_at = NOW() WHERE id = $2 RETURNING *`,
      [statut, req.params.id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    logger.error(err.message || err);
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

module.exports = router;
