/**
 * Service Notifications - NormX Multi-Tenant
 * Colonnes table : utilisateur_id, titre, message, type, lu, created_at
 */

import pool from '../db';
import { getValidatedSchemaName } from '../utils/tenant.utils';

interface CreateNotificationInput {
  user_id: string;
  type?: string;
  title: string;
  message: string;
}

export async function listNotifications(schema: string, userId: string) {
  const s = getValidatedSchemaName(schema);
  const result = await pool.query(
    `SELECT id, utilisateur_id AS "userId", titre AS title, message, type, lu AS read, created_at AS "createdAt"
     FROM "${s}".notifications WHERE utilisateur_id::text = $1 ORDER BY created_at DESC LIMIT 50`,
    [userId],
  );
  return result.rows;
}

export async function getUnreadCount(schema: string, userId: string) {
  const s = getValidatedSchemaName(schema);
  const result = await pool.query(
    `SELECT COUNT(*) FROM "${s}".notifications WHERE utilisateur_id::text = $1 AND lu = false`,
    [userId],
  );
  return parseInt(result.rows[0].count, 10);
}

export async function createNotification(schema: string, input: CreateNotificationInput) {
  const s = getValidatedSchemaName(schema);
  const result = await pool.query(
    `INSERT INTO "${s}".notifications (utilisateur_id, type, titre, message) VALUES ($1, $2, $3, $4) RETURNING *`,
    [input.user_id, input.type || 'info', input.title, input.message],
  );
  return result.rows[0];
}

export async function markAsRead(schema: string, id: number) {
  const s = getValidatedSchemaName(schema);
  await pool.query(`UPDATE "${s}".notifications SET lu = true WHERE id = $1`, [id]);
}

export async function markAllAsRead(schema: string, userId: string) {
  const s = getValidatedSchemaName(schema);
  await pool.query(
    `UPDATE "${s}".notifications SET lu = true WHERE utilisateur_id::text = $1 AND lu = false`,
    [userId],
  );
}

export async function deleteNotification(schema: string, id: number) {
  const s = getValidatedSchemaName(schema);
  await pool.query(`DELETE FROM "${s}".notifications WHERE id = $1`, [id]);
}
