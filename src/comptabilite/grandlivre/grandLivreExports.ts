// Exports Grand Livre : CSV / Excel / PDF multi-pages.

import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { CompteData, TableRow, fmtPdf } from './grandLivreData';

export function exportGrandLivreCSV(tableRows: TableRow[]): void {
  const header = 'Compte;Date;Numéro;Journal;Tiers;Libellé;Date du document;Référence;Lettrage;Solde antérieur;Débit;Crédit;Solde\n';
  const rows = tableRows.map(r =>
    [r.compte, r.date, r.numero, r.journal, '"' + r.tiers + '"', '"' + r.libelle + '"', r.dateDocument, r.reference, r.lettrage, r.soldeAnterieur, r.debit, r.credit, r.solde].join(';')
  ).join('\n');
  const blob = new Blob(['\ufeff' + header + rows], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'grand_livre.csv';
  a.click();
  URL.revokeObjectURL(url);
}

export function exportGrandLivreExcel(comptes: Record<string, CompteData>): void {
  const data: Record<string, string | number>[] = [];
  for (const [num, cdata] of Object.entries(comptes)) {
    let soldeCumul = 0;
    for (const m of cdata.mouvements) {
      const d = parseFloat(String(m.debit)) || 0;
      const c = parseFloat(String(m.credit)) || 0;
      soldeCumul += d - c;
      data.push({
        'Compte': num,
        'Date': m.date_ecriture,
        'Numéro': m.numero_piece || '',
        'Journal': m.journal,
        'Tiers': m.tiers_nom || '',
        'Libellé': m.libelle_ecriture || '',
        'Date du document': m.date_document || '',
        'Référence': m.reference || '',
        'Lettrage': m.lettrage || '',
        'Solde antérieur': m.solde_anterieur || '',
        'Débit': d || '',
        'Crédit': c || '',
        'Solde': soldeCumul,
      });
    }
    data.push({
      'Compte': '', 'Date': '', 'Numéro': '', 'Journal': '', 'Tiers': '',
      'Libellé': 'TOTAL ' + num,
      'Date du document': '', 'Référence': '', 'Lettrage': '', 'Solde antérieur': '',
      'Débit': cdata.totalDebit,
      'Crédit': cdata.totalCredit,
      'Solde': cdata.totalDebit - cdata.totalCredit,
    });
  }
  const ws = XLSX.utils.json_to_sheet(data);
  ws['!cols'] = [{ wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 8 }, { wch: 20 }, { wch: 35 }, { wch: 14 }, { wch: 14 }, { wch: 10 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 15 }];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Grand Livre');
  XLSX.writeFile(wb, 'grand_livre.xlsx');
}

interface BuildPdfOptions {
  comptes: Record<string, CompteData>;
  totalGeneralDebit: number;
  totalGeneralCredit: number;
  entiteName?: string;
  entiteSigle?: string;
  entiteAdresse?: string;
  entiteNif?: string;
  exerciceAnnee: number;
}

export function buildGrandLivrePDF(opts: BuildPdfOptions): jsPDF {
  const { comptes, totalGeneralDebit, totalGeneralCredit, entiteName, entiteSigle, entiteAdresse, entiteNif, exerciceAnnee } = opts;
  const doc = new jsPDF('landscape', 'mm', 'a4');
  const pageW = doc.internal.pageSize.getWidth();

  doc.setFontSize(14);
  doc.setFont(undefined as never, 'bold');
  doc.text('GRAND LIVRE', pageW / 2, 14, { align: 'center' });

  doc.setFontSize(9);
  doc.setFont(undefined as never, 'normal');
  let y = 22;
  doc.text('Dénomination : ' + (entiteName || '\u2014'), 14, y);
  doc.text('Sigle : ' + (entiteSigle || '\u2014'), pageW / 2, y);
  y += 5;
  doc.text('Adresse : ' + (entiteAdresse || '\u2014'), 14, y);
  doc.text('NUI : ' + (entiteNif || '\u2014'), pageW / 2, y);
  y += 5;
  doc.text('Exercice : ' + (exerciceAnnee || '\u2014'), 14, y);
  y += 8;

  for (const [num, cdata] of Object.entries(comptes)) {
    if (y > doc.internal.pageSize.getHeight() - 30) {
      doc.addPage();
      y = 14;
    }

    doc.setFontSize(10);
    doc.setFont(undefined as never, 'bold');
    const solde = cdata.totalDebit - cdata.totalCredit;
    doc.text(num + ' - ' + cdata.libelle + '    Solde : ' + fmtPdf(Math.abs(solde)) + (solde >= 0 ? ' D' : ' C'), 14, y);
    y += 2;

    let soldeCumul = 0;
    const body = cdata.mouvements.map(m => {
      const d = parseFloat(String(m.debit)) || 0;
      const c = parseFloat(String(m.credit)) || 0;
      soldeCumul += d - c;
      return [
        new Date(m.date_ecriture).toLocaleDateString('fr-FR'),
        m.journal,
        m.libelle_ecriture || '',
        m.numero_piece || '',
        fmtPdf(m.debit),
        fmtPdf(m.credit),
        fmtPdf(Math.abs(soldeCumul)) + (soldeCumul >= 0 ? ' D' : ' C'),
      ];
    });
    body.push([
      { content: 'TOTAUX', colSpan: 4, styles: { fontStyle: 'bold', halign: 'right' } } as never,
      { content: fmtPdf(cdata.totalDebit), styles: { fontStyle: 'bold' } } as never,
      { content: fmtPdf(cdata.totalCredit), styles: { fontStyle: 'bold' } } as never,
      { content: fmtPdf(Math.abs(solde)) + (solde >= 0 ? ' D' : ' C'), styles: { fontStyle: 'bold' } } as never,
    ]);

    autoTable(doc, {
      startY: y,
      head: [['Date', 'Journal', 'Libellé', 'N° Pièce', 'Débit', 'Crédit', 'Solde']],
      body,
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [26, 58, 92], textColor: 255, fontStyle: 'bold', fontSize: 8 },
      columnStyles: {
        0: { cellWidth: 22 },
        1: { cellWidth: 18 },
        3: { cellWidth: 22 },
        4: { halign: 'right', cellWidth: 28 },
        5: { halign: 'right', cellWidth: 28 },
        6: { halign: 'right', cellWidth: 28 },
      },
      margin: { left: 14, right: 14 },
    });

    y = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8;
  }

  if (y > doc.internal.pageSize.getHeight() - 20) {
    doc.addPage();
    y = 14;
  }
  doc.setFontSize(10);
  doc.setFont(undefined as never, 'bold');
  doc.text('Total général \u2014 Débit : ' + fmtPdf(totalGeneralDebit) + '   Crédit : ' + fmtPdf(totalGeneralCredit), 14, y);

  return doc;
}
