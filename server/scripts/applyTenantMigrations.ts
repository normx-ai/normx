/**
 * Runner de migrations versionnees par tenant.
 *
 * Applique idempotemment toutes les migrations server/migrations/0XX-*.sql
 * (sauf 001 / 002 / 004 et les *.down.sql) a chaque schema tenant existant.
 * Trace les migrations appliquees dans public.tenant_migrations pour ne jamais
 * rejouer une migration deja exécutée et detecter les drifts via checksum SHA256.
 *
 * Usage CLI :
 *   npm run migrate:tenants            # applique sur tous les tenants
 *   npm run migrate:tenants -- --tenant tenant_acme   # un seul
 *   npm run migrate:tenants -- --dry-run              # liste sans appliquer
 *
 * Usage programmatique (au boot du serveur) :
 *   import { applyAllTenantMigrations } from './scripts/applyTenantMigrations';
 *   await applyAllTenantMigrations();
 */

import { createHash } from 'crypto';
import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import pool from '../db';
import logger from '../logger';
import { getValidatedSchemaName } from '../utils/tenant.utils';

const MIGRATIONS_DIR = join(__dirname, '..', 'migrations');

// Migrations EXCLUES du runner (gerees autrement) :
//   001 : table public.tenants (deja appliquee a la creation de la base)
//   002 : template tenant (applique par tenant.service.ts a la creation d'un tenant)
//   004 : RLS template (applique par tenant.service.ts a la creation d'un tenant)
const EXCLUDED_PREFIXES = new Set(['001', '002', '004']);

interface MigrationFile {
  name: string;
  prefix: string;
  fullPath: string;
  sql: string;
  checksum: string;
}

interface AppliedMigration {
  schema_name: string;
  migration_name: string;
  checksum: string;
  applied_at: Date;
}

function listMigrations(): MigrationFile[] {
  const files = readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith('.sql') && !f.endsWith('.down.sql'))
    .filter((f) => {
      const prefix = f.slice(0, 3);
      return /^\d{3}$/.test(prefix) && !EXCLUDED_PREFIXES.has(prefix);
    })
    .sort();

  return files.map((name) => {
    const fullPath = join(MIGRATIONS_DIR, name);
    const sql = readFileSync(fullPath, 'utf-8');
    const checksum = createHash('sha256').update(sql).digest('hex');
    return { name, prefix: name.slice(0, 3), fullPath, sql, checksum };
  });
}

async function ensureMigrationsTable(): Promise<void> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS public.tenant_migrations (
      id SERIAL PRIMARY KEY,
      schema_name VARCHAR(63) NOT NULL,
      migration_name VARCHAR(255) NOT NULL,
      checksum VARCHAR(64) NOT NULL,
      applied_at TIMESTAMP NOT NULL DEFAULT NOW(),
      UNIQUE (schema_name, migration_name)
    );
    CREATE INDEX IF NOT EXISTS idx_tenant_migrations_schema
      ON public.tenant_migrations(schema_name);
  `);
}

async function getAppliedMigrations(schemaName: string): Promise<Map<string, AppliedMigration>> {
  const r = await pool.query(
    `SELECT schema_name, migration_name, checksum, applied_at
     FROM public.tenant_migrations WHERE schema_name = $1`,
    [schemaName],
  );
  const map = new Map<string, AppliedMigration>();
  for (const row of r.rows as AppliedMigration[]) {
    map.set(row.migration_name, row);
  }
  return map;
}

async function listTenantSchemas(filter?: string): Promise<string[]> {
  const r = await pool.query(
    `SELECT schema_name FROM public.tenants WHERE actif = true ORDER BY schema_name`,
  );
  const all = r.rows.map((row: { schema_name: string }) => row.schema_name);
  return filter ? all.filter((s: string) => s === filter) : all;
}

/**
 * Applique le SQL d'une migration sur un schema dans une transaction unique.
 * - Style A : SQL sans qualif → on prefixe par SET search_path
 * - Style B : SQL avec ${schema_name} → on remplace par le nom de schema
 */
async function applyMigrationOnSchema(
  schemaName: string,
  migration: MigrationFile,
): Promise<void> {
  const safeSchema = getValidatedSchemaName(schemaName);
  const usesPlaceholder = migration.sql.includes('${schema_name}');

  const sqlBody = usesPlaceholder
    ? migration.sql.replace(/\$\{schema_name\}/g, safeSchema)
    : `SET search_path TO "${safeSchema}";\n${migration.sql}`;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(sqlBody);
    await client.query(
      `INSERT INTO public.tenant_migrations (schema_name, migration_name, checksum)
       VALUES ($1, $2, $3)
       ON CONFLICT (schema_name, migration_name) DO UPDATE SET
         checksum = EXCLUDED.checksum,
         applied_at = NOW()`,
      [safeSchema, migration.name, migration.checksum],
    );
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export interface MigrationReport {
  schema: string;
  applied: string[];
  alreadyApplied: string[];
  driftDetected: { name: string; oldChecksum: string; newChecksum: string }[];
  failed: { name: string; error: string }[];
}

export interface RunnerOptions {
  tenant?: string;
  dryRun?: boolean;
}

export async function applyAllTenantMigrations(opts: RunnerOptions = {}): Promise<MigrationReport[]> {
  await ensureMigrationsTable();
  const migrations = listMigrations();
  const tenants = await listTenantSchemas(opts.tenant);

  if (tenants.length === 0) {
    logger.info('Aucun tenant actif a migrer.');
    return [];
  }

  logger.info(
    'Migration runner : %d tenant(s), %d migration(s) candidate(s)%s',
    tenants.length,
    migrations.length,
    opts.dryRun ? ' (DRY RUN)' : '',
  );

  const reports: MigrationReport[] = [];

  for (const schema of tenants) {
    const report: MigrationReport = {
      schema,
      applied: [],
      alreadyApplied: [],
      driftDetected: [],
      failed: [],
    };

    const applied = await getAppliedMigrations(schema);

    for (const m of migrations) {
      const prev = applied.get(m.name);

      if (prev) {
        if (prev.checksum !== m.checksum) {
          report.driftDetected.push({
            name: m.name,
            oldChecksum: prev.checksum.slice(0, 8),
            newChecksum: m.checksum.slice(0, 8),
          });
        } else {
          report.alreadyApplied.push(m.name);
        }
        continue;
      }

      if (opts.dryRun) {
        report.applied.push(m.name + ' (dry-run)');
        continue;
      }

      try {
        await applyMigrationOnSchema(schema, m);
        report.applied.push(m.name);
        logger.info('  [%s] %s OK', schema, m.name);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        report.failed.push({ name: m.name, error: message });
        logger.error('  [%s] %s ECHEC : %s', schema, m.name, message);
        // On stoppe ce tenant pour preserver l'ordre des migrations,
        // mais on continue avec les autres tenants.
        break;
      }
    }

    reports.push(report);
  }

  printSummary(reports);
  return reports;
}

function printSummary(reports: MigrationReport[]): void {
  let totalApplied = 0;
  let totalDrift = 0;
  let totalFailed = 0;

  for (const r of reports) {
    totalApplied += r.applied.length;
    totalDrift += r.driftDetected.length;
    totalFailed += r.failed.length;
    if (r.driftDetected.length > 0) {
      logger.warn(
        '  [%s] DRIFT detecte sur : %s',
        r.schema,
        r.driftDetected.map((d) => `${d.name} (${d.oldChecksum} -> ${d.newChecksum})`).join(', '),
      );
    }
  }

  logger.info(
    'Resume migration : %d appliquees, %d drift(s), %d echec(s) sur %d tenant(s)',
    totalApplied,
    totalDrift,
    totalFailed,
    reports.length,
  );
}

// ============================================================================
// CLI ENTRYPOINT
// ============================================================================

function parseArgs(argv: string[]): RunnerOptions {
  const opts: RunnerOptions = {};
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--tenant' && argv[i + 1]) {
      opts.tenant = argv[i + 1];
      i++;
    } else if (argv[i] === '--dry-run') {
      opts.dryRun = true;
    }
  }
  return opts;
}

if (require.main === module) {
  const opts = parseArgs(process.argv.slice(2));
  applyAllTenantMigrations(opts)
    .then((reports) => {
      const failed = reports.some((r) => r.failed.length > 0);
      process.exit(failed ? 1 : 0);
    })
    .catch((err) => {
      logger.error('Migration runner fatal : %s', err instanceof Error ? err.message : String(err));
      process.exit(2);
    });
}
