// Compte de resultat SYSCOHADA — mappings, lignes, calculs purs.
// Les formules des sous-totaux (XA..XI) sont resolues par getValue.

import type { BalanceLigne, CRMapping } from '../../types';

export interface CRRow {
  ref: string;
  type: 'indent' | 'subtotal' | 'result' | 'total';
  note?: string;
  signe?: string;
  libelle: string;
  formula?: string;
}

export interface CRBalanceResult { net: number; }

// PRODUITS — comptes crediteurs (classe 7, 8x) : net = credit - debit
export const PRODUITS_MAPPING: CRMapping = {
  TA: { comptes: ['701'] },
  TB: { comptes: ['702', '703', '704'] },
  TC: { comptes: ['705', '706'] },
  TD: { comptes: ['707'] },
  TF: { comptes: ['72'] },
  TG: { comptes: ['71'] },
  TH: { comptes: ['75'] },
  TI: { comptes: ['781'] },
  TJ: { comptes: ['791', '798', '799'] },
  TK: { comptes: ['77'] },
  TL: { comptes: ['797'] },
  TM: { comptes: ['787'] },
  TN: { comptes: ['82'] },
  TO: { comptes: ['84', '86', '88'] },
};

// CHARGES — comptes debiteurs (classe 6, 8x) : net = debit - credit
export const CHARGES_MAPPING: CRMapping = {
  RA: { comptes: ['601'] },
  RC: { comptes: ['602'] },
  RE: { comptes: ['604', '605', '608'] },
  RG: { comptes: ['61'] },
  RH: { comptes: ['62', '63'] },
  RI: { comptes: ['64'] },
  RJ: { comptes: ['65'] },
  RK: { comptes: ['66'] },
  RL: { comptes: ['681', '691'] },
  RM: { comptes: ['67'] },
  RN: { comptes: ['697'] },
  RO: { comptes: ['81'] },
  RP: { comptes: ['83', '85'] },
  RQ: { comptes: ['87'] },
  RS: { comptes: ['89'] },
};

// Variations de stocks
export const VARIATION_CHARGES_MAPPING: CRMapping = {
  RB: { comptes: ['6031'] },
  RD: { comptes: ['6032'] },
  RF: { comptes: ['6033'] },
};

export const VARIATION_PRODUITS_MAPPING: CRMapping = {
  TE: { comptes: ['73'] },
};

export const CR_ROWS: CRRow[] = [
  // --- ACTIVITE D'EXPLOITATION ---
  { ref: 'TA', type: 'indent', note: '21', signe: '+', libelle: 'Ventes de marchandises' },
  { ref: 'RA', type: 'indent', note: '22', signe: '-', libelle: 'Achats de marchandises' },
  { ref: 'RB', type: 'indent', note: '6', signe: '-/+', libelle: 'Variation de stocks de marchandises' },
  { ref: 'XA', type: 'subtotal', signe: '', libelle: 'MARGE COMMERCIALE (Somme TA a RB)', formula: 'XA' },

  { ref: 'TB', type: 'indent', note: '21', signe: '+', libelle: 'Ventes de produits fabriques' },
  { ref: 'TC', type: 'indent', note: '21', signe: '+', libelle: 'Travaux, services vendus' },
  { ref: 'TD', type: 'indent', note: '21', signe: '+', libelle: 'Produits accessoires' },
  { ref: 'XB', type: 'subtotal', signe: '', libelle: "CHIFFRE D'AFFAIRES (A+B+C+D)", formula: 'XB' },

  { ref: 'TE', type: 'indent', note: '6', signe: '-/+', libelle: 'Production stockee (ou destockage)' },
  { ref: 'TF', type: 'indent', note: '21', signe: '+', libelle: 'Production immobilisee' },
  { ref: 'TG', type: 'indent', note: '21', signe: '+', libelle: "Subventions d'exploitation" },
  { ref: 'TH', type: 'indent', note: '21', signe: '+', libelle: 'Autres produits' },
  { ref: 'TI', type: 'indent', note: '12', signe: '+', libelle: "Transferts de charges d'exploitation" },
  { ref: 'RC', type: 'indent', note: '22', signe: '-', libelle: 'Achats de matieres premieres et fournitures liees' },
  { ref: 'RD', type: 'indent', note: '6', signe: '-/+', libelle: 'Variation de stocks de matieres premieres et fournitures liees' },
  { ref: 'RE', type: 'indent', note: '22', signe: '-', libelle: 'Autres achats' },
  { ref: 'RF', type: 'indent', note: '6', signe: '-/+', libelle: "Variation de stocks d'autres approvisionnements" },
  { ref: 'RG', type: 'indent', note: '23', signe: '-', libelle: 'Transports' },
  { ref: 'RH', type: 'indent', note: '24', signe: '-', libelle: 'Services exterieurs' },
  { ref: 'RI', type: 'indent', note: '25', signe: '-', libelle: 'Impots et taxes' },
  { ref: 'RJ', type: 'indent', note: '26', signe: '-', libelle: 'Autres charges' },
  { ref: 'XC', type: 'subtotal', signe: '', libelle: 'VALEUR AJOUTEE (XB+RA+RB) + (somme TE a RJ)', formula: 'XC' },

  { ref: 'RK', type: 'indent', note: '27', signe: '-', libelle: 'Charges de personnel' },
  { ref: 'XD', type: 'subtotal', signe: '', libelle: "EXCEDENT BRUT D'EXPLOITATION (XC+RK)", formula: 'XD' },

  { ref: 'TJ', type: 'indent', note: '28', signe: '+', libelle: "Reprises d'amortissements, provisions et depreciations" },
  { ref: 'RL', type: 'indent', note: '3C&28', signe: '-', libelle: 'Dotations aux amortissements, provisions et depreciations' },
  { ref: 'XE', type: 'result', signe: '', libelle: "RESULTAT D'EXPLOITATION (XD+TJ+RL)", formula: 'XE' },

  // --- ACTIVITE FINANCIERE ---
  { ref: 'TK', type: 'indent', note: '29', signe: '+', libelle: 'Revenus financiers et assimiles' },
  { ref: 'TL', type: 'indent', note: '28', signe: '+', libelle: 'Reprises de provisions et depreciations financieres' },
  { ref: 'TM', type: 'indent', note: '12', signe: '+', libelle: 'Transferts de charges financieres' },
  { ref: 'RM', type: 'indent', note: '29', signe: '-', libelle: 'Frais financiers et charges assimilees' },
  { ref: 'RN', type: 'indent', note: '3C&28', signe: '-', libelle: 'Dotations aux provisions et depreciations financieres' },
  { ref: 'XF', type: 'result', signe: '', libelle: 'RESULTAT FINANCIER (somme TK a RN)', formula: 'XF' },

  { ref: 'XG', type: 'result', signe: '', libelle: 'RESULTAT DES ACTIVITES ORDINAIRES (XE+XF)', formula: 'XG' },

  // --- HAO ---
  { ref: 'TN', type: 'indent', note: '3D', signe: '+', libelle: "Produits des cessions d'immobilisations" },
  { ref: 'TO', type: 'indent', note: '30', signe: '+', libelle: 'Autres Produits HAO' },
  { ref: 'RO', type: 'indent', note: '3D', signe: '-', libelle: "Valeurs comptables des cessions d'immobilisations" },
  { ref: 'RP', type: 'indent', note: '30', signe: '-', libelle: 'Autres Charges HAO' },
  { ref: 'XH', type: 'result', signe: '', libelle: 'RESULTAT HORS ACTIVITES ORDINAIRES (somme TN a RP)', formula: 'XH' },

  // --- RESULTAT ---
  { ref: 'RQ', type: 'indent', note: '30', signe: '-', libelle: 'Participation des travailleurs' },
  { ref: 'RS', type: 'indent', note: '37', signe: '-', libelle: 'Impots sur le resultat' },
  { ref: 'XI', type: 'total', signe: '', libelle: 'RESULTAT NET (XG+XH+RQ+RS)', formula: 'XI' },
];

export function formatMontant(val: number): string {
  if (!val || val === 0) return '0';
  return Math.round(val).toLocaleString('fr-FR');
}

function matchesComptes(numCompte: string, prefixes: string[]): boolean {
  return prefixes.some(p => numCompte.startsWith(p));
}

// Produits : credit - debit (solde crediteur = positif)
export function computeProduitsFromBalance(lignes: BalanceLigne[], mapping: CRMapping): Record<string, CRBalanceResult> {
  const result: Record<string, CRBalanceResult> = {};
  for (const ref in mapping) {
    const comptes = mapping[ref].comptes || [];
    let net = 0;
    for (const l of lignes) {
      const num = (l.numero_compte || '').trim();
      const sd = parseFloat(String(l.solde_debiteur_revise ?? l.solde_debiteur)) || 0;
      const sc = parseFloat(String(l.solde_crediteur_revise ?? l.solde_crediteur)) || 0;
      if (matchesComptes(num, comptes)) net += sc - sd;
    }
    result[ref] = { net };
  }
  return result;
}

// Charges : debit - credit (solde debiteur = positif)
export function computeChargesFromBalance(lignes: BalanceLigne[], mapping: CRMapping): Record<string, CRBalanceResult> {
  const result: Record<string, CRBalanceResult> = {};
  for (const ref in mapping) {
    const comptes = mapping[ref].comptes || [];
    let net = 0;
    for (const l of lignes) {
      const num = (l.numero_compte || '').trim();
      const sd = parseFloat(String(l.solde_debiteur_revise ?? l.solde_debiteur)) || 0;
      const sc = parseFloat(String(l.solde_crediteur_revise ?? l.solde_crediteur)) || 0;
      if (matchesComptes(num, comptes)) net += sd - sc;
    }
    result[ref] = { net };
  }
  return result;
}

export function computeAllCR(lignes: BalanceLigne[]): Record<string, CRBalanceResult> {
  const produits = computeProduitsFromBalance(lignes, PRODUITS_MAPPING);
  const charges = computeChargesFromBalance(lignes, CHARGES_MAPPING);
  const variationCharges = computeChargesFromBalance(lignes, VARIATION_CHARGES_MAPPING);
  const variationProduits = computeProduitsFromBalance(lignes, VARIATION_PRODUITS_MAPPING);
  return { ...produits, ...charges, ...variationCharges, ...variationProduits };
}

export function getBaseValue(ref: string, data: Record<string, CRBalanceResult>): number {
  return data[ref] ? (data[ref].net || 0) : 0;
}

// Sous-totaux et resultats calcules selon les formules SYSCOHADA.
export function getValue(ref: string, data: Record<string, CRBalanceResult>): number {
  switch (ref) {
    case 'XA': {
      // MARGE COMMERCIALE = TA - RA - RB
      return getBaseValue('TA', data) - getBaseValue('RA', data) - getBaseValue('RB', data);
    }
    case 'XB': {
      // CHIFFRE D'AFFAIRES = TA + TB + TC + TD
      return getBaseValue('TA', data) + getBaseValue('TB', data) + getBaseValue('TC', data) + getBaseValue('TD', data);
    }
    case 'XC': {
      // VALEUR AJOUTEE = XA + TB..TI - RC..RJ
      const xa = getValue('XA', data);
      const tb = getBaseValue('TB', data);
      const tc = getBaseValue('TC', data);
      const td = getBaseValue('TD', data);
      const te = getBaseValue('TE', data);
      const tf = getBaseValue('TF', data);
      const tg = getBaseValue('TG', data);
      const th = getBaseValue('TH', data);
      const ti = getBaseValue('TI', data);
      const rc = getBaseValue('RC', data);
      const rd = getBaseValue('RD', data);
      const re = getBaseValue('RE', data);
      const rf = getBaseValue('RF', data);
      const rg = getBaseValue('RG', data);
      const rh = getBaseValue('RH', data);
      const ri = getBaseValue('RI', data);
      const rj = getBaseValue('RJ', data);
      return xa + tb + tc + td + te + tf + tg + th + ti - rc - rd - re - rf - rg - rh - ri - rj;
    }
    case 'XD': {
      // EXCEDENT BRUT D'EXPLOITATION = XC - RK
      return getValue('XC', data) - getBaseValue('RK', data);
    }
    case 'XE': {
      // RESULTAT D'EXPLOITATION = XD + TJ - RL
      return getValue('XD', data) + getBaseValue('TJ', data) - getBaseValue('RL', data);
    }
    case 'XF': {
      // RESULTAT FINANCIER = TK + TL + TM - RM - RN
      return getBaseValue('TK', data) + getBaseValue('TL', data) + getBaseValue('TM', data)
        - getBaseValue('RM', data) - getBaseValue('RN', data);
    }
    case 'XG': {
      // RESULTAT DES ACTIVITES ORDINAIRES = XE + XF
      return getValue('XE', data) + getValue('XF', data);
    }
    case 'XH': {
      // RESULTAT HAO = TN + TO - RO - RP
      return getBaseValue('TN', data) + getBaseValue('TO', data) - getBaseValue('RO', data) - getBaseValue('RP', data);
    }
    case 'XI': {
      // RESULTAT NET = XG + XH - RQ - RS
      return getValue('XG', data) + getValue('XH', data) - getBaseValue('RQ', data) - getBaseValue('RS', data);
    }
    default:
      return getBaseValue(ref, data);
  }
}
