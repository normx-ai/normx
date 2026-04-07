/**
 * Wrapper transaction PostgreSQL
 * Gere automatiquement BEGIN/COMMIT/ROLLBACK/release
 */

import { PoolClient } from 'pg';
import pool from '../db';

export async function withTransaction<T>(
  callback: (client: PoolClient) => Promise<T>,
): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    try { client.release(); } catch { /* ignore */ }
  }
}
