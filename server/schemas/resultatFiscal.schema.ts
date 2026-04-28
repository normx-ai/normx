import { z } from 'zod';

export const ligneResultatFiscalBody = z.object({
  type: z.enum(['reintegration', 'deduction']),
  libelle: z.string().max(500).default(''),
  montant: z.number().finite().default(0),
  article: z.string().max(50).default(''),
});

export const replaceLignesBody = z.object({
  lignes: z.array(ligneResultatFiscalBody).max(500),
});
