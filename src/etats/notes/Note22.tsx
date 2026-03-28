import React, { useState, useRef, useEffect } from 'react';
import { LuDownload, LuArrowLeft, LuEye, LuX, LuPrinter, LuSave, LuPenLine , LuEyeOff } from 'react-icons/lu';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import '../BilanSYCEBNL.css';
import '../FicheIdentification.css';
import type { Exercice, EtatBaseProps, BalanceLigne } from '../../types';

interface Note22Props extends EtatBaseProps {
  onGoToParametres?: () => void;
}

interface Rubrique {
  label: string;
  prefixes: string[];
  group: 'marchandises' | 'matieres' | 'autres';
}

const RUBRIQUES: Rubrique[] = [
  { label: 'Achats de marchandises', prefixes: ['601'], group: 'marchandises' },
  { label: 'Achats de matières premières et fournitures liées', prefixes: ['602'], group: 'matieres' },
  { label: 'Variations de stocks', prefixes: ['603'], group: 'autres' },
  { label: 'Achats stockés de matières et fournitures consommables', prefixes: ['604'], group: 'autres' },
  { label: 'Achats d\'eau, électricité et autres énergies', prefixes: ['605'], group: 'autres' },
  { label: 'Achats de petit matériel et fournitures', prefixes: ['606'], group: 'autres' },
  { label: 'Achats de marchandises et matières en cours de route', prefixes: ['607'], group: 'autres' },
  { label: 'Achats d\'études et prestations de services', prefixes: ['608'], group: 'autres' },
  { label: 'Rabais, remises et ristournes obtenus', prefixes: ['609'], group: 'autres' },
];

function Note22({ entiteName, entiteNif = '', entiteId, offre, onBack }: Note22Props): React.JSX.Element {
  const [exercices, setExercices] = useState<Exercice[]>([]);
  const [selectedExercice, setSelectedExercice] = useState<Exercice | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [pdfBlob, setPdfBlob] = useState<Blob | null>(null);
  const [params, setParams] = useState<Record<string, string>>({});
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [hideEmpty, setHideEmpty] = useState(false);

  const [lignesN, setLignesN] = useState<BalanceLigne[]>([]);
  const [lignesN1, setLignesN1] = useState<BalanceLigne[]>([]);
  const [adjustments, setAdjustments] = useState<Record<string, Record<string, number>>>({});

  const DEFAULT_COMMENTAIRE = `• Commenter toute variation significative.`;
  const [commentaire, setCommentaire] = useState(DEFAULT_COMMENTAIRE);

  const pageRef = useRef<HTMLDivElement>(null);

  const setAdj = (label: string, field: string, value: number) => {
    setAdjustments(prev => ({ ...prev, [label]: { ...(prev[label] || {}), [field]: value } }));
  };
  const getAdj = (label: string, field: string): number => adjustments[label]?.[field] || 0;

  useEffect(() => {
    if (!entiteId) return;
    fetch('/api/entites/' + entiteId)
      .then(r => r.json())
      .then(ent => {
        const data = ent.data || {};
        setParams(data);
        setCommentaire(data['note22_commentaire'] || DEFAULT_COMMENTAIRE);
        if (data['note22_adjustments']) { try { setAdjustments(JSON.parse(data['note22_adjustments'])); } catch { /* */ } }
      })
      .catch(() => {});
  }, [entiteId]);

  useEffect(() => {
    if (!entiteId) return;
    fetch('/api/balance/exercices/' + entiteId)
      .then(r => r.json())
      .then((data: Exercice[]) => {
        setExercices(data);
        if (data.length > 0) {
          const now = new Date(); const year = now.getFullYear(); const month = now.getMonth();
          const preferYear = month <= 2 ? year - 1 : year;
          const pick = data.find(e => e.annee === preferYear) || data.find(e => e.annee === year) || data.find(e => e.annee === year - 1) || data[0];
          setSelectedExercice(pick);
        }
      })
      .catch(() => {});
  }, [entiteId]);

  const balanceSource = offre === 'comptabilite' ? 'ecritures' : 'import';
  useEffect(() => {
    if (!entiteId || !selectedExercice) return;
    const load = async () => {
      try {
        if (balanceSource === 'ecritures') { const res = await fetch('/api/ecritures/balance/' + entiteId + '/' + selectedExercice.id); setLignesN((await res.json()).lignes || []); }
        else { const res = await fetch('/api/balance/' + entiteId + '/' + selectedExercice.id + '/N'); setLignesN((await res.json()).lignes || []); }
      } catch { setLignesN([]); }
      try {
        const exN1 = exercices.find(e => e.annee === selectedExercice.annee - 1);
        if (exN1) {
          if (balanceSource === 'ecritures') { const res = await fetch('/api/ecritures/balance/' + entiteId + '/' + exN1.id); setLignesN1((await res.json()).lignes || []); }
          else { const res = await fetch('/api/balance/' + entiteId + '/' + exN1.id + '/N'); setLignesN1((await res.json()).lignes || []); }
        } else { const res = await fetch('/api/balance/' + entiteId + '/' + selectedExercice.id + '/N-1'); setLignesN1((await res.json()).lignes || []); }
      } catch { setLignesN1([]); }
    };
    load();
  }, [entiteId, selectedExercice, balanceSource, exercices]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const data: Record<string, string> = { ...params, note22_adjustments: JSON.stringify(adjustments), note22_commentaire: commentaire };
      const res = await fetch(`/api/entites/${entiteId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ data }) });
      if (res.ok) { setParams(data); setSaved(true); setEditing(false); setTimeout(() => setSaved(false), 3000); }
    } catch { /* */ }
    setSaving(false);
  };

  const duree = selectedExercice?.duree_mois || 12;
  const dateFin = selectedExercice?.date_fin ? new Date(selectedExercice.date_fin) : null;
  const annee = selectedExercice ? selectedExercice.annee : new Date().getFullYear();
  const fmtDateShort = (d: Date | null): string => { if (!d) return ''; return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' }); };
  const fmtM = (val: number): string => { if (val === 0) return '0'; return Math.round(val).toLocaleString('fr-FR'); };

  // Charges = solde débiteur
  const computeForPrefixes = (lignes: BalanceLigne[], prefixes: string[]) => {
    let total = 0;
    for (const l of lignes) { const num = (l.numero_compte || '').trim(); if (!prefixes.some(p => num.startsWith(p))) continue; total += (parseFloat(String(l.solde_debiteur)) || 0) - (parseFloat(String(l.solde_crediteur)) || 0); }
    return total;
  };

  // Clé unique pour ajustements (label peut se répéter entre groupes)
  const rowKey = (r: Rubrique, idx: number) => r.label + '_' + (r.group || '') + '_' + idx;

  const computeRow = (r: Rubrique, idx: number) => {
    const key = rowKey(r, idx);
    const n = computeForPrefixes(lignesN, r.prefixes) + getAdj(key, 'anneeN');
    const n1 = computeForPrefixes(lignesN1, r.prefixes) + getAdj(key, 'anneeN1');
    const variation = n1 !== 0 ? ((n - n1) / Math.abs(n1) * 100) : 0;
    return { anneeN: n, anneeN1: n1, variation };
  };

  const marchandisesRows = RUBRIQUES.filter(r => r.group === 'marchandises');
  const matieresRows = RUBRIQUES.filter(r => r.group === 'matieres');
  const autresRows = RUBRIQUES.filter(r => r.group === 'autres' || !r.group);

  const sumGroupRows = (rows: Rubrique[]) => rows.reduce((a, r, i) => { const v = computeRow(r, RUBRIQUES.indexOf(r)); return { anneeN: a.anneeN + v.anneeN, anneeN1: a.anneeN1 + v.anneeN1 }; }, { anneeN: 0, anneeN1: 0 });

  const totalMarchandises = sumGroupRows(marchandisesRows);
  const totalMatieres = sumGroupRows(matieresRows);
  const totalAutres = sumGroupRows(autresRows);

  const calcVar = (t: { anneeN: number; anneeN1: number }) => t.anneeN1 !== 0 ? ((t.anneeN - t.anneeN1) / Math.abs(t.anneeN1) * 100) : 0;

  const renderAdjInput = (key: string, field: string, baseValue: number) => {
    if (!editing) return fmtM(baseValue);
    const adj = getAdj(key, field);
    return <input value={adj || ''} onChange={e => { const v = e.target.value === '' ? 0 : parseFloat(e.target.value.replace(/\s/g, '').replace(',', '.')) || 0; setAdj(key, field, v); }} style={inputSt} placeholder={fmtM(baseValue - adj)} />;
  };

  const generatePDF = async (): Promise<jsPDF> => {
    const wasEditing = editing; if (wasEditing) setEditing(false); await new Promise(r => setTimeout(r, 100));
    const pdf = new jsPDF('p', 'mm', 'a4'); if (!pageRef.current) return pdf;
    const canvas = await html2canvas(pageRef.current, { scale: 2, useCORS: true, backgroundColor: '#ffffff' });
    pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 0, 210, Math.min((canvas.height * 210) / canvas.width, 297));
    if (wasEditing) setEditing(true); return pdf;
  };

  const openPreview = async () => { const pdf = await generatePDF(); const blob = pdf.output('blob'); setPdfBlob(blob); setPreviewUrl(URL.createObjectURL(blob)); };
  const closePreview = () => { if (previewUrl) URL.revokeObjectURL(previewUrl); setPreviewUrl(null); setPdfBlob(null); };
  const downloadPDF = () => { if (!pdfBlob) return; const url = URL.createObjectURL(pdfBlob); const a = document.createElement('a'); a.href = url; a.download = 'Note22_' + annee + '.pdf'; a.click(); URL.revokeObjectURL(url); };
  const printPDF = () => { if (!previewUrl) return; const w = window.open(previewUrl); if (w) { w.onload = () => w.print(); } };

  const thStyle: React.CSSProperties = { border: '0.5px solid #000', padding: '5px 8px', fontSize: 11, fontWeight: 700, textAlign: 'center', verticalAlign: 'middle', background: '#f5f5f5' };
  const tdStyle: React.CSSProperties = { border: '0.5px solid #000', padding: '5px 8px', fontSize: 11, verticalAlign: 'middle' };
  const tdRight: React.CSSProperties = { ...tdStyle, textAlign: 'right', fontVariantNumeric: 'tabular-nums' };
  const tdBold: React.CSSProperties = { ...tdStyle, fontWeight: 700 };
  const tdBoldRight: React.CSSProperties = { ...tdRight, fontWeight: 700 };
  const inputSt: React.CSSProperties = { width: '100%', padding: '5px 8px', fontSize: 12, border: '1px solid #D4A843', borderRadius: 2, background: '#fffbf0', textAlign: 'right', boxSizing: 'border-box' };
  const textareaStyle: React.CSSProperties = { width: '100%', minHeight: 30, padding: '8px 10px', fontSize: 12, lineHeight: '1.6', border: '1px solid #D4A843', borderRadius: 3, background: '#fffbf0', fontFamily: 'inherit', boxSizing: 'border-box', resize: 'vertical' };

  const renderDetailRow = (r: Rubrique) => {
    const idx = RUBRIQUES.indexOf(r);
    const vals = computeRow(r, idx);
    const key = rowKey(r, idx);
    if (hideEmpty && vals.anneeN === 0 && vals.anneeN1 === 0) return null;
    return (
      <tr key={key}>
        <td style={tdStyle}>{r.label}</td>
        <td style={tdRight}>{renderAdjInput(key, 'anneeN', vals.anneeN)}</td>
        <td style={tdRight}>{renderAdjInput(key, 'anneeN1', vals.anneeN1)}</td>
        <td style={{ ...tdRight, background: '#fafafa' }}>{vals.variation !== 0 ? vals.variation.toFixed(1) + ' %' : ''}</td>
      </tr>
    );
  };

  const renderTotalRow = (label: string, totals: { anneeN: number; anneeN1: number }) => (
    <tr key={label}>
      <td style={{ ...tdBold, background: '#f0f0f0' }}>{label}</td>
      <td style={{ ...tdBoldRight, background: '#f0f0f0' }}>{fmtM(totals.anneeN)}</td>
      <td style={{ ...tdBoldRight, background: '#f0f0f0' }}>{fmtM(totals.anneeN1)}</td>
      <td style={{ ...tdBoldRight, background: '#f0f0f0' }}>{calcVar(totals) !== 0 ? calcVar(totals).toFixed(1) + ' %' : ''}</td>
    </tr>
  );

  return (
    <div>
      <div className="etat-toolbar">
        <button className="etat-back-btn" onClick={onBack}><LuArrowLeft size={18} /> Retour</button>
        <div className="etat-toolbar-title">Note 22 — Achats</div>
        <div className="etat-toolbar-actions">
          <select className="etat-exercice-select" value={selectedExercice?.id || ''} onChange={e => { const ex = exercices.find(ex => ex.id === Number(e.target.value)); if (ex) setSelectedExercice(ex); }}>
            {exercices.map(ex => (<option key={ex.id} value={ex.id}>{ex.annee}</option>))}
          </select>
          {!editing ? (
            <button className="etat-action-btn" onClick={() => setEditing(true)} style={{ background: '#D4A843', color: '#fff', border: 'none' }}><LuPenLine size={16} /> Modifier</button>
          ) : (
            <button className="etat-action-btn" onClick={handleSave} disabled={saving} style={{ background: '#059669', color: '#fff', border: 'none' }}><LuSave size={16} /> {saving ? 'Sauvegarde...' : 'Sauvegarder'}</button>
          )}
          <button className="etat-action-btn" onClick={openPreview}><LuEye size={16} /> Aperçu</button>
          <button className="etat-action-btn" onClick={() => setHideEmpty(!hideEmpty)} style={{ background: hideEmpty ? '#1A3A5C' : '#e5e7eb', color: hideEmpty ? '#fff' : '#333', border: 'none' }}><LuEyeOff size={16} /> {hideEmpty ? 'Afficher tout' : 'Masquer vides'}</button>
        </div>
      </div>

      {previewUrl && (
        <div className="etat-preview-overlay" onClick={closePreview}>
          <div className="etat-preview-modal" onClick={e => e.stopPropagation()}>
            <div className="etat-preview-header">
              <span>Aperçu — Note 22</span>
              <div className="etat-preview-actions">
                <button onClick={printPDF} title="Imprimer"><LuPrinter size={18} /></button>
                <button onClick={downloadPDF} title="Télécharger"><LuDownload size={18} /></button>
                <button onClick={closePreview}><LuX size={18} /></button>
              </div>
            </div>
            <iframe src={previewUrl} className="etat-preview-iframe" title="Aperçu Note 22" />
          </div>
        </div>
      )}

      <div ref={pageRef} style={{
        width: '210mm', minHeight: '297mm', background: '#fff',
        margin: '0 auto 20px', padding: '6mm 10mm',
        boxShadow: '0 2px 12px rgba(0,0,0,0.1)', boxSizing: 'border-box',
        fontFamily: "'Outfit', 'Segoe UI', Arial, sans-serif", fontSize: 12, color: '#1a1a1a',
      }}>
        <div className="etat-header-officiel">
          <div className="etat-header-grid">
            <div className="etat-header-row">
              <span className="etat-header-label">Désignation entité :</span>
              <span className="etat-header-value">{entiteName || ''}</span>
              <span className="etat-header-label">Exercice clos le :</span>
              <span className="etat-header-value-right">{dateFin ? fmtDateShort(dateFin) : ''}</span>
            </div>
            <div className="etat-header-row">
              <span className="etat-header-label">Numéro d'identification :</span>
              <span className="etat-header-value">{entiteNif || ''}</span>
              <span className="etat-header-label">Durée (en mois) :</span>
              <span className="etat-header-value-right">{duree}</span>
            </div>
          </div>
        </div>
        <h3 style={{ textAlign: 'center', fontSize: 14, fontWeight: 700, margin: '30px 0 20px', textDecoration: 'underline' }}>
          NOTE 22 — ACHATS
        </h3>

        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 0 }}>
          <thead>
            <tr>
              <th style={{ ...thStyle, width: '55%' }}>Libellés</th>
              <th style={thStyle}>Année N</th>
              <th style={thStyle}>Année N-1</th>
              <th style={thStyle}>Variation en %</th>
            </tr>
          </thead>
          <tbody>
            {marchandisesRows.map(r => renderDetailRow(r))}
            {renderTotalRow('TOTAL : ACHATS DE MARCHANDISES', totalMarchandises)}
            {matieresRows.map(r => renderDetailRow(r))}
            {renderTotalRow('TOTAL : ACHATS MATIERES PREMIERES ET FOURNITURES LIEES', totalMatieres)}
            {autresRows.map(r => renderDetailRow(r))}
            {renderTotalRow('TOTAL : AUTRES ACHATS', totalAutres)}
          </tbody>
        </table>

        <div style={{ border: '0.5px solid #000', borderTop: 'none', padding: '10px 12px' }}>
          <p style={{ fontSize: 12, fontWeight: 700, marginBottom: 6, marginTop: 0 }}>Commentaire :</p>
          {editing ? (
            <textarea value={commentaire} onChange={e => setCommentaire(e.target.value)} style={textareaStyle} />
          ) : (
            <div style={{ fontSize: 12, lineHeight: 1.6, whiteSpace: 'pre-wrap', minHeight: 20 }}>{commentaire}</div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Note22;
