# Audit securite multi-utilisateur — NORMX

Date : 2026-04-06
Derniere mise a jour : 2026-04-07 (13 correctifs deployes — tous les risques critiques et moyens resolus)

---

## Ce qui est en place

### Authentification (Keycloak)
- Connexion via Keycloak (SSO) avec tokens JWT signes RS256
- Cookies httpOnly + SameSite=strict + refresh automatique avant expiration
- Validation de signature, issuer et expiration cote serveur
- Revocation du refresh token cote Keycloak au logout

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
- Routes de donnees : 100 requetes / minute (ecritures, balance, tiers, tva, plan-comptable, revision, paie, rubriques, workflow)

### Protection CSRF
- Double Submit Cookie : le backend genere un cookie `XSRF-TOKEN` (lisible par le JS)
- Le frontend envoie automatiquement le header `X-XSRF-TOKEN` via intercepteur global `fetch`
- Verification cookie vs header sur toutes les mutations (POST/PUT/DELETE/PATCH)
- Cookies SameSite=strict pour les tokens d'authentification

### Securite HTTP
- Helmet.js avec CSP active en dev et en production
- CORS strict avec origines explicites (pas de wildcard)
- Connexion PostgreSQL SSL forcee en production

### Upload de fichiers
- Whitelist MIME (PDF, JPG, PNG, WEBP uniquement)
- Verification magic bytes via `file-type` (le contenu reel doit correspondre)
- Limite de taille : 10 MB
- Stockage en memoire uniquement (pas d'ecriture disque)

### Infrastructure Docker
- Containers executes en tant qu'utilisateur `node` (non-root)
- Credentials Keycloak via variables d'environnement (plus de valeurs hardcodees)
- Variables requises avec `?` : le container refuse de demarrer sans mot de passe

---

## Historique des correctifs

### Deployes le 2026-04-06 (correctifs 1 a 5)

#### CORRIGE — 1. Row-Level Security (RLS) PostgreSQL
- **Fichiers** : `server/migrations/004-enable-rls.sql`, `server/services/tenant.service.ts`
- RLS active sur toutes les tables du schema tenant (23 tables)
- Applique automatiquement a la creation de chaque nouveau tenant
- Defense en profondeur : meme si le code applicatif est contourne, la DB empeche l'acces cross-tenant

#### CORRIGE — 2. Suppression du bypass admin
- **Fichier** : `server/middleware/permissions.middleware.ts`
- Le role admin ne contourne plus les verifications de permissions
- L'admin passe desormais par la table `permissions_modules` (ou il a deja `allTrue` via `initDefaultPermissions`)

#### CORRIGE — 3. Tokens supprimes de localStorage (migration cookies httpOnly)
- **Fichiers** : `src/auth/KeycloakProvider.tsx`, `src/api.ts`, `src/App.tsx`, `src/components/NotificationBell.tsx`, `src/components/Onboarding.tsx`, `src/dashboard/GestionClients.tsx`
- Plus aucun token stocke dans localStorage (vulnerable XSS)
- Tout passe par cookies httpOnly envoyes automatiquement via `credentials: 'include'`

#### CORRIGE — 4. Verification croisee tenant JWT vs tenant resolu
- **Fichier** : `server/middleware/tenant.middleware.ts`
- Le tenantSlug et tenantId du JWT sont compares au tenant resolu depuis la DB
- Si mismatch : acces refuse (403) + warning dans les logs serveur

#### CORRIGE — 5. Audit log sur switch cabinet → client
- **Fichier** : `server/middleware/tenant.guards.ts`
- Chaque switch de contexte cabinet → client est trace dans `audit_log`
- Informations loguees : utilisateur, action, client cible, IP, timestamp

### Deployes le 2026-04-07 (correctifs 6 a 13)

#### CORRIGE — 6. Credentials Keycloak hardcodees
- **Fichier** : `docker/keycloak/docker-compose.keycloak.yml`
- Tous les mots de passe remplaces par des variables d'environnement
- Variables critiques marquees `?` (erreur si absentes au demarrage)
- Fichier `.env.example` ajoute pour documenter les variables requises

#### CORRIGE — 7. SSL PostgreSQL en production
- **Fichier** : `server/db.ts`
- SSL force en production avec `rejectUnauthorized: true` par defaut
- Desactivable via `DB_SSL_REJECT_UNAUTHORIZED=false` si certificat auto-signe

#### CORRIGE — 8. CSP active en dev
- **Fichier** : `server/index.ts`
- Content-Security-Policy active dans tous les environnements (pas seulement production)
- Permet de detecter les violations CSP avant le deploiement

#### CORRIGE — 9. Protection CSRF Double Submit Cookie
- **Fichiers** : `server/middleware/csrf.ts` (nouveau), `src/csrf-fetch.ts` (nouveau), `src/api.ts`, `src/index.tsx`
- Middleware CSRF : genere un cookie `XSRF-TOKEN`, verifie le header `X-XSRF-TOKEN` sur les mutations
- Intercepteur global `fetch` : injecte automatiquement le header CSRF sur toutes les requetes de mutation
- SameSite passe de `lax` a `strict` sur les cookies d'authentification

#### CORRIGE — 10. Rate limiting sur routes de donnees
- **Fichier** : `server/index.ts`
- Rate limiter `dataLimiter` : 100 requetes/minute en production, 500 en dev
- Applique sur : ecritures, balance, plan-comptable, tiers, tva, revision, paie, workflow, rubriques
- Empeche l'exfiltration en masse de donnees

#### CORRIGE — 11. Verification magic bytes sur uploads
- **Fichier** : `server/routes/ocr-import.ts`
- Dependance `file-type@16.5.4` ajoutee
- Le contenu reel du fichier est verifie via magic bytes (pas seulement le MIME declare)
- Rejet si le type detecte ne correspond pas a la whitelist

#### CORRIGE — 12. Revocation token Keycloak au logout
- **Fichier** : `server/routes/auth.ts`
- Le logout envoie le refresh token a l'endpoint Keycloak `/protocol/openid-connect/logout`
- Le token est revoque cote serveur d'authentification (plus seulement suppression des cookies)

#### CORRIGE — 13. Containers Docker non-root
- **Fichiers** : `Dockerfile`, `server/Dockerfile`
- Directive `USER node` ajoutee : les containers s'executent en tant qu'utilisateur non-root
- Reduit le risque d'escalade de privileges en cas de compromission du container

---

## Matrice de risque (mise a jour finale)

| Couche | Etat actuel | Risque |
|--------|-------------|--------|
| Authentification | Keycloak + RS256 JWT + revocation logout | Faible |
| Stockage token | Cookies httpOnly + SameSite=strict | Faible |
| CSRF | Double Submit Cookie + intercepteur global | Faible |
| Autorisation | RBAC module/action, admin via DB | Faible |
| Multi-tenancy | Schema-par-tenant + RLS PostgreSQL | Faible |
| Verification tenant | JWT croise avec DB | Faible |
| Cabinet/Client | Verification parent_id + audit log | Faible |
| Routes API | Validation schema + requetes parametrees | Faible |
| Rate limiting | Global + auth + IA + donnees | Faible |
| Upload fichiers | MIME whitelist + magic bytes + limite taille | Faible |
| Headers HTTP | Helmet CSP + CORS strict | Faible |
| Base de donnees | SSL en production + RLS | Faible |
| Infrastructure | Docker non-root + env vars | Faible |
| Audit | Log automatique + switch client | Faible |

---

## Ameliorations optionnelles (faible priorite)

Ces points ne sont pas des vulnerabilites mais des durcissements supplementaires possibles :

1. **Rate limiter distribue** : utiliser un store Redis au lieu de la memoire (utile uniquement si deploiement multi-instance)
2. **Binding de session** : validation IP/User-Agent sur le token (risque de faux positifs sur mobile)
3. **Piste d'audit detaillee** : logger les changements de permissions et les modifications de configuration
4. **Rotation de cles** : politique de rotation des cles Keycloak et du ENCRYPTION_KEY
5. **Scan antivirus** : integration ClamAV ou VirusTotal sur les uploads (cout operationnel)
