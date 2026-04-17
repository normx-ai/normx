import React, { useState, useRef, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { clientFetch } from '../lib/api';
import { LuDownload, LuArrowLeft, LuTriangleAlert, LuEye, LuX, LuPrinter } from 'react-icons/lu';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import './BilanSYCEBNL.css';
import type { BalanceLigne, Exercice, EtatBaseProps, ActifMapping, PassifMapping, BilanRow } from '../types';
import { useExercicesQuery } from '../hooks/useExercicesQuery';

// ===================== CALCUL DU RESULTAT NET (CR) pour le poste CH du Bilan =====================
// Resultat net = Produits (classe 7 + HAO) - Charges (classe 6 + HAO)
// Cela garantit la coherence entre le Bilan (CH) et le Compte de Resultat (XE)

const PRODUITS_PREFIXES: string[] = ['70', '71', '72', '73', '75', '77', '78', '79', '82', '84', '86', '88'];
const CHARGES_PREFIXES: string[] = ['60', '61', '62', '63', '64', '65', '66', '67', '68', '69', '81', '83', '85', '87'];

function computeResultatNet(lignes: BalanceLigne[]): number {
  let produits = 0;
  let charges = 0;
  for (const l of lignes) {
    const num = (l.numero_compte || '').trim();
    const sd = parseFloat(String(l.solde_debiteur_revise ?? l.solde_debiteur)) || 0;
    const sc = parseFloat(String(l.solde_crediteur_revise ?? l.solde_crediteur)) || 0;
    if (PRODUITS_PREFIXES.some(p => num.startsWith(p))) {
      produits += sc - sd; // produits = credit - debit
    }
    if (CHARGES_PREFIXES.some(p => num.startsWith(p))) {
      charges += sd - sc; // charges = debit - credit
    }
  }
  return produits - charges;
}

// ===================== S2229 TABLEAU DE CORRESPONDANCE -- BILAN SYCEBNL =====================

// ACTIF -- Mapping REF -> comptes OHADA (BRUT et Amortissements separement)
const ACTIF_MAPPING: Record<string, ActifMapping> = {
  AA: { brut: ['20'], amort: [] },
  AB: { brut: ['201'], amort: ['280', '2901'] },
  AC: { brut: ['202', '203', '204', '205'], amort: ['2902'] },
  AE: { brut: ['212', '213', '214', '2193'], amort: ['2812', '2813', '2814', '2912', '2913', '2914', '2919'] },
  AF: { brut: ['218', '2198'], amort: ['2818', '2918', '2919'] },
  AG: { brut: ['251'], amort: ['2951'] },
  AI: { brut: ['22'], amort: ['282', '292'] },
  AJ: { brut: ['231', '232', '233', '2391', '2392', '2393', '2396'], amort: ['2831', '2832', '2833', '2931', '2932', '2933', '2939'] },
  AK: { brut: ['234', '235', '238', '2394', '2395', '2398'], amort: ['2834', '2835', '2838', '2934', '2935', '2938', '2939'] },
  AL: { brut: ['24'], brutExclude: ['245', '2495'], amort: ['284', '294', '2949'], amortExclude: ['2845', '2945'] },
  AM: { brut: ['245', '2495'], amort: ['2845', '2945', '2949'] },
  AN: { brut: ['252'], amort: ['2952'] },
  AX: { brut: ['26'], amort: ['296'] },
  AY: { brut: ['27'], amort: ['297'] },
  BA: { brut: ['485', '4865'], amort: ['498'] },
  BB: { brut: ['31', '32', '33', '34', '36', '37', '38'], amort: ['39'] },
  BC: { brut: ['409'], amort: ['490'] },
  BD: { brut: ['41'], brutExclude: ['419'], amort: ['491'] },
  BE: { brut: ['42', '43', '44', '45', '47'], brutExclude: ['478'], amort: ['492', '493', '494', '497'], debitOnly: ['42', '43', '44', '45', '47'] },
  BU: { brut: ['50'], amort: ['590'] },
  BV: { brut: ['51'], amort: ['591'] },
  BW: { brut: ['52', '53', '55', '57'], amort: ['592', '593', '595'], debitOnly: ['52', '53'] },
  BY: { brut: ['478'], amort: [] },
};

// PASSIF -- Mapping REF -> comptes OHADA (soldes crediteurs)
const PASSIF_MAPPING: Record<string, PassifMapping> = {
  CA: { comptes: ['101'] },
  CB: { comptes: ['102'] },
  CC: { comptes: ['103'] },
  CD: { comptes: ['104'] },
  CE: { comptes: ['106'] },
  CF: { comptes: ['11'] },
  CG: { comptes: ['12'] },
  CH: { comptes: ['13', '131', '139'], computeFromCR: true },
  CI: { comptes: ['14'] },
  CJ: { comptes: ['15'] },
  CW: { comptes: ['16'] },
  CX: { comptes: ['17'] },
  DA: { comptes: ['181', '182', '183', '185', '186', '188'] },
  DB: { comptes: ['187'] },
  DC: { comptes: ['19'] },
  DF: { comptes: ['481', '484', '4861', '488', '4998'] },
  DG: { comptes: ['419'] },
  DH: { comptes: ['40'], exclude: ['409'] },
  DI: { comptes: ['42', '43', '44', '45', '47', '499', '599'], exclude: ['479', '4998'], creditOnly: ['42', '43', '44', '45', '47'] },
  DW: { comptes: ['56', '52', '53'], creditOnly: ['52', '53'] },
  DY: { comptes: ['479'] },
};

// ===================== ACTIF ROWS -- S2180 =====================
const ACTIF_ROWS: BilanRow[] = [
  { ref: 'AA', type: 'indent', note: '5', libelle: 'Immobilisations destinees a la vente provenant de dons et legs non encore recues et usufruit temporaire' },
  { ref: 'AB', type: 'indent', note: '', libelle: 'Immobilisations incorporelles' },
  { ref: 'AC', type: 'indent', note: '', libelle: 'Immobilisations corporelles et financieres' },
  { ref: 'AD', type: 'subsection', note: '5', libelle: 'IMMOBILISATIONS INCORPORELLES' },
  { ref: 'AE', type: 'indent', note: '', libelle: 'Brevets, licences, logiciels et droits similaires' },
  { ref: 'AF', type: 'indent', note: '', libelle: 'Autres immobilisations incorporelles' },
  { ref: 'AG', type: 'indent', note: '', libelle: 'Avances et acomptes verses sur immobilisations incorporelles' },
  { ref: 'AH', type: 'subsection', note: '5', libelle: 'IMMOBILISATIONS CORPORELLES' },
  { ref: 'AI', type: 'indent', note: '', libelle: 'Terrains' },
  { ref: 'AJ', type: 'indent', note: '', libelle: 'Batiments' },
  { ref: 'AK', type: 'indent', note: '', libelle: 'Amenagements, agencements et installations' },
  { ref: 'AL', type: 'indent', note: '', libelle: 'Materiel, mobilier et actifs biologiques' },
  { ref: 'AM', type: 'indent', note: '', libelle: 'Materiel de transport' },
  { ref: 'AN', type: 'indent', note: '', libelle: 'Avances et acomptes verses sur immobilisations corporelles' },
  { ref: 'AO', type: 'subsection', note: '6', libelle: 'IMMOBILISATIONS FINANCIERES' },
  { ref: 'AX', type: 'indent', note: '', libelle: 'Titres de participation' },
  { ref: 'AY', type: 'indent', note: '', libelle: 'Autres immobilisations financieres' },
  { ref: 'AZ', type: 'subtotal', libelle: 'TOTAL ACTIF IMMOBILISE', sumRefs: ['AA','AB','AC','AE','AF','AG','AI','AJ','AK','AL','AM','AN','AX','AY'] },

  { ref: 'BA', type: 'indent', note: '7', libelle: 'Actif circulant HAO' },
  { ref: 'BB', type: 'indent', note: '8', libelle: 'Stocks et encours' },
  { ref: 'BC', type: 'indent', note: '19', libelle: 'Fournisseurs debiteurs' },
  { ref: 'BD', type: 'indent', note: '9', libelle: 'Adherents, clients-usagers' },
  { ref: 'BE', type: 'indent', note: '10', libelle: 'Autres creances' },
  { ref: 'BT', type: 'subtotal', libelle: 'TOTAL ACTIF CIRCULANT', sumRefs: ['BA','BB','BC','BD','BE'] },

  { ref: 'BU', type: 'indent', note: '11', libelle: 'Titres de placement' },
  { ref: 'BV', type: 'indent', note: '12', libelle: 'Valeurs a encaisser' },
  { ref: 'BW', type: 'indent', note: '13', libelle: 'Banques, etablissements financiers, caisses et assimiles' },
  { ref: 'BX', type: 'subtotal', libelle: 'TOTAL TRESORERIE ACTIF', sumRefs: ['BU','BV','BW'] },

  { ref: 'BY', type: 'indent', note: '14', libelle: 'Ecart de conversion-Actif' },
  { ref: 'BZ', type: 'total', libelle: 'TOTAL GENERAL', sumRefs: ['AZ','BT','BX','BY'] },
];

// ===================== PASSIF ROWS -- S2180 =====================
const PASSIF_ROWS: BilanRow[] = [
  { ref: 'CA', type: 'indent', note: '15', libelle: 'Dotation non consomptible sans droit de reprise' },
  { ref: 'CB', type: 'indent', note: '15', libelle: 'Dotation non consomptible avec droit de reprise' },
  { ref: 'CC', type: 'indent', note: '15', libelle: 'Droit d\'entree' },
  { ref: 'CD', type: 'indent', note: '15', libelle: 'Dotation consomptible' },
  { ref: 'CE', type: 'indent', note: '5F', libelle: 'Ecarts de reevaluation' },
  { ref: 'CF', type: 'indent', note: '16', libelle: 'Reserves' },
  { ref: 'CG', type: 'indent', note: '16', libelle: 'Report a nouveau (+ ou -)' },
  { ref: 'CH', type: 'indent', note: '', libelle: 'Resultat net de l\'exercice (excedent + ou deficit -)' },
  { ref: 'CI', type: 'indent', note: '17A', libelle: 'Subventions d\'investissement' },
  { ref: 'CJ', type: 'indent', note: '17A', libelle: 'Provisions reglementees' },
  { ref: 'CK', type: 'subtotal', libelle: 'TOTAL FONDS PROPRES ET ASSIMILES', sumRefs: ['CA','CB','CC','CD','CE','CF','CG','CH','CI','CJ'] },

  { ref: 'CW', type: 'indent', note: '17B', libelle: 'Fonds affectes et provenant de dons et legs d\'immobilisations' },
  { ref: 'CX', type: 'indent', note: '17B', libelle: 'Fonds reportes' },
  { ref: 'CY', type: 'subtotal', libelle: 'TOTAL FONDS AFFECTES ET REPORTES', sumRefs: ['CW','CX'] },

  { ref: 'CZ', type: 'subtotal', libelle: 'TOTAL RESSOURCES PROPRES ET ASSIMILEES', sumRefs: ['CK','CY'] },

  { ref: 'DA', type: 'indent', note: '18A', libelle: 'Emprunts et dettes financieres' },
  { ref: 'DB', type: 'indent', note: '18A', libelle: 'Dettes de location-acquisition' },
  { ref: 'DC', type: 'indent', note: '18A', libelle: 'Provisions pour risques et charges' },
  { ref: 'DD', type: 'subtotal', libelle: 'TOTAL DETTES FINANCIERES ET RESSOURCES ASSIMILEES', sumRefs: ['DA','DB','DC'] },

  { ref: 'DE', type: 'subtotal', libelle: 'TOTAL RESSOURCES STABLES', sumRefs: ['CZ','DD'] },

  { ref: 'DF', type: 'indent', note: '7', libelle: 'Dettes circulantes HAO' },
  { ref: 'DG', type: 'indent', note: '9', libelle: 'Adherents, clients-usagers crediteurs' },
  { ref: 'DH', type: 'indent', note: '19', libelle: 'Fournisseurs' },
  { ref: 'DI', type: 'indent', note: '20 & 21', libelle: 'Autres dettes' },
  { ref: 'DV', type: 'subtotal', libelle: 'TOTAL PASSIF CIRCULANT', sumRefs: ['DF','DG','DH','DI'] },

  { ref: 'DW', type: 'indent', note: '22', libelle: 'Banques, etablissements financiers et credits de tresorerie' },
  { ref: 'DX', type: 'subtotal', libelle: 'TOTAL TRESORERIE PASSIF', sumRefs: ['DW'] },

  { ref: 'DY', type: 'indent', note: '14', libelle: 'Ecart de conversion-Passif' },
  { ref: 'DZ', type: 'total', libelle: 'TOTAL GENERAL', sumRefs: ['DE','DV','DX','DY'] },
];

interface ActifValues {
  brut: number;
  amort: number;
  net: number;
}

interface PassifValues {
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

// Check if account number matches any prefix in the list
function matchesComptes(numCompte: string, prefixes: string[]): boolean {
  return prefixes.some(p => numCompte.startsWith(p));
}

// Compute ACTIF values from balance lines using S2229 mapping
function computeFromBalance(lignes: BalanceLigne[], mapping: Record<string, ActifMapping>): Record<string, ActifValues> {
  const result: Record<string, ActifValues> = {};

  for (const ref in mapping) {
    const brutComptes = mapping[ref].brut || [];
    const brutExclude = mapping[ref].brutExclude || [];
    const amortComptes = mapping[ref].amort || [];
    const amortExclude = mapping[ref].amortExclude || [];
    const debitOnly = mapping[ref].debitOnly || [];
    let brut = 0;
    let amort = 0;

    for (const l of lignes) {
      const num = (l.numero_compte || '').trim();
      const sd = parseFloat(String(l.solde_debiteur_revise ?? l.solde_debiteur)) || 0;
      const sc = parseFloat(String(l.solde_crediteur_revise ?? l.solde_crediteur)) || 0;

      // Comptes brut (avec exclusions)
      if (matchesComptes(num, brutComptes) && !matchesComptes(num, brutExclude)) {
        if (debitOnly.length > 0 && matchesComptes(num, debitOnly)) {
          if (sd > sc) brut += sd - sc;
        } else {
          brut += sd - sc;
        }
      }
      // Comptes amortissements/depreciations (avec exclusions)
      if (matchesComptes(num, amortComptes) && !matchesComptes(num, amortExclude)) {
        amort += sc - sd;
      }
    }

    result[ref] = { brut, amort, net: brut - amort };
  }

  return result;
}

// Compute PASSIF values from balance lines using S2229 mapping
function computePassifFromBalance(lignes: BalanceLigne[], mapping: Record<string, PassifMapping>): Record<string, PassifValues> {
  const result: Record<string, PassifValues> = {};

  for (const ref in mapping) {
    const comptes = mapping[ref].comptes || [];
    const exclude = mapping[ref].exclude || [];
    const creditOnly = mapping[ref].creditOnly || [];
    let net = 0;

    for (const l of lignes) {
      const num = (l.numero_compte || '').trim();
      const sd = parseFloat(String(l.solde_debiteur_revise ?? l.solde_debiteur)) || 0;
      const sc = parseFloat(String(l.solde_crediteur_revise ?? l.solde_crediteur)) || 0;

      if (matchesComptes(num, comptes) && !matchesComptes(num, exclude)) {
        if (creditOnly.length > 0 && matchesComptes(num, creditOnly)) {
          if (sc > sd) net += sc - sd;
        } else {
          net += sc - sd;
        }
      }
    }

    result[ref] = { net };
  }

  return result;
}

interface BilanSYCEBNLProps extends EtatBaseProps {
  page?: 'actif' | 'passif';
}

function BilanSYCEBNL({ page = 'actif', entiteName, entiteSigle = '', entiteAdresse = '', entiteNif = '', typeActivite, entiteId, offre = 'comptabilite', onBack }: BilanSYCEBNLProps): React.JSX.Element {
  const { exercices, selectedExercice, setSelectedExercice } = useExercicesQuery(entiteId);
  const balanceSource: 'ecritures' | 'import' = offre === 'comptabilite' ? 'ecritures' : 'import';
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [pdfBlob, setPdfBlob] = useState<Blob | null>(null);

  const pageActifRef = useRef<HTMLDivElement>(null);
  const pagePassifRef = useRef<HTMLDivElement>(null);

  const loadBalanceFromEcritures = async (entId: number, exId: number): Promise<BalanceLigne[]> => {
    const res = await clientFetch('/api/ecritures/balance/' + entId + '/' + exId);
    if (!res.ok) return [];
    const data: BalanceApiRow[] = await res.json();
    return data.map((row: BalanceApiRow): BalanceLigne => ({
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
    if (balanceSource === 'ecritures') { lignesNResult = await loadBalanceFromEcritures(entiteId, selectedExercice.id); source = 'Ecritures comptables'; }
    else { const resN = await clientFetch('/api/balance/' + entiteId + '/' + selectedExercice.id + '/N'); const dataN: BalanceImportResponse = await resN.json(); lignesNResult = dataN.lignes || []; source = 'Import balance'; }
    const prevExercice = exercices.find(e => e.annee === selectedExercice.annee - 1);
    if (prevExercice) {
      if (balanceSource === 'ecritures') lignesN1Result = await loadBalanceFromEcritures(entiteId, prevExercice.id);
      else { const resN1 = await clientFetch('/api/balance/' + entiteId + '/' + prevExercice.id + '/N'); const dataN1: BalanceImportResponse = await resN1.json(); lignesN1Result = dataN1.lignes || []; }
    } else if (balanceSource === 'import') { const resN1 = await clientFetch('/api/balance/' + entiteId + '/' + selectedExercice.id + '/N-1'); const dataN1: BalanceImportResponse = await resN1.json(); lignesN1Result = dataN1.lignes || []; }
    return { lignesN: lignesNResult, lignesN1: lignesN1Result, source };
  }, [entiteId, selectedExercice, exercices, balanceSource]);

  const { data: balanceData, isLoading: loading } = useQuery({
    queryKey: ['balance', entiteId, selectedExercice?.id, balanceSource],
    queryFn: loadBalanceFn, staleTime: 2 * 60 * 1000, enabled: !!entiteId && !!selectedExercice,
  });
  const lignesN = balanceData?.lignesN ?? [];
  const lignesN1 = balanceData?.lignesN1 ?? [];
  const balanceFound = lignesN.length > 0;
  const sourceUsed = balanceData?.source ?? '';

  // Compute values
  const actifN: Record<string, ActifValues> = computeFromBalance(lignesN, ACTIF_MAPPING);
  const actifN1: Record<string, ActifValues> = computeFromBalance(lignesN1, ACTIF_MAPPING);
  const passifN: Record<string, PassifValues> = computePassifFromBalance(lignesN, PASSIF_MAPPING);
  const passifN1: Record<string, PassifValues> = computePassifFromBalance(lignesN1, PASSIF_MAPPING);

  // CH = Resultat net calcule depuis le CR (produits - charges)
  // Cela garantit Bilan CH === CR XE
  passifN['CH'] = { net: computeResultatNet(lignesN) };
  passifN1['CH'] = { net: computeResultatNet(lignesN1) };

  // Actif subtotals
  const getActifValue = (ref: string, field: 'brut' | 'amort' | 'net'): number => {
    const row = ACTIF_ROWS.find(r => r.ref === ref);
    if (row && row.sumRefs) {
      // For subtotals that reference other subtotals
      return row.sumRefs.reduce((sum: number, r: string) => {
        const subRow = ACTIF_ROWS.find(sr => sr.ref === r);
        if (subRow && subRow.sumRefs) {
          return sum + getActifValue(r, field);
        }
        return sum + (actifN[r] ? (actifN[r][field] || 0) : 0);
      }, 0);
    }
    return actifN[ref] ? (actifN[ref][field] || 0) : 0;
  };

  const getActifValueN1 = (ref: string, field: 'brut' | 'amort' | 'net'): number => {
    const row = ACTIF_ROWS.find(r => r.ref === ref);
    if (row && row.sumRefs) {
      return row.sumRefs.reduce((sum: number, r: string) => {
        const subRow = ACTIF_ROWS.find(sr => sr.ref === r);
        if (subRow && subRow.sumRefs) {
          return sum + getActifValueN1(r, field);
        }
        return sum + (actifN1[r] ? (actifN1[r][field] || 0) : 0);
      }, 0);
    }
    return actifN1[ref] ? (actifN1[ref][field] || 0) : 0;
  };

  const getPassifValue = (ref: string, isN1: boolean): number => {
    const data = isN1 ? passifN1 : passifN;
    const row = PASSIF_ROWS.find(r => r.ref === ref);
    if (row && row.sumRefs) {
      return row.sumRefs.reduce((sum: number, r: string) => {
        const subRow = PASSIF_ROWS.find(sr => sr.ref === r);
        if (subRow && subRow.sumRefs) {
          return sum + getPassifValue(r, isN1);
        }
        return sum + (data[r] ? (data[r].net || 0) : 0);
      }, 0);
    }
    return data[ref] ? (data[ref].net || 0) : 0;
  };

  const annee: number = selectedExercice ? selectedExercice.annee : new Date().getFullYear();

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
    a.download = 'Bilan_SYCEBNL_' + annee + '.pdf';
    a.click();
    URL.revokeObjectURL(url);
  };

  const printPDF = (): void => {
    if (!previewUrl) return;
    const win = window.open(previewUrl, '_blank');
    if (win) win.print();
  };

  const renderHeader = (titre: string): React.JSX.Element => (
    <div className="etat-header-officiel">
      <div className="etat-header-titre">{titre}</div>
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
          <h2>Bilan SYCEBNL — {page === 'passif' ? 'Passif' : 'Actif'}</h2>
        </div>
        <div className="bilan-toolbar-right">
          <button className="bilan-export-btn secondary" onClick={openPreview}>
            <LuEye /> Apercu
          </button>
          <button className="bilan-export-btn" onClick={async () => { const pdf = await generatePDF(); pdf.save('Bilan_' + (page === 'passif' ? 'Passif' : 'Actif') + '_SYCEBNL_' + annee + '.pdf'); }}>
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

      {/* PAGE ACTIF */}
      {page === 'actif' && (
        <div className="a4-page" ref={pageActifRef}>
          {renderHeader('ACTIF')}

          <table className="bilan-table">
            <thead>
              <tr>
                <th className="col-ref" rowSpan={2}>REF</th>
                <th className="col-libelle" rowSpan={2}>ACTIF</th>
                <th className="col-note" rowSpan={2}>Note</th>
                <th className="col-montant-group" colSpan={3}>EXERCICE AU 31/12/{annee}</th>
                <th className="col-montant" rowSpan={2}>EXERCICE AU 31/12/{annee - 1}<br/>NET</th>
              </tr>
              <tr>
                <th className="col-montant">Brut</th>
                <th className="col-montant">Amort. et deprec.</th>
                <th className="col-montant">Net</th>
              </tr>
            </thead>
            <tbody>
              {ACTIF_ROWS.map((row: BilanRow, i: number) => {
                const rowClass = row.type === 'subsection' ? 'row-subsection'
                  : row.type === 'total' ? 'row-total'
                  : row.type === 'subtotal' ? 'row-subtotal'
                  : 'row-indent';

                const ref = row.ref || '';
                const isComputed = row.type === 'subtotal' || row.type === 'total';

                let brut: number;
                let amort: number;
                let netN: number;
                let netN1: number;
                if (isComputed) {
                  brut = getActifValue(ref, 'brut');
                  amort = getActifValue(ref, 'amort');
                  netN = getActifValue(ref, 'net');
                  netN1 = getActifValueN1(ref, 'net');
                } else {
                  brut = actifN[ref] ? actifN[ref].brut : 0;
                  amort = actifN[ref] ? actifN[ref].amort : 0;
                  netN = actifN[ref] ? actifN[ref].net : 0;
                  netN1 = actifN1[ref] ? actifN1[ref].net : 0;
                }

                return (
                  <tr key={i} className={rowClass}>
                    <td className="col-ref">{ref}</td>
                    <td className="col-libelle">{row.libelle}</td>
                    <td className="col-note">{row.note || ''}</td>
                    <td className="col-montant">{formatMontant(brut)}</td>
                    <td className="col-montant">{formatMontant(amort)}</td>
                    <td className="col-montant">{formatMontant(netN)}</td>
                    <td className="col-montant">{formatMontant(netN1)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {renderFooter()}
        </div>
      )}

      {/* PAGE PASSIF */}
      {page === 'passif' && (
        <div className="a4-page" ref={pagePassifRef}>
          {renderHeader('PASSIF')}

          <table className="bilan-table">
            <thead>
              <tr>
                <th className="col-ref">REF</th>
                <th className="col-libelle">PASSIF</th>
                <th className="col-note">Note</th>
                <th className="col-montant">EXERCICE AU 31/12/{annee}<br/>NET</th>
                <th className="col-montant">EXERCICE AU 31/12/{annee - 1}<br/>NET</th>
              </tr>
            </thead>
            <tbody>
              {PASSIF_ROWS.map((row: BilanRow, i: number) => {
                const rowClass = row.type === 'total' ? 'row-total'
                  : row.type === 'subtotal' ? 'row-subtotal'
                  : 'row-indent';

                const ref = row.ref || '';
                const isComputed = row.type === 'subtotal' || row.type === 'total';

                const netN = isComputed ? getPassifValue(ref, false) : (passifN[ref] ? passifN[ref].net : 0);
                const netN1Val = isComputed ? getPassifValue(ref, true) : (passifN1[ref] ? passifN1[ref].net : 0);

                return (
                  <tr key={i} className={rowClass}>
                    <td className="col-ref">{ref}</td>
                    <td className="col-libelle">{row.libelle}</td>
                    <td className="col-note">{row.note || ''}</td>
                    <td className="col-montant">{formatMontant(netN)}</td>
                    <td className="col-montant">{formatMontant(netN1Val)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* Equilibre */}
          <div className="bilan-equilibre">
            {(() => {
              const totalActif = getActifValue('BZ', 'net');
              const totalPassif = getPassifValue('DZ', false);
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
              <h3>Apercu — Bilan {page === 'passif' ? 'Passif' : 'Actif'} SYCEBNL {annee}</h3>
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
                title="Apercu Bilan PDF"
                className="pdf-preview-iframe"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default BilanSYCEBNL;
