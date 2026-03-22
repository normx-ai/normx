import React, { useState, useRef, useEffect, useCallback } from 'react';
import { LuDownload, LuArrowLeft, LuTriangleAlert, LuEye, LuX, LuPrinter } from 'react-icons/lu';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import './BilanSYCEBNL.css';
import { BalanceLigne, Exercice, EtatBaseProps } from '../types';

// ===================== §2291 BILAN — PROJET DE DÉVELOPPEMENT =====================

interface ActifMappingEntry {
  comptes: string[];
  exclude?: string[];
  description: string;
  debiteur?: boolean;
}

interface PassifMappingEntry {
  comptes: string[];
  exclude?: string[];
  description: string;
  crediteur?: boolean;
}

interface BilanProjetRow {
  ref: string;
  type: 'header' | 'indent' | 'subtotal' | 'total';
  libelle: string;
  sumRefs?: string[];
}

type PageMode = 'actif' | 'passif';

// ACTIF — Mapping REF → comptes SYCEBNL (§2321 Tableau de correspondance)
const ACTIF_MAPPING: Record<string, ActifMappingEntry> = {
  AA: { comptes: ['21'], description: 'Immobilisations incorporelles' },
  AB: { comptes: ['22', '231', '232', '233', '2391', '2392', '2393', '2396'], description: 'Terrains et bâtiments' },
  AC: { comptes: ['234', '235', '238', '2394', '2395', '2398'], description: 'Aménagements, agencements et installations' },
  AD: { comptes: ['24'], exclude: ['245', '2495'], description: 'Matériel, mobilier et actifs biologiques' },
  AE: { comptes: ['245', '2495'], description: 'Matériel de transport' },
  AF: { comptes: ['25'], description: 'Avances et acomptes versés sur immobilisations' },
  AG: { comptes: ['275'], description: 'Dépôts et cautionnements' },
  AH: { comptes: ['26', '27'], exclude: ['275'], description: 'Autres immobilisations corporelles et financières' },
  BA: { comptes: ['485'], description: 'Actif circulant HAO', debiteur: true },
  BB: { comptes: ['31', '32', '33', '34', '36', '37', '38'], description: 'Stocks et encours' },
  BC: { comptes: ['409'], description: 'Fournisseurs débiteurs' },
  BD: { comptes: ['41'], exclude: ['411', '419'], description: 'Clients-usagers' },
  BE: { comptes: ['42', '43', '44', '47'], exclude: ['478'], description: 'Autres créances', debiteur: true },
  BV: { comptes: ['51'], description: 'Valeurs à encaisser' },
  BW: { comptes: ['52', '53', '55', '57'], description: 'Banques, établissements financiers, caisses et assimilés', debiteur: true },
  BY: { comptes: ['478'], description: 'Écart de conversion-Actif' },
};

// PASSIF — Mapping REF → comptes SYCEBNL (§2321 Tableau de correspondance)
const PASSIF_MAPPING: Record<string, PassifMappingEntry> = {
  CA: { comptes: ['16'], description: 'Fonds affectés aux investissements' },
  CB: { comptes: ['12'], description: 'Report à nouveau (+ ou -)' },
  CC: { comptes: ['131', '139'], description: 'Solde des opérations de l\'exercice' },
  CD: { comptes: ['14'], description: 'Subventions d\'investissement' },
  DA: { comptes: ['18'], description: 'Emprunts et dettes assimilées' },
  DB: { comptes: ['19'], description: 'Provisions pour risques et charges' },
  DE: { comptes: ['481', '484', '4998'], description: 'Dettes circulantes HAO', crediteur: true },
  DF: { comptes: ['46'], description: 'Fonds d\'administration' },
  DG: { comptes: ['40'], exclude: ['409'], description: 'Fournisseurs' },
  DH: { comptes: ['419', '42', '43', '44', '47', '499', '599'], exclude: ['479', '4998'], description: 'Autres dettes', crediteur: true },
  DI: { comptes: [], description: 'Provisions pour risques et charges à court terme' },
  DW: { comptes: ['56', '52', '53'], description: 'Banques, établissements financiers et crédits de trésorerie', crediteur: true },
  DY: { comptes: ['479'], description: 'Écart de conversion-Passif' },
};

// ===================== ROWS ACTIF =====================
const ACTIF_ROWS: BilanProjetRow[] = [
  { ref: '', type: 'header', libelle: 'ACTIF IMMOBILISÉ' },
  { ref: 'AA', type: 'indent', libelle: 'Immobilisations incorporelles' },
  { ref: 'AB', type: 'indent', libelle: 'Terrains et bâtiments' },
  { ref: 'AC', type: 'indent', libelle: 'Aménagements, agencements et installations' },
  { ref: 'AD', type: 'indent', libelle: 'Matériel, mobilier et actifs biologiques' },
  { ref: 'AE', type: 'indent', libelle: 'Matériel de transport' },
  { ref: 'AF', type: 'indent', libelle: 'Avances et acomptes versés sur immobilisations' },
  { ref: 'AG', type: 'indent', libelle: 'Dépôts et cautionnements' },
  { ref: 'AH', type: 'indent', libelle: 'Autres immobilisations corporelles et financières' },
  { ref: 'AZ', type: 'subtotal', libelle: 'TOTAL ACTIF IMMOBILISÉ', sumRefs: ['AA', 'AB', 'AC', 'AD', 'AE', 'AF', 'AG', 'AH'] },
  { ref: '', type: 'header', libelle: 'ACTIF CIRCULANT' },
  { ref: 'BA', type: 'indent', libelle: 'Actif circulant HAO' },
  { ref: 'BB', type: 'indent', libelle: 'Stocks et encours' },
  { ref: 'BC', type: 'indent', libelle: 'Fournisseurs débiteurs' },
  { ref: 'BD', type: 'indent', libelle: 'Clients-usagers' },
  { ref: 'BE', type: 'indent', libelle: 'Autres créances' },
  { ref: 'BF', type: 'subtotal', libelle: 'TOTAL ACTIF CIRCULANT', sumRefs: ['BA', 'BB', 'BC', 'BD', 'BE'] },
  { ref: '', type: 'header', libelle: 'TRÉSORERIE ACTIF' },
  { ref: 'BV', type: 'indent', libelle: 'Valeurs à encaisser' },
  { ref: 'BW', type: 'indent', libelle: 'Banques, établ. financiers, caisses et assimilés' },
  { ref: 'BX', type: 'subtotal', libelle: 'TOTAL TRÉSORERIE ACTIF', sumRefs: ['BV', 'BW'] },
  { ref: 'BY', type: 'indent', libelle: 'Écart de conversion-Actif' },
  { ref: 'BZ', type: 'total', libelle: 'TOTAL GÉNÉRAL', sumRefs: ['AZ', 'BF', 'BX', 'BY'] },
];

// ===================== ROWS PASSIF =====================
const PASSIF_ROWS: BilanProjetRow[] = [
  { ref: '', type: 'header', libelle: 'RESSOURCES PROPRES ET ASSIMILÉES' },
  { ref: 'CA', type: 'indent', libelle: 'Fonds affectés aux investissements' },
  { ref: 'CB', type: 'indent', libelle: 'Report à nouveau (+ ou -)' },
  { ref: 'CC', type: 'indent', libelle: 'Solde des opérations de l\'exercice' },
  { ref: 'CD', type: 'indent', libelle: 'Subventions d\'investissement' },
  { ref: 'CZ', type: 'subtotal', libelle: 'TOTAL RESSOURCES PROPRES ET ASSIMILÉES', sumRefs: ['CA', 'CB', 'CC', 'CD'] },
  { ref: '', type: 'header', libelle: 'DETTES FINANCIÈRES ET RESSOURCES ASSIMILÉES' },
  { ref: 'DA', type: 'indent', libelle: 'Emprunts et dettes assimilées' },
  { ref: 'DB', type: 'indent', libelle: 'Provisions pour risques et charges' },
  { ref: 'DC', type: 'subtotal', libelle: 'TOTAL DETTES FINANCIÈRES ET RESS. ASSIMILÉES', sumRefs: ['DA', 'DB'] },
  { ref: 'DD', type: 'subtotal', libelle: 'TOTAL RESSOURCES STABLES', sumRefs: ['CZ', 'DC'] },
  { ref: '', type: 'header', libelle: 'PASSIF CIRCULANT' },
  { ref: 'DE', type: 'indent', libelle: 'Dettes circulantes HAO' },
  { ref: 'DF', type: 'indent', libelle: 'Fonds d\'administration' },
  { ref: 'DG', type: 'indent', libelle: 'Fournisseurs' },
  { ref: 'DH', type: 'indent', libelle: 'Autres dettes' },
  { ref: 'DI', type: 'indent', libelle: 'Provisions pour risques et charges à court terme' },
  { ref: 'DJ', type: 'subtotal', libelle: 'TOTAL PASSIF CIRCULANT', sumRefs: ['DE', 'DF', 'DG', 'DH', 'DI'] },
  { ref: '', type: 'header', libelle: 'TRÉSORERIE PASSIF' },
  { ref: 'DW', type: 'indent', libelle: 'Banques, établ. financiers et crédits de trésorerie' },
  { ref: 'DX', type: 'subtotal', libelle: 'TOTAL TRÉSORERIE PASSIF', sumRefs: ['DW'] },
  { ref: 'DY', type: 'indent', libelle: 'Écart de conversion-Passif' },
  { ref: 'DZ', type: 'total', libelle: 'TOTAL GÉNÉRAL', sumRefs: ['DD', 'DJ', 'DX', 'DY'] },
];

// ===================== HELPERS =====================

function matchesComptes(numCompte: string, prefixes: string[]): boolean {
  return prefixes.some(p => numCompte.startsWith(p));
}

function computeActifValues(lignes: BalanceLigne[]): Record<string, number> {
  const result: Record<string, number> = {};
  for (const ref in ACTIF_MAPPING) {
    const { comptes, exclude = [], debiteur } = ACTIF_MAPPING[ref];
    let val = 0;
    for (const l of lignes) {
      const num = (l.numero_compte || '').trim();
      const sd = parseFloat(String(l.solde_debiteur_revise ?? l.solde_debiteur)) || 0;
      const sc = parseFloat(String(l.solde_crediteur_revise ?? l.solde_crediteur)) || 0;
      if (matchesComptes(num, comptes) && !matchesComptes(num, exclude)) {
        if (debiteur) {
          // Only take debit balances (debiteur accounts)
          if (sd > sc) val += sd - sc;
        } else {
          val += sd - sc;
        }
      }
    }
    result[ref] = Math.abs(val) > 0.5 ? Math.abs(val) : 0;
  }
  return result;
}

function computePassifValues(lignes: BalanceLigne[]): Record<string, number> {
  const result: Record<string, number> = {};
  for (const ref in PASSIF_MAPPING) {
    const { comptes, exclude = [], crediteur } = PASSIF_MAPPING[ref];
    let val = 0;
    for (const l of lignes) {
      const num = (l.numero_compte || '').trim();
      const sd = parseFloat(String(l.solde_debiteur_revise ?? l.solde_debiteur)) || 0;
      const sc = parseFloat(String(l.solde_crediteur_revise ?? l.solde_crediteur)) || 0;
      if (matchesComptes(num, comptes) && !matchesComptes(num, exclude)) {
        if (crediteur) {
          // Only take credit balances (créditeur accounts)
          if (sc > sd) val += sc - sd;
        } else {
          val += sc - sd;
        }
      }
    }
    result[ref] = Math.abs(val) > 0.5 ? Math.abs(val) : 0;
  }
  return result;
}

function formatMontant(val: number): string {
  if (!val || Math.abs(val) < 0.5) return '';
  return Math.round(val).toLocaleString('fr-FR');
}

function processRows(rows: BilanProjetRow[], rawVals: Record<string, number>): Record<string, number> {
  const processed: Record<string, number> = {};
  for (const row of rows) {
    if (!row.ref) continue;
    if (row.sumRefs) {
      processed[row.ref] = row.sumRefs.reduce((s: number, r: string) => s + (processed[r] || rawVals[r] || 0), 0);
    } else {
      processed[row.ref] = rawVals[row.ref] || 0;
    }
  }
  return processed;
}

// ===================== COMPOSANT PRINCIPAL =====================

function BilanProjet({ entiteName, entiteSigle = '', entiteAdresse = '', entiteNif = '', typeActivite, entiteId, offre = 'comptabilite', onBack }: EtatBaseProps): React.ReactElement {
  const [page, setPage] = useState<PageMode>('actif');
  const [exercices, setExercices] = useState<Exercice[]>([]);
  const [selectedExercice, setSelectedExercice] = useState<Exercice | null>(null);
  const [lignesN, setLignesN] = useState<BalanceLigne[]>([]);
  const [lignesN1, setLignesN1] = useState<BalanceLigne[]>([]);
  const balanceSource: string = offre === 'comptabilite' ? 'ecritures' : 'import';
  const [sourceUsed, setSourceUsed] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [pdfBlob, setPdfBlob] = useState<Blob | null>(null);

  const pageActifRef = useRef<HTMLDivElement>(null);
  const pagePassifRef = useRef<HTMLDivElement>(null);

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
      let lignesN1Result: BalanceLigne[] = [];
      let source = '';

      if (balanceSource === 'ecritures') {
        lignesNResult = await loadBalanceFromEcritures(entiteId, selectedExercice.id);
        source = 'Ecritures comptables';
      } else {
        const resN = await fetch('/api/balance/' + entiteId + '/' + selectedExercice.id + '/N');
        const dataN: { lignes?: BalanceLigne[] } = await resN.json();
        lignesNResult = dataN.lignes || [];
        source = 'Import balance';
      }
      setLignesN(lignesNResult);
      setSourceUsed(source);

      // N-1
      const prevExercice = exercices.find(e => e.annee === selectedExercice.annee - 1);
      if (prevExercice) {
        if (balanceSource === 'ecritures') {
          lignesN1Result = await loadBalanceFromEcritures(entiteId, prevExercice.id);
        } else {
          const resN1 = await fetch('/api/balance/' + entiteId + '/' + prevExercice.id + '/N');
          const dataN1: { lignes?: BalanceLigne[] } = await resN1.json();
          lignesN1Result = dataN1.lignes || [];
        }
      }
      setLignesN1(lignesN1Result);
    } catch {
      // Error loading balance
    } finally {
      setLoading(false);
    }
  }, [entiteId, selectedExercice, exercices, balanceSource]);

  useEffect(() => { loadBalance(); }, [loadBalance]);

  // Compute all values
  const actifRawN = computeActifValues(lignesN);
  const passifRawN = computePassifValues(lignesN);
  const actifRawN1 = computeActifValues(lignesN1);
  const passifRawN1 = computePassifValues(lignesN1);

  const actifN = processRows(ACTIF_ROWS, actifRawN);
  const passifN = processRows(PASSIF_ROWS, passifRawN);
  const actifN1 = processRows(ACTIF_ROWS, actifRawN1);
  const passifN1 = processRows(PASSIF_ROWS, passifRawN1);

  const annee = selectedExercice ? selectedExercice.annee : new Date().getFullYear();

  // PDF generation
  const generatePDF = async (): Promise<jsPDF> => {
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

      {/* PAGE ACTIF */}
      {page === 'actif' && !loading && lignesN.length > 0 && (
        <div className="a4-page" ref={pageActifRef}>
          {renderHeader('ACTIF')}

          <table className="bilan-table">
            <thead>
              <tr>
                <th className="col-ref">REF</th>
                <th className="col-libelle">ACTIF</th>
                <th className="col-montant">EXERCICE AU 31/12/{annee}<br/>NET</th>
                <th className="col-montant">EXERCICE AU 31/12/{annee - 1}<br/>NET</th>
              </tr>
            </thead>
            <tbody>
              {ACTIF_ROWS.map((row: BilanProjetRow, i: number) => {
                const rowClass = row.type === 'header' ? 'row-section'
                  : row.type === 'total' ? 'row-total'
                  : row.type === 'subtotal' ? 'row-subtotal'
                  : 'row-indent';

                const valN = row.ref ? (actifN[row.ref] || 0) : 0;
                const valN1 = row.ref ? (actifN1[row.ref] || 0) : 0;

                return (
                  <tr key={i} className={rowClass}>
                    <td className="col-ref">{row.ref}</td>
                    <td className="col-libelle">{row.libelle}</td>
                    <td className="col-montant">{row.type !== 'header' ? formatMontant(valN) : ''}</td>
                    <td className="col-montant">{row.type !== 'header' ? formatMontant(valN1) : ''}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {renderFooter()}
        </div>
      )}

      {/* PAGE PASSIF */}
      {page === 'passif' && !loading && lignesN.length > 0 && (
        <div className="a4-page" ref={pagePassifRef}>
          {renderHeader('PASSIF')}

          <table className="bilan-table">
            <thead>
              <tr>
                <th className="col-ref">REF</th>
                <th className="col-libelle">PASSIF</th>
                <th className="col-montant">EXERCICE AU 31/12/{annee}<br/>NET</th>
                <th className="col-montant">EXERCICE AU 31/12/{annee - 1}<br/>NET</th>
              </tr>
            </thead>
            <tbody>
              {PASSIF_ROWS.map((row: BilanProjetRow, i: number) => {
                const rowClass = row.type === 'header' ? 'row-section'
                  : row.type === 'total' ? 'row-total'
                  : row.type === 'subtotal' ? 'row-subtotal'
                  : 'row-indent';

                const valN = row.ref ? (passifN[row.ref] || 0) : 0;
                const valN1 = row.ref ? (passifN1[row.ref] || 0) : 0;

                return (
                  <tr key={i} className={rowClass}>
                    <td className="col-ref">{row.ref}</td>
                    <td className="col-libelle">{row.libelle}</td>
                    <td className="col-montant">{row.type !== 'header' ? formatMontant(valN) : ''}</td>
                    <td className="col-montant">{row.type !== 'header' ? formatMontant(valN1) : ''}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* Equilibre */}
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

      {/* Modale apercu PDF */}
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
