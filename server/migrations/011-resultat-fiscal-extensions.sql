-- Migration 011 : Étend resultat_fiscal_lignes pour supporter les Reports déficitaires
-- et les ARD (Amortissements Réputés Différés) du formulaire IS-2.
-- Placeholder ${schema_name} remplacé par le nom réel du schéma.
-- Idempotente.

-- Ajout colonne metadata (JSONB) pour stocker les infos contextuelles
-- (ex: annee_origine pour un déficit, sous_type pour un ARD).
ALTER TABLE "${schema_name}".resultat_fiscal_lignes
  ADD COLUMN IF NOT EXISTS metadata JSONB NOT NULL DEFAULT '{}'::jsonb;

-- Étend la contrainte CHECK pour inclure les nouveaux types
ALTER TABLE "${schema_name}".resultat_fiscal_lignes
  DROP CONSTRAINT IF EXISTS resultat_fiscal_lignes_type_check;

ALTER TABLE "${schema_name}".resultat_fiscal_lignes
  ADD CONSTRAINT resultat_fiscal_lignes_type_check
  CHECK (type IN ('reintegration', 'deduction', 'deficit_reportable', 'ard'));
