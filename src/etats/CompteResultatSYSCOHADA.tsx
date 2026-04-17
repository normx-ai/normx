import React, { useState, useRef, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { clientFetch } from '../lib/api';
import { LuDownload, LuArrowLeft, LuTriangleAlert, LuEye, LuX, LuPrinter } from 'react-icons/lu';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import './BilanSYCEBNL.css';
import type { BalanceLigne, Exercice, EtatBaseProps, CRMapping, Offre } from '../types';
import { useExercicesQuery } from '../hooks/useExercicesQuery';

// ===================== TABLEAU DE CORRESPONDANCE — COMPTE DE RESULTAT SYSCOHADA =====================

interface CRRow {
  ref: string;
  type: 'indent' | 'subtotal' | 'result' | 'total';
  note?: string;
  signe?: string;
  libelle: string;
  formula?: string;
}

interface CRBalanceResult {
  net: number;
}

// PRODUITS — comptes crediteurs (classe 7, 8x) : net = credit - debit
const PRODUITS_MAPPING: CRMapping = {
  TA: { comptes: ['701'] },
  TB: { comptes: ['702', '703', '704'] },
  TC: { comptes: ['705', '706'] },
  TD: { comptes: ['707'] },
  TF: { comptes: ['72'] },
  TG: { comptes: ['71'] },
  TH: { comptes: ['75'] },
  TI: { comptes: ['781'] },
  TJ: { comptes: ['791', '798', '799'] },
  TK: { comptes: ['77'] },
  TL: { comptes: ['797'] },
  TM: { comptes: ['787'] },
  TN: { comptes: ['82'] },
  TO: { comptes: ['84', '86', '88'] },
};

// CHARGES — comptes debiteurs (classe 6, 8x) : net = debit - credit
const CHARGES_MAPPING: CRMapping = {
  RA: { comptes: ['601'] },
  RC: { comptes: ['602'] },
  RE: { comptes: ['604', '605', '608'] },
  RG: { comptes: ['61'] },
  RH: { comptes: ['62', '63'] },
  RI: { comptes: ['64'] },
  RJ: { comptes: ['65'] },
  RK: { comptes: ['66'] },
  RL: { comptes: ['681', '691'] },
  RM: { comptes: ['67'] },
  RN: { comptes: ['697'] },
  RO: { comptes: ['81'] },
  RP: { comptes: ['83', '85'] },
  RQ: { comptes: ['87'] },
  RS: { comptes: ['89'] },
};

// VARIATIONS — stocks variations (debit - credit for 603x charges, credit - debit for 73 produit)
const VARIATION_CHARGES_MAPPING: CRMapping = {
  RB: { comptes: ['6031'] },
  RD: { comptes: ['6032'] },
  RF: { comptes: ['6033'] },
};

const VARIATION_PRODUITS_MAPPING: CRMapping = {
  TE: { comptes: ['73'] },
};

// ===================== CR ROWS — SYSCOHADA p.1272-1273 =====================
const CR_ROWS: CRRow[] = [
  // --- ACTIVITE D'EXPLOITATION ---
  { ref: 'TA', type: 'indent', note: '21', signe: '+', libelle: 'Ventes de marchandises' },
  { ref: 'RA', type: 'indent', note: '22', signe: '-', libelle: 'Achats de marchandises' },
  { ref: 'RB', type: 'indent', note: '6', signe: '-/+', libelle: 'Variation de stocks de marchandises' },
  { ref: 'XA', type: 'subtotal', signe: '', libelle: 'MARGE COMMERCIALE (Somme TA a RB)', formula: 'XA' },

  { ref: 'TB', type: 'indent', note: '21', signe: '+', libelle: 'Ventes de produits fabriques' },
  { ref: 'TC', type: 'indent', note: '21', signe: '+', libelle: 'Travaux, services vendus' },
  { ref: 'TD', type: 'indent', note: '21', signe: '+', libelle: 'Produits accessoires' },
  { ref: 'XB', type: 'subtotal', signe: '', libelle: 'CHIFFRE D\'AFFAIRES (A+B+C+D)', formula: 'XB' },

  { ref: 'TE', type: 'indent', note: '6', signe: '-/+', libelle: 'Production stockee (ou destockage)' },
  { ref: 'TF', type: 'indent', note: '21', signe: '', libelle: 'Production immobilisee' },
  { ref: 'TG', type: 'indent', note: '21', signe: '', libelle: 'Subventions d\'exploitation' },
  { ref: 'TH', type: 'indent', note: '21', signe: '+', libelle: 'Autres produits' },
  { ref: 'TI', type: 'indent', note: '12', signe: '+', libelle: 'Transferts de charges d\'exploitation' },
  { ref: 'RC', type: 'indent', note: '22', signe: '-', libelle: 'Achats de matieres premieres et fournitures liees' },
  { ref: 'RD', type: 'indent', note: '6', signe: '-/+', libelle: 'Variation de stocks de matieres premieres et fournitures liees' },
  { ref: 'RE', type: 'indent', note: '22', signe: '-', libelle: 'Autres achats' },
  { ref: 'RF', type: 'indent', note: '6', signe: '-/+', libelle: 'Variation de stocks d\'autres approvisionnements' },
  { ref: 'RG', type: 'indent', note: '23', signe: '-', libelle: 'Transports' },
  { ref: 'RH', type: 'indent', note: '24', signe: '-', libelle: 'Services exterieurs' },
  { ref: 'RI', type: 'indent', note: '25', signe: '-', libelle: 'Impots et taxes' },
  { ref: 'RJ', type: 'indent', note: '26', signe: '-', libelle: 'Autres charges' },
  { ref: 'XC', type: 'subtotal', signe: '', libelle: 'VALEUR AJOUTEE (XB+RA+RB) + (somme TE a RJ)', formula: 'XC' },

  { ref: 'RK', type: 'indent', note: '27', signe: '-', libelle: 'Charges de personnel' },
  { ref: 'XD', type: 'subtotal', signe: '', libelle: 'EXCEDENT BRUT D\'EXPLOITATION (XC+RK)', formula: 'XD' },

  { ref: 'TJ', type: 'indent', note: '28', signe: '+', libelle: 'Reprises d\'amortissements, provisions et depreciations' },
  { ref: 'RL', type: 'indent', note: '3C&28', signe: '-', libelle: 'Dotations aux amortissements, provisions et depreciations' },
  { ref: 'XE', type: 'result', signe: '', libelle: 'RESULTAT D\'EXPLOITATION (XD+TJ+RL)', formula: 'XE' },

  // --- ACTIVITE FINANCIERE ---
  { ref: 'TK', type: 'indent', note: '29', signe: '+', libelle: 'Revenus financiers et assimiles' },
  { ref: 'TL', type: 'indent', note: '28', signe: '+', libelle: 'Reprises de provisions et depreciations financieres' },
  { ref: 'TM', type: 'indent', note: '12', signe: '+', libelle: 'Transferts de charges financieres' },
  { ref: 'RM', type: 'indent', note: '29', signe: '-', libelle: 'Frais financiers et charges assimilees' },
  { ref: 'RN', type: 'indent', note: '3C&28', signe: '-', libelle: 'Dotations aux provisions et depreciations financieres' },
  { ref: 'XF', type: 'result', signe: '', libelle: 'RESULTAT FINANCIER (somme TK a RN)', formula: 'XF' },

  { ref: 'XG', type: 'result', signe: '', libelle: 'RESULTAT DES ACTIVITES ORDINAIRES (XE+XF)', formula: 'XG' },

  // --- HAO ---
  { ref: 'TN', type: 'indent', note: '3D', signe: '+', libelle: 'Produits des cessions d\'immobilisations' },
  { ref: 'TO', type: 'indent', note: '30', signe: '+', libelle: 'Autres Produits HAO' },
  { ref: 'RO', type: 'indent', note: '3D', signe: '-', libelle: 'Valeurs comptables des cessions d\'immobilisations' },
  { ref: 'RP', type: 'indent', note: '30', signe: '-', libelle: 'Autres Charges HAO' },
  { ref: 'XH', type: 'result', signe: '', libelle: 'RESULTAT HORS ACTIVITES ORDINAIRES (somme TN a RP)', formula: 'XH' },

  // --- RESULTAT ---
  { ref: 'RQ', type: 'indent', note: '30', signe: '-', libelle: 'Participation des travailleurs' },
  { ref: 'RS', type: 'indent', note: '37', signe: '-', libelle: 'Impots sur le resultat' },
  { ref: 'XI', type: 'total', signe: '', libelle: 'RESULTAT NET (XG+XH+RQ+RS)', formula: 'XI' },
];

function formatMontant(val: number): string {
  if (!val || val === 0) return '0';
  return Math.round(val).toLocaleString('fr-FR');
}

function matchesComptes(numCompte: string, prefixes: string[]): boolean {
  return prefixes.some(p => numCompte.startsWith(p));
}

// Produits : credit - debit (solde crediteur = positif)
function computeProduitsFromBalance(lignes: BalanceLigne[], mapping: CRMapping): Record<string, CRBalanceResult> {
  const result: Record<string, CRBalanceResult> = {};
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
function computeChargesFromBalance(lignes: BalanceLigne[], mapping: CRMapping): Record<string, CRBalanceResult> {
  const result: Record<string, CRBalanceResult> = {};
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

interface CompteResultatSYSCOHADAProps extends EtatBaseProps {
  offre?: Offre;
}

function CompteResultatSYSCOHADA({ entiteName, entiteSigle = '', entiteAdresse = '', entiteNif = '', typeActivite, entiteId, offre = 'comptabilite', onBack }: CompteResultatSYSCOHADAProps): React.JSX.Element {
  const { exercices, selectedExercice, setSelectedExercice } = useExercicesQuery(entiteId);
  const balanceSource: string = offre === 'comptabilite' ? 'ecritures' : 'import';
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [pdfBlob, setPdfBlob] = useState<Blob | null>(null);

  const pageRef = useRef<HTMLDivElement>(null);

  const loadBalanceFromEcritures = async (entId: number, exId: number): Promise<BalanceLigne[]> => {
    const res = await clientFetch('/api/ecritures/balance/' + entId + '/' + exId);
    if (!res.ok) return [];
    const data: BalanceLigne[] = await res.json();
    return data.map(row => ({
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
    else { const resN = await clientFetch('/api/balance/' + entiteId + '/' + selectedExercice.id + '/N'); const dataN = await resN.json(); lignesNResult = dataN.lignes || []; source = 'Import balance'; }
    const prevExercice = exercices.find(e => e.annee === selectedExercice.annee - 1);
    if (prevExercice) {
      if (balanceSource === 'ecritures') lignesN1Result = await loadBalanceFromEcritures(entiteId, prevExercice.id);
      else { const resN1 = await clientFetch('/api/balance/' + entiteId + '/' + prevExercice.id + '/N'); const dataN1 = await resN1.json(); lignesN1Result = dataN1.lignes || []; }
    } else if (balanceSource === 'import') { const resN1 = await clientFetch('/api/balance/' + entiteId + '/' + selectedExercice.id + '/N-1'); const dataN1 = await resN1.json(); lignesN1Result = dataN1.lignes || []; }
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

  // Compute all values for N and N-1
  const computeAll = (lignes: BalanceLigne[]): Record<string, CRBalanceResult> => {
    const produits = computeProduitsFromBalance(lignes, PRODUITS_MAPPING);
    const charges = computeChargesFromBalance(lignes, CHARGES_MAPPING);
    const variationCharges = computeChargesFromBalance(lignes, VARIATION_CHARGES_MAPPING);
    const variationProduits = computeProduitsFromBalance(lignes, VARIATION_PRODUITS_MAPPING);
    return { ...produits, ...charges, ...variationCharges, ...variationProduits };
  };

  const dataN = computeAll(lignesN);
  const dataN1 = computeAll(lignesN1);

  const getBaseValue = (ref: string, data: Record<string, CRBalanceResult>): number => {
    return data[ref] ? (data[ref].net || 0) : 0;
  };

  const getValue = (ref: string, data: Record<string, CRBalanceResult>): number => {
    // Computed subtotals and results
    switch (ref) {
      case 'XA': {
        // MARGE COMMERCIALE = TA - RA - RB
        const ta = getBaseValue('TA', data);
        const ra = getBaseValue('RA', data);
        const rb = getBaseValue('RB', data);
        return ta - ra - rb;
      }
      case 'XB': {
        // CHIFFRE D'AFFAIRES = TA + TB + TC + TD
        return getBaseValue('TA', data) + getBaseValue('TB', data) + getBaseValue('TC', data) + getBaseValue('TD', data);
      }
      case 'XC': {
        // VALEUR AJOUTEE
        const xa = getValue('XA', data);
        const tb = getBaseValue('TB', data);
        const tc = getBaseValue('TC', data);
        const td = getBaseValue('TD', data);
        const te = getBaseValue('TE', data);
        const tf = getBaseValue('TF', data);
        const tg = getBaseValue('TG', data);
        const th = getBaseValue('TH', data);
        const ti = getBaseValue('TI', data);
        const rc = getBaseValue('RC', data);
        const rd = getBaseValue('RD', data);
        const re = getBaseValue('RE', data);
        const rf = getBaseValue('RF', data);
        const rg = getBaseValue('RG', data);
        const rh = getBaseValue('RH', data);
        const ri = getBaseValue('RI', data);
        const rj = getBaseValue('RJ', data);
        return xa + tb + tc + td + te + tf + tg + th + ti - rc - rd - re - rf - rg - rh - ri - rj;
      }
      case 'XD': {
        // EXCEDENT BRUT D'EXPLOITATION = XC - RK
        return getValue('XC', data) - getBaseValue('RK', data);
      }
      case 'XE': {
        // RESULTAT D'EXPLOITATION = XD + TJ - RL
        return getValue('XD', data) + getBaseValue('TJ', data) - getBaseValue('RL', data);
      }
      case 'XF': {
        // RESULTAT FINANCIER = TK + TL + TM - RM - RN
        return getBaseValue('TK', data) + getBaseValue('TL', data) + getBaseValue('TM', data) - getBaseValue('RM', data) - getBaseValue('RN', data);
      }
      case 'XG': {
        // RESULTAT DES ACTIVITES ORDINAIRES = XE + XF
        return getValue('XE', data) + getValue('XF', data);
      }
      case 'XH': {
        // RESULTAT HAO = TN + TO - RO - RP
        return getBaseValue('TN', data) + getBaseValue('TO', data) - getBaseValue('RO', data) - getBaseValue('RP', data);
      }
      case 'XI': {
        // RESULTAT NET = XG + XH - RQ - RS
        return getValue('XG', data) + getValue('XH', data) - getBaseValue('RQ', data) - getBaseValue('RS', data);
      }
      default:
        return getBaseValue(ref, data);
    }
  };

  const annee = selectedExercice ? selectedExercice.annee : new Date().getFullYear();

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
    a.download = 'Compte_Resultat_SYSCOHADA_' + annee + '.pdf';
    a.click();
    URL.revokeObjectURL(url);
  };

  const printPDF = (): void => {
    if (!previewUrl) return;
    const win = window.open(previewUrl, '_blank');
    if (win) win.print();
  };

  const duree = selectedExercice?.duree_mois || 12;

  const renderHeader = (): React.JSX.Element => (
    <div className="etat-header-officiel">
      <div className="etat-header-grid">
        <div className="etat-header-row">
          <span className="etat-header-label">Désignation entité :</span>
          <span className="etat-header-value">{entiteName || ''}</span>
          <span className="etat-header-label">Exercice clos le :</span>
          <span className="etat-header-value-right">31-12-{annee}</span>
        </div>
        <div className="etat-header-row">
          <span className="etat-header-label">Numéro d'identification :</span>
          <span className="etat-header-value">{entiteNif || ''}</span>
          <span className="etat-header-label">Durée (en mois) :</span>
          <span className="etat-header-value-right">{duree}</span>
        </div>
      </div>
      <div className="etat-sub-titre">COMPTE DE RÉSULTAT AU 31/12/{annee}</div>
    </div>
  );

  const renderFooter = (): React.JSX.Element => (
    <div className="bilan-footer">
      <span>NORMX Etats — SYSCOHADA</span>
      <span>Exercice clos le 31/12/{annee}</span>
    </div>
  );

  return (
    <div className="bilan-wrapper">
      <div className="bilan-toolbar">
        <div className="bilan-toolbar-left">
          <button className="bilan-back-btn" onClick={onBack}><LuArrowLeft /> Retour</button>
          <h2>Compte de Resultat SYSCOHADA</h2>
        </div>
        <div className="bilan-toolbar-right">
          <button className="bilan-export-btn secondary" onClick={openPreview}>
            <LuEye /> Apercu
          </button>
          <button className="bilan-export-btn" onClick={async () => { const pdf = await generatePDF(); pdf.save('Compte_Resultat_SYSCOHADA_' + annee + '.pdf'); }}>
            <LuDownload /> Exporter PDF
          </button>
        </div>
      </div>

      <div className="bilan-exercice-select">
        <label>Exercice :</label>
        <select
          value={selectedExercice ? selectedExercice.id : ''}
          onChange={e => {
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

      {/* PAGE — COMPTE DE RESULTAT SYSCOHADA */}
      <div className="a4-page" ref={pageRef}>
        {renderHeader()}

        <table className="bilan-table">
          <thead>
            <tr>
              <th className="col-ref" rowSpan={2}>REF</th>
              <th className="col-libelle" rowSpan={2}>LIBELLES</th>
              <th className="col-note" rowSpan={2}>Note</th>
              <th className="col-signe" rowSpan={2}>+/-</th>
              <th className="col-montant">EXERCICE AU 31/12/{annee}</th>
              <th className="col-montant">EXERCICE AU 31/12/{annee - 1}</th>
            </tr>
            <tr>
              <th className="col-montant">NET</th>
              <th className="col-montant">NET</th>
            </tr>
          </thead>
          <tbody>
            {CR_ROWS.map((row, i) => {
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
                  <td className="col-signe">{row.signe || ''}</td>
                  <td className="col-montant">{formatMontant(netN)}</td>
                  <td className="col-montant">{formatMontant(netN1)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Indicateur benefice/perte */}
      <div className="bilan-equilibre">
        {(() => {
          const resultat = getValue('XI', dataN);
          if (!balanceFound) return null;
          return (
            <span className={resultat >= 0 ? 'equilibre-ok' : 'equilibre-ko'}>
              {resultat >= 0
                ? 'Bénéfice : ' + formatMontant(resultat) + ' FCFA'
                : 'Perte : ' + formatMontant(Math.abs(resultat)) + ' FCFA'
              }
            </span>
          );
        })()}
      </div>

      {renderFooter()}

      {/* Modale apercu PDF */}
      {previewUrl && (
        <div className="pdf-preview-overlay" onClick={closePreview}>
          <div className="pdf-preview-modal" onClick={e => e.stopPropagation()}>
            <div className="pdf-preview-header">
              <h3>Apercu — Compte de Resultat SYSCOHADA {annee}</h3>
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
                title="Apercu Compte de Resultat SYSCOHADA PDF"
                className="pdf-preview-iframe"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default CompteResultatSYSCOHADA;
