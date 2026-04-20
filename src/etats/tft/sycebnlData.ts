// TFT SYCEBNL (methode DIRECTE, SYCEBNL-2022 p.348).
// Prefixes de comptes + TFT_ROWS + helpers purs + computeAllFluxSYCEBNL.

import type { BalanceLigne, TFTRow } from '../../types';

// Prefixes revenus (pour encaissements)
const COTISATIONS_PREFIXES: string[] = ['701'];
const SUBVENTIONS_EXPL_PREFIXES: string[] = ['71', '88'];
const GENEROSITE_PREFIXES: string[] = ['703'];
const MANIFESTATIONS_PREFIXES: string[] = ['706'];
const AUTRES_REVENUS_PREFIXES: string[] = ['702', '704', '705', '707', '708', '72', '73', '75', '77', '78', '79'];

// Prefixes charges (pour decaissements)
const FOURNISSEURS_CHARGES_PREFIXES: string[] = ['60', '61', '62', '63', '64', '65'];
const PERSONNEL_CHARGES_PREFIXES: string[] = ['66'];
const AUTRES_CHARGES_PREFIXES: string[] = ['67', '68', '69'];

// Prefixes creances (ajustement revenus -> encaissements)
const CREANCES_ADHERENTS_PREFIXES: string[] = ['411', '416', '418'];
const CREANCES_SUBVENTIONS_PREFIXES: string[] = ['4491', '4731', '475'];
const CREANCES_GENEROSITE_PREFIXES: string[] = ['4181'];
const CREANCES_CLIENTS_PREFIXES: string[] = ['412', '413', '419'];
const CREANCES_AUTRES_PREFIXES: string[] = ['42', '43', '44', '45', '47', '409', '485', '4865'];

// Prefixes dettes (ajustement charges -> decaissements)
const DETTES_FOURNISSEURS_PREFIXES: string[] = ['40', '481'];
const DETTES_PERSONNEL_PREFIXES: string[] = ['42', '43'];
const DETTES_AUTRES_PREFIXES: string[] = ['44', '46', '47', '488'];

// Immobilisations
const IMMOB_CORP_INCORP_PREFIXES: string[] = ['20', '21', '22', '23', '24', '25'];
const IMMOB_FIN_PREFIXES: string[] = ['26', '27'];

// Financement
const DOTATION_FP_PREFIXES: string[] = ['10', '11', '12', '14', '15'];
const SUBV_INVEST_PREFIXES: string[] = ['14'];
const EMPRUNTS_PREFIXES: string[] = ['18'];

// Tresorerie
const TRESORERIE_ACTIF_PREFIXES: string[] = ['50', '51', '52', '53', '55', '57'];
const TRESORERIE_PASSIF_PREFIXES: string[] = ['56'];

export const TFT_ROWS_SYCEBNL: TFTRow[] = [
  { ref: 'ZA', type: 'indent', note: '', libelle: 'Tresorerie nette au 1er janvier (A)' },

  { type: 'section', libelle: 'FLUX DE TRESORERIE PROVENANT DES ACTIVITES OPERATIONNELLES' },
  { ref: 'FA', type: 'indent', note: '23', libelle: '(+) Encaissement des cotisations' },
  { ref: 'FB', type: 'indent', note: '', libelle: "(+) Encaissement des subventions d'exploitation et d'equilibre" },
  { ref: 'FC', type: 'indent', note: '23', libelle: '(+) Encaissement des revenus lies a la generosite' },
  { ref: 'FD', type: 'indent', note: '23', libelle: '(+) Encaissement des revenus des manifestations' },
  { ref: 'FE', type: 'indent', note: '23', libelle: '(+) Encaissement des autres revenus' },
  { ref: 'FF', type: 'indent', note: '', libelle: '(-) Decaissement des sommes versees aux fournisseurs (1)' },
  { ref: 'FG', type: 'indent', note: '29', libelle: '(-) Decaissement des sommes versees au personnel' },
  { ref: 'FH', type: 'indent', note: '', libelle: '(-) Autres decaissements' },
  { ref: 'ZB', type: 'subtotal', libelle: 'FLUX DE TRESORERIE DES ACTIVITES OPERATIONNELLES (B)' },

  { type: 'section', libelle: "FLUX DE TRESORERIE PROVENANT DES ACTIVITES D'INVESTISSEMENT" },
  { ref: 'FI', type: 'indent', note: '5', libelle: "(-) Decaissements acquisitions d'immobilisations incorporelles et corporelles" },
  { ref: 'FJ', type: 'indent', note: '6', libelle: "(-) Decaissements acquisitions d'immobilisations financieres" },
  { ref: 'FK', type: 'indent', note: '', libelle: "(+) Encaissements cessions d'immobilisations incorporelles et corporelles" },
  { ref: 'FL', type: 'indent', note: '', libelle: "(+) Encaissements cessions d'immobilisations financieres" },
  { ref: 'ZC', type: 'subtotal', libelle: "FLUX DE TRESORERIE DES ACTIVITES D'INVESTISSEMENT (C)" },

  { type: 'section', libelle: 'FLUX DE TRESORERIE PROVENANT DU FINANCEMENT PAR LES FONDS PROPRES' },
  { ref: 'FM', type: 'indent', note: '15', libelle: '(+) Encaissement des dotations et autres fonds propres' },
  { ref: 'FN', type: 'indent', note: '17A', libelle: "(+) Subventions d'investissement recues" },
  { ref: 'FO', type: 'indent', note: '', libelle: '(-) Decaissement des dotations et autres fonds propres' },
  { ref: 'ZD', type: 'subtotal', libelle: 'FLUX DE TRESORERIE DES FONDS PROPRES (D)' },

  { type: 'section', libelle: 'TRESORERIE PROVENANT DU FINANCEMENT PAR LES FONDS ETRANGERS' },
  { ref: 'FP', type: 'indent', note: '18A', libelle: '(+) Encaissement provenant des emprunts et autres dettes financieres' },
  { ref: 'FQ', type: 'indent', note: '18A', libelle: '(-) Remboursements des emprunts et autres dettes financieres' },
  { ref: 'ZE', type: 'subtotal', libelle: 'TRESORERIE DES FONDS ETRANGERS (E)' },

  { type: 'section', libelle: 'SYNTHESE' },
  { ref: 'ZF', type: 'result', libelle: 'VARIATION DE LA TRESORERIE NETTE DE LA PERIODE (B+C+D+E) = (G)' },
  { ref: 'ZG', type: 'total', libelle: 'TRESORERIE NETTE AU 31 DECEMBRE (G+A) = (H)' },
  { ref: 'ZH', type: 'indent', note: '', libelle: 'Controle : Tresorerie actif N - Tresorerie passif N' },
];

// Format avec parentheses pour les negatifs (compatible SYCEBNL).
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

// Solde debiteur net (SD - SC, positif = solde debiteur).
function sumSoldeDebiteur(lignes: BalanceLigne[], prefixes: string[], excludes: string[] = []): number {
  let total = 0;
  for (const l of lignes) {
    const num = (l.numero_compte || '').trim();
    if (matchesComptes(num, prefixes) && !matchesComptes(num, excludes)) {
      const sd = parseFloat(String(l.solde_debiteur_revise ?? l.solde_debiteur)) || 0;
      const sc = parseFloat(String(l.solde_crediteur_revise ?? l.solde_crediteur)) || 0;
      total += sd - sc;
    }
  }
  return total;
}

// Solde crediteur net (SC - SD, positif = solde crediteur).
function sumSoldeCrediteur(lignes: BalanceLigne[], prefixes: string[], excludes: string[] = []): number {
  let total = 0;
  for (const l of lignes) {
    const num = (l.numero_compte || '').trim();
    if (matchesComptes(num, prefixes) && !matchesComptes(num, excludes)) {
      const sd = parseFloat(String(l.solde_debiteur_revise ?? l.solde_debiteur)) || 0;
      const sc = parseFloat(String(l.solde_crediteur_revise ?? l.solde_crediteur)) || 0;
      total += sc - sd;
    }
  }
  return total;
}

function computeTresorerieNette(lignes: BalanceLigne[]): number {
  const actif = sumSoldeDebiteur(lignes, TRESORERIE_ACTIF_PREFIXES);
  const passif = sumSoldeCrediteur(lignes, TRESORERIE_PASSIF_PREFIXES);
  return actif - passif;
}

// Methode directe : Encaissements = Revenus N - (Creances N - Creances N-1)
function computeEncaissement(lN: BalanceLigne[], lN1: BalanceLigne[], revenusPrefixes: string[], creancesPrefixes: string[]): number {
  const revenus = sumSoldeCrediteur(lN, revenusPrefixes);
  const creancesN = sumSoldeDebiteur(lN, creancesPrefixes);
  const creancesN1 = sumSoldeDebiteur(lN1, creancesPrefixes);
  return revenus - (creancesN - creancesN1);
}

// Decaissements = Charges N - (Dettes N - Dettes N-1) [positif = decaissement].
function computeDecaissement(lN: BalanceLigne[], lN1: BalanceLigne[], chargesPrefixes: string[], dettesPrefixes: string[]): number {
  const charges = sumSoldeDebiteur(lN, chargesPrefixes);
  const dettesN = sumSoldeCrediteur(lN, dettesPrefixes);
  const dettesN1 = sumSoldeCrediteur(lN1, dettesPrefixes);
  return charges - (dettesN - dettesN1);
}

export function computeAllFluxSYCEBNL(lN: BalanceLigne[], lN1: BalanceLigne[]): Record<string, number> {
  const data: Record<string, number> = {};

  // ZA -- Tresorerie nette au 1er janvier
  data.ZA = computeTresorerieNette(lN1);

  // --- FLUX OPERATIONNELS (methode directe : encaissements - decaissements) ---
  data.FA = computeEncaissement(lN, lN1, COTISATIONS_PREFIXES, CREANCES_ADHERENTS_PREFIXES);
  data.FB = computeEncaissement(lN, lN1, SUBVENTIONS_EXPL_PREFIXES, CREANCES_SUBVENTIONS_PREFIXES);
  data.FC = computeEncaissement(lN, lN1, GENEROSITE_PREFIXES, CREANCES_GENEROSITE_PREFIXES);
  data.FD = computeEncaissement(lN, lN1, MANIFESTATIONS_PREFIXES, CREANCES_CLIENTS_PREFIXES);
  data.FE = computeEncaissement(lN, lN1, AUTRES_REVENUS_PREFIXES, CREANCES_AUTRES_PREFIXES);
  // Exclut les fournisseurs d'investissements (481) pour FF.
  data.FF = -computeDecaissement(lN, lN1, FOURNISSEURS_CHARGES_PREFIXES, DETTES_FOURNISSEURS_PREFIXES);
  data.FG = -computeDecaissement(lN, lN1, PERSONNEL_CHARGES_PREFIXES, DETTES_PERSONNEL_PREFIXES);
  data.FH = -computeDecaissement(lN, lN1, AUTRES_CHARGES_PREFIXES, DETTES_AUTRES_PREFIXES);
  data.ZB = data.FA + data.FB + data.FC + data.FD + data.FE + data.FF + data.FG + data.FH;

  // --- FLUX D'INVESTISSEMENT ---
  const immobCorpN = sumSoldeDebiteur(lN, IMMOB_CORP_INCORP_PREFIXES);
  const immobCorpN1 = sumSoldeDebiteur(lN1, IMMOB_CORP_INCORP_PREFIXES);
  data.FI = -(immobCorpN - immobCorpN1);
  if (data.FI > 0) data.FI = 0;

  const immobFinN = sumSoldeDebiteur(lN, IMMOB_FIN_PREFIXES);
  const immobFinN1 = sumSoldeDebiteur(lN1, IMMOB_FIN_PREFIXES);
  data.FJ = -(immobFinN - immobFinN1);
  if (data.FJ > 0) data.FJ = 0;

  data.FK = sumSoldeCrediteur(lN, ['82']);
  data.FL = sumSoldeCrediteur(lN, ['826']);

  data.ZC = data.FI + data.FJ + data.FK + data.FL;

  // --- FINANCEMENT PAR FONDS PROPRES ---
  const fpN = sumSoldeCrediteur(lN, DOTATION_FP_PREFIXES, SUBV_INVEST_PREFIXES);
  const fpN1 = sumSoldeCrediteur(lN1, DOTATION_FP_PREFIXES, SUBV_INVEST_PREFIXES);
  const varFP = fpN - fpN1;
  data.FM = varFP > 0 ? varFP : 0;

  const subvInvN = sumSoldeCrediteur(lN, SUBV_INVEST_PREFIXES);
  const subvInvN1 = sumSoldeCrediteur(lN1, SUBV_INVEST_PREFIXES);
  const varSubvInv = subvInvN - subvInvN1;
  data.FN = varSubvInv > 0 ? varSubvInv : 0;

  data.FO = varFP < 0 ? varFP : 0;
  data.ZD = data.FM + data.FN + data.FO;

  // --- FINANCEMENT PAR FONDS ETRANGERS ---
  const empruntsN = sumSoldeCrediteur(lN, EMPRUNTS_PREFIXES);
  const empruntsN1 = sumSoldeCrediteur(lN1, EMPRUNTS_PREFIXES);
  const varEmprunts = empruntsN - empruntsN1;
  data.FP = varEmprunts > 0 ? varEmprunts : 0;
  data.FQ = varEmprunts < 0 ? varEmprunts : 0;
  data.ZE = data.FP + data.FQ;

  // --- SYNTHESE ---
  data.ZF = data.ZB + data.ZC + data.ZD + data.ZE;
  data.ZG = data.ZF + data.ZA;
  data.ZH = computeTresorerieNette(lN);

  return data;
}
