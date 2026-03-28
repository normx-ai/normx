/**
 * Routes Permissions - NormX
 * CRUD des permissions par module pour chaque utilisateur.
 */

import express, { Request, Response } from 'express';
import * as permissionsService from '../services/permissions.service';
import type { ModuleNormx } from '../services/permissions.service';
import logger from '../logger';

const router = express.Router();

const VALID_MODULES: ModuleNormx[] = ['compta', 'paie', 'etats', 'revision', 'assistant', 'admin'];

function isValidModule(value: string): value is ModuleNormx {
  return VALID_MODULES.includes(value as ModuleNormx);
}

// GET / ?utilisateur_id=xxx — recuperer les permissions d'un utilisateur
router.get('/', async (req: Request, res: Response) => {
  const schema = req.tenantSchema;
  const utilisateurId = req.query.utilisateur_id as string | undefined;

  if (!schema) {
    res.status(400).json({ error: 'Contexte tenant manquant.' });
    return;
  }

  if (!utilisateurId) {
    res.status(400).json({ error: 'utilisateur_id requis.' });
    return;
  }

  try {
    const permissions = await permissionsService.getPermissions(schema, utilisateurId);
    res.json({ permissions });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error('Erreur GET permissions: %s', message);
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

// PUT / — mettre a jour ou creer une permission pour un module
interface PutBody {
  utilisateur_id: string;
  module: string;
  peut_lire: boolean;
  peut_creer: boolean;
  peut_modifier: boolean;
  peut_supprimer: boolean;
}

router.put('/', async (req: Request, res: Response) => {
  const schema = req.tenantSchema;

  if (!schema) {
    res.status(400).json({ error: 'Contexte tenant manquant.' });
    return;
  }

  const body = req.body as PutBody;
  const { utilisateur_id, module: mod, peut_lire, peut_creer, peut_modifier, peut_supprimer } = body;

  if (!utilisateur_id || !mod) {
    res.status(400).json({ error: 'utilisateur_id et module requis.' });
    return;
  }

  if (!isValidModule(mod)) {
    res.status(400).json({ error: `Module invalide: ${mod}` });
    return;
  }

  try {
    const permission = await permissionsService.setPermission(schema, utilisateur_id, mod, {
      peut_lire: Boolean(peut_lire),
      peut_creer: Boolean(peut_creer),
      peut_modifier: Boolean(peut_modifier),
      peut_supprimer: Boolean(peut_supprimer),
    });
    res.json({ permission });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error('Erreur PUT permission: %s', message);
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

// POST /init — initialiser les permissions par defaut selon le role
interface InitBody {
  utilisateur_id: string;
  role: string;
}

router.post('/init', async (req: Request, res: Response) => {
  const schema = req.tenantSchema;

  if (!schema) {
    res.status(400).json({ error: 'Contexte tenant manquant.' });
    return;
  }

  const body = req.body as InitBody;
  const { utilisateur_id, role } = body;

  if (!utilisateur_id || !role) {
    res.status(400).json({ error: 'utilisateur_id et role requis.' });
    return;
  }

  try {
    await permissionsService.initDefaultPermissions(schema, utilisateur_id, role);
    const permissions = await permissionsService.getPermissions(schema, utilisateur_id);
    res.json({ permissions });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error('Erreur POST /init permissions: %s', message);
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

export default router;
