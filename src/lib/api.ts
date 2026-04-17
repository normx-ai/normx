/**
 * Module API client — gestion explicite du contexte cabinet vs client.
 *
 * Le slug du client actif est stocke dans une variable module-level (pas
 * sessionStorage) et synchronise par App.tsx via setApiClientSlug().
 *
 * Deux fonctions d'appel :
 * - cabinetFetch : PAS de X-Client-Slug → appel au niveau du cabinet
 * - clientFetch  : AVEC X-Client-Slug → appel au niveau du dossier client
 *
 * Le fetch interceptor global (csrf-fetch.ts) injecte le slug par defaut
 * sur les appels /api qui n'ont pas deja le header. C'est un mecanisme
 * transitoire : a mesure que chaque composant migre vers cabinetFetch /
 * clientFetch, l'injection globale deviendra inutile.
 */

let currentClientSlug: string | null = null;

export function setApiClientSlug(slug: string | null): void {
  currentClientSlug = slug;
}

export function getApiClientSlug(): string | null {
  return currentClientSlug;
}

/**
 * Appel API sans contexte client (niveau cabinet).
 * Pose un header X-Client-Slug vide pour empecher le fetch interceptor
 * global de l'injecter automatiquement.
 */
export async function cabinetFetch(path: string, init?: RequestInit): Promise<Response> {
  const headers = new Headers(init?.headers);
  headers.set('X-Client-Slug', '');
  return fetch(path, {
    ...init,
    credentials: 'include',
    headers,
  });
}

/**
 * Appel API avec contexte client (niveau dossier).
 * Injecte explicitement le slug du client actif.
 */
export async function clientFetch(path: string, init?: RequestInit): Promise<Response> {
  const headers = new Headers(init?.headers);
  if (currentClientSlug) {
    headers.set('X-Client-Slug', currentClientSlug);
  }
  return fetch(path, {
    ...init,
    credentials: 'include',
    headers,
  });
}
