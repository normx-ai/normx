/**
 * Intercepteur global fetch :
 * 1. force credentials: 'include' sur les requetes vers /api (cookies httpOnly)
 * 2. injecte automatiquement le token CSRF sur les mutations (POST/PUT/DELETE/PATCH)
 * 3. injecte X-Client-Slug depuis le module api.ts si un client est actif.
 *    Ceci est un mecanisme transitoire : a mesure que les composants migrent
 *    vers cabinetFetch/clientFetch (src/lib/api.ts), cette injection globale
 *    deviendra inutile et sera supprimee.
 */

import { getApiClientSlug } from './lib/api';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

function getCsrfToken(): string {
  const match = document.cookie.match(/(?:^|;\s*)XSRF-TOKEN=([^;]*)/);
  return match ? decodeURIComponent(match[1]) : '';
}

function isApiRequest(input: RequestInfo | URL): boolean {
  if (typeof input === 'string') return input.startsWith('/api') || input.includes('/api/');
  if (input instanceof URL) return input.pathname.startsWith('/api');
  if (input instanceof Request) return input.url.includes('/api');
  return false;
}

const originalFetch = window.fetch.bind(window);

window.fetch = function (input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const method = (init?.method || 'GET').toUpperCase();
  const apiCall = isApiRequest(input);

  if (apiCall) {
    const headers = new Headers(init?.headers);

    // credentials: 'include' pour envoyer les cookies httpOnly
    if (!init?.credentials) {
      init = { ...init, credentials: 'include' };
    }

    // X-Client-Slug : injecte le slug du client actif si present et pas
    // deja defini (cabinetFetch pose explicitement un header vide pour
    // signaler qu'il ne veut PAS de slug — voir lib/api.ts).
    if (!headers.has('X-Client-Slug')) {
      const slug = getApiClientSlug();
      if (slug) {
        headers.set('X-Client-Slug', slug);
      }
    }

    // CSRF sur les mutations
    if (!SAFE_METHODS.has(method)) {
      const csrf = getCsrfToken();
      if (csrf && !headers.has('X-XSRF-TOKEN')) {
        headers.set('X-XSRF-TOKEN', csrf);
      }
    }

    init = { ...init, headers };
  }

  return originalFetch(input, init);
};
