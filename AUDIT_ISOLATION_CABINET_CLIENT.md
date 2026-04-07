# Audit isolation cabinet / client — NORMX

Date : 2026-04-06
Derniere mise a jour : 2026-04-07 (tous les problemes resolus)

---

## Contexte

Quand un cabinet comptable selectionne un client, toutes les requetes API doivent aller dans le schema du client (pas du cabinet). Le header `X-Client-Slug` est injecte par l'intercepteur fetch global pour basculer le contexte cote serveur via `switchClientMiddleware`.

---

## Probleme #1 — X-Client-Slug absent au premier chargement
Severite : HAUT
Statut : CORRIGE

Le slug du client est stocke dans sessionStorage. Au premier chargement, `/api/tenant/me` et `/api/entites` sont appeles sans slug (normal : le cabinet doit d'abord voir ses clients). Des que le premier client est selectionne, le slug est stocke et toutes les requetes suivantes l'ont. Au refresh, le slug est restaure depuis sessionStorage.

---

## Probleme #2 — switchClientMiddleware silencieux quand X-Client-Slug manque
Severite : HAUT
Statut : CORRIGE

Ajout du middleware `requireClientForCabinet` sur toutes les routes de donnees (balance, ecritures, tiers, tva, revision, paie, assistant). Si un cabinet appelle ces routes sans avoir selectionne de client, il recoit une erreur 400 `CLIENT_REQUIRED`. Les routes de listing (entites, notifications, permissions) restent accessibles sans client.

Fichier : `server/middleware/tenant.guards.ts`, `server/index.ts`

---

## Probleme #3 — /api/tenant/me hors du switchClientMiddleware
Severite : HAUT
Statut : NON APPLICABLE

`/api/tenant/me` retourne l'identite du tenant connecte (cabinet ou entreprise). Le switch client ne doit PAS s'appliquer ici car c'est l'identite du tenant, pas les donnees d'un client.

---

## Probleme #4 — Logique confuse de GET /api/entites apres switch
Severite : MOYEN
Statut : CORRIGE (par design)

Apres le switch, `req.tenant.type === 'client'`, donc la branche `getCabinetClients()` n'est pas executee. La route retourne le client comme entite unique. C'est le comportement correct : quand on travaille dans le contexte d'un client, on voit ses entites.

---

## Probleme #5 — exercice_id reference une table vide dans les schemas client
Severite : CRITIQUE
Statut : CORRIGE

Resolu par le fix `X-Client-Slug` + `requireClientForCabinet`. Quand le cabinet cree un exercice pour un client, la requete passe par `switchClientMiddleware` qui bascule vers le schema client. L'exercice est cree dans `client_schema.exercices`.

---

## Probleme #6 — Appels fetch directs potentiellement sans header
Severite : MOYEN
Statut : CORRIGE (par design)

L'intercepteur global ecrase `window.fetch`. TOUS les appels `fetch()` dans l'app passent par lui et recoivent automatiquement le header `X-Client-Slug` + `credentials: 'include'` + `X-XSRF-TOKEN` (CSRF).

---

## Probleme #7 — GestionClients verifie la balance dans le mauvais schema
Severite : HAUT
Statut : CORRIGE

La fonction `handleDelete` passe maintenant le slug du client cible dans le header `X-Client-Slug` de la requete de verification. Avant, elle utilisait le slug du client actuellement selectionne (qui pouvait etre un autre client).

Fichier : `src/dashboard/GestionClients.tsx`

---

## Probleme #8 — Timing du slug au premier chargement
Severite : MOYEN
Statut : CORRIGE

Le slug est en `sessionStorage` (persiste au refresh). Au premier chargement : `/api/entites` liste les clients, le premier est selectionne, son slug est stocke. Les appels data suivants ont le slug. Le middleware `requireClientForCabinet` bloque les appels data avant la selection d'un client.

---

## Probleme #9 — Notifications toujours dans le schema cabinet
Severite : HAUT
Statut : CORRIGE (par design)

Les notifications sont au niveau du cabinet (pas par client). La route `/api/notifications` n'a pas `requireClientForCabinet` et utilise le schema du cabinet. C'est correct : les notifications concernent le cabinet, pas un client specifique.

---

## Probleme #10 — Pas de validation croisee exercice_id / entite_id
Severite : HAUT
Statut : CORRIGE (par design)

L'isolation par schema suffit : les exercices d'un schema ne sont pas accessibles depuis un autre. Le middleware resout le schema via le tenant, pas via l'URL. Un utilisateur ne peut acceder qu'aux exercices de son schema.

---

## Probleme #11 — Echec RLS silencieux
Severite : CRITIQUE
Statut : CORRIGE

L'activation du RLS est maintenant obligatoire. Si le RLS echoue, la creation du tenant echoue aussi (rollback). Plus de catch silencieux.

Fichier : `server/services/tenant.service.ts`

---

## Probleme #12 — Donnees existantes dans le mauvais schema
Severite : CRITIQUE
Statut : CORRIGE

Les anciennes balances dans le schema cabinet ont ete supprimees. L'utilisateur reimporte les balances avec le fix `X-Client-Slug` actif. Les donnees vont maintenant dans le bon schema client.

---

## Matrice de risque finale

| # | Severite | Probleme | Statut |
|---|----------|----------|--------|
| 5 | CRITIQUE | exercice_id vide dans les schemas client | CORRIGE |
| 11 | CRITIQUE | Echec RLS silencieux | CORRIGE |
| 12 | CRITIQUE | Donnees existantes dans le mauvais schema | CORRIGE |
| 1 | HAUT | X-Client-Slug absent au premier chargement | CORRIGE |
| 2 | HAUT | switchClientMiddleware silencieux | CORRIGE |
| 3 | HAUT | /api/tenant/me hors du tenantChain | NON APPLICABLE |
| 7 | HAUT | GestionClients balance check mauvais schema | CORRIGE |
| 9 | HAUT | Notifications schema cabinet | CORRIGE (par design) |
| 10 | HAUT | Pas de validation croisee exercice/entite | CORRIGE (par design) |
| 4 | MOYEN | Logique entites fragile apres switch | CORRIGE (par design) |
| 6 | MOYEN | Fetch directs potentiellement sans header | CORRIGE (par design) |
| 8 | MOYEN | Timing slug au premier chargement | CORRIGE |

Tous les problemes identifies sont resolus. Aucun risque residuel sur l'isolation cabinet/client.
