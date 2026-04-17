import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { clientFetch } from '../lib/api';
import { useExercicesQuery } from '../hooks/useExercicesQuery';
import { LuDownload, LuArrowLeft, LuTriangleAlert, LuEye, LuX, LuPrinter } from 'react-icons/lu';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import './BilanSYCEBNL.css';
import type { BalanceLigne, Exercice, EtatBaseProps, Offre } from '../types';
import { createLogger } from '../utils/logger';
import {
  PRODUITS_PREFIXES, CHARGES_PREFIXES, DOTATIONS_PREFIXES, REPRISES_PREFIXES_TFT, TFT_ROWS,
  formatMontant, matchesComptes,
  getSD, getSC, sumSoldeDebiteur, sumSoldeCrediteur, rawSD, rawSC, sumMvtDebit, sumMvtCredit,
  actifNet, passifVal,
  bilanBA, bilanBB, bilanBH, bilanBI, bilanBJ, bilanTresoActif, bilanDP, bilanTresoPassif,
  bilanAD_brut, bilanAI_brut,
  computeResultatNet, computeCAFG, computeAllFlux,
  diagnosticTFT,
} from './TFT_helpers';
import type { DiagnosticItem } from './TFT_helpers';

interface TFT_SYSCOHADAProps extends EtatBaseProps {
  offre?: Offre;
}

const log = createLogger('TFT');

function TFT_SYSCOHADA({ entiteName, entiteSigle = '', entiteAdresse = '', entiteNif = '', typeActivite, entiteId, offre = 'comptabilite', onBack }: TFT_SYSCOHADAProps): React.JSX.Element {
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

      log.info('Balance N-1 chargee', { nbLignes: lignesN1Result.length, prevExercice: prevExercice?.annee ?? 'aucun', tresoComptes: lignesN1Result.filter(l => l.numero_compte.startsWith('5')).map(l => ({ c: l.numero_compte, sd: l.solde_debiteur, sc: l.solde_crediteur })) });
      setLignesN1(lignesN1Result);

      // Charger N-2 pour calculer les flux N-1
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
        // Essayer N-1 de l'exercice N-1
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

  useEffect(() => {
    loadBalance();
  }, [loadBalance]);

  // ===================== CALCUL DES FLUX — Formules detaillees PDF p.1275-1282 =====================

  const fluxN = computeAllFlux(lignesN, lignesN1);
  const fluxN1 = useMemo(() => {
    if (lignesN1.length === 0) return {} as Record<string, number>;
    return computeAllFlux(lignesN1, lignesN2);
  }, [lignesN1, lignesN2]);
  const annee = selectedExercice ? selectedExercice.annee : new Date().getFullYear();
  const [showDebug, setShowDebug] = useState(false);

  // Diagnostic automatique N et N-1
  const diagN = useMemo<DiagnosticItem[]>(() => {
    if (lignesN.length === 0) return [];
    return diagnosticTFT(lignesN, lignesN1);
  }, [lignesN, lignesN1]);
  const diagN1 = useMemo<DiagnosticItem[]>(() => {
    if (lignesN1.length === 0) return [];
    const result = diagnosticTFT(lignesN1, lignesN2);
    log.info('Diagnostic N-1', { nbItems: result.length, items: result.map(d => d.poste + ':' + d.type + ':' + d.message.substring(0, 60)) });
    return result;
  }, [lignesN1, lignesN2]);

  const getValue = (ref: string): number => {
    return fluxN[ref] || 0;
  };

  const getValueN1 = (ref: string): number => {
    return fluxN1[ref] || 0;
  };

  // Feuille de travail — formules conformes au guide d'application SYSCOHADA
  const fdt = useMemo(() => {
    if (!balanceFound) return null;

    type Line = { label: string; value: number; valueN1?: number; indent?: boolean; bold?: boolean; };
    type Section = { ref: string; title: string; total: number; totalN1: number; lines: Line[]; };

    const v = (ref: string) => fluxN[ref] || 0;
    const v1 = (ref: string) => fluxN1[ref] || 0;

    const sections: Section[] = [
      { ref: 'ZA', title: 'Tresorerie nette au 1er janvier', total: v('ZA'), totalN1: v1('ZA'), lines: [] },
      { ref: 'FA', title: 'Capacite d\'Autofinancement Globale (CAFG)', total: v('FA'), totalN1: v1('FA'), lines: [] },
      { ref: 'FB', title: '- Variation de l\'actif circulant HAO', total: v('FB'), totalN1: v1('FB'), lines: [] },
      { ref: 'FC', title: '- Variation des stocks', total: v('FC'), totalN1: v1('FC'), lines: [] },
      { ref: 'FD', title: '- Variation des creances et emplois assimiles', total: v('FD'), totalN1: v1('FD'), lines: [] },
      { ref: 'FE', title: '+ Variation du passif circulant', total: v('FE'), totalN1: v1('FE'), lines: [] },
      { ref: 'ZB', title: 'Flux de tresorerie provenant des activites operationnelles (FA a FE)', total: v('ZB'), totalN1: v1('ZB'), lines: [] },
      { ref: 'FF', title: '- Decaissements lies aux acquisitions d\'immobilisations incorporelles', total: v('FF'), totalN1: v1('FF'), lines: [] },
      { ref: 'FG', title: '- Decaissements lies aux acquisitions d\'immobilisations corporelles', total: v('FG'), totalN1: v1('FG'), lines: [] },
      { ref: 'FH', title: '- Decaissements lies aux acquisitions d\'immobilisations financieres', total: v('FH'), totalN1: v1('FH'), lines: [] },
      { ref: 'FI', title: '+ Encaissements lies aux cessions d\'immobilisations incorporelles et corporelles', total: v('FI'), totalN1: v1('FI'), lines: [] },
      { ref: 'FJ', title: '+ Encaissements lies aux cessions d\'immobilisations financieres', total: v('FJ'), totalN1: v1('FJ'), lines: [] },
      { ref: 'ZC', title: 'Flux de tresorerie provenant des activites d\'investissement (FF a FJ)', total: v('ZC'), totalN1: v1('ZC'), lines: [] },
      { ref: 'FK', title: '+ Augmentations de capital par apports nouveaux', total: v('FK'), totalN1: v1('FK'), lines: [] },
      { ref: 'FL', title: '+ Subventions d\'investissement', total: v('FL'), totalN1: v1('FL'), lines: [] },
      { ref: 'FN', title: '- Distribution de dividendes', total: v('FN'), totalN1: v1('FN'), lines: [] },
      { ref: 'ZD', title: 'Flux de tresorerie provenant des capitaux propres (FK a FN)', total: v('ZD'), totalN1: v1('ZD'), lines: [] },
      { ref: 'FO', title: '+ Emprunts', total: v('FO'), totalN1: v1('FO'), lines: [] },
      { ref: 'FQ', title: '- Remboursements des emprunts et autres dettes financieres', total: v('FQ'), totalN1: v1('FQ'), lines: [] },
      { ref: 'ZE', title: 'Flux de tresorerie provenant des capitaux etrangers (FO a FQ)', total: v('ZE'), totalN1: v1('ZE'), lines: [] },
      { ref: 'ZF', title: 'Flux de tresorerie provenant des activites de financement (ZD+ZE)', total: v('ZF'), totalN1: v1('ZF'), lines: [] },
      { ref: 'ZG', title: 'VARIATION DE LA TRESORERIE NETTE DE LA PERIODE (ZB+ZC+ZF)', total: v('ZG'), totalN1: v1('ZG'), lines: [] },
      { ref: 'ZH', title: 'Tresorerie nette au 31 Decembre (ZG+ZA)', total: v('ZH'), totalN1: v1('ZH'), lines: [] },
    ];

    return sections;
  }, [fluxN, fluxN1, balanceFound]);

  const fmt = (v: number) => { if (!v || v === 0) return ''; const neg = v < 0; return (neg ? '(' : '') + Math.abs(Math.round(v)).toLocaleString('fr-FR') + (neg ? ')' : ''); };

  const generatePDF = async (): Promise<jsPDF> => {
    const pdf = new jsPDF('p', 'mm', 'a4');
    if (!pageRef.current) return pdf;
    const canvas = await html2canvas(pageRef.current, {
      scale: 2,
      useCORS: true,
      backgroundColor: '#ffffff',
    });
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

  const duree = selectedExercice?.duree_mois || 12;

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

  const hasN1 = lignesN1.length > 0;

  return (
    <div className="bilan-wrapper">
      <div className="bilan-toolbar">
        <div className="bilan-toolbar-left">
          <button className="bilan-back-btn" onClick={onBack}><LuArrowLeft /> Retour</button>
          <h2>Tableau des Flux de Tresorerie SYSCOHADA</h2>
        </div>
        <div className="bilan-toolbar-right">
          <button className="bilan-export-btn secondary" onClick={openPreview}>
            <LuEye /> Apercu
          </button>
          <button className="bilan-export-btn" onClick={async () => { const pdf = await generatePDF(); pdf.save('TFT_SYSCOHADA_' + annee + '.pdf'); }}>
            <LuDownload /> Exporter PDF
          </button>
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

      {/* PAGE — TFT */}
      <div className="a4-page" ref={pageRef}>
        {renderHeader()}

        <table className="bilan-table">
          <thead>
            <tr>
              <th className="col-ref">REF</th>
              <th className="col-libelle">LIBELLES</th>
              <th className="col-note">Note</th>
              <th className="col-montant">EXERCICE N<br />AU 31/12/{annee}</th>
              <th className="col-montant">EXERCICE N-1<br />AU 31/12/{annee - 1}</th>
            </tr>
          </thead>
          <tbody>
            {TFT_ROWS.map((row, i) => {
              if (row.type === 'section') {
                return (
                  <tr key={i} className="row-section">
                    <td colSpan={5} className="col-section-label">{row.libelle}</td>
                  </tr>
                );
              }
              if (row.type === 'label') {
                return (
                  <tr key={i} className="row-label">
                    <td></td>
                    <td colSpan={2} style={{ fontStyle: 'italic', fontSize: '8px', paddingTop: 2, paddingBottom: 2 }}>{row.libelle}</td>
                    <td></td>
                    <td></td>
                  </tr>
                );
              }

              const rowClass = row.type === 'total' ? 'row-total'
                : row.type === 'result' ? 'row-subtotal'
                : row.type === 'subtotal' ? 'row-subtotal'
                : 'row-indent';

              const val = getValue(row.ref || '');

              const valN1 = getValueN1(row.ref || '');

              return (
                <tr key={i} className={rowClass}>
                  <td className="col-ref">{row.ref}</td>
                  <td className="col-libelle">{row.libelle}</td>
                  <td className="col-note">{row.note || ''}</td>
                  <td className="col-montant">{formatMontant(val)}</td>
                  <td className="col-montant">{formatMontant(valN1)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>

      </div>

      {/* Controle */}
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

      {/* Feuille de travail — Formules détaillées */}
      {balanceFound && fdt && (
        <div style={{ margin: '16px 0' }}>
          <button
            onClick={() => setShowDebug(!showDebug)}
            style={{ background: 'none', border: '1px solid #d1d5db', borderRadius: 4, padding: '6px 14px', cursor: 'pointer', fontSize: 12, color: '#6b7280' }}
          >
            {showDebug ? 'Masquer' : 'Afficher'} la feuille de travail
          </button>

          {showDebug && (
            <div style={{ marginTop: 12, fontSize: 11, background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 6, padding: 16 }}>
              <h4 style={{ fontSize: 13, marginBottom: 12, color: '#1A3A5C' }}>Feuille de travail — Formules détaillées du TFT</h4>

              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #1A3A5C', background: '#eef2f7' }}>
                    <th style={{ textAlign: 'left', padding: '4px 8px', width: '6%' }}>REF</th>
                    <th style={{ textAlign: 'left', padding: '4px 8px' }}>LIBELLES</th>
                    <th style={{ textAlign: 'center', padding: '4px 8px', width: '4%' }}>Note</th>
                    <th style={{ textAlign: 'right', padding: '4px 8px', width: '16%' }}>EXERCICE N</th>
                    <th style={{ textAlign: 'right', padding: '4px 8px', width: '16%' }}>EXERCICE N-1</th>
                  </tr>
                </thead>
                <tbody>
                  {fdt.map((section, si) => {
                    const isTotal = section.ref.startsWith('Z');
                    const isSubtotal = ['ZB','ZC','ZD','ZE','ZF'].includes(section.ref);
                    const isGrand = ['ZG','ZH'].includes(section.ref);
                    const bg = isGrand ? '#1A3A5C' : isSubtotal ? '#d1e7ff' : isTotal ? '#eef2f7' : '#fff';
                    const color = isGrand ? '#fff' : '#1f2937';
                    const fw = isTotal ? 700 : 400;
                    const note = section.ref === 'ZB' ? 'B' : section.ref === 'ZC' ? 'C' : section.ref === 'ZD' ? 'D' : section.ref === 'ZE' ? 'E' : section.ref === 'ZF' ? 'F' : section.ref === 'ZG' ? 'G' : section.ref === 'ZH' ? 'H' : section.ref === 'ZA' ? 'A' : '';
                    return (
                      <tr key={si} style={{ borderBottom: '1px solid #d1d5db', background: bg, color, fontWeight: fw }}>
                        <td style={{ padding: '4px 8px' }}>{section.ref}</td>
                        <td style={{ padding: '4px 8px' }}>{section.title}</td>
                        <td style={{ textAlign: 'center', padding: '4px 8px' }}>{note}</td>
                        <td style={{ textAlign: 'right', padding: '4px 8px' }}>{fmt(section.total)}</td>
                        <td style={{ textAlign: 'right', padding: '4px 8px' }}>{fmt(section.totalN1)}</td>
                      </tr>
                    );
                  })}
                  <tr style={{ fontWeight: 700, background: Math.abs(getValue('ZH') - getValue('ZI')) < 1 ? '#dcfce7' : '#fee2e2' }}>
                    <td style={{ padding: '4px 8px' }}></td>
                    <td style={{ padding: '4px 8px' }}>Controle : Tresorerie actif N - Tresorerie passif N</td>
                    <td style={{ textAlign: 'center', padding: '4px 8px' }}></td>
                    <td style={{ textAlign: 'right', padding: '4px 8px' }}>{fmt(getValue('ZI'))}</td>
                    <td style={{ textAlign: 'right', padding: '4px 8px' }}>{fmt(getValueN1('ZI'))}</td>
                  </tr>
                  <tr style={{ fontWeight: 700, background: Math.abs(getValue('ZH') - getValue('ZI')) < 1 ? '#dcfce7' : '#fee2e2' }}>
                    <td style={{ padding: '4px 8px' }}></td>
                    <td style={{ padding: '4px 8px' }}>Ecart (ZH - ZI)</td>
                    <td style={{ textAlign: 'center', padding: '4px 8px' }}></td>
                    <td style={{ textAlign: 'right', padding: '4px 8px' }}>{fmt(getValue('ZH') - getValue('ZI'))}</td>
                    <td style={{ textAlign: 'right', padding: '4px 8px' }}>{fmt(getValueN1('ZH') - getValueN1('ZI'))}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Diagnostic automatique */}
      {balanceFound && (diagN.length > 0 || diagN1.length > 0) && (
        <div style={{ margin: '16px 0' }}>
          {[
            { label: 'Exercice N (' + annee + ')', items: diagN },
            { label: 'Exercice N-1 (' + (annee - 1) + ')', items: diagN1 },
          ].map(({ label, items }) => {
            if (items.length === 0) {
              return (
                <div key={label} style={{ padding: '8px 12px', marginBottom: 8, background: '#f3f4f6', borderRadius: 6, fontSize: 12, color: '#6b7280' }}>
                  {label} : Pas de donnees pour le diagnostic.
                </div>
              );
            }
            const hasErrors = items.some(d => d.type === 'erreur');
            const hasAlerts = items.some(d => d.type === 'alerte');
            const resume = items.find(d => d.poste === 'Resume');
            const details = items.filter(d => d.poste !== 'Resume' && d.type !== 'info');
            if (!hasErrors && !hasAlerts) {
              return (
                <div key={label} style={{ padding: '8px 12px', marginBottom: 8, background: '#dcfce7', borderRadius: 6, fontSize: 12, color: '#166534' }}>
                  {label} : {resume?.message || 'TFT equilibre.'}
                </div>
              );
            }
            return (
              <div key={label} style={{ marginBottom: 12, background: hasErrors ? '#fef2f2' : '#fffbeb', border: '1px solid ' + (hasErrors ? '#fecaca' : '#fde68a'), borderRadius: 6, padding: 12, fontSize: 12 }}>
                <div style={{ fontWeight: 700, marginBottom: 8, color: hasErrors ? '#991b1b' : '#92400e' }}>
                  {hasErrors ? '\u26D4' : '\u26A0\uFE0F'} {label}
                  {resume && <span style={{ fontWeight: 400, marginLeft: 8 }}>— {resume.message}</span>}
                </div>
                {details.map((d, i) => (
                  <div key={i} style={{ padding: '6px 0', borderBottom: i < details.length - 1 ? '1px solid #f3f4f6' : 'none' }}>
                    <div style={{ color: d.type === 'erreur' ? '#991b1b' : '#92400e', fontWeight: 600 }}>
                      [{d.poste}] {d.message}
                    </div>
                    {d.suggestion && (
                      <div style={{ marginTop: 4, color: '#4b5563', paddingLeft: 12, whiteSpace: 'pre-line' }}>
                        {d.suggestion}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      )}

      {/* Modale apercu PDF */}
      {previewUrl && (
        <div className="pdf-preview-overlay" onClick={closePreview}>
          <div className="pdf-preview-modal" onClick={e => e.stopPropagation()}>
            <div className="pdf-preview-header">
              <h3>Apercu — Tableau des Flux de Tresorerie SYSCOHADA {annee}</h3>
              <div className="pdf-preview-actions">
                <button className="pdf-action-btn" onClick={printPDF}>
                  <LuPrinter /> Imprimer
                </button>
                <button className="pdf-action-btn primary" onClick={downloadPDF}>
                  <LuDownload /> Telecharger
                </button>
                <button className="pdf-close-btn" onClick={closePreview}>
                  <LuX />
                </button>
              </div>
            </div>
            <div className="pdf-preview-body">
              <iframe
                src={previewUrl}
                title="Apercu TFT SYSCOHADA PDF"
                className="pdf-preview-iframe"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default TFT_SYSCOHADA;
