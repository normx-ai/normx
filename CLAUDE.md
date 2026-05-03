# Conventions normx

Notes pour les contributeurs et pour Claude Code.

## Imports absolus (preferer aux chemins relatifs profonds)

`tsconfig.json` definit `baseUrl: "src"` (frontend) et `baseUrl: "server"` (backend).
TypeScript et la majorite des outils resolvent donc les imports absolus depuis ces racines.

Frontend :
```ts
// au lieu de
import { BalanceLigne } from '../../../types';
// preferer
import { BalanceLigne } from 'types';
```

Backend :
```ts
// au lieu de
import { logger } from '../../logger';
// preferer
import { logger } from 'logger';
```

Pas d'alias `@/` configure (cela necessiterait `craco` ou `react-app-rewired`
pour CRA). Si le projet migre vers Vite ou ejecte CRA, ajouter `paths` dans
`tsconfig.json`.

## Erreurs HTTP typees

Toute erreur metier doit lever une sous-classe de `HttpError` (cf. `server/errors/`) :
- `ValidationError` (400)
- `UnauthorizedError` (401)
- `ForbiddenError` (403)
- `NotFoundError` (404)
- `ConflictError` (409)
- `ServiceUnavailableError` (503)

Le middleware central de `server/index.ts` les serialise en `{ error, code, details? }`.
Ne JAMAIS faire `res.status(4xx).json(...)` directement dans une route — lever
l'erreur typee dans le service et laisser `asyncHandler` propager.

## Variables d'environnement

Source unique : `server/config/env.ts`. Validees au boot via Zod.
Ajouter une variable :
1. Declarer dans `EnvSchema`
2. Documenter dans `.env.example`
3. Importer `env` (jamais `process.env`)

## Permissions et acces

- `requirePermission(module, action)` middleware avant chaque route mutating
- `resolveLocalUserId(schema, req.user.sub)` pour passer du sub Keycloak a l'id local
- Verifier l'appartenance des ressources au user dans le service (pas dans la route)

## Logs

Utiliser `createLogger('module')` (frontend) ou `logger` Winston (backend).
Jamais `console.*` direct.

## Tests

- Backend : `npm run test --` (jest + ts-jest), tests dans `server/__tests__/`
- Frontend : `npm test` (react-scripts), tests dans `src/**/__tests__/`
- Mocker `pool` via `jest.mock('../db', ...)` pour isoler les services de la DB

## Migrations DB

- Fichiers numerotes dans `server/migrations/`
- Template tenant : `002-tenant-schema-template.sql` (applique a la creation)
- Migrations versionnees (007+) appliquees via `npm run migrate:tenants`
- Eviter de modifier une migration deja appliquee (drift detecte par checksum)
