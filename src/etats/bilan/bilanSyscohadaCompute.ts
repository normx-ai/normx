// ===================== CALCULS — BILAN SYSCOHADA =====================
// Fonctions pures qui transforment les lignes de balance en resultats actif / passif.

import type { BalanceLigne, ActifMapping, PassifMapping } from '../../types';
import { CR_PRODUITS, CR_CHARGES, type ActifResult, type PassifResult } from './bilanSyscohadaData';

export function formatMontant(val: number): string {
  if (!val || val === 0) return '';
  return Math.round(val).toLocaleString('fr-FR');
}

export function matchesComptes(numCompte: string, prefixes: string[]): boolean {
  return prefixes.some((p) => numCompte.startsWith(p));
}

// Reproduit exactement XI = Produits - Charges du Compte de Resultat SYSCOHADA
export function computeResultatNetCR(lignes: BalanceLigne[]): number {
  let produits = 0;
  let charges = 0;
  for (const l of lignes) {
    const num = (l.numero_compte || '').trim();
    const sd = parseFloat(String(l.solde_debiteur_revise ?? l.solde_debiteur)) || 0;
    const sc = parseFloat(String(l.solde_crediteur_revise ?? l.solde_crediteur)) || 0;
    if (CR_PRODUITS.some((p) => num.startsWith(p))) produits += sc - sd;
    if (CR_CHARGES.some((p) => num.startsWith(p))) charges += sd - sc;
  }
  return produits - charges;
}

// ACTIF : debitOnly = comptes partages, brutExclude/amortExclude = prefixes a exclure
export function computeActifFromBalance(
  lignes: BalanceLigne[],
  mapping: Record<string, ActifMapping>,
): Record<string, ActifResult> {
  const result: Record<string, ActifResult> = {};

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

// PASSIF : creditOnly = comptes partages, exclude = prefixes a exclure,
// debitAccount = compte a solde debiteur qui apparait en negatif au passif (ex: 109)
export function computePassifFromBalance(
  lignes: BalanceLigne[],
  mapping: Record<string, PassifMapping>,
): Record<string, PassifResult> {
  const result: Record<string, PassifResult> = {};

  for (const ref in mapping) {
    const comptes = mapping[ref].comptes || [];
    const exclude = mapping[ref].exclude || [];
    const creditOnly = mapping[ref].creditOnly || [];
    const isDebitAccount = mapping[ref].debitAccount || false;
    let net = 0;

    for (const l of lignes) {
      const num = (l.numero_compte || '').trim();
      const sd = parseFloat(String(l.solde_debiteur_revise ?? l.solde_debiteur)) || 0;
      const sc = parseFloat(String(l.solde_crediteur_revise ?? l.solde_crediteur)) || 0;

      if (matchesComptes(num, comptes) && !matchesComptes(num, exclude)) {
        if (isDebitAccount) {
          // Compte 109 : solde debiteur, apparait en negatif au passif
          net += sd - sc;
        } else if (creditOnly.length > 0 && matchesComptes(num, creditOnly)) {
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
