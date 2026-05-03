/**
 * Construction du PDF Balance generale (jsPDF + autoTable).
 *
 * Extrait de BalanceGenerale.tsx pour permettre :
 *   - tests unitaires sans React
 *   - reutilisation depuis d'autres pages (impression, export programmatique)
 *   - reduction de la taille du composant page
 */

import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { BalanceLigne } from '../types';

export interface BalanceTotaux {
  debit: number;
  credit: number;
  solde_debiteur: number;
  solde_crediteur: number;
}

export interface BalancePdfHeader {
  entiteName?: string;
  entiteSigle?: string;
  entiteAdresse?: string;
  entiteNif?: string;
  exerciceAnnee?: string | number;
}

/**
 * Format compact pour les montants du PDF (sans virgule decimale, separateur
 * espace fine). Retourne '' pour 0/NaN.
 */
function fmtPdf(val: string | number): string {
  const n = parseFloat(String(val));
  if (!n) return '';
  return n.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
}

export function buildBalancePdf(
  balance: BalanceLigne[],
  totaux: BalanceTotaux,
  header: BalancePdfHeader,
): jsPDF {
  const doc = new jsPDF('landscape', 'mm', 'a4');
  const pageW = doc.internal.pageSize.getWidth();
  const dash = '—';

  doc.setFontSize(14);
  doc.setFont(undefined as never, 'bold');
  doc.text('BALANCE GÉNÉRALE', pageW / 2, 14, { align: 'center' });

  doc.setFontSize(9);
  doc.setFont(undefined as never, 'normal');
  let y = 22;
  doc.text('Dénomination : ' + (header.entiteName || dash), 14, y);
  doc.text('Sigle : ' + (header.entiteSigle || dash), pageW / 2, y);
  y += 5;
  doc.text('Adresse : ' + (header.entiteAdresse || dash), 14, y);
  doc.text('NUI : ' + (header.entiteNif || dash), pageW / 2, y);
  y += 5;
  doc.text('Exercice : ' + (header.exerciceAnnee || dash), 14, y);
  y += 8;

  const head = [['Compte', 'Libellé', 'Mvt Débit', 'Mvt Crédit', 'Solde débiteur', 'Solde créditeur']];
  type Cell = string | { content: string; colSpan?: number; styles: { fontStyle: 'bold' | 'italic' | 'normal' } };
  const body: Cell[][] = balance.map((l) => [
    l.numero_compte,
    l.libelle_compte || '',
    fmtPdf(l.debit),
    fmtPdf(l.credit),
    fmtPdf(l.solde_debiteur),
    fmtPdf(l.solde_crediteur),
  ]);
  body.push([
    { content: 'TOTAUX', colSpan: 2, styles: { fontStyle: 'bold' } } as never,
    { content: fmtPdf(totaux.debit), styles: { fontStyle: 'bold' } } as never,
    { content: fmtPdf(totaux.credit), styles: { fontStyle: 'bold' } } as never,
    { content: fmtPdf(totaux.solde_debiteur), styles: { fontStyle: 'bold' } } as never,
    { content: fmtPdf(totaux.solde_crediteur), styles: { fontStyle: 'bold' } } as never,
  ]);

  autoTable(doc, {
    startY: y,
    head,
    body,
    styles: { fontSize: 9, cellPadding: 3 },
    headStyles: { fillColor: [8, 8, 13], textColor: 255, fontStyle: 'bold' },
    columnStyles: {
      0: { cellWidth: 30 },
      2: { halign: 'right' },
      3: { halign: 'right' },
      4: { halign: 'right' },
      5: { halign: 'right' },
    },
  });

  return doc;
}
