import React, { useState, useRef, useEffect, useCallback } from 'react';
import { clientFetch } from '../lib/api';
import { api } from '../lib/apiEndpoints';
import { useExercicesQuery } from '../hooks/useExercicesQuery';
import { LuDownload, LuArrowLeft, LuTriangleAlert, LuEye, LuX, LuPrinter } from 'react-icons/lu';
import './BilanSYCEBNL.css';
import { BalanceLigne, Exercice, EtatBaseProps } from '../types';
import { buildTERPdf } from './ter/terPdf';
import { computeReconcTotals, getStorageKey } from './reconc/reconcData';
import { ReconcTable } from './reconc/ReconcTable';

function ReconcTresorerie_Projet({ entiteName, entiteSigle = '', entiteAdresse = '', entiteNif = '', typeActivite, entiteId, offre = 'comptabilite', onBack }: EtatBaseProps): React.ReactElement {
  const { exercices, selectedExercice, setSelectedExercice } = useExercicesQuery(entiteId);
  const [lignesN, setLignesN] = useState<BalanceLigne[]>([]);
  const balanceSource: string = offre === 'comptabilite' ? 'ecritures' : 'import';
  const [sourceUsed, setSourceUsed] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [pdfBlob, setPdfBlob] = useState<Blob | null>(null);
  const [editableValues, setEditableValues] = useState<Record<string, number>>({});

  const tableRef = useRef<HTMLDivElement>(null);

  void typeActivite;

  useEffect(() => {
    if (!entiteId || !selectedExercice) return;
    const key = getStorageKey(entiteId, selectedExercice.id);
    try {
      const saved = localStorage.getItem(key);
      if (saved) setEditableValues(JSON.parse(saved) as Record<string, number>);
      else setEditableValues({});
    } catch {
      setEditableValues({});
    }
  }, [entiteId, selectedExercice]);

  const saveEditableValues = useCallback((newVals: Record<string, number>): void => {
    setEditableValues(newVals);
    if (entiteId && selectedExercice) {
      const key = getStorageKey(entiteId, selectedExercice.id);
      localStorage.setItem(key, JSON.stringify(newVals));
    }
  }, [entiteId, selectedExercice]);

  const handleEditableChange = (ref: string, value: string): void => {
    const parsed = parseFloat(value) || 0;
    const newVals = { ...editableValues, [ref]: parsed };
    saveEditableValues(newVals);
  };

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
    } catch {
      // silently ignored
    } finally {
      setLoading(false);
    }
  }, [entiteId, selectedExercice, balanceSource]);

  useEffect(() => { loadBalance(); }, [loadBalance]);

  const totals = computeReconcTotals(lignesN, editableValues);
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
    pdf.save(`ReconcTresorerie_${entiteName || 'projet'}_${annee}.pdf`);
  };

  const closePreview = (): void => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setPdfBlob(null);
  };

  const printPDF = (): void => {
    if (!previewUrl) return;
    const win = window.open(previewUrl, '_blank');
    if (win) win.print();
  };

  const handleDownload = (): void => {
    if (!pdfBlob) return;
    const url = URL.createObjectURL(pdfBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ReconcTresorerie_${entiteName || 'projet'}_${annee}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="bilan-wrapper">
      <div className="bilan-toolbar">
        <div className="bilan-toolbar-left">
          {onBack && (
            <button className="bilan-back-btn" onClick={onBack}><LuArrowLeft /> Retour</button>
          )}
          <h2>Réconciliation de Trésorerie</h2>
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

      {!loading && lignesN.length === 0 && (
        <div className="bilan-alert">
          <LuTriangleAlert /> Aucune donnee pour cet exercice. {offre === 'comptabilite'
            ? 'Saisissez et validez des ecritures comptables pour generer le tableau de reconciliation.'
            : 'Importez une balance pour generer le tableau de reconciliation.'}
        </div>
      )}

      {loading && <div style={{ padding: 20, color: '#888' }}>Chargement...</div>}

      {!loading && lignesN.length > 0 && (
        <div className="a4-page" ref={tableRef}>
          <div className="etat-header-officiel">
            <div className="etat-header-titre">RECONCILIATION DE TRESORERIE</div>
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

          <ReconcTable
            totals={totals}
            editableValues={editableValues}
            onEditableChange={handleEditableChange}
          />

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
              <h3>Apercu — Reconciliation de Tresorerie {annee}</h3>
              <div className="pdf-preview-actions">
                <button className="pdf-action-btn" onClick={printPDF}>
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
                title="Apercu Reconciliation Tresorerie PDF"
                className="pdf-preview-iframe"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ReconcTresorerie_Projet;
