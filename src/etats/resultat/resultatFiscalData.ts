// Donnees et calculs purs pour le Resultat Fiscal — Formulaire IS-2 (DGI Congo, CGI 2026).

import type { BalanceLigne } from '../../types';

export interface LigneReintegration {
  id: number;
  libelle: string;
  montant: number;
  article: string;
  isDefault?: boolean; // true = ligne pré-remplie issue du formulaire IS-2 (libellé fixe)
}

export interface LigneDeficit {
  id: number;
  annee_origine: number;          // ex: 2021, 2022, 2023 pour un exercice 2024
  montant_reportable: number;     // saisi
  montant_impute: number;         // saisi (limite = bénéfice IV)
}

export interface LigneARD {
  solde_debut: number;
  ard_exercice: number;
  ard_utilises: number;
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

// Les 16 catégories du formulaire officiel IS-2 (DGI Congo).
// Apparaissent par défaut, l'utilisateur saisit le montant. Il peut
// ajouter des lignes libres en plus via le bouton « Ajouter ».
export const REINTEGRATIONS_TYPES: { libelle: string; article: string }[] = [
  { libelle: 'Amortissements non déductibles', article: 'Art. 8' },
  { libelle: 'Amortissements réputés différés au point de vue fiscal', article: 'Art. 8' },
  { libelle: 'Provisions non déductibles (retraite)', article: 'Art. 11' },
  { libelle: 'Charges réputées différées au point de vue fiscal', article: 'Art. 6' },
  { libelle: 'Provisions Congés payés', article: 'Art. 11' },
  { libelle: "Rémunération de l'exploitant individuel et des associés des sociétés de personnes", article: 'Art. 6-c' },
  { libelle: "Part non déductible de la rémunération du conjoint de l'exploitant individuel", article: 'Art. 6-c' },
  { libelle: "Intérêts excédentaires des comptes courants d'associés", article: 'Art. 9' },
  { libelle: 'Impôts non déductibles (TVTS, TSS)', article: 'Art. 13-c' },
  { libelle: 'Amendes et pénalités non déductibles', article: 'Art. 13-d' },
  { libelle: 'Rappel IS sur exercices antérieurs', article: 'Art. 13-c' },
  { libelle: 'Dons et libéralités excessifs', article: 'Art. 13-a' },
  { libelle: "Frais de siège et d'assistance technique non déductibles", article: 'Art. 13-e' },
  { libelle: 'Divers', article: '' },
  { libelle: 'Avantage en nature excédentaire', article: 'Art. 6' },
  { libelle: 'Provisions Stocks', article: 'Art. 11' },
];

// Les 9 catégories du formulaire officiel IS-2.
export const DEDUCTIONS_TYPES: { libelle: string; article: string }[] = [
  { libelle: "Amortissements antérieurs différés et imputés sur l'exercice", article: 'Art. 8' },
  { libelle: 'Provisions entièrement taxées et réintégrées dans le résultat net comptable', article: 'Art. 11' },
  { libelle: "Fraction non imposable des plus-values réalisées en fin d'exploitation", article: 'Art. 18' },
  { libelle: 'Revenus mobiliers déductibles (Sociétés filiales)', article: 'Art. 123-4' },
  { libelle: 'Réinvestissement de bénéfice : quote-part déductible', article: 'Art. 18-20' },
  { libelle: 'Divers 1', article: '' },
  { libelle: 'Divers 2', article: '' },
  { libelle: 'Divers 3', article: '' },
  { libelle: 'Divers 4', article: '' },
];

// Génère les 16 lignes de réintégration par défaut pour un exercice neuf.
export function buildDefaultReintegrations(startId: number): LigneReintegration[] {
  return REINTEGRATIONS_TYPES.map((t, i) => ({
    id: startId + i,
    libelle: t.libelle,
    article: t.article,
    montant: 0,
    isDefault: true,
  }));
}

// Génère les 9 lignes de déduction par défaut.
export function buildDefaultDeductions(startId: number): LigneReintegration[] {
  return DEDUCTIONS_TYPES.map((t, i) => ({
    id: startId + i,
    libelle: t.libelle,
    article: t.article,
    montant: 0,
    isDefault: true,
  }));
}

// 3 lignes de déficits N-3, N-2, N-1 calculées depuis l'année exercice.
export function buildDefaultDeficits(startId: number, anneeExercice: number): LigneDeficit[] {
  return [3, 2, 1].map((decalage, i) => ({
    id: startId + i,
    annee_origine: anneeExercice - decalage,
    montant_reportable: 0,
    montant_impute: 0,
  }));
}

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
  resultatFiscal: number;          // IV
  totalDeficitsImputes: number;    // V
  resultatFiscalDefinitif: number; // VI
  ardSoldeFin: number;             // VII = solde_debut + ard_exercice - ard_utilises
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
  deficits: LigneDeficit[],
  ard: LigneARD,
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

  // IV. Résultat fiscal de l'exercice
  const resultatFiscal = resultatComptable + totalReintegrations - totalDeductions;

  // V. Imputations des reports déficitaires (saisis manuellement)
  const totalDeficitsImputes = deficits.reduce((s, d) => s + (d.montant_impute || 0), 0);

  // VI. Résultat fiscal définitif (plancher 0 pour l'IS)
  const resultatFiscalDefinitif = Math.max(0, resultatFiscal - totalDeficitsImputes);

  // VII. ARD : solde fin
  const ardSoldeFin = (ard.solde_debut || 0) + (ard.ard_exercice || 0) - (ard.ard_utilises || 0);

  const taux = regimeFiscal === 'is' ? tauxIS : tauxIBA;
  const impotBrut = Math.round(resultatFiscalDefinitif * taux);

  const tauxMin = regimeFiscal === 'is' ? tauxMinIS : tauxMinIBA;
  const minimumPerception = Math.round(totalProduits * tauxMin);
  const minimumApplique = minimumPerception > impotBrut;
  const impotRetenu = Math.max(impotBrut, minimumPerception);

  const beneficeNet = resultatComptable - impotRetenu;

  return {
    produitsExploitation, produitsFinanciers, produitsHAO, totalProduits,
    chargesExploitation, chargesFinancieres, chargesHAO, totalCharges,
    resultatComptable, totalReintegrations, totalDeductions,
    resultatFiscal, totalDeficitsImputes, resultatFiscalDefinitif, ardSoldeFin,
    impotBrut, minimumPerception, minimumApplique, impotRetenu, beneficeNet,
    taux, tauxMin,
  };
}
