// Types, donnees et calculs purs de la Note 4 (Immobilisations financieres).

import type { BalanceLigne } from 'types';

export interface LigneFiliale {
  denomination: string;
  localisation: string;
  valeurAcquisition: string;
  pctDetenu: string;
  capitauxPropres: string;
  resultatDernier: string;
}

export interface RubriqueImmoFin {
  label: string;
  prefixes: string[];
}

export interface RowVals {
  anneeN: number;
  anneeN1: number;
  variation: number;
  creances1an: number;
  creances1a2ans: number;
  creancesPlus2ans: number;
}

export interface TotalVals {
  anneeN: number;
  anneeN1: number;
  creances1an: number;
  creances1a2ans: number;
  creancesPlus2ans: number;
}

export const RUBRIQUES_BRUT: RubriqueImmoFin[] = [
  { label: 'Titres de participation', prefixes: ['26'] },
  { label: 'Prêts et créances', prefixes: ['271'] },
  { label: 'Prêt au personnel', prefixes: ['272'] },
  { label: 'Créances sur l\'état', prefixes: ['273'] },
  { label: 'Titres immobilisés', prefixes: ['274'] },
  { label: 'Dépôts et cautionnements', prefixes: ['275'] },
  { label: 'Intérêts courus', prefixes: ['276'] },
];

export const RUBRIQUES_DEPRECIATION: RubriqueImmoFin[] = [
  { label: 'Dépréciations titres de participation', prefixes: ['296'] },
  { label: 'Dépréciations autres immobilisations', prefixes: ['297'] },
];

export const DEFAULT_COMMENTAIRE = `• Justifier toute variation significative.
• Commenter toutes les créances anciennes.
• Pour les créances relatives à la concession, faire un descriptif de l'accord.
• Indiquer :
  - la nature de la créance ;
  - la durée de la concession ;
  - l'échéance.
• Indiquer le nombre et la date d'acquisition des actions ou parts propres.
• Dépréciation : indiquer les événements et les circonstances qui ont motivé la dépréciation ou la reprise.`;

export const emptyFiliale = (): LigneFiliale => ({
  denomination: '', localisation: '', valeurAcquisition: '', pctDetenu: '', capitauxPropres: '', resultatDernier: '',
});

export function fmtM(val: number): string {
  if (val === 0) return '0';
  return Math.round(val).toLocaleString('fr-FR');
}

export function computeForPrefixes(lignes: BalanceLigne[], prefixes: string[]): number {
  let total = 0;
  for (const l of lignes) {
    const num = (l.numero_compte || '').trim();
    if (!prefixes.some(p => num.startsWith(p))) continue;
    total += (parseFloat(String(l.solde_debiteur)) || 0) - (parseFloat(String(l.solde_crediteur)) || 0);
  }
  return total;
}

export function computeRow(
  r: RubriqueImmoFin,
  lignesN: BalanceLigne[],
  lignesN1: BalanceLigne[],
  getAdj: (label: string, field: string) => number,
): RowVals {
  const baseN = computeForPrefixes(lignesN, r.prefixes) + getAdj(r.label, 'anneeN');
  const baseN1 = computeForPrefixes(lignesN1, r.prefixes) + getAdj(r.label, 'anneeN1');
  const variation = baseN1 !== 0 ? ((baseN - baseN1) / Math.abs(baseN1) * 100) : 0;
  return {
    anneeN: baseN,
    anneeN1: baseN1,
    variation,
    creances1an: getAdj(r.label, 'creances1an'),
    creances1a2ans: getAdj(r.label, 'creances1a2ans'),
    creancesPlus2ans: getAdj(r.label, 'creancesPlus2ans'),
  };
}

export function sumRows(rows: { vals: RowVals }[]): TotalVals {
  return rows.reduce(
    (acc, r) => ({
      anneeN: acc.anneeN + r.vals.anneeN,
      anneeN1: acc.anneeN1 + r.vals.anneeN1,
      creances1an: acc.creances1an + r.vals.creances1an,
      creances1a2ans: acc.creances1a2ans + r.vals.creances1a2ans,
      creancesPlus2ans: acc.creancesPlus2ans + r.vals.creancesPlus2ans,
    }),
    { anneeN: 0, anneeN1: 0, creances1an: 0, creances1a2ans: 0, creancesPlus2ans: 0 }
  );
}
