/**
 * Middleware Tenant - NormX
 * Resout le tenant depuis la requete et configure le search_path PostgreSQL.
 */

import { Request, Response, NextFunction } from 'express';
import * as tenantService from '../services/tenant.service';
import logger from '../logger';

export async function tenantMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // Resolution du slug tenant (ordre de priorite) :
    // 1. Header X-Tenant-ID
    // 2. req.user?.tenantSlug (depuis le JWT, pose par auth middleware — futur)
    const tenantSlug = req.headers['x-tenant-id'] as string | undefined;

    if (!tenantSlug) {
      res.status(400).json({ error: 'Tenant non specifie.' });
      return;
    }

    const tenant = await tenantService.getTenantBySlug(tenantSlug);
    if (!tenant || !tenant.actif) {
      res.status(404).json({ error: 'Tenant introuvable.' });
      return;
    }

    // Attacher au request
    req.tenant = tenant;
    req.tenantSchema = tenant.schema_name;

    // Configurer le search_path pour cette connexion
    await tenantService.setTenantContext(tenant.schema_name);

    // Si l'utilisateur appartient a un cabinet, charger ses clients accessibles
    if (tenant.type === 'cabinet') {
      req.isCabinetUser = true;
      const clients = await tenantService.getCabinetClients(tenant.id);
      req.accessibleTenants = [tenant.id, ...clients.map((c) => c.id)];
    }

    next();
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error('Erreur tenant middleware: %s', message);
    res.status(500).json({ error: 'Erreur de resolution du tenant.' });
  }
}
