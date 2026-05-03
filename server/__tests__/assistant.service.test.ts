// Mock pool avant import du service
const mockQuery = jest.fn();
jest.mock('../db', () => ({
  __esModule: true,
  default: { query: (sql: string, params?: unknown[]) => mockQuery(sql, params) },
}));

import {
  listConversations,
  getConversation,
  createConversation,
  deleteConversation,
  listMessages,
  listMemory,
  deleteMemory,
  assertCanReadConversation,
  assertCanWriteConversation,
  ForbiddenAccessError,
  NotFoundError,
} from '../services/assistant.service';

const SCHEMA = 'tenant_test_acme';
const USER_A = '11111111-1111-1111-1111-111111111111';
const USER_B = '22222222-2222-2222-2222-222222222222';

beforeEach(() => {
  mockQuery.mockReset();
});

describe('assertCanReadConversation', () => {
  test('shared : tout user autorise', () => {
    expect(() =>
      assertCanReadConversation({ visibility: 'shared', created_by_user_id: USER_A }, USER_B),
    ).not.toThrow();
  });

  test('private : createur autorise', () => {
    expect(() =>
      assertCanReadConversation({ visibility: 'private', created_by_user_id: USER_A }, USER_A),
    ).not.toThrow();
  });

  test('private : autre user refuse', () => {
    expect(() =>
      assertCanReadConversation({ visibility: 'private', created_by_user_id: USER_A }, USER_B),
    ).toThrow(ForbiddenAccessError);
  });

  test('private orpheline : refuse meme pour tout user', () => {
    expect(() =>
      assertCanReadConversation({ visibility: 'private', created_by_user_id: null }, USER_A),
    ).toThrow(ForbiddenAccessError);
  });
});

describe('assertCanWriteConversation', () => {
  test('shared : tout user autorise en ecriture', () => {
    expect(() =>
      assertCanWriteConversation({ visibility: 'shared', created_by_user_id: USER_A }, USER_B),
    ).not.toThrow();
  });

  test('private : seul le createur peut ecrire', () => {
    expect(() =>
      assertCanWriteConversation({ visibility: 'private', created_by_user_id: USER_A }, USER_B),
    ).toThrow(ForbiddenAccessError);
  });
});

describe('listConversations', () => {
  test('SQL filtre par createur OU shared', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });
    await listConversations(SCHEMA, USER_A);
    const [sql, params] = mockQuery.mock.calls[0];
    expect(sql).toMatch(/created_by_user_id = \$1/);
    expect(sql).toMatch(/visibility = 'shared'/);
    expect(params).toEqual([USER_A]);
  });
});

describe('getConversation', () => {
  test('shared : retourne la conv pour un autre user', async () => {
    mockQuery.mockResolvedValueOnce({
      rowCount: 1,
      rows: [{ id: 1, titre: 't', visibility: 'shared', created_by_user_id: USER_A, entite_id: null, created_at: '', updated_at: '' }],
    });
    const conv = await getConversation(SCHEMA, 1, USER_B);
    expect(conv.id).toBe(1);
  });

  test('private : autre user => ForbiddenAccessError', async () => {
    mockQuery.mockResolvedValueOnce({
      rowCount: 1,
      rows: [{ id: 1, titre: 't', visibility: 'private', created_by_user_id: USER_A, entite_id: null, created_at: '', updated_at: '' }],
    });
    await expect(getConversation(SCHEMA, 1, USER_B)).rejects.toBeInstanceOf(ForbiddenAccessError);
  });

  test('non trouvee => NotFoundError', async () => {
    mockQuery.mockResolvedValueOnce({ rowCount: 0, rows: [] });
    await expect(getConversation(SCHEMA, 999, USER_A)).rejects.toBeInstanceOf(NotFoundError);
  });
});

describe('createConversation', () => {
  test('insert avec defaut shared si visibility absente', async () => {
    mockQuery.mockResolvedValueOnce({
      rowCount: 1,
      rows: [{ id: 1, titre: 'Nouvelle conversation', visibility: 'shared', created_by_user_id: USER_A, entite_id: null, created_at: '', updated_at: '' }],
    });
    const conv = await createConversation(SCHEMA, USER_A);
    expect(conv.visibility).toBe('shared');
    const params = mockQuery.mock.calls[0][1];
    expect(params).toEqual([USER_A, 'Nouvelle conversation', 'shared', null]);
  });

  test('respecte visibility et entiteId si fournis', async () => {
    mockQuery.mockResolvedValueOnce({
      rowCount: 1,
      rows: [{ id: 2, titre: 'Audit', visibility: 'private', created_by_user_id: USER_A, entite_id: 10, created_at: '', updated_at: '' }],
    });
    await createConversation(SCHEMA, USER_A, { titre: 'Audit', visibility: 'private', entiteId: 10 });
    const params = mockQuery.mock.calls[0][1];
    expect(params).toEqual([USER_A, 'Audit', 'private', 10]);
  });
});

describe('deleteConversation', () => {
  test('createur : suppression OK', async () => {
    mockQuery
      .mockResolvedValueOnce({
        rowCount: 1,
        rows: [{ id: 1, titre: 't', visibility: 'shared', created_by_user_id: USER_A, entite_id: null, created_at: '', updated_at: '' }],
      })
      .mockResolvedValueOnce({ rowCount: 1, rows: [] });
    await expect(deleteConversation(SCHEMA, 1, USER_A)).resolves.toBeUndefined();
  });

  test('shared mais autre user (non createur) : refuse', async () => {
    mockQuery.mockResolvedValueOnce({
      rowCount: 1,
      rows: [{ id: 1, titre: 't', visibility: 'shared', created_by_user_id: USER_A, entite_id: null, created_at: '', updated_at: '' }],
    });
    await expect(deleteConversation(SCHEMA, 1, USER_B)).rejects.toBeInstanceOf(ForbiddenAccessError);
  });

  test('orpheline (created_by NULL) : suppression autorisee', async () => {
    mockQuery
      .mockResolvedValueOnce({
        rowCount: 1,
        rows: [{ id: 1, titre: 't', visibility: 'shared', created_by_user_id: null, entite_id: null, created_at: '', updated_at: '' }],
      })
      .mockResolvedValueOnce({ rowCount: 1, rows: [] });
    await expect(deleteConversation(SCHEMA, 1, USER_A)).resolves.toBeUndefined();
  });
});

describe('listMessages', () => {
  test('refuse si pas d acces a la conv parent', async () => {
    mockQuery.mockResolvedValueOnce({
      rowCount: 1,
      rows: [{ id: 1, titre: 't', visibility: 'private', created_by_user_id: USER_A, entite_id: null, created_at: '', updated_at: '' }],
    });
    await expect(listMessages(SCHEMA, 1, USER_B)).rejects.toBeInstanceOf(ForbiddenAccessError);
  });

  test('OK si shared', async () => {
    mockQuery
      .mockResolvedValueOnce({
        rowCount: 1,
        rows: [{ id: 1, titre: 't', visibility: 'shared', created_by_user_id: USER_A, entite_id: null, created_at: '', updated_at: '' }],
      })
      .mockResolvedValueOnce({ rowCount: 0, rows: [] });
    await expect(listMessages(SCHEMA, 1, USER_B)).resolves.toEqual([]);
  });
});

describe('listMemory', () => {
  test('SQL filtre par scope personal du user OU scope shared', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });
    await listMemory(SCHEMA, USER_A);
    const [sql, params] = mockQuery.mock.calls[0];
    expect(sql).toMatch(/scope = 'personal' AND user_id = \$1/);
    expect(sql).toMatch(/scope = 'shared'/);
    expect(params).toEqual([USER_A]);
  });
});

describe('deleteMemory', () => {
  test('personal own : OK', async () => {
    mockQuery
      .mockResolvedValueOnce({ rowCount: 1, rows: [{ id: 5, scope: 'personal', user_id: USER_A }] })
      .mockResolvedValueOnce({ rowCount: 1, rows: [] });
    await expect(deleteMemory(SCHEMA, 5, USER_A)).resolves.toBeUndefined();
  });

  test('personal other : Forbidden', async () => {
    mockQuery.mockResolvedValueOnce({
      rowCount: 1,
      rows: [{ id: 5, scope: 'personal', user_id: USER_A }],
    });
    await expect(deleteMemory(SCHEMA, 5, USER_B)).rejects.toBeInstanceOf(ForbiddenAccessError);
  });

  test('shared : OK pour tout user (permission verifiee en amont)', async () => {
    mockQuery
      .mockResolvedValueOnce({ rowCount: 1, rows: [{ id: 5, scope: 'shared', user_id: null }] })
      .mockResolvedValueOnce({ rowCount: 1, rows: [] });
    await expect(deleteMemory(SCHEMA, 5, USER_B)).resolves.toBeUndefined();
  });

  test('inexistante : NotFoundError', async () => {
    mockQuery.mockResolvedValueOnce({ rowCount: 0, rows: [] });
    await expect(deleteMemory(SCHEMA, 999, USER_A)).rejects.toBeInstanceOf(NotFoundError);
  });
});
