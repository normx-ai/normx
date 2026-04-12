import React, { useState, useRef, useEffect } from 'react';
import { LuEyeOff , LuInfo } from 'react-icons/lu';
import '../BilanSYCEBNL.css';
import '../FicheIdentification.css';
import type { EtatBaseProps, BalanceLigne } from '../../types';
import BalanceSourcePanel from './BalanceSourcePanel';
import { useNoteData } from './useNoteData';
import { usePDFPreview } from './usePDFPreview';
import NoteToolbar from './NoteToolbar';
import PDFPreviewModal from './PDFPreviewModal';
import EditableComment from './EditableComment';
import { thStyle, tdStyle, tdRight, tdBold, tdBoldRight, inputSt } from './noteStyles';
import { buildRubriques, Rubrique } from '../data/planSyscohadaNotes';

interface Note22Props extends EtatBaseProps {
  onGoToParametres?: () => void;
}

const RUBRIQUES: Rubrique[] = buildRubriques('note_22_sys');

const DEFAULT_COMMENTAIRE = `• Commenter toute variation significative.`;

function Note22({ entiteName, entiteNif = '', entiteId, offre, onBack }: Note22Props): React.JSX.Element {
  const {
    exercices, selectedExercice, setSelectedExercice,
    params, setParams, editing, setEditing, saving, saved, saveParams, annee, dateFin, duree,
  } = useNoteData({ entiteId });

  const pageRef = useRef<HTMLDivElement>(null);
  const pdf = usePDFPreview({ pageRef, fileName: `Note22_${annee}.pdf`, editing, setEditing });

  const [hideEmpty, setHideEmpty] = useState(false);
  const [lignesN, setLignesN] = useState<BalanceLigne[]>([]);
  const [lignesN1, setLignesN1] = useState<BalanceLigne[]>([]);
  const [adjustments, setAdjustments] = useState<Record<string, Record<string, number>>>({});
  const [commentaire, setCommentaire] = useState(DEFAULT_COMMENTAIRE);

  const setAdj = (label: string, field: string, value: number) => {
    setAdjustments(prev => ({ ...prev, [label]: { ...(prev[label] || {}), [field]: value } }));
  };
  const getAdj = (label: string, field: string): number => adjustments[label]?.[field] || 0;

  // Charger adjustments/commentaire depuis params
  useEffect(() => {
    if (!params['note22_commentaire'] && !params['note22_adjustments']) return;
    setCommentaire(params['note22_commentaire'] || DEFAULT_COMMENTAIRE);
    if (params['note22_adjustments']) {
      try { setAdjustments(JSON.parse(params['note22_adjustments'])); } catch { /* */ }
    }
  }, [params]);

  // Charger balance N et N-1
  const balanceSource = offre === 'comptabilite' ? 'ecritures' : 'import';
  useEffect(() => {
    if (!entiteId || !selectedExercice) return;
    const load = async () => {
      try {
        if (balanceSource === 'ecritures') {
          const res = await fetch('/api/ecritures/balance/' + entiteId + '/' + selectedExercice.id);
          setLignesN((await res.json()).lignes || []);
        } else {
          const res = await fetch('/api/balance/' + entiteId + '/' + selectedExercice.id + '/N');
          setLignesN((await res.json()).lignes || []);
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

  const handleSave = () => saveParams({
    ...params,
    note22_adjustments: JSON.stringify(adjustments),
    note22_commentaire: commentaire,
  });

  const fmtDateShort = (d: string): string => {
    if (!d) return '';
    return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };
  const fmtM = (val: number): string => val === 0 ? '0' : Math.round(val).toLocaleString('fr-FR');

  // Charges = solde débiteur
  const computeForPrefixes = (lignes: BalanceLigne[], prefixes: string[]) => {
    let total = 0;
    for (const l of lignes) {
      const num = (l.numero_compte || '').trim();
      if (!prefixes.some(p => num.startsWith(p))) continue;
      total += (parseFloat(String(l.solde_debiteur)) || 0) - (parseFloat(String(l.solde_crediteur)) || 0);
    }
    return total;
  };

  // Clé unique pour ajustements (label peut se répéter entre groupes)
  const rowKey = (r: Rubrique, idx: number) => r.label + '_' + (r.group || '') + '_' + idx;

  const computeRow = (r: Rubrique, idx: number) => {
    const key = rowKey(r, idx);
    const n = computeForPrefixes(lignesN, r.prefixes) + getAdj(key, 'anneeN');
    const n1 = computeForPrefixes(lignesN1, r.prefixes) + getAdj(key, 'anneeN1');
    const variation = n1 !== 0 ? ((n - n1) / Math.abs(n1) * 100) : 0;
    return { anneeN: n, anneeN1: n1, variation };
  };

  const marchandisesRows = RUBRIQUES.filter(r => r.group === 'marchandises' && !r.isTotal);
  const matieresRows = RUBRIQUES.filter(r => r.group === 'matieres' && !r.isTotal);
  const autresRows = RUBRIQUES.filter(r => (r.group === 'autres' || !r.group) && !r.isTotal);

  const sumGroupRows = (rows: Rubrique[]) => rows.reduce((a, r) => { const v = computeRow(r, RUBRIQUES.indexOf(r)); return { anneeN: a.anneeN + v.anneeN, anneeN1: a.anneeN1 + v.anneeN1 }; }, { anneeN: 0, anneeN1: 0 });

  const totalMarchandises = sumGroupRows(marchandisesRows);
  const totalMatieres = sumGroupRows(matieresRows);
  const totalAutres = sumGroupRows(autresRows);

  const calcVar = (t: { anneeN: number; anneeN1: number }) => t.anneeN1 !== 0 ? ((t.anneeN - t.anneeN1) / Math.abs(t.anneeN1) * 100) : 0;

  const renderAdjInput = (key: string, field: string, baseValue: number) => {
    if (!editing) return fmtM(baseValue);
    const adj = getAdj(key, field);
    return <input value={adj || ''} onChange={e => { const v = e.target.value === '' ? 0 : parseFloat(e.target.value.replace(/\s/g, '').replace(',', '.')) || 0; setAdj(key, field, v); }} style={inputSt} placeholder={fmtM(baseValue - adj)} />;
  };

  const renderDetailRow = (r: Rubrique) => {
    const idx = RUBRIQUES.indexOf(r);
    const vals = computeRow(r, idx);
    const key = rowKey(r, idx);
    if (hideEmpty && vals.anneeN === 0 && vals.anneeN1 === 0) return null;
    return (
      <tr key={key}>
        <td style={tdStyle}>{r.label}</td>
        <td style={tdRight}>{renderAdjInput(key, 'anneeN', vals.anneeN)}</td>
        <td style={tdRight}>{renderAdjInput(key, 'anneeN1', vals.anneeN1)}</td>
        <td style={{ ...tdRight, background: '#fafafa' }}>{vals.variation !== 0 ? vals.variation.toFixed(1) + ' %' : ''}</td>
      </tr>
    );
  };

  const renderTotalRow = (label: string, totals: { anneeN: number; anneeN1: number }) => (
    <tr key={label}>
      <td style={{ ...tdBold, background: '#f0f0f0' }}>{label}</td>
      <td style={{ ...tdBoldRight, background: '#f0f0f0' }}>{fmtM(totals.anneeN)}</td>
      <td style={{ ...tdBoldRight, background: '#f0f0f0' }}>{fmtM(totals.anneeN1)}</td>
      <td style={{ ...tdBoldRight, background: '#f0f0f0' }}>{calcVar(totals) !== 0 ? calcVar(totals).toFixed(1) + ' %' : ''}</td>
    </tr>
  );

  return (
    <div>
      <NoteToolbar
        title="Note 22 — Achats"
        exercices={exercices} selectedExercice={selectedExercice} onSelectExercice={setSelectedExercice}
        editing={editing} saving={saving} saved={saved}
        onEdit={() => setEditing(true)} onSave={handleSave} onPreview={pdf.openPreview} onBack={onBack}
      >
        <button className="etat-action-btn" onClick={() => setHideEmpty(!hideEmpty)} style={{ background: hideEmpty ? '#1A3A5C' : '#e5e7eb', color: hideEmpty ? '#fff' : '#333', border: 'none' }}><LuEyeOff size={16} /> {hideEmpty ? 'Afficher tout' : 'Masquer vides'}</button>
      </NoteToolbar>

      {pdf.previewUrl && (
        <PDFPreviewModal previewUrl={pdf.previewUrl} title="Apercu — Note 22" onClose={pdf.closePreview} onDownload={pdf.downloadPDF} onPrint={pdf.printPDF} />
      )}

      <BalanceSourcePanel
        lignes={lignesN}
        groups={RUBRIQUES.filter(r => !r.isTotal).map(r => ({ label: r.label, prefixes: r.prefixes }))}
        title="Soldes balance — Achats"
      />


      {/* Bulle d'information */}
      <div style={{ margin: '12px 20px', padding: '12px 16px', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 8, fontSize: 12, color: '#1e40af', lineHeight: 1.6 }}>
        <div style={{ fontWeight: 700, marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
          <LuInfo size={14} /> Note d'information — Note 22
        </div>
        <ul style={{ margin: 0, paddingLeft: 18 }}>
          <li><strong>Achats consommes :</strong> Comptes 601 a 605 — marchandises, matieres premieres, fournitures consommables.</li>
          <li><strong>Variation de stocks :</strong> Incluse pour obtenir les achats reellement consommes (compte 603).</li>
          <li><strong>Ristournes obtenues :</strong> Rabais, remises et ristournes sur achats (compte 609) viennent en deduction.</li>
          <li>Doit correspondre au total Achats - Variation stocks du compte de resultat.</li>
        </ul>
      </div>

      <div ref={pageRef} style={{
        width: '210mm', minHeight: '297mm', background: '#fff',
        margin: '0 auto 20px', padding: '6mm 10mm',
        boxShadow: '0 2px 12px rgba(0,0,0,0.1)', boxSizing: 'border-box',
        fontFamily: "'Inter', 'Segoe UI', Arial, sans-serif", fontSize: 12, color: '#1a1a1a',
      }}>
        <div className="etat-header-officiel">
          <div className="etat-header-grid">
            <div className="etat-header-row">
              <span className="etat-header-label">Désignation entité :</span>
              <span className="etat-header-value">{entiteName || ''}</span>
              <span className="etat-header-label">Exercice clos le :</span>
              <span className="etat-header-value-right">{fmtDateShort(dateFin)}</span>
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
          NOTE 22 — ACHATS
        </h3>

        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 0 }}>
          <thead>
            <tr>
              <th style={{ ...thStyle, width: '55%' }}>Libellés</th>
              <th style={thStyle}>Année N</th>
              <th style={thStyle}>Année N-1</th>
              <th style={thStyle}>Variation en %</th>
            </tr>
          </thead>
          <tbody>
            {marchandisesRows.map(r => renderDetailRow(r))}
            {renderTotalRow('TOTAL : ACHATS DE MARCHANDISES', totalMarchandises)}
            {matieresRows.map(r => renderDetailRow(r))}
            {renderTotalRow('TOTAL : ACHATS MATIERES PREMIERES ET FOURNITURES LIEES', totalMatieres)}
            {autresRows.map(r => renderDetailRow(r))}
            {renderTotalRow('TOTAL : AUTRES ACHATS', totalAutres)}
          </tbody>
        </table>

        <div style={{ border: '0.5px solid #000', borderTop: 'none', padding: '10px 12px' }}>
          <p style={{ fontSize: 12, fontWeight: 700, marginBottom: 6, marginTop: 0 }}>Commentaire :</p>
          <EditableComment value={commentaire} onChange={setCommentaire} editing={editing} minHeight={20} />
        </div>
      </div>
    </div>
  );
}

export default Note22;
