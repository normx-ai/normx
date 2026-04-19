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
  entiteNif?: string;
  dureeMois?: number;
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
  entiteNif,
  dureeMois,
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
  const labelFont: Partial<ExcelJS.Font> = { size: 10, color: { argb: '555555' } };
  const valueFont: Partial<ExcelJS.Font> = { bold: true, size: 10, color: { argb: COLORS.titleFont } };

  // En-tete officiel : Designation + Exercice sur une ligne
  const r1 = ws.addRow(['', 'Désignation entité :', entiteName || '', '', exerciceAnnee ? `Exercice clos le : 31/12/${exerciceAnnee}` : '']);
  r1.getCell(2).font = labelFont;
  r1.getCell(3).font = valueFont;
  r1.getCell(5).font = valueFont;
  r1.getCell(5).alignment = { horizontal: 'right' };
  rowIdx++;

  // NIF + Duree
  const r2 = ws.addRow(['', 'N° d\'identification :', entiteNif || '', '', `Durée (mois) : ${dureeMois || 12}`]);
  r2.getCell(2).font = labelFont;
  r2.getCell(3).font = valueFont;
  r2.getCell(5).font = { ...labelFont, italic: true };
  r2.getCell(5).alignment = { horizontal: 'right' };
  rowIdx++;

  // Ligne vide
  ws.addRow([]);
  rowIdx++;

  // Titre centre
  const titleRow = ws.addRow([title]);
  ws.mergeCells(rowIdx, 1, rowIdx, totalCols);
  titleRow.getCell(1).font = { bold: true, size: 13, color: { argb: COLORS.titleFont } };
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

export function buildExcelPreviewHtml(options: ExcelExportOptions): string {
  const { title, subtitle, headers, rows, entiteName, exerciceAnnee, entiteNif, dureeMois } = options;

  const fmtVal = (v: string | number): string => {
    if (typeof v === 'number') {
      if (v === 0) return '-';
      const neg = v < 0;
      const abs = Math.abs(Math.round(v)).toLocaleString('fr-FR');
      return neg ? `(${abs})` : abs;
    }
    return String(v);
  };

  const headerCols = headers.map(h => `<th style="background:#0F2A42;color:#fff;padding:6px 12px;text-align:right;font-size:11px;border:1px solid #B0B0B0;white-space:nowrap">${h}</th>`).join('');

  const bodyRows = rows.map(row => {
    if (row.section) {
      return `<tr><td colspan="${2 + headers.length}" style="background:#D4E6F1;font-weight:700;padding:6px 8px;font-size:11px;border:1px solid #B0B0B0">${row.libelle}</td></tr>`;
    }
    if (row.subsection && row.values.length === 0) {
      return `<tr><td colspan="${2 + headers.length}" style="background:#EBF5FB;font-weight:700;padding:5px 8px;font-size:11px;border:1px solid #B0B0B0">${row.libelle}</td></tr>`;
    }

    const isBold = row.bold || row.subsection;
    const bg = row.bold && row.libelle.startsWith('TOTAL') ? '#F5E6CC'
      : row.bold ? '#FDF2E9'
      : row.subsection ? '#EBF5FB'
      : '#fff';
    const fw = isBold ? '700' : '400';
    const indent = row.indent ? 'padding-left:24px' : '';

    const valueCells = row.values.length > 0
      ? row.values.map(v => `<td style="text-align:right;padding:4px 10px;font-weight:${fw};border:1px solid #B0B0B0;font-size:11px;white-space:nowrap">${fmtVal(v)}</td>`).join('')
      : `<td colspan="${headers.length}" style="border:1px solid #B0B0B0"></td>`;

    return `<tr style="background:${bg}">
      <td style="text-align:center;padding:4px 6px;font-weight:${fw};border:1px solid #B0B0B0;font-size:11px;width:40px">${row.ref || ''}</td>
      <td style="${indent};padding:4px 8px;font-weight:${fw};border:1px solid #B0B0B0;font-size:11px">${row.libelle}</td>
      ${valueCells}
    </tr>`;
  }).join('\n');

  return `
    <div style="font-family:'Segoe UI',Arial,sans-serif;max-width:1100px;margin:0 auto;padding:20px">
      <div style="display:flex;justify-content:space-between;margin-bottom:2px;font-size:12px">
        <div><span style="color:#555">Désignation entité :</span> <b style="color:#0F2A42">${entiteName || ''}</b></div>
        <div><b style="color:#0F2A42">Exercice clos le : 31/12/${exerciceAnnee || ''}</b></div>
      </div>
      <div style="display:flex;justify-content:space-between;margin-bottom:12px;font-size:12px">
        <div><span style="color:#555">N° d'identification :</span> <b style="color:#0F2A42">${entiteNif || ''}</b></div>
        <div><span style="color:#555;font-style:italic">Durée (mois) : ${dureeMois || 12}</span></div>
      </div>
      <div style="text-align:center;font-size:15px;font-weight:700;color:#0F2A42;margin-bottom:4px">${title}</div>
      ${subtitle ? `<div style="text-align:center;font-size:12px;color:#666;font-style:italic;margin-bottom:4px">${subtitle}</div>` : ''}
      <table style="width:100%;border-collapse:collapse;font-size:11px">
        <thead>
          <tr>
            <th style="background:#0F2A42;color:#fff;padding:6px 8px;text-align:center;font-size:11px;border:1px solid #B0B0B0;width:40px">REF</th>
            <th style="background:#0F2A42;color:#fff;padding:6px 8px;text-align:left;font-size:11px;border:1px solid #B0B0B0">LIBELLÉ</th>
            ${headerCols}
          </tr>
        </thead>
        <tbody>
          ${bodyRows}
        </tbody>
      </table>
    </div>`;
}
