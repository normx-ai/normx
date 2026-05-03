/**
 * Routes Permissions - NormX
 * CRUD des permissions par module pour chaque utilisateur.
 */

import express, { Request, Response } from 'express';
import * as permissionsService from '../services/permissions.service';
import { asyncHandler } from '../middleware/asyncHandler';
import { validateBody, validateQuery } from '../middleware/validate';
import { ValidationError } from '../errors';
import {
  setPermissionBody,
  initPermissionsBody,
  getPermissionsQuery,
} from '../schemas/permissions.schema';

const router = express.Router();

// GET / ?utilisateur_id=xxx — recuperer les permissions d'un utilisateur
router.get(
  '/',
  validateQuery(getPermissionsQuery),
  asyncHandler(async (req: Request, res: Response) => {
    const schema = req.tenantSchema;
    if (!schema) throw new ValidationError('Contexte tenant manquant.');
    const permissions = await permissionsService.getPermissions(
      schema,
      req.query.utilisateur_id as string,
    );
    res.json({ permissions });
  }),
);

// PUT / — mettre a jour ou creer une permission pour un module
router.put(
  '/',
  validateBody(setPermissionBody),
  asyncHandler(async (req: Request, res: Response) => {
    const schema = req.tenantSchema;
    if (!schema) throw new ValidationError('Contexte tenant manquant.');
    const { utilisateur_id, module: mod, peut_lire, peut_creer, peut_modifier, peut_supprimer } = req.body;
    const permission = await permissionsService.setPermission(schema, utilisateur_id, mod, {
      peut_lire,
      peut_creer,
      peut_modifier,
      peut_supprimer,
    });
    res.json({ permission });
  }),
);

// POST /init — initialiser les permissions par defaut selon le role
router.post(
  '/init',
  validateBody(initPermissionsBody),
  asyncHandler(async (req: Request, res: Response) => {
    const schema = req.tenantSchema;
    if (!schema) throw new ValidationError('Contexte tenant manquant.');
    const { utilisateur_id, role } = req.body;
    await permissionsService.initDefaultPermissions(schema, utilisateur_id, role);
    const permissions = await permissionsService.getPermissions(schema, utilisateur_id);
    res.json({ permissions });
  }),
);

export default router;
