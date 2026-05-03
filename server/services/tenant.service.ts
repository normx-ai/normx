/**
 * Service Tenant - NormX
 * Gestion multi-tenant : creation de tenants, provisionnement de schemas
 */

import pool from '../db';
import logger from '../logger';
import { readFileSync } from 'fs';
import { join } from 'path';
import { slugToSchemaName, getValidatedSchemaName } from '../utils/tenant.utils';

// Cache des templates SQL (lecture I/O une seule fois au premier tenant cree)
let templateSqlCache: string | null = null;
let rlsSqlCache: string | null = null;

function getTemplateSql(): string {
  if (templateSqlCache === null) {
    templateSqlCache = readFileSync(join(__dirname, '..', 'migrations', '002-tenant-schema-template.sql'), 'utf-8');
  }
  return templateSqlCache;
}

function getRlsSql(): string {
  if (rlsSqlCache === null) {
    rlsSqlCache = readFileSync(join(__dirname, '..', 'migrations', '004-enable-rls.sql'), 'utf-8');
  }
  return rlsSqlCache;
}

// ============ INTERFACES ============

export interface TenantSettings {
  modules?: string[];
  offre?: string;
  sigle?: string;
  adresse?: string;
  nif?: string;
  telephone?: string;
  email?: string;
  [key: string]: string | number | boolean | string[] | null | undefined;
}

export interface Tenant {
  id: number;
  slug: string;
  nom: string;
  type: 'enterprise' | 'cabinet' | 'client';
  parent_id: number | null;
  schema_name: string;
  plan: string;
  actif: boolean;
  settings: TenantSettings | null;
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

export async function getTenantBySchema(schemaName: string): Promise<Tenant | null> {
  const validSchema = getValidatedSchemaName(schemaName);
  const result = await pool.query(
    'SELECT * FROM public.tenants WHERE schema_name = $1',
    [validSchema],
  );
  return result.rows[0] || null;
}

/**
 * Lit un flag booleen depuis tenants.settings JSONB.
 * Defaut : false. Strict : seul `true` literal active le flag.
 */
export async function getTenantSettingFlag(
  schemaName: string,
  key: string,
): Promise<boolean> {
  const validSchema = getValidatedSchemaName(schemaName);
  const result = await pool.query(
    `SELECT settings->>$2 AS value FROM public.tenants WHERE schema_name = $1`,
    [validSchema, key],
  );
  return result.rows[0]?.value === 'true';
}

// ============ SLUG HELPERS ============

/**
 * Slug pour un client cree via l'UI (bouton "Ajouter un client").
 * Forme : c_<cabinetId>_<timestamp>_<4hex>. Court (~25 chars), commence par
 * une lettre, quasi-unique meme en cas d'appel simultane grace au suffixe
 * aleatoire (collision Date.now() seule possible a la meme ms sur le meme
 * cabinet). Le lien parent reste trace via parent_id.
 */
export function generateClientSlug(cabinetId: number): string {
  const rand = Math.random().toString(36).slice(2, 6);
  return `c_${cabinetId}_${Date.now()}_${rand}`;
}

/**
 * Slug pour le self-client auto-cree a l'onboarding cabinet. Stable (un seul
 * par cabinet, verifie par getCabinetClients avant appel) et idempotent.
 */
export function generateSelfClientSlug(cabinetId: number): string {
  return `c_${cabinetId}_self`;
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

  // 2. Provisionner le schema (templates caches en memoire)
  try {
    const schemaSql = getTemplateSql().replace(/\$\{schema_name\}/g, schemaName);
    await pool.query(schemaSql);
    logger.info('Schema "%s" provisionne avec succes', schemaName);

    // Appliquer la migration RLS (OBLIGATOIRE — pas de tenant sans RLS)
    const rlsSchemaSql = getRlsSql().replace(/\$\{schema_name\}/g, schemaName);
    await pool.query(rlsSchemaSql);
    logger.info('RLS active sur le schema "%s"', schemaName);
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

// Whitelist explicite des colonnes updatables et de leur builder SQL.
// Ajouter une colonne ici (jamais inline dans updateTenant) pour qu'elle
// soit prise en compte. Verrou contre l'injection SQL via nom de colonne
// si du code futur tentait d'iterer Object.keys(data) sans filtrage.
type TenantUpdateValue = string | number | boolean | null;
type TenantUpdateBuilder = (placeholder: string, value: unknown) => {
  fragment: string;
  value: TenantUpdateValue;
};

const TENANT_UPDATE_COLUMNS: Record<string, TenantUpdateBuilder> = {
  nom: (p, v) => ({ fragment: `nom = ${p}`, value: String(v) }),
  type: (p, v) => ({ fragment: `type = ${p}`, value: String(v) }),
  settings: (p, v) => ({
    fragment: `settings = settings || ${p}::jsonb`,
    value: JSON.stringify(v),
  }),
};

export async function updateTenant(
  id: number,
  data: { nom?: string; type?: string; settings?: TenantSettings }
): Promise<void> {
  const updates: string[] = [];
  const values: TenantUpdateValue[] = [];
  let idx = 1;

  for (const [key, raw] of Object.entries(data)) {
    if (raw === undefined || raw === null) continue;
    const builder = TENANT_UPDATE_COLUMNS[key];
    if (!builder) {
      // Safety net : un dev ajouterait `data.foo` sans declarer la colonne ici.
      logger.warn('updateTenant: champ ignore (non whitelist) %s', key);
      continue;
    }
    const { fragment, value } = builder(`$${idx++}`, raw);
    updates.push(fragment);
    values.push(value);
  }

  if (updates.length === 0) return;

  updates.push(`updated_at = NOW()`);
  values.push(id);

  await pool.query(
    `UPDATE public.tenants SET ${updates.join(', ')} WHERE id = $${idx}`,
    values,
  );
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
