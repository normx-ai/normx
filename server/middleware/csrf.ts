/**
 * Middleware CSRF - Double Submit Cookie
 * Protege les mutations (POST/PUT/DELETE/PATCH) contre les attaques CSRF
 * Le frontend doit lire le cookie XSRF-TOKEN et le renvoyer dans le header X-XSRF-TOKEN
 */

import crypto from 'crypto';
import { Request, Response, NextFunction } from 'express';

const CSRF_COOKIE = 'XSRF-TOKEN';
const CSRF_HEADER = 'x-xsrf-token';
const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

// Routes exclues du CSRF : auth callback/refresh/logout (pas encore de cookie CSRF au premier appel)
const CSRF_EXEMPT_PATHS = ['/api/auth/callback', '/api/auth/refresh', '/api/auth/logout', '/health'];

export function csrfProtection(req: Request, res: Response, next: NextFunction): void {
  // Generer/renouveler le token CSRF si absent
  if (!req.cookies?.[CSRF_COOKIE]) {
    const token = crypto.randomBytes(32).toString('hex');
    res.cookie(CSRF_COOKIE, token, {
      httpOnly: false, // Le frontend doit pouvoir le lire
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
    });
  }

  // Les methodes safe n'ont pas besoin de verification
  if (SAFE_METHODS.has(req.method)) {
    next();
    return;
  }

  // Routes exemptees (auth endpoints qui n'ont pas encore de cookie CSRF)
  if (CSRF_EXEMPT_PATHS.includes(req.path)) {
    next();
    return;
  }

  const cookieToken = req.cookies?.[CSRF_COOKIE];
  const headerToken = req.headers[CSRF_HEADER] as string | undefined;

  if (!cookieToken || !headerToken || cookieToken !== headerToken) {
    res.status(403).json({ error: 'Token CSRF invalide.' });
    return;
  }

  next();
}
