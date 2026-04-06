export interface Etablissement {
  id: number | string;
  raison_sociale?: string;
  [key: string]: string | number | Record<string, string | number | undefined> | undefined;
}

export interface SalarieIdentite {
  code?: string;
  nom?: string;
  prenom?: string;
}

export interface Salarie {
  id: number | string;
  identite?: SalarieIdentite;
  [key: string]: string | number | SalarieIdentite | undefined;
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
