/**
 * Intercepteur global fetch :
 * 1. force credentials: 'include' sur les requetes vers /api (cookies httpOnly)
 * 2. injecte automatiquement le token CSRF sur les mutations (POST/PUT/DELETE/PATCH)
 */

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

  // 1. credentials: 'include' par defaut pour /api (envoie les cookies httpOnly)
  if (apiCall && !init?.credentials) {
    init = { ...init, credentials: 'include' };
  }

  // 2. token CSRF sur les mutations
  if (!SAFE_METHODS.has(method)) {
    const csrf = getCsrfToken();
    if (csrf) {
      const headers = new Headers(init?.headers);
      if (!headers.has('X-XSRF-TOKEN')) {
        headers.set('X-XSRF-TOKEN', csrf);
      }
      init = { ...init, headers };
    }
  }

  return originalFetch(input, init);
};
