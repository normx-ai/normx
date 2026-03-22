import React, { useState, useRef, useEffect, useCallback } from 'react';
import { LuDownload, LuArrowLeft, LuTriangleAlert, LuEye, LuX, LuPrinter } from 'react-icons/lu';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import './BilanSYCEBNL.css';
import { BalanceLigne, Exercice, EtatBaseProps } from '../types';

// ===================== §2288 TABLEAU EMPLOIS RESSOURCES — PROJET DE DÉVELOPPEMENT =====================

interface TERMappingEntry {
  comptes: string[];
  exclude?: string[];
  description: string;
}

interface TERRow {
  ref: string;
  type: 'indent' | 'section' | 'subtotal' | 'total';
  libelle: string;
  sumRefs?: string[];
  computeExcedent?: boolean;
  computeEncaisse?: boolean;
  computeControle?: boolean;
}

// RESSOURCES (fonds reçus) — Mapping REF → comptes SYCEBNL (§2319 mouvement crédit)
const RESSOURCES_MAPPING: Record<string, TERMappingEntry> = {
  FA: { comptes: ['161', '162', '462'], description: 'Fonds reçus, Bailleurs (principal)' },
  FB: { comptes: ['161', '162', '462'], description: 'Fonds reçus, Bailleurs (secondaire — sous-comptes par bailleur)' },
  FC: { comptes: ['163', '463'], description: 'Fonds contrepartie État' },
  FD: { comptes: ['164', '464', '707', '77'], description: 'Autres fonds reçus' },
};

// EMPLOIS — IMMOBILISATIONS — Mapping REF → comptes SYCEBNL (§2319 mouvement débit)
const IMMOB_MAPPING: Record<string, TERMappingEntry> = {
  FE: { comptes: ['21'], description: 'Immobilisations incorporelles' },
  FF: { comptes: ['22'], description: 'Terrains' },
  FG: { comptes: ['231', '232', '233', '2391', '2392', '2393', '2396'], description: 'Bâtiments' },
  FH: { comptes: ['234', '235', '238', '2394', '2395', '2398'], description: 'Aménagements, agencements et installations' },
  FI: { comptes: ['24'], exclude: ['245', '2495'], description: 'Matériel, mobilier et actifs biologiques' },
  FJ: { comptes: ['245', '2495'], description: 'Matériel de transport' },
  FK: { comptes: ['25'], description: 'Avances et acomptes sur immobilisations' },
  FL: { comptes: ['26', '27'], description: 'Immobilisations financières' },
};

// EMPLOIS — CHARGES DE FONCTIONNEMENT — Mapping REF → comptes SYCEBNL (§2319 mouvement débit)
const CHARGES_MAPPING: Record<string, TERMappingEntry> = {
  FM: { comptes: ['60'], description: 'Achats de biens et services' },
  FN: { comptes: ['61'], description: 'Transports' },
  FO: { comptes: ['62', '63'], description: 'Services extérieurs' },
  FP: { comptes: ['64'], description: 'Impôts et taxes' },
  FQ: { comptes: ['65'], description: 'Autres charges' },
  FR: { comptes: ['66'], description: 'Charges de personnel' },
  FS: { comptes: ['67'], description: 'Charges financières' },
  FT: { comptes: ['4091', '4093'], description: 'Avances sur charges (à justifier)' },
};

// FONDS EN DÉBUT D'EXERCICE — comptes de trésorerie (solde débiteur N-1)
const FONDS_DEBUT_MAPPING: Record<string, TERMappingEntry> = {
  FU: { comptes: ['51', '52', '53', '55', '57'], description: 'Fonds Bailleur en début exercice N' },
  FV: { comptes: ['51', '52', '53', '55', '57'], description: 'Fonds de contrepartie État en début exercice N' },
  FW: { comptes: ['51', '52', '53', '55', '57'], description: 'Autres fonds en début exercice N' },
};

// FONDS EN FIN D'EXERCICE (solde débiteur N)
const FONDS_FIN_MAPPING: Record<string, TERMappingEntry> = {
  FX: { comptes: ['51', '52', '53', '55', '57'], description: 'Fonds Bailleur en fin exercice N' },
  FY: { comptes: ['51', '52', '53', '55', '57'], description: 'Fonds de contrepartie État en fin exercice N' },
  FZ: { comptes: ['51', '52', '53', '55', '57'], description: 'Autres fonds en fin exercice N' },
};

// ===================== ROWS DU TABLEAU §2288 =====================
const TER_ROWS: TERRow[] = [
  // I. RESSOURCES
  { ref: 'FA', type: 'indent', libelle: 'Fonds reçus, Bailleurs ....' },
  { ref: 'FB', type: 'indent', libelle: 'Fonds reçus, Bailleurs ....' },
  { ref: 'FC', type: 'indent', libelle: 'Fonds contrepartie État' },
  { ref: 'FD', type: 'indent', libelle: 'Autres fonds reçus' },
  { ref: 'GR', type: 'section', libelle: 'I. RESSOURCES', sumRefs: ['FA', 'FB', 'FC', 'FD'] },

  // A- IMMOBILISATIONS
  { ref: 'FE', type: 'indent', libelle: 'Immobilisations incorporelles' },
  { ref: 'FF', type: 'indent', libelle: 'Terrains' },
  { ref: 'FG', type: 'indent', libelle: 'Bâtiments' },
  { ref: 'FH', type: 'indent', libelle: 'Aménagements, agencements et installations' },
  { ref: 'FI', type: 'indent', libelle: 'Matériel, mobilier et actifs biologiques' },
  { ref: 'FJ', type: 'indent', libelle: 'Matériel de transport' },
  { ref: 'FK', type: 'indent', libelle: 'Avances et acomptes sur immobilisations' },
  { ref: 'FL', type: 'indent', libelle: 'Immobilisations financières' },
  { ref: 'GS', type: 'subtotal', libelle: 'A- TOTAL DES IMMOBILISATIONS', sumRefs: ['FE', 'FF', 'FG', 'FH', 'FI', 'FJ', 'FK', 'FL'] },

  // B- CHARGES DE FONCTIONNEMENT
  { ref: 'FM', type: 'indent', libelle: 'Achats de biens et services' },
  { ref: 'FN', type: 'indent', libelle: 'Transports' },
  { ref: 'FO', type: 'indent', libelle: 'Services extérieurs' },
  { ref: 'FP', type: 'indent', libelle: 'Impôts et taxes' },
  { ref: 'FQ', type: 'indent', libelle: 'Autres charges' },
  { ref: 'FR', type: 'indent', libelle: 'Charges de personnel' },
  { ref: 'FS', type: 'indent', libelle: 'Charges financières' },
  { ref: 'FT', type: 'indent', libelle: 'Avances sur charges (à justifier)' },
  { ref: 'GT', type: 'subtotal', libelle: 'B- TOTAL DES CHARGES DE FONCTIONNEMENT', sumRefs: ['FM', 'FN', 'FO', 'FP', 'FQ', 'FR', 'FS', 'FT'] },

  // II. EMPLOIS
  { ref: 'GU', type: 'section', libelle: 'II. EMPLOIS (A+B)', sumRefs: ['GS', 'GT'] },

  // III. EXCÉDENT/DÉFICIT
  { ref: 'GV', type: 'section', libelle: 'III. EXCÉDENT / DÉFICIT DES FONDS REÇUS SUR LES EMPLOIS (I-II)', computeExcedent: true },

  // IV. FONDS DISPONIBLE EN DÉBUT EXERCICE
  { ref: 'FU', type: 'indent', libelle: 'Fonds Bailleur en début exercice N' },
  { ref: 'FV', type: 'indent', libelle: 'Fonds de contrepartie État en début exercice N' },
  { ref: 'FW', type: 'indent', libelle: 'Autres fonds en début exercice N' },
  { ref: 'GW', type: 'section', libelle: 'IV. FONDS DISPONIBLE EN DÉBUT EXERCICE', sumRefs: ['FU', 'FV', 'FW'] },

  // V. MONTANT NET DE L'ENCAISSE DISPONIBLE
  { ref: 'GX', type: 'section', libelle: 'V. MONTANT NET DE L\'ENCAISSE DISPONIBLE (III+IV)', computeEncaisse: true },

  // VI. FONDS DISPONIBLE EN FIN EXERCICE
  { ref: 'FX', type: 'indent', libelle: 'Fonds Bailleur en fin exercice N' },
  { ref: 'FY', type: 'indent', libelle: 'Fonds de contrepartie État en fin exercice N' },
  { ref: 'FZ', type: 'indent', libelle: 'Autres fonds en fin exercice N' },
  { ref: 'GY', type: 'section', libelle: 'VI. FONDS DISPONIBLE EN FIN EXERCICE', sumRefs: ['FX', 'FY', 'FZ'] },

  // VII. CONTRÔLE
  { ref: 'GZ', type: 'total', libelle: 'VII. CONTRÔLE : TOTAL V = TOTAL VI', computeControle: true },
];

// ===================== HELPERS =====================

function matchesComptes(numCompte: string, prefixes: string[]): boolean {
  return prefixes.some(p => numCompte.startsWith(p));
}

function computeValues(lignes: BalanceLigne[], mapping: Record<string, TERMappingEntry>): Record<string, number> {
  const result: Record<string, number> = {};
  for (const ref in mapping) {
    const comptes = mapping[ref].comptes || [];
    const exclude = mapping[ref].exclude || [];
    let val = 0;
    for (const l of lignes) {
      const num = (l.numero_compte || '').trim();
      const sd = parseFloat(String(l.solde_debiteur_revise ?? l.solde_debiteur)) || 0;
      const sc = parseFloat(String(l.solde_crediteur_revise ?? l.solde_crediteur)) || 0;
      if (matchesComptes(num, comptes) && !matchesComptes(num, exclude)) {
        // Ressources = crédit - débit (fonds reçus)
        // Emplois = débit - crédit (dépenses)
        val += sd - sc;
      }
    }
    result[ref] = val;
  }
  return result;
}

function computeRessources(lignes: BalanceLigne[]): Record<string, number> {
  const result: Record<string, number> = {};
  for (const ref in RESSOURCES_MAPPING) {
    const comptes = RESSOURCES_MAPPING[ref].comptes || [];
    let val = 0;
    for (const l of lignes) {
      const num = (l.numero_compte || '').trim();
      const sc = parseFloat(String(l.solde_crediteur_revise ?? l.solde_crediteur)) || 0;
      const sd = parseFloat(String(l.solde_debiteur_revise ?? l.solde_debiteur)) || 0;
      if (matchesComptes(num, comptes)) {
        val += sc - sd; // Ressources = créditeur
      }
    }
    result[ref] = val;
  }
  return result;
}

function computeEmplois(lignes: BalanceLigne[]): Record<string, number> {
  const immob = computeValues(lignes, IMMOB_MAPPING);
  const charges = computeValues(lignes, CHARGES_MAPPING);
  // Emplois = débit - crédit (positif = dépense)
  const result: Record<string, number> = {};
  for (const ref in immob) result[ref] = Math.abs(immob[ref]);
  for (const ref in charges) result[ref] = Math.abs(charges[ref]);
  return result;
}

function formatMontant(val: number): string {
  if (!val || Math.abs(val) < 0.5) return '';
  return Math.round(val).toLocaleString('fr-FR');
}

// ===================== COMPOSANT PRINCIPAL =====================

function TER_Projet({ entiteName, entiteSigle = '', entiteAdresse = '', entiteNif = '', typeActivite, entiteId, offre = 'comptabilite', onBack }: EtatBaseProps): React.ReactElement {
  const [exercices, setExercices] = useState<Exercice[]>([]);
  const [selectedExercice, setSelectedExercice] = useState<Exercice | null>(null);
  const [lignesN, setLignesN] = useState<BalanceLigne[]>([]);
  const [lignesN1, setLignesN1] = useState<BalanceLigne[]>([]);
  const balanceSource: string = offre === 'comptabilite' ? 'ecritures' : 'import';
  const [sourceUsed, setSourceUsed] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [pdfBlob, setPdfBlob] = useState<Blob | null>(null);

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
        source = 'Écritures comptables';
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
  const ressourcesN = computeRessources(lignesN);
  const emploisN = computeEmplois(lignesN);
  const ressourcesN1 = computeRessources(lignesN1);
  const emploisN1 = computeEmplois(lignesN1);

  // Merge all values for N and N-1
  const valsN: Record<string, number> = { ...ressourcesN, ...emploisN };
  const valsN1: Record<string, number> = { ...ressourcesN1, ...emploisN1 };

  // Compute fonds début/fin (from N-1 balance for début, N balance for fin)
  const fondsDebutN = computeRessources(lignesN1);
  valsN['FU'] = fondsDebutN['FA'] || 0;
  valsN['FV'] = fondsDebutN['FC'] || 0;
  valsN['FW'] = fondsDebutN['FD'] || 0;

  const fondsFinN = computeRessources(lignesN);
  valsN['FX'] = fondsFinN['FA'] || 0;
  valsN['FY'] = fondsFinN['FC'] || 0;
  valsN['FZ'] = fondsFinN['FD'] || 0;

  // Compute subtotals/sections
  const computeSum = (refs: string[], vals: Record<string, number>): number => refs.reduce((s: number, r: string) => s + (vals[r] || 0), 0);

  // Process rows and compute calculated fields
  const processedN: Record<string, number> = {};
  const processedN1: Record<string, number> = {};

  for (const row of TER_ROWS) {
    if (row.sumRefs) {
      processedN[row.ref] = computeSum(row.sumRefs, { ...valsN, ...processedN });
      processedN1[row.ref] = computeSum(row.sumRefs, { ...valsN1, ...processedN1 });
    } else if (row.computeExcedent) {
      processedN[row.ref] = (processedN['GR'] || 0) - (processedN['GU'] || 0);
      processedN1[row.ref] = (processedN1['GR'] || 0) - (processedN1['GU'] || 0);
    } else if (row.computeEncaisse) {
      processedN[row.ref] = (processedN['GV'] || 0) + (processedN['GW'] || 0);
      processedN1[row.ref] = (processedN1['GV'] || 0) + (processedN1['GW'] || 0);
    } else if (row.computeControle) {
      processedN[row.ref] = (processedN['GX'] || 0) - (processedN['GY'] || 0);
      processedN1[row.ref] = (processedN1['GX'] || 0) - (processedN1['GY'] || 0);
    } else {
      processedN[row.ref] = valsN[row.ref] || 0;
      processedN1[row.ref] = valsN1[row.ref] || 0;
    }
  }

  // Solde cumulé début exercice = N-1 cumul fin
  // Solde cumulé fin exercice = début + exercice N
  const cumulDebutN: Record<string, number> = {};
  const cumulFinN: Record<string, number> = {};
  for (const row of TER_ROWS) {
    cumulDebutN[row.ref] = processedN1[row.ref] || 0;
    cumulFinN[row.ref] = (cumulDebutN[row.ref] || 0) + (processedN[row.ref] || 0);
  }

  const annee = selectedExercice ? selectedExercice.annee : new Date().getFullYear();

  // PDF generation
  const generatePDF = async (): Promise<void> => {
    if (!tableRef.current) return;
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
      // Multi-page
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
          <button className="bilan-export-btn secondary" onClick={generatePDF}>
            <LuEye /> Apercu
          </button>
          <button className="bilan-export-btn" onClick={async () => {
            if (!tableRef.current) return;
            const canvas = await html2canvas(tableRef.current, { scale: 2, useCORS: true, backgroundColor: '#fff' });
            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
            const pageW = pdf.internal.pageSize.getWidth();
            const pageH = pdf.internal.pageSize.getHeight();
            const margin = 10;
            const imgW = pageW - margin * 2;
            const imgH = (canvas.height * imgW) / canvas.width;
            if (imgH <= pageH - margin * 2) {
              pdf.addImage(imgData, 'PNG', margin, margin, imgW, imgH);
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
            pdf.save(`TER_${entiteName || 'projet'}_${selectedExercice?.annee || ''}.pdf`);
          }}>
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

          <table className="bilan-table">
            <thead>
              <tr>
                <th className="col-ref">REF</th>
                <th className="col-libelle">DESIGNATION</th>
                <th className="col-montant">SOLDE CUMULE{'\n'}DEBUT EXERCICE N</th>
                <th className="col-montant">EXERCICE N</th>
                <th className="col-montant">SOLDE CUMULE{'\n'}FIN EXERCICE N</th>
              </tr>
            </thead>
            <tbody>
              {TER_ROWS.map((row: TERRow, i: number) => {
                const rowClass = row.type === 'total' ? 'row-total'
                  : row.type === 'section' ? 'row-section'
                  : row.type === 'subtotal' ? 'row-subtotal'
                  : 'row-indent';

                const valN = processedN[row.ref] || 0;
                const valDebut = cumulDebutN[row.ref] || 0;
                const valFin = cumulFinN[row.ref] || 0;
                return (
                  <tr key={i} className={rowClass}>
                    <td className="col-ref">{row.ref}</td>
                    <td className="col-libelle">{row.libelle}</td>
                    <td className="col-montant">{formatMontant(valDebut)}</td>
                    <td className="col-montant">{formatMontant(valN)}</td>
                    <td className="col-montant">{formatMontant(valFin)}</td>
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
