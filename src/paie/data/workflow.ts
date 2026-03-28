/**
 * Workflow bulletin de paie — Congo-Brazzaville
 * Gestion des statuts (brouillon -> valide -> verrouille)
 * et cloture de periode mensuelle.
 * Conforme CGI 2026 — ITS uniquement (Art. 116)
 */

import type { BulletinResume } from './declarations';

// ---------------------------------------------------------------------------
// Types & Interfaces
// ---------------------------------------------------------------------------

export type StatutBulletin = 'brouillon' | 'valide' | 'verrouille';

export interface BulletinWorkflow {
  id: string;
  salarie_id: string;
  mois: number;
  annee: number;
  statut: StatutBulletin;
  date_creation: string;
  date_validation: string | null;
  date_verrouillage: string | null;
  valide_par: string | null;
}

export interface PeriodeCloture {
  mois: number;
  annee: number;
  cloturee: boolean;
  date_cloture: string | null;
  nb_bulletins: number;
  nb_valides: number;
  nb_verrouilles: number;
}

export interface CumulAnnuel {
  salarie_id: string;
  nom: string;
  prenom: string;
  annee: number;
  brut_cumule: number;
  cnss_salariale_cumule: number;
  its_cumule: number;
  net_cumule: number;
  mois_travailles: number;
}

// ---------------------------------------------------------------------------
// Fonctions de verification de transition
// ---------------------------------------------------------------------------

/** Un bulletin ne peut etre valide que s'il est en brouillon */
export function peutValider(bulletin: BulletinWorkflow): boolean {
  return bulletin.statut === 'brouillon';
}

/** Un bulletin ne peut etre verrouille que s'il est valide */
export function peutVerrouiller(bulletin: BulletinWorkflow): boolean {
  return bulletin.statut === 'valide';
}

/** Un bulletin verrouille peut etre deverrouille (admin uniquement) */
export function peutDeverrouiller(bulletin: BulletinWorkflow): boolean {
  return bulletin.statut === 'verrouille';
}

// ---------------------------------------------------------------------------
// Fonctions de transition
// ---------------------------------------------------------------------------

/** Valide un bulletin brouillon — retourne un nouvel objet avec statut='valide' */
export function validerBulletin(
  bulletin: BulletinWorkflow,
  validePar: string,
): BulletinWorkflow {
  if (!peutValider(bulletin)) {
    throw new Error(`Impossible de valider un bulletin au statut "${bulletin.statut}"`);
  }
  return {
    ...bulletin,
    statut: 'valide',
    date_validation: new Date().toISOString(),
    valide_par: validePar,
  };
}

/** Verrouille un bulletin valide — retourne un nouvel objet avec statut='verrouille' */
export function verrouillerBulletin(bulletin: BulletinWorkflow): BulletinWorkflow {
  if (!peutVerrouiller(bulletin)) {
    throw new Error(`Impossible de verrouiller un bulletin au statut "${bulletin.statut}"`);
  }
  return {
    ...bulletin,
    statut: 'verrouille',
    date_verrouillage: new Date().toISOString(),
  };
}

// ---------------------------------------------------------------------------
// Cloture de periode
// ---------------------------------------------------------------------------

/** Une periode ne peut etre cloturee que si tous les bulletins sont verrouilles */
export function peutCloturerPeriode(periode: PeriodeCloture): boolean {
  if (periode.cloturee) return false;
  if (periode.nb_bulletins === 0) return false;
  return periode.nb_verrouilles === periode.nb_bulletins;
}

/** Cloture une periode — retourne un nouvel objet avec cloturee=true */
export function cloturerPeriode(periode: PeriodeCloture): PeriodeCloture {
  if (!peutCloturerPeriode(periode)) {
    throw new Error(
      `Impossible de cloturer la periode ${periode.mois}/${periode.annee} : ` +
      `${periode.nb_verrouilles}/${periode.nb_bulletins} bulletins verrouilles`,
    );
  }
  return {
    ...periode,
    cloturee: true,
    date_cloture: new Date().toISOString(),
  };
}

// ---------------------------------------------------------------------------
// Cumuls annuels
// ---------------------------------------------------------------------------

/** Calcule les cumuls annuels par salarie a partir des resumes de bulletins */
export function calculerCumulsAnnuels(bulletins: BulletinResume[]): CumulAnnuel[] {
  const parSalarie = new Map<string, CumulAnnuel>();

  for (const b of bulletins) {
    const existing = parSalarie.get(b.id);
    if (existing) {
      existing.brut_cumule += b.brut;
      existing.cnss_salariale_cumule += b.cnss_salariale;
      existing.its_cumule += b.its;
      existing.net_cumule += b.net_a_payer;
      existing.mois_travailles += 1;
    } else {
      parSalarie.set(b.id, {
        salarie_id: b.id,
        nom: b.nom,
        prenom: b.prenom,
        annee: b.annee,
        brut_cumule: b.brut,
        cnss_salariale_cumule: b.cnss_salariale,
        its_cumule: b.its,
        net_cumule: b.net_a_payer,
        mois_travailles: 1,
      });
    }
  }

  return Array.from(parSalarie.values());
}
