/**
 * Type partage pour les comptes du plan comptable (SYSCOHADA / SYCEBNL).
 * Utilise par les routes qui consomment planComptable ou les referentiels.
 */
export interface CompteComptable {
  numero: string;
  libelle: string;
  classe?: number | string;
  sens?: string;
}
