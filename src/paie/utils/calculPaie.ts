/**
 * Moteur de calcul paie - Congo-Brazzaville
 * Conforme au CGI 2026 — ITS uniquement (Art. 116)
 */
import type {
  ParametresBulletin,
  ResultatBulletin,
  AvantagesNatureInput,
} from '../types/paie.types';
import {
  calculerCNSSSalariale,
  calculerCNSSPatronale,
  calculerITS,
  calculerTUS,
  calculerTOL,
  calculerCAMU,
  calculerTaxeRegionale,
} from '../data/cotisationsCongo';
import { calculerPrimeAnciennete } from '../data/conventionsRubriques';
import { calculerPNI } from '../data/pni';

/**
 * Calcul complet du bulletin de paie
 */
export function calculerBulletin({
  salaireBase,
  primesImposables = 0,
  heuresSup = 0,
  congesAnnuels = 0,
  primes = [],
  indemnites = [],
  avantagesNature = {},
  situation = 'celibataire',
  nombreEnfants = 0,
  profil = 'national',
  zoneTOL = 'centre_ville',
  moisJanvier = false,
  conventionCode = '',
  anneesAnciennete = 0,
  pniPrimes = [],
}: ParametresBulletin): ResultatBulletin {
  // --- Etape 0 : Prime d'anciennete convention ---
  const primeAnciennete = calculerPrimeAnciennete(conventionCode, anneesAnciennete, salaireBase);
  const primesAvecAnciennete = primeAnciennete > 0
    ? [{ libelle: 'Prime d\'anciennete', montant: primeAnciennete, code: 'PRIME_ANCIENNETE' }, ...primes]
    : primes;

  // --- Etape 1 : Calcul des bases ---
  const totalPrimesImposables = primesImposables + primesAvecAnciennete.reduce((s, p) => s + (p.montant || 0), 0);
  const salairePresence = salaireBase + totalPrimesImposables + heuresSup + congesAnnuels;

  // Avantages en nature (Art. 115)
  const totalAvantagesNature = Object.values(avantagesNature as AvantagesNatureInput).reduce((s: number, v) => s + (v || 0), 0);

  // Brut total = salaire de presence + avantages en nature
  const salaireBrutTotal = salairePresence + totalAvantagesNature;

  // Indemnites exonerees (Art. 114-A : transport, representation, panier, salissure)
  const totalIndemnites = indemnites.reduce((s, ind) => s + (ind.montant || 0), 0);

  // --- Etape 2 : CNSS salariale (4%) ---
  const cnssSalariale = calculerCNSSSalariale(salairePresence);

  // --- Etape 2b : PNI - Primes Non Imposables (Art. 38 CGI) ---
  const pniResult = calculerPNI(salaireBrutTotal, pniPrimes);
  // L'excedent PNI est reintegre dans la base imposable
  const brutImposableAvecPNI = salaireBrutTotal + pniResult.excedent;

  // --- Etape 3 : ITS (Art. 116 CGI 2026) ---
  const itsMensuel = calculerITS(brutImposableAvecPNI, cnssSalariale, situation, nombreEnfants, profil);

  // --- Etape 4 : TUS (charge patronale) ---
  const tusMensuel = calculerTUS(salaireBrutTotal, profil);

  // --- Etape 5 : TOL ---
  const tolMensuel = calculerTOL(zoneTOL);

  // --- Etape 6 : CAMU (0,5% > 500 000) ---
  const camuMensuel = calculerCAMU(salaireBrutTotal, cnssSalariale);

  // --- Etape 7 : Taxe regionale ---
  const taxeRegionale = calculerTaxeRegionale(moisJanvier);

  // --- Etape 8 : Total retenues salarie ---
  const totalRetenues = cnssSalariale + itsMensuel + tolMensuel + camuMensuel + taxeRegionale;

  // --- Etape 9 : Net a payer ---
  const netAPayer = salaireBrutTotal + totalIndemnites - totalAvantagesNature - totalRetenues;

  // --- Etape 10 : Charges patronales ---
  const cnssPatronale = calculerCNSSPatronale(salairePresence);
  const totalChargesPatronales = cnssPatronale.total + tusMensuel;

  // --- Etape 11 : Cout total employeur ---
  const coutTotalEmployeur = salaireBrutTotal + totalChargesPatronales;

  return {
    salaire_base: salaireBase,
    salaire_presence: salairePresence,
    brut: salaireBrutTotal,
    total_avantages_nature: totalAvantagesNature,
    total_indemnites_exonerees: totalIndemnites,

    cnss_salariale: cnssSalariale,
    cnss_base_plafond1: Math.min(salairePresence, 1200000),

    cnss_patronale_vieillesse: cnssPatronale.vieillesse,
    cnss_patronale_af: cnssPatronale.allocationsFamiliales,
    cnss_patronale_at: cnssPatronale.accidentsTravail,
    cnss_patronale_plafond2: cnssPatronale.plafond2,
    cnss_patronale: cnssPatronale.vieillesse,

    its: itsMensuel,

    tus_impot: Math.round(salaireBrutTotal * 1.5 / 100),
    tus_cnss: Math.round(salaireBrutTotal * 6 / 100),

    taxe_locaux: tolMensuel,

    camu_salariale: camuMensuel,
    camu_base: Math.max(0, (salaireBrutTotal - cnssSalariale) - 500000),

    taxe_regionale: taxeRegionale,

    total_retenues: totalRetenues,
    total_patronales: totalChargesPatronales,
    total_gains: salaireBrutTotal + totalIndemnites,
    net_a_payer: Math.round(netAPayer),
    cout_total_employeur: coutTotalEmployeur,

    prime_anciennete: primeAnciennete,

    primes: primesAvecAnciennete,
    indemnites,
    convention: conventionCode,
    avantages_nature: avantagesNature,

    devise: 'XAF',

    pni_total_declare: pniResult.totalDeclare,
    pni_plafond: pniResult.plafond,
    pni_total_admis: pniResult.totalAdmis,
    pni_excedent: pniResult.excedent,
  };
}

export function formaterMontant(montant: number): string {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'XAF',
    minimumFractionDigits: 0,
  }).format(Math.round(montant || 0));
}

export function formaterNombre(montant: number): string {
  return new Intl.NumberFormat('fr-FR').format(Math.round(montant || 0));
}
