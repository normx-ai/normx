// ===================== TABLEAU DE CORRESPONDANCE — BILAN SYSCOHADA =====================
// Mappings entre refs du bilan (AE, AF, BB, CP...) et comptes du plan SYSCOHADA
// ainsi que les rows (ordre et libelles) pour le rendu.

import type { ActifMapping, PassifMapping, BilanRow } from '../../types';

// Pour le calcul de CJ (Resultat net) reproduit a partir du CR
export const CR_PRODUITS = ['70', '71', '72', '73', '75', '77', '78', '79', '82', '84', '86', '88'];
export const CR_CHARGES = ['60', '61', '62', '63', '64', '65', '66', '67', '68', '69', '81', '83', '85', '87', '89'];

// ACTIF — REF -> comptes OHADA (BRUT et Amortissements separement)
export const ACTIF_MAPPING: Record<string, ActifMapping> = {
  AE: { brut: ['211', '2181', '2191'], amort: ['2811', '2818', '2911', '2918', '2919'] },
  AF: { brut: ['212', '213', '214', '2193'], amort: ['2812', '2813', '2814', '2912', '2913', '2914', '2919'] },
  AG: { brut: ['215', '216'], amort: ['2815', '2816', '2915', '2916'] },
  AH: { brut: ['217', '218', '2198'], brutExclude: ['2181'], amort: ['2817', '2818', '2917', '2918', '2919'] },
  AJ: { brut: ['22'], amort: ['282', '292'] },
  AK: { brut: ['231', '232', '233', '237', '2391'], amort: ['2831', '2832', '2833', '2837', '2931', '2932', '2933', '2937', '2939'] },
  AL: { brut: ['234', '235', '238', '2392', '2393'], amort: ['2834', '2835', '2838', '2934', '2935', '2938', '2939'] },
  AM: { brut: ['24'], brutExclude: ['245', '2495'], amort: ['284', '294', '2949'], amortExclude: ['2845', '2945'] },
  AN: { brut: ['245', '2495'], amort: ['2845', '2945', '2949'] },
  AP: { brut: ['251', '252'], amort: ['2951', '2952'] },
  AR: { brut: ['26'], amort: ['296'] },
  AS: { brut: ['27'], amort: ['297'] },
  BA: { brut: ['485', '488'], amort: ['498'] },
  BB: { brut: ['31', '32', '33', '34', '35', '36', '37', '38'], amort: ['39'] },
  BH: { brut: ['409'], amort: ['490'] },
  BI: { brut: ['41'], brutExclude: ['419'], amort: ['491'], debitOnly: ['41'] },
  BJ: { brut: ['185', '42', '43', '44', '45', '46', '47'], brutExclude: ['478'], amort: ['492', '493', '494', '495', '496', '497'], debitOnly: ['42', '43', '44', '45', '46', '47'] },
  BQ: { brut: ['50'], amort: ['590'] },
  BR: { brut: ['51'], amort: ['591'] },
  BS: { brut: ['52', '53', '54', '55', '57', '581', '582'], amort: ['592', '593', '594'], debitOnly: ['52', '53'] },
  BU: { brut: ['478'], amort: [] },
};

// PASSIF — REF -> comptes OHADA (soldes crediteurs)
export const PASSIF_MAPPING: Record<string, PassifMapping> = {
  CA: { comptes: ['101', '102', '103', '104'] },
  CB: { comptes: ['109'], debitAccount: true },
  CD: { comptes: ['105'] },
  CE: { comptes: ['106'] },
  CF: { comptes: ['111', '112', '113'] },
  CG: { comptes: ['118'] },
  CH: { comptes: ['12'], computeSign: true },
  // CJ: calcule = XI du Compte de Resultat (produits - charges)
  CL: { comptes: ['14'] },
  CM: { comptes: ['15'] },
  DA: { comptes: ['16', '181', '182', '183', '184'] },
  DB: { comptes: ['17'] },
  DC: { comptes: ['19'] },
  DH: { comptes: ['481', '482', '484', '4998'] },
  DI: { comptes: ['419'] },
  DJ: { comptes: ['40'], exclude: ['409'] },
  DK: { comptes: ['42', '43', '44'], creditOnly: ['42', '43', '44'] },
  DM: { comptes: ['185', '45', '46', '47'], exclude: ['479'], creditOnly: ['185', '45', '46', '47'] },
  DN: { comptes: ['499', '599'], exclude: ['4998'] },
  DQ: { comptes: ['564', '565'] },
  DR: { comptes: ['52', '53', '561', '566'], creditOnly: ['52', '53'] },
  DV: { comptes: ['479'] },
};

// ===================== ACTIF ROWS =====================
export const ACTIF_ROWS: BilanRow[] = [
  { ref: 'AD', type: 'subsection', note: '3', libelle: 'IMMOBILISATIONS INCORPORELLES', sumRefs: ['AE', 'AF', 'AG', 'AH'] },
  { ref: 'AE', type: 'indent', note: '', libelle: 'Frais de développement et de prospection' },
  { ref: 'AF', type: 'indent', note: '', libelle: 'Brevets, licences, logiciels et droits similaires' },
  { ref: 'AG', type: 'indent', note: '', libelle: 'Fonds commercial et droit au bail' },
  { ref: 'AH', type: 'indent', note: '', libelle: 'Autres immobilisations incorporelles' },
  { ref: 'AI', type: 'subsection', note: '3', libelle: 'IMMOBILISATIONS CORPORELLES', sumRefs: ['AJ', 'AK', 'AL', 'AM', 'AN'] },
  { ref: 'AJ', type: 'indent', note: '(1)', libelle: 'Terrains' },
  { ref: 'AK', type: 'indent', note: '', libelle: 'Bâtiments' },
  { ref: 'AL', type: 'indent', note: '', libelle: 'Aménagements, agencements et installations' },
  { ref: 'AM', type: 'indent', note: '', libelle: 'Matériel, mobilier et actifs biologiques' },
  { ref: 'AN', type: 'indent', note: '', libelle: 'Matériel de transport' },
  { ref: 'AP', type: 'indent', note: '3', libelle: 'Avances et acomptes versés sur immobilisations' },
  { ref: 'AQ', type: 'subsection', note: '4', libelle: 'IMMOBILISATIONS FINANCIÈRES', sumRefs: ['AR', 'AS'] },
  { ref: 'AR', type: 'indent', note: '', libelle: 'Titres de participation' },
  { ref: 'AS', type: 'indent', note: '', libelle: 'Autres immobilisations financières' },
  { ref: 'AZ', type: 'subtotal', libelle: 'TOTAL ACTIF IMMOBILISÉ', sumRefs: ['AE', 'AF', 'AG', 'AH', 'AJ', 'AK', 'AL', 'AM', 'AN', 'AP', 'AR', 'AS'] },

  { ref: 'BA', type: 'indent', note: '5', libelle: 'Actif circulant HAO' },
  { ref: 'BB', type: 'indent', note: '6', libelle: 'Stocks et encours' },
  { ref: 'BG', type: 'subsection', note: '', libelle: 'CRÉANCES ET EMPLOIS ASSIMILÉS', sumRefs: ['BH', 'BI', 'BJ'] },
  { ref: 'BH', type: 'indent', note: '17', libelle: 'Fournisseurs avances versées' },
  { ref: 'BI', type: 'indent', note: '7', libelle: 'Clients' },
  { ref: 'BJ', type: 'indent', note: '8', libelle: 'Autres créances' },
  { ref: 'BK', type: 'subtotal', libelle: 'TOTAL ACTIF CIRCULANT', sumRefs: ['BA', 'BB', 'BH', 'BI', 'BJ'] },

  { ref: 'BQ', type: 'indent', note: '9', libelle: 'Titres de placement' },
  { ref: 'BR', type: 'indent', note: '10', libelle: 'Valeurs à encaisser' },
  { ref: 'BS', type: 'indent', note: '11', libelle: 'Banques, chèques postaux, caisse et assimilés' },
  { ref: 'BT', type: 'subtotal', libelle: 'TOTAL TRÉSORERIE-ACTIF', sumRefs: ['BQ', 'BR', 'BS'] },

  { ref: 'BU', type: 'indent', note: '12', libelle: 'Écart de conversion-Actif' },
  { ref: 'BZ', type: 'total', libelle: 'TOTAL GÉNÉRAL', sumRefs: ['AZ', 'BK', 'BT', 'BU'] },
];

// ===================== PASSIF ROWS =====================
export const PASSIF_ROWS: BilanRow[] = [
  { ref: 'CA', type: 'indent', note: '13', libelle: 'Capital' },
  { ref: 'CB', type: 'indent', note: '13', libelle: 'Apporteurs capital non appelé (-)', negativeRef: true },
  { ref: 'CD', type: 'indent', note: '14', libelle: 'Primes liées au capital social' },
  { ref: 'CE', type: 'indent', note: '3e', libelle: 'Écarts de réévaluation' },
  { ref: 'CF', type: 'indent', note: '14', libelle: 'Réserves indisponibles' },
  { ref: 'CG', type: 'indent', note: '14', libelle: 'Réserves libres' },
  { ref: 'CH', type: 'indent', note: '14', libelle: 'Report à nouveau (+ ou -)' },
  { ref: 'CJ', type: 'subtotal', note: '', libelle: 'Résultat net de l\'exercice (bénéfice + ou perte -)' },
  { ref: 'CL', type: 'indent', note: '15', libelle: 'Subventions d\'investissement' },
  { ref: 'CM', type: 'indent', note: '15', libelle: 'Provisions réglementées' },
  { ref: 'CP', type: 'subtotal', libelle: 'TOTAL CAPITAUX PROPRES ET RESSOURCES ASSIMILÉES', sumRefs: ['CA', 'CB', 'CD', 'CE', 'CF', 'CG', 'CH', 'CJ', 'CL', 'CM'] },

  { ref: 'DA', type: 'indent', note: '16', libelle: 'Emprunts et dettes financières diverses' },
  { ref: 'DB', type: 'indent', note: '16', libelle: 'Dettes de location acquisition' },
  { ref: 'DC', type: 'indent', note: '16', libelle: 'Provisions pour risques et charges' },
  { ref: 'DD', type: 'subtotal', libelle: 'TOTAL DETTES FINANCIÈRES ET RESSOURCES ASSIMILÉES', sumRefs: ['DA', 'DB', 'DC'] },

  { ref: 'DF', type: 'subtotal', libelle: 'TOTAL RESSOURCES STABLES', sumRefs: ['CP', 'DD'] },

  { ref: 'DH', type: 'indent', note: '5', libelle: 'Dettes circulantes HAO' },
  { ref: 'DI', type: 'indent', note: '7', libelle: 'Clients, avances reçues' },
  { ref: 'DJ', type: 'indent', note: '17', libelle: 'Fournisseurs d\'exploitation' },
  { ref: 'DK', type: 'indent', note: '18', libelle: 'Dettes fiscales et sociales' },
  { ref: 'DM', type: 'indent', note: '19', libelle: 'Autres dettes' },
  { ref: 'DN', type: 'indent', note: '19', libelle: 'Provisions pour risques à court terme' },
  { ref: 'DP', type: 'subtotal', libelle: 'TOTAL PASSIF CIRCULANT', sumRefs: ['DH', 'DI', 'DJ', 'DK', 'DM', 'DN'] },

  { ref: 'DQ', type: 'indent', note: '20', libelle: 'Banques, crédits d\'escompte' },
  { ref: 'DR', type: 'indent', note: '20', libelle: 'Banques, établissements financiers et crédits de trésorerie' },
  { ref: 'DT', type: 'subtotal', libelle: 'TOTAL TRÉSORERIE-PASSIF', sumRefs: ['DQ', 'DR'] },

  { ref: 'DV', type: 'indent', note: '12', libelle: 'Écart de conversion-Passif' },
  { ref: 'DZ', type: 'total', libelle: 'TOTAL GÉNÉRAL', sumRefs: ['DF', 'DP', 'DT', 'DV'] },
];

export interface ActifResult {
  brut: number;
  amort: number;
  net: number;
}

export interface PassifResult {
  net: number;
}
