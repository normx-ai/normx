import React, { useState, useRef, useEffect, useCallback } from 'react';
import { LuDownload, LuArrowLeft, LuTriangleAlert, LuEye, LuX, LuPrinter } from 'react-icons/lu';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { BalanceLigne, Exercice, EtatBaseProps, ActifMapping, PassifMapping } from '../types';
import { fmtM } from '../utils/formatters';
import './BilanSYCEBNL.css';

// ===================== BILAN SMT — Mapping comptes =====================

interface ValResult { net: number; }
type ValData = Record<string, ValResult>;

const ACTIF_MAPPING: Record<string, ActifMapping> = {
  GA: { brut: ['20', '21', '22', '23', '24', '25'], amort: ['28', '29'] },
  GB: { brut: ['31', '32', '33', '34', '36', '37', '38'], amort: ['39'] },
  GC: { brut: ['41', '42', '43', '44', '45', '47'], amort: ['49'], debitOnly: ['42', '43', '44', '45', '47'] },
  GD: { brut: ['57'], amort: [] },
  GE: { brut: ['51', '52', '53'], amort: ['59'], debitOnly: ['52', '53'] },
};

const PASSIF_MAPPING: Record<string, PassifMapping> = {
  HA: { comptes: ['101', '102', '103', '104', '105'] },
  HC: { comptes: ['16', '17'] },
  HD: { comptes: ['40', '42', '43', '44', '45', '47', '56'], exclude: ['409'], creditOnly: ['42', '43', '44', '45', '47'] },
};

const PRODUITS_PREFIXES = ['70', '71', '72', '73', '75', '77', '78', '79', '82', '84', '86', '88'];
const CHARGES_PREFIXES = ['60', '61', '62', '63', '64', '65', '66', '67', '68', '69', '81', '83', '85', '87'];

function computeResultatNet(lignes: BalanceLigne[]): number {
  let produits = 0, charges = 0;
  for (const l of lignes) {
    const num = (l.numero_compte || '').trim();
    const sd = parseFloat(String(l.solde_debiteur_revise ?? l.solde_debiteur)) || 0;
    const sc = parseFloat(String(l.solde_crediteur_revise ?? l.solde_crediteur)) || 0;
    if (PRODUITS_PREFIXES.some(p => num.startsWith(p))) produits += sc - sd;
    if (CHARGES_PREFIXES.some(p => num.startsWith(p))) charges += sd - sc;
  }
  return produits - charges;
}

function matchesComptes(num: string, prefixes: string[]): boolean {
  return prefixes.some(p => num.startsWith(p));
}

function computeActif(lignes: BalanceLigne[], mapping: Record<string, ActifMapping>): ValData {
  const result: ValData = {};
  for (const ref in mapping) {
    const m = mapping[ref];
    let brut = 0, amort = 0;
    for (const l of lignes) {
      const num = (l.numero_compte || '').trim();
      const sd = parseFloat(String(l.solde_debiteur_revise ?? l.solde_debiteur)) || 0;
      const sc = parseFloat(String(l.solde_crediteur_revise ?? l.solde_crediteur)) || 0;
      if (matchesComptes(num, m.brut || [])) {
        if (m.debitOnly?.length && matchesComptes(num, m.debitOnly)) { if (sd > sc) brut += sd - sc; }
        else brut += sd - sc;
      }
      if (matchesComptes(num, m.amort || [])) amort += sc - sd;
    }
    result[ref] = { net: brut - amort };
  }
  return result;
}

function computePassif(lignes: BalanceLigne[], mapping: Record<string, PassifMapping>): ValData {
  const result: ValData = {};
  for (const ref in mapping) {
    const m = mapping[ref];
    let net = 0;
    for (const l of lignes) {
      const num = (l.numero_compte || '').trim();
      const sd = parseFloat(String(l.solde_debiteur_revise ?? l.solde_debiteur)) || 0;
      const sc = parseFloat(String(l.solde_crediteur_revise ?? l.solde_crediteur)) || 0;
      if (matchesComptes(num, m.comptes || []) && !matchesComptes(num, m.exclude || [])) {
        if (m.creditOnly?.length && matchesComptes(num, m.creditOnly)) { if (sc > sd) net += sc - sd; }
        else net += sc - sd;
      }
    }
    result[ref] = { net };
  }
  return result;
}

/* fmtM importe depuis utils/formatters */

interface Row { ref: string; libelle: string; note?: string; bold?: boolean; }

const ACTIF_ROWS: Row[] = [
  { ref: 'GA', libelle: 'Immobilisations (1)', note: '1' },
  { ref: 'GB', libelle: 'Stocks', note: '2' },
  { ref: 'GC', libelle: 'Clients et débiteurs divers', note: '3' },
  { ref: 'GD', libelle: 'Caisse' },
  { ref: 'GE', libelle: 'Banque (en + ou en -)' },
  { ref: 'GZ', libelle: 'Total actif', bold: true },
];

const PASSIF_ROWS: Row[] = [
  { ref: 'HA', libelle: 'Compte exploitant' },
  { ref: 'HB', libelle: 'Résultat exercice' },
  { ref: 'HC', libelle: 'Emprunt' },
  { ref: 'HD', libelle: 'Fournisseurs et créditeurs', note: '3' },
  { ref: 'HZ', libelle: 'Total passif', bold: true },
];

function BilanSMT({ entiteName, entiteSigle = '', entiteAdresse = '', entiteNif = '', typeActivite, entiteId, offre = 'comptabilite', onBack }: EtatBaseProps): React.JSX.Element {
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
  const pageActifRef = useRef<HTMLDivElement>(null);
  const pagePassifRef = useRef<HTMLDivElement>(null);

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
      if (balanceSource === 'ecritures') {
        lN = await loadBalanceFromEcritures(entiteId, selectedExercice.id);
        src = 'Ecritures comptables';
      } else {
        const res = await fetch('/api/balance/' + entiteId + '/' + selectedExercice.id + '/N');
        const d: { lignes?: BalanceLigne[] } = await res.json();
        lN = d.lignes || []; src = 'Import balance';
      }
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

  const actifN = computeActif(lignesN, ACTIF_MAPPING);
  const actifN1 = computeActif(lignesN1, ACTIF_MAPPING);
  const passifN = computePassif(lignesN, PASSIF_MAPPING);
  const passifN1 = computePassif(lignesN1, PASSIF_MAPPING);
  passifN['HB'] = { net: computeResultatNet(lignesN) };
  passifN1['HB'] = { net: computeResultatNet(lignesN1) };

  const getVal = (ref: string, data: ValData, rows: Row[]): number => {
    if (ref.endsWith('Z')) {
      return rows.filter(r => !r.bold).reduce((s, r) => s + (data[r.ref]?.net || 0), 0);
    }
    return data[ref]?.net || 0;
  };

  const annee = selectedExercice ? selectedExercice.annee : new Date().getFullYear();
  const duree = selectedExercice?.duree_mois || 12;
  const dateFin = selectedExercice?.date_fin ? new Date(selectedExercice.date_fin) : null;
  const fmtDate = (d: Date | null): string => d ? d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '31/12/' + annee;

  const generatePDF = async (): Promise<jsPDF> => {
    const pdf = new jsPDF('l', 'mm', 'a4');
    if (pageActifRef.current) {
      const c1 = await html2canvas(pageActifRef.current, { scale: 2, useCORS: true, backgroundColor: '#fff' });
      pdf.addImage(c1.toDataURL('image/png'), 'PNG', 0, 0, 297, Math.min((c1.height * 297) / c1.width, 210));
    }
    if (pagePassifRef.current) {
      pdf.addPage('a4', 'l');
      const c2 = await html2canvas(pagePassifRef.current, { scale: 2, useCORS: true, backgroundColor: '#fff' });
      pdf.addImage(c2.toDataURL('image/png'), 'PNG', 0, 0, 297, Math.min((c2.height * 297) / c2.width, 210));
    }
    return pdf;
  };
  const openPreview = async () => { const pdf = await generatePDF(); const blob = pdf.output('blob'); setPdfBlob(blob); setPreviewUrl(URL.createObjectURL(blob)); };
  const closePreview = () => { if (previewUrl) URL.revokeObjectURL(previewUrl); setPreviewUrl(null); setPdfBlob(null); };
  const downloadPDF = () => { if (!pdfBlob) return; const u = URL.createObjectURL(pdfBlob); const a = document.createElement('a'); a.href = u; a.download = 'Bilan_SMT_' + annee + '.pdf'; a.click(); URL.revokeObjectURL(u); };
  const printPDF = () => { if (!previewUrl) return; const w = window.open(previewUrl); if (w) { w.onload = () => w.print(); } };

  // Styles
  const pageStyle: React.CSSProperties = { width: '297mm', minHeight: '210mm', background: '#fff', margin: '0 auto 20px', padding: '8mm 10mm', boxShadow: '0 2px 12px rgba(0,0,0,0.1)', boxSizing: 'border-box', fontFamily: "'Inter', 'Segoe UI', Arial, sans-serif", fontSize: 11, color: '#1a1a1a' };
  const th: React.CSSProperties = { border: '1px solid #000', padding: '8px 12px', fontSize: 11, fontWeight: 700, textAlign: 'center', verticalAlign: 'middle', background: '#e8e8e8' };
  const td: React.CSSProperties = { border: '1px solid #000', padding: '8px 12px', fontSize: 11, verticalAlign: 'middle' };
  const tdR: React.CSSProperties = { ...td, textAlign: 'right', fontVariantNumeric: 'tabular-nums' };
  const tdB: React.CSSProperties = { ...td, fontWeight: 700, background: '#f0f0f0' };
  const tdBR: React.CSSProperties = { ...tdR, fontWeight: 700, background: '#f0f0f0' };
  const tdNote: React.CSSProperties = { ...td, textAlign: 'center', width: '8%' };

  const renderHeader = (titre: string) => (
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
      <div className="etat-sub-titre">{titre}</div>
    </div>
  );

  const renderTable = (side: 'actif' | 'passif') => {
    const rows = side === 'actif' ? ACTIF_ROWS : PASSIF_ROWS;
    const dataN = side === 'actif' ? actifN : passifN;
    const dataN1Src = side === 'actif' ? actifN1 : passifN1;
    const label = side === 'actif' ? 'ACTIF' : 'PASSIF';

    return (
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th style={{ ...th, textAlign: 'left', width: '40%' }} rowSpan={2}>{label}</th>
            <th style={{ ...th, width: '8%' }} rowSpan={2}>NOTE</th>
            <th style={th} colSpan={2}>MONTANT</th>
          </tr>
          <tr>
            <th style={{ ...th, width: '22%' }}>EXERCICE N</th>
            <th style={{ ...th, width: '22%' }}>EXERCICE N-1</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const vN = getVal(row.ref, dataN, rows);
            const vN1 = getVal(row.ref, dataN1Src, rows);
            return (
              <tr key={row.ref}>
                <td style={row.bold ? tdB : td}>{row.libelle}</td>
                <td style={row.bold ? { ...tdB, textAlign: 'center' } : tdNote}>{row.note || ''}</td>
                <td style={row.bold ? tdBR : tdR}>{fmtM(vN)}</td>
                <td style={row.bold ? tdBR : tdR}>{fmtM(vN1)}</td>
              </tr>
            );
          })}
          {/* Lignes vides pour correspondre au format officiel */}
          {!rows.some(r => r.bold) && (
            <tr><td style={td}>&nbsp;</td><td style={tdNote}></td><td style={tdR}></td><td style={tdR}></td></tr>
          )}
        </tbody>
      </table>
    );
  };

  return (
    <div className="bilan-wrapper">
      <div className="bilan-toolbar">
        <div className="bilan-toolbar-left">
          <button className="bilan-back-btn" onClick={onBack}><LuArrowLeft /> Retour</button>
          <h2>Bilan SMT</h2>
        </div>
        <div className="bilan-toolbar-right">
          <select
            className="bilan-exercice-select-inline"
            value={selectedExercice?.id || ''}
            onChange={e => { const ex = exercices.find(x => x.id === parseInt(e.target.value)); setSelectedExercice(ex ?? null); }}
            style={{ marginRight: 12, padding: '6px 10px', fontSize: 13, borderRadius: 6, border: '1px solid #d1d5db' }}
          >
            {exercices.length === 0 && <option value="">Aucun exercice</option>}
            {exercices.map(ex => (<option key={ex.id} value={ex.id}>{ex.annee}</option>))}
          </select>
          {sourceUsed && <span style={{ marginRight: 12, fontSize: 12, color: '#6b7280', fontStyle: 'italic' }}>Source : {sourceUsed}</span>}
          <button className="bilan-export-btn secondary" onClick={openPreview}><LuEye /> Aperçu</button>
          <button className="bilan-export-btn" onClick={async () => { const pdf = await generatePDF(); pdf.save('Bilan_SMT_' + annee + '.pdf'); }}><LuDownload /> Exporter PDF</button>
        </div>
      </div>

      {!balanceFound && !loading && (
        <div className="bilan-alert">
          <LuTriangleAlert /> Aucune donnée pour cet exercice. {balanceSource === 'ecritures' ? 'Saisissez des écritures comptables.' : 'Importez une balance CSV.'}
        </div>
      )}
      {loading && <div style={{ padding: 20, color: '#888' }}>Chargement...</div>}

      {/* Page 1 — ACTIF */}
      <div ref={pageActifRef} style={pageStyle}>
        {renderHeader('BILAN SMT AU 31 DECEMBRE ' + annee + ' — ACTIF')}
        <div style={{ textAlign: 'right', fontSize: 9, marginBottom: 6, fontStyle: 'italic' }}>(Montants en FCFA)</div>
        {renderTable('actif')}
        <div style={{ fontSize: 8, marginTop: 10, color: '#555' }}>
          (1) A faire figurer à l'actif du bilan si elles correspondent à des montants significatifs.
        </div>
        <div className="bilan-equilibre" style={{ marginTop: 12 }}>
          {(() => {
            const tA = getVal('GZ', actifN, ACTIF_ROWS);
            const tP = getVal('HZ', passifN, PASSIF_ROWS);
            const ecart = Math.abs(tA - tP);
            return <span className={ecart < 1 ? 'equilibre-ok' : 'equilibre-ko'}>{ecart < 1 ? 'Équilibre vérifié : Actif = Passif' : 'Écart Actif/Passif : ' + fmtM(ecart) + ' FCFA'}</span>;
          })()}
        </div>
      </div>

      {/* Page 2 — PASSIF */}
      <div ref={pagePassifRef} style={pageStyle}>
        {renderHeader('BILAN SMT AU 31 DECEMBRE ' + annee + ' — PASSIF')}
        <div style={{ textAlign: 'right', fontSize: 9, marginBottom: 6, fontStyle: 'italic' }}>(Montants en FCFA)</div>
        {renderTable('passif')}
      </div>

      {/* Modal aperçu PDF */}
      {previewUrl && (
        <div className="pdf-preview-overlay" onClick={closePreview}>
          <div className="pdf-preview-modal" onClick={e => e.stopPropagation()}>
            <div className="pdf-preview-header">
              <h3>Aperçu — Bilan SMT {annee}</h3>
              <div className="pdf-preview-actions">
                <button className="pdf-action-btn" onClick={printPDF}><LuPrinter /> Imprimer</button>
                <button className="pdf-action-btn primary" onClick={downloadPDF}><LuDownload /> Télécharger</button>
                <button className="pdf-close-btn" onClick={closePreview}><LuX /></button>
              </div>
            </div>
            <div className="pdf-preview-body">
              <iframe src={previewUrl} title="Aperçu Bilan SMT PDF" className="pdf-preview-iframe" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default BilanSMT;
