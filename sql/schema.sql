-- ===================== NORMX AI — Schema unifie multi-tenant =====================

-- Cabinets (cabinet comptable / entreprise autonome)
CREATE TABLE IF NOT EXISTS cabinets (
  id SERIAL PRIMARY KEY,
  nom VARCHAR NOT NULL,
  type VARCHAR DEFAULT 'cabinet',  -- 'cabinet' ou 'autonome'
  created_at TIMESTAMP DEFAULT NOW()
);

-- Utilisateurs (appartiennent a un cabinet)
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  nom VARCHAR NOT NULL,
  prenom VARCHAR NOT NULL,
  email VARCHAR NOT NULL UNIQUE,
  password VARCHAR NOT NULL,
  telephone VARCHAR,
  role VARCHAR DEFAULT 'administrateur',  -- administrateur, collaborateur
  cabinet_id INTEGER REFERENCES cabinets(id),
  otp_code VARCHAR,
  is_verified BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Entites / Dossiers clients (appartiennent a un cabinet)
CREATE TABLE IF NOT EXISTS entites (
  id SERIAL PRIMARY KEY,
  cabinet_id INTEGER NOT NULL REFERENCES cabinets(id),
  nom VARCHAR NOT NULL,
  type_activite VARCHAR NOT NULL DEFAULT 'entreprise',
  offre VARCHAR DEFAULT 'complet',
  modules TEXT[] DEFAULT ARRAY['compta','etats','paie'],
  sigle VARCHAR,
  adresse VARCHAR,
  nif VARCHAR,
  telephone VARCHAR,
  email VARCHAR,
  data JSONB DEFAULT '{}',
  actif BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Exercices comptables
CREATE TABLE IF NOT EXISTS exercices (
  id SERIAL PRIMARY KEY,
  entite_id INTEGER NOT NULL REFERENCES entites(id),
  annee INTEGER NOT NULL,
  date_debut DATE NOT NULL,
  date_fin DATE NOT NULL,
  statut VARCHAR DEFAULT 'ouvert',
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(entite_id, annee)
);

-- Balances importees
CREATE TABLE IF NOT EXISTS balances (
  id SERIAL PRIMARY KEY,
  entite_id INTEGER NOT NULL REFERENCES entites(id),
  exercice_id INTEGER NOT NULL REFERENCES exercices(id),
  type_balance VARCHAR NOT NULL,
  nom_fichier VARCHAR,
  date_import TIMESTAMP DEFAULT NOW(),
  statut VARCHAR DEFAULT 'brut',
  revision_notes TEXT,
  revise_par INTEGER,
  date_revision TIMESTAMP
);

CREATE TABLE IF NOT EXISTS balance_lignes (
  id SERIAL PRIMARY KEY,
  balance_id INTEGER NOT NULL REFERENCES balances(id) ON DELETE CASCADE,
  numero_compte VARCHAR NOT NULL,
  libelle_compte VARCHAR,
  si_debit NUMERIC DEFAULT 0,
  si_credit NUMERIC DEFAULT 0,
  debit NUMERIC DEFAULT 0,
  credit NUMERIC DEFAULT 0,
  solde_debiteur NUMERIC DEFAULT 0,
  solde_crediteur NUMERIC DEFAULT 0,
  debit_revise NUMERIC,
  credit_revise NUMERIC,
  solde_debiteur_revise NUMERIC,
  solde_crediteur_revise NUMERIC,
  note_revision TEXT
);

-- Données de révision comptable (par section)
CREATE TABLE IF NOT EXISTS revision_data (
  id SERIAL PRIMARY KEY,
  entite_id INTEGER NOT NULL,
  exercice_id INTEGER NOT NULL,
  section VARCHAR(50) NOT NULL,
  data JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(entite_id, exercice_id, section)
);

-- Ecritures comptables
CREATE TABLE IF NOT EXISTS ecritures (
  id SERIAL PRIMARY KEY,
  entite_id INTEGER NOT NULL REFERENCES entites(id),
  exercice_id INTEGER NOT NULL REFERENCES exercices(id),
  date_ecriture DATE NOT NULL,
  journal VARCHAR DEFAULT 'OD',
  numero_piece VARCHAR,
  libelle VARCHAR NOT NULL,
  statut VARCHAR DEFAULT 'brouillard',
  validee_par INTEGER,
  date_validation TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ecriture_lignes (
  id SERIAL PRIMARY KEY,
  ecriture_id INTEGER NOT NULL REFERENCES ecritures(id) ON DELETE CASCADE,
  numero_compte VARCHAR NOT NULL,
  libelle_compte VARCHAR,
  debit NUMERIC DEFAULT 0,
  credit NUMERIC DEFAULT 0,
  tiers_id INTEGER,
  lettrage_code VARCHAR
);

-- Tiers
CREATE TABLE IF NOT EXISTS tiers (
  id SERIAL PRIMARY KEY,
  entite_id INTEGER NOT NULL REFERENCES entites(id),
  type VARCHAR NOT NULL,
  code_tiers VARCHAR,
  nom VARCHAR NOT NULL,
  compte_comptable VARCHAR,
  telephone VARCHAR,
  email VARCHAR,
  adresse VARCHAR,
  data JSONB DEFAULT '{}',
  actif BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Declarations TVA
CREATE TABLE IF NOT EXISTS declarations_tva (
  id SERIAL PRIMARY KEY,
  entite_id INTEGER NOT NULL REFERENCES entites(id),
  exercice_id INTEGER NOT NULL REFERENCES exercices(id),
  mois INTEGER NOT NULL,
  type_declaration VARCHAR DEFAULT '3310CA3',
  periodicite VARCHAR DEFAULT 'Mensuelle',
  statut VARCHAR DEFAULT 'nouvelle',
  montant_tva_collectee NUMERIC DEFAULT 0,
  montant_tva_deductible NUMERIC DEFAULT 0,
  montant_tva_payer NUMERIC DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(entite_id, exercice_id, mois, type_declaration)
);

CREATE TABLE IF NOT EXISTS declaration_tva_lignes (
  id SERIAL PRIMARY KEY,
  declaration_id INTEGER NOT NULL REFERENCES declarations_tva(id) ON DELETE CASCADE,
  onglet VARCHAR NOT NULL,
  groupe VARCHAR,
  reference VARCHAR,
  libelle VARCHAR,
  montant_net NUMERIC DEFAULT 0,
  taux_taxe NUMERIC DEFAULT 0,
  montant_taxe NUMERIC DEFAULT 0,
  date_document DATE,
  avoir BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Assistant IA
CREATE TABLE IF NOT EXISTS conversations (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),
  titre VARCHAR DEFAULT 'Nouvelle conversation',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS conversation_messages (
  id SERIAL PRIMARY KEY,
  conversation_id INTEGER NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  role VARCHAR NOT NULL,
  content TEXT NOT NULL,
  articles_refs JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS assistant_memory (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),
  cle VARCHAR NOT NULL,
  valeur TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- ===================== MODULE PAIE =====================

CREATE TABLE IF NOT EXISTS paie_config (
  id SERIAL PRIMARY KEY,
  entite_id INTEGER REFERENCES entites(id),
  devise VARCHAR DEFAULT 'XAF',
  mois INTEGER DEFAULT 0,
  annee INTEGER DEFAULT 2026,
  step INTEGER DEFAULT 1,
  mode VARCHAR DEFAULT 'wizard',
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(entite_id)
);

CREATE TABLE IF NOT EXISTS etablissements (
  id SERIAL PRIMARY KEY,
  entite_id INTEGER REFERENCES entites(id),
  raison_sociale VARCHAR NOT NULL,
  nui VARCHAR,
  data JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS salaries (
  id SERIAL PRIMARY KEY,
  entite_id INTEGER REFERENCES entites(id),
  etablissement_id INTEGER REFERENCES etablissements(id),
  data JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS bulletins (
  id SERIAL PRIMARY KEY,
  salarie_id INTEGER REFERENCES salaries(id),
  entite_id INTEGER REFERENCES entites(id),
  mois INTEGER NOT NULL,
  annee INTEGER NOT NULL,
  salaire_brut INTEGER DEFAULT 0,
  total_cotis_sal INTEGER DEFAULT 0,
  total_cotis_pat INTEGER DEFAULT 0,
  its INTEGER DEFAULT 0,
  tus INTEGER DEFAULT 0,
  net_a_payer INTEGER DEFAULT 0,
  data JSONB DEFAULT '{}',
  statut VARCHAR DEFAULT 'brouillon',
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS declarations_paie (
  id SERIAL PRIMARY KEY,
  entite_id INTEGER REFERENCES entites(id),
  type VARCHAR NOT NULL,
  periode VARCHAR,
  montant_total INTEGER DEFAULT 0,
  data JSONB DEFAULT '{}',
  statut VARCHAR DEFAULT 'brouillon',
  created_at TIMESTAMP DEFAULT NOW()
);
