// Helpers bas-niveau pour le TFT : acces aux soldes d'une ligne de balance,
// agregations par prefixes de comptes (debit/credit, solde net, mouvements).
// Tous les helpers superieurs (bilan, calculs, diagnostic) consomment ceux-ci.

import type { BalanceLigne } from '../../types';
import { fmtMontantParens } from '../../utils/formatters';

// Format reutilise dans les messages de diagnostic (negatifs entre parentheses).
export const formatMontant = fmtMontantParens;

export function matchesComptes(numCompte: string, prefixes: string[]): boolean {
  return prefixes.some(p => numCompte.startsWith(p));
}

export function getSD(l: BalanceLigne): number {
  return parseFloat(String(l.solde_debiteur_revise ?? l.solde_debiteur)) || 0;
}

export function getSC(l: BalanceLigne): number {
  return parseFloat(String(l.solde_crediteur_revise ?? l.solde_crediteur)) || 0;
}

// Solde debiteur net (SD - SC)
export function sumSoldeDebiteur(lignes: BalanceLigne[], prefixes: string[], excludes: string[] = []): number {
  let total = 0;
  for (const l of lignes) {
    const num = (l.numero_compte || '').trim();
    if (matchesComptes(num, prefixes) && !matchesComptes(num, excludes)) {
      total += getSD(l) - getSC(l);
    }
  }
  return total;
}

// Solde crediteur net (SC - SD)
export function sumSoldeCrediteur(lignes: BalanceLigne[], prefixes: string[], excludes: string[] = []): number {
  let total = 0;
  for (const l of lignes) {
    const num = (l.numero_compte || '').trim();
    if (matchesComptes(num, prefixes) && !matchesComptes(num, excludes)) {
      total += getSC(l) - getSD(l);
    }
  }
  return total;
}

// Solde debiteur brut (SD uniquement, sans nettoyer SC)
export function rawSD(lignes: BalanceLigne[], prefixes: string[], excludes: string[] = []): number {
  let total = 0;
  for (const l of lignes) {
    const num = (l.numero_compte || '').trim();
    if (matchesComptes(num, prefixes) && !matchesComptes(num, excludes)) {
      total += getSD(l);
    }
  }
  return total;
}

// Solde crediteur brut (SC uniquement)
export function rawSC(lignes: BalanceLigne[], prefixes: string[], excludes: string[] = []): number {
  let total = 0;
  for (const l of lignes) {
    const num = (l.numero_compte || '').trim();
    if (matchesComptes(num, prefixes) && !matchesComptes(num, excludes)) {
      total += getSC(l);
    }
  }
  return total;
}

// Mouvement debit (total des debits de la periode)
export function sumMvtDebit(lignes: BalanceLigne[], prefixes: string[], excludes: string[] = []): number {
  let total = 0;
  for (const l of lignes) {
    const num = (l.numero_compte || '').trim();
    if (matchesComptes(num, prefixes) && !matchesComptes(num, excludes)) {
      total += parseFloat(String(l.debit)) || 0;
    }
  }
  return total;
}

// Mouvement credit (total des credits de la periode)
export function sumMvtCredit(lignes: BalanceLigne[], prefixes: string[], excludes: string[] = []): number {
  let total = 0;
  for (const l of lignes) {
    const num = (l.numero_compte || '').trim();
    if (matchesComptes(num, prefixes) && !matchesComptes(num, excludes)) {
      total += parseFloat(String(l.credit)) || 0;
    }
  }
  return total;
}
