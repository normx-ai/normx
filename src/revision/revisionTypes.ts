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

// --- RevisionEtat types ---
export interface ISVerifLigne {
  id: number;
  designation: string;
  montant: number;
}

export interface TVACollecteeLigne {
  id: number;
  nature: string;
  baseHT: number;
  tauxTVA: number;
  tvaCalculee: number;
  tvaDeclaree: number;
  ecart: number;
}

export interface TVADeductibleLigne {
  id: number;
  nature: string;
  compte: string;
  tvaDeclaree: number;
  tvaBalance: number;
  ecart: number;
}

export interface AutresImpotsLigne {
  id: number;
  compte: string;
  designation: string;
  balance: number;
  justification: string;
  observation: string;
}

export interface DettesFiscalesLigne {
  id: number;
  compte: string;
  description: string;
  baseImposition: number;
  impotDeclare: number;
  balanceGenerale: number;
  ecart: number;
}

export interface RedressementLigne {
  id: number;
  typeControle: string;
  dateControle: string;
  referenceAMR: string;
  paye: 'Oui' | 'Non' | '';
  chargeAPayer4486: number;
  provisionContestation19: number;
}

// --- RevisionTreso types ---
export interface RapprochBancaireLigne {
  id: number;
  banque: string;
  compteBanque: string;
  soldeCompta: number;
  soldeReleve: number;
  chequesNonEncaisses: number;
  virEmisNonDebites: number;
  soldeReconcilie: number;
  ecart: number;
}

export interface CaisseLigne {
  id: number;
  compte: string;
  designation: string;
  soldeCompta: number;
  pvCaisse: number;
  ecart: number;
}

export interface TitrePlacementLigne {
  id: number;
  designation: string;
  compte: string;
  valeurAcquisition: number;
  valeurInventaire: number;
  depreciationNecessaire: number;
  depreciationBalance: number;
  ecartDeprec: number;
}

export interface VirementInterneLigne {
  compte: string;
  libelle: string;
  soldeN: number;
  observation: string;
}

export interface DispoDeviseLigne {
  id: number;
  banque: string;
  devise: string;
  soldeDevise: number;
  coursHistorique: number;
  valeurHistorique: number;
  coursCloture: number;
  valeurCloture: number;
  ecartChange: number;
}

export interface CircularisationBancaireLigne {
  id: number;
  banque: string;
  soldeCompte: number;
  soldeConfirme: number;
  ecart: number;
  empruntsConfirmes: string;
  cautions: string;
  signatairesAutorises: string;
  commentaire: string;
}

// --- RevisionClients types ---
export interface RecouvLigne {
  id: number;
  codeClient: string;
  nomClient: string;
  balanceAux: number;
  montantReconnu: number;
  reconnaissanceSignee: string;
}

export interface CreanceDouteuseLigne {
  id: number;
  codeClient: string;
  nomClient: string;
  soldeN1Creance: number;
  nouvellesCreances: number;
  paiements: number;
  soldeN1Deprec: number;
  dotations: number;
  reprises: number;
}

export interface DeprecVarLigne {
  compte: string;
  libelle: string;
  soldeN1: number;
  dotations6594: number;
  reprises7594: number;
  soldeNCalc: number;
  soldeNBalance: number;
}

export interface CreanceDeviseLigne {
  id: number;
  codeClient: string;
  nomClient: string;
  monnaie: string;
  valeurDevise: number;
  valeurInitialeFCFA: number;
  parite3112: number;
}

export interface CircularClientLigne {
  id: number;
  codeClient: string;
  nomClient: string;
  balanceAux: number;
  montantReconnu: number;
  reconnaissanceSignee: string;
  commentaire: string;
}

export interface ProdRecevoirLigne {
  compte: string;
  designation: string;
  soldeN: number;
  soldeN1: number;
  commentaire: string;
}
