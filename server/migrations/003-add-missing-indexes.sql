-- Migration 003: Ajout des index manquants pour la performance
-- Date: 2026-04-05
-- Note: Ces index doivent etre executes dans chaque schema tenant existant.
-- Utiliser: SET search_path TO "<schema>"; puis executer ce script.

-- Index sur utilisateurs
CREATE INDEX IF NOT EXISTS idx_utilisateurs_keycloak ON utilisateurs(keycloak_id);
CREATE INDEX IF NOT EXISTS idx_utilisateurs_email ON utilisateurs(email);

-- Index sur tiers (filtrage par type)
CREATE INDEX IF NOT EXISTS idx_tiers_entite_type ON tiers(entite_id, type);

-- Index sur ecritures (recherche par journal et date)
CREATE INDEX IF NOT EXISTS idx_ecritures_journal ON ecritures(journal, exercice_id);
CREATE INDEX IF NOT EXISTS idx_ecritures_date ON ecritures(date_ecriture, exercice_id);

-- Index sur ecriture_lignes
CREATE INDEX IF NOT EXISTS idx_ecriture_lignes_numero_compte ON ecriture_lignes(numero_compte, ecriture_id);
CREATE INDEX IF NOT EXISTS idx_ecriture_lignes_tiers ON ecriture_lignes(tiers_id);

-- Index sur notifications
CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON notifications(utilisateur_id, lu);

-- Index sur salaries
CREATE INDEX IF NOT EXISTS idx_salaries_etablissement ON salaries(etablissement_id);

-- Index sur declarations TVA
CREATE INDEX IF NOT EXISTS idx_declarations_tva_exercice ON declarations_tva(exercice_id);
CREATE INDEX IF NOT EXISTS idx_declaration_tva_lignes_declaration ON declaration_tva_lignes(declaration_id, onglet);

-- Index sur balance_lignes
CREATE INDEX IF NOT EXISTS idx_balance_lignes_numero_compte ON balance_lignes(numero_compte);
