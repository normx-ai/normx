import React, { useState, useRef, useEffect } from 'react';
import { LuDownload, LuArrowLeft, LuEye, LuX, LuPrinter, LuSave, LuPenLine, LuPlus, LuTrash2 } from 'react-icons/lu';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import '../BilanSYCEBNL.css';
import '../FicheIdentification.css';
import type { Exercice, EtatBaseProps } from '../../types';

interface Note13Props extends EtatBaseProps {
  onGoToParametres?: () => void;
}

interface LigneActionnaire {
  nom: string;
  nationalite: string;
  nature: string;
  nombre: string;
  montantTotal: string;
  cessions: string;
}

const emptyLigne = (): LigneActionnaire => ({ nom: '', nationalite: '', nature: '', nombre: '', montantTotal: '', cessions: '' });

function Note13({ entiteName, entiteNif = '', entiteId, offre, onBack }: Note13Props): React.JSX.Element {
  const [exercices, setExercices] = useState<Exercice[]>([]);
  const [selectedExercice, setSelectedExercice] = useState<Exercice | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [pdfBlob, setPdfBlob] = useState<Blob | null>(null);
  const [params, setParams] = useState<Record<string, string>>({});
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const [valeurNominale, setValeurNominale] = useState('');
  const [lignes, setLignes] = useState<LigneActionnaire[]>([emptyLigne(), emptyLigne(), emptyLigne(), emptyLigne(), emptyLigne(), emptyLigne(), emptyLigne(), emptyLigne()]);
  const [capitalNonAppeleNombre, setCapitalNonAppeleNombre] = useState('');
  const [capitalNonAppeleMontant, setCapitalNonAppeleMontant] = useState('');

  const DEFAULT_COMMENTAIRE = `• Indiquer si possible le montant du capital à la constitution.\n• Indiquer si possible les dates des AGE et le montant du capital augmenté en cas d'augmentation de capital.\n• Indiquer si possible les dates des AGE et le montant du capital diminué en cas de réduction de capital.\n• Indiquer les avantages accordés aux actions de préférence.\n• Apporteurs, capital non appelé : indiquer le délai restant pour appeler le capital.`;
  const [commentaire, setCommentaire] = useState(DEFAULT_COMMENTAIRE);

  const pageRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!entiteId) return;
    fetch('/api/entites/' + entiteId)
      .then(r => r.json())
      .then(ent => {
        const data = ent.data || {};
        setParams(data);
        setValeurNominale(data['note13_valeur_nominale'] || '');
        setCapitalNonAppeleNombre(data['note13_capital_non_appele_nombre'] || '');
        setCapitalNonAppeleMontant(data['note13_capital_non_appele_montant'] || '');
        setCommentaire(data['note13_commentaire'] || DEFAULT_COMMENTAIRE);
        if (data['note13_lignes']) {
          try { const p = JSON.parse(data['note13_lignes']); if (Array.isArray(p) && p.length > 0) setLignes(p); } catch { /* */ }
        }
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
          const now = new Date();
          const year = now.getFullYear();
          const month = now.getMonth();
          const preferYear = month <= 2 ? year - 1 : year;
          const pick = data.find(e => e.annee === preferYear) || data.find(e => e.annee === year) || data.find(e => e.annee === year - 1) || data[0];
          setSelectedExercice(pick);
        }
      })
      .catch(() => {});
  }, [entiteId]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const data: Record<string, string> = {
        ...params,
        note13_valeur_nominale: valeurNominale,
        note13_lignes: JSON.stringify(lignes),
        note13_capital_non_appele_nombre: capitalNonAppeleNombre,
        note13_capital_non_appele_montant: capitalNonAppeleMontant,
        note13_commentaire: commentaire,
      };
      const res = await fetch(`/api/entites/${entiteId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data }),
      });
      if (res.ok) { setParams(data); setSaved(true); setEditing(false); setTimeout(() => setSaved(false), 3000); }
    } catch { /* */ }
    setSaving(false);
  };

  const duree = selectedExercice?.duree_mois || 12;
  const dateFin = selectedExercice?.date_fin ? new Date(selectedExercice.date_fin) : null;
  const annee = selectedExercice ? selectedExercice.annee : new Date().getFullYear();
  const fmtDateShort = (d: Date | null): string => { if (!d) return ''; return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' }); };

  const parseN = (v: string): number => { const n = parseFloat(v.replace(/\s/g, '').replace(',', '.')); return isNaN(n) ? 0 : n; };
  const fmtM = (v: number): string => v === 0 ? '' : Math.round(v).toLocaleString('fr-FR');

  // Totaux
  const totalNombre = lignes.reduce((s, l) => s + parseN(l.nombre), 0) + parseN(capitalNonAppeleNombre);
  const totalMontant = lignes.reduce((s, l) => s + parseN(l.montantTotal), 0) + parseN(capitalNonAppeleMontant);
  const totalCessions = lignes.reduce((s, l) => s + parseN(l.cessions), 0);

  const updateLigne = (idx: number, field: keyof LigneActionnaire, value: string) => {
    setLignes(prev => prev.map((l, i) => i === idx ? { ...l, [field]: value } : l));
  };

  // PDF
  const generatePDF = async (): Promise<jsPDF> => {
    const wasEditing = editing;
    if (wasEditing) setEditing(false);
    await new Promise(r => setTimeout(r, 100));
    const pdf = new jsPDF('p', 'mm', 'a4');
    if (!pageRef.current) return pdf;
    const canvas = await html2canvas(pageRef.current, { scale: 2, useCORS: true, backgroundColor: '#ffffff' });
    const imgData = canvas.toDataURL('image/png');
    const pdfWidth = 210;
    const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
    pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, Math.min(pdfHeight, 297));
    if (wasEditing) setEditing(true);
    return pdf;
  };

  const openPreview = async () => { const pdf = await generatePDF(); const blob = pdf.output('blob'); setPdfBlob(blob); setPreviewUrl(URL.createObjectURL(blob)); };
  const closePreview = () => { if (previewUrl) URL.revokeObjectURL(previewUrl); setPreviewUrl(null); setPdfBlob(null); };
  const downloadPDF = () => { if (!pdfBlob) return; const url = URL.createObjectURL(pdfBlob); const a = document.createElement('a'); a.href = url; a.download = 'Note13_' + annee + '.pdf'; a.click(); URL.revokeObjectURL(url); };
  const printPDF = () => { if (!previewUrl) return; const w = window.open(previewUrl); if (w) { w.onload = () => w.print(); } };

  // Styles
  const thStyle: React.CSSProperties = { border: '0.5px solid #000', padding: '10px 14px', fontSize: 12, fontWeight: 700, textAlign: 'center', verticalAlign: 'middle', background: '#f5f5f5' };
  const tdStyle: React.CSSProperties = { border: '0.5px solid #000', padding: '10px 14px', fontSize: 12, verticalAlign: 'middle' };
  const tdRight: React.CSSProperties = { ...tdStyle, textAlign: 'right', fontVariantNumeric: 'tabular-nums' };
  const tdBold: React.CSSProperties = { ...tdStyle, fontWeight: 700 };
  const tdBoldRight: React.CSSProperties = { ...tdRight, fontWeight: 700 };
  const inputSt: React.CSSProperties = { width: '100%', padding: '5px 8px', fontSize: 12, border: '1px solid #D4A843', borderRadius: 2, background: '#fffbf0', textAlign: 'right', boxSizing: 'border-box' };
  const inputLeft: React.CSSProperties = { ...inputSt, textAlign: 'left' };
  const textareaStyle: React.CSSProperties = { width: '100%', minHeight: 70, padding: '8px 10px', fontSize: 12, lineHeight: '1.6', border: '1px solid #D4A843', borderRadius: 3, background: '#fffbf0', fontFamily: 'inherit', boxSizing: 'border-box', resize: 'vertical' };

  const renderInput = (value: string, onChange: (v: string) => void, style = inputSt) => {
    if (!editing) return value;
    return <input value={value} onChange={e => onChange(e.target.value)} style={style} />;
  };

  return (
    <div>
      <div className="etat-toolbar">
        <button className="etat-back-btn" onClick={onBack}><LuArrowLeft size={18} /> Retour</button>
        <div className="etat-toolbar-title">Note 13 — Capital</div>
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
              <span>Aperçu — Note 13</span>
              <div className="etat-preview-actions">
                <button onClick={printPDF} title="Imprimer"><LuPrinter size={18} /></button>
                <button onClick={downloadPDF} title="Télécharger"><LuDownload size={18} /></button>
                <button onClick={closePreview}><LuX size={18} /></button>
              </div>
            </div>
            <iframe src={previewUrl} className="etat-preview-iframe" title="Aperçu Note 13" />
          </div>
        </div>
      )}

      <div ref={pageRef} style={{
        width: '210mm', minHeight: '297mm', background: '#fff',
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
        </div>
        <h3 style={{ textAlign: 'center', fontSize: 14, fontWeight: 700, margin: '30px 0 20px', textDecoration: 'underline' }}>
          NOTE 13 — CAPITAL
        </h3>

        {/* Valeur nominale */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
          <span style={{ fontSize: 12, fontWeight: 700 }}>Valeur nominale des actions ou des parts :</span>
          {renderInput(valeurNominale, setValeurNominale, { ...inputSt, width: 150 })}
        </div>

        {/* Tableau */}
        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 0 }}>
          <thead>
            <tr>
              <th style={{ ...thStyle, width: '28%' }}>Nom et prénoms</th>
              <th style={thStyle}>Nationalité</th>
              <th style={thStyle}>Nature des actions ou parts (Ordinaires ou préférences)</th>
              <th style={thStyle}>Nombre</th>
              <th style={thStyle}>Montant total</th>
              <th style={thStyle}>Cessions enregistrements au cours d'exercice</th>
            </tr>
          </thead>
          <tbody>
            {lignes.map((l, i) => (
              <tr key={i}>
                <td style={tdStyle}>
                  {editing ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <input value={l.nom} onChange={e => updateLigne(i, 'nom', e.target.value)} style={inputLeft} />
                      <button onClick={() => setLignes(prev => prev.filter((_, j) => j !== i))} style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer', padding: 2, flexShrink: 0 }}><LuTrash2 size={12} /></button>
                    </div>
                  ) : l.nom}
                </td>
                <td style={tdStyle}>{renderInput(l.nationalite, v => updateLigne(i, 'nationalite', v), inputLeft)}</td>
                <td style={tdStyle}>{renderInput(l.nature, v => updateLigne(i, 'nature', v), inputLeft)}</td>
                <td style={tdRight}>{renderInput(l.nombre, v => updateLigne(i, 'nombre', v))}</td>
                <td style={tdRight}>{renderInput(l.montantTotal, v => updateLigne(i, 'montantTotal', v))}</td>
                <td style={tdRight}>{renderInput(l.cessions, v => updateLigne(i, 'cessions', v))}</td>
              </tr>
            ))}

            {editing && (
              <tr className="no-print">
                <td colSpan={6} style={{ border: 'none', padding: '4px 0' }}>
                  <button onClick={() => setLignes(prev => [...prev, emptyLigne()])} style={{ background: '#D4A843', color: '#fff', border: 'none', borderRadius: 4, padding: '4px 12px', fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
                    <LuPlus size={14} /> Ajouter un actionnaire
                  </button>
                </td>
              </tr>
            )}

            {/* Capital non appelé */}
            <tr>
              <td style={tdBold} colSpan={3}>Apporteurs, capital non appelé</td>
              <td style={tdRight}>{renderInput(capitalNonAppeleNombre, setCapitalNonAppeleNombre)}</td>
              <td style={tdRight}>{renderInput(capitalNonAppeleMontant, setCapitalNonAppeleMontant)}</td>
              <td style={tdRight}></td>
            </tr>

            {/* Total */}
            <tr>
              <td style={{ ...tdBold, background: '#f0f0f0' }} colSpan={3}>TOTAL</td>
              <td style={{ ...tdBoldRight, background: '#f0f0f0' }}>{fmtM(totalNombre)}</td>
              <td style={{ ...tdBoldRight, background: '#f0f0f0' }}>{fmtM(totalMontant)}</td>
              <td style={{ ...tdBoldRight, background: '#f0f0f0' }}>{fmtM(totalCessions)}</td>
            </tr>
          </tbody>
        </table>

        {/* Commentaire */}
        <div style={{ border: '0.5px solid #000', borderTop: 'none', padding: '10px 12px' }}>
          <p style={{ fontSize: 12, fontWeight: 700, marginBottom: 6, marginTop: 0 }}>Commentaire :</p>
          {editing ? (
            <textarea value={commentaire} onChange={e => setCommentaire(e.target.value)} style={textareaStyle} />
          ) : (
            <div style={{ fontSize: 12, lineHeight: 1.6, whiteSpace: 'pre-wrap', minHeight: 50 }}>{commentaire}</div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Note13;
