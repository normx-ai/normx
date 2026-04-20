// Donnees et fonctions pures du Bilan SYCEBNL (S2229 / S2180).
// - Mappings REF -> comptes OHADA pour actif et passif
// - Definitions des lignes du tableau (ordre d'affichage, type, sommes)
// - Helpers de calcul a partir d'une balance (pure, sans etat React)

import type { BalanceLigne, ActifMapping, PassifMapping, BilanRow } from '../../types';

// Resultat net = Produits (classe 7 + HAO) - Charges (classe 6 + HAO).
// Sert au poste CH du bilan : garantit coherence Bilan CH === CR XE.
const PRODUITS_PREFIXES: string[] = ['70', '71', '72', '73', '75', '77', '78', '79', '82', '84', '86', '88'];
const CHARGES_PREFIXES: string[] = ['60', '61', '62', '63', '64', '65', '66', '67', '68', '69', '81', '83', '85', '87'];

export function computeResultatNet(lignes: BalanceLigne[]): number {
  let produits = 0;
  let charges = 0;
  for (const l of lignes) {
    const num = (l.numero_compte || '').trim();
    const sd = parseFloat(String(l.solde_debiteur_revise ?? l.solde_debiteur)) || 0;
    const sc = parseFloat(String(l.solde_crediteur_revise ?? l.solde_crediteur)) || 0;
    if (PRODUITS_PREFIXES.some(p => num.startsWith(p))) produits += sc - sd;
    if (CHARGES_PREFIXES.some(p => num.startsWith(p))) charges += sd - sc;
  }
  return produits - charges;
}

export const ACTIF_MAPPING: Record<string, ActifMapping> = {
  AA: { brut: ['20'], amort: [] },
  AB: { brut: ['201'], amort: ['280', '2901'] },
  AC: { brut: ['202', '203', '204', '205'], amort: ['2902'] },
  AE: { brut: ['212', '213', '214', '2193'], amort: ['2812', '2813', '2814', '2912', '2913', '2914', '2919'] },
  AF: { brut: ['218', '2198'], amort: ['2818', '2918', '2919'] },
  AG: { brut: ['251'], amort: ['2951'] },
  AI: { brut: ['22'], amort: ['282', '292'] },
  AJ: { brut: ['231', '232', '233', '2391', '2392', '2393', '2396'], amort: ['2831', '2832', '2833', '2931', '2932', '2933', '2939'] },
  AK: { brut: ['234', '235', '238', '2394', '2395', '2398'], amort: ['2834', '2835', '2838', '2934', '2935', '2938', '2939'] },
  AL: { brut: ['24'], brutExclude: ['245', '2495'], amort: ['284', '294', '2949'], amortExclude: ['2845', '2945'] },
  AM: { brut: ['245', '2495'], amort: ['2845', '2945', '2949'] },
  AN: { brut: ['252'], amort: ['2952'] },
  AX: { brut: ['26'], amort: ['296'] },
  AY: { brut: ['27'], amort: ['297'] },
  BA: { brut: ['485', '4865'], amort: ['498'] },
  BB: { brut: ['31', '32', '33', '34', '36', '37', '38'], amort: ['39'] },
  BC: { brut: ['409'], amort: ['490'] },
  BD: { brut: ['41'], brutExclude: ['419'], amort: ['491'] },
  BE: { brut: ['42', '43', '44', '45', '47'], brutExclude: ['478'], amort: ['492', '493', '494', '497'], debitOnly: ['42', '43', '44', '45', '47'] },
  BU: { brut: ['50'], amort: ['590'] },
  BV: { brut: ['51'], amort: ['591'] },
  BW: { brut: ['52', '53', '55', '57'], amort: ['592', '593', '595'], debitOnly: ['52', '53'] },
  BY: { brut: ['478'], amort: [] },
};

export const PASSIF_MAPPING: Record<string, PassifMapping> = {
  CA: { comptes: ['101'] },
  CB: { comptes: ['102'] },
  CC: { comptes: ['103'] },
  CD: { comptes: ['104'] },
  CE: { comptes: ['106'] },
  CF: { comptes: ['11'] },
  CG: { comptes: ['12'] },
  CH: { comptes: ['13', '131', '139'], computeFromCR: true },
  CI: { comptes: ['14'] },
  CJ: { comptes: ['15'] },
  CW: { comptes: ['16'] },
  CX: { comptes: ['17'] },
  DA: { comptes: ['181', '182', '183', '185', '186', '188'] },
  DB: { comptes: ['187'] },
  DC: { comptes: ['19'] },
  DF: { comptes: ['481', '484', '4861', '488', '4998'] },
  DG: { comptes: ['419'] },
  DH: { comptes: ['40'], exclude: ['409'] },
  DI: { comptes: ['42', '43', '44', '45', '47', '499', '599'], exclude: ['479', '4998'], creditOnly: ['42', '43', '44', '45', '47'] },
  DW: { comptes: ['56', '52', '53'], creditOnly: ['52', '53'] },
  DY: { comptes: ['479'] },
};

export const ACTIF_ROWS: BilanRow[] = [
  { ref: 'AA', type: 'indent', note: '5', libelle: 'Immobilisations destinees a la vente provenant de dons et legs non encore recues et usufruit temporaire' },
  { ref: 'AB', type: 'indent', note: '', libelle: 'Immobilisations incorporelles' },
  { ref: 'AC', type: 'indent', note: '', libelle: 'Immobilisations corporelles et financieres' },
  { ref: 'AD', type: 'subsection', note: '5', libelle: 'IMMOBILISATIONS INCORPORELLES' },
  { ref: 'AE', type: 'indent', note: '', libelle: 'Brevets, licences, logiciels et droits similaires' },
  { ref: 'AF', type: 'indent', note: '', libelle: 'Autres immobilisations incorporelles' },
  { ref: 'AG', type: 'indent', note: '', libelle: 'Avances et acomptes verses sur immobilisations incorporelles' },
  { ref: 'AH', type: 'subsection', note: '5', libelle: 'IMMOBILISATIONS CORPORELLES' },
  { ref: 'AI', type: 'indent', note: '', libelle: 'Terrains' },
  { ref: 'AJ', type: 'indent', note: '', libelle: 'Batiments' },
  { ref: 'AK', type: 'indent', note: '', libelle: 'Amenagements, agencements et installations' },
  { ref: 'AL', type: 'indent', note: '', libelle: 'Materiel, mobilier et actifs biologiques' },
  { ref: 'AM', type: 'indent', note: '', libelle: 'Materiel de transport' },
  { ref: 'AN', type: 'indent', note: '', libelle: 'Avances et acomptes verses sur immobilisations corporelles' },
  { ref: 'AO', type: 'subsection', note: '6', libelle: 'IMMOBILISATIONS FINANCIERES' },
  { ref: 'AX', type: 'indent', note: '', libelle: 'Titres de participation' },
  { ref: 'AY', type: 'indent', note: '', libelle: 'Autres immobilisations financieres' },
  { ref: 'AZ', type: 'subtotal', libelle: 'TOTAL ACTIF IMMOBILISE', sumRefs: ['AA','AB','AC','AE','AF','AG','AI','AJ','AK','AL','AM','AN','AX','AY'] },

  { ref: 'BA', type: 'indent', note: '7', libelle: 'Actif circulant HAO' },
  { ref: 'BB', type: 'indent', note: '8', libelle: 'Stocks et encours' },
  { ref: 'BC', type: 'indent', note: '19', libelle: 'Fournisseurs debiteurs' },
  { ref: 'BD', type: 'indent', note: '9', libelle: 'Adherents, clients-usagers' },
  { ref: 'BE', type: 'indent', note: '10', libelle: 'Autres creances' },
  { ref: 'BT', type: 'subtotal', libelle: 'TOTAL ACTIF CIRCULANT', sumRefs: ['BA','BB','BC','BD','BE'] },

  { ref: 'BU', type: 'indent', note: '11', libelle: 'Titres de placement' },
  { ref: 'BV', type: 'indent', note: '12', libelle: 'Valeurs a encaisser' },
  { ref: 'BW', type: 'indent', note: '13', libelle: 'Banques, etablissements financiers, caisses et assimiles' },
  { ref: 'BX', type: 'subtotal', libelle: 'TOTAL TRESORERIE ACTIF', sumRefs: ['BU','BV','BW'] },

  { ref: 'BY', type: 'indent', note: '14', libelle: 'Ecart de conversion-Actif' },
  { ref: 'BZ', type: 'total', libelle: 'TOTAL GENERAL', sumRefs: ['AZ','BT','BX','BY'] },
];

export const PASSIF_ROWS: BilanRow[] = [
  { ref: 'CA', type: 'indent', note: '15', libelle: 'Dotation non consomptible sans droit de reprise' },
  { ref: 'CB', type: 'indent', note: '15', libelle: 'Dotation non consomptible avec droit de reprise' },
  { ref: 'CC', type: 'indent', note: '15', libelle: "Droit d'entree" },
  { ref: 'CD', type: 'indent', note: '15', libelle: 'Dotation consomptible' },
  { ref: 'CE', type: 'indent', note: '5F', libelle: 'Ecarts de reevaluation' },
  { ref: 'CF', type: 'indent', note: '16', libelle: 'Reserves' },
  { ref: 'CG', type: 'indent', note: '16', libelle: 'Report a nouveau (+ ou -)' },
  { ref: 'CH', type: 'indent', note: '', libelle: "Resultat net de l'exercice (excedent + ou deficit -)" },
  { ref: 'CI', type: 'indent', note: '17A', libelle: "Subventions d'investissement" },
  { ref: 'CJ', type: 'indent', note: '17A', libelle: 'Provisions reglementees' },
  { ref: 'CK', type: 'subtotal', libelle: 'TOTAL FONDS PROPRES ET ASSIMILES', sumRefs: ['CA','CB','CC','CD','CE','CF','CG','CH','CI','CJ'] },

  { ref: 'CW', type: 'indent', note: '17B', libelle: "Fonds affectes et provenant de dons et legs d'immobilisations" },
  { ref: 'CX', type: 'indent', note: '17B', libelle: 'Fonds reportes' },
  { ref: 'CY', type: 'subtotal', libelle: 'TOTAL FONDS AFFECTES ET REPORTES', sumRefs: ['CW','CX'] },

  { ref: 'CZ', type: 'subtotal', libelle: 'TOTAL RESSOURCES PROPRES ET ASSIMILEES', sumRefs: ['CK','CY'] },

  { ref: 'DA', type: 'indent', note: '18A', libelle: 'Emprunts et dettes financieres' },
  { ref: 'DB', type: 'indent', note: '18A', libelle: 'Dettes de location-acquisition' },
  { ref: 'DC', type: 'indent', note: '18A', libelle: 'Provisions pour risques et charges' },
  { ref: 'DD', type: 'subtotal', libelle: 'TOTAL DETTES FINANCIERES ET RESSOURCES ASSIMILEES', sumRefs: ['DA','DB','DC'] },

  { ref: 'DE', type: 'subtotal', libelle: 'TOTAL RESSOURCES STABLES', sumRefs: ['CZ','DD'] },

  { ref: 'DF', type: 'indent', note: '7', libelle: 'Dettes circulantes HAO' },
  { ref: 'DG', type: 'indent', note: '9', libelle: 'Adherents, clients-usagers crediteurs' },
  { ref: 'DH', type: 'indent', note: '19', libelle: 'Fournisseurs' },
  { ref: 'DI', type: 'indent', note: '20 & 21', libelle: 'Autres dettes' },
  { ref: 'DV', type: 'subtotal', libelle: 'TOTAL PASSIF CIRCULANT', sumRefs: ['DF','DG','DH','DI'] },

  { ref: 'DW', type: 'indent', note: '22', libelle: 'Banques, etablissements financiers et credits de tresorerie' },
  { ref: 'DX', type: 'subtotal', libelle: 'TOTAL TRESORERIE PASSIF', sumRefs: ['DW'] },

  { ref: 'DY', type: 'indent', note: '14', libelle: 'Ecart de conversion-Passif' },
  { ref: 'DZ', type: 'total', libelle: 'TOTAL GENERAL', sumRefs: ['DE','DV','DX','DY'] },
];

export interface ActifValues { brut: number; amort: number; net: number; }
export interface PassifValues { net: number; }

function matchesComptes(numCompte: string, prefixes: string[]): boolean {
  return prefixes.some(p => numCompte.startsWith(p));
}

export function computeFromBalance(
  lignes: BalanceLigne[],
  mapping: Record<string, ActifMapping>,
): Record<string, ActifValues> {
  const result: Record<string, ActifValues> = {};
  for (const ref in mapping) {
    const brutComptes = mapping[ref].brut || [];
    const brutExclude = mapping[ref].brutExclude || [];
    const amortComptes = mapping[ref].amort || [];
    const amortExclude = mapping[ref].amortExclude || [];
    const debitOnly = mapping[ref].debitOnly || [];
    let brut = 0;
    let amort = 0;

    for (const l of lignes) {
      const num = (l.numero_compte || '').trim();
      const sd = parseFloat(String(l.solde_debiteur_revise ?? l.solde_debiteur)) || 0;
      const sc = parseFloat(String(l.solde_crediteur_revise ?? l.solde_crediteur)) || 0;

      if (matchesComptes(num, brutComptes) && !matchesComptes(num, brutExclude)) {
        if (debitOnly.length > 0 && matchesComptes(num, debitOnly)) {
          if (sd > sc) brut += sd - sc;
        } else {
          brut += sd - sc;
        }
      }
      if (matchesComptes(num, amortComptes) && !matchesComptes(num, amortExclude)) {
        amort += sc - sd;
      }
    }

    result[ref] = { brut, amort, net: brut - amort };
  }
  return result;
}

export function computePassifFromBalance(
  lignes: BalanceLigne[],
  mapping: Record<string, PassifMapping>,
): Record<string, PassifValues> {
  const result: Record<string, PassifValues> = {};
  for (const ref in mapping) {
    const comptes = mapping[ref].comptes || [];
    const exclude = mapping[ref].exclude || [];
    const creditOnly = mapping[ref].creditOnly || [];
    let net = 0;

    for (const l of lignes) {
      const num = (l.numero_compte || '').trim();
      const sd = parseFloat(String(l.solde_debiteur_revise ?? l.solde_debiteur)) || 0;
      const sc = parseFloat(String(l.solde_crediteur_revise ?? l.solde_crediteur)) || 0;

      if (matchesComptes(num, comptes) && !matchesComptes(num, exclude)) {
        if (creditOnly.length > 0 && matchesComptes(num, creditOnly)) {
          if (sc > sd) net += sc - sd;
        } else {
          net += sc - sd;
        }
      }
    }
    result[ref] = { net };
  }
  return result;
}

// Resoud la valeur d'un REF : feuille = lookup direct, sous-total = somme recursive des sumRefs.
export function getActifValueFor(
  ref: string,
  field: 'brut' | 'amort' | 'net',
  data: Record<string, ActifValues>,
): number {
  const row = ACTIF_ROWS.find(r => r.ref === ref);
  if (row && row.sumRefs) {
    return row.sumRefs.reduce((sum: number, r: string) => {
      const subRow = ACTIF_ROWS.find(sr => sr.ref === r);
      if (subRow && subRow.sumRefs) {
        return sum + getActifValueFor(r, field, data);
      }
      return sum + (data[r] ? (data[r][field] || 0) : 0);
    }, 0);
  }
  return data[ref] ? (data[ref][field] || 0) : 0;
}

export function getPassifValueFor(
  ref: string,
  data: Record<string, PassifValues>,
): number {
  const row = PASSIF_ROWS.find(r => r.ref === ref);
  if (row && row.sumRefs) {
    return row.sumRefs.reduce((sum: number, r: string) => {
      const subRow = PASSIF_ROWS.find(sr => sr.ref === r);
      if (subRow && subRow.sumRefs) {
        return sum + getPassifValueFor(r, data);
      }
      return sum + (data[r] ? (data[r].net || 0) : 0);
    }, 0);
  }
  return data[ref] ? (data[ref].net || 0) : 0;
}

export function formatMontant(val: number): string {
  if (!val || val === 0) return '0';
  return Math.round(val).toLocaleString('fr-FR');
}
