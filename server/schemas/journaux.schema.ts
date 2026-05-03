import { z } from 'zod';

const journalType = z.enum(['achat', 'vente', 'tresorerie', 'od']);

export const createJournalBody = z.object({
  code: z.string().min(1).max(10),
  libelle: z.string().min(1).max(255),
  type: journalType,
  contrepartie_defaut: z.string().max(20).nullable().optional(),
});

export const updateJournalBody = z
  .object({
    libelle: z.string().min(1).max(255).optional(),
    type: journalType.optional(),
    contrepartie_defaut: z.string().max(20).nullable().optional(),
    actif: z.boolean().optional(),
  })
  .refine((v) => Object.values(v).some((x) => x !== undefined), {
    message: 'Au moins un champ a mettre a jour',
  });
