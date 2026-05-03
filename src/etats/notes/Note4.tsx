import React, { useState, useRef, useEffect } from 'react';
import { LuDownload, LuArrowLeft, LuEye, LuX, LuPrinter, LuSave, LuPenLine, LuEyeOff, LuInfo } from 'react-icons/lu';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import '../BilanSYCEBNL.css';
import '../FicheIdentification.css';
import type { EtatBaseProps } from '../../types';
import { useNoteData } from './useNoteData';
import { useBalanceLignes } from '../../hooks/useBalanceLignes';
import BalanceSourcePanel from './BalanceSourcePanel';
import {
  DEFAULT_COMMENTAIRE,
  LigneFiliale,
  RUBRIQUES_BRUT,
  RUBRIQUES_DEPRECIATION,
  computeRow,
  emptyFiliale,
  sumRows,
} from './note4/note4Data';
import { Note4Table } from './note4/Note4Table';
import { Note4Filiales } from './note4/Note4Filiales';
import { textareaStyle } from './note4/note4Styles';
import { fmtDate } from '../../utils/formatters';

interface Note4Props extends EtatBaseProps {
  onGoToParametres?: () => void;
}

function Note4({ entiteName, entiteNif = '', entiteId, offre, onBack }: Note4Props): React.JSX.Element {
  const {
    exercices, selectedExercice, setSelectedExercice,
    params, previewUrl, setPreviewUrl,
    pdfBlob, setPdfBlob, editing, setEditing,
    saving, saveParams, annee, dateFin: dateFinStr, duree,
  } = useNoteData({ entiteId });

  const [hideEmpty, setHideEmpty] = useState(false);
  const { lignesN, lignesN1 } = useBalanceLignes({ entiteId, selectedExercice, exercices, offre });
  const [adjustments, setAdjustments] = useState<Record<string, Record<string, number>>>({});
  const [filiales, setFiliales] = useState<LigneFiliale[]>([emptyFiliale(), emptyFiliale(), emptyFiliale(), emptyFiliale(), emptyFiliale()]);
  const [commentaire, setCommentaire] = useState(DEFAULT_COMMENTAIRE);

  const pageRef = useRef<HTMLDivElement>(null);

  const setAdj = (label: string, field: string, value: number): void => {
    setAdjustments(prev => ({
      ...prev,
      [label]: { ...(prev[label] || {}), [field]: value },
    }));
  };

  const getAdj = (label: string, field: string): number => adjustments[label]?.[field] || 0;

  useEffect(() => {
    if (!params || Object.keys(params).length === 0) return;
    setCommentaire(params['note4_commentaire'] || DEFAULT_COMMENTAIRE);
    if (params['note4_adjustments']) {
      try { setAdjustments(JSON.parse(params['note4_adjustments'])); } catch { /* */ }
    }
    if (params['note4_filiales']) {
      try {
        const parsed = JSON.parse(params['note4_filiales']);
        if (Array.isArray(parsed) && parsed.length > 0) setFiliales(parsed);
      } catch { /* */ }
    }
  }, [params]);


  const handleSave = async (): Promise<void> => {
    const data: Record<string, string> = {
      ...params,
      note4_adjustments: JSON.stringify(adjustments),
      note4_filiales: JSON.stringify(filiales),
      note4_commentaire: commentaire,
    };
    await saveParams(data);
  };

  const dateFin = dateFinStr ? new Date(dateFinStr) : null;

  const brutRows = RUBRIQUES_BRUT.map(r => ({ ...r, vals: computeRow(r, lignesN, lignesN1, getAdj) }));
  const depreciationRows = RUBRIQUES_DEPRECIATION.map(r => ({ ...r, vals: computeRow(r, lignesN, lignesN1, getAdj) }));

  const totalBrut = sumRows(brutRows);
  const totalBrutVariation = totalBrut.anneeN1 !== 0 ? ((totalBrut.anneeN - totalBrut.anneeN1) / Math.abs(totalBrut.anneeN1) * 100) : 0;
  const totalDep = sumRows(depreciationRows);
  const totalNet = {
    anneeN: totalBrut.anneeN - totalDep.anneeN,
    anneeN1: totalBrut.anneeN1 - totalDep.anneeN1,
    creances1an: totalBrut.creances1an - totalDep.creances1an,
    creances1a2ans: totalBrut.creances1a2ans - totalDep.creances1a2ans,
    creancesPlus2ans: totalBrut.creancesPlus2ans - totalDep.creancesPlus2ans,
  };
  const totalNetVariation = totalNet.anneeN1 !== 0 ? ((totalNet.anneeN - totalNet.anneeN1) / Math.abs(totalNet.anneeN1) * 100) : 0;

  const updateFiliale = (idx: number, field: keyof LigneFiliale, value: string): void => {
    setFiliales(prev => prev.map((l, i) => i === idx ? { ...l, [field]: value } : l));
  };
  const addFiliale = (): void => setFiliales(prev => [...prev, emptyFiliale()]);
  const removeFiliale = (idx: number): void => setFiliales(prev => prev.filter((_, i) => i !== idx));

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

  const openPreview = async (): Promise<void> => {
    const pdf = await generatePDF();
    const blob = pdf.output('blob');
    setPdfBlob(blob);
    setPreviewUrl(URL.createObjectURL(blob));
  };
  const closePreview = (): void => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setPdfBlob(null);
  };
  const downloadPDF = (): void => {
    if (!pdfBlob) return;
    const url = URL.createObjectURL(pdfBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'Note4_' + annee + '.pdf';
    a.click();
    URL.revokeObjectURL(url);
  };
  const printPDF = (): void => {
    if (!previewUrl) return;
    const w = window.open(previewUrl);
    if (w) { w.onload = () => w.print(); }
  };

  return (
    <div>
      <div className="etat-toolbar">
        <button className="etat-back-btn" onClick={onBack}><LuArrowLeft size={18} /> Retour</button>
        <div className="etat-toolbar-title">Note 4 — Immobilisations financières</div>
        <div className="etat-toolbar-actions">
          <select
            className="etat-exercice-select"
            value={selectedExercice?.id || ''}
            onChange={e => { const ex = exercices.find(ex => ex.id === Number(e.target.value)); if (ex) setSelectedExercice(ex); }}
          >
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
          <button
            className="etat-action-btn"
            onClick={() => setHideEmpty(!hideEmpty)}
            style={{ background: hideEmpty ? '#1A3A5C' : '#e5e7eb', color: hideEmpty ? '#fff' : '#333', border: 'none' }}
          ><LuEyeOff size={16} /> {hideEmpty ? 'Afficher tout' : 'Masquer vides'}</button>
        </div>
      </div>

      {previewUrl && (
        <div className="etat-preview-overlay" onClick={closePreview}>
          <div className="etat-preview-modal" onClick={e => e.stopPropagation()}>
            <div className="etat-preview-header">
              <span>Aperçu — Note 4</span>
              <div className="etat-preview-actions">
                <button onClick={printPDF} title="Imprimer"><LuPrinter size={18} /></button>
                <button onClick={downloadPDF} title="Télécharger"><LuDownload size={18} /></button>
                <button onClick={closePreview}><LuX size={18} /></button>
              </div>
            </div>
            <iframe src={previewUrl} className="etat-preview-iframe" title="Aperçu Note 4" />
          </div>
        </div>
      )}

      <div style={{ margin: '12px 20px', padding: '12px 16px', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 8, fontSize: 12, color: '#1e40af', lineHeight: 1.6 }}>
        <div style={{ fontWeight: 700, marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
          <LuInfo size={14} /> Note d'information — Note 4
        </div>
        <ul style={{ margin: 0, paddingLeft: 18 }}>
          <li><strong>Titres de participation :</strong> Actions/parts détenues durablement (≥ 10 % du capital de l'émetteur) pour exercer une influence ou un contrôle.</li>
          <li><strong>Autres immobilisations financières :</strong> Titres immobilisés de l'activité de portefeuille, prêts, dépôts et cautionnements versés.</li>
          <li><strong>Dépréciations :</strong> Constatées lorsque la valeur actuelle devient durablement inférieure à la valeur nette comptable (compte 29).</li>
          <li>Les montants bruts alimentent le compte 26/27 au bilan ; les dépréciations viennent en déduction.</li>
        </ul>
      </div>

      <BalanceSourcePanel
        lignes={lignesN}
        groups={[...RUBRIQUES_BRUT, ...RUBRIQUES_DEPRECIATION].map(r => ({ label: r.label, prefixes: r.prefixes }))}
        title="Soldes balance — Immobilisations financieres"
      />

      <div
        ref={pageRef}
        style={{
          width: '210mm', minHeight: '297mm', background: '#fff',
          margin: '0 auto 20px', padding: '8mm 10mm',
          boxShadow: '0 2px 12px rgba(0,0,0,0.1)', boxSizing: 'border-box',
          fontFamily: "'Inter', 'Segoe UI', Arial, sans-serif", fontSize: 12, color: '#1a1a1a',
        }}
      >
        <div className="etat-header-officiel">
          <div className="etat-header-grid">
            <div className="etat-header-row">
              <span className="etat-header-label">Désignation entité :</span>
              <span className="etat-header-value">{entiteName || ''}</span>
              <span className="etat-header-label">Exercice clos le :</span>
              <span className="etat-header-value-right">{dateFin ? fmtDate(dateFin) : ''}</span>
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
          NOTE 4 — IMMOBILISATIONS FINANCIERES
        </h3>

        <Note4Table
          brutRows={brutRows}
          depreciationRows={depreciationRows}
          totalBrut={totalBrut}
          totalBrutVariation={totalBrutVariation}
          totalNet={totalNet}
          totalNetVariation={totalNetVariation}
          hideEmpty={hideEmpty}
          editing={editing}
          getAdj={getAdj}
          setAdj={setAdj}
        />

        <Note4Filiales
          filiales={filiales}
          editing={editing}
          updateFiliale={updateFiliale}
          addFiliale={addFiliale}
          removeFiliale={removeFiliale}
        />

        <div style={{ border: '0.5px solid #000', padding: '10px 12px' }}>
          <p style={{ fontSize: 12, fontWeight: 700, marginBottom: 6, marginTop: 0 }}>Commentaire :</p>
          {editing ? (
            <textarea value={commentaire} onChange={e => setCommentaire(e.target.value)} style={textareaStyle} />
          ) : (
            <div style={{ fontSize: 12, lineHeight: 1.6, margin: 0, whiteSpace: 'pre-wrap', minHeight: 60 }}>
              {commentaire}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Note4;
