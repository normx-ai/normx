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

## Hooks React custom : stabilite des references

Tout hook custom qui retourne un objet ou un tableau DOIT memoiser son retour :

```ts
// MAUVAIS — nouvelle reference a chaque render, casse les useMemo/useCallback aval
export function useFoo() {
  const { data } = useQuery(...);
  return { foo: data, bar: derived };  // ref change tjrs
}

// BON — ref stable tant que les deps changent pas
export function useFoo() {
  const { data } = useQuery(...);
  return useMemo(() => ({ foo: data, bar: derived }), [data, derived]);
}
```

Pourquoi : si un consommateur fait `useMemo(..., [hookRetour])` ou
`useCallback(..., [hookRetour])`, et que la ref change a chaque render,
toute la chaine en aval est invalidee a chaque render. Ca peut creer
des cascades d'effets infinis qui freeze l'UI (cas vu : useSidebarBadges
non memoise -> MENU_ITEMS recompute -> findMenuItem recree -> useEffect
tire -> setOpenTabs -> re-render -> boucle).

Regle ESLint `react-hooks/exhaustive-deps` activee en error pour signaler
les deps manquantes. Si tu ne veux pas qu'un useEffect re-run quand un
callback change (cas legitime : effet "fire-and-forget" qui lit la
derniere valeur), utilise un `useRef` :

```ts
const fnRef = useRef(fn);
fnRef.current = fn;
useEffect(() => {
  fnRef.current(...);  // lit toujours la derniere version, sans dep
}, [autreDep]);
```

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
