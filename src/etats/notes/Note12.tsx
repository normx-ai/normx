import React, { useState, useRef, useEffect } from 'react';
import { LuDownload, LuArrowLeft, LuEye, LuX, LuPrinter, LuSave, LuPenLine, LuPlus, LuTrash2 } from 'react-icons/lu';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import '../BilanSYCEBNL.css';
import '../FicheIdentification.css';
import type { Exercice, EtatBaseProps, BalanceLigne } from '../../types';

interface Note12Props extends EtatBaseProps {
  onGoToParametres?: () => void;
}

interface LigneEcart {
  libelle: string;
  devises: string;
  montantDevises: string;
  coursAcquisition: string;
  cours3112: string;
  variationAbsolue: string;
}

interface LigneTransfert {
  libelle: string;
  anneeN: string;
  anneeN1: string;
}

const emptyEcart = (): LigneEcart => ({ libelle: '', devises: '', montantDevises: '', coursAcquisition: '', cours3112: '', variationAbsolue: '' });
const emptyTransfert = (): LigneTransfert => ({ libelle: '', anneeN: '', anneeN1: '' });

function Note12({ entiteName, entiteNif = '', entiteId, offre, onBack }: Note12Props): React.JSX.Element {
  const [exercices, setExercices] = useState<Exercice[]>([]);
  const [selectedExercice, setSelectedExercice] = useState<Exercice | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [pdfBlob, setPdfBlob] = useState<Blob | null>(null);
  const [params, setParams] = useState<Record<string, string>>({});
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const [ecartsActif, setEcartsActif] = useState<LigneEcart[]>([emptyEcart(), emptyEcart(), emptyEcart()]);
  const [ecartsPassif, setEcartsPassif] = useState<LigneEcart[]>([emptyEcart(), emptyEcart(), emptyEcart()]);
  const [commentaireEcarts, setCommentaireEcarts] = useState('• Faire un commentaire');

  const [transfertsExploitation, setTransfertsExploitation] = useState<LigneTransfert[]>([emptyTransfert(), emptyTransfert()]);
  const [transfertsFinancieres, setTransfertsFinancieres] = useState<LigneTransfert[]>([emptyTransfert(), emptyTransfert()]);
  const [commentaireTransferts, setCommentaireTransferts] = useState('• Faire un commentaire');

  const pageRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!entiteId) return;
    fetch('/api/entites/' + entiteId)
      .then(r => r.json())
      .then(ent => {
        const data = ent.data || {};
        setParams(data);
        if (data['note12_ecarts_actif']) { try { const p = JSON.parse(data['note12_ecarts_actif']); if (Array.isArray(p) && p.length > 0) setEcartsActif(p); } catch { /* */ } }
        if (data['note12_ecarts_passif']) { try { const p = JSON.parse(data['note12_ecarts_passif']); if (Array.isArray(p) && p.length > 0) setEcartsPassif(p); } catch { /* */ } }
        if (data['note12_transferts_exploitation']) { try { const p = JSON.parse(data['note12_transferts_exploitation']); if (Array.isArray(p) && p.length > 0) setTransfertsExploitation(p); } catch { /* */ } }
        if (data['note12_transferts_financieres']) { try { const p = JSON.parse(data['note12_transferts_financieres']); if (Array.isArray(p) && p.length > 0) setTransfertsFinancieres(p); } catch { /* */ } }
        setCommentaireEcarts(data['note12_commentaire_ecarts'] || '• Faire un commentaire');
        setCommentaireTransferts(data['note12_commentaire_transferts'] || '• Faire un commentaire');
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
        note12_ecarts_actif: JSON.stringify(ecartsActif),
        note12_ecarts_passif: JSON.stringify(ecartsPassif),
        note12_transferts_exploitation: JSON.stringify(transfertsExploitation),
        note12_transferts_financieres: JSON.stringify(transfertsFinancieres),
        note12_commentaire_ecarts: commentaireEcarts,
        note12_commentaire_transferts: commentaireTransferts,
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

  const updateEcart = (setter: React.Dispatch<React.SetStateAction<LigneEcart[]>>, idx: number, field: keyof LigneEcart, value: string) => {
    setter(prev => prev.map((l, i) => i === idx ? { ...l, [field]: value } : l));
  };
  const updateTransfert = (setter: React.Dispatch<React.SetStateAction<LigneTransfert[]>>, idx: number, field: keyof LigneTransfert, value: string) => {
    setter(prev => prev.map((l, i) => i === idx ? { ...l, [field]: value } : l));
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
  const downloadPDF = () => { if (!pdfBlob) return; const url = URL.createObjectURL(pdfBlob); const a = document.createElement('a'); a.href = url; a.download = 'Note12_' + annee + '.pdf'; a.click(); URL.revokeObjectURL(url); };
  const printPDF = () => { if (!previewUrl) return; const w = window.open(previewUrl); if (w) { w.onload = () => w.print(); } };

  // Styles
  const thStyle: React.CSSProperties = { border: '0.5px solid #000', padding: '5px 8px', fontSize: 11, fontWeight: 700, textAlign: 'center', verticalAlign: 'middle', background: '#f5f5f5' };
  const tdStyle: React.CSSProperties = { border: '0.5px solid #000', padding: '5px 8px', fontSize: 11, verticalAlign: 'middle' };
  const tdRight: React.CSSProperties = { ...tdStyle, textAlign: 'right', fontVariantNumeric: 'tabular-nums' };
  const inputSt: React.CSSProperties = { width: '100%', padding: '5px 8px', fontSize: 12, border: '1px solid #D4A843', borderRadius: 2, background: '#fffbf0', textAlign: 'right', boxSizing: 'border-box' };
  const inputLeft: React.CSSProperties = { ...inputSt, textAlign: 'left' };
  const textareaStyle: React.CSSProperties = { width: '100%', minHeight: 40, padding: '8px 10px', fontSize: 12, lineHeight: '1.6', border: '1px solid #D4A843', borderRadius: 3, background: '#fffbf0', fontFamily: 'inherit', boxSizing: 'border-box', resize: 'vertical' };

  const renderInput = (value: string, onChange: (v: string) => void, style = inputSt) => {
    if (!editing) return value;
    return <input value={value} onChange={e => onChange(e.target.value)} style={style} />;
  };

  const renderEcartRows = (lignes: LigneEcart[], setter: React.Dispatch<React.SetStateAction<LigneEcart[]>>, sectionLabel: string) => (
    <>
      <tr>
        <td style={{ ...tdStyle, fontWeight: 600, fontStyle: 'italic' }} colSpan={6}>{sectionLabel}</td>
      </tr>
      {lignes.map((l, i) => (
        <tr key={i}>
          <td style={tdStyle}>
            {editing ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <input value={l.libelle} onChange={e => updateEcart(setter, i, 'libelle', e.target.value)} style={inputLeft} />
                <button onClick={() => setter(prev => prev.filter((_, j) => j !== i))} style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer', padding: 2, flexShrink: 0 }}><LuTrash2 size={12} /></button>
              </div>
            ) : l.libelle}
          </td>
          <td style={tdStyle}>{renderInput(l.devises, v => updateEcart(setter, i, 'devises', v), inputLeft)}</td>
          <td style={tdRight}>{renderInput(l.montantDevises, v => updateEcart(setter, i, 'montantDevises', v))}</td>
          <td style={tdRight}>{renderInput(l.coursAcquisition, v => updateEcart(setter, i, 'coursAcquisition', v))}</td>
          <td style={tdRight}>{renderInput(l.cours3112, v => updateEcart(setter, i, 'cours3112', v))}</td>
          <td style={tdRight}>{renderInput(l.variationAbsolue, v => updateEcart(setter, i, 'variationAbsolue', v))}</td>
        </tr>
      ))}
      {editing && (
        <tr className="no-print">
          <td colSpan={6} style={{ border: 'none', padding: '2px 0' }}>
            <button onClick={() => setter(prev => [...prev, emptyEcart()])} style={{ background: 'none', border: 'none', color: '#D4A843', cursor: 'pointer', fontSize: 11 }}><LuPlus size={12} /> Ajouter une ligne</button>
          </td>
        </tr>
      )}
    </>
  );

  const renderTransfertRows = (lignes: LigneTransfert[], setter: React.Dispatch<React.SetStateAction<LigneTransfert[]>>, sectionLabel: string) => (
    <>
      <tr>
        <td style={{ ...tdStyle, fontWeight: 600, fontStyle: 'italic' }} colSpan={4}>{sectionLabel}</td>
      </tr>
      {lignes.map((l, i) => (
        <tr key={i}>
          <td style={tdStyle}>
            {editing ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <input value={l.libelle} onChange={e => updateTransfert(setter, i, 'libelle', e.target.value)} style={inputLeft} />
                <button onClick={() => setter(prev => prev.filter((_, j) => j !== i))} style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer', padding: 2, flexShrink: 0 }}><LuTrash2 size={12} /></button>
              </div>
            ) : l.libelle}
          </td>
          <td style={tdRight}>{renderInput(l.anneeN, v => updateTransfert(setter, i, 'anneeN', v))}</td>
          <td style={tdRight}>{renderInput(l.anneeN1, v => updateTransfert(setter, i, 'anneeN1', v))}</td>
          <td style={{ ...tdRight, background: '#fafafa' }}>
            {(() => { const n = parseN(l.anneeN); const n1 = parseN(l.anneeN1); return n1 !== 0 ? ((n - n1) / Math.abs(n1) * 100).toFixed(1) + ' %' : ''; })()}
          </td>
        </tr>
      ))}
      {editing && (
        <tr className="no-print">
          <td colSpan={4} style={{ border: 'none', padding: '2px 0' }}>
            <button onClick={() => setter(prev => [...prev, emptyTransfert()])} style={{ background: 'none', border: 'none', color: '#D4A843', cursor: 'pointer', fontSize: 11 }}><LuPlus size={12} /> Ajouter une ligne</button>
          </td>
        </tr>
      )}
    </>
  );

  return (
    <div>
      <div className="etat-toolbar">
        <button className="etat-back-btn" onClick={onBack}><LuArrowLeft size={18} /> Retour</button>
        <div className="etat-toolbar-title">Note 12 — Écarts de conversion et Transferts de charges</div>
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
              <span>Aperçu — Note 12</span>
              <div className="etat-preview-actions">
                <button onClick={printPDF} title="Imprimer"><LuPrinter size={18} /></button>
                <button onClick={downloadPDF} title="Télécharger"><LuDownload size={18} /></button>
                <button onClick={closePreview}><LuX size={18} /></button>
              </div>
            </div>
            <iframe src={previewUrl} className="etat-preview-iframe" title="Aperçu Note 12" />
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
          NOTE 12 — ECARTS DE CONVERSION
        </h3>

        {/* Tableau Écarts de conversion */}
        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 0 }}>
          <thead>
            <tr>
              <th style={{ ...thStyle, width: '30%' }}>Libellés</th>
              <th style={thStyle}>Devises</th>
              <th style={thStyle}>Montant en devises</th>
              <th style={thStyle}>Cours UML Année acquisition</th>
              <th style={thStyle}>Cours UML 31/12</th>
              <th style={thStyle}>Variation en valeur absolue</th>
            </tr>
          </thead>
          <tbody>
            {renderEcartRows(ecartsActif, setEcartsActif, 'Ecarts de conversion actif : détailler les créances et dettes concernées')}
            {renderEcartRows(ecartsPassif, setEcartsPassif, 'Ecart de conversion passif : détailler les créances et dettes concernées')}
          </tbody>
        </table>

        {/* Commentaire écarts */}
        <div style={{ border: '0.5px solid #000', borderTop: 'none', padding: '10px 12px', marginBottom: 20 }}>
          <p style={{ fontSize: 12, fontWeight: 700, marginBottom: 6, marginTop: 0 }}>Commentaire :</p>
          {editing ? (
            <textarea value={commentaireEcarts} onChange={e => setCommentaireEcarts(e.target.value)} style={textareaStyle} />
          ) : (
            <div style={{ fontSize: 12, lineHeight: 1.6, whiteSpace: 'pre-wrap', minHeight: 20 }}>{commentaireEcarts}</div>
          )}
        </div>

        {/* Titre Transferts */}
        <div style={{ textAlign: 'center', fontWeight: 700, fontSize: 14, margin: '16px 0 8px' }}>TRANSFERTS DE CHARGES</div>

        {/* Tableau Transferts de charges */}
        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 0 }}>
          <thead>
            <tr>
              <th style={{ ...thStyle, width: '50%' }}>Libellés</th>
              <th style={thStyle}>Année N</th>
              <th style={thStyle}>Année N-1</th>
              <th style={thStyle}>Variation en %</th>
            </tr>
          </thead>
          <tbody>
            {renderTransfertRows(transfertsExploitation, setTransfertsExploitation, 'Transferts de charges d\'exploitation : détailler la nature des charges transférées')}
            {renderTransfertRows(transfertsFinancieres, setTransfertsFinancieres, 'Transferts de charges financières : détailler la nature des charges transférées')}
          </tbody>
        </table>

        {/* Commentaire transferts */}
        <div style={{ border: '0.5px solid #000', borderTop: 'none', padding: '10px 12px' }}>
          <p style={{ fontSize: 12, fontWeight: 700, marginBottom: 6, marginTop: 0 }}>Commentaire :</p>
          {editing ? (
            <textarea value={commentaireTransferts} onChange={e => setCommentaireTransferts(e.target.value)} style={textareaStyle} />
          ) : (
            <div style={{ fontSize: 12, lineHeight: 1.6, whiteSpace: 'pre-wrap', minHeight: 20 }}>{commentaireTransferts}</div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Note12;
