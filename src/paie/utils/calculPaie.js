/**
 * Moteur de calcul paie - Congo-Brazzaville
 * Conforme au CGI 2026 (aligné sur CGI-242 paie.service.ts)
 */
import {
  calculerCNSSSalariale,
  calculerCNSSPatronale,
  calculerITS,
  calculerTUS,
  calculerTOL,
  calculerCAMU,
  calculerTaxeRegionale,
} from '../data/cotisationsCongo';
import { calculerPrimeAnciennete, getRubriquesConvention } from '../data/conventionsRubriques';

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
}) {
  // --- Étape 0 : Prime d'ancienneté convention ---
  const primeAnciennete = calculerPrimeAnciennete(conventionCode, anneesAnciennete, salaireBase);
  const primesAvecAnciennete = primeAnciennete > 0
    ? [{ libelle: 'Prime d\'ancienneté', montant: primeAnciennete, code: 'PRIME_ANCIENNETE' }, ...primes]
    : primes;

  // --- Étape 1 : Calcul des bases ---
  const totalPrimesImposables = primesImposables + primesAvecAnciennete.reduce((s, p) => s + (p.montant || 0), 0);
  const salairePresence = salaireBase + totalPrimesImposables + heuresSup + congesAnnuels;

  // Avantages en nature (Art. 115)
  const totalAvantagesNature = Object.values(avantagesNature).reduce((s, v) => s + (v || 0), 0);

  // Brut total = salaire de présence + avantages en nature
  const salaireBrutTotal = salairePresence + totalAvantagesNature;

  // Indemnités exonérées (Art. 114-A : transport, représentation, panier, salissure)
  const totalIndemnites = indemnites.reduce((s, ind) => s + (ind.montant || 0), 0);

  // --- Étape 2 : CNSS salariale (4%) ---
  const cnssSalariale = calculerCNSSSalariale(salairePresence);

  // --- Étape 3 : ITS (Art. 116) ---
  const itsMensuel = calculerITS(salaireBrutTotal, cnssSalariale, situation, nombreEnfants, profil);

  // --- Étape 4 : TUS (charge patronale) ---
  const tusMensuel = calculerTUS(salaireBrutTotal, profil);

  // --- Étape 5 : TOL ---
  const tolMensuel = calculerTOL(zoneTOL);

  // --- Étape 6 : CAMU (0,5% > 500 000) ---
  const camuMensuel = calculerCAMU(salaireBrutTotal, cnssSalariale);

  // --- Étape 7 : Taxe régionale ---
  const taxeRegionale = calculerTaxeRegionale(moisJanvier);

  // --- Étape 8 : Total retenues salarié ---
  const totalRetenues = cnssSalariale + itsMensuel + tolMensuel + camuMensuel + taxeRegionale;

  // --- Étape 9 : Net à payer ---
  // Net = brut total + indemnités exonérées - avantages en nature - retenues
  const netAPayer = salaireBrutTotal + totalIndemnites - totalAvantagesNature - totalRetenues;

  // --- Étape 10 : Charges patronales ---
  const cnssPatronale = calculerCNSSPatronale(salairePresence);
  const totalChargesPatronales = cnssPatronale.total + tusMensuel;

  // --- Étape 11 : Coût total employeur ---
  const coutTotalEmployeur = salaireBrutTotal + totalChargesPatronales;

  return {
    // Bases
    salaire_base: salaireBase,
    salaire_presence: salairePresence,
    brut: salaireBrutTotal,
    total_avantages_nature: totalAvantagesNature,
    total_indemnites_exonerees: totalIndemnites,

    // CNSS salariale
    cnss_salariale: cnssSalariale,
    cnss_base_plafond1: Math.min(salairePresence, 1200000),

    // CNSS patronale
    cnss_patronale_vieillesse: cnssPatronale.vieillesse,
    cnss_patronale_af: cnssPatronale.allocationsFamiliales,
    cnss_patronale_at: cnssPatronale.accidentsTravail,
    cnss_patronale_plafond2: cnssPatronale.plafond2,  // AF + AT groupés (12,28%)
    cnss_patronale: cnssPatronale.vieillesse,

    // ITS
    irpp: itsMensuel,
    its: itsMensuel,

    // TUS (patronale) - splitée comme sur le bulletin Cegelec
    tus_impot: Math.round(salaireBrutTotal * 1.5 / 100),   // 1,5% part État
    tus_cnss: Math.round(salaireBrutTotal * 6 / 100),      // 6% part CNSS/organismes

    // TOL
    taxe_locaux: tolMensuel,

    // CAMU
    camu_salariale: camuMensuel,
    camu_base: Math.max(0, (salaireBrutTotal - cnssSalariale) - 500000),

    // Taxe régionale
    taxe_regionale: taxeRegionale,

    // Totaux
    total_retenues: totalRetenues,
    total_patronales: totalChargesPatronales,
    total_gains: salaireBrutTotal + totalIndemnites,
    net_a_payer: Math.round(netAPayer),
    cout_total_employeur: coutTotalEmployeur,

    // Prime ancienneté
    prime_anciennete: primeAnciennete,

    // Primes et indemnités (pour le bulletin)
    primes: primesAvecAnciennete,
    indemnites,
    convention: conventionCode,
    avantages_nature: avantagesNature,

    devise: 'XAF',
  };
}

export function formaterMontant(montant) {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'XAF',
    minimumFractionDigits: 0,
  }).format(Math.round(montant || 0));
}

export function formaterNombre(montant) {
  return new Intl.NumberFormat('fr-FR').format(Math.round(montant || 0));
}
