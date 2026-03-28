/**
 * Service Entites - NormX Multi-Tenant
 * Gestion des entites dans le schema tenant
 */

import pool from '../db';
import logger from '../logger';
import { getValidatedSchemaName } from '../utils/tenant.utils';

// ============ CRUD ============

export async function getEntiteById(schema: string, id: number) {
  const s = getValidatedSchemaName(schema);
  const result = await pool.query(`SELECT * FROM "${s}".entites WHERE id = $1`, [id]);
  return result.rows.length > 0 ? result.rows[0] : null;
}
