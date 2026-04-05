/**
 * Routes Auth - Proxy Keycloak avec cookies httpOnly
 * Remplace le stockage localStorage cote client
 */

import express, { Request, Response } from 'express';
import logger from '../logger';

const router = express.Router();

const KEYCLOAK_URL = process.env.KEYCLOAK_URL || 'http://localhost:8080';
const KEYCLOAK_REALM = process.env.KEYCLOAK_REALM || 'normx';
const KEYCLOAK_CLIENT_ID = process.env.KEYCLOAK_CLIENT_ID || 'normx-app';
const TOKEN_URL = `${KEYCLOAK_URL}/realms/${KEYCLOAK_REALM}/protocol/openid-connect/token`;

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/',
};

// POST /api/auth/callback - Echange le code Keycloak contre des tokens (stockes en cookies)
router.post('/callback', async (req: Request, res: Response) => {
  const { code, redirect_uri } = req.body;
  if (!code || !redirect_uri) {
    return res.status(400).json({ error: 'code et redirect_uri requis.' });
  }

  try {
    const response = await fetch(TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: KEYCLOAK_CLIENT_ID,
        code,
        redirect_uri,
      }),
    });

    if (!response.ok) {
      const body = await response.text();
      logger.error('Keycloak token exchange failed: ' + body);
      return res.status(401).json({ error: 'Echange de code echoue.' });
    }

    const tokens = await response.json() as { access_token: string; refresh_token: string; expires_in: number };

    res.cookie('normx_access_token', tokens.access_token, {
      ...COOKIE_OPTIONS,
      maxAge: tokens.expires_in * 1000,
    });
    res.cookie('normx_refresh_token', tokens.refresh_token, {
      ...COOKIE_OPTIONS,
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 jours
    });

    // Retourner les infos utilisateur (sans le token brut)
    const payload = JSON.parse(
      Buffer.from(tokens.access_token.split('.')[1], 'base64').toString()
    );

    res.json({
      user: {
        sub: payload.sub,
        email: payload.email || '',
        name: payload.name || '',
        preferred_username: payload.preferred_username || '',
        roles: payload.realm_access?.roles || [],
      },
      expires_in: tokens.expires_in,
    });
  } catch (err) {
    logger.error('Auth callback error: ' + (err instanceof Error ? err.message : String(err)));
    res.status(500).json({ error: 'Erreur interne.' });
  }
});

// POST /api/auth/refresh - Rafraichit le token via le refresh_token en cookie
router.post('/refresh', async (req: Request, res: Response) => {
  const refreshToken = req.cookies?.normx_refresh_token;
  if (!refreshToken) {
    return res.status(401).json({ error: 'Pas de refresh token.' });
  }

  try {
    const response = await fetch(TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        client_id: KEYCLOAK_CLIENT_ID,
        refresh_token: refreshToken,
      }),
    });

    if (!response.ok) {
      res.clearCookie('normx_access_token', { path: '/' });
      res.clearCookie('normx_refresh_token', { path: '/' });
      return res.status(401).json({ error: 'Refresh echoue.' });
    }

    const tokens = await response.json() as { access_token: string; refresh_token: string; expires_in: number };

    res.cookie('normx_access_token', tokens.access_token, {
      ...COOKIE_OPTIONS,
      maxAge: tokens.expires_in * 1000,
    });
    res.cookie('normx_refresh_token', tokens.refresh_token, {
      ...COOKIE_OPTIONS,
      maxAge: 30 * 24 * 60 * 60 * 1000,
    });

    const payload = JSON.parse(
      Buffer.from(tokens.access_token.split('.')[1], 'base64').toString()
    );

    res.json({
      user: {
        sub: payload.sub,
        email: payload.email || '',
        name: payload.name || '',
        preferred_username: payload.preferred_username || '',
        roles: payload.realm_access?.roles || [],
      },
      expires_in: tokens.expires_in,
    });
  } catch (err) {
    logger.error('Auth refresh error: ' + (err instanceof Error ? err.message : String(err)));
    res.status(500).json({ error: 'Erreur interne.' });
  }
});

// POST /api/auth/logout - Supprime les cookies
router.post('/logout', (_req: Request, res: Response) => {
  res.clearCookie('normx_access_token', { path: '/' });
  res.clearCookie('normx_refresh_token', { path: '/' });
  res.json({ message: 'Deconnecte.' });
});

// GET /api/auth/me - Retourne les infos utilisateur depuis le cookie
router.get('/me', (req: Request, res: Response) => {
  const accessToken = req.cookies?.normx_access_token;
  if (!accessToken) {
    return res.status(401).json({ error: 'Non authentifie.' });
  }

  try {
    const payload = JSON.parse(
      Buffer.from(accessToken.split('.')[1], 'base64').toString()
    );

    // Verifier expiration
    if (payload.exp && Date.now() >= payload.exp * 1000) {
      return res.status(401).json({ error: 'Token expire.' });
    }

    res.json({
      sub: payload.sub,
      email: payload.email || '',
      name: payload.name || '',
      preferred_username: payload.preferred_username || '',
      roles: payload.realm_access?.roles || [],
    });
  } catch {
    res.status(401).json({ error: 'Token invalide.' });
  }
});

export default router;
