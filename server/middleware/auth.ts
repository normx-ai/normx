import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import jwksClient from 'jwks-rsa';

export interface UserToken {
  sub: string;
  email: string;
  name: string;
  preferred_username: string;
  roles: string[];
  tenantSlug: string;
  tenantId: string;
  subscriptions: string[];
}

const KEYCLOAK_URL = process.env.KEYCLOAK_URL || 'http://localhost:8080';
const KEYCLOAK_REALM = process.env.KEYCLOAK_REALM || 'normx';
const JWKS_URI = `${KEYCLOAK_URL}/realms/${KEYCLOAK_REALM}/protocol/openid-connect/certs`;
const ISSUER = `${KEYCLOAK_URL}/realms/${KEYCLOAK_REALM}`;

const client = jwksClient({
  jwksUri: JWKS_URI,
  cache: true,
  cacheMaxAge: 600000, // 10 minutes
  rateLimit: true,
});

function getSigningKey(header: jwt.JwtHeader, callback: jwt.SigningKeyCallback): void {
  if (!header.kid) {
    callback(new Error('JWT header missing kid'));
    return;
  }
  client.getSigningKey(header.kid, (err, key) => {
    if (err) { callback(err); return; }
    const signingKey = key?.getPublicKey();
    callback(null, signingKey);
  });
}

interface KeycloakPayload {
  sub: string;
  email?: string;
  name?: string;
  preferred_username?: string;
  realm_access?: { roles: string[] };
  resource_access?: Record<string, { roles: string[] }>;
  tenant_slug?: string;
  tenantSlug?: string;
  tenant_id?: string;
  tenantId?: string;
  role?: string;
  subscribed_products?: string;
  iat: number;
  exp: number;
}

const APP_ROLES = ['admin', 'comptable', 'gestionnaire_paie', 'reviseur', 'gestionnaire', 'lecture_seule', 'employe'];

function extractRoles(payload: KeycloakPayload): string[] {
  if (payload.role && APP_ROLES.includes(payload.role)) {
    return [payload.role];
  }

  const realmRoles = payload.realm_access?.roles || [];
  const appRoles = realmRoles.filter(r => APP_ROLES.includes(r));
  if (appRoles.length > 0) return appRoles;

  const clientRoles = payload.resource_access?.['normx-app']?.roles || [];
  const clientAppRoles = clientRoles.filter(r => APP_ROLES.includes(r));
  if (clientAppRoles.length > 0) return clientAppRoles;

  return ['employe'];
}

function extractTenantSlug(payload: KeycloakPayload): string {
  return payload.tenant_slug || payload.tenantSlug || '';
}

function extractTenantId(payload: KeycloakPayload): string {
  return payload.tenant_id || payload.tenantId || '';
}

export async function authenticateToken(req: Request, res: Response, next: NextFunction): Promise<void> {
  // Accepter le token depuis le header Authorization OU le cookie httpOnly
  const authHeader = req.headers.authorization;
  let token: string | undefined;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1];
  } else if (req.cookies?.normx_access_token) {
    token = req.cookies.normx_access_token;
  }

  if (!token) {
    res.status(401).json({ error: 'Token manquant.' });
    return;
  }

  try {
    const decoded = await new Promise<KeycloakPayload>((resolve, reject) => {
      jwt.verify(token, getSigningKey, {
        algorithms: ['RS256'],
        issuer: ISSUER,
      }, (err, payload) => {
        if (err) reject(err);
        else resolve(payload as KeycloakPayload);
      });
    });

    // Parse subscribed_products: "normx,tax" -> ["normx", "tax"]
    const rawSubs = decoded.subscribed_products || '';
    const subscriptions = rawSubs ? rawSubs.split(',').map((s: string) => s.trim()).filter(Boolean) : [];

    req.user = {
      sub: decoded.sub,
      email: decoded.email || '',
      name: decoded.name || '',
      preferred_username: decoded.preferred_username || '',
      roles: extractRoles(decoded),
      tenantSlug: extractTenantSlug(decoded),
      tenantId: extractTenantId(decoded),
      subscriptions,
    };
    next();
  } catch {
    res.status(401).json({ error: 'Token invalide ou expire.' });
  }
}

export function requireRole(role: string) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user || !req.user.roles.includes(role)) {
      res.status(403).json({ error: 'Acces interdit.' });
      return;
    }
    next();
  };
}
