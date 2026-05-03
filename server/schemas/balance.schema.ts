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

const numOrStr = z.union([z.number(), z.string()]).optional();

export const updateBalanceLigneBody = z.object({
  numero_compte: z.string().max(20).optional(),
  libelle_compte: z.string().max(255).optional(),
  si_debit: numOrStr,
  si_credit: numOrStr,
  debit: numOrStr,
  credit: numOrStr,
  solde_debiteur: numOrStr,
  solde_crediteur: numOrStr,
});

export const updateRevisionBody = z.object({
  debit_revise: numOrStr,
  credit_revise: numOrStr,
  solde_debiteur_revise: numOrStr,
  solde_crediteur_revise: numOrStr,
  note_revision: z.string().max(2000).optional(),
});

export const updateBalanceStatutBody = z.object({
  statut: z.enum(['brut', 'revise', 'valide']),
  revision_notes: z.string().max(2000).optional(),
  user_id: z.string().uuid().optional(),
});
