-- Migration 008 : Paramétrage compta (journaux, TVA, comptes personnalisés)
-- Placeholder ${schema_name} remplacé par le nom réel du schéma
-- Applicable aux nouveaux tenants (via template 002) et aux existants
-- (via application manuelle par la CLI ou le script de migration).

-- ========== JOURNAUX ==========
-- Catalogue des journaux comptables d'un tenant.
-- Code : 2-4 caractères, unique par tenant.
-- Type : achat / vente / tresorerie / od (opérations diverses).
-- contrepartie_defaut : numéro de compte (optionnel) utilisé par défaut en
-- contrepartie à la saisie (ex: 401 pour les achats, 411 pour les ventes).
CREATE TABLE IF NOT EXISTS "${schema_name}".journaux (
  id SERIAL PRIMARY KEY,
  code VARCHAR(10) NOT NULL UNIQUE,
  libelle VARCHAR(100) NOT NULL,
  type VARCHAR(20) NOT NULL DEFAULT 'od',
  contrepartie_defaut VARCHAR(20),
  actif BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  CONSTRAINT journaux_type_check CHECK (type IN ('achat','vente','tresorerie','od'))
);

CREATE INDEX IF NOT EXISTS idx_journaux_code ON "${schema_name}".journaux(code);
CREATE INDEX IF NOT EXISTS idx_journaux_actif ON "${schema_name}".journaux(actif) WHERE actif = true;

-- Seed des 5 journaux par défaut (SYSCOHADA standards).
-- ON CONFLICT DO NOTHING pour supporter la ré-application sans erreur.
INSERT INTO "${schema_name}".journaux (code, libelle, type, contrepartie_defaut) VALUES
  ('AC', 'Achats', 'achat', '401'),
  ('VT', 'Ventes', 'vente', '411'),
  ('CA', 'Caisse', 'tresorerie', '571'),
  ('BQ', 'Banque', 'tresorerie', '521'),
  ('OD', 'Opérations diverses', 'od', NULL)
ON CONFLICT (code) DO NOTHING;

-- ========== CONFIGURATION TVA ==========
-- Une seule ligne par tenant (id = 1 par convention, utilisation ON CONFLICT).
-- regime : normal / simplifie / non_assujetti.
-- taux_normal / taux_reduit : pourcentages numériques (ex: 18.00, 5.00).
CREATE TABLE IF NOT EXISTS "${schema_name}".tva_config (
  id INTEGER PRIMARY KEY DEFAULT 1,
  taux_normal NUMERIC(5,2) NOT NULL DEFAULT 18.00,
  taux_reduit NUMERIC(5,2),
  regime VARCHAR(20) NOT NULL DEFAULT 'normal',
  numero_assujetti VARCHAR(50),
  updated_at TIMESTAMP DEFAULT NOW(),
  CONSTRAINT tva_config_singleton CHECK (id = 1),
  CONSTRAINT tva_config_regime_check CHECK (regime IN ('normal','simplifie','non_assujetti'))
);

-- Seed de la config par défaut (Congo : TVA normale 18%, réduite 5%).
INSERT INTO "${schema_name}".tva_config (id, taux_normal, taux_reduit, regime) VALUES
  (1, 18.00, 5.00, 'normal')
ON CONFLICT (id) DO NOTHING;

-- ========== COMPTES PERSONNALISES / OVERRIDES ==========
-- Chaque tenant peut :
--  - Ajouter un compte personnalisé (type='custom') qui vient enrichir le
--    plan SYSCOHADA officiel (ex: 40110001 pour un fournisseur specifique).
--  - Désactiver un compte standard SYSCOHADA (type='disabled') pour qu'il
--    n'apparaisse plus dans les suggestions de saisie ni les états.
-- Le merge plan officiel + overrides tenant se fait côté serveur dans
-- /api/plan-comptable-fusionne.
CREATE TABLE IF NOT EXISTS "${schema_name}".comptes_custom (
  id SERIAL PRIMARY KEY,
  numero VARCHAR(20) NOT NULL UNIQUE,
  libelle VARCHAR(200),
  classe SMALLINT,
  sens VARCHAR(20),
  type VARCHAR(20) NOT NULL DEFAULT 'custom',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  CONSTRAINT comptes_custom_type_check CHECK (type IN ('custom','disabled')),
  CONSTRAINT comptes_custom_sens_check CHECK (sens IS NULL OR sens IN ('debiteur','crediteur','mixte'))
);

CREATE INDEX IF NOT EXISTS idx_comptes_custom_numero ON "${schema_name}".comptes_custom(numero);
CREATE INDEX IF NOT EXISTS idx_comptes_custom_type ON "${schema_name}".comptes_custom(type);
