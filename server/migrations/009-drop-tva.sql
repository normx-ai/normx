-- Migration 009 : suppression du module TVA (non portable OHADA)
-- Date : 2026-04-20
-- Contexte : la TVA differe fortement entre les 17 pays OHADA (taux, structure
-- de declaration, regimes). Le module etait cable sur le cas Congo (18/5 %)
-- et ne sera pas maintenu dans normx. La fiscalite pays-specifique est
-- traitee dans l'app dediee `tax` (normx-ai/tax).
--
-- A executer dans chaque schema tenant existant :
--   SET search_path TO "<schema>"; puis executer ce script.

DROP INDEX IF EXISTS idx_declaration_tva_lignes_declaration;
DROP INDEX IF EXISTS idx_declarations_tva_exercice;

DROP TABLE IF EXISTS declaration_tva_lignes;
DROP TABLE IF EXISTS declarations_tva;
DROP TABLE IF EXISTS tva_config;
