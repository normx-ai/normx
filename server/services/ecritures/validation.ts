/**
 * Validation metier des ecritures comptables.
 *
 * Regles :
 *   1. Equilibre : somme des debits = somme des credits (tolerance 0.01 XAF)
 *   2. Comptes : tous les numeros doivent appartenir au plan comptable SYCEBNL
 *      (recherche par troncature : '101100' -> '1011' -> '101' -> '10')
 *
 * Les validations Zod (server/schemas/ecritures.schema.ts) garantissent la
 * structure ; ce module porte la logique metier.
 */

import planComptable from '../../data/planComptable';
import type { CompteComptable as PlanCompte } from '../../types/comptes';
import type { EcritureLigne } from './types';
import { ValidationError } from '../../errors';

const planComptableNumeros = new Set(planComptable.map((c: PlanCompte) => c.numero));

/**
 * Verifie qu'un numero de compte existe dans le plan SYCEBNL.
 * Recherche par troncature des zeros finaux (ex: 101100 -> 1011 -> 101 -> 10).
 */
export function isCompteValide(numero: string): boolean {
  if (planComptableNumeros.has(numero)) return true;
  let trimmed = numero.replace(/0+$/, '');
  while (trimmed.length >= 2) {
    if (planComptableNumeros.has(trimmed)) return true;
    trimmed = trimmed.slice(0, -1);
  }
  return false;
}

export interface EcritureValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Valide les lignes d'une ecriture comptable (equilibre + comptes valides).
 * Retourne `{ valid: false, error }` plutot que de throw, pour permettre au
 * caller de choisir entre format API (ValidationError) et format CLI (log).
 */
export function validateEcritureLines(lignes: EcritureLigne[]): EcritureValidationResult {
  const totalDebit = lignes.reduce(
    (s: number, l: EcritureLigne) => s + (parseFloat(String(l.debit)) || 0),
    0,
  );
  const totalCredit = lignes.reduce(
    (s: number, l: EcritureLigne) => s + (parseFloat(String(l.credit)) || 0),
    0,
  );
  if (Math.abs(totalDebit - totalCredit) > 0.01) {
    return {
      valid: false,
      error: `Ecriture desequilibree. Debit: ${totalDebit}, Credit: ${totalCredit}`,
    };
  }

  const comptesInvalides = lignes
    .filter((l: EcritureLigne) => l.numero_compte && (parseFloat(String(l.debit)) || parseFloat(String(l.credit))))
    .filter((l: EcritureLigne) => !isCompteValide(l.numero_compte))
    .map((l: EcritureLigne) => l.numero_compte);
  if (comptesInvalides.length > 0) {
    return {
      valid: false,
      error: 'Comptes invalides (absents du plan comptable SYCEBNL) : ' + comptesInvalides.join(', '),
    };
  }
  return { valid: true };
}

/**
 * Variante throw : leve ValidationError si invalide. Pratique dans les routes
 * qui delegueront au middleware central via asyncHandler.
 */
export function assertEcritureLinesValid(lignes: EcritureLigne[]): void {
  const r = validateEcritureLines(lignes);
  if (!r.valid) throw new ValidationError(r.error ?? 'Ecriture invalide');
}
