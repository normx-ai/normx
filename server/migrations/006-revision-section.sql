-- Migration 006: Ajout des colonnes manquantes sur revision_data
-- Date: 2026-04-13
-- Le service revision.service.ts attend section + updated_at, manquants
-- dans le template d'origine (002-tenant-schema-template.sql).
--
-- Note: a executer dans CHAQUE schema tenant existant.
-- Utiliser: SET search_path TO "<schema>"; puis executer ce script.

ALTER TABLE revision_data ADD COLUMN IF NOT EXISTS section VARCHAR(50);
ALTER TABLE revision_data ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();

-- Index unique (exercice_id, section) pour les UPSERT
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'revision_data_exercice_section_key'
      AND conrelid = 'revision_data'::regclass
  ) THEN
    ALTER TABLE revision_data ADD CONSTRAINT revision_data_exercice_section_key UNIQUE (exercice_id, section);
  END IF;
END $$;
