/**
 * Déclarations sociales et fiscales — Congo-Brazzaville
 * Bordereau CNSS, DAS annuelle, Déclaration Nominative
 * Conforme CGI 2026 — ITS uniquement (Art. 116)
 */

// ---------------------------------------------------------------------------
// Interfaces
// ---------------------------------------------------------------------------

/** Résumé mensuel d'un bulletin par salarié */
export interface BulletinResume {
  id: string;
  nom: string;
  prenom: string;
  mois: number;
  annee: number;
  salaire_base: number;
  brut: number;
  cnss_salariale: number;
  cnss_patronale_vieillesse: number;
  cnss_patronale_af: number;
  cnss_patronale_at: number;
  its: number;
  tus_impot: number;
  tus_cnss: number;
  camu_salariale: number;
  taxe_locaux: number;
  net_a_payer: number;
}

/** Une ligne du bordereau CNSS (un salarié) */
export interface LigneCNSS {
  nom: string;
  prenom: string;
  numero_ss: string;
  brut: number;
  plafond1: number;
  plafond2: number;
  cnss_salariale: number;
  cnss_patronale_pvid: number;
  cnss_patronale_af: number;
  cnss_patronale_at: number;
}

/** Totaux du bordereau CNSS mensuel */
interface TotauxCNSS {
  brut_total: number;
  cnss_salariale_total: number;
  cnss_patronale_total: number;
  total_a_verser: number;
}

/** Bordereau CNSS mensuel */
export interface DeclarationCNSS {
  mois: number;
  annee: number;
  employeur: string;
  numero_cnss: string;
  lignes: LigneCNSS[];
  totaux: TotauxCNSS;
}

/** Une ligne de la DAS (résumé annuel d'un salarié) */
export interface LigneDAS {
  nom: string;
  prenom: string;
  brut_annuel: number;
  its_annuel: number;
  cnss_salariale_annuel: number;
  net_annuel: number;
}

/** Totaux de la DAS */
interface TotauxDAS {
  brut_total: number;
  its_total: number;
  cnss_total: number;
  net_total: number;
}

/** Déclaration Annuelle des Salaires (DAS) */
export interface DeclarationDAS {
  annee: number;
  employeur: string;
  nui: string;
  lignes: LigneDAS[];
  totaux: TotauxDAS;
}

/** Déclaration nominative individuelle */
export interface DeclarationNominative {
  salarie_nom: string;
  salarie_prenom: string;
  numero_ss: string;
  mois: number;
  annee: number;
  salaire_base: number;
  brut: number;
  cnss_salariale: number;
  cnss_patronale_vieillesse: number;
  cnss_patronale_af: number;
  cnss_patronale_at: number;
  its: number;
  tus_impot: number;
  tus_cnss: number;
  camu_salariale: number;
  taxe_locaux: number;
  net_a_payer: number;
}

/** Résultat d'une vérification de déclaration */
export interface VerificationResult {
  valide: boolean;
  erreurs: string[];
}

// ---------------------------------------------------------------------------
// Constantes – plafonds CNSS
// ---------------------------------------------------------------------------

const PLAFOND_PVID = 1200000;
const PLAFOND_AF_AT = 600000;

// ---------------------------------------------------------------------------
// Fonctions de génération
// ---------------------------------------------------------------------------

/**
 * Génère le bordereau CNSS mensuel à partir des bulletins du mois.
 * Plafond 1 (PVID) = min(brut, 1 200 000)
 * Plafond 2 (AF / AT) = min(brut, 600 000)
 */
export function genererBordereauCNSS(
  bulletins: BulletinResume[],
  employeur: string,
  numeroCnss: string,
  mois: number,
  annee: number,
): DeclarationCNSS {
  const lignes: LigneCNSS[] = bulletins.map((b) => {
    const plafond1 = Math.min(b.brut, PLAFOND_PVID);
    const plafond2 = Math.min(b.brut, PLAFOND_AF_AT);
    return {
      nom: b.nom,
      prenom: b.prenom,
      numero_ss: b.id,
      brut: b.brut,
      plafond1,
      plafond2,
      cnss_salariale: b.cnss_salariale,
      cnss_patronale_pvid: b.cnss_patronale_vieillesse,
      cnss_patronale_af: b.cnss_patronale_af,
      cnss_patronale_at: b.cnss_patronale_at,
    };
  });

  const brut_total = lignes.reduce((s, l) => s + l.brut, 0);
  const cnss_salariale_total = lignes.reduce((s, l) => s + l.cnss_salariale, 0);
  const cnss_patronale_total = lignes.reduce(
    (s, l) => s + l.cnss_patronale_pvid + l.cnss_patronale_af + l.cnss_patronale_at,
    0,
  );

  return {
    mois,
    annee,
    employeur,
    numero_cnss: numeroCnss,
    lignes,
    totaux: {
      brut_total,
      cnss_salariale_total,
      cnss_patronale_total,
      total_a_verser: cnss_salariale_total + cnss_patronale_total,
    },
  };
}

/**
 * Génère la Déclaration Annuelle des Salaires (DAS).
 * @param bulletinsParMois tableau de 12 mois, chaque mois contenant les bulletins
 */
export function genererDAS(
  bulletinsParMois: BulletinResume[][],
  employeur: string,
  nui: string,
  annee: number,
): DeclarationDAS {
  const parSalarie = new Map<string, {
    nom: string;
    prenom: string;
    brut: number;
    its: number;
    cnss: number;
    net: number;
  }>();

  for (const moisBulletins of bulletinsParMois) {
    for (const b of moisBulletins) {
      const key = b.id;
      const existing = parSalarie.get(key);
      if (existing) {
        existing.brut += b.brut;
        existing.its += b.its;
        existing.cnss += b.cnss_salariale;
        existing.net += b.net_a_payer;
      } else {
        parSalarie.set(key, {
          nom: b.nom,
          prenom: b.prenom,
          brut: b.brut,
          its: b.its,
          cnss: b.cnss_salariale,
          net: b.net_a_payer,
        });
      }
    }
  }

  const lignes: LigneDAS[] = [];
  let brut_total = 0;
  let its_total = 0;
  let cnss_total = 0;
  let net_total = 0;

  parSalarie.forEach((val) => {
    lignes.push({
      nom: val.nom,
      prenom: val.prenom,
      brut_annuel: val.brut,
      its_annuel: val.its,
      cnss_salariale_annuel: val.cnss,
      net_annuel: val.net,
    });
    brut_total += val.brut;
    its_total += val.its;
    cnss_total += val.cnss;
    net_total += val.net;
  });

  return {
    annee,
    employeur,
    nui,
    lignes,
    totaux: { brut_total, its_total, cnss_total, net_total },
  };
}

/**
 * Génère la déclaration nominative individuelle à partir d'un bulletin.
 */
export function genererDeclarationNominative(
  bulletin: BulletinResume,
  numeroSS: string,
): DeclarationNominative {
  return {
    salarie_nom: bulletin.nom,
    salarie_prenom: bulletin.prenom,
    numero_ss: numeroSS,
    mois: bulletin.mois,
    annee: bulletin.annee,
    salaire_base: bulletin.salaire_base,
    brut: bulletin.brut,
    cnss_salariale: bulletin.cnss_salariale,
    cnss_patronale_vieillesse: bulletin.cnss_patronale_vieillesse,
    cnss_patronale_af: bulletin.cnss_patronale_af,
    cnss_patronale_at: bulletin.cnss_patronale_at,
    its: bulletin.its,
    tus_impot: bulletin.tus_impot,
    tus_cnss: bulletin.tus_cnss,
    camu_salariale: bulletin.camu_salariale,
    taxe_locaux: bulletin.taxe_locaux,
    net_a_payer: bulletin.net_a_payer,
  };
}

/**
 * Vérifie la cohérence d'une déclaration CNSS ou DAS :
 * - Les totaux correspondent à la somme des lignes
 * - Tous les champs requis sont présents
 * - Pas de valeurs incohérentes (brut négatif, plafonds dépassés…)
 */
export function verifierDeclaration(
  declaration: DeclarationCNSS | DeclarationDAS,
): VerificationResult {
  const erreurs: string[] = [];

  if ('numero_cnss' in declaration) {
    // --- Vérification CNSS ---
    const d = declaration;
    if (!d.employeur) erreurs.push('Employeur manquant');
    if (!d.numero_cnss) erreurs.push('Numéro CNSS manquant');
    if (d.lignes.length === 0) erreurs.push('Aucun salarié dans la déclaration');

    const brutRecalcule = d.lignes.reduce((s, l) => s + l.brut, 0);
    if (Math.abs(brutRecalcule - d.totaux.brut_total) > 1) {
      erreurs.push('Incohérence : total brut ne correspond pas à la somme des lignes');
    }

    const salarialRecalcule = d.lignes.reduce((s, l) => s + l.cnss_salariale, 0);
    if (Math.abs(salarialRecalcule - d.totaux.cnss_salariale_total) > 1) {
      erreurs.push('Incohérence : total CNSS salariale ne correspond pas');
    }

    const patronalRecalcule = d.lignes.reduce(
      (s, l) => s + l.cnss_patronale_pvid + l.cnss_patronale_af + l.cnss_patronale_at,
      0,
    );
    if (Math.abs(patronalRecalcule - d.totaux.cnss_patronale_total) > 1) {
      erreurs.push('Incohérence : total CNSS patronale ne correspond pas');
    }

    for (const ligne of d.lignes) {
      if (ligne.brut < 0) erreurs.push(`Brut négatif pour ${ligne.nom} ${ligne.prenom}`);
      if (ligne.plafond1 > PLAFOND_PVID) {
        erreurs.push(`Plafond PVID dépassé pour ${ligne.nom} ${ligne.prenom}`);
      }
      if (ligne.plafond2 > PLAFOND_AF_AT) {
        erreurs.push(`Plafond AF/AT dépassé pour ${ligne.nom} ${ligne.prenom}`);
      }
    }
  } else {
    // --- Vérification DAS ---
    const d = declaration;
    if (!d.employeur) erreurs.push('Employeur manquant');
    if (!d.nui) erreurs.push('NUI manquant');
    if (d.lignes.length === 0) erreurs.push('Aucun salarié dans la déclaration');

    const brutRecalcule = d.lignes.reduce((s, l) => s + l.brut_annuel, 0);
    if (Math.abs(brutRecalcule - d.totaux.brut_total) > 1) {
      erreurs.push('Incohérence : total brut annuel ne correspond pas');
    }

    const itsRecalcule = d.lignes.reduce((s, l) => s + l.its_annuel, 0);
    if (Math.abs(itsRecalcule - d.totaux.its_total) > 1) {
      erreurs.push('Incohérence : total ITS annuel ne correspond pas');
    }

    const cnssRecalcule = d.lignes.reduce((s, l) => s + l.cnss_salariale_annuel, 0);
    if (Math.abs(cnssRecalcule - d.totaux.cnss_total) > 1) {
      erreurs.push('Incohérence : total CNSS salariale annuel ne correspond pas');
    }

    for (const ligne of d.lignes) {
      if (ligne.brut_annuel < 0) erreurs.push(`Brut annuel négatif pour ${ligne.nom} ${ligne.prenom}`);
      if (ligne.its_annuel < 0) erreurs.push(`ITS annuel négatif pour ${ligne.nom} ${ligne.prenom}`);
    }
  }

  return {
    valide: erreurs.length === 0,
    erreurs,
  };
}
