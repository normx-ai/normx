import express, { Request, Response } from 'express';
import logger from '../logger';
import * as tenantService from '../services/tenant.service';

const router = express.Router();

// GET /api/entites — Lister les entités (dossiers clients pour un cabinet)
router.get('/', async (req: Request, res: Response) => {
  if (!req.tenant) {
    return res.status(400).json({ error: 'Tenant non résolu.' });
  }

  if (req.tenant.type === 'cabinet') {
    const clients = await tenantService.getCabinetClients(req.tenant.id);
    const entites = clients.map(c => ({
      id: c.id,
      nom: c.nom,
      type_activite: 'entreprise' as const,
      offre: (c.settings?.offre as string) || ((c.settings?.modules as unknown as string[])?.includes('compta') ? 'comptabilite' : 'etats'),
      modules: (c.settings?.modules as unknown as string[]) || ['compta', 'paie'],
      sigle: (c.settings?.sigle as string) || '',
      adresse: (c.settings?.adresse as string) || '',
      nif: (c.settings?.nif as string) || '',
      telephone: (c.settings?.telephone as string) || '',
      email: (c.settings?.email as string) || '',
      actif: c.actif,
      created_at: c.created_at,
    }));
    return res.json(entites);
  }

  // Entreprise simple : retourner l'entité elle-même
  res.json([{
    id: req.tenant.id,
    nom: req.tenant.nom,
    type_activite: 'entreprise',
    offre: (req.tenant.settings?.offre as string) || 'comptabilite',
    modules: (req.tenant.settings?.modules as unknown as string[]) || ['compta', 'etats', 'paie'],
    sigle: (req.tenant.settings?.sigle as string) || '',
    adresse: (req.tenant.settings?.adresse as string) || '',
    nif: (req.tenant.settings?.nif as string) || '',
    telephone: (req.tenant.settings?.telephone as string) || '',
    email: (req.tenant.settings?.email as string) || '',
    actif: req.tenant.actif,
    created_at: req.tenant.created_at,
  }]);
});

// GET /api/entites/:id
router.get('/:id', async (req: Request, res: Response) => {
  const tenant = await tenantService.getTenantById(parseInt(req.params.id));
  if (!tenant) return res.status(404).json({ error: 'Entité non trouvée.' });
  const { modules, sigle, adresse, nif, telephone, email, ...data } = (tenant.settings || {}) as Record<string, unknown>;
  res.json({
    id: tenant.id,
    nom: tenant.nom,
    sigle: sigle || '',
    adresse: adresse || '',
    nif: nif || '',
    telephone: telephone || '',
    email: email || '',
    data,
  });
});

// POST /api/entites — Créer un dossier client (cabinet uniquement)
router.post('/', async (req: Request, res: Response) => {
  if (!req.tenant) {
    return res.status(400).json({ error: 'Tenant non résolu.' });
  }

  const { nom, modules, sigle, adresse, nif, telephone, email } = req.body;
  if (!nom?.trim()) {
    return res.status(400).json({ error: 'Le nom est obligatoire.' });
  }

  try {
    const clientSlug = `${req.tenant.slug}_client_${Date.now()}`;
    const client = await tenantService.createTenant({
      slug: clientSlug,
      nom: nom.trim(),
      type: 'client',
      parent_id: req.tenant.id,
      plan: req.tenant.plan,
    });

    // Sauvegarder les settings
    await tenantService.updateTenant(client.id, {
      settings: { modules, sigle, adresse, nif, telephone, email },
    });

    const updated = await tenantService.getTenantById(client.id);
    res.status(201).json({
      id: updated!.id,
      nom: updated!.nom,
      type_activite: 'entreprise',
      offre: modules?.includes('compta') ? 'comptabilite' : 'etats',
      modules: modules || ['compta', 'etats', 'paie'],
      sigle: sigle || '',
      adresse: adresse || '',
      nif: nif || '',
      telephone: telephone || '',
      email: email || '',
      actif: true,
      created_at: updated!.created_at,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error('Erreur création entité: %s', message);
    res.status(500).json({ error: 'Erreur lors de la création.' });
  }
});

// PUT /api/entites/:id — Modifier une entité
router.put('/:id', async (req: Request, res: Response) => {
  const id = parseInt(req.params.id);
  const { nom, modules, sigle, adresse, nif, telephone, email, data } = req.body;

  try {
    // Merge data (parametres DSF) into settings
    const settings: Record<string, unknown> = { modules, sigle, adresse, nif, telephone, email };
    if (data && typeof data === 'object') {
      Object.assign(settings, data);
    }

    await tenantService.updateTenant(id, {
      nom,
      settings,
    });

    const updated = await tenantService.getTenantById(id);
    if (!updated) return res.status(404).json({ error: 'Entité non trouvée.' });

    res.json({
      id: updated.id,
      nom: updated.nom,
      type_activite: 'entreprise',
      offre: modules?.includes('compta') ? 'comptabilite' : 'etats',
      modules: modules || ['compta', 'etats', 'paie'],
      sigle: (updated.settings?.sigle as string) || '',
      adresse: (updated.settings?.adresse as string) || '',
      nif: (updated.settings?.nif as string) || '',
      telephone: (updated.settings?.telephone as string) || '',
      email: (updated.settings?.email as string) || '',
      actif: updated.actif,
      created_at: updated.created_at,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error('Erreur modification entité: %s', message);
    res.status(500).json({ error: 'Erreur lors de la modification.' });
  }
});

// DELETE /api/entites/:id — Archiver/supprimer une entité
router.delete('/:id', async (req: Request, res: Response) => {
  const id = parseInt(req.params.id);
  try {
    const deleted = await tenantService.deleteTenant(id);
    if (!deleted) return res.status(404).json({ error: 'Entité non trouvée.' });
    res.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error('Erreur suppression entité: %s', message);
    res.status(500).json({ error: 'Erreur lors de la suppression.' });
  }
});

export default router;
