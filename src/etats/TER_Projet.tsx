import React, { useState, useRef, useEffect, useCallback } from 'react';
import { clientFetch } from '../lib/api';
import { api } from '../lib/apiEndpoints';
import { useExercicesQuery } from '../hooks/useExercicesQuery';
import { LuDownload, LuArrowLeft, LuTriangleAlert, LuEye, LuX, LuPrinter } from 'react-icons/lu';
import './BilanSYCEBNL.css';
import { BalanceLigne, Exercice, EtatBaseProps } from '../types';
import { computeTERData } from './ter/terData';
import { buildTERPdf } from './ter/terPdf';
import { TERTable } from './ter/TERTable';

function TER_Projet({ entiteName, entiteSigle = '', entiteAdresse = '', entiteNif = '', typeActivite, entiteId, offre = 'comptabilite', onBack }: EtatBaseProps): React.ReactElement {
  const { exercices, selectedExercice, setSelectedExercice } = useExercicesQuery(entiteId);
  const [lignesN, setLignesN] = useState<BalanceLigne[]>([]);
  const [lignesN1, setLignesN1] = useState<BalanceLigne[]>([]);
  const balanceSource: string = offre === 'comptabilite' ? 'ecritures' : 'import';
  const [sourceUsed, setSourceUsed] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [pdfBlob, setPdfBlob] = useState<Blob | null>(null);

  const tableRef = useRef<HTMLDivElement>(null);

  void typeActivite;

  const loadBalanceFromEcritures = async (entId: number, exId: number): Promise<BalanceLigne[]> => {
    const res = await clientFetch(api.ecritures.balance(entId, exId));
    if (!res.ok) return [];
    const data: BalanceLigne[] = await res.json();
    return data.map((row: BalanceLigne) => ({
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
      let lignesNResult: BalanceLigne[] = [];
      let lignesN1Result: BalanceLigne[] = [];
      let source = '';

      if (balanceSource === 'ecritures') {
        lignesNResult = await loadBalanceFromEcritures(entiteId, selectedExercice.id);
        source = 'Écritures comptables';
      } else {
        const resN = await clientFetch(api.balance.byExercice(entiteId, selectedExercice.id, 'N'));
        const dataN: { lignes?: BalanceLigne[] } = await resN.json();
        lignesNResult = dataN.lignes || [];
        source = 'Import balance';
      }
      setLignesN(lignesNResult);
      setSourceUsed(source);

      const prevExercice = exercices.find(e => e.annee === selectedExercice.annee - 1);
      if (prevExercice) {
        if (balanceSource === 'ecritures') {
          lignesN1Result = await loadBalanceFromEcritures(entiteId, prevExercice.id);
        } else {
          const resN1 = await clientFetch(api.balance.byExercice(entiteId, prevExercice.id, 'N'));
          const dataN1: { lignes?: BalanceLigne[] } = await resN1.json();
          lignesN1Result = dataN1.lignes || [];
        }
      }
      setLignesN1(lignesN1Result);
    } catch {
      // silently ignored
    } finally {
      setLoading(false);
    }
  }, [entiteId, selectedExercice, exercices, balanceSource]);

  useEffect(() => { loadBalance(); }, [loadBalance]);

  const data = computeTERData(lignesN, lignesN1);
  const annee = selectedExercice ? selectedExercice.annee : new Date().getFullYear();

  const openPreview = async (): Promise<void> => {
    if (!tableRef.current) return;
    const pdf = await buildTERPdf(tableRef.current);
    const blob = pdf.output('blob');
    setPdfBlob(blob);
    setPreviewUrl(URL.createObjectURL(blob));
  };

  const exportPDF = async (): Promise<void> => {
    if (!tableRef.current) return;
    const pdf = await buildTERPdf(tableRef.current);
    pdf.save(`TER_${entiteName || 'projet'}_${selectedExercice?.annee || ''}.pdf`);
  };

  const handlePrint = (): void => {
    if (previewUrl) window.open(previewUrl, '_blank');
  };

  const handleDownload = (): void => {
    if (!pdfBlob) return;
    const url = URL.createObjectURL(pdfBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `TER_${entiteName || 'projet'}_${selectedExercice?.annee || ''}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const closePreview = (): void => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setPdfBlob(null);
  };

  return (
    <div className="bilan-wrapper">
      <div className="bilan-toolbar">
        <div className="bilan-toolbar-left">
          {onBack && (
            <button className="bilan-back-btn" onClick={onBack}><LuArrowLeft /> Retour</button>
          )}
          <h2>Tableau Emplois Ressources</h2>
        </div>
        <div className="bilan-toolbar-right">
          <button className="bilan-export-btn secondary" onClick={openPreview}>
            <LuEye /> Apercu
          </button>
          <button className="bilan-export-btn" onClick={exportPDF}>
            <LuDownload /> Exporter PDF
          </button>
        </div>
      </div>

      <div className="bilan-exercice-select">
        <label>Exercice :</label>
        <select
          value={selectedExercice?.id || ''}
          onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
            const ex = exercices.find((x: Exercice) => x.id === parseInt(e.target.value));
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

      {loading && <div style={{ padding: 20, color: '#888' }}>Chargement...</div>}

      {!loading && lignesN.length === 0 && (
        <div className="bilan-alert">
          <LuTriangleAlert /> Aucune donnee pour cet exercice. {offre === 'comptabilite'
            ? 'Saisissez et validez des ecritures comptables pour generer le TER.'
            : 'Importez une balance pour generer le TER.'}
        </div>
      )}

      {!loading && lignesN.length > 0 && (
        <div className="a4-page" ref={tableRef}>
          <div className="etat-header-officiel">
            <div className="etat-header-titre">TABLEAU EMPLOIS-RESSOURCES</div>
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

          <TERTable data={data} />

          <div className="bilan-footer">
            <span>NORMX Etats — SYCEBNL Projet</span>
            <span>Exercice clos le 31/12/{annee}</span>
          </div>
        </div>
      )}

      {previewUrl && (
        <div className="pdf-preview-overlay" onClick={closePreview}>
          <div className="pdf-preview-modal" onClick={(e: React.MouseEvent<HTMLDivElement>) => e.stopPropagation()}>
            <div className="pdf-preview-header">
              <h3>Apercu — Tableau Emplois Ressources {annee}</h3>
              <div className="pdf-preview-actions">
                <button className="pdf-action-btn" onClick={handlePrint}>
                  <LuPrinter /> Imprimer
                </button>
                <button className="pdf-action-btn primary" onClick={handleDownload}>
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
                title="Apercu TER PDF"
                className="pdf-preview-iframe"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default TER_Projet;
