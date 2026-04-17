import React, { useState, useRef, useEffect, useCallback } from 'react';
import { clientFetch } from '../lib/api';
import { useExercicesQuery } from '../hooks/useExercicesQuery';
import { LuDownload, LuArrowLeft, LuTriangleAlert, LuEye, LuX, LuPrinter, LuPlus, LuTrash2 } from 'react-icons/lu';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import './BilanSYCEBNL.css';
import type { BalanceLigne, Exercice, EtatBaseProps } from '../types';

// ===================== RESULTAT FISCAL — CGI Congo 2026 (Art. 6-92J IS / Art. 93-102 IBA) =====================

// Taux IS (Art. 10 CGI 2026)
const TAUX_IS_NORMAL = 0.28;
const TAUX_IS_ECOLES = 0.25;
const TAUX_IS_ETRANGER = 0.33;

// Minimum de perception IS (Art. 86-C)
const TAUX_MIN_IS = 0.01;

// Taux IBA (Art. 95)
const TAUX_IBA = 0.30;
const TAUX_MIN_IBA = 0.015;

// Prefixes comptes
const PRODUITS_EXPL_PREFIXES = ['70', '71', '72', '73', '75', '78', '79'];
const PRODUITS_FIN_PREFIXES = ['77'];
const PRODUITS_HAO_PREFIXES = ['82', '84', '86', '88'];
const CHARGES_EXPL_PREFIXES = ['60', '61', '62', '63', '64', '65', '66', '68', '69'];
const CHARGES_FIN_PREFIXES = ['67'];
const CHARGES_HAO_PREFIXES = ['81', '83', '85', '87'];

interface LigneReintegration {
  id: number;
  libelle: string;
  montant: number;
  article: string;
}

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

function formatMontant(val: number): string {
  if (!val || val === 0) return '';
  const neg = val < 0;
  const abs = Math.abs(Math.round(val));
  const formatted = abs.toLocaleString('fr-FR');
  return neg ? '(' + formatted + ')' : formatted;
}

function matchesComptes(numCompte: string, prefixes: string[]): boolean {
  return prefixes.some(p => numCompte.startsWith(p));
}

function sumSoldeCrediteur(lignes: BalanceLigne[], prefixes: string[]): number {
  let total = 0;
  for (const l of lignes) {
    const num = (l.numero_compte || '').trim();
    if (matchesComptes(num, prefixes)) {
      const sd = parseFloat(String(l.solde_debiteur_revise ?? l.solde_debiteur)) || 0;
      const sc = parseFloat(String(l.solde_crediteur_revise ?? l.solde_crediteur)) || 0;
      total += sc - sd;
    }
  }
  return total;
}

function sumSoldeDebiteur(lignes: BalanceLigne[], prefixes: string[]): number {
  let total = 0;
  for (const l of lignes) {
    const num = (l.numero_compte || '').trim();
    if (matchesComptes(num, prefixes)) {
      const sd = parseFloat(String(l.solde_debiteur_revise ?? l.solde_debiteur)) || 0;
      const sc = parseFloat(String(l.solde_crediteur_revise ?? l.solde_crediteur)) || 0;
      total += sd - sc;
    }
  }
  return total;
}

// Reintegrations courantes au Congo (Art. 6-27 CGI)
const REINTEGRATIONS_TYPES: { libelle: string; article: string }[] = [
  { libelle: 'Amendes, penalites et majorations fiscales', article: 'Art. 13-d' },
  { libelle: 'Dons et liberalites au-dela du plafond (0,5% CA)', article: 'Art. 13-a' },
  { libelle: 'Amortissements excedentaires (au-dela des taux admis)', article: 'Art. 8' },
  { libelle: 'Provisions non deductibles (conges, risques non precis)', article: 'Art. 11' },
  { libelle: 'Charges non justifiees ou sans facture', article: 'Art. 6' },
  { libelle: 'Depenses somptuaires (chasse, peche, residences)', article: 'Art. 13-b' },
  { libelle: 'Impot sur les societes (IS) comptabilise en charges', article: 'Art. 13-c' },
  { libelle: 'Interets excessifs sur comptes courants associes', article: 'Art. 9' },
  { libelle: 'Charges sur vehicules de tourisme > plafond', article: 'Art. 8-bis' },
  { libelle: 'Frais de siege > 20% du benefice comptable', article: 'Art. 13-e' },
  { libelle: 'Remunerations non declarees (DAS)', article: 'Art. 13' },
  { libelle: 'Taxe sur les vehicules de societes', article: 'Art. 13' },
  { libelle: 'Autre reintegration', article: '' },
];

const DEDUCTIONS_TYPES: { libelle: string; article: string }[] = [
  { libelle: 'Dividendes deja imposes (regime societes meres)', article: 'Art. 27' },
  { libelle: 'Plus-values sur cessions reinvesties', article: 'Art. 18-20' },
  { libelle: 'Reprises de provisions anterieurement reintegrees', article: 'Art. 11' },
  { libelle: 'Produits exoneres par convention', article: 'Art. 4' },
  { libelle: 'Report deficitaire (max 3 ans)', article: 'Art. 15-bis' },
  { libelle: 'Autre deduction', article: '' },
];

let nextId = 1;

function ResultatFiscal({ entiteName, entiteSigle = '', entiteAdresse = '', entiteNif = '', typeActivite, entiteId, offre = 'comptabilite', onBack }: EtatBaseProps): React.JSX.Element {
  const { exercices, selectedExercice, setSelectedExercice } = useExercicesQuery(entiteId);
  const [lignesN, setLignesN] = useState<BalanceLigne[]>([]);
  const [balanceFound, setBalanceFound] = useState(false);
  const [loading, setLoading] = useState(false);
  const [sourceUsed, setSourceUsed] = useState('');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [pdfBlob, setPdfBlob] = useState<Blob | null>(null);
  const balanceSource: 'ecritures' | 'import' = offre === 'comptabilite' ? 'ecritures' : 'import';

  // Regime fiscal determine par le type d'activite (a l'inscription)
  // entreprise = IS par defaut, l'utilisateur peut basculer en IBA si regime reel simplifie
  const regimeParDefaut: 'is' | 'iba' = typeActivite === 'entreprise' ? 'is' : 'is';
  const [regimeFiscal, setRegimeFiscal] = useState<'is' | 'iba'>(regimeParDefaut);
  const [tauxIS, setTauxIS] = useState(TAUX_IS_NORMAL);

  // Reintegrations et deductions saisies par l'utilisateur
  const [reintegrations, setReintegrations] = useState<LigneReintegration[]>([]);
  const [deductions, setDeductions] = useState<LigneReintegration[]>([]);

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
        const res = await clientFetch('/api/balance/' + entiteId + '/' + selectedExercice.id + '/N');
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

  // ===================== CALCULS =====================

  const produitsExploitation = sumSoldeCrediteur(lignesN, PRODUITS_EXPL_PREFIXES);
  const produitsFinanciers = sumSoldeCrediteur(lignesN, PRODUITS_FIN_PREFIXES);
  const produitsHAO = sumSoldeCrediteur(lignesN, PRODUITS_HAO_PREFIXES);
  const totalProduits = produitsExploitation + produitsFinanciers + produitsHAO;

  const chargesExploitation = sumSoldeDebiteur(lignesN, CHARGES_EXPL_PREFIXES);
  const chargesFinancieres = sumSoldeDebiteur(lignesN, CHARGES_FIN_PREFIXES);
  const chargesHAO = sumSoldeDebiteur(lignesN, CHARGES_HAO_PREFIXES);
  const totalCharges = chargesExploitation + chargesFinancieres + chargesHAO;

  const resultatComptable = totalProduits - totalCharges;

  const totalReintegrations = reintegrations.reduce((s, r) => s + (r.montant || 0), 0);
  const totalDeductions = deductions.reduce((s, d) => s + (d.montant || 0), 0);

  const resultatFiscal = Math.max(0, resultatComptable + totalReintegrations - totalDeductions);

  // IS ou IBA
  const taux = regimeFiscal === 'is' ? tauxIS : TAUX_IBA;
  const impotBrut = Math.round(resultatFiscal * taux);

  const tauxMin = regimeFiscal === 'is' ? TAUX_MIN_IS : TAUX_MIN_IBA;
  const minimumPerception = Math.round(totalProduits * tauxMin);
  const minimumApplique = minimumPerception > impotBrut;
  const impotRetenu = Math.max(impotBrut, minimumPerception);

  const beneficeNet = resultatComptable - impotRetenu;

  const annee = selectedExercice ? selectedExercice.annee : new Date().getFullYear();

  // ===================== GESTION LIGNES =====================

  const addReintegration = (type?: { libelle: string; article: string }): void => {
    setReintegrations(prev => [...prev, {
      id: nextId++,
      libelle: type?.libelle || '',
      montant: 0,
      article: type?.article || '',
    }]);
  };

  const removeReintegration = (id: number): void => {
    setReintegrations(prev => prev.filter(r => r.id !== id));
  };

  const updateReintegration = (id: number, field: 'libelle' | 'montant' | 'article', value: string | number): void => {
    setReintegrations(prev => prev.map(r => r.id === id ? { ...r, [field]: value } : r));
  };

  const addDeduction = (type?: { libelle: string; article: string }): void => {
    setDeductions(prev => [...prev, {
      id: nextId++,
      libelle: type?.libelle || '',
      montant: 0,
      article: type?.article || '',
    }]);
  };

  const removeDeduction = (id: number): void => {
    setDeductions(prev => prev.filter(d => d.id !== id));
  };

  const updateDeduction = (id: number, field: 'libelle' | 'montant' | 'article', value: string | number): void => {
    setDeductions(prev => prev.map(d => d.id === id ? { ...d, [field]: value } : d));
  };

  // ===================== PDF =====================

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

  // ===================== RENDER =====================

  const sectionStyle: React.CSSProperties = { background: '#1e3a5f', color: '#fff', fontWeight: 700, padding: '6px 8px', fontSize: '10px' };
  const labelStyle: React.CSSProperties = { padding: '4px 8px', fontSize: '9px', borderBottom: '1px solid #ddd' };
  const montantStyle: React.CSSProperties = { textAlign: 'right' as const, padding: '4px 8px', fontSize: '9px', borderBottom: '1px solid #ddd', fontFamily: 'monospace' };
  const totalStyle: React.CSSProperties = { ...montantStyle, fontWeight: 700, background: '#f0f4f8', borderTop: '2px solid #1e3a5f' };
  const inputStyle: React.CSSProperties = { width: 120, textAlign: 'right' as const, border: '1px solid #ccc', borderRadius: 3, padding: '2px 4px', fontSize: '9px' };

  return (
    <div className="bilan-wrapper">
      <div className="bilan-toolbar">
        <div className="bilan-toolbar-left">
          <button className="bilan-back-btn" onClick={onBack}><LuArrowLeft /> Retour</button>
          <h2>Resultat Fiscal — CGI Congo 2026</h2>
        </div>
        <div className="bilan-toolbar-right">
          <button className="bilan-export-btn secondary" onClick={openPreview}><LuEye /> Apercu</button>
          <button className="bilan-export-btn" onClick={async () => { const pdf = await generatePDF(); pdf.save('Resultat_Fiscal_' + annee + '.pdf'); }}><LuDownload /> Exporter PDF</button>
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
              <option value={0.28}>28% (normal)</option>
              <option value={0.25}>25% (ecoles, micro-finance)</option>
              <option value={0.33}>33% (entites etrangeres)</option>
            </select>
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

      {/* ===================== SAISIE REINTEGRATIONS / DEDUCTIONS ===================== */}
      {balanceFound && !loading && (
        <div style={{ display: 'flex', gap: 16, marginBottom: 16, flexWrap: 'wrap' }}>

          {/* Reintegrations */}
          <div style={{ flex: 1, minWidth: 400, background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, padding: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <h3 style={{ margin: 0, fontSize: 13, color: '#dc2626' }}>Reintegrations (+)</h3>
              <div style={{ display: 'flex', gap: 4 }}>
                <select style={{ fontSize: 11, padding: '2px 4px' }} onChange={(e) => { const idx = parseInt(e.target.value); if (!isNaN(idx)) { addReintegration(REINTEGRATIONS_TYPES[idx]); e.currentTarget.value = ''; } }}>
                  <option value="">+ Ajouter une reintegration...</option>
                  {REINTEGRATIONS_TYPES.map((t, i) => (<option key={i} value={i}>{t.libelle}</option>))}
                </select>
              </div>
            </div>
            {reintegrations.length === 0 && <div style={{ fontSize: 11, color: '#999', padding: 8 }}>Aucune reintegration saisie</div>}
            {reintegrations.map(r => (
              <div key={r.id} style={{ display: 'flex', gap: 4, alignItems: 'center', marginBottom: 4 }}>
                <input style={{ flex: 1, fontSize: 11, padding: '2px 4px', border: '1px solid #ddd', borderRadius: 3 }} value={r.libelle} onChange={(e) => updateReintegration(r.id, 'libelle', e.target.value)} placeholder="Libelle" />
                <input style={{ ...inputStyle, width: 100 }} type="number" value={r.montant || ''} onChange={(e) => updateReintegration(r.id, 'montant', parseFloat(e.target.value) || 0)} placeholder="Montant" />
                <span style={{ fontSize: 9, color: '#888', width: 60 }}>{r.article}</span>
                <button onClick={() => removeReintegration(r.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#dc2626', padding: 2 }}><LuTrash2 size={14} /></button>
              </div>
            ))}
            {reintegrations.length > 0 && <div style={{ textAlign: 'right', fontWeight: 700, fontSize: 12, marginTop: 4, color: '#dc2626' }}>Total : {formatMontant(totalReintegrations)} FCFA</div>}
          </div>

          {/* Deductions */}
          <div style={{ flex: 1, minWidth: 400, background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, padding: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <h3 style={{ margin: 0, fontSize: 13, color: '#16a34a' }}>Deductions (-)</h3>
              <div style={{ display: 'flex', gap: 4 }}>
                <select style={{ fontSize: 11, padding: '2px 4px' }} onChange={(e) => { const idx = parseInt(e.target.value); if (!isNaN(idx)) { addDeduction(DEDUCTIONS_TYPES[idx]); e.currentTarget.value = ''; } }}>
                  <option value="">+ Ajouter une deduction...</option>
                  {DEDUCTIONS_TYPES.map((t, i) => (<option key={i} value={i}>{t.libelle}</option>))}
                </select>
              </div>
            </div>
            {deductions.length === 0 && <div style={{ fontSize: 11, color: '#999', padding: 8 }}>Aucune deduction saisie</div>}
            {deductions.map(d => (
              <div key={d.id} style={{ display: 'flex', gap: 4, alignItems: 'center', marginBottom: 4 }}>
                <input style={{ flex: 1, fontSize: 11, padding: '2px 4px', border: '1px solid #ddd', borderRadius: 3 }} value={d.libelle} onChange={(e) => updateDeduction(d.id, 'libelle', e.target.value)} placeholder="Libelle" />
                <input style={{ ...inputStyle, width: 100 }} type="number" value={d.montant || ''} onChange={(e) => updateDeduction(d.id, 'montant', parseFloat(e.target.value) || 0)} placeholder="Montant" />
                <span style={{ fontSize: 9, color: '#888', width: 60 }}>{d.article}</span>
                <button onClick={() => removeDeduction(d.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#dc2626', padding: 2 }}><LuTrash2 size={14} /></button>
              </div>
            ))}
            {deductions.length > 0 && <div style={{ textAlign: 'right', fontWeight: 700, fontSize: 12, marginTop: 4, color: '#16a34a' }}>Total : {formatMontant(totalDeductions)} FCFA</div>}
          </div>
        </div>
      )}

      {/* ===================== PAGE IMPRIMABLE — RESULTAT FISCAL ===================== */}
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

        <table className="bilan-table" style={{ fontSize: '9px' }}>
          <thead>
            <tr>
              <th style={{ width: '55%' }}>LIBELLE</th>
              <th style={{ width: '15%', textAlign: 'right' }}>REF. CGI</th>
              <th style={{ width: '30%', textAlign: 'right' }}>MONTANT (FCFA)</th>
            </tr>
          </thead>
          <tbody>
            {/* I. RESULTAT COMPTABLE */}
            <tr><td colSpan={3} style={sectionStyle}>I. RESULTAT COMPTABLE</td></tr>
            <tr><td style={labelStyle}>Produits d'exploitation</td><td style={montantStyle}>Cl. 7</td><td style={montantStyle}>{formatMontant(produitsExploitation)}</td></tr>
            <tr><td style={labelStyle}>Produits financiers</td><td style={montantStyle}>Cl. 77</td><td style={montantStyle}>{formatMontant(produitsFinanciers)}</td></tr>
            <tr><td style={labelStyle}>Produits HAO</td><td style={montantStyle}>Cl. 82,84,86,88</td><td style={montantStyle}>{formatMontant(produitsHAO)}</td></tr>
            <tr><td style={{ ...labelStyle, fontWeight: 700 }}>TOTAL PRODUITS (A)</td><td style={montantStyle}></td><td style={totalStyle}>{formatMontant(totalProduits)}</td></tr>

            <tr><td style={labelStyle}>Charges d'exploitation</td><td style={montantStyle}>Cl. 6</td><td style={montantStyle}>{formatMontant(chargesExploitation)}</td></tr>
            <tr><td style={labelStyle}>Charges financieres</td><td style={montantStyle}>Cl. 67</td><td style={montantStyle}>{formatMontant(chargesFinancieres)}</td></tr>
            <tr><td style={labelStyle}>Charges HAO</td><td style={montantStyle}>Cl. 81,83,85,87</td><td style={montantStyle}>{formatMontant(chargesHAO)}</td></tr>
            <tr><td style={{ ...labelStyle, fontWeight: 700 }}>TOTAL CHARGES (B)</td><td style={montantStyle}></td><td style={totalStyle}>{formatMontant(totalCharges)}</td></tr>

            <tr><td style={{ ...labelStyle, fontWeight: 700, fontSize: '10px' }}>RESULTAT COMPTABLE (A - B)</td><td style={montantStyle}>Art. 6</td><td style={{ ...totalStyle, fontSize: '10px', color: resultatComptable >= 0 ? '#16a34a' : '#dc2626' }}>{formatMontant(resultatComptable)}</td></tr>

            {/* II. REINTEGRATIONS */}
            <tr><td colSpan={3} style={sectionStyle}>II. REINTEGRATIONS FISCALES (charges non deductibles)</td></tr>
            {reintegrations.length === 0 && <tr><td colSpan={3} style={{ ...labelStyle, fontStyle: 'italic', color: '#999' }}>Aucune reintegration</td></tr>}
            {reintegrations.map(r => (
              <tr key={r.id}><td style={labelStyle}>{r.libelle}</td><td style={montantStyle}>{r.article}</td><td style={montantStyle}>{formatMontant(r.montant)}</td></tr>
            ))}
            <tr><td style={{ ...labelStyle, fontWeight: 700 }}>TOTAL REINTEGRATIONS (C)</td><td style={montantStyle}></td><td style={{ ...totalStyle, color: '#dc2626' }}>{formatMontant(totalReintegrations)}</td></tr>

            {/* III. DEDUCTIONS */}
            <tr><td colSpan={3} style={sectionStyle}>III. DEDUCTIONS FISCALES (produits non imposables)</td></tr>
            {deductions.length === 0 && <tr><td colSpan={3} style={{ ...labelStyle, fontStyle: 'italic', color: '#999' }}>Aucune deduction</td></tr>}
            {deductions.map(d => (
              <tr key={d.id}><td style={labelStyle}>{d.libelle}</td><td style={montantStyle}>{d.article}</td><td style={montantStyle}>{formatMontant(d.montant)}</td></tr>
            ))}
            <tr><td style={{ ...labelStyle, fontWeight: 700 }}>TOTAL DEDUCTIONS (D)</td><td style={montantStyle}></td><td style={{ ...totalStyle, color: '#16a34a' }}>{formatMontant(totalDeductions)}</td></tr>

            {/* IV. RESULTAT FISCAL */}
            <tr><td colSpan={3} style={sectionStyle}>IV. RESULTAT FISCAL</td></tr>
            <tr><td style={{ ...labelStyle, fontWeight: 700, fontSize: '10px' }}>RESULTAT FISCAL = (A - B) + C - D</td><td style={montantStyle}>{regimeFiscal === 'is' ? 'Art. 6-27' : 'Art. 94'}</td><td style={{ ...totalStyle, fontSize: '11px' }}>{formatMontant(resultatFiscal)}</td></tr>

            {/* V. LIQUIDATION */}
            <tr><td colSpan={3} style={sectionStyle}>V. LIQUIDATION DE L'IMPOT — {regimeFiscal === 'is' ? 'IS' : 'IBA'}</td></tr>
            <tr><td style={labelStyle}>{regimeFiscal === 'is' ? 'IS' : 'IBA'} brut = Resultat fiscal x {(taux * 100).toFixed(0)}%</td><td style={montantStyle}>{regimeFiscal === 'is' ? 'Art. 10' : 'Art. 95'}</td><td style={montantStyle}>{formatMontant(impotBrut)}</td></tr>
            <tr><td style={labelStyle}>Minimum de perception = Total produits x {(tauxMin * 100).toFixed(1)}%</td><td style={montantStyle}>{regimeFiscal === 'is' ? 'Art. 86-C' : 'Art. 95'}</td><td style={montantStyle}>{formatMontant(minimumPerception)}</td></tr>
            <tr><td style={{ ...labelStyle, fontStyle: 'italic', color: minimumApplique ? '#f59e0b' : '#6b7280' }}>{minimumApplique ? 'Minimum de perception applique (superieur a l\'impot calcule)' : 'Impot calcule retenu (superieur au minimum)'}</td><td></td><td></td></tr>
            <tr><td style={{ ...labelStyle, fontWeight: 700, fontSize: '11px' }}>{regimeFiscal === 'is' ? 'IS' : 'IBA'} RETENU (max des deux)</td><td style={montantStyle}></td><td style={{ ...totalStyle, fontSize: '11px', background: '#fef3c7' }}>{formatMontant(impotRetenu)}</td></tr>

            {/* VI. BENEFICE NET */}
            <tr><td colSpan={3} style={sectionStyle}>VI. RESULTAT NET APRES IMPOT</td></tr>
            <tr><td style={{ ...labelStyle, fontWeight: 700, fontSize: '11px' }}>BENEFICE NET = Resultat comptable - Impot retenu</td><td style={montantStyle}></td><td style={{ ...totalStyle, fontSize: '11px', color: beneficeNet >= 0 ? '#16a34a' : '#dc2626' }}>{formatMontant(beneficeNet)}</td></tr>
          </tbody>
        </table>

        <div className="bilan-footer">
          <span>NORMX Etats — Resultat Fiscal CGI Congo 2026</span>
          <span>Exercice clos le 31/12/{annee}</span>
        </div>
      </div>

      {/* Modale apercu PDF */}
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
    </div>
  );
}

export default ResultatFiscal;
