import React, { useState, useRef, useEffect } from 'react';
import { LuDownload, LuArrowLeft, LuEye, LuX, LuPrinter, LuSave, LuPenLine  } from 'react-icons/lu';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import '../BilanSYCEBNL.css';
import '../FicheIdentification.css';
import type { Exercice, EtatBaseProps } from '../../types';

interface Note34Props extends EtatBaseProps { onGoToParametres?: () => void; }

const SECTIONS: { label: string; bold?: boolean; indent?: boolean; prefix?: string }[] = [
  { label: 'ANALYSE DE L\'ACTIVITE', bold: true },
  { label: 'SOLDES INTERMEDIAIRES DE GESTION', bold: true },
  { label: 'Chiffre d\'affaires' },
  { label: 'Marge commerciale' },
  { label: 'Valeur ajoutée' },
  { label: 'Excédent brut d\'exploitation (EBE)' },
  { label: 'Résultat d\'exploitation' },
  { label: 'Résultat financier' },
  { label: 'Résultat des activités ordinaires' },
  { label: 'Résultat hors activités ordinaires' },
  { label: 'Résultat net' },
  { label: 'DETERMINATION DE LA CAPACITE D\'AUTOFINANCEMENT', bold: true },
  { label: 'Excédent brut d\'exploitation (EBE)' },
  { label: 'Valeurs comptables des cessions courantes d\'immobilisation (compte 654)', prefix: '+' },
  { label: 'Produits des cessions courantes d\'immobilisation (compte 754)', prefix: '-' },
  { label: 'CAPACITE D\'AUTOFINANCEMENT D\'EXPLOITATION', bold: true, prefix: '=' },
  { label: 'Revenus financiers', prefix: '+' },
  { label: 'Gains de change', prefix: '+' },
  { label: 'Transferts de charges financières', prefix: '+' },
  { label: 'Produits HAO', prefix: '+' },
  { label: 'Transferts de charges HAO', prefix: '+' },
  { label: 'Frais financiers', prefix: '-' },
  { label: 'Pertes de change', prefix: '-' },
  { label: 'Participation', prefix: '-' },
  { label: 'Impôts sur les résultats', prefix: '-' },
  { label: 'CAPACITE D\'AUTOFINANCEMENT GLOBALE (C.A.F.G.)', bold: true, prefix: '=' },
  { label: 'Distributions de dividendes opérées durant l\'exercice', prefix: '-' },
  { label: 'AUTOFINANCEMENT', bold: true, prefix: '=' },
  { label: 'ANALYSE DE LA RENTABILITE', bold: true },
  { label: 'Rentabilité économique = Résultat d\'exploitation (a) / Capitaux propres + dettes financières' },
  { label: 'Rentabilité financière = Résultat net / Capitaux propres' },
  { label: 'ANALYSE DE LA STRUCTURE FINANCIERE', bold: true },
  { label: 'Capitaux propres et ressources assimilées' },
  { label: 'Dettes financières* et autres ressources assimilées (b)', prefix: '+' },
  { label: 'RESSOURCES STABLES', bold: true, prefix: '=' },
  { label: 'Actif immobilisé (b)', prefix: '-' },
  { label: 'FONDS DE ROULEMENT (1)', bold: true, prefix: '=' },
  { label: 'Actif circulant d\'exploitation (b)', indent: true },
  { label: 'Passif circulant d\'exploitation (b)', indent: true, prefix: '-' },
  { label: 'BESOIN DE FINANCEMENT D\'EXPLOITATION (2)', bold: true, prefix: '=' },
  { label: 'Actif circulant HAO (b)', indent: true },
  { label: 'Passif circulant HAO (b)', indent: true, prefix: '-' },
  { label: 'BESOIN DE FINANCEMENT HAO (3)', bold: true, prefix: '=' },
  { label: 'BESOIN DE FINANCEMENT GLOBAL (4) = (2) + (3)', bold: true },
  { label: 'TRESORERIE NETTE (5) = (1) - (4)', bold: true },
  { label: 'Contrôle : trésorerie nette = (trésorerie - actif) - (trésorerie - passif)' },
  { label: 'ANALYSE DE LA VARIATION DE LA TRESORERIE', bold: true },
  { label: 'Flux de trésorerie des activités opérationnelles' },
  { label: 'Flux de trésorerie des activités d\'investissement', prefix: '-' },
  { label: 'Flux de trésorerie des activités de financement', prefix: '+' },
  { label: 'VARIATION DE LA TRESORERIE NETTE DE LA PERIODE', bold: true, prefix: '=' },
  { label: 'ANALYSE DE LA VARIATION DE L\'ENDETTEMENT FINANCIER NET', bold: true },
  { label: 'Endettement financier brut (Dettes financières* + Trésorerie - passif)' },
  { label: 'Trésorerie - actif', prefix: '-' },
  { label: 'ENDETTEMENT FINANCIER NET', bold: true, prefix: '=' },
];

function Note34({ entiteName, entiteNif = '', entiteId, offre, onBack }: Note34Props): React.JSX.Element {
  const [exercices, setExercices] = useState<Exercice[]>([]); const [selectedExercice, setSelectedExercice] = useState<Exercice | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null); const [pdfBlob, setPdfBlob] = useState<Blob | null>(null);
  const [params, setParams] = useState<Record<string, string>>({}); const [editing, setEditing] = useState(false); const [saving, setSaving] = useState(false); const [saved, setSaved] = useState(false);
  const [data, setData] = useState<Record<string, string>>({});
  const pageRef = useRef<HTMLDivElement>(null);

  const getVal = (row: number, col: number): string => data[`r${row}_c${col}`] || '';
  const setVal = (row: number, col: number, value: string) => setData(prev => ({ ...prev, [`r${row}_c${col}`]: value }));

  useEffect(() => { if (!entiteId) return; fetch('/api/entites/' + entiteId).then(r => r.json()).then(ent => { const d = ent.data || {}; setParams(d); if (d['note34_data']) { try { setData(JSON.parse(d['note34_data'])); } catch { /* */ } } }).catch(() => {}); }, [entiteId]);
  useEffect(() => { if (!entiteId) return; fetch('/api/balance/exercices/' + entiteId).then(r => r.json()).then((d: Exercice[]) => { setExercices(d); if (d.length > 0) { const now = new Date(); const y = now.getFullYear(); const m = now.getMonth(); const py = m <= 2 ? y - 1 : y; setSelectedExercice(d.find(e => e.annee === py) || d.find(e => e.annee === y) || d.find(e => e.annee === y - 1) || d[0]); } }).catch(() => {}); }, [entiteId]);

  const handleSave = async () => { setSaving(true); try { const d: Record<string, string> = { ...params, note34_data: JSON.stringify(data) }; const r = await fetch(`/api/entites/${entiteId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ data: d }) }); if (r.ok) { setParams(d); setSaved(true); setEditing(false); setTimeout(() => setSaved(false), 3000); } } catch { /* */ } setSaving(false); };

  const duree = selectedExercice?.duree_mois || 12; const dateFin = selectedExercice?.date_fin ? new Date(selectedExercice.date_fin) : null; const annee = selectedExercice ? selectedExercice.annee : new Date().getFullYear();
  const fmtDateShort = (d: Date | null): string => { if (!d) return ''; return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' }); };
  const parseN = (v: string): number => { const n = parseFloat(v.replace(/\s/g, '').replace(',', '.')); return isNaN(n) ? 0 : n; };
  const fmtM = (v: number): string => v === 0 ? '0' : Math.round(v).toLocaleString('fr-FR');

  const computeVariation = (row: number): string => {
    const vN = parseN(getVal(row, 0));
    const vN1 = parseN(getVal(row, 1));
    if (vN1 === 0) return '';
    const pct = ((vN - vN1) / Math.abs(vN1)) * 100;
    return pct.toFixed(1).replace('.', ',');
  };

  const generatePDF = async (): Promise<jsPDF> => { const w = editing; if (w) setEditing(false); await new Promise(r => setTimeout(r, 100)); const pdf = new jsPDF('p', 'mm', 'a4'); if (!pageRef.current) return pdf; const c = await html2canvas(pageRef.current, { scale: 2, useCORS: true, backgroundColor: '#ffffff' }); pdf.addImage(c.toDataURL('image/png'), 'PNG', 0, 0, 210, Math.min((c.height * 210) / c.width, 297)); if (w) setEditing(true); return pdf; };
  const openPreview = async () => { const pdf = await generatePDF(); const blob = pdf.output('blob'); setPdfBlob(blob); setPreviewUrl(URL.createObjectURL(blob)); };
  const closePreview = () => { if (previewUrl) URL.revokeObjectURL(previewUrl); setPreviewUrl(null); setPdfBlob(null); };
  const downloadPDF = () => { if (!pdfBlob) return; const u = URL.createObjectURL(pdfBlob); const a = document.createElement('a'); a.href = u; a.download = 'Note34_' + annee + '.pdf'; a.click(); URL.revokeObjectURL(u); };
  const printPDF = () => { if (!previewUrl) return; const w = window.open(previewUrl); if (w) { w.onload = () => w.print(); } };

  const th: React.CSSProperties = { border: '0.5px solid #000', padding: '6px 10px', fontSize: 9, fontWeight: 700, textAlign: 'center', verticalAlign: 'middle', background: '#f5f5f5' };
  const td: React.CSSProperties = { border: '0.5px solid #000', padding: '5px 8px', fontSize: 9, verticalAlign: 'middle' };
  const tdR: React.CSSProperties = { ...td, textAlign: 'right', fontVariantNumeric: 'tabular-nums' };
  const tdB: React.CSSProperties = { ...td, fontWeight: 700, background: '#f0f0f0' };
  const tdBR: React.CSSProperties = { ...tdR, fontWeight: 700, background: '#f0f0f0' };
  const inp: React.CSSProperties = { width: '100%', padding: '3px 6px', fontSize: 9, border: '1px solid #D4A843', borderRadius: 2, background: '#fffbf0', textAlign: 'right', boxSizing: 'border-box' };

  const COLS = ['Année N', 'Année N-1', 'Variation en %'];

  return (
    <div>
      <div className="etat-toolbar">
        <button className="etat-back-btn" onClick={onBack}><LuArrowLeft size={18} /> Retour</button>
        <div className="etat-toolbar-title">Note 34 — Fiche de synthèse des principaux indicateurs financiers</div>
        <div className="etat-toolbar-actions">
          <select className="etat-exercice-select" value={selectedExercice?.id || ''} onChange={e => { const ex = exercices.find(x => x.id === Number(e.target.value)); if (ex) setSelectedExercice(ex); }}>{exercices.map(ex => (<option key={ex.id} value={ex.id}>{ex.annee}</option>))}</select>
          {!editing ? (<button className="etat-action-btn" onClick={() => setEditing(true)} style={{ background: '#D4A843', color: '#fff', border: 'none' }}><LuPenLine size={16} /> Modifier</button>) : (<button className="etat-action-btn" onClick={handleSave} disabled={saving} style={{ background: '#059669', color: '#fff', border: 'none' }}><LuSave size={16} /> {saving ? 'Sauvegarde...' : 'Sauvegarder'}</button>)}
          <button className="etat-action-btn" onClick={openPreview}><LuEye size={16} /> Aperçu</button>
        </div>
      </div>
      {previewUrl && (<div className="etat-preview-overlay" onClick={closePreview}><div className="etat-preview-modal" onClick={e => e.stopPropagation()}><div className="etat-preview-header"><span>Aperçu — Note 34</span><div className="etat-preview-actions"><button onClick={printPDF} title="Imprimer"><LuPrinter size={18} /></button><button onClick={downloadPDF} title="Télécharger"><LuDownload size={18} /></button><button onClick={closePreview}><LuX size={18} /></button></div></div><iframe src={previewUrl} className="etat-preview-iframe" title="Aperçu Note 34" /></div></div>)}

      <div ref={pageRef} style={{ width: '210mm', minHeight: '297mm', background: '#fff', margin: '0 auto 20px', padding: '5mm 8mm', boxShadow: '0 2px 12px rgba(0,0,0,0.1)', boxSizing: 'border-box', fontFamily: "'Outfit', 'Segoe UI', Arial, sans-serif", fontSize: 9, color: '#1a1a1a' }}>
        <div className="etat-header-officiel"><div className="etat-header-grid"><div className="etat-header-row"><span className="etat-header-label">Désignation entité :</span><span className="etat-header-value">{entiteName || ''}</span><span className="etat-header-label">Exercice clos le :</span><span className="etat-header-value-right">{dateFin ? fmtDateShort(dateFin) : ''}</span></div><div className="etat-header-row"><span className="etat-header-label">Numéro d'identification :</span><span className="etat-header-value">{entiteNif || ''}</span><span className="etat-header-label">Durée (en mois) :</span><span className="etat-header-value-right">{duree}</span></div></div></div>
        <h3 style={{ textAlign: 'center', fontSize: 14, fontWeight: 700, margin: '30px 0 20px', textDecoration: 'underline' }}>
          NOTE 34 — FICHE DE SYNTHESE DES PRINCIPAUX INDICATEURS FINANCIERS
        </h3>

        <div style={{ textAlign: 'right', fontSize: 8, marginBottom: 4, fontStyle: 'italic' }}>(EN MILLIERS DE FRANCS)</div>

        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={{ ...th, width: '55%', textAlign: 'left' }}></th>
              {COLS.map(c => <th key={c} style={th}>{c}</th>)}
            </tr>
          </thead>
          <tbody>
            {SECTIONS.map((s, i) => {
              const labelText = (s.prefix ? s.prefix + ' ' : '') + (s.indent ? '  ' : '') + s.label;
              return (
                <tr key={i}>
                  <td style={s.bold ? tdB : { ...td, paddingLeft: s.indent ? 20 : s.prefix ? 14 : 8 }}>{labelText}</td>
                  {s.bold ? (
                    <>
                      <td style={tdBR}>{getVal(i, 0) ? (editing ? <input value={getVal(i, 0)} onChange={e => setVal(i, 0, e.target.value)} style={inp} /> : fmtM(parseN(getVal(i, 0)))) : ''}</td>
                      <td style={tdBR}>{getVal(i, 1) ? (editing ? <input value={getVal(i, 1)} onChange={e => setVal(i, 1, e.target.value)} style={inp} /> : fmtM(parseN(getVal(i, 1)))) : ''}</td>
                      <td style={{ ...tdBR, textAlign: 'center' }}>{computeVariation(i)}{computeVariation(i) ? ' %' : ''}</td>
                    </>
                  ) : (
                    <>
                      <td style={tdR}>{editing ? <input value={getVal(i, 0)} onChange={e => setVal(i, 0, e.target.value)} style={inp} /> : (getVal(i, 0) ? fmtM(parseN(getVal(i, 0))) : '')}</td>
                      <td style={tdR}>{editing ? <input value={getVal(i, 1)} onChange={e => setVal(i, 1, e.target.value)} style={inp} /> : (getVal(i, 1) ? fmtM(parseN(getVal(i, 1))) : '')}</td>
                      <td style={{ ...tdR, textAlign: 'center' }}>{computeVariation(i)}{computeVariation(i) ? ' %' : ''}</td>
                    </>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>

        <div style={{ fontSize: 7, marginTop: 8, color: '#555', lineHeight: 1.5 }}>
          <p style={{ margin: '2px 0' }}>(a) Résultat d'exploitation après impôt théorique sur le bénéfice.</p>
          <p style={{ margin: '2px 0' }}>(b) Les écarts de conversion doivent être éliminés afin de ramener les créances et les dettes concernées à leur valeur initiale.</p>
          <p style={{ margin: '2px 0' }}>Dettes financières* = emprunts et dettes financières diverses + dettes de location acquisition.</p>
        </div>
      </div>
    </div>
  );
}

export default Note34;
