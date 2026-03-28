/**
 * Service Tiers - NormX Multi-Tenant
 * Gestion des tiers (clients, fournisseurs, etc.) avec schema tenant
 */

import pool from '../db';
import logger from '../logger';
import { getValidatedSchemaName } from '../utils/tenant.utils';

// ============ INTERFACES ============

interface TiersFilters {
  type?: string;
  search?: string;
  actif?: string;
}

interface CreateTiersInput {
  type: string;
  code_tiers?: string;
  nom: string;
  compte_comptable?: string;
  telephone?: string;
  email?: string;
  adresse?: string;
  data?: Record<string, string | number | boolean | null>;
}

interface UpdateTiersInput {
  type?: string;
  code_tiers?: string;
  nom: string;
  compte_comptable?: string;
  telephone?: string;
  email?: string;
  adresse?: string;
  data?: Record<string, string | number | boolean | null>;
  actif?: boolean;
}

// ============ CRUD ============

export async function listTiers(schema: string, filters: TiersFilters) {
  const s = getValidatedSchemaName(schema);
  const { type, search, actif } = filters;

  let query = `SELECT * FROM "${s}".tiers WHERE 1=1`;
  const params: (string | boolean)[] = [];
  let idx = 1;

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
  return result.rows;
}

export async function getTiersById(schema: string, id: number) {
  const s = getValidatedSchemaName(schema);
  const result = await pool.query(`SELECT * FROM "${s}".tiers WHERE id = $1`, [id]);
  return result.rows.length > 0 ? result.rows[0] : null;
}

export async function createTiers(schema: string, input: CreateTiersInput) {
  const s = getValidatedSchemaName(schema);
  const result = await pool.query(
    `INSERT INTO "${s}".tiers (type, code_tiers, nom, compte_comptable, telephone, email, adresse, data)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
    [
      input.type,
      input.code_tiers || null,
      input.nom,
      input.compte_comptable || null,
      input.telephone || null,
      input.email || null,
      input.adresse || null,
      input.data || {},
    ],
  );
  return result.rows[0];
}

export async function updateTiers(schema: string, id: number, input: UpdateTiersInput) {
  const s = getValidatedSchemaName(schema);
  const result = await pool.query(
    `UPDATE "${s}".tiers SET type = $1, code_tiers = $2, nom = $3, compte_comptable = $4, telephone = $5, email = $6, adresse = $7, data = $8, actif = $9, updated_at = NOW()
     WHERE id = $10 RETURNING *`,
    [
      input.type,
      input.code_tiers || null,
      input.nom,
      input.compte_comptable || null,
      input.telephone || null,
      input.email || null,
      input.adresse || null,
      input.data || {},
      input.actif !== false,
      id,
    ],
  );
  return result.rows.length > 0 ? result.rows[0] : null;
}

export async function deleteTiers(schema: string, id: number) {
  const s = getValidatedSchemaName(schema);
  const result = await pool.query(`DELETE FROM "${s}".tiers WHERE id = $1 RETURNING *`, [id]);
  return result.rows.length > 0;
}
