// Donnees et calculs purs du Tableau Emplois Ressources (§2288 SYCEBNL Projet).

import type { BalanceLigne } from '../../types';

export interface TERMappingEntry {
  comptes: string[];
  exclude?: string[];
  description: string;
}

export interface TERRow {
  ref: string;
  type: 'indent' | 'section' | 'subtotal' | 'total';
  libelle: string;
  sumRefs?: string[];
  computeExcedent?: boolean;
  computeEncaisse?: boolean;
  computeControle?: boolean;
}

export const RESSOURCES_MAPPING: Record<string, TERMappingEntry> = {
  FA: { comptes: ['161', '162', '462'], description: 'Fonds reçus, Bailleurs (principal)' },
  FB: { comptes: ['161', '162', '462'], description: 'Fonds reçus, Bailleurs (secondaire — sous-comptes par bailleur)' },
  FC: { comptes: ['163', '463'], description: 'Fonds contrepartie État' },
  FD: { comptes: ['164', '464', '707', '77'], description: 'Autres fonds reçus' },
};

export const IMMOB_MAPPING: Record<string, TERMappingEntry> = {
  FE: { comptes: ['21'], description: 'Immobilisations incorporelles' },
  FF: { comptes: ['22'], description: 'Terrains' },
  FG: { comptes: ['231', '232', '233', '2391', '2392', '2393', '2396'], description: 'Bâtiments' },
  FH: { comptes: ['234', '235', '238', '2394', '2395', '2398'], description: 'Aménagements, agencements et installations' },
  FI: { comptes: ['24'], exclude: ['245', '2495'], description: 'Matériel, mobilier et actifs biologiques' },
  FJ: { comptes: ['245', '2495'], description: 'Matériel de transport' },
  FK: { comptes: ['25'], description: 'Avances et acomptes sur immobilisations' },
  FL: { comptes: ['26', '27'], description: 'Immobilisations financières' },
};

export const CHARGES_MAPPING: Record<string, TERMappingEntry> = {
  FM: { comptes: ['60'], description: 'Achats de biens et services' },
  FN: { comptes: ['61'], description: 'Transports' },
  FO: { comptes: ['62', '63'], description: 'Services extérieurs' },
  FP: { comptes: ['64'], description: 'Impôts et taxes' },
  FQ: { comptes: ['65'], description: 'Autres charges' },
  FR: { comptes: ['66'], description: 'Charges de personnel' },
  FS: { comptes: ['67'], description: 'Charges financières' },
  FT: { comptes: ['4091', '4093'], description: 'Avances sur charges (à justifier)' },
};

export const TER_ROWS: TERRow[] = [
  { ref: 'FA', type: 'indent', libelle: 'Fonds reçus, Bailleurs ....' },
  { ref: 'FB', type: 'indent', libelle: 'Fonds reçus, Bailleurs ....' },
  { ref: 'FC', type: 'indent', libelle: 'Fonds contrepartie État' },
  { ref: 'FD', type: 'indent', libelle: 'Autres fonds reçus' },
  { ref: 'GR', type: 'section', libelle: 'I. RESSOURCES', sumRefs: ['FA', 'FB', 'FC', 'FD'] },
  { ref: 'FE', type: 'indent', libelle: 'Immobilisations incorporelles' },
  { ref: 'FF', type: 'indent', libelle: 'Terrains' },
  { ref: 'FG', type: 'indent', libelle: 'Bâtiments' },
  { ref: 'FH', type: 'indent', libelle: 'Aménagements, agencements et installations' },
  { ref: 'FI', type: 'indent', libelle: 'Matériel, mobilier et actifs biologiques' },
  { ref: 'FJ', type: 'indent', libelle: 'Matériel de transport' },
  { ref: 'FK', type: 'indent', libelle: 'Avances et acomptes sur immobilisations' },
  { ref: 'FL', type: 'indent', libelle: 'Immobilisations financières' },
  { ref: 'GS', type: 'subtotal', libelle: 'A- TOTAL DES IMMOBILISATIONS', sumRefs: ['FE', 'FF', 'FG', 'FH', 'FI', 'FJ', 'FK', 'FL'] },
  { ref: 'FM', type: 'indent', libelle: 'Achats de biens et services' },
  { ref: 'FN', type: 'indent', libelle: 'Transports' },
  { ref: 'FO', type: 'indent', libelle: 'Services extérieurs' },
  { ref: 'FP', type: 'indent', libelle: 'Impôts et taxes' },
  { ref: 'FQ', type: 'indent', libelle: 'Autres charges' },
  { ref: 'FR', type: 'indent', libelle: 'Charges de personnel' },
  { ref: 'FS', type: 'indent', libelle: 'Charges financières' },
  { ref: 'FT', type: 'indent', libelle: 'Avances sur charges (à justifier)' },
  { ref: 'GT', type: 'subtotal', libelle: 'B- TOTAL DES CHARGES DE FONCTIONNEMENT', sumRefs: ['FM', 'FN', 'FO', 'FP', 'FQ', 'FR', 'FS', 'FT'] },
  { ref: 'GU', type: 'section', libelle: 'II. EMPLOIS (A+B)', sumRefs: ['GS', 'GT'] },
  { ref: 'GV', type: 'section', libelle: 'III. EXCÉDENT / DÉFICIT DES FONDS REÇUS SUR LES EMPLOIS (I-II)', computeExcedent: true },
  { ref: 'FU', type: 'indent', libelle: 'Fonds Bailleur en début exercice N' },
  { ref: 'FV', type: 'indent', libelle: 'Fonds de contrepartie État en début exercice N' },
  { ref: 'FW', type: 'indent', libelle: 'Autres fonds en début exercice N' },
  { ref: 'GW', type: 'section', libelle: 'IV. FONDS DISPONIBLE EN DÉBUT EXERCICE', sumRefs: ['FU', 'FV', 'FW'] },
  { ref: 'GX', type: 'section', libelle: 'V. MONTANT NET DE L\'ENCAISSE DISPONIBLE (III+IV)', computeEncaisse: true },
  { ref: 'FX', type: 'indent', libelle: 'Fonds Bailleur en fin exercice N' },
  { ref: 'FY', type: 'indent', libelle: 'Fonds de contrepartie État en fin exercice N' },
  { ref: 'FZ', type: 'indent', libelle: 'Autres fonds en fin exercice N' },
  { ref: 'GY', type: 'section', libelle: 'VI. FONDS DISPONIBLE EN FIN EXERCICE', sumRefs: ['FX', 'FY', 'FZ'] },
  { ref: 'GZ', type: 'total', libelle: 'VII. CONTRÔLE : TOTAL V = TOTAL VI', computeControle: true },
];

function matchesComptes(numCompte: string, prefixes: string[]): boolean {
  return prefixes.some(p => numCompte.startsWith(p));
}

function computeValues(lignes: BalanceLigne[], mapping: Record<string, TERMappingEntry>): Record<string, number> {
  const result: Record<string, number> = {};
  for (const ref in mapping) {
    const comptes = mapping[ref].comptes || [];
    const exclude = mapping[ref].exclude || [];
    let val = 0;
    for (const l of lignes) {
      const num = (l.numero_compte || '').trim();
      const sd = parseFloat(String(l.solde_debiteur_revise ?? l.solde_debiteur)) || 0;
      const sc = parseFloat(String(l.solde_crediteur_revise ?? l.solde_crediteur)) || 0;
      if (matchesComptes(num, comptes) && !matchesComptes(num, exclude)) {
        val += sd - sc;
      }
    }
    result[ref] = val;
  }
  return result;
}

export function computeRessources(lignes: BalanceLigne[]): Record<string, number> {
  const result: Record<string, number> = {};
  for (const ref in RESSOURCES_MAPPING) {
    const comptes = RESSOURCES_MAPPING[ref].comptes || [];
    let val = 0;
    for (const l of lignes) {
      const num = (l.numero_compte || '').trim();
      const sc = parseFloat(String(l.solde_crediteur_revise ?? l.solde_crediteur)) || 0;
      const sd = parseFloat(String(l.solde_debiteur_revise ?? l.solde_debiteur)) || 0;
      if (matchesComptes(num, comptes)) {
        val += sc - sd;
      }
    }
    result[ref] = val;
  }
  return result;
}

export function computeEmplois(lignes: BalanceLigne[]): Record<string, number> {
  const immob = computeValues(lignes, IMMOB_MAPPING);
  const charges = computeValues(lignes, CHARGES_MAPPING);
  const result: Record<string, number> = {};
  for (const ref in immob) result[ref] = Math.abs(immob[ref]);
  for (const ref in charges) result[ref] = Math.abs(charges[ref]);
  return result;
}

export function formatMontant(val: number): string {
  if (!val || Math.abs(val) < 0.5) return '0';
  return Math.round(val).toLocaleString('fr-FR');
}

export interface TERComputedData {
  processedN: Record<string, number>;
  processedN1: Record<string, number>;
  cumulDebutN: Record<string, number>;
  cumulFinN: Record<string, number>;
}

export function computeTERData(lignesN: BalanceLigne[], lignesN1: BalanceLigne[]): TERComputedData {
  const ressourcesN = computeRessources(lignesN);
  const emploisN = computeEmplois(lignesN);
  const ressourcesN1 = computeRessources(lignesN1);
  const emploisN1 = computeEmplois(lignesN1);

  const valsN: Record<string, number> = { ...ressourcesN, ...emploisN };
  const valsN1: Record<string, number> = { ...ressourcesN1, ...emploisN1 };

  const fondsDebutN = computeRessources(lignesN1);
  valsN['FU'] = fondsDebutN['FA'] || 0;
  valsN['FV'] = fondsDebutN['FC'] || 0;
  valsN['FW'] = fondsDebutN['FD'] || 0;

  const fondsFinN = computeRessources(lignesN);
  valsN['FX'] = fondsFinN['FA'] || 0;
  valsN['FY'] = fondsFinN['FC'] || 0;
  valsN['FZ'] = fondsFinN['FD'] || 0;

  const computeSum = (refs: string[], vals: Record<string, number>): number =>
    refs.reduce((s: number, r: string) => s + (vals[r] || 0), 0);

  const processedN: Record<string, number> = {};
  const processedN1: Record<string, number> = {};

  for (const row of TER_ROWS) {
    if (row.sumRefs) {
      processedN[row.ref] = computeSum(row.sumRefs, { ...valsN, ...processedN });
      processedN1[row.ref] = computeSum(row.sumRefs, { ...valsN1, ...processedN1 });
    } else if (row.computeExcedent) {
      processedN[row.ref] = (processedN['GR'] || 0) - (processedN['GU'] || 0);
      processedN1[row.ref] = (processedN1['GR'] || 0) - (processedN1['GU'] || 0);
    } else if (row.computeEncaisse) {
      processedN[row.ref] = (processedN['GV'] || 0) + (processedN['GW'] || 0);
      processedN1[row.ref] = (processedN1['GV'] || 0) + (processedN1['GW'] || 0);
    } else if (row.computeControle) {
      processedN[row.ref] = (processedN['GX'] || 0) - (processedN['GY'] || 0);
      processedN1[row.ref] = (processedN1['GX'] || 0) - (processedN1['GY'] || 0);
    } else {
      processedN[row.ref] = valsN[row.ref] || 0;
      processedN1[row.ref] = valsN1[row.ref] || 0;
    }
  }

  const cumulDebutN: Record<string, number> = {};
  const cumulFinN: Record<string, number> = {};
  for (const row of TER_ROWS) {
    cumulDebutN[row.ref] = processedN1[row.ref] || 0;
    cumulFinN[row.ref] = (cumulDebutN[row.ref] || 0) + (processedN[row.ref] || 0);
  }

  return { processedN, processedN1, cumulDebutN, cumulFinN };
}
