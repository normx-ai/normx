import type {
  LivrePaieMensuel,
  LivrePaieAnnuel,
  LivrePaieEmploye,
  EtatChargesFiscales,
  EtatChargesSociales,
} from '../data/livrePaie';

export const MOIS_NOMS: string[] = [
  '', 'Janvier', 'Fevrier', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Aout', 'Septembre', 'Octobre', 'Novembre', 'Decembre',
];

export type TabId = 'mensuel' | 'annuel' | 'employe' | 'fiscal' | 'social';

export interface TabDef {
  id: TabId;
  label: string;
}

export const TABS: TabDef[] = [
  { id: 'mensuel', label: 'Livre mensuel' },
  { id: 'annuel', label: 'Livre annuel' },
  { id: 'employe', label: 'Par employe' },
  { id: 'fiscal', label: 'Charges fiscales' },
  { id: 'social', label: 'Charges sociales' },
];

export interface SalarieIdentite {
  nom?: string;
  prenom?: string;
}

export interface SalarieEmploi {
  etablissement?: string;
}

export interface SalarieSalaireHoraires {
  salaire_base?: string;
}

export interface SalarieAvantagesNature {
  logement?: number;
  domesticite?: number;
  electricite?: number;
  voiture?: number;
  telephone?: number;
  nourriture?: number;
}

export interface SalarieItem {
  id: number | string;
  identite?: SalarieIdentite;
  emploi?: SalarieEmploi;
  salaire_horaires?: SalarieSalaireHoraires;
  avantages_nature?: SalarieAvantagesNature;
  [key: string]: string | number | SalarieIdentite | SalarieEmploi | SalarieSalaireHoraires | SalarieAvantagesNature | null | undefined;
}

export interface EtablissementItem {
  id: number | string;
  raison_sociale?: string;
  numero_cnss?: string;
  nui?: string;
  [key: string]: string | number | Record<string, string | number | undefined> | undefined;
}

export type {
  LivrePaieMensuel,
  LivrePaieAnnuel,
  LivrePaieEmploye,
  EtatChargesFiscales,
  EtatChargesSociales,
};
