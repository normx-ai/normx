import { z } from 'zod';

export const paginationQuery = z.object({
  page: z.coerce.number().int().min(1).max(1000).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

export const idParam = z.object({
  id: z.coerce.number().int().positive(),
});

export const entiteExerciceParams = z.object({
  entite_id: z.coerce.number().int().positive(),
  exercice_id: z.coerce.number().int().positive(),
});
