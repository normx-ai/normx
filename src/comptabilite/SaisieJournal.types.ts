import type { JournalType, CompteComptable } from '../types';

export interface SaisieJournalProps {
  entiteId: number;
  exerciceId: number;
  exerciceAnnee: number;
  onBack: () => void;
}

export interface EcritureRow {
  numero_compte: string;
  libelle_compte: string;
  debit: string | number;
  credit: string | number;
  tiers_id: string | number;
}

export interface EcritureAPI {
  id: number;
  journal: string;
  date_ecriture: string;
  numero_piece: string;
  libelle: string;
  statut: string;
  lignes: EcritureLigneAPI[];
}

export interface EcritureLigneAPI {
  id?: number;
  numero_compte: string;
  libelle_compte: string;
  debit: number | string;
  credit: number | string;
  tiers_id?: number;
  tiers_nom?: string;
}

export interface StatsData {
  nb_comptes: number;
}

export interface TiersItem {
  id: number;
  code_tiers: string;
  nom: string;
  type: string;
  compte_comptable: string;
}

export const JOURNAUX: JournalType[] = [
  { code: 'OD', intitule: 'Operations diverses' },
  { code: 'ACH', intitule: 'Achats' },
  { code: 'VTE', intitule: 'Ventes' },
  { code: 'BQ', intitule: 'Banque' },
  { code: 'CAI', intitule: 'Caisse' },
  { code: 'SUB', intitule: 'Subventions' },
  { code: 'DOT', intitule: 'Dotations' },
  { code: 'AMO', intitule: 'Amortissements' },
  { code: 'RAN', intitule: 'Report a nouveau' },
];

export const MOIS: string[] = [
  'Janvier', 'Fevrier', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Aout', 'Septembre', 'Octobre', 'Novembre', 'Decembre',
];

// Props des sous-composants

export interface EcrituresStatsProps {
  ecritures: EcritureAPI[];
  stats: StatsData | null;
  nbSelectedBrouillard: number;
  nbSelectedValidee: number;
  onValider: () => void;
  onDevalider: () => void;
  onBack: () => void;
  onOpenCreate: () => void;
}

export interface EcrituresFiltersProps {
  filterJournal: string;
  setFilterJournal: (v: string) => void;
  filterStatut: string;
  setFilterStatut: (v: string) => void;
  filterMois: string;
  setFilterMois: (v: string) => void;
  filterDateDu: string;
  setFilterDateDu: (v: string) => void;
  filterDateAu: string;
  setFilterDateAu: (v: string) => void;
  searchTerm: string;
  setSearchTerm: (v: string) => void;
}

export interface EcrituresListProps {
  ecritures: EcritureAPI[];
  selectedIds: Set<number>;
  onToggleSelect: (id: number) => void;
  onToggleSelectAll: () => void;
  onEdit: (ecr: EcritureAPI) => void;
  onDelete: (id: number) => void;
}

export interface SaisieOverlayProps {
  editingId: number | null;
  journal: string;
  setJournal: (v: string) => void;
  showJournalDropdown: boolean;
  setShowJournalDropdown: (v: boolean) => void;
  dateEcriture: string;
  setDateEcriture: (v: string) => void;
  numeroPiece: string;
  setNumeroPiece: (v: string) => void;
  libelle: string;
  setLibelle: (v: string) => void;
  lignes: EcritureRow[];
  planComptable: CompteComptable[];
  tiersList: TiersItem[];
  exerciceAnnee: number;
  saving: boolean;
  onSave: () => void;
  onClose: () => void;
  onUpdateLigne: (idx: number, field: string, value: string | number) => void;
  onSelectCompte: (ligneIdx: number, compte: CompteComptable) => void;
  onCompteBlur: (idx: number) => void;
  onAddLigne: () => void;
  onRemoveLigne: (idx: number) => void;
  onEquilibrer: () => void;
}
