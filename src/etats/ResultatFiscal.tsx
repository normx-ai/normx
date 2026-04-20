import React, { useState, useRef, useEffect, useCallback } from 'react';
import { clientFetch } from '../lib/api';
import { useExercicesQuery } from '../hooks/useExercicesQuery';
import { LuDownload, LuArrowLeft, LuTriangleAlert, LuEye, LuX, LuPrinter, LuSheet } from 'react-icons/lu';
import { exportToExcel, buildExcelPreviewHtml } from '../lib/excelExport';
import type { ExcelRow, ExcelExportOptions } from '../lib/excelExport';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import './BilanSYCEBNL.css';
import type { BalanceLigne, EtatBaseProps } from '../types';
import {
  TAUX_IS_NORMAL,
  TAUX_IS_ETRANGER,
  TAUX_MIN_IS,
  TAUX_IBA,
  TAUX_MIN_IBA,
  OPTIONS_TAUX_IS,
} from '../constants/taxation';
import {
  BalanceApiRow,
  DEDUCTIONS_TYPES,
  LigneReintegration,
  REINTEGRATIONS_TYPES,
  computeResultatFiscal,
  formatMontant,
} from './resultat/resultatFiscalData';
import { LignesEditor } from './resultat/LignesEditor';
import { ResultatFiscalTable } from './resultat/ResultatFiscalTable';

void TAUX_IS_ETRANGER;

let nextId = 1;

function ResultatFiscal({ entiteName, entiteSigle = '', entiteAdresse = '', entiteNif = '', typeActivite, entiteId, offre = 'comptabilite', onBack }: EtatBaseProps): React.JSX.Element {
  const { exercices, selectedExercice, setSelectedExercice } = useExercicesQuery(entiteId);
  const [lignesN, setLignesN] = useState<BalanceLigne[]>([]);
  const [balanceFound, setBalanceFound] = useState(false);
  const [loading, setLoading] = useState(false);
  const [sourceUsed, setSourceUsed] = useState('');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [pdfBlob, setPdfBlob] = useState<Blob | null>(null);
  const [excelPreviewHtml, setExcelPreviewHtml] = useState<string | null>(null);
  const balanceSource: 'ecritures' | 'import' = offre === 'comptabilite' ? 'ecritures' : 'import';

  const regimeParDefaut: 'is' | 'iba' = typeActivite === 'entreprise' ? 'is' : 'is';
  const [regimeFiscal, setRegimeFiscal] = useState<'is' | 'iba'>(regimeParDefaut);
  const [tauxIS, setTauxIS] = useState(TAUX_IS_NORMAL);

  const [reintegrations, setReintegrations] = useState<LigneReintegration[]>([]);
  const [deductions, setDeductions] = useState<LigneReintegration[]>([]);

  const pageRef = useRef<HTMLDivElement>(null);

  const loadBalanceFromEcritures = async (entId: number, exId: number): Promise<BalanceLigne[]> => {
    const res = await clientFetch('/api/ecritures/balance/' + entId + '/' + exId);
    if (!res.ok) return [];
    const data: BalanceApiRow[] = await res.json();
    return data.map((row: BalanceApiRow): BalanceLigne => ({
      numero_compte: row.numero_compte,
      libelle_compte: row.libelle_compte,
      debit: parseFloat(String(row.debit)) || 0,
      credit: parseFloat(String(row.credit)) || 0,
      solde_debiteur: parseFloat(String(row.solde_debiteur)) || 0,
      solde_crediteur: parseFloat(String(row.solde_crediteur)) || 0,
      solde_debiteur_revise: row.solde_debiteur_revise != null ? parseFloat(String(row.solde_debiteur_revise)) : undefined,
      solde_crediteur_revise: row.solde_crediteur_revise != null ? parseFloat(String(row.solde_crediteur_revise)) : undefined,
    }));
  };

  const loadBalance = useCallback(async (): Promise<void> => {
    if (!entiteId || !selectedExercice) return;
    setLoading(true);
    try {
      let result: BalanceLigne[] = [];
      let source = '';
      if (balanceSource === 'ecritures') {
        result = await loadBalanceFromEcritures(entiteId, selectedExercice.id);
        source = 'Ecritures comptables';
      } else {
        const res = await clientFetch('/api/balance/' + entiteId + '/' + selectedExercice.id + '/N');
        const data = await res.json();
        result = data.lignes || [];
        source = 'Import balance';
      }
      setLignesN(result);
      setBalanceFound(result.length > 0);
      setSourceUsed(source);
    } catch {
      // silently ignored
    } finally {
      setLoading(false);
    }
  }, [entiteId, selectedExercice, balanceSource]);

  useEffect(() => { loadBalance(); }, [loadBalance]);

  const calc = computeResultatFiscal(lignesN, reintegrations, deductions, regimeFiscal, tauxIS, TAUX_IBA, TAUX_MIN_IS, TAUX_MIN_IBA);
  const annee = selectedExercice ? selectedExercice.annee : new Date().getFullYear();
  const duree = selectedExercice?.duree_mois || 12;

  const addReintegration = (type?: { libelle: string; article: string }): void => {
    setReintegrations(prev => [...prev, { id: nextId++, libelle: type?.libelle || '', montant: 0, article: type?.article || '' }]);
  };
  const removeReintegration = (id: number): void => {
    setReintegrations(prev => prev.filter(r => r.id !== id));
  };
  const updateReintegration = (id: number, field: 'libelle' | 'montant' | 'article', value: string | number): void => {
    setReintegrations(prev => prev.map(r => r.id === id ? { ...r, [field]: value } : r));
  };
  const addDeduction = (type?: { libelle: string; article: string }): void => {
    setDeductions(prev => [...prev, { id: nextId++, libelle: type?.libelle || '', montant: 0, article: type?.article || '' }]);
  };
  const removeDeduction = (id: number): void => {
    setDeductions(prev => prev.filter(d => d.id !== id));
  };
  const updateDeduction = (id: number, field: 'libelle' | 'montant' | 'article', value: string | number): void => {
    setDeductions(prev => prev.map(d => d.id === id ? { ...d, [field]: value } : d));
  };

  const buildExcelOptions = (): ExcelExportOptions => {
    const rows: ExcelRow[] = [];
    const fmt = (v: number): number => Math.round(v);

    rows.push({ libelle: 'I. RESULTAT COMPTABLE', values: [''], bold: true });
    rows.push({ libelle: 'Produits d\'exploitation', ref: 'Cl. 7', values: [fmt(calc.produitsExploitation)] });
    rows.push({ libelle: 'Produits financiers', ref: 'Cl. 77', values: [fmt(calc.produitsFinanciers)] });
    rows.push({ libelle: 'Produits HAO', ref: 'Cl. 82,84,86,88', values: [fmt(calc.produitsHAO)] });
    rows.push({ libelle: 'TOTAL PRODUITS (A)', values: [fmt(calc.totalProduits)], bold: true });
    rows.push({ libelle: 'Charges d\'exploitation', ref: 'Cl. 6', values: [fmt(calc.chargesExploitation)] });
    rows.push({ libelle: 'Charges financieres', ref: 'Cl. 67', values: [fmt(calc.chargesFinancieres)] });
    rows.push({ libelle: 'Charges HAO', ref: 'Cl. 81,83,85,87', values: [fmt(calc.chargesHAO)] });
    rows.push({ libelle: 'TOTAL CHARGES (B)', values: [fmt(calc.totalCharges)], bold: true });
    rows.push({ libelle: 'RESULTAT COMPTABLE (A - B)', ref: 'Art. 6', values: [fmt(calc.resultatComptable)], bold: true });

    rows.push({ libelle: 'II. REINTEGRATIONS FISCALES', values: [''], bold: true });
    for (const r of reintegrations) {
      rows.push({ libelle: r.libelle, ref: r.article, values: [fmt(r.montant)] });
    }
    rows.push({ libelle: 'TOTAL REINTEGRATIONS (C)', values: [fmt(calc.totalReintegrations)], bold: true });

    rows.push({ libelle: 'III. DEDUCTIONS FISCALES', values: [''], bold: true });
    for (const d of deductions) {
      rows.push({ libelle: d.libelle, ref: d.article, values: [fmt(d.montant)] });
    }
    rows.push({ libelle: 'TOTAL DEDUCTIONS (D)', values: [fmt(calc.totalDeductions)], bold: true });

    rows.push({ libelle: 'IV. RESULTAT FISCAL', values: [''], bold: true });
    rows.push({ libelle: 'RESULTAT FISCAL = (A - B) + C - D', ref: regimeFiscal === 'is' ? 'Art. 6-27' : 'Art. 94', values: [fmt(calc.resultatFiscal)], bold: true });

    rows.push({ libelle: 'V. LIQUIDATION DE L\'IMPOT', values: [''], bold: true });
    rows.push({ libelle: (regimeFiscal === 'is' ? 'IS' : 'IBA') + ' brut', ref: regimeFiscal === 'is' ? 'Art. 10' : 'Art. 95', values: [fmt(calc.impotBrut)] });
    rows.push({ libelle: 'Minimum de perception', ref: regimeFiscal === 'is' ? 'Art. 86-C' : 'Art. 95', values: [fmt(calc.minimumPerception)] });
    rows.push({ libelle: (regimeFiscal === 'is' ? 'IS' : 'IBA') + ' RETENU', values: [fmt(calc.impotRetenu)], bold: true });

    rows.push({ libelle: 'VI. RESULTAT NET APRES IMPOT', values: [''], bold: true });
    rows.push({ libelle: 'BENEFICE NET', values: [fmt(calc.beneficeNet)], bold: true });

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
  };

  const exportExcel = (): void => { void exportToExcel(buildExcelOptions()); };
  const previewExcel = (): void => { setExcelPreviewHtml(buildExcelPreviewHtml(buildExcelOptions())); };

  const generatePDF = async (): Promise<jsPDF> => {
    const pdf = new jsPDF('p', 'mm', 'a4');
    if (!pageRef.current) return pdf;
    const canvas = await html2canvas(pageRef.current, { scale: 2, useCORS: true, backgroundColor: '#ffffff' });
    const imgData = canvas.toDataURL('image/png');
    const pdfWidth = 210;
    const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
    pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
    return pdf;
  };

  const openPreview = async (): Promise<void> => {
    const pdf = await generatePDF();
    const blob = pdf.output('blob');
    setPdfBlob(blob);
    setPreviewUrl(URL.createObjectURL(blob));
  };

  const closePreview = (): void => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setPdfBlob(null);
  };

  const downloadPDF = (): void => {
    if (!pdfBlob) return;
    const url = URL.createObjectURL(pdfBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'Resultat_Fiscal_' + annee + '.pdf';
    a.click();
    URL.revokeObjectURL(url);
  };

  const printPDF = (): void => {
    if (previewUrl) { const win = window.open(previewUrl, '_blank'); if (win) win.print(); }
  };

  return (
    <div className="bilan-wrapper">
      <div className="bilan-toolbar">
        <div className="bilan-toolbar-left">
          <button className="bilan-back-btn" onClick={onBack}><LuArrowLeft /> Retour</button>
          <h2>Resultat Fiscal — CGI Congo 2026</h2>
        </div>
        <div className="bilan-toolbar-right">
          <button className="bilan-export-btn secondary" onClick={openPreview}><LuEye /> Apercu</button>
          <button className="bilan-export-btn" onClick={async () => { const pdf = await generatePDF(); pdf.save('Resultat_Fiscal_' + annee + '.pdf'); }}><LuDownload /> Exporter PDF</button>
          <button className="bilan-export-btn secondary" onClick={previewExcel}><LuEye /> Aperçu Excel</button>
          <button className="bilan-export-btn secondary" onClick={exportExcel}><LuSheet /> Excel</button>
        </div>
      </div>

      <div className="bilan-exercice-select">
        <label>Exercice :</label>
        <select value={selectedExercice ? selectedExercice.id : ''} onChange={(e) => { const ex = exercices.find(x => x.id === parseInt(e.target.value)); setSelectedExercice(ex || null); }}>
          {exercices.length === 0 && <option value="">Aucun exercice</option>}
          {exercices.map(ex => (<option key={ex.id} value={ex.id}>{ex.annee}</option>))}
        </select>

        <label style={{ marginLeft: 16 }}>Regime :</label>
        <span style={{ fontSize: 12, fontWeight: 600, color: '#1e3a5f', marginRight: 4 }}>
          {regimeFiscal === 'is' ? 'IS — Impot sur les Societes' : 'IBA — Impot sur les Benefices d\'Affaires'}
        </span>
        <select value={regimeFiscal} onChange={(e) => setRegimeFiscal(e.target.value as 'is' | 'iba')} style={{ fontSize: 11, padding: '1px 4px', color: '#6b7280' }}>
          <option value="is">IS</option>
          <option value="iba">IBA</option>
        </select>

        {regimeFiscal === 'is' && (
          <>
            <label style={{ marginLeft: 12 }}>Taux :</label>
            <select value={tauxIS} onChange={(e) => setTauxIS(parseFloat(e.target.value))} style={{ fontSize: 11 }}>
              {OPTIONS_TAUX_IS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </>
        )}

        {sourceUsed && <span style={{ marginLeft: 16, fontSize: 12, color: '#6b7280', fontStyle: 'italic' }}>Source : {sourceUsed}</span>}
        <span>(Montants en FCFA)</span>
      </div>

      {!balanceFound && !loading && (
        <div className="bilan-alert">
          <LuTriangleAlert /> Aucune donnee pour cet exercice. {balanceSource === 'ecritures' ? 'Saisissez des ecritures comptables.' : 'Importez une balance CSV.'}
        </div>
      )}

      {loading && <div style={{ padding: 20, color: '#888' }}>Chargement...</div>}

      {balanceFound && !loading && (
        <div style={{ display: 'flex', gap: 16, marginBottom: 16, flexWrap: 'wrap' }}>
          <LignesEditor
            title="Reintegrations (+)"
            color="#dc2626"
            types={REINTEGRATIONS_TYPES}
            lignes={reintegrations}
            total={calc.totalReintegrations}
            addLigne={addReintegration}
            updateLigne={updateReintegration}
            removeLigne={removeReintegration}
            emptyMsg="Aucune reintegration saisie"
            addPlaceholder="+ Ajouter une reintegration..."
          />
          <LignesEditor
            title="Deductions (-)"
            color="#16a34a"
            types={DEDUCTIONS_TYPES}
            lignes={deductions}
            total={calc.totalDeductions}
            addLigne={addDeduction}
            updateLigne={updateDeduction}
            removeLigne={removeDeduction}
            emptyMsg="Aucune deduction saisie"
            addPlaceholder="+ Ajouter une deduction..."
          />
        </div>
      )}

      <div className="a4-page" ref={pageRef}>
        <div className="etat-header-officiel">
          <div className="etat-header-titre">DETERMINATION DU RESULTAT FISCAL</div>
          <div className="etat-header-grid">
            <div className="etat-header-row">
              <span className="etat-header-label">Denomination :</span>
              <span className="etat-header-value">{entiteName || ''}</span>
              <span className="etat-header-label">Sigle :</span>
              <span className="etat-header-value">{entiteSigle || ''}</span>
            </div>
            <div className="etat-header-row">
              <span className="etat-header-label">Adresse :</span>
              <span className="etat-header-value">{entiteAdresse || ''}</span>
            </div>
            <div className="etat-header-row">
              <span className="etat-header-label">NUI :</span>
              <span className="etat-header-value">{entiteNif || ''}</span>
              <span className="etat-header-label">Exercice clos le :</span>
              <span className="etat-header-value">31/12/{annee}</span>
              <span className="etat-header-label">Regime :</span>
              <span className="etat-header-value">{regimeFiscal === 'is' ? 'IS' : 'IBA'}</span>
            </div>
          </div>
        </div>

        <ResultatFiscalTable
          calc={calc}
          reintegrations={reintegrations}
          deductions={deductions}
          regimeFiscal={regimeFiscal}
        />

        <div className="bilan-footer">
          <span>NORMX Etats — Resultat Fiscal CGI Congo 2026</span>
          <span>Exercice clos le 31/12/{annee}</span>
        </div>
      </div>

      {previewUrl && (
        <div className="pdf-preview-overlay" onClick={closePreview}>
          <div className="pdf-preview-modal" onClick={(e: React.MouseEvent<HTMLDivElement>) => e.stopPropagation()}>
            <div className="pdf-preview-header">
              <h3>Apercu — Resultat Fiscal {annee}</h3>
              <div className="pdf-preview-actions">
                <button className="pdf-action-btn" onClick={printPDF}><LuPrinter /> Imprimer</button>
                <button className="pdf-action-btn primary" onClick={downloadPDF}><LuDownload /> Telecharger</button>
                <button className="pdf-close-btn" onClick={closePreview}><LuX /></button>
              </div>
            </div>
            <div className="pdf-preview-body">
              <iframe src={previewUrl} title="Apercu Resultat Fiscal PDF" className="pdf-preview-iframe" />
            </div>
          </div>
        </div>
      )}

      {excelPreviewHtml && (
        <div className="pdf-preview-overlay" onClick={() => setExcelPreviewHtml(null)}>
          <div className="pdf-preview-modal" onClick={(e: React.MouseEvent<HTMLDivElement>) => e.stopPropagation()}>
            <div className="pdf-preview-header">
              <h3>Aperçu — Résultat Fiscal {annee}</h3>
              <div className="pdf-preview-actions">
                <button className="pdf-action-btn" onClick={() => { const w = window.open('', '_blank'); if (w) { w.document.write(`<html><head><title>Résultat Fiscal ${annee}</title></head><body>${excelPreviewHtml}</body></html>`); w.document.close(); w.print(); } }}>
                  <LuPrinter /> Imprimer
                </button>
                <button className="pdf-action-btn primary" onClick={exportExcel}>
                  <LuDownload /> Télécharger Excel
                </button>
                <button className="pdf-close-btn" onClick={() => setExcelPreviewHtml(null)}>
                  <LuX />
                </button>
              </div>
            </div>
            <div className="pdf-preview-body" style={{ overflow: 'auto', padding: 16, background: '#fff' }}>
              <div dangerouslySetInnerHTML={{ __html: excelPreviewHtml }} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ResultatFiscal;
