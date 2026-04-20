// Donnees et calculs purs de la Reconciliation de Tresorerie (§2290 SYCEBNL Projet).

import type { BalanceLigne } from '../../types';

export interface ReconcRow {
  ref: string;
  type: 'section' | 'indent' | 'total';
  libelle: string;
  autoKey?: string;
  editable?: boolean;
  editableSection?: boolean;
  computeG?: boolean;
  computeI?: boolean;
}

export interface TresorerieResult {
  total: number;
  banques: number;
  caisse: number;
}

export interface FondsBailleursResult {
  total: number;
  principal: number;
  autres: number;
}

export interface DepensesResult {
  total: number;
  charges: number;
  immob: number;
}

const TRESORERIE_DEBUT_PREFIXES: string[] = ['5'];
const FONDS_BAILLEURS_PREFIXES: string[] = ['162', '163', '164', '462', '463', '464'];

export const RECONC_ROWS: ReconcRow[] = [
  { ref: 'RA', type: 'section', libelle: 'A - TRÉSORERIE EN DÉBUT D\'EXERCICE N', autoKey: 'tresorerieDebut' },
  { ref: 'RA1', type: 'indent', libelle: 'Banques', autoKey: 'tresorerieDebut_detail', editable: false },
  { ref: 'RA2', type: 'indent', libelle: 'Caisse', autoKey: 'tresorerieDebut_caisse', editable: false },
  { ref: 'RB', type: 'section', libelle: 'B - FONDS REÇUS DES BAILLEURS AU COURS DE L\'EXERCICE N', autoKey: 'fondsRecusBailleurs' },
  { ref: 'RB1', type: 'indent', libelle: 'Bailleur principal', autoKey: 'fondsRecusBailleurs_detail', editable: false },
  { ref: 'RB2', type: 'indent', libelle: 'Autres bailleurs', autoKey: 'fondsRecusBailleurs_autres', editable: false },
  { ref: 'RC', type: 'section', libelle: 'C - INTÉRÊTS REÇUS AU COURS DE L\'EXERCICE N', editableSection: true },
  { ref: 'RC1', type: 'indent', libelle: 'Intérêts bancaires', editable: true },
  { ref: 'RC2', type: 'indent', libelle: 'Autres intérêts', editable: true },
  { ref: 'RD', type: 'section', libelle: 'D - AUTRES FONDS REÇUS AU COURS DE L\'EXERCICE N', editableSection: true },
  { ref: 'RD1', type: 'indent', libelle: 'Fonds de contrepartie', editable: true },
  { ref: 'RD2', type: 'indent', libelle: 'Autres recettes', editable: true },
  { ref: 'RE', type: 'section', libelle: 'E - VIREMENTS SUR COMPTES OPÉRATIONNELS', editableSection: true },
  { ref: 'RE1', type: 'indent', libelle: 'Virements internes', editable: true },
  { ref: 'RE2', type: 'indent', libelle: 'Autres virements', editable: true },
  { ref: 'RF', type: 'section', libelle: 'F - DÉPENSES DE L\'EXERCICE N', autoKey: 'depenses' },
  { ref: 'RF1', type: 'indent', libelle: 'Achats et charges', autoKey: 'depenses_charges', editable: false },
  { ref: 'RF2', type: 'indent', libelle: 'Immobilisations', autoKey: 'depenses_immob', editable: false },
  { ref: 'RG', type: 'total', libelle: 'G - TRÉSORERIE EN FIN D\'EXERCICE N (A + B + C + D - E - F)', computeG: true },
  { ref: 'RH', type: 'section', libelle: 'H - PAIEMENTS EN INSTANCE', editableSection: true },
  { ref: 'RH1', type: 'indent', libelle: 'Chèques émis non encaissés', editable: true },
  { ref: 'RH2', type: 'indent', libelle: 'Autres paiements en instance', editable: true },
  { ref: 'RI', type: 'total', libelle: 'I - TRÉSORERIE NETTE DES PAIEMENTS EN INSTANCE (G - H)', computeI: true },
];

function matchesComptes(numCompte: string, prefixes: string[]): boolean {
  return prefixes.some(p => numCompte.startsWith(p));
}

export function formatMontant(val: number): string {
  if (!val || Math.abs(val) < 0.5) return '0';
  return Math.round(val).toLocaleString('fr-FR');
}

export function getStorageKey(entiteId: number, exerciceId: number): string {
  return `reconc_tresorerie_${entiteId}_${exerciceId}`;
}

export function computeTresorerieDebut(lignes: BalanceLigne[]): TresorerieResult {
  let total = 0;
  let banques = 0;
  let caisse = 0;
  for (const l of lignes) {
    const num = (l.numero_compte || '').trim();
    if (matchesComptes(num, TRESORERIE_DEBUT_PREFIXES)) {
      const sd = parseFloat(String(l.solde_debiteur)) || 0;
      const sc = parseFloat(String(l.solde_crediteur)) || 0;
      const solde = sd - sc;
      total += solde;
      if (num.startsWith('57')) {
        caisse += solde;
      } else {
        banques += solde;
      }
    }
  }
  return { total, banques, caisse };
}

export function computeFondsBailleurs(lignes: BalanceLigne[]): FondsBailleursResult {
  let total = 0;
  let principal = 0;
  let autres = 0;
  for (const l of lignes) {
    const num = (l.numero_compte || '').trim();
    if (matchesComptes(num, FONDS_BAILLEURS_PREFIXES)) {
      const sc = parseFloat(String(l.solde_crediteur_revise ?? l.solde_crediteur)) || 0;
      const sd = parseFloat(String(l.solde_debiteur_revise ?? l.solde_debiteur)) || 0;
      const val = sc - sd;
      total += val;
      if (num.startsWith('162') || num.startsWith('462')) {
        principal += val;
      } else {
        autres += val;
      }
    }
  }
  return { total, principal, autres };
}

export function computeDepenses(lignes: BalanceLigne[]): DepensesResult {
  let total = 0;
  let charges = 0;
  let immob = 0;
  for (const l of lignes) {
    const num = (l.numero_compte || '').trim();
    if (num.startsWith('6')) {
      const sd = parseFloat(String(l.solde_debiteur_revise ?? l.solde_debiteur)) || 0;
      const sc = parseFloat(String(l.solde_crediteur_revise ?? l.solde_crediteur)) || 0;
      const val = Math.abs(sd - sc);
      charges += val;
      total += val;
    } else if (num.startsWith('2')) {
      const sd = parseFloat(String(l.solde_debiteur_revise ?? l.solde_debiteur)) || 0;
      const sc = parseFloat(String(l.solde_crediteur_revise ?? l.solde_crediteur)) || 0;
      const val = Math.abs(sd - sc);
      immob += val;
      total += val;
    }
  }
  return { total, charges, immob };
}

export interface ReconcTotals {
  tresorerieDebut: TresorerieResult;
  fondsBailleurs: FondsBailleursResult;
  depenses: DepensesResult;
  totalC: number;
  totalD: number;
  totalE: number;
  totalH: number;
  totalG: number;
  totalI: number;
}

export function computeReconcTotals(lignes: BalanceLigne[], editableValues: Record<string, number>): ReconcTotals {
  const tresorerieDebut = computeTresorerieDebut(lignes);
  const fondsBailleurs = computeFondsBailleurs(lignes);
  const depenses = computeDepenses(lignes);
  const totalC = (editableValues['RC1'] || 0) + (editableValues['RC2'] || 0);
  const totalD = (editableValues['RD1'] || 0) + (editableValues['RD2'] || 0);
  const totalE = (editableValues['RE1'] || 0) + (editableValues['RE2'] || 0);
  const totalH = (editableValues['RH1'] || 0) + (editableValues['RH2'] || 0);
  const totalG = tresorerieDebut.total + fondsBailleurs.total + totalC + totalD - totalE - depenses.total;
  const totalI = totalG - totalH;
  return { tresorerieDebut, fondsBailleurs, depenses, totalC, totalD, totalE, totalH, totalG, totalI };
}

export function getRowValue(row: ReconcRow, totals: ReconcTotals, editableValues: Record<string, number>): number {
  if (row.ref === 'RA') return totals.tresorerieDebut.total;
  if (row.ref === 'RA1') return totals.tresorerieDebut.banques;
  if (row.ref === 'RA2') return totals.tresorerieDebut.caisse;
  if (row.ref === 'RB') return totals.fondsBailleurs.total;
  if (row.ref === 'RB1') return totals.fondsBailleurs.principal;
  if (row.ref === 'RB2') return totals.fondsBailleurs.autres;
  if (row.ref === 'RF') return totals.depenses.total;
  if (row.ref === 'RF1') return totals.depenses.charges;
  if (row.ref === 'RF2') return totals.depenses.immob;
  if (row.ref === 'RC') return totals.totalC;
  if (row.ref === 'RD') return totals.totalD;
  if (row.ref === 'RE') return totals.totalE;
  if (row.ref === 'RH') return totals.totalH;
  if (row.computeG) return totals.totalG;
  if (row.computeI) return totals.totalI;
  if (row.editable) return editableValues[row.ref] || 0;
  return 0;
}
