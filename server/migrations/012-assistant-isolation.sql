-- Migration 012: Isolation assistant IA (intra-tenant)
-- Date: 2026-05-03
--
-- Contexte : la version d'origine stockait les conversations et la memoire
-- assistant avec un user_id INTEGER incompatible avec utilisateurs.id (UUID).
-- Les routes acceptaient un :userId en URL/body sans verifier l'authenticite,
-- ouvrant un IDOR intra-tenant (cabinet multi-collaborateurs).
--
-- Cette migration :
--   1. Renomme et corrige le type user_id sur conversations (INTEGER -> UUID)
--   2. Ajoute conversations.visibility (private | shared)
--   3. Ajoute conversations.entite_id (rattachement dossier interne, optionnel)
--   4. Corrige le type user_id sur assistant_memory + ajoute scope
--   5. Insere le module 'assistant' pour tous les utilisateurs existants
--
-- Donnees existantes : les conversations / memoires preexistantes deviennent
-- orphelines (created_by_user_id NULL) avec visibility='shared' / scope='shared'.
-- Justification : aucun tenant reel en prod a ce stade (environnement de test).
--
-- Note: a executer dans CHAQUE schema tenant existant.
-- Utiliser: SET search_path TO "<schema>"; puis executer ce script.

-- ========== CONVERSATIONS ==========

-- Drop l'index sur l'ancien user_id avant la transformation
DROP INDEX IF EXISTS idx_conversations_user;

-- Rename + change type INTEGER -> UUID (perte des references existantes assumee)
ALTER TABLE conversations RENAME COLUMN user_id TO created_by_user_id;
ALTER TABLE conversations
  ALTER COLUMN created_by_user_id DROP DEFAULT,
  ALTER COLUMN created_by_user_id TYPE UUID USING NULL;

-- Visibility : private (createur seul) | shared (tous users du tenant)
ALTER TABLE conversations
  ADD COLUMN IF NOT EXISTS visibility VARCHAR(20) NOT NULL DEFAULT 'shared'
    CHECK (visibility IN ('private', 'shared'));

-- Rattachement optionnel a une entite (dossier comptable interne au schema)
ALTER TABLE conversations
  ADD COLUMN IF NOT EXISTS entite_id INTEGER NULL
    REFERENCES entites(id) ON DELETE SET NULL;

-- FK vers utilisateurs (ON DELETE SET NULL : conversation reste lisible par
-- les autres collaborateurs si le createur est supprime)
ALTER TABLE conversations
  ADD CONSTRAINT fk_conv_user
  FOREIGN KEY (created_by_user_id) REFERENCES utilisateurs(id) ON DELETE SET NULL;

-- Index pour les requetes "mes conversations + partagees"
CREATE INDEX IF NOT EXISTS idx_conversations_creator ON conversations(created_by_user_id);
CREATE INDEX IF NOT EXISTS idx_conversations_visibility ON conversations(visibility);
CREATE INDEX IF NOT EXISTS idx_conversations_entite ON conversations(entite_id);

-- ========== ASSISTANT_MEMORY ==========

DROP INDEX IF EXISTS idx_assistant_memory_user;

ALTER TABLE assistant_memory
  ALTER COLUMN user_id DROP NOT NULL,
  ALTER COLUMN user_id DROP DEFAULT,
  ALTER COLUMN user_id TYPE UUID USING NULL;

-- Scope : personal (par user) | shared (par tenant, memoire metier)
ALTER TABLE assistant_memory
  ADD COLUMN IF NOT EXISTS scope VARCHAR(20) NOT NULL DEFAULT 'personal'
    CHECK (scope IN ('personal', 'shared'));

ALTER TABLE assistant_memory
  ADD COLUMN IF NOT EXISTS entite_id INTEGER NULL
    REFERENCES entites(id) ON DELETE SET NULL;

-- Une memoire personnelle exige un user_id ; une memoire partagee non.
ALTER TABLE assistant_memory
  ADD CONSTRAINT chk_memory_scope_user CHECK (
    (scope = 'personal' AND user_id IS NOT NULL) OR
    (scope = 'shared')
  );

ALTER TABLE assistant_memory
  ADD CONSTRAINT fk_memory_user
  FOREIGN KEY (user_id) REFERENCES utilisateurs(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_assistant_memory_user ON assistant_memory(user_id);
CREATE INDEX IF NOT EXISTS idx_assistant_memory_scope ON assistant_memory(scope);

-- ========== PERMISSIONS MODULE ASSISTANT ==========

-- Grant tous droits sur le module 'assistant' aux utilisateurs existants
-- (pas de regression d'usage pour les comptes deja crees).
INSERT INTO permissions_modules
  (utilisateur_id, module, peut_lire, peut_creer, peut_modifier, peut_supprimer)
SELECT id, 'assistant', true, true, true, true
FROM utilisateurs
ON CONFLICT (utilisateur_id, module) DO NOTHING;
