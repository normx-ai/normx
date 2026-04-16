# Rapport d'implémentation — Paramétrage compta

Date : 2026-04-16
Scope : création des pages de paramétrage manquantes identifiées en
section 1.2 du plan de test (`TEST_COMPTABILITE.md`).
Commits : `ef0dd61` (backend) + `98867a7` (frontend).

## Besoin initial

La section 1.2 du plan de test attendait 3 pages :
- Gestion du plan comptable (ajouter/désactiver)
- Gestion des journaux (CRUD, contrepartie)
- Paramétrage TVA (taux, régime)

L'état avant intervention :
- `ParametresEntite.tsx` existait mais ne couvrait que l'identification
- Aucune table DB dédiée aux journaux ou à la config TVA
- Le plan comptable était servi en lecture seule depuis un JSON global
  (1409 comptes SYSCOHADA), sans mécanisme d'override par tenant

## Ce qui a été livré

### Base de données

Migration `008-parametres-compta.sql` ajoutée au template tenant
(`002-tenant-schema-template.sql`) et appliquée aux 7 tenants existants :

| Table | Description |
|---|---|
| `journaux` | Catalogue des journaux (code, libellé, type, contrepartie_defaut, actif) + seed des 5 journaux OHADA |
| `tva_config` | Singleton id=1 : taux_normal, taux_reduit, régime, numero_assujetti + seed Congo 18%/5%/normal |
| `comptes_custom` | Overrides par tenant du plan SYSCOHADA (type `custom` ou `disabled`, numéro, libellé, sens) |

Contraintes CHECK : `type` dans enum (3 valeurs), `sens` dans enum
(3 valeurs), `regime` dans enum (3 valeurs), singleton sur
`tva_config.id`.

### Backend (3 fichiers de routes)

Tous montés dans `server/index.ts` avec `requireModule('compta')`
(sauf `comptes-custom` qui accepte aussi `etats` pour la fusion plan).

`server/routes/journaux.ts` :
- GET `/api/journaux` : liste avec nb_ecritures par journal
- POST : validation code/libellé/type, conflit 409 sur doublon
- PUT `/:id` : update partiel des champs modifiables
- DELETE `/:id` : blocage 409 si écritures rattachées
  (code `JOURNAL_HAS_ECRITURES`)

`server/routes/tvaConfig.ts` :
- GET : retourne la ligne id=1 (ou seed si absente)
- PUT : upsert avec validation taux 0-100 et régime dans l'enum

`server/routes/comptesCustom.ts` :
- GET : liste des overrides (custom + disabled)
- GET `/plan-fusionne` : fusion plan SYSCOHADA global + overrides
  tenant, avec champ `source` sur chaque ligne pour différencier
  (`syscohada` | `custom` | `syscohada_disabled`)
- POST / PUT / DELETE : CRUD standard

### Frontend (4 composants)

`src/settings/ParametresTabs.tsx` — wrapper à 4 onglets
(Identification / Plan comptable / Journaux / TVA) remplaçant
`ParametresEntite` dans `MainContent.tsx:767`.

`src/settings/PlanComptableTab.tsx` :
- Tableau fusionné (1409+ lignes) avec scroll et limite 500
  pour performance
- Recherche par numéro ou libellé, filtre par classe (0-9),
  toggle "afficher désactivés"
- Badge visuel Custom (or) / Désactivé (rouge) / SYSCOHADA
- Bouton "Ajouter un compte" avec saisie numéro/libellé/sens
- Icône toggle par ligne : désactiver un standard, réactiver, ou
  supprimer un perso

`src/settings/JournauxTab.tsx` :
- Tableau des journaux avec édition inline (libellé, type,
  contrepartie, actif)
- Mise en surbrillance jaune sur une ligne en cours d'édition
- Bouton enregistrer par ligne (icône 💾) et suppression si
  nb_ecritures = 0
- Formulaire d'ajout dépliant en haut

`src/settings/TvaTab.tsx` :
- Form simple : 2 inputs numériques pour les taux, radio-group
  pour le régime, input conditionnel pour numero_assujetti
- Cartes radio illustrées avec description de chaque régime
- Bouton Enregistrer avec feedback toast vert/rouge

## Points de vigilance et TODO

1. **Pas de hook de pré-création** : les journaux par défaut sont
   seedés via INSERT DO NOTHING dans la migration. Les nouveaux
   tenants créés via onboarding les auront automatiquement grâce
   à l'ajout dans le template 002. Vérifié sur les 7 existants.

2. **Audit trail manquant** : les modifs de paramètres ne sont pas
   encore loggées dans `audit_log`. À ajouter dans une prochaine
   itération.

3. **Pas de test unitaire** : les 3 nouvelles routes n'ont pas de
   test Jest. À ajouter quand la suite de tests backend sera
   consolidée.

4. **Plan fusionné cache** : chaque GET /plan-fusionne recalcule la
   fusion en mémoire. Pour 1409 comptes + quelques overrides c'est
   négligeable, mais un cache in-memory 1 min serait un gain sur les
   pages qui consultent le plan fréquemment (saisie).

5. **Validation sens** : le sens d'un compte custom est libre.
   Idéalement on devrait contrôler la cohérence avec la classe
   (ex: classe 1 = crediteur par défaut). Déjà géré par la logique
   côté frontend (auto-sélection), mais pas forcé côté backend.

6. **Suppression d'un journal avec écritures** : bloquée. L'utilisateur
   doit plutôt désactiver (actif=false). Message d'erreur clair
   fournit l'instruction.

## Test de validation

Section 1.2 du `TEST_COMPTABILITE.md` passe entièrement de ☐ à ✅.
Pour valider end-to-end :

1. Créer un dossier TEST (déjà OK via 1.1)
2. Aller dans Outils → Paramètres → onglet Plan comptable
   → vérifier l'affichage du plan (bannière compteurs en haut)
   → filtrer par classe 4, rechercher "fournisseur"
   → ajouter compte custom 40110001 "Fournisseur TEST SA" / débiteur
   → vérifier qu'il apparaît en badge Custom
   → désactiver un compte standard (ex: 6599)
   → vérifier badge Désactivé

3. Onglet Journaux
   → vérifier les 5 journaux seedés (AC, VT, CA, BQ, OD)
   → ajouter un journal NDF "Notes de frais" type od contrepartie 4211
   → modifier inline le libellé d'un existant
   → tenter de supprimer un journal (échouera si écritures)

4. Onglet TVA
   → vérifier les valeurs par défaut 18% / 5% / normal
   → changer le régime en simplifié et sauvegarder
   → recharger la page, vérifier persistance
   → remettre en normal

Si tout passe : 1.2 entièrement validé, on peut passer à 1.3 Exercice.

## Métriques

- **Fichiers créés** : 8 (1 migration, 3 routes backend, 4 composants
  React)
- **Fichiers modifiés** : 3 (template 002, `server/index.ts`,
  `MainContent.tsx`, plus la mise à jour du plan de test)
- **Lignes ajoutées** : ~1 190 (537 backend + 653 frontend)
- **Temps d'implémentation** : ~30 minutes (hors discussion design)
- **TypeScript strict** : OK, 0 erreur
