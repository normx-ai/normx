import { z } from 'zod';

const moduleEnum = z.enum(['compta', 'etats', 'assistant', 'admin']);

export const setPermissionBody = z.object({
  utilisateur_id: z.string().uuid(),
  module: moduleEnum,
  peut_lire: z.boolean(),
  peut_creer: z.boolean(),
  peut_modifier: z.boolean(),
  peut_supprimer: z.boolean(),
});

export const initPermissionsBody = z.object({
  utilisateur_id: z.string().uuid(),
  role: z.enum(['admin', 'comptable', 'lecture_seule']),
});

export const getPermissionsQuery = z.object({
  utilisateur_id: z.string().uuid(),
});
