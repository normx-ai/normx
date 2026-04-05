import { z } from 'zod';

export const createTiersBody = z.object({
  nom: z.string().min(1).max(255),
  code_tiers: z.string().max(50).optional(),
  type: z.enum(['client', 'fournisseur', 'bailleur', 'personnel', 'autre']),
  compte_comptable: z.string().max(20).optional(),
  email: z.string().email().optional().or(z.literal('')),
  telephone: z.string().max(30).optional(),
  adresse: z.string().max(500).optional(),
  nif: z.string().max(50).optional(),
  entite_id: z.number().int().positive(),
});

export const updateTiersBody = createTiersBody.partial();
