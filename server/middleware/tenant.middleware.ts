/**
 * Middleware Tenant - NormX
 * Auto-cree ou resout le tenant depuis le Keycloak sub.
 * Compatible entreprise et cabinet.
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
    if (!req.user || !req.user.sub) {
      res.status(401).json({ error: 'Utilisateur non authentifié.' });
      return;
    }

    // Slug tenant = Keycloak sub (UUID sans tirets)
    const keycloakSub = req.user.sub;
    const tenantSlug = keycloakSub.replace(/-/g, '_');

    // Chercher le tenant existant
    let tenant = await tenantService.getTenantBySlug(tenantSlug);

    // Auto-créer si premier accès
    if (!tenant) {
      logger.info('Premier accès — création tenant pour %s (%s)', req.user.email, tenantSlug);
      tenant = await tenantService.createTenant({
        slug: tenantSlug,
        nom: req.user.name || req.user.email || 'Mon Entité',
        type: 'enterprise',
        plan: 'trial',
      });
    }

    if (!tenant.actif) {
      res.status(403).json({ error: 'Compte désactivé.' });
      return;
    }

    // Attacher au request
    req.tenant = tenant;
    req.tenantSchema = tenant.schema_name;

    // Configurer le search_path pour cette connexion
    await tenantService.setTenantContext(tenant.schema_name);

    // Si l'utilisateur appartient à un cabinet, charger ses clients accessibles
    if (tenant.type === 'cabinet') {
      req.isCabinetUser = true;
      const clients = await tenantService.getCabinetClients(tenant.id);
      req.accessibleTenants = [tenant.id, ...clients.map((c) => c.id)];
    }

    next();
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const stack = err instanceof Error ? err.stack : '';
    logger.error(`Erreur tenant middleware: ${message}\n${stack}`);
    res.status(500).json({ error: 'Erreur de résolution du tenant.' });
  }
}
