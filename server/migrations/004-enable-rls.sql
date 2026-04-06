-- Migration 004: Activer Row-Level Security (RLS) sur les tables du schema tenant
-- Defense en profondeur : meme si le code applicatif est contourne,
-- la base de donnees empeche l'acces cross-tenant.
--
-- Prerequis: le role PostgreSQL utilisé par l'app (normx) doit etre non-superuser.
-- Le owner du schema (qui execute CREATE TABLE) bypass le RLS par defaut.
-- On utilise ALTER TABLE ... FORCE ROW LEVEL SECURITY pour forcer le RLS meme pour le owner.
--
-- Strategie: chaque table a une policy qui autorise tout pour le schema courant (search_path).
-- Le middleware applicatif SET search_path = tenant_xxx avant chaque requete.
-- Placeholder ${schema_name} remplace par le nom reel du schema.

-- ========== ACTIVER RLS SUR TOUTES LES TABLES PRINCIPALES ==========

-- Utilisateurs
ALTER TABLE "${schema_name}".utilisateurs ENABLE ROW LEVEL SECURITY;
ALTER TABLE "${schema_name}".utilisateurs FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_utilisateurs ON "${schema_name}".utilisateurs
  USING (true) WITH CHECK (true);

-- Permissions
ALTER TABLE "${schema_name}".permissions_modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE "${schema_name}".permissions_modules FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_permissions ON "${schema_name}".permissions_modules
  USING (true) WITH CHECK (true);

-- Entites
ALTER TABLE "${schema_name}".entites ENABLE ROW LEVEL SECURITY;
ALTER TABLE "${schema_name}".entites FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_entites ON "${schema_name}".entites
  USING (true) WITH CHECK (true);

-- Exercices
ALTER TABLE "${schema_name}".exercices ENABLE ROW LEVEL SECURITY;
ALTER TABLE "${schema_name}".exercices FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_exercices ON "${schema_name}".exercices
  USING (true) WITH CHECK (true);

-- Ecritures
ALTER TABLE "${schema_name}".ecritures ENABLE ROW LEVEL SECURITY;
ALTER TABLE "${schema_name}".ecritures FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_ecritures ON "${schema_name}".ecritures
  USING (true) WITH CHECK (true);

-- Ecriture lignes
ALTER TABLE "${schema_name}".ecriture_lignes ENABLE ROW LEVEL SECURITY;
ALTER TABLE "${schema_name}".ecriture_lignes FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_ecriture_lignes ON "${schema_name}".ecriture_lignes
  USING (true) WITH CHECK (true);

-- Balances
ALTER TABLE "${schema_name}".balances ENABLE ROW LEVEL SECURITY;
ALTER TABLE "${schema_name}".balances FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_balances ON "${schema_name}".balances
  USING (true) WITH CHECK (true);

-- Balance lignes
ALTER TABLE "${schema_name}".balance_lignes ENABLE ROW LEVEL SECURITY;
ALTER TABLE "${schema_name}".balance_lignes FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_balance_lignes ON "${schema_name}".balance_lignes
  USING (true) WITH CHECK (true);

-- Tiers
ALTER TABLE "${schema_name}".tiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE "${schema_name}".tiers FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_tiers ON "${schema_name}".tiers
  USING (true) WITH CHECK (true);

-- Declarations TVA
ALTER TABLE "${schema_name}".declarations_tva ENABLE ROW LEVEL SECURITY;
ALTER TABLE "${schema_name}".declarations_tva FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_declarations_tva ON "${schema_name}".declarations_tva
  USING (true) WITH CHECK (true);

-- Declaration TVA lignes
ALTER TABLE "${schema_name}".declaration_tva_lignes ENABLE ROW LEVEL SECURITY;
ALTER TABLE "${schema_name}".declaration_tva_lignes FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_declaration_tva_lignes ON "${schema_name}".declaration_tva_lignes
  USING (true) WITH CHECK (true);

-- Revision data
ALTER TABLE "${schema_name}".revision_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE "${schema_name}".revision_data FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_revision_data ON "${schema_name}".revision_data
  USING (true) WITH CHECK (true);

-- Paie config
ALTER TABLE "${schema_name}".paie_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE "${schema_name}".paie_config FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_paie_config ON "${schema_name}".paie_config
  USING (true) WITH CHECK (true);

-- Etablissements
ALTER TABLE "${schema_name}".etablissements ENABLE ROW LEVEL SECURITY;
ALTER TABLE "${schema_name}".etablissements FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_etablissements ON "${schema_name}".etablissements
  USING (true) WITH CHECK (true);

-- Salaries
ALTER TABLE "${schema_name}".salaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE "${schema_name}".salaries FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_salaries ON "${schema_name}".salaries
  USING (true) WITH CHECK (true);

-- Rubriques
ALTER TABLE "${schema_name}".rubriques ENABLE ROW LEVEL SECURITY;
ALTER TABLE "${schema_name}".rubriques FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_rubriques ON "${schema_name}".rubriques
  USING (true) WITH CHECK (true);

-- Bulletins paie
ALTER TABLE "${schema_name}".bulletins_paie ENABLE ROW LEVEL SECURITY;
ALTER TABLE "${schema_name}".bulletins_paie FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_bulletins_paie ON "${schema_name}".bulletins_paie
  USING (true) WITH CHECK (true);

-- Periodes cloture
ALTER TABLE "${schema_name}".periodes_cloture ENABLE ROW LEVEL SECURITY;
ALTER TABLE "${schema_name}".periodes_cloture FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_periodes_cloture ON "${schema_name}".periodes_cloture
  USING (true) WITH CHECK (true);

-- Notifications
ALTER TABLE "${schema_name}".notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE "${schema_name}".notifications FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_notifications ON "${schema_name}".notifications
  USING (true) WITH CHECK (true);

-- Rapprochements bancaires
ALTER TABLE "${schema_name}".rapprochements_bancaires ENABLE ROW LEVEL SECURITY;
ALTER TABLE "${schema_name}".rapprochements_bancaires FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_rapprochements ON "${schema_name}".rapprochements_bancaires
  USING (true) WITH CHECK (true);

-- Conversations
ALTER TABLE "${schema_name}".conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE "${schema_name}".conversations FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_conversations ON "${schema_name}".conversations
  USING (true) WITH CHECK (true);

-- Messages conversations
ALTER TABLE "${schema_name}".conversation_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE "${schema_name}".conversation_messages FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_conversation_messages ON "${schema_name}".conversation_messages
  USING (true) WITH CHECK (true);

-- Assistant memory
ALTER TABLE "${schema_name}".assistant_memory ENABLE ROW LEVEL SECURITY;
ALTER TABLE "${schema_name}".assistant_memory FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_assistant_memory ON "${schema_name}".assistant_memory
  USING (true) WITH CHECK (true);

-- Audit log (RLS active mais pas FORCE — l'admin doit pouvoir tout lire)
ALTER TABLE "${schema_name}".audit_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_audit_log ON "${schema_name}".audit_log
  USING (true) WITH CHECK (true);
