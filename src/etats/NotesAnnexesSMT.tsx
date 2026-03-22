import React, { useState, useRef, useEffect } from 'react';
import { LuDownload, LuArrowLeft, LuEye, LuX, LuPrinter, LuSave, LuPenLine, LuPlus, LuTrash2 } from 'react-icons/lu';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import type { Exercice, EtatBaseProps } from '../types';
import './BilanSYCEBNL.css';
import './FicheIdentification.css';

interface NotesAnnexesSMTProps extends EtatBaseProps {}

interface LigneMateriel { date: string; designation: string; montant: string; date_sortie: string; prix_cession: string; }
interface LigneStock { reference: string; designation: string; quantite: string; prix_unitaire: string; montant: string; }
interface LigneCreanceDette { date: string; nom: string; montant_fin: string; montant_debut: string; variation: string; }

const emptyMat = (): LigneMateriel => ({ date: '', designation: '', montant: '', date_sortie: '', prix_cession: '' });
const emptyStock = (): LigneStock => ({ reference: '', designation: '', quantite: '', prix_unitaire: '', montant: '' });
const emptyCD = (): LigneCreanceDette => ({ date: '', nom: '', montant_fin: '', montant_debut: '', variation: '' });

function NotesAnnexesSMT({ entiteName, entiteNif = '', entiteId, offre, onBack }: NotesAnnexesSMTProps): React.JSX.Element {
  const [exercices, setExercices] = useState<Exercice[]>([]); const [selectedExercice, setSelectedExercice] = useState<Exercice | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null); const [pdfBlob, setPdfBlob] = useState<Blob | null>(null);
  const [params, setParams] = useState<Record<string, string>>({}); const [editing, setEditing] = useState(false); const [saving, setSaving] = useState(false);

  const [materiel, setMateriel] = useState<LigneMateriel[]>([emptyMat(), emptyMat(), emptyMat(), emptyMat(), emptyMat(), emptyMat(), emptyMat(), emptyMat()]);
  const [stocks, setStocks] = useState<LigneStock[]>([emptyStock(), emptyStock(), emptyStock(), emptyStock(), emptyStock(), emptyStock(), emptyStock(), emptyStock()]);
  const [stockFinal, setStockFinal] = useState('');
  const [stockInitial, setStockInitial] = useState('');
  const [creances, setCreances] = useState<LigneCreanceDette[]>([emptyCD(), emptyCD(), emptyCD(), emptyCD(), emptyCD(), emptyCD()]);
  const [dettes, setDettes] = useState<LigneCreanceDette[]>([emptyCD(), emptyCD(), emptyCD(), emptyCD(), emptyCD(), emptyCD()]);

  const page1Ref = useRef<HTMLDivElement>(null);
  const page2Ref = useRef<HTMLDivElement>(null);
  const page3Ref = useRef<HTMLDivElement>(null);

  useEffect(() => { if (!entiteId) return; fetch('/api/entites/' + entiteId).then(r => r.json()).then(ent => { const d = ent.data || {}; setParams(d); if (d['smt_materiel']) { try { const p = JSON.parse(d['smt_materiel']); if (Array.isArray(p) && p.length > 0) setMateriel(p); } catch { /* */ } } if (d['smt_stocks']) { try { const p = JSON.parse(d['smt_stocks']); if (Array.isArray(p) && p.length > 0) setStocks(p); } catch { /* */ } } if (d['smt_stock_final']) setStockFinal(d['smt_stock_final']); if (d['smt_stock_initial']) setStockInitial(d['smt_stock_initial']); if (d['smt_creances']) { try { const p = JSON.parse(d['smt_creances']); if (Array.isArray(p) && p.length > 0) setCreances(p); } catch { /* */ } } if (d['smt_dettes']) { try { const p = JSON.parse(d['smt_dettes']); if (Array.isArray(p) && p.length > 0) setDettes(p); } catch { /* */ } } }).catch(() => {}); }, [entiteId]);
  useEffect(() => { if (!entiteId) return; fetch('/api/balance/exercices/' + entiteId).then(r => r.json()).then((d: Exercice[]) => { setExercices(d); if (d.length > 0) { const now = new Date(); const y = now.getFullYear(); const m = now.getMonth(); const py = m <= 2 ? y - 1 : y; setSelectedExercice(d.find(e => e.annee === py) || d.find(e => e.annee === y) || d.find(e => e.annee === y - 1) || d[0]); } }).catch(() => {}); }, [entiteId]);

  const handleSave = async () => { setSaving(true); try { const d: Record<string, string> = { ...params, smt_materiel: JSON.stringify(materiel), smt_stocks: JSON.stringify(stocks), smt_stock_final: stockFinal, smt_stock_initial: stockInitial, smt_creances: JSON.stringify(creances), smt_dettes: JSON.stringify(dettes) }; const r = await fetch(`/api/entites/${entiteId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ data: d }) }); if (r.ok) { setParams(d); setEditing(false); } } catch { /* */ } setSaving(false); };

  const duree = selectedExercice?.duree_mois || 12;
  const dateFin = selectedExercice?.date_fin ? new Date(selectedExercice.date_fin) : null;
  const annee = selectedExercice ? selectedExercice.annee : new Date().getFullYear();
  const fmtDate = (d: Date | null): string => d ? d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '31/12/' + annee;

  const generatePDF = async (): Promise<jsPDF> => {
    const w = editing; if (w) setEditing(false); await new Promise(r => setTimeout(r, 100));
    const pdf = new jsPDF('p', 'mm', 'a4');
    const capture = async (ref: React.RefObject<HTMLDivElement | null>, addPage: boolean) => {
      if (!ref.current) return;
      if (addPage) pdf.addPage('a4', 'p');
      const c = await html2canvas(ref.current, { scale: 2, useCORS: true, backgroundColor: '#fff' });
      pdf.addImage(c.toDataURL('image/png'), 'PNG', 0, 0, 210, Math.min((c.height * 210) / c.width, 297));
    };
    await capture(page1Ref, false);
    await capture(page2Ref, true);
    await capture(page3Ref, true);
    if (w) setEditing(true); return pdf;
  };
  const openPreview = async () => { const pdf = await generatePDF(); const blob = pdf.output('blob'); setPdfBlob(blob); setPreviewUrl(URL.createObjectURL(blob)); };
  const closePreview = () => { if (previewUrl) URL.revokeObjectURL(previewUrl); setPreviewUrl(null); setPdfBlob(null); };
  const downloadPDF = () => { if (!pdfBlob) return; const u = URL.createObjectURL(pdfBlob); const a = document.createElement('a'); a.href = u; a.download = 'Notes_Annexes_SMT_' + annee + '.pdf'; a.click(); URL.revokeObjectURL(u); };
  const printPDF = () => { if (!previewUrl) return; const w = window.open(previewUrl); if (w) { w.onload = () => w.print(); } };

  const pageStyle: React.CSSProperties = { width: '210mm', minHeight: '297mm', background: '#fff', margin: '0 auto 20px', padding: '6mm 10mm', boxShadow: '0 2px 12px rgba(0,0,0,0.1)', boxSizing: 'border-box', fontFamily: "'Outfit', 'Segoe UI', Arial, sans-serif", fontSize: 11, color: '#1a1a1a' };
  const th: React.CSSProperties = { border: '1px solid #000', padding: '8px 10px', fontSize: 11, fontWeight: 700, textAlign: 'center', verticalAlign: 'middle', background: '#e8e8e8' };
  const td: React.CSSProperties = { border: '1px solid #000', padding: '7px 10px', fontSize: 11, verticalAlign: 'middle' };
  const tdR: React.CSSProperties = { ...td, textAlign: 'right', fontVariantNumeric: 'tabular-nums' };
  const tdB: React.CSSProperties = { ...td, fontWeight: 700, background: '#f0f0f0' };
  const tdBR: React.CSSProperties = { ...tdR, fontWeight: 700, background: '#f0f0f0' };
  const inp: React.CSSProperties = { width: '100%', padding: '4px 6px', fontSize: 10, border: '1px solid #D4A843', borderRadius: 2, background: '#fffbf0', boxSizing: 'border-box' };
  const inpR: React.CSSProperties = { ...inp, textAlign: 'right' };

  const renderHeader = (titre: string) => (
    <div className="etat-header-officiel">
      <div className="etat-header-grid">
        <div className="etat-header-row"><span className="etat-header-label">Désignation entité :</span><span className="etat-header-value">{entiteName || ''}</span><span className="etat-header-label">Exercice clos le :</span><span className="etat-header-value-right">{fmtDate(dateFin)}</span></div>
        <div className="etat-header-row"><span className="etat-header-label">Numéro d'identification :</span><span className="etat-header-value">{entiteNif || ''}</span><span className="etat-header-label">Durée (en mois) :</span><span className="etat-header-value-right">{duree}</span></div>
      </div>
      <div className="etat-sub-titre" dangerouslySetInnerHTML={{ __html: titre }} />
    </div>
  );

  const renderInput = (value: string, onChange: (v: string) => void, style = inp) => editing ? <input value={value} onChange={e => onChange(e.target.value)} style={style} /> : value;

  const delBtn = (onClick: () => void) => <button onClick={onClick} style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer', padding: 1, flexShrink: 0 }}><LuTrash2 size={12} /></button>;

  const addBtn = (onClick: () => void) => editing ? (
    <tr className="no-print"><td colSpan={10} style={{ border: 'none', padding: '4px 0' }}><button onClick={onClick} style={{ background: '#D4A843', color: '#fff', border: 'none', borderRadius: 4, padding: '3px 12px', fontSize: 11, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}><LuPlus size={12} /> Ajouter</button></td></tr>
  ) : null;

  return (
    <div>
      <div className="etat-toolbar">
        <button className="etat-back-btn" onClick={onBack}><LuArrowLeft size={18} /> Retour</button>
        <div className="etat-toolbar-title">Notes annexes SMT</div>
        <div className="etat-toolbar-actions">
          <select className="etat-exercice-select" value={selectedExercice?.id || ''} onChange={e => { const ex = exercices.find(x => x.id === Number(e.target.value)); if (ex) setSelectedExercice(ex); }}>{exercices.map(ex => (<option key={ex.id} value={ex.id}>{ex.annee}</option>))}</select>
          {!editing ? (<button className="etat-action-btn" onClick={() => setEditing(true)} style={{ background: '#D4A843', color: '#fff', border: 'none' }}><LuPenLine size={16} /> Modifier</button>) : (<button className="etat-action-btn" onClick={handleSave} disabled={saving} style={{ background: '#059669', color: '#fff', border: 'none' }}><LuSave size={16} /> {saving ? 'Sauvegarde...' : 'Sauvegarder'}</button>)}
          <button className="etat-action-btn" onClick={openPreview}><LuEye size={16} /> Aperçu</button>
        </div>
      </div>
      {previewUrl && (<div className="etat-preview-overlay" onClick={closePreview}><div className="etat-preview-modal" onClick={e => e.stopPropagation()}><div className="etat-preview-header"><span>Aperçu — Notes annexes SMT</span><div className="etat-preview-actions"><button onClick={printPDF} title="Imprimer"><LuPrinter size={18} /></button><button onClick={downloadPDF} title="Télécharger"><LuDownload size={18} /></button><button onClick={closePreview}><LuX size={18} /></button></div></div><iframe src={previewUrl} className="etat-preview-iframe" title="Aperçu Notes SMT" /></div></div>)}

      {/* ==================== PAGE 1 : Tableau suivi matériel ==================== */}
      <div ref={page1Ref} style={pageStyle}>
        {renderHeader('TABLEAU SMT DE SUIVI DU MATERIEL,<br/>DU MOBILIER ET DES CAUTIONS')}
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead><tr>
            <th style={{ ...th, width: '12%' }}>Date</th>
            <th style={{ ...th, width: '36%' }}>Désignation</th>
            <th style={{ ...th, width: '16%' }}>Montant</th>
            <th style={{ ...th, width: '16%' }}>Date de sortie</th>
            <th style={{ ...th, width: '16%' }}>Prix de cession</th>
          </tr></thead>
          <tbody>
            {materiel.map((m, i) => (
              <tr key={i}>
                <td style={td}>{renderInput(m.date, v => setMateriel(p => p.map((x, j) => j === i ? { ...x, date: v } : x)))}</td>
                <td style={td}>{editing ? <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}><input value={m.designation} onChange={e => setMateriel(p => p.map((x, j) => j === i ? { ...x, designation: e.target.value } : x))} style={inp} />{delBtn(() => setMateriel(p => p.filter((_, j) => j !== i)))}</div> : m.designation}</td>
                <td style={tdR}>{renderInput(m.montant, v => setMateriel(p => p.map((x, j) => j === i ? { ...x, montant: v } : x)), inpR)}</td>
                <td style={td}>{renderInput(m.date_sortie, v => setMateriel(p => p.map((x, j) => j === i ? { ...x, date_sortie: v } : x)))}</td>
                <td style={tdR}>{renderInput(m.prix_cession, v => setMateriel(p => p.map((x, j) => j === i ? { ...x, prix_cession: v } : x)), inpR)}</td>
              </tr>
            ))}
            {addBtn(() => setMateriel(p => [...p, emptyMat()]))}
          </tbody>
        </table>
      </div>

      {/* ==================== PAGE 2 : État des stocks ==================== */}
      <div ref={page2Ref} style={pageStyle}>
        {renderHeader('ETAT DES STOCKS AU 31 DECEMBRE ' + annee)}
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead><tr>
            <th style={{ ...th, width: '15%' }}>REFERENCE</th>
            <th style={{ ...th, width: '30%' }}>DESIGNATION</th>
            <th style={{ ...th, width: '14%' }}>QUANTITE</th>
            <th style={{ ...th, width: '16%' }}>PRIX UNITAIRE</th>
            <th style={{ ...th, width: '16%' }}>MONTANT</th>
          </tr></thead>
          <tbody>
            {stocks.map((s, i) => (
              <tr key={i}>
                <td style={td}>{renderInput(s.reference, v => setStocks(p => p.map((x, j) => j === i ? { ...x, reference: v } : x)))}</td>
                <td style={td}>{editing ? <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}><input value={s.designation} onChange={e => setStocks(p => p.map((x, j) => j === i ? { ...x, designation: e.target.value } : x))} style={inp} />{delBtn(() => setStocks(p => p.filter((_, j) => j !== i)))}</div> : s.designation}</td>
                <td style={tdR}>{renderInput(s.quantite, v => setStocks(p => p.map((x, j) => j === i ? { ...x, quantite: v } : x)), inpR)}</td>
                <td style={tdR}>{renderInput(s.prix_unitaire, v => setStocks(p => p.map((x, j) => j === i ? { ...x, prix_unitaire: v } : x)), inpR)}</td>
                <td style={tdR}>{renderInput(s.montant, v => setStocks(p => p.map((x, j) => j === i ? { ...x, montant: v } : x)), inpR)}</td>
              </tr>
            ))}
            {addBtn(() => setStocks(p => [...p, emptyStock()]))}
            <tr><td style={tdB} colSpan={4}>VALEUR DU STOCK FINAL</td><td style={tdBR}>{renderInput(stockFinal, v => setStockFinal(v), inpR)}</td></tr>
            <tr><td style={tdB} colSpan={4}>VALEUR DU STOCK INITIAL</td><td style={tdBR}>{renderInput(stockInitial, v => setStockInitial(v), inpR)}</td></tr>
          </tbody>
        </table>
      </div>

      {/* ==================== PAGE 3 : Créances et dettes non échues ==================== */}
      <div ref={page3Ref} style={pageStyle}>
        {renderHeader('ETAT DES CREANCES ET DES DETTES NON ECHUES<br/>AU 31 DECEMBRE ' + annee)}

        {/* Créances */}
        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 20 }}>
          <thead><tr>
            <th style={{ ...th, width: '10%' }}>DATE</th>
            <th style={{ ...th, width: '30%' }}>NOM DU CLIENT</th>
            <th style={{ ...th, width: '18%' }}>Montant au 31 décembre</th>
            <th style={{ ...th, width: '18%' }}>Montant au 1er janvier</th>
            <th style={{ ...th, width: '12%' }}>Variation %</th>
          </tr></thead>
          <tbody>
            {creances.map((c, i) => (
              <tr key={i}>
                <td style={td}>{renderInput(c.date, v => setCreances(p => p.map((x, j) => j === i ? { ...x, date: v } : x)))}</td>
                <td style={td}>{editing ? <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}><input value={c.nom} onChange={e => setCreances(p => p.map((x, j) => j === i ? { ...x, nom: e.target.value } : x))} style={inp} />{delBtn(() => setCreances(p => p.filter((_, j) => j !== i)))}</div> : c.nom}</td>
                <td style={tdR}>{renderInput(c.montant_fin, v => setCreances(p => p.map((x, j) => j === i ? { ...x, montant_fin: v } : x)), inpR)}</td>
                <td style={tdR}>{renderInput(c.montant_debut, v => setCreances(p => p.map((x, j) => j === i ? { ...x, montant_debut: v } : x)), inpR)}</td>
                <td style={{ ...tdR, textAlign: 'center' }}>{renderInput(c.variation, v => setCreances(p => p.map((x, j) => j === i ? { ...x, variation: v } : x)), { ...inp, textAlign: 'center' })}</td>
              </tr>
            ))}
            {addBtn(() => setCreances(p => [...p, emptyCD()]))}
            <tr><td style={tdB} colSpan={2}>TOTAL DES CREANCES</td><td style={tdBR}></td><td style={tdBR}></td><td style={tdBR}></td></tr>
          </tbody>
        </table>

        {/* Dettes */}
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead><tr>
            <th style={{ ...th, width: '10%' }}>DATE</th>
            <th style={{ ...th, width: '30%' }}>NOM DU FOURNISSEUR</th>
            <th style={{ ...th, width: '18%' }}>Montant au 31 décembre</th>
            <th style={{ ...th, width: '18%' }}>Montant au 1er janvier</th>
            <th style={{ ...th, width: '12%' }}>Variation %</th>
          </tr></thead>
          <tbody>
            {dettes.map((d, i) => (
              <tr key={i}>
                <td style={td}>{renderInput(d.date, v => setDettes(p => p.map((x, j) => j === i ? { ...x, date: v } : x)))}</td>
                <td style={td}>{editing ? <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}><input value={d.nom} onChange={e => setDettes(p => p.map((x, j) => j === i ? { ...x, nom: e.target.value } : x))} style={inp} />{delBtn(() => setDettes(p => p.filter((_, j) => j !== i)))}</div> : d.nom}</td>
                <td style={tdR}>{renderInput(d.montant_fin, v => setDettes(p => p.map((x, j) => j === i ? { ...x, montant_fin: v } : x)), inpR)}</td>
                <td style={tdR}>{renderInput(d.montant_debut, v => setDettes(p => p.map((x, j) => j === i ? { ...x, montant_debut: v } : x)), inpR)}</td>
                <td style={{ ...tdR, textAlign: 'center' }}>{renderInput(d.variation, v => setDettes(p => p.map((x, j) => j === i ? { ...x, variation: v } : x)), { ...inp, textAlign: 'center' })}</td>
              </tr>
            ))}
            {addBtn(() => setDettes(p => [...p, emptyCD()]))}
            <tr><td style={tdB} colSpan={2}>TOTAL DES DETTES</td><td style={tdBR}></td><td style={tdBR}></td><td style={tdBR}></td></tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default NotesAnnexesSMT;
