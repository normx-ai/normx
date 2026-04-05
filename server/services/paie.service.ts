/**
 * Service Paie - NormX
 * Couche service typée pour la gestion paie (config, etablissements, salaries)
 * Multi-tenant : isolation par schema PostgreSQL
 */

import pool from '../db';
import { getValidatedSchemaName } from '../utils/tenant.utils';

// ============ INTERFACES ============

export interface PaieConfig {
  id?: number;
  devise: string;
  mois: number | null;
  annee: number | null;
  step: string | null;
  mode: string | null;
  updated_at: string;
}

export interface UpsertConfigInput {
  devise?: string;
  mois?: number;
  annee?: number;
  step?: string;
  mode?: string;
}

export interface Etablissement {
  id: string;
  raison_sociale: string;
  nui: string | null;
  data: Record<string, string | number | boolean | null>;
  created_at: string;
}

export interface CreateEtablissementInput {
  raison_sociale: string;
  nui?: string;
  data?: Record<string, string | number | boolean | null>;
}

export interface UpdateEtablissementInput {
  raison_sociale?: string;
  nui?: string;
  data?: Record<string, string | number | boolean | null>;
}

export interface Salarie {
  id: string;
  etablissement_id: string | null;
  data: Record<string, string | number | boolean | null>;
  created_at: string;
}

export interface CreateSalarieInput {
  etablissement_id?: string;
  data?: Record<string, string | number | boolean | null>;
}

export interface UpdateSalarieInput {
  etablissement_id?: string;
  data?: Record<string, string | number | boolean | null>;
}

// ============ CONFIG PAIE ============

export async function getConfig(schema: string): Promise<PaieConfig | null> {
  const s = getValidatedSchemaName(schema);
  const result = await pool.query(`SELECT * FROM "${s}".paie_config LIMIT 1`);
  return result.rows[0] || null;
}

export async function upsertConfig(schema: string, input: UpsertConfigInput): Promise<PaieConfig> {
  const s = getValidatedSchemaName(schema);
  const { devise, mois, annee, step, mode } = input;
  const result = await pool.query(
    `INSERT INTO "${s}".paie_config (devise, mois, annee, step, mode, updated_at)
     VALUES ($1, $2, $3, $4, $5, NOW())
     ON CONFLICT (id) DO UPDATE SET
       devise = COALESCE($1, paie_config.devise),
       mois = COALESCE($2, paie_config.mois),
       annee = COALESCE($3, paie_config.annee),
       step = COALESCE($4, paie_config.step),
       mode = COALESCE($5, paie_config.mode),
       updated_at = NOW()
     RETURNING *`,
    [devise || 'XAF', mois, annee, step, mode],
  );
  return result.rows[0];
}

// ============ ETABLISSEMENTS ============

export async function getEtablissements(schema: string): Promise<Etablissement[]> {
  const s = getValidatedSchemaName(schema);
  const result = await pool.query(
    `SELECT * FROM "${s}".etablissements ORDER BY created_at ASC`,
  );
  return result.rows;
}

export async function createEtablissement(schema: string, input: CreateEtablissementInput): Promise<Etablissement> {
  const s = getValidatedSchemaName(schema);
  const { raison_sociale, nui, data } = input;
  const result = await pool.query(
    `INSERT INTO "${s}".etablissements (raison_sociale, nui, data)
     VALUES ($1, $2, $3) RETURNING *`,
    [raison_sociale, nui || null, JSON.stringify(data || {})],
  );
  return result.rows[0];
}

export async function updateEtablissement(schema: string, id: string, input: UpdateEtablissementInput): Promise<Etablissement | null> {
  const s = getValidatedSchemaName(schema);
  const { raison_sociale, nui, data } = input;
  const result = await pool.query(
    `UPDATE "${s}".etablissements SET
      raison_sociale = COALESCE($1, raison_sociale),
      nui = COALESCE($2, nui),
      data = COALESCE($3, data)
    WHERE id = $4 RETURNING *`,
    [raison_sociale, nui, data ? JSON.stringify(data) : null, id],
  );
  return result.rows[0] || null;
}

export async function deleteEtablissement(schema: string, id: string): Promise<boolean> {
  const s = getValidatedSchemaName(schema);
  const result = await pool.query(
    `DELETE FROM "${s}".etablissements WHERE id = $1 RETURNING id`,
    [id],
  );
  return result.rows.length > 0;
}

// ============ SALARIES ============

export async function getSalaries(schema: string, pagination?: { limit: number; offset: number }): Promise<{ rows: Salarie[]; total: number }> {
  const s = getValidatedSchemaName(schema);

  const countResult = await pool.query(`SELECT COUNT(*) AS total FROM "${s}".salaries`);
  const total = parseInt(countResult.rows[0].total, 10);

  let query = `SELECT * FROM "${s}".salaries ORDER BY created_at ASC`;
  const params: number[] = [];

  if (pagination) {
    query += ` LIMIT $1 OFFSET $2`;
    params.push(pagination.limit, pagination.offset);
  }

  const result = await pool.query(query, params);
  return { rows: result.rows, total };
}

export async function createSalarie(schema: string, input: CreateSalarieInput): Promise<Salarie> {
  const s = getValidatedSchemaName(schema);
  const { etablissement_id, data } = input;
  const result = await pool.query(
    `INSERT INTO "${s}".salaries (etablissement_id, data)
     VALUES ($1, $2) RETURNING *`,
    [etablissement_id || null, JSON.stringify(data || {})],
  );
  return result.rows[0];
}

export async function updateSalarie(schema: string, id: string, input: UpdateSalarieInput): Promise<Salarie | null> {
  const s = getValidatedSchemaName(schema);
  const { etablissement_id, data } = input;
  const result = await pool.query(
    `UPDATE "${s}".salaries SET
      etablissement_id = COALESCE($1, etablissement_id),
      data = COALESCE($2, data)
    WHERE id = $3 RETURNING *`,
    [etablissement_id, data ? JSON.stringify(data) : null, id],
  );
  return result.rows[0] || null;
}

export async function deleteSalarie(schema: string, id: string): Promise<boolean> {
  const s = getValidatedSchemaName(schema);
  const result = await pool.query(
    `DELETE FROM "${s}".salaries WHERE id = $1 RETURNING id`,
    [id],
  );
  return result.rows.length > 0;
}
