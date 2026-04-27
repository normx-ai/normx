-- Migration 010 : suppression du module Paie
-- Date : 2026-04-27
-- Contexte : pour le lancement minimum viable de NORMX Etats, on retire
-- le module Paie (bulletins, salaries, rubriques, declarations sociales).
-- La paie sera reintroduite ulterieurement, eventuellement comme produit
-- distinct ou via un partenaire.
--
-- A executer dans chaque schema tenant existant :
--   SET search_path TO "<schema>"; puis executer ce script.
--
-- Tables droppees (CASCADE pour gerer FK et RLS policies) :
--   - bulletins_paie    (bulletins mensuels par salarie)
--   - salaries          (fiche salarie + contrat)
--   - rubriques         (rubriques de paie : gain, retenue, cotisation)
--   - periodes_cloture  (cloture mensuelle de paie)
--
-- Les index et RLS policies associes sont droppes automatiquement
-- via CASCADE.

DROP TABLE IF EXISTS bulletins_paie CASCADE;
DROP TABLE IF EXISTS salaries CASCADE;
DROP TABLE IF EXISTS rubriques CASCADE;
DROP TABLE IF EXISTS periodes_cloture CASCADE;
