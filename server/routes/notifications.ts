import express, { Request, Response } from 'express';
import logger from '../logger';
import * as notificationsService from '../services/notifications.service';

const router = express.Router();

function getErrorMessage(err: { message?: string } | null): string {
  if (err && typeof err === 'object' && 'message' in err) return err.message || 'Erreur inconnue';
  return String(err);
}

// Lister les notifications d'un utilisateur
router.get('/:userId', async (req: Request, res: Response) => {
  const schema = req.tenantSchema;
  try {
    const rows = await notificationsService.listNotifications(schema, req.params.userId);
    res.json(rows);
  } catch (err) {
    logger.error(getErrorMessage(err as { message?: string }));
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

// Nombre de non lues
router.get('/:userId/unread-count', async (req: Request, res: Response) => {
  const schema = req.tenantSchema;
  try {
    const count = await notificationsService.getUnreadCount(schema, req.params.userId);
    res.json({ count });
  } catch (err) {
    logger.error(getErrorMessage(err as { message?: string }));
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

// Creer une notification
router.post('/', async (req: Request, res: Response) => {
  const schema = req.tenantSchema;
  const { user_id, type, title, message } = req.body;
  if (!user_id || !title || !message) {
    return res.status(400).json({ error: 'user_id, title et message requis.' });
  }
  try {
    const notification = await notificationsService.createNotification(schema, { user_id, type, title, message });
    res.status(201).json(notification);
  } catch (err) {
    logger.error(getErrorMessage(err as { message?: string }));
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

// Marquer une notification comme lue
router.put('/:id/read', async (req: Request, res: Response) => {
  const schema = req.tenantSchema;
  try {
    await notificationsService.markAsRead(schema, req.params.id);
    res.json({ message: 'Notification lue.' });
  } catch (err) {
    logger.error(getErrorMessage(err as { message?: string }));
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

// Tout marquer comme lu
router.put('/read-all/:userId', async (req: Request, res: Response) => {
  const schema = req.tenantSchema;
  try {
    await notificationsService.markAllAsRead(schema, req.params.userId);
    res.json({ message: 'Toutes les notifications marquees comme lues.' });
  } catch (err) {
    logger.error(getErrorMessage(err as { message?: string }));
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

// Supprimer une notification
router.delete('/:id', async (req: Request, res: Response) => {
  const schema = req.tenantSchema;
  try {
    await notificationsService.deleteNotification(schema, req.params.id);
    res.json({ message: 'Notification supprimee.' });
  } catch (err) {
    logger.error(getErrorMessage(err as { message?: string }));
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

export default router;
