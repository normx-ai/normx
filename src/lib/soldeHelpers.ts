/**
 * Helpers de calcul de soldes comptables.
 *
 * Definitions standards SYSCOHADA :
 *   - solde net      : debit - credit (positif = solde debiteur, negatif = crediteur)
 *   - solde debiteur : max(0, debit - credit)  -> ce qu'on retrouve dans la colonne SD
 *   - solde crediteur: max(0, credit - debit)  -> ce qu'on retrouve dans la colonne SC
 *
 * Centralise pour eviter les re-implementations locales (pattern dupliques
 * historiquement dans BalanceGenerale, Note12, GrandLivreTiers).
 */

export interface SoldeLine {
  debit: number | string | null | undefined;
  credit: number | string | null | undefined;
}

function num(v: number | string | null | undefined): number {
  if (v === null || v === undefined) return 0;
  return parseFloat(String(v)) || 0;
}

/**
 * Solde net : debit - credit.
 * Positif = compte solde debiteur, negatif = solde crediteur.
 */
export function soldeNet(line: SoldeLine): number {
  return num(line.debit) - num(line.credit);
}

/**
 * Solde debiteur : max(0, debit - credit).
 * Pour affichage colonne SD d'une balance.
 */
export function soldeDebiteur(line: SoldeLine): number {
  return Math.max(0, num(line.debit) - num(line.credit));
}

/**
 * Solde crediteur : max(0, credit - debit).
 * Pour affichage colonne SC d'une balance.
 */
export function soldeCrediteur(line: SoldeLine): number {
  return Math.max(0, num(line.credit) - num(line.debit));
}

/**
 * Totaux d'un ensemble de lignes (debit, credit, solde net).
 */
export interface SoldeTotals {
  debit: number;
  credit: number;
  net: number;
}

export function sumSoldes(lines: SoldeLine[]): SoldeTotals {
  let debit = 0;
  let credit = 0;
  for (const l of lines) {
    debit += num(l.debit);
    credit += num(l.credit);
  }
  return { debit, credit, net: debit - credit };
}
