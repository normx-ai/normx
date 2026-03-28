/**
 * Service Notifications - NormX Multi-Tenant
 * Gestion des notifications avec schema tenant
 */

import pool from '../db';
import logger from '../logger';
import { getValidatedSchemaName } from '../utils/tenant.utils';

// ============ INTERFACES ============

interface CreateNotificationInput {
  user_id: number;
  type?: string;
  title: string;
  message: string;
}

// ============ CRUD ============

export async function listNotifications(schema: string, userId: number) {
  const s = getValidatedSchemaName(schema);
  const result = await pool.query(
    `SELECT * FROM "${s}".notifications WHERE user_id = $1 ORDER BY created_at DESC LIMIT 50`,
    [userId],
  );
  return result.rows;
}

export async function getUnreadCount(schema: string, userId: number) {
  const s = getValidatedSchemaName(schema);
  const result = await pool.query(
    `SELECT COUNT(*) FROM "${s}".notifications WHERE user_id = $1 AND read = false`,
    [userId],
  );
  return parseInt(result.rows[0].count, 10);
}

export async function createNotification(schema: string, input: CreateNotificationInput) {
  const s = getValidatedSchemaName(schema);
  const result = await pool.query(
    `INSERT INTO "${s}".notifications (user_id, type, title, message) VALUES ($1, $2, $3, $4) RETURNING *`,
    [input.user_id, input.type || 'info', input.title, input.message],
  );
  return result.rows[0];
}

export async function markAsRead(schema: string, id: number) {
  const s = getValidatedSchemaName(schema);
  await pool.query(`UPDATE "${s}".notifications SET read = true WHERE id = $1`, [id]);
}

export async function markAllAsRead(schema: string, userId: number) {
  const s = getValidatedSchemaName(schema);
  await pool.query(
    `UPDATE "${s}".notifications SET read = true WHERE user_id = $1 AND read = false`,
    [userId],
  );
}

export async function deleteNotification(schema: string, id: number) {
  const s = getValidatedSchemaName(schema);
  await pool.query(`DELETE FROM "${s}".notifications WHERE id = $1`, [id]);
}
