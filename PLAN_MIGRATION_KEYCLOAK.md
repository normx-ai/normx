# Plan de migration — Auth Keycloak SSO

## Keycloak deploye le 28/03/2026

| Element | Detail |
|---------|--------|
| URL | https://auth.normx-ai.com |
| Admin console | https://auth.normx-ai.com/admin/ |
| Admin | admin / NormxKcAdmin2026! |
| Realm | normx (FR par defaut) |
| Clients | normx-tax, normx-app, normx-legal |
| Roles | admin, comptable, fiscaliste, paie, legal, user |
| User test | admin@normx-ai.com / NormxAdmin2026! |

---

## Etat migration — Mis a jour 28/03/2026

| App | Auth avant | Auth apres | Statut |
|-----|-----------|-----------|--------|
| Normx (compta/paie) | Code Keycloak pret | A deployer sur app.normx-ai.com | **Pret** |
| CGI-242 (tax) | ~~JWT custom + OTP + MFA~~ | Keycloak JWKS + role fiscaliste | **FAIT 28/03** |
| Legal | ~~JWT basique~~ | Keycloak JWKS + role legal + auto-creation user | **FAIT 28/03** |
| Brute force | ~~Code maison~~ | Keycloak natif (5 tentatives → 15 min) | **FAIT 28/03** |
| Securite Legal | ~~10 problemes~~ | Tous corriges (rate limiting, CORS, PrismaClient, cleanup, 131 any→0) | **FAIT 28/03** |

---

## Phase 1 — CGI-242 Backend (server/src/)

### A remplacer

| Fichier | Lignes | Action |
|---------|--------|--------|
| `middleware/auth.ts` | 135 | Remplacer par validation JWKS Keycloak |
| `routes/auth.ts` | 1114 | Supprimer — Keycloak gere login/register/OTP/MFA |
| `routes/mfa.routes.ts` | ~80 | Supprimer — MFA dans Keycloak |
| `services/tokenBlacklist.service.ts` | 103 | Supprimer — sessions gerees par Keycloak |
| `services/mfa.service.ts` | 213 | Supprimer |
| `services/mfa.backup.service.ts` | ~50 | Supprimer |
| `utils/jwt.ts` | ~50 | Remplacer par JWKS client (jwks-rsa) |
| `schemas/auth.schema.ts` | 69 | Simplifier ou supprimer |
| `app.ts` | 2 lignes | Retirer les routes auth/mfa custom |

### A garder

| Fichier | Raison |
|---------|--------|
| `services/email.service.ts` | Notifications non-auth (alertes, rappels) |
| `middleware/requireAdmin.ts` | Adapter pour lire les roles Keycloak |
| `middleware/orgRole.middleware.ts` | Adapter pour lire les roles Keycloak |
| `middleware/subscription.middleware.ts` | Garder tel quel |
| `routes/user.routes.ts` | Adapter — profil depuis token Keycloak |

### Nouveau middleware auth (a creer)

```typescript
// middleware/keycloak-auth.ts
// Valide le token JWT Keycloak via JWKS (cles publiques)
// Extrait user, roles, email depuis le token
// Pas besoin de secret — verification par cle publique
```

---

## Phase 2 — CGI-242 Frontend (mobile/)

### A remplacer

| Fichier | Action |
|---------|--------|
| `lib/store/auth.ts` | Remplacer par Keycloak store (token, user, isAuthenticated) |
| `lib/api/auth.ts` | Supprimer — plus besoin d'appeler /auth/* |
| `lib/api/mfa.ts` | Supprimer — MFA dans Keycloak |
| `lib/api/client.ts` | Modifier interceptors — token Keycloak dans header |
| `lib/hooks/useSessionHeartbeat.ts` | Supprimer ou adapter (Keycloak gere les sessions) |

### Ecrans auth a remplacer (app/(auth)/)

| Ecran | Action |
|-------|--------|
| `index.tsx` (email) | Remplacer par redirect Keycloak |
| `password.tsx` | Supprimer — Keycloak login page |
| `register.tsx` | Supprimer — Keycloak registration |
| `verify-otp.tsx` | Supprimer — Keycloak OTP |
| `mfa-verify.tsx` | Supprimer — Keycloak TOTP |
| `forgot-password.tsx` | Supprimer — Keycloak reset password |
| `reset-password.tsx` | Supprimer — Keycloak reset password |
| `logout.tsx` | Adapter — Keycloak logout URL |
| `_layout.tsx` | Simplifier |

### Composants a supprimer

| Dossier | Composants |
|---------|-----------|
| `components/auth/` | EmailField, PasswordFields, PasswordStrengthIndicator, OtpInput, TurnstileWidget, AuthLogo |
| `components/securite/` | MfaStatusCard, MfaSetupFlow, BackupCodesDisplay, LogoutAllButton |
| `components/SessionExpiredModal.tsx` | Adapter pour Keycloak |

### Ecrans a adapter

| Ecran | Changement |
|-------|-----------|
| `app/(app)/_layout.tsx` | Utiliser Keycloak isAuthenticated |
| `app/index.tsx` | Redirect Keycloak si pas connecte |
| `app/(app)/securite/index.tsx` | Lien vers Keycloak account (MFA, password) |
| `app/(app)/profil/index.tsx` | User depuis token Keycloak |
| `app/(app)/parametres/index.tsx` | Lien vers Keycloak account |
| `components/Sidebar.tsx` | Logout via Keycloak |

---

## Phase 3 — Legal

| Action | Detail |
|--------|--------|
| Installer keycloak-js | `npx expo install @react-keycloak/web keycloak-js` |
| Creer KeycloakProvider | Copier depuis Normx, adapter clientId = normx-legal |
| Proteger les routes | Redirect si pas authentifie |
| Backend middleware | Copier le nouveau middleware JWKS depuis CGI-242 |

---

## Phase 4 — Normx (compta/paie)

| Action | Detail |
|--------|--------|
| Configurer env vars | REACT_APP_KEYCLOAK_URL=https://auth.normx-ai.com |
| Deployer sur app.normx-ai.com | Nginx + Docker |
| Tester le flow complet | Login → Dashboard → API calls |

---

## Approche technique

### Web (keycloak-js)
```
1. User arrive sur l'app
2. keycloak.init() verifie si token valide
3. Si pas de token → redirect vers auth.normx-ai.com/realms/normx/...
4. User se connecte sur Keycloak (login/register/OTP/MFA)
5. Keycloak redirige vers l'app avec un code
6. keycloak-js echange le code contre un token
7. Token stocke en memoire, refresh auto
8. Chaque requete API envoie le token en header Authorization: Bearer
```

### Mobile (expo-auth-session)
```
1. User appuie sur "Se connecter"
2. expo-auth-session ouvre le navigateur systeme
3. User se connecte sur Keycloak
4. Keycloak redirige vers l'app avec un code (deep link)
5. App echange le code contre un token
6. Token stocke dans SecureStore
7. Chaque requete API envoie le token en header
```

### Backend (JWKS)
```
1. API recoit requete avec Authorization: Bearer <token>
2. Middleware telecharge les cles publiques Keycloak (JWKS)
3. Verifie la signature du token avec la cle publique
4. Extrait user_id, email, roles depuis le token
5. req.user = { sub, email, roles }
6. Pas besoin de secret partage — verification asymetrique
```

---

## Ordre d'execution

| # | Tache | Duree estimee |
|---|-------|--------------|
| 1 | CGI-242 backend — nouveau middleware JWKS | 30 min |
| 2 | CGI-242 backend — supprimer routes auth/mfa custom | 15 min |
| 3 | CGI-242 frontend — Keycloak provider + store | 30 min |
| 4 | CGI-242 frontend — supprimer ecrans auth custom | 15 min |
| 5 | CGI-242 frontend — adapter interceptors API | 15 min |
| 6 | CGI-242 frontend — adapter layout et sidebar | 15 min |
| 7 | Build + test | 15 min |
| 8 | Deploy CGI-242 | 10 min |
| 9 | Legal — meme traitement | 45 min |
| 10 | Normx — deploy sur app.normx-ai.com | 30 min |

**Total estime : ~3-4 heures**
