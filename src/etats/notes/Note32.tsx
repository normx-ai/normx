import React, { useState, useRef, useEffect } from 'react';
import { LuDownload, LuArrowLeft, LuEye, LuX, LuPrinter, LuSave, LuPenLine, LuPlus, LuTrash2 } from 'react-icons/lu';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import '../BilanSYCEBNL.css';
import '../FicheIdentification.css';
import type { Exercice, EtatBaseProps } from '../../types';

interface Note32Props extends EtatBaseProps { onGoToParametres?: () => void; }

interface LigneProd {
  designation: string; unite: string;
  pays_qte: string; pays_val: string;
  autres_qte: string; autres_val: string;
  hors_qte: string; hors_val: string;
  immo_qte: string; immo_val: string;
  stock_ouv_qte: string; stock_ouv_val: string;
  stock_clo_qte: string; stock_clo_val: string;
}

interface LigneNonVentile { pays_val: string; autres_val: string; hors_val: string; immo_val: string; stock_ouv_val: string; stock_clo_val: string; }

const emptyLigne = (): LigneProd => ({ designation: '', unite: '', pays_qte: '', pays_val: '', autres_qte: '', autres_val: '', hors_qte: '', hors_val: '', immo_qte: '', immo_val: '', stock_ouv_qte: '', stock_ouv_val: '', stock_clo_qte: '', stock_clo_val: '' });
const emptyNonVentile = (): LigneNonVentile => ({ pays_val: '', autres_val: '', hors_val: '', immo_val: '', stock_ouv_val: '', stock_clo_val: '' });

function Note32({ entiteName, entiteNif = '', entiteId, offre, onBack }: Note32Props): React.JSX.Element {
  const [exercices, setExercices] = useState<Exercice[]>([]); const [selectedExercice, setSelectedExercice] = useState<Exercice | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null); const [pdfBlob, setPdfBlob] = useState<Blob | null>(null);
  const [params, setParams] = useState<Record<string, string>>({}); const [editing, setEditing] = useState(false); const [saving, setSaving] = useState(false); const [saved, setSaved] = useState(false);
  const [lignes, setLignes] = useState<LigneProd[]>([emptyLigne(), emptyLigne(), emptyLigne(), emptyLigne(), emptyLigne(), emptyLigne(), emptyLigne(), emptyLigne(), emptyLigne(), emptyLigne()]);
  const [nonVentile, setNonVentile] = useState<LigneNonVentile>(emptyNonVentile());
  const pageRef = useRef<HTMLDivElement>(null);

  useEffect(() => { if (!entiteId) return; fetch('/api/entites/' + entiteId).then(r => r.json()).then(ent => { const d = ent.data || {}; setParams(d); if (d['note32_lignes']) { try { const p = JSON.parse(d['note32_lignes']); if (Array.isArray(p) && p.length > 0) setLignes(p); } catch { /* */ } } if (d['note32_nonventile']) { try { setNonVentile(JSON.parse(d['note32_nonventile'])); } catch { /* */ } } }).catch(() => {}); }, [entiteId]);
  useEffect(() => { if (!entiteId) return; fetch('/api/balance/exercices/' + entiteId).then(r => r.json()).then((d: Exercice[]) => { setExercices(d); if (d.length > 0) { const now = new Date(); const y = now.getFullYear(); const m = now.getMonth(); const py = m <= 2 ? y - 1 : y; setSelectedExercice(d.find(e => e.annee === py) || d.find(e => e.annee === y) || d.find(e => e.annee === y - 1) || d[0]); } }).catch(() => {}); }, [entiteId]);

  const handleSave = async () => { setSaving(true); try { const d: Record<string, string> = { ...params, note32_lignes: JSON.stringify(lignes), note32_nonventile: JSON.stringify(nonVentile) }; const r = await fetch(`/api/entites/${entiteId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ data: d }) }); if (r.ok) { setParams(d); setSaved(true); setEditing(false); setTimeout(() => setSaved(false), 3000); } } catch { /* */ } setSaving(false); };

  const duree = selectedExercice?.duree_mois || 12; const dateFin = selectedExercice?.date_fin ? new Date(selectedExercice.date_fin) : null; const annee = selectedExercice ? selectedExercice.annee : new Date().getFullYear();
  const fmtDateShort = (d: Date | null): string => { if (!d) return ''; return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' }); };
  const parseN = (v: string): number => { const n = parseFloat(v.replace(/\s/g, '').replace(',', '.')); return isNaN(n) ? 0 : n; };
  const fmtM = (v: number): string => v === 0 ? '' : Math.round(v).toLocaleString('fr-FR');

  const updateLigne = (idx: number, field: keyof LigneProd, value: string) => { setLignes(prev => prev.map((l, i) => i === idx ? { ...l, [field]: value } : l)); };

  // Totaux
  const valFields: (keyof LigneProd)[] = ['pays_val', 'autres_val', 'hors_val', 'immo_val', 'stock_ouv_val', 'stock_clo_val'];
  const totals: Record<string, number> = {};
  for (const f of valFields) { totals[f] = lignes.reduce((s, l) => s + parseN(l[f]), 0) + parseN(nonVentile[f.replace('pays_val', 'pays_val').replace('autres_val', 'autres_val') as keyof LigneNonVentile] || '0'); }

  const generatePDF = async (): Promise<jsPDF> => { const w = editing; if (w) setEditing(false); await new Promise(r => setTimeout(r, 100)); const pdf = new jsPDF('l', 'mm', 'a4'); if (!pageRef.current) return pdf; const c = await html2canvas(pageRef.current, { scale: 2, useCORS: true, backgroundColor: '#ffffff' }); pdf.addImage(c.toDataURL('image/png'), 'PNG', 0, 0, 297, Math.min((c.height * 297) / c.width, 210)); if (w) setEditing(true); return pdf; };
  const openPreview = async () => { const pdf = await generatePDF(); const blob = pdf.output('blob'); setPdfBlob(blob); setPreviewUrl(URL.createObjectURL(blob)); };
  const closePreview = () => { if (previewUrl) URL.revokeObjectURL(previewUrl); setPreviewUrl(null); setPdfBlob(null); };
  const downloadPDF = () => { if (!pdfBlob) return; const u = URL.createObjectURL(pdfBlob); const a = document.createElement('a'); a.href = u; a.download = 'Note32_' + annee + '.pdf'; a.click(); URL.revokeObjectURL(u); };
  const printPDF = () => { if (!previewUrl) return; const w = window.open(previewUrl); if (w) { w.onload = () => w.print(); } };

  const th: React.CSSProperties = { border: '0.5px solid #000', padding: '10px 14px', fontSize: 8, fontWeight: 700, textAlign: 'center', verticalAlign: 'middle', background: '#f5f5f5' };
  const td: React.CSSProperties = { border: '0.5px solid #000', padding: '10px 14px', fontSize: 9, verticalAlign: 'middle' };
  const tdR: React.CSSProperties = { ...td, textAlign: 'right', fontVariantNumeric: 'tabular-nums' };
  const tdB: React.CSSProperties = { ...td, fontWeight: 700, background: '#f0f0f0' };
  const tdBR: React.CSSProperties = { ...tdR, fontWeight: 700, background: '#f0f0f0' };
  const inp: React.CSSProperties = { width: '100%', padding: '5px 8px', fontSize: 9, border: '1px solid #D4A843', borderRadius: 2, background: '#fffbf0', textAlign: 'right', boxSizing: 'border-box' };
  const inpL: React.CSSProperties = { ...inp, textAlign: 'left' };

  const renderInput = (value: string, onChange: (v: string) => void, style = inp) => {
    if (!editing) return value;
    return <input value={value} onChange={e => onChange(e.target.value)} style={style} />;
  };

  return (
    <div>
      <div className="etat-toolbar">
        <button className="etat-back-btn" onClick={onBack}><LuArrowLeft size={18} /> Retour</button>
        <div className="etat-toolbar-title">Note 32 — Production de l'exercice</div>
        <div className="etat-toolbar-actions">
          <select className="etat-exercice-select" value={selectedExercice?.id || ''} onChange={e => { const ex = exercices.find(x => x.id === Number(e.target.value)); if (ex) setSelectedExercice(ex); }}>{exercices.map(ex => (<option key={ex.id} value={ex.id}>{ex.annee}</option>))}</select>
          {!editing ? (<button className="etat-action-btn" onClick={() => setEditing(true)} style={{ background: '#D4A843', color: '#fff', border: 'none' }}><LuPenLine size={16} /> Modifier</button>) : (<button className="etat-action-btn" onClick={handleSave} disabled={saving} style={{ background: '#059669', color: '#fff', border: 'none' }}><LuSave size={16} /> {saving ? 'Sauvegarde...' : 'Sauvegarder'}</button>)}
          <button className="etat-action-btn" onClick={openPreview}><LuEye size={16} /> Aperçu</button>
        </div>
      </div>
      {previewUrl && (<div className="etat-preview-overlay" onClick={closePreview}><div className="etat-preview-modal" onClick={e => e.stopPropagation()}><div className="etat-preview-header"><span>Aperçu — Note 32</span><div className="etat-preview-actions"><button onClick={printPDF} title="Imprimer"><LuPrinter size={18} /></button><button onClick={downloadPDF} title="Télécharger"><LuDownload size={18} /></button><button onClick={closePreview}><LuX size={18} /></button></div></div><iframe src={previewUrl} className="etat-preview-iframe" title="Aperçu Note 32" /></div></div>)}

      <div ref={pageRef} style={{ width: '297mm', minHeight: '210mm', background: '#fff', margin: '0 auto 20px', padding: '5mm 6mm', boxShadow: '0 2px 12px rgba(0,0,0,0.1)', boxSizing: 'border-box', fontFamily: "'Outfit', 'Segoe UI', Arial, sans-serif", fontSize: 9, color: '#1a1a1a' }}>
        <div className="etat-header-officiel"><div className="etat-header-grid"><div className="etat-header-row"><span className="etat-header-label">Désignation entité :</span><span className="etat-header-value">{entiteName || ''}</span><span className="etat-header-label">Exercice clos le :</span><span className="etat-header-value-right">{dateFin ? fmtDateShort(dateFin) : ''}</span></div><div className="etat-header-row"><span className="etat-header-label">Numéro d'identification :</span><span className="etat-header-value">{entiteNif || ''}</span><span className="etat-header-label">Durée (en mois) :</span><span className="etat-header-value-right">{duree}</span></div></div></div>
        <h3 style={{ textAlign: 'center', fontSize: 14, fontWeight: 700, margin: '30px 0 20px', textDecoration: 'underline' }}>
          NOTE 32 — PRODUCTION DE L'EXERCICE
        </h3>

        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={{ ...th, width: '12%' }} rowSpan={2}>Désignation du produit</th>
              <th style={{ ...th, width: '5%' }} rowSpan={2}>Unité de quantité choisie</th>
              <th style={th} colSpan={2}>Production vendue dans le pays</th>
              <th style={th} colSpan={2}>Production vendue dans les autres pays de l'OHADA</th>
              <th style={th} colSpan={2}>Production vendue hors OHADA</th>
              <th style={th} colSpan={2}>Production immobilisée</th>
              <th style={th} colSpan={2}>Stock ouverture de l'exercice</th>
              <th style={th} colSpan={2}>Stock clôture de l'exercice</th>
            </tr>
            <tr>
              <th style={th}>Quantité</th><th style={th}>Valeur</th>
              <th style={th}>Quantité</th><th style={th}>Valeur</th>
              <th style={th}>Quantité</th><th style={th}>Valeur</th>
              <th style={th}>Quantité</th><th style={th}>Valeur</th>
              <th style={th}>Quantité</th><th style={th}>Valeur</th>
              <th style={th}>Quantité</th><th style={th}>Valeur</th>
            </tr>
          </thead>
          <tbody>
            {lignes.map((l, i) => (
              <tr key={i}>
                <td style={td}>
                  {editing ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <input value={l.designation} onChange={e => updateLigne(i, 'designation', e.target.value)} style={inpL} />
                      <button onClick={() => setLignes(prev => prev.filter((_, j) => j !== i))} style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer', padding: 1, flexShrink: 0 }}><LuTrash2 size={10} /></button>
                    </div>
                  ) : l.designation}
                </td>
                <td style={{ ...td, textAlign: 'center' }}>{renderInput(l.unite, v => updateLigne(i, 'unite', v), { ...inp, textAlign: 'center', width: 40 })}</td>
                <td style={tdR}>{renderInput(l.pays_qte, v => updateLigne(i, 'pays_qte', v))}</td>
                <td style={tdR}>{renderInput(l.pays_val, v => updateLigne(i, 'pays_val', v))}</td>
                <td style={tdR}>{renderInput(l.autres_qte, v => updateLigne(i, 'autres_qte', v))}</td>
                <td style={tdR}>{renderInput(l.autres_val, v => updateLigne(i, 'autres_val', v))}</td>
                <td style={tdR}>{renderInput(l.hors_qte, v => updateLigne(i, 'hors_qte', v))}</td>
                <td style={tdR}>{renderInput(l.hors_val, v => updateLigne(i, 'hors_val', v))}</td>
                <td style={tdR}>{renderInput(l.immo_qte, v => updateLigne(i, 'immo_qte', v))}</td>
                <td style={tdR}>{renderInput(l.immo_val, v => updateLigne(i, 'immo_val', v))}</td>
                <td style={tdR}>{renderInput(l.stock_ouv_qte, v => updateLigne(i, 'stock_ouv_qte', v))}</td>
                <td style={tdR}>{renderInput(l.stock_ouv_val, v => updateLigne(i, 'stock_ouv_val', v))}</td>
                <td style={tdR}>{renderInput(l.stock_clo_qte, v => updateLigne(i, 'stock_clo_qte', v))}</td>
                <td style={tdR}>{renderInput(l.stock_clo_val, v => updateLigne(i, 'stock_clo_val', v))}</td>
              </tr>
            ))}
            {editing && (
              <tr className="no-print">
                <td colSpan={14} style={{ border: 'none', padding: '4px 0' }}>
                  <button onClick={() => setLignes(prev => [...prev, emptyLigne()])} style={{ background: '#D4A843', color: '#fff', border: 'none', borderRadius: 4, padding: '3px 10px', fontSize: 11, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}><LuPlus size={12} /> Ajouter un produit</button>
                </td>
              </tr>
            )}
            {/* NON VENTILE */}
            <tr>
              <td style={tdB} colSpan={2}>NON VENTILE</td>
              <td style={tdBR}></td>
              <td style={tdR}>{renderInput(nonVentile.pays_val, v => setNonVentile(p => ({ ...p, pays_val: v })))}</td>
              <td style={tdBR}></td>
              <td style={tdR}>{renderInput(nonVentile.autres_val, v => setNonVentile(p => ({ ...p, autres_val: v })))}</td>
              <td style={tdBR}></td>
              <td style={tdR}>{renderInput(nonVentile.hors_val, v => setNonVentile(p => ({ ...p, hors_val: v })))}</td>
              <td style={tdBR}></td>
              <td style={tdR}>{renderInput(nonVentile.immo_val, v => setNonVentile(p => ({ ...p, immo_val: v })))}</td>
              <td style={tdBR}></td>
              <td style={tdR}>{renderInput(nonVentile.stock_ouv_val, v => setNonVentile(p => ({ ...p, stock_ouv_val: v })))}</td>
              <td style={tdBR}></td>
              <td style={tdR}>{renderInput(nonVentile.stock_clo_val, v => setNonVentile(p => ({ ...p, stock_clo_val: v })))}</td>
            </tr>
            {/* TOTAL */}
            <tr>
              <td style={{ ...tdB, background: '#e8e8e8' }} colSpan={2}>TOTAL</td>
              <td style={{ ...tdBR, background: '#e8e8e8' }}></td>
              <td style={{ ...tdBR, background: '#e8e8e8' }}>{fmtM(totals.pays_val)}</td>
              <td style={{ ...tdBR, background: '#e8e8e8' }}></td>
              <td style={{ ...tdBR, background: '#e8e8e8' }}>{fmtM(totals.autres_val)}</td>
              <td style={{ ...tdBR, background: '#e8e8e8' }}></td>
              <td style={{ ...tdBR, background: '#e8e8e8' }}>{fmtM(totals.hors_val)}</td>
              <td style={{ ...tdBR, background: '#e8e8e8' }}></td>
              <td style={{ ...tdBR, background: '#e8e8e8' }}>{fmtM(totals.immo_val)}</td>
              <td style={{ ...tdBR, background: '#e8e8e8' }}></td>
              <td style={{ ...tdBR, background: '#e8e8e8' }}>{fmtM(totals.stock_ouv_val)}</td>
              <td style={{ ...tdBR, background: '#e8e8e8' }}></td>
              <td style={{ ...tdBR, background: '#e8e8e8' }}>{fmtM(totals.stock_clo_val)}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default Note32;
