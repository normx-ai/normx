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

export interface FmtMontantOptions {
  abbreviate?: boolean;
}

// Variante : retourne '0' si vide/zero plutot que chaine vide.
// Arrondit a l'entier par defaut (pour affichages etats financiers).
// Avec { abbreviate: true } : 1234 -> "1 k", 1234567 -> "1,2 M", 1234567890 -> "1,2 Md".
export function fmtMontant(v: number | null | undefined, opts?: FmtMontantOptions): string {
  if (!v || v === 0) return '0';
  if (opts?.abbreviate) {
    const abs = Math.abs(v);
    if (abs >= 1_000_000_000) return (v / 1_000_000_000).toFixed(1).replace('.', ',') + ' Md';
    if (abs >= 1_000_000) return (v / 1_000_000).toFixed(1).replace('.', ',') + ' M';
    if (abs >= 1_000) return Math.round(v / 1_000).toString() + ' k';
    return Math.round(v).toString();
  }
  return Math.round(v).toLocaleString('fr-FR');
}

// Variante : negatifs entre parentheses, pour TFT / comptes de resultat.
export function fmtMontantParens(v: number | null | undefined): string {
  if (!v || v === 0) return '0';
  const abs = Math.abs(Math.round(v)).toLocaleString('fr-FR');
  return v < 0 ? '(' + abs + ')' : abs;
}

export const MOIS: string[] = [
  'Janvier', 'Fevrier', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Aout', 'Septembre', 'Octobre', 'Novembre', 'Decembre'
];

// "A l'instant" / "Il y a X min" / "Il y a Xh" / "Il y a Xj" / date complete au-dela d'une semaine.
export function fmtRelativeTime(dateStr: string | Date): string {
  const d = typeof dateStr === 'string' ? new Date(dateStr) : dateStr;
  const diffMs = Date.now() - d.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return "A l'instant";
  if (diffMin < 60) return `Il y a ${diffMin} min`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `Il y a ${diffH}h`;
  const diffD = Math.floor(diffH / 24);
  if (diffD < 7) return `Il y a ${diffD}j`;
  return d.toLocaleDateString('fr-FR');
}

// "Aujourd'hui" / "Hier" / "dd/MM" (pour listes de conversations, historiques recents).
export function fmtDayRelative(dateStr: string | Date): string {
  const d = typeof dateStr === 'string' ? new Date(dateStr) : dateStr;
  const diff = Date.now() - d.getTime();
  if (diff < 86400000) return "Aujourd'hui";
  if (diff < 172800000) return 'Hier';
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });
}
