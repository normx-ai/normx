import React, { useState, useRef, useEffect } from 'react';
import { LuDownload, LuArrowLeft, LuEye, LuX, LuPrinter, LuSave, LuPenLine , LuEyeOff } from 'react-icons/lu';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import '../BilanSYCEBNL.css';
import '../FicheIdentification.css';
import type { EtatBaseProps, BalanceLigne } from '../../types';
import { useNoteData } from './useNoteData';
import BalanceSourcePanel from './BalanceSourcePanel';

interface Note5Props extends EtatBaseProps {
  onGoToParametres?: () => void;
}

// Mapping comptes SYSCOHADA — Actif circulant HAO
interface RubriqueHAO {
  label: string;
  prefixes: string[];
}

const RUBRIQUES_ACTIF: RubriqueHAO[] = [
  { label: 'Créances sur cessions d\'immobilisations', prefixes: ['485'] },
  { label: 'Autres créances hors activités ordinaires', prefixes: ['488'] },
];

const RUBRIQUES_DEPRECIATION: RubriqueHAO[] = [
  { label: 'Dépréciations des créances HAO', prefixes: ['498'] },
];

// Dettes circulantes HAO
const RUBRIQUES_DETTES: RubriqueHAO[] = [
  { label: 'Fournisseurs d\'investissements', prefixes: ['481'] },
  { label: 'Fournisseurs d\'investissements, effets à payer', prefixes: ['482'] },
  { label: 'Versements restant à effectuer sur titres de participation et titres immobilisés non libérés', prefixes: ['483'] },
  { label: 'Autres dettes hors activités ordinaires', prefixes: ['484'] },
];

function Note5({ entiteName, entiteNif = '', entiteId, offre, onBack }: Note5Props): React.JSX.Element {
  const {
    exercices, selectedExercice, setSelectedExercice,
    params, previewUrl, setPreviewUrl,
    pdfBlob, setPdfBlob, editing, setEditing,
    saving, saved, saveParams, annee, dateFin: dateFinStr, duree,
  } = useNoteData({ entiteId });

  const [hideEmpty, setHideEmpty] = useState(false);

  const [lignesN, setLignesN] = useState<BalanceLigne[]>([]);
  const [lignesN1, setLignesN1] = useState<BalanceLigne[]>([]);
  const [adjustments, setAdjustments] = useState<Record<string, Record<string, number>>>({});

  const DEFAULT_COMMENTAIRE_ACTIF = `• Commenter toute variation significative.\n• Dépréciation : indiquer les événements et les circonstances qui ont motivé la dépréciation ou la reprise.`;
  const DEFAULT_COMMENTAIRE_DETTES = `• Indiquer la date de cession et la nature de l'immobilisation achetée et/ou cédée.\n• Expliciter toute variation significative.`;
  const [commentaireActif, setCommentaireActif] = useState(DEFAULT_COMMENTAIRE_ACTIF);
  const [commentaireDettes, setCommentaireDettes] = useState(DEFAULT_COMMENTAIRE_DETTES);

  const pageRef = useRef<HTMLDivElement>(null);

  const setAdj = (label: string, field: string, value: number) => {
    setAdjustments(prev => ({ ...prev, [label]: { ...(prev[label] || {}), [field]: value } }));
  };
  const getAdj = (label: string, field: string): number => adjustments[label]?.[field] || 0;

  // Initialiser les champs editables depuis les params charges
  useEffect(() => {
    if (!params || Object.keys(params).length === 0) return;
    setCommentaireActif(params['note5_commentaire_actif'] || DEFAULT_COMMENTAIRE_ACTIF);
    setCommentaireDettes(params['note5_commentaire_dettes'] || DEFAULT_COMMENTAIRE_DETTES);
    if (params['note5_adjustments']) {
      try { setAdjustments(JSON.parse(params['note5_adjustments'])); } catch { /* */ }
    }
  }, [params]);

  const balanceSource = offre === 'comptabilite' ? 'ecritures' : 'import';
  useEffect(() => {
    if (!entiteId || !selectedExercice) return;
    const load = async () => {
      try {
        if (balanceSource === 'ecritures') {
          const res = await fetch('/api/ecritures/balance/' + entiteId + '/' + selectedExercice.id);
          const data = await res.json();
          setLignesN(data.lignes || []);
        } else {
          const res = await fetch('/api/balance/' + entiteId + '/' + selectedExercice.id + '/N');
          const data = await res.json();
          setLignesN(data.lignes || []);
        }
      } catch { setLignesN([]); }
      try {
        const exN1 = exercices.find(e => e.annee === selectedExercice.annee - 1);
        if (exN1) {
          if (balanceSource === 'ecritures') {
            const res = await fetch('/api/ecritures/balance/' + entiteId + '/' + exN1.id);
            setLignesN1((await res.json()).lignes || []);
          } else {
            const res = await fetch('/api/balance/' + entiteId + '/' + exN1.id + '/N');
            setLignesN1((await res.json()).lignes || []);
          }
        } else {
          const res = await fetch('/api/balance/' + entiteId + '/' + selectedExercice.id + '/N-1');
          setLignesN1((await res.json()).lignes || []);
        }
      } catch { setLignesN1([]); }
    };
    load();
  }, [entiteId, selectedExercice, balanceSource, exercices]);

  const handleSave = async () => {
    const data: Record<string, string> = {
      ...params,
      note5_adjustments: JSON.stringify(adjustments),
      note5_commentaire_actif: commentaireActif,
      note5_commentaire_dettes: commentaireDettes,
    };
    await saveParams(data);
  };

  const dateFin = dateFinStr ? new Date(dateFinStr) : null;

  const fmtDateShort = (d: Date | null): string => {
    if (!d) return '';
    return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  const fmtM = (val: number): string => {
    if (val === 0) return '0';
    return Math.round(val).toLocaleString('fr-FR');
  };

  // Calcul depuis la balance
  const computeForPrefixes = (lignes: BalanceLigne[], prefixes: string[], crediteur = false) => {
    let total = 0;
    for (const l of lignes) {
      const num = (l.numero_compte || '').trim();
      if (!prefixes.some(p => num.startsWith(p))) continue;
      if (crediteur) {
        total += (parseFloat(String(l.solde_crediteur)) || 0) - (parseFloat(String(l.solde_debiteur)) || 0);
      } else {
        total += (parseFloat(String(l.solde_debiteur)) || 0) - (parseFloat(String(l.solde_crediteur)) || 0);
      }
    }
    return total;
  };

  const computeRow = (r: RubriqueHAO, crediteur = false) => {
    const n = computeForPrefixes(lignesN, r.prefixes, crediteur) + getAdj(r.label, 'anneeN');
    const n1 = computeForPrefixes(lignesN1, r.prefixes, crediteur) + getAdj(r.label, 'anneeN1');
    const variation = n1 !== 0 ? ((n - n1) / Math.abs(n1) * 100) : 0;
    return { anneeN: n, anneeN1: n1, variation };
  };

  // Actif HAO
  const actifRows = RUBRIQUES_ACTIF.map(r => ({ ...r, vals: computeRow(r) }));
  const depRows = RUBRIQUES_DEPRECIATION.map(r => ({ ...r, vals: computeRow(r, true) }));

  const totalBrut = actifRows.reduce((a, r) => ({ anneeN: a.anneeN + r.vals.anneeN, anneeN1: a.anneeN1 + r.vals.anneeN1 }), { anneeN: 0, anneeN1: 0 });
  const totalBrutVar = totalBrut.anneeN1 !== 0 ? ((totalBrut.anneeN - totalBrut.anneeN1) / Math.abs(totalBrut.anneeN1) * 100) : 0;

  const totalDep = depRows.reduce((a, r) => ({ anneeN: a.anneeN + r.vals.anneeN, anneeN1: a.anneeN1 + r.vals.anneeN1 }), { anneeN: 0, anneeN1: 0 });

  const totalNet = { anneeN: totalBrut.anneeN - totalDep.anneeN, anneeN1: totalBrut.anneeN1 - totalDep.anneeN1 };
  const totalNetVar = totalNet.anneeN1 !== 0 ? ((totalNet.anneeN - totalNet.anneeN1) / Math.abs(totalNet.anneeN1) * 100) : 0;

  // Dettes HAO
  const dettesRows = RUBRIQUES_DETTES.map(r => ({ ...r, vals: computeRow(r, true) }));
  const totalDettes = dettesRows.reduce((a, r) => ({ anneeN: a.anneeN + r.vals.anneeN, anneeN1: a.anneeN1 + r.vals.anneeN1 }), { anneeN: 0, anneeN1: 0 });
  const totalDettesVar = totalDettes.anneeN1 !== 0 ? ((totalDettes.anneeN - totalDettes.anneeN1) / Math.abs(totalDettes.anneeN1) * 100) : 0;

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
  const downloadPDF = () => { if (!pdfBlob) return; const url = URL.createObjectURL(pdfBlob); const a = document.createElement('a'); a.href = url; a.download = 'Note5_' + annee + '.pdf'; a.click(); URL.revokeObjectURL(url); };
  const printPDF = () => { if (!previewUrl) return; const w = window.open(previewUrl); if (w) { w.onload = () => w.print(); } };

  // Styles
  const thStyle: React.CSSProperties = { border: '0.5px solid #000', padding: '5px 8px', fontSize: 11, fontWeight: 700, textAlign: 'center', verticalAlign: 'middle', background: '#f5f5f5' };
  const tdStyle: React.CSSProperties = { border: '0.5px solid #000', padding: '5px 8px', fontSize: 11, verticalAlign: 'middle' };
  const tdRight: React.CSSProperties = { ...tdStyle, textAlign: 'right', fontVariantNumeric: 'tabular-nums' };
  const tdBold: React.CSSProperties = { ...tdStyle, fontWeight: 700 };
  const tdBoldRight: React.CSSProperties = { ...tdRight, fontWeight: 700 };
  const inputSt: React.CSSProperties = { width: '100%', padding: '5px 8px', fontSize: 12, border: '1px solid #D4A843', borderRadius: 2, background: '#fffbf0', textAlign: 'right', boxSizing: 'border-box' };
  const textareaStyle: React.CSSProperties = { width: '100%', minHeight: 50, padding: '8px 10px', fontSize: 12, lineHeight: '1.6', border: '1px solid #D4A843', borderRadius: 3, background: '#fffbf0', fontFamily: 'inherit', boxSizing: 'border-box', resize: 'vertical' };

  const renderAdjInput = (label: string, field: string, baseValue: number) => {
    if (!editing) return fmtM(baseValue);
    const adj = getAdj(label, field);
    return <input value={adj || ''} onChange={e => { const v = e.target.value === '' ? 0 : parseFloat(e.target.value.replace(/\s/g, '').replace(',', '.')) || 0; setAdj(label, field, v); }} style={inputSt} placeholder={fmtM(baseValue - adj)} />;
  };

  const renderRow = (r: { label: string; vals: { anneeN: number; anneeN1: number; variation: number } }) => {
    if (hideEmpty && r.vals.anneeN === 0 && r.vals.anneeN1 === 0) return null;
    return (
    <tr key={r.label}>
      <td style={tdStyle}>{r.label}</td>
      <td style={tdRight}>{renderAdjInput(r.label, 'anneeN', r.vals.anneeN)}</td>
      <td style={tdRight}>{renderAdjInput(r.label, 'anneeN1', r.vals.anneeN1)}</td>
      <td style={{ ...tdRight, background: '#fafafa' }}>{r.vals.variation !== 0 ? r.vals.variation.toFixed(1) + ' %' : ''}</td>
    </tr>
    );
  };

  const renderTotalRow = (label: string, totals: { anneeN: number; anneeN1: number }, variation: number) => (
    <tr>
      <td style={tdBold}>{label}</td>
      <td style={tdBoldRight}>{fmtM(totals.anneeN)}</td>
      <td style={tdBoldRight}>{fmtM(totals.anneeN1)}</td>
      <td style={{ ...tdBoldRight, background: '#fafafa' }}>{variation !== 0 ? variation.toFixed(1) + ' %' : ''}</td>
    </tr>
  );

  return (
    <div>
      <div className="etat-toolbar">
        <button className="etat-back-btn" onClick={onBack}><LuArrowLeft size={18} /> Retour</button>
        <div className="etat-toolbar-title">Note 5 — Actif circulant HAO et Dettes circulantes HAO</div>
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
          <button className="etat-action-btn" onClick={() => setHideEmpty(!hideEmpty)} style={{ background: hideEmpty ? '#1A3A5C' : '#e5e7eb', color: hideEmpty ? '#fff' : '#333', border: 'none' }}><LuEyeOff size={16} /> {hideEmpty ? 'Afficher tout' : 'Masquer vides'}</button>
        </div>
      </div>

      {previewUrl && (
        <div className="etat-preview-overlay" onClick={closePreview}>
          <div className="etat-preview-modal" onClick={e => e.stopPropagation()}>
            <div className="etat-preview-header">
              <span>Aperçu — Note 5</span>
              <div className="etat-preview-actions">
                <button onClick={printPDF} title="Imprimer"><LuPrinter size={18} /></button>
                <button onClick={downloadPDF} title="Télécharger"><LuDownload size={18} /></button>
                <button onClick={closePreview}><LuX size={18} /></button>
              </div>
            </div>
            <iframe src={previewUrl} className="etat-preview-iframe" title="Aperçu Note 5" />
          </div>
        </div>
      )}

      <BalanceSourcePanel
        lignes={lignesN}
        groups={[...RUBRIQUES_ACTIF, ...RUBRIQUES_DEPRECIATION, ...RUBRIQUES_DETTES].map(r => ({ label: r.label, prefixes: r.prefixes }))}
        title="Soldes balance — Actif/Dettes HAO"
      />

      <div ref={pageRef} style={{
        width: '210mm', minHeight: '297mm', background: '#fff',
        margin: '0 auto 20px', padding: '8mm 10mm',
        boxShadow: '0 2px 12px rgba(0,0,0,0.1)', boxSizing: 'border-box',
        fontFamily: "'Inter', 'Segoe UI', Arial, sans-serif", fontSize: 12, color: '#1a1a1a',
      }}>
        {/* Header officiel */}
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
          NOTE 5 — ACTIF CIRCULANT HAO
        </h3>

        {/* Tableau Actif circulant HAO */}
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
            {actifRows.map(r => renderRow(r))}
            {renderTotalRow('TOTAL BRUT', totalBrut, totalBrutVar)}
            {depRows.map(r => renderRow(r))}
            {renderTotalRow('TOTAL NET DE DEPRECIATIONS', totalNet, totalNetVar)}
          </tbody>
        </table>

        {/* Commentaire actif */}
        <div style={{ border: '0.5px solid #000', borderTop: 'none', padding: '10px 12px', marginBottom: 20 }}>
          <p style={{ fontSize: 12, fontWeight: 700, marginBottom: 6, marginTop: 0 }}>Commentaire :</p>
          {editing ? (
            <textarea value={commentaireActif} onChange={e => setCommentaireActif(e.target.value)} style={textareaStyle} />
          ) : (
            <div style={{ fontSize: 12, lineHeight: 1.6, whiteSpace: 'pre-wrap', minHeight: 30 }}>{commentaireActif}</div>
          )}
        </div>

        {/* Titre Dettes */}
        <div style={{ textAlign: 'center', fontWeight: 700, fontSize: 14, margin: '16px 0 8px' }}>DETTES CIRCULANTES HAO</div>

        {/* Tableau Dettes circulantes HAO */}
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
            {dettesRows.map(r => renderRow(r))}
            {renderTotalRow('TOTAL', totalDettes, totalDettesVar)}
          </tbody>
        </table>

        {/* Commentaire dettes */}
        <div style={{ border: '0.5px solid #000', borderTop: 'none', padding: '10px 12px' }}>
          <p style={{ fontSize: 12, fontWeight: 700, marginBottom: 6, marginTop: 0 }}>Commentaire :</p>
          {editing ? (
            <textarea value={commentaireDettes} onChange={e => setCommentaireDettes(e.target.value)} style={textareaStyle} />
          ) : (
            <div style={{ fontSize: 12, lineHeight: 1.6, whiteSpace: 'pre-wrap', minHeight: 30 }}>{commentaireDettes}</div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Note5;
