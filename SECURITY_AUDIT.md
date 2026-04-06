# Audit securite multi-utilisateur — NORMX

Date : 2026-04-06
Derniere mise a jour : 2026-04-06 (5 correctifs deployes)

---

## Ce qui est en place

### Authentification (Keycloak)
- Connexion via Keycloak (SSO) avec tokens JWT signes RS256
- Cookies httpOnly + refresh automatique avant expiration
- Validation de signature, issuer et expiration cote serveur

### Isolation des donnees (schema par tenant)
- Chaque entreprise/cabinet a son propre schema PostgreSQL `tenant_<slug>`
- Les requetes SQL sont toujours prefixees par le schema du tenant connecte
- Le nom de schema est valide par regex avant chaque requete (protection injection SQL)
- Requetes parametrees (pas de concatenation de valeurs utilisateur)
- Row-Level Security (RLS) active sur toutes les tables (migration 004)

### Controle d'acces (RBAC)
- 7 roles : admin, comptable, gestionnaire_paie, reviseur, gestionnaire, lecture_seule, employe
- 4 actions par module : lire, creer, modifier, supprimer
- 6 modules : compta, paie, etats, revision, assistant, admin
- Permissions stockees par utilisateur dans le schema du tenant
- Le role admin passe par la table permissions_modules (plus de bypass)

### Cabinet / Client
- Un cabinet peut gerer plusieurs clients
- Relation verifiee par `parent_id` avant tout switch de contexte
- Un cabinet ne peut acceder qu'a ses propres clients
- Chaque switch cabinet → client est trace dans l'audit log

### Rate limiting
- Global : 300 requetes / 15 min (production)
- Auth : 10 requetes / heure
- Assistant IA : 30 requetes / heure

---

## Correctifs deployes (2026-04-06)

### CORRIGE — 1. Row-Level Security (RLS) PostgreSQL
- **Fichiers** : `server/migrations/004-enable-rls.sql`, `server/services/tenant.service.ts`
- RLS active sur toutes les tables du schema tenant (23 tables)
- Applique automatiquement a la creation de chaque nouveau tenant
- Defense en profondeur : meme si le code applicatif est contourne, la DB empeche l'acces cross-tenant
- **Statut** : deploye en production

### CORRIGE — 2. Suppression du bypass admin
- **Fichier** : `server/middleware/permissions.middleware.ts`
- Le role admin ne contourne plus les verifications de permissions
- L'admin passe desormais par la table `permissions_modules` (ou il a deja `allTrue` via `initDefaultPermissions`)
- Un admin mal attribue dans Keycloak n'a plus un acces illimite sans controle
- **Statut** : deploye en production

### CORRIGE — 3. Tokens supprimes de localStorage (migration cookies httpOnly)
- **Fichiers** : `src/auth/KeycloakProvider.tsx`, `src/api.ts`, `src/App.tsx`, `src/components/NotificationBell.tsx`, `src/components/Onboarding.tsx`, `src/dashboard/GestionClients.tsx`
- Plus aucun token stocke dans localStorage (vulnerable XSS)
- Tout passe par cookies httpOnly envoyes automatiquement via `credentials: 'include'`
- Le frontend utilise `/api/auth/me` et `/api/auth/refresh` au lieu de lire localStorage
- Les anciens tokens localStorage sont supprimes automatiquement a la migration
- **Statut** : deploye en production

### CORRIGE — 4. Verification croisee tenant JWT vs tenant resolu
- **Fichier** : `server/middleware/tenant.middleware.ts`
- Le tenantSlug et tenantId du JWT sont compares au tenant resolu depuis la DB
- Si mismatch : acces refuse (403) + warning dans les logs serveur
- Empeche un token trafique de pointer vers un autre tenant
- **Statut** : deploye en production

### CORRIGE — 5. Audit log sur switch cabinet → client
- **Fichier** : `server/middleware/tenant.guards.ts`
- Chaque switch de contexte cabinet → client est trace dans `audit_log`
- Informations loguees : utilisateur, action, client cible, IP, timestamp
- Permet de retracer qui a accede a quel dossier client et quand
- **Statut** : deploye en production

---

## Risques restants (a planifier)

### Moyens

#### 6. Pas de rate limiting par endpoint sur les donnees
- **Fichier** : `server/index.ts`
- Les routes ecritures, balance, paie n'ont que le rate limit global (300/15min)
- Permet l'exfiltration en masse de donnees
- **Recommandation** : ajouter un rate limit specifique par route sensible

#### 7. Pas de protection CSRF explicite
- Les cookies utilisent SameSite=lax (pas Strict)
- Pas de token CSRF sur les requetes qui modifient des donnees
- **Recommandation** : passer en SameSite=Strict ou ajouter un token CSRF

#### 8. Pas de validation tenant.actif avant les permissions
- **Fichier** : `server/middleware/permissions.middleware.ts`
- Si un tenant est desactive, les checks de permissions peuvent echouer silencieusement
- **Recommandation** : verifier `tenant.actif === true` en amont
- Note : le tenant middleware verifie deja `tenant.actif` (ligne 35-38), ce point est partiellement couvert

---

## Matrice de risque (mise a jour)

| Couche | Etat actuel | Risque |
|--------|-------------|--------|
| Authentification | Keycloak + RS256 JWT | Faible |
| Stockage token | Cookies httpOnly uniquement | Faible (corrige) |
| Autorisation | RBAC module/action, admin via DB | Faible (corrige) |
| Multi-tenancy | Schema-par-tenant + RLS PostgreSQL | Faible (corrige) |
| Verification tenant | JWT croise avec DB | Faible (corrige) |
| Cabinet/Client | Verification parent_id + audit log | Faible (corrige) |
| Routes API | Validation schema + requetes parametrees | Faible |
| Audit | Log automatique + switch client | Faible (corrige) |
| Rate limiting | Global + auth specifique | Moyen (donnees non limitees) |
| CSRF | SameSite=lax, pas de token | Moyen |

---

## Plan d'action restant

### Court terme (prochain sprint)
1. Rate limiting par endpoint sur les routes de donnees
2. Ajouter une protection CSRF (token ou SameSite=Strict)

### Moyen terme
3. Validation abonnement a la creation de tenant
4. Piste d'audit detaillee sur les changements de permissions
5. Binding de session (IP, user-agent) pour validation token
