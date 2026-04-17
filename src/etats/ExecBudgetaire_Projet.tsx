import React, { useState, useRef, useEffect, useCallback } from 'react';
import { clientFetch } from '../lib/api';
import { useExercicesQuery } from '../hooks/useExercicesQuery';
import { LuDownload, LuArrowLeft, LuEye, LuX, LuPrinter, LuPlus, LuTrash2 } from 'react-icons/lu';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import './BilanSYCEBNL.css';
import { Exercice, EtatBaseProps } from '../types';

// ===================== §2289 TABLEAU D'EXÉCUTION BUDGÉTAIRE — PROJET DE DÉVELOPPEMENT =====================

interface BudgetLigne {
  code: string;
  libelle: string;
  budget: number;
  decaissement: number;
  engagement: number;
}

interface ComputedBudgetLigne extends BudgetLigne {
  realisation: number;
  creditDispo: number;
  execPct: number | null;
}

interface BudgetTotals {
  budget: number;
  decaissement: number;
  engagement: number;
  realisation: number;
  creditDispo: number;
  execPct: number | null;
}

function formatMontant(val: number): string {
  if (val === null || val === undefined || isNaN(val) || Math.abs(val) < 0.5) return '';
  return Math.round(val).toLocaleString('fr-FR');
}

function formatPourcent(val: number | null): string {
  if (val === null || val === undefined || isNaN(val) || !isFinite(val)) return '';
  return (val * 100).toFixed(1) + ' %';
}

// ===================== COMPOSANT PRINCIPAL =====================

function ExecBudgetaire_Projet({ entiteName, entiteSigle = '', entiteAdresse = '', entiteNif = '', typeActivite, entiteId, offre = 'comptabilite', onBack }: EtatBaseProps): React.ReactElement {
  const { exercices, selectedExercice, setSelectedExercice } = useExercicesQuery(entiteId);
  const [lignes, setLignes] = useState<BudgetLigne[]>([]);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [pdfBlob, setPdfBlob] = useState<Blob | null>(null);

  const tableRef = useRef<HTMLDivElement>(null);

  // Storage key
  const storageKey = useCallback((): string | null => {
    if (!entiteId || !selectedExercice) return null;
    return `execBudgetaire_${entiteId}_${selectedExercice.id}`;
  }, [entiteId, selectedExercice]);

  // Load saved data from localStorage
  useEffect(() => {
    const key = storageKey();
    if (!key) return;
    try {
      const saved = localStorage.getItem(key);
      if (saved) {
        const parsed: BudgetLigne[] = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setLignes(parsed);
          return;
        }
      }
    } catch {
      // ignore parse errors
    }
    // Default: start with one empty line
    setLignes([{ code: '', libelle: '', budget: 0, decaissement: 0, engagement: 0 }]);
  }, [storageKey]);

  // Save to localStorage whenever lignes change
  useEffect(() => {
    const key = storageKey();
    if (!key) return;
    try {
      localStorage.setItem(key, JSON.stringify(lignes));
    } catch {
      // ignore quota errors
    }
  }, [lignes, storageKey]);

  // Add a new budget line
  const addLigne = (): void => {
    setLignes(prev => [...prev, { code: '', libelle: '', budget: 0, decaissement: 0, engagement: 0 }]);
  };

  // Remove a budget line
  const removeLigne = (index: number): void => {
    setLignes(prev => prev.filter((_: BudgetLigne, i: number) => i !== index));
  };

  // Update a field in a ligne
  const updateLigne = (index: number, field: keyof BudgetLigne, value: string): void => {
    setLignes(prev => prev.map((l: BudgetLigne, i: number) => {
      if (i !== index) return l;
      if (field === 'code' || field === 'libelle') {
        return { ...l, [field]: value };
      }
      return { ...l, [field]: parseFloat(value) || 0 };
    }));
  };

  // Computed values per line
  const computedLignes: ComputedBudgetLigne[] = lignes.map((l: BudgetLigne) => {
    const realisation = (l.decaissement || 0) + (l.engagement || 0);
    const creditDispo = (l.budget || 0) - realisation;
    const execPct = (l.budget || 0) !== 0 ? realisation / l.budget : null;
    return { ...l, realisation, creditDispo, execPct };
  });

  // Totals
  const totals: BudgetTotals = computedLignes.reduce((acc: BudgetTotals, l: ComputedBudgetLigne) => ({
    budget: acc.budget + (l.budget || 0),
    decaissement: acc.decaissement + (l.decaissement || 0),
    engagement: acc.engagement + (l.engagement || 0),
    realisation: acc.realisation + (l.realisation || 0),
    creditDispo: acc.creditDispo + (l.creditDispo || 0),
    execPct: null,
  }), { budget: 0, decaissement: 0, engagement: 0, realisation: 0, creditDispo: 0, execPct: null });
  totals.execPct = totals.budget !== 0 ? totals.realisation / totals.budget : null;

  // PDF generation
  const generatePDF = async (): Promise<void> => {
    if (!tableRef.current) return;
    const canvas = await html2canvas(tableRef.current, { scale: 2, useCORS: true, backgroundColor: '#fff' });
    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    const pageW = pdf.internal.pageSize.getWidth();
    const pageH = pdf.internal.pageSize.getHeight();
    const margin = 10;
    const imgW = pageW - margin * 2;
    const imgH = (canvas.height * imgW) / canvas.width;

    let yPos = margin;
    if (imgH <= pageH - margin * 2) {
      pdf.addImage(imgData, 'PNG', margin, yPos, imgW, imgH);
    } else {
      const pageContentH = pageH - margin * 2;
      let srcY = 0;
      while (srcY < canvas.height) {
        const sliceH = Math.min((pageContentH / imgW) * canvas.width, canvas.height - srcY);
        const sliceCanvas = document.createElement('canvas');
        sliceCanvas.width = canvas.width;
        sliceCanvas.height = sliceH;
        const ctx = sliceCanvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(canvas, 0, srcY, canvas.width, sliceH, 0, 0, canvas.width, sliceH);
        }
        const sliceData = sliceCanvas.toDataURL('image/png');
        const sliceImgH = (sliceH * imgW) / canvas.width;
        if (srcY > 0) pdf.addPage();
        pdf.addImage(sliceData, 'PNG', margin, margin, imgW, sliceImgH);
        srcY += sliceH;
      }
    }
    const blob = pdf.output('blob');
    setPdfBlob(blob);
    setPreviewUrl(URL.createObjectURL(blob));
  };

  const handlePrint = (): void => {
    if (previewUrl) window.open(previewUrl, '_blank');
  };

  const handleDownload = (): void => {
    if (!pdfBlob) return;
    const url = URL.createObjectURL(pdfBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ExecBudgetaire_${entiteName || 'projet'}_${selectedExercice?.annee || ''}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const annee = selectedExercice?.annee || new Date().getFullYear();

  return (
    <div className="bilan-wrapper">
      {/* Toolbar */}
      <div className="bilan-toolbar">
        <div className="bilan-toolbar-left">
          {onBack && (
            <button onClick={onBack} className="bilan-back-btn">
              <LuArrowLeft size={16} />
            </button>
          )}
          <h2>Tableau d'Exécution Budgétaire</h2>
        </div>
        <div className="bilan-toolbar-right">
          <button onClick={addLigne} className="bilan-export-btn" title="Ajouter une ligne">
            <LuPlus size={14} /> Ajouter ligne
          </button>
          <button onClick={generatePDF} className="bilan-export-btn">
            <LuEye size={14} /> Aperçu PDF
          </button>
          {pdfBlob && (
            <>
              <button onClick={handlePrint} className="bilan-export-btn secondary"><LuPrinter size={14} /> Imprimer</button>
              <button onClick={handleDownload} className="bilan-export-btn secondary"><LuDownload size={14} /> Télécharger</button>
            </>
          )}
        </div>
      </div>

      {/* Exercice select */}
      <div className="bilan-exercice-select">
        <span>Exercice :</span>
        <select
          value={selectedExercice?.id || ''}
          onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
            const ex = exercices.find((x: Exercice) => x.id === parseInt(e.target.value));
            setSelectedExercice(ex || null);
          }}
        >
          {exercices.map((ex: Exercice) => (
            <option key={ex.id} value={ex.id}>Exercice {ex.annee}</option>
          ))}
        </select>
      </div>

      {/* No data alert */}
      {computedLignes.length === 0 && (
        <div className="bilan-alert">
          Aucune ligne budgétaire. Cliquez sur « Ajouter ligne » pour commencer.
        </div>
      )}

      {/* A4 Page — Landscape */}
      <div className="a4-page" ref={tableRef} style={{ width: '297mm', minHeight: '210mm' }}>
        {/* Official header */}
        <div className="etat-header-officiel">
          <div className="etat-header-titre">EXECUTION BUDGETAIRE DU PROJET</div>
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

        {/* Table */}
        <table className="bilan-table">
          <thead>
            <tr>
              <th className="col-ref"></th>
              <th>Code</th>
              <th className="col-libelle">Libellé</th>
              <th className="col-montant">Budget de{'\n'}l'exercice (1)</th>
              <th className="col-montant">Décaissement{'\n'}(2)</th>
              <th className="col-montant">Engagement{'\n'}(3)</th>
              <th className="col-montant">Réalisation{'\n'}(4 = 2+3)</th>
              <th className="col-montant">Crédit{'\n'}Disponible{'\n'}(5 = 1-4)</th>
              <th className="col-montant">Exécution{'\n'}Budget (%){'\n'}(4/1)</th>
            </tr>
          </thead>
          <tbody>
            {computedLignes.map((l: ComputedBudgetLigne, i: number) => (
              <tr key={i} className="row-indent">
                <td className="col-ref">
                  <button onClick={() => removeLigne(i)} className="bilan-back-btn" title="Supprimer cette ligne">
                    <LuTrash2 size={14} />
                  </button>
                </td>
                <td>
                  <input
                    type="text"
                    value={l.code}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateLigne(i, 'code', e.target.value)}
                    placeholder="Code"
                  />
                </td>
                <td>
                  <input
                    type="text"
                    value={l.libelle}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateLigne(i, 'libelle', e.target.value)}
                    placeholder="Libellé de la ligne budgétaire"
                  />
                </td>
                <td className="col-montant">
                  <input
                    type="number"
                    value={l.budget || ''}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateLigne(i, 'budget', e.target.value)}
                    placeholder="0"
                  />
                </td>
                <td className="col-montant">
                  <input
                    type="number"
                    value={l.decaissement || ''}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateLigne(i, 'decaissement', e.target.value)}
                    placeholder="0"
                  />
                </td>
                <td className="col-montant">
                  <input
                    type="number"
                    value={l.engagement || ''}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateLigne(i, 'engagement', e.target.value)}
                    placeholder="0"
                  />
                </td>
                <td className="col-montant">{formatMontant(l.realisation)}</td>
                <td className="col-montant">{formatMontant(l.creditDispo)}</td>
                <td className="col-montant">{formatPourcent(l.execPct)}</td>
              </tr>
            ))}
            {/* TOTAL row */}
            <tr className="row-total">
              <td className="col-ref"></td>
              <td></td>
              <td>TOTAL</td>
              <td className="col-montant">{formatMontant(totals.budget)}</td>
              <td className="col-montant">{formatMontant(totals.decaissement)}</td>
              <td className="col-montant">{formatMontant(totals.engagement)}</td>
              <td className="col-montant">{formatMontant(totals.realisation)}</td>
              <td className="col-montant">{formatMontant(totals.creditDispo)}</td>
              <td className="col-montant">{formatPourcent(totals.execPct)}</td>
            </tr>
          </tbody>
        </table>

        {/* Footer */}
        <div className="bilan-footer">
          <span>NORMX Etats — SYCEBNL Projet</span>
          <span>Exercice clos le 31/12/{annee}</span>
        </div>
      </div>

      {/* PDF Preview modal */}
      {previewUrl && (
        <div className="pdf-preview-overlay">
          <div className="pdf-preview-modal">
            <div className="pdf-preview-header">
              <h3>Aperçu — Tableau d'Exécution Budgétaire</h3>
              <div className="pdf-preview-actions">
                <button onClick={handlePrint} className="pdf-action-btn"><LuPrinter size={14} /> Imprimer</button>
                <button onClick={handleDownload} className="pdf-action-btn primary"><LuDownload size={14} /> Télécharger</button>
                <button onClick={() => { setPreviewUrl(null); setPdfBlob(null); }} className="pdf-close-btn"><LuX size={16} /></button>
              </div>
            </div>
            <div className="pdf-preview-body">
              <iframe src={previewUrl} className="pdf-preview-iframe" title="Aperçu Exécution Budgétaire" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ExecBudgetaire_Projet;
