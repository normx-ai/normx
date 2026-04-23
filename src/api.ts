/**
 * Helper API — utilise les cookies httpOnly (plus de localStorage).
 * Les cookies sont envoyes automatiquement via credentials: 'include'.
 *
 * Ces helpers (apiPost/apiPut/apiDelete) sont utilises uniquement par les
 * ecrans de gestion au niveau CABINET (GestionClients, creation d'exercice
 * cabinet). Ils DOIVENT donc desactiver l'injection automatique du slug
 * client actif faite par csrf-fetch.ts — sinon le backend reoriente la
 * requete vers le schema client au lieu du schema cabinet.
 *
 * Pose d'un header X-Client-Slug vide qui signale au fetch interceptor
 * "ne surtout pas injecter de slug ici" (meme convention que cabinetFetch
 * dans lib/api.ts).
 */

type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };
type JsonBody = Record<string, JsonValue>;

function getCsrfToken(): string {
  const match = document.cookie.match(/(?:^|;\s*)XSRF-TOKEN=([^;]*)/);
  return match ? decodeURIComponent(match[1]) : '';
}

function authHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-Client-Slug': '',
  };
  const csrf = getCsrfToken();
  if (csrf) headers['X-XSRF-TOKEN'] = csrf;
  return headers;
}

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

export async function apiPost<T>(url: string, body: JsonBody): Promise<T> {
  const res = await fetch(url, {
    method: 'POST',
    headers: authHeaders(),
    credentials: 'include',
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({} as { error?: string; code?: string }));
    throw new ApiError(data.error || `Erreur ${res.status}`, res.status, data.code);
  }
  return res.json();
}

export async function apiPut<T>(url: string, body: JsonBody): Promise<T> {
  const res = await fetch(url, {
    method: 'PUT',
    headers: authHeaders(),
    credentials: 'include',
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || `Erreur ${res.status}`);
  }
  return res.json();
}

export async function apiDelete(url: string): Promise<void> {
  const res = await fetch(url, { method: 'DELETE', headers: authHeaders(), credentials: 'include' });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || `Erreur ${res.status}`);
  }
}
