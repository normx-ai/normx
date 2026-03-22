import React, { useState, useRef, useEffect, useCallback } from 'react';
import { LuDownload, LuArrowLeft, LuTriangleAlert, LuEye, LuX, LuPrinter } from 'react-icons/lu';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import './BilanSYCEBNL.css';
import type { BalanceLigne, Exercice, EtatBaseProps, TFTRow } from '../types';

// ===================== S2231 TABLEAU DES FLUX DE TRESORERIE -- SYCEBNL (methode indirecte) =====================

// Prefixes de comptes pour le calcul
const PRODUITS_PREFIXES: string[] = ['70', '71', '72', '73', '75', '77', '78', '79', '82', '84', '86', '88'];
const CHARGES_PREFIXES: string[] = ['60', '61', '62', '63', '64', '65', '66', '67', '68', '69', '81', '83', '85', '87'];
const DOTATIONS_PREFIXES: string[] = ['68', '69'];
const REPRISES_PREFIXES: string[] = ['78', '79'];
const STOCKS_PREFIXES: string[] = ['31', '32', '33', '34', '36', '37', '38'];
const CREANCES_PREFIXES: string[] = ['41', '42', '43', '44', '45', '47', '409', '485', '4865'];
const DETTES_CIRC_PREFIXES: string[] = ['40', '481', '484', '488', '419'];
const IMMOB_BRUT_PREFIXES: string[] = ['20', '21', '22', '23', '24', '25'];
const IMMOB_FIN_PREFIXES: string[] = ['26', '27'];
const FONDS_PROPRES_PREFIXES: string[] = ['10', '11', '12', '14', '15'];
const DETTES_FIN_PREFIXES: string[] = ['16', '17', '18', '19'];
const TRESORERIE_ACTIF_PREFIXES: string[] = ['50', '51', '52', '53', '55', '57'];
const TRESORERIE_PASSIF_PREFIXES: string[] = ['56'];

// ===================== TFT ROWS =====================
const TFT_ROWS: TFTRow[] = [
  { type: 'section', libelle: 'ACTIVITES OPERATIONNELLES' },
  { ref: 'ZA', type: 'indent', note: '', libelle: 'Resultat net de l\'exercice (excedent + ou deficit -)' },
  { type: 'label', libelle: 'Ajustements pour :' },
  { ref: 'FA', type: 'indent', note: '5D', libelle: 'Dotations nettes aux amortissements, provisions et depreciations' },
  { ref: 'FB', type: 'indent', note: '8', libelle: 'Variation des stocks' },
  { ref: 'FC', type: 'indent', note: '9&10', libelle: 'Variation des creances' },
  { ref: 'FD', type: 'indent', note: '19&20', libelle: 'Variation des dettes circulantes' },
  { ref: 'ZB', type: 'subtotal', libelle: 'FLUX NET DE TRESORERIE DES ACTIVITES OPERATIONNELLES (A)' },

  { type: 'section', libelle: 'ACTIVITES D\'INVESTISSEMENT' },
  { ref: 'FE', type: 'indent', note: '5', libelle: 'Decaissements lies aux acquisitions d\'immobilisations corporelles et incorporelles' },
  { ref: 'FF', type: 'indent', note: '6', libelle: 'Decaissements lies aux acquisitions d\'immobilisations financieres' },
  { ref: 'FG', type: 'indent', note: '', libelle: 'Encaissements lies aux cessions d\'immobilisations' },
  { ref: 'ZC', type: 'subtotal', libelle: 'FLUX NET DE TRESORERIE DES ACTIVITES D\'INVESTISSEMENT (B)' },

  { type: 'section', libelle: 'ACTIVITES DE FINANCEMENT' },
  { ref: 'FH', type: 'indent', note: '15', libelle: 'Augmentation de dotation et fonds propres' },
  { ref: 'FI', type: 'indent', note: '17B', libelle: 'Variation des fonds affectes et reportes' },
  { ref: 'FJ', type: 'indent', note: '18A', libelle: 'Nouveaux emprunts' },
  { ref: 'FK', type: 'indent', note: '18A', libelle: 'Remboursement des emprunts' },
  { ref: 'ZD', type: 'subtotal', libelle: 'FLUX NET DE TRESORERIE DES ACTIVITES DE FINANCEMENT (C)' },

  { type: 'section', libelle: 'SYNTHESE' },
  { ref: 'ZE', type: 'result', libelle: 'VARIATION DE TRESORERIE DE LA PERIODE (A + B + C)' },
  { ref: 'ZF', type: 'indent', note: '', libelle: 'Tresorerie nette a l\'ouverture de l\'exercice' },
  { ref: 'ZG', type: 'total', libelle: 'TRESORERIE NETTE A LA CLOTURE DE L\'EXERCICE (ZE + ZF)' },
  { ref: 'ZH', type: 'indent', note: '', libelle: 'Controle : tresorerie nette calculee depuis le bilan' },
];

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

// Resultat net = produits - charges
function computeResultatNet(lignes: BalanceLigne[]): number {
  let produits = 0;
  let charges = 0;
  for (const l of lignes) {
    const num = (l.numero_compte || '').trim();
    const sd = parseFloat(String(l.solde_debiteur_revise ?? l.solde_debiteur)) || 0;
    const sc = parseFloat(String(l.solde_crediteur_revise ?? l.solde_crediteur)) || 0;
    if (PRODUITS_PREFIXES.some(p => num.startsWith(p))) produits += sc - sd;
    if (CHARGES_PREFIXES.some(p => num.startsWith(p))) charges += sd - sc;
  }
  return produits - charges;
}

// Tresorerie nette = tresorerie actif - tresorerie passif
function computeTresorerieNette(lignes: BalanceLigne[]): number {
  const actif = sumSoldeDebiteur(lignes, TRESORERIE_ACTIF_PREFIXES);
  const passif = sumSoldeCrediteur(lignes, TRESORERIE_PASSIF_PREFIXES);
  return actif - passif;
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

    // ZA -- Resultat net
    data.ZA = computeResultatNet(lN);

    // FA -- Dotations nettes (dotations - reprises) = charges non decaissees
    const dotations = sumSoldeDebiteur(lN, DOTATIONS_PREFIXES);
    const reprises = sumSoldeCrediteur(lN, REPRISES_PREFIXES);
    data.FA = dotations - reprises;

    // FB -- Variation des stocks : -(Stocks N - Stocks N-1)
    // Augmentation des stocks = utilisation de tresorerie (negatif)
    const stocksN = sumSoldeDebiteur(lN, STOCKS_PREFIXES);
    const stocksN1 = sumSoldeDebiteur(lN1, STOCKS_PREFIXES);
    data.FB = -(stocksN - stocksN1);

    // FC -- Variation des creances : -(Creances N - Creances N-1)
    // Augmentation des creances = utilisation de tresorerie (negatif)
    const creancesN = sumSoldeDebiteur(lN, CREANCES_PREFIXES);
    const creancesN1 = sumSoldeDebiteur(lN1, CREANCES_PREFIXES);
    data.FC = -(creancesN - creancesN1);

    // FD -- Variation des dettes circulantes : Dettes N - Dettes N-1
    // Augmentation des dettes = source de tresorerie (positif)
    const dettesCircN = sumSoldeCrediteur(lN, DETTES_CIRC_PREFIXES);
    const dettesCircN1 = sumSoldeCrediteur(lN1, DETTES_CIRC_PREFIXES);
    data.FD = dettesCircN - dettesCircN1;

    // ZB -- Flux operationnels
    data.ZB = data.ZA + data.FA + data.FB + data.FC + data.FD;

    // FE -- Acquisitions d'immobilisations corp. et incorp. : -(Immob brut N - Immob brut N-1)
    const immobN = sumSoldeDebiteur(lN, IMMOB_BRUT_PREFIXES);
    const immobN1 = sumSoldeDebiteur(lN1, IMMOB_BRUT_PREFIXES);
    data.FE = -(immobN - immobN1);

    // FF -- Acquisitions d'immobilisations financieres : -(Immob fin N - Immob fin N-1)
    const immobFinN = sumSoldeDebiteur(lN, IMMOB_FIN_PREFIXES);
    const immobFinN1 = sumSoldeDebiteur(lN1, IMMOB_FIN_PREFIXES);
    data.FF = -(immobFinN - immobFinN1);

    // FG -- Encaissements cessions : produits HAO cessions (comptes 82, 84)
    const cessions = sumSoldeCrediteur(lN, ['82', '84']);
    data.FG = cessions;

    // ZC -- Flux investissement
    data.ZC = data.FE + data.FF + data.FG;

    // FH -- Augmentation fonds propres (hors resultat) : (Fonds propres N - Resultat N) - Fonds propres N-1
    const fpN = sumSoldeCrediteur(lN, FONDS_PROPRES_PREFIXES);
    const fpN1 = sumSoldeCrediteur(lN1, FONDS_PROPRES_PREFIXES);
    data.FH = (fpN - data.ZA) - fpN1;

    // FI -- Variation fonds affectes et reportes (16, 17)
    const fondsAffN = sumSoldeCrediteur(lN, ['16', '17']);
    const fondsAffN1 = sumSoldeCrediteur(lN1, ['16', '17']);
    data.FI = fondsAffN - fondsAffN1;

    // FJ -- Nouveaux emprunts (augmentation dettes financieres)
    // FK -- Remboursement (diminution dettes financieres)
    const dettesFinN = sumSoldeCrediteur(lN, DETTES_FIN_PREFIXES, ['16', '17']);
    const dettesFinN1 = sumSoldeCrediteur(lN1, DETTES_FIN_PREFIXES, ['16', '17']);
    const varDettes = dettesFinN - dettesFinN1;
    data.FJ = varDettes > 0 ? varDettes : 0;
    data.FK = varDettes < 0 ? varDettes : 0;

    // ZD -- Flux financement
    data.ZD = data.FH + data.FI + data.FJ + data.FK;

    // ZE -- Variation de tresorerie
    data.ZE = data.ZB + data.ZC + data.ZD;

    // ZF -- Tresorerie ouverture
    data.ZF = computeTresorerieNette(lN1);

    // ZG -- Tresorerie cloture
    data.ZG = data.ZE + data.ZF;

    // ZH -- Controle : tresorerie depuis le bilan N
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
          <h2>Tableau des Flux de Tresorerie SYCEBNL</h2>
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
              <h3>Apercu — Tableau des Flux de Tresorerie SYCEBNL {annee}</h3>
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
