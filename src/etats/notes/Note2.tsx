import React, { useState, useRef, useEffect } from 'react';
import { LuDownload, LuArrowLeft, LuEye, LuX, LuPrinter, LuSave, LuPenLine } from 'react-icons/lu';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import '../BilanSYCEBNL.css';
import '../FicheIdentification.css';
import type { Exercice, EtatBaseProps } from '../../types';

interface Note2Props extends EtatBaseProps {
  onGoToParametres?: () => void;
}

const SECTIONS = [
  {
    key: 'A',
    title: 'A - DECLARATION DE CONFORMITE AU SYSCOHADA',
    defaultText: 'Les états financiers sont établis en conformité avec le Système comptable OHADA et l\'Acte uniforme relatif au droit comptable et à l\'information financière.',
  },
  {
    key: 'B',
    title: 'B - REGLES ET METHODES COMPTABLES',
    defaultText: 'Les états financiers ont été confectionnés dans le respect des postulats, des conventions et des règles d\'évaluation édictés par le SYSCOHADA et l\'Acte Uniforme.',
  },
  {
    key: 'C',
    title: 'C- DEROGATION AUX POSTULATS ET CONVENTIONS COMPTABLES',
    defaultText: 'Respect de tous les postulats et conventions comptables sans aucune dérogation.',
  },
  {
    key: 'D',
    title: 'D - INFORMATIONS COMPLEMENTAIRES RELATIVES AU BILAN, AU COMPTE DE RESULTAT ET AU TABLEAU DES FLUX DE TRESORERIE',
    defaultText: 'Pas d\'informations complémentaires relatives aux autres états financiers.',
  },
];

function Note2({ entiteName, entiteNif = '', entiteId, onBack }: Note2Props): React.JSX.Element {
  const [exercices, setExercices] = useState<Exercice[]>([]);
  const [selectedExercice, setSelectedExercice] = useState<Exercice | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [pdfBlob, setPdfBlob] = useState<Blob | null>(null);
  const [params, setParams] = useState<Record<string, string>>({});
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [texts, setTexts] = useState<Record<string, string>>({});

  const pageRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!entiteId) return;
    fetch('/api/entites/' + entiteId)
      .then(r => r.json())
      .then(ent => {
        const data = ent.data || {};
        setParams(data);
        const t: Record<string, string> = {};
        SECTIONS.forEach(s => {
          t[s.key] = data['note2_' + s.key] || s.defaultText;
        });
        setTexts(t);
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
      const data: Record<string, string> = { ...params };
      SECTIONS.forEach(s => {
        data['note2_' + s.key] = texts[s.key] || s.defaultText;
      });
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
    pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
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
    a.download = 'Note2_' + annee + '.pdf';
    a.click();
    URL.revokeObjectURL(url);
  };

  const printPDF = () => {
    if (!previewUrl) return;
    const w = window.open(previewUrl);
    if (w) { w.onload = () => w.print(); }
  };

  return (
    <div>
      {/* Toolbar */}
      <div className="etat-toolbar">
        <button className="etat-back-btn" onClick={onBack}><LuArrowLeft size={18} /> Retour</button>
        <div className="etat-toolbar-title">Note 2 — Informations obligatoires</div>
        <div className="etat-toolbar-actions">
          <select
            className="etat-exercice-select"
            value={selectedExercice?.id || ''}
            onChange={e => {
              const ex = exercices.find(ex => ex.id === Number(e.target.value));
              if (ex) setSelectedExercice(ex);
            }}
          >
            {exercices.map(ex => (
              <option key={ex.id} value={ex.id}>{ex.annee}</option>
            ))}
          </select>
          {!editing ? (
            <button className="etat-action-btn" onClick={() => setEditing(true)} style={{ background: '#D4A843', color: '#fff', border: 'none' }}>
              <LuPenLine size={16} /> Modifier
            </button>
          ) : (
            <button
              className="etat-action-btn"
              onClick={handleSave}
              disabled={saving}
              style={{ background: '#059669', color: '#fff', border: 'none' }}
            >
              <LuSave size={16} /> {saving ? 'Sauvegarde...' : saved ? 'Sauvegardé' : 'Sauvegarder'}
            </button>
          )}
          <button className="etat-action-btn" onClick={openPreview}><LuEye size={16} /> Aperçu</button>
        </div>
      </div>

      {/* Preview modal */}
      {previewUrl && (
        <div className="etat-preview-overlay" onClick={closePreview}>
          <div className="etat-preview-modal" onClick={e => e.stopPropagation()}>
            <div className="etat-preview-header">
              <span>Aperçu — Note 2</span>
              <div className="etat-preview-actions">
                <button onClick={printPDF} title="Imprimer"><LuPrinter size={18} /></button>
                <button onClick={downloadPDF} title="Télécharger"><LuDownload size={18} /></button>
                <button onClick={closePreview}><LuX size={18} /></button>
              </div>
            </div>
            <iframe src={previewUrl} className="etat-preview-iframe" title="Aperçu Note 2" />
          </div>
        </div>
      )}

      {/* Page A4 */}
      <div className="a4-page fi-page" ref={pageRef}>
        {/* En-tête */}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
          <div>
            <div style={{ fontSize: 12 }}><strong>Désignation entité :</strong> {entiteName}</div>
            <div style={{ fontSize: 12 }}><strong>Numéro d'identification :</strong> {entiteNif}</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 12 }}><strong>Exercice clos le</strong> {dateFin ? fmtDateShort(dateFin) : ''}</div>
            <div style={{ fontSize: 12 }}><strong>Durée (en mois)</strong> {duree}</div>
          </div>
        </div>

        {/* Titre */}
        <h3 style={{ textAlign: 'center', fontSize: 14, fontWeight: 700, margin: '10px 0 20px', textDecoration: 'underline' }}>
          NOTE 2 — INFORMATIONS OBLIGATOIRES
        </h3>

        {/* Sections */}
        {SECTIONS.map(s => (
          <div key={s.key} style={{ marginBottom: 30 }}>
            <div style={{
              textAlign: 'center',
              fontWeight: 700,
              fontSize: 12,
              padding: '8px 10px',
              borderTop: '1px solid #000',
              borderBottom: '1px solid #000',
            }}>
              {s.title}
            </div>
            <div style={{ padding: '16px 10px', minHeight: 100 }}>
              {editing ? (
                <textarea
                  value={texts[s.key] || ''}
                  onChange={e => setTexts(prev => ({ ...prev, [s.key]: e.target.value }))}
                  style={{
                    width: '100%',
                    minHeight: 80,
                    padding: '8px 10px',
                    fontSize: 12,
                    lineHeight: '1.8',
                    border: '1px solid #D4A843',
                    borderRadius: 4,
                    background: '#fffbf0',
                    fontFamily: 'inherit',
                    boxSizing: 'border-box',
                    resize: 'vertical',
                  }}
                />
              ) : (
                <p style={{ fontSize: 12, lineHeight: 1.8, margin: 0, whiteSpace: 'pre-wrap' }}>
                  {texts[s.key] || ''}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default Note2;
