/**
 * Guards Tenant - NormX
 * Middleware de controle d'acces cabinet → client.
 */

import { Request, Response, NextFunction } from 'express';
import * as tenantService from '../services/tenant.service';
import pool from '../db';
import { getValidatedSchemaName } from '../utils/tenant.utils';
import logger from '../logger';

/**
 * Permet a un cabinet de basculer le contexte vers un de ses clients.
 * Active uniquement si le header X-Client-Slug est present.
 */
/**
 * Bloque les requetes d'un cabinet qui n'a pas selectionne de client.
 * A utiliser sur les routes de donnees (balance, ecritures, paie, etc.)
 * mais PAS sur les routes de listing (GET /api/entites).
 */
export function requireClientForCabinet(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  if (req.isCabinetUser && req.tenant?.type === 'cabinet') {
    res.status(400).json({
      error: 'Veuillez selectionner un dossier client avant d\'acceder aux donnees.',
      code: 'CLIENT_REQUIRED',
    });
    return;
  }
  next();
}

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

    // Audit log : tracer le switch cabinet → client
    try {
      const cabinetSchema = getValidatedSchemaName(req.tenantSchema!);
      await pool.query(
        `INSERT INTO "${cabinetSchema}".audit_log (utilisateur_id, action, module, entite, entite_id, details, ip_address)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          req.user?.sub || 'unknown',
          'switch_client',
          'admin',
          clientTenant.nom || clientSlug,
          String(clientTenant.id),
          JSON.stringify({ from_tenant: req.tenant?.slug, to_client: clientSlug }),
          req.ip || req.headers['x-forwarded-for'] || 'unknown',
        ]
      );
    } catch (auditErr) {
      logger.warn('Audit log switch client echoue: %s', auditErr instanceof Error ? auditErr.message : String(auditErr));
    }

    // Basculer le contexte vers le client
    req.tenant = clientTenant;
    req.tenantSchema = clientTenant.schema_name;

    next();
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error('Erreur switch client middleware: %s', message);
    res.status(500).json({ error: 'Erreur lors du changement de client.' });
  }
}
