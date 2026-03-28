/**
 * Guards Tenant - NormX
 * Middleware de controle d'acces cabinet → client.
 */

import { Request, Response, NextFunction } from 'express';
import * as tenantService from '../services/tenant.service';
import logger from '../logger';

/**
 * Permet a un cabinet de basculer le contexte vers un de ses clients.
 * Active uniquement si le header X-Client-Slug est present.
 */
export async function switchClientMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const clientSlug = req.headers['x-client-slug'] as string | undefined;
    if (!clientSlug) {
      next();
      return;
    }

    if (!req.isCabinetUser) {
      res.status(403).json({
        error: 'Acces interdit. Seuls les cabinets peuvent acceder aux clients.',
      });
      return;
    }

    const clientTenant = await tenantService.getTenantBySlug(clientSlug);
    if (!clientTenant || clientTenant.parent_id !== req.tenant?.id) {
      res.status(403).json({
        error: "Ce client n'appartient pas a votre cabinet.",
      });
      return;
    }

    // Basculer le contexte vers le client
    req.tenant = clientTenant;
    req.tenantSchema = clientTenant.schema_name;
    await tenantService.setTenantContext(clientTenant.schema_name);

    next();
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error('Erreur switch client middleware: %s', message);
    res.status(500).json({ error: 'Erreur lors du changement de client.' });
  }
}
