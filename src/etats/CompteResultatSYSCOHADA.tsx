import React, { useState, useRef, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { clientFetch } from '../lib/api';
import { LuDownload, LuArrowLeft, LuTriangleAlert, LuEye, LuX, LuPrinter, LuSheet } from 'react-icons/lu';
import { exportToExcel, buildExcelPreviewHtml } from '../lib/excelExport';
import type { ExcelRow, ExcelExportOptions } from '../lib/excelExport';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import './BilanSYCEBNL.css';
import type { BalanceLigne, EtatBaseProps, Offre } from '../types';
import { useExercicesQuery } from '../hooks/useExercicesQuery';
import {
  CR_ROWS, CRBalanceResult,
  computeAllCR, formatMontant, getValue,
} from './cr/crSyscohadaData';
import { CompteResultatTable } from './cr/CompteResultatTable';

interface CompteResultatSYSCOHADAProps extends EtatBaseProps {
  offre?: Offre;
}

function CompteResultatSYSCOHADA({
  entiteName, entiteSigle = '', entiteAdresse = '', entiteNif = '',
  typeActivite, entiteId, offre = 'comptabilite', onBack,
}: CompteResultatSYSCOHADAProps): React.JSX.Element {
  const { exercices, selectedExercice, setSelectedExercice } = useExercicesQuery(entiteId);
  const balanceSource: string = offre === 'comptabilite' ? 'ecritures' : 'import';
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [pdfBlob, setPdfBlob] = useState<Blob | null>(null);
  const [excelPreviewHtml, setExcelPreviewHtml] = useState<string | null>(null);

  const pageRef = useRef<HTMLDivElement>(null);

  const loadBalanceFromEcritures = async (entId: number, exId: number): Promise<BalanceLigne[]> => {
    const res = await clientFetch('/api/ecritures/balance/' + entId + '/' + exId);
    if (!res.ok) return [];
    const data: BalanceLigne[] = await res.json();
    return data.map(row => ({
      numero_compte: row.numero_compte, libelle_compte: row.libelle_compte,
      debit: parseFloat(String(row.debit)) || 0, credit: parseFloat(String(row.credit)) || 0,
      solde_debiteur: parseFloat(String(row.solde_debiteur)) || 0, solde_crediteur: parseFloat(String(row.solde_crediteur)) || 0,
      solde_debiteur_revise: row.solde_debiteur_revise != null ? parseFloat(String(row.solde_debiteur_revise)) : undefined,
      solde_crediteur_revise: row.solde_crediteur_revise != null ? parseFloat(String(row.solde_crediteur_revise)) : undefined,
    }));
  };

  const loadBalanceFn = useCallback(async () => {
    if (!entiteId || !selectedExercice) return { lignesN: [] as BalanceLigne[], lignesN1: [] as BalanceLigne[], source: '' };
    let lignesNResult: BalanceLigne[] = [];
    let lignesN1Result: BalanceLigne[] = [];
    let source = '';
    if (balanceSource === 'ecritures') {
      lignesNResult = await loadBalanceFromEcritures(entiteId, selectedExercice.id);
      source = 'Ecritures comptables';
    } else {
      const resN = await clientFetch('/api/balance/' + entiteId + '/' + selectedExercice.id + '/N');
      const dataN = await resN.json();
      lignesNResult = dataN.lignes || [];
      source = 'Import balance';
    }
    const prevExercice = exercices.find(e => e.annee === selectedExercice.annee - 1);
    if (prevExercice) {
      if (balanceSource === 'ecritures') {
        lignesN1Result = await loadBalanceFromEcritures(entiteId, prevExercice.id);
      } else {
        const resN1 = await clientFetch('/api/balance/' + entiteId + '/' + prevExercice.id + '/N');
        const dataN1 = await resN1.json();
        lignesN1Result = dataN1.lignes || [];
      }
    } else if (balanceSource === 'import') {
      const resN1 = await clientFetch('/api/balance/' + entiteId + '/' + selectedExercice.id + '/N-1');
      const dataN1 = await resN1.json();
      lignesN1Result = dataN1.lignes || [];
    }
    return { lignesN: lignesNResult, lignesN1: lignesN1Result, source };
  }, [entiteId, selectedExercice, exercices, balanceSource]);

  const { data: balanceData, isLoading: loading } = useQuery({
    queryKey: ['balance', entiteId, selectedExercice?.id, balanceSource],
    queryFn: loadBalanceFn, staleTime: 2 * 60 * 1000, enabled: !!entiteId && !!selectedExercice,
  });
  const lignesN = balanceData?.lignesN ?? [];
  const lignesN1 = balanceData?.lignesN1 ?? [];
  const balanceFound = lignesN.length > 0;
  const sourceUsed = balanceData?.source ?? '';

  const dataN: Record<string, CRBalanceResult> = computeAllCR(lignesN);
  const dataN1: Record<string, CRBalanceResult> = computeAllCR(lignesN1);

  const annee = selectedExercice ? selectedExercice.annee : new Date().getFullYear();
  const duree = selectedExercice?.duree_mois || 12;

  const buildExcelOptions = (): ExcelExportOptions => {
    const rows: ExcelRow[] = [];
    const fmt = (v: number): number => Math.round(v);
    for (const row of CR_ROWS) {
      const isBold = row.type === 'subtotal' || row.type === 'result' || row.type === 'total';
      rows.push({
        ref: row.ref,
        libelle: row.libelle,
        values: [fmt(getValue(row.ref, dataN)), fmt(getValue(row.ref, dataN1))],
        bold: isBold,
        subsection: isBold,
        indent: row.type === 'indent',
      });
    }
    return {
      filename: `Compte_Resultat_SYSCOHADA_${annee}`,
      sheetName: 'Compte de Resultat',
      title: 'COMPTE DE RÉSULTAT',
      headers: ['Exercice N', 'Exercice N-1'],
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
    const url = URL.createObjectURL(blob);
    setPdfBlob(blob);
    setPreviewUrl(url);
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
    a.download = 'Compte_Resultat_SYSCOHADA_' + annee + '.pdf';
    a.click();
    URL.revokeObjectURL(url);
  };

  const printPDF = (): void => {
    if (!previewUrl) return;
    const win = window.open(previewUrl, '_blank');
    if (win) win.print();
  };

  const renderHeader = (): React.JSX.Element => (
    <div className="etat-header-officiel">
      <div className="etat-header-grid">
        <div className="etat-header-row">
          <span className="etat-header-label">Désignation entité :</span>
          <span className="etat-header-value">{entiteName || ''}</span>
          <span className="etat-header-label">Exercice clos le :</span>
          <span className="etat-header-value-right">31-12-{annee}</span>
        </div>
        <div className="etat-header-row">
          <span className="etat-header-label">Numéro d'identification :</span>
          <span className="etat-header-value">{entiteNif || ''}</span>
          <span className="etat-header-label">Durée (en mois) :</span>
          <span className="etat-header-value-right">{duree}</span>
        </div>
      </div>
      <div className="etat-sub-titre">COMPTE DE RÉSULTAT AU 31/12/{annee}</div>
    </div>
  );

  const renderFooter = (): React.JSX.Element => (
    <div className="bilan-footer">
      <span>NORMX Etats — SYSCOHADA</span>
      <span>Exercice clos le 31/12/{annee}</span>
    </div>
  );

  void typeActivite; void entiteSigle; void entiteAdresse;

  return (
    <div className="bilan-wrapper">
      <div className="bilan-toolbar">
        <div className="bilan-toolbar-left">
          <button className="bilan-back-btn" onClick={onBack}><LuArrowLeft /> Retour</button>
          <h2>Compte de Resultat SYSCOHADA</h2>
        </div>
        <div className="bilan-toolbar-right">
          <button className="bilan-export-btn secondary" onClick={openPreview}><LuEye /> Apercu</button>
          <button className="bilan-export-btn" onClick={async () => { const pdf = await generatePDF(); pdf.save('Compte_Resultat_SYSCOHADA_' + annee + '.pdf'); }}><LuDownload /> Exporter PDF</button>
          <button className="bilan-export-btn secondary" onClick={previewExcel}><LuEye /> Aperçu Excel</button>
          <button className="bilan-export-btn secondary" onClick={exportExcel}><LuSheet /> Excel</button>
        </div>
      </div>

      <div className="bilan-exercice-select">
        <label>Exercice :</label>
        <select
          value={selectedExercice ? selectedExercice.id : ''}
          onChange={e => {
            const ex = exercices.find(x => x.id === parseInt(e.target.value));
            setSelectedExercice(ex || null);
          }}
        >
          {exercices.length === 0 && <option value="">Aucun exercice</option>}
          {exercices.map(ex => (
            <option key={ex.id} value={ex.id}>{ex.annee}</option>
          ))}
        </select>
        {sourceUsed && <span style={{ marginLeft: 16, fontSize: 12, color: '#6b7280', fontStyle: 'italic' }}>Source : {sourceUsed}</span>}
        <span>(Montants en FCFA)</span>
      </div>

      {!balanceFound && !loading && (
        <div className="bilan-alert">
          <LuTriangleAlert /> Aucune donnee pour cet exercice. {balanceSource === 'ecritures' ? 'Saisissez des ecritures comptables pour cet exercice.' : 'Importez une balance CSV pour cet exercice.'}
        </div>
      )}

      {loading && <div style={{ padding: 20, color: '#888' }}>Chargement...</div>}

      <div className="a4-page" ref={pageRef}>
        {renderHeader()}
        <CompteResultatTable annee={annee} dataN={dataN} dataN1={dataN1} />
      </div>

      <div className="bilan-equilibre">
        {(() => {
          const resultat = getValue('XI', dataN);
          if (!balanceFound) return null;
          return (
            <span className={resultat >= 0 ? 'equilibre-ok' : 'equilibre-ko'}>
              {resultat >= 0
                ? 'Bénéfice : ' + formatMontant(resultat) + ' FCFA'
                : 'Perte : ' + formatMontant(Math.abs(resultat)) + ' FCFA'
              }
            </span>
          );
        })()}
      </div>

      {renderFooter()}

      {previewUrl && (
        <div className="pdf-preview-overlay" onClick={closePreview}>
          <div className="pdf-preview-modal" onClick={e => e.stopPropagation()}>
            <div className="pdf-preview-header">
              <h3>Apercu — Compte de Resultat SYSCOHADA {annee}</h3>
              <div className="pdf-preview-actions">
                <button className="pdf-action-btn" onClick={printPDF}><LuPrinter /> Imprimer</button>
                <button className="pdf-action-btn primary" onClick={downloadPDF}><LuDownload /> Telecharger</button>
                <button className="pdf-close-btn" onClick={closePreview}><LuX /></button>
              </div>
            </div>
            <div className="pdf-preview-body">
              <iframe src={previewUrl} title="Apercu Compte de Resultat SYSCOHADA PDF" className="pdf-preview-iframe" />
            </div>
          </div>
        </div>
      )}

      {excelPreviewHtml && (
        <div className="pdf-preview-overlay" onClick={() => setExcelPreviewHtml(null)}>
          <div className="pdf-preview-modal" onClick={e => e.stopPropagation()}>
            <div className="pdf-preview-header">
              <h3>Aperçu — Compte de Résultat SYSCOHADA {annee}</h3>
              <div className="pdf-preview-actions">
                <button className="pdf-action-btn" onClick={() => { const w = window.open('', '_blank'); if (w) { w.document.write(`<html><head><title>Compte de Résultat ${annee}</title></head><body>${excelPreviewHtml}</body></html>`); w.document.close(); w.print(); } }}>
                  <LuPrinter /> Imprimer
                </button>
                <button className="pdf-action-btn primary" onClick={exportExcel}><LuDownload /> Télécharger Excel</button>
                <button className="pdf-close-btn" onClick={() => setExcelPreviewHtml(null)}><LuX /></button>
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

export default CompteResultatSYSCOHADA;
