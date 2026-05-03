import pool from '../db';
import { getValidatedSchemaName } from '../utils/tenant.utils';
import { ForbiddenError, NotFoundError } from '../errors';

// Re-exports retro-compatibles : du code peut importer ces noms depuis le service.
// Sources de verite : server/errors/.
export { NotFoundError };
export { ForbiddenError as ForbiddenAccessError };

export type Visibility = 'private' | 'shared';
export type MemoryScope = 'personal' | 'shared';

export interface ConversationRow {
  id: number;
  titre: string;
  visibility: Visibility;
  created_by_user_id: string | null;
  entite_id: number | null;
  created_at: string;
  updated_at: string;
}

export interface MessageRow {
  id: number;
  role: string;
  content: string;
  articles_refs: unknown;
  created_at: string;
}

export interface MemoryRow {
  id: number;
  cle: string;
  valeur: string;
  scope: MemoryScope;
  user_id: string | null;
  updated_at: string;
}

// ============================================================================
// CONVERSATIONS
// ============================================================================

/**
 * Liste les conversations accessibles : celles creees par l'utilisateur
 * (privees ou partagees) + toutes les partagees du tenant.
 */
export async function listConversations(
  schema: string,
  currentUserId: string,
): Promise<ConversationRow[]> {
  const s = getValidatedSchemaName(schema);
  const result = await pool.query(
    `SELECT id, titre, visibility, created_by_user_id, entite_id, created_at, updated_at
     FROM "${s}".conversations
     WHERE created_by_user_id = $1 OR visibility = 'shared'
     ORDER BY updated_at DESC`,
    [currentUserId],
  );
  return result.rows as ConversationRow[];
}

/**
 * Charge une conversation et applique les regles d'acces :
 *   - private : seul le createur
 *   - shared : tout user du tenant (la permission lecture est verifiee en amont
 *              par requirePermission('assistant', 'lire'))
 */
export async function getConversation(
  schema: string,
  convId: number,
  currentUserId: string,
): Promise<ConversationRow> {
  const s = getValidatedSchemaName(schema);
  const result = await pool.query(
    `SELECT id, titre, visibility, created_by_user_id, entite_id, created_at, updated_at
     FROM "${s}".conversations WHERE id = $1`,
    [convId],
  );
  if (result.rowCount === 0) {
    throw new NotFoundError('Conversation');
  }
  const conv = result.rows[0] as ConversationRow;
  assertCanReadConversation(conv, currentUserId);
  return conv;
}

export async function createConversation(
  schema: string,
  currentUserId: string,
  opts: { titre?: string; visibility?: Visibility; entiteId?: number } = {},
): Promise<ConversationRow> {
  const s = getValidatedSchemaName(schema);
  const titre = opts.titre?.trim() || 'Nouvelle conversation';
  const visibility: Visibility = opts.visibility ?? 'shared';
  const entiteId = opts.entiteId ?? null;

  const result = await pool.query(
    `INSERT INTO "${s}".conversations
       (created_by_user_id, titre, visibility, entite_id)
     VALUES ($1, $2, $3, $4)
     RETURNING id, titre, visibility, created_by_user_id, entite_id, created_at, updated_at`,
    [currentUserId, titre, visibility, entiteId],
  );
  return result.rows[0] as ConversationRow;
}

/**
 * Suppression : seul le createur peut supprimer sa conversation.
 * Une conversation orpheline (created_by_user_id NULL) ne peut etre supprimee
 * que par un user avec permission 'supprimer' sur module 'assistant'
 * (verifiee en amont par requirePermission).
 */
export async function deleteConversation(
  schema: string,
  convId: number,
  currentUserId: string,
): Promise<void> {
  const s = getValidatedSchemaName(schema);
  const conv = await getConversation(s, convId, currentUserId);
  if (conv.created_by_user_id !== null && conv.created_by_user_id !== currentUserId) {
    throw new ForbiddenError(
      'Seul le createur peut supprimer une conversation',
    );
  }
  await pool.query(`DELETE FROM "${s}".conversations WHERE id = $1`, [convId]);
}

// ============================================================================
// MESSAGES
// ============================================================================

export async function listMessages(
  schema: string,
  convId: number,
  currentUserId: string,
): Promise<MessageRow[]> {
  const s = getValidatedSchemaName(schema);
  // Verifie l'acces a la conversation parent
  await getConversation(s, convId, currentUserId);

  const result = await pool.query(
    `SELECT id, role, content, articles_refs, created_at
     FROM "${s}".conversation_messages
     WHERE conversation_id = $1
     ORDER BY created_at ASC`,
    [convId],
  );
  return result.rows as MessageRow[];
}

// ============================================================================
// MEMORY
// ============================================================================

/**
 * Memoire personnelle de l'utilisateur + memoire partagee du tenant.
 */
export async function listMemory(
  schema: string,
  currentUserId: string,
): Promise<MemoryRow[]> {
  const s = getValidatedSchemaName(schema);
  const result = await pool.query(
    `SELECT id, cle, valeur, scope, user_id, updated_at
     FROM "${s}".assistant_memory
     WHERE (scope = 'personal' AND user_id = $1) OR scope = 'shared'
     ORDER BY updated_at DESC`,
    [currentUserId],
  );
  return result.rows as MemoryRow[];
}

export async function deleteMemory(
  schema: string,
  memoryId: number,
  currentUserId: string,
): Promise<void> {
  const s = getValidatedSchemaName(schema);
  const result = await pool.query(
    `SELECT id, scope, user_id FROM "${s}".assistant_memory WHERE id = $1`,
    [memoryId],
  );
  if (result.rowCount === 0) {
    throw new NotFoundError('Memoire');
  }
  const row = result.rows[0] as { scope: MemoryScope; user_id: string | null };
  if (row.scope === 'personal' && row.user_id !== currentUserId) {
    throw new ForbiddenError(
      'Seul le proprietaire peut supprimer une memoire personnelle',
    );
  }
  // scope = 'shared' : la permission 'supprimer' est verifiee en amont
  await pool.query(`DELETE FROM "${s}".assistant_memory WHERE id = $1`, [memoryId]);
}

// ============================================================================
// HELPERS D'ACCES (exportes pour reutilisation par handleChat)
// ============================================================================

export function assertCanReadConversation(
  conv: Pick<ConversationRow, 'visibility' | 'created_by_user_id'>,
  currentUserId: string,
): void {
  if (conv.visibility === 'shared') return;
  if (conv.created_by_user_id === currentUserId) return;
  throw new ForbiddenError('Conversation privee inaccessible');
}

export function assertCanWriteConversation(
  conv: Pick<ConversationRow, 'visibility' | 'created_by_user_id'>,
  currentUserId: string,
): void {
  // Une conversation privee : seul le createur ecrit dedans.
  // Une conversation partagee : tout user (lecture+creation au niveau permissions
  // verifiee en amont) peut ajouter des messages.
  if (conv.visibility === 'private' && conv.created_by_user_id !== currentUserId) {
    throw new ForbiddenError('Conversation privee inaccessible en ecriture');
  }
}
