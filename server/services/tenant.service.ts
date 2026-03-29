/**
 * Service Tenant - NormX
 * Gestion multi-tenant : creation de tenants, provisionnement de schemas
 */

import pool from '../db';
import logger from '../logger';
import { readFileSync } from 'fs';
import { join } from 'path';
import { slugToSchemaName, getValidatedSchemaName } from '../utils/tenant.utils';

// ============ INTERFACES ============

export interface Tenant {
  id: number;
  slug: string;
  nom: string;
  type: 'enterprise' | 'cabinet' | 'client';
  parent_id: number | null;
  schema_name: string;
  plan: string;
  actif: boolean;
  settings: Record<string, string | number | boolean | null>;
  created_at: string;
}

export interface CreateTenantInput {
  slug: string;
  nom: string;
  type: 'enterprise' | 'cabinet' | 'client';
  parent_id?: number;
  plan?: string;
}

// ============ LECTURE ============

export async function getTenantBySlug(slug: string): Promise<Tenant | null> {
  const result = await pool.query(
    'SELECT * FROM public.tenants WHERE slug = $1',
    [slug]
  );
  return result.rows[0] || null;
}

export async function getTenantById(id: number): Promise<Tenant | null> {
  const result = await pool.query(
    'SELECT * FROM public.tenants WHERE id = $1',
    [id]
  );
  return result.rows[0] || null;
}

export async function getCabinetClients(cabinetId: number): Promise<Tenant[]> {
  const result = await pool.query(
    "SELECT * FROM public.tenants WHERE parent_id = $1 AND type = 'client' ORDER BY nom ASC",
    [cabinetId]
  );
  return result.rows;
}

// ============ CREATION ============

export async function createTenant(input: CreateTenantInput): Promise<Tenant> {
  const { slug, nom, type, parent_id, plan } = input;
  const schemaName = slugToSchemaName(slug);

  logger.info('Creation du tenant "%s" (schema: %s)', slug, schemaName);

  // 1. INSERT dans public.tenants
  const insertResult = await pool.query(
    `INSERT INTO public.tenants (slug, nom, type, parent_id, schema_name, plan)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [slug, nom, type, parent_id || null, schemaName, plan || 'standard']
  );
  const tenant: Tenant = insertResult.rows[0];

  // 2. Lire le template SQL et provisionner le schema
  try {
    const templatePath = join(__dirname, '..', 'migrations', '002-tenant-schema-template.sql');
    const templateSql = readFileSync(templatePath, 'utf-8');
    const schemaSql = templateSql.replace(/\$\{schema_name\}/g, schemaName);

    await pool.query(schemaSql);
    logger.info('Schema "%s" provisionne avec succes', schemaName);
  } catch (err) {
    // Rollback: supprimer le tenant si le schema echoue
    await pool.query('DELETE FROM public.tenants WHERE id = $1', [tenant.id]);
    const message = err instanceof Error ? err.message : String(err);
    logger.error('Echec provisionnement schema "%s": %s', schemaName, message);
    throw new Error('Echec de creation du schema tenant: ' + message);
  }

  return tenant;
}

// ============ MISE A JOUR ============

export async function updateTenant(
  id: number,
  data: { nom?: string; type?: string; settings?: Record<string, unknown> }
): Promise<void> {
  const updates: string[] = [];
  const values: unknown[] = [];
  let idx = 1;

  if (data.nom) {
    updates.push(`nom = $${idx++}`);
    values.push(data.nom);
  }
  if (data.type) {
    updates.push(`type = $${idx++}`);
    values.push(data.type);
  }
  if (data.settings) {
    updates.push(`settings = settings || $${idx++}::jsonb`);
    values.push(JSON.stringify(data.settings));
  }

  if (updates.length === 0) return;

  updates.push(`updated_at = NOW()`);
  values.push(id);

  await pool.query(
    `UPDATE public.tenants SET ${updates.join(', ')} WHERE id = $${idx}`,
    values
  );
}

// ============ CONTEXTE ============

export async function setTenantContext(schemaName: string): Promise<void> {
  const validated = getValidatedSchemaName(schemaName);
  await pool.query(`SET search_path TO "${validated}", public`);
}

// ============ SUPPRESSION ============

export async function deleteTenant(id: number): Promise<boolean> {
  const result = await pool.query(
    'UPDATE public.tenants SET actif = false, updated_at = NOW() WHERE id = $1 RETURNING id',
    [id]
  );
  if (result.rows.length > 0) {
    logger.info('Tenant %s desactive (soft delete)', String(id));
    return true;
  }
  return false;
}
