/**
 * requireTenantSchema - NormX
 *
 * Middleware de garde qui :
 *  - refuse la requete si req.tenantSchema est absent (contexte tenant non resolu)
 *  - valide le format du schema via assertSafeSchemaName (defense en profondeur
 *    contre injection SQL dans les raw queries utilisant template literals)
 *
 * A monter APRES tenantMiddleware + switchClientMiddleware, en debut des routes
 * qui requierent un contexte tenant (c.-a-d. la quasi-totalite de /api/*).
 *
 * Factorise les ~72 repetitions de
 *   `if (!schema) return res.status(400).json({ error: 'Contexte tenant manquant.' })`
 * presentes dans les handlers.
 */

import { Request, Response, NextFunction } from 'express';
import { assertSafeSchemaName } from '../utils/tenant.utils';
import logger from '../logger';

export function requireTenantSchema(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const schema = req.tenantSchema;
  if (!schema) {
    res.status(400).json({ error: 'Contexte tenant manquant.' });
    return;
  }
  try {
    assertSafeSchemaName(schema);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error('requireTenantSchema: schema invalide (%s) user=%s', message, req.user?.sub);
    res.status(400).json({ error: 'Contexte tenant invalide.' });
    return;
  }
  next();
}
