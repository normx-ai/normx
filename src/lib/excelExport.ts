/**
 * Export Excel pour les etats financiers SYSCOHADA.
 *
 * Genere un fichier .xlsx avec mise en forme professionnelle
 * (gras, bordures, couleurs, format nombres) pret a l'impression.
 * Compatible avec tous les etats : Bilan, Compte de Resultat, TFT, notes annexes.
 */

import ExcelJS from 'exceljs';

export interface ExcelRow {
  ref?: string;
  libelle: string;
  values: (string | number)[];
  bold?: boolean;
  section?: boolean;
  subsection?: boolean;
  indent?: boolean;
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

const COLORS = {
  headerBg: '0F2A42',
  headerFont: 'FFFFFF',
  sectionBg: 'D4E6F1',
  subsectionBg: 'EBF5FB',
  totalBg: 'F5E6CC',
  subtotalBg: 'FDF2E9',
  border: 'B0B0B0',
  titleFont: '0F2A42',
};

function applyBorders(cell: ExcelJS.Cell): void {
  cell.border = {
    top: { style: 'thin', color: { argb: COLORS.border } },
    bottom: { style: 'thin', color: { argb: COLORS.border } },
    left: { style: 'thin', color: { argb: COLORS.border } },
    right: { style: 'thin', color: { argb: COLORS.border } },
  };
}

export async function exportToExcel({
  filename,
  sheetName,
  title,
  subtitle,
  headers,
  rows,
  entiteName,
  exerciceAnnee,
}: ExcelExportOptions): Promise<void> {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'NORMX Finance';
  const ws = wb.addWorksheet(sheetName, {
    pageSetup: {
      paperSize: 9,
      orientation: 'landscape',
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
      margins: { left: 0.4, right: 0.4, top: 0.6, bottom: 0.6, header: 0.3, footer: 0.3 },
    },
    headerFooter: {
      oddFooter: '&L&8NORMX Finance&C&8Page &P / &N&R&8&D',
    },
  });

  const totalCols = 2 + headers.length;
  let rowIdx = 1;

  // En-tete : nom entite
  if (entiteName) {
    const r = ws.addRow([entiteName]);
    ws.mergeCells(rowIdx, 1, rowIdx, totalCols);
    r.getCell(1).font = { bold: true, size: 13, color: { argb: COLORS.titleFont } };
    r.getCell(1).alignment = { horizontal: 'center' };
    rowIdx++;
  }

  // Titre
  const titleRow = ws.addRow([title]);
  ws.mergeCells(rowIdx, 1, rowIdx, totalCols);
  titleRow.getCell(1).font = { bold: true, size: 14, color: { argb: COLORS.titleFont } };
  titleRow.getCell(1).alignment = { horizontal: 'center' };
  rowIdx++;

  // Sous-titre
  if (subtitle) {
    const r = ws.addRow([subtitle]);
    ws.mergeCells(rowIdx, 1, rowIdx, totalCols);
    r.getCell(1).font = { italic: true, size: 11, color: { argb: '666666' } };
    r.getCell(1).alignment = { horizontal: 'center' };
    rowIdx++;
  }

  // Exercice
  if (exerciceAnnee) {
    const r = ws.addRow([`Exercice clos le 31/12/${exerciceAnnee}`]);
    ws.mergeCells(rowIdx, 1, rowIdx, totalCols);
    r.getCell(1).font = { italic: true, size: 10, color: { argb: '888888' } };
    r.getCell(1).alignment = { horizontal: 'center' };
    rowIdx++;
  }

  // Ligne vide
  ws.addRow([]);
  rowIdx++;

  // Headers du tableau
  const headerValues = ['REF', 'LIBELLÉ', ...headers.map(h => h.toUpperCase())];
  const headerRow = ws.addRow(headerValues);
  headerRow.height = 22;
  for (let c = 1; c <= totalCols; c++) {
    const cell = headerRow.getCell(c);
    cell.font = { bold: true, size: 10, color: { argb: COLORS.headerFont } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.headerBg } };
    cell.alignment = { horizontal: c <= 2 ? 'center' : 'right', vertical: 'middle', wrapText: true };
    applyBorders(cell);
  }
  rowIdx++;

  // Donnees
  for (const row of rows) {
    const paddedValues = row.values.length < headers.length
      ? [...row.values, ...Array(headers.length - row.values.length).fill('')]
      : row.values;
    const vals: (string | number)[] = [row.ref || '', row.libelle, ...paddedValues];
    const r = ws.addRow(vals);
    rowIdx++;

    const isSection = row.section === true;
    const isSubsection = row.subsection === true;
    const isBold = row.bold === true;

    // Section = ligne de titre de section (fond bleu)
    if (isSection) {
      ws.mergeCells(rowIdx - 1, 1, rowIdx - 1, totalCols);
      const cell = r.getCell(1);
      cell.font = { bold: true, size: 10, color: { argb: COLORS.titleFont } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.sectionBg } };
      cell.alignment = { horizontal: 'left', vertical: 'middle' };
      for (let c = 1; c <= totalCols; c++) applyBorders(r.getCell(c));
      continue;
    }

    // Sous-section (fond bleu clair)
    if (isSubsection) {
      for (let c = 1; c <= totalCols; c++) {
        const cell = r.getCell(c);
        cell.font = { bold: true, size: 10 };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.subsectionBg } };
        applyBorders(cell);
      }
    }

    // Totaux / sous-totaux (fond dore)
    if (isBold && !isSubsection) {
      const bgColor = row.libelle.startsWith('TOTAL') ? COLORS.totalBg : COLORS.subtotalBg;
      for (let c = 1; c <= totalCols; c++) {
        const cell = r.getCell(c);
        cell.font = { bold: true, size: 10 };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bgColor } };
        applyBorders(cell);
      }
    }

    // Style des cellules
    for (let c = 1; c <= totalCols; c++) {
      const cell = r.getCell(c);
      if (!cell.font) cell.font = { size: 10 };
      applyBorders(cell);

      if (c === 1) {
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
      } else if (c === 2) {
        cell.alignment = { horizontal: 'left', vertical: 'middle' };
        if (row.indent) cell.alignment = { ...cell.alignment, indent: 2 };
      } else {
        cell.alignment = { horizontal: 'right', vertical: 'middle' };
        const val = vals[c - 1];
        if (typeof val === 'number') {
          cell.numFmt = '#,##0;(#,##0);"-"';
        }
      }
    }
  }

  // Largeurs colonnes
  ws.getColumn(1).width = 7;
  ws.getColumn(2).width = 55;
  for (let c = 3; c <= totalCols; c++) {
    ws.getColumn(c).width = 20;
  }

  // Print settings
  ws.getRow(rowIdx - rows.length).eachCell(() => {});
  if (rowIdx > 7) {
    ws.pageSetup.printTitlesRow = `${rowIdx - rows.length - 1}:${rowIdx - rows.length - 1}`;
  }

  // Generer et telecharger
  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename.endsWith('.xlsx') ? filename : filename + '.xlsx';
  a.click();
  URL.revokeObjectURL(url);
}
