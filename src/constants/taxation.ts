/**
 * Taux fiscaux — CGI Congo 2026.
 * Source de verite unique pour IS, IBA et minimums de perception.
 */

// Impot sur les Societes (Art. 10 CGI 2026)
export const TAUX_IS_NORMAL = 0.28;
export const TAUX_IS_ECOLES = 0.25;
export const TAUX_IS_PETROLE = 0.30;
export const TAUX_IS_ETRANGER = 0.33;

// Minimum de perception IS (Art. 86-C)
export const TAUX_MIN_IS = 0.01;

// Impot sur les Benefices des Activites (Art. 95)
export const TAUX_IBA = 0.30;
export const TAUX_MIN_IBA = 0.015;

export const OPTIONS_TAUX_IS: Array<{ value: number; label: string }> = [
  { value: TAUX_IS_NORMAL, label: '28% (normal)' },
  { value: TAUX_IS_ECOLES, label: '25% (ecoles, micro-finance)' },
  { value: TAUX_IS_PETROLE, label: '30% (taux spécifique 2025)' },
  { value: TAUX_IS_ETRANGER, label: '33% (entites etrangeres)' },
];
