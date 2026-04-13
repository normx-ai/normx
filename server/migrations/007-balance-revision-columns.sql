-- Migration 007: Ajout des colonnes de revision sur balances + balance_lignes
-- Date: 2026-04-13
-- Le code applique des "ecritures OD" de revision qui modifient les soldes
-- revises (solde_debiteur_revise, solde_crediteur_revise) et change le
-- statut de la balance. Ces colonnes manquaient au template d'origine.
--
-- Note: a executer dans CHAQUE schema tenant existant.
-- Utiliser: SET search_path TO "<schema>"; puis executer ce script.

-- balances : workflow de revision
ALTER TABLE balances ADD COLUMN IF NOT EXISTS statut VARCHAR(20) DEFAULT 'brut';
ALTER TABLE balances ADD COLUMN IF NOT EXISTS revise_par INTEGER;
ALTER TABLE balances ADD COLUMN IF NOT EXISTS date_revision TIMESTAMP;
ALTER TABLE balances ADD COLUMN IF NOT EXISTS revision_notes TEXT;

-- balance_lignes : colonnes revise (OD revision)
ALTER TABLE balance_lignes ADD COLUMN IF NOT EXISTS debit_revise DECIMAL(15,2);
ALTER TABLE balance_lignes ADD COLUMN IF NOT EXISTS credit_revise DECIMAL(15,2);
ALTER TABLE balance_lignes ADD COLUMN IF NOT EXISTS solde_debiteur_revise DECIMAL(15,2);
ALTER TABLE balance_lignes ADD COLUMN IF NOT EXISTS solde_crediteur_revise DECIMAL(15,2);
ALTER TABLE balance_lignes ADD COLUMN IF NOT EXISTS note_revision TEXT;
