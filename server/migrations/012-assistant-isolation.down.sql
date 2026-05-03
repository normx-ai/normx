-- Rollback Migration 012: retour a l'etat anterieur
-- Date: 2026-05-03
--
-- A executer dans CHAQUE schema tenant via:
--   SET search_path TO "<schema>"; puis ce script.
--
-- ATTENTION : la perte des created_by_user_id (NULL) ne peut etre recuperee.
-- Les conversations restantes auront user_id = NULL apres rollback.

-- ========== PERMISSIONS ==========

DELETE FROM permissions_modules WHERE module = 'assistant';

-- ========== ASSISTANT_MEMORY ==========

DROP INDEX IF EXISTS idx_assistant_memory_scope;
DROP INDEX IF EXISTS idx_assistant_memory_user;

ALTER TABLE assistant_memory DROP CONSTRAINT IF EXISTS fk_memory_user;
ALTER TABLE assistant_memory DROP CONSTRAINT IF EXISTS chk_memory_scope_user;
ALTER TABLE assistant_memory DROP COLUMN IF EXISTS entite_id;
ALTER TABLE assistant_memory DROP COLUMN IF EXISTS scope;

ALTER TABLE assistant_memory
  ALTER COLUMN user_id TYPE INTEGER USING NULL,
  ALTER COLUMN user_id SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_assistant_memory_user ON assistant_memory(user_id);

-- ========== CONVERSATIONS ==========

DROP INDEX IF EXISTS idx_conversations_entite;
DROP INDEX IF EXISTS idx_conversations_visibility;
DROP INDEX IF EXISTS idx_conversations_creator;

ALTER TABLE conversations DROP CONSTRAINT IF EXISTS fk_conv_user;
ALTER TABLE conversations DROP COLUMN IF EXISTS entite_id;
ALTER TABLE conversations DROP COLUMN IF EXISTS visibility;

ALTER TABLE conversations
  ALTER COLUMN created_by_user_id TYPE INTEGER USING NULL;
ALTER TABLE conversations RENAME COLUMN created_by_user_id TO user_id;

CREATE INDEX IF NOT EXISTS idx_conversations_user ON conversations(user_id);
