import { z } from 'zod';

export const createExerciceBody = z.object({
  annee: z.number().int().min(2000).max(2100),
  duree_mois: z.number().int().min(1).max(24).optional(),
  date_debut: z.string().optional(),
  date_fin: z.string().optional(),
});

export const importBalanceBody = z.object({
  exercice_id: z.number().int().positive(),
  type_balance: z.enum(['N', 'N-1']),
  nom_fichier: z.string().optional(),
  lignes: z.array(z.object({
    numero_compte: z.string().optional(),
    libelle_compte: z.string().optional(),
    si_debit: z.union([z.number(), z.string()]).optional(),
    si_credit: z.union([z.number(), z.string()]).optional(),
    debit: z.union([z.number(), z.string()]).optional(),
    credit: z.union([z.number(), z.string()]).optional(),
    solde_debiteur: z.union([z.number(), z.string()]).optional(),
    solde_crediteur: z.union([z.number(), z.string()]).optional(),
  })).min(1),
});
