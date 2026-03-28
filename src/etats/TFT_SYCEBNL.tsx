import React, { useState, useRef, useEffect, useCallback } from 'react';
import { LuDownload, LuArrowLeft, LuTriangleAlert, LuEye, LuX, LuPrinter } from 'react-icons/lu';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import './BilanSYCEBNL.css';
import type { BalanceLigne, Exercice, EtatBaseProps, TFTRow } from '../types';

// ===================== TABLEAU DES FLUX DE TRESORERIE -- SYCEBNL (methode DIRECTE, conforme SYCEBNL-2022 p.348) =====================

// Prefixes de comptes pour le calcul -- methode directe
// Revenus par nature (pour calculer les encaissements)
const COTISATIONS_PREFIXES: string[] = ['701'];
const SUBVENTIONS_EXPL_PREFIXES: string[] = ['71', '88'];
const GENEROSITE_PREFIXES: string[] = ['703'];
const MANIFESTATIONS_PREFIXES: string[] = ['706'];
const AUTRES_REVENUS_PREFIXES: string[] = ['702', '704', '705', '707', '708', '72', '73', '75', '77', '78', '79'];
// Charges par nature (pour calculer les decaissements)
const FOURNISSEURS_CHARGES_PREFIXES: string[] = ['60', '61', '62', '63', '64', '65'];
const PERSONNEL_CHARGES_PREFIXES: string[] = ['66'];
const AUTRES_CHARGES_PREFIXES: string[] = ['67', '68', '69'];
// Creances par nature (pour ajuster revenus -> encaissements)
const CREANCES_ADHERENTS_PREFIXES: string[] = ['411', '416', '418'];
const CREANCES_SUBVENTIONS_PREFIXES: string[] = ['4491', '4731', '475'];
const CREANCES_GENEROSITE_PREFIXES: string[] = ['4181'];
const CREANCES_CLIENTS_PREFIXES: string[] = ['412', '413', '419'];
const CREANCES_AUTRES_PREFIXES: string[] = ['42', '43', '44', '45', '47', '409', '485', '4865'];
// Dettes par nature (pour ajuster charges -> decaissements)
const DETTES_FOURNISSEURS_PREFIXES: string[] = ['40', '481'];
const DETTES_PERSONNEL_PREFIXES: string[] = ['42', '43'];
const DETTES_AUTRES_PREFIXES: string[] = ['44', '46', '47', '488'];
// Immobilisations
const IMMOB_CORP_INCORP_PREFIXES: string[] = ['20', '21', '22', '23', '24', '25'];
const IMMOB_FIN_PREFIXES: string[] = ['26', '27'];
// Financement
const DOTATION_FP_PREFIXES: string[] = ['10', '11', '12', '14', '15'];
const SUBV_INVEST_PREFIXES: string[] = ['14'];
const EMPRUNTS_PREFIXES: string[] = ['18'];
// Tresorerie
const TRESORERIE_ACTIF_PREFIXES: string[] = ['50', '51', '52', '53', '55', '57'];
const TRESORERIE_PASSIF_PREFIXES: string[] = ['56'];
// Pour resultat net (controle)
const PRODUITS_PREFIXES: string[] = ['70', '71', '72', '73', '75', '77', '78', '79', '82', '84', '86', '88'];
const CHARGES_PREFIXES: string[] = ['60', '61', '62', '63', '64', '65', '66', '67', '68', '69', '81', '83', '85', '87'];

// ===================== TFT ROWS -- Structure officielle SYCEBNL-2022 (methode directe) =====================
const TFT_ROWS: TFTRow[] = [
  { ref: 'ZA', type: 'indent', note: '', libelle: 'Tresorerie nette au 1er janvier (A)' },

  { type: 'section', libelle: 'FLUX DE TRESORERIE PROVENANT DES ACTIVITES OPERATIONNELLES' },
  { ref: 'FA', type: 'indent', note: '23', libelle: '(+) Encaissement des cotisations' },
  { ref: 'FB', type: 'indent', note: '', libelle: '(+) Encaissement des subventions d\'exploitation et d\'equilibre' },
  { ref: 'FC', type: 'indent', note: '23', libelle: '(+) Encaissement des revenus lies a la generosite' },
  { ref: 'FD', type: 'indent', note: '23', libelle: '(+) Encaissement des revenus des manifestations' },
  { ref: 'FE', type: 'indent', note: '23', libelle: '(+) Encaissement des autres revenus' },
  { ref: 'FF', type: 'indent', note: '', libelle: '(-) Decaissement des sommes versees aux fournisseurs (1)' },
  { ref: 'FG', type: 'indent', note: '29', libelle: '(-) Decaissement des sommes versees au personnel' },
  { ref: 'FH', type: 'indent', note: '', libelle: '(-) Autres decaissements' },
  { ref: 'ZB', type: 'subtotal', libelle: 'FLUX DE TRESORERIE DES ACTIVITES OPERATIONNELLES (B)' },

  { type: 'section', libelle: 'FLUX DE TRESORERIE PROVENANT DES ACTIVITES D\'INVESTISSEMENT' },
  { ref: 'FI', type: 'indent', note: '5', libelle: '(-) Decaissements acquisitions d\'immobilisations incorporelles et corporelles' },
  { ref: 'FJ', type: 'indent', note: '6', libelle: '(-) Decaissements acquisitions d\'immobilisations financieres' },
  { ref: 'FK', type: 'indent', note: '', libelle: '(+) Encaissements cessions d\'immobilisations incorporelles et corporelles' },
  { ref: 'FL', type: 'indent', note: '', libelle: '(+) Encaissements cessions d\'immobilisations financieres' },
  { ref: 'ZC', type: 'subtotal', libelle: 'FLUX DE TRESORERIE DES ACTIVITES D\'INVESTISSEMENT (C)' },

  { type: 'section', libelle: 'FLUX DE TRESORERIE PROVENANT DU FINANCEMENT PAR LES FONDS PROPRES' },
  { ref: 'FM', type: 'indent', note: '15', libelle: '(+) Encaissement des dotations et autres fonds propres' },
  { ref: 'FN', type: 'indent', note: '17A', libelle: '(+) Subventions d\'investissement recues' },
  { ref: 'FO', type: 'indent', note: '', libelle: '(-) Decaissement des dotations et autres fonds propres' },
  { ref: 'ZD', type: 'subtotal', libelle: 'FLUX DE TRESORERIE DES FONDS PROPRES (D)' },

  { type: 'section', libelle: 'TRESORERIE PROVENANT DU FINANCEMENT PAR LES FONDS ETRANGERS' },
  { ref: 'FP', type: 'indent', note: '18A', libelle: '(+) Encaissement provenant des emprunts et autres dettes financieres' },
  { ref: 'FQ', type: 'indent', note: '18A', libelle: '(-) Remboursements des emprunts et autres dettes financieres' },
  { ref: 'ZE', type: 'subtotal', libelle: 'TRESORERIE DES FONDS ETRANGERS (E)' },

  { type: 'section', libelle: 'SYNTHESE' },
  { ref: 'ZF', type: 'result', libelle: 'VARIATION DE LA TRESORERIE NETTE DE LA PERIODE (B+C+D+E) = (G)' },
  { ref: 'ZG', type: 'total', libelle: 'TRESORERIE NETTE AU 31 DECEMBRE (G+A) = (H)' },
  { ref: 'ZH', type: 'indent', note: '', libelle: 'Controle : Tresorerie actif N - Tresorerie passif N' },
];
// (1) A l'exclusion des fournisseurs d'investissements

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
  const neg = val < 0;
  const abs = Math.abs(Math.round(val));
  const formatted = abs.toLocaleString('fr-FR');
  return neg ? '(' + formatted + ')' : formatted;
}

function matchesComptes(numCompte: string, prefixes: string[]): boolean {
  return prefixes.some(p => numCompte.startsWith(p));
}

// Calculer un solde net pour une liste de prefixes : solde debiteur - solde crediteur (positif = debiteur)
function sumSoldeDebiteur(lignes: BalanceLigne[], prefixes: string[], excludes: string[] = []): number {
  let total = 0;
  for (const l of lignes) {
    const num = (l.numero_compte || '').trim();
    if (matchesComptes(num, prefixes) && !matchesComptes(num, excludes)) {
      const sd = parseFloat(String(l.solde_debiteur_revise ?? l.solde_debiteur)) || 0;
      const sc = parseFloat(String(l.solde_crediteur_revise ?? l.solde_crediteur)) || 0;
      total += sd - sc;
    }
  }
  return total;
}

// Solde crediteur (positif = crediteur)
function sumSoldeCrediteur(lignes: BalanceLigne[], prefixes: string[], excludes: string[] = []): number {
  let total = 0;
  for (const l of lignes) {
    const num = (l.numero_compte || '').trim();
    if (matchesComptes(num, prefixes) && !matchesComptes(num, excludes)) {
      const sd = parseFloat(String(l.solde_debiteur_revise ?? l.solde_debiteur)) || 0;
      const sc = parseFloat(String(l.solde_crediteur_revise ?? l.solde_crediteur)) || 0;
      total += sc - sd;
    }
  }
  return total;
}

// Tresorerie nette = tresorerie actif - tresorerie passif
function computeTresorerieNette(lignes: BalanceLigne[]): number {
  const actif = sumSoldeDebiteur(lignes, TRESORERIE_ACTIF_PREFIXES);
  const passif = sumSoldeCrediteur(lignes, TRESORERIE_PASSIF_PREFIXES);
  return actif - passif;
}

// Methode directe : Encaissements = Revenus N + Creances N-1 - Creances N = Revenus N - variation creances
// Decaissements = Charges N + Dettes N-1 - Dettes N = Charges N - variation dettes (positif = decaissement)
function computeEncaissement(lN: BalanceLigne[], lN1: BalanceLigne[], revenusPrefixes: string[], creancesPrefixes: string[]): number {
  const revenus = sumSoldeCrediteur(lN, revenusPrefixes);
  const creancesN = sumSoldeDebiteur(lN, creancesPrefixes);
  const creancesN1 = sumSoldeDebiteur(lN1, creancesPrefixes);
  return revenus - (creancesN - creancesN1);
}

function computeDecaissement(lN: BalanceLigne[], lN1: BalanceLigne[], chargesPrefixes: string[], dettesPrefixes: string[]): number {
  const charges = sumSoldeDebiteur(lN, chargesPrefixes);
  const dettesN = sumSoldeCrediteur(lN, dettesPrefixes);
  const dettesN1 = sumSoldeCrediteur(lN1, dettesPrefixes);
  return charges - (dettesN - dettesN1);
}

function TFT_SYCEBNL({ entiteName, entiteSigle = '', entiteAdresse = '', entiteNif = '', typeActivite, entiteId, offre = 'comptabilite', onBack }: EtatBaseProps): React.JSX.Element {
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

      // Balance N-1
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

  // ===================== CALCUL DES FLUX =====================

  const computeAllFlux = (lN: BalanceLigne[], lN1: BalanceLigne[]): Record<string, number> => {
    const data: Record<string, number> = {};

    // ===================== METHODE DIRECTE SYCEBNL-2022 (p.348) =====================

    // ZA -- Tresorerie nette au 1er janvier (Tresorerie actif N-1 - Tresorerie passif N-1)
    data.ZA = computeTresorerieNette(lN1);

    // --- FLUX OPERATIONNELS (methode directe : encaissements - decaissements) ---

    // FA -- Encaissement des cotisations = Cotisations (701) - variation creances adherents (411)
    data.FA = computeEncaissement(lN, lN1, COTISATIONS_PREFIXES, CREANCES_ADHERENTS_PREFIXES);

    // FB -- Encaissement des subventions d'exploitation et d'equilibre = (71+88) - variation creances subventions
    data.FB = computeEncaissement(lN, lN1, SUBVENTIONS_EXPL_PREFIXES, CREANCES_SUBVENTIONS_PREFIXES);

    // FC -- Encaissement des revenus lies a la generosite = (703) - variation creances generosite
    data.FC = computeEncaissement(lN, lN1, GENEROSITE_PREFIXES, CREANCES_GENEROSITE_PREFIXES);

    // FD -- Encaissement des revenus des manifestations = (706) - variation creances clients
    data.FD = computeEncaissement(lN, lN1, MANIFESTATIONS_PREFIXES, CREANCES_CLIENTS_PREFIXES);

    // FE -- Encaissement des autres revenus = (702,704,705,707,708,72,73,75,77,78,79) - variation autres creances
    data.FE = computeEncaissement(lN, lN1, AUTRES_REVENUS_PREFIXES, CREANCES_AUTRES_PREFIXES);

    // FF -- Decaissement fournisseurs (negatif) = -(Charges fournisseurs - variation dettes fournisseurs)
    // Exclut les fournisseurs d'investissements (481)
    data.FF = -computeDecaissement(lN, lN1, FOURNISSEURS_CHARGES_PREFIXES, DETTES_FOURNISSEURS_PREFIXES);

    // FG -- Decaissement personnel (negatif) = -(Charges personnel - variation dettes personnel)
    data.FG = -computeDecaissement(lN, lN1, PERSONNEL_CHARGES_PREFIXES, DETTES_PERSONNEL_PREFIXES);

    // FH -- Autres decaissements (negatif) = -(Autres charges - variation autres dettes)
    data.FH = -computeDecaissement(lN, lN1, AUTRES_CHARGES_PREFIXES, DETTES_AUTRES_PREFIXES);

    // ZB -- Flux de tresorerie des activites operationnelles (FA a FH)
    data.ZB = data.FA + data.FB + data.FC + data.FD + data.FE + data.FF + data.FG + data.FH;

    // --- FLUX D'INVESTISSEMENT ---

    // FI -- Decaissements acquisitions immob corp. et incorp. (negatif)
    const immobCorpN = sumSoldeDebiteur(lN, IMMOB_CORP_INCORP_PREFIXES);
    const immobCorpN1 = sumSoldeDebiteur(lN1, IMMOB_CORP_INCORP_PREFIXES);
    data.FI = -(immobCorpN - immobCorpN1);
    if (data.FI > 0) data.FI = 0; // Seules les acquisitions (augmentation)

    // FJ -- Decaissements acquisitions immob financieres (negatif)
    const immobFinN = sumSoldeDebiteur(lN, IMMOB_FIN_PREFIXES);
    const immobFinN1 = sumSoldeDebiteur(lN1, IMMOB_FIN_PREFIXES);
    data.FJ = -(immobFinN - immobFinN1);
    if (data.FJ > 0) data.FJ = 0;

    // FK -- Encaissements cessions immob corp. et incorp.
    data.FK = sumSoldeCrediteur(lN, ['82']);

    // FL -- Encaissements cessions immob financieres
    data.FL = sumSoldeCrediteur(lN, ['826']);

    // ZC -- Flux de tresorerie des activites d'investissement (FI a FL)
    data.ZC = data.FI + data.FJ + data.FK + data.FL;

    // --- FINANCEMENT PAR FONDS PROPRES ---

    // FM -- Encaissement des dotations et autres fonds propres
    const fpN = sumSoldeCrediteur(lN, DOTATION_FP_PREFIXES, SUBV_INVEST_PREFIXES);
    const fpN1 = sumSoldeCrediteur(lN1, DOTATION_FP_PREFIXES, SUBV_INVEST_PREFIXES);
    const varFP = fpN - fpN1;
    data.FM = varFP > 0 ? varFP : 0;

    // FN -- Subventions d'investissement recues
    const subvInvN = sumSoldeCrediteur(lN, SUBV_INVEST_PREFIXES);
    const subvInvN1 = sumSoldeCrediteur(lN1, SUBV_INVEST_PREFIXES);
    const varSubvInv = subvInvN - subvInvN1;
    data.FN = varSubvInv > 0 ? varSubvInv : 0;

    // FO -- Decaissement des dotations et autres fonds propres (negatif)
    data.FO = varFP < 0 ? varFP : 0;

    // ZD -- Flux de tresorerie des fonds propres (FM a FO)
    data.ZD = data.FM + data.FN + data.FO;

    // --- FINANCEMENT PAR FONDS ETRANGERS ---

    // FP -- Encaissement provenant des emprunts
    const empruntsN = sumSoldeCrediteur(lN, EMPRUNTS_PREFIXES);
    const empruntsN1 = sumSoldeCrediteur(lN1, EMPRUNTS_PREFIXES);
    const varEmprunts = empruntsN - empruntsN1;
    data.FP = varEmprunts > 0 ? varEmprunts : 0;

    // FQ -- Remboursements des emprunts (negatif)
    data.FQ = varEmprunts < 0 ? varEmprunts : 0;

    // ZE -- Tresorerie des fonds etrangers (FP a FQ)
    data.ZE = data.FP + data.FQ;

    // --- SYNTHESE ---

    // ZF -- Variation de tresorerie nette de la periode (B+C+D+E)
    data.ZF = data.ZB + data.ZC + data.ZD + data.ZE;

    // ZG -- Tresorerie nette au 31 decembre (G+A) = ZF + ZA
    data.ZG = data.ZF + data.ZA;

    // ZH -- Controle : Tresorerie actif N - Tresorerie passif N
    data.ZH = computeTresorerieNette(lN);

    return data;
  };

  const fluxN: Record<string, number> = computeAllFlux(lignesN, lignesN1);

  // Pour N-1 on aurait besoin de N-2, on ne l'affiche pas
  const annee: number = selectedExercice ? selectedExercice.annee : new Date().getFullYear();

  const getValue = (ref: string): number => {
    return fluxN[ref] || 0;
  };

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
    a.download = 'TFT_SYCEBNL_' + annee + '.pdf';
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
      <div className="etat-header-titre">TABLEAU DES FLUX DE TRESORERIE</div>
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

  const hasN1: boolean = lignesN1.length > 0;

  return (
    <div className="bilan-wrapper">
      <div className="bilan-toolbar">
        <div className="bilan-toolbar-left">
          <button className="bilan-back-btn" onClick={onBack}><LuArrowLeft /> Retour</button>
          <h2>Tableau des Flux de Tresorerie SYCEBNL (methode directe)</h2>
        </div>
        <div className="bilan-toolbar-right">
          <button className="bilan-export-btn secondary" onClick={openPreview}>
            <LuEye /> Apercu
          </button>
          <button className="bilan-export-btn" onClick={async () => { const pdf = await generatePDF(); pdf.save('TFT_SYCEBNL_' + annee + '.pdf'); }}>
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

      {!hasN1 && balanceFound && !loading && (
        <div className="bilan-alert" style={{ background: '#fef3c7', borderColor: '#f59e0b', color: '#92400e' }}>
          <LuTriangleAlert /> Aucune donnee pour l'exercice N-1. Les variations seront calculees par rapport a zero. {balanceSource === 'ecritures' ? 'Saisissez des ecritures pour l\'exercice precedent.' : 'Importez la balance N-1.'}
        </div>
      )}

      {loading && <div style={{ padding: 20, color: '#888' }}>Chargement...</div>}

      {/* PAGE -- TFT */}
      <div className="a4-page" ref={pageRef}>
        {renderHeader()}

        <table className="bilan-table">
          <thead>
            <tr>
              <th className="col-ref">REF</th>
              <th className="col-libelle">LIBELLES</th>
              <th className="col-note">Note</th>
              <th className="col-montant">EXERCICE AU 31/12/{annee}</th>
            </tr>
          </thead>
          <tbody>
            {TFT_ROWS.map((row: TFTRow, i: number) => {
              if (row.type === 'section') {
                return (
                  <tr key={i} className="row-section">
                    <td colSpan={4} className="col-section-label">{row.libelle}</td>
                  </tr>
                );
              }
              if (row.type === 'label') {
                return (
                  <tr key={i} className="row-label">
                    <td></td>
                    <td colSpan={2} style={{ fontStyle: 'italic', fontSize: '8px', paddingTop: 2, paddingBottom: 2 }}>{row.libelle}</td>
                    <td></td>
                  </tr>
                );
              }

              const rowClass = row.type === 'total' ? 'row-total'
                : row.type === 'result' ? 'row-subtotal'
                : row.type === 'subtotal' ? 'row-subtotal'
                : 'row-indent';

              const val = getValue(row.ref || '');

              return (
                <tr key={i} className={rowClass}>
                  <td className="col-ref">{row.ref || ''}</td>
                  <td className="col-libelle">{row.libelle}</td>
                  <td className="col-note">{row.note || ''}</td>
                  <td className="col-montant">{formatMontant(val)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {/* Controle */}
        <div className="bilan-equilibre">
          {(() => {
            if (!balanceFound) return null;
            const tresoCalculee = getValue('ZG');
            const tresoBilan = getValue('ZH');
            const ecart = Math.abs(tresoCalculee - tresoBilan);
            const ok = ecart < 1;
            return (
              <span className={ok ? 'equilibre-ok' : 'equilibre-ko'}>
                {ok
                  ? 'Controle verifie : tresorerie TFT = tresorerie bilan (' + formatMontant(tresoCalculee) + ' FCFA)'
                  : 'Ecart de controle : ' + formatMontant(ecart) + ' FCFA (TFT: ' + formatMontant(tresoCalculee) + ' / Bilan: ' + formatMontant(tresoBilan) + ')'
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
              <h3>Apercu — TFT SYCEBNL (methode directe) {annee}</h3>
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
                title="Apercu TFT PDF"
                className="pdf-preview-iframe"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default TFT_SYCEBNL;
