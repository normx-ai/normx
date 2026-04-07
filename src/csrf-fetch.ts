/**
 * Intercepteur global fetch — injecte automatiquement le token CSRF
 * sur toutes les requetes de mutation (POST/PUT/DELETE/PATCH)
 */

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

function getCsrfToken(): string {
  const match = document.cookie.match(/(?:^|;\s*)XSRF-TOKEN=([^;]*)/);
  return match ? decodeURIComponent(match[1]) : '';
}

const originalFetch = window.fetch.bind(window);

window.fetch = function (input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const method = (init?.method || 'GET').toUpperCase();

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
