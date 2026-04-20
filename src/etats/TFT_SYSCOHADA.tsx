import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { clientFetch } from '../lib/api';
import { useExercicesQuery } from '../hooks/useExercicesQuery';
import { LuDownload, LuArrowLeft, LuTriangleAlert, LuEye, LuX, LuPrinter, LuSheet } from 'react-icons/lu';
import { exportToExcel, buildExcelPreviewHtml } from '../lib/excelExport';
import type { ExcelRow, ExcelExportOptions } from '../lib/excelExport';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import './BilanSYCEBNL.css';
import type { BalanceLigne, EtatBaseProps, Offre } from '../types';
import { createLogger } from '../utils/logger';
import {
  TFT_ROWS, formatMontant,
  computeAllFlux, diagnosticTFT,
} from './TFT_helpers';
import type { DiagnosticItem } from './TFT_helpers';
import { TFT_SYSCOHADA_Table } from './tft/TableMain';
import { FeuilleDeTravail } from './tft/FeuilleDeTravail';
import { DiagnosticPanel } from './tft/DiagnosticPanel';

interface TFT_SYSCOHADAProps extends EtatBaseProps {
  offre?: Offre;
}

const log = createLogger('TFT');

function TFT_SYSCOHADA({
  entiteName, entiteSigle = '', entiteAdresse = '', entiteNif = '',
  typeActivite, entiteId, offre = 'comptabilite', onBack,
}: TFT_SYSCOHADAProps): React.JSX.Element {
  const { exercices, selectedExercice, setSelectedExercice } = useExercicesQuery(entiteId);
  const [lignesN, setLignesN] = useState<BalanceLigne[]>([]);
  const [lignesN1, setLignesN1] = useState<BalanceLigne[]>([]);
  const [lignesN2, setLignesN2] = useState<BalanceLigne[]>([]);
  const [balanceFound, setBalanceFound] = useState<boolean>(false);
  const balanceSource: string = offre === 'comptabilite' ? 'ecritures' : 'import';
  const [sourceUsed, setSourceUsed] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [pdfBlob, setPdfBlob] = useState<Blob | null>(null);
  const [excelPreviewHtml, setExcelPreviewHtml] = useState<string | null>(null);

  const pageRef = useRef<HTMLDivElement>(null);

  const loadBalanceFromEcritures = async (entId: number, exId: number): Promise<BalanceLigne[]> => {
    const res = await clientFetch('/api/ecritures/balance/' + entId + '/' + exId);
    if (!res.ok) return [];
    const data: BalanceLigne[] = await res.json();
    return data.map(row => ({
      numero_compte: row.numero_compte,
      libelle_compte: row.libelle_compte,
      si_debit: parseFloat(String(row.si_debit)) || 0,
      si_credit: parseFloat(String(row.si_credit)) || 0,
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
    log.info('loadBalance', { offre, balanceSource, entiteId, exerciceId: selectedExercice.id, annee: selectedExercice.annee });
    try {
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

      setLignesN(lignesNResult);
      setBalanceFound(lignesNResult.length > 0);
      setSourceUsed(source);

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

      log.info('Balance N-1 chargee', { nbLignes: lignesN1Result.length, prevExercice: prevExercice?.annee ?? 'aucun' });
      setLignesN1(lignesN1Result);

      // Balance N-2 necessaire pour calculer les flux N-1
      let lignesN2Result: BalanceLigne[] = [];
      const prevPrevExercice = exercices.find(e => e.annee === selectedExercice.annee - 2);
      if (prevPrevExercice) {
        if (balanceSource === 'ecritures') {
          lignesN2Result = await loadBalanceFromEcritures(entiteId, prevPrevExercice.id);
        } else {
          const resN2 = await clientFetch('/api/balance/' + entiteId + '/' + prevPrevExercice.id + '/N');
          const dataN2 = await resN2.json();
          lignesN2Result = dataN2.lignes || [];
        }
      } else if (balanceSource === 'import') {
        const prevExN1 = exercices.find(e => e.annee === selectedExercice.annee - 1);
        if (prevExN1) {
          const resN2 = await clientFetch('/api/balance/' + entiteId + '/' + prevExN1.id + '/N-1');
          const dataN2 = await resN2.json();
          lignesN2Result = dataN2.lignes || [];
        }
      }
      setLignesN2(lignesN2Result);
    } catch (_err) {
      // Erreur chargement balance silencieuse
    } finally {
      setLoading(false);
    }
  }, [entiteId, selectedExercice, exercices, balanceSource]);

  useEffect(() => { loadBalance(); }, [loadBalance]);

  // ===================== CALCUL DES FLUX =====================
  const fluxN = computeAllFlux(lignesN, lignesN1);
  const fluxN1 = useMemo(() => {
    if (lignesN1.length === 0) return {} as Record<string, number>;
    return computeAllFlux(lignesN1, lignesN2);
  }, [lignesN1, lignesN2]);
  const annee = selectedExercice ? selectedExercice.annee : new Date().getFullYear();
  const duree = selectedExercice?.duree_mois || 12;
  const [showDebug, setShowDebug] = useState(false);

  const diagN = useMemo<DiagnosticItem[]>(() => {
    if (lignesN.length === 0) return [];
    return diagnosticTFT(lignesN, lignesN1);
  }, [lignesN, lignesN1]);
  const diagN1 = useMemo<DiagnosticItem[]>(() => {
    if (lignesN1.length === 0) return [];
    const result = diagnosticTFT(lignesN1, lignesN2);
    log.info('Diagnostic N-1', { nbItems: result.length });
    return result;
  }, [lignesN1, lignesN2]);

  const getValue = (ref: string): number => fluxN[ref] || 0;
  const getValueN1 = (ref: string): number => fluxN1[ref] || 0;

  const fdt = useMemo(() => {
    if (!balanceFound) return null;
    const v = (ref: string) => fluxN[ref] || 0;
    const v1 = (ref: string) => fluxN1[ref] || 0;
    return [
      { ref: 'ZA', title: 'Tresorerie nette au 1er janvier', total: v('ZA'), totalN1: v1('ZA') },
      { ref: 'FA', title: "Capacite d'Autofinancement Globale (CAFG)", total: v('FA'), totalN1: v1('FA') },
      { ref: 'FB', title: "- Variation de l'actif circulant HAO", total: v('FB'), totalN1: v1('FB') },
      { ref: 'FC', title: '- Variation des stocks', total: v('FC'), totalN1: v1('FC') },
      { ref: 'FD', title: '- Variation des creances et emplois assimiles', total: v('FD'), totalN1: v1('FD') },
      { ref: 'FE', title: '+ Variation du passif circulant', total: v('FE'), totalN1: v1('FE') },
      { ref: 'ZB', title: 'Flux de tresorerie provenant des activites operationnelles (FA a FE)', total: v('ZB'), totalN1: v1('ZB') },
      { ref: 'FF', title: "- Decaissements lies aux acquisitions d'immobilisations incorporelles", total: v('FF'), totalN1: v1('FF') },
      { ref: 'FG', title: "- Decaissements lies aux acquisitions d'immobilisations corporelles", total: v('FG'), totalN1: v1('FG') },
      { ref: 'FH', title: "- Decaissements lies aux acquisitions d'immobilisations financieres", total: v('FH'), totalN1: v1('FH') },
      { ref: 'FI', title: "+ Encaissements lies aux cessions d'immobilisations incorporelles et corporelles", total: v('FI'), totalN1: v1('FI') },
      { ref: 'FJ', title: "+ Encaissements lies aux cessions d'immobilisations financieres", total: v('FJ'), totalN1: v1('FJ') },
      { ref: 'ZC', title: "Flux de tresorerie provenant des activites d'investissement (FF a FJ)", total: v('ZC'), totalN1: v1('ZC') },
      { ref: 'FK', title: '+ Augmentations de capital par apports nouveaux', total: v('FK'), totalN1: v1('FK') },
      { ref: 'FL', title: "+ Subventions d'investissement", total: v('FL'), totalN1: v1('FL') },
      { ref: 'FN', title: '- Distribution de dividendes', total: v('FN'), totalN1: v1('FN') },
      { ref: 'ZD', title: 'Flux de tresorerie provenant des capitaux propres (FK a FN)', total: v('ZD'), totalN1: v1('ZD') },
      { ref: 'FO', title: '+ Emprunts', total: v('FO'), totalN1: v1('FO') },
      { ref: 'FQ', title: '- Remboursements des emprunts et autres dettes financieres', total: v('FQ'), totalN1: v1('FQ') },
      { ref: 'ZE', title: 'Flux de tresorerie provenant des capitaux etrangers (FO a FQ)', total: v('ZE'), totalN1: v1('ZE') },
      { ref: 'ZF', title: 'Flux de tresorerie provenant des activites de financement (ZD+ZE)', total: v('ZF'), totalN1: v1('ZF') },
      { ref: 'ZG', title: 'VARIATION DE LA TRESORERIE NETTE DE LA PERIODE (ZB+ZC+ZF)', total: v('ZG'), totalN1: v1('ZG') },
      { ref: 'ZH', title: 'Tresorerie nette au 31 Decembre (ZG+ZA)', total: v('ZH'), totalN1: v1('ZH') },
    ];
  }, [fluxN, fluxN1, balanceFound]);

  const fmt = (v: number) => {
    if (!v || v === 0) return '';
    const neg = v < 0;
    return (neg ? '(' : '') + Math.abs(Math.round(v)).toLocaleString('fr-FR') + (neg ? ')' : '');
  };

  const buildExcelOptions = (): ExcelExportOptions => {
    const rows: ExcelRow[] = [];
    const fmtNum = (v: number): number => Math.round(v);
    for (const row of TFT_ROWS) {
      const isSection = row.type === 'section';
      const isLabel = row.type === 'label';
      const isBold = row.type === 'subtotal' || row.type === 'result' || row.type === 'total';
      if (isSection) { rows.push({ libelle: row.libelle, values: [], section: true }); continue; }
      if (isLabel) { rows.push({ libelle: row.libelle, values: [], subsection: true }); continue; }
      const ref = row.ref || '';
      rows.push({
        ref,
        libelle: row.libelle,
        values: [fmtNum(getValue(ref)), fmtNum(getValueN1(ref))],
        bold: isBold,
        indent: row.type === 'indent',
      });
    }
    return {
      filename: 'TFT_SYSCOHADA_' + annee + '.xlsx',
      sheetName: 'TFT SYSCOHADA',
      title: 'TABLEAU DES FLUX DE TRESORERIE AU 31/12/' + annee,
      headers: ['EXERCICE N', 'EXERCICE N-1'],
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
    a.download = 'TFT_SYSCOHADA_' + annee + '.pdf';
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
      <div className="etat-sub-titre">TABLEAU DES FLUX DE TRÉSORERIE AU 31/12/{annee}</div>
    </div>
  );

  const renderFooter = (): React.JSX.Element => (
    <div className="bilan-footer">
      <span>NORMX Etats — SYSCOHADA</span>
      <span>Exercice clos le 31/12/{annee}</span>
    </div>
  );

  // typeActivite / entiteSigle / entiteAdresse remontes par le parent
  // (header full) mais non lus ici.
  void typeActivite; void entiteSigle; void entiteAdresse;

  const hasN1 = lignesN1.length > 0;

  return (
    <div className="bilan-wrapper">
      <div className="bilan-toolbar">
        <div className="bilan-toolbar-left">
          <button className="bilan-back-btn" onClick={onBack}><LuArrowLeft /> Retour</button>
          <h2>Tableau des Flux de Tresorerie SYSCOHADA</h2>
        </div>
        <div className="bilan-toolbar-right">
          <button className="bilan-export-btn secondary" onClick={openPreview}><LuEye /> Apercu</button>
          <button className="bilan-export-btn" onClick={async () => { const pdf = await generatePDF(); pdf.save('TFT_SYSCOHADA_' + annee + '.pdf'); }}><LuDownload /> Exporter PDF</button>
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
          <LuTriangleAlert /> Aucune donnee pour cet exercice. {balanceSource === 'ecritures' ? 'Saisissez des ecritures comptables.' : 'Importez une balance CSV.'}
        </div>
      )}

      {!hasN1 && balanceFound && !loading && (
        <div className="bilan-alert" style={{ background: '#fef3c7', borderColor: '#f59e0b', color: '#92400e' }}>
          <LuTriangleAlert /> Aucune donnee N-1. Les variations seront calculees par rapport a zero.
        </div>
      )}

      {loading && <div style={{ padding: 20, color: '#888' }}>Chargement...</div>}

      <div className="a4-page" ref={pageRef}>
        {renderHeader()}
        <TFT_SYSCOHADA_Table annee={annee} getValue={getValue} getValueN1={getValueN1} />
      </div>

      <div className="bilan-equilibre">
        {(() => {
          if (!balanceFound) return null;
          const tresoTFT = getValue('ZH');
          const tresoBilan = getValue('ZI');
          const ecart = Math.abs(tresoTFT - tresoBilan);
          const ok = ecart < 1;
          return (
            <span className={ok ? 'equilibre-ok' : 'equilibre-ko'}>
              {ok
                ? 'Contrôle vérifié : trésorerie TFT = trésorerie bilan (' + formatMontant(tresoTFT) + ' FCFA)'
                : 'Écart de contrôle : ' + formatMontant(ecart) + ' FCFA (TFT: ' + formatMontant(tresoTFT) + ' / Bilan: ' + formatMontant(tresoBilan) + ')'
              }
            </span>
          );
        })()}
      </div>

      {renderFooter()}

      {balanceFound && fdt && (
        <FeuilleDeTravail
          fdt={fdt}
          showDebug={showDebug}
          setShowDebug={setShowDebug}
          getValue={getValue}
          getValueN1={getValueN1}
          fmt={fmt}
        />
      )}

      {balanceFound && (diagN.length > 0 || diagN1.length > 0) && (
        <DiagnosticPanel diagN={diagN} diagN1={diagN1} annee={annee} />
      )}

      {previewUrl && (
        <div className="pdf-preview-overlay" onClick={closePreview}>
          <div className="pdf-preview-modal" onClick={e => e.stopPropagation()}>
            <div className="pdf-preview-header">
              <h3>Apercu — Tableau des Flux de Tresorerie SYSCOHADA {annee}</h3>
              <div className="pdf-preview-actions">
                <button className="pdf-action-btn" onClick={printPDF}><LuPrinter /> Imprimer</button>
                <button className="pdf-action-btn primary" onClick={downloadPDF}><LuDownload /> Telecharger</button>
                <button className="pdf-close-btn" onClick={closePreview}><LuX /></button>
              </div>
            </div>
            <div className="pdf-preview-body">
              <iframe src={previewUrl} title="Apercu TFT SYSCOHADA PDF" className="pdf-preview-iframe" />
            </div>
          </div>
        </div>
      )}

      {excelPreviewHtml && (
        <div className="pdf-preview-overlay" onClick={() => setExcelPreviewHtml(null)}>
          <div className="pdf-preview-modal" onClick={e => e.stopPropagation()}>
            <div className="pdf-preview-header">
              <h3>Aperçu — TFT SYSCOHADA {annee}</h3>
              <div className="pdf-preview-actions">
                <button className="pdf-action-btn" onClick={() => { const w = window.open('', '_blank'); if (w) { w.document.write(`<html><head><title>TFT ${annee}</title></head><body>${excelPreviewHtml}</body></html>`); w.document.close(); w.print(); } }}>
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

export default TFT_SYSCOHADA;
