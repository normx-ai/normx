import React, { useState, useRef, useEffect } from 'react';
import { LuDownload, LuArrowLeft, LuEye, LuX, LuPrinter, LuSave, LuPenLine, LuPlus, LuTrash2 } from 'react-icons/lu';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import '../BilanSYCEBNL.css';
import '../FicheIdentification.css';
import type { Exercice, EtatBaseProps } from '../../types';

interface Note37Props extends EtatBaseProps { onGoToParametres?: () => void; }

interface LigneDetail { libelle: string; montant: string; }

interface Note37Data {
  resultat_net: string;
  reintegrations: LigneDetail[];
  deductions: LigneDetail[];
  deficits: LigneDetail[];
  amort_differes: LigneDetail[];
  amort_a_differer: LigneDetail[];
  taux_impot: string;
}

const emptyLigne = (): LigneDetail => ({ libelle: '', montant: '' });

const defaultData = (): Note37Data => ({
  resultat_net: '',
  reintegrations: [emptyLigne(), emptyLigne(), emptyLigne(), emptyLigne(), emptyLigne(), emptyLigne()],
  deductions: [emptyLigne(), emptyLigne(), emptyLigne(), emptyLigne(), emptyLigne(), emptyLigne()],
  deficits: [emptyLigne(), emptyLigne()],
  amort_differes: [emptyLigne(), emptyLigne()],
  amort_a_differer: [emptyLigne()],
  taux_impot: '',
});

function Note37({ entiteName, entiteNif = '', entiteId, offre, onBack }: Note37Props): React.JSX.Element {
  const [exercices, setExercices] = useState<Exercice[]>([]); const [selectedExercice, setSelectedExercice] = useState<Exercice | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null); const [pdfBlob, setPdfBlob] = useState<Blob | null>(null);
  const [params, setParams] = useState<Record<string, string>>({}); const [editing, setEditing] = useState(false); const [saving, setSaving] = useState(false); const [saved, setSaved] = useState(false);
  const [data, setData] = useState<Note37Data>(defaultData());
  const pageRef = useRef<HTMLDivElement>(null);

  useEffect(() => { if (!entiteId) return; fetch('/api/entites/' + entiteId).then(r => r.json()).then(ent => { const d = ent.data || {}; setParams(d); if (d['note37_data']) { try { const p = JSON.parse(d['note37_data']); setData({ ...defaultData(), ...p }); } catch { /* */ } } }).catch(() => {}); }, [entiteId]);
  useEffect(() => { if (!entiteId) return; fetch('/api/balance/exercices/' + entiteId).then(r => r.json()).then((d: Exercice[]) => { setExercices(d); if (d.length > 0) { const now = new Date(); const y = now.getFullYear(); const m = now.getMonth(); const py = m <= 2 ? y - 1 : y; setSelectedExercice(d.find(e => e.annee === py) || d.find(e => e.annee === y) || d.find(e => e.annee === y - 1) || d[0]); } }).catch(() => {}); }, [entiteId]);

  const handleSave = async () => { setSaving(true); try { const d: Record<string, string> = { ...params, note37_data: JSON.stringify(data) }; const r = await fetch(`/api/entites/${entiteId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ data: d }) }); if (r.ok) { setParams(d); setSaved(true); setEditing(false); setTimeout(() => setSaved(false), 3000); } } catch { /* */ } setSaving(false); };

  const duree = selectedExercice?.duree_mois || 12; const dateFin = selectedExercice?.date_fin ? new Date(selectedExercice.date_fin) : null; const annee = selectedExercice ? selectedExercice.annee : new Date().getFullYear();
  const fmtDateShort = (d: Date | null): string => { if (!d) return ''; return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' }); };
  const parseN = (v: string): number => { const n = parseFloat(v.replace(/\s/g, '').replace(',', '.')); return isNaN(n) ? 0 : n; };
  const fmtM = (v: number): string => v === 0 ? '' : Math.round(v).toLocaleString('fr-FR');

  const sumSection = (lignes: LigneDetail[]): number => lignes.reduce((s, l) => s + parseN(l.montant), 0);

  const totalReint = sumSection(data.reintegrations);
  const totalDeduc = sumSection(data.deductions);
  const resultatNet = parseN(data.resultat_net);
  const resultatImposable = resultatNet + totalReint - totalDeduc;
  const totalDeficits = sumSection(data.deficits);
  const totalAmortDiff = sumSection(data.amort_differes);
  const totalAmortADiff = sumSection(data.amort_a_differer);
  const resultatFiscal = resultatImposable - totalDeficits - totalAmortDiff + totalAmortADiff;
  const tauxImpot = parseN(data.taux_impot);
  const impot = tauxImpot > 0 ? resultatFiscal * tauxImpot / 100 : 0;

  const updateLigne = (section: keyof Note37Data, idx: number, field: keyof LigneDetail, value: string) => {
    setData(prev => {
      const arr = [...(prev[section] as LigneDetail[])];
      arr[idx] = { ...arr[idx], [field]: value };
      return { ...prev, [section]: arr };
    });
  };
  const addLigne = (section: keyof Note37Data) => {
    setData(prev => ({ ...prev, [section]: [...(prev[section] as LigneDetail[]), emptyLigne()] }));
  };
  const removeLigne = (section: keyof Note37Data, idx: number) => {
    setData(prev => ({ ...prev, [section]: (prev[section] as LigneDetail[]).filter((_, i) => i !== idx) }));
  };

  const generatePDF = async (): Promise<jsPDF> => { const w = editing; if (w) setEditing(false); await new Promise(r => setTimeout(r, 100)); const pdf = new jsPDF('p', 'mm', 'a4'); if (!pageRef.current) return pdf; const c = await html2canvas(pageRef.current, { scale: 2, useCORS: true, backgroundColor: '#ffffff' }); const imgW = 210; const imgH = (c.height * imgW) / c.width; let yOff = 0; while (yOff < imgH) { if (yOff > 0) pdf.addPage(); pdf.addImage(c.toDataURL('image/png'), 'PNG', 0, -yOff, imgW, imgH); yOff += 297; } if (w) setEditing(true); return pdf; };
  const openPreview = async () => { const pdf = await generatePDF(); const blob = pdf.output('blob'); setPdfBlob(blob); setPreviewUrl(URL.createObjectURL(blob)); };
  const closePreview = () => { if (previewUrl) URL.revokeObjectURL(previewUrl); setPreviewUrl(null); setPdfBlob(null); };
  const downloadPDF = () => { if (!pdfBlob) return; const u = URL.createObjectURL(pdfBlob); const a = document.createElement('a'); a.href = u; a.download = 'Note37_' + annee + '.pdf'; a.click(); URL.revokeObjectURL(u); };
  const printPDF = () => { if (!previewUrl) return; const w = window.open(previewUrl); if (w) { w.onload = () => w.print(); } };

  const td: React.CSSProperties = { border: '0.5px solid #000', padding: '6px 10px', fontSize: 10, verticalAlign: 'middle' };
  const tdR: React.CSSProperties = { ...td, textAlign: 'right', fontVariantNumeric: 'tabular-nums', width: '22%' };
  const tdB: React.CSSProperties = { ...td, fontWeight: 700, background: '#f0f0f0' };
  const tdBR: React.CSSProperties = { ...tdR, fontWeight: 700, background: '#f0f0f0' };
  const th: React.CSSProperties = { border: '0.5px solid #000', padding: '8px 10px', fontSize: 10, fontWeight: 700, textAlign: 'center', verticalAlign: 'middle', background: '#f5f5f5' };
  const inp: React.CSSProperties = { width: '100%', padding: '4px 6px', fontSize: 10, border: '1px solid #D4A843', borderRadius: 2, background: '#fffbf0', textAlign: 'right', boxSizing: 'border-box' };
  const inpL: React.CSSProperties = { ...inp, textAlign: 'left' };

  const renderSection = (label: string, num: string, section: keyof Note37Data, lignes: LigneDetail[], showTotal?: boolean, totalVal?: number) => (
    <>
      <tr>
        <td style={tdB}>{num} : {label} <sup>(1)</sup></td>
        <td style={tdBR}>{showTotal && totalVal !== undefined ? fmtM(totalVal) : ''}</td>
      </tr>
      {lignes.map((l, i) => (
        <tr key={`${section}_${i}`}>
          <td style={td}>
            {editing ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <input value={l.libelle} onChange={e => updateLigne(section, i, 'libelle', e.target.value)} style={inpL} placeholder="Libellé..." />
                <button onClick={() => removeLigne(section, i)} style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer', padding: 1, flexShrink: 0 }}><LuTrash2 size={12} /></button>
              </div>
            ) : l.libelle}
          </td>
          <td style={tdR}>
            {editing ? <input value={l.montant} onChange={e => updateLigne(section, i, 'montant', e.target.value)} style={inp} /> : (l.montant ? fmtM(parseN(l.montant)) : '')}
          </td>
        </tr>
      ))}
      {editing && (
        <tr className="no-print">
          <td colSpan={2} style={{ border: 'none', padding: '3px 0' }}>
            <button onClick={() => addLigne(section)} style={{ background: '#D4A843', color: '#fff', border: 'none', borderRadius: 4, padding: '2px 10px', fontSize: 10, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}><LuPlus size={11} /> Ajouter</button>
          </td>
        </tr>
      )}
    </>
  );

  return (
    <div>
      <div className="etat-toolbar">
        <button className="etat-back-btn" onClick={onBack}><LuArrowLeft size={18} /> Retour</button>
        <div className="etat-toolbar-title">Note 37 — Détermination impôts sur le résultat</div>
        <div className="etat-toolbar-actions">
          <select className="etat-exercice-select" value={selectedExercice?.id || ''} onChange={e => { const ex = exercices.find(x => x.id === Number(e.target.value)); if (ex) setSelectedExercice(ex); }}>{exercices.map(ex => (<option key={ex.id} value={ex.id}>{ex.annee}</option>))}</select>
          {!editing ? (<button className="etat-action-btn" onClick={() => setEditing(true)} style={{ background: '#D4A843', color: '#fff', border: 'none' }}><LuPenLine size={16} /> Modifier</button>) : (<button className="etat-action-btn" onClick={handleSave} disabled={saving} style={{ background: '#059669', color: '#fff', border: 'none' }}><LuSave size={16} /> {saving ? 'Sauvegarde...' : 'Sauvegarder'}</button>)}
          <button className="etat-action-btn" onClick={openPreview}><LuEye size={16} /> Aperçu</button>
        </div>
      </div>
      {previewUrl && (<div className="etat-preview-overlay" onClick={closePreview}><div className="etat-preview-modal" onClick={e => e.stopPropagation()}><div className="etat-preview-header"><span>Aperçu — Note 37</span><div className="etat-preview-actions"><button onClick={printPDF} title="Imprimer"><LuPrinter size={18} /></button><button onClick={downloadPDF} title="Télécharger"><LuDownload size={18} /></button><button onClick={closePreview}><LuX size={18} /></button></div></div><iframe src={previewUrl} className="etat-preview-iframe" title="Aperçu Note 37" /></div></div>)}

      <div ref={pageRef} style={{ width: '210mm', minHeight: '297mm', background: '#fff', margin: '0 auto 20px', padding: '6mm 10mm', boxShadow: '0 2px 12px rgba(0,0,0,0.1)', boxSizing: 'border-box', fontFamily: "'Outfit', 'Segoe UI', Arial, sans-serif", fontSize: 10, color: '#1a1a1a' }}>
        <div className="etat-header-officiel"><div className="etat-header-grid"><div className="etat-header-row"><span className="etat-header-label">Désignation entité :</span><span className="etat-header-value">{entiteName || ''}</span><span className="etat-header-label">Exercice clos le :</span><span className="etat-header-value-right">{dateFin ? fmtDateShort(dateFin) : ''}</span></div><div className="etat-header-row"><span className="etat-header-label">Numéro d'identification :</span><span className="etat-header-value">{entiteNif || ''}</span><span className="etat-header-label">Durée (en mois) :</span><span className="etat-header-value-right">{duree}</span></div></div><div className="etat-sub-titre">NOTE 37<br />DETERMINATION IMPOTS SUR LE RESULTAT</div></div>

        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={{ ...th, textAlign: 'left', width: '78%' }}>Libellés</th>
              <th style={th}>Montant</th>
            </tr>
          </thead>
          <tbody>
            {/* 1 : Résultat net comptable */}
            <tr>
              <td style={tdB}>1 : RESULTAT NET COMPTABLE DE L'EXERCICE</td>
              <td style={tdBR}>
                {editing ? <input value={data.resultat_net} onChange={e => setData(prev => ({ ...prev, resultat_net: e.target.value }))} style={inp} /> : (data.resultat_net ? fmtM(parseN(data.resultat_net)) : '')}
              </td>
            </tr>

            {/* 2 : A réintégrer */}
            {renderSection('A REINTEGRER', '2', 'reintegrations', data.reintegrations)}

            {/* 3 : A déduire */}
            {renderSection('A DEDUIRE', '3', 'deductions', data.deductions)}

            {/* 4 : Résultat imposable avant déduction des déficits */}
            <tr>
              <td style={{ ...tdB, background: '#e8e8e8' }}>4 : RESULTAT IMPOSABLE AVANT DEDUCTION DES DEFICITS (4 = 1+2-3)</td>
              <td style={{ ...tdBR, background: '#e8e8e8' }}>{fmtM(resultatImposable)}</td>
            </tr>

            {/* 5 : Déficits antérieurs */}
            {renderSection('DEFICITS ANTERIEURS A L\'EXERCICE', '5', 'deficits', data.deficits)}

            {/* 6 : Amortissements régulièrement différés */}
            {renderSection('AMORTISSEMENTS REGULIEREMENT DIFFERES', '6', 'amort_differes', data.amort_differes)}

            {/* 7 : Amortissements de l'exercice à différer */}
            {renderSection('AMORTISSEMENTS DE L\'EXERCICE A DIFFERER', '7', 'amort_a_differer', data.amort_a_differer)}

            {/* 8 : Résultat fiscal de l'exercice */}
            <tr>
              <td style={{ ...tdB, background: '#e8e8e8' }}>8 : RESULTAT FISCAL DE L'EXERCICE (8 = 4-5-6+7)</td>
              <td style={{ ...tdBR, background: '#e8e8e8' }}>{fmtM(resultatFiscal)}</td>
            </tr>

            {/* 9 : Impôt sur le résultat */}
            <tr>
              <td style={tdB}>
                9 : IMPOTS SUR LE RESULTAT AU TAUX DE{' '}
                {editing ? (
                  <input value={data.taux_impot} onChange={e => setData(prev => ({ ...prev, taux_impot: e.target.value }))} style={{ ...inp, width: 60, display: 'inline-block', textAlign: 'center' }} placeholder="%" />
                ) : (
                  <span style={{ fontWeight: 400 }}>{data.taux_impot ? data.taux_impot + ' %' : '.......... %'}</span>
                )}
              </td>
              <td style={tdBR}>{fmtM(Math.round(impot))}</td>
            </tr>
          </tbody>
        </table>

        <div style={{ fontSize: 8, marginTop: 12, color: '#555', lineHeight: 1.6 }}>
          <p style={{ margin: '2px 0' }}>(1) A détailler.</p>
        </div>
      </div>
    </div>
  );
}

export default Note37;
