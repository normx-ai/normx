export interface BanqueEntry {
  id: number;
  nom: string;
  code: string;
  agence: string;
  rib: string;
  iban: string;
  swift: string;
}

export interface ContactEntry {
  id: number;
  nom: string;
  fonction: string;
  email: string;
  telephone: string;
}

export interface EtablissementFormAdresse {
  numero: string;
  voie: string;
  complement: string;
  code_postal: string;
  ville: string;
}

export interface EtablissementParametres {
  planning: { heuresJour: string; heuresSemaine: number; heuresMois: number };
  paiement: { mode: string; jour: string };
}

export type EtablissementFormValue =
  | string
  | EtablissementFormAdresse
  | BanqueEntry[]
  | ContactEntry[]
  | Record<string, string | string[]>
  | Record<string, string>
  | EtablissementParametres
  | undefined;

export interface EtablissementFormData {
  raison_sociale: string;
  nui: string;
  forme_juridique?: string;
  adresse: EtablissementFormAdresse;
  banques: BanqueEntry[];
  contacts: ContactEntry[];
  organismes: Record<string, string | string[]>;
  param_organismes: Record<string, string>;
  taux: Record<string, string>;
  parametres: EtablissementParametres;
  retraite: Record<string, string>;
  specificites: Record<string, string>;
  [key: string]: EtablissementFormValue;
}

export interface Etablissement {
  id: number | string;
  raison_sociale?: string;
  raisonSociale?: string;
  nui?: string;
  nb_salaries?: number;
  data?: EtablissementFormData;
}

export interface SalarieIdentite {
  code?: string;
  nom?: string;
  prenom?: string;
}

export interface SalarieEmploi {
  etablissement?: string;
  emploi?: string;
}

export interface SalarieSalaireHoraires {
  salaire_base?: string | number;
}

export interface SalarieAvantagesNature {
  logement?: number;
  domesticite?: number;
  electricite?: number;
  voiture?: number;
  telephone?: number;
  nourriture?: number;
}

export interface Salarie {
  id: number | string;
  etablissement_id?: number | string;
  identite?: SalarieIdentite;
  emploi?: SalarieEmploi;
  salaire_horaires?: SalarieSalaireHoraires;
  avantages_nature?: SalarieAvantagesNature;
}

export interface SalarieForm {
  identite: Record<string, string | number | boolean | null>;
  adresse: Record<string, string>;
  banque: Record<string, string>;
  contrat: Record<string, string | boolean>;
  anciennetes: Record<string, string | Record<string, string>>;
  emploi: Record<string, string>;
  formations: Record<string, string>;
  classification: Record<string, string>;
  salaire_horaires: Record<string, string | boolean | Record<string, string> | { jour: string; statut: string; heures: string }[]>;
  administratif: Record<string, Record<string, string>>;
  indemnites: Record<string, string>;
  parametres: Record<string, string>;
  parametres_bulletin: Record<string, string>;
  organismes: Record<string, string>;
  contrats_sociaux: Record<string, string>;
  [key: string]: Record<string, string | number | boolean | null | Record<string, string> | { jour: string; statut: string; heures: string }[]>;
}

export type UpdateSectionFn = (section: string, field: string, value: string | boolean | Record<string, string>) => void;
export type SetFormFn = React.Dispatch<React.SetStateAction<SalarieForm>>;
