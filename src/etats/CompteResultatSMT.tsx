import React, { useState, useRef, useEffect, useCallback } from 'react';
import { LuDownload, LuArrowLeft, LuTriangleAlert, LuEye, LuX, LuPrinter } from 'react-icons/lu';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { BalanceLigne, Exercice, EtatBaseProps } from '../types';
import './BilanSYCEBNL.css';

// ===================== MAPPING COMPTES =====================

interface CRMappingEntry { comptes: string[]; exclude?: string[]; }

const REVENUS_MAPPING: Record<string, CRMappingEntry> = {
  KA: { comptes: ['701', '703', '704', '705', '706', '707', '708', '71'] },
  KB: { comptes: ['72', '73', '75', '77', '78', '79'] },
};

const CHARGES_MAPPING: Record<string, CRMappingEntry> = {
  JA: { comptes: ['601', '602', '604', '605', '606', '608'] },
  JB: { comptes: ['613', '614', '616'] },
  JC: { comptes: ['64', '66'] },
  JD: { comptes: ['63', '65'] },
  JE: { comptes: ['67'] },
  JF: { comptes: ['61', '62'], exclude: ['613', '614', '616'] },
};

const AMORT_MAPPING: Record<string, CRMappingEntry> = {
  JG: { comptes: ['68'] },
};

function matchesComptes(num: string, prefixes: string[]): boolean { return prefixes.some(p => num.startsWith(p)); }

function computeRevenus(lignes: BalanceLigne[], mapping: Record<string, CRMappingEntry>): Record<string, number> {
  const r: Record<string, number> = {};
  for (const ref in mapping) {
    let net = 0;
    for (const l of lignes) {
      const num = (l.numero_compte || '').trim();
      const sd = parseFloat(String(l.solde_debiteur_revise ?? l.solde_debiteur)) || 0;
      const sc = parseFloat(String(l.solde_crediteur_revise ?? l.solde_crediteur)) || 0;
      if (matchesComptes(num, mapping[ref].comptes)) net += sc - sd;
    }
    r[ref] = net;
  }
  return r;
}

function computeCharges(lignes: BalanceLigne[], mapping: Record<string, CRMappingEntry>): Record<string, number> {
  const r: Record<string, number> = {};
  for (const ref in mapping) {
    const m = mapping[ref];
    let net = 0;
    for (const l of lignes) {
      const num = (l.numero_compte || '').trim();
      const sd = parseFloat(String(l.solde_debiteur_revise ?? l.solde_debiteur)) || 0;
      const sc = parseFloat(String(l.solde_crediteur_revise ?? l.solde_crediteur)) || 0;
      if (matchesComptes(num, m.comptes) && !matchesComptes(num, m.exclude || [])) net += sd - sc;
    }
    r[ref] = net;
  }
  return r;
}

function sumByPrefix(lignes: BalanceLigne[], prefixes: string[], mode: 'debit' | 'credit'): number {
  let total = 0;
  for (const l of lignes) {
    const num = (l.numero_compte || '').trim();
    if (prefixes.some(p => num.startsWith(p))) {
      const sd = parseFloat(String(l.solde_debiteur_revise ?? l.solde_debiteur)) || 0;
      const sc = parseFloat(String(l.solde_crediteur_revise ?? l.solde_crediteur)) || 0;
      if (mode === 'debit') { if (sd > sc) total += sd - sc; }
      else { if (sc > sd) total += sc - sd; }
    }
  }
  return total;
}

const fmtM = (v: number): string => (!v || v === 0) ? '' : Math.round(v).toLocaleString('fr-FR');

// ===================== COMPOSANT =====================

function CompteResultatSMT({ entiteName, entiteSigle = '', entiteAdresse = '', entiteNif = '', typeActivite, entiteId, offre = 'comptabilite', onBack }: EtatBaseProps): React.JSX.Element {
  const [exercices, setExercices] = useState<Exercice[]>([]);
  const [selectedExercice, setSelectedExercice] = useState<Exercice | null>(null);
  const [lignesN, setLignesN] = useState<BalanceLigne[]>([]);
  const [lignesN1, setLignesN1] = useState<BalanceLigne[]>([]);
  const [balanceFound, setBalanceFound] = useState(false);
  const balanceSource = offre === 'comptabilite' ? 'ecritures' : 'import';
  const [sourceUsed, setSourceUsed] = useState('');
  const [loading, setLoading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [pdfBlob, setPdfBlob] = useState<Blob | null>(null);

  const pageCRRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!entiteId) return;
    fetch('/api/balance/exercices/' + entiteId).then(r => r.json()).then((data: Exercice[]) => {
      setExercices(data);
      if (data.length > 0) {
        const now = new Date(); const y = now.getFullYear(); const m = now.getMonth();
        const py = m <= 2 ? y - 1 : y;
        setSelectedExercice(data.find(e => e.annee === py) || data.find(e => e.annee === y) || data.find(e => e.annee === y - 1) || data[0]);
      }
    }).catch(() => {});
  }, [entiteId]);

  const loadBalanceFromEcritures = async (entId: number, exId: number): Promise<BalanceLigne[]> => {
    const res = await fetch('/api/ecritures/balance/' + entId + '/' + exId);
    if (!res.ok) return [];
    const data: Array<Record<string, string>> = await res.json();
    return data.map(row => ({
      numero_compte: row.numero_compte, libelle_compte: row.libelle_compte,
      debit: parseFloat(row.debit) || 0, credit: parseFloat(row.credit) || 0,
      solde_debiteur: parseFloat(row.solde_debiteur) || 0, solde_crediteur: parseFloat(row.solde_crediteur) || 0,
      solde_debiteur_revise: row.solde_debiteur_revise != null ? parseFloat(String(row.solde_debiteur_revise)) : undefined,
      solde_crediteur_revise: row.solde_crediteur_revise != null ? parseFloat(String(row.solde_crediteur_revise)) : undefined,
    }));
  };

  const loadBalance = useCallback(async () => {
    if (!entiteId || !selectedExercice) return;
    setLoading(true);
    try {
      let lN: BalanceLigne[] = [], lN1: BalanceLigne[] = [], src = '';
      if (balanceSource === 'ecritures') { lN = await loadBalanceFromEcritures(entiteId, selectedExercice.id); src = 'Ecritures'; }
      else { const r = await fetch('/api/balance/' + entiteId + '/' + selectedExercice.id + '/N'); const d: { lignes?: BalanceLigne[] } = await r.json(); lN = d.lignes || []; src = 'Import'; }
      setLignesN(lN); setBalanceFound(lN.length > 0); setSourceUsed(src);
      const prev = exercices.find(e => e.annee === selectedExercice.annee - 1);
      if (prev) {
        if (balanceSource === 'ecritures') lN1 = await loadBalanceFromEcritures(entiteId, prev.id);
        else { const r = await fetch('/api/balance/' + entiteId + '/' + prev.id + '/N'); const d: { lignes?: BalanceLigne[] } = await r.json(); lN1 = d.lignes || []; }
      } else if (balanceSource === 'import') {
        const r = await fetch('/api/balance/' + entiteId + '/' + selectedExercice.id + '/N-1');
        const d: { lignes?: BalanceLigne[] } = await r.json(); lN1 = d.lignes || [];
      }
      setLignesN1(lN1);
    } catch { /* */ } finally { setLoading(false); }
  }, [entiteId, selectedExercice, exercices, balanceSource]);

  useEffect(() => { loadBalance(); }, [loadBalance]);

  // Compute CR values
  const revN = computeRevenus(lignesN, REVENUS_MAPPING);
  const revN1 = computeRevenus(lignesN1, REVENUS_MAPPING);
  const chgN = computeCharges(lignesN, CHARGES_MAPPING);
  const chgN1 = computeCharges(lignesN1, CHARGES_MAPPING);
  const amtN = computeCharges(lignesN, AMORT_MAPPING);
  const amtN1 = computeCharges(lignesN1, AMORT_MAPPING);

  const totalRecN = (revN.KA || 0) + (revN.KB || 0);
  const totalRecN1 = (revN1.KA || 0) + (revN1.KB || 0);
  const totalDepN = (chgN.JA || 0) + (chgN.JB || 0) + (chgN.JC || 0) + (chgN.JD || 0) + (chgN.JE || 0) + (chgN.JF || 0);
  const totalDepN1 = (chgN1.JA || 0) + (chgN1.JB || 0) + (chgN1.JC || 0) + (chgN1.JD || 0) + (chgN1.JE || 0) + (chgN1.JF || 0);
  const soldeN = totalRecN - totalDepN;
  const soldeN1 = totalRecN1 - totalDepN1;

  // Variations
  const stockPrefixes = ['31', '32', '33', '34', '36', '37', '38'];
  const stockN = sumByPrefix(lignesN, stockPrefixes, 'debit');
  const stockN1 = sumByPrefix(lignesN1, stockPrefixes, 'debit');
  const varStocks = stockN - stockN1;

  const crPrefixes = ['41', '42', '43', '44', '45', '47'];
  const crN = sumByPrefix(lignesN, crPrefixes, 'debit');
  const crN1_val = sumByPrefix(lignesN1, crPrefixes, 'debit');
  const varCreances = crN1_val - crN;

  const dtPrefixes = ['40', '42', '43', '44', '45', '47'];
  const dtN = sumByPrefix(lignesN, dtPrefixes, 'credit');
  const dtN1 = sumByPrefix(lignesN1, dtPrefixes, 'credit');
  const varDettes = dtN - dtN1;

  const resultatN = soldeN + varStocks + varCreances + varDettes - (amtN.JG || 0);
  const resultatN1 = soldeN1 - (amtN1.JG || 0);

  const annee = selectedExercice ? selectedExercice.annee : new Date().getFullYear();
  const duree = selectedExercice?.duree_mois || 12;
  const dateFin = selectedExercice?.date_fin ? new Date(selectedExercice.date_fin) : null;
  const fmtDate = (d: Date | null): string => d ? d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '31/12/' + annee;

  const generatePDF = async (): Promise<jsPDF> => {
    const pdf = new jsPDF('p', 'mm', 'a4');
    if (pageCRRef.current) {
      const c = await html2canvas(pageCRRef.current, { scale: 2, useCORS: true, backgroundColor: '#fff' });
      pdf.addImage(c.toDataURL('image/png'), 'PNG', 0, 0, 210, Math.min((c.height * 210) / c.width, 297));
    }
    return pdf;
  };
  const openPreview = async () => { const pdf = await generatePDF(); const blob = pdf.output('blob'); setPdfBlob(blob); setPreviewUrl(URL.createObjectURL(blob)); };
  const closePreview = () => { if (previewUrl) URL.revokeObjectURL(previewUrl); setPreviewUrl(null); setPdfBlob(null); };
  const downloadPDF = () => { if (!pdfBlob) return; const u = URL.createObjectURL(pdfBlob); const a = document.createElement('a'); a.href = u; a.download = 'CR_SMT_' + annee + '.pdf'; a.click(); URL.revokeObjectURL(u); };
  const printPDF = () => { if (!previewUrl) return; const w = window.open(previewUrl); if (w) { w.onload = () => w.print(); } };

  // Styles
  const th: React.CSSProperties = { border: '1px solid #000', padding: '6px 10px', fontSize: 10, fontWeight: 700, textAlign: 'center', verticalAlign: 'middle', background: '#e8e8e8' };
  const td: React.CSSProperties = { border: '1px solid #000', padding: '6px 10px', fontSize: 10, verticalAlign: 'middle' };
  const tdR: React.CSSProperties = { ...td, textAlign: 'right', fontVariantNumeric: 'tabular-nums' };
  const tdB: React.CSSProperties = { ...td, fontWeight: 700, background: '#f0f0f0' };
  const tdBR: React.CSSProperties = { ...tdR, fontWeight: 700, background: '#f0f0f0' };
  const tdNote: React.CSSProperties = { ...td, textAlign: 'center', width: '8%' };
  const renderRow = (libelle: string, note: string, valN: number, valN1: number, bold?: boolean) => (
    <tr>
      <td style={bold ? tdB : td}>{libelle}</td>
      <td style={bold ? { ...tdB, textAlign: 'center' } : tdNote}>{note}</td>
      <td style={bold ? tdBR : tdR}>{fmtM(valN)}</td>
      <td style={bold ? tdBR : tdR}>{fmtM(valN1)}</td>
    </tr>
  );

  return (
    <div className="bilan-wrapper">
      <div className="bilan-toolbar">
        <div className="bilan-toolbar-left">
          <button className="bilan-back-btn" onClick={onBack}><LuArrowLeft /> Retour</button>
          <h2>Compte de résultat SMT</h2>
        </div>
        <div className="bilan-toolbar-right">
          <select value={selectedExercice?.id || ''} onChange={e => { const ex = exercices.find(x => x.id === parseInt(e.target.value)); setSelectedExercice(ex ?? null); }}
            style={{ marginRight: 12, padding: '6px 10px', fontSize: 13, borderRadius: 6, border: '1px solid #d1d5db' }}>
            {exercices.length === 0 && <option value="">Aucun exercice</option>}
            {exercices.map(ex => (<option key={ex.id} value={ex.id}>{ex.annee}</option>))}
          </select>
          {sourceUsed && <span style={{ marginRight: 12, fontSize: 12, color: '#6b7280', fontStyle: 'italic' }}>Source : {sourceUsed}</span>}
          <button className="bilan-export-btn secondary" onClick={openPreview}><LuEye /> Aperçu</button>
          <button className="bilan-export-btn" onClick={async () => { const pdf = await generatePDF(); pdf.save('CR_SMT_' + annee + '.pdf'); }}><LuDownload /> PDF</button>
        </div>
      </div>

      {!balanceFound && !loading && (
        <div className="bilan-alert"><LuTriangleAlert /> Aucune donnée pour cet exercice.</div>
      )}
      {loading && <div style={{ padding: 20, color: '#888' }}>Chargement...</div>}

      {/* Page unique : CR + Tableau suivi matériel */}
      <div ref={pageCRRef} style={{ width: '210mm', minHeight: '297mm', background: '#fff', margin: '0 auto 20px', padding: '5mm 8mm', boxShadow: '0 2px 12px rgba(0,0,0,0.1)', boxSizing: 'border-box', fontFamily: "'Outfit', 'Segoe UI', Arial, sans-serif", fontSize: 10, color: '#1a1a1a' }}>

        {/* En-tête CR */}
        <div className="etat-header-officiel">
          <div className="etat-header-grid">
            <div className="etat-header-row">
              <span className="etat-header-label">Désignation entité :</span>
              <span className="etat-header-value">{entiteName || ''}</span>
              <span className="etat-header-label">Exercice clos le :</span>
              <span className="etat-header-value-right">{fmtDate(dateFin)}</span>
            </div>
            <div className="etat-header-row">
              <span className="etat-header-label">Numéro d'identification :</span>
              <span className="etat-header-value">{entiteNif || ''}</span>
              <span className="etat-header-label">Durée (en mois) :</span>
              <span className="etat-header-value-right">{duree}</span>
            </div>
          </div>
          <div className="etat-sub-titre">COMPTE DE RESULTAT SMT AU 31 DECEMBRE {annee}</div>
        </div>

        {/* Tableau CR */}
        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 6 }}>
          <thead>
            <tr>
              <th style={{ ...th, textAlign: 'left', width: '50%' }} rowSpan={2}>RUBRIQUE</th>
              <th style={{ ...th, width: '8%' }} rowSpan={2}>NOTE</th>
              <th style={th} colSpan={2}>MONTANT</th>
            </tr>
            <tr>
              <th style={{ ...th, width: '18%' }}>EXERCICE N</th>
              <th style={{ ...th, width: '18%' }}>EXERCICE N-1</th>
            </tr>
          </thead>
          <tbody>
            {/* RECETTES */}
            {renderRow('Recettes sur ventes ou prestations de services', '4', revN.KA || 0, revN1.KA || 0)}
            {renderRow('Autres recettes sur activités', '4', revN.KB || 0, revN1.KB || 0)}
            {renderRow('TOTAL DES RECETTES SUR PRODUITS', '', totalRecN, totalRecN1, true)}

            {/* DEPENSES */}
            {renderRow('Dépenses sur achats', '4', chgN.JA || 0, chgN1.JA || 0)}
            {renderRow('Dépenses sur loyers', '4', chgN.JB || 0, chgN1.JB || 0)}
            {renderRow('Dépenses sur salaires', '4', chgN.JC || 0, chgN1.JC || 0)}
            {renderRow('Dépenses sur impôts et taxes', '4', chgN.JD || 0, chgN1.JD || 0)}
            {renderRow("Charges d'intérêts", '', chgN.JE || 0, chgN1.JE || 0)}
            {renderRow('Autres dépenses sur activités', '4', chgN.JF || 0, chgN1.JF || 0)}
            {renderRow('TOTAL DEPENSES SUR CHARGES', '', totalDepN, totalDepN1, true)}

            {/* SOLDE */}
            {renderRow('SOLDE : Excédent (+) ou insuffisance (-) de recettes', '', soldeN, soldeN1, true)}

            {/* Ligne vide séparatrice */}
            <tr><td style={{ ...td, border: 'none', height: 8 }} colSpan={4}></td></tr>

            {/* VARIATIONS */}
            {renderRow('- Variation des stocks N/N-1', '2', varStocks, 0)}
            {renderRow('- Variation des créances N/N-1', '3', varCreances, 0)}
            {renderRow('+ Variation des dettes d\'exploitations N/N-1', '3', varDettes, 0)}
            {renderRow('DOTATIONS AUX AMORTISSEMENTS', '', amtN.JG || 0, amtN1.JG || 0, true)}
            {renderRow("RESULTAT DE L'EXERCICE", '', resultatN, resultatN1, true)}
          </tbody>
        </table>

        {/* Indicateur */}
        {balanceFound && (
          <div style={{ textAlign: 'center', fontSize: 10, margin: '4px 0 12px', fontWeight: 600, color: resultatN >= 0 ? '#059669' : '#dc2626' }}>
            {resultatN >= 0 ? 'Excédent : ' + fmtM(resultatN) + ' FCFA' : 'Déficit : ' + fmtM(Math.abs(resultatN)) + ' FCFA'}
          </div>
        )}
      </div>


      {/* Modal aperçu */}
      {previewUrl && (
        <div className="pdf-preview-overlay" onClick={closePreview}>
          <div className="pdf-preview-modal" onClick={e => e.stopPropagation()}>
            <div className="pdf-preview-header">
              <h3>Aperçu — CR SMT {annee}</h3>
              <div className="pdf-preview-actions">
                <button className="pdf-action-btn" onClick={printPDF}><LuPrinter /> Imprimer</button>
                <button className="pdf-action-btn primary" onClick={downloadPDF}><LuDownload /> Télécharger</button>
                <button className="pdf-close-btn" onClick={closePreview}><LuX /></button>
              </div>
            </div>
            <div className="pdf-preview-body">
              <iframe src={previewUrl} title="Aperçu CR SMT" className="pdf-preview-iframe" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default CompteResultatSMT;
