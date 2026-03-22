import React, { useState, useRef, useEffect, useCallback } from 'react';
import { LuDownload, LuArrowLeft, LuTriangleAlert, LuEye, LuX, LuPrinter } from 'react-icons/lu';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import './BilanSYCEBNL.css';
import type { BalanceLigne, Exercice, EtatBaseProps, CRRow } from '../types';

// ===================== S2230 TABLEAU DE CORRESPONDANCE -- COMPTE DE RESULTAT SYCEBNL =====================

interface CRMappingEntry {
  comptes: string[];
}

// REVENUS -- comptes crediteurs (classe 7) : net = credit - debit
const REVENUS_MAPPING: Record<string, CRMappingEntry> = {
  RA: { comptes: ['701'] },
  RB: { comptes: ['703'] },
  RC: { comptes: ['704'] },
  RD: { comptes: ['7051'] },
  RE: { comptes: ['7052', '7053'] },
  RF: { comptes: ['71'] },
  RG: { comptes: ['706', '707', '708', '72', '73', '75', '77', '78'] },
  RH: { comptes: ['79'] },
};

// CHARGES -- comptes debiteurs (classe 6) : net = debit - credit
const CHARGES_MAPPING: Record<string, CRMappingEntry> = {
  TA: { comptes: ['601'] },
  TB: { comptes: ['6031'] },
  TC: { comptes: ['602'] },
  TD: { comptes: ['604', '605', '606', '608'] },
  TE: { comptes: ['6032', '6033', '6034', '6035'] },
  TF: { comptes: ['61'] },
  TG: { comptes: ['62', '63'] },
  TH: { comptes: ['64'] },
  TI: { comptes: ['65'] },
  TJ: { comptes: ['66'] },
  TK: { comptes: ['67'] },
  TL: { comptes: ['68', '69'] },
};

// HAO -- Produits HAO crediteurs, Charges HAO debitrices
const HAO_PRODUITS_MAPPING: Record<string, CRMappingEntry> = {
  TM: { comptes: ['82', '84', '86', '88'] },
};
const HAO_CHARGES_MAPPING: Record<string, CRMappingEntry> = {
  TN: { comptes: ['81', '83', '85', '87'] },
};

// ===================== CR ROWS -- S2181 =====================
const CR_ROWS: CRRow[] = [
  // --- REVENUS ---
  { ref: 'RA', type: 'indent', note: '23', libelle: 'Cotisations' },
  { ref: 'RB', type: 'indent', note: '23', libelle: 'Dotations consomptibles transferees au compte de resultat' },
  { ref: 'RC', type: 'indent', note: '23', libelle: 'Revenus lies a la generosite' },
  { ref: 'RD', type: 'indent', note: '23', libelle: 'Ventes de marchandises' },
  { ref: 'RE', type: 'indent', note: '23', libelle: 'Ventes de services et produits finis' },
  { ref: 'RF', type: 'indent', note: '23', libelle: 'Subventions d\'exploitation' },
  { ref: 'RG', type: 'indent', note: '23', libelle: 'Autres produits et transferts de charges' },
  { ref: 'RH', type: 'indent', note: '5D&30', libelle: 'Reprises de provisions, depreciations, subventions et autres reprises' },
  { ref: 'XA', type: 'subtotal', libelle: 'REVENUS DES ACTIVITES ORDINAIRES (Somme RA a RH)', sumRefs: ['RA', 'RB', 'RC', 'RD', 'RE', 'RF', 'RG', 'RH'] },

  // --- CHARGES ---
  { ref: 'TA', type: 'indent', note: '24', libelle: 'Achats de biens et services lies a l\'activite' },
  { ref: 'TB', type: 'indent', note: '8', libelle: 'Variation de stocks des achats de biens et services lies a l\'activite' },
  { ref: 'TC', type: 'indent', note: '24', libelle: 'Achats de marchandises et matieres premieres' },
  { ref: 'TD', type: 'indent', note: '24', libelle: 'Autres achats' },
  { ref: 'TE', type: 'indent', note: '8', libelle: 'Variation de stocks de marchandises, de matieres premieres et autres' },
  { ref: 'TF', type: 'indent', note: '25', libelle: 'Transports' },
  { ref: 'TG', type: 'indent', note: '26', libelle: 'Services exterieurs' },
  { ref: 'TH', type: 'indent', note: '27', libelle: 'Impots et taxes' },
  { ref: 'TI', type: 'indent', note: '28', libelle: 'Autres charges' },
  { ref: 'TJ', type: 'indent', note: '29', libelle: 'Charges de personnel' },
  { ref: 'TK', type: 'indent', note: '31', libelle: 'Frais financiers et charges assimilees' },
  { ref: 'TL', type: 'indent', note: '5D&30', libelle: 'Dotations aux amortissements, aux provisions, aux depreciations et autres' },
  { ref: 'XB', type: 'subtotal', libelle: 'CHARGES DES ACTIVITES ORDINAIRES (Somme TA a TL)', sumRefs: ['TA', 'TB', 'TC', 'TD', 'TE', 'TF', 'TG', 'TH', 'TI', 'TJ', 'TK', 'TL'] },

  // --- RESULTAT ACTIVITES ORDINAIRES ---
  { ref: 'XC', type: 'result', libelle: 'RESULTAT DES ACTIVITES ORDINAIRES (XA - XB)', formula: 'XA-XB' },

  // --- HAO ---
  { ref: 'TM', type: 'indent', note: '32', libelle: 'Produits H.A.O.' },
  { ref: 'TN', type: 'indent', note: '32', libelle: 'Charges H.A.O.' },
  { ref: 'XD', type: 'result', libelle: 'RESULTAT H.A.O. (TM - TN)', formula: 'TM-TN' },

  // --- RESULTAT NET ---
  { ref: 'XE', type: 'total', libelle: 'RESULTAT NET DE L\'EXERCICE (+excedent, -deficit) (XC+XD)', formula: 'XC+XD' },
];

interface NetValue {
  net: number;
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

interface BalanceImportResponse {
  lignes: BalanceLigne[];
}

function formatMontant(val: number): string {
  if (!val || val === 0) return '';
  return Math.round(val).toLocaleString('fr-FR');
}

function matchesComptes(numCompte: string, prefixes: string[]): boolean {
  return prefixes.some(p => numCompte.startsWith(p));
}

// Revenus : credit - debit (solde crediteur = positif)
function computeRevenusFromBalance(lignes: BalanceLigne[], mapping: Record<string, CRMappingEntry>): Record<string, NetValue> {
  const result: Record<string, NetValue> = {};
  for (const ref in mapping) {
    const comptes = mapping[ref].comptes || [];
    let net = 0;
    for (const l of lignes) {
      const num = (l.numero_compte || '').trim();
      const sd = parseFloat(String(l.solde_debiteur_revise ?? l.solde_debiteur)) || 0;
      const sc = parseFloat(String(l.solde_crediteur_revise ?? l.solde_crediteur)) || 0;
      if (matchesComptes(num, comptes)) {
        net += sc - sd;
      }
    }
    result[ref] = { net };
  }
  return result;
}

// Charges : debit - credit (solde debiteur = positif)
function computeChargesFromBalance(lignes: BalanceLigne[], mapping: Record<string, CRMappingEntry>): Record<string, NetValue> {
  const result: Record<string, NetValue> = {};
  for (const ref in mapping) {
    const comptes = mapping[ref].comptes || [];
    let net = 0;
    for (const l of lignes) {
      const num = (l.numero_compte || '').trim();
      const sd = parseFloat(String(l.solde_debiteur_revise ?? l.solde_debiteur)) || 0;
      const sc = parseFloat(String(l.solde_crediteur_revise ?? l.solde_crediteur)) || 0;
      if (matchesComptes(num, comptes)) {
        net += sd - sc;
      }
    }
    result[ref] = { net };
  }
  return result;
}

function CompteResultatSYCEBNL({ entiteName, entiteSigle = '', entiteAdresse = '', entiteNif = '', typeActivite, entiteId, offre = 'comptabilite', onBack }: EtatBaseProps): React.JSX.Element {
  const [exercices, setExercices] = useState<Exercice[]>([]);
  const [selectedExercice, setSelectedExercice] = useState<Exercice | null>(null);
  const [lignesN, setLignesN] = useState<BalanceLigne[]>([]);
  const [lignesN1, setLignesN1] = useState<BalanceLigne[]>([]);
  const [balanceFound, setBalanceFound] = useState<boolean>(false);
  const balanceSource: 'ecritures' | 'import' = offre === 'comptabilite' ? 'ecritures' : 'import';
  const [sourceUsed, setSourceUsed] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [pdfBlob, setPdfBlob] = useState<Blob | null>(null);

  const pageRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!entiteId) return;
    fetch('/api/balance/exercices/' + entiteId)
      .then(r => r.json())
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
      .catch(() => { /* silently ignored */ });
  }, [entiteId]);

  const loadBalanceFromEcritures = async (entId: number, exId: number): Promise<BalanceLigne[]> => {
    const res = await fetch('/api/ecritures/balance/' + entId + '/' + exId);
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
      let lignesNResult: BalanceLigne[] = [];
      let lignesN1Result: BalanceLigne[] = [];
      let source = '';

      if (balanceSource === 'ecritures') {
        lignesNResult = await loadBalanceFromEcritures(entiteId, selectedExercice.id);
        source = 'Ecritures comptables';
      } else {
        const resN = await fetch('/api/balance/' + entiteId + '/' + selectedExercice.id + '/N');
        const dataN: BalanceImportResponse = await resN.json();
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
          const resN1 = await fetch('/api/balance/' + entiteId + '/' + prevExercice.id + '/N');
          const dataN1: BalanceImportResponse = await resN1.json();
          lignesN1Result = dataN1.lignes || [];
        }
      } else if (balanceSource === 'import') {
        const resN1 = await fetch('/api/balance/' + entiteId + '/' + selectedExercice.id + '/N-1');
        const dataN1: BalanceImportResponse = await resN1.json();
        lignesN1Result = dataN1.lignes || [];
      }

      setLignesN1(lignesN1Result);
    } catch {
      // Erreur chargement balance silencieusement ignoree
    } finally {
      setLoading(false);
    }
  }, [entiteId, selectedExercice, exercices, balanceSource]);

  useEffect(() => {
    loadBalance();
  }, [loadBalance]);

  // Compute all values for N and N-1
  const computeAll = (lignes: BalanceLigne[]): Record<string, NetValue> => {
    const revenus = computeRevenusFromBalance(lignes, REVENUS_MAPPING);
    const charges = computeChargesFromBalance(lignes, CHARGES_MAPPING);
    const haoProduits = computeRevenusFromBalance(lignes, HAO_PRODUITS_MAPPING);
    const haoCharges = computeChargesFromBalance(lignes, HAO_CHARGES_MAPPING);
    return { ...revenus, ...charges, ...haoProduits, ...haoCharges };
  };

  const dataN: Record<string, NetValue> = computeAll(lignesN);
  const dataN1: Record<string, NetValue> = computeAll(lignesN1);

  const getValue = (ref: string, data: Record<string, NetValue>): number => {
    const row = CR_ROWS.find(r => r.ref === ref);

    // Subtotals: sum of referenced REFs
    if (row && row.sumRefs) {
      return row.sumRefs.reduce((sum: number, r: string) => sum + getValue(r, data), 0);
    }

    // Formulas
    if (row && row.formula) {
      if (row.formula === 'XA-XB') return getValue('XA', data) - getValue('XB', data);
      if (row.formula === 'TM-TN') return getValue('TM', data) - getValue('TN', data);
      if (row.formula === 'XC+XD') return getValue('XC', data) + getValue('XD', data);
    }

    return data[ref] ? (data[ref].net || 0) : 0;
  };

  const annee: number = selectedExercice ? selectedExercice.annee : new Date().getFullYear();

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
    a.download = 'Compte_Resultat_SYCEBNL_' + annee + '.pdf';
    a.click();
    URL.revokeObjectURL(url);
  };

  const printPDF = (): void => {
    if (!previewUrl) return;
    const win = window.open(previewUrl, '_blank');
    if (win) win.print();
  };

  const renderHeader = (): React.JSX.Element => (
    <div className="etat-header-officiel">
      <div className="etat-header-titre">COMPTE DE RESULTAT</div>
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

  const renderFooter = (): React.JSX.Element => (
    <div className="bilan-footer">
      <span>NORMX Etats — SYCEBNL</span>
      <span>Exercice clos le 31/12/{annee}</span>
    </div>
  );

  return (
    <div className="bilan-wrapper">
      <div className="bilan-toolbar">
        <div className="bilan-toolbar-left">
          <button className="bilan-back-btn" onClick={onBack}><LuArrowLeft /> Retour</button>
          <h2>Compte de Resultat SYCEBNL</h2>
        </div>
        <div className="bilan-toolbar-right">
          <button className="bilan-export-btn secondary" onClick={openPreview}>
            <LuEye /> Apercu
          </button>
          <button className="bilan-export-btn" onClick={async () => { const pdf = await generatePDF(); pdf.save('Compte_Resultat_SYCEBNL_' + annee + '.pdf'); }}>
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
          {exercices.map(ex => (
            <option key={ex.id} value={ex.id}>{ex.annee}</option>
          ))}
        </select>
        {sourceUsed && <span style={{ marginLeft: 16, fontSize: 12, color: '#6b7280', fontStyle: 'italic' }}>Source : {sourceUsed}</span>}
        <span>(Montants en FCFA)</span>
      </div>

      {!balanceFound && !loading && (
        <div className="bilan-alert">
          <LuTriangleAlert /> Aucune donnee pour cet exercice. {balanceSource === 'ecritures' ? 'Saisissez des ecritures comptables pour cet exercice.' : 'Importez une balance CSV pour cet exercice.'}
        </div>
      )}

      {loading && <div style={{ padding: 20, color: '#888' }}>Chargement...</div>}

      {/* PAGE -- COMPTE DE RESULTAT */}
      <div className="a4-page" ref={pageRef}>
        {renderHeader()}

        <table className="bilan-table">
          <thead>
            <tr>
              <th className="col-ref" rowSpan={2}>REF</th>
              <th className="col-libelle" rowSpan={2}>LIBELLES</th>
              <th className="col-note" rowSpan={2}>Note</th>
              <th className="col-montant">EXERCICE AU 31/12/{annee}</th>
              <th className="col-montant">EXERCICE AU 31/12/{annee - 1}</th>
            </tr>
            <tr>
              <th className="col-montant">NET</th>
              <th className="col-montant">NET</th>
            </tr>
          </thead>
          <tbody>
            {CR_ROWS.map((row: CRRow, i: number) => {
              const rowClass = row.type === 'total' ? 'row-total'
                : row.type === 'result' ? 'row-subtotal'
                : row.type === 'subtotal' ? 'row-subtotal'
                : 'row-indent';

              const netN = getValue(row.ref, dataN);
              const netN1 = getValue(row.ref, dataN1);

              return (
                <tr key={i} className={rowClass}>
                  <td className="col-ref">{row.ref}</td>
                  <td className="col-libelle">{row.libelle}</td>
                  <td className="col-note">{row.note || ''}</td>
                  <td className="col-montant">{formatMontant(netN)}</td>
                  <td className="col-montant">{formatMontant(netN1)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {/* Indicateur excedent/deficit */}
        <div className="bilan-equilibre">
          {(() => {
            const resultat = getValue('XE', dataN);
            if (!balanceFound) return null;
            return (
              <span className={resultat >= 0 ? 'equilibre-ok' : 'equilibre-ko'}>
                {resultat >= 0
                  ? 'Excedent : ' + formatMontant(resultat) + ' FCFA'
                  : 'Deficit : ' + formatMontant(Math.abs(resultat)) + ' FCFA'
                }
              </span>
            );
          })()}
        </div>

        {renderFooter()}
      </div>

      {/* Modale apercu PDF */}
      {previewUrl && (
        <div className="pdf-preview-overlay" onClick={closePreview}>
          <div className="pdf-preview-modal" onClick={(e: React.MouseEvent<HTMLDivElement>) => e.stopPropagation()}>
            <div className="pdf-preview-header">
              <h3>Apercu — Compte de Resultat SYCEBNL {annee}</h3>
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
                title="Apercu Compte de Resultat PDF"
                className="pdf-preview-iframe"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default CompteResultatSYCEBNL;
