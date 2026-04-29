// Postes bilan necessaires au TFT : actif net (classes 2/3/4/5),
// passif circulant, tresorerie actif/passif. Consomme les helpers
// bas-niveau de `soldes.ts`.

import type { BalanceLigne } from '../../types';
import { getSD, getSC, matchesComptes, sumSoldeDebiteur } from './soldes';

// Actif net = brut (SD-SC) - amort/deprec (SC-SD), avec gestion des comptes
// partages (debitOnly) qui ne contribuent qu'en solde debiteur.
export function actifNet(
  lignes: BalanceLigne[],
  brutPfx: string[],
  amortPfx: string[] = [],
  brutExcl: string[] = [],
  amortExcl: string[] = [],
  debitOnlyPfx: string[] = [],
): number {
  let brut = 0, amort = 0;
  for (const l of lignes) {
    const num = (l.numero_compte || '').trim();
    const sd = getSD(l), sc = getSC(l);
    if (matchesComptes(num, brutPfx) && !matchesComptes(num, brutExcl)) {
      if (debitOnlyPfx.length > 0 && matchesComptes(num, debitOnlyPfx)) {
        if (sd > sc) brut += sd - sc;
      } else {
        brut += sd - sc;
      }
    }
    if (amortPfx.length > 0 && matchesComptes(num, amortPfx) && !matchesComptes(num, amortExcl)) {
      amort += sc - sd;
    }
  }
  return brut - amort;
}

// Passif value (crediteur), avec gestion des comptes partages (creditOnly).
export function passifVal(
  lignes: BalanceLigne[],
  comptes: string[],
  exclude: string[] = [],
  creditOnlyPfx: string[] = [],
): number {
  let val = 0;
  for (const l of lignes) {
    const num = (l.numero_compte || '').trim();
    const sd = getSD(l), sc = getSC(l);
    if (matchesComptes(num, comptes) && !matchesComptes(num, exclude)) {
      if (creditOnlyPfx.length > 0 && matchesComptes(num, creditOnlyPfx)) {
        if (sc > sd) val += sc - sd;
      } else {
        val += sc - sd;
      }
    }
  }
  return val;
}

// Construit des lignes virtuelles ou solde_debiteur = si_debit et
// solde_crediteur = si_credit. Permet de reutiliser bilanTresoActif /
// bilanTresoPassif avec les soldes d'ouverture d'une meme balance.
export function lignesFromSI(lignes: BalanceLigne[]): BalanceLigne[] {
  return lignes.map(l => ({
    ...l,
    solde_debiteur: parseFloat(String(l.si_debit ?? 0)) || 0,
    solde_crediteur: parseFloat(String(l.si_credit ?? 0)) || 0,
  }));
}

// ===================== REFS BILAN pour TFT =====================

// BA : Actif circulant HAO net
export function bilanBA(l: BalanceLigne[]): number { return actifNet(l, ['485', '488'], ['498']); }

// BB : Stocks et encours nets
export function bilanBB(l: BalanceLigne[]): number { return actifNet(l, ['31', '32', '33', '34', '35', '36', '37', '38'], ['39']); }

// BH : Fournisseurs, avances versees net
export function bilanBH(l: BalanceLigne[]): number { return actifNet(l, ['409'], ['490']); }

// BI : Clients net (excl 419 = avances recues, debitOnly pour comptes 41)
export function bilanBI(l: BalanceLigne[]): number { return actifNet(l, ['41'], ['491'], ['419'], [], ['41']); }

// BJ : Autres creances net (excl 478 = ecart conversion actif, debitOnly pour 185 et 42-47)
// Le 185 (Comptes courants associes/societes apparentees) est partage : un solde
// crediteur du 185 est une dette qui va en DM (passif), pas en BJ (creances).
// Symetrique avec bilanSyscohadaData.ts BJ (commit 1338b69).
export function bilanBJ(l: BalanceLigne[]): number {
  return actifNet(l, ['185', '42', '43', '44', '45', '46', '47'],
    ['492', '493', '494', '495', '496', '497'], ['478'], [],
    ['185', '42', '43', '44', '45', '46', '47']);
}

// Tresorerie actif nette : BQ + BR + BS
export function bilanTresoActif(l: BalanceLigne[]): number {
  const BQ = actifNet(l, ['50'], ['590']);
  const BR = actifNet(l, ['51'], ['591']);
  const BS = actifNet(l, ['52', '53', '54', '55', '57', '581', '582'], ['592', '593', '594'], [], [], ['52', '53']);
  return BQ + BR + BS;
}

// DP : Total passif circulant (DH + DI + DJ + DK + DM + DN)
export function bilanDP(l: BalanceLigne[]): number {
  const DH = passifVal(l, ['481', '482', '484', '4998']);
  const DI = passifVal(l, ['419']);
  const DJ = passifVal(l, ['40'], ['409']);
  const DK = passifVal(l, ['42', '43', '44'], [], ['42', '43', '44']);
  const DM = passifVal(l, ['185', '45', '46', '47'], ['479'], ['185', '45', '46', '47']);
  const DN = passifVal(l, ['499', '599'], ['4998']);
  return DH + DI + DJ + DK + DM + DN;
}

// Tresorerie passif : DQ + DR
export function bilanTresoPassif(l: BalanceLigne[]): number {
  const DQ = passifVal(l, ['564', '565']);
  const DR = passifVal(l, ['52', '53', '561', '566'], [], ['52', '53']);
  return DQ + DR;
}

// AD : Immobilisations incorporelles brut (tout compte 21)
export function bilanAD_brut(l: BalanceLigne[]): number { return sumSoldeDebiteur(l, ['21']); }

// AI : Immobilisations corporelles brut (comptes 22, 23, 24 — sauf 251, 252 qui sont les avances AP)
export function bilanAI_brut(l: BalanceLigne[]): number { return sumSoldeDebiteur(l, ['22', '23', '24']); }
