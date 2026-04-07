import React, { useState, useRef, useEffect } from 'react';
import { LuEyeOff } from 'react-icons/lu';
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

interface Note20Props extends EtatBaseProps {
  onGoToParametres?: () => void;
}

interface Rubrique {
  label: string;
  prefixes: string[];
  group: 'escompte' | 'credits';
}

const RUBRIQUES: Rubrique[] = [
  { label: 'Escomptes de crédit de campagne', prefixes: ['564'], group: 'escompte' },
  { label: 'Escomptes de crédit ordinaires', prefixes: ['565'], group: 'escompte' },
  { label: 'Banques locales', prefixes: ['561'], group: 'credits' },
  { label: 'Banques autres états région', prefixes: ['562'], group: 'credits' },
  { label: 'Autres Banques', prefixes: ['563'], group: 'credits' },
  { label: 'Banques intérêts courus', prefixes: ['566'], group: 'credits' },
  { label: 'Crédit de trésorerie', prefixes: ['567', '568', '569'], group: 'credits' },
];

const DEFAULT_COMMENTAIRE = `• Commenter toute variation significative.\n• Indiquer le nom de l'organisme les conditions de crédit, le taux d'intérêt, la durée du crédit.`;

function Note20({ entiteName, entiteNif = '', entiteId, offre, onBack }: Note20Props): React.JSX.Element {
  const {
    exercices, selectedExercice, setSelectedExercice,
    params, setParams, editing, setEditing, saving, saved, saveParams, annee, dateFin, duree,
  } = useNoteData({ entiteId });

  const pageRef = useRef<HTMLDivElement>(null);
  const pdf = usePDFPreview({ pageRef, fileName: `Note20_${annee}.pdf`, editing, setEditing });

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
    if (!params['note20_commentaire'] && !params['note20_adjustments']) return;
    setCommentaire(params['note20_commentaire'] || DEFAULT_COMMENTAIRE);
    if (params['note20_adjustments']) {
      try { setAdjustments(JSON.parse(params['note20_adjustments'])); } catch { /* */ }
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
    note20_adjustments: JSON.stringify(adjustments),
    note20_commentaire: commentaire,
  });

  const fmtDateShort = (d: string): string => {
    if (!d) return '';
    return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };
  const fmtM = (val: number): string => val === 0 ? '0' : Math.round(val).toLocaleString('fr-FR');

  const computeForPrefixes = (lignes: BalanceLigne[], prefixes: string[]) => {
    let total = 0;
    for (const l of lignes) {
      const num = (l.numero_compte || '').trim();
      if (!prefixes.some(p => num.startsWith(p))) continue;
      total += (parseFloat(String(l.solde_crediteur)) || 0) - (parseFloat(String(l.solde_debiteur)) || 0);
    }
    return total;
  };

  const computeRow = (r: Rubrique) => {
    const n = computeForPrefixes(lignesN, r.prefixes) + getAdj(r.label, 'anneeN');
    const n1 = computeForPrefixes(lignesN1, r.prefixes) + getAdj(r.label, 'anneeN1');
    const variation = n1 !== 0 ? ((n - n1) / Math.abs(n1) * 100) : 0;
    return { anneeN: n, anneeN1: n1, variation };
  };

  const escompteRows = RUBRIQUES.filter(r => r.group === 'escompte').map(r => ({ ...r, vals: computeRow(r) }));
  const creditsRows = RUBRIQUES.filter(r => r.group === 'credits').map(r => ({ ...r, vals: computeRow(r) }));

  const sumGroup = (rows: { vals: { anneeN: number; anneeN1: number } }[]) => rows.reduce((a, r) => ({ anneeN: a.anneeN + r.vals.anneeN, anneeN1: a.anneeN1 + r.vals.anneeN1 }), { anneeN: 0, anneeN1: 0 });

  const totalEscompte = sumGroup(escompteRows);
  const totalCredits = sumGroup(creditsRows);
  const totalGeneral = { anneeN: totalEscompte.anneeN + totalCredits.anneeN, anneeN1: totalEscompte.anneeN1 + totalCredits.anneeN1 };

  const calcVar = (t: { anneeN: number; anneeN1: number }) => t.anneeN1 !== 0 ? ((t.anneeN - t.anneeN1) / Math.abs(t.anneeN1) * 100) : 0;

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
    <tr key={label}>
      <td style={{ ...tdBold, background: '#f0f0f0' }}>{label}</td>
      <td style={{ ...tdBoldRight, background: '#f0f0f0' }}>{fmtM(totals.anneeN)}</td>
      <td style={{ ...tdBoldRight, background: '#f0f0f0' }}>{fmtM(totals.anneeN1)}</td>
      <td style={{ ...tdBoldRight, background: '#f0f0f0' }}>{variation !== 0 ? variation.toFixed(1) + ' %' : ''}</td>
    </tr>
  );

  return (
    <div>
      <NoteToolbar
        title="Note 20 — Banques, crédit d'escompte et de trésorerie"
        exercices={exercices} selectedExercice={selectedExercice} onSelectExercice={setSelectedExercice}
        editing={editing} saving={saving} saved={saved}
        onEdit={() => setEditing(true)} onSave={handleSave} onPreview={pdf.openPreview} onBack={onBack}
      />
      <div className="etat-toolbar-actions" style={{ justifyContent: 'flex-end', padding: '0 16px' }}>
        <button className="etat-action-btn" onClick={() => setHideEmpty(!hideEmpty)} style={{ background: hideEmpty ? '#1A3A5C' : '#e5e7eb', color: hideEmpty ? '#fff' : '#333', border: 'none' }}><LuEyeOff size={16} /> {hideEmpty ? 'Afficher tout' : 'Masquer vides'}</button>
      </div>

      {pdf.previewUrl && (
        <PDFPreviewModal previewUrl={pdf.previewUrl} title="Apercu — Note 20" onClose={pdf.closePreview} onDownload={pdf.downloadPDF} onPrint={pdf.printPDF} />
      )}

      <BalanceSourcePanel
        lignes={lignesN}
        groups={RUBRIQUES.map(r => ({ label: r.label, prefixes: r.prefixes }))}
        title="Soldes balance — Banques, credits de tresorerie"
      />

      <div ref={pageRef} style={{
        width: '210mm', minHeight: '297mm', background: '#fff',
        margin: '0 auto 20px', padding: '8mm 10mm',
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
          NOTE 20 — BANQUES, CREDIT D'ESCOMPTE ET DE TRESORERIE
        </h3>

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
            {escompteRows.map(r => renderRow(r))}
            {renderTotalRow('TOTAL: BANQUES, CREDITS D\'ESCOMPTE ET DE TRESORERIE', totalEscompte, calcVar(totalEscompte))}
            {creditsRows.map(r => renderRow(r))}
            {renderTotalRow('TOTAL: BANQUES, CREDITS DE TRESORERIE', totalCredits, calcVar(totalCredits))}
            <tr><td colSpan={4} style={{ ...tdStyle, height: 6 }}></td></tr>
            {renderTotalRow('TOTAL GENERAL', totalGeneral, calcVar(totalGeneral))}
          </tbody>
        </table>

        <div style={{ border: '0.5px solid #000', borderTop: 'none', padding: '10px 12px', marginBottom: 10 }}>
          <p style={{ fontSize: 12, fontWeight: 700, marginBottom: 6, marginTop: 0 }}>Commentaire :</p>
          <EditableComment value={commentaire} onChange={setCommentaire} editing={editing} minHeight={30} />
        </div>

        <p style={{ fontSize: 10, fontStyle: 'italic', color: '#555', margin: 0 }}>
          NB : « Banques et intérêts courus » figure dans cette rubrique si le compte principal attaché est créditeur.
        </p>
      </div>
    </div>
  );
}

export default Note20;
