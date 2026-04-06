/**
 * Middleware Module Guard - NormX
 * Verifie que le tenant a souscrit au module demande (compta, etats, paie)
 * avant d'autoriser l'acces aux routes correspondantes.
 */

import { Request, Response, NextFunction } from 'express';
import { createLogger } from '../logger';

const log = createLogger('moduleGuard');

type NormxModule = 'compta' | 'etats' | 'paie';

/**
 * Middleware factory : verifie que le tenant a le module requis.
 * Les modules autorises sont dans req.tenant.settings.modules (string[]).
 *
 * Usage dans index.ts :
 *   app.use("/api/ecritures", ...tenantChain, requireModule('compta'), ecrituresRoutes);
 *   app.use("/api/paie", ...tenantChain, requireModule('paie'), paieRoutes);
 */
export function requireModule(module: NormxModule) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.tenant) {
      res.status(400).json({ error: 'Tenant non resolu.' });
      return;
    }

    const modules = req.tenant.settings?.modules || [];

    if (modules.length === 0) {
      log.warn(`Tenant ${req.tenant.id} (${req.tenant.nom}) sans modules configures, acces ${module} bloque.`);
      res.status(403).json({
        error: `Module "${module}" non souscrit.`,
        code: 'MODULE_NOT_SUBSCRIBED',
      });
      return;
    }

    if (!modules.includes(module)) {
      res.status(403).json({
        error: `Module "${module}" non souscrit. Modules actifs : ${modules.join(', ')}.`,
        code: 'MODULE_NOT_SUBSCRIBED',
      });
      return;
    }

    next();
  };
}

/**
 * Middleware pour routes partagees entre modules (ex: balance utilisee par compta ET etats).
 * Autorise si le tenant a AU MOINS UN des modules listes.
 */
export function requireAnyModule(...requiredModules: NormxModule[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.tenant) {
      res.status(400).json({ error: 'Tenant non resolu.' });
      return;
    }

    const modules = req.tenant.settings?.modules || [];

    if (modules.length === 0) {
      res.status(403).json({
        error: 'Aucun module souscrit.',
        code: 'MODULE_NOT_SUBSCRIBED',
      });
      return;
    }

    const hasAny = requiredModules.some(m => modules.includes(m));
    if (!hasAny) {
      res.status(403).json({
        error: `Aucun des modules requis (${requiredModules.join(', ')}) n'est souscrit.`,
        code: 'MODULE_NOT_SUBSCRIBED',
      });
      return;
    }

    next();
  };
}
