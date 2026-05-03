import { z } from 'zod';

const moduleStr = z.string().max(50);

export const createEntiteBody = z.object({
  nom: z.string().min(1).max(200),
  modules: z.array(moduleStr).max(20).optional(),
  sigle: z.string().max(50).optional(),
  adresse: z.string().max(500).optional(),
  nif: z.string().max(50).optional(),
  telephone: z.string().max(30).optional(),
  email: z.string().email().or(z.literal('')).optional(),
});

export const updateEntiteBody = z.object({
  nom: z.string().min(1).max(200).optional(),
  modules: z.array(moduleStr).max(20).optional(),
  sigle: z.string().max(50).optional(),
  adresse: z.string().max(500).optional(),
  nif: z.string().max(50).optional(),
  telephone: z.string().max(30).optional(),
  email: z.string().email().or(z.literal('')).optional(),
  // data : settings additionnels (parametres DSF, etc.)
  data: z.record(z.string(), z.unknown()).optional(),
});
