/**
 * Hook reutilisable pour la generation et l'apercu PDF
 * Remplace les ~50 lignes dupliquees dans 47+ fichiers Note*.tsx
 */

import { useState, useCallback, RefObject } from 'react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

interface UsePDFPreviewOptions {
  pageRef: RefObject<HTMLDivElement | null>;
  fileName: string;
  editing: boolean;
  setEditing: (v: boolean) => void;
  orientation?: 'p' | 'l';
}

interface UsePDFPreviewReturn {
  previewUrl: string | null;
  pdfBlob: Blob | null;
  openPreview: () => Promise<void>;
  closePreview: () => void;
  downloadPDF: () => void;
  printPDF: () => void;
}

export function usePDFPreview({ pageRef, fileName, editing, setEditing, orientation = 'p' }: UsePDFPreviewOptions): UsePDFPreviewReturn {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [pdfBlob, setPdfBlob] = useState<Blob | null>(null);

  const isLandscape = orientation === 'l';
  const pdfWidth = isLandscape ? 297 : 210;
  const pdfMaxHeight = isLandscape ? 210 : 297;

  const generatePDF = useCallback(async (): Promise<jsPDF> => {
    const wasEditing = editing;
    if (wasEditing) setEditing(false);
    await new Promise(r => setTimeout(r, 100));
    const pdf = new jsPDF(orientation, 'mm', 'a4');
    if (!pageRef.current) return pdf;
    const canvas = await html2canvas(pageRef.current, { scale: 2, useCORS: true, backgroundColor: '#ffffff' });
    const imgData = canvas.toDataURL('image/png');
    const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
    pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, Math.min(pdfHeight, pdfMaxHeight));
    if (wasEditing) setEditing(true);
    return pdf;
  }, [pageRef, editing, setEditing, orientation, pdfWidth, pdfMaxHeight]);

  const openPreview = useCallback(async () => {
    const pdf = await generatePDF();
    const blob = pdf.output('blob');
    setPdfBlob(blob);
    setPreviewUrl(URL.createObjectURL(blob));
  }, [generatePDF]);

  const closePreview = useCallback(() => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setPdfBlob(null);
  }, [previewUrl]);

  const downloadPDF = useCallback(() => {
    if (!pdfBlob) return;
    const url = URL.createObjectURL(pdfBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(url);
  }, [pdfBlob, fileName]);

  const printPDF = useCallback(() => {
    if (!previewUrl) return;
    const w = window.open(previewUrl);
    if (w) { w.onload = () => w.print(); }
  }, [previewUrl]);

  return { previewUrl, pdfBlob, openPreview, closePreview, downloadPDF, printPDF };
}
