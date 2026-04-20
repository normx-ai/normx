// Exports CSV / Excel / PDF de la liste des tiers.

import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { TiersItem, getTypeConfig } from './tiersTypes';

export function exportTiersCSV(tiersAffiches: TiersItem[]): void {
  const header = 'Type;Code;Nom;Compte;Telephone;Email;Adresse\n';
  const rows = tiersAffiches.map(t =>
    [t.type, t.code_tiers || '', '"' + t.nom + '"', t.compte_comptable || '', t.telephone || '', t.email || '', '"' + (t.adresse || '') + '"'].join(';')
  ).join('\n');
  const blob = new Blob([header + rows], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'tiers.csv';
  a.click();
  URL.revokeObjectURL(url);
}

export function exportTiersExcel(tiersAffiches: TiersItem[]): void {
  const data = tiersAffiches.map(t => ({
    'Type': getTypeConfig(t.type).label,
    'Code': t.code_tiers || '',
    'Nom': t.nom,
    'Compte': t.compte_comptable || '',
    'Telephone': t.telephone || '',
    'Email': t.email || '',
    'Adresse': t.adresse || '',
  }));
  const ws = XLSX.utils.json_to_sheet(data);
  ws['!cols'] = [{ wch: 20 }, { wch: 12 }, { wch: 35 }, { wch: 12 }, { wch: 18 }, { wch: 25 }, { wch: 35 }];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Tiers');
  XLSX.writeFile(wb, 'tiers.xlsx');
}

export function exportTiersPDF(tiersAffiches: TiersItem[], entiteName: string): void {
  const doc = new jsPDF('landscape', 'mm', 'a4');
  const pageW = doc.internal.pageSize.getWidth();
  doc.setFontSize(14);
  doc.setFont(undefined as never, 'bold');
  doc.text('LISTE DES TIERS', pageW / 2, 14, { align: 'center' });
  doc.setFontSize(9);
  doc.setFont(undefined as never, 'normal');
  doc.text('Entite : ' + (entiteName || '—'), 14, 22);
  doc.text(tiersAffiches.length + ' tiers', 14, 27);

  autoTable(doc, {
    startY: 32,
    head: [['Type', 'Code', 'Nom', 'Compte', 'Telephone', 'Email', 'Adresse']],
    body: tiersAffiches.map(t => [
      getTypeConfig(t.type).label,
      t.code_tiers || '',
      t.nom,
      t.compte_comptable || '',
      t.telephone || '',
      t.email || '',
      t.adresse || '',
    ]),
    styles: { fontSize: 9, cellPadding: 3 },
    headStyles: { fillColor: [26, 58, 92], textColor: 255, fontStyle: 'bold' },
  });
  doc.save('tiers.pdf');
}
