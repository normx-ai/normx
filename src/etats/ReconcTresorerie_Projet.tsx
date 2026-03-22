import React, { useState, useRef, useEffect, useCallback } from 'react';
import { LuDownload, LuArrowLeft, LuTriangleAlert, LuEye, LuX, LuPrinter } from 'react-icons/lu';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import './BilanSYCEBNL.css';
import { BalanceLigne, Exercice, EtatBaseProps } from '../types';

// ===================== §2290 TABLEAU DE RÉCONCILIATION DE TRÉSORERIE — PROJET DE DÉVELOPPEMENT =====================

interface ReconcRow {
  ref: string;
  type: 'section' | 'indent' | 'total';
  libelle: string;
  autoKey?: string;
  editable?: boolean;
  editableSection?: boolean;
  computeG?: boolean;
  computeI?: boolean;
}

interface TresorerieResult {
  total: number;
  banques: number;
  caisse: number;
}

interface FondsBailleursResult {
  total: number;
  principal: number;
  autres: number;
}

interface DepensesResult {
  total: number;
  charges: number;
  immob: number;
}

// A - TRÉSORERIE EN DÉBUT EXERCICE N (solde ouverture comptes 5xx)
const TRESORERIE_DEBUT_PREFIXES: string[] = ['5'];

// B - FONDS REÇUS DES BAILLEURS (crédits comptes 162-164 + 462-464)
const FONDS_BAILLEURS_PREFIXES: string[] = ['162', '163', '164', '462', '463', '464'];

// ===================== ROWS DU TABLEAU §2290 =====================
const RECONC_ROWS: ReconcRow[] = [
  // A - Trésorerie en début d'exercice
  { ref: 'RA', type: 'section', libelle: 'A - TRÉSORERIE EN DÉBUT D\'EXERCICE N', autoKey: 'tresorerieDebut' },
  { ref: 'RA1', type: 'indent', libelle: 'Banques', autoKey: 'tresorerieDebut_detail', editable: false },
  { ref: 'RA2', type: 'indent', libelle: 'Caisse', autoKey: 'tresorerieDebut_caisse', editable: false },

  // B - Fonds reçus des bailleurs
  { ref: 'RB', type: 'section', libelle: 'B - FONDS REÇUS DES BAILLEURS AU COURS DE L\'EXERCICE N', autoKey: 'fondsRecusBailleurs' },
  { ref: 'RB1', type: 'indent', libelle: 'Bailleur principal', autoKey: 'fondsRecusBailleurs_detail', editable: false },
  { ref: 'RB2', type: 'indent', libelle: 'Autres bailleurs', autoKey: 'fondsRecusBailleurs_autres', editable: false },

  // C - Intérêts reçus
  { ref: 'RC', type: 'section', libelle: 'C - INTÉRÊTS REÇUS AU COURS DE L\'EXERCICE N', editableSection: true },
  { ref: 'RC1', type: 'indent', libelle: 'Intérêts bancaires', editable: true },
  { ref: 'RC2', type: 'indent', libelle: 'Autres intérêts', editable: true },

  // D - Autres fonds reçus
  { ref: 'RD', type: 'section', libelle: 'D - AUTRES FONDS REÇUS AU COURS DE L\'EXERCICE N', editableSection: true },
  { ref: 'RD1', type: 'indent', libelle: 'Fonds de contrepartie', editable: true },
  { ref: 'RD2', type: 'indent', libelle: 'Autres recettes', editable: true },

  // E - Virements sur comptes opérationnels
  { ref: 'RE', type: 'section', libelle: 'E - VIREMENTS SUR COMPTES OPÉRATIONNELS', editableSection: true },
  { ref: 'RE1', type: 'indent', libelle: 'Virements internes', editable: true },
  { ref: 'RE2', type: 'indent', libelle: 'Autres virements', editable: true },

  // F - Dépenses de l'exercice
  { ref: 'RF', type: 'section', libelle: 'F - DÉPENSES DE L\'EXERCICE N', autoKey: 'depenses' },
  { ref: 'RF1', type: 'indent', libelle: 'Achats et charges', autoKey: 'depenses_charges', editable: false },
  { ref: 'RF2', type: 'indent', libelle: 'Immobilisations', autoKey: 'depenses_immob', editable: false },

  // G - Trésorerie en fin d'exercice
  { ref: 'RG', type: 'total', libelle: 'G - TRÉSORERIE EN FIN D\'EXERCICE N (A + B + C + D - E - F)', computeG: true },

  // H - Paiements en instance
  { ref: 'RH', type: 'section', libelle: 'H - PAIEMENTS EN INSTANCE', editableSection: true },
  { ref: 'RH1', type: 'indent', libelle: 'Chèques émis non encaissés', editable: true },
  { ref: 'RH2', type: 'indent', libelle: 'Autres paiements en instance', editable: true },

  // I - Trésorerie nette
  { ref: 'RI', type: 'total', libelle: 'I - TRÉSORERIE NETTE DES PAIEMENTS EN INSTANCE (G - H)', computeI: true },
];

// ===================== HELPERS =====================

function matchesComptes(numCompte: string, prefixes: string[]): boolean {
  return prefixes.some(p => numCompte.startsWith(p));
}

function formatMontant(val: number): string {
  if (!val || Math.abs(val) < 0.5) return '';
  return Math.round(val).toLocaleString('fr-FR');
}

function getStorageKey(entiteId: number, exerciceId: number): string {
  return `reconc_tresorerie_${entiteId}_${exerciceId}`;
}

// ===================== COMPOSANT PRINCIPAL =====================

function ReconcTresorerie_Projet({ entiteName, entiteSigle = '', entiteAdresse = '', entiteNif = '', typeActivite, entiteId, offre = 'comptabilite', onBack }: EtatBaseProps): React.ReactElement {
  const [exercices, setExercices] = useState<Exercice[]>([]);
  const [selectedExercice, setSelectedExercice] = useState<Exercice | null>(null);
  const [lignesN, setLignesN] = useState<BalanceLigne[]>([]);
  const balanceSource: string = offre === 'comptabilite' ? 'ecritures' : 'import';
  const [sourceUsed, setSourceUsed] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [pdfBlob, setPdfBlob] = useState<Blob | null>(null);
  const [editableValues, setEditableValues] = useState<Record<string, number>>({});

  const tableRef = useRef<HTMLDivElement>(null);

  // Load exercices
  useEffect(() => {
    if (!entiteId) return;
    fetch('/api/balance/exercices/' + entiteId)
      .then((r: Response) => r.json())
      .then((data: Exercice[]) => {
        setExercices(data);
        if (data.length > 0) {
          const now = new Date();
          const year = now.getFullYear();
          const month = now.getMonth();
          const preferYear = month <= 2 ? year - 1 : year;
          const pick = data.find(e => e.annee === preferYear)
            || data.find(e => e.annee === year)
            || data.find(e => e.annee === year - 1)
            || data[0];
          setSelectedExercice(pick);
        }
      })
      .catch(() => {});
  }, [entiteId]);

  // Load editable values from localStorage
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

  // Save editable values to localStorage
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
    const res = await fetch('/api/ecritures/balance/' + entId + '/' + exId);
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
        const resN = await fetch('/api/balance/' + entiteId + '/' + selectedExercice.id + '/N');
        const dataN: { lignes?: BalanceLigne[] } = await resN.json();
        lignesNResult = dataN.lignes || [];
        source = 'Import balance';
      }
      setLignesN(lignesNResult);
      setSourceUsed(source);
    } catch {
      // Error loading balance
    } finally {
      setLoading(false);
    }
  }, [entiteId, selectedExercice, balanceSource]);

  useEffect(() => { loadBalance(); }, [loadBalance]);

  // ===================== COMPUTE AUTO VALUES =====================

  // A - Trésorerie en début d'exercice (solde ouverture comptes 5xx)
  const computeTresorerieDebut = (): TresorerieResult => {
    let total = 0;
    let banques = 0;
    let caisse = 0;
    for (const l of lignesN) {
      const num = (l.numero_compte || '').trim();
      if (matchesComptes(num, TRESORERIE_DEBUT_PREFIXES)) {
        const sd = parseFloat(String(l.solde_debiteur)) || 0;
        const sc = parseFloat(String(l.solde_crediteur)) || 0;
        const solde = sd - sc;
        total += solde;
        if (num.startsWith('57')) {
          caisse += solde;
        } else {
          banques += solde;
        }
      }
    }
    return { total, banques, caisse };
  };

  // B - Fonds reçus des bailleurs (crédits comptes 162-164 + 462-464)
  const computeFondsBailleurs = (): FondsBailleursResult => {
    let total = 0;
    let principal = 0;
    let autres = 0;
    for (const l of lignesN) {
      const num = (l.numero_compte || '').trim();
      if (matchesComptes(num, FONDS_BAILLEURS_PREFIXES)) {
        const sc = parseFloat(String(l.solde_crediteur_revise ?? l.solde_crediteur)) || 0;
        const sd = parseFloat(String(l.solde_debiteur_revise ?? l.solde_debiteur)) || 0;
        const val = sc - sd;
        total += val;
        if (num.startsWith('162') || num.startsWith('462')) {
          principal += val;
        } else {
          autres += val;
        }
      }
    }
    return { total, principal, autres };
  };

  // F - Dépenses (débits comptes 6xx + 2xx)
  const computeDepenses = (): DepensesResult => {
    let total = 0;
    let charges = 0;
    let immob = 0;
    for (const l of lignesN) {
      const num = (l.numero_compte || '').trim();
      if (num.startsWith('6')) {
        const sd = parseFloat(String(l.solde_debiteur_revise ?? l.solde_debiteur)) || 0;
        const sc = parseFloat(String(l.solde_crediteur_revise ?? l.solde_crediteur)) || 0;
        const val = sd - sc;
        charges += Math.abs(val);
        total += Math.abs(val);
      } else if (num.startsWith('2')) {
        const sd = parseFloat(String(l.solde_debiteur_revise ?? l.solde_debiteur)) || 0;
        const sc = parseFloat(String(l.solde_crediteur_revise ?? l.solde_crediteur)) || 0;
        const val = sd - sc;
        immob += Math.abs(val);
        total += Math.abs(val);
      }
    }
    return { total, charges, immob };
  };

  const tresorerieDebut = computeTresorerieDebut();
  const fondsBailleurs = computeFondsBailleurs();
  const depenses = computeDepenses();

  // Editable section totals
  const totalC: number = (editableValues['RC1'] || 0) + (editableValues['RC2'] || 0);
  const totalD: number = (editableValues['RD1'] || 0) + (editableValues['RD2'] || 0);
  const totalE: number = (editableValues['RE1'] || 0) + (editableValues['RE2'] || 0);
  const totalH: number = (editableValues['RH1'] || 0) + (editableValues['RH2'] || 0);

  // G = A + B + C + D - E - F
  const totalG: number = tresorerieDebut.total + fondsBailleurs.total + totalC + totalD - totalE - depenses.total;
  // I = G - H
  const totalI: number = totalG - totalH;

  // Build values map for display
  const getRowValue = (row: ReconcRow): number => {
    // Auto-calculated sections
    if (row.ref === 'RA') return tresorerieDebut.total;
    if (row.ref === 'RA1') return tresorerieDebut.banques;
    if (row.ref === 'RA2') return tresorerieDebut.caisse;
    if (row.ref === 'RB') return fondsBailleurs.total;
    if (row.ref === 'RB1') return fondsBailleurs.principal;
    if (row.ref === 'RB2') return fondsBailleurs.autres;
    if (row.ref === 'RF') return depenses.total;
    if (row.ref === 'RF1') return depenses.charges;
    if (row.ref === 'RF2') return depenses.immob;

    // Editable section totals
    if (row.ref === 'RC') return totalC;
    if (row.ref === 'RD') return totalD;
    if (row.ref === 'RE') return totalE;
    if (row.ref === 'RH') return totalH;

    // Computed totals
    if (row.computeG) return totalG;
    if (row.computeI) return totalI;

    // Editable rows
    if (row.editable) return editableValues[row.ref] || 0;

    return 0;
  };

  const annee = selectedExercice ? selectedExercice.annee : new Date().getFullYear();

  // PDF generation
  const generatePDF = async (): Promise<jsPDF | null> => {
    if (!tableRef.current) return null;
    const canvas = await html2canvas(tableRef.current, { scale: 2, useCORS: true, backgroundColor: '#fff' });
    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
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
    return pdf;
  };

  const openPreview = async (): Promise<void> => {
    const pdf = await generatePDF();
    if (!pdf) return;
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
          <button className="bilan-export-btn" onClick={async () => { const pdf = await generatePDF(); if (pdf) pdf.save(`ReconcTresorerie_${entiteName || 'projet'}_${annee}.pdf`); }}>
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

          <table className="bilan-table">
            <thead>
              <tr>
                <th className="col-ref">REF</th>
                <th className="col-libelle">LIBELLE</th>
                <th className="col-montant">MONTANT</th>
              </tr>
            </thead>
            <tbody>
              {RECONC_ROWS.map((row: ReconcRow, i: number) => {
                const rowClass = row.type === 'total' ? 'row-total'
                  : row.type === 'section' ? 'row-section'
                  : 'row-indent';

                const val = getRowValue(row);
                return (
                  <tr key={i} className={rowClass}>
                    <td className="col-ref">{row.ref}</td>
                    <td className="col-libelle">{row.libelle}</td>
                    <td className="col-montant">
                      {row.editable ? (
                        <input
                          type="number"
                          value={editableValues[row.ref] || ''}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleEditableChange(row.ref, e.target.value)}
                          placeholder="0"
                          className="bilan-input"
                        />
                      ) : (
                        formatMontant(val)
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          <div className="bilan-footer">
            <span>NORMX Etats — SYCEBNL Projet</span>
            <span>Exercice clos le 31/12/{annee}</span>
          </div>
        </div>
      )}

      {/* Modale apercu PDF */}
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
