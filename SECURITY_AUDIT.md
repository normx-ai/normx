# Audit securite multi-utilisateur — NORMX

Date : 2026-04-06

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

### Controle d'acces (RBAC)
- 7 roles : admin, comptable, gestionnaire_paie, reviseur, gestionnaire, lecture_seule, employe
- 4 actions par module : lire, creer, modifier, supprimer
- 6 modules : compta, paie, etats, revision, assistant, admin
- Permissions stockees par utilisateur dans le schema du tenant

### Cabinet / Client
- Un cabinet peut gerer plusieurs clients
- Relation verifiee par `parent_id` avant tout switch de contexte
- Un cabinet ne peut acceder qu'a ses propres clients

### Rate limiting
- Global : 300 requetes / 15 min (production)
- Auth : 10 requetes / heure
- Assistant IA : 30 requetes / heure

---

## Risques identifies

### Critiques

#### 1. Pas de Row-Level Security (RLS) PostgreSQL
- **Fichiers** : `server/migrations/001-create-tenants.sql`, `server/migrations/002-tenant-schema-template.sql`
- L'isolation des donnees repose a 100% sur le code applicatif
- Si un bug contourne la validation du schema, un tenant pourrait acceder aux donnees d'un autre
- **Recommandation** : activer les politiques RLS comme filet de securite

#### 2. Le role admin bypass toutes les permissions
- **Fichier** : `server/middleware/permissions.middleware.ts` (ligne 22)
- Un utilisateur avec le role `admin` contourne tous les checks de permissions
- Si le role est mal attribue dans Keycloak, acces total sans restriction
- **Recommandation** : remplacer le bypass par des permissions granulaires

#### 3. Tokens stockes dans localStorage
- **Fichiers** : `src/auth/KeycloakProvider.tsx`, `src/api.ts`
- Les tokens dans localStorage sont vulnerables aux attaques XSS
- Si du JavaScript malveillant s'execute sur la page, il peut voler le token
- **Recommandation** : migrer vers cookies httpOnly uniquement

#### 4. Pas de verification croisee tenant JWT vs tenant resolu
- **Fichier** : `server/middleware/tenant.middleware.ts`
- Le tenant est resolu depuis le `sub` du JWT, mais les claims `tenantSlug`/`tenantId` ne sont pas croises
- Si les claims Keycloak sont modifies, cela pourrait causer un mismatch
- **Recommandation** : verifier que le tenantSlug du token correspond au tenant resolu

### Moyens

#### 5. Pas d'audit log sur le switch cabinet → client
- **Fichier** : `server/middleware/tenant.guards.ts`
- Quand un cabinet switch vers un client, aucune trace n'est enregistree
- **Recommandation** : logger chaque switch avec user, client cible, timestamp, IP

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

---

## Matrice de risque

| Couche | Etat actuel | Risque |
|--------|-------------|--------|
| Authentification | Keycloak + RS256 JWT | Faible |
| Stockage token | localStorage + httpOnly cookies | Moyen |
| Autorisation | RBAC module/action par tenant | Moyen (bypass admin) |
| Multi-tenancy | Schema-par-tenant PostgreSQL | Moyen (pas de RLS) |
| Cabinet/Client | Verification parent_id | Faible |
| Routes API | Validation schema + requetes parametrees | Faible |
| Audit | Log automatique par tenant | Moyen (logs incomplets) |
| Rate limiting | Global + auth specifique | Moyen (donnees non limitees) |

---

## Plan d'action recommande

### Immediat
1. Activer le RLS PostgreSQL comme double verrou
2. Supprimer le bypass admin, passer en permissions granulaires
3. Verifier le tenantSlug JWT vs tenant resolu
4. Supprimer les tokens de localStorage, cookies httpOnly uniquement

### Court terme (sprint en cours)
5. Rate limiting par endpoint sur les routes de donnees
6. Logger tous les switchs cabinet → client
7. Valider tenant.actif avant les permissions
8. Ajouter une protection CSRF

### Moyen terme
9. Validation abonnement a la creation de tenant
10. Piste d'audit detaillee sur les changements de permissions
11. Binding de session (IP, user-agent) pour validation token
