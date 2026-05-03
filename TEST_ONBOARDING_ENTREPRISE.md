# Test — Création d'une nouvelle entreprise (onboarding)

Wizard d'inscription pour un compte qui se déclare "Entreprise" (gère sa propre comptabilité), par opposition au flux cabinet qui gère plusieurs clients.

Convention : ☐ = à faire, ✅ = OK, ❌ = KO, ⚠️ = ambigu (avec note).

---

## Pré-requis

- ✅ 0.1 Compte Keycloak créé (auth SSO) — email "Vérifiez votre adresse email" reçu
- ⚠️ 0.1bis Email de vérification arrive en SPAM → liens désactivés par le client mail (Outlook/Gmail). Workaround : marquer comme "non-spam" puis cliquer le lien dans les 5 min. Bug infra à corriger : SPF/DKIM/DMARC sur le domaine émetteur (probablement `noreply@normx-ai.com` via Keycloak SMTP).
- ✅ 0.1ter Lien de vérification cliqué avec succès (compte activé côté Keycloak)
- ✅ 0.2 Première connexion à l'app (aucun tenant existant)
- ⚠️ 0.2bis L'app n'affiche PAS l'onboarding mais l'écran "Abonnement requis" (`App.tsx:166-185`). Cause : middleware `requireSubscription('normx')` (`server/middleware/subscription.middleware.ts`) bloque tant que le token Keycloak ne contient pas `subscribed_products` incluant `normx`. Workaround : `bash keycloak/scripts/grant-trial.sh <email> 30` côté infra puis logout/login. Bug UX : pas de souscription self-service, seulement "Contacter NORMX AI" + "Se déconnecter".
- ✅ 0.2ter Trial 30j accordé (script `grant-trial.sh`) + relogin effectué
- ✅ 0.3 L'app affiche le wizard `Onboarding` automatiquement (détection `onboardingRequired=true` dans `App.tsx:32`)

---

## Étape 1 — Identité de l'entité

Composant : `OnboardingStepEntite.tsx`

- ✅ 1.1 Le champ "Nom de votre entité" est visible avec le placeholder `Ex : OMEGA SERVICES SARL`
- ✅ 1.2 Saisir le nom complet de l'entreprise (NB : le champ n'est PAS pré-rempli avec le nom Keycloak qui est la personne, pas la société)
- ✅ 1.3 Deux tuiles affichées sous "Je suis" : 🏢 Entreprise et 📊 Cabinet comptable
- ✅ 1.4 Cliquer la tuile 🏢 Entreprise (libellé : "Je gère ma propre comptabilité")
- ✅ 1.5 La tuile sélectionnée prend la bordure or (`#D4A843`)
- ✅ 1.6 Le bouton Continuer reste désactivé tant que le nom est vide
- ✅ 1.7 Cliquer Continuer
- ✅ 1.8 Comportement : si plusieurs modules dispo → passe à l'étape 2 ; sinon (single-module) → POST direct + passe étape 3 (`Onboarding.tsx:159-163`)

---

## Étape 2 — Modules (si multi-modules disponibles)

Composant : `OnboardingStepModules.tsx`

- ✅ 2.1 Deux options radio mutuellement exclusives : "Comptabilité complète" et "États financiers uniquement"
- ✅ 2.2 Sélectionner "Comptabilité complète" (saisie + GL + balance + TVA + états + liasse) → backend recevra `['compta']` (compta inclut nativement les états)
- ✅ 2.3 Bouton Terminer s'active quand un mode est choisi
- ✅ 2.4 Cliquer Terminer → POST `/api/tenant/setup` avec `{ nom, type: 'enterprise', modules }`
- ✅ 2.5 NB : `compta` et `etats` sont mutuellement exclusifs (pas combinables)

---

## Étape 3 — Provisionnement serveur (automatique)

Endpoint : `POST /api/tenant/setup` — `server/routes/tenant.ts:33`

- ✅ 3.1 Réponse HTTP 200 (pas d'erreur dans la console)
- ✅ 3.2 Slug du tenant généré depuis l'ID Keycloak (`req.user.sub.replace(/-/g, '_')`)
- ✅ 3.3 INSERT dans `public.tenants` avec `type='enterprise'`, `plan='trial'`
- ✅ 3.4 Schéma Postgres `tenant_<slug>` provisionné (template SQL exécuté)
- ✅ 3.5 Plan comptable SYSCOHADA chargé (1409 comptes seedés)
- ✅ 3.6 Journaux par défaut seedés (AC, VT, CA, BQ, OD)
- ✅ 3.7 Politiques RLS activées sur le schéma
- ✅ 3.8 Settings sauvegardés (modules choisis)
- ✅ 3.9 PAS de self-client auto-créé (branche cabinet uniquement, ligne 72)
- ✅ 3.10 Réponse `{ tenant, onboardingRequired: false }`

---

## Étape 4 — Premier exercice

Composant : `OnboardingStepExercice.tsx`

- ✅ 4.1 Champ Année préfilé avec l'année courante
- ✅ 4.2 Date début préfilée à `<année>-01-01`
- ✅ 4.3 Date fin préfilée à `<année>-12-31`
- ✅ 4.4 Modifier l'année met à jour automatiquement les dates début/fin (`Onboarding.tsx:166-170`)
- ✅ 4.5 Cliquer Créer l'exercice → POST `/api/tenant/exercice` avec `{ annee, date_debut, date_fin }`
- ✅ 4.6 Réponse HTTP 201, INSERT dans `tenant_<slug>.exercices`
- ✅ 4.7 Alternative : cliquer Passer (skip) → onComplete sans exercice

---

## Étape 5 — Sortie du wizard et chargement du dashboard

- ✅ 5.1 `onComplete` déclenché → `window.location.reload()` (`App.tsx:193`)
- ✅ 5.2 L'app recharge en mode dashboard normal
- ✅ 5.3 `App.tsx:32` calcule `onboardingRequired=false` (le tenant existe maintenant)
- ✅ 5.4 Le dashboard se monte avec le tenant entreprise actif

---

## Étape 6 — Vérifications visuelles post-création

- ✅ 6.1 Topbar : nom de l'entité affiché en haut
- ✅ 6.2 Sélecteur d'exercice (top-right) : l'exercice créé est listé et sélectionné
- ✅ 6.3 Sidebar gauche : items Accueil, Saisie (➜ sous-menu), Tiers, États, etc.
- ✅ 6.4 Cliquer Accueil → ComptaDashboard se charge avec KPI à 0 (CA, Résultat, Trésorerie, BFR) et 4 quick actions
- ✅ 6.5 Cliquer Saisie → SaisieJournal vide avec empty state riche (illustration + boutons Créer/Importer + raccourcis Vente/Achat/Banque)
- ✅ 6.6 Cliquer Tiers → liste vide
- ✅ 6.7 Pas de menu "Mes clients" / GestionClients (réservé au type cabinet)

---

## Étape 7 — Vérifications paramètres

- ☐ 7.1 Paramètres → Plan comptable : 1409 comptes SYSCOHADA visibles, endpoint `/api/comptes-custom/plan-fusionne` répond
- ☐ 7.2 Paramètres → Journaux : AC, VT, CA, BQ, OD listés
- ☐ 7.3 Paramètres → TVA : taux par défaut 18% (Congo) modifiable
- ☐ 7.4 Paramètres → Référentiel : SYSCOHADA sélectionné par défaut

---

## Étape 8 — Smoke test création d'écriture

- ☐ 8.1 Saisie → Créer une écriture (overlay s'ouvre)
- ☐ 8.2 Saisir une OD simple : Débit 411000 (1000 FCFA) / Crédit 706000 (1000 FCFA)
- ☐ 8.3 Le solde affiche "Équilibré ✓" en vert
- ☐ 8.4 Cliquer Enregistrer → POST `/api/ecritures` 200/201
- ☐ 8.5 L'écriture apparaît dans la liste avec statut Brouillard
- ☐ 8.6 Stats-bar mise à jour : "1 écriture saisie · 2 comptes mouvementés", Total débit/crédit = 1 000 FCFA
- ☐ 8.7 Cocher l'écriture + cliquer Valider → statut passe à Validée

---

## Résultat partiel

✅ Étapes 0-6 OK — onboarding wizard validé, société créée et dashboard accessible.
☐ Étapes 7-8 à faire — vérifications paramètres + smoke test création d'écriture.
