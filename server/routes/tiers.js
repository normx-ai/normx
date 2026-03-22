const express = require('express');
const pool = require('../db');
const logger = require('../logger');

const router = express.Router();

// Lister les tiers d'une entite (avec filtres optionnels)
router.get('/:entite_id', async (req, res) => {
  const { type, search, actif } = req.query;
  try {
    let query = 'SELECT * FROM tiers WHERE entite_id = $1';
    const params = [req.params.entite_id];
    let idx = 2;

    if (type) {
      query += ` AND type = $${idx}`;
      params.push(type);
      idx++;
    }
    if (actif !== undefined) {
      query += ` AND actif = $${idx}`;
      params.push(actif === 'true');
      idx++;
    }
    if (search) {
      query += ` AND (nom ILIKE $${idx} OR code_tiers ILIKE $${idx} OR email ILIKE $${idx})`;
      params.push('%' + search + '%');
      idx++;
    }

    query += ' ORDER BY type, nom';
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    logger.error(err.message || err);
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

// Obtenir un tiers par ID
router.get('/detail/:id', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM tiers WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Tiers non trouve.' });
    res.json(result.rows[0]);
  } catch (err) {
    logger.error(err.message || err);
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

// Creer un tiers
router.post('/', async (req, res) => {
  const { entite_id, type, code_tiers, nom, compte_comptable, telephone, email, adresse, data } = req.body;
  if (!entite_id || !type || !nom) {
    return res.status(400).json({ error: 'Champs obligatoires: entite_id, type, nom.' });
  }
  try {
    const result = await pool.query(
      `INSERT INTO tiers (entite_id, type, code_tiers, nom, compte_comptable, telephone, email, adresse, data)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
      [entite_id, type, code_tiers || null, nom, compte_comptable || null, telephone || null, email || null, adresse || null, data || {}]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    logger.error(err.message || err);
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

// Modifier un tiers
router.put('/:id', async (req, res) => {
  const { type, code_tiers, nom, compte_comptable, telephone, email, adresse, data, actif } = req.body;
  if (!nom) return res.status(400).json({ error: 'Le nom est obligatoire.' });
  try {
    const result = await pool.query(
      `UPDATE tiers SET type = $1, code_tiers = $2, nom = $3, compte_comptable = $4, telephone = $5, email = $6, adresse = $7, data = $8, actif = $9, updated_at = NOW()
       WHERE id = $10 RETURNING *`,
      [type, code_tiers || null, nom, compte_comptable || null, telephone || null, email || null, adresse || null, data || {}, actif !== false, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Tiers non trouve.' });
    res.json(result.rows[0]);
  } catch (err) {
    logger.error(err.message || err);
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

// Supprimer un tiers
router.delete('/:id', async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM tiers WHERE id = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Tiers non trouve.' });
    res.json({ message: 'Tiers supprime.' });
  } catch (err) {
    logger.error(err.message || err);
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

module.exports = router;
