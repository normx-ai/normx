-- Migration 010 : Persistance des lignes Résultat Fiscal (Réintégrations / Déductions)
-- Placeholder ${schema_name} remplacé par le nom réel du schéma
-- Applicable aux nouveaux tenants (via template 002) et aux existants.

CREATE TABLE IF NOT EXISTS "${schema_name}".resultat_fiscal_lignes (
  id SERIAL PRIMARY KEY,
  exercice_id INTEGER NOT NULL REFERENCES "${schema_name}".exercices(id) ON DELETE CASCADE,
  type VARCHAR(20) NOT NULL,
  libelle TEXT NOT NULL DEFAULT '',
  montant NUMERIC(15, 2) NOT NULL DEFAULT 0,
  article VARCHAR(50) NOT NULL DEFAULT '',
  ordre INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  CONSTRAINT resultat_fiscal_lignes_type_check CHECK (type IN ('reintegration', 'deduction'))
);

CREATE INDEX IF NOT EXISTS idx_rf_lignes_exercice ON "${schema_name}".resultat_fiscal_lignes(exercice_id);
CREATE INDEX IF NOT EXISTS idx_rf_lignes_exercice_type ON "${schema_name}".resultat_fiscal_lignes(exercice_id, type, ordre);
