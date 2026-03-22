import jsPDF from 'jspdf';

export interface PdfEntiteInfo {
  entiteName: string;
  entiteSigle: string;
  entiteAdresse: string;
  entiteNif: string;
}

/** Dessine l'en-tête entité + titre du rapport, retourne la position Y après l'en-tête */
export function drawPdfHeader(pdf: jsPDF, entite: PdfEntiteInfo, titre: string, sousTitre: string): number {
  const w = pdf.internal.pageSize.getWidth();
  let y = 15;

  pdf.setFontSize(14);
  pdf.setFont('helvetica', 'bold');
  pdf.text(entite.entiteName || '', w / 2, y, { align: 'center' });
  y += 5;
  if (entite.entiteSigle) { pdf.setFontSize(10); pdf.setFont('helvetica', 'normal'); pdf.text(entite.entiteSigle, w / 2, y, { align: 'center' }); y += 4; }
  if (entite.entiteAdresse) { pdf.setFontSize(9); pdf.text(entite.entiteAdresse, w / 2, y, { align: 'center' }); y += 4; }
  if (entite.entiteNif) { pdf.setFontSize(9); pdf.text(`NIF : ${entite.entiteNif}`, w / 2, y, { align: 'center' }); y += 6; }

  pdf.setDrawColor(26, 58, 92);
  pdf.setLineWidth(0.5);
  pdf.line(15, y, w - 15, y);
  y += 7;
  pdf.setFontSize(13);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(0, 0, 0);
  pdf.text(titre, w / 2, y, { align: 'center' });
  y += 5;
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'normal');
  pdf.text(sousTitre, w / 2, y, { align: 'center' });
  y += 8;

  return y;
}

/** Dessine le pied de page Normx */
export function drawPdfFooter(pdf: jsPDF): void {
  const w = pdf.internal.pageSize.getWidth();
  pdf.setTextColor(150, 150, 150);
  pdf.setFontSize(7);
  pdf.setFont('helvetica', 'normal');
  pdf.text(`Normx — Imprimé le ${new Date().toLocaleDateString('fr-FR')}`, w / 2, 290, { align: 'center' });
}

/** Formate un nombre pour le PDF */
export function fmtPdf(v: number): string {
  if (!v && v !== 0) return '';
  if (v === 0) return '0';
  return Math.round(v).toLocaleString('fr-FR');
}
