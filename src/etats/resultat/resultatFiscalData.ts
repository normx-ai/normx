// Donnees et calculs purs pour le Resultat Fiscal (CGI Congo 2026 — IS / IBA).

import type { BalanceLigne } from '../../types';

export interface LigneReintegration {
  id: number;
  libelle: string;
  montant: number;
  article: string;
}

export interface BalanceApiRow {
  numero_compte: string;
  libelle_compte: string;
  debit: string | number;
  credit: string | number;
  solde_debiteur: string | number;
  solde_crediteur: string | number;
  solde_debiteur_revise?: number | null;
  solde_crediteur_revise?: number | null;
}

export const PRODUITS_EXPL_PREFIXES = ['70', '71', '72', '73', '75', '78', '79'];
export const PRODUITS_FIN_PREFIXES = ['77'];
export const PRODUITS_HAO_PREFIXES = ['82', '84', '86', '88'];
export const CHARGES_EXPL_PREFIXES = ['60', '61', '62', '63', '64', '65', '66', '68', '69'];
export const CHARGES_FIN_PREFIXES = ['67'];
export const CHARGES_HAO_PREFIXES = ['81', '83', '85', '87'];

export const REINTEGRATIONS_TYPES: { libelle: string; article: string }[] = [
  { libelle: 'Amendes, penalites et majorations fiscales', article: 'Art. 13-d' },
  { libelle: 'Dons et liberalites au-dela du plafond (0,5% CA)', article: 'Art. 13-a' },
  { libelle: 'Amortissements excedentaires (au-dela des taux admis)', article: 'Art. 8' },
  { libelle: 'Provisions non deductibles (conges, risques non precis)', article: 'Art. 11' },
  { libelle: 'Charges non justifiees ou sans facture', article: 'Art. 6' },
  { libelle: 'Depenses somptuaires (chasse, peche, residences)', article: 'Art. 13-b' },
  { libelle: 'Impot sur les societes (IS) comptabilise en charges', article: 'Art. 13-c' },
  { libelle: 'Interets excessifs sur comptes courants associes', article: 'Art. 9' },
  { libelle: 'Charges sur vehicules de tourisme > plafond', article: 'Art. 8-bis' },
  { libelle: 'Frais de siege > 20% du benefice comptable', article: 'Art. 13-e' },
  { libelle: 'Remunerations non declarees (DAS)', article: 'Art. 13' },
  { libelle: 'Taxe sur les vehicules de societes', article: 'Art. 13' },
  { libelle: 'Autre reintegration', article: '' },
];

export const DEDUCTIONS_TYPES: { libelle: string; article: string }[] = [
  { libelle: 'Dividendes deja imposes (regime societes meres)', article: 'Art. 27' },
  { libelle: 'Plus-values sur cessions reinvesties', article: 'Art. 18-20' },
  { libelle: 'Reprises de provisions anterieurement reintegrees', article: 'Art. 11' },
  { libelle: 'Produits exoneres par convention', article: 'Art. 4' },
  { libelle: 'Report deficitaire (max 3 ans)', article: 'Art. 15-bis' },
  { libelle: 'Autre deduction', article: '' },
];

export function formatMontant(val: number): string {
  if (!val || val === 0) return '0';
  const neg = val < 0;
  const abs = Math.abs(Math.round(val));
  const formatted = abs.toLocaleString('fr-FR');
  return neg ? '(' + formatted + ')' : formatted;
}

function matchesComptes(numCompte: string, prefixes: string[]): boolean {
  return prefixes.some(p => numCompte.startsWith(p));
}

export function sumSoldeCrediteur(lignes: BalanceLigne[], prefixes: string[]): number {
  let total = 0;
  for (const l of lignes) {
    const num = (l.numero_compte || '').trim();
    if (matchesComptes(num, prefixes)) {
      const sd = parseFloat(String(l.solde_debiteur_revise ?? l.solde_debiteur)) || 0;
      const sc = parseFloat(String(l.solde_crediteur_revise ?? l.solde_crediteur)) || 0;
      total += sc - sd;
    }
  }
  return total;
}

export function sumSoldeDebiteur(lignes: BalanceLigne[], prefixes: string[]): number {
  let total = 0;
  for (const l of lignes) {
    const num = (l.numero_compte || '').trim();
    if (matchesComptes(num, prefixes)) {
      const sd = parseFloat(String(l.solde_debiteur_revise ?? l.solde_debiteur)) || 0;
      const sc = parseFloat(String(l.solde_crediteur_revise ?? l.solde_crediteur)) || 0;
      total += sd - sc;
    }
  }
  return total;
}

export interface ResultatFiscalCalc {
  produitsExploitation: number;
  produitsFinanciers: number;
  produitsHAO: number;
  totalProduits: number;
  chargesExploitation: number;
  chargesFinancieres: number;
  chargesHAO: number;
  totalCharges: number;
  resultatComptable: number;
  totalReintegrations: number;
  totalDeductions: number;
  resultatFiscal: number;
  impotBrut: number;
  minimumPerception: number;
  minimumApplique: boolean;
  impotRetenu: number;
  beneficeNet: number;
  taux: number;
  tauxMin: number;
}

export function computeResultatFiscal(
  lignesN: BalanceLigne[],
  reintegrations: LigneReintegration[],
  deductions: LigneReintegration[],
  regimeFiscal: 'is' | 'iba',
  tauxIS: number,
  tauxIBA: number,
  tauxMinIS: number,
  tauxMinIBA: number,
): ResultatFiscalCalc {
  const produitsExploitation = sumSoldeCrediteur(lignesN, PRODUITS_EXPL_PREFIXES);
  const produitsFinanciers = sumSoldeCrediteur(lignesN, PRODUITS_FIN_PREFIXES);
  const produitsHAO = sumSoldeCrediteur(lignesN, PRODUITS_HAO_PREFIXES);
  const totalProduits = produitsExploitation + produitsFinanciers + produitsHAO;

  const chargesExploitation = sumSoldeDebiteur(lignesN, CHARGES_EXPL_PREFIXES);
  const chargesFinancieres = sumSoldeDebiteur(lignesN, CHARGES_FIN_PREFIXES);
  const chargesHAO = sumSoldeDebiteur(lignesN, CHARGES_HAO_PREFIXES);
  const totalCharges = chargesExploitation + chargesFinancieres + chargesHAO;

  const resultatComptable = totalProduits - totalCharges;

  const totalReintegrations = reintegrations.reduce((s, r) => s + (r.montant || 0), 0);
  const totalDeductions = deductions.reduce((s, d) => s + (d.montant || 0), 0);

  const resultatFiscal = Math.max(0, resultatComptable + totalReintegrations - totalDeductions);

  const taux = regimeFiscal === 'is' ? tauxIS : tauxIBA;
  const impotBrut = Math.round(resultatFiscal * taux);

  const tauxMin = regimeFiscal === 'is' ? tauxMinIS : tauxMinIBA;
  const minimumPerception = Math.round(totalProduits * tauxMin);
  const minimumApplique = minimumPerception > impotBrut;
  const impotRetenu = Math.max(impotBrut, minimumPerception);

  const beneficeNet = resultatComptable - impotRetenu;

  return {
    produitsExploitation, produitsFinanciers, produitsHAO, totalProduits,
    chargesExploitation, chargesFinancieres, chargesHAO, totalCharges,
    resultatComptable, totalReintegrations, totalDeductions, resultatFiscal,
    impotBrut, minimumPerception, minimumApplique, impotRetenu, beneficeNet,
    taux, tauxMin,
  };
}
