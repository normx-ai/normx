/**
 * Livre de paie — Congo-Brazzaville
 * Registre obligatoire, etats des charges fiscales et sociales
 * Conforme CGI 2026 — ITS uniquement (Art. 116)
 */

import type { BulletinResume } from './declarations';

// ---------------------------------------------------------------------------
// Interfaces — Totaux numeriques reutilisables
// ---------------------------------------------------------------------------

interface TotauxLivrePaie {
  salaire_base: number;
  primes: number;
  heures_sup: number;
  avantages_nature: number;
  brut: number;
  cnss_salariale: number;
  its: number;
  camu: number;
  tol: number;
  taxe_regionale: number;
  total_retenues: number;
  net_a_payer: number;
}

interface TotauxChargesFiscales {
  brut: number;
  its: number;
  tus_impot: number;
  tus_cnss: number;
  tol: number;
  taxe_regionale: number;
  total_fiscal: number;
}

interface TotauxChargesSociales {
  brut: number;
  cnss_salariale: number;
  cnss_patronale_pvid: number;
  cnss_patronale_af: number;
  cnss_patronale_at: number;
  camu: number;
  total_social: number;
}

// ---------------------------------------------------------------------------
// Interfaces — Lignes
// ---------------------------------------------------------------------------

export interface LigneLivrePaie {
  salarie_id: string;
  nom: string;
  prenom: string;
  salaire_base: number;
  primes: number;
  heures_sup: number;
  avantages_nature: number;
  brut: number;
  cnss_salariale: number;
  its: number;
  camu: number;
  tol: number;
  taxe_regionale: number;
  total_retenues: number;
  net_a_payer: number;
}

export interface LivrePaieMensuel {
  mois: number;
  annee: number;
  employeur: string;
  lignes: LigneLivrePaie[];
  totaux: TotauxLivrePaie;
}

export interface LivrePaieAnnuel {
  annee: number;
  employeur: string;
  mois: LivrePaieMensuel[];
  totaux: TotauxLivrePaie;
}

interface MoisEmploye {
  mois: number;
  salaire_base: number;
  primes: number;
  heures_sup: number;
  avantages_nature: number;
  brut: number;
  cnss_salariale: number;
  its: number;
  camu: number;
  tol: number;
  taxe_regionale: number;
  total_retenues: number;
  net_a_payer: number;
}

export interface LivrePaieEmploye {
  salarie_id: string;
  nom: string;
  prenom: string;
  annee: number;
  mois: MoisEmploye[];
  totaux: TotauxLivrePaie;
}

interface LigneChargesFiscales {
  nom: string;
  prenom: string;
  brut: number;
  its: number;
  tus_impot: number;
  tus_cnss: number;
  tol: number;
  taxe_regionale: number;
  total_fiscal: number;
}

export interface EtatChargesFiscales {
  mois: number;
  annee: number;
  employeur: string;
  lignes: LigneChargesFiscales[];
  totaux: TotauxChargesFiscales;
}

interface LigneChargesSociales {
  nom: string;
  prenom: string;
  brut: number;
  cnss_salariale: number;
  cnss_patronale_pvid: number;
  cnss_patronale_af: number;
  cnss_patronale_at: number;
  camu: number;
  total_social: number;
}

export interface EtatChargesSociales {
  mois: number;
  annee: number;
  employeur: string;
  lignes: LigneChargesSociales[];
  totaux: TotauxChargesSociales;
}

// ---------------------------------------------------------------------------
// Helpers internes
// ---------------------------------------------------------------------------

/**
 * Convertit un BulletinResume en LigneLivrePaie.
 * BulletinResume ne ventile pas primes / heures_sup / avantages_nature :
 * on deduit primes = brut - salaire_base (approximation du complement).
 * taxe_regionale n'est pas portee par BulletinResume (champ absent) : 0.
 */
function bulletinVersLigne(b: BulletinResume): LigneLivrePaie {
  const primes = b.brut - b.salaire_base;
  const tol = b.taxe_locaux;
  const camu = b.camu_salariale;
  const taxe_regionale = 0;
  const total_retenues = b.cnss_salariale + b.its + camu + tol + taxe_regionale;

  return {
    salarie_id: b.id,
    nom: b.nom,
    prenom: b.prenom,
    salaire_base: b.salaire_base,
    primes,
    heures_sup: 0,
    avantages_nature: 0,
    brut: b.brut,
    cnss_salariale: b.cnss_salariale,
    its: b.its,
    camu,
    tol,
    taxe_regionale,
    total_retenues,
    net_a_payer: b.net_a_payer,
  };
}

function totauxVide(): TotauxLivrePaie {
  return {
    salaire_base: 0,
    primes: 0,
    heures_sup: 0,
    avantages_nature: 0,
    brut: 0,
    cnss_salariale: 0,
    its: 0,
    camu: 0,
    tol: 0,
    taxe_regionale: 0,
    total_retenues: 0,
    net_a_payer: 0,
  };
}

function ajouterAuxTotaux(t: TotauxLivrePaie, l: LigneLivrePaie): void {
  t.salaire_base += l.salaire_base;
  t.primes += l.primes;
  t.heures_sup += l.heures_sup;
  t.avantages_nature += l.avantages_nature;
  t.brut += l.brut;
  t.cnss_salariale += l.cnss_salariale;
  t.its += l.its;
  t.camu += l.camu;
  t.tol += l.tol;
  t.taxe_regionale += l.taxe_regionale;
  t.total_retenues += l.total_retenues;
  t.net_a_payer += l.net_a_payer;
}

function cumulerTotaux(dest: TotauxLivrePaie, src: TotauxLivrePaie): void {
  dest.salaire_base += src.salaire_base;
  dest.primes += src.primes;
  dest.heures_sup += src.heures_sup;
  dest.avantages_nature += src.avantages_nature;
  dest.brut += src.brut;
  dest.cnss_salariale += src.cnss_salariale;
  dest.its += src.its;
  dest.camu += src.camu;
  dest.tol += src.tol;
  dest.taxe_regionale += src.taxe_regionale;
  dest.total_retenues += src.total_retenues;
  dest.net_a_payer += src.net_a_payer;
}

// ---------------------------------------------------------------------------
// Fonctions publiques
// ---------------------------------------------------------------------------

/**
 * Genere le livre de paie pour un mois donne.
 */
export function genererLivrePaieMensuel(
  bulletins: BulletinResume[],
  employeur: string,
  mois: number,
  annee: number,
): LivrePaieMensuel {
  const lignes = bulletins.map(bulletinVersLigne);
  const totaux = totauxVide();

  for (const l of lignes) {
    ajouterAuxTotaux(totaux, l);
  }

  return { mois, annee, employeur, lignes, totaux };
}

/**
 * Genere le livre de paie annuel a partir de bulletins regroupes par mois.
 * bulletinsParMois[0] = janvier, bulletinsParMois[11] = decembre.
 */
export function genererLivrePaieAnnuel(
  bulletinsParMois: BulletinResume[][],
  employeur: string,
  annee: number,
): LivrePaieAnnuel {
  const totauxAnnuels = totauxVide();
  const moisLivres: LivrePaieMensuel[] = [];

  for (let i = 0; i < bulletinsParMois.length; i++) {
    const moisIndex = i + 1;
    const mensuel = genererLivrePaieMensuel(bulletinsParMois[i], employeur, moisIndex, annee);
    moisLivres.push(mensuel);
    cumulerTotaux(totauxAnnuels, mensuel.totaux);
  }

  return { annee, employeur, mois: moisLivres, totaux: totauxAnnuels };
}

/**
 * Genere le recapitulatif annuel d'un seul salarie.
 * Les bulletins fournis doivent appartenir au meme salarie.
 */
export function genererLivrePaieEmploye(
  bulletinsMensuels: BulletinResume[],
  salarieId: string,
  nom: string,
  prenom: string,
  annee: number,
): LivrePaieEmploye {
  const totaux = totauxVide();
  const moisList: MoisEmploye[] = [];

  for (const b of bulletinsMensuels) {
    const l = bulletinVersLigne(b);
    const entry: MoisEmploye = {
      mois: b.mois,
      salaire_base: l.salaire_base,
      primes: l.primes,
      heures_sup: l.heures_sup,
      avantages_nature: l.avantages_nature,
      brut: l.brut,
      cnss_salariale: l.cnss_salariale,
      its: l.its,
      camu: l.camu,
      tol: l.tol,
      taxe_regionale: l.taxe_regionale,
      total_retenues: l.total_retenues,
      net_a_payer: l.net_a_payer,
    };
    moisList.push(entry);
    ajouterAuxTotaux(totaux, l);
  }

  return { salarie_id: salarieId, nom, prenom, annee, mois: moisList, totaux };
}

/**
 * Genere l'etat recapitulatif des charges fiscales pour un mois.
 * ITS + TUS (impot + CNSS) + TOL + taxe regionale.
 */
export function genererEtatChargesFiscales(
  bulletins: BulletinResume[],
  employeur: string,
  mois: number,
  annee: number,
): EtatChargesFiscales {
  const totaux: TotauxChargesFiscales = {
    brut: 0,
    its: 0,
    tus_impot: 0,
    tus_cnss: 0,
    tol: 0,
    taxe_regionale: 0,
    total_fiscal: 0,
  };

  const lignes: LigneChargesFiscales[] = bulletins.map((b) => {
    const tol = b.taxe_locaux;
    const taxe_regionale = 0;
    const total_fiscal = b.its + b.tus_impot + b.tus_cnss + tol + taxe_regionale;

    totaux.brut += b.brut;
    totaux.its += b.its;
    totaux.tus_impot += b.tus_impot;
    totaux.tus_cnss += b.tus_cnss;
    totaux.tol += tol;
    totaux.taxe_regionale += taxe_regionale;
    totaux.total_fiscal += total_fiscal;

    return {
      nom: b.nom,
      prenom: b.prenom,
      brut: b.brut,
      its: b.its,
      tus_impot: b.tus_impot,
      tus_cnss: b.tus_cnss,
      tol,
      taxe_regionale,
      total_fiscal,
    };
  });

  return { mois, annee, employeur, lignes, totaux };
}

/**
 * Genere l'etat recapitulatif des charges sociales pour un mois.
 * CNSS salariale + patronale (PVID, AF, AT) + CAMU.
 */
export function genererEtatChargesSociales(
  bulletins: BulletinResume[],
  employeur: string,
  mois: number,
  annee: number,
): EtatChargesSociales {
  const totaux: TotauxChargesSociales = {
    brut: 0,
    cnss_salariale: 0,
    cnss_patronale_pvid: 0,
    cnss_patronale_af: 0,
    cnss_patronale_at: 0,
    camu: 0,
    total_social: 0,
  };

  const lignes: LigneChargesSociales[] = bulletins.map((b) => {
    const camu = b.camu_salariale;
    const total_social =
      b.cnss_salariale +
      b.cnss_patronale_vieillesse +
      b.cnss_patronale_af +
      b.cnss_patronale_at +
      camu;

    totaux.brut += b.brut;
    totaux.cnss_salariale += b.cnss_salariale;
    totaux.cnss_patronale_pvid += b.cnss_patronale_vieillesse;
    totaux.cnss_patronale_af += b.cnss_patronale_af;
    totaux.cnss_patronale_at += b.cnss_patronale_at;
    totaux.camu += camu;
    totaux.total_social += total_social;

    return {
      nom: b.nom,
      prenom: b.prenom,
      brut: b.brut,
      cnss_salariale: b.cnss_salariale,
      cnss_patronale_pvid: b.cnss_patronale_vieillesse,
      cnss_patronale_af: b.cnss_patronale_af,
      cnss_patronale_at: b.cnss_patronale_at,
      camu,
      total_social,
    };
  });

  return { mois, annee, employeur, lignes, totaux };
}
