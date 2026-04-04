import express, { Request, Response } from 'express';
import * as tenantService from '../services/tenant.service';
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

// POST /api/tenant/client — Cabinet : créer un dossier client
router.post('/client', async (req: Request, res: Response) => {
  if (!req.tenant || req.tenant.type !== 'cabinet') {
    return res.status(403).json({ error: 'Réservé aux cabinets.' });
  }

  const { nom } = req.body as { nom: string };
  if (!nom) {
    return res.status(400).json({ error: 'Nom du client requis.' });
  }

  try {
    const clientSlug = `${req.tenant.slug}_client_${Date.now()}`;
    const client = await tenantService.createTenant({
      slug: clientSlug,
      nom,
      type: 'client',
      parent_id: req.tenant.id,
      plan: req.tenant.plan,
    });

    res.status(201).json({ client });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error(`Erreur création client: ${message}`);
    res.status(500).json({ error: 'Erreur lors de la création du dossier client.' });
  }
});

export default router;
