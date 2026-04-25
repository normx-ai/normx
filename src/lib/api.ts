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
 *
 * Les GET concurrents sur la meme URL sont dedupliques : tous les
 * appelants partagent la meme Promise tant qu'elle n'est pas resolue.
 * Indispensable pour la liasse complete ou ~50 notes demandent en
 * parallele les memes endpoints /api/balance — sinon on declenche le
 * rate limiter (429).
 */
const inflightGets = new Map<string, Promise<Response>>();

export async function clientFetch(path: string, init?: RequestInit): Promise<Response> {
  const headers = new Headers(init?.headers);
  if (currentClientSlug) {
    headers.set('X-Client-Slug', currentClientSlug);
  }
  const method = (init?.method || 'GET').toUpperCase();
  const dedupeKey = method === 'GET' ? `${currentClientSlug ?? ''}|${path}` : null;

  if (dedupeKey) {
    const existing = inflightGets.get(dedupeKey);
    if (existing) return existing.then(r => r.clone());
  }

  const promise = fetch(path, {
    ...init,
    credentials: 'include',
    headers,
  }).finally(() => {
    if (dedupeKey) inflightGets.delete(dedupeKey);
  });

  if (dedupeKey) inflightGets.set(dedupeKey, promise);
  return promise.then(r => r.clone());
}

// ==================== JSON helpers + erreurs ====================

export class ApiError extends Error {
  status: number;
  code?: string;
  constructor(message: string, status: number, code?: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
  }
}

type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };
type JsonBody = Record<string, JsonValue>;

async function parseJsonOrError<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const data = await res.json().catch(() => ({} as { error?: string; code?: string }));
    throw new ApiError(data.error || `Erreur ${res.status}`, res.status, data.code);
  }
  return res.json();
}

function withJsonHeaders(init: RequestInit | undefined, method: string, body: JsonBody): RequestInit {
  const headers = new Headers(init?.headers);
  headers.set('Content-Type', 'application/json');
  return { ...init, method, headers, body: JSON.stringify(body) };
}

/**
 * POST/PUT/DELETE JSON au niveau cabinet (sans X-Client-Slug).
 * Parse la reponse JSON, leve ApiError avec code si !ok.
 */
export async function cabinetPost<T>(url: string, body: JsonBody): Promise<T> {
  return parseJsonOrError<T>(await cabinetFetch(url, withJsonHeaders(undefined, 'POST', body)));
}

export async function cabinetPut<T>(url: string, body: JsonBody): Promise<T> {
  return parseJsonOrError<T>(await cabinetFetch(url, withJsonHeaders(undefined, 'PUT', body)));
}

export async function cabinetDelete(url: string): Promise<void> {
  const res = await cabinetFetch(url, { method: 'DELETE' });
  if (!res.ok) {
    const data = await res.json().catch(() => ({} as { error?: string; code?: string }));
    throw new ApiError(data.error || `Erreur ${res.status}`, res.status, data.code);
  }
}
