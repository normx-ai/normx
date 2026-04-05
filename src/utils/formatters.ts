/**
 * Fonctions de formatage centralisees - NormX
 */

export function fmt(val: number | string): string {
  const n = typeof val === 'number' ? val : parseFloat(String(val));
  if (isNaN(n) || Math.abs(n) < 0.5) return '';
  return n.toLocaleString('fr-FR', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

export function fmtInput(val: number | string): string {
  const n = typeof val === 'number' ? val : parseFloat(String(val));
  if (!n || isNaN(n)) return '';
  return n.toLocaleString('fr-FR', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

export function fmtDate(d: string | Date | null | undefined): string {
  if (!d) return '';
  const date = typeof d === 'string' ? new Date(d) : d;
  if (isNaN(date.getTime())) return '';
  return date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export function parseInputNumber(str: string): number {
  const cleaned = str.replace(/\s/g, '').replace(/\./g, '').replace(',', '.');
  return parseFloat(cleaned) || 0;
}

export function fmtM(v: number): string {
  if (!v || v === 0) return '';
  return Math.round(v).toLocaleString('fr-FR');
}

export const MOIS: string[] = [
  'Janvier', 'Fevrier', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Aout', 'Septembre', 'Octobre', 'Novembre', 'Decembre'
];
