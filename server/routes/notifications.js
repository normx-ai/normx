const express = require('express');
const pool = require('../db');
const logger = require('../logger');

const router = express.Router();

// Lister les notifications d'un utilisateur
router.get('/:userId', async (req, res) => {
  const { userId } = req.params;
  try {
    const result = await pool.query(
      'SELECT * FROM notifications WHERE user_id = $1 ORDER BY created_at DESC LIMIT 50',
      [userId]
    );
    res.json(result.rows);
  } catch (err) {
    logger.error(err.message || err);
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

// Nombre de non lues
router.get('/:userId/unread-count', async (req, res) => {
  const { userId } = req.params;
  try {
    const result = await pool.query(
      'SELECT COUNT(*) FROM notifications WHERE user_id = $1 AND read = false',
      [userId]
    );
    res.json({ count: parseInt(result.rows[0].count, 10) });
  } catch (err) {
    logger.error(err.message || err);
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

// Créer une notification
router.post('/', async (req, res) => {
  const { user_id, entite_id, type, title, message } = req.body;
  if (!user_id || !title || !message) {
    return res.status(400).json({ error: 'user_id, title et message requis.' });
  }
  try {
    const result = await pool.query(
      'INSERT INTO notifications (user_id, entite_id, type, title, message) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [user_id, entite_id || null, type || 'info', title, message]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    logger.error(err.message || err);
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

// Marquer une notification comme lue
router.put('/:id/read', async (req, res) => {
  try {
    await pool.query('UPDATE notifications SET read = true WHERE id = $1', [req.params.id]);
    res.json({ message: 'Notification lue.' });
  } catch (err) {
    logger.error(err.message || err);
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

// Tout marquer comme lu
router.put('/read-all/:userId', async (req, res) => {
  try {
    await pool.query('UPDATE notifications SET read = true WHERE user_id = $1 AND read = false', [req.params.userId]);
    res.json({ message: 'Toutes les notifications marquées comme lues.' });
  } catch (err) {
    logger.error(err.message || err);
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

// Supprimer une notification
router.delete('/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM notifications WHERE id = $1', [req.params.id]);
    res.json({ message: 'Notification supprimée.' });
  } catch (err) {
    logger.error(err.message || err);
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

module.exports = router;
