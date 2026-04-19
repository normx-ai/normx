/**
 * Export Excel pour les etats financiers SYSCOHADA.
 *
 * Genere un fichier .xlsx a partir d'un tableau de lignes structurees
 * (ref, libelle, montants). Compatible avec tous les etats : Bilan,
 * Compte de Resultat, TFT, notes annexes.
 */

import * as XLSX from 'xlsx';

export interface ExcelRow {
  ref?: string;
  libelle: string;
  values: (string | number)[];
  bold?: boolean;
}

export interface ExcelExportOptions {
  filename: string;
  sheetName: string;
  title: string;
  subtitle?: string;
  headers: string[];
  rows: ExcelRow[];
  entiteName?: string;
  exerciceAnnee?: number;
}

export function exportToExcel({
  filename,
  sheetName,
  title,
  subtitle,
  headers,
  rows,
  entiteName,
  exerciceAnnee,
}: ExcelExportOptions): void {
  const data: (string | number)[][] = [];

  if (entiteName) data.push([entiteName]);
  data.push([title]);
  if (subtitle) data.push([subtitle]);
  if (exerciceAnnee) data.push(['Exercice ' + exerciceAnnee]);
  data.push([]);

  data.push(['REF', 'Libellé', ...headers]);

  for (const row of rows) {
    data.push([row.ref || '', row.libelle, ...row.values]);
  }

  const ws = XLSX.utils.aoa_to_sheet(data);

  const colWidths = [
    { wch: 6 },
    { wch: 50 },
    ...headers.map(() => ({ wch: 18 })),
  ];
  ws['!cols'] = colWidths;

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  XLSX.writeFile(wb, filename.endsWith('.xlsx') ? filename : filename + '.xlsx');
}
