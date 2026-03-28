/**
 * Exports PDF et Excel — Paie Congo-Brazzaville
 * Conforme CGI 2026 — ITS uniquement (Art. 116)
 */

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

import type { BulletinResume, DeclarationCNSS } from './declarations';
import type { LivrePaieMensuel } from './livrePaie';

// ---------------------------------------------------------------------------
// Constantes
// ---------------------------------------------------------------------------

const MOIS_LABELS: string[] = [
  'Janvier', 'Fevrier', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Aout', 'Septembre', 'Octobre', 'Novembre', 'Decembre',
];

const HEADER_FILL: [number, number, number] = [26, 58, 92];
const TOTAUX_FILL: [number, number, number] = [254, 249, 238];

function labelMois(mois: number): string {
  return MOIS_LABELS[mois - 1] ?? '';
}

function fmt(n: number): string {
  return Math.round(n).toLocaleString('fr-FR');
}

// ---------------------------------------------------------------------------
// PDF — Bulletin de paie
// ---------------------------------------------------------------------------

export function exporterBulletinPDF(
  bulletin: BulletinResume,
  employeur: string,
  mois: number,
  annee: number,
): void {
  const doc = new jsPDF();

  // Header
  doc.setFontSize(14);
  doc.text(employeur, 14, 20);
  doc.setFontSize(10);
  doc.text(`Bulletin de paie — ${labelMois(mois)} ${annee}`, 14, 28);

  // Employee info
  doc.setFontSize(10);
  doc.text(`Nom : ${bulletin.nom}`, 14, 38);
  doc.text(`Prenom : ${bulletin.prenom}`, 14, 44);

  // Table
  const totalRetenues =
    bulletin.cnss_salariale +
    bulletin.its +
    bulletin.camu_salariale +
    bulletin.taxe_locaux +
    bulletin.tus_impot +
    bulletin.tus_cnss;

  const rows: string[][] = [
    ['Salaire de base', fmt(bulletin.salaire_base), '', ''],
    ['Salaire brut', fmt(bulletin.brut), '', ''],
    ['CNSS salariale', fmt(bulletin.brut), '3,50 %', fmt(bulletin.cnss_salariale)],
    ['ITS', fmt(bulletin.brut), '', fmt(bulletin.its)],
    ['CAMU', fmt(bulletin.brut), '1,00 %', fmt(bulletin.camu_salariale)],
    ['TOL', '', '', fmt(bulletin.taxe_locaux)],
    ['TUS (impot)', '', '', fmt(bulletin.tus_impot)],
    ['TUS (CNSS)', '', '', fmt(bulletin.tus_cnss)],
    ['Total retenues', '', '', fmt(totalRetenues)],
  ];

  autoTable(doc, {
    startY: 50,
    head: [['Libelle', 'Base', 'Taux', 'Retenue salariale']],
    body: rows,
    headStyles: { fillColor: HEADER_FILL, textColor: [255, 255, 255], fontSize: 8 },
    bodyStyles: { fontSize: 10 },
    theme: 'grid',
  });

  // Net a payer
  const finalY = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10;
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text(`Net a payer : ${fmt(bulletin.net_a_payer)} FCFA`, 14, finalY);

  doc.save(`bulletin_${bulletin.nom}_${bulletin.prenom}_${labelMois(mois)}_${annee}.pdf`);
}

// ---------------------------------------------------------------------------
// PDF — Bordereau CNSS
// ---------------------------------------------------------------------------

export function exporterBordereauCNSSPDF(declaration: DeclarationCNSS): void {
  const doc = new jsPDF('landscape');
  const titre = `Bordereau CNSS - ${labelMois(declaration.mois)} ${declaration.annee}`;

  doc.setFontSize(14);
  doc.text(titre, 14, 20);
  doc.setFontSize(10);
  doc.text(`Employeur : ${declaration.employeur}`, 14, 28);
  doc.text(`N° CNSS : ${declaration.numero_cnss}`, 14, 34);

  const rows: string[][] = declaration.lignes.map((l) => [
    l.nom,
    l.prenom,
    l.numero_ss,
    fmt(l.brut),
    fmt(l.plafond1),
    fmt(l.plafond2),
    fmt(l.cnss_salariale),
    fmt(l.cnss_patronale_pvid),
    fmt(l.cnss_patronale_af),
    fmt(l.cnss_patronale_at),
  ]);

  const patronaleTotal =
    declaration.totaux.cnss_patronale_total;

  const totauxRow: string[] = [
    'TOTAUX', '', '',
    fmt(declaration.totaux.brut_total),
    '', '',
    fmt(declaration.totaux.cnss_salariale_total),
    fmt(patronaleTotal),
    '', '',
  ];

  autoTable(doc, {
    startY: 40,
    head: [[
      'Nom', 'Prenom', 'N° SS', 'Brut',
      'Plafond PVID', 'Plafond AF/AT',
      'CNSS Sal.', 'CNSS Pat. PVID', 'CNSS Pat. AF', 'CNSS Pat. AT',
    ]],
    body: [...rows, totauxRow],
    headStyles: { fillColor: HEADER_FILL, textColor: [255, 255, 255], fontSize: 8 },
    bodyStyles: { fontSize: 10 },
    theme: 'grid',
    didParseCell(data) {
      if (data.row.index === rows.length && data.section === 'body') {
        data.cell.styles.fillColor = TOTAUX_FILL;
        data.cell.styles.fontStyle = 'bold';
      }
    },
  });

  doc.save(`bordereau_cnss_${labelMois(declaration.mois)}_${declaration.annee}.pdf`);
}

// ---------------------------------------------------------------------------
// PDF — Livre de paie
// ---------------------------------------------------------------------------

export function exporterLivrePaiePDF(livre: LivrePaieMensuel): void {
  const doc = new jsPDF('landscape');
  const titre = `Livre de paie - ${labelMois(livre.mois)} ${livre.annee}`;

  doc.setFontSize(14);
  doc.text(titre, 14, 20);
  doc.setFontSize(10);
  doc.text(`Employeur : ${livre.employeur}`, 14, 28);

  const rows: string[][] = livre.lignes.map((l) => [
    l.nom,
    l.prenom,
    fmt(l.salaire_base),
    fmt(l.primes),
    fmt(l.brut),
    fmt(l.cnss_salariale),
    fmt(l.its),
    fmt(l.camu),
    fmt(l.tol),
    fmt(l.total_retenues),
    fmt(l.net_a_payer),
  ]);

  const totauxRow: string[] = [
    'TOTAUX', '',
    fmt(livre.totaux.salaire_base),
    fmt(livre.totaux.primes),
    fmt(livre.totaux.brut),
    fmt(livre.totaux.cnss_salariale),
    fmt(livre.totaux.its),
    fmt(livre.totaux.camu),
    fmt(livre.totaux.tol),
    fmt(livre.totaux.total_retenues),
    fmt(livre.totaux.net_a_payer),
  ];

  autoTable(doc, {
    startY: 34,
    head: [[
      'Nom', 'Prenom', 'Base', 'Primes', 'Brut',
      'CNSS', 'ITS', 'CAMU', 'TOL',
      'Retenues', 'Net',
    ]],
    body: [...rows, totauxRow],
    headStyles: { fillColor: HEADER_FILL, textColor: [255, 255, 255], fontSize: 8 },
    bodyStyles: { fontSize: 10 },
    theme: 'grid',
    didParseCell(data) {
      if (data.row.index === rows.length && data.section === 'body') {
        data.cell.styles.fillColor = TOTAUX_FILL;
        data.cell.styles.fontStyle = 'bold';
      }
    },
  });

  doc.save(`livre_paie_${labelMois(livre.mois)}_${livre.annee}.pdf`);
}

// ---------------------------------------------------------------------------
// Excel — Bulletins
// ---------------------------------------------------------------------------

export function exporterBulletinsExcel(
  bulletins: BulletinResume[],
  mois: number,
  annee: number,
): void {
  const header = [
    'Nom', 'Prenom', 'Base', 'Brut', 'CNSS', 'ITS',
    'CAMU', 'TOL', 'Retenues', 'Net',
  ];

  const dataRows: (string | number)[][] = bulletins.map((b) => {
    const retenues = b.cnss_salariale + b.its + b.camu_salariale + b.taxe_locaux + b.tus_impot + b.tus_cnss;
    return [
      b.nom,
      b.prenom,
      b.salaire_base,
      b.brut,
      b.cnss_salariale,
      b.its,
      b.camu_salariale,
      b.taxe_locaux,
      retenues,
      b.net_a_payer,
    ];
  });

  // Totaux
  const totaux: (string | number)[] = ['TOTAUX', ''];
  for (let col = 2; col < header.length; col++) {
    let sum = 0;
    for (const row of dataRows) {
      sum += row[col] as number;
    }
    totaux.push(sum);
  }

  const aoa: (string | number)[][] = [header, ...dataRows, totaux];
  const ws = XLSX.utils.aoa_to_sheet(aoa);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Bulletins');
  XLSX.writeFile(wb, `bulletins_${labelMois(mois)}_${annee}.xlsx`);
}

// ---------------------------------------------------------------------------
// Excel — Livre de paie
// ---------------------------------------------------------------------------

export function exporterLivrePaieExcel(livre: LivrePaieMensuel): void {
  const header = [
    'Nom', 'Prenom', 'Base', 'Primes', 'Brut',
    'CNSS', 'ITS', 'CAMU', 'TOL', 'Retenues', 'Net',
  ];

  const dataRows: (string | number)[][] = livre.lignes.map((l) => [
    l.nom,
    l.prenom,
    l.salaire_base,
    l.primes,
    l.brut,
    l.cnss_salariale,
    l.its,
    l.camu,
    l.tol,
    l.total_retenues,
    l.net_a_payer,
  ]);

  const totaux: (string | number)[] = [
    'TOTAUX', '',
    livre.totaux.salaire_base,
    livre.totaux.primes,
    livre.totaux.brut,
    livre.totaux.cnss_salariale,
    livre.totaux.its,
    livre.totaux.camu,
    livre.totaux.tol,
    livre.totaux.total_retenues,
    livre.totaux.net_a_payer,
  ];

  const aoa: (string | number)[][] = [header, ...dataRows, totaux];
  const ws = XLSX.utils.aoa_to_sheet(aoa);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Livre de paie');
  XLSX.writeFile(wb, `livre_paie_${labelMois(livre.mois)}_${livre.annee}.xlsx`);
}

// ---------------------------------------------------------------------------
// Excel — Bordereau CNSS
// ---------------------------------------------------------------------------

export function exporterDeclarationsExcel(declaration: DeclarationCNSS): void {
  const header = [
    'Nom', 'Prenom', 'N° SS', 'Brut',
    'Plafond PVID', 'Plafond AF/AT',
    'CNSS Sal.', 'CNSS Pat. PVID', 'CNSS Pat. AF', 'CNSS Pat. AT',
  ];

  const dataRows: (string | number)[][] = declaration.lignes.map((l) => [
    l.nom,
    l.prenom,
    l.numero_ss,
    l.brut,
    l.plafond1,
    l.plafond2,
    l.cnss_salariale,
    l.cnss_patronale_pvid,
    l.cnss_patronale_af,
    l.cnss_patronale_at,
  ]);

  const totaux: (string | number)[] = [
    'TOTAUX', '', '',
    declaration.totaux.brut_total,
    '', '',
    declaration.totaux.cnss_salariale_total,
    declaration.totaux.cnss_patronale_total,
    '', '',
  ];

  const aoa: (string | number)[][] = [header, ...dataRows, totaux];
  const ws = XLSX.utils.aoa_to_sheet(aoa);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Bordereau CNSS');
  XLSX.writeFile(wb, `bordereau_cnss_${labelMois(declaration.mois)}_${declaration.annee}.xlsx`);
}
