/**
 * Construction du PDF Repartition des Charges (camembert + tableau).
 * Extrait de RepartitionCharges.tsx (~145 lignes).
 */

import { jsPDF } from 'jspdf';
import { POSTE_LABELS, fmt } from './types';

export interface PosteCompte {
  compte: string;
  libelle: string;
  montant: number;
}

export interface PosteData {
  total: number;
  comptes: PosteCompte[];
}

export interface RepartitionPdfHeader {
  entiteName: string;
  entiteSigle?: string;
  entiteAdresse?: string;
  entiteNif?: string;
  exerciceAnnee: string | number;
}

const PIE_COLORS: [number, number, number][] = [
  [212, 168, 67], [26, 58, 92], [5, 150, 105], [220, 38, 38],
  [124, 58, 237], [217, 119, 6], [8, 145, 178], [190, 24, 93],
  [79, 70, 229], [101, 163, 13],
];

export function buildRepartitionChargesPdf(
  posteList: [string, PosteData][],
  grandTotal: number,
  header: RepartitionPdfHeader,
): jsPDF {
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const w = pdf.internal.pageSize.getWidth();
  let y = 15;

  // En-tete entite
  pdf.setFontSize(14);
  pdf.setFont('helvetica', 'bold');
  pdf.text(header.entiteName || '', w / 2, y, { align: 'center' });
  y += 5;
  if (header.entiteSigle) { pdf.setFontSize(10); pdf.setFont('helvetica', 'normal'); pdf.text(header.entiteSigle, w / 2, y, { align: 'center' }); y += 4; }
  if (header.entiteAdresse) { pdf.setFontSize(9); pdf.text(header.entiteAdresse, w / 2, y, { align: 'center' }); y += 4; }
  if (header.entiteNif) { pdf.setFontSize(9); pdf.text(`NIF : ${header.entiteNif}`, w / 2, y, { align: 'center' }); y += 6; }

  // Titre
  pdf.setDrawColor(26, 58, 92);
  pdf.setLineWidth(0.5);
  pdf.line(15, y, w - 15, y);
  y += 7;
  pdf.setFontSize(13);
  pdf.setFont('helvetica', 'bold');
  pdf.text('RÉPARTITION DES CHARGES', w / 2, y, { align: 'center' });
  y += 5;
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'normal');
  pdf.text(`Classe 6 — Exercice ${header.exerciceAnnee}`, w / 2, y, { align: 'center' });
  y += 10;

  // Graphique cercle (triangle fan)
  const pieR = 28;
  const pieCx = w / 2 - 40;
  const pieCy = y + pieR + 2;
  let cumAngle = -Math.PI / 2;

  posteList.forEach(([, p], i) => {
    const pct = grandTotal > 0 ? p.total / grandTotal : 0;
    if (pct <= 0) return;
    const angle = pct * 2 * Math.PI;
    const startAngle = cumAngle;
    cumAngle += angle;

    const steps = Math.max(Math.ceil(angle / 0.05), 2);
    const color = PIE_COLORS[i % PIE_COLORS.length];
    pdf.setFillColor(color[0], color[1], color[2]);

    const points: number[][] = [[pieCx, pieCy]];
    for (let s = 0; s <= steps; s++) {
      const a = startAngle + (angle * s) / steps;
      points.push([pieCx + pieR * Math.cos(a), pieCy + pieR * Math.sin(a)]);
    }
    points.push([pieCx, pieCy]);
    for (let s = 1; s < points.length - 1; s++) {
      pdf.triangle(
        points[0][0], points[0][1],
        points[s][0], points[s][1],
        points[s + 1][0], points[s + 1][1],
        'F',
      );
    }
  });

  // Legende
  let ly = y + 4;
  const lx = w / 2 + 5;
  pdf.setFontSize(7);
  posteList.forEach(([poste, p], i) => {
    const pct = grandTotal > 0 ? p.total / grandTotal : 0;
    if (pct <= 0) return;
    const color = PIE_COLORS[i % PIE_COLORS.length];
    pdf.setFillColor(color[0], color[1], color[2]);
    pdf.rect(lx, ly - 2, 3, 3, 'F');
    pdf.setTextColor(0, 0, 0);
    pdf.setFont('helvetica', 'normal');
    pdf.text(`${POSTE_LABELS[poste] || poste} — ${(pct * 100).toFixed(1)}%`, lx + 5, ly);
    ly += 5;
  });

  y = Math.max(pieCy + pieR + 8, ly + 4);

  // En-tete tableau
  pdf.setFillColor(26, 58, 92);
  pdf.rect(15, y, w - 30, 7, 'F');
  pdf.setTextColor(255, 255, 255);
  pdf.setFontSize(9);
  pdf.setFont('helvetica', 'bold');
  pdf.text('Compte', 17, y + 5);
  pdf.text('Libellé', 35, y + 5);
  pdf.text('Montant', w - 42, y + 5, { align: 'right' });
  pdf.text('%', w - 17, y + 5, { align: 'right' });
  y += 9;

  pdf.setTextColor(0, 0, 0);
  pdf.setFontSize(8);

  posteList.forEach(([poste, p]) => {
    if (y > 270) { pdf.addPage(); y = 15; }
    pdf.setFillColor(232, 237, 245);
    pdf.rect(15, y - 3, w - 30, 6, 'F');
    pdf.setFont('helvetica', 'bold');
    pdf.text(poste, 17, y);
    pdf.text(POSTE_LABELS[poste] || 'Poste ' + poste, 35, y);
    pdf.text(fmt(p.total), w - 42, y, { align: 'right' });
    pdf.text(grandTotal ? (p.total / grandTotal * 100).toFixed(1) + '%' : '-', w - 17, y, { align: 'right' });
    y += 6;

    pdf.setFont('helvetica', 'normal');
    p.comptes.forEach((c) => {
      if (y > 275) { pdf.addPage(); y = 15; }
      pdf.text(c.compte, 22, y);
      pdf.text((c.libelle || c.compte).substring(0, 50), 35, y);
      pdf.text(fmt(c.montant), w - 42, y, { align: 'right' });
      pdf.text(grandTotal ? (c.montant / grandTotal * 100).toFixed(1) + '%' : '-', w - 17, y, { align: 'right' });
      y += 5;
    });
    y += 1;
  });

  // Total
  if (y > 270) { pdf.addPage(); y = 15; }
  pdf.setFillColor(26, 58, 92);
  pdf.rect(15, y - 3, w - 30, 7, 'F');
  pdf.setTextColor(255, 255, 255);
  pdf.setFont('helvetica', 'bold');
  pdf.text('TOTAL CHARGES', 17, y + 1);
  pdf.text(fmt(grandTotal), w - 42, y + 1, { align: 'right' });
  pdf.text('100%', w - 17, y + 1, { align: 'right' });

  // Pied de page
  pdf.setTextColor(150, 150, 150);
  pdf.setFontSize(7);
  pdf.setFont('helvetica', 'normal');
  pdf.text(`NORMX Finance — Imprimé le ${new Date().toLocaleDateString('fr-FR')}`, w / 2, 290, { align: 'center' });

  return pdf;
}
