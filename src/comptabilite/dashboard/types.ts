export interface TableauBordData {
  classes: { classe: string; debit: number; credit: number }[];
  mensuel: { mois: number; produits: number; charges: number }[];
  tresorerie: { debit: number; credit: number };
}

export interface BalanceTiersRow {
  tiers_id: number;
  tiers_nom: string;
  tiers_code?: string;
  type: string;
  debit: number;
  credit: number;
}

export interface DashboardEcritureRow {
  id: number;
  date_ecriture: string;
  numero_piece: string | null;
  libelle: string | null;
  journal_code: string | null;
  total_debit: number;
  total_credit: number;
}

export interface DashboardKpis {
  ca: number;
  charges: number;
  resultat: number;
  tresoNet: number;
  bfr: number;
  dso: number;
  marge: number;
}

export interface EvolutionPoint {
  mois: string;
  ca: number;
  charges: number;
  resultat: number;
  cumulCa: number;
}

export interface DashboardRatios {
  liquidite: number;
  autonomie: number;
  dso: number;
  marge: number;
}

export interface Echeance {
  day: string;
  month: string;
  title: string;
  desc: string;
  daysLeft: number;
}
