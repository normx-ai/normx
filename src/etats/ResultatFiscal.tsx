import React, { useState, useRef, useEffect, useCallback } from 'react';
import { clientFetch } from '../lib/api';
import { api } from '../lib/apiEndpoints';
import { useExercicesQuery } from '../hooks/useExercicesQuery';
import { LuDownload, LuArrowLeft, LuTriangleAlert, LuEye, LuX, LuPrinter, LuSheet, LuSave } from 'react-icons/lu';
import { exportToExcel, buildExcelPreviewHtml } from '../lib/excelExport';
import type { ExcelRow, ExcelExportOptions } from '../lib/excelExport';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import './BilanSYCEBNL.css';
import type { BalanceLigne, EtatBaseProps } from '../types';
import {
  TAUX_IS_NORMAL,
  TAUX_IS_ETRANGER,
  TAUX_MIN_IS,
  TAUX_IBA,
  TAUX_MIN_IBA,
  OPTIONS_TAUX_IS,
} from '../constants/taxation';
import {
  BalanceApiRow,
  DEDUCTIONS_TYPES,
  LigneARD,
  LigneDeficit,
  LigneReintegration,
  ModeImpot,
  REINTEGRATIONS_TYPES,
  buildDefaultDeductions,
  buildDefaultDeficits,
  buildDefaultReintegrations,
  computeResultatFiscal,
  formatMontant,
  modeImpotParDefaut,
} from './resultat/resultatFiscalData';
import { LignesEditor } from './resultat/LignesEditor';
import { ResultatFiscalTable } from './resultat/ResultatFiscalTable';

void TAUX_IS_ETRANGER;

let nextId = 1;

function ResultatFiscal({ entiteName, entiteSigle = '', entiteAdresse = '', entiteNif = '', typeActivite, entiteId, offre = 'comptabilite', onBack }: EtatBaseProps): React.JSX.Element {
  const { exercices, selectedExercice, setSelectedExercice } = useExercicesQuery(entiteId);
  const [lignesN, setLignesN] = useState<BalanceLigne[]>([]);
  const [balanceFound, setBalanceFound] = useState(false);
  const [loading, setLoading] = useState(false);
  const [sourceUsed, setSourceUsed] = useState('');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [pdfBlob, setPdfBlob] = useState<Blob | null>(null);
  const [excelPreviewHtml, setExcelPreviewHtml] = useState<string | null>(null);
  const balanceSource: 'ecritures' | 'import' = offre === 'comptabilite' ? 'ecritures' : 'import';

  const regimeParDefaut: 'is' | 'iba' = typeActivite === 'entreprise' ? 'is' : 'is';
  const [regimeFiscal, setRegimeFiscal] = useState<'is' | 'iba'>(regimeParDefaut);
  const [tauxIS, setTauxIS] = useState(TAUX_IS_NORMAL);

  const [reintegrations, setReintegrations] = useState<LigneReintegration[]>([]);
  const [deductions, setDeductions] = useState<LigneReintegration[]>([]);
  const [deficits, setDeficits] = useState<LigneDeficit[]>([]);
  const [ard, setArd] = useState<LigneARD>({ solde_debut: 0, ard_exercice: 0, ard_utilises: 0 });
  const [modeImpot, setModeImpot] = useState<ModeImpot>('minimum_perception');
  const [acompteIS, setAcompteIS] = useState(0);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  const pageRef = useRef<HTMLDivElement>(null);

  const loadBalanceFromEcritures = async (entId: number, exId: number): Promise<BalanceLigne[]> => {
    const res = await clientFetch(api.ecritures.balance(entId, exId));
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

  const loadBalance = useCallback(async (): Promise<void> => {
    if (!entiteId || !selectedExercice) return;
    setLoading(true);
    try {
      let result: BalanceLigne[] = [];
      let source = '';
      if (balanceSource === 'ecritures') {
        result = await loadBalanceFromEcritures(entiteId, selectedExercice.id);
        source = 'Ecritures comptables';
      } else {
        const res = await clientFetch(api.balance.byExercice(entiteId, selectedExercice.id, 'N'));
        const data = await res.json();
        result = data.lignes || [];
        source = 'Import balance';
      }
      setLignesN(result);
      setBalanceFound(result.length > 0);
      setSourceUsed(source);
    } catch {
      // silently ignored
    } finally {
      setLoading(false);
    }
  }, [entiteId, selectedExercice, balanceSource]);

  useEffect(() => { loadBalance(); }, [loadBalance]);

  // Charger les lignes persistées pour l'exercice (4 types : reint, ded, déficit, ARD)
  useEffect(() => {
    if (!selectedExercice) {
      setReintegrations([]);
      setDeductions([]);
      setDeficits([]);
      setArd({ solde_debut: 0, ard_exercice: 0, ard_utilises: 0 });
      setModeImpot('minimum_perception');
      setAcompteIS(0);
      setSavedAt(null);
      return;
    }
    // Mode par défaut selon l'année de l'exercice (≥ 2026 → minimum, sinon acompte)
    setModeImpot(modeImpotParDefaut(selectedExercice.annee));
    setAcompteIS(0);
    let cancelled = false;
    (async () => {
      try {
        const res = await clientFetch(api.resultatFiscal.lignes(selectedExercice.id));
        if (!res.ok || cancelled) return;
        type LigneApi = {
          id: number;
          type: 'reintegration' | 'deduction' | 'deficit_reportable' | 'ard';
          libelle: string;
          montant: number;
          article: string;
          metadata?: Record<string, unknown>;
        };
        const data: { lignes: LigneApi[] } = await res.json();
        const reints: LigneReintegration[] = [];
        const deds: LigneReintegration[] = [];
        const defs: LigneDeficit[] = [];
        const ardLoaded: LigneARD = { solde_debut: 0, ard_exercice: 0, ard_utilises: 0 };
        let maxId = 0;
        for (const l of data.lignes) {
          if (l.id > maxId) maxId = l.id;
          if (l.type === 'reintegration' || l.type === 'deduction') {
            const ligne: LigneReintegration = { id: l.id, libelle: l.libelle, montant: Number(l.montant) || 0, article: l.article };
            if (l.type === 'reintegration') reints.push(ligne); else deds.push(ligne);
          } else if (l.type === 'deficit_reportable') {
            const meta = l.metadata || {};
            defs.push({
              id: l.id,
              annee_origine: Number(meta['annee_origine']) || (selectedExercice.annee - 1),
              montant_reportable: Number(meta['montant_reportable']) || 0,
              montant_impute: Number(l.montant) || 0,
            });
          } else if (l.type === 'ard') {
            const sousType = (l.metadata || {})['sous_type'] as string | undefined;
            if (sousType === 'solde_debut') ardLoaded.solde_debut = Number(l.montant) || 0;
            else if (sousType === 'exercice') ardLoaded.ard_exercice = Number(l.montant) || 0;
            else if (sousType === 'utilises') ardLoaded.ard_utilises = Number(l.montant) || 0;
            else if (sousType === 'mode_impot') {
              const mode = (l.metadata || {})['mode'] as string | undefined;
              if (mode === 'minimum_perception' || mode === 'acompte_is') setModeImpot(mode);
            }
            else if (sousType === 'acompte_is') setAcompteIS(Number(l.montant) || 0);
          }
        }
        if (cancelled) return;
        nextId = Math.max(nextId, maxId + 1);
        // Si rien de persisté pour cet exercice → initialiser avec les défauts du formulaire IS-2
        if (reints.length === 0) {
          const built = buildDefaultReintegrations(nextId);
          nextId += built.length;
          setReintegrations(built);
        } else {
          setReintegrations(reints);
        }
        if (deds.length === 0) {
          const built = buildDefaultDeductions(nextId);
          nextId += built.length;
          setDeductions(built);
        } else {
          setDeductions(deds);
        }
        if (defs.length === 0) {
          const built = buildDefaultDeficits(nextId, selectedExercice.annee);
          nextId += built.length;
          setDeficits(built);
        } else {
          // Tri par ancienneté décroissante (N-3 d'abord)
          defs.sort((a, b) => a.annee_origine - b.annee_origine);
          setDeficits(defs);
        }
        setArd(ardLoaded);
        setSavedAt(null);
      } catch {
        // silently ignore
      }
    })();
    return () => { cancelled = true; };
  }, [selectedExercice]);

  const saveLignes = async (): Promise<void> => {
    if (!selectedExercice) return;
    setSaving(true);
    setSaveError(null);
    try {
      const payload = {
        lignes: [
          ...reintegrations.map(r => ({ type: 'reintegration' as const, libelle: r.libelle, montant: r.montant, article: r.article })),
          ...deductions.map(d => ({ type: 'deduction' as const, libelle: d.libelle, montant: d.montant, article: d.article })),
          ...deficits.map(d => ({
            type: 'deficit_reportable' as const,
            libelle: 'Déficit ' + d.annee_origine,
            montant: d.montant_impute,
            article: 'Art. 15-bis',
            metadata: { annee_origine: d.annee_origine, montant_reportable: d.montant_reportable },
          })),
          { type: 'ard' as const, libelle: 'ARD solde début', montant: ard.solde_debut, article: '', metadata: { sous_type: 'solde_debut' } },
          { type: 'ard' as const, libelle: 'ARD exercice', montant: ard.ard_exercice, article: '', metadata: { sous_type: 'exercice' } },
          { type: 'ard' as const, libelle: 'ARD utilisés', montant: ard.ard_utilises, article: '', metadata: { sous_type: 'utilises' } },
          { type: 'ard' as const, libelle: 'Mode impôt', montant: 0, article: '', metadata: { sous_type: 'mode_impot', mode: modeImpot } },
          { type: 'ard' as const, libelle: 'Acompte IS', montant: acompteIS, article: '', metadata: { sous_type: 'acompte_is' } },
        ],
      };
      const res = await clientFetch(api.resultatFiscal.lignes(selectedExercice.id), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Erreur sauvegarde');
      }
      type LigneApi = {
        id: number;
        type: 'reintegration' | 'deduction' | 'deficit_reportable' | 'ard';
        libelle: string;
        montant: number;
        article: string;
        metadata?: Record<string, unknown>;
      };
      const data: { lignes: LigneApi[] } = await res.json();
      const reints: LigneReintegration[] = [];
      const deds: LigneReintegration[] = [];
      const defs: LigneDeficit[] = [];
      const ardSaved: LigneARD = { solde_debut: 0, ard_exercice: 0, ard_utilises: 0 };
      let maxId = 0;
      for (const l of data.lignes) {
        if (l.id > maxId) maxId = l.id;
        if (l.type === 'reintegration' || l.type === 'deduction') {
          const ligne: LigneReintegration = { id: l.id, libelle: l.libelle, montant: Number(l.montant) || 0, article: l.article };
          if (l.type === 'reintegration') reints.push(ligne); else deds.push(ligne);
        } else if (l.type === 'deficit_reportable') {
          const meta = l.metadata || {};
          defs.push({
            id: l.id,
            annee_origine: Number(meta['annee_origine']) || (selectedExercice.annee - 1),
            montant_reportable: Number(meta['montant_reportable']) || 0,
            montant_impute: Number(l.montant) || 0,
          });
        } else if (l.type === 'ard') {
          const sousType = (l.metadata || {})['sous_type'] as string | undefined;
          if (sousType === 'solde_debut') ardSaved.solde_debut = Number(l.montant) || 0;
          else if (sousType === 'exercice') ardSaved.ard_exercice = Number(l.montant) || 0;
          else if (sousType === 'utilises') ardSaved.ard_utilises = Number(l.montant) || 0;
          else if (sousType === 'mode_impot') {
            const mode = (l.metadata || {})['mode'] as string | undefined;
            if (mode === 'minimum_perception' || mode === 'acompte_is') setModeImpot(mode);
          }
          else if (sousType === 'acompte_is') setAcompteIS(Number(l.montant) || 0);
        }
      }
      nextId = Math.max(nextId, maxId + 1);
      defs.sort((a, b) => a.annee_origine - b.annee_origine);
      setReintegrations(reints);
      setDeductions(deds);
      setDeficits(defs);
      setArd(ardSaved);
      setSavedAt(new Date());
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Erreur sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  const updateDeficit = (id: number, field: 'annee_origine' | 'montant_reportable' | 'montant_impute', value: number): void => {
    setDeficits(prev => prev.map(d => d.id === id ? { ...d, [field]: value } : d));
  };
  const updateArd = (field: 'solde_debut' | 'ard_exercice' | 'ard_utilises', value: number): void => {
    setArd(prev => ({ ...prev, [field]: value }));
  };

  const calc = computeResultatFiscal(lignesN, reintegrations, deductions, deficits, ard, regimeFiscal, tauxIS, TAUX_IBA, TAUX_MIN_IS, TAUX_MIN_IBA, modeImpot, acompteIS);
  const annee = selectedExercice ? selectedExercice.annee : new Date().getFullYear();
  const duree = selectedExercice?.duree_mois || 12;

  const addReintegration = (type?: { libelle: string; article: string }): void => {
    setReintegrations(prev => [...prev, { id: nextId++, libelle: type?.libelle || '', montant: 0, article: type?.article || '' }]);
  };
  const removeReintegration = (id: number): void => {
    setReintegrations(prev => prev.filter(r => r.id !== id));
  };
  const updateReintegration = (id: number, field: 'libelle' | 'montant' | 'article', value: string | number): void => {
    setReintegrations(prev => prev.map(r => r.id === id ? { ...r, [field]: value } : r));
  };
  const addDeduction = (type?: { libelle: string; article: string }): void => {
    setDeductions(prev => [...prev, { id: nextId++, libelle: type?.libelle || '', montant: 0, article: type?.article || '' }]);
  };
  const removeDeduction = (id: number): void => {
    setDeductions(prev => prev.filter(d => d.id !== id));
  };
  const updateDeduction = (id: number, field: 'libelle' | 'montant' | 'article', value: string | number): void => {
    setDeductions(prev => prev.map(d => d.id === id ? { ...d, [field]: value } : d));
  };

  const buildExcelOptions = (): ExcelExportOptions => {
    const rows: ExcelRow[] = [];
    const fmt = (v: number): number => Math.round(v);

    rows.push({ libelle: 'I. RESULTAT COMPTABLE DE L\'EXERCICE', ref: 'compte 85', values: [fmt(calc.resultatComptable)], bold: true });

    rows.push({ libelle: 'II. REINTEGRATIONS FISCALES', values: [''], bold: true });
    for (const r of reintegrations) {
      rows.push({ libelle: r.libelle, ref: r.article, values: [fmt(r.montant)] });
    }
    rows.push({ libelle: 'TOTAL REINTEGRATIONS (II)', values: [fmt(calc.totalReintegrations)], bold: true });

    rows.push({ libelle: 'III. DEDUCTIONS FISCALES', values: [''], bold: true });
    for (const d of deductions) {
      rows.push({ libelle: d.libelle, ref: d.article, values: [fmt(d.montant)] });
    }
    rows.push({ libelle: 'TOTAL DEDUCTIONS (III)', values: [fmt(calc.totalDeductions)], bold: true });

    rows.push({ libelle: 'IV. RESULTAT NET FISCAL DE L\'EXERCICE', values: [fmt(calc.resultatFiscal)], bold: true });

    rows.push({ libelle: 'V. REPORTS DEFICITAIRES', values: [''], bold: true });
    for (const d of deficits) {
      rows.push({ libelle: 'Déficit ' + d.annee_origine + ' (reportable: ' + fmt(d.montant_reportable).toLocaleString() + ')', ref: 'Art. 15-bis', values: [fmt(d.montant_impute)] });
    }
    rows.push({ libelle: 'TOTAL DEFICITS IMPUTES', values: [fmt(calc.totalDeficitsImputes)], bold: true });

    rows.push({ libelle: 'VI. RESULTAT NET FISCAL DEFINITIF', values: [fmt(calc.resultatFiscalDefinitif)], bold: true });

    rows.push({ libelle: 'VII. AMORTISSEMENTS REPUTES DIFFERES (ARD)', values: [''], bold: true });
    rows.push({ libelle: 'Solde des ARD en début d\'exercice', values: [fmt(ard.solde_debut)] });
    rows.push({ libelle: 'ARD de l\'exercice', values: [fmt(ard.ard_exercice)] });
    rows.push({ libelle: 'ARD utilisés dans l\'exercice', values: [fmt(ard.ard_utilises)] });
    rows.push({ libelle: 'Solde des ARD en fin d\'exercice', values: [fmt(calc.ardSoldeFin)], bold: true });

    rows.push({ libelle: 'VIII. LIQUIDATION DE L\'IMPOT', values: [''], bold: true });
    rows.push({ libelle: (regimeFiscal === 'is' ? 'IS' : 'IBA') + ' brut', ref: regimeFiscal === 'is' ? 'Art. 10' : 'Art. 95', values: [fmt(calc.impotBrut)] });
    rows.push({ libelle: 'Minimum de perception', ref: regimeFiscal === 'is' ? 'Art. 86-C' : 'Art. 95', values: [fmt(calc.minimumPerception)] });
    rows.push({ libelle: (regimeFiscal === 'is' ? 'IS' : 'IBA') + ' RETENU', values: [fmt(calc.impotRetenu)], bold: true });

    rows.push({ libelle: 'IX. RESULTAT NET APRES IMPOT', values: [''], bold: true });
    rows.push({ libelle: 'BENEFICE NET', values: [fmt(calc.beneficeNet)], bold: true });

    return {
      filename: `Resultat_Fiscal_${annee}`,
      sheetName: 'Resultat Fiscal',
      title: 'DETERMINATION DU RESULTAT FISCAL',
      subtitle: `Regime : ${regimeFiscal === 'is' ? 'IS' : 'IBA'}`,
      headers: ['MONTANT (FCFA)'],
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
    a.download = 'Resultat_Fiscal_' + annee + '.pdf';
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
          <h2>Resultat Fiscal — CGI Congo 2026</h2>
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
          <button className="bilan-export-btn" onClick={async () => { const pdf = await generatePDF(); pdf.save('Resultat_Fiscal_' + annee + '.pdf'); }}><LuDownload /> Exporter PDF</button>
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

        <label style={{ marginLeft: 16 }}>Regime :</label>
        <span style={{ fontSize: 12, fontWeight: 600, color: '#1e3a5f', marginRight: 4 }}>
          {regimeFiscal === 'is' ? 'IS — Impot sur les Societes' : 'IBA — Impot sur les Benefices d\'Affaires'}
        </span>
        <select value={regimeFiscal} onChange={(e) => setRegimeFiscal(e.target.value as 'is' | 'iba')} style={{ fontSize: 11, padding: '1px 4px', color: '#6b7280' }}>
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
        {modeImpot === 'acompte_is' && (
          <>
            <label style={{ marginLeft: 8 }}>Acomptes versés :</label>
            <input type="number" value={acompteIS || ''} onChange={(e) => setAcompteIS(parseFloat(e.target.value) || 0)}
              style={{ fontSize: 11, width: 110, padding: '1px 4px', textAlign: 'right' }}
              placeholder="0" />
          </>
        )}

        {sourceUsed && <span style={{ marginLeft: 16, fontSize: 12, color: '#6b7280', fontStyle: 'italic' }}>Source : {sourceUsed}</span>}
        <span>(Montants en FCFA)</span>
      </div>

      {!balanceFound && !loading && (
        <div className="bilan-alert">
          <LuTriangleAlert /> Aucune donnee pour cet exercice. {balanceSource === 'ecritures' ? 'Saisissez des ecritures comptables.' : 'Importez une balance CSV.'}
        </div>
      )}

      {loading && <div style={{ padding: 20, color: '#888' }}>Chargement...</div>}

      {balanceFound && !loading && (
        <>
          <div style={{ display: 'flex', gap: 16, marginBottom: 16, flexWrap: 'wrap' }}>
            <LignesEditor
              title="II. Réintégrations (+)"
              color="#dc2626"
              types={REINTEGRATIONS_TYPES}
              lignes={reintegrations}
              total={calc.totalReintegrations}
              addLigne={addReintegration}
              updateLigne={updateReintegration}
              removeLigne={removeReintegration}
              emptyMsg="Aucune réintégration saisie"
              addPlaceholder="+ Ajouter une réintégration libre..."
            />
            <LignesEditor
              title="III. Déductions (-)"
              color="#16a34a"
              types={DEDUCTIONS_TYPES}
              lignes={deductions}
              total={calc.totalDeductions}
              addLigne={addDeduction}
              updateLigne={updateDeduction}
              removeLigne={removeDeduction}
              emptyMsg="Aucune déduction saisie"
              addPlaceholder="+ Ajouter une déduction libre..."
            />
          </div>

          <div style={{ display: 'flex', gap: 16, marginBottom: 16, flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: 480, background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, padding: 12 }}>
              <h3 style={{ margin: '0 0 8px', fontSize: 13, color: '#7c3aed' }}>V. Reports déficitaires</h3>
              <table style={{ width: '100%', fontSize: 11, borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#f3f4f6' }}>
                    <th style={{ padding: '4px 6px', textAlign: 'left' }}>Année origine</th>
                    <th style={{ padding: '4px 6px', textAlign: 'right' }}>Reportable</th>
                    <th style={{ padding: '4px 6px', textAlign: 'right' }}>Imputé sur exercice</th>
                  </tr>
                </thead>
                <tbody>
                  {deficits.map(d => (
                    <tr key={d.id}>
                      <td style={{ padding: '3px 6px' }}>
                        <input type="number" value={d.annee_origine} onChange={e => updateDeficit(d.id, 'annee_origine', parseInt(e.target.value) || 0)}
                          style={{ width: 70, fontSize: 11, padding: '2px 4px', border: '1px solid #ddd', borderRadius: 3 }} />
                      </td>
                      <td style={{ padding: '3px 6px', textAlign: 'right' }}>
                        <input type="number" value={d.montant_reportable || ''} onChange={e => updateDeficit(d.id, 'montant_reportable', parseFloat(e.target.value) || 0)}
                          style={{ width: 110, textAlign: 'right', fontSize: 11, padding: '2px 4px', border: '1px solid #ddd', borderRadius: 3 }} />
                      </td>
                      <td style={{ padding: '3px 6px', textAlign: 'right' }}>
                        <input type="number" value={d.montant_impute || ''} onChange={e => updateDeficit(d.id, 'montant_impute', parseFloat(e.target.value) || 0)}
                          style={{ width: 110, textAlign: 'right', fontSize: 11, padding: '2px 4px', border: '1px solid #ddd', borderRadius: 3 }} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div style={{ textAlign: 'right', fontWeight: 700, fontSize: 12, marginTop: 4, color: '#7c3aed' }}>
                Total imputé : {formatMontant(calc.totalDeficitsImputes)} FCFA
              </div>
            </div>

            <div style={{ flex: 1, minWidth: 380, background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, padding: 12 }}>
              <h3 style={{ margin: '0 0 8px', fontSize: 13, color: '#0891b2' }}>VII. Amortissements réputés différés (ARD)</h3>
              <table style={{ width: '100%', fontSize: 11, borderCollapse: 'collapse' }}>
                <tbody>
                  <tr><td style={{ padding: '3px 6px' }}>Solde ARD en début d&apos;exercice</td><td style={{ padding: '3px 6px', textAlign: 'right' }}>
                    <input type="number" value={ard.solde_debut || ''} onChange={e => updateArd('solde_debut', parseFloat(e.target.value) || 0)}
                      style={{ width: 130, textAlign: 'right', fontSize: 11, padding: '2px 4px', border: '1px solid #ddd', borderRadius: 3 }} /></td></tr>
                  <tr><td style={{ padding: '3px 6px' }}>ARD de l&apos;exercice</td><td style={{ padding: '3px 6px', textAlign: 'right' }}>
                    <input type="number" value={ard.ard_exercice || ''} onChange={e => updateArd('ard_exercice', parseFloat(e.target.value) || 0)}
                      style={{ width: 130, textAlign: 'right', fontSize: 11, padding: '2px 4px', border: '1px solid #ddd', borderRadius: 3 }} /></td></tr>
                  <tr><td style={{ padding: '3px 6px' }}>ARD utilisés dans l&apos;exercice</td><td style={{ padding: '3px 6px', textAlign: 'right' }}>
                    <input type="number" value={ard.ard_utilises || ''} onChange={e => updateArd('ard_utilises', parseFloat(e.target.value) || 0)}
                      style={{ width: 130, textAlign: 'right', fontSize: 11, padding: '2px 4px', border: '1px solid #ddd', borderRadius: 3 }} /></td></tr>
                  <tr style={{ borderTop: '1px solid #ccc', fontWeight: 700, color: '#0891b2' }}>
                    <td style={{ padding: '3px 6px' }}>Solde ARD en fin d&apos;exercice</td>
                    <td style={{ padding: '3px 6px', textAlign: 'right' }}>{formatMontant(calc.ardSoldeFin)} FCFA</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      <div className="a4-page" ref={pageRef}>
        <div className="etat-header-officiel">
          <div className="etat-header-titre">DETERMINATION DU RESULTAT FISCAL</div>
          <div className="etat-header-grid">
            <div className="etat-header-row">
              <span className="etat-header-label">Denomination :</span>
              <span className="etat-header-value">{entiteName || ''}</span>
              <span className="etat-header-label">Sigle :</span>
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
              <span className="etat-header-label">Regime :</span>
              <span className="etat-header-value">{regimeFiscal === 'is' ? 'IS' : 'IBA'}</span>
            </div>
          </div>
        </div>

        <ResultatFiscalTable
          calc={calc}
          reintegrations={reintegrations}
          deductions={deductions}
          deficits={deficits}
          ard={ard}
          regimeFiscal={regimeFiscal}
        />

        <div className="bilan-footer">
          <span>NORMX Etats — Resultat Fiscal CGI Congo 2026</span>
          <span>Exercice clos le 31/12/{annee}</span>
        </div>
      </div>

      {previewUrl && (
        <div className="pdf-preview-overlay" onClick={closePreview}>
          <div className="pdf-preview-modal" onClick={(e: React.MouseEvent<HTMLDivElement>) => e.stopPropagation()}>
            <div className="pdf-preview-header">
              <h3>Apercu — Resultat Fiscal {annee}</h3>
              <div className="pdf-preview-actions">
                <button className="pdf-action-btn" onClick={printPDF}><LuPrinter /> Imprimer</button>
                <button className="pdf-action-btn primary" onClick={downloadPDF}><LuDownload /> Telecharger</button>
                <button className="pdf-close-btn" onClick={closePreview}><LuX /></button>
              </div>
            </div>
            <div className="pdf-preview-body">
              <iframe src={previewUrl} title="Apercu Resultat Fiscal PDF" className="pdf-preview-iframe" />
            </div>
          </div>
        </div>
      )}

      {excelPreviewHtml && (
        <div className="pdf-preview-overlay" onClick={() => setExcelPreviewHtml(null)}>
          <div className="pdf-preview-modal" onClick={(e: React.MouseEvent<HTMLDivElement>) => e.stopPropagation()}>
            <div className="pdf-preview-header">
              <h3>Aperçu — Résultat Fiscal {annee}</h3>
              <div className="pdf-preview-actions">
                <button className="pdf-action-btn" onClick={() => { const w = window.open('', '_blank'); if (w) { w.document.write(`<html><head><title>Résultat Fiscal ${annee}</title></head><body>${excelPreviewHtml}</body></html>`); w.document.close(); w.print(); } }}>
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

export default ResultatFiscal;
