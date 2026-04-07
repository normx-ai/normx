-- Migration 005: Index de performance supplementaires
-- Date: 2026-04-07
-- Note: Executer dans chaque schema tenant existant.

-- Index FK manquant sur ecriture_lignes.ecriture_id (critique pour les JOINs)
CREATE INDEX IF NOT EXISTS idx_ecriture_lignes_ecriture ON ecriture_lignes(ecriture_id);

-- Index FK manquant sur exercices.entite_id
CREATE INDEX IF NOT EXISTS idx_exercices_entite ON exercices(entite_id);

-- Index FK manquant sur balance_lignes.balance_id (JOINs revision)
CREATE INDEX IF NOT EXISTS idx_balance_lignes_balance ON balance_lignes(balance_id);

-- Index composite pour filtrage ecritures validees par exercice (requetes balance, grand livre, tableau de bord)
CREATE INDEX IF NOT EXISTS idx_ecritures_exercice_statut ON ecritures(exercice_id, statut);

-- Index partiel pour ecritures validees (les plus requetees)
CREATE INDEX IF NOT EXISTS idx_ecritures_validees ON ecritures(exercice_id, date_ecriture) WHERE statut = 'validee';

-- Index composite ecriture_lignes pour aggregations par compte
CREATE INDEX IF NOT EXISTS idx_ecriture_lignes_ecriture_compte ON ecriture_lignes(ecriture_id, numero_compte);

-- Index composite balance_lignes pour lookup par balance + compte
CREATE INDEX IF NOT EXISTS idx_balance_lignes_balance_compte ON balance_lignes(balance_id, numero_compte);

-- Index pour bulletins_paie lookup par periode (composite)
CREATE INDEX IF NOT EXISTS idx_bulletins_paie_periode ON bulletins_paie(mois, annee, salarie_id);

-- Index pour lettrage (recherche ecritures non lettrees)
CREATE INDEX IF NOT EXISTS idx_ecriture_lignes_lettrage ON ecriture_lignes(tiers_id, lettrage_code);
