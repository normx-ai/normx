-- Migration: Table rubriques (lignes de paie dynamiques)
-- NormX Paie - Congo-Brazzaville

CREATE TABLE IF NOT EXISTS rubriques (
  id SERIAL PRIMARY KEY,
  entite_id INTEGER NOT NULL,
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
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(entite_id, code)
);

CREATE INDEX IF NOT EXISTS idx_rubriques_entite ON rubriques(entite_id);
CREATE INDEX IF NOT EXISTS idx_rubriques_type ON rubriques(entite_id, type);
