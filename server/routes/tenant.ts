import express, { Request, Response } from 'express';
import * as tenantService from '../services/tenant.service';
import * as balanceService from '../services/balance.service';
import pool from '../db';
import { getValidatedSchemaName } from '../utils/tenant.utils';
import logger from '../logger';

const router = express.Router();

// GET /api/tenant/me — Récupérer le tenant de l'utilisateur connecté
router.get('/me', async (req: Request, res: Response) => {
  if (!req.user?.sub) {
    return res.status(401).json({ error: 'Non authentifié.' });
  }

  const slug = req.user.sub.replace(/-/g, '_');
  const tenant = await tenantService.getTenantBySlug(slug);

  if (!tenant) {
    return res.json({ tenant: null, onboardingRequired: true });
  }

  // Charger les clients si c'est un cabinet
  let clients: tenantService.Tenant[] = [];
  if (tenant.type === 'cabinet') {
    clients = await tenantService.getCabinetClients(tenant.id);
  }

  res.json({ tenant, clients, onboardingRequired: false });
});

// POST /api/tenant/setup — Onboarding : configurer le tenant
router.post('/setup', async (req: Request, res: Response) => {
  if (!req.user?.sub) {
    return res.status(401).json({ error: 'Non authentifié.' });
  }

  const { nom, type, modules } = req.body as {
    nom: string;
    type: 'enterprise' | 'cabinet';
    modules: string[];
  };

  if (!nom || !type) {
    return res.status(400).json({ error: 'Nom et type requis.' });
  }

  const slug = req.user.sub.replace(/-/g, '_');

  try {
    // Vérifier si le tenant existe déjà
    let tenant = await tenantService.getTenantBySlug(slug);

    if (tenant) {
      // Mettre à jour le tenant existant
      await tenantService.updateTenant(tenant.id, { nom, type, settings: { modules } });
      tenant = await tenantService.getTenantById(tenant.id);
    } else {
      // Créer le tenant
      tenant = await tenantService.createTenant({
        slug,
        nom,
        type,
        plan: 'trial',
      });
      // Mettre à jour les settings (modules)
      await tenantService.updateTenant(tenant.id, { settings: { modules } });
      tenant = await tenantService.getTenantById(tenant.id);
    }

    // Cabinet : créer automatiquement un premier client (le cabinet lui-même)
    if (type === 'cabinet' && tenant) {
      const existingClients = await tenantService.getCabinetClients(tenant.id);
      if (existingClients.length === 0) {
        const clientSlug = `${slug}_client_self`;
        const selfClient = await tenantService.createTenant({
          slug: clientSlug,
          nom,
          type: 'client',
          parent_id: tenant.id,
          plan: tenant.plan,
        });
        await tenantService.updateTenant(selfClient.id, {
          settings: { modules: modules || ['compta', 'etats', 'paie'] },
        });
      }
    }

    res.json({ tenant, onboardingRequired: false });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error(`Erreur setup tenant: ${message}`);
    res.status(500).json({ error: 'Erreur lors de la configuration.' });
  }
});


// POST /api/tenant/exercice — Cabinet : creer un exercice au niveau cabinet
// Cet exercice sera automatiquement copie vers les nouveaux clients
router.post('/exercice', async (req: Request, res: Response) => {
  if (!req.user?.sub) {
    return res.status(401).json({ error: 'Non authentifié.' });
  }

  const slug = req.user.sub.replace(/-/g, '_');
  const tenant = await tenantService.getTenantBySlug(slug);
  if (!tenant) {
    return res.status(403).json({ error: 'Tenant non trouvé.' });
  }

  const { annee, duree_mois, date_debut, date_fin } = req.body as {
    annee: number;
    duree_mois?: number;
    date_debut?: string;
    date_fin?: string;
  };

  if (!annee) {
    return res.status(400).json({ error: 'Année requise.' });
  }

  try {
    const result = await balanceService.createExercice(
      tenant.schema_name, annee, duree_mois || 12, date_debut, date_fin
    );

    if ('error' in result) {
      return res.status(400).json({ error: result.error });
    }
    if ('existing' in result) {
      return res.json({ exercice: result.existing, existing: true });
    }

    // Propager l'exercice vers tous les clients existants du cabinet
    if (tenant.type === 'cabinet') {
      const clients = await tenantService.getCabinetClients(tenant.id);
      for (const client of clients) {
        try {
          const clientSchema = getValidatedSchemaName(client.schema_name);
          await pool.query(
            `INSERT INTO "${clientSchema}".exercices (annee, date_debut, date_fin, duree_mois, statut)
             VALUES ($1, $2, $3, $4, 'ouvert')
             ON CONFLICT DO NOTHING`,
            [annee, result.created.date_debut, result.created.date_fin, result.created.duree_mois]
          );
        } catch (clientErr) {
          logger.warn('Exercice non propage vers client %s: %s', client.nom, clientErr instanceof Error ? clientErr.message : String(clientErr));
        }
      }
      logger.info('Exercice %d propage vers %d client(s)', annee, clients.length);
    }

    res.status(201).json({ exercice: result.created });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error('Erreur création exercice cabinet: %s', message);
    res.status(500).json({ error: 'Erreur lors de la création.' });
  }
});

// GET /api/tenant/exercices — Lister les exercices du cabinet
router.get('/exercices', async (req: Request, res: Response) => {
  if (!req.user?.sub) {
    return res.status(401).json({ error: 'Non authentifié.' });
  }

  const slug = req.user.sub.replace(/-/g, '_');
  const tenant = await tenantService.getTenantBySlug(slug);
  if (!tenant) {
    return res.status(403).json({ error: 'Tenant non trouvé.' });
  }

  try {
    const exercices = await balanceService.listExercices(tenant.schema_name);
    res.json(exercices);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error('Erreur listing exercices cabinet: %s', message);
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

export default router;
