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

// Helpers pour utiliser les valeurs revisees avec fallback sur les originales
import type { BalanceLigne } from '../types';

export function getSD(l: BalanceLigne): number {
  return parseFloat(String(l.solde_debiteur_revise ?? l.solde_debiteur)) || 0;
}

export function getSC(l: BalanceLigne): number {
  return parseFloat(String(l.solde_crediteur_revise ?? l.solde_crediteur)) || 0;
}

export function soldeNet(l: BalanceLigne): number {
  return getSD(l) - getSC(l);
}

export function soldeCreditNet(l: BalanceLigne): number {
  return getSC(l) - getSD(l);
}

export function totalSoldeNet(lignes: BalanceLigne[]): number {
  return lignes.reduce((s, l) => s + soldeNet(l), 0);
}

export function totalSoldeCreditNet(lignes: BalanceLigne[]): number {
  return lignes.reduce((s, l) => s + soldeCreditNet(l), 0);
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

// --- RevisionImmo types ---
export interface InvLigne {
  id: number;
  idImmo: string;
  designation: string;
  nombre: number;
  valeurFichier: number;
  pvInventaire: number;
}

export interface RapprochLigne {
  compte: string;
  designation: string;
  fichierImmo: number;
  balanceGenerale: number;
}

export interface EncoursLigne {
  id: number;
  projet: string;
  designation: string;
  fournisseur: string;
  numFacture: string;
  dateFacture: string;
  montant: number;
}

export interface SortieLigne {
  id: number;
  numFichier: string;
  designation: string;
  natureSortie: string;
  valeurBrute: number;
  cumulAmort: number;
  prixCession: number;
  docJustificatif: string;
}

export interface AmortLigne {
  id: number;
  numFichier: string;
  designation: string;
  dateMiseEnService: string;
  natureImmo: string;
  dureeUtilite: number;
  baseAmortissable: number;
}

export interface ChargeImmoLigne {
  id: number;
  compte: string;
  designation: string;
  natureDepense: string;
  montant: number;
  frequence: string;
  conclusion: string;
}

export const TRAVAUX_IMMO: string[] = [
  "Inventaires de fin d'année et rapprochement avec le(s) fichier(s) des immobilisations",
  "Dresser un procès-verbal d'inventaire",
  'Tableau de mouvements des immobilisations incorporelles, corporelles, financières',
  "Fichier des immobilisations, des acquisitions, des cessions, des transferts, des amortissements",
  'Détail des immobilisations en cours',
  'Détail des mises au rebut (préparer les procès-verbaux associés)',
  "Dossiers des cessions d'immobilisations (factures, actes notariés, preuves de paiements)",
  'États financiers à la clôture des filiales et participations (titres de participation)',
  'Justifier le compte "Avances sur immobilisations" ou le solder si N/A',
  "Vérifier le calcul des amortissements (dotations de l'exercice) et le taux appliqué",
  "Analyser les charges pouvant être immobilisées et justifier l'immobilisation si applicable",
  'Vérifier le calcul des amortissements différés (si applicable)',
  'Préparer les lettres de circularisation avec les CAC pour les dépôts et cautionnements',
];

// --- RevisionProv types ---
export interface ProvLigne {
  compte: string;
  designation: string;
  soldeN1: number;
  dotation: number;
  reprise: number;
  soldeNCalcule: number;
  soldeNBalance: number;
  ecart: number;
}

export interface AmortDerogLigne {
  id: number;
  bien: string;
  refImmo: string;
  valeurBrute: number;
  amortDerog: number;
  cede: boolean;
  repriseDerog: number;
}

export interface ProvRCLigne {
  compte: string;
  designation: string;
  soldeN1: number;
  dotation: number;
  reprise: number;
  soldeNCalcule: number;
  soldeNBalance: number;
  ecart: number;
}

export const TRAVAUX_PROV: string[] = [
  'Vérifier le bien-fondé et le mode de calcul de chaque provision réglementée',
  'Contrôler la cohérence entre dotations, reprises et variations bilantielles',
  'Analyser les provisions pour investissement, hausse des prix, amortissements dérogatoires',
  'Vérifier la conformité avec la réglementation fiscale en vigueur',
  "S'assurer que les provisions ne sont pas maintenues sans justification",
  'Rapprocher les dotations/reprises avec les comptes 851/861 correspondants',
];

export const PROV_RC_TYPES: Record<string, string> = {
  '191': 'Provisions pour litiges',
  '192': 'Provisions pour garanties données aux clients',
  '193': 'Provisions pour pertes sur marchés/contrats déficitaires',
  '194': 'Provisions pour pertes de change',
  '195': 'Provisions pour impôts',
  '196': 'Provisions pour pensions et obligations similaires (retraite)',
  '197': 'Provisions pour charges à répartir',
};

// --- RevisionPersonnel types ---
export interface ChargePersonnelLigne {
  compte: string;
  designation: string;
  soldeN: number;
  soldeN1: number;
  variation: number;
  variationPct: number;
}

export interface AvanceLigne {
  compte: string;
  designation: string;
  soldeN: number;
  soldeN1: number;
  anteriorite: string;
  accordFormalise: string;
  observations: string;
}

export interface DetteSocialeLigne {
  compte: string;
  designation: string;
  soldeN: number;
  soldeN1: number;
  variation: number;
  commentaire: string;
}

export interface ProvisionCongesData {
  masseSalariale: number;
  joursCongesParMois: number;
  tauxChargesSociales: number;
  tauxChargesFiscales: number;
}

export const TRAVAUX_PERSONNEL: string[] = [
  'Vérifier la cohérence globale des charges de personnel par rapport à N-1 (revue analytique)',
  'Calculer et comptabiliser la provision pour congés payés',
  'Justifier les avances et acomptes au personnel (comptes 421x)',
  'Rapprocher les dettes sociales (comptes 43x) avec les déclarations sociales et fiscales',
  'Vérifier les charges sociales patronales (CNSS, ONEMO, etc.)',
  'Contrôler les indemnités de fin de contrat et provisions associées',
  'Vérifier la conformité des bulletins de paie avec la comptabilité',
  'Rapprocher la masse salariale avec les déclarations fiscales (IRPP, contribution forfaitaire)',
];

// --- RevisionStocks types ---
export interface InvStockLigne {
  id: number;
  designation: string;
  compte: string;
  coutUnitaire: number;
  quantitePV: number;
}

export interface ValoLigne {
  id: number;
  reference: string;
  designation: string;
  quantite: number;
  facturePrincipale: number;
  transport: number;
  douane: number;
  autresCouts: number;
  coutSysteme: number;
}

export interface VarLigne {
  compte: string;
  designation: string;
  soldeN1: number;
  variation603ou73: number;
  soldeNCalc: number;
  soldeNBalance: number;
}

export interface EncoursRouteLigne {
  id: number;
  dossierImport: string;
  fournisseur: string;
  facturePrincipale: number;
  transport: number;
  douane: number;
  debours: number;
}

export interface DeprecLigne {
  id: number;
  designation: string;
  compte: string;
  quantite: number;
  coutUnitaire: number;
  valeurActuelle: number;
  motif: string;
}

// --- RevisionDF types ---
export interface PretLigne {
  id: number;
  contratNo: string;
  bailleur: string;
  dateObtention: string;
  soldeN1: number;
  nouveauxEmprunts: number;
  remboursement: number;
  planAmort: number;
}

export interface InteretLigne {
  id: number;
  contratNo: string;
  bailleur: string;
  compte: string;
  chargesComptabilisees: number;
  releveBancaire: number;
  planRemboursement: number;
}

export interface InteretCoururLigne {
  id: number;
  contratNo: string;
  bailleur: string;
  compte: string;
  dateEcheance: string;
  dateFinMois: string;
  interetsMensuels: number;
}

export interface AutreChargeLigne {
  id: number;
  contratNo: string;
  bailleur: string;
  compte: string;
  natureCharge: string;
  releveBancaire: number;
  balance: number;
  planRemboursement: number;
}

export const TRAVAUX_DF: string[] = [
  'Lister les prêts encore ouverts à la clôture',
  'Préparer les contrats de prêts signés',
  "Réconcilier avec les tableaux d'amortissement",
  'Vérifier le calcul des dettes rattachées (intérêts courus)',
  'Justifier le paiement des échéances',
  "Vérifier le traitement des contrats de location remplissant les conditions d'activation (voir DL)",
];

// --- RevisionFourn types ---
export interface ReconFournLigne {
  id: number;
  codeFourn: string;
  designation: string;
  solde3112: number;
  soldeReconcilie: number;
  commentaire: string;
}

export interface FarLigne {
  id: number;
  numCommande: string;
  libellePrestation: string;
  docJustificatif: string;
  montant: number;
}

export interface FournDebiteurLigne {
  id: number;
  codeFourn: string;
  designation: string;
  solde3112: number;
  dateDebit: string;
  objetDebit: string;
  commentaire: string;
}

export interface AvanceFournLigne {
  id: number;
  codeFourn: string;
  designation: string;
  avance: number;
  objetAvance: string;
  conclusion: string;
}

export interface DetteDeviseLigne {
  id: number;
  codeFourn: string;
  nomFourn: string;
  monnaie: string;
  valeurInitialeFCFA: number;
  parite3112: number;
  valeurDevise: number;
}

export interface CircuFournLigne {
  id: number;
  codeFourn: string;
  nomFourn: string;
  solde3112: number;
  soldeReconcilie: number;
  commentaire: string;
}

export const TRAVAUX_FOURN: string[] = [
  'Éditer la balance auxiliaire fournisseurs et la rapprocher avec la comptabilité générale',
  'Éditer la balance âgée fournisseurs et analyser les encours à forte antériorité (90 et 180 jours)',
  'Détail des factures à recevoir (support de comptabilisation, apurement post-clôture)',
  "Détail des avoirs à recevoir (vérification de l'évaluation et justification)",
  "Journal d'achats de la dernière période N et de la première période N+1 (cut-off)",
  'Analyser et justifier les comptes de fournisseurs débiteurs',
  "Analyser l'apurement post-clôture",
  "Rapprocher les principaux fournisseurs (volumes d'achats et soldes de clôture)",
  'Insérer la balance auxiliaire à la date de clôture',
  'Circulariser les fournisseurs en collaboration avec les CAC',
];

// --- RevisionAutresTiers types ---
export interface CCALigne {
  id: number;
  compte: string;
  designation: string;
  soldeN: number;
  soldeN1: number;
  natureCharge: string;
  periodeCouverte: string;
  justifie: 'Oui' | 'Non';
}

export interface PCALigne {
  id: number;
  compte: string;
  designation: string;
  soldeN: number;
  soldeN1: number;
  natureProduit: string;
  periodeCouverte: string;
  justifie: 'Oui' | 'Non';
}

export interface AttenteLigne {
  id: number;
  compte: string;
  designation: string;
  soldeN: number;
  natureOperation: string;
  regularisationProposee: string;
}

export interface DiversLigne {
  id: number;
  compte: string;
  designation: string;
  soldeN: number;
  soldeN1: number;
  variation: number;
  nature: string;
  commentaire: string;
}

export interface EcartConversionLigne {
  id: number;
  compte: string;
  designation: string;
  soldeN: number;
}

export const TRAVAUX_AUTRES_TIERS: string[] = [
  "Justifier les soldes des comptes de charges constatees d'avance (476) a la cloture",
  'Verifier la nature et la periode couverte par chaque CCA',
  "Justifier les soldes des comptes de produits constates d'avance (477)",
  "Verifier que les comptes d'attente (471) sont soldes a la cloture",
  'Analyser les debiteurs et crediteurs divers (46x, 47x) et verifier leur recouvrabilite',
  'Verifier les ecarts de conversion actif (478) et passif (479)',
  "S'assurer que les ecarts de conversion actif sont couverts par une provision pour risque de change",
  'Verifier la contrepassation des CCA et PCA au 01/01/N+1',
];

export const TRAVAUX_STOCKS: string[] = [
  "Obtenir et vérifier le procès-verbal d'inventaire physique de fin d'exercice",
  'Rapprocher les quantités physiques avec les soldes comptables',
  'Vérifier la méthode de valorisation utilisée (PEPS ou CMP)',
  "Analyser les coûts d'acquisition (factures, transport, douane, frais accessoires)",
  'Contrôler la cohérence des variations de stocks (603x pour achats, 73x pour production)',
  "Examiner les stocks en cours de route et vérifier les dossiers d'importation",
  'Identifier les stocks à déprécier (faible rotation, baisse de prix, dommages)',
  'Vérifier les dotations/reprises de dépréciations (D 6593 / C 39x et D 39x / C 7593)',
];
