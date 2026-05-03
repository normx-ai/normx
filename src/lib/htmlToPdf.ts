/**
 * Helper generique : convertit un element DOM en PDF jsPDF via html2canvas.
 *
 * Cas d'usage : composants etats financiers qui rendent une page A4 et veulent
 * la capturer en PDF (via aperçu ou export direct).
 *
 * Centralise pour eviter la repetition du pattern dans ResultatFiscal,
 * CompteResultatSYCEBNL, BilanSYCEBNL, etc.
 */

import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

export interface HtmlToPdfOptions {
  orientation?: 'portrait' | 'landscape';
  format?: 'a4' | 'a3' | 'letter';
  scale?: number;
  backgroundColor?: string;
}

const DEFAULT_OPTIONS: Required<HtmlToPdfOptions> = {
  orientation: 'portrait',
  format: 'a4',
  scale: 2,
  backgroundColor: '#ffffff',
};

const PAGE_DIMENSIONS: Record<string, { portrait: [number, number]; landscape: [number, number] }> = {
  a4: { portrait: [210, 297], landscape: [297, 210] },
  a3: { portrait: [297, 420], landscape: [420, 297] },
  letter: { portrait: [216, 279], landscape: [279, 216] },
};

export async function htmlToPdf(
  pageEl: HTMLElement,
  options?: HtmlToPdfOptions,
): Promise<jsPDF> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const pdf = new jsPDF(opts.orientation === 'landscape' ? 'l' : 'p', 'mm', opts.format);
  const [pdfWidth] = PAGE_DIMENSIONS[opts.format][opts.orientation];

  const canvas = await html2canvas(pageEl, {
    scale: opts.scale,
    useCORS: true,
    backgroundColor: opts.backgroundColor,
  });
  const imgData = canvas.toDataURL('image/png');
  const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
  pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);

  return pdf;
}
