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

