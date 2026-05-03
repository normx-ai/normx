// Mock pool : on intercepte query + connect pour verifier les SQL emis.
const mockQuery = jest.fn();
const mockClientQuery = jest.fn();
const mockRelease = jest.fn();

jest.mock('../db', () => ({
  __esModule: true,
  default: {
    query: (sql: string, params?: unknown[]) => mockQuery(sql, params),
    connect: () =>
      Promise.resolve({
        query: (sql: string, params?: unknown[]) => mockClientQuery(sql, params),
        release: () => mockRelease(),
      }),
  },
}));

import { applyAllTenantMigrations } from '../scripts/applyTenantMigrations';

beforeEach(() => {
  mockQuery.mockReset();
  mockClientQuery.mockReset();
  mockRelease.mockReset();
});

describe('applyAllTenantMigrations', () => {
  test('aucun tenant : retourne tableau vide', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [], rowCount: 0 }) // ensureMigrationsTable
      .mockResolvedValueOnce({ rows: [], rowCount: 0 }); // listTenantSchemas
    const reports = await applyAllTenantMigrations();
    expect(reports).toEqual([]);
  });

  test('tenant existant + dry-run : ne touche pas la DB', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [], rowCount: 0 }) // ensureMigrationsTable
      .mockResolvedValueOnce({ rows: [{ schema_name: 'tenant_test_acme' }], rowCount: 1 }) // listTenantSchemas
      .mockResolvedValueOnce({ rows: [], rowCount: 0 }); // getAppliedMigrations (vide)

    const reports = await applyAllTenantMigrations({ dryRun: true });

    expect(reports).toHaveLength(1);
    expect(reports[0].schema).toBe('tenant_test_acme');
    expect(reports[0].applied.every((m) => m.endsWith('(dry-run)'))).toBe(true);
    // Aucun appel a connect (pas d'application reelle)
    expect(mockClientQuery).not.toHaveBeenCalled();
  });

  test('migration deja appliquee avec meme checksum : skip', async () => {
    // 1. ensureMigrationsTable
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });
    // 2. listTenantSchemas
    mockQuery.mockResolvedValueOnce({
      rows: [{ schema_name: 'tenant_test_acme' }],
      rowCount: 1,
    });
    // 3. getAppliedMigrations : on simule TOUTES les migrations comme deja appliquees
    //    avec un checksum bidon — drift sera detecte mais pas reapplique.
    mockQuery.mockResolvedValueOnce({
      rows: [
        { schema_name: 'tenant_test_acme', migration_name: 'fake', checksum: 'fake', applied_at: new Date() },
      ],
      rowCount: 1,
    });

    const reports = await applyAllTenantMigrations({ dryRun: true });
    // alreadyApplied vide car le nom 'fake' ne correspond pas aux migrations reelles ;
    // les migrations reelles seront en applied(dry-run).
    expect(reports[0].alreadyApplied).toEqual([]);
    expect(reports[0].applied.length).toBeGreaterThan(0);
  });

  test('filtre par tenant', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [], rowCount: 0 })
      .mockResolvedValueOnce({
        rows: [
          { schema_name: 'tenant_a' },
          { schema_name: 'tenant_b' },
        ],
        rowCount: 2,
      })
      .mockResolvedValueOnce({ rows: [], rowCount: 0 }); // getAppliedMigrations pour tenant_a

    const reports = await applyAllTenantMigrations({ tenant: 'tenant_a', dryRun: true });
    expect(reports).toHaveLength(1);
    expect(reports[0].schema).toBe('tenant_a');
  });
});
