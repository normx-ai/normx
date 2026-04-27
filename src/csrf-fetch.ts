/**
 * Intercepteur global fetch — couche transport unique de l'app :
 *
 *   1. credentials: 'include' sur tous les appels /api (cookies httpOnly).
 *   2. Token CSRF injecte sur les mutations (POST/PUT/DELETE/PATCH).
 *   3. Slug client (X-Client-Slug) injecte si un client est actif.
 *   4. Auto-refresh sur 401 : si une requete /api retourne 401, on tente
 *      un /api/auth/refresh silencieux, puis on rejoue la requete UNE fois.
 *      Plusieurs requetes simultanees partagent le meme refresh en vol
 *      (deduplication via une Promise singleton). Si le refresh echoue,
 *      un evenement 'auth:expired' est dispatche pour que le KeycloakProvider
 *      redirige vers Keycloak login.
 */

import { getApiClientSlug } from './lib/api';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);
const REFRESH_URL = '/api/auth/refresh';

function getCsrfToken(): string {
  const match = document.cookie.match(/(?:^|;\s*)XSRF-TOKEN=([^;]*)/);
  return match ? decodeURIComponent(match[1]) : '';
}

function getRequestUrl(input: RequestInfo | URL): string {
  if (typeof input === 'string') return input;
  if (input instanceof URL) return input.toString();
  return input.url;
}

function isApiRequest(input: RequestInfo | URL): boolean {
  const url = getRequestUrl(input);
  return url.startsWith('/api') || url.includes('/api/');
}

function isRefreshRequest(input: RequestInfo | URL): boolean {
  return getRequestUrl(input).includes(REFRESH_URL);
}

const originalFetch = window.fetch.bind(window);

// Promise singleton du refresh en vol : empeche 10 refreshes simultanes
// quand 10 requetes /api recoivent 401 en parallele.
let refreshInFlight: Promise<boolean> | null = null;

function refreshSession(): Promise<boolean> {
  if (refreshInFlight) return refreshInFlight;
  refreshInFlight = (async () => {
    try {
      const res = await originalFetch(REFRESH_URL, {
        method: 'POST',
        credentials: 'include',
      });
      return res.ok;
    } catch {
      return false;
    } finally {
      // Liberation du lock une fois le resultat propage aux appelants
      refreshInFlight = null;
    }
  })();
  return refreshInFlight;
}

// Notifie le KeycloakProvider qu'une session a expire sans recuperation
// possible : redirection vers Keycloak login.
function notifyAuthExpired(): void {
  window.dispatchEvent(new CustomEvent('auth:expired'));
}

function applyApiHeaders(input: RequestInfo | URL, init?: RequestInit): RequestInit {
  const method = (init?.method || 'GET').toUpperCase();
  const headers = new Headers(init?.headers);

  if (!headers.has('X-Client-Slug')) {
    const slug = getApiClientSlug();
    if (slug) headers.set('X-Client-Slug', slug);
  }

  if (!SAFE_METHODS.has(method)) {
    const csrf = getCsrfToken();
    if (csrf && !headers.has('X-XSRF-TOKEN')) {
      headers.set('X-XSRF-TOKEN', csrf);
    }
  }

  return {
    ...init,
    credentials: init?.credentials || 'include',
    headers,
  };
}

window.fetch = async function (input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  if (!isApiRequest(input)) {
    return originalFetch(input, init);
  }

  const finalInit = applyApiHeaders(input, init);
  const response = await originalFetch(input, finalInit);

  // 401 : une seule chance — refresh silencieux + retry. Si ca echoue
  // encore, on signale l'expiration au provider d'auth pour redirection.
  // /api/auth/refresh lui-meme est exclu pour eviter la boucle infinie.
  if (response.status === 401 && !isRefreshRequest(input)) {
    const refreshed = await refreshSession();
    if (refreshed) {
      // Le cookie d'access_token a ete renouvele : on rejoue la requete.
      return originalFetch(input, applyApiHeaders(input, init));
    }
    notifyAuthExpired();
  }

  return response;
};
