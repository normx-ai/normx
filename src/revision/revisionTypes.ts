export interface KPLigne {
  compte: string;
  designation: string;
  soldeN1: number;
  affectation: number;
  dividendes: number;
  variationCapital: number;
  soldeNCalcule: number;
  soldeNBalance: number;
  ecart: number;
}

export interface ODEcriture {
  id: number;
  date: string;
  compteDebit: string;
  libelleDebit: string;
  compteCredit: string;
  libelleCredit: string;
  montant: number;
  libelle: string;
  source: string;
}

export interface Suggestion {
  compteDebit: string;
  libelleDebit: string;
  compteCredit: string;
  libelleCredit: string;
  montant: number;
  libelle: string;
  source: string;
}

export function fmt(val: number): string {
  if (Math.abs(val) < 0.5) return '';
  return val.toLocaleString('fr-FR', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

export function fmtInput(val: number): string {
  if (!val) return '';
  return val.toLocaleString('fr-FR', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

export function parseInputValue(str: string): number {
  const cleaned = str.replace(/\s/g, '').replace(/\./g, '').replace(',', '.');
  return parseFloat(cleaned) || 0;
}
