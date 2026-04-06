-- Migration 002: Template de schema tenant
-- Placeholder ${schema_name} remplace par le nom reel du schema

CREATE SCHEMA IF NOT EXISTS "${schema_name}";

-- Utilisateurs (synced from Keycloak)
CREATE TABLE IF NOT EXISTS "${schema_name}".utilisateurs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  keycloak_id VARCHAR(100) UNIQUE,
  email VARCHAR(255) NOT NULL,
  nom VARCHAR(100),
  prenom VARCHAR(100),
  role VARCHAR(50) NOT NULL DEFAULT 'gestionnaire',
  actif BOOLEAN DEFAULT true,
  derniere_connexion TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Permissions par module
CREATE TABLE IF NOT EXISTS "${schema_name}".permissions_modules (
  id SERIAL PRIMARY KEY,
  utilisateur_id UUID NOT NULL REFERENCES "${schema_name}".utilisateurs(id) ON DELETE CASCADE,
  module VARCHAR(50) NOT NULL,
  peut_lire BOOLEAN DEFAULT false,
  peut_creer BOOLEAN DEFAULT false,
  peut_modifier BOOLEAN DEFAULT false,
  peut_supprimer BOOLEAN DEFAULT false,
  UNIQUE(utilisateur_id, module)
);

-- Audit log
CREATE TABLE IF NOT EXISTS "${schema_name}".audit_log (
  id SERIAL PRIMARY KEY,
  utilisateur_id TEXT,
  action VARCHAR(50) NOT NULL,
  module VARCHAR(50),
  entite VARCHAR(100),
  entite_id VARCHAR(100),
  details JSONB,
  ip_address VARCHAR(45),
  created_at TIMESTAMP DEFAULT NOW()
);

-- ========== COMPTABILITE ==========

CREATE TABLE IF NOT EXISTS "${schema_name}".entites (
  id SERIAL PRIMARY KEY,
  nom VARCHAR(200) NOT NULL,
  type_activite VARCHAR(100),
  offre VARCHAR(50) DEFAULT 'comptabilite',
  modules JSONB DEFAULT '["comptabilite"]',
  sigle VARCHAR(50),
  adresse TEXT,
  nif VARCHAR(50),
  telephone VARCHAR(30),
  email VARCHAR(200),
  actif BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "${schema_name}".exercices (
  id SERIAL PRIMARY KEY,
  entite_id INTEGER REFERENCES "${schema_name}".entites(id),
  annee INTEGER NOT NULL,
  date_debut DATE,
  date_fin DATE,
  duree_mois INTEGER DEFAULT 12,
  statut VARCHAR(20) DEFAULT 'ouvert',
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "${schema_name}".ecritures (
  id SERIAL PRIMARY KEY,
  entite_id INTEGER REFERENCES "${schema_name}".entites(id),
  exercice_id INTEGER REFERENCES "${schema_name}".exercices(id),
  date_ecriture DATE NOT NULL,
  journal VARCHAR(10),
  numero_piece VARCHAR(50),
  libelle TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "${schema_name}".ecriture_lignes (
  id SERIAL PRIMARY KEY,
  ecriture_id INTEGER REFERENCES "${schema_name}".ecritures(id) ON DELETE CASCADE,
  numero_compte VARCHAR(20) NOT NULL,
  libelle TEXT,
  debit DECIMAL(15,2) DEFAULT 0,
  credit DECIMAL(15,2) DEFAULT 0,
  tiers_id INTEGER
);

CREATE TABLE IF NOT EXISTS "${schema_name}".balances (
  id SERIAL PRIMARY KEY,
  entite_id INTEGER REFERENCES "${schema_name}".entites(id),
  exercice_id INTEGER REFERENCES "${schema_name}".exercices(id),
  type_balance VARCHAR(50),
  nom_fichier VARCHAR(200),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "${schema_name}".balance_lignes (
  id SERIAL PRIMARY KEY,
  balance_id INTEGER REFERENCES "${schema_name}".balances(id) ON DELETE CASCADE,
  numero_compte VARCHAR(20),
  libelle_compte TEXT,
  si_debit DECIMAL(15,2) DEFAULT 0,
  si_credit DECIMAL(15,2) DEFAULT 0,
  debit DECIMAL(15,2) DEFAULT 0,
  credit DECIMAL(15,2) DEFAULT 0,
  solde_debiteur DECIMAL(15,2) DEFAULT 0,
  solde_crediteur DECIMAL(15,2) DEFAULT 0
);

CREATE TABLE IF NOT EXISTS "${schema_name}".tiers (
  id SERIAL PRIMARY KEY,
  entite_id INTEGER REFERENCES "${schema_name}".entites(id),
  type VARCHAR(20),
  code_tiers VARCHAR(50),
  nom VARCHAR(200) NOT NULL,
  compte_comptable VARCHAR(20),
  telephone VARCHAR(30),
  email VARCHAR(200),
  adresse TEXT,
  data JSONB DEFAULT '{}',
  actif BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "${schema_name}".declarations_tva (
  id SERIAL PRIMARY KEY,
  entite_id INTEGER REFERENCES "${schema_name}".entites(id),
  exercice_id INTEGER REFERENCES "${schema_name}".exercices(id),
  mois INTEGER,
  statut VARCHAR(20) DEFAULT 'brouillon',
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "${schema_name}".declaration_tva_lignes (
  id SERIAL PRIMARY KEY,
  declaration_id INTEGER REFERENCES "${schema_name}".declarations_tva(id) ON DELETE CASCADE,
  onglet VARCHAR(50),
  code_ligne VARCHAR(20),
  libelle TEXT,
  base DECIMAL(15,2) DEFAULT 0,
  taux DECIMAL(5,2),
  montant DECIMAL(15,2) DEFAULT 0
);

-- ========== REVISION ==========

CREATE TABLE IF NOT EXISTS "${schema_name}".revision_data (
  id SERIAL PRIMARY KEY,
  entite_id INTEGER REFERENCES "${schema_name}".entites(id),
  exercice_id INTEGER REFERENCES "${schema_name}".exercices(id),
  data JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW()
);

-- ========== PAIE ==========

CREATE TABLE IF NOT EXISTS "${schema_name}".paie_config (
  id SERIAL PRIMARY KEY,
  entite_id INTEGER,
  devise VARCHAR(5) DEFAULT 'XAF',
  mois INTEGER,
  annee INTEGER,
  step VARCHAR(20),
  mode VARCHAR(20),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(entite_id)
);

CREATE TABLE IF NOT EXISTS "${schema_name}".etablissements (
  id SERIAL PRIMARY KEY,
  entite_id INTEGER,
  raison_sociale VARCHAR(200) NOT NULL,
  nui VARCHAR(50),
  data JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "${schema_name}".salaries (
  id SERIAL PRIMARY KEY,
  entite_id INTEGER,
  etablissement_id INTEGER REFERENCES "${schema_name}".etablissements(id),
  data JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "${schema_name}".rubriques (
  id SERIAL PRIMARY KEY,
  entite_id INTEGER,
  code VARCHAR(50) NOT NULL,
  libelle VARCHAR(200) NOT NULL,
  type VARCHAR(20) NOT NULL CHECK (type IN ('gain', 'retenue', 'cotisation', 'indemnite', 'avantage')),
  mode VARCHAR(20) NOT NULL CHECK (mode IN ('pourcentage', 'fixe', 'horaire', 'variable')),
  taux DECIMAL(10,4),
  montant DECIMAL(15,2),
  plafond DECIMAL(15,2),
  base VARCHAR(50),
  imposable BOOLEAN DEFAULT true,
  actif BOOLEAN DEFAULT true,
  ordre INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "${schema_name}".bulletins_paie (
  id SERIAL PRIMARY KEY,
  salarie_id INTEGER REFERENCES "${schema_name}".salaries(id),
  mois INTEGER NOT NULL,
  annee INTEGER NOT NULL,
  statut VARCHAR(20) DEFAULT 'brouillon' CHECK (statut IN ('brouillon', 'valide', 'verrouille')),
  data JSONB DEFAULT '{}',
  date_validation TIMESTAMP,
  date_verrouillage TIMESTAMP,
  valide_par UUID,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE (salarie_id, mois, annee)
);

CREATE TABLE IF NOT EXISTS "${schema_name}".periodes_cloture (
  id SERIAL PRIMARY KEY,
  mois INTEGER NOT NULL,
  annee INTEGER NOT NULL,
  cloturee BOOLEAN DEFAULT false,
  date_cloture TIMESTAMP,
  UNIQUE(mois, annee)
);

-- ========== NOTIFICATIONS ==========

CREATE TABLE IF NOT EXISTS "${schema_name}".notifications (
  id SERIAL PRIMARY KEY,
  utilisateur_id TEXT,
  titre VARCHAR(200),
  message TEXT,
  type VARCHAR(50) DEFAULT 'info',
  lu BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW()
);

-- ========== RAPPROCHEMENT BANCAIRE ==========

CREATE TABLE IF NOT EXISTS "${schema_name}".rapprochements_bancaires (
  id SERIAL PRIMARY KEY,
  entite_id INTEGER NOT NULL,
  exercice_id INTEGER NOT NULL,
  banque VARCHAR(100),
  compte_bancaire VARCHAR(20) DEFAULT '521',
  mois INTEGER,
  annee INTEGER,
  solde_debut DECIMAL(15,2) DEFAULT 0,
  solde_fin DECIMAL(15,2) DEFAULT 0,
  nb_lignes INTEGER DEFAULT 0,
  nb_rapprochees INTEGER DEFAULT 0,
  ecart DECIMAL(15,2) DEFAULT 0,
  data JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_rapprochements_entite ON "${schema_name}".rapprochements_bancaires(entite_id);
CREATE INDEX IF NOT EXISTS idx_rapprochements_exercice ON "${schema_name}".rapprochements_bancaires(exercice_id);

-- ========== INDEX ==========

CREATE INDEX IF NOT EXISTS idx_ecritures_entite ON "${schema_name}".ecritures(entite_id);
CREATE INDEX IF NOT EXISTS idx_ecritures_exercice ON "${schema_name}".ecritures(exercice_id);
CREATE INDEX IF NOT EXISTS idx_tiers_entite ON "${schema_name}".tiers(entite_id);
CREATE INDEX IF NOT EXISTS idx_salaries_entite ON "${schema_name}".salaries(entite_id);
CREATE INDEX IF NOT EXISTS idx_bulletins_salarie ON "${schema_name}".bulletins_paie(salarie_id);
CREATE INDEX IF NOT EXISTS idx_bulletins_periode ON "${schema_name}".bulletins_paie(mois, annee);
CREATE INDEX IF NOT EXISTS idx_audit_module ON "${schema_name}".audit_log(module);
CREATE INDEX IF NOT EXISTS idx_audit_date ON "${schema_name}".audit_log(created_at);

-- ========== ASSISTANT IA ==========

CREATE TABLE IF NOT EXISTS "${schema_name}".conversations (
  id SERIAL PRIMARY KEY,
  user_id INTEGER,
  titre VARCHAR(255) DEFAULT 'Nouvelle conversation',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "${schema_name}".conversation_messages (
  id SERIAL PRIMARY KEY,
  conversation_id INTEGER REFERENCES "${schema_name}".conversations(id) ON DELETE CASCADE,
  role VARCHAR(20) NOT NULL DEFAULT 'user',
  content TEXT NOT NULL,
  articles_refs JSONB DEFAULT '[]',
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "${schema_name}".assistant_memory (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL,
  cle VARCHAR(255) NOT NULL,
  valeur TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_conversations_user ON "${schema_name}".conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_conv_messages_conv ON "${schema_name}".conversation_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_assistant_memory_user ON "${schema_name}".assistant_memory(user_id);

-- ========== INDEX SUPPLEMENTAIRES (performance) ==========

CREATE INDEX IF NOT EXISTS idx_utilisateurs_keycloak ON "${schema_name}".utilisateurs(keycloak_id);
CREATE INDEX IF NOT EXISTS idx_utilisateurs_email ON "${schema_name}".utilisateurs(email);
CREATE INDEX IF NOT EXISTS idx_tiers_entite_type ON "${schema_name}".tiers(entite_id, type);
CREATE INDEX IF NOT EXISTS idx_ecritures_journal ON "${schema_name}".ecritures(journal, exercice_id);
CREATE INDEX IF NOT EXISTS idx_ecritures_date ON "${schema_name}".ecritures(date_ecriture, exercice_id);
CREATE INDEX IF NOT EXISTS idx_ecriture_lignes_numero_compte ON "${schema_name}".ecriture_lignes(numero_compte, ecriture_id);
CREATE INDEX IF NOT EXISTS idx_ecriture_lignes_tiers ON "${schema_name}".ecriture_lignes(tiers_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON "${schema_name}".notifications(utilisateur_id, lu);
CREATE INDEX IF NOT EXISTS idx_salaries_etablissement ON "${schema_name}".salaries(etablissement_id);
CREATE INDEX IF NOT EXISTS idx_declarations_tva_exercice ON "${schema_name}".declarations_tva(exercice_id);
CREATE INDEX IF NOT EXISTS idx_declaration_tva_lignes_declaration ON "${schema_name}".declaration_tva_lignes(declaration_id, onglet);
CREATE INDEX IF NOT EXISTS idx_balance_lignes_numero_compte ON "${schema_name}".balance_lignes(numero_compte);
