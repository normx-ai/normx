import React, { useState, useRef, useEffect } from 'react';
import { LuDownload, LuArrowLeft, LuEye, LuX, LuPrinter, LuSave, LuPenLine } from 'react-icons/lu';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import '../BilanSYCEBNL.css';
import '../FicheIdentification.css';
import type { Exercice, EtatBaseProps } from '../../types';

interface Note27BProps extends EtatBaseProps { onGoToParametres?: () => void; }

interface LigneEffectif {
  ref: string;
  label: string;
  nat_m: string; nat_f: string;
  autres_m: string; autres_f: string;
  hors_m: string; hors_f: string;
  total_eff: string;
  ms_nat_m: string; ms_nat_f: string;
  ms_autres_m: string; ms_autres_f: string;
  ms_hors_m: string; ms_hors_f: string;
  ms_total: string;
}

const emptyLigne = (ref: string, label: string): LigneEffectif => ({
  ref, label,
  nat_m: '', nat_f: '', autres_m: '', autres_f: '', hors_m: '', hors_f: '', total_eff: '',
  ms_nat_m: '', ms_nat_f: '', ms_autres_m: '', ms_autres_f: '', ms_hors_m: '', ms_hors_f: '', ms_total: '',
});

const SECTION1 = [
  { ref: 'YA', label: '1. Cadres supérieurs' },
  { ref: 'YB', label: '2. Techniciens supérieurs et cadres moyens' },
  { ref: 'YC', label: '3. Techniciens, agents de maîtrise et ouvriers qualifiés' },
  { ref: 'YD', label: '4. Employés, manœuvres, ouvriers, et apprentis' },
  { ref: 'YE', label: 'TOTAL (1)' },
  { ref: 'YF', label: 'Permanents' },
  { ref: 'YG', label: 'Saisonniers' },
];

const SECTION2 = [
  { ref: 'YH', label: '1. Cadres supérieurs' },
  { ref: 'YI', label: '2. Techniciens supérieurs et cadres moyens' },
  { ref: 'YJ', label: '3. Techniciens, agents de maîtrise et ouvriers qualifiés' },
  { ref: 'YK', label: '4. Employés, manœuvres, ouvriers, et apprentis' },
  { ref: 'YL', label: 'TOTAL (2)' },
  { ref: 'YM', label: 'Permanents' },
  { ref: 'YN', label: 'Saisonniers' },
  { ref: 'YO', label: 'TOTAL (1 + 2)' },
];

function Note27B({ entiteName, entiteNif = '', entiteId, offre, onBack }: Note27BProps): React.JSX.Element {
  const [exercices, setExercices] = useState<Exercice[]>([]); const [selectedExercice, setSelectedExercice] = useState<Exercice | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null); const [pdfBlob, setPdfBlob] = useState<Blob | null>(null);
  const [params, setParams] = useState<Record<string, string>>({}); const [editing, setEditing] = useState(false); const [saving, setSaving] = useState(false); const [saved, setSaved] = useState(false);
  const [section1, setSection1] = useState<LigneEffectif[]>(SECTION1.map(s => emptyLigne(s.ref, s.label)));
  const [section2, setSection2] = useState<LigneEffectif[]>(SECTION2.map(s => emptyLigne(s.ref, s.label)));
  const [facturation, setFacturation] = useState('');
  const DEFAULT_COMMENTAIRE = `• Faire un commentaire si nécessaire en cas de mouvement significatif du personnel.`;
  const [commentaire, setCommentaire] = useState(DEFAULT_COMMENTAIRE);
  const pageRef = useRef<HTMLDivElement>(null);

  useEffect(() => { if (!entiteId) return; fetch('/api/entites/' + entiteId).then(r => r.json()).then(ent => { const d = ent.data || {}; setParams(d); setCommentaire(d['note27b_commentaire'] || DEFAULT_COMMENTAIRE); setFacturation(d['note27b_facturation'] || ''); if (d['note27b_section1']) { try { const p = JSON.parse(d['note27b_section1']); if (Array.isArray(p) && p.length > 0) setSection1(p); } catch { /* */ } } if (d['note27b_section2']) { try { const p = JSON.parse(d['note27b_section2']); if (Array.isArray(p) && p.length > 0) setSection2(p); } catch { /* */ } } }).catch(() => {}); }, [entiteId]);
  useEffect(() => { if (!entiteId) return; fetch('/api/balance/exercices/' + entiteId).then(r => r.json()).then((d: Exercice[]) => { setExercices(d); if (d.length > 0) { const now = new Date(); const y = now.getFullYear(); const m = now.getMonth(); const py = m <= 2 ? y - 1 : y; setSelectedExercice(d.find(e => e.annee === py) || d.find(e => e.annee === y) || d.find(e => e.annee === y - 1) || d[0]); } }).catch(() => {}); }, [entiteId]);

  const handleSave = async () => { setSaving(true); try { const d: Record<string, string> = { ...params, note27b_section1: JSON.stringify(section1), note27b_section2: JSON.stringify(section2), note27b_facturation: facturation, note27b_commentaire: commentaire }; const r = await fetch(`/api/entites/${entiteId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ data: d }) }); if (r.ok) { setParams(d); setSaved(true); setEditing(false); setTimeout(() => setSaved(false), 3000); } } catch { /* */ } setSaving(false); };

  const duree = selectedExercice?.duree_mois || 12; const dateFin = selectedExercice?.date_fin ? new Date(selectedExercice.date_fin) : null; const annee = selectedExercice ? selectedExercice.annee : new Date().getFullYear();
  const fmtDateShort = (d: Date | null): string => { if (!d) return ''; return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' }); };

  const updateLigne = (setter: React.Dispatch<React.SetStateAction<LigneEffectif[]>>, idx: number, field: keyof LigneEffectif, value: string) => {
    setter(prev => prev.map((l, i) => i === idx ? { ...l, [field]: value } : l));
  };

  const generatePDF = async (): Promise<jsPDF> => { const w = editing; if (w) setEditing(false); await new Promise(r => setTimeout(r, 100)); const pdf = new jsPDF('l', 'mm', 'a4'); if (!pageRef.current) return pdf; const c = await html2canvas(pageRef.current, { scale: 2, useCORS: true, backgroundColor: '#ffffff' }); pdf.addImage(c.toDataURL('image/png'), 'PNG', 0, 0, 297, Math.min((c.height * 297) / c.width, 210)); if (w) setEditing(true); return pdf; };
  const openPreview = async () => { const pdf = await generatePDF(); const blob = pdf.output('blob'); setPdfBlob(blob); setPreviewUrl(URL.createObjectURL(blob)); };
  const closePreview = () => { if (previewUrl) URL.revokeObjectURL(previewUrl); setPreviewUrl(null); setPdfBlob(null); };
  const downloadPDF = () => { if (!pdfBlob) return; const u = URL.createObjectURL(pdfBlob); const a = document.createElement('a'); a.href = u; a.download = 'Note27B_' + annee + '.pdf'; a.click(); URL.revokeObjectURL(u); };
  const printPDF = () => { if (!previewUrl) return; const w = window.open(previewUrl); if (w) { w.onload = () => w.print(); } };

  const th: React.CSSProperties = { border: '0.5px solid #000', padding: '5px 8px', fontSize: 9, fontWeight: 700, textAlign: 'center', verticalAlign: 'middle', background: '#f5f5f5' };
  const td: React.CSSProperties = { border: '0.5px solid #000', padding: '5px 8px', fontSize: 9, verticalAlign: 'middle', textAlign: 'center' };
  const tdL: React.CSSProperties = { ...td, textAlign: 'left', fontSize: 10 };
  const inp: React.CSSProperties = { width: 28, padding: '5px 8px', fontSize: 9, border: '1px solid #D4A843', borderRadius: 2, background: '#fffbf0', textAlign: 'center', boxSizing: 'border-box' };
  const textareaStyle: React.CSSProperties = { width: '100%', minHeight: 30, padding: '6px 10px', fontSize: 12, lineHeight: '1.5', border: '1px solid #D4A843', borderRadius: 3, background: '#fffbf0', fontFamily: 'inherit', boxSizing: 'border-box', resize: 'vertical' };

  const renderInput = (value: string, onChange: (v: string) => void) => {
    if (!editing) return value;
    return <input value={value} onChange={e => onChange(e.target.value)} style={inp} />;
  };

  const FIELDS_EFF: (keyof LigneEffectif)[] = ['nat_m', 'nat_f', 'autres_m', 'autres_f', 'hors_m', 'hors_f', 'total_eff'];
  const FIELDS_MS: (keyof LigneEffectif)[] = ['ms_nat_m', 'ms_nat_f', 'ms_autres_m', 'ms_autres_f', 'ms_hors_m', 'ms_hors_f', 'ms_total'];

  const renderSection = (lignes: LigneEffectif[], setter: React.Dispatch<React.SetStateAction<LigneEffectif[]>>, title: string, showFacturation = false) => (
    <>
      {title && <tr><td colSpan={16} style={{ ...th, fontSize: 11, textAlign: 'left', padding: '6px 8px' }}>{title}</td></tr>}
      {lignes.map((l, i) => {
        const isBold = l.label.startsWith('TOTAL');
        const st = isBold ? { ...tdL, fontWeight: 700, background: '#f0f0f0' } : tdL;
        const stC = isBold ? { ...td, fontWeight: 700, background: '#f0f0f0' } : td;
        return (
          <tr key={l.ref}>
            <td style={stC}>{l.ref}</td>
            <td style={st}>{l.label}</td>
            {FIELDS_EFF.map(f => <td key={f} style={stC}>{renderInput(l[f], v => updateLigne(setter, i, f, v))}</td>)}
            {FIELDS_MS.map(f => <td key={f} style={stC}>{renderInput(l[f], v => updateLigne(setter, i, f, v))}</td>)}
            {showFacturation && i === 0 && <td rowSpan={lignes.length} style={{ ...td, verticalAlign: 'top' }}>{editing ? <input value={facturation} onChange={e => setFacturation(e.target.value)} style={{ ...inp, width: 50 }} /> : facturation}</td>}
          </tr>
        );
      })}
    </>
  );

  return (
    <div>
      <div className="etat-toolbar">
        <button className="etat-back-btn" onClick={onBack}><LuArrowLeft size={18} /> Retour</button>
        <div className="etat-toolbar-title">Note 27B — Effectifs, masse salariale et personnel extérieur</div>
        <div className="etat-toolbar-actions">
          <select className="etat-exercice-select" value={selectedExercice?.id || ''} onChange={e => { const ex = exercices.find(x => x.id === Number(e.target.value)); if (ex) setSelectedExercice(ex); }}>{exercices.map(ex => (<option key={ex.id} value={ex.id}>{ex.annee}</option>))}</select>
          {!editing ? (<button className="etat-action-btn" onClick={() => setEditing(true)} style={{ background: '#D4A843', color: '#fff', border: 'none' }}><LuPenLine size={16} /> Modifier</button>) : (<button className="etat-action-btn" onClick={handleSave} disabled={saving} style={{ background: '#059669', color: '#fff', border: 'none' }}><LuSave size={16} /> {saving ? 'Sauvegarde...' : 'Sauvegarder'}</button>)}
          <button className="etat-action-btn" onClick={openPreview}><LuEye size={16} /> Aperçu</button>
        </div>
      </div>
      {previewUrl && (<div className="etat-preview-overlay" onClick={closePreview}><div className="etat-preview-modal" onClick={e => e.stopPropagation()}><div className="etat-preview-header"><span>Aperçu — Note 27B</span><div className="etat-preview-actions"><button onClick={printPDF} title="Imprimer"><LuPrinter size={18} /></button><button onClick={downloadPDF} title="Télécharger"><LuDownload size={18} /></button><button onClick={closePreview}><LuX size={18} /></button></div></div><iframe src={previewUrl} className="etat-preview-iframe" title="Aperçu Note 27B" /></div></div>)}

      <div ref={pageRef} style={{ width: '297mm', minHeight: '210mm', background: '#fff', margin: '0 auto 20px', padding: '5mm 6mm', boxShadow: '0 2px 12px rgba(0,0,0,0.1)', boxSizing: 'border-box', fontFamily: "'Outfit', 'Segoe UI', Arial, sans-serif", fontSize: 10, color: '#1a1a1a' }}>
        <div className="etat-header-officiel"><div className="etat-header-grid"><div className="etat-header-row"><span className="etat-header-label">Désignation entité :</span><span className="etat-header-value">{entiteName || ''}</span><span className="etat-header-label">Exercice clos le :</span><span className="etat-header-value-right">{dateFin ? fmtDateShort(dateFin) : ''}</span></div><div className="etat-header-row"><span className="etat-header-label">Numéro d'identification :</span><span className="etat-header-value">{entiteNif || ''}</span><span className="etat-header-label">Durée (en mois) :</span><span className="etat-header-value-right">{duree}</span></div></div></div>
        <h3 style={{ textAlign: 'center', fontSize: 14, fontWeight: 700, margin: '30px 0 20px', textDecoration: 'underline' }}>
          NOTE 27B — EFFECTIFS, MASSE SALARIALE ET PERSONNEL EXTERIEUR
        </h3>

        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 0 }}>
          <thead>
            <tr>
              <th style={th} rowSpan={3}></th>
              <th style={{ ...th, width: '22%' }} rowSpan={3}>EFFECTIF ET MASSE SALARIALE<br /><br />QUALIFICATIONS</th>
              <th style={th} colSpan={7}>EFFECTIFS</th>
              <th style={th} colSpan={7}>MASSE SALARIALE</th>
            </tr>
            <tr>
              <th style={th} colSpan={2}>Nationaux</th>
              <th style={th} colSpan={2}>Autres États de l'OHADA</th>
              <th style={th} colSpan={2}>Hors OHADA</th>
              <th style={th} rowSpan={2}>TOTAL</th>
              <th style={th} colSpan={2}>Nationaux</th>
              <th style={th} colSpan={2}>Autres États de l'OHADA</th>
              <th style={th} colSpan={2}>Hors OHADA</th>
              <th style={th} rowSpan={2}>TOTAL</th>
            </tr>
            <tr>
              <th style={th}>M</th><th style={th}>F</th>
              <th style={th}>M</th><th style={th}>F</th>
              <th style={th}>M</th><th style={th}>F</th>
              <th style={th}>M</th><th style={th}>F</th>
              <th style={th}>M</th><th style={th}>F</th>
              <th style={th}>M</th><th style={th}>F</th>
            </tr>
          </thead>
          <tbody>
            {renderSection(section1, setSection1, '')}
            {renderSection(section2, setSection2, '2. Personnel extérieur', true)}
          </tbody>
        </table>

        <p style={{ fontSize: 9, margin: '4px 0', color: '#666' }}>M : Masculin &nbsp;&nbsp; F : Féminin</p>

        <div style={{ border: '0.5px solid #000', padding: '8px 10px', marginTop: 8 }}>
          <p style={{ fontSize: 11, fontWeight: 700, marginBottom: 4, marginTop: 0 }}>Commentaire :</p>
          {editing ? <textarea value={commentaire} onChange={e => setCommentaire(e.target.value)} style={textareaStyle} /> : <div style={{ fontSize: 12, lineHeight: 1.5, whiteSpace: 'pre-wrap', minHeight: 20 }}>{commentaire}</div>}
        </div>
      </div>
    </div>
  );
}

export default Note27B;
