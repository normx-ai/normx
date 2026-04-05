import express, { Request, Response } from 'express';
import * as notificationsService from '../services/notifications.service';
import { asyncHandler } from '../middleware/asyncHandler';

const router = express.Router();

// Lister les notifications d'un utilisateur
router.get('/:userId', asyncHandler(async (req: Request, res: Response) => {
  const schema = req.tenantSchema;
  if (!schema) return res.status(400).json({ error: 'Contexte tenant manquant.' });
  const rows = await notificationsService.listNotifications(schema, req.params.userId);
  res.json(rows);
}));

// Nombre de non lues
router.get('/:userId/unread-count', asyncHandler(async (req: Request, res: Response) => {
  const schema = req.tenantSchema;
  if (!schema) return res.status(400).json({ error: 'Contexte tenant manquant.' });
  const count = await notificationsService.getUnreadCount(schema, req.params.userId);
  res.json({ count });
}));

// Creer une notification
router.post('/', asyncHandler(async (req: Request, res: Response) => {
  const schema = req.tenantSchema;
  if (!schema) return res.status(400).json({ error: 'Contexte tenant manquant.' });
  const { user_id, type, title, message } = req.body;
  if (!user_id || !title || !message) {
    return res.status(400).json({ error: 'user_id, title et message requis.' });
  }
  const notification = await notificationsService.createNotification(schema, { user_id, type, title, message });
  res.status(201).json(notification);
}));

// Marquer une notification comme lue
router.put('/:id/read', asyncHandler(async (req: Request, res: Response) => {
  const schema = req.tenantSchema;
  if (!schema) return res.status(400).json({ error: 'Contexte tenant manquant.' });
  await notificationsService.markAsRead(schema, parseInt(req.params.id, 10));
  res.json({ message: 'Notification lue.' });
}));

// Tout marquer comme lu
router.put('/read-all/:userId', asyncHandler(async (req: Request, res: Response) => {
  const schema = req.tenantSchema;
  if (!schema) return res.status(400).json({ error: 'Contexte tenant manquant.' });
  await notificationsService.markAllAsRead(schema, req.params.userId);
  res.json({ message: 'Toutes les notifications marquees comme lues.' });
}));

// Supprimer une notification
router.delete('/:id', asyncHandler(async (req: Request, res: Response) => {
  const schema = req.tenantSchema;
  if (!schema) return res.status(400).json({ error: 'Contexte tenant manquant.' });
  await notificationsService.deleteNotification(schema, parseInt(req.params.id, 10));
  res.json({ message: 'Notification supprimee.' });
}));

export default router;
