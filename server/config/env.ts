/**
 * Validation des variables d'environnement au boot.
 *
 * Source unique : tout le code serveur lit `env` au lieu de `process.env`.
 * Si une variable obligatoire manque ou est invalide, le serveur crash
 * immediatement au boot avec un message clair.
 *
 * Pour ajouter une variable : la declarer dans EnvSchema + .env.example.
 */

import { z } from 'zod';
import logger from '../logger';

const portSchema = z.coerce.number().int().min(1).max(65535);
const boolFromString = z
  .string()
  .optional()
  .transform((v) => v === 'true');
const csvList = z
  .string()
  .optional()
  .transform((v) => (v ? v.split(',').map((s) => s.trim()).filter(Boolean) : []));

const EnvSchema = z
  .object({
    // ---- Runtime
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
    PORT: portSchema.default(5002),
    LOG_LEVEL: z.enum(['error', 'warn', 'info', 'http', 'verbose', 'debug', 'silly']).default('info'),

    // ---- Database (DATABASE_URL OU DB_* ; au moins l'un des deux)
    DATABASE_URL: z.string().url().optional(),
    DB_HOST: z.string().optional(),
    DB_PORT: portSchema.optional(),
    DB_NAME: z.string().optional(),
    DB_USER: z.string().optional(),
    DB_PASSWORD: z.string().optional(),
    DB_POOL_MAX: z.coerce.number().int().min(1).max(500).default(50),
    DB_SSL: boolFromString,
    DB_SSL_REJECT_UNAUTHORIZED: z
      .string()
      .optional()
      .transform((v) => v !== 'false'),

    // ---- CORS
    ALLOWED_ORIGINS: csvList,

    // ---- Auth (Keycloak)
    KEYCLOAK_URL: z.string().url(),
    KEYCLOAK_REALM: z.string().min(1),
    KEYCLOAK_CLIENT_ID: z.string().min(1),

    // ---- Crypto
    ENCRYPTION_KEY: z
      .string()
      .min(32, 'ENCRYPTION_KEY doit faire au moins 32 caracteres'),

    // ---- IA (optionnel : si absent, les routes IA repondent 503)
    ANTHROPIC_API_KEY: z.string().startsWith('sk-ant-').optional(),

    // ---- Qdrant (optionnel)
    QDRANT_URL: z.string().url().optional(),
    QDRANT_TIMEOUT_MS: z.coerce.number().int().positive().optional(),

    // ---- Boot flags
    AUTO_MIGRATE_TENANTS: boolFromString,
  })
  .refine(
    (v) => v.DATABASE_URL || (v.DB_HOST && v.DB_NAME && v.DB_USER),
    { message: 'Definir DATABASE_URL OU les triplets DB_HOST + DB_NAME + DB_USER' },
  );

export type Env = z.infer<typeof EnvSchema>;

function loadEnv(): Env {
  const result = EnvSchema.safeParse(process.env);
  if (!result.success) {
    const issues = result.error.issues
      .map((i) => `  - ${i.path.join('.') || '(global)'}: ${i.message}`)
      .join('\n');
    logger.error('Variables d environnement invalides au boot :\n' + issues);
    throw new Error('Configuration env invalide. Verifier .env (cf .env.example).');
  }
  return result.data;
}

// Lazy load : evite de crasher au simple import du module (ex: depuis un test
// qui n'a pas encore configure son process.env). Le premier acces declenche la
// validation. Pour forcer la validation au boot, appeler `validateEnvAtBoot()`.
let cached: Env | null = null;

function getEnv(): Env {
  if (cached === null) cached = loadEnv();
  return cached;
}

export const env: Env = new Proxy({} as Env, {
  get(_target, prop: string) {
    return getEnv()[prop as keyof Env];
  },
}) as Env;

export function validateEnvAtBoot(): void {
  cached = loadEnv();
}

/**
 * Pour les tests : re-evalue le schema avec le process.env courant.
 * Reset le cache pour que le prochain acces a `env` retourne la nouvelle valeur.
 */
export function reloadEnvForTests(): Env {
  cached = loadEnv();
  return cached;
}
