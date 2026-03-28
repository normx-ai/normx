/**
 * Cotisations sociales et fiscales - Congo-Brazzaville
 * Conforme au CGI 2026 et Code de Sécurité Sociale
 * Source : CGI-242 (fiscal-common.ts + paie.service.ts)
 */
import type {
  CotisationsCongoConfig,
  SituationFamiliale,
  ProfilFiscal,
  ZoneTOL,
  CNSSPatronaleResult,
  AvantagesNatureCalcules,
} from '../types/paie.types';

const COTISATIONS_CONGO: CotisationsCongoConfig = {
  // --- CNSS ---
  cnss: {
    label: 'CNSS (Caisse Nationale de Sécurité Sociale)',
    salariale: { taux: 4, plafond: 1200000 },  // 4% plafond 1 200 000
    patronale: {
      vieillesse:              { taux: 8.00,   plafond: 1200000 },  // PVID
      allocationsFamiliales:   { taux: 10.03,  plafond: 600000 },   // AF
      accidentsTravail:        { taux: 2.25,   plafond: 600000 },   // AT
    },
  },

  // --- CAMU (Art. 3-4 TFNC4-CAMU) ---
  camu: {
    label: 'CAMU (Contribution Assurance Maladie Universelle)',
    taux: 0.5,            // 0,5%
    seuilMensuel: 500000,  // sur la fraction > 500 000 FCFA
  },

  // --- TUS (Art. 6-8 TFNC4-TUS, CGI 2026) ---
  tus: {
    label: 'TUS (Taxe Unique sur les Salaires)',
    tauxResident: 7.5,       // 7,5% du brut
    tauxNonResident: 6.0,    // 6% pour non-résidents
    tauxPetrolier: 2.5,      // 2,5% pour sociétés pétrolières
    // Répartition Art. 8 (CGI 2026) :
    // Collecte DGI (20% = 1,5% sur 7,5%) :
    //   État 15%, FNH 5%
    // Collecte CNSS (80% = 6% sur 7,5%) :
    //   FIGA 27%, FONEA 23%, ACPE 10%, ADPME 5%, ACPCE 5%,
    //   Univ. Denis Sassou Nguesso 3%, Univ. Marien Ngouabi 2%, ANIRSJ 5%
    partImpot: 20,  // 20% -> TUS-IMPOT (1,5%)
    partCNSS: 80,   // 80% -> TUS-CNSS (6%)
    repartition: {
      etat: 15, fnh: 5,
      figa: 27, fonea: 23, acpe: 10, adpme: 5, acpce: 5,
      univ_sassou: 3, univ_ngouabi: 2, anirsj: 5,
    },
  },

  // --- TOL (Taxe d'Occupation des Locaux) ---
  tol: {
    label: 'TOL (Taxe d\'Occupation des Locaux)',
    centreVille: 5000,
    peripherie: 1000,
  },

  // --- Taxe régionale ---
  taxeRegionale: {
    label: 'Taxe régionale',
    montant: 2400,  // 2 400 FCFA/an, prélevée en janvier uniquement
  },

  // --- ITS (Art. 116 CGI - Barème progressif annuel) ---
  its: {
    label: 'ITS (Impôt sur les Traitements et Salaires)',
    fraisPro: 20,  // 20% de frais professionnels
    bareme: [
      { min: 0,         max: 615000,   taux: 0,  forfait: 1200 },  // Forfait 1 200 FCFA
      { min: 615000,    max: 1500000,  taux: 10 },
      { min: 1500000,   max: 3500000,  taux: 15 },
      { min: 3500000,   max: 5000000,  taux: 20 },
      { min: 5000000,   max: null,     taux: 30 },
    ],
    minimumAnnuel: 1200,
    forfaitaireNonResident: 20,  // 20% pour non-résidents
  },

  // --- Quotient familial (Art. 116) ---
  quotientFamilial: {
    maxParts: 6.5,
    // marié = 2 parts base + 0.5/enfant
    // célibataire/divorcé = 1 part base + 1 premier enfant + 0.5/enfant suivant
    // veuf avec enfants = 2 parts base + 0.5/enfant
  },

  // --- Avantages en nature forfaitaires (Art. 115 CGI) ---
  avantagesNatureForfait: {
    logement: 20,       // 20% du plafond CNSS (1 200 000)
    domesticite: 7,     // 7% du salaire brut
    electricite: 5,     // 5% du salaire brut
    voiture: 3,         // 3% du salaire brut
    telephone: 2,       // 2% du salaire brut
    nourriture: 20,     // 20% du salaire brut
  },

  // --- Constantes générales ---
  smig: 70400,          // SMIG mensuel
  devise: 'XAF',
};

/**
 * Calcul du quotient familial (Art. 116)
 */
export function calculerQuotientFamilial(situation: SituationFamiliale, nombreEnfants: number): number {
  const enfants = Math.max(0, nombreEnfants || 0);

  let partsBase;
  if (situation === 'marie') {
    partsBase = 2;
  } else if (situation === 'veuf' && enfants > 0) {
    partsBase = 2;
  } else {
    partsBase = 1;
  }

  let partsEnfants;
  if (situation === 'celibataire' || situation === 'divorce') {
    partsEnfants = enfants === 0 ? 0 : 1 + (enfants - 1) * 0.5;
  } else {
    partsEnfants = enfants * 0.5;
  }

  return Math.min(partsBase + partsEnfants, COTISATIONS_CONGO.quotientFamilial.maxParts);
}

/**
 * Calcul CNSS salariale (4% plafonné à 1 200 000)
 */
export function calculerCNSSSalariale(salaireBrut: number): number {
  const base = Math.min(salaireBrut, COTISATIONS_CONGO.cnss.salariale.plafond);
  return Math.round(base * COTISATIONS_CONGO.cnss.salariale.taux / 100);
}

/**
 * Calcul charges patronales CNSS (vieillesse + AF + PF)
 */
export function calculerCNSSPatronale(salaireBrut: number): CNSSPatronaleResult {
  const pat = COTISATIONS_CONGO.cnss.patronale;

  const vieillesse = Math.round(
    Math.min(salaireBrut, pat.vieillesse.plafond) * pat.vieillesse.taux / 100
  );
  const af = Math.round(
    Math.min(salaireBrut, pat.allocationsFamiliales.plafond) * pat.allocationsFamiliales.taux / 100
  );
  const at = Math.round(
    Math.min(salaireBrut, pat.accidentsTravail.plafond) * pat.accidentsTravail.taux / 100
  );

  return {
    vieillesse,
    allocationsFamiliales: af,
    accidentsTravail: at,
    plafond2: af + at,  // AF + AT groupés sur le bulletin (12,28%)
    total: vieillesse + af + at,
  };
}

/**
 * Calcul ITS - Barème progressif annuel (Art. 116)
 * Étapes : brut - CNSS = base, puis frais pro 20%, puis quotient familial, puis barème
 */
export function calculerITS(salaireBrut: number, cnssSalariale: number, situation: SituationFamiliale, nombreEnfants: number, profilResident: ProfilFiscal): number {
  const isResident = profilResident !== 'non_resident';

  // Base ITS = (brut - CNSS) x (1 - 20% frais pro)
  const baseApresCNSS = salaireBrut - cnssSalariale;
  const fraisPro = Math.round(baseApresCNSS * COTISATIONS_CONGO.its.fraisPro / 100);
  const baseITS = baseApresCNSS - fraisPro;

  // Annualiser
  const baseAnnuelle = baseITS * 12;

  if (!isResident) {
    // Non-résident : 20% forfaitaire
    const itsAnnuel = Math.round(baseAnnuelle * COTISATIONS_CONGO.its.forfaitaireNonResident / 100);
    return Math.round(itsAnnuel / 12);
  }

  // Résident : quotient familial puis barème progressif
  const parts = calculerQuotientFamilial(situation || 'celibataire', nombreEnfants || 0);
  const revenuParPart = baseAnnuelle / parts;

  let impotParPart = 0;
  let reste = revenuParPart;

  for (const tranche of COTISATIONS_CONGO.its.bareme) {
    if (reste <= 0) break;
    const limiteHaute = tranche.max ?? Infinity;
    const largeur = limiteHaute - tranche.min;
    const montantDansTranche = Math.min(reste, largeur);

    if (tranche.forfait !== undefined && tranche.taux === 0) {
      impotParPart = tranche.forfait;
    } else {
      impotParPart += Math.round(montantDansTranche * tranche.taux / 100);
    }
    reste -= montantDansTranche;
  }

  const itsAnnuel = Math.round(impotParPart * parts);
  return Math.max(Math.round(itsAnnuel / 12), 0);
}

/**
 * Calcul TUS (Art. 6 TFNC4-TUS) - charge patronale
 */
export function calculerTUS(salaireBrut: number, profilResident: ProfilFiscal): number {
  const taux = (profilResident === 'non_resident')
    ? COTISATIONS_CONGO.tus.tauxNonResident
    : COTISATIONS_CONGO.tus.tauxResident;
  return Math.round(salaireBrut * taux / 100);
}

/**
 * Calcul TOL (Taxe d'Occupation des Locaux)
 */
export function calculerTOL(zone: ZoneTOL): number {
  return zone === 'centre_ville'
    ? COTISATIONS_CONGO.tol.centreVille
    : COTISATIONS_CONGO.tol.peripherie;
}

/**
 * Calcul CAMU (Art. 3-4 TFNC4-CAMU) - 0,5% de la fraction > 500 000
 */
export function calculerCAMU(salaireBrut: number, cnssSalariale: number): number {
  const brutTaxable = salaireBrut - cnssSalariale;
  const base = Math.max(0, brutTaxable - COTISATIONS_CONGO.camu.seuilMensuel);
  return Math.round(base * COTISATIONS_CONGO.camu.taux / 100);
}

/**
 * Calcul taxe régionale (2 400 FCFA, janvier uniquement)
 */
export function calculerTaxeRegionale(moisJanvier: boolean): number {
  return moisJanvier ? COTISATIONS_CONGO.taxeRegionale.montant : 0;
}

/**
 * Calcul avantages en nature forfaitaires (Art. 115 CGI)
 */
export function calculerAvantagesForfaitaires(salairePresence: number): AvantagesNatureCalcules {
  const taux = COTISATIONS_CONGO.avantagesNatureForfait;
  const plafondCNSS = COTISATIONS_CONGO.cnss.salariale.plafond;
  return {
    logement: Math.round(Math.min(salairePresence, plafondCNSS) * taux.logement / 100),
    domesticite: Math.round(salairePresence * taux.domesticite / 100),
    electricite: Math.round(salairePresence * taux.electricite / 100),
    voiture: Math.round(salairePresence * taux.voiture / 100),
    telephone: Math.round(salairePresence * taux.telephone / 100),
    nourriture: Math.round(salairePresence * taux.nourriture / 100),
  };
}

export default COTISATIONS_CONGO;
