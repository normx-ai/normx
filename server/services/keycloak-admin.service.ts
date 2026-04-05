import logger from '../logger';

const KEYCLOAK_URL = process.env.KEYCLOAK_URL || 'http://localhost:8080';
const KEYCLOAK_REALM = process.env.KEYCLOAK_REALM || 'normx';
const ADMIN_USER = process.env.KEYCLOAK_ADMIN_USER || 'admin';
const ADMIN_PASSWORD = process.env.KEYCLOAK_ADMIN_PASSWORD || (() => { throw new Error('KEYCLOAK_ADMIN_PASSWORD env var requise'); })();
const CLIENT_ID = process.env.KEYCLOAK_ADMIN_CLIENT || 'admin-cli';

interface KeycloakUserInput {
  email: string;
  firstName: string;
  lastName: string;
  password: string;
  tenantId: string;
  tenantSlug: string;
  role: string;
}

interface TokenResponse {
  access_token: string;
  expires_in: number;
}

interface KeycloakRole {
  id: string;
  name: string;
}

let _adminToken: string | null = null;
let _adminTokenExpiry = 0;

async function getAdminToken(): Promise<string> {
  const now = Date.now();
  if (_adminToken && now < _adminTokenExpiry) {
    return _adminToken;
  }

  const response = await fetch(`${KEYCLOAK_URL}/realms/master/protocol/openid-connect/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'password',
      client_id: CLIENT_ID,
      username: ADMIN_USER,
      password: ADMIN_PASSWORD,
    }),
  });

  if (!response.ok) {
    throw new Error("Impossible d'obtenir le token admin Keycloak.");
  }

  const data = (await response.json()) as TokenResponse;
  _adminToken = data.access_token;
  _adminTokenExpiry = now + (data.expires_in - 30) * 1000;
  return _adminToken;
}

export async function createKeycloakUser(input: KeycloakUserInput): Promise<string> {
  const token = await getAdminToken();

  const response = await fetch(`${KEYCLOAK_URL}/admin/realms/${KEYCLOAK_REALM}/users`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      username: input.email,
      email: input.email,
      firstName: input.firstName,
      lastName: input.lastName,
      enabled: true,
      emailVerified: false,
      attributes: {
        tenant_id: [input.tenantId],
        tenant_slug: [input.tenantSlug],
      },
      credentials: [{ type: 'password', value: input.password, temporary: false }],
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error('Erreur creation utilisateur Keycloak: ' + body);
  }

  const location = response.headers.get('Location') || '';
  const userId = location.split('/').pop() || '';

  if (input.role) {
    await assignRealmRole(userId, input.role);
  }

  logger.info('Utilisateur Keycloak cree: %s', input.email);
  return userId;
}

export async function assignRealmRole(userId: string, roleName: string): Promise<void> {
  const token = await getAdminToken();

  const rolesResponse = await fetch(`${KEYCLOAK_URL}/admin/realms/${KEYCLOAK_REALM}/roles/${roleName}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!rolesResponse.ok) {
    logger.warn('Role Keycloak introuvable: %s', roleName);
    return;
  }

  const role = (await rolesResponse.json()) as KeycloakRole;

  await fetch(`${KEYCLOAK_URL}/admin/realms/${KEYCLOAK_REALM}/users/${userId}/role-mappings/realm`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify([{ id: role.id, name: role.name }]),
  });
}

export async function deleteKeycloakUser(userId: string): Promise<void> {
  const token = await getAdminToken();
  await fetch(`${KEYCLOAK_URL}/admin/realms/${KEYCLOAK_REALM}/users/${userId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
}
