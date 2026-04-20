// Donnees et calculs purs de la Note 3D (Plus-values / moins-values de cession).

import type { BalanceLigne } from '../../../types';

export interface Rubrique {
  label: string;
  immoPrefixes: string[];
  amortPrefixes: string[];
  vncPrefixes: string[];
  prixPrefixes: string[];
  bold?: boolean;
  isSousTotal?: boolean;
  isTotal?: boolean;
  isSeparator?: boolean;
}

export interface RowVals {
  a: number;
  b: number;
  c: number;
  d: number;
  e: number;
}

export interface RowBase {
  brutBal: number;
  amortBal: number;
  prixBal: number;
}

export const ALL_RUBRIQUES: Rubrique[] = [
  { label: 'Frais de développement et de prospection', immoPrefixes: ['211'], amortPrefixes: ['2811'], vncPrefixes: [], prixPrefixes: [] },
  { label: 'Brevets, licences, logiciels et droits similaires', immoPrefixes: ['212', '213'], amortPrefixes: ['2812', '2813'], vncPrefixes: [], prixPrefixes: [] },
  { label: 'Fonds commercial et droit au bail', immoPrefixes: ['215', '216'], amortPrefixes: ['2815', '2816'], vncPrefixes: [], prixPrefixes: [] },
  { label: 'Autres immobilisations incorporelles', immoPrefixes: ['214', '217', '218', '219'], amortPrefixes: ['2814', '2817', '2818', '2819'], vncPrefixes: [], prixPrefixes: [] },
  { label: 'SOUS TOTAL : IMMOBILISATIONS INCORPORELLES', immoPrefixes: [], amortPrefixes: [], vncPrefixes: ['811'], prixPrefixes: ['821'], bold: true, isSousTotal: true },
  { label: '', immoPrefixes: [], amortPrefixes: [], vncPrefixes: [], prixPrefixes: [], isSeparator: true },
  { label: 'Terrains', immoPrefixes: ['22'], amortPrefixes: ['282'], vncPrefixes: [], prixPrefixes: [] },
  { label: 'Bâtiments', immoPrefixes: ['231', '232', '233', '234'], amortPrefixes: ['2831', '2832', '2833', '2834'], vncPrefixes: [], prixPrefixes: [] },
  { label: 'Aménagements, agencements et installations', immoPrefixes: ['235', '236', '237', '238'], amortPrefixes: ['2835', '2836', '2837', '2838'], vncPrefixes: [], prixPrefixes: [] },
  { label: 'Matériel, mobilier et actifs biologiques', immoPrefixes: ['241', '242', '243', '244'], amortPrefixes: ['2841', '2842', '2843', '2844'], vncPrefixes: [], prixPrefixes: [] },
  { label: 'Matériel de transport', immoPrefixes: ['245'], amortPrefixes: ['2845'], vncPrefixes: [], prixPrefixes: [] },
  { label: 'SOUS TOTAL : IMMOBILISATIONS CORPORELLES', immoPrefixes: [], amortPrefixes: [], vncPrefixes: ['812'], prixPrefixes: ['822'], bold: true, isSousTotal: true },
  { label: '', immoPrefixes: [], amortPrefixes: [], vncPrefixes: [], prixPrefixes: [], isSeparator: true },
  { label: 'Titres de participations', immoPrefixes: ['26'], amortPrefixes: [], vncPrefixes: ['813'], prixPrefixes: ['823'] },
  { label: 'Autres immobilisations financières', immoPrefixes: ['27'], amortPrefixes: [], vncPrefixes: ['814'], prixPrefixes: ['824'] },
  { label: 'SOUS TOTAL : IMMOBILISATIONS FINANCIERES', immoPrefixes: [], amortPrefixes: [], vncPrefixes: [], prixPrefixes: [], bold: true, isSousTotal: true },
  { label: '', immoPrefixes: [], amortPrefixes: [], vncPrefixes: [], prixPrefixes: [], isSeparator: true },
  { label: 'TOTAL GENERAL', immoPrefixes: [], amortPrefixes: [], vncPrefixes: ['81', '654'], prixPrefixes: ['82', '754'], bold: true, isTotal: true },
];

export const DEFAULT_COMMENTAIRE = `Mentionner la justification de la cession ainsi que la date d'acquisition et la date de sortie.`;

export function fmtM(val: number): string {
  if (val === 0) return '0';
  return Math.round(val).toLocaleString('fr-FR');
}

export function balanceSum(lignes: BalanceLigne[], prefixes: string[], type: 'debit' | 'credit'): number {
  if (prefixes.length === 0) return 0;
  let total = 0;
  for (const l of lignes) {
    const num = (l.numero_compte || '').trim();
    if (!prefixes.some(p => num.startsWith(p))) continue;
    total += parseFloat(String(type === 'debit' ? l.debit : l.credit)) || 0;
  }
  return total;
}

function sumByRevisedSolde(lignes: BalanceLigne[], prefixes: string[], side: 'debit' | 'credit'): number {
  let total = 0;
  for (const l of lignes) {
    const num = (l.numero_compte || '').trim();
    if (!prefixes.some(p => num.startsWith(p))) continue;
    if (side === 'debit') {
      total += parseFloat(String(l.solde_debiteur_revise ?? l.solde_debiteur ?? l.debit)) || 0;
    } else {
      total += parseFloat(String(l.solde_crediteur_revise ?? l.solde_crediteur ?? l.credit)) || 0;
    }
  }
  return total;
}

export function prixCessionBalance(lignes: BalanceLigne[]): number {
  return sumByRevisedSolde(lignes, ['82', '754'], 'credit');
}

export function vncCessionBalance(lignes: BalanceLigne[]): number {
  return sumByRevisedSolde(lignes, ['81', '654'], 'debit');
}

export function distribuePrix(lignes: BalanceLigne[], rows: Rubrique[], prixPrefixes: string[]): Map<string, number> {
  const totalPrix = balanceSum(lignes, prixPrefixes, 'credit');
  if (totalPrix === 0) return new Map();

  const poids = rows.map(r => ({
    label: r.label,
    credit: balanceSum(lignes, r.immoPrefixes, 'credit'),
  }));
  const totalCredit = poids.reduce((s, p) => s + p.credit, 0);
  if (totalCredit === 0) return new Map();

  const result = new Map<string, number>();
  for (const p of poids) {
    if (p.credit > 0) {
      result.set(p.label, Math.round(totalPrix * p.credit / totalCredit));
    }
  }
  return result;
}

export interface Note3DComputedData {
  detailRows: Rubrique[];
  incorpRows: Rubrique[];
  corpRows: Rubrique[];
  finRows: Rubrique[];
  prixIncorp: Map<string, number>;
  prixCorp: Map<string, number>;
  prixFin: Map<string, number>;
}

export function prepareNote3D(lignes: BalanceLigne[]): Note3DComputedData {
  const detailRows = ALL_RUBRIQUES.filter(r => !r.isSousTotal && !r.isTotal && !r.isSeparator);
  const incorpRows = detailRows.slice(0, 4);
  const corpRows = detailRows.slice(4, 9);
  const finRows = detailRows.slice(9);
  return {
    detailRows, incorpRows, corpRows, finRows,
    prixIncorp: distribuePrix(lignes, incorpRows, ['821']),
    prixCorp: distribuePrix(lignes, corpRows, ['822']),
    prixFin: distribuePrix(lignes, finRows, ['823', '824']),
  };
}

export function getBaseRow(
  r: Rubrique,
  lignes: BalanceLigne[],
  data: Note3DComputedData,
): RowBase {
  const brutBal = balanceSum(lignes, r.immoPrefixes, 'credit');
  const amortBal = balanceSum(lignes, r.amortPrefixes, 'debit');
  const prixBal = data.prixIncorp.get(r.label) || data.prixCorp.get(r.label) || data.prixFin.get(r.label) || 0;
  return { brutBal, amortBal, prixBal };
}

export function computeRowVals(
  r: Rubrique,
  lignes: BalanceLigne[],
  data: Note3DComputedData,
  getAdj: (label: string, field: string) => number,
): RowVals {
  const base = getBaseRow(r, lignes, data);
  const a = base.brutBal + getAdj(r.label, 'brut_adj');
  const b = base.amortBal + getAdj(r.label, 'amort_adj');
  const c = a - b;
  const d = base.prixBal + getAdj(r.label, 'prix_adj');
  const e = d - c;
  return { a, b, c, d, e };
}

export function sumRowVals(
  rows: Rubrique[],
  lignes: BalanceLigne[],
  data: Note3DComputedData,
  getAdj: (label: string, field: string) => number,
): RowVals {
  return rows.reduce<RowVals>((acc, r) => {
    const v = computeRowVals(r, lignes, data, getAdj);
    return { a: acc.a + v.a, b: acc.b + v.b, c: acc.c + v.c, d: acc.d + v.d, e: acc.e + v.e };
  }, { a: 0, b: 0, c: 0, d: 0, e: 0 });
}
