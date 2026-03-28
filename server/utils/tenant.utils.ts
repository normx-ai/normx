/**
 * Utilitaires pour la gestion des noms de schemas tenant
 * NormX Multi-Tenant
 */

const SCHEMA_PATTERN = /^[a-z][a-z0-9_]{0,62}$/;

export function sanitizeSchemaName(slug: string): string {
  const normalized = slug.toLowerCase().trim().replace(/[^a-z0-9_]/g, '_');
  if (!SCHEMA_PATTERN.test(normalized)) {
    throw new Error('Format de schema invalide: ' + slug);
  }
  return normalized;
}

export function getValidatedSchemaName(slug: string): string {
  const normalized = slug.toLowerCase().trim();
  if (!SCHEMA_PATTERN.test(normalized)) {
    throw new Error('Nom de schema invalide: ' + slug);
  }
  return normalized;
}

export function slugToSchemaName(slug: string): string {
  return 'tenant_' + sanitizeSchemaName(slug);
}
