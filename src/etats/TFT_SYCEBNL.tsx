import React, { useState, useRef, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { clientFetch } from '../lib/api';
import { useExercicesQuery } from '../hooks/useExercicesQuery';
import { LuDownload, LuArrowLeft, LuTriangleAlert, LuEye, LuX, LuPrinter } from 'react-icons/lu';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import './BilanSYCEBNL.css';
import type { BalanceLigne, EtatBaseProps } from '../types';
import { computeAllFluxSYCEBNL, formatMontant } from './tft/sycebnlData';
import { TFT_SYCEBNL_Table } from './tft/TableSYCEBNL';

interface BalanceApiRow {
  numero_compte: string;
  libelle_compte: string;
  debit: string | number;
  credit: string | number;
  solde_debiteur: string | number;
  solde_crediteur: string | number;
  solde_debiteur_revise?: number | null;
  solde_crediteur_revise?: number | null;
}

interface BalanceImportResponse {
  lignes: BalanceLigne[];
}

function TFT_SYCEBNL({
  entiteName, entiteSigle = '', entiteAdresse = '', entiteNif = '',
  typeActivite, entiteId, offre = 'comptabilite', onBack,
}: EtatBaseProps): React.JSX.Element {
  const { exercices, selectedExercice, setSelectedExercice } = useExercicesQuery(entiteId);
  const balanceSource: 'ecritures' | 'import' = offre === 'comptabilite' ? 'ecritures' : 'import';
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [pdfBlob, setPdfBlob] = useState<Blob | null>(null);

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
      const dataN: BalanceImportResponse = await resN.json();
      lignesNResult = dataN.lignes || [];
      source = 'Import balance';
    }
    const prevExercice = exercices.find(e => e.annee === selectedExercice.annee - 1);
    if (prevExercice) {
      if (balanceSource === 'ecritures') {
        lignesN1Result = await loadBalanceFromEcritures(entiteId, prevExercice.id);
      } else {
        const resN1 = await clientFetch('/api/balance/' + entiteId + '/' + prevExercice.id + '/N');
        const dataN1: BalanceImportResponse = await resN1.json();
        lignesN1Result = dataN1.lignes || [];
      }
    } else if (balanceSource === 'import') {
      const resN1 = await clientFetch('/api/balance/' + entiteId + '/' + selectedExercice.id + '/N-1');
      const dataN1: BalanceImportResponse = await resN1.json();
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

  const fluxN: Record<string, number> = computeAllFluxSYCEBNL(lignesN, lignesN1);
  const annee: number = selectedExercice ? selectedExercice.annee : new Date().getFullYear();
  const getValue = (ref: string): number => fluxN[ref] || 0;

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
    a.download = 'TFT_SYCEBNL_' + annee + '.pdf';
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
      <div className="etat-header-titre">TABLEAU DES FLUX DE TRESORERIE</div>
      <div className="etat-header-grid">
        <div className="etat-header-row">
          <span className="etat-header-label">Denomination de l'entite :</span>
          <span className="etat-header-value">{entiteName || ''}</span>
          <span className="etat-header-label">Sigle usuel :</span>
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
          <span className="etat-header-label">Duree (en mois) :</span>
          <span className="etat-header-value">12</span>
        </div>
      </div>
    </div>
  );

  const renderFooter = (): React.JSX.Element => (
    <div className="bilan-footer">
      <span>NORMX Etats — SYCEBNL</span>
      <span>Exercice clos le 31/12/{annee}</span>
    </div>
  );

  void typeActivite;

  const hasN1: boolean = lignesN1.length > 0;

  return (
    <div className="bilan-wrapper">
      <div className="bilan-toolbar">
        <div className="bilan-toolbar-left">
          <button className="bilan-back-btn" onClick={onBack}><LuArrowLeft /> Retour</button>
          <h2>Tableau des Flux de Tresorerie SYCEBNL (methode directe)</h2>
        </div>
        <div className="bilan-toolbar-right">
          <button className="bilan-export-btn secondary" onClick={openPreview}><LuEye /> Apercu</button>
          <button className="bilan-export-btn" onClick={async () => { const pdf = await generatePDF(); pdf.save('TFT_SYCEBNL_' + annee + '.pdf'); }}>
            <LuDownload /> Exporter PDF
          </button>
        </div>
      </div>

      <div className="bilan-exercice-select">
        <label>Exercice :</label>
        <select
          value={selectedExercice ? selectedExercice.id : ''}
          onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
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

      {!hasN1 && balanceFound && !loading && (
        <div className="bilan-alert" style={{ background: '#fef3c7', borderColor: '#f59e0b', color: '#92400e' }}>
          <LuTriangleAlert /> Aucune donnee pour l'exercice N-1. Les variations seront calculees par rapport a zero. {balanceSource === 'ecritures' ? "Saisissez des ecritures pour l'exercice precedent." : 'Importez la balance N-1.'}
        </div>
      )}

      {loading && <div style={{ padding: 20, color: '#888' }}>Chargement...</div>}

      <div className="a4-page" ref={pageRef}>
        {renderHeader()}
        <TFT_SYCEBNL_Table annee={annee} getValue={getValue} />

        <div className="bilan-equilibre">
          {(() => {
            if (!balanceFound) return null;
            const tresoCalculee = getValue('ZG');
            const tresoBilan = getValue('ZH');
            const ecart = Math.abs(tresoCalculee - tresoBilan);
            const ok = ecart < 1;
            return (
              <span className={ok ? 'equilibre-ok' : 'equilibre-ko'}>
                {ok
                  ? 'Controle verifie : tresorerie TFT = tresorerie bilan (' + formatMontant(tresoCalculee) + ' FCFA)'
                  : 'Ecart de controle : ' + formatMontant(ecart) + ' FCFA (TFT: ' + formatMontant(tresoCalculee) + ' / Bilan: ' + formatMontant(tresoBilan) + ')'
                }
              </span>
            );
          })()}
        </div>

        {renderFooter()}
      </div>

      {previewUrl && (
        <div className="pdf-preview-overlay" onClick={closePreview}>
          <div className="pdf-preview-modal" onClick={(e: React.MouseEvent<HTMLDivElement>) => e.stopPropagation()}>
            <div className="pdf-preview-header">
              <h3>Apercu — TFT SYCEBNL (methode directe) {annee}</h3>
              <div className="pdf-preview-actions">
                <button className="pdf-action-btn" onClick={printPDF}><LuPrinter /> Imprimer</button>
                <button className="pdf-action-btn primary" onClick={downloadPDF}><LuDownload /> Telecharger</button>
                <button className="pdf-close-btn" onClick={closePreview}><LuX /></button>
              </div>
            </div>
            <div className="pdf-preview-body">
              <iframe src={previewUrl} title="Apercu TFT PDF" className="pdf-preview-iframe" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default TFT_SYCEBNL;
