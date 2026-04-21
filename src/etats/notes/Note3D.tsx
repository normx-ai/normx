import { clientFetch } from '../../lib/api';
import { api } from '../../lib/apiEndpoints';
import React, { useState, useRef, useEffect } from 'react';
import { LuDownload, LuArrowLeft, LuEye, LuX, LuPrinter, LuSave, LuPenLine, LuInfo, LuEyeOff } from 'react-icons/lu';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import '../BilanSYCEBNL.css';
import '../FicheIdentification.css';
import type { EtatBaseProps, BalanceLigne } from '../../types';
import { useNoteData } from './useNoteData';
import BalanceSourcePanel from './BalanceSourcePanel';
import {
  DEFAULT_COMMENTAIRE,
  fmtM,
  prepareNote3D,
  prixCessionBalance,
  vncCessionBalance,
} from './note3d/note3dData';
import { Note3DTable } from './note3d/Note3DTable';

interface Note3DProps extends EtatBaseProps {
  onGoToParametres?: () => void;
}

function Note3D({ entiteName, entiteNif = '', entiteId, offre, onBack }: Note3DProps): React.JSX.Element {
  const {
    exercices, selectedExercice, setSelectedExercice,
    params, previewUrl, setPreviewUrl,
    pdfBlob, setPdfBlob, editing, setEditing,
    saving, saveParams, annee, dateFin: dateFinStr, duree,
  } = useNoteData({ entiteId });

  const [lignesN, setLignesN] = useState<BalanceLigne[]>([]);
  const [hideEmpty, setHideEmpty] = useState(false);
  const [commentaire, setCommentaire] = useState(DEFAULT_COMMENTAIRE);
  const [adjustments, setAdjustments] = useState<Record<string, Record<string, number>>>({});

  const pageRef = useRef<HTMLDivElement>(null);

  const setAdj = (label: string, field: string, value: number): void => {
    setAdjustments(prev => ({ ...prev, [label]: { ...(prev[label] || {}), [field]: value } }));
  };
  const getAdj = (label: string, field: string): number => adjustments[label]?.[field] || 0;

  useEffect(() => {
    if (!params || Object.keys(params).length === 0) return;
    setCommentaire(params['note3d_commentaire'] || DEFAULT_COMMENTAIRE);
    if (params['note3d_adjustments']) {
      try { setAdjustments(JSON.parse(params['note3d_adjustments'])); } catch { /* */ }
    }
  }, [params]);

  const balanceSource = offre === 'comptabilite' ? 'ecritures' : 'import';
  useEffect(() => {
    if (!entiteId || !selectedExercice) return;
    const load = async (): Promise<void> => {
      try {
        let lignes: BalanceLigne[] = [];
        if (balanceSource === 'ecritures') {
          const res = await clientFetch(api.ecritures.balance(entiteId, selectedExercice.id));
          const data = await res.json();
          lignes = data.lignes || [];
        } else {
          const res = await clientFetch(api.balance.byExercice(entiteId, selectedExercice.id, 'N'));
          const data = await res.json();
          lignes = data.lignes || [];
        }
        setLignesN(lignes);
      } catch { setLignesN([]); }
    };
    load();
  }, [entiteId, selectedExercice, balanceSource]);

  const handleSave = async (): Promise<void> => {
    const data: Record<string, string> = {
      ...params,
      note3d_commentaire: commentaire,
      note3d_adjustments: JSON.stringify(adjustments),
    };
    await saveParams(data);
  };

  const dateFin = dateFinStr ? new Date(dateFinStr) : null;
  const fmtDateShort = (d: Date | null): string => {
    if (!d) return '';
    return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  const prixBal = prixCessionBalance(lignesN);
  const vncBal = vncCessionBalance(lignesN);
  const note3dData = prepareNote3D(lignesN);

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
    a.download = 'Note3D_' + annee + '.pdf';
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
        <div className="etat-toolbar-title">Note 3D — Plus-values et moins-values de cession</div>
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
              <span>Aperçu — Note 3D</span>
              <div className="etat-preview-actions">
                <button onClick={printPDF} title="Imprimer"><LuPrinter size={18} /></button>
                <button onClick={downloadPDF} title="Télécharger"><LuDownload size={18} /></button>
                <button onClick={closePreview}><LuX size={18} /></button>
              </div>
            </div>
            <iframe src={previewUrl} className="etat-preview-iframe" title="Aperçu Note 3D" />
          </div>
        </div>
      )}

      <div
        style={{
          margin: '12px 20px', padding: '12px 16px',
          background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 8,
          fontSize: 12, color: '#1e40af', lineHeight: 1.6,
        }}
      >
        <div style={{ fontWeight: 700, marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
          <LuInfo size={14} /> Note d'information — Note 3D
        </div>
        <ul style={{ margin: 0, paddingLeft: 18 }}>
          <li><strong>Saisie manuelle :</strong> Cette note est entièrement à renseigner manuellement. Les mouvements crédit sur les comptes d'immobilisations peuvent être des cessions, annulations ou reclassements — seul le comptable sait quels biens ont été cédés.</li>
          <li><strong>Valeur brute :</strong> Montant d'origine du bien cédé (valeur d'entrée dans l'actif).</li>
          <li><strong>Amortissements :</strong> Cumul des amortissements pratiqués jusqu'à la date de cession.</li>
          <li><strong>Prix de cession :</strong> Prix de vente effectif ou indemnité d'assurance reçue.</li>
        </ul>
        {(prixBal > 0 || vncBal > 0) && (
          <div style={{ marginTop: 8, padding: '6px 10px', background: '#dbeafe', borderRadius: 4, fontSize: 11 }}>
            <strong>Indicateurs balance :</strong>
            {vncBal > 0 && <span> Compte 81/654 (VNC cessions) = {fmtM(vncBal)}</span>}
            {prixBal > 0 && <span> | Compte 82/754 (Prix de cession) = {fmtM(prixBal)}</span>}
          </div>
        )}
      </div>

      <BalanceSourcePanel
        lignes={lignesN}
        groups={[
          { label: 'Produits des cessions (82x, 754)', prefixes: ['82', '754'] },
          { label: 'VNC des cessions (81x, 654)', prefixes: ['81', '654'] },
        ]}
        title="Soldes balance — Plus/moins-values de cession"
      />

      <div
        ref={pageRef}
        style={{
          width: '297mm', minHeight: '210mm', background: '#fff',
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
          NOTE 3D — IMMOBILISATIONS : PLUS-VALUES ET MOINS VALUE DE CESSION
        </h3>

        <Note3DTable
          lignes={lignesN}
          data={note3dData}
          editing={editing}
          hideEmpty={hideEmpty}
          getAdj={getAdj}
          setAdj={setAdj}
        />

        <div>
          <p style={{ fontSize: 12, fontWeight: 700, marginBottom: 6, marginTop: 0 }}>Commentaire :</p>
          {editing ? (
            <textarea
              value={commentaire}
              onChange={e => setCommentaire(e.target.value)}
              style={{
                width: '100%', minHeight: 60, padding: '6px 8px', fontSize: 12,
                fontStyle: 'italic', lineHeight: '1.6', border: '1px solid #D4A843',
                borderRadius: 4, background: '#fffbf0', fontFamily: 'inherit',
                boxSizing: 'border-box', resize: 'vertical',
              }}
            />
          ) : (
            <div style={{ fontSize: 12, fontStyle: 'italic', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
              {commentaire}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Note3D;
