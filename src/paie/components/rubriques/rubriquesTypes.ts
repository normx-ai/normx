// Types, constantes et helpers pour la page Rubriques de paie.

export type RubriqueType = 'gain' | 'retenue' | 'cotisation' | 'indemnite' | 'avantage';
export type RubriqueMode = 'pourcentage' | 'fixe' | 'horaire' | 'variable';

export interface Rubrique {
  id: number;
  entite_id: number;
  code: string;
  libelle: string;
  type: RubriqueType;
  mode: RubriqueMode;
  taux: number | null;
  montant: number | null;
  plafond: number | null;
  base: string | null;
  imposable: boolean;
  actif: boolean;
  ordre: number;
}

export interface RubriqueFormData {
  code: string;
  libelle: string;
  type: RubriqueType;
  mode: RubriqueMode;
  taux: string;
  montant: string;
  plafond: string;
  base: string;
  imposable: boolean;
  actif: boolean;
  ordre: string;
}

export interface FilterTab {
  key: string;
  label: string;
  type: RubriqueType | null;
}

export const FILTER_TABS: FilterTab[] = [
  { key: 'tous', label: 'Tous', type: null },
  { key: 'gain', label: 'Gains', type: 'gain' },
  { key: 'retenue', label: 'Retenues', type: 'retenue' },
  { key: 'cotisation', label: 'Cotisations', type: 'cotisation' },
  { key: 'indemnite', label: 'Indemnites', type: 'indemnite' },
  { key: 'avantage', label: 'Avantages', type: 'avantage' },
];

export const TYPE_LABELS: Record<RubriqueType, string> = {
  gain: 'Gain',
  retenue: 'Retenue',
  cotisation: 'Cotisation',
  indemnite: 'Indemnite',
  avantage: 'Avantage',
};

export const MODE_LABELS: Record<RubriqueMode, string> = {
  pourcentage: 'Pourcentage',
  fixe: 'Fixe',
  horaire: 'Horaire',
  variable: 'Variable',
};

export const EMPTY_FORM: RubriqueFormData = {
  code: '',
  libelle: '',
  type: 'gain',
  mode: 'fixe',
  taux: '',
  montant: '',
  plafond: '',
  base: '',
  imposable: true,
  actif: true,
  ordre: '0',
};

export function formatNumber(n: number | null): string {
  if (n === null || n === undefined) return '-';
  return new Intl.NumberFormat('fr-FR').format(n);
}
