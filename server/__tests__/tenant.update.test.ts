// Test du whitelist colonnes sur updateTenant
const mockQuery = jest.fn();
jest.mock('../db', () => ({
  __esModule: true,
  default: { query: (sql: string, params?: unknown[]) => mockQuery(sql, params) },
}));

import { updateTenant } from '../services/tenant.service';

beforeEach(() => mockQuery.mockReset());

describe('updateTenant whitelist', () => {
  test('met a jour les champs autorises', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 1 });
    await updateTenant(42, { nom: 'Acme', type: 'cabinet' });
    const [sql, params] = mockQuery.mock.calls[0];
    expect(sql).toMatch(/UPDATE public\.tenants SET/);
    expect(sql).toMatch(/nom = \$1/);
    expect(sql).toMatch(/type = \$2/);
    expect(sql).toMatch(/updated_at = NOW\(\)/);
    expect(sql).toMatch(/WHERE id = \$3/);
    expect(params).toEqual(['Acme', 'cabinet', 42]);
  });

  test('settings serialise en JSONB', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 1 });
    await updateTenant(1, { settings: { allow_external_llm: false } });
    const [sql, params] = mockQuery.mock.calls[0];
    expect(sql).toMatch(/settings = settings \|\| \$1::jsonb/);
    expect(params?.[0]).toBe(JSON.stringify({ allow_external_llm: false }));
  });

  test('aucun champ valide => no-op (pas de query)', async () => {
    await updateTenant(1, {});
    expect(mockQuery).not.toHaveBeenCalled();
  });

  test('champ non whitelist ignore (pas inject dans SQL)', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 1 });
    // Cast force pour simuler un dev qui passerait un champ non declare.
    await updateTenant(1, { nom: 'Acme', drop_table: 'tenants' } as unknown as { nom: string });
    const [sql, params] = mockQuery.mock.calls[0];
    expect(sql).not.toMatch(/drop_table/);
    expect(sql).toMatch(/nom = \$1/);
    expect(params).toEqual(['Acme', 1]);
  });
});
