// Generation PDF du TER, avec gestion multi-pages automatique.

import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

export async function buildTERPdf(target: HTMLElement): Promise<jsPDF> {
  const canvas = await html2canvas(target, { scale: 2, useCORS: true, backgroundColor: '#fff' });
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageW = pdf.internal.pageSize.getWidth();
  const pageH = pdf.internal.pageSize.getHeight();
  const margin = 10;
  const imgW = pageW - margin * 2;
  const imgH = (canvas.height * imgW) / canvas.width;

  if (imgH <= pageH - margin * 2) {
    pdf.addImage(canvas.toDataURL('image/png'), 'PNG', margin, margin, imgW, imgH);
    return pdf;
  }

  const pageContentH = pageH - margin * 2;
  let srcY = 0;
  while (srcY < canvas.height) {
    const sliceH = Math.min((pageContentH / imgW) * canvas.width, canvas.height - srcY);
    const sliceCanvas = document.createElement('canvas');
    sliceCanvas.width = canvas.width;
    sliceCanvas.height = sliceH;
    const ctx = sliceCanvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(canvas, 0, srcY, canvas.width, sliceH, 0, 0, canvas.width, sliceH);
    }
    const sliceData = sliceCanvas.toDataURL('image/png');
    const sliceImgH = (sliceH * imgW) / canvas.width;
    if (srcY > 0) pdf.addPage();
    pdf.addImage(sliceData, 'PNG', margin, margin, imgW, sliceImgH);
    srcY += sliceH;
  }
  return pdf;
}
