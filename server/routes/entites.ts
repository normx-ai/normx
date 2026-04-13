import express, { Request, Response } from 'express';
import logger from '../logger';
import pool from '../db';
import { getValidatedSchemaName } from '../utils/tenant.utils';
import * as tenantService from '../services/tenant.service';
import type { TenantSettings } from '../services/tenant.service';

const router = express.Router();

// GET /api/entites — Lister les entités (dossiers clients pour un cabinet)
router.get('/', async (req: Request, res: Response) => {
  if (!req.tenant) {
    return res.status(400).json({ error: 'Tenant non résolu.' });
  }

  if (req.tenant.type === 'cabinet') {
    const s = req.tenant.settings;
    // Le cabinet lui-meme en premier (sa propre compta/paie)
    const cabinetEntite = {
      id: req.tenant.id,
      nom: req.tenant.nom,
      type_activite: 'cabinet' as const,
      offre: s?.offre || 'comptabilite',
      modules: s?.modules || ['compta', 'paie'],
      sigle: s?.sigle || '',
      adresse: s?.adresse || '',
      nif: s?.nif || '',
      telephone: s?.telephone || '',
      email: s?.email || '',
      actif: req.tenant.actif,
      created_at: req.tenant.created_at,
    };
    // Puis les clients du cabinet
    const clients = await tenantService.getCabinetClients(req.tenant.id);
    const clientEntites = clients.map(c => ({
      id: c.id,
      slug: c.slug,
      nom: c.nom,
      type_activite: 'entreprise' as const,
      offre: c.settings?.offre || (c.settings?.modules?.includes('compta') ? 'comptabilite' : 'etats'),
      modules: c.settings?.modules || [],
      sigle: c.settings?.sigle || '',
      adresse: c.settings?.adresse || '',
      nif: c.settings?.nif || '',
      telephone: c.settings?.telephone || '',
      email: c.settings?.email || '',
      actif: c.actif,
      created_at: c.created_at,
    }));
    return res.json([cabinetEntite, ...clientEntites]);
  }

  // Entreprise simple : retourner l'entité elle-même
  const s = req.tenant.settings;
  res.json([{
    id: req.tenant.id,
    nom: req.tenant.nom,
    type_activite: 'entreprise',
    offre: s?.offre || 'comptabilite',
    modules: s?.modules || [],
    sigle: s?.sigle || '',
    adresse: s?.adresse || '',
    nif: s?.nif || '',
    telephone: s?.telephone || '',
    email: s?.email || '',
    actif: req.tenant.actif,
    created_at: req.tenant.created_at,
  }]);
});

// GET /api/entites/:id
router.get('/:id', async (req: Request, res: Response) => {
  const id = parseInt(req.params.id, 10);
  if (!req.tenant) return res.status(400).json({ error: 'Tenant non résolu.' });
  const allowed = req.tenant.id === id || (req.accessibleTenants && req.accessibleTenants.includes(id));
  if (!allowed) return res.status(403).json({ error: 'Accès interdit à cette entité.' });

  const tenant = await tenantService.getTenantById(id);
  if (!tenant) return res.status(404).json({ error: 'Entité non trouvée.' });
  const { modules, sigle, adresse, nif, telephone, email, ...data } = (tenant.settings || {}) as TenantSettings;
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
    // Verifier que le cabinet a au moins un exercice
    const cabinetSchema = getValidatedSchemaName(req.tenant.schema_name);
    const exercicesRows = (await pool.query(
      `SELECT * FROM "${cabinetSchema}".exercices ORDER BY annee DESC`
    )).rows;

    if (exercicesRows.length === 0) {
      return res.status(400).json({
        error: 'Vous devez d\'abord créer un exercice pour votre cabinet avant d\'ajouter des clients.',
        code: 'EXERCICE_REQUIRED',
      });
    }

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

    // Copier les exercices du cabinet dans le schema client
    const clientSchema = getValidatedSchemaName(client.schema_name);
    for (const ex of exercicesRows) {
      await pool.query(
        `INSERT INTO "${clientSchema}".exercices (annee, date_debut, date_fin, duree_mois, statut)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT DO NOTHING`,
        [ex.annee, ex.date_debut, ex.date_fin, ex.duree_mois, ex.statut || 'ouvert']
      );
    }
    logger.info('Exercices du cabinet copies vers le client "%s" (%d exercice(s))', nom, exercicesRows.length);

    const updated = await tenantService.getTenantById(client.id);
    res.status(201).json({
      id: updated!.id,
      slug: updated!.slug,
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
  const id = parseInt(req.params.id, 10);
  if (!req.tenant) return res.status(400).json({ error: 'Tenant non résolu.' });
  const allowed = req.tenant.id === id || (req.accessibleTenants && req.accessibleTenants.includes(id));
  if (!allowed) return res.status(403).json({ error: 'Accès interdit à cette entité.' });

  const { nom, modules, sigle, adresse, nif, telephone, email, data } = req.body;

  try {
    // Merge data (parametres DSF) into settings
    const settings: TenantSettings = { modules, sigle, adresse, nif, telephone, email };
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
  const id = parseInt(req.params.id, 10);
  if (!req.tenant) return res.status(400).json({ error: 'Tenant non résolu.' });
  const allowed = req.tenant.id === id || (req.accessibleTenants && req.accessibleTenants.includes(id));
  if (!allowed) return res.status(403).json({ error: 'Accès interdit à cette entité.' });

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
