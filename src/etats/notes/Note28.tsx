import React, { useState, useRef, useEffect } from 'react';
import { LuDownload, LuArrowLeft, LuEye, LuX, LuPrinter, LuSave, LuPenLine } from 'react-icons/lu';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import '../BilanSYCEBNL.css';
import '../FicheIdentification.css';
import type { Exercice, EtatBaseProps } from '../../types';

interface Note28Props extends EtatBaseProps { onGoToParametres?: () => void; }

interface LigneProvision {
  num: string;
  label: string;
  ouverture: string;
  aug_exploitation: string;
  aug_financieres: string;
  aug_hao: string;
  dim_exploitation: string;
  dim_financieres: string;
  dim_hao: string;
  cloture: string;
  bold?: boolean;
  isTotal?: boolean;
  group?: 'dotations' | 'charges';
}

const LIGNES_INIT: Omit<LigneProvision, 'ouverture' | 'aug_exploitation' | 'aug_financieres' | 'aug_hao' | 'dim_exploitation' | 'dim_financieres' | 'dim_hao' | 'cloture'>[] = [
  { num: '1.', label: 'Provisions réglementées', group: 'dotations' },
  { num: '2.', label: 'Provisions financières pour risques et charges', group: 'dotations' },
  { num: '3.', label: 'Dépréciations des immobilisations', group: 'dotations' },
  { num: '', label: 'TOTAL : DOTATIONS', bold: true, isTotal: true, group: 'dotations' },
  { num: '4.', label: 'Dépréciations des stocks', group: 'charges' },
  { num: '5.', label: 'Dépréciations actif circulant HAO', group: 'charges' },
  { num: '6.', label: 'Dépréciations fournisseurs', group: 'charges' },
  { num: '7.', label: 'Dépréciations clients', group: 'charges' },
  { num: '8.', label: 'Dépréciations fournisseurs', group: 'charges' },
  { num: '9.', label: 'Dépréciations autres créances', group: 'charges' },
  { num: '10.', label: 'Dépréciations titres de placement', group: 'charges' },
  { num: '11.', label: 'Dépréciations valeurs à encaisser', group: 'charges' },
  { num: '12.', label: 'Dépréciations disponibilité', group: 'charges' },
  { num: '13.', label: 'Provisions pour risques à court terme exploitation', group: 'charges' },
  { num: '14.', label: 'Provisions pour risques à court terme à caractère financier', group: 'charges' },
  { num: '', label: 'TOTAL : CHARGES POUR DEPRECIATIONS ET PROVISIONS A COURT TERME', bold: true, isTotal: true, group: 'charges' },
  { num: '', label: 'TOTAL', bold: true, isTotal: true },
];

const emptyVals = { ouverture: '', aug_exploitation: '', aug_financieres: '', aug_hao: '', dim_exploitation: '', dim_financieres: '', dim_hao: '', cloture: '' };

function Note28({ entiteName, entiteNif = '', entiteId, offre, onBack }: Note28Props): React.JSX.Element {
  const [exercices, setExercices] = useState<Exercice[]>([]); const [selectedExercice, setSelectedExercice] = useState<Exercice | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null); const [pdfBlob, setPdfBlob] = useState<Blob | null>(null);
  const [params, setParams] = useState<Record<string, string>>({}); const [editing, setEditing] = useState(false); const [saving, setSaving] = useState(false); const [saved, setSaved] = useState(false);
  const [lignes, setLignes] = useState<LigneProvision[]>(LIGNES_INIT.map(l => ({ ...l, ...emptyVals })));
  const DEFAULT_COMMENTAIRE = `• Indiquer les événements et circonstances qui ont conduit à la constitution et à la reprise de la dépréciation et de la provision.`;
  const [commentaire, setCommentaire] = useState(DEFAULT_COMMENTAIRE);
  const pageRef = useRef<HTMLDivElement>(null);

  useEffect(() => { if (!entiteId) return; fetch('/api/entites/' + entiteId).then(r => r.json()).then(ent => { const d = ent.data || {}; setParams(d); setCommentaire(d['note28_commentaire'] || DEFAULT_COMMENTAIRE); if (d['note28_lignes']) { try { const p = JSON.parse(d['note28_lignes']); if (Array.isArray(p) && p.length > 0) setLignes(p); } catch { /* */ } } }).catch(() => {}); }, [entiteId]);
  useEffect(() => { if (!entiteId) return; fetch('/api/balance/exercices/' + entiteId).then(r => r.json()).then((d: Exercice[]) => { setExercices(d); if (d.length > 0) { const now = new Date(); const y = now.getFullYear(); const m = now.getMonth(); const py = m <= 2 ? y - 1 : y; setSelectedExercice(d.find(e => e.annee === py) || d.find(e => e.annee === y) || d.find(e => e.annee === y - 1) || d[0]); } }).catch(() => {}); }, [entiteId]);

  const handleSave = async () => { setSaving(true); try { const d: Record<string, string> = { ...params, note28_lignes: JSON.stringify(lignes), note28_commentaire: commentaire }; const r = await fetch(`/api/entites/${entiteId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ data: d }) }); if (r.ok) { setParams(d); setSaved(true); setEditing(false); setTimeout(() => setSaved(false), 3000); } } catch { /* */ } setSaving(false); };

  const duree = selectedExercice?.duree_mois || 12; const dateFin = selectedExercice?.date_fin ? new Date(selectedExercice.date_fin) : null; const annee = selectedExercice ? selectedExercice.annee : new Date().getFullYear();
  const fmtDateShort = (d: Date | null): string => { if (!d) return ''; return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' }); };

  const parseN = (v: string): number => { const n = parseFloat(v.replace(/\s/g, '').replace(',', '.')); return isNaN(n) ? 0 : n; };
  const fmtM = (v: number): string => { if (v === 0) return ''; return Math.round(v).toLocaleString('fr-FR'); };

  const updateLigne = (idx: number, field: keyof LigneProvision, value: string) => {
    setLignes(prev => prev.map((l, i) => i === idx ? { ...l, [field]: value } : l));
  };

  // Calcul automatique des totaux
  const dotationsDetail = lignes.filter(l => l.group === 'dotations' && !l.isTotal);
  const chargesDetail = lignes.filter(l => l.group === 'charges' && !l.isTotal);
  const allDetail = [...dotationsDetail, ...chargesDetail];

  const sumFields = (rows: LigneProvision[]) => {
    const fields: (keyof LigneProvision)[] = ['ouverture', 'aug_exploitation', 'aug_financieres', 'aug_hao', 'dim_exploitation', 'dim_financieres', 'dim_hao'];
    const result: Record<string, number> = {};
    for (const f of fields) result[f] = rows.reduce((s, r) => s + parseN(r[f] as string), 0);
    result.cloture = result.ouverture + result.aug_exploitation + result.aug_financieres + result.aug_hao - result.dim_exploitation - result.dim_financieres - result.dim_hao;
    return result;
  };

  const totalDot = sumFields(dotationsDetail);
  const totalCharges = sumFields(chargesDetail);
  const totalGeneral = sumFields(allDetail);

  const getTotalFor = (l: LigneProvision) => {
    if (l.label.includes('DOTATIONS')) return totalDot;
    if (l.label.includes('CHARGES')) return totalCharges;
    if (l.label === 'TOTAL') return totalGeneral;
    return null;
  };

  // Calcul clôture par ligne
  const computeCloture = (l: LigneProvision): string => {
    const o = parseN(l.ouverture); const ae = parseN(l.aug_exploitation); const af = parseN(l.aug_financieres); const ah = parseN(l.aug_hao);
    const de = parseN(l.dim_exploitation); const df = parseN(l.dim_financieres); const dh = parseN(l.dim_hao);
    const c = o + ae + af + ah - de - df - dh;
    return c !== 0 ? fmtM(c) : '';
  };

  const generatePDF = async (): Promise<jsPDF> => { const w = editing; if (w) setEditing(false); await new Promise(r => setTimeout(r, 100)); const pdf = new jsPDF('l', 'mm', 'a4'); if (!pageRef.current) return pdf; const c = await html2canvas(pageRef.current, { scale: 2, useCORS: true, backgroundColor: '#ffffff' }); pdf.addImage(c.toDataURL('image/png'), 'PNG', 0, 0, 297, Math.min((c.height * 297) / c.width, 210)); if (w) setEditing(true); return pdf; };
  const openPreview = async () => { const pdf = await generatePDF(); const blob = pdf.output('blob'); setPdfBlob(blob); setPreviewUrl(URL.createObjectURL(blob)); };
  const closePreview = () => { if (previewUrl) URL.revokeObjectURL(previewUrl); setPreviewUrl(null); setPdfBlob(null); };
  const downloadPDF = () => { if (!pdfBlob) return; const u = URL.createObjectURL(pdfBlob); const a = document.createElement('a'); a.href = u; a.download = 'Note28_' + annee + '.pdf'; a.click(); URL.revokeObjectURL(u); };
  const printPDF = () => { if (!previewUrl) return; const w = window.open(previewUrl); if (w) { w.onload = () => w.print(); } };

  const th: React.CSSProperties = { border: '0.5px solid #000', padding: '10px 14px', fontSize: 10, fontWeight: 700, textAlign: 'center', verticalAlign: 'middle', background: '#f5f5f5' };
  const td: React.CSSProperties = { border: '0.5px solid #000', padding: '10px 14px', fontSize: 10, verticalAlign: 'middle' };
  const tdR: React.CSSProperties = { ...td, textAlign: 'right', fontVariantNumeric: 'tabular-nums' };
  const tdB: React.CSSProperties = { ...td, fontWeight: 700, background: '#f0f0f0' };
  const tdBR: React.CSSProperties = { ...tdR, fontWeight: 700, background: '#f0f0f0' };
  const inp: React.CSSProperties = { width: '100%', padding: '5px 8px', fontSize: 10, border: '1px solid #D4A843', borderRadius: 2, background: '#fffbf0', textAlign: 'right', boxSizing: 'border-box' };
  const textareaStyle: React.CSSProperties = { width: '100%', minHeight: 30, padding: '6px 10px', fontSize: 12, lineHeight: '1.5', border: '1px solid #D4A843', borderRadius: 3, background: '#fffbf0', fontFamily: 'inherit', boxSizing: 'border-box', resize: 'vertical' };

  const renderInput = (idx: number, field: keyof LigneProvision) => {
    const val = lignes[idx][field] as string;
    if (!editing) return val;
    return <input value={val} onChange={e => updateLigne(idx, field, e.target.value)} style={inp} />;
  };

  const FIELDS: (keyof LigneProvision)[] = ['ouverture', 'aug_exploitation', 'aug_financieres', 'aug_hao', 'dim_exploitation', 'dim_financieres', 'dim_hao'];

  return (
    <div>
      <div className="etat-toolbar">
        <button className="etat-back-btn" onClick={onBack}><LuArrowLeft size={18} /> Retour</button>
        <div className="etat-toolbar-title">Note 28 — Provisions et dépréciations inscrites au bilan</div>
        <div className="etat-toolbar-actions">
          <select className="etat-exercice-select" value={selectedExercice?.id || ''} onChange={e => { const ex = exercices.find(x => x.id === Number(e.target.value)); if (ex) setSelectedExercice(ex); }}>{exercices.map(ex => (<option key={ex.id} value={ex.id}>{ex.annee}</option>))}</select>
          {!editing ? (<button className="etat-action-btn" onClick={() => setEditing(true)} style={{ background: '#D4A843', color: '#fff', border: 'none' }}><LuPenLine size={16} /> Modifier</button>) : (<button className="etat-action-btn" onClick={handleSave} disabled={saving} style={{ background: '#059669', color: '#fff', border: 'none' }}><LuSave size={16} /> {saving ? 'Sauvegarde...' : 'Sauvegarder'}</button>)}
          <button className="etat-action-btn" onClick={openPreview}><LuEye size={16} /> Aperçu</button>
        </div>
      </div>
      {previewUrl && (<div className="etat-preview-overlay" onClick={closePreview}><div className="etat-preview-modal" onClick={e => e.stopPropagation()}><div className="etat-preview-header"><span>Aperçu — Note 28</span><div className="etat-preview-actions"><button onClick={printPDF} title="Imprimer"><LuPrinter size={18} /></button><button onClick={downloadPDF} title="Télécharger"><LuDownload size={18} /></button><button onClick={closePreview}><LuX size={18} /></button></div></div><iframe src={previewUrl} className="etat-preview-iframe" title="Aperçu Note 28" /></div></div>)}

      <div ref={pageRef} style={{ width: '297mm', minHeight: '210mm', background: '#fff', margin: '0 auto 20px', padding: '6mm 8mm', boxShadow: '0 2px 12px rgba(0,0,0,0.1)', boxSizing: 'border-box', fontFamily: "'Outfit', 'Segoe UI', Arial, sans-serif", fontSize: 10, color: '#1a1a1a' }}>
        <div className="etat-header-officiel"><div className="etat-header-grid"><div className="etat-header-row"><span className="etat-header-label">Désignation entité :</span><span className="etat-header-value">{entiteName || ''}</span><span className="etat-header-label">Exercice clos le :</span><span className="etat-header-value-right">{dateFin ? fmtDateShort(dateFin) : ''}</span></div><div className="etat-header-row"><span className="etat-header-label">Numéro d'identification :</span><span className="etat-header-value">{entiteNif || ''}</span><span className="etat-header-label">Durée (en mois) :</span><span className="etat-header-value-right">{duree}</span></div></div></div>
        <h3 style={{ textAlign: 'center', fontSize: 14, fontWeight: 700, margin: '30px 0 20px', textDecoration: 'underline' }}>
          NOTE 28 — PROVISIONS ET DEPRECIATIONS INSCRITES AU BILAN
        </h3>

        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 0 }}>
          <thead>
            <tr>
              <th style={{ ...th, width: '25%' }} rowSpan={3}>NATURE</th>
              <th style={th} rowSpan={2}>A<br />Provisions à l'ouverture de l'exercice</th>
              <th style={th} colSpan={3}>B<br />Augmentations : dotations</th>
              <th style={th} colSpan={3}>C<br />Diminutions : reprises</th>
              <th style={th} rowSpan={2}>D = A + B - C<br />Provisions à la clôture de l'exercice</th>
            </tr>
            <tr>
              <th style={th}>d'exploitation</th>
              <th style={th}>financières</th>
              <th style={th}>Hors activités ordinaires</th>
              <th style={th}>d'exploitation</th>
              <th style={th}>financières</th>
              <th style={th}>Hors activités ordinaires</th>
            </tr>
          </thead>
          <tbody>
            {lignes.map((l, i) => {
              const tot = l.isTotal ? getTotalFor(l) : null;
              if (tot) {
                return (
                  <tr key={i}>
                    <td style={tdB}>{l.num ? l.num + ' ' : ''}{l.label}</td>
                    {FIELDS.map(f => <td key={f} style={tdBR}>{fmtM(tot[f])}</td>)}
                    <td style={tdBR}>{fmtM(tot.cloture)}</td>
                  </tr>
                );
              }
              return (
                <tr key={i}>
                  <td style={td}>{l.num ? l.num + ' ' : ''}{l.label}</td>
                  {FIELDS.map(f => <td key={f} style={tdR}>{renderInput(i, f)}</td>)}
                  <td style={{ ...tdR, background: '#fafafa' }}>{computeCloture(l)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>

        <div style={{ border: '0.5px solid #000', borderTop: 'none', padding: '8px 10px' }}>
          <p style={{ fontSize: 12, fontWeight: 700, marginBottom: 4, marginTop: 0 }}>Commentaire :</p>
          {editing ? <textarea value={commentaire} onChange={e => setCommentaire(e.target.value)} style={textareaStyle} /> : <div style={{ fontSize: 12, lineHeight: 1.5, whiteSpace: 'pre-wrap', minHeight: 20 }}>{commentaire}</div>}
        </div>
      </div>
    </div>
  );
}

export default Note28;
