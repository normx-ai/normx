/**
 * Helper API — utilise les cookies httpOnly (plus de localStorage)
 * Les cookies sont envoyes automatiquement via credentials: 'include'
 */

type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };
type JsonBody = Record<string, JsonValue>;

function authHeaders(): Record<string, string> {
  return { 'Content-Type': 'application/json' };
}

export async function apiGet<T>(url: string): Promise<T> {
  const res = await fetch(url, { headers: authHeaders(), credentials: 'include' });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || `Erreur ${res.status}`);
  }
  return res.json();
}

export async function apiPost<T>(url: string, body: JsonBody): Promise<T> {
  const res = await fetch(url, {
    method: 'POST',
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
