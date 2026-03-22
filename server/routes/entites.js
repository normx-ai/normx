const express = require('express');
const pool = require('../db');
const logger = require('../logger');
const router = express.Router();

// GET entite complete (avec data JSONB)
router.get('/:id', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM entites WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Entite non trouvee.' });
    res.json(result.rows[0]);
  } catch (err) {
    logger.error(err.message || err);
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

module.exports = router;
