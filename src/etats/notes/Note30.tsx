import React, { useState, useRef, useEffect } from 'react';
import { LuDownload, LuArrowLeft, LuEye, LuX, LuPrinter, LuSave, LuPenLine , LuEyeOff } from 'react-icons/lu';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import '../BilanSYCEBNL.css';
import '../FicheIdentification.css';
import type { Exercice, EtatBaseProps, BalanceLigne } from '../../types';

interface Note30Props extends EtatBaseProps { onGoToParametres?: () => void; }
interface Rubrique { label: string; prefixes: string[]; group: 'charges' | 'produits'; debit?: boolean; }

const RUBRIQUES: Rubrique[] = [
  { label: 'Charges HAO constatées (1) à détailler', prefixes: ['811'], group: 'charges', debit: true },
  { label: 'Pertes sur créances HAO', prefixes: ['812'], group: 'charges', debit: true },
  { label: 'Dons et libéralités accordés', prefixes: ['813'], group: 'charges', debit: true },
  { label: 'Abandons de créances consentis', prefixes: ['814'], group: 'charges', debit: true },
  { label: 'Charges provisionnées HAO', prefixes: ['816'], group: 'charges', debit: true },
  { label: 'Dotations hors activités ordinaires', prefixes: ['85'], group: 'charges', debit: true },
  { label: 'Participation des travailleurs', prefixes: ['87'], group: 'charges', debit: true },
  { label: 'Subventions d\'équilibre', prefixes: ['88'], group: 'charges', debit: true },
  { label: 'Produits HAO constatés (1) à détailler', prefixes: ['821'], group: 'produits' },
  { label: 'Dons et libéralités obtenus', prefixes: ['822'], group: 'produits' },
  { label: 'Abandons de créances obtenus', prefixes: ['823'], group: 'produits' },
  { label: 'Transferts de charges HAO', prefixes: ['848'], group: 'produits' },
  { label: 'Reprises des charges pour dépréciations et provisions à court terme HAO', prefixes: ['86'], group: 'produits' },
  { label: 'Reprises hors activités ordinaires', prefixes: ['84'], group: 'produits' },
];

function Note30({ entiteName, entiteNif = '', entiteId, offre, onBack }: Note30Props): React.JSX.Element {
  const [exercices, setExercices] = useState<Exercice[]>([]); const [selectedExercice, setSelectedExercice] = useState<Exercice | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null); const [pdfBlob, setPdfBlob] = useState<Blob | null>(null);
  const [params, setParams] = useState<Record<string, string>>({}); const [editing, setEditing] = useState(false); const [saving, setSaving] = useState(false); const [saved, setSaved] = useState(false);
  const [hideEmpty, setHideEmpty] = useState(false);
  const [lignesN, setLignesN] = useState<BalanceLigne[]>([]); const [lignesN1, setLignesN1] = useState<BalanceLigne[]>([]);
  const [adjustments, setAdjustments] = useState<Record<string, Record<string, number>>>({});
  const DEFAULT_COMMENTAIRE = `• Commenter toute variation significative.`;
  const [commentaire, setCommentaire] = useState(DEFAULT_COMMENTAIRE); const pageRef = useRef<HTMLDivElement>(null);
  const setAdj = (l: string, f: string, v: number) => { setAdjustments(p => ({ ...p, [l]: { ...(p[l] || {}), [f]: v } })); };
  const getAdj = (l: string, f: string): number => adjustments[l]?.[f] || 0;

  useEffect(() => { if (!entiteId) return; fetch('/api/entites/' + entiteId).then(r => r.json()).then(ent => { const d = ent.data || {}; setParams(d); setCommentaire(d['note30_commentaire'] || DEFAULT_COMMENTAIRE); if (d['note30_adjustments']) { try { setAdjustments(JSON.parse(d['note30_adjustments'])); } catch { /* */ } } }).catch(() => {}); }, [entiteId]);
  useEffect(() => { if (!entiteId) return; fetch('/api/balance/exercices/' + entiteId).then(r => r.json()).then((d: Exercice[]) => { setExercices(d); if (d.length > 0) { const now = new Date(); const y = now.getFullYear(); const m = now.getMonth(); const py = m <= 2 ? y - 1 : y; setSelectedExercice(d.find(e => e.annee === py) || d.find(e => e.annee === y) || d.find(e => e.annee === y - 1) || d[0]); } }).catch(() => {}); }, [entiteId]);
  const bs = offre === 'comptabilite' ? 'ecritures' : 'import';
  useEffect(() => { if (!entiteId || !selectedExercice) return; const load = async () => { try { if (bs === 'ecritures') { setLignesN((await (await fetch('/api/ecritures/balance/' + entiteId + '/' + selectedExercice.id)).json()).lignes || []); } else { setLignesN((await (await fetch('/api/balance/' + entiteId + '/' + selectedExercice.id + '/N')).json()).lignes || []); } } catch { setLignesN([]); } try { const eN1 = exercices.find(e => e.annee === selectedExercice.annee - 1); if (eN1) { if (bs === 'ecritures') { setLignesN1((await (await fetch('/api/ecritures/balance/' + entiteId + '/' + eN1.id)).json()).lignes || []); } else { setLignesN1((await (await fetch('/api/balance/' + entiteId + '/' + eN1.id + '/N')).json()).lignes || []); } } else { setLignesN1((await (await fetch('/api/balance/' + entiteId + '/' + selectedExercice.id + '/N-1')).json()).lignes || []); } } catch { setLignesN1([]); } }; load(); }, [entiteId, selectedExercice, bs, exercices]);
  const handleSave = async () => { setSaving(true); try { const d: Record<string, string> = { ...params, note30_adjustments: JSON.stringify(adjustments), note30_commentaire: commentaire }; const r = await fetch(`/api/entites/${entiteId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ data: d }) }); if (r.ok) { setParams(d); setSaved(true); setEditing(false); setTimeout(() => setSaved(false), 3000); } } catch { /* */ } setSaving(false); };

  const duree = selectedExercice?.duree_mois || 12; const dateFin = selectedExercice?.date_fin ? new Date(selectedExercice.date_fin) : null; const annee = selectedExercice ? selectedExercice.annee : new Date().getFullYear();
  const fmtDateShort = (d: Date | null): string => { if (!d) return ''; return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' }); };
  const fmtM = (v: number): string => { if (v === 0) return ''; return Math.round(v).toLocaleString('fr-FR'); };
  const compDebit = (lignes: BalanceLigne[], pfx: string[]) => { let t = 0; for (const l of lignes) { const n = (l.numero_compte || '').trim(); if (!pfx.some(p => n.startsWith(p))) continue; t += (parseFloat(String(l.solde_debiteur)) || 0) - (parseFloat(String(l.solde_crediteur)) || 0); } return t; };
  const compCredit = (lignes: BalanceLigne[], pfx: string[]) => { let t = 0; for (const l of lignes) { const n = (l.numero_compte || '').trim(); if (!pfx.some(p => n.startsWith(p))) continue; t += (parseFloat(String(l.solde_crediteur)) || 0) - (parseFloat(String(l.solde_debiteur)) || 0); } return t; };
  const computeRow = (r: Rubrique) => { const calc = r.debit ? compDebit : compCredit; const n = calc(lignesN, r.prefixes) + getAdj(r.label, 'anneeN'); const n1 = calc(lignesN1, r.prefixes) + getAdj(r.label, 'anneeN1'); return { anneeN: n, anneeN1: n1, variation: n1 !== 0 ? ((n - n1) / Math.abs(n1) * 100) : 0 }; };

  const chargesRows = RUBRIQUES.filter(r => r.group === 'charges').map(r => ({ ...r, vals: computeRow(r) }));
  const produitsRows = RUBRIQUES.filter(r => r.group === 'produits').map(r => ({ ...r, vals: computeRow(r) }));
  const sumG = (rows: { vals: { anneeN: number; anneeN1: number } }[]) => rows.reduce((a, r) => ({ anneeN: a.anneeN + r.vals.anneeN, anneeN1: a.anneeN1 + r.vals.anneeN1 }), { anneeN: 0, anneeN1: 0 });
  const totalCharges = sumG(chargesRows); const totalProduits = sumG(produitsRows);
  const totalGeneral = { anneeN: totalProduits.anneeN - totalCharges.anneeN, anneeN1: totalProduits.anneeN1 - totalCharges.anneeN1 };
  const calcVar = (t: { anneeN: number; anneeN1: number }) => t.anneeN1 !== 0 ? ((t.anneeN - t.anneeN1) / Math.abs(t.anneeN1) * 100) : 0;
  const renderAdj = (l: string, f: string, bv: number) => { if (!editing) return fmtM(bv); const a = getAdj(l, f); return <input value={a || ''} onChange={e => { const v = e.target.value === '' ? 0 : parseFloat(e.target.value.replace(/\s/g, '').replace(',', '.')) || 0; setAdj(l, f, v); }} style={inputSt} placeholder={fmtM(bv - a)} />; };

  const generatePDF = async (): Promise<jsPDF> => { const w = editing; if (w) setEditing(false); await new Promise(r => setTimeout(r, 100)); const pdf = new jsPDF('p', 'mm', 'a4'); if (!pageRef.current) return pdf; const c = await html2canvas(pageRef.current, { scale: 2, useCORS: true, backgroundColor: '#ffffff' }); pdf.addImage(c.toDataURL('image/png'), 'PNG', 0, 0, 210, Math.min((c.height * 210) / c.width, 297)); if (w) setEditing(true); return pdf; };
  const openPreview = async () => { const pdf = await generatePDF(); const blob = pdf.output('blob'); setPdfBlob(blob); setPreviewUrl(URL.createObjectURL(blob)); };
  const closePreview = () => { if (previewUrl) URL.revokeObjectURL(previewUrl); setPreviewUrl(null); setPdfBlob(null); };
  const downloadPDF = () => { if (!pdfBlob) return; const u = URL.createObjectURL(pdfBlob); const a = document.createElement('a'); a.href = u; a.download = 'Note30_' + annee + '.pdf'; a.click(); URL.revokeObjectURL(u); };
  const printPDF = () => { if (!previewUrl) return; const w = window.open(previewUrl); if (w) { w.onload = () => w.print(); } };

  const thStyle: React.CSSProperties = { border: '0.5px solid #000', padding: '5px 8px', fontSize: 11, fontWeight: 700, textAlign: 'center', verticalAlign: 'middle', background: '#f5f5f5' };
  const tdStyle: React.CSSProperties = { border: '0.5px solid #000', padding: '5px 8px', fontSize: 11, verticalAlign: 'middle' };
  const tdRight: React.CSSProperties = { ...tdStyle, textAlign: 'right', fontVariantNumeric: 'tabular-nums' };
  const tdBold: React.CSSProperties = { ...tdStyle, fontWeight: 700 }; const tdBoldRight: React.CSSProperties = { ...tdRight, fontWeight: 700 };
  const inputSt: React.CSSProperties = { width: '100%', padding: '5px 8px', fontSize: 12, border: '1px solid #D4A843', borderRadius: 2, background: '#fffbf0', textAlign: 'right', boxSizing: 'border-box' };
  const textareaStyle: React.CSSProperties = { width: '100%', minHeight: 30, padding: '8px 10px', fontSize: 12, lineHeight: '1.6', border: '1px solid #D4A843', borderRadius: 3, background: '#fffbf0', fontFamily: 'inherit', boxSizing: 'border-box', resize: 'vertical' };

  const renderRow = (r: { label: string; vals: { anneeN: number; anneeN1: number; variation: number } }) => {
    if (hideEmpty && r.vals.anneeN === 0 && r.vals.anneeN1 === 0) return null;
    return (
    <tr key={r.label}><td style={tdStyle}>{r.label}</td><td style={tdRight}>{renderAdj(r.label, 'anneeN', r.vals.anneeN)}</td><td style={tdRight}>{renderAdj(r.label, 'anneeN1', r.vals.anneeN1)}</td><td style={{ ...tdRight, background: '#fafafa' }}>{r.vals.variation !== 0 ? r.vals.variation.toFixed(1) + ' %' : ''}</td></tr>
  ); };
  const renderTotalRow = (label: string, t: { anneeN: number; anneeN1: number }) => (
    <tr key={label}><td style={{ ...tdBold, background: '#f0f0f0' }}>{label}</td><td style={{ ...tdBoldRight, background: '#f0f0f0' }}>{fmtM(t.anneeN)}</td><td style={{ ...tdBoldRight, background: '#f0f0f0' }}>{fmtM(t.anneeN1)}</td><td style={{ ...tdBoldRight, background: '#f0f0f0' }}>{calcVar(t) !== 0 ? calcVar(t).toFixed(1) + ' %' : ''}</td></tr>
  );

  return (
    <div>
      <div className="etat-toolbar">
        <button className="etat-back-btn" onClick={onBack}><LuArrowLeft size={18} /> Retour</button>
        <div className="etat-toolbar-title">Note 30 — Autres charges et produits HAO</div>
        <div className="etat-toolbar-actions">
          <select className="etat-exercice-select" value={selectedExercice?.id || ''} onChange={e => { const ex = exercices.find(x => x.id === Number(e.target.value)); if (ex) setSelectedExercice(ex); }}>{exercices.map(ex => (<option key={ex.id} value={ex.id}>{ex.annee}</option>))}</select>
          {!editing ? (<button className="etat-action-btn" onClick={() => setEditing(true)} style={{ background: '#D4A843', color: '#fff', border: 'none' }}><LuPenLine size={16} /> Modifier</button>) : (<button className="etat-action-btn" onClick={handleSave} disabled={saving} style={{ background: '#059669', color: '#fff', border: 'none' }}><LuSave size={16} /> {saving ? 'Sauvegarde...' : 'Sauvegarder'}</button>)}
          <button className="etat-action-btn" onClick={openPreview}><LuEye size={16} /> Aperçu</button>
          <button className="etat-action-btn" onClick={() => setHideEmpty(!hideEmpty)} style={{ background: hideEmpty ? '#1A3A5C' : '#e5e7eb', color: hideEmpty ? '#fff' : '#333', border: 'none' }}><LuEyeOff size={16} /> {hideEmpty ? 'Afficher tout' : 'Masquer vides'}</button>
        </div>
      </div>
      {previewUrl && (<div className="etat-preview-overlay" onClick={closePreview}><div className="etat-preview-modal" onClick={e => e.stopPropagation()}><div className="etat-preview-header"><span>Aperçu — Note 30</span><div className="etat-preview-actions"><button onClick={printPDF} title="Imprimer"><LuPrinter size={18} /></button><button onClick={downloadPDF} title="Télécharger"><LuDownload size={18} /></button><button onClick={closePreview}><LuX size={18} /></button></div></div><iframe src={previewUrl} className="etat-preview-iframe" title="Aperçu Note 30" /></div></div>)}

      <div ref={pageRef} style={{ width: '210mm', minHeight: '297mm', background: '#fff', margin: '0 auto 20px', padding: '6mm 10mm', boxShadow: '0 2px 12px rgba(0,0,0,0.1)', boxSizing: 'border-box', fontFamily: "'Outfit', 'Segoe UI', Arial, sans-serif", fontSize: 12, color: '#1a1a1a' }}>
        <div className="etat-header-officiel"><div className="etat-header-grid"><div className="etat-header-row"><span className="etat-header-label">Désignation entité :</span><span className="etat-header-value">{entiteName || ''}</span><span className="etat-header-label">Exercice clos le :</span><span className="etat-header-value-right">{dateFin ? fmtDateShort(dateFin) : ''}</span></div><div className="etat-header-row"><span className="etat-header-label">Numéro d'identification :</span><span className="etat-header-value">{entiteNif || ''}</span><span className="etat-header-label">Durée (en mois) :</span><span className="etat-header-value-right">{duree}</span></div></div></div>
        <h3 style={{ textAlign: 'center', fontSize: 14, fontWeight: 700, margin: '30px 0 20px', textDecoration: 'underline' }}>
          NOTE 30 — AUTRES CHARGES ET PRODUITS HAO
        </h3>

        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 0 }}>
          <thead><tr><th style={{ ...thStyle, width: '55%' }}>Libellés</th><th style={thStyle}>Année N</th><th style={thStyle}>Année N-1</th><th style={thStyle}>Variation en %</th></tr></thead>
          <tbody>
            {chargesRows.map(r => renderRow(r))}
            {renderTotalRow('SOUS TOTAL : AUTRES CHARGES HAO', totalCharges)}
            {produitsRows.map(r => renderRow(r))}
            {renderTotalRow('SOUS TOTAL : AUTRES PRODUITS HAO', totalProduits)}
            <tr><td colSpan={4} style={{ ...tdStyle, height: 6 }}></td></tr>
            {renderTotalRow('TOTAL', totalGeneral)}
          </tbody>
        </table>

        <div style={{ border: '0.5px solid #000', borderTop: 'none', padding: '10px 12px' }}>
          <p style={{ fontSize: 12, fontWeight: 700, marginBottom: 6, marginTop: 0 }}>Commentaire :</p>
          {editing ? <textarea value={commentaire} onChange={e => setCommentaire(e.target.value)} style={textareaStyle} /> : <div style={{ fontSize: 12, lineHeight: 1.6, whiteSpace: 'pre-wrap', minHeight: 20 }}>{commentaire}</div>}
        </div>
      </div>
    </div>
  );
}

export default Note30;
