// Interfaces partagees par les services ecritures (CRUD, grand livre, tiers,
// rapports, lettrage). Tous les modules du dossier ecritures/ les importent d'ici.

export interface EcritureLigne {
  numero_compte: string;
  libelle_compte?: string;
  debit?: number | string;
  credit?: number | string;
  tiers_id?: number | null;
}

export interface CreateEcritureInput {
  exercice_id: number;
  date_ecriture: string;
  journal?: string;
  numero_piece?: string;
  libelle: string;
  lignes: EcritureLigne[];
}

export interface EcritureFilters {
  journal?: string;
  statut?: string;
  date_du?: string;
  date_au?: string;
  search?: string;
}

export interface GrandLivreFilters {
  compte?: string;
  journal?: string;
  date_du?: string;
  date_au?: string;
}

export interface GrandLivreTiersFilters {
  tiers_id?: string;
  type_tiers?: string;
  date_du?: string;
  date_au?: string;
  limit?: number;
  offset?: number;
}

export interface BalanceTiersFilters {
  type_tiers?: string;
  date_du?: string;
  date_au?: string;
}

export interface EcheancierFilters {
  type_tiers?: string;
  date_du?: string;
  date_au?: string;
  statut?: string;
  limit?: number;
  offset?: number;
}

export interface LettrageEcrituresFilters {
  statut?: string;
  annee_de?: string;
  annee_a?: string;
}
