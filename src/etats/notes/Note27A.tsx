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

interface Note27AProps extends EtatBaseProps { onGoToParametres?: () => void; }
interface Rubrique { label: string; prefixes: string[]; }

const RUBRIQUES: Rubrique[] = [
  { label: 'Rémunérations directes versées au personnel', prefixes: ['661', '662'] },
  { label: 'Indemnités forfaitaires versées au personnel', prefixes: ['663'] },
  { label: 'Charges sociales', prefixes: ['664'] },
  { label: 'Rémunérations et charges sociales de l\'exploitant individuel', prefixes: ['665'] },
  { label: 'Rémunération transférée de personnel extérieur', prefixes: ['667'] },
  { label: 'Autres charges sociales', prefixes: ['666', '668'] },
];

const DEFAULT_COMMENTAIRE = `• Commenter toute variation significative.\n• Indiquer la nature et la durée du contrat du personnel extérieur.`;

function Note27A({ entiteName, entiteNif = '', entiteId, offre, onBack }: Note27AProps): React.JSX.Element {
  const {
    exercices, selectedExercice, setSelectedExercice,
    params, setParams, editing, setEditing, saving, saved, saveParams, annee, dateFin, duree,
  } = useNoteData({ entiteId });

  const pageRef = useRef<HTMLDivElement>(null);
  const pdf = usePDFPreview({ pageRef, fileName: `Note27A_${annee}.pdf`, editing, setEditing });

  const [hideEmpty, setHideEmpty] = useState(false);
  const [lignesN, setLignesN] = useState<BalanceLigne[]>([]);
  const [lignesN1, setLignesN1] = useState<BalanceLigne[]>([]);
  const [adjustments, setAdjustments] = useState<Record<string, Record<string, number>>>({});
  const [commentaire, setCommentaire] = useState(DEFAULT_COMMENTAIRE);

  const setAdj = (l: string, f: string, v: number) => { setAdjustments(p => ({ ...p, [l]: { ...(p[l] || {}), [f]: v } })); };
  const getAdj = (l: string, f: string): number => adjustments[l]?.[f] || 0;

  // Charger adjustments/commentaire depuis params
  useEffect(() => {
    if (!params['note27a_commentaire'] && !params['note27a_adjustments']) return;
    setCommentaire(params['note27a_commentaire'] || DEFAULT_COMMENTAIRE);
    if (params['note27a_adjustments']) {
      try { setAdjustments(JSON.parse(params['note27a_adjustments'])); } catch { /* */ }
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
    note27a_adjustments: JSON.stringify(adjustments),
    note27a_commentaire: commentaire,
  });

  const fmtDateShort = (d: string): string => {
    if (!d) return '';
    return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };
  const fmtM = (v: number): string => { if (v === 0) return ''; return Math.round(v).toLocaleString('fr-FR'); };

  const comp = (lignes: BalanceLigne[], pfx: string[]) => {
    let t = 0;
    for (const l of lignes) {
      const n = (l.numero_compte || '').trim();
      if (!pfx.some(p => n.startsWith(p))) continue;
      t += (parseFloat(String(l.solde_debiteur)) || 0) - (parseFloat(String(l.solde_crediteur)) || 0);
    }
    return t;
  };

  const computeRow = (r: Rubrique) => {
    const n = comp(lignesN, r.prefixes) + getAdj(r.label, 'anneeN');
    const n1 = comp(lignesN1, r.prefixes) + getAdj(r.label, 'anneeN1');
    return { anneeN: n, anneeN1: n1, variation: n1 !== 0 ? ((n - n1) / Math.abs(n1) * 100) : 0 };
  };

  const rows = RUBRIQUES.map(r => ({ ...r, vals: computeRow(r) }));
  const total = rows.reduce((a, r) => ({ anneeN: a.anneeN + r.vals.anneeN, anneeN1: a.anneeN1 + r.vals.anneeN1 }), { anneeN: 0, anneeN1: 0 });
  const totalVar = total.anneeN1 !== 0 ? ((total.anneeN - total.anneeN1) / Math.abs(total.anneeN1) * 100) : 0;

  const renderAdj = (l: string, f: string, bv: number) => {
    if (!editing) return fmtM(bv);
    const a = getAdj(l, f);
    return <input value={a || ''} onChange={e => { const v = e.target.value === '' ? 0 : parseFloat(e.target.value.replace(/\s/g, '').replace(',', '.')) || 0; setAdj(l, f, v); }} style={inputSt} placeholder={fmtM(bv - a)} />;
  };

  return (
    <div>
      <NoteToolbar
        title="Note 27A — Charges de personnel"
        exercices={exercices} selectedExercice={selectedExercice} onSelectExercice={setSelectedExercice}
        editing={editing} saving={saving} saved={saved}
        onEdit={() => setEditing(true)} onSave={handleSave} onPreview={pdf.openPreview} onBack={onBack}
      >
        <button className="etat-action-btn" onClick={() => setHideEmpty(!hideEmpty)} style={{ background: hideEmpty ? '#1A3A5C' : '#e5e7eb', color: hideEmpty ? '#fff' : '#333', border: 'none' }}><LuEyeOff size={16} /> {hideEmpty ? 'Afficher tout' : 'Masquer vides'}</button>
      </NoteToolbar>

      {pdf.previewUrl && (
        <PDFPreviewModal previewUrl={pdf.previewUrl} title="Apercu — Note 27A" onClose={pdf.closePreview} onDownload={pdf.downloadPDF} onPrint={pdf.printPDF} />
      )}

      <BalanceSourcePanel
        lignes={lignesN}
        groups={RUBRIQUES.map(r => ({ label: r.label, prefixes: r.prefixes }))}
        title="Soldes balance — Charges de personnel"
      />


      {/* Bulle d'information */}
      <div style={{ margin: '12px 20px', padding: '12px 16px', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 8, fontSize: 12, color: '#1e40af', lineHeight: 1.6 }}>
        <div style={{ fontWeight: 700, marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
          <LuInfo size={14} /> Note d'information — Note 27A
        </div>
        <ul style={{ margin: 0, paddingLeft: 18 }}>
          <li><strong>Salaires bruts :</strong> Remunerations brutes du personnel permanent et temporaire (comptes 661/662).</li>
          <li><strong>Cotisations sociales :</strong> Part employeur : CNSS, CAMU, retraite complementaire, mutuelle (compte 664).</li>
          <li><strong>Avantages en nature :</strong> Vehicule, logement, telephone, evalues et soumis a cotisations (compte 663).</li>
          <li><strong>Indemnites et primes :</strong> Anciennete, fin de carriere, licenciement (comptes 666/667).</li>
          <li>Doit etre coherent avec la Note 27B (effectifs et masse salariale).</li>
        </ul>
      </div>

      <div ref={pageRef} style={{ width: '210mm', minHeight: '297mm', background: '#fff', margin: '0 auto 20px', padding: '8mm 10mm', boxShadow: '0 2px 12px rgba(0,0,0,0.1)', boxSizing: 'border-box', fontFamily: "'Inter', 'Segoe UI', Arial, sans-serif", fontSize: 12, color: '#1a1a1a' }}>
        <div className="etat-header-officiel"><div className="etat-header-grid"><div className="etat-header-row"><span className="etat-header-label">Designation entite :</span><span className="etat-header-value">{entiteName || ''}</span><span className="etat-header-label">Exercice clos le :</span><span className="etat-header-value-right">{fmtDateShort(dateFin)}</span></div><div className="etat-header-row"><span className="etat-header-label">Numero d'identification :</span><span className="etat-header-value">{entiteNif || ''}</span><span className="etat-header-label">Duree (en mois) :</span><span className="etat-header-value-right">{duree}</span></div></div></div>
        <h3 style={{ textAlign: 'center', fontSize: 14, fontWeight: 700, margin: '30px 0 20px', textDecoration: 'underline' }}>
          NOTE 27A — CHARGES DE PERSONNEL
        </h3>
        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 0 }}>
          <thead><tr><th style={{ ...thStyle, width: '55%' }}>Libelles</th><th style={thStyle}>Annee N</th><th style={thStyle}>Annee N-1</th><th style={thStyle}>Variation en %</th></tr></thead>
          <tbody>
            {rows.filter(r => !hideEmpty || r.vals.anneeN !== 0 || r.vals.anneeN1 !== 0).map(r => (
              <tr key={r.label}>
                <td style={tdStyle}>{r.label}</td>
                <td style={tdRight}>{renderAdj(r.label, 'anneeN', r.vals.anneeN)}</td>
                <td style={tdRight}>{renderAdj(r.label, 'anneeN1', r.vals.anneeN1)}</td>
                <td style={{ ...tdRight, background: '#fafafa' }}>{r.vals.variation !== 0 ? r.vals.variation.toFixed(1) + ' %' : ''}</td>
              </tr>
            ))}
            <tr>
              <td style={{ ...tdBold, background: '#f0f0f0' }}>TOTAL</td>
              <td style={{ ...tdBoldRight, background: '#f0f0f0' }}>{fmtM(total.anneeN)}</td>
              <td style={{ ...tdBoldRight, background: '#f0f0f0' }}>{fmtM(total.anneeN1)}</td>
              <td style={{ ...tdBoldRight, background: '#f0f0f0' }}>{totalVar !== 0 ? totalVar.toFixed(1) + ' %' : ''}</td>
            </tr>
          </tbody>
        </table>
        <div style={{ border: '0.5px solid #000', borderTop: 'none', padding: '10px 12px' }}>
          <p style={{ fontSize: 12, fontWeight: 700, marginBottom: 6, marginTop: 0 }}>Commentaire :</p>
          <EditableComment value={commentaire} onChange={setCommentaire} editing={editing} minHeight={40} />
        </div>
      </div>
    </div>
  );
}

export default Note27A;
