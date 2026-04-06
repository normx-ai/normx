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

    // Pas de tenant = onboarding pas encore fait
    if (!tenant) {
      res.status(403).json({ error: 'Onboarding requis.', code: 'ONBOARDING_REQUIRED' });
      return;
    }

    if (!tenant.actif) {
      res.status(403).json({ error: 'Compte désactivé.' });
      return;
    }

    // Verification croisee : le tenantSlug/tenantId du JWT doit correspondre au tenant resolu
    const jwtTenantSlug = req.user.tenantSlug;
    const jwtTenantId = req.user.tenantId;
    if (jwtTenantSlug && jwtTenantSlug !== tenant.slug) {
      logger.warn(
        'Mismatch tenant slug: JWT=%s, resolu=%s (user=%s)',
        jwtTenantSlug, tenant.slug, req.user.sub
      );
      res.status(403).json({ error: 'Incohérence de contexte tenant.' });
      return;
    }
    if (jwtTenantId && String(jwtTenantId) !== String(tenant.id)) {
      logger.warn(
        'Mismatch tenant id: JWT=%s, resolu=%s (user=%s)',
        jwtTenantId, tenant.id, req.user.sub
      );
      res.status(403).json({ error: 'Incohérence de contexte tenant.' });
      return;
    }

    // Attacher au request
    req.tenant = tenant;
    req.tenantSchema = tenant.schema_name;

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
