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

interface Note15BProps extends EtatBaseProps {
  onGoToParametres?: () => void;
}

interface Rubrique {
  label: string;
  prefixes: string[];
}

const RUBRIQUES: Rubrique[] = [
  { label: 'Écart de réévaluation', prefixes: ['106'] },
];

const DEFAULT_COMMENTAIRE = `• Justifier l'inscription de ces dettes dans une rubrique spécifique du passif du bilan « Autres fonds propres » (faible probabilité de remboursement, absence d'échéancier...)\n• Justifier le caractère significatif du montant total de cette rubrique.\n• Commenter toute variation significative.`;

function Note15B({ entiteName, entiteNif = '', entiteId, offre, onBack }: Note15BProps): React.JSX.Element {
  const {
    exercices, selectedExercice, setSelectedExercice,
    params, setParams, editing, setEditing, saving, saved, saveParams, annee, dateFin, duree,
  } = useNoteData({ entiteId });

  const pageRef = useRef<HTMLDivElement>(null);
  const pdf = usePDFPreview({ pageRef, fileName: `Note15B_${annee}.pdf`, editing, setEditing });

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
    if (!params['note15b_commentaire'] && !params['note15b_adjustments']) return;
    setCommentaire(params['note15b_commentaire'] || DEFAULT_COMMENTAIRE);
    if (params['note15b_adjustments']) {
      try { setAdjustments(JSON.parse(params['note15b_adjustments'])); } catch { /* */ }
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
    note15b_adjustments: JSON.stringify(adjustments),
    note15b_commentaire: commentaire,
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
    const variationAbs = n - n1;
    const variationPct = n1 !== 0 ? ((n - n1) / Math.abs(n1) * 100) : 0;
    return { anneeN: n, anneeN1: n1, variationAbs, variationPct };
  };

  const rows = RUBRIQUES.map(r => ({ ...r, vals: computeRow(r) }));
  const total = rows.reduce((a, r) => ({ anneeN: a.anneeN + r.vals.anneeN, anneeN1: a.anneeN1 + r.vals.anneeN1 }), { anneeN: 0, anneeN1: 0 });
  const totalVariationAbs = total.anneeN - total.anneeN1;
  const totalVariationPct = total.anneeN1 !== 0 ? ((total.anneeN - total.anneeN1) / Math.abs(total.anneeN1) * 100) : 0;

  const renderAdjInput = (label: string, field: string, baseValue: number) => {
    if (!editing) return fmtM(baseValue);
    const adj = getAdj(label, field);
    return <input value={adj || ''} onChange={e => { const v = e.target.value === '' ? 0 : parseFloat(e.target.value.replace(/\s/g, '').replace(',', '.')) || 0; setAdj(label, field, v); }} style={inputSt} placeholder={fmtM(baseValue - adj)} />;
  };

  const renderStringInput = (label: string, field: string) => {
    if (!editing) return fmtM(getAdj(label, field));
    return <input value={getAdj(label, field) || ''} onChange={e => { const v = e.target.value === '' ? 0 : parseFloat(e.target.value.replace(/\s/g, '').replace(',', '.')) || 0; setAdj(label, field, v); }} style={inputSt} />;
  };

  return (
    <div>
      <NoteToolbar
        title="Note 15B — Autres fonds propres"
        exercices={exercices} selectedExercice={selectedExercice} onSelectExercice={setSelectedExercice}
        editing={editing} saving={saving} saved={saved}
        onEdit={() => setEditing(true)} onSave={handleSave} onPreview={pdf.openPreview} onBack={onBack}
      >
        <button className="etat-action-btn" onClick={() => setHideEmpty(!hideEmpty)} style={{ background: hideEmpty ? '#1A3A5C' : '#e5e7eb', color: hideEmpty ? '#fff' : '#333', border: 'none' }}><LuEyeOff size={16} /> {hideEmpty ? 'Afficher tout' : 'Masquer vides'}</button>
      </NoteToolbar>

      {pdf.previewUrl && (
        <PDFPreviewModal previewUrl={pdf.previewUrl} title="Apercu — Note 15B" onClose={pdf.closePreview} onDownload={pdf.downloadPDF} onPrint={pdf.printPDF} />
      )}

      <BalanceSourcePanel
        lignes={lignesN}
        groups={RUBRIQUES.map(r => ({ label: r.label, prefixes: r.prefixes }))}
        title="Soldes balance — Autres fonds propres"
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
              <span className="etat-header-label">Designation entite :</span>
              <span className="etat-header-value">{entiteName || ''}</span>
              <span className="etat-header-label">Exercice clos le :</span>
              <span className="etat-header-value-right">{fmtDateShort(dateFin)}</span>
            </div>
            <div className="etat-header-row">
              <span className="etat-header-label">Numero d'identification :</span>
              <span className="etat-header-value">{entiteNif || ''}</span>
              <span className="etat-header-label">Duree (en mois) :</span>
              <span className="etat-header-value-right">{duree}</span>
            </div>
          </div>
        </div>
        <h3 style={{ textAlign: 'center', fontSize: 14, fontWeight: 700, margin: '30px 0 20px', textDecoration: 'underline' }}>
          NOTE 15B — AUTRES FONDS PROPRES
        </h3>

        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 0 }}>
          <thead>
            <tr>
              <th style={{ ...thStyle, width: '35%' }}>Libelles</th>
              <th style={{ ...thStyle, width: '5%' }}>NOTE</th>
              <th style={thStyle}>Annee N</th>
              <th style={thStyle}>Annee N-1</th>
              <th style={thStyle}>Variation en valeur absolue</th>
              <th style={thStyle}>Variation en %</th>
              <th style={thStyle}>Echeances</th>
            </tr>
          </thead>
          <tbody>
            {rows.filter(r => !hideEmpty || r.vals.anneeN !== 0 || r.vals.anneeN1 !== 0).map(r => (
              <tr key={r.label}>
                <td style={tdStyle}>{r.label}</td>
                <td style={{ ...tdStyle, textAlign: 'center' }}></td>
                <td style={tdRight}>{renderAdjInput(r.label, 'anneeN', r.vals.anneeN)}</td>
                <td style={tdRight}>{renderAdjInput(r.label, 'anneeN1', r.vals.anneeN1)}</td>
                <td style={{ ...tdRight, background: '#fafafa' }}>{fmtM(r.vals.variationAbs)}</td>
                <td style={{ ...tdRight, background: '#fafafa' }}>{r.vals.variationPct !== 0 ? r.vals.variationPct.toFixed(1) + ' %' : ''}</td>
                <td style={tdRight}>{renderStringInput(r.label, 'echeances')}</td>
              </tr>
            ))}
            <tr>
              <td style={{ ...tdBold, background: '#f0f0f0' }}>TOTAL AUTRES FONDS PROPRES</td>
              <td style={{ ...tdBold, background: '#f0f0f0', textAlign: 'center' }}></td>
              <td style={{ ...tdBoldRight, background: '#f0f0f0' }}>{fmtM(total.anneeN)}</td>
              <td style={{ ...tdBoldRight, background: '#f0f0f0' }}>{fmtM(total.anneeN1)}</td>
              <td style={{ ...tdBoldRight, background: '#f0f0f0' }}>{fmtM(totalVariationAbs)}</td>
              <td style={{ ...tdBoldRight, background: '#f0f0f0' }}>{totalVariationPct !== 0 ? totalVariationPct.toFixed(1) + ' %' : ''}</td>
              <td style={{ ...tdBold, background: '#f0f0f0' }}></td>
            </tr>
          </tbody>
        </table>

        <p style={{ fontSize: 10, fontStyle: 'italic', color: '#555', margin: '8px 0 6px' }}>
          (1) Le cas échéant, une rubrique « Autres fonds propres » (montant des émissions de titres participatifs, avances conditionnées, ...) sur une ligne séparée est intercalée entre les rubriques « Total capitaux propres et ressources assimilées » et « Emprunts et dettes financières » si le montant des autres fonds propres est significatif.
        </p>

        <div style={{ border: '0.5px solid #000', padding: '10px 12px' }}>
          <p style={{ fontSize: 12, fontWeight: 700, marginBottom: 6, marginTop: 0 }}>Commentaire :</p>
          <EditableComment value={commentaire} onChange={setCommentaire} editing={editing} minHeight={60} />
        </div>
      </div>
    </div>
  );
}

export default Note15B;
