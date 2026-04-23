/**
 * Utilitaires pour la gestion des noms de schemas tenant
 * NormX Multi-Tenant
 *
 * Les schemas tenant DOIVENT matcher `tenant_[a-z0-9_]{1,55}`.
 * Toute autre forme est rejetee (dont les schemas reserves public,
 * information_schema, pg_catalog, pg_toast).
 */

const TENANT_SCHEMA_REGEX = /^tenant_[a-z0-9_]{1,55}$/;

function isValidTenantSchema(schema: string): boolean {
  return TENANT_SCHEMA_REGEX.test(schema);
}

export function sanitizeSchemaName(slug: string): string {
  const normalized = slug.toLowerCase().trim().replace(/[^a-z0-9_]/g, '_');
  if (!normalized) {
    throw new Error('Format de schema invalide: ' + slug);
  }
  if (normalized.length > 63) {
    throw new Error('Nom de schema trop long (>63): ' + slug);
  }
  return normalized;
}

export function getValidatedSchemaName(schema: string): string {
  const normalized = schema.toLowerCase().trim();
  if (!isValidTenantSchema(normalized)) {
    throw new Error('Nom de schema invalide: ' + schema);
  }
  return normalized;
}

export function slugToSchemaName(slug: string): string {
  const clean = sanitizeSchemaName(slug);
  const schema = 'tenant_' + clean;
  if (!isValidTenantSchema(schema)) {
    throw new Error('Nom de schema invalide: ' + schema);
  }
  return schema;
}

/**
 * Defense en profondeur : a appeler en entree des fonctions db/services
 * qui prennent un parametre `schema: string` destine a etre injecte dans
 * une raw query via template literal. Leve une exception si invalide.
 */
export function assertSafeSchemaName(schema: string): asserts schema is string {
  if (!schema || typeof schema !== 'string') {
    throw new Error('Nom de schema invalide (type): ' + String(schema));
  }
  if (!isValidTenantSchema(schema)) {
    throw new Error('Nom de schema non-safe pour injection SQL: ' + schema);
  }
}
