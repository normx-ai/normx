import React from 'react';

// ===================== INTERFACES =====================

export interface DeclarationTVAProps {
  entiteId: number;
  exerciceId: number;
  exerciceAnnee: number;
  entiteName: string;
  entiteSigle: string;
  entiteNif: string;
  entiteAdresse: string;
  onBack: () => void;
  onGoToParametres?: () => void;
}

export interface StatusBadgeProps {
  statut: string;
}

export interface ImpotSectionPanelProps {
  selectedImpot: string;
  selectedMois: number | null;
  entiteId: number;
  exerciceId: number;
  sectionComptes: Record<string, string[]>;
  setSectionComptes: React.Dispatch<React.SetStateAction<Record<string, string[]>>>;
}

export interface StatusStyleItem {
  label: string;
  bg: string;
  color: string;
}

export interface ImpotSectionItem {
  key: string;
  label: string;
  description: string;
}

export interface TabItem {
  key: string;
  label: string;
}

export interface DeclarationItem {
  id: number | null;
  mois: number;
  statut: string;
  montant_tva_payer: number;
  montant_tva_collectee?: number;
  montant_tva_deductible?: number;
  lignes?: Record<string, number>;
}

export interface TVALigne {
  id: number;
  groupe: string;
  reference: string;
  libelle: string;
  montant_net: number;
  taux_taxe: number | null;
  montant_taxe: number;
  date_document: string;
  avoir: boolean;
  onglet: string;
}

export interface LineForm {
  groupe: string;
  reference: string;
  libelle: string;
  montant_net: string;
  taux_taxe: string;
  montant_taxe: string;
  date_document: string;
  avoir: boolean;
}

export interface Compte44 {
  numero: string;
  libelle: string;
}

export interface ComptesDataLigne {
  numero_compte: string;
  date_ecriture: string;
  numero_piece: string;
  libelle_ecriture: string;
  libelle_compte: string;
  debit: number;
  credit: number;
}

export interface ComptesData {
  lignes: ComptesDataLigne[];
  total_debit: number;
  total_credit: number;
  solde: number;
}

export interface LiveEntite {
  nom: string;
  sigle: string;
  nif: string;
  adresse: string;
}

export interface BuildPDFParams {
  entiteName: string;
  entiteSigle: string;
  entiteNif: string;
  entiteAdresse: string;
  moisName: string;
  exerciceAnnee: number;
  declaration: DeclarationItem | null;
}

export type TotalRow = string[] & { _total?: boolean };

// ===================== CONSTANTS =====================

export const MOIS: string[] = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];

export const STATUS_STYLES: Record<string, StatusStyleItem> = {
  nouvelle: { label: 'Nouvelle', bg: '#D4A843', color: '#fff' },
  brouillon: { label: 'Brouillon', bg: '#d97706', color: '#fff' },
  validee: { label: 'Validée', bg: '#D4A843', color: '#fff' },
  transmise: { label: 'Transmise', bg: '#7c3aed', color: '#fff' },
};

export const IMPOTS_SECTIONS: ImpotSectionItem[] = [
  { key: 'tva', label: 'I - TVA', description: 'Taxe sur la valeur ajoutée' },
  { key: 'dac', label: 'II - DAC', description: 'Droits d\'accises' },
  { key: 'tsjha', label: 'III - TSJHA', description: 'Taxe spéciale sur les jeux de hasard' },
  { key: 'ttf', label: 'IV - TTF', description: 'Taxe sur les transferts de fonds' },
  { key: 'tart', label: 'V - TART', description: 'Taxe additionnelle sur les revenus des télécoms' },
  { key: 'ttce', label: 'VI - TTCE', description: 'Taxe sur les tabacs, cosmétiques et emballages' },
  { key: 'rav', label: 'VII - RAV', description: 'Redevance audiovisuelle' },
  { key: 'irpp', label: 'VIII - IRPP BICA-BNC-BA (IBA CGI 2026)', description: 'Impôt sur les bénéfices d\'affaires' },
  { key: 'its', label: 'IX - IRPP/TS (ITS CGI 2026)', description: 'Impôt sur les traitements et salaires' },
  { key: 'is', label: 'X - IS (Minimum de perception CGI 2026)', description: 'Impôt sur les sociétés' },
  { key: 'irvm', label: 'XI - IRVM (IRCM CGI 2026)', description: 'Impôt sur le revenu des capitaux mobiliers' },
  { key: 'rsil', label: 'XII - RSIL', description: 'Retenue à la source sur les importations et les loyers' },
  { key: 'tus', label: 'XIII - TUS', description: 'Taxe unique sur les salaires' },
  { key: 'tst', label: 'XIV - TST', description: 'Taxe sur les sociétés de télécommunication' },
  { key: 'tcp', label: 'XV - TCP', description: 'Taxe sur les contrats de prestation' },
  { key: 'tpp', label: 'XVI - TPP', description: 'Taxe sur la propriété immobilière' },
  { key: 'patente', label: 'XVII - Patente', description: 'Contribution des patentes' },
  { key: 'foncier', label: 'XVIII - Foncier (Contribution foncière CGI 2026)', description: 'Contributions foncières' },
  { key: 'cm', label: 'XIX - CM', description: 'Contribution mobilière' },
  { key: 'th', label: 'XX - TH', description: 'Taxe d\'habitation' },
  { key: 'tb', label: 'XXI - TB', description: 'Taxe de balayage' },
  { key: 'cad', label: 'XXII - CAD', description: 'Centimes additionnels' },
  { key: 'tol', label: 'XXIII - TOL', description: 'Taxe sur l\'occupation des locaux' },
];

export const TABS: TabItem[] = [
  { key: 'collectee', label: 'TVA collectée' },
  { key: 'deductible', label: 'TVA déductible' },
  { key: 'autres', label: 'Autres (non imposables)' },
  { key: 'emises_encaissement', label: 'Factures émises avec TVA sur encaissement' },
  { key: 'recues_encaissement', label: 'Factures reçues avec TVA sur encaissement' },
];

export const thStyle: React.CSSProperties = { padding: '10px 10px', fontSize: 14, fontWeight: 600, background: '#e8edf5', color: '#333', textAlign: 'left', whiteSpace: 'nowrap' };
export const tdStyle: React.CSSProperties = { padding: '10px 10px', borderBottom: '1px solid #eee', fontSize: 15 };
export const inputStyle: React.CSSProperties = { padding: '9px 12px', border: '1px solid #ddd', borderRadius: 4, fontSize: 15, minWidth: 120, width: '100%' };

export const fmtMontant = (v: number | string): string => {
  const n = parseFloat(String(v)) || 0;
  return n.toLocaleString('fr-FR');
};
