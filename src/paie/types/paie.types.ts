import type { PNIInput } from '../data/pni';

// Situation familiale
export type SituationFamiliale = 'celibataire' | 'marie' | 'divorce' | 'veuf';

// Profil fiscal
export type ProfilFiscal = 'national' | 'non_resident' | 'petrolier';

// Zone TOL
export type ZoneTOL = 'centre_ville' | 'peripherie';

// Mode de rubrique
export type ModeRubrique = 'pourcentage' | 'fixe' | 'horaire' | 'variable' | 'bareme';

// Type de rubrique
export type TypeRubrique = 'prime' | 'indemnite' | 'majoration' | 'avantage';

// Cotisation avec taux et plafond
export interface CotisationTauxPlafond {
  taux: number;
  plafond: number;
}

// CNSS Configuration
export interface CNSSConfig {
  label: string;
  salariale: CotisationTauxPlafond;
  patronale: {
    vieillesse: CotisationTauxPlafond;
    allocationsFamiliales: CotisationTauxPlafond;
    accidentsTravail: CotisationTauxPlafond;
  };
}

// CAMU Configuration
export interface CAMUConfig {
  label: string;
  taux: number;
  seuilMensuel: number;
}

// TUS Repartition
export interface TUSRepartition {
  etat: number;
  fnh: number;
  figa: number;
  fonea: number;
  acpe: number;
  adpme: number;
  acpce: number;
  univ_sassou: number;
  univ_ngouabi: number;
  anirsj: number;
}

// TUS Configuration
export interface TUSConfig {
  label: string;
  tauxResident: number;
  tauxNonResident: number;
  tauxPetrolier: number;
  partImpot: number;
  partCNSS: number;
  repartition: TUSRepartition;
}

// TOL Configuration
export interface TOLConfig {
  label: string;
  centreVille: number;
  peripherie: number;
}

// Tranche ITS
export interface TrancheITS {
  min: number;
  max: number | null;
  taux: number;
  forfait?: number;
}

// ITS Configuration
export interface ITSConfig {
  label: string;
  fraisPro: number;
  bareme: TrancheITS[];
  minimumAnnuel: number;
  forfaitaireNonResident: number;
}

// Quotient familial
export interface QuotientFamilialConfig {
  maxParts: number;
}

// Avantages en nature forfaitaires
export interface AvantagesNatureForfait {
  logement: number;
  domesticite: number;
  electricite: number;
  voiture: number;
  telephone: number;
  nourriture: number;
}

// Configuration complete des cotisations Congo
export interface CotisationsCongoConfig {
  cnss: CNSSConfig;
  camu: CAMUConfig;
  tus: TUSConfig;
  tol: TOLConfig;
  taxeRegionale: { label: string; montant: number };
  its: ITSConfig;
  quotientFamilial: QuotientFamilialConfig;
  avantagesNatureForfait: AvantagesNatureForfait;
  smig: number;
  devise: string;
}

// Resultat CNSS patronale
export interface CNSSPatronaleResult {
  vieillesse: number;
  allocationsFamiliales: number;
  accidentsTravail: number;
  plafond2: number;
  total: number;
}

// Avantages en nature calcules
export interface AvantagesNatureCalcules {
  logement: number;
  domesticite: number;
  electricite: number;
  voiture: number;
  telephone: number;
  nourriture: number;
}

// Prime
export interface Prime {
  libelle: string;
  montant: number;
  code?: string;
}

// Indemnite
export interface Indemnite {
  libelle: string;
  montant: number;
  code?: string;
}

// Avantages en nature (input)
export interface AvantagesNatureInput {
  logement?: number;
  domesticite?: number;
  electricite?: number;
  voiture?: number;
  telephone?: number;
  nourriture?: number;
  [key: string]: number | undefined;
}

// Parametres du bulletin
export interface ParametresBulletin {
  salaireBase: number;
  primesImposables?: number;
  heuresSup?: number;
  congesAnnuels?: number;
  primes?: Prime[];
  indemnites?: Indemnite[];
  avantagesNature?: AvantagesNatureInput;
  situation?: SituationFamiliale;
  nombreEnfants?: number;
  profil?: ProfilFiscal;
  zoneTOL?: ZoneTOL;
  moisJanvier?: boolean;
  conventionCode?: string;
  anneesAnciennete?: number;
  pniPrimes?: PNIInput[];
}

// Resultat du bulletin
export interface ResultatBulletin {
  salaire_base: number;
  salaire_presence: number;
  brut: number;
  total_avantages_nature: number;
  total_indemnites_exonerees: number;
  cnss_salariale: number;
  cnss_base_plafond1: number;
  cnss_patronale_vieillesse: number;
  cnss_patronale_af: number;
  cnss_patronale_at: number;
  cnss_patronale_plafond2: number;
  cnss_patronale: number;
  its: number;
  tus_impot: number;
  tus_cnss: number;
  taxe_locaux: number;
  camu_salariale: number;
  camu_base: number;
  taxe_regionale: number;
  total_retenues: number;
  total_patronales: number;
  total_gains: number;
  net_a_payer: number;
  cout_total_employeur: number;
  prime_anciennete: number;
  primes: Prime[];
  indemnites: Indemnite[];
  convention: string;
  avantages_nature: AvantagesNatureInput;
  devise: string;
  // PNI (Art. 38 CGI)
  pni_total_declare: number;
  pni_plafond: number;
  pni_total_admis: number;
  pni_excedent: number;
}

// Anciennete convention
export interface AncienneteConfig {
  debut: number;
  tauxDepart: number;
  increment: number;
  max: number;
  base: string;
  note?: string;
  paliers?: { de: number; a: number; taux: number }[];
}

// Heure supplementaire convention
export interface HeureSupConvention {
  de?: number;
  a?: number;
  type?: string;
  taux: number;
  label: string;
}

// Rubrique convention
export interface RubriqueConvention {
  code: string;
  label: string;
  type?: TypeRubrique;
  mode: ModeRubrique;
  taux?: number;
  montant?: number;
  base?: string;
  unite?: string;
  article?: string;
  conditions?: string;
  note?: string;
  bareme?: { seuil: number; montant: number }[];
}

// Licenciement tranche
export interface LicenciementTranche {
  de: number;
  a: number;
  taux?: number;
  mois?: number;
  note?: string;
}

// Avantage convention
export interface AvantageConvention {
  code: string;
  label: string;
  mode: string;
  taux?: number;
  montant?: number;
  article?: string;
}

// Convention collective complete
export interface ConventionCollective {
  label: string;
  anciennete: AncienneteConfig;
  heuresSupp: HeureSupConvention[];
  primes: RubriqueConvention[];
  indemnites: RubriqueConvention[];
  majorations?: RubriqueConvention[];
  licenciement?: LicenciementTranche[];
  avantages?: AvantageConvention[];
}

// Grille salariale - categorie
export interface CategorieGrille {
  cat: number;
  college: string;
  echelons: number[];
}

// Grille salariale
export interface GrilleSalariale {
  label: string;
  dateEffet: string;
  source: string;
  valeurPoint?: number;
  categories: CategorieGrille[];
}

// Bulletin section
export interface BulletinLigne {
  code: string;
  libelle: string;
  taux?: string;
}

export interface BulletinSection {
  label: string;
  lignes: BulletinLigne[];
}

// Organisme branche
export interface OrganismeBranche {
  code: string;
  nom: string;
  description: string;
  taux_patronal: number;
  taux_salarial: number;
  plafond?: number | null;
  seuil?: number;
  note?: string;
}

// Saisie element
export interface SaisieElement {
  code: string;
  libelle: string;
  type: string;
  taux_majoration?: number;
}

export interface CategorieSaisie {
  id: string;
  label: string;
  elements: SaisieElement[];
}

// Step wizard
export interface WizardStep {
  id: string;
  label: string;
}

// Option select
export interface SelectOption {
  value: string;
  label: string;
}

// Classification
export interface ClassificationItem {
  niveau: string;
  coefficient: string;
  description: string;
}

// Diplome
export interface NiveauDiplome {
  code: string;
  label: string;
}
