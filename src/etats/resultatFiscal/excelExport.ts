/**
 * Construction des options Excel pour le Resultat Fiscal CGI Congo 2026.
 *
 * Extrait de ResultatFiscal.tsx pour permettre :
 *   - tests unitaires sans React
 *   - reduction de la taille du composant page
 *
 * Le composant fournit l'etat (calc, lignes, ARD) ; ce module construit
 * la representation Excel a partir de cet etat.
 */

import type { ExcelExportOptions, ExcelRow } from '../../lib/excelExport';

export interface ResultatFiscalLignesArd {
  solde_debut: number;
  ard_exercice: number;
  ard_utilises: number;
}

export interface ResultatFiscalLigneRef {
  libelle: string;
  article?: string;
  montant: number;
}

export interface ResultatFiscalDeficit {
  annee_origine: number;
  montant_reportable: number;
  montant_impute: number;
}

export interface ResultatFiscalCalc {
  resultatComptable: number;
  totalReintegrations: number;
  totalDeductions: number;
  resultatFiscal: number;
  totalDeficitsImputes: number;
  ardSoldeFin: number;
  resultatFiscalDefinitif: number;
}

export interface ResultatFiscalExcelInput {
  calc: ResultatFiscalCalc;
  reintegrations: ResultatFiscalLigneRef[];
  deductions: ResultatFiscalLigneRef[];
  deficits: ResultatFiscalDeficit[];
  ard: ResultatFiscalLignesArd;
  regimeFiscal: 'is' | 'iba';
  annee: number;
  duree: number;
  entiteName: string;
  entiteNif: string;
}

const fmt = (v: number): number => Math.round(v);

export function buildResultatFiscalExcelOptions(
  input: ResultatFiscalExcelInput,
): ExcelExportOptions {
  const { calc, reintegrations, deductions, deficits, ard, regimeFiscal, annee, duree, entiteName, entiteNif } = input;
  const rows: ExcelRow[] = [];

  rows.push({ libelle: "I. RESULTAT COMPTABLE DE L'EXERCICE", ref: 'compte 85', values: [fmt(calc.resultatComptable)], bold: true });

  rows.push({ libelle: 'II. REINTEGRATIONS FISCALES', values: [''], bold: true });
  for (const r of reintegrations) {
    rows.push({ libelle: r.libelle, ref: r.article, values: [fmt(r.montant)] });
  }
  rows.push({ libelle: 'TOTAL REINTEGRATIONS (II)', values: [fmt(calc.totalReintegrations)], bold: true });

  rows.push({ libelle: 'III. DEDUCTIONS FISCALES', values: [''], bold: true });
  for (const d of deductions) {
    rows.push({ libelle: d.libelle, ref: d.article, values: [fmt(d.montant)] });
  }
  rows.push({ libelle: 'TOTAL DEDUCTIONS (III)', values: [fmt(calc.totalDeductions)], bold: true });

  rows.push({ libelle: "IV. RESULTAT NET FISCAL DE L'EXERCICE", values: [fmt(calc.resultatFiscal)], bold: true });

  rows.push({ libelle: 'V. REPORTS DEFICITAIRES', values: [''], bold: true });
  for (const d of deficits) {
    rows.push({
      libelle: 'Déficit ' + d.annee_origine + ' (reportable: ' + fmt(d.montant_reportable).toLocaleString() + ')',
      ref: 'Art. 15-bis',
      values: [fmt(d.montant_impute)],
    });
  }
  rows.push({ libelle: 'TOTAL DEFICITS IMPUTES', values: [fmt(calc.totalDeficitsImputes)], bold: true });

  rows.push({ libelle: 'VI. AMORTISSEMENTS REPUTES DIFFERES (ARD) IMPUTES', values: [''], bold: true });
  rows.push({ libelle: "Solde des ARD en début d'exercice", values: [fmt(ard.solde_debut)] });
  rows.push({ libelle: "ARD de l'exercice", values: [fmt(ard.ard_exercice)] });
  rows.push({ libelle: "ARD utilisés dans l'exercice (imputés)", values: [fmt(ard.ard_utilises)] });
  rows.push({ libelle: "Solde des ARD en fin d'exercice", values: [fmt(calc.ardSoldeFin)], bold: true });

  rows.push({ libelle: 'VII. RESULTAT NET FISCAL DEFINITIF (IV − V − ARD utilisés)', values: [fmt(calc.resultatFiscalDefinitif)], bold: true });

  return {
    filename: `Resultat_Fiscal_${annee}`,
    sheetName: 'Resultat Fiscal',
    title: 'DETERMINATION DU RESULTAT FISCAL',
    subtitle: `Regime : ${regimeFiscal === 'is' ? 'IS' : 'IBA'}`,
    headers: ['MONTANT (FCFA)'],
    rows,
    entiteName,
    exerciceAnnee: annee,
    entiteNif,
    dureeMois: duree,
  };
}
