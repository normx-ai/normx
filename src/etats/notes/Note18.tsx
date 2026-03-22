import React, { useState, useRef, useEffect } from 'react';
import { LuDownload, LuArrowLeft, LuEye, LuX, LuPrinter, LuSave, LuPenLine } from 'react-icons/lu';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import '../BilanSYCEBNL.css';
import '../FicheIdentification.css';
import type { Exercice, EtatBaseProps, BalanceLigne } from '../../types';

interface Note18Props extends EtatBaseProps {
  onGoToParametres?: () => void;
}

interface Rubrique {
  label: string;
  prefixes: string[];
  group: 'sociales' | 'fiscales';
}

const RUBRIQUES: Rubrique[] = [
  { label: 'Personnel avances et acomptes', prefixes: ['421'], group: 'sociales' },
  { label: 'Personnel rémunérations dues', prefixes: ['422'], group: 'sociales' },
  { label: 'Autres personnel', prefixes: ['423', '424', '425', '426', '427', '428'], group: 'sociales' },
  { label: 'Caisse de sécurité sociale', prefixes: ['431'], group: 'sociales' },
  { label: 'Caisse de retraite', prefixes: ['432'], group: 'sociales' },
  { label: 'Autres organismes sociaux', prefixes: ['433', '438'], group: 'sociales' },
  { label: 'Etat, impôts sur les bénéfices', prefixes: ['441'], group: 'fiscales' },
  { label: 'Etat, impôts et taxes', prefixes: ['442', '443'], group: 'fiscales' },
  { label: 'Etat, TVA', prefixes: ['444', '445'], group: 'fiscales' },
  { label: 'Etat, impôts retenus à la source', prefixes: ['447'], group: 'fiscales' },
  { label: 'Autres dettes Etat', prefixes: ['446', '448', '449'], group: 'fiscales' },
];

function Note18({ entiteName, entiteNif = '', entiteId, offre, onBack }: Note18Props): React.JSX.Element {
  const [exercices, setExercices] = useState<Exercice[]>([]);
  const [selectedExercice, setSelectedExercice] = useState<Exercice | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [pdfBlob, setPdfBlob] = useState<Blob | null>(null);
  const [params, setParams] = useState<Record<string, string>>({});
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const [lignesN, setLignesN] = useState<BalanceLigne[]>([]);
  const [lignesN1, setLignesN1] = useState<BalanceLigne[]>([]);
  const [adjustments, setAdjustments] = useState<Record<string, Record<string, number>>>({});

  const DEFAULT_COMMENTAIRE = `• Commenter toute variation significative.\n• Commenter les dettes anciennes.`;
  const [commentaire, setCommentaire] = useState(DEFAULT_COMMENTAIRE);

  const pageRef = useRef<HTMLDivElement>(null);

  const setAdj = (label: string, field: string, value: number) => {
    setAdjustments(prev => ({ ...prev, [label]: { ...(prev[label] || {}), [field]: value } }));
  };
  const getAdj = (label: string, field: string): number => adjustments[label]?.[field] || 0;

  useEffect(() => {
    if (!entiteId) return;
    fetch('/api/entites/' + entiteId)
      .then(r => r.json())
      .then(ent => {
        const data = ent.data || {};
        setParams(data);
        setCommentaire(data['note18_commentaire'] || DEFAULT_COMMENTAIRE);
        if (data['note18_adjustments']) { try { setAdjustments(JSON.parse(data['note18_adjustments'])); } catch { /* */ } }
      })
      .catch(() => {});
  }, [entiteId]);

  useEffect(() => {
    if (!entiteId) return;
    fetch('/api/balance/exercices/' + entiteId)
      .then(r => r.json())
      .then((data: Exercice[]) => {
        setExercices(data);
        if (data.length > 0) {
          const now = new Date(); const year = now.getFullYear(); const month = now.getMonth();
          const preferYear = month <= 2 ? year - 1 : year;
          const pick = data.find(e => e.annee === preferYear) || data.find(e => e.annee === year) || data.find(e => e.annee === year - 1) || data[0];
          setSelectedExercice(pick);
        }
      })
      .catch(() => {});
  }, [entiteId]);

  const balanceSource = offre === 'comptabilite' ? 'ecritures' : 'import';
  useEffect(() => {
    if (!entiteId || !selectedExercice) return;
    const load = async () => {
      try {
        if (balanceSource === 'ecritures') { const res = await fetch('/api/ecritures/balance/' + entiteId + '/' + selectedExercice.id); setLignesN((await res.json()).lignes || []); }
        else { const res = await fetch('/api/balance/' + entiteId + '/' + selectedExercice.id + '/N'); setLignesN((await res.json()).lignes || []); }
      } catch { setLignesN([]); }
      try {
        const exN1 = exercices.find(e => e.annee === selectedExercice.annee - 1);
        if (exN1) {
          if (balanceSource === 'ecritures') { const res = await fetch('/api/ecritures/balance/' + entiteId + '/' + exN1.id); setLignesN1((await res.json()).lignes || []); }
          else { const res = await fetch('/api/balance/' + entiteId + '/' + exN1.id + '/N'); setLignesN1((await res.json()).lignes || []); }
        } else { const res = await fetch('/api/balance/' + entiteId + '/' + selectedExercice.id + '/N-1'); setLignesN1((await res.json()).lignes || []); }
      } catch { setLignesN1([]); }
    };
    load();
  }, [entiteId, selectedExercice, balanceSource, exercices]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const data: Record<string, string> = { ...params, note18_adjustments: JSON.stringify(adjustments), note18_commentaire: commentaire };
      const res = await fetch(`/api/entites/${entiteId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ data }) });
      if (res.ok) { setParams(data); setSaved(true); setEditing(false); setTimeout(() => setSaved(false), 3000); }
    } catch { /* */ }
    setSaving(false);
  };

  const duree = selectedExercice?.duree_mois || 12;
  const dateFin = selectedExercice?.date_fin ? new Date(selectedExercice.date_fin) : null;
  const annee = selectedExercice ? selectedExercice.annee : new Date().getFullYear();
  const fmtDateShort = (d: Date | null): string => { if (!d) return ''; return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' }); };
  const fmtM = (val: number): string => { if (val === 0) return ''; return Math.round(val).toLocaleString('fr-FR'); };

  const computeForPrefixes = (lignes: BalanceLigne[], prefixes: string[]) => {
    let total = 0;
    for (const l of lignes) { const num = (l.numero_compte || '').trim(); if (!prefixes.some(p => num.startsWith(p))) continue; total += (parseFloat(String(l.solde_crediteur)) || 0) - (parseFloat(String(l.solde_debiteur)) || 0); }
    return total;
  };

  const computeRow = (r: Rubrique) => {
    const n = computeForPrefixes(lignesN, r.prefixes) + getAdj(r.label, 'anneeN');
    const n1 = computeForPrefixes(lignesN1, r.prefixes) + getAdj(r.label, 'anneeN1');
    const variationAbs = n - n1;
    const variationPct = n1 !== 0 ? ((n - n1) / Math.abs(n1) * 100) : 0;
    return { anneeN: n, anneeN1: n1, variationAbs, variationPct };
  };

  const socialesRows = RUBRIQUES.filter(r => r.group === 'sociales').map(r => ({ ...r, vals: computeRow(r) }));
  const fiscalesRows = RUBRIQUES.filter(r => r.group === 'fiscales').map(r => ({ ...r, vals: computeRow(r) }));

  const sumGroup = (rows: { vals: { anneeN: number; anneeN1: number } }[]) => rows.reduce((a, r) => ({ anneeN: a.anneeN + r.vals.anneeN, anneeN1: a.anneeN1 + r.vals.anneeN1 }), { anneeN: 0, anneeN1: 0 });

  const totalSociales = sumGroup(socialesRows);
  const totalFiscales = sumGroup(fiscalesRows);
  const totalGeneral = { anneeN: totalSociales.anneeN + totalFiscales.anneeN, anneeN1: totalSociales.anneeN1 + totalFiscales.anneeN1 };

  const renderAdjInput = (label: string, field: string, baseValue: number) => {
    if (!editing) return fmtM(baseValue);
    const adj = getAdj(label, field);
    return <input value={adj || ''} onChange={e => { const v = e.target.value === '' ? 0 : parseFloat(e.target.value.replace(/\s/g, '').replace(',', '.')) || 0; setAdj(label, field, v); }} style={inputSt} placeholder={fmtM(baseValue - adj)} />;
  };

  const renderCreanceInput = (label: string, field: string) => {
    if (!editing) return fmtM(getAdj(label, field));
    return <input value={getAdj(label, field) || ''} onChange={e => { const v = e.target.value === '' ? 0 : parseFloat(e.target.value.replace(/\s/g, '').replace(',', '.')) || 0; setAdj(label, field, v); }} style={inputSt} />;
  };

  const generatePDF = async (): Promise<jsPDF> => {
    const wasEditing = editing; if (wasEditing) setEditing(false); await new Promise(r => setTimeout(r, 100));
    const pdf = new jsPDF('l', 'mm', 'a4'); if (!pageRef.current) return pdf;
    const canvas = await html2canvas(pageRef.current, { scale: 2, useCORS: true, backgroundColor: '#ffffff' });
    pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 0, 297, Math.min((canvas.height * 297) / canvas.width, 210));
    if (wasEditing) setEditing(true); return pdf;
  };

  const openPreview = async () => { const pdf = await generatePDF(); const blob = pdf.output('blob'); setPdfBlob(blob); setPreviewUrl(URL.createObjectURL(blob)); };
  const closePreview = () => { if (previewUrl) URL.revokeObjectURL(previewUrl); setPreviewUrl(null); setPdfBlob(null); };
  const downloadPDF = () => { if (!pdfBlob) return; const url = URL.createObjectURL(pdfBlob); const a = document.createElement('a'); a.href = url; a.download = 'Note18_' + annee + '.pdf'; a.click(); URL.revokeObjectURL(url); };
  const printPDF = () => { if (!previewUrl) return; const w = window.open(previewUrl); if (w) { w.onload = () => w.print(); } };

  const thStyle: React.CSSProperties = { border: '0.5px solid #000', padding: '10px 14px', fontSize: 12, fontWeight: 700, textAlign: 'center', verticalAlign: 'middle', background: '#f5f5f5' };
  const tdStyle: React.CSSProperties = { border: '0.5px solid #000', padding: '10px 14px', fontSize: 12, verticalAlign: 'middle' };
  const tdRight: React.CSSProperties = { ...tdStyle, textAlign: 'right', fontVariantNumeric: 'tabular-nums' };
  const tdBold: React.CSSProperties = { ...tdStyle, fontWeight: 700 };
  const tdBoldRight: React.CSSProperties = { ...tdRight, fontWeight: 700 };
  const inputSt: React.CSSProperties = { width: '100%', padding: '5px 8px', fontSize: 12, border: '1px solid #D4A843', borderRadius: 2, background: '#fffbf0', textAlign: 'right', boxSizing: 'border-box' };
  const textareaStyle: React.CSSProperties = { width: '100%', minHeight: 40, padding: '8px 10px', fontSize: 12, lineHeight: '1.6', border: '1px solid #D4A843', borderRadius: 3, background: '#fffbf0', fontFamily: 'inherit', boxSizing: 'border-box', resize: 'vertical' };

  const renderRow = (r: { label: string; vals: { anneeN: number; anneeN1: number; variationAbs: number; variationPct: number } }) => (
    <tr key={r.label}>
      <td style={tdStyle}>{r.label}</td>
      <td style={tdRight}>{renderAdjInput(r.label, 'anneeN', r.vals.anneeN)}</td>
      <td style={tdRight}>{renderAdjInput(r.label, 'anneeN1', r.vals.anneeN1)}</td>
      <td style={{ ...tdRight, background: '#fafafa' }}>{fmtM(r.vals.variationAbs)}</td>
      <td style={{ ...tdRight, background: '#fafafa' }}>{r.vals.variationPct !== 0 ? r.vals.variationPct.toFixed(1) + ' %' : ''}</td>
      <td style={tdRight}>{renderCreanceInput(r.label, 'dettes1an')}</td>
      <td style={tdRight}>{renderCreanceInput(r.label, 'dettes1a2ans')}</td>
      <td style={tdRight}>{renderCreanceInput(r.label, 'dettesPlus2ans')}</td>
    </tr>
  );

  const renderTotalRow = (label: string, totals: { anneeN: number; anneeN1: number }) => {
    const variationAbs = totals.anneeN - totals.anneeN1;
    const variationPct = totals.anneeN1 !== 0 ? ((totals.anneeN - totals.anneeN1) / Math.abs(totals.anneeN1) * 100) : 0;
    return (
      <tr key={label}>
        <td style={{ ...tdBold, background: '#f0f0f0' }}>{label}</td>
        <td style={{ ...tdBoldRight, background: '#f0f0f0' }}>{fmtM(totals.anneeN)}</td>
        <td style={{ ...tdBoldRight, background: '#f0f0f0' }}>{fmtM(totals.anneeN1)}</td>
        <td style={{ ...tdBoldRight, background: '#f0f0f0' }}>{fmtM(variationAbs)}</td>
        <td style={{ ...tdBoldRight, background: '#f0f0f0' }}>{variationPct !== 0 ? variationPct.toFixed(1) + ' %' : ''}</td>
        <td style={{ ...tdBold, background: '#f0f0f0' }}></td>
        <td style={{ ...tdBold, background: '#f0f0f0' }}></td>
        <td style={{ ...tdBold, background: '#f0f0f0' }}></td>
      </tr>
    );
  };

  return (
    <div>
      <div className="etat-toolbar">
        <button className="etat-back-btn" onClick={onBack}><LuArrowLeft size={18} /> Retour</button>
        <div className="etat-toolbar-title">Note 18 — Dettes fiscales et sociales</div>
        <div className="etat-toolbar-actions">
          <select className="etat-exercice-select" value={selectedExercice?.id || ''} onChange={e => { const ex = exercices.find(ex => ex.id === Number(e.target.value)); if (ex) setSelectedExercice(ex); }}>
            {exercices.map(ex => (<option key={ex.id} value={ex.id}>{ex.annee}</option>))}
          </select>
          {!editing ? (
            <button className="etat-action-btn" onClick={() => setEditing(true)} style={{ background: '#D4A843', color: '#fff', border: 'none' }}><LuPenLine size={16} /> Modifier</button>
          ) : (
            <button className="etat-action-btn" onClick={handleSave} disabled={saving} style={{ background: '#059669', color: '#fff', border: 'none' }}><LuSave size={16} /> {saving ? 'Sauvegarde...' : 'Sauvegarder'}</button>
          )}
          <button className="etat-action-btn" onClick={openPreview}><LuEye size={16} /> Aperçu</button>
        </div>
      </div>

      {previewUrl && (
        <div className="etat-preview-overlay" onClick={closePreview}>
          <div className="etat-preview-modal" onClick={e => e.stopPropagation()}>
            <div className="etat-preview-header">
              <span>Aperçu — Note 18</span>
              <div className="etat-preview-actions">
                <button onClick={printPDF} title="Imprimer"><LuPrinter size={18} /></button>
                <button onClick={downloadPDF} title="Télécharger"><LuDownload size={18} /></button>
                <button onClick={closePreview}><LuX size={18} /></button>
              </div>
            </div>
            <iframe src={previewUrl} className="etat-preview-iframe" title="Aperçu Note 18" />
          </div>
        </div>
      )}

      <div ref={pageRef} style={{
        width: '297mm', minHeight: '210mm', background: '#fff',
        margin: '0 auto 20px', padding: '8mm 10mm',
        boxShadow: '0 2px 12px rgba(0,0,0,0.1)', boxSizing: 'border-box',
        fontFamily: "'Outfit', 'Segoe UI', Arial, sans-serif", fontSize: 12, color: '#1a1a1a',
      }}>
        <div className="etat-header-officiel">
          <div className="etat-header-grid">
            <div className="etat-header-row">
              <span className="etat-header-label">Désignation entité :</span>
              <span className="etat-header-value">{entiteName || ''}</span>
              <span className="etat-header-label">Exercice clos le :</span>
              <span className="etat-header-value-right">{dateFin ? fmtDateShort(dateFin) : ''}</span>
            </div>
            <div className="etat-header-row">
              <span className="etat-header-label">Numéro d'identification :</span>
              <span className="etat-header-value">{entiteNif || ''}</span>
              <span className="etat-header-label">Durée (en mois) :</span>
              <span className="etat-header-value-right">{duree}</span>
            </div>
          </div>
          <div className="etat-sub-titre">NOTE 18<br />DETTES FISCALES ET SOCIALES</div>
        </div>

        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 0 }}>
          <thead>
            <tr>
              <th style={{ ...thStyle, width: '28%' }} rowSpan={2}>Libellés</th>
              <th style={thStyle} rowSpan={2}>Année N</th>
              <th style={thStyle} rowSpan={2}>Année N-1</th>
              <th style={thStyle} rowSpan={2}>Variation en valeur absolue</th>
              <th style={thStyle} rowSpan={2}>Variation en %</th>
              <th style={thStyle} colSpan={3}>Échéances des dettes</th>
            </tr>
            <tr>
              <th style={{ ...thStyle, fontSize: 10 }}>Dettes à un an au plus</th>
              <th style={{ ...thStyle, fontSize: 10 }}>Dettes à plus d'un an et à deux ans au plus</th>
              <th style={{ ...thStyle, fontSize: 10 }}>Dettes à plus de deux ans</th>
            </tr>
          </thead>
          <tbody>
            {socialesRows.map(r => renderRow(r))}
            {renderTotalRow('TOTAL DETTES SOCIALES', totalSociales)}
            {fiscalesRows.map(r => renderRow(r))}
            {renderTotalRow('TOTAL DETTES FISCALES', totalFiscales)}
            <tr><td colSpan={8} style={{ ...tdStyle, height: 6 }}></td></tr>
            {renderTotalRow('TOTAL DETTES SOCIALES ET FISCALES', totalGeneral)}
          </tbody>
        </table>

        <div style={{ border: '0.5px solid #000', borderTop: 'none', padding: '10px 12px' }}>
          <p style={{ fontSize: 12, fontWeight: 700, marginBottom: 6, marginTop: 0 }}>Commentaire :</p>
          {editing ? (
            <textarea value={commentaire} onChange={e => setCommentaire(e.target.value)} style={textareaStyle} />
          ) : (
            <div style={{ fontSize: 12, lineHeight: 1.6, whiteSpace: 'pre-wrap', minHeight: 30 }}>{commentaire}</div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Note18;
