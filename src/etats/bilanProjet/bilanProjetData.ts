// Donnees et calculs purs du Bilan Projet (§2291 SYCEBNL Projet).

import type { BalanceLigne } from '../../types';

interface ActifMappingEntry {
  comptes: string[];
  exclude?: string[];
  description: string;
  debiteur?: boolean;
}

interface PassifMappingEntry {
  comptes: string[];
  exclude?: string[];
  description: string;
  crediteur?: boolean;
}

export interface BilanProjetRow {
  ref: string;
  type: 'header' | 'indent' | 'subtotal' | 'total';
  libelle: string;
  sumRefs?: string[];
}

export type PageMode = 'actif' | 'passif';

const ACTIF_MAPPING: Record<string, ActifMappingEntry> = {
  AA: { comptes: ['21'], description: 'Immobilisations incorporelles' },
  AB: { comptes: ['22', '231', '232', '233', '2391', '2392', '2393', '2396'], description: 'Terrains et bâtiments' },
  AC: { comptes: ['234', '235', '238', '2394', '2395', '2398'], description: 'Aménagements, agencements et installations' },
  AD: { comptes: ['24'], exclude: ['245', '2495'], description: 'Matériel, mobilier et actifs biologiques' },
  AE: { comptes: ['245', '2495'], description: 'Matériel de transport' },
  AF: { comptes: ['25'], description: 'Avances et acomptes versés sur immobilisations' },
  AG: { comptes: ['275'], description: 'Dépôts et cautionnements' },
  AH: { comptes: ['26', '27'], exclude: ['275'], description: 'Autres immobilisations corporelles et financières' },
  BA: { comptes: ['485'], description: 'Actif circulant HAO', debiteur: true },
  BB: { comptes: ['31', '32', '33', '34', '36', '37', '38'], description: 'Stocks et encours' },
  BC: { comptes: ['409'], description: 'Fournisseurs débiteurs' },
  BD: { comptes: ['41'], exclude: ['411', '419'], description: 'Clients-usagers' },
  BE: { comptes: ['42', '43', '44', '47'], exclude: ['478'], description: 'Autres créances', debiteur: true },
  BV: { comptes: ['51'], description: 'Valeurs à encaisser' },
  BW: { comptes: ['52', '53', '55', '57'], description: 'Banques, établissements financiers, caisses et assimilés', debiteur: true },
  BY: { comptes: ['478'], description: 'Écart de conversion-Actif' },
};

const PASSIF_MAPPING: Record<string, PassifMappingEntry> = {
  CA: { comptes: ['16'], description: 'Fonds affectés aux investissements' },
  CB: { comptes: ['12'], description: 'Report à nouveau (+ ou -)' },
  CC: { comptes: ['131', '139'], description: 'Solde des opérations de l\'exercice' },
  CD: { comptes: ['14'], description: 'Subventions d\'investissement' },
  DA: { comptes: ['18'], description: 'Emprunts et dettes assimilées' },
  DB: { comptes: ['19'], description: 'Provisions pour risques et charges' },
  DE: { comptes: ['481', '484', '4998'], description: 'Dettes circulantes HAO', crediteur: true },
  DF: { comptes: ['46'], description: 'Fonds d\'administration' },
  DG: { comptes: ['40'], exclude: ['409'], description: 'Fournisseurs' },
  DH: { comptes: ['419', '42', '43', '44', '47', '499', '599'], exclude: ['479', '4998'], description: 'Autres dettes', crediteur: true },
  DI: { comptes: [], description: 'Provisions pour risques et charges à court terme' },
  DW: { comptes: ['56', '52', '53'], description: 'Banques, établissements financiers et crédits de trésorerie', crediteur: true },
  DY: { comptes: ['479'], description: 'Écart de conversion-Passif' },
};

export const ACTIF_ROWS: BilanProjetRow[] = [
  { ref: '', type: 'header', libelle: 'ACTIF IMMOBILISÉ' },
  { ref: 'AA', type: 'indent', libelle: 'Immobilisations incorporelles' },
  { ref: 'AB', type: 'indent', libelle: 'Terrains et bâtiments' },
  { ref: 'AC', type: 'indent', libelle: 'Aménagements, agencements et installations' },
  { ref: 'AD', type: 'indent', libelle: 'Matériel, mobilier et actifs biologiques' },
  { ref: 'AE', type: 'indent', libelle: 'Matériel de transport' },
  { ref: 'AF', type: 'indent', libelle: 'Avances et acomptes versés sur immobilisations' },
  { ref: 'AG', type: 'indent', libelle: 'Dépôts et cautionnements' },
  { ref: 'AH', type: 'indent', libelle: 'Autres immobilisations corporelles et financières' },
  { ref: 'AZ', type: 'subtotal', libelle: 'TOTAL ACTIF IMMOBILISÉ', sumRefs: ['AA', 'AB', 'AC', 'AD', 'AE', 'AF', 'AG', 'AH'] },
  { ref: '', type: 'header', libelle: 'ACTIF CIRCULANT' },
  { ref: 'BA', type: 'indent', libelle: 'Actif circulant HAO' },
  { ref: 'BB', type: 'indent', libelle: 'Stocks et encours' },
  { ref: 'BC', type: 'indent', libelle: 'Fournisseurs débiteurs' },
  { ref: 'BD', type: 'indent', libelle: 'Clients-usagers' },
  { ref: 'BE', type: 'indent', libelle: 'Autres créances' },
  { ref: 'BF', type: 'subtotal', libelle: 'TOTAL ACTIF CIRCULANT', sumRefs: ['BA', 'BB', 'BC', 'BD', 'BE'] },
  { ref: '', type: 'header', libelle: 'TRÉSORERIE ACTIF' },
  { ref: 'BV', type: 'indent', libelle: 'Valeurs à encaisser' },
  { ref: 'BW', type: 'indent', libelle: 'Banques, établ. financiers, caisses et assimilés' },
  { ref: 'BX', type: 'subtotal', libelle: 'TOTAL TRÉSORERIE ACTIF', sumRefs: ['BV', 'BW'] },
  { ref: 'BY', type: 'indent', libelle: 'Écart de conversion-Actif' },
  { ref: 'BZ', type: 'total', libelle: 'TOTAL GÉNÉRAL', sumRefs: ['AZ', 'BF', 'BX', 'BY'] },
];

export const PASSIF_ROWS: BilanProjetRow[] = [
  { ref: '', type: 'header', libelle: 'RESSOURCES PROPRES ET ASSIMILÉES' },
  { ref: 'CA', type: 'indent', libelle: 'Fonds affectés aux investissements' },
  { ref: 'CB', type: 'indent', libelle: 'Report à nouveau (+ ou -)' },
  { ref: 'CC', type: 'indent', libelle: 'Solde des opérations de l\'exercice' },
  { ref: 'CD', type: 'indent', libelle: 'Subventions d\'investissement' },
  { ref: 'CZ', type: 'subtotal', libelle: 'TOTAL RESSOURCES PROPRES ET ASSIMILÉES', sumRefs: ['CA', 'CB', 'CC', 'CD'] },
  { ref: '', type: 'header', libelle: 'DETTES FINANCIÈRES ET RESSOURCES ASSIMILÉES' },
  { ref: 'DA', type: 'indent', libelle: 'Emprunts et dettes assimilées' },
  { ref: 'DB', type: 'indent', libelle: 'Provisions pour risques et charges' },
  { ref: 'DC', type: 'subtotal', libelle: 'TOTAL DETTES FINANCIÈRES ET RESS. ASSIMILÉES', sumRefs: ['DA', 'DB'] },
  { ref: 'DD', type: 'subtotal', libelle: 'TOTAL RESSOURCES STABLES', sumRefs: ['CZ', 'DC'] },
  { ref: '', type: 'header', libelle: 'PASSIF CIRCULANT' },
  { ref: 'DE', type: 'indent', libelle: 'Dettes circulantes HAO' },
  { ref: 'DF', type: 'indent', libelle: 'Fonds d\'administration' },
  { ref: 'DG', type: 'indent', libelle: 'Fournisseurs' },
  { ref: 'DH', type: 'indent', libelle: 'Autres dettes' },
  { ref: 'DI', type: 'indent', libelle: 'Provisions pour risques et charges à court terme' },
  { ref: 'DJ', type: 'subtotal', libelle: 'TOTAL PASSIF CIRCULANT', sumRefs: ['DE', 'DF', 'DG', 'DH', 'DI'] },
  { ref: '', type: 'header', libelle: 'TRÉSORERIE PASSIF' },
  { ref: 'DW', type: 'indent', libelle: 'Banques, établ. financiers et crédits de trésorerie' },
  { ref: 'DX', type: 'subtotal', libelle: 'TOTAL TRÉSORERIE PASSIF', sumRefs: ['DW'] },
  { ref: 'DY', type: 'indent', libelle: 'Écart de conversion-Passif' },
  { ref: 'DZ', type: 'total', libelle: 'TOTAL GÉNÉRAL', sumRefs: ['DD', 'DJ', 'DX', 'DY'] },
];

function matchesComptes(numCompte: string, prefixes: string[]): boolean {
  return prefixes.some(p => numCompte.startsWith(p));
}

export function computeActifValues(lignes: BalanceLigne[]): Record<string, number> {
  const result: Record<string, number> = {};
  for (const ref in ACTIF_MAPPING) {
    const { comptes, exclude = [], debiteur } = ACTIF_MAPPING[ref];
    let val = 0;
    for (const l of lignes) {
      const num = (l.numero_compte || '').trim();
      const sd = parseFloat(String(l.solde_debiteur_revise ?? l.solde_debiteur)) || 0;
      const sc = parseFloat(String(l.solde_crediteur_revise ?? l.solde_crediteur)) || 0;
      if (matchesComptes(num, comptes) && !matchesComptes(num, exclude)) {
        if (debiteur) {
          if (sd > sc) val += sd - sc;
        } else {
          val += sd - sc;
        }
      }
    }
    result[ref] = Math.abs(val) > 0.5 ? Math.abs(val) : 0;
  }
  return result;
}

export function computePassifValues(lignes: BalanceLigne[]): Record<string, number> {
  const result: Record<string, number> = {};
  for (const ref in PASSIF_MAPPING) {
    const { comptes, exclude = [], crediteur } = PASSIF_MAPPING[ref];
    let val = 0;
    for (const l of lignes) {
      const num = (l.numero_compte || '').trim();
      const sd = parseFloat(String(l.solde_debiteur_revise ?? l.solde_debiteur)) || 0;
      const sc = parseFloat(String(l.solde_crediteur_revise ?? l.solde_crediteur)) || 0;
      if (matchesComptes(num, comptes) && !matchesComptes(num, exclude)) {
        if (crediteur) {
          if (sc > sd) val += sc - sd;
        } else {
          val += sc - sd;
        }
      }
    }
    result[ref] = Math.abs(val) > 0.5 ? Math.abs(val) : 0;
  }
  return result;
}

export function formatMontant(val: number): string {
  if (!val || Math.abs(val) < 0.5) return '0';
  return Math.round(val).toLocaleString('fr-FR');
}

export function processRows(rows: BilanProjetRow[], rawVals: Record<string, number>): Record<string, number> {
  const processed: Record<string, number> = {};
  for (const row of rows) {
    if (!row.ref) continue;
    if (row.sumRefs) {
      processed[row.ref] = row.sumRefs.reduce((s: number, r: string) => s + (processed[r] || rawVals[r] || 0), 0);
    } else {
      processed[row.ref] = rawVals[row.ref] || 0;
    }
  }
  return processed;
}
