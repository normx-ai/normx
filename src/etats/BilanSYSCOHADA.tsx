import React, { useState, useRef, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { clientFetch } from '../lib/api';
import { LuDownload, LuArrowLeft, LuTriangleAlert, LuEye, LuX, LuPrinter } from 'react-icons/lu';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import './BilanSYCEBNL.css';
import type { BalanceLigne, Exercice, EtatBaseProps, Offre, BilanMode } from '../types';
import { useExercicesQuery } from '../hooks/useExercicesQuery';
import {
  ACTIF_MAPPING,
  PASSIF_MAPPING,
  ACTIF_ROWS,
  PASSIF_ROWS,
  type ActifResult,
  type PassifResult,
} from './bilan/bilanSyscohadaData';
import {
  formatMontant,
  computeActifFromBalance,
  computePassifFromBalance,
  computeResultatNetCR,
} from './bilan/bilanSyscohadaCompute';
import BilanActifTable from './bilan/BilanActifTable';
import BilanPassifTable from './bilan/BilanPassifTable';

interface BilanSYSCOHADAProps extends EtatBaseProps {
  page?: BilanMode;
  offre?: Offre;
}

function BilanSYSCOHADA({ page = 'actif', entiteName, entiteSigle = '', entiteAdresse = '', entiteNif = '', typeActivite, entiteId, offre = 'comptabilite', onBack }: BilanSYSCOHADAProps): React.JSX.Element {
  const { exercices, selectedExercice, setSelectedExercice } = useExercicesQuery(entiteId);
  // Source automatique selon l'offre
  const balanceSource: string = offre === 'comptabilite' ? 'ecritures' : 'import';
  const [_notes] = useState<Record<string, string>>({});
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [pdfBlob, setPdfBlob] = useState<Blob | null>(null);
  const [showN1Detail, setShowN1Detail] = useState<boolean>(false);
  const [isExporting, setIsExporting] = useState<boolean>(false);

  const pageActifRef = useRef<HTMLDivElement>(null);
  const pagePassifRef = useRef<HTMLDivElement>(null);

  // Charger balance depuis les ecritures et convertir au format balance_lignes
  const loadBalanceFromEcritures = async (entId: number, exId: number): Promise<BalanceLigne[]> => {
    const res = await clientFetch('/api/ecritures/balance/' + entId + '/' + exId);
    if (!res.ok) return [];
    const data: BalanceLigne[] = await res.json();
    // Convertir au meme format que balance_lignes
    return data.map(row => ({
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

  // Load balance — fetches N and N-1
  const loadBalanceFn = useCallback(async (): Promise<{ lignesN: BalanceLigne[]; lignesN1: BalanceLigne[]; source: string }> => {
    if (!entiteId || !selectedExercice) return { lignesN: [], lignesN1: [], source: '' };

    let lignesNResult: BalanceLigne[] = [];
    let lignesN1Result: BalanceLigne[] = [];
    let source = '';

    // --- Balance N ---
    if (balanceSource === 'ecritures') {
      lignesNResult = await loadBalanceFromEcritures(entiteId, selectedExercice.id);
      source = 'Ecritures comptables';
    } else {
      const resN = await clientFetch('/api/balance/' + entiteId + '/' + selectedExercice.id + '/N');
      const dataN = await resN.json();
      lignesNResult = dataN.lignes || [];
      source = 'Import balance';
    }

    // --- Balance N-1 ---
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
    queryFn: loadBalanceFn,
    staleTime: 2 * 60 * 1000,
    enabled: !!entiteId && !!selectedExercice,
  });

  const lignesN = balanceData?.lignesN ?? [];
  const lignesN1 = balanceData?.lignesN1 ?? [];
  const balanceFound = lignesN.length > 0;
  const sourceUsed = balanceData?.source ?? '';

  // Compute values
  const actifN = computeActifFromBalance(lignesN, ACTIF_MAPPING);
  const actifN1 = computeActifFromBalance(lignesN1, ACTIF_MAPPING);
  const passifN: Record<string, PassifResult> = computePassifFromBalance(lignesN, PASSIF_MAPPING);
  const passifN1: Record<string, PassifResult> = computePassifFromBalance(lignesN1, PASSIF_MAPPING);

  // CJ = XI du Compte de Résultat (produits - charges)
  passifN['CJ'] = { net: computeResultatNetCR(lignesN) };
  passifN1['CJ'] = { net: computeResultatNetCR(lignesN1) };

  // Compute subtotals and totals
  const getActifValue = (ref: string, field: 'brut' | 'amort' | 'net'): number => {
    const row = ACTIF_ROWS.find(r => r.ref === ref);
    if (row && row.sumRefs) {
      return row.sumRefs.reduce((sum: number, r: string) => {
        const subRow = ACTIF_ROWS.find(sr => sr.ref === r);
        if (subRow && subRow.sumRefs) {
          return sum + getActifValue(r, field);
        }
        return sum + (actifN[r] ? (actifN[r][field] || 0) : 0);
      }, 0);
    }
    return actifN[ref] ? (actifN[ref][field] || 0) : 0;
  };

  const getActifValueN1 = (ref: string, field: 'brut' | 'amort' | 'net'): number => {
    const row = ACTIF_ROWS.find(r => r.ref === ref);
    if (row && row.sumRefs) {
      return row.sumRefs.reduce((sum: number, r: string) => {
        const subRow = ACTIF_ROWS.find(sr => sr.ref === r);
        if (subRow && subRow.sumRefs) {
          return sum + getActifValueN1(r, field);
        }
        return sum + (actifN1[r] ? (actifN1[r][field] || 0) : 0);
      }, 0);
    }
    return actifN1[ref] ? (actifN1[ref][field] || 0) : 0;
  };

  const getPassifValue = (ref: string, isN1: boolean): number => {
    const data = isN1 ? passifN1 : passifN;
    const row = PASSIF_ROWS.find(r => r.ref === ref);
    if (row && row.sumRefs) {
      return row.sumRefs.reduce((sum: number, r: string) => {
        const subRow = PASSIF_ROWS.find(sr => sr.ref === r);
        // CB (Apporteurs capital non appele) is negative in the sum
        const passifRow = PASSIF_ROWS.find(pr => pr.ref === r);
        const sign = (passifRow && passifRow.negativeRef) ? -1 : 1;
        if (subRow && subRow.sumRefs) {
          return sum + sign * getPassifValue(r, isN1);
        }
        return sum + sign * (data[r] ? (data[r].net || 0) : 0);
      }, 0);
    }
    return data[ref] ? (data[ref].net || 0) : 0;
  };

  const annee = selectedExercice ? selectedExercice.annee : new Date().getFullYear();

  const generatePDF = async (): Promise<jsPDF> => {
    // Masquer les indicateurs d'anomalies avant le screenshot
    setIsExporting(true);
    // Laisser React rendre la frame sans les anomalies
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));

    try {
      const pdf = new jsPDF('p', 'mm', 'a4');

      const currentRef = page === 'passif' ? pagePassifRef : pageActifRef;
      if (currentRef.current) {
        const canvas = await html2canvas(currentRef.current, {
          scale: 2,
          useCORS: true,
          backgroundColor: '#ffffff',
        });
        const imgData = canvas.toDataURL('image/png');
        const pdfWidth = 210;
        const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
        pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      }

      return pdf;
    } finally {
      setIsExporting(false);
    }
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
    a.download = 'Bilan_SYSCOHADA_' + annee + '.pdf';
    a.click();
    URL.revokeObjectURL(url);
  };

  const printPDF = (): void => {
    if (!previewUrl) return;
    const win = window.open(previewUrl, '_blank');
    if (win) win.print();
  };

  const duree = selectedExercice?.duree_mois || 12;

  const renderHeader = (_titre: string, sousTitre: string): React.JSX.Element => (
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
      <div className="etat-sub-titre">{sousTitre}</div>
    </div>
  );

  const renderFooter = (): React.JSX.Element => (
    <div className="bilan-footer">
      <span>NORMX États — SYSCOHADA</span>
      <span>Exercice clos le 31/12/{annee}</span>
    </div>
  );

  return (
    <div className="bilan-wrapper">
      <div className="bilan-toolbar">
        <div className="bilan-toolbar-left">
          <button className="bilan-back-btn" onClick={onBack}><LuArrowLeft /> Retour</button>
          <h2>Bilan SYSCOHADA — {page === 'passif' ? 'Passif' : 'Actif'}</h2>
        </div>
        <div className="bilan-toolbar-right">
          <button className="bilan-export-btn secondary" onClick={openPreview}>
            <LuEye /> Aperçu
          </button>
          <button className="bilan-export-btn" onClick={async () => { const pdf = await generatePDF(); pdf.save('Bilan_' + (page === 'passif' ? 'Passif' : 'Actif') + '_SYSCOHADA_' + annee + '.pdf'); }}>
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
          <LuTriangleAlert /> Aucune donnée pour cet exercice. {balanceSource === 'ecritures' ? 'Saisissez des écritures comptables pour cet exercice.' : 'Importez une balance CSV pour cet exercice.'}
        </div>
      )}

      {loading && <div style={{ padding: 20, color: '#888' }}>Chargement...</div>}

      {/* PAGE ACTIF */}
      {page === 'actif' && (<>
        <div className="a4-page" ref={pageActifRef}>
          {renderHeader('SYSTÈME COMPTABLE OHADA (SYSCOHADA)', `BILAN ACTIF AU 31/12/${annee}`)}
          <BilanActifTable
            actifN={actifN}
            actifN1={actifN1}
            getActifValue={getActifValue}
            getActifValueN1={getActifValueN1}
            showN1Detail={showN1Detail}
            onToggleN1Detail={() => setShowN1Detail(!showN1Detail)}
            isExporting={isExporting}
            annee={annee}
          />
        </div>
        {renderFooter()}
      </>)}

      {/* PAGE PASSIF */}
      {page === 'passif' && (<>
        <div className="a4-page" ref={pagePassifRef}>
          {renderHeader('SYSTÈME COMPTABLE OHADA (SYSCOHADA)', `BILAN PASSIF AU 31/12/${annee}`)}
          <BilanPassifTable
            passifN={passifN}
            passifN1={passifN1}
            getPassifValue={getPassifValue}
            annee={annee}
          />
        </div>
        {/* Equilibre */}
        <div className="bilan-equilibre">
          {(() => {
            const totalActif = getActifValue('BZ', 'net');
            const totalPassif = getPassifValue('DZ', false);
            const ecart = Math.abs(totalActif - totalPassif);
            const ok = ecart < 1;
            return (
              <span className={ok ? 'equilibre-ok' : 'equilibre-ko'}>
                {ok
                  ? 'Équilibre vérifié : Actif = Passif'
                  : 'Ecart Actif/Passif : ' + formatMontant(ecart) + ' FCFA'
                }
              </span>
            );
          })()}
        </div>
        {renderFooter()}
      </>)}

      {/* Modale apercu PDF */}
      {previewUrl && (
        <div className="pdf-preview-overlay" onClick={closePreview}>
          <div className="pdf-preview-modal" onClick={e => e.stopPropagation()}>
            <div className="pdf-preview-header">
              <h3>Aperçu — Bilan {page === 'passif' ? 'Passif' : 'Actif'} SYSCOHADA {annee}</h3>
              <div className="pdf-preview-actions">
                <button className="pdf-action-btn" onClick={printPDF}>
                  <LuPrinter /> Imprimer
                </button>
                <button className="pdf-action-btn primary" onClick={downloadPDF}>
                  <LuDownload /> Télécharger
                </button>
                <button className="pdf-close-btn" onClick={closePreview}>
                  <LuX />
                </button>
              </div>
            </div>
            <div className="pdf-preview-body">
              <iframe
                src={previewUrl}
                title="Aperçu Bilan PDF"
                className="pdf-preview-iframe"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default BilanSYSCOHADA;
