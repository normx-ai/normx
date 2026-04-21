// Types + helpers partages entre les 3 onglets de declarations.

import type { BulletinResume } from '../../data/declarations';

export const MOIS_NOMS: string[] = [
  '', 'Janvier', 'Fevrier', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Aout', 'Septembre', 'Octobre', 'Novembre', 'Decembre',
];

export type TabId = 'cnss' | 'das' | 'nominative';

export interface TabDef {
  id: TabId;
  label: string;
}

export const TABS: TabDef[] = [
  { id: 'cnss', label: 'Bordereau CNSS' },
  { id: 'das', label: 'DAS (Annuelle)' },
  { id: 'nominative', label: 'Nominative' },
];

export interface SalarieIdentite {
  nom?: string;
  prenom?: string;
}

export interface SalarieEmploi {
  etablissement?: string;
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

export interface SalarieItem {
  id: number | string;
  etablissement_id?: number | string;
  identite?: SalarieIdentite;
  emploi?: SalarieEmploi;
  salaire_horaires?: SalarieSalaireHoraires;
  avantages_nature?: SalarieAvantagesNature;
}

export interface EtablissementItem {
  id: number | string;
  raison_sociale?: string;
  raisonSociale?: string;
  numero_cnss?: string;
  nui?: string;
  nb_salaries?: number;
}

export function buildBulletinsResume(
  salaries: SalarieItem[],
  mois: number,
  annee: number,
): BulletinResume[] {
  return salaries.map((s) => {
    const base = Number(s.salaire_horaires?.salaire_base) || 0;
    const brut = base;
    const cnssBase1 = Math.min(brut, 1200000);
    const cnssBase2 = Math.min(brut, 600000);
    const cnssSalariale = Math.round(cnssBase1 * 0.04);
    const patronaleVieillesse = Math.round(cnssBase1 * 0.08);
    const patronaleAf = Math.round(cnssBase2 * 0.1003);
    const patronaleAt = Math.round(cnssBase2 * 0.0225);
    const its = Math.round(brut * 0.05);
    const tusImpot = Math.round(brut * 0.015);
    const tusCnss = Math.round(brut * 0.06);
    const camuBase = Math.max(0, (brut - cnssSalariale) - 500000);
    const camu = Math.round(camuBase * 0.005);
    const tol = 5000;
    const totalRetenues = cnssSalariale + its + tol + camu;
    const net = brut - totalRetenues;

    return {
      id: String(s.id),
      nom: s.identite?.nom || '',
      prenom: s.identite?.prenom || '',
      mois,
      annee,
      salaire_base: base,
      brut,
      cnss_salariale: cnssSalariale,
      cnss_patronale_vieillesse: patronaleVieillesse,
      cnss_patronale_af: patronaleAf,
      cnss_patronale_at: patronaleAt,
      its,
      tus_impot: tusImpot,
      tus_cnss: tusCnss,
      camu_salariale: camu,
      taxe_locaux: tol,
      net_a_payer: net,
    };
  });
}

