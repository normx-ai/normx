import { z } from 'zod';

export const ligneResultatFiscalBody = z.object({
  type: z.enum(['reintegration', 'deduction', 'deficit_reportable', 'ard']),
  libelle: z.string().max(500).default(''),
  montant: z.number().finite().default(0),
  article: z.string().max(50).default(''),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const replaceLignesBody = z.object({
  lignes: z.array(ligneResultatFiscalBody).max(500),
});
