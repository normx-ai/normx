import { z } from 'zod';

export const createEcritureBody = z.object({
  exercice_id: z.number().int().positive(),
  date_ecriture: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  journal: z.string().max(10).optional(),
  numero_piece: z.string().max(50).optional(),
  libelle: z.string().min(1).max(255),
  lignes: z.array(z.object({
    numero_compte: z.string().min(2).max(20),
    libelle_compte: z.string().max(255).optional(),
    debit: z.union([z.number(), z.string()]).optional(),
    credit: z.union([z.number(), z.string()]).optional(),
    tiers_id: z.union([z.number(), z.null()]).optional(),
  })).min(2),
});

export const ecritureFiltersQuery = z.object({
  journal: z.string().optional(),
  statut: z.string().optional(),
  date_du: z.string().optional(),
  date_au: z.string().optional(),
  search: z.string().optional(),
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(500).optional(),
});

// PUT /:id : meme structure que createEcritureBody mais sans exercice_id
export const updateEcritureBody = z.object({
  date_ecriture: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  journal: z.string().max(10).optional(),
  numero_piece: z.string().max(50).optional(),
  libelle: z.string().min(1).max(255),
  lignes: z.array(z.object({
    numero_compte: z.string().min(2).max(20),
    libelle_compte: z.string().max(255).optional(),
    debit: z.union([z.number(), z.string()]).optional(),
    credit: z.union([z.number(), z.string()]).optional(),
    tiers_id: z.union([z.number(), z.null()]).optional(),
  })).min(2),
});

export const validerEcrituresBody = z.object({
  ids: z.array(z.number().int().positive()).min(1).max(1000),
  user_id: z.string().uuid().optional(),
});

export const devaliderEcrituresBody = z.object({
  ids: z.array(z.number().int().positive()).min(1).max(1000),
});

export const lettrerBody = z.object({
  ligne_ids: z.array(z.number().int().positive()).min(2).max(1000),
});

export const delettrerBody = z.object({
  lettrage_code: z.string().min(1).max(50),
});

export const idParam = z.object({
  id: z.coerce.number().int().positive(),
});
