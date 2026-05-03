import { z } from 'zod';

export const setupBody = z.object({
  nom: z.string().min(1).max(200),
  type: z.enum(['enterprise', 'cabinet']),
  modules: z.array(z.string().max(50)).max(20).optional(),
});

export const createExerciceBody = z.object({
  annee: z.number().int().min(1900).max(2200),
  duree_mois: z.number().int().min(1).max(24).optional(),
  date_debut: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  date_fin: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});
