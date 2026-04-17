import React, { useState, useRef, useEffect } from 'react';
import { clientFetch } from '../lib/api';
import { useExercicesQuery } from '../hooks/useExercicesQuery';
import { LuDownload, LuArrowLeft, LuEye, LuX, LuPrinter, LuSave, LuPenLine, LuPlus, LuTrash2 } from 'react-icons/lu';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import type { Exercice, EtatBaseProps } from '../types';
import './BilanSYCEBNL.css';
import './FicheIdentification.css';

interface JournauxSMTProps extends EtatBaseProps {}

interface LigneJournal { date: string; num_facture: string; nom: string; montant: string; date_paiement: string; }
const emptyLigne = (): LigneJournal => ({ date: '', num_facture: '', nom: '', montant: '', date_paiement: '' });

function JournauxSMT({ entiteName, entiteNif = '', entiteId, offre, onBack }: JournauxSMTProps): React.JSX.Element {
  const { exercices, selectedExercice, setSelectedExercice } = useExercicesQuery(entiteId);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null); const [pdfBlob, setPdfBlob] = useState<Blob | null>(null);
  const [params, setParams] = useState<Record<string, string>>({}); const [editing, setEditing] = useState(false); const [saving, setSaving] = useState(false);

  const [creancesImpayees, setCreancesImpayees] = useState<LigneJournal[]>([emptyLigne(), emptyLigne(), emptyLigne(), emptyLigne(), emptyLigne(), emptyLigne(), emptyLigne(), emptyLigne()]);
  const [dettesAPayer, setDettesAPayer] = useState<LigneJournal[]>([emptyLigne(), emptyLigne(), emptyLigne(), emptyLigne(), emptyLigne(), emptyLigne(), emptyLigne(), emptyLigne()]);

  const page1Ref = useRef<HTMLDivElement>(null);
  const page2Ref = useRef<HTMLDivElement>(null);

  useEffect(() => { if (!entiteId) return; clientFetch('/api/entites/' + entiteId).then(r => r.json()).then(ent => { const d = ent.data || {}; setParams(d); if (d['smt_creances_impayees']) { try { const p = JSON.parse(d['smt_creances_impayees']); if (Array.isArray(p) && p.length > 0) setCreancesImpayees(p); } catch { /* */ } } if (d['smt_dettes_a_payer']) { try { const p = JSON.parse(d['smt_dettes_a_payer']); if (Array.isArray(p) && p.length > 0) setDettesAPayer(p); } catch { /* */ } } }).catch(() => {}); }, [entiteId]);
  const handleSave = async () => { setSaving(true); try { const d: Record<string, string> = { ...params, smt_creances_impayees: JSON.stringify(creancesImpayees), smt_dettes_a_payer: JSON.stringify(dettesAPayer) }; const r = await clientFetch(`/api/entites/${entiteId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ data: d }) }); if (r.ok) { setParams(d); setEditing(false); } } catch { /* */ } setSaving(false); };

  const duree = selectedExercice?.duree_mois || 12;
  const dateFin = selectedExercice?.date_fin ? new Date(selectedExercice.date_fin) : null;
  const annee = selectedExercice ? selectedExercice.annee : new Date().getFullYear();
  const fmtDate = (d: Date | null): string => d ? d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '31/12/' + annee;

  const generatePDF = async (): Promise<jsPDF> => {
    const w = editing; if (w) setEditing(false); await new Promise(r => setTimeout(r, 100));
    const pdf = new jsPDF('p', 'mm', 'a4');
    if (page1Ref.current) { const c = await html2canvas(page1Ref.current, { scale: 2, useCORS: true, backgroundColor: '#fff' }); pdf.addImage(c.toDataURL('image/png'), 'PNG', 0, 0, 210, Math.min((c.height * 210) / c.width, 297)); }
    if (page2Ref.current) { pdf.addPage('a4', 'p'); const c = await html2canvas(page2Ref.current, { scale: 2, useCORS: true, backgroundColor: '#fff' }); pdf.addImage(c.toDataURL('image/png'), 'PNG', 0, 0, 210, Math.min((c.height * 210) / c.width, 297)); }
    if (w) setEditing(true); return pdf;
  };
  const openPreview = async () => { const pdf = await generatePDF(); const blob = pdf.output('blob'); setPdfBlob(blob); setPreviewUrl(URL.createObjectURL(blob)); };
  const closePreview = () => { if (previewUrl) URL.revokeObjectURL(previewUrl); setPreviewUrl(null); setPdfBlob(null); };
  const downloadPDF = () => { if (!pdfBlob) return; const u = URL.createObjectURL(pdfBlob); const a = document.createElement('a'); a.href = u; a.download = 'Journaux_SMT_' + annee + '.pdf'; a.click(); URL.revokeObjectURL(u); };
  const printPDF = () => { if (!previewUrl) return; const w = window.open(previewUrl); if (w) { w.onload = () => w.print(); } };

  const pageStyle: React.CSSProperties = { width: '210mm', minHeight: '297mm', background: '#fff', margin: '0 auto 20px', padding: '6mm 10mm', boxShadow: '0 2px 12px rgba(0,0,0,0.1)', boxSizing: 'border-box', fontFamily: "'Inter', 'Segoe UI', Arial, sans-serif", fontSize: 11, color: '#1a1a1a' };
  const th: React.CSSProperties = { border: '1px solid #000', padding: '8px 10px', fontSize: 11, fontWeight: 700, textAlign: 'center', verticalAlign: 'middle', background: '#e8e8e8' };
  const td: React.CSSProperties = { border: '1px solid #000', padding: '7px 10px', fontSize: 11, verticalAlign: 'middle' };
  const tdR: React.CSSProperties = { ...td, textAlign: 'right', fontVariantNumeric: 'tabular-nums' };
  const inp: React.CSSProperties = { width: '100%', padding: '4px 6px', fontSize: 10, border: '1px solid #D4A843', borderRadius: 2, background: '#fffbf0', boxSizing: 'border-box' };
  const inpR: React.CSSProperties = { ...inp, textAlign: 'right' };

  const renderHeader = (titre: string) => (
    <div className="etat-header-officiel">
      <div className="etat-header-grid">
        <div className="etat-header-row"><span className="etat-header-label">Désignation entité :</span><span className="etat-header-value">{entiteName || ''}</span><span className="etat-header-label">Exercice clos le :</span><span className="etat-header-value-right">{fmtDate(dateFin)}</span></div>
        <div className="etat-header-row"><span className="etat-header-label">Numéro d'identification :</span><span className="etat-header-value">{entiteNif || ''}</span><span className="etat-header-label">Durée (en mois) :</span><span className="etat-header-value-right">{duree}</span></div>
      </div>
      <div className="etat-sub-titre">{titre}</div>
    </div>
  );

  const renderInput = (value: string, onChange: (v: string) => void, style = inp) => editing ? <input value={value} onChange={e => onChange(e.target.value)} style={style} /> : value;

  const renderJournal = (
    titre: string,
    nomColonne: string,
    lignes: LigneJournal[],
    setLignes: React.Dispatch<React.SetStateAction<LigneJournal[]>>,
  ) => (
    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
      <thead>
        <tr>
          <th style={{ ...th, width: '12%' }}>Date</th>
          <th style={{ ...th, width: '12%' }}>N° facture</th>
          <th style={{ ...th, width: '34%' }}>{nomColonne}</th>
          <th style={{ ...th, width: '18%' }}>Montant</th>
          <th style={{ ...th, width: '16%' }}>Date paiement</th>
        </tr>
      </thead>
      <tbody>
        {lignes.map((l, i) => (
          <tr key={i}>
            <td style={td}>{renderInput(l.date, v => setLignes(p => p.map((x, j) => j === i ? { ...x, date: v } : x)))}</td>
            <td style={td}>{renderInput(l.num_facture, v => setLignes(p => p.map((x, j) => j === i ? { ...x, num_facture: v } : x)))}</td>
            <td style={td}>
              {editing ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                  <input value={l.nom} onChange={e => setLignes(p => p.map((x, j) => j === i ? { ...x, nom: e.target.value } : x))} style={inp} />
                  <button onClick={() => setLignes(p => p.filter((_, j) => j !== i))} style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer', padding: 1, flexShrink: 0 }}><LuTrash2 size={12} /></button>
                </div>
              ) : l.nom}
            </td>
            <td style={tdR}>{renderInput(l.montant, v => setLignes(p => p.map((x, j) => j === i ? { ...x, montant: v } : x)), inpR)}</td>
            <td style={td}>{renderInput(l.date_paiement, v => setLignes(p => p.map((x, j) => j === i ? { ...x, date_paiement: v } : x)))}</td>
          </tr>
        ))}
        {editing && (
          <tr className="no-print">
            <td colSpan={5} style={{ border: 'none', padding: '4px 0' }}>
              <button onClick={() => setLignes(p => [...p, emptyLigne()])} style={{ background: '#D4A843', color: '#fff', border: 'none', borderRadius: 4, padding: '3px 12px', fontSize: 11, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}><LuPlus size={12} /> Ajouter une ligne</button>
            </td>
          </tr>
        )}
      </tbody>
    </table>
  );

  return (
    <div>
      <div className="etat-toolbar">
        <button className="etat-back-btn" onClick={onBack}><LuArrowLeft size={18} /> Retour</button>
        <div className="etat-toolbar-title">Journaux de suivi SMT</div>
        <div className="etat-toolbar-actions">
          <select className="etat-exercice-select" value={selectedExercice?.id || ''} onChange={e => { const ex = exercices.find(x => x.id === Number(e.target.value)); if (ex) setSelectedExercice(ex); }}>{exercices.map(ex => (<option key={ex.id} value={ex.id}>{ex.annee}</option>))}</select>
          {!editing ? (<button className="etat-action-btn" onClick={() => setEditing(true)} style={{ background: '#D4A843', color: '#fff', border: 'none' }}><LuPenLine size={16} /> Modifier</button>) : (<button className="etat-action-btn" onClick={handleSave} disabled={saving} style={{ background: '#059669', color: '#fff', border: 'none' }}><LuSave size={16} /> {saving ? 'Sauvegarde...' : 'Sauvegarder'}</button>)}
          <button className="etat-action-btn" onClick={openPreview}><LuEye size={16} /> Aperçu</button>
        </div>
      </div>
      {previewUrl && (<div className="etat-preview-overlay" onClick={closePreview}><div className="etat-preview-modal" onClick={e => e.stopPropagation()}><div className="etat-preview-header"><span>Aperçu — Journaux SMT</span><div className="etat-preview-actions"><button onClick={printPDF} title="Imprimer"><LuPrinter size={18} /></button><button onClick={downloadPDF} title="Télécharger"><LuDownload size={18} /></button><button onClick={closePreview}><LuX size={18} /></button></div></div><iframe src={previewUrl} className="etat-preview-iframe" title="Aperçu Journaux SMT" /></div></div>)}

      {/* PAGE 1 — Journal de suivi des créances impayées */}
      <div ref={page1Ref} style={pageStyle}>
        {renderHeader('JOURNAL DE SUIVI DES CREANCES IMPAYEES SMT')}
        {renderJournal('Créances impayées', 'Nom du client', creancesImpayees, setCreancesImpayees)}
      </div>

      {/* PAGE 2 — Journal de suivi des dettes à payer */}
      <div ref={page2Ref} style={pageStyle}>
        {renderHeader('JOURNAL DE SUIVI DES DETTES A PAYER SMT')}
        {renderJournal('Dettes à payer', 'Nom du fournisseur', dettesAPayer, setDettesAPayer)}
      </div>
    </div>
  );
}

export default JournauxSMT;
