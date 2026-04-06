/**
 * Middleware Permissions - NormX
 * Verifie les permissions par module et action pour l'utilisateur authentifie.
 */

import { Request, Response, NextFunction } from 'express';
import * as permissionsService from '../services/permissions.service';
import type { ModuleNormx, ActionPermission } from '../services/permissions.service';
import logger from '../logger';

export function requirePermission(module: ModuleNormx, action: ActionPermission) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const schema = req.tenantSchema;
    const userId = req.user?.sub;

    if (!schema || !userId) {
      res.status(403).json({ error: 'Contexte tenant ou utilisateur manquant.' });
      return;
    }

    try {
      const allowed = await permissionsService.hasPermission(schema, userId, module, action);
      if (!allowed) {
        res.status(403).json({ error: `Permission refusee: ${module}/${action}` });
        return;
      }

      next();
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      logger.error('Erreur verification permission: %s', message);
      res.status(500).json({ error: 'Erreur lors de la verification des permissions.' });
    }
  };
}
