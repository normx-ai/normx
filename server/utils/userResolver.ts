import pool from '../db';
import { cache } from './cache';
import { getValidatedSchemaName } from './tenant.utils';
import { NotFoundError } from '../errors';

export class UserNotProvisionedError extends NotFoundError {
  readonly code = 'USER_NOT_PROVISIONED';
  constructor(keycloakSub: string, schema: string) {
    super(`Utilisateur ${keycloakSub} dans le tenant ${schema}`);
  }
}

const TTL_MS = 5 * 60 * 1000;

function cacheKey(schema: string, keycloakSub: string): string {
  return `userResolver:${schema}:${keycloakSub}`;
}

export async function resolveLocalUserId(schema: string, keycloakSub: string): Promise<string> {
  const validSchema = getValidatedSchemaName(schema);
  const key = cacheKey(validSchema, keycloakSub);

  const cached = cache.get<string>(key);
  if (cached) return cached;

  const result = await pool.query(
    `SELECT id FROM "${validSchema}".utilisateurs WHERE keycloak_id = $1`,
    [keycloakSub]
  );
  if (result.rowCount === 0) {
    throw new UserNotProvisionedError(keycloakSub, validSchema);
  }

  const id = String(result.rows[0].id);
  cache.set(key, id, TTL_MS);
  return id;
}

export function invalidateUserResolverCache(schema: string, keycloakSub: string): void {
  cache.delete(cacheKey(getValidatedSchemaName(schema), keycloakSub));
}
