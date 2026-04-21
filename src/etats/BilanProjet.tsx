import React, { useState, useRef, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { clientFetch } from '../lib/api';
import { api } from '../lib/apiEndpoints';
import { LuDownload, LuArrowLeft, LuTriangleAlert, LuEye, LuX, LuPrinter } from 'react-icons/lu';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import './BilanSYCEBNL.css';
import { BalanceLigne, Exercice, EtatBaseProps } from '../types';
import { useExercicesQuery } from '../hooks/useExercicesQuery';
import {
  ACTIF_ROWS,
  PASSIF_ROWS,
  PageMode,
  computeActifValues,
  computePassifValues,
  formatMontant,
  processRows,
} from './bilanProjet/bilanProjetData';
import { BilanProjetTable } from './bilanProjet/BilanProjetTable';

function BilanProjet({ entiteName, entiteSigle = '', entiteAdresse = '', entiteNif = '', typeActivite, entiteId, offre = 'comptabilite', onBack }: EtatBaseProps): React.ReactElement {
  const [page, setPage] = useState<PageMode>('actif');
  const { exercices, selectedExercice, setSelectedExercice } = useExercicesQuery(entiteId);
  const balanceSource: string = offre === 'comptabilite' ? 'ecritures' : 'import';
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [pdfBlob, setPdfBlob] = useState<Blob | null>(null);

  const pageActifRef = useRef<HTMLDivElement>(null);
  const pagePassifRef = useRef<HTMLDivElement>(null);

  void typeActivite;

  const loadBalanceFromEcritures = async (entId: number, exId: number): Promise<BalanceLigne[]> => {
    const res = await clientFetch(api.ecritures.balance(entId, exId));
    if (!res.ok) return [];
    const data: BalanceLigne[] = await res.json();
    return data.map((row: BalanceLigne) => ({
      numero_compte: row.numero_compte, libelle_compte: row.libelle_compte,
      debit: parseFloat(String(row.debit)) || 0, credit: parseFloat(String(row.credit)) || 0,
      solde_debiteur: parseFloat(String(row.solde_debiteur)) || 0, solde_crediteur: parseFloat(String(row.solde_crediteur)) || 0,
      solde_debiteur_revise: row.solde_debiteur_revise != null ? parseFloat(String(row.solde_debiteur_revise)) : undefined,
      solde_crediteur_revise: row.solde_crediteur_revise != null ? parseFloat(String(row.solde_crediteur_revise)) : undefined,
    }));
  };

  const loadBalanceFn = useCallback(async () => {
    if (!entiteId || !selectedExercice) return { lignesN: [] as BalanceLigne[], lignesN1: [] as BalanceLigne[], source: '' };
    let lignesNResult: BalanceLigne[] = [], lignesN1Result: BalanceLigne[] = [], source = '';
    if (balanceSource === 'ecritures') {
      lignesNResult = await loadBalanceFromEcritures(entiteId, selectedExercice.id);
      source = 'Ecritures comptables';
    } else {
      const resN = await clientFetch(api.balance.byExercice(entiteId, selectedExercice.id, 'N'));
      const dataN: { lignes?: BalanceLigne[] } = await resN.json();
      lignesNResult = dataN.lignes || [];
      source = 'Import balance';
    }
    const prevExercice = exercices.find(e => e.annee === selectedExercice.annee - 1);
    if (prevExercice) {
      if (balanceSource === 'ecritures') lignesN1Result = await loadBalanceFromEcritures(entiteId, prevExercice.id);
      else {
        const resN1 = await clientFetch(api.balance.byExercice(entiteId, prevExercice.id, 'N'));
        const dataN1: { lignes?: BalanceLigne[] } = await resN1.json();
        lignesN1Result = dataN1.lignes || [];
      }
    }
    return { lignesN: lignesNResult, lignesN1: lignesN1Result, source };
  }, [entiteId, selectedExercice, exercices, balanceSource]);

  const { data: balanceData, isLoading: loading } = useQuery({
    queryKey: ['balance', entiteId, selectedExercice?.id, balanceSource],
    queryFn: loadBalanceFn, staleTime: 2 * 60 * 1000, enabled: !!entiteId && !!selectedExercice,
  });
  const lignesN = balanceData?.lignesN ?? [];
  const lignesN1 = balanceData?.lignesN1 ?? [];
  const sourceUsed = balanceData?.source ?? '';

  const actifN = processRows(ACTIF_ROWS, computeActifValues(lignesN));
  const passifN = processRows(PASSIF_ROWS, computePassifValues(lignesN));
  const actifN1 = processRows(ACTIF_ROWS, computeActifValues(lignesN1));
  const passifN1 = processRows(PASSIF_ROWS, computePassifValues(lignesN1));

  const annee = selectedExercice ? selectedExercice.annee : new Date().getFullYear();

  const generatePDF = async (): Promise<jsPDF> => {
    const pdf = new jsPDF('p', 'mm', 'a4');
    const currentRef = page === 'passif' ? pagePassifRef : pageActifRef;
    if (currentRef.current) {
      const canvas = await html2canvas(currentRef.current, { scale: 2, useCORS: true, backgroundColor: '#ffffff' });
      const imgData = canvas.toDataURL('image/png');
      const pdfWidth = 210;
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
    }
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
    a.download = 'Bilan_Projet_' + (page === 'passif' ? 'Passif' : 'Actif') + '_' + annee + '.pdf';
    a.click();
    URL.revokeObjectURL(url);
  };

  const printPDF = (): void => {
    if (!previewUrl) return;
    const win = window.open(previewUrl, '_blank');
    if (win) win.print();
  };

  const renderHeader = (titre: string): React.ReactElement => (
    <div className="etat-header-officiel">
      <div className="etat-header-titre">BILAN DU PROJET - {titre}</div>
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

  const renderFooter = (): React.ReactElement => (
    <div className="bilan-footer">
      <span>NORMX Etats — SYCEBNL Projet</span>
      <span>Exercice clos le 31/12/{annee}</span>
    </div>
  );

  return (
    <div className="bilan-wrapper">
      <div className="bilan-toolbar">
        <div className="bilan-toolbar-left">
          <button className="bilan-back-btn" onClick={onBack}><LuArrowLeft /> Retour</button>
          <h2>Bilan Projet — {page === 'passif' ? 'Passif' : 'Actif'}</h2>
          <div style={{ display: 'flex', gap: 4, marginLeft: 16 }}>
            <button className={page === 'actif' ? 'bilan-export-btn' : 'bilan-export-btn secondary'} style={{ padding: '6px 16px', fontSize: 12 }} onClick={() => setPage('actif')}>Actif</button>
            <button className={page === 'passif' ? 'bilan-export-btn' : 'bilan-export-btn secondary'} style={{ padding: '6px 16px', fontSize: 12 }} onClick={() => setPage('passif')}>Passif</button>
          </div>
        </div>
        <div className="bilan-toolbar-right">
          <button className="bilan-export-btn secondary" onClick={openPreview}>
            <LuEye /> Apercu
          </button>
          <button className="bilan-export-btn" onClick={async () => { const pdf = await generatePDF(); pdf.save('Bilan_Projet_' + (page === 'passif' ? 'Passif' : 'Actif') + '_' + annee + '.pdf'); }}>
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
          {exercices.map((ex: Exercice) => (
            <option key={ex.id} value={ex.id}>{ex.annee}</option>
          ))}
        </select>
        {sourceUsed && <span style={{ marginLeft: 16, fontSize: 12, color: '#6b7280', fontStyle: 'italic' }}>Source : {sourceUsed}</span>}
        <span>(Montants en FCFA)</span>
      </div>

      {!loading && lignesN.length === 0 && (
        <div className="bilan-alert">
          <LuTriangleAlert /> Aucune donnee pour cet exercice. {offre === 'comptabilite' ? 'Saisissez des ecritures comptables pour cet exercice.' : 'Importez une balance CSV pour cet exercice.'}
        </div>
      )}

      {loading && <div style={{ padding: 20, color: '#888' }}>Chargement...</div>}

      {page === 'actif' && !loading && lignesN.length > 0 && (
        <div className="a4-page" ref={pageActifRef}>
          {renderHeader('ACTIF')}
          <BilanProjetTable rows={ACTIF_ROWS} valsN={actifN} valsN1={actifN1} headerLabel="ACTIF" annee={annee} />
          {renderFooter()}
        </div>
      )}

      {page === 'passif' && !loading && lignesN.length > 0 && (
        <div className="a4-page" ref={pagePassifRef}>
          {renderHeader('PASSIF')}
          <BilanProjetTable rows={PASSIF_ROWS} valsN={passifN} valsN1={passifN1} headerLabel="PASSIF" annee={annee} />

          <div className="bilan-equilibre">
            {(() => {
              const totalActif = actifN['BZ'] || 0;
              const totalPassif = passifN['DZ'] || 0;
              const ecart = Math.abs(totalActif - totalPassif);
              const ok = ecart < 1;
              return (
                <span className={ok ? 'equilibre-ok' : 'equilibre-ko'}>
                  {ok
                    ? 'Equilibre verifie : Actif = Passif'
                    : 'Ecart Actif/Passif : ' + formatMontant(ecart) + ' FCFA'
                  }
                </span>
              );
            })()}
          </div>

          {renderFooter()}
        </div>
      )}

      {previewUrl && (
        <div className="pdf-preview-overlay" onClick={closePreview}>
          <div className="pdf-preview-modal" onClick={(e: React.MouseEvent<HTMLDivElement>) => e.stopPropagation()}>
            <div className="pdf-preview-header">
              <h3>Apercu — Bilan Projet {page === 'passif' ? 'Passif' : 'Actif'} {annee}</h3>
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
                title="Apercu Bilan Projet PDF"
                className="pdf-preview-iframe"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default BilanProjet;
