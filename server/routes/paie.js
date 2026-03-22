const express = require('express');
const pool = require('../db');
const logger = require('../logger');

const router = express.Router();

// ============ CONFIG PAIE ============

router.get('/config', async (req, res) => {
  const { entite_id } = req.query;
  if (!entite_id) return res.status(400).json({ error: 'entite_id requis.' });

  try {
    const result = await pool.query('SELECT * FROM paie_config WHERE entite_id = $1', [entite_id]);
    res.json({ config: result.rows[0] || null });
  } catch (err) {
    logger.error(err.message || err);
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

router.put('/config', async (req, res) => {
  const { entite_id, devise, mois, annee, step, mode } = req.body;
  if (!entite_id) return res.status(400).json({ error: 'entite_id requis.' });

  try {
    const result = await pool.query(
      `INSERT INTO paie_config (entite_id, devise, mois, annee, step, mode, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW())
       ON CONFLICT (entite_id) DO UPDATE SET
         devise = COALESCE($2, paie_config.devise),
         mois = COALESCE($3, paie_config.mois),
         annee = COALESCE($4, paie_config.annee),
         step = COALESCE($5, paie_config.step),
         mode = COALESCE($6, paie_config.mode),
         updated_at = NOW()
       RETURNING *`,
      [entite_id, devise || 'XAF', mois, annee, step, mode]
    );
    res.json({ config: result.rows[0] });
  } catch (err) {
    logger.error(err.message || err);
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

// ============ ETABLISSEMENTS ============

router.get('/etablissements', async (req, res) => {
  const { entite_id } = req.query;
  if (!entite_id) return res.status(400).json({ error: 'entite_id requis.' });

  try {
    const result = await pool.query(
      'SELECT * FROM etablissements WHERE entite_id = $1 ORDER BY created_at ASC',
      [entite_id]
    );
    res.json({ etablissements: result.rows });
  } catch (err) {
    logger.error(err.message || err);
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

router.post('/etablissements', async (req, res) => {
  const { entite_id, raison_sociale, nui, data } = req.body;
  if (!entite_id || !raison_sociale) {
    return res.status(400).json({ error: 'entite_id et raison_sociale requis.' });
  }

  try {
    const result = await pool.query(
      `INSERT INTO etablissements (entite_id, raison_sociale, nui, data)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [entite_id, raison_sociale, nui || null, JSON.stringify(data || {})]
    );
    res.status(201).json({ etablissement: result.rows[0] });
  } catch (err) {
    logger.error(err.message || err);
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

router.put('/etablissements/:id', async (req, res) => {
  const { id } = req.params;
  const { raison_sociale, nui, data } = req.body;

  try {
    const result = await pool.query(
      `UPDATE etablissements SET
        raison_sociale = COALESCE($1, raison_sociale),
        nui = COALESCE($2, nui),
        data = COALESCE($3, data)
      WHERE id = $4 RETURNING *`,
      [raison_sociale, nui, data ? JSON.stringify(data) : null, id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Etablissement non trouve.' });
    res.json({ etablissement: result.rows[0] });
  } catch (err) {
    logger.error(err.message || err);
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

router.delete('/etablissements/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const result = await pool.query('DELETE FROM etablissements WHERE id = $1 RETURNING id', [id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Etablissement non trouve.' });
    res.json({ message: 'Etablissement supprime.' });
  } catch (err) {
    logger.error(err.message || err);
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

// ============ SALARIES ============

router.get('/salaries', async (req, res) => {
  const { entite_id } = req.query;
  if (!entite_id) return res.status(400).json({ error: 'entite_id requis.' });

  try {
    const result = await pool.query(
      'SELECT * FROM salaries WHERE entite_id = $1 ORDER BY created_at ASC',
      [entite_id]
    );
    res.json({ salaries: result.rows });
  } catch (err) {
    logger.error(err.message || err);
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

router.post('/salaries', async (req, res) => {
  const { entite_id, etablissement_id, data } = req.body;
  if (!entite_id) return res.status(400).json({ error: 'entite_id requis.' });

  try {
    const result = await pool.query(
      `INSERT INTO salaries (entite_id, etablissement_id, data)
       VALUES ($1, $2, $3) RETURNING *`,
      [entite_id, etablissement_id || null, JSON.stringify(data || {})]
    );
    res.status(201).json({ salarie: result.rows[0] });
  } catch (err) {
    logger.error(err.message || err);
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

router.put('/salaries/:id', async (req, res) => {
  const { id } = req.params;
  const { etablissement_id, data } = req.body;

  try {
    const result = await pool.query(
      `UPDATE salaries SET
        etablissement_id = COALESCE($1, etablissement_id),
        data = COALESCE($2, data)
      WHERE id = $3 RETURNING *`,
      [etablissement_id, data ? JSON.stringify(data) : null, id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Salarie non trouve.' });
    res.json({ salarie: result.rows[0] });
  } catch (err) {
    logger.error(err.message || err);
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

router.delete('/salaries/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const result = await pool.query('DELETE FROM salaries WHERE id = $1 RETURNING id', [id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Salarie non trouve.' });
    res.json({ message: 'Salarie supprime.' });
  } catch (err) {
    logger.error(err.message || err);
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

module.exports = router;
