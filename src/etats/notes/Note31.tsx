import React, { useState, useRef, useEffect } from 'react';
import { LuDownload, LuArrowLeft, LuEye, LuX, LuPrinter, LuSave, LuPenLine } from 'react-icons/lu';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import '../BilanSYCEBNL.css';
import '../FicheIdentification.css';
import type { Exercice, EtatBaseProps } from '../../types';

interface Note31Props extends EtatBaseProps { onGoToParametres?: () => void; }

const SECTIONS: { label: string; bold?: boolean }[] = [
  { label: 'STRUCTURE DU CAPITAL A LA CLOTURE DE L\'EXERCICE (²)', bold: true },
  { label: 'Capital social' },
  { label: 'Actions ordinaires' },
  { label: 'Actions à dividendes prioritaires (A.D.P) sans droit de vote' },
  { label: 'Actions nouvelles à émettre :' },
  { label: '  - par conversion d\'obligations' },
  { label: '  - par exercice de droits de souscription' },
  { label: 'OPERATIONS ET RESULTATS DE L\'EXERCICE (³)', bold: true },
  { label: 'Chiffre d\'affaires hors taxes' },
  { label: 'Résultat des activités ordinaires (R.A.O) hors dotations et reprises (exploitation et financières)' },
  { label: 'Participation des travailleurs aux bénéfices' },
  { label: 'Impôt sur le résultat' },
  { label: 'Résultat net (⁴)' },
  { label: 'RESULTAT ET DIVIDENDE DISTRIBUES', bold: true },
  { label: 'Résultat distribué (⁵)' },
  { label: 'Dividende attribué à chaque action' },
  { label: 'PERSONNEL ET POLITIQUE SALARIALE', bold: true },
  { label: 'Effectif moyen des travailleurs au cours de l\'exercice (⁶)' },
  { label: 'Effectif moyen de personnel extérieur' },
  { label: 'Masse salariale distribuée au cours de l\'exercice (⁷)' },
  { label: 'Avantages sociaux versés au cours de l\'exercice (⁸) [Sécurité sociale, œuvres sociales]' },
  { label: 'Personnel extérieur facturé à l\'entité (9)' },
];

function Note31({ entiteName, entiteNif = '', entiteId, offre, onBack }: Note31Props): React.JSX.Element {
  const [exercices, setExercices] = useState<Exercice[]>([]); const [selectedExercice, setSelectedExercice] = useState<Exercice | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null); const [pdfBlob, setPdfBlob] = useState<Blob | null>(null);
  const [params, setParams] = useState<Record<string, string>>({}); const [editing, setEditing] = useState(false); const [saving, setSaving] = useState(false); const [saved, setSaved] = useState(false);
  const [data, setData] = useState<Record<string, string>>({});
  const pageRef = useRef<HTMLDivElement>(null);

  const getVal = (row: number, col: number): string => data[`r${row}_c${col}`] || '';
  const setVal = (row: number, col: number, value: string) => setData(prev => ({ ...prev, [`r${row}_c${col}`]: value }));

  useEffect(() => { if (!entiteId) return; fetch('/api/entites/' + entiteId).then(r => r.json()).then(ent => { const d = ent.data || {}; setParams(d); if (d['note31_data']) { try { setData(JSON.parse(d['note31_data'])); } catch { /* */ } } }).catch(() => {}); }, [entiteId]);
  useEffect(() => { if (!entiteId) return; fetch('/api/balance/exercices/' + entiteId).then(r => r.json()).then((d: Exercice[]) => { setExercices(d); if (d.length > 0) { const now = new Date(); const y = now.getFullYear(); const m = now.getMonth(); const py = m <= 2 ? y - 1 : y; setSelectedExercice(d.find(e => e.annee === py) || d.find(e => e.annee === y) || d.find(e => e.annee === y - 1) || d[0]); } }).catch(() => {}); }, [entiteId]);

  const handleSave = async () => { setSaving(true); try { const d: Record<string, string> = { ...params, note31_data: JSON.stringify(data) }; const r = await fetch(`/api/entites/${entiteId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ data: d }) }); if (r.ok) { setParams(d); setSaved(true); setEditing(false); setTimeout(() => setSaved(false), 3000); } } catch { /* */ } setSaving(false); };

  const duree = selectedExercice?.duree_mois || 12; const dateFin = selectedExercice?.date_fin ? new Date(selectedExercice.date_fin) : null; const annee = selectedExercice ? selectedExercice.annee : new Date().getFullYear();
  const fmtDateShort = (d: Date | null): string => { if (!d) return ''; return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' }); };

  const generatePDF = async (): Promise<jsPDF> => { const w = editing; if (w) setEditing(false); await new Promise(r => setTimeout(r, 100)); const pdf = new jsPDF('p', 'mm', 'a4'); if (!pageRef.current) return pdf; const c = await html2canvas(pageRef.current, { scale: 2, useCORS: true, backgroundColor: '#ffffff' }); pdf.addImage(c.toDataURL('image/png'), 'PNG', 0, 0, 210, Math.min((c.height * 210) / c.width, 297)); if (w) setEditing(true); return pdf; };
  const openPreview = async () => { const pdf = await generatePDF(); const blob = pdf.output('blob'); setPdfBlob(blob); setPreviewUrl(URL.createObjectURL(blob)); };
  const closePreview = () => { if (previewUrl) URL.revokeObjectURL(previewUrl); setPreviewUrl(null); setPdfBlob(null); };
  const downloadPDF = () => { if (!pdfBlob) return; const u = URL.createObjectURL(pdfBlob); const a = document.createElement('a'); a.href = u; a.download = 'Note31_' + annee + '.pdf'; a.click(); URL.revokeObjectURL(u); };
  const printPDF = () => { if (!previewUrl) return; const w = window.open(previewUrl); if (w) { w.onload = () => w.print(); } };

  const th: React.CSSProperties = { border: '0.5px solid #000', padding: '10px 14px', fontSize: 12, fontWeight: 700, textAlign: 'center', verticalAlign: 'middle', background: '#f5f5f5' };
  const td: React.CSSProperties = { border: '0.5px solid #000', padding: '10px 14px', fontSize: 11, verticalAlign: 'middle' };
  const tdR: React.CSSProperties = { ...td, textAlign: 'right', fontVariantNumeric: 'tabular-nums' };
  const tdB: React.CSSProperties = { ...td, fontWeight: 700, background: '#f0f0f0' };
  const inp: React.CSSProperties = { width: '100%', padding: '5px 8px', fontSize: 11, border: '1px solid #D4A843', borderRadius: 2, background: '#fffbf0', textAlign: 'right', boxSizing: 'border-box' };

  const COLS = ['N', 'N-1', 'N-2', 'N-3', 'N-4'];

  return (
    <div>
      <div className="etat-toolbar">
        <button className="etat-back-btn" onClick={onBack}><LuArrowLeft size={18} /> Retour</button>
        <div className="etat-toolbar-title">Note 31 — Répartition du résultat des cinq derniers exercices</div>
        <div className="etat-toolbar-actions">
          <select className="etat-exercice-select" value={selectedExercice?.id || ''} onChange={e => { const ex = exercices.find(x => x.id === Number(e.target.value)); if (ex) setSelectedExercice(ex); }}>{exercices.map(ex => (<option key={ex.id} value={ex.id}>{ex.annee}</option>))}</select>
          {!editing ? (<button className="etat-action-btn" onClick={() => setEditing(true)} style={{ background: '#D4A843', color: '#fff', border: 'none' }}><LuPenLine size={16} /> Modifier</button>) : (<button className="etat-action-btn" onClick={handleSave} disabled={saving} style={{ background: '#059669', color: '#fff', border: 'none' }}><LuSave size={16} /> {saving ? 'Sauvegarde...' : 'Sauvegarder'}</button>)}
          <button className="etat-action-btn" onClick={openPreview}><LuEye size={16} /> Aperçu</button>
        </div>
      </div>
      {previewUrl && (<div className="etat-preview-overlay" onClick={closePreview}><div className="etat-preview-modal" onClick={e => e.stopPropagation()}><div className="etat-preview-header"><span>Aperçu — Note 31</span><div className="etat-preview-actions"><button onClick={printPDF} title="Imprimer"><LuPrinter size={18} /></button><button onClick={downloadPDF} title="Télécharger"><LuDownload size={18} /></button><button onClick={closePreview}><LuX size={18} /></button></div></div><iframe src={previewUrl} className="etat-preview-iframe" title="Aperçu Note 31" /></div></div>)}

      <div ref={pageRef} style={{ width: '210mm', minHeight: '297mm', background: '#fff', margin: '0 auto 20px', padding: '6mm 10mm', boxShadow: '0 2px 12px rgba(0,0,0,0.1)', boxSizing: 'border-box', fontFamily: "'Outfit', 'Segoe UI', Arial, sans-serif", fontSize: 11, color: '#1a1a1a' }}>
        <div className="etat-header-officiel"><div className="etat-header-grid"><div className="etat-header-row"><span className="etat-header-label">Désignation entité :</span><span className="etat-header-value">{entiteName || ''}</span><span className="etat-header-label">Exercice clos le :</span><span className="etat-header-value-right">{dateFin ? fmtDateShort(dateFin) : ''}</span></div><div className="etat-header-row"><span className="etat-header-label">Numéro d'identification :</span><span className="etat-header-value">{entiteNif || ''}</span><span className="etat-header-label">Durée (en mois) :</span><span className="etat-header-value-right">{duree}</span></div></div><div className="etat-sub-titre">NOTE 31<br />REPARTITION DU RESULTAT ET AUTRES ELEMENTS CARACTERISTIQUES DES CINQ DERNIERS EXERCICES</div></div>

        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={{ ...th, width: '40%' }} rowSpan={2}>NATURE DES INDICATIONS</th>
              <th style={th} colSpan={5}>EXERCICES CONCERNES <sup>(1)</sup></th>
            </tr>
            <tr>{COLS.map(c => <th key={c} style={th}>{c}</th>)}</tr>
          </thead>
          <tbody>
            {SECTIONS.map((s, i) => (
              <tr key={i}>
                <td style={s.bold ? tdB : td}>{s.label}</td>
                {COLS.map((_, ci) => (
                  <td key={ci} style={s.bold ? { ...tdB, textAlign: 'right' } : tdR}>
                    {s.bold ? '' : (editing ? <input value={getVal(i, ci)} onChange={e => setVal(i, ci, e.target.value)} style={inp} /> : getVal(i, ci))}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>

        <div style={{ fontSize: 9, marginTop: 10, color: '#555', lineHeight: 1.6 }}>
          <p style={{ margin: '2px 0' }}>(1) Y compris l'exercice dont les états financiers sont soumis à l'approbation de l'Assemblée.</p>
          <p style={{ margin: '2px 0' }}>(2) Indication, en cas de libération partielle du capital, du montant du capital non appelé.</p>
          <p style={{ margin: '2px 0' }}>(3) Les éléments de cette rubrique sont ceux figurant au compte de résultat.</p>
          <p style={{ margin: '2px 0' }}>(4) Le résultat, lorsqu'il est négatif, doit être mis entre parenthèses.</p>
          <p style={{ margin: '2px 0' }}>(5) L'exercice N correspond au dividende proposé du dernier exercice.</p>
          <p style={{ margin: '2px 0' }}>(6) Personnel propre.</p>
          <p style={{ margin: '2px 0' }}>(7) Total des comptes 661, 662, 663.</p>
          <p style={{ margin: '2px 0' }}>(8) Total des comptes 664, 668.</p>
          <p style={{ margin: '2px 0' }}>(9) Compte 667.</p>
        </div>
      </div>
    </div>
  );
}

export default Note31;
