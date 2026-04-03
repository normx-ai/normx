// ===================== TYPES PARTAGES — NORMX =====================

export type TypeActivite = 'entreprise' | 'association' | 'ordre_professionnel' | 'projet_developpement' | 'smt';
export type NormxModule = 'compta' | 'etats' | 'paie';
export type Offre = 'comptabilite' | 'etats';
export type ToastType = 'success' | 'error' | 'info';

export interface Exercice {
  id: number;
  annee: number;
  entite_id: number;
  date_debut?: string;
  date_fin?: string;
  duree_mois?: number;
  statut?: string;
}

export interface BalanceLigne {
  numero_compte: string;
  libelle_compte: string;
  si_debit?: number;
  si_credit?: number;
  debit: number;
  credit: number;
  solde_debiteur: number;
  solde_crediteur: number;
  solde_debiteur_revise?: number;
  solde_crediteur_revise?: number;
}

export interface Entite {
  id: number;
  nom: string;
  type_activite: TypeActivite;
  offre: Offre;
  modules: NormxModule[];
  sigle?: string;
  adresse?: string;
  nif?: string;
  telephone?: string;
  email?: string;
  actif?: boolean;
  created_at?: string;
}

export interface User {
  id: string;
  nom: string;
  prenom: string;
  email: string;
  role: string;
}

export interface ToastData {
  message: string;
  type: ToastType;
}

export interface CompteComptable {
  numero: string;
  libelle: string;
  classe?: number;
}

export interface EcritureRow {
  id?: number;
  numero_compte: string;
  libelle_compte: string;
  debit: string;
  credit: string;
  tiers_id?: string;
}

export interface Ecriture {
  id: number;
  journal: string;
  date_ecriture: string;
  numero_piece: string;
  libelle: string;
  statut: string;
  lignes: EcritureLigne[];
  total_debit?: number;
  total_credit?: number;
  created_at?: string;
}

export interface EcritureLigne {
  id?: number;
  numero_compte: string;
  libelle_compte: string;
  debit: number;
  credit: number;
  tiers_id?: number;
  tiers_nom?: string;
}

export interface Tiers {
  id: number;
  code: string;
  nom: string;
  type: 'client' | 'fournisseur' | 'autre';
  compte_collectif: string;
  email?: string;
  telephone?: string;
  adresse?: string;
}

export interface JournalType {
  code: string;
  intitule: string;
}

// Mapping pour le bilan (actif et passif)
export interface ActifMapping {
  brut: string[];
  amort: string[];
  brutExclude?: string[];
  amortExclude?: string[];
  debitOnly?: string[];
}

export interface PassifMapping {
  comptes: string[];
  exclude?: string[];
  creditOnly?: string[];
  debitAccount?: boolean;
  computeSign?: boolean;
  computeFromCR?: boolean;
}

// Ligne de bilan pour le rendu
export interface BilanRow {
  ref?: string;
  type: 'indent' | 'subsection' | 'subtotal' | 'total' | 'section';
  note?: string;
  libelle: string;
  sumRefs?: string[];
  negativeRef?: boolean;
}

// TFT row
export interface TFTRow {
  ref?: string;
  type: 'indent' | 'section' | 'label' | 'subtotal' | 'result' | 'total';
  note?: string;
  libelle: string;
}

// Compte de resultat row
export interface CRRow {
  ref: string;
  type: 'indent' | 'subtotal' | 'result' | 'total';
  note?: string;
  libelle: string;
  sumRefs?: string[];
  formula?: string;
}

// Compte de resultat mapping
export interface CRMapping {
  [ref: string]: {
    comptes: string[];
    exclude?: string[];
  };
}

// Etats financiers item (pour le dashboard)
export interface EtatFinancier {
  id: string;
  titre: string;
  short: string;
  desc: string;
  navIcon: React.ComponentType<{ size?: number }>;
}

// Notification
export interface Notification {
  id: number;
  user_id: number;
  entite_id?: number;
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message: string;
  read: boolean;
  created_at: string;
}

// Conversation assistant
export interface Conversation {
  id: number;
  titre: string;
  created_at: string;
}

export interface ChatMessage {
  id?: number;
  role: 'user' | 'assistant';
  content: string;
  created_at?: string;
}

// Parametres entite
export interface ParametresField {
  key: string;
  label: string;
  col?: boolean;
  wide?: boolean;
  type?: string;
  placeholder?: string;
}

export interface ParametresSection {
  title: string;
  fields: ParametresField[];
}

// Balance import
export interface BalanceImport {
  id: number;
  exercice_id: number;
  type: 'N' | 'N-1';
  lignes: BalanceLigne[];
  uploaded_at: string;
}

// Rapport
export interface Rapport {
  id: number;
  titre: string;
  type: string;
  contenu: string;
  created_at: string;
}

// Lettrage
export interface LettrageLigne {
  id: number;
  numero_compte: string;
  libelle: string;
  debit: number;
  credit: number;
  date_ecriture: string;
  lettre?: string;
}

// Navigation sidebar
export type SidebarSection = 'accueil' | 'comptabilite' | 'etats' | 'paie' | 'rapports' | 'assistant' | 'parametres';

// Props communes pour les composants d'etats financiers
export interface EtatBaseProps {
  entiteName: string;
  entiteSigle?: string;
  entiteAdresse?: string;
  entiteNif?: string;
  typeActivite: TypeActivite;
  entiteId: number;
  offre?: Offre;
  onBack: () => void;
}

// Props pour le bilan (actif ou passif)
export type BilanMode = 'actif' | 'passif';
