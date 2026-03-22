import type { JournalType } from '../types';

export interface SaisieJournalProps {
  entiteId: number;
  exerciceId: number;
  exerciceAnnee: number;
  onBack: () => void;
}

export interface EcritureRow {
  numero_compte: string;
  libelle_compte: string;
  debit: string | number;
  credit: string | number;
  tiers_id: string | number;
}

export interface EcritureAPI {
  id: number;
  journal: string;
  date_ecriture: string;
  numero_piece: string;
  libelle: string;
  statut: string;
  lignes: EcritureLigneAPI[];
}

export interface EcritureLigneAPI {
  id?: number;
  numero_compte: string;
  libelle_compte: string;
  debit: number | string;
  credit: number | string;
  tiers_id?: number;
  tiers_nom?: string;
}

export interface StatsData {
  nb_comptes: number;
}

export interface TiersItem {
  id: number;
  code_tiers: string;
  nom: string;
  type: string;
  compte_comptable: string;
}

export const JOURNAUX: JournalType[] = [
  { code: 'OD', intitule: 'Operations diverses' },
  { code: 'ACH', intitule: 'Achats' },
  { code: 'VTE', intitule: 'Ventes' },
  { code: 'BQ', intitule: 'Banque' },
  { code: 'CAI', intitule: 'Caisse' },
  { code: 'SUB', intitule: 'Subventions' },
  { code: 'DOT', intitule: 'Dotations' },
  { code: 'AMO', intitule: 'Amortissements' },
  { code: 'RAN', intitule: 'Report a nouveau' },
];

export const MOIS: string[] = [
  'Janvier', 'Fevrier', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Aout', 'Septembre', 'Octobre', 'Novembre', 'Decembre',
];
