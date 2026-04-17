import React, { useState, useRef, useEffect } from 'react';
import { clientFetch } from '../lib/api';
import { useExercicesQuery } from '../hooks/useExercicesQuery';
import { LuDownload, LuArrowLeft, LuEye, LuX, LuPrinter, LuSave, LuPenLine, LuPlus, LuTrash2 } from 'react-icons/lu';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import type { Exercice, EtatBaseProps } from '../types';
import './BilanSYCEBNL.css';
import './FicheIdentification.css';

interface LigneJT {
  date: string; libelle: string; recettes: string; depenses: string;
  v_ventes: string; v_autres_rec: string;
  v_materiel: string; v_achats_march: string; v_achats_mat: string;
  v_loyers: string; v_salaires: string; v_impots: string; v_autres_dep: string;
}

const emptyLigne = (): LigneJT => ({
  date: '', libelle: '', recettes: '', depenses: '',
  v_ventes: '', v_autres_rec: '',
  v_materiel: '', v_achats_march: '', v_achats_mat: '',
  v_loyers: '', v_salaires: '', v_impots: '', v_autres_dep: '',
});

const MOIS = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];

function JournalTresorerieSMT({ entiteName, entiteNif = '', entiteId, offre, onBack }: EtatBaseProps): React.JSX.Element {
  const { exercices, selectedExercice, setSelectedExercice } = useExercicesQuery(entiteId);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null); const [pdfBlob, setPdfBlob] = useState<Blob | null>(null);
  const [params, setParams] = useState<Record<string, string>>({}); const [editing, setEditing] = useState(false); const [saving, setSaving] = useState(false);
  const [selectedMois, setSelectedMois] = useState(new Date().getMonth());
  const [reportNouveau, setReportNouveau] = useState('');
  const [lignes, setLignes] = useState<LigneJT[]>(Array.from({ length: 15 }, emptyLigne));
  const pageRef = useRef<HTMLDivElement>(null);

  const annee = selectedExercice ? selectedExercice.annee : new Date().getFullYear();
  const dataKey = `smt_jt_${annee}_${selectedMois}`;
  const reportKey = `smt_jt_report_${annee}_${selectedMois}`;

  useEffect(() => { if (!entiteId) return; clientFetch('/api/entites/' + entiteId).then(r => r.json()).then(ent => { const d = ent.data || {}; setParams(d); if (d[dataKey]) { try { const p = JSON.parse(d[dataKey]); if (Array.isArray(p) && p.length > 0) setLignes(p); else setLignes(Array.from({ length: 15 }, emptyLigne)); } catch { setLignes(Array.from({ length: 15 }, emptyLigne)); } } else { setLignes(Array.from({ length: 15 }, emptyLigne)); } setReportNouveau(d[reportKey] || ''); }).catch(() => {}); }, [entiteId, dataKey, reportKey]);

  // Reload data when month/year changes
  useEffect(() => {
    if (!entiteId) return;
    clientFetch('/api/entites/' + entiteId).then(r => r.json()).then(ent => {
      const d = ent.data || {}; setParams(d);
      if (d[dataKey]) { try { const p = JSON.parse(d[dataKey]); if (Array.isArray(p) && p.length > 0) setLignes(p); else setLignes(Array.from({ length: 15 }, emptyLigne)); } catch { setLignes(Array.from({ length: 15 }, emptyLigne)); } } else { setLignes(Array.from({ length: 15 }, emptyLigne)); }
      setReportNouveau(d[reportKey] || '');
    }).catch(() => {});
  }, [selectedMois, annee, entiteId, dataKey, reportKey]);

  const handleSave = async () => { setSaving(true); try { const d: Record<string, string> = { ...params, [dataKey]: JSON.stringify(lignes), [reportKey]: reportNouveau }; const r = await clientFetch(`/api/entites/${entiteId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ data: d }) }); if (r.ok) { setParams(d); setEditing(false); } } catch { /* */ } setSaving(false); };

  const parseN = (v: string): number => { const n = parseFloat(v.replace(/\s/g, '').replace(',', '.')); return isNaN(n) ? 0 : n; };
  const fmtM = (v: number): string => v === 0 ? '' : Math.round(v).toLocaleString('fr-FR');

  // Calcul solde cumulé
  let soldeRunning = parseN(reportNouveau);
  const soldes: number[] = lignes.map(l => {
    soldeRunning += parseN(l.recettes) - parseN(l.depenses);
    return soldeRunning;
  });
  const soldeReporter = soldes.length > 0 ? soldes[soldes.length - 1] : parseN(reportNouveau);

  const duree = selectedExercice?.duree_mois || 12;
  const dateFin = selectedExercice?.date_fin ? new Date(selectedExercice.date_fin) : null;
  const fmtDate = (d: Date | null): string => d ? d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '';

  const generatePDF = async (): Promise<jsPDF> => {
    const w = editing; if (w) setEditing(false); await new Promise(r => setTimeout(r, 100));
    const pdf = new jsPDF('l', 'mm', 'a4');
    if (pageRef.current) { const c = await html2canvas(pageRef.current, { scale: 2, useCORS: true, backgroundColor: '#fff' }); pdf.addImage(c.toDataURL('image/png'), 'PNG', 0, 0, 297, Math.min((c.height * 297) / c.width, 210)); }
    if (w) setEditing(true); return pdf;
  };
  const openPreview = async () => { const pdf = await generatePDF(); const blob = pdf.output('blob'); setPdfBlob(blob); setPreviewUrl(URL.createObjectURL(blob)); };
  const closePreview = () => { if (previewUrl) URL.revokeObjectURL(previewUrl); setPreviewUrl(null); setPdfBlob(null); };
  const downloadPDF = () => { if (!pdfBlob) return; const u = URL.createObjectURL(pdfBlob); const a = document.createElement('a'); a.href = u; a.download = `Journal_Tresorerie_SMT_${MOIS[selectedMois]}_${annee}.pdf`; a.click(); URL.revokeObjectURL(u); };
  const printPDF = () => { if (!previewUrl) return; const w = window.open(previewUrl); if (w) { w.onload = () => w.print(); } };

  const th: React.CSSProperties = { border: '1px solid #000', padding: '4px 3px', fontSize: 7.5, fontWeight: 700, textAlign: 'center', verticalAlign: 'middle', background: '#e8e8e8' };
  const td: React.CSSProperties = { border: '1px solid #000', padding: '3px 4px', fontSize: 7.5, verticalAlign: 'middle' };
  const tdR: React.CSSProperties = { ...td, textAlign: 'right', fontVariantNumeric: 'tabular-nums' };
  const tdB: React.CSSProperties = { ...td, fontWeight: 700, background: '#f0f0f0' };
  const tdBR: React.CSSProperties = { ...tdR, fontWeight: 700, background: '#f0f0f0' };
  const inp: React.CSSProperties = { width: '100%', padding: '2px 3px', fontSize: 7.5, border: '1px solid #D4A843', borderRadius: 1, background: '#fffbf0', boxSizing: 'border-box' };
  const inpR: React.CSSProperties = { ...inp, textAlign: 'right' };

  const renderInput = (value: string, onChange: (v: string) => void, style = inp) => editing ? <input value={value} onChange={e => onChange(e.target.value)} style={style} /> : value;

  const updateLigne = (idx: number, field: keyof LigneJT, value: string) => setLignes(prev => prev.map((l, i) => i === idx ? { ...l, [field]: value } : l));

  return (
    <div>
      <div className="etat-toolbar">
        <button className="etat-back-btn" onClick={onBack}><LuArrowLeft size={18} /> Retour</button>
        <div className="etat-toolbar-title">Journal de trésorerie SMT</div>
        <div className="etat-toolbar-actions">
          <select className="etat-exercice-select" value={selectedExercice?.id || ''} onChange={e => { const ex = exercices.find(x => x.id === Number(e.target.value)); if (ex) setSelectedExercice(ex); }}>{exercices.map(ex => (<option key={ex.id} value={ex.id}>{ex.annee}</option>))}</select>
          <select value={selectedMois} onChange={e => setSelectedMois(Number(e.target.value))} style={{ padding: '6px 10px', fontSize: 13, borderRadius: 6, border: '1px solid #d1d5db' }}>{MOIS.map((m, i) => (<option key={i} value={i}>{m}</option>))}</select>
          {!editing ? (<button className="etat-action-btn" onClick={() => setEditing(true)} style={{ background: '#D4A843', color: '#fff', border: 'none' }}><LuPenLine size={16} /> Modifier</button>) : (<button className="etat-action-btn" onClick={handleSave} disabled={saving} style={{ background: '#059669', color: '#fff', border: 'none' }}><LuSave size={16} /> {saving ? 'Sauvegarde...' : 'Sauvegarder'}</button>)}
          <button className="etat-action-btn" onClick={openPreview}><LuEye size={16} /> Aperçu</button>
        </div>
      </div>
      {previewUrl && (<div className="etat-preview-overlay" onClick={closePreview}><div className="etat-preview-modal" onClick={e => e.stopPropagation()}><div className="etat-preview-header"><span>Aperçu — Journal trésorerie SMT</span><div className="etat-preview-actions"><button onClick={printPDF} title="Imprimer"><LuPrinter size={18} /></button><button onClick={downloadPDF} title="Télécharger"><LuDownload size={18} /></button><button onClick={closePreview}><LuX size={18} /></button></div></div><iframe src={previewUrl} className="etat-preview-iframe" title="Aperçu Journal trésorerie SMT" /></div></div>)}

      <div ref={pageRef} style={{ width: '297mm', minHeight: '210mm', background: '#fff', margin: '0 auto 20px', padding: '5mm 5mm', boxShadow: '0 2px 12px rgba(0,0,0,0.1)', boxSizing: 'border-box', fontFamily: "'Inter', 'Segoe UI', Arial, sans-serif", fontSize: 8, color: '#1a1a1a' }}>
        {/* En-tête */}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: 8 }}>
          <div><strong>Désignation entité :</strong> {entiteName}<br/><strong>Numéro d'identification :</strong> {entiteNif}</div>
          <div style={{ textAlign: 'right' }}><strong>Exercice clos le :</strong> {fmtDate(dateFin)}<br/><strong>Durée (en mois) :</strong> {duree}</div>
        </div>
        <div style={{ textAlign: 'center', fontWeight: 700, fontSize: 11, marginBottom: 6 }}>JOURNAL DE TRESORERIE SMT MOIS DE {MOIS[selectedMois].toUpperCase()} {annee}</div>

        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={{ ...th, width: '5%' }} rowSpan={2}>Date</th>
              <th style={{ ...th, width: '11%' }} rowSpan={2}>Libellé</th>
              <th style={{ ...th, width: '7%' }} rowSpan={2}>Recettes</th>
              <th style={{ ...th, width: '7%' }} rowSpan={2}>Dépenses</th>
              <th style={{ ...th, width: '7%' }} rowSpan={2}>Solde</th>
              <th style={th} colSpan={2}>Ventilation recette</th>
              <th style={th} colSpan={7}>Ventilation dépenses</th>
            </tr>
            <tr>
              <th style={{ ...th, width: '6%' }}>Ventes</th>
              <th style={{ ...th, width: '6%' }}>Autres</th>
              <th style={{ ...th, width: '6%' }}>Matériel et Mobilier</th>
              <th style={{ ...th, width: '6%' }}>Achats marchandises</th>
              <th style={{ ...th, width: '7%' }}>Achats matières et fournitures</th>
              <th style={{ ...th, width: '5%' }}>Loyers</th>
              <th style={{ ...th, width: '6%' }}>Salaires</th>
              <th style={{ ...th, width: '6%' }}>Impôts et Taxes</th>
              <th style={{ ...th, width: '5%' }}>Autres</th>
            </tr>
          </thead>
          <tbody>
            {/* Report à nouveau */}
            <tr>
              <td style={td}></td>
              <td style={tdB}>report à nouveau</td>
              <td style={tdR}></td>
              <td style={tdR}></td>
              <td style={tdBR}>{editing ? <input value={reportNouveau} onChange={e => setReportNouveau(e.target.value)} style={inpR} /> : (reportNouveau ? fmtM(parseN(reportNouveau)) : '')}</td>
              <td style={td}></td><td style={td}></td>
              <td style={td}></td><td style={td}></td><td style={td}></td><td style={td}></td><td style={td}></td><td style={td}></td><td style={td}></td>
            </tr>
            {/* Lignes */}
            {lignes.map((l, i) => (
              <tr key={i}>
                <td style={td}>{renderInput(l.date, v => updateLigne(i, 'date', v))}</td>
                <td style={td}>{editing ? <div style={{ display: 'flex', alignItems: 'center', gap: 1 }}><input value={l.libelle} onChange={e => updateLigne(i, 'libelle', e.target.value)} style={inp} />{lignes.length > 1 && <button onClick={() => setLignes(p => p.filter((_, j) => j !== i))} style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer', padding: 0, flexShrink: 0 }}><LuTrash2 size={8} /></button>}</div> : l.libelle}</td>
                <td style={tdR}>{renderInput(l.recettes, v => updateLigne(i, 'recettes', v), inpR)}</td>
                <td style={tdR}>{renderInput(l.depenses, v => updateLigne(i, 'depenses', v), inpR)}</td>
                <td style={tdBR}>{fmtM(soldes[i])}</td>
                <td style={tdR}>{renderInput(l.v_ventes, v => updateLigne(i, 'v_ventes', v), inpR)}</td>
                <td style={tdR}>{renderInput(l.v_autres_rec, v => updateLigne(i, 'v_autres_rec', v), inpR)}</td>
                <td style={tdR}>{renderInput(l.v_materiel, v => updateLigne(i, 'v_materiel', v), inpR)}</td>
                <td style={tdR}>{renderInput(l.v_achats_march, v => updateLigne(i, 'v_achats_march', v), inpR)}</td>
                <td style={tdR}>{renderInput(l.v_achats_mat, v => updateLigne(i, 'v_achats_mat', v), inpR)}</td>
                <td style={tdR}>{renderInput(l.v_loyers, v => updateLigne(i, 'v_loyers', v), inpR)}</td>
                <td style={tdR}>{renderInput(l.v_salaires, v => updateLigne(i, 'v_salaires', v), inpR)}</td>
                <td style={tdR}>{renderInput(l.v_impots, v => updateLigne(i, 'v_impots', v), inpR)}</td>
                <td style={tdR}>{renderInput(l.v_autres_dep, v => updateLigne(i, 'v_autres_dep', v), inpR)}</td>
              </tr>
            ))}
            {editing && (
              <tr className="no-print"><td colSpan={14} style={{ border: 'none', padding: '3px 0' }}><button onClick={() => setLignes(p => [...p, emptyLigne()])} style={{ background: '#D4A843', color: '#fff', border: 'none', borderRadius: 4, padding: '2px 10px', fontSize: 9, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}><LuPlus size={10} /> Ajouter</button></td></tr>
            )}
            {/* Solde à reporter */}
            <tr>
              <td style={td}></td>
              <td style={tdB}>Solde à reporter</td>
              <td style={tdR}></td>
              <td style={tdR}></td>
              <td style={tdBR}>{fmtM(soldeReporter)}</td>
              <td style={td}></td><td style={td}></td>
              <td style={td}></td><td style={td}></td><td style={td}></td><td style={td}></td><td style={td}></td><td style={td}></td><td style={td}></td>
            </tr>
          </tbody>
        </table>

        <div style={{ fontSize: 7, marginTop: 6, color: '#555', fontStyle: 'italic', lineHeight: 1.5 }}>
          NB : prévoir un journal par banque et un journal pour la caisse. Les colonnes « ventilation recettes et dépenses » peuvent être complétées en cas de besoin par des rajouts notamment « compte exploitant ».
        </div>
      </div>
    </div>
  );
}

export default JournalTresorerieSMT;
