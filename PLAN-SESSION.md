# Plan de session — NORMX

Date : 2026-04-13
Scope : recap des travaux et plan d'execution pour les prochaines etapes.

---

## 1. Decision strategique

Apres constat que trois produits etaient deployes simultanement sans qu'aucun soit reellement pret a la vente, changement de strategie : **sequencer les lancements produit par produit** au lieu de tout pousser en parallele.

Ordre de lancement retenu :

1. **NORMX Tax** — produit complet, audit deja fait, proche de la vente
2. **NORMX Finance — module Etats uniquement** — standalone, sans compta ni paie
3. **Compta + Paie** — gelees jusqu'a stabilisation de Tax et Etats

Principe : UN produit polish, premiers clients payants, puis le suivant.

---

## 2. Travaux realises dans la session

### 2.1 Branding et UX

- Remplacement de tous les logos textuels "NORMX" par le vrai `logo-horizontal.png` dans les 3 apps (tax, legal, normx) et les 4 pages legales de app.normx-ai.com
- Landing app.normx-ai.com : stats adaptees Finance, section Tarifs (0€/7j + 1€/mois), 3 nouveaux temoignages focus compta/paie
- Email Keycloak : header passe du bleu fonce au blanc pour que le logo colore soit visible
- Reponses du chat IA justifiees (`textAlign: 'justify'`)

### 2.2 Auth et onboarding

- Fix du callback Keycloak : apres echange du code, redirection vers `/` au lieu de rester bloque sur `/auth/callback`
- Dashboard : priorite `compta > etats > paie` au login (plus tard remplacee par le feature flag `ENABLED_MODULES`)
- Creation de client : modal "Creer l'exercice du cabinet" affiche quand `EXERCICE_REQUIRED` au lieu d'un message cryptique, puis retry auto
- Nouvelle classe `ApiError` qui preserve le champ `code` du serveur pour un handling fin

### 2.3 Wizard Paie — creation d'etablissement

- 2 paliers de grossissement typographique (final : inputs 15px, titres section 17px, titre modal 20px)
- Modal elargi : 960 → 1040px, hauteur 85vh → 88vh
- Persistance du JSONB `data` : avant, banques/contacts/organismes etaient perdus a la relecture. Les 2 handlers (add et update) preservent maintenant tout
- Mode edition : clic sur une ligne → wizard pre-rempli avec `initialData`, PUT `/api/paie/etablissements/:id`
- Types centralises dans `wizardTypes.ts` (plus de `any`/`unknown`)
- Decoupage de `GestionClients.tsx` : 523 → 229 lignes + 3 sous-composants (`ClientsTable`, `ClientFormModal`, `CabinetExerciceModal`)

### 2.4 Etats financiers — Bilan SYSCOHADA

- Detection d'anomalie visuelle : si amortissement > valeur brute (net negatif, impossible en compta) → icone ⚠ rouge + fond rose + tooltip explicatif
- L'indicateur est neutralise a l'export PDF via un etat `isExporting` (pour ne pas polluer le document officiel)
- Decoupage du fichier monolithique : `BilanSYSCOHADA.tsx` 748 → 411 lignes + 4 sous-modules
  - `bilan/bilanSyscohadaData.ts` (143 l.) — mappings actif/passif + rows
  - `bilan/bilanSyscohadaCompute.ts` (105 l.) — fonctions pures de calcul
  - `bilan/BilanActifTable.tsx` (121 l.) — rendu tableau actif + anomalies
  - `bilan/BilanPassifTable.tsx` (62 l.) — rendu tableau passif

### 2.5 Revision et sauvegarde

- Bug "erreur 401" : l'intercepteur global `csrf-fetch.ts` force maintenant `credentials: 'include'` sur toutes les requetes `/api`
- Bug "erreur serveur" suite au 401 : migrations 006 et 007 appliquees a chaud sur les 7 schemas tenant du VPS
  - Migration 006 : `revision_data.section`, `revision_data.updated_at`
  - Migration 007 : `balances.statut`, `balances.revise_par`, `balances.date_revision`, `balances.revision_notes`, `balance_lignes.debit_revise`, `balance_lignes.credit_revise`, `balance_lignes.solde_debiteur_revise`, `balance_lignes.solde_crediteur_revise`, `balance_lignes.note_revision`
- Template `002-tenant-schema-template.sql` mis a jour pour les futurs tenants
- `RevisionKP.tsx` utilise maintenant le logger frontend structure (`createLogger`)

### 2.6 Chat IA (cgi-242)

- Retry automatique (3 tentatives, backoff 1.5s / 3.5s) sur les erreurs `overloaded_error` d'Anthropic
- Messages d'erreur lisibles au lieu du JSON brut
- Detection corrigee : parser du JSON stocke dans `err.message` du SDK Anthropic
- Strip des `**` (gras markdown) cote serveur avant streaming pour garantir zero gras dans les reponses
- Upgrade du modele sur les 3 repos : `claude-sonnet-4-20250514` → `claude-sonnet-4-6`
  - tax : chat fiscal + audit facture
  - normx : assistant compta + OCR import
  - legal : chat juridique OHADA + PDF parser

### 2.7 Infra et deploiement

- Creation du workflow `.github/workflows/deploy.yml` pour le repo infra qui n'existait pas — raison pour laquelle les commits landings / keycloak theme n'etaient jamais deployes
- Secret `VPS_SSH_KEY` ajoute au repo infra via `gh secret set` avec la bonne cle `id_ed25519`
- Deploy automatique : path-based trigger (landings, nginx, keycloak, docker-compose), SSH au VPS, git pull `/opt/infra`, rebuild nginx / restart keycloak selectif

### 2.8 Nettoyage

- Suppression de code mort tracke :
  - `server/routes/rapprochement.ts` + `server/services/rapprochement.service.ts` (route jamais montee)
  - `server/services/entites.service.ts` (export `getEntiteById` jamais importe)
  - Total : ~488 lignes retirees
- Suppression de fichiers/dossiers locaux :
  - `Projet-Final-2-master/` (8.9 MB, backup ancien)
  - `audcif/` (43 MB PDFs)
  - `apps/`, `packages/` (dossiers vides de scaffolding)
  - Total : ~52 MB liberes

### 2.9 Audit pre-vente

- Rapport `AUDIT-PRE-VENTE.md` a la racine de cgi-242
- Verdict : **NOT READY** — 2-3 jours de travail avant vente
- 6 bloquants P0 identifies : webhook Stripe, CVE handlebars, validation SQL, race condition credits, `.env.production` vide, healthcheck nginx
- Points forts documentes : auth Keycloak, pages legales conformes, branding, monitoring, CI/CD

---

## 3. Etat actuel — en cours

### 3.1 Feature flag `ENABLED_MODULES`

Demarre dans cette session, pas encore complet. Objectif : rendre compta et paie completement invisibles et inaccessibles aux users. Seul Etats doit etre visible.

**Fait :**

- `src/config/modules.ts` cree avec `ENABLED_MODULES = ['etats']`
- Helpers `isModuleEnabled()` et `filterEnabledModules()`
- `src/App.tsx` : filtre les modules recus des entites et du tenant au boot

**A faire :**

- `src/dashboard/Dashboard.tsx` : ignorer les modules non actives dans la priorite, bloquer `setActiveModule` sur compta/paie
- `src/dashboard/menuConfig.ts` : masquer les items compta et paie de la sidebar
- `src/dashboard/MainContent.tsx` : router uniquement vers Etats
- `src/dashboard/clients/ClientFormModal.tsx` : le module picker du form de creation/edition client doit proposer uniquement Etats
- Verification : qu'aucune route backend compta/paie ne puisse etre appelee depuis l'UI

---

## 4. Plan d'execution — prochaines etapes

### Phase 1 — NORMX Tax (pret a la vente)

Duree estimee : 2-3 jours

1. Webhook Stripe + transaction atomique credits (bloquants commercialement)
2. `npm audit fix` handlebars/express-rate-limit + whitelist schemas SQL (securite)
3. Remplir `.env.production` + healthcheck nginx sur `/api/health` (fiabilite)
4. Test du parcours complet signup → free trial → paiement → chat IA → export PDF
5. Lancer en beta payante aupres de 10 prospects

### Phase 2 — NORMX Etats standalone

Duree estimee : 3-5 jours (apres audit)

1. Finaliser le feature flag `ENABLED_MODULES` (cf. section 3.1)
2. Audit pre-vente Etats (meme grille que Tax)
3. Parcours e2e : import balance → bilan → CR → notes annexes → PDF
4. Robustesse sur balances imparfaites
5. Les 37 notes annexes : verification individuelle
6. Separation commerciale : landing app.normx-ai.com recentree sur "Etats financiers SYSCOHADA automatises"
7. Tarifs Etats : 5€/mois propose (vs 1€ pour Tax) — a valider

### Phase 3 — Plus tard

Compta et Paie restent en code mais totalement masquees par le feature flag. Zero nouveau dev dessus jusqu'a ce que Tax et Etats soient stables.

---

## 5. Commits de la session

Tous pousses sur les repos concernes :

- `normx-ai/tax` : ~15 commits (branding, logo, chat retry, sonnet-4-6, justify, strip bold, etc.)
- `normx-ai/normx` : ~20 commits (paie wizard, persistance data, dashboard priority, migrations, bilan anomalies, refactor, config/modules)
- `normx-ai/legal` : ~3 commits (logos + sonnet-4-6)
- `normx-ai/infra` : ~5 commits (landings, email header, workflow deploy, secret VPS)

Total : ~43 commits sur 4 repos, tous deployes sur le VPS (51.83.75.203).
