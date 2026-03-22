import React, { useState, useRef, useEffect } from 'react';
import { LuDownload, LuArrowLeft, LuEye, LuX, LuPrinter, LuSave, LuPenLine, LuPlus, LuTrash2 } from 'react-icons/lu';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import '../BilanSYCEBNL.css';
import '../FicheIdentification.css';
import type { Exercice, EtatBaseProps } from '../../types';

interface Note3EProps extends EtatBaseProps {
  onGoToParametres?: () => void;
}

interface LigneReeval {
  element: string;
  montant: string;
  amortSupp: string;
}

const emptyLigne = (): LigneReeval => ({ element: '', montant: '', amortSupp: '' });

function Note3E({ entiteName, entiteNif = '', entiteId, offre, onBack }: Note3EProps): React.JSX.Element {
  const [exercices, setExercices] = useState<Exercice[]>([]);
  const [selectedExercice, setSelectedExercice] = useState<Exercice | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [pdfBlob, setPdfBlob] = useState<Blob | null>(null);
  const [params, setParams] = useState<Record<string, string>>({});
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Champs éditables
  const [natureDate, setNatureDate] = useState('');
  const [lignes, setLignes] = useState<LigneReeval[]>([emptyLigne(), emptyLigne(), emptyLigne(), emptyLigne(), emptyLigne(), emptyLigne(), emptyLigne(), emptyLigne()]);
  const [methode, setMethode] = useState('');
  const [traitementFiscal, setTraitementFiscal] = useState('');
  const [ecartIncorpore, setEcartIncorpore] = useState('');

  const pageRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!entiteId) return;
    fetch('/api/entites/' + entiteId)
      .then(r => r.json())
      .then(ent => {
        const data = ent.data || {};
        setParams(data);
        setNatureDate(data['note3e_nature_date'] || '');
        setMethode(data['note3e_methode'] || '');
        setTraitementFiscal(data['note3e_traitement_fiscal'] || '');
        setEcartIncorpore(data['note3e_ecart_incorpore'] || '');
        if (data['note3e_lignes']) {
          try {
            const parsed = JSON.parse(data['note3e_lignes']);
            if (Array.isArray(parsed) && parsed.length > 0) setLignes(parsed);
          } catch { /* */ }
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
          const pick = data.find(e => e.annee === preferYear)
            || data.find(e => e.annee === year)
            || data.find(e => e.annee === year - 1)
            || data[0];
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
        note3e_nature_date: natureDate,
        note3e_methode: methode,
        note3e_traitement_fiscal: traitementFiscal,
        note3e_ecart_incorpore: ecartIncorpore,
        note3e_lignes: JSON.stringify(lignes),
      };
      const res = await fetch(`/api/entites/${entiteId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data }),
      });
      if (res.ok) {
        setParams(data);
        setSaved(true);
        setEditing(false);
        setTimeout(() => setSaved(false), 3000);
      }
    } catch { /* */ }
    setSaving(false);
  };

  const duree = selectedExercice?.duree_mois || 12;
  const dateFin = selectedExercice?.date_fin ? new Date(selectedExercice.date_fin) : null;
  const annee = selectedExercice ? selectedExercice.annee : new Date().getFullYear();

  const fmtDateShort = (d: Date | null): string => {
    if (!d) return '';
    return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  const updateLigne = (idx: number, field: keyof LigneReeval, value: string) => {
    setLignes(prev => prev.map((l, i) => i === idx ? { ...l, [field]: value } : l));
  };

  const addLigne = () => setLignes(prev => [...prev, emptyLigne()]);
  const removeLigne = (idx: number) => setLignes(prev => prev.filter((_, i) => i !== idx));

  const generatePDF = async (): Promise<jsPDF> => {
    const wasEditing = editing;
    if (wasEditing) setEditing(false);
    await new Promise(r => setTimeout(r, 100));
    const pdf = new jsPDF('l', 'mm', 'a4');
    if (!pageRef.current) return pdf;
    const canvas = await html2canvas(pageRef.current, { scale: 2, useCORS: true, backgroundColor: '#ffffff' });
    const imgData = canvas.toDataURL('image/png');
    const pdfWidth = 297;
    const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
    pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, Math.min(pdfHeight, 210));
    if (wasEditing) setEditing(true);
    return pdf;
  };

  const openPreview = async () => {
    const pdf = await generatePDF();
    const blob = pdf.output('blob');
    setPdfBlob(blob);
    setPreviewUrl(URL.createObjectURL(blob));
  };

  const closePreview = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setPdfBlob(null);
  };

  const downloadPDF = () => {
    if (!pdfBlob) return;
    const url = URL.createObjectURL(pdfBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'Note3E_' + annee + '.pdf';
    a.click();
    URL.revokeObjectURL(url);
  };

  const printPDF = () => {
    if (!previewUrl) return;
    const w = window.open(previewUrl);
    if (w) { w.onload = () => w.print(); }
  };

  const thStyle: React.CSSProperties = {
    border: '0.5px solid #000', padding: '10px 14px', fontSize: 12,
    fontWeight: 700, textAlign: 'center', verticalAlign: 'middle', background: '#f5f5f5',
  };
  const tdStyle: React.CSSProperties = {
    border: '0.5px solid #000', padding: '10px 14px', fontSize: 12, verticalAlign: 'middle',
  };
  const tdRight: React.CSSProperties = { ...tdStyle, textAlign: 'right', fontVariantNumeric: 'tabular-nums' };
  const inputSt: React.CSSProperties = {
    width: '100%', padding: '5px 8px', fontSize: 12, border: '1px solid #D4A843',
    borderRadius: 2, background: '#fffbf0', textAlign: 'right', boxSizing: 'border-box',
  };
  const inputLeft: React.CSSProperties = { ...inputSt, textAlign: 'left' };
  const textareaStyle: React.CSSProperties = {
    width: '100%', minHeight: 50, padding: '8px 10px', fontSize: 12,
    lineHeight: '1.6', border: '1px solid #D4A843', borderRadius: 3,
    background: '#fffbf0', fontFamily: 'inherit', boxSizing: 'border-box', resize: 'vertical',
  };
  const sectionStyle: React.CSSProperties = {
    border: '0.5px solid #000', padding: '10px 12px', marginBottom: 0,
  };

  return (
    <div>
      <div className="etat-toolbar">
        <button className="etat-back-btn" onClick={onBack}><LuArrowLeft size={18} /> Retour</button>
        <div className="etat-toolbar-title">Note 3E — Réévaluations effectuées</div>
        <div className="etat-toolbar-actions">
          <select className="etat-exercice-select" value={selectedExercice?.id || ''}
            onChange={e => { const ex = exercices.find(ex => ex.id === Number(e.target.value)); if (ex) setSelectedExercice(ex); }}>
            {exercices.map(ex => (<option key={ex.id} value={ex.id}>{ex.annee}</option>))}
          </select>
          {!editing ? (
            <button className="etat-action-btn" onClick={() => setEditing(true)} style={{ background: '#D4A843', color: '#fff', border: 'none' }}>
              <LuPenLine size={16} /> Modifier
            </button>
          ) : (
            <button className="etat-action-btn" onClick={handleSave} disabled={saving} style={{ background: '#059669', color: '#fff', border: 'none' }}>
              <LuSave size={16} /> {saving ? 'Sauvegarde...' : 'Sauvegarder'}
            </button>
          )}
          <button className="etat-action-btn" onClick={openPreview}><LuEye size={16} /> Aperçu</button>
        </div>
      </div>

      {previewUrl && (
        <div className="etat-preview-overlay" onClick={closePreview}>
          <div className="etat-preview-modal" onClick={e => e.stopPropagation()}>
            <div className="etat-preview-header">
              <span>Aperçu — Note 3E</span>
              <div className="etat-preview-actions">
                <button onClick={printPDF} title="Imprimer"><LuPrinter size={18} /></button>
                <button onClick={downloadPDF} title="Télécharger"><LuDownload size={18} /></button>
                <button onClick={closePreview}><LuX size={18} /></button>
              </div>
            </div>
            <iframe src={previewUrl} className="etat-preview-iframe" title="Aperçu Note 3E" />
          </div>
        </div>
      )}

      <div ref={pageRef} style={{
        width: '297mm', minHeight: '210mm', background: '#fff',
        margin: '0 auto 20px', padding: '8mm 10mm',
        boxShadow: '0 2px 12px rgba(0,0,0,0.1)', boxSizing: 'border-box',
        fontFamily: "'Outfit', 'Segoe UI', Arial, sans-serif", fontSize: 12, color: '#1a1a1a',
      }}>
        {/* Header officiel comme Bilan/CR */}
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
          <div className="etat-sub-titre">NOTE 3E<br />INFORMATIONS SUR LES REEVALUATIONS EFFECTUEES PAR L'ENTITE</div>
        </div>

        {/* Nature et date des réévaluations */}
        <div style={sectionStyle}>
          <p style={{ fontSize: 12, fontWeight: 400, marginBottom: 6, marginTop: 0 }}>Nature et date des réévaluations :</p>
          {editing ? (
            <textarea value={natureDate} onChange={e => setNatureDate(e.target.value)} style={textareaStyle} />
          ) : (
            <p style={{ fontSize: 12, lineHeight: 1.6, margin: 0, whiteSpace: 'pre-wrap', minHeight: 20 }}>{natureDate}</p>
          )}
        </div>

        {/* Tableau des éléments réévalués */}
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={{ ...thStyle, width: '50%' }}>Eléments réévalués par postes du bilan</th>
              <th style={{ ...thStyle, width: '25%' }}>Montants coûts historiques</th>
              <th style={{ ...thStyle, width: '25%' }}>Amortissements supplémentaires</th>
            </tr>
          </thead>
          <tbody>
            {lignes.map((l, i) => (
              <tr key={i}>
                <td style={tdStyle}>
                  {editing ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <input value={l.element} onChange={e => updateLigne(i, 'element', e.target.value)} style={inputLeft} />
                      <button onClick={() => removeLigne(i)} style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer', padding: 2, flexShrink: 0 }}>
                        <LuTrash2 size={14} />
                      </button>
                    </div>
                  ) : l.element}
                </td>
                <td style={tdRight}>
                  {editing ? (
                    <input value={l.montant} onChange={e => updateLigne(i, 'montant', e.target.value)} style={inputSt} />
                  ) : l.montant}
                </td>
                <td style={tdRight}>
                  {editing ? (
                    <input value={l.amortSupp} onChange={e => updateLigne(i, 'amortSupp', e.target.value)} style={inputSt} />
                  ) : l.amortSupp}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {editing && (
          <div style={{ marginTop: 6, marginBottom: 10 }} className="no-print">
            <button onClick={addLigne} style={{ background: '#D4A843', color: '#fff', border: 'none', borderRadius: 4, padding: '4px 12px', fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
              <LuPlus size={14} /> Ajouter une ligne
            </button>
          </div>
        )}

        {/* Méthode de réévaluation utilisée */}
        <div style={sectionStyle}>
          <p style={{ fontSize: 12, fontWeight: 400, marginBottom: 6, marginTop: 0 }}>Méthode de réévaluation utilisée :</p>
          {editing ? (
            <textarea value={methode} onChange={e => setMethode(e.target.value)} style={textareaStyle} />
          ) : (
            <p style={{ fontSize: 12, lineHeight: 1.6, margin: 0, whiteSpace: 'pre-wrap', minHeight: 20 }}>{methode}</p>
          )}
        </div>

        {/* Traitement fiscal */}
        <div style={sectionStyle}>
          <p style={{ fontSize: 12, fontWeight: 400, marginBottom: 6, marginTop: 0 }}>Traitement fiscal de l'écart de réévaluation et des amortissements supplémentaires :</p>
          {editing ? (
            <textarea value={traitementFiscal} onChange={e => setTraitementFiscal(e.target.value)} style={textareaStyle} />
          ) : (
            <p style={{ fontSize: 12, lineHeight: 1.6, margin: 0, whiteSpace: 'pre-wrap', minHeight: 20 }}>{traitementFiscal}</p>
          )}
        </div>

        {/* Montant de l'écart incorporé au capital */}
        <div style={sectionStyle}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 12, fontWeight: 400 }}>Montant de l'écart incorporé au capital :</span>
            {editing ? (
              <input value={ecartIncorpore} onChange={e => setEcartIncorpore(e.target.value)}
                style={{ ...inputSt, width: 200 }} />
            ) : (
              <span style={{ fontSize: 14 }}>{ecartIncorpore}</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default Note3E;
