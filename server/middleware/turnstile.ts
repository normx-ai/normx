/**
 * Middleware Turnstile CAPTCHA - NormX
 * Verification Cloudflare Turnstile (web) ou HMAC mobile
 */

import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { createLogger } from '../logger';

const log = createLogger('turnstile');

const TURNSTILE_SECRET_KEY = process.env.TURNSTILE_SECRET_KEY;
const MOBILE_API_SECRET = process.env.MOBILE_API_SECRET;
const SITEVERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';
const IS_PRODUCTION = process.env.NODE_ENV === 'production';
const IS_DEVELOPMENT = process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test';

if (!TURNSTILE_SECRET_KEY) {
  if (IS_PRODUCTION) {
    log.error('TURNSTILE_SECRET_KEY manquante en production — CAPTCHA desactive !');
  } else {
    log.warn('TURNSTILE_SECRET_KEY non configuree — CAPTCHA desactive (dev).');
  }
}

function isAuthenticMobileRequest(req: Request): boolean {
  if (req.headers['x-platform'] !== 'mobile' || !MOBILE_API_SECRET) {
    return false;
  }

  const timestamp = req.headers['x-mobile-timestamp'] as string | undefined;
  const signature = req.headers['x-mobile-signature'] as string | undefined;

  if (!timestamp || !signature) return false;

  const ts = parseInt(timestamp, 10);
  if (isNaN(ts) || Math.abs(Date.now() - ts) > 5 * 60 * 1000) {
    log.warn(`Mobile signature expiree — IP: ${req.ip}`);
    return false;
  }

  const payload = timestamp + ':' + JSON.stringify(req.body || {});
  const expected = crypto.createHmac('sha256', MOBILE_API_SECRET).update(payload).digest('hex');

  try {
    if (!crypto.timingSafeEqual(Buffer.from(signature, 'hex'), Buffer.from(expected, 'hex'))) {
      log.warn(`Mobile signature invalide — IP: ${req.ip}`);
      return false;
    }
  } catch {
    return false;
  }

  return true;
}

export async function verifyTurnstile(req: Request, res: Response, next: NextFunction): Promise<void> {
  if (!TURNSTILE_SECRET_KEY) {
    if (IS_DEVELOPMENT) {
      next();
      return;
    }
    res.status(503).json({ error: 'Service CAPTCHA non configure.' });
    return;
  }

  // Mobile : verification HMAC
  if (req.headers['x-platform'] === 'mobile') {
    if (isAuthenticMobileRequest(req)) {
      delete req.body.turnstileToken;
      next();
      return;
    }
    res.status(403).json({ error: 'Signature mobile invalide.' });
    return;
  }

  // Web : verification Turnstile
  const token: string | undefined = req.body.turnstileToken;

  if (!token) {
    res.status(403).json({ error: 'Verification CAPTCHA requise.' });
    return;
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    const response = await fetch(SITEVERIFY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        secret: TURNSTILE_SECRET_KEY,
        response: token,
        remoteip: req.ip || '',
      }),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    const result = (await response.json()) as { success: boolean; 'error-codes'?: string[] };

    if (!result.success) {
      log.warn(`CAPTCHA echoue — IP: ${req.ip}, errors: ${result['error-codes']?.join(', ') || 'aucune'}`);
      res.status(403).json({ error: 'Verification CAPTCHA echouee.' });
      return;
    }
  } catch (err) {
    log.error('Verification Turnstile impossible: ' + (err instanceof Error ? err.message : String(err)));
    res.status(503).json({ error: 'Service de verification indisponible.' });
    return;
  }

  delete req.body.turnstileToken;
  next();
}
