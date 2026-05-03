/**
 * Type partage pour les comptes du plan comptable (SYSCOHADA / SYCEBNL).
 * Source unique cote backend.
 *
 * Equivalent frontend : src/types.ts CompteComptable. Garder les deux alignes.
 * Une vraie consolidation requiert craco/Vite (CRA bloque les imports hors src/).
 */
export interface CompteComptable {
  numero: string;
  libelle: string;
  classe?: number | string;
  sens?: 'debiteur' | 'crediteur' | 'mixte' | string;
}
