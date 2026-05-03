import { z } from 'zod';

const sensEnum = z.enum(['debiteur', 'crediteur', 'mixte']);

export const createCompteCustomBody = z
  .object({
    numero: z.string().min(1).max(20),
    libelle: z.string().max(255).optional(),
    sens: sensEnum.optional(),
    type: z.enum(['custom', 'disabled']).optional(),
  })
  .refine(
    (v) => v.type === 'disabled' || (v.libelle && v.libelle.trim().length > 0),
    { message: 'Libelle obligatoire pour un compte personnalise' },
  );

export const updateCompteCustomBody = z
  .object({
    libelle: z.string().max(255).optional(),
    sens: sensEnum.optional(),
  })
  .refine((v) => v.libelle !== undefined || v.sens !== undefined, {
    message: 'Au moins un champ a mettre a jour',
  });
