const KEYCLOAK_URL = process.env.REACT_APP_KEYCLOAK_URL || 'http://localhost:8080';
const KEYCLOAK_REALM = process.env.REACT_APP_KEYCLOAK_REALM || 'normx';
const KEYCLOAK_CLIENT_ID = process.env.REACT_APP_KEYCLOAK_CLIENT_ID || 'normx-app';

export interface KeycloakConfig {
  url: string;
  realm: string;
  clientId: string;
}

export interface KeycloakUser {
  sub: string;
  email: string;
  name: string;
  preferredUsername: string;
  roles: string[];
}

interface TokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
}

interface JwtPayload {
  sub: string;
  email?: string;
  name?: string;
  preferred_username?: string;
  realm_access?: { roles: string[] };
  exp?: number;
}

export function getKeycloakConfig(): KeycloakConfig {
  return {
    url: KEYCLOAK_URL,
    realm: KEYCLOAK_REALM,
    clientId: KEYCLOAK_CLIENT_ID,
  };
}

export function getLoginUrl(redirectUri: string): string {
  const config = getKeycloakConfig();
  const params = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'openid profile email',
  });
  return `${config.url}/realms/${config.realm}/protocol/openid-connect/auth?${params}`;
}

export function getLogoutUrl(redirectUri: string): string {
  const config = getKeycloakConfig();
  const params = new URLSearchParams({
    client_id: config.clientId,
    post_logout_redirect_uri: redirectUri,
  });
  return `${config.url}/realms/${config.realm}/protocol/openid-connect/logout?${params}`;
}

export async function exchangeCode(
  code: string,
  redirectUri: string
): Promise<TokenResponse> {
  const config = getKeycloakConfig();
  const response = await fetch(
    `${config.url}/realms/${config.realm}/protocol/openid-connect/token`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: config.clientId,
        code,
        redirect_uri: redirectUri,
      }),
    }
  );
  if (!response.ok) {
    throw new Error(`Echange de code echoue: ${response.status}`);
  }
  return response.json() as Promise<TokenResponse>;
}

export async function refreshAccessToken(
  token: string
): Promise<TokenResponse> {
  const config = getKeycloakConfig();
  const response = await fetch(
    `${config.url}/realms/${config.realm}/protocol/openid-connect/token`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        client_id: config.clientId,
        refresh_token: token,
      }),
    }
  );
  if (!response.ok) {
    throw new Error(`Rafraichissement du token echoue: ${response.status}`);
  }
  return response.json() as Promise<TokenResponse>;
}

export function parseToken(accessToken: string): KeycloakUser {
  const parts = accessToken.split('.');
  if (parts.length !== 3) {
    throw new Error('Format JWT invalide.');
  }
  const payload = JSON.parse(atob(parts[1])) as JwtPayload;
  return {
    sub: payload.sub,
    email: payload.email || '',
    name: payload.name || '',
    preferredUsername: payload.preferred_username || '',
    roles: payload.realm_access?.roles || [],
  };
}

export function isTokenExpired(accessToken: string): boolean {
  const parts = accessToken.split('.');
  if (parts.length !== 3) return true;
  const payload = JSON.parse(atob(parts[1])) as JwtPayload;
  if (!payload.exp) return true;
  // Consider expired 30 seconds before actual expiry
  return Date.now() >= (payload.exp - 30) * 1000;
}
