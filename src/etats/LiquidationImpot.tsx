// Page Liquidation IS / IBA — extraite du Resultat Fiscal.
// Affiche les sections VIII (liquidation) et IX (resultat net apres impot).
// Permet de configurer le regime, le taux, le mode (minimum / acompte) et
// les acomptes verses. Persiste via le meme endpoint resultat-fiscal/lignes.

import React, { useRef, useState } from 'react';
import { LuDownload, LuArrowLeft, LuTriangleAlert, LuEye, LuX, LuPrinter, LuSheet, LuSave } from 'react-icons/lu';
import { exportToExcel, buildExcelPreviewHtml } from '../lib/excelExport';
import type { ExcelRow, ExcelExportOptions } from '../lib/excelExport';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import './BilanSYCEBNL.css';
import type { EtatBaseProps } from '../types';
import { OPTIONS_TAUX_IS } from '../constants/taxation';
import { formatMontant } from './resultat/resultatFiscalData';
import type { ModeImpot } from './resultat/resultatFiscalData';
import { useResultatFiscalState } from './resultat/useResultatFiscalState';

const sectionStyle: React.CSSProperties = { background: '#1e3a5f', color: '#fff', fontWeight: 700, padding: '6px 8px', fontSize: '10px' };
const labelStyle: React.CSSProperties = { padding: '4px 8px', fontSize: '9px', borderBottom: '1px solid #ddd' };
const montantStyle: React.CSSProperties = { textAlign: 'right' as const, padding: '4px 8px', fontSize: '9px', borderBottom: '1px solid #ddd', fontFamily: 'monospace' };
const totalStyle: React.CSSProperties = { ...montantStyle, fontWeight: 700, background: '#f0f4f8', borderTop: '2px solid #1e3a5f' };

function LiquidationImpot({ entiteName, entiteNif = '', entiteId, offre = 'comptabilite', onBack }: EtatBaseProps): React.JSX.Element {
  const state = useResultatFiscalState({ entiteId, offre });
  const {
    exercices, selectedExercice, setSelectedExercice, annee,
    balanceFound, loading, sourceUsed, balanceSource,
    regimeFiscal, setRegimeFiscal, tauxIS, setTauxIS,
    modeImpot, setModeImpot, acomptesIS, setAcompteAt,
    tss, setTss,
    saveLignes, saving, savedAt, saveError, calc,
  } = state;

  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [pdfBlob, setPdfBlob] = useState<Blob | null>(null);
  const [excelPreviewHtml, setExcelPreviewHtml] = useState<string | null>(null);
  const pageRef = useRef<HTMLDivElement>(null);

  const c = calc;

  const buildExcelOptions = (): ExcelExportOptions => {
    const rows: ExcelRow[] = [];
    const fmt = (v: number): number => Math.round(v);
    rows.push({ libelle: `${regimeFiscal === 'is' ? 'IS' : 'IBA'} brut`, ref: regimeFiscal === 'is' ? 'Art. 10' : 'Art. 95', values: [fmt(c.impotBrut)] });
    if (c.modeImpot === 'minimum_perception') {
      rows.push({ libelle: 'Minimum de perception', ref: regimeFiscal === 'is' ? 'Art. 86-C' : 'Art. 95', values: [fmt(c.minimumPerception)] });
      rows.push({ libelle: `${regimeFiscal === 'is' ? 'IS' : 'IBA'} RETENU (max des deux)`, values: [fmt(c.impotRetenu)], bold: true });
    } else {
      rows.push({ libelle: 'Acompte T1', values: [fmt(c.acomptesIS[0])] });
      rows.push({ libelle: 'Acompte T2', values: [fmt(c.acomptesIS[1])] });
      rows.push({ libelle: 'Acompte T3', values: [fmt(c.acomptesIS[2])] });
      rows.push({ libelle: 'Acompte T4', values: [fmt(c.acomptesIS[3])] });
      rows.push({ libelle: 'Total acomptes verses', values: [fmt(c.acompteIS)], bold: true });
      rows.push({ libelle: `${regimeFiscal === 'is' ? 'IS' : 'IBA'} NET A PAYER`, values: [fmt(c.impotNetAPayer)], bold: true });
    }
    rows.push({ libelle: 'IX. RESULTAT NET APRES IMPOT', values: [''], bold: true });
    rows.push({ libelle: 'BENEFICE NET', values: [fmt(c.beneficeNet)], bold: true });
    return {
      filename: `Liquidation_IS_${annee}`,
      sheetName: 'Liquidation IS',
      title: `LIQUIDATION DE L'IMPOT — ${regimeFiscal === 'is' ? 'IS' : 'IBA'}`,
      subtitle: `Mode : ${c.modeImpot === 'minimum_perception' ? 'Minimum de perception' : 'Acompte IS'}`,
      headers: ['MONTANT (FCFA)'],
      rows,
      entiteName,
      exerciceAnnee: annee,
      entiteNif,
      dureeMois: state.duree,
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
    a.download = 'Liquidation_IS_' + annee + '.pdf';
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
          <h2>Liquidation de l'impot — CGI Congo</h2>
        </div>
        <div className="bilan-toolbar-right">
          <button className="bilan-export-btn" onClick={() => { void saveLignes(); }} disabled={saving || !selectedExercice}>
            <LuSave /> {saving ? 'Enregistrement…' : 'Enregistrer'}
          </button>
          {savedAt && !saveError && (
            <span style={{ fontSize: 11, color: '#16a34a', alignSelf: 'center' }}>
              ✓ Enregistré à {savedAt.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
          {saveError && (
            <span style={{ fontSize: 11, color: '#dc2626', alignSelf: 'center' }}>{saveError}</span>
          )}
          <button className="bilan-export-btn secondary" onClick={openPreview}><LuEye /> Apercu</button>
          <button className="bilan-export-btn" onClick={async () => { const pdf = await generatePDF(); pdf.save('Liquidation_IS_' + annee + '.pdf'); }}><LuDownload /> Exporter PDF</button>
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

        <label style={{ marginLeft: 16 }}>Régime :</label>
        <select value={regimeFiscal} onChange={(e) => setRegimeFiscal(e.target.value as 'is' | 'iba')} style={{ fontSize: 11, padding: '1px 4px' }}>
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

        <label style={{ marginLeft: 12 }}>Mode :</label>
        <select value={modeImpot} onChange={(e) => setModeImpot(e.target.value as ModeImpot)} style={{ fontSize: 11, padding: '1px 4px' }}>
          <option value="minimum_perception">Minimum de perception (CGI 2026)</option>
          <option value="acompte_is">Acompte IS (CGI ≤ 2025)</option>
        </select>

        {sourceUsed && <span style={{ marginLeft: 16, fontSize: 12, color: '#6b7280', fontStyle: 'italic' }}>Source : {sourceUsed}</span>}
        <span>(Montants en FCFA)</span>
      </div>

      {!balanceFound && !loading && (
        <div className="bilan-alert">
          <LuTriangleAlert /> Aucune donnee pour cet exercice. {balanceSource === 'ecritures' ? 'Saisissez des ecritures comptables.' : 'Importez une balance CSV.'}
        </div>
      )}

      {loading && <div style={{ padding: 20, color: '#888' }}>Chargement...</div>}

      <div className="a4-page" ref={pageRef}>
        <div className="etat-header-officiel">
          <div className="etat-header-grid">
            <div className="etat-header-row">
              <span className="etat-header-label">Designation entite :</span>
              <span className="etat-header-value">{entiteName || ''}</span>
              <span className="etat-header-label">Exercice clos le :</span>
              <span className="etat-header-value-right">31/12/{annee}</span>
            </div>
            <div className="etat-header-row">
              <span className="etat-header-label">Numero d'identification :</span>
              <span className="etat-header-value">{entiteNif || ''}</span>
              <span className="etat-header-label">Duree (en mois) :</span>
              <span className="etat-header-value-right">{state.duree}</span>
            </div>
          </div>
        </div>
        <h3 style={{ textAlign: 'center', fontSize: 14, fontWeight: 700, margin: '20px 0 16px', textDecoration: 'underline' }}>
          LIQUIDATION DE L&apos;IMPOT — Regime {regimeFiscal === 'is' ? 'IS' : 'IBA'}
        </h3>

        <table className="bilan-table" style={{ fontSize: '9px' }}>
          <thead>
            <tr>
              <th style={{ width: '55%' }}>LIBELLE</th>
              <th style={{ width: '15%', textAlign: 'right' }}>REF. CGI</th>
              <th style={{ width: '30%', textAlign: 'right' }}>MONTANT (FCFA)</th>
            </tr>
          </thead>
          <tbody>
            <tr><td colSpan={3} style={sectionStyle}>RAPPEL : RESULTAT FISCAL DEFINITIF</td></tr>
            <tr><td style={labelStyle}>Resultat fiscal definitif (page Resultat Fiscal — section VI)</td><td style={montantStyle}></td><td style={{ ...totalStyle, fontSize: '10px', color: c.resultatFiscalDefinitif >= 0 ? '#16a34a' : '#dc2626' }}>{formatMontant(c.resultatFiscalDefinitif)}</td></tr>

            <tr><td colSpan={3} style={sectionStyle}>VIII. LIQUIDATION DE L&apos;IMPÔT — {regimeFiscal === 'is' ? 'IS' : 'IBA'}</td></tr>
            <tr><td style={labelStyle}>{regimeFiscal === 'is' ? 'IS' : 'IBA'} brut = Résultat fiscal définitif × {(c.taux * 100).toFixed(0)}%</td><td style={montantStyle}>{regimeFiscal === 'is' ? 'Art. 10' : 'Art. 95'}</td><td style={montantStyle}>{formatMontant(c.impotBrut)}</td></tr>
            {c.modeImpot === 'minimum_perception' ? (
              <>
                <tr><td style={labelStyle}>Minimum de perception = Total produits × {(c.tauxMin * 100).toFixed(1)}%</td><td style={montantStyle}>{regimeFiscal === 'is' ? 'Art. 86-C' : 'Art. 95'}</td><td style={montantStyle}>{formatMontant(c.minimumPerception)}</td></tr>
                <tr><td style={{ ...labelStyle, fontStyle: 'italic', color: c.minimumApplique ? '#f59e0b' : '#6b7280' }}>{c.minimumApplique ? 'Minimum de perception appliqué (supérieur à l\'impôt calculé)' : 'Impôt calculé retenu (supérieur au minimum)'}</td><td></td><td></td></tr>
                <tr><td style={{ ...labelStyle, fontWeight: 700, fontSize: '11px' }}>{regimeFiscal === 'is' ? 'IS' : 'IBA'} RETENU (max des deux)</td><td style={montantStyle}></td><td style={{ ...totalStyle, fontSize: '11px', background: '#fef3c7' }}>{formatMontant(c.impotRetenu)}</td></tr>
              </>
            ) : (
              <>
                {([0, 1, 2, 3] as const).map(i => (
                  <tr key={i}>
                    <td style={labelStyle}>Acompte IS T{i + 1}</td>
                    <td style={montantStyle}></td>
                    <td style={montantStyle}>
                      <input
                        type="number"
                        value={acomptesIS[i] || ''}
                        onChange={(e) => setAcompteAt(i, parseFloat(e.target.value) || 0)}
                        style={{ width: 130, textAlign: 'right', fontSize: 11, padding: '2px 4px', border: '1px solid #ddd', borderRadius: 3 }}
                        placeholder="0"
                      />
                    </td>
                  </tr>
                ))}
                <tr><td style={{ ...labelStyle, fontWeight: 700 }}>Total acomptes versés (T1 + T2 + T3 + T4)</td><td style={montantStyle}></td><td style={{ ...totalStyle, fontSize: '10px' }}>({formatMontant(c.acompteIS)})</td></tr>
                <tr>
                  <td style={labelStyle}>Taxe sur les Sociétés (TSS)</td>
                  <td style={montantStyle}></td>
                  <td style={montantStyle}>
                    <input
                      type="number"
                      value={tss || ''}
                      onChange={(e) => setTss(parseFloat(e.target.value) || 0)}
                      style={{ width: 130, textAlign: 'right', fontSize: 11, padding: '2px 4px', border: '1px solid #ddd', borderRadius: 3 }}
                      placeholder="0"
                    />
                  </td>
                </tr>
                <tr><td style={{ ...labelStyle, fontWeight: 700 }}>TSS déduite</td><td style={montantStyle}></td><td style={{ ...totalStyle, fontSize: '10px' }}>({formatMontant(c.tss)})</td></tr>
                <tr><td style={{ ...labelStyle, fontWeight: 700, fontSize: '11px' }}>{regimeFiscal === 'is' ? 'IS' : 'IBA'} NET À PAYER = Brut − Total acomptes − TSS</td><td style={montantStyle}></td><td style={{ ...totalStyle, fontSize: '11px', background: '#fef3c7', color: c.impotNetAPayer >= 0 ? '#0f172a' : '#16a34a' }}>{formatMontant(c.impotNetAPayer)}</td></tr>
              </>
            )}

            <tr><td colSpan={3} style={sectionStyle}>IX. RÉSULTAT NET APRÈS IMPÔT</td></tr>
            <tr><td style={{ ...labelStyle, fontWeight: 700, fontSize: '11px' }}>BÉNÉFICE NET = Résultat comptable − Impôt retenu</td><td style={montantStyle}></td><td style={{ ...totalStyle, fontSize: '11px', color: c.beneficeNet >= 0 ? '#16a34a' : '#dc2626' }}>{formatMontant(c.beneficeNet)}</td></tr>
          </tbody>
        </table>

        <div className="bilan-footer">
          <span>NORMX Etats — Liquidation IS/IBA CGI Congo</span>
          <span>Exercice clos le 31/12/{annee}</span>
        </div>
      </div>

      {previewUrl && (
        <div className="pdf-preview-overlay" onClick={closePreview}>
          <div className="pdf-preview-modal" onClick={(e: React.MouseEvent<HTMLDivElement>) => e.stopPropagation()}>
            <div className="pdf-preview-header">
              <h3>Apercu — Liquidation IS {annee}</h3>
              <div className="pdf-preview-actions">
                <button className="pdf-action-btn" onClick={printPDF}><LuPrinter /> Imprimer</button>
                <button className="pdf-action-btn primary" onClick={downloadPDF}><LuDownload /> Telecharger</button>
                <button className="pdf-close-btn" onClick={closePreview}><LuX /></button>
              </div>
            </div>
            <div className="pdf-preview-body">
              <iframe src={previewUrl} title="Apercu Liquidation IS PDF" className="pdf-preview-iframe" />
            </div>
          </div>
        </div>
      )}

      {excelPreviewHtml && (
        <div className="pdf-preview-overlay" onClick={() => setExcelPreviewHtml(null)}>
          <div className="pdf-preview-modal" onClick={(e: React.MouseEvent<HTMLDivElement>) => e.stopPropagation()}>
            <div className="pdf-preview-header">
              <h3>Aperçu — Liquidation IS {annee}</h3>
              <div className="pdf-preview-actions">
                <button className="pdf-action-btn" onClick={() => { const w = window.open('', '_blank'); if (w) { w.document.write(`<html><head><title>Liquidation IS ${annee}</title></head><body>${excelPreviewHtml}</body></html>`); w.document.close(); w.print(); } }}>
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

export default LiquidationImpot;
