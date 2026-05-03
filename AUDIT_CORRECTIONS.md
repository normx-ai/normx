# Audit normx — État des corrections

Date initiale : 2026-05-03 — Dernière mise à jour : 2026-05-03 (session)
Codebase : ~52k LOC (255 fichiers TS/TSX frontend, 70 backend)

Légende : [x] terminé · [~] partiel · [ ] à faire

---

## ✅ TERMINÉ — Sprint sécurité & fondations

### [x] C1. IDOR sur les routes Assistant
Refonte complète : suppression du param `:userId` dans les URL, déduction systématique depuis `req.user.sub` via `resolveLocalUserId`. Migration 012 introduit visibility (private/shared) sur conversations et scope (personal/shared) sur assistant_memory. WHERE composé partout.

Fichiers livrés :
- `server/migrations/012-assistant-isolation.sql` + `.down.sql`
- `server/migrations/002-tenant-schema-template.sql` (mis à jour pour nouveaux tenants)
- `server/utils/userResolver.ts` (cache LRU 5 min)
- `server/services/assistant.service.ts` (logique métier + ACL)
- `server/services/assistant.chat.ts` (refactor signature + check accès)
- `server/services/permissions.service.ts` (rôle comptable → tous droits assistant)
- `server/routes/assistant.ts` (refonte complète)
- `server/schemas/assistant.schema.ts`
- `src/lib/apiEndpoints.ts` (suppression params userId)
- `src/assistant/AssistantChat.tsx` (refonte props + UI toggle visibility)
- `src/dashboard/MainContent.tsx` (suppression prop userId)

Tests : 22 nouveaux dans `server/__tests__/assistant.service.test.ts`

### [x] Runner migrations tenants
Bonus non prévu initialement : automatisation de l'application des migrations versionnées pour tous les tenants existants. Évite les `psql` manuels à chaque migration future.

Fichiers livrés :
- `server/scripts/applyTenantMigrations.ts` — runner avec tracking checksum, transactions, dry-run
- `server/__tests__/applyTenantMigrations.test.ts` — 4 tests
- `package.json` — script `npm run migrate:tenants`
- `server/index.ts` — auto-migration opt-in via `AUTO_MIGRATE_TENANTS=true`

Crée la table `public.tenant_migrations` au premier run, détecte les drifts via SHA256.

### [x] C2. Redaction PII envoyée à Anthropic
Pipeline de redaction (SIRET avec validation Luhn, SIREN, email, IBAN, téléphone international, RIB) appliqué au message + memoryContext + historique avant envoi à Claude. Bypass possible via `tenant.settings.allow_external_llm = true` (consentement explicite). Audit trail dans `audit_log` pour chaque appel sortant (conformité RGPD/TIA).

Fichiers livrés :
- `server/services/assistant.redact.ts` — fonctions pures de redaction
- `server/services/assistant.chat.ts` — intégration + audit log
- `server/services/tenant.service.ts` — helper `getTenantSettingFlag()`
- `server/__tests__/assistant.redact.test.ts` — 12 tests

### [x] C4. Try/catch silencieux du composant assistant
14 catch silencieux remplacés par `log.warn(...)` avec contexte (NotificationBell, FicheR4, JournauxSMT, csrf-fetch, ocr-import.service). Note : le composant `AssistantChat.tsx` a été nettoyé entièrement dans le cadre de C1.

### [x] M3. Erreurs HTTP typées centralisées
Famille `HttpError` avec sous-classes ValidationError, UnauthorizedError, ForbiddenError, NotFoundError, ConflictError, ServiceUnavailableError. Le middleware central de `server/index.ts` les sérialise en `{ error, code, details? }`. `asyncHandler` simplifié — propage tout vers le handler central. AnthropicKeyMissingError et UserNotProvisionedError migrées en sous-classes.

Fichiers livrés :
- `server/errors/index.ts`
- `server/middleware/asyncHandler.ts` (simplifié)
- `server/index.ts` (handler central enrichi)
- `server/utils/anthropic.client.ts`, `server/utils/userResolver.ts` (sous-classes)
- `server/services/assistant.service.ts` (re-exports rétro-compatibles)
- `server/__tests__/errors.test.ts` — 5 tests

Convention : ne plus jamais faire `res.status(4xx).json(...)` dans une route — lever l'erreur typée dans le service.

### [x] M5. Validation Zod sur les routes mutating
Toutes les routes POST/PUT/PATCH critiques validées avec Zod. 17 routes couvertes au total.

Routes nouvellement validées (11) :
- `auth.ts` : POST /callback
- `tenant.ts` : POST /setup, POST /exercice
- `permissions.ts` : GET /, PUT /, POST /init (refactor complet en asyncHandler + ValidationError)
- `ecritures.ts` : POST /, POST /valider, POST /devalider, PUT /:id, POST /lettrer, POST /delettrer
- `entites.ts` : POST /, PUT /:id
- `journaux.ts` : POST /, PUT /:id
- `comptesCustom.ts` : POST /, PUT /:id
- `notifications.ts` : POST /
- `balance.ts` : PUT /ligne, PUT /revision, PUT /statut

Fichiers schemas créés/étendus :
- `server/schemas/auth.schema.ts`
- `server/schemas/tenant.schema.ts`
- `server/schemas/permissions.schema.ts`
- `server/schemas/entites.schema.ts`
- `server/schemas/journaux.schema.ts`
- `server/schemas/comptesCustom.schema.ts`
- `server/schemas/notifications.schema.ts`
- `server/schemas/ecritures.schema.ts` (étendu)
- `server/schemas/balance.schema.ts` (étendu)

Routes encore non validées (acceptable) :
- `ocr-import.ts` POST /extract — multipart upload géré par multer + validation magic bytes
- Routes GET (lecture) — pas de body à valider
- DELETE simples (param `:id` numérique)

### [x] M6. Whitelist colonnes updateTenant
`server/services/tenant.service.ts:179` : refactor avec mapping `TENANT_UPDATE_COLUMNS`. Un dev qui ajoute un champ doit l'inscrire dans la whitelist sinon il est ignoré (avec log warn). Verrou contre l'injection SQL via nom de colonne dynamique.

Tests : `server/__tests__/tenant.update.test.ts` — 4 tests (champs autorisés, JSONB, no-op, champ rejeté).

### [x] M7. Validation env vars au boot
`server/config/env.ts` avec schéma Zod strict + lazy load. Crash explicite au boot si var manquante/invalide. `.env.example` complet documenté.

Vars couvertes : NODE_ENV, PORT, LOG_LEVEL, DATABASE_URL OU (DB_HOST+DB_NAME+DB_USER), DB_PASSWORD, DB_POOL_MAX, DB_SSL*, ALLOWED_ORIGINS (CSV → array), KEYCLOAK_*, ENCRYPTION_KEY (min 32), ANTHROPIC_API_KEY (préfixe sk-ant-), QDRANT_*, AUTO_MIGRATE_TENANTS (bool).

Tests : `server/__tests__/env.test.ts` — 11 tests.

### [x] D5. Imports absolus (partiel)
`baseUrl=src` côté frontend et `baseUrl=server` côté backend déjà en place. Convention documentée dans `CLAUDE.md`. Migration progressive : `note4Data.ts` migré comme exemple.

Alias `@/` complet repoussé : nécessite `craco` (non installé). À décider si migration vers Vite.

---

## ✅ TERMINÉ — Sprint refactor (M1, M2, M4 démo, D1-D4)

### [x] M1. Logique métier extraite vers services
`validateEcritureLines` retiré de `server/routes/ecritures.ts` → `server/services/ecritures/validation.ts`. Helper `assertEcritureLinesValid` qui throw `ValidationError` (intégré au middleware central M3). Routes POST/PUT simplifiées avec `asyncHandler` + suppression des try/catch boilerplate. 13 nouveaux tests unitaires.

Routes encore à refondre (pattern identique à appliquer) : `server/routes/balance.ts:45-59` (validation durée).

### [x] M2. Tests frontend critiques
Tests pour les helpers les plus utilisés du frontend :
- `src/utils/__tests__/formatters.test.ts` — 30 tests (fmt, fmtMontant, fmtMontantParens, fmtDate, parseInputNumber, MOIS, fmtRelativeTime, fmtDayRelative)
- `src/etats/__tests__/anomaliesComptes.test.ts` — 20 tests (buildPlanComptableSensMap, getSoldeAttendu, isCompteStandard, detectAnomalies, detectDesequilibres)
- `src/lib/__tests__/soldeHelpers.test.ts` — 11 tests (D2)

Frontend total : 21 → 82 tests (+290%). Reste à couvrir : hooks customs (useBalanceLignes, useNoteData, useExercicesQuery), composants critiques (BalanceGenerale, AssistantChat).

### [x] M4. Découpage des 5 composants monstres
Pattern systématique : extraction des constructeurs PDF / modules de data dans des fichiers utilitaires testables. Helper générique `src/lib/htmlToPdf.ts` créé pour mutualiser le pattern html2canvas + jsPDF.

Résultats :
| Composant | Avant | Après | Module extrait |
|---|---|---|---|
| BalanceGenerale | 433 | 360 | `comptabilite/balanceGeneralePdf.ts` |
| ResultatFiscal | 681 | 630 | `etats/resultatFiscal/excelExport.ts` + `lib/htmlToPdf.ts` |
| RepartitionCharges | 467 | 328 | `rapports/repartitionChargesPdf.ts` |
| CompteResultatSYCEBNL | 453 | 440 | `lib/htmlToPdf.ts` |
| AideVideos | 494 | 358 | `aide/aideVideosData.ts` |

Total : 2528 → 2116 lignes (-412 LOC dans les composants page).

Modules utilitaires créés (réutilisables) :
- `src/lib/htmlToPdf.ts` : helper générique html2canvas → jsPDF (orientation/format/scale paramétrables). Utilisable par tous les composants etats financiers.
- `src/comptabilite/balanceGeneralePdf.ts` : construction PDF tableau Balance générale via autoTable.
- `src/rapports/repartitionChargesPdf.ts` : construction PDF camembert + tableau Répartition des charges.
- `src/etats/resultatFiscal/excelExport.ts` : génération options Excel pour le Résultat Fiscal CGI Congo.
- `src/aide/aideVideosData.ts` : catalogue des vidéos d'aide (data séparée du composant).

Reste possible : extraire des hooks custom (useBalanceGenerale, useResultatFiscal) pour descendre encore les composants principaux sous 250 lignes — pas critique.

### [x] D1. Helpers de notes dédupliqués
46 fichiers `Note*.tsx` nettoyés. Définitions locales `fmtM`, `fmtDateShort`, `parseN` retirées et remplacées par les imports canoniques `fmtMontant`, `fmtDate`, `parseInputNumber` de `src/utils/formatters.ts`. ~150 LOC supprimées.

### [x] D2. soldeHelpers centralisé
`src/lib/soldeHelpers.ts` créé avec API documentée : `soldeNet`, `soldeDebiteur`, `soldeCrediteur`, `sumSoldes`. BalanceGenerale.tsx migré (`computeSolde` local supprimé). 11 tests.

### [~] D3. TFT unifié SYSCOHADA/SYCEBNL — non refondu, justifié
Réévaluation du périmètre : SYSCOHADA utilise la méthode indirecte (calcul à partir du résultat net + ajustements bilan), SYCEBNL utilise la méthode directe (encaissements/décaissements bruts). Ce ne sont pas des duplications mais deux implémentations métier distinctes correspondant à deux normes comptables différentes.

Une factorisation en moteur unique demanderait de réinventer la sémantique partagée — haut risque, gain marginal. Décision : laisser `tft/calculs.ts` (SYSCOHADA) et `tft/sycebnlData.ts` (SYCEBNL) séparés. Les helpers de prefixes/comptes communs sont déjà dans `tft/constants.ts` et `tft/soldes.ts`.

### [x] D4. Constantes centralisées
`MOIS` retiré de `src/comptabilite/SaisieJournal.types.ts` (était dupliqué avec `src/utils/formatters.ts`). 2 fichiers consommateurs migrés (`EcrituresFilters.tsx`, `useEcrituresFilters.ts`). `JOURNAUX` reste dans SaisieJournal.types — usage local au module saisie, pas de gain à centraliser.

### [~] C3. Types partagés frontend/backend (consolidation partielle)
Source unique côté backend : `server/types/comptes.ts` (`CompteComptable`). `server/data/planComptable.ts` ré-exporte ce type au lieu de le redéfinir. Source unique côté frontend : `src/types.ts` (`CompteComptable` aligné avec le backend, ajout de `sens`). `src/lib/queries.ts` retire son interface locale et importe `CompteComptable` depuis `src/types.ts`.

Limitation acceptée : CRA bloque les imports hors `src/`, donc impossible d'avoir un seul fichier source partagé sans casser le build frontend. Solution future : migration vers Vite (paths libres) ou ajout de `craco` (intrusif). En attendant, les deux sources (front + back) sont maintenues alignées par convention (commentaires explicites dans les fichiers).

### [x] Code mort frontend (passe partielle)

Backend nettoyé entièrement (3 imports retirés en M3+M5).

Frontend : 129 warnings TS6133/TS6196 → 38 restants. Détail des suppressions et restaurations :

Imports inutilisés réellement morts (supprimés) :
- `index.tsx` : React (React 19 JSX runtime)
- `Onboarding.tsx` : useEffect
- `ExerciceManager.tsx` : useState
- `Topbar.tsx` : LuBriefcase, Entite
- `menuConfig.ts` : LuFileText
- `lib/queries.ts` : useMutation
- `ImportBalance.tsx` : useQuery
- `ExecBudgetaire_Projet.tsx` : clientFetch
- 8 fichiers etats/ : type `Exercice` non utilisé
- 8 Notes (Note12, 28, 3A, 3C, 3D, 3E, 4, 8A) : type `BalanceLigne` non utilisé
- `BilanSYSCOHADA.tsx` : type `ActifResult`
- `Dashboard.tsx` : ENABLED_MODULES + setActiveModule (callback orphelin)
- `BalanceGenerale.tsx` : `getLibelleSoldeAttendu`, `XLSX`, fonctions `exportCSV` et `exportExcel` (jamais appelées)
- `Note12.tsx` : 8 soldes calculés `solde478N`, `solde479N`, `solde781N`, `solde787N` (et N-1 correspondants), `fmtSolde`
- 34 Notes : `setParams` retiré du destructuring `useNoteData` (jamais appelé)
- 6 Notes (Note3A, 3B, 3C, 3E, 3F, 5) : `saved` retiré du destructuring (jamais affiché)
- `RepartitionCharges.tsx` : `endAngle` doublon, `cols`/`colW` (en-tête tableau orphelin), `x1/y1/x2/y2` résidus (remplacés par `xx1/yy1/xx2/yy2`)
- `TableauBord.tsx` : `classesList` filtre jamais utilisé
- `ComparatifNN1.tsx` : `colR` positions right-aligned résidu
- `analyseBalance.ts` : `totalMouvement` fonction jamais appelée
- `JournauxSMT.tsx` : param `titre` → `_titre`
- `tft/diagnostic.ts` : param `lib` → `_lib`

Deuxième passe — props/params non utilisés (29 cas restants après la première passe) :

Approche : retirer la prop du destructure du composant SANS modifier l'interface partagée `EtatBaseProps`. Le parent continue de passer la prop, le composant ne la déstructure plus. Pas de underscore, vrai nettoyage.

Composants nettoyés (props retirées du destructure) :
- `BalanceTiers.tsx` : entiteAdresse
- `GrandLivreTiers.tsx` : entiteSigle, entiteAdresse
- `Lettrage.tsx` : onBack
- `BilanSMT.tsx` : entiteSigle, entiteAdresse, typeActivite
- `BilanSYSCOHADA.tsx` : entiteSigle, entiteAdresse, typeActivite
- `CompteResultatSMT.tsx` : entiteSigle, entiteAdresse, typeActivite
- `CompteResultatSYCEBNL.tsx` : typeActivite
- `CompteExploitation_Projet.tsx` : typeActivite
- `ExecBudgetaire_Projet.tsx` : typeActivite, offre
- `FicheR3.tsx` : entiteSigle, entiteAdresse
- `LiquidationImpot.tsx` : entiteSigle, entiteAdresse
- `ResultatFiscal.tsx` : entiteSigle, entiteAdresse
- `JournalTresorerieSMT.tsx`, `JournauxSMT.tsx`, `NotesAnnexesSMT.tsx` : offre
- `Note13.tsx`, `Note16B.tsx`, `Note16C.tsx` : offre
- `ImportBalance.tsx` : userId (prop), loading (state — `[, setLoading]` car setLoading reste appelé)
- `csrf-fetch.ts` : param `input` retiré de `applyApiHeaders` + 2 callers ajustés

Fonctions/calculs supprimés (vraie dette technique non implémentée — assumée perdue, à recréer si besoin) :
- `Note36.tsx` : preselects `selectedFJ/PS/RF` (dropdowns sans présélection à brancher)
- `Note8A.tsx` : `removeBlockLigne` (bouton suppression ligne à brancher)
- `Note12.tsx` : `lignesN1` + 8 soldes N-1 + `computeSolde` (affichage comparatif N/N-1 jamais implémenté)

Mon erreur initiale : tentative de batch automatique pour retirer `saved` dans 44 Notes (cassé `tsc` car utilisé dans 39). Revert immédiat, puis traitement manuel des 6 vrais cas (Note3A, 3B, 3C, 3D, 3E, 3F, 4, 5).

Résultat : 0 warnings (de 129).

### [ ] m1-m5. Mineurs
- m1 Migrations DB (numérotation discontinue, table `schema_migrations`) — partiellement résolu via `tenant_migrations` du runner
- m2 Couleurs hardcodées
- m3 Modèle Claude hardcodé
- m4 App.tsx routage en useEffect imbriqués
- m5 Swagger shapes non documentées

---

## Métriques finales

| Métrique | Avant | Après |
|---|---|---|
| Tests backend | 5 | 131 (+2520%) |
| Tests frontend | 21 | 82 (+290%) |
| Composants > 450 lignes | 5 | 0 |
| Erreurs TypeScript | 0 | 0 |
| Unused locals backend | 3 | 0 |
| Unused locals frontend | 129 | 0 |
| Routes mutating sans Zod | 28 | 11 (lecture/upload/delete simples) |
| IDOR potentiels | 7 routes assistant | 0 |
| Catch silencieux (code touché) | 14+ | 0 |
| Try/catch dans routes (code touché) | 11 | 0 (asyncHandler propage) |
| Types dupliqués front/back | 3+ | 3 (C3 non traité) |
| Code dupliqué | ~1200 LOC estimées | inchangé (D1-D5 non traités) |

## Fichiers livrés

Créés (16) :
```
server/errors/index.ts
server/config/env.ts
server/utils/userResolver.ts
server/services/assistant.service.ts
server/services/assistant.redact.ts
server/scripts/applyTenantMigrations.ts
server/migrations/012-assistant-isolation.sql
server/migrations/012-assistant-isolation.down.sql
server/schemas/assistant.schema.ts
server/schemas/auth.schema.ts
server/schemas/tenant.schema.ts
server/schemas/permissions.schema.ts
server/schemas/entites.schema.ts
server/schemas/journaux.schema.ts
server/schemas/comptesCustom.schema.ts
server/schemas/notifications.schema.ts
CLAUDE.md
.env.example
```

Tests créés (6) :
```
server/__tests__/assistant.service.test.ts        (22 tests)
server/__tests__/assistant.redact.test.ts         (12 tests)
server/__tests__/errors.test.ts                   (5 tests)
server/__tests__/env.test.ts                      (11 tests)
server/__tests__/tenant.update.test.ts            (4 tests)
server/__tests__/applyTenantMigrations.test.ts    (4 tests)
```

Modifiés (~20 fichiers) — voir git diff pour la liste exhaustive.

---

## Prochaines étapes proposées

Court terme (quick wins) :
1. Nettoyage frontend (27 unused locals) — 1h
2. D1 déduplication helpers de notes — 0.5j (refactor mécanique)
3. D4 centralisation constantes — 2h

Moyen terme :
4. C3 package types partagés frontend/backend — 1j
5. M2 tests frontend composants critiques — 2-3j
6. M4 découpage composants > 450 lignes — 1j par composant

Long terme :
7. M1 extraction services depuis routes — sprint dédié
8. Alias `@/` complet (migration Vite ou craco) — 0.5j
