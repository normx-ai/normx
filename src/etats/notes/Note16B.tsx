import React, { useState, useRef, useEffect } from 'react';
import { LuDownload, LuArrowLeft, LuEye, LuX, LuPrinter, LuSave, LuPenLine } from 'react-icons/lu';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import '../BilanSYCEBNL.css';
import '../FicheIdentification.css';
import type { Exercice, EtatBaseProps } from '../../types';

interface Note16BProps extends EtatBaseProps {
  onGoToParametres?: () => void;
}

const HYPOTHESES = [
  'Taux d\'augmentation des salaires',
  'Taux d\'actualisation',
  'Taux d\'inflation',
  'Probabilité d\'être présent dans l\'entité à la date de départ à la retraite (expérience passée)',
  'Probabilité d\'être en vie à l\'âge de départ à la retraite (table de mortalité)',
  'Taux de rendement effectif des actifs du régime',
];

const VARIATIONS = [
  'Obligation au titre des engagements de retraite à l\'ouverture',
  'Coût des services rendus au cours de l\'exercice',
  'Coût financier',
  'Pertes actuarielles / (gain)',
  'Prestations payées au cours de l\'exercice',
  'Coût des services passés',
  'Obligation au titre des engagements de retraite à la clôture',
];

const SENSIBILITE = [
  'Taux d\'actualisation (variation de ...%)',
  'Taux de progression des salaires (variation de ...%)',
  'Taux de départ du personnel (variation de ...%)',
];

function Note16B({ entiteName, entiteNif = '', entiteId, offre, onBack }: Note16BProps): React.JSX.Element {
  const [exercices, setExercices] = useState<Exercice[]>([]);
  const [selectedExercice, setSelectedExercice] = useState<Exercice | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [pdfBlob, setPdfBlob] = useState<Blob | null>(null);
  const [params, setParams] = useState<Record<string, string>>({});
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const [data, setData] = useState<Record<string, string>>({});
  const [commentaireHyp, setCommentaireHyp] = useState('• Commenter les variations d\'hypothèses actuarielles utilisées pour le calcul des engagements de retraite et avantages assimilés.');
  const [commentaireVar, setCommentaireVar] = useState('• Indiquer le montant de la charge par nature comptabilisée au cours de l\'exercice.');
  const [commentaireSens, setCommentaireSens] = useState('• Indiquer l\'impact des variations obtenues sur le montant des engagements de retraite.');

  const pageRef = useRef<HTMLDivElement>(null);

  const getVal = (key: string): string => data[key] || '';
  const setVal = (key: string, value: string) => setData(prev => ({ ...prev, [key]: value }));

  useEffect(() => {
    if (!entiteId) return;
    fetch('/api/entites/' + entiteId)
      .then(r => r.json())
      .then(ent => {
        const d = ent.data || {};
        setParams(d);
        if (d['note16b_data']) { try { setData(JSON.parse(d['note16b_data'])); } catch { /* */ } }
        setCommentaireHyp(d['note16b_comm_hyp'] || commentaireHyp);
        setCommentaireVar(d['note16b_comm_var'] || commentaireVar);
        setCommentaireSens(d['note16b_comm_sens'] || commentaireSens);
      })
      .catch(() => {});
  }, [entiteId]);

  useEffect(() => {
    if (!entiteId) return;
    fetch('/api/balance/exercices/' + entiteId)
      .then(r => r.json())
      .then((exs: Exercice[]) => {
        setExercices(exs);
        if (exs.length > 0) {
          const now = new Date(); const year = now.getFullYear(); const month = now.getMonth();
          const preferYear = month <= 2 ? year - 1 : year;
          const pick = exs.find(e => e.annee === preferYear) || exs.find(e => e.annee === year) || exs.find(e => e.annee === year - 1) || exs[0];
          setSelectedExercice(pick);
        }
      })
      .catch(() => {});
  }, [entiteId]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const d: Record<string, string> = {
        ...params,
        note16b_data: JSON.stringify(data),
        note16b_comm_hyp: commentaireHyp,
        note16b_comm_var: commentaireVar,
        note16b_comm_sens: commentaireSens,
      };
      const res = await fetch(`/api/entites/${entiteId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ data: d }) });
      if (res.ok) { setParams(d); setSaved(true); setEditing(false); setTimeout(() => setSaved(false), 3000); }
    } catch { /* */ }
    setSaving(false);
  };

  const duree = selectedExercice?.duree_mois || 12;
  const dateFin = selectedExercice?.date_fin ? new Date(selectedExercice.date_fin) : null;
  const annee = selectedExercice ? selectedExercice.annee : new Date().getFullYear();
  const fmtDateShort = (d: Date | null): string => { if (!d) return ''; return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' }); };

  const generatePDF = async (): Promise<jsPDF> => {
    const wasEditing = editing; if (wasEditing) setEditing(false); await new Promise(r => setTimeout(r, 100));
    const pdf = new jsPDF('p', 'mm', 'a4'); if (!pageRef.current) return pdf;
    const canvas = await html2canvas(pageRef.current, { scale: 2, useCORS: true, backgroundColor: '#ffffff' });
    pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 0, 210, Math.min((canvas.height * 210) / canvas.width, 297));
    if (wasEditing) setEditing(true); return pdf;
  };

  const openPreview = async () => { const pdf = await generatePDF(); const blob = pdf.output('blob'); setPdfBlob(blob); setPreviewUrl(URL.createObjectURL(blob)); };
  const closePreview = () => { if (previewUrl) URL.revokeObjectURL(previewUrl); setPreviewUrl(null); setPdfBlob(null); };
  const downloadPDF = () => { if (!pdfBlob) return; const url = URL.createObjectURL(pdfBlob); const a = document.createElement('a'); a.href = url; a.download = 'Note16B_' + annee + '.pdf'; a.click(); URL.revokeObjectURL(url); };
  const printPDF = () => { if (!previewUrl) return; const w = window.open(previewUrl); if (w) { w.onload = () => w.print(); } };

  const thStyle: React.CSSProperties = { border: '0.5px solid #000', padding: '10px 14px', fontSize: 12, fontWeight: 700, textAlign: 'center', verticalAlign: 'middle', background: '#f5f5f5' };
  const tdStyle: React.CSSProperties = { border: '0.5px solid #000', padding: '10px 14px', fontSize: 12, verticalAlign: 'middle' };
  const tdRight: React.CSSProperties = { ...tdStyle, textAlign: 'right', fontVariantNumeric: 'tabular-nums' };
  const inputSt: React.CSSProperties = { width: '100%', padding: '5px 8px', fontSize: 12, border: '1px solid #D4A843', borderRadius: 2, background: '#fffbf0', textAlign: 'right', boxSizing: 'border-box' };
  const textareaStyle: React.CSSProperties = { width: '100%', minHeight: 35, padding: '6px 10px', fontSize: 12, lineHeight: '1.5', border: '1px solid #D4A843', borderRadius: 3, background: '#fffbf0', fontFamily: 'inherit', boxSizing: 'border-box', resize: 'vertical' };

  const renderInput = (key: string) => {
    if (!editing) return getVal(key);
    return <input value={getVal(key)} onChange={e => setVal(key, e.target.value)} style={inputSt} />;
  };

  return (
    <div>
      <div className="etat-toolbar">
        <button className="etat-back-btn" onClick={onBack}><LuArrowLeft size={18} /> Retour</button>
        <div className="etat-toolbar-title">Note 16B — Engagements de retraite et avantages assimilés</div>
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
              <span>Aperçu — Note 16B</span>
              <div className="etat-preview-actions">
                <button onClick={printPDF} title="Imprimer"><LuPrinter size={18} /></button>
                <button onClick={downloadPDF} title="Télécharger"><LuDownload size={18} /></button>
                <button onClick={closePreview}><LuX size={18} /></button>
              </div>
            </div>
            <iframe src={previewUrl} className="etat-preview-iframe" title="Aperçu Note 16B" />
          </div>
        </div>
      )}

      <div ref={pageRef} style={{
        width: '210mm', minHeight: '297mm', background: '#fff',
        margin: '0 auto 20px', padding: '6mm 10mm',
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
          <div className="etat-sub-titre">NOTE 16B<br />ENGAGEMENTS DE RETRAITE ET AVANTAGES ASSIMILES</div>
        </div>

        {/* HYPOTHESES ACTUARIELLES */}
        <div style={{ textAlign: 'center', fontWeight: 700, fontSize: 13, margin: '10px 0 6px', border: '0.5px solid #000', padding: 6, background: '#f9f9f9' }}>HYPOTHESES ACTUARIELLES</div>
        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 0 }}>
          <thead>
            <tr>
              <th style={{ ...thStyle, width: '60%' }}>Libellés</th>
              <th style={thStyle}>Année N</th>
              <th style={thStyle}>Année N-1</th>
            </tr>
          </thead>
          <tbody>
            {HYPOTHESES.map((h, i) => (
              <tr key={i}>
                <td style={tdStyle}>{h}</td>
                <td style={tdRight}>{renderInput(`hyp_${i}_n`)}</td>
                <td style={tdRight}>{renderInput(`hyp_${i}_n1`)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div style={{ border: '0.5px solid #000', borderTop: 'none', padding: '6px 10px', marginBottom: 14 }}>
          <p style={{ fontSize: 12, fontWeight: 700, marginBottom: 4, marginTop: 0 }}>Commentaire :</p>
          {editing ? <textarea value={commentaireHyp} onChange={e => setCommentaireHyp(e.target.value)} style={textareaStyle} /> : <div style={{ fontSize: 12, lineHeight: 1.5, whiteSpace: 'pre-wrap', minHeight: 16 }}>{commentaireHyp}</div>}
        </div>

        {/* VARIATION DE LA VALEUR DE L'ENGAGEMENT */}
        <div style={{ textAlign: 'center', fontWeight: 700, fontSize: 13, margin: '10px 0 6px', border: '0.5px solid #000', padding: 6, background: '#f9f9f9' }}>VARIATION DE LA VALEUR DE L'ENGAGEMENT DE RETRAITE AU COURS DE L'EXERCICE</div>
        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 0 }}>
          <thead>
            <tr>
              <th style={{ ...thStyle, width: '60%' }}>Libellés</th>
              <th style={thStyle}>Année N</th>
              <th style={thStyle}>Année N-1</th>
            </tr>
          </thead>
          <tbody>
            {VARIATIONS.map((v, i) => (
              <tr key={i}>
                <td style={i === 0 || i === VARIATIONS.length - 1 ? { ...tdStyle, fontWeight: 600, fontStyle: 'italic' } : tdStyle}>{v}</td>
                <td style={tdRight}>{renderInput(`var_${i}_n`)}</td>
                <td style={tdRight}>{renderInput(`var_${i}_n1`)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div style={{ border: '0.5px solid #000', borderTop: 'none', padding: '6px 10px', marginBottom: 14 }}>
          <p style={{ fontSize: 12, fontWeight: 700, marginBottom: 4, marginTop: 0 }}>Commentaire :</p>
          {editing ? <textarea value={commentaireVar} onChange={e => setCommentaireVar(e.target.value)} style={textareaStyle} /> : <div style={{ fontSize: 12, lineHeight: 1.5, whiteSpace: 'pre-wrap', minHeight: 16 }}>{commentaireVar}</div>}
        </div>

        {/* ANALYSE DE SENSIBILITE */}
        <div style={{ textAlign: 'center', fontWeight: 700, fontSize: 13, margin: '10px 0 6px', border: '0.5px solid #000', padding: 6, background: '#f9f9f9' }}>ANALYSE DE SENSIBILITE DES HYPOTHESES ACTUARIELLES</div>
        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 0 }}>
          <thead>
            <tr>
              <th style={{ ...thStyle, width: '40%' }} rowSpan={2}>Libellés</th>
              <th style={thStyle} colSpan={2}>Année N</th>
              <th style={thStyle} colSpan={2}>Année N-1</th>
            </tr>
            <tr>
              <th style={thStyle}>Augmentation</th>
              <th style={thStyle}>Diminution</th>
              <th style={thStyle}>Augmentation</th>
              <th style={thStyle}>Diminution</th>
            </tr>
          </thead>
          <tbody>
            {SENSIBILITE.map((s, i) => (
              <tr key={i}>
                <td style={tdStyle}>{s}</td>
                <td style={tdRight}>{renderInput(`sens_${i}_n_aug`)}</td>
                <td style={tdRight}>{renderInput(`sens_${i}_n_dim`)}</td>
                <td style={tdRight}>{renderInput(`sens_${i}_n1_aug`)}</td>
                <td style={tdRight}>{renderInput(`sens_${i}_n1_dim`)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div style={{ border: '0.5px solid #000', borderTop: 'none', padding: '6px 10px' }}>
          <p style={{ fontSize: 12, fontWeight: 700, marginBottom: 4, marginTop: 0 }}>Commentaire :</p>
          {editing ? <textarea value={commentaireSens} onChange={e => setCommentaireSens(e.target.value)} style={textareaStyle} /> : <div style={{ fontSize: 12, lineHeight: 1.5, whiteSpace: 'pre-wrap', minHeight: 16 }}>{commentaireSens}</div>}
        </div>
      </div>
    </div>
  );
}

export default Note16B;
