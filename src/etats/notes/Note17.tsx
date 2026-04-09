import React, { useState, useRef, useEffect } from 'react';
import { LuEyeOff, LuInfo } from 'react-icons/lu';
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

interface Note17Props extends EtatBaseProps {
  onGoToParametres?: () => void;
}

interface Rubrique {
  label: string;
  prefixes: string[];
  crediteur?: boolean;
}

const RUBRIQUES_FOURNISSEURS: Rubrique[] = [
  { label: 'Fournisseurs, dettes en compte (hors groupe)', prefixes: ['401', '403'], crediteur: true },
  { label: 'Fournisseurs, effets à payer (hors groupe)', prefixes: ['402'], crediteur: true },
  { label: 'Fournisseurs, dettes et effets à payer Groupe', prefixes: [], crediteur: true },
  { label: 'Fournisseurs, factures non parvenues (hors groupe)', prefixes: ['408'], crediteur: true },
  { label: 'Fournisseurs, factures non parvenues Groupe', prefixes: [], crediteur: true },
];

const RUBRIQUES_DEBITEURS: Rubrique[] = [
  { label: 'Fournisseurs, avances et acomptes (hors groupe)', prefixes: ['409'] },
  { label: 'Fournisseurs, avances et acomptes Groupe', prefixes: [] },
  { label: 'Autres fournisseurs débiteurs', prefixes: [] },
];

const DEFAULT_COMMENTAIRE = `• Commenter toute variation significative.\n• Indiquer pour les dettes du groupe le nom de la societe du groupe et le % de titres detenus.\n• Commenter les dettes anciennes.`;

function Note17({ entiteName, entiteNif = '', entiteId, offre, onBack }: Note17Props): React.JSX.Element {
  const {
    exercices, selectedExercice, setSelectedExercice,
    params, setParams, editing, setEditing, saving, saved, saveParams, annee, dateFin, duree,
  } = useNoteData({ entiteId });

  const pageRef = useRef<HTMLDivElement>(null);
  const pdf = usePDFPreview({ pageRef, fileName: `Note17_${annee}.pdf`, editing, setEditing, orientation: 'l' });

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
    if (!params['note17_commentaire'] && !params['note17_adjustments']) return;
    setCommentaire(params['note17_commentaire'] || DEFAULT_COMMENTAIRE);
    if (params['note17_adjustments']) {
      try { setAdjustments(JSON.parse(params['note17_adjustments'])); } catch { /* */ }
    }
  }, [params]);

  // Charger balance N et N-1
  const balanceSource = offre === 'comptabilite' ? 'ecritures' : 'import';
  useEffect(() => {
    if (!entiteId || !selectedExercice) return;
    const load = async () => {
      try {
        if (balanceSource === 'ecritures') { const res = await fetch('/api/ecritures/balance/' + entiteId + '/' + selectedExercice.id); setLignesN((await res.json()).lignes || []); }
        else { const res = await fetch('/api/balance/' + entiteId + '/' + selectedExercice.id + '/N'); setLignesN((await res.json()).lignes || []); }
      } catch { setLignesN([]); }
      try {
        const exN1 = exercices.find(e => e.annee === selectedExercice.annee - 1);
        if (exN1) {
          if (balanceSource === 'ecritures') { const res = await fetch('/api/ecritures/balance/' + entiteId + '/' + exN1.id); setLignesN1((await res.json()).lignes || []); }
          else { const res = await fetch('/api/balance/' + entiteId + '/' + exN1.id + '/N'); setLignesN1((await res.json()).lignes || []); }
        } else { const res = await fetch('/api/balance/' + entiteId + '/' + selectedExercice.id + '/N-1'); setLignesN1((await res.json()).lignes || []); }
      } catch { setLignesN1([]); }
    };
    load();
  }, [entiteId, selectedExercice, balanceSource, exercices]);

  const handleSave = () => saveParams({
    ...params,
    note17_adjustments: JSON.stringify(adjustments),
    note17_commentaire: commentaire,
  });

  const fmtDateShort = (d: string): string => {
    if (!d) return '';
    return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };
  const fmtM = (val: number): string => val === 0 ? '0' : Math.round(val).toLocaleString('fr-FR');

  const computeForPrefixes = (lignes: BalanceLigne[], prefixes: string[], crediteur: boolean) => {
    let total = 0;
    for (const l of lignes) {
      const num = (l.numero_compte || '').trim();
      if (!prefixes.some(p => num.startsWith(p))) continue;
      if (crediteur) total += (parseFloat(String(l.solde_crediteur)) || 0) - (parseFloat(String(l.solde_debiteur)) || 0);
      else total += (parseFloat(String(l.solde_debiteur)) || 0) - (parseFloat(String(l.solde_crediteur)) || 0);
    }
    return total;
  };

  const computeRow = (r: Rubrique) => {
    const credit = r.crediteur || false;
    const n = computeForPrefixes(lignesN, r.prefixes, credit) + getAdj(r.label, 'anneeN');
    const n1 = computeForPrefixes(lignesN1, r.prefixes, credit) + getAdj(r.label, 'anneeN1');
    const variation = n1 !== 0 ? ((n - n1) / Math.abs(n1) * 100) : 0;
    return { anneeN: n, anneeN1: n1, variation };
  };

  const fournRows = RUBRIQUES_FOURNISSEURS.map(r => ({ ...r, vals: computeRow(r) }));
  const debitRows = RUBRIQUES_DEBITEURS.map(r => ({ ...r, vals: computeRow(r) }));

  const totalFourn = fournRows.reduce((a, r) => ({ anneeN: a.anneeN + r.vals.anneeN, anneeN1: a.anneeN1 + r.vals.anneeN1 }), { anneeN: 0, anneeN1: 0 });
  const totalFournVar = totalFourn.anneeN1 !== 0 ? ((totalFourn.anneeN - totalFourn.anneeN1) / Math.abs(totalFourn.anneeN1) * 100) : 0;

  const totalDebit = debitRows.reduce((a, r) => ({ anneeN: a.anneeN + r.vals.anneeN, anneeN1: a.anneeN1 + r.vals.anneeN1 }), { anneeN: 0, anneeN1: 0 });
  const totalDebitVar = totalDebit.anneeN1 !== 0 ? ((totalDebit.anneeN - totalDebit.anneeN1) / Math.abs(totalDebit.anneeN1) * 100) : 0;

  const renderAdjInput = (label: string, field: string, baseValue: number) => {
    if (!editing) return fmtM(baseValue);
    const adj = getAdj(label, field);
    return <input value={adj || ''} onChange={e => { const v = e.target.value === '' ? 0 : parseFloat(e.target.value.replace(/\s/g, '').replace(',', '.')) || 0; setAdj(label, field, v); }} style={inputSt} placeholder={fmtM(baseValue - adj)} />;
  };

  const renderCreanceInput = (label: string, field: string) => {
    if (!editing) return fmtM(getAdj(label, field));
    return <input value={getAdj(label, field) || ''} onChange={e => { const v = e.target.value === '' ? 0 : parseFloat(e.target.value.replace(/\s/g, '').replace(',', '.')) || 0; setAdj(label, field, v); }} style={inputSt} />;
  };

  const renderRow = (r: { label: string; vals: { anneeN: number; anneeN1: number; variation: number } }) => {
    if (hideEmpty && r.vals.anneeN === 0 && r.vals.anneeN1 === 0) return null;
    return (
      <tr key={r.label}>
        <td style={tdStyle}>{r.label}</td>
        <td style={tdRight}>{renderAdjInput(r.label, 'anneeN', r.vals.anneeN)}</td>
        <td style={tdRight}>{renderAdjInput(r.label, 'anneeN1', r.vals.anneeN1)}</td>
        <td style={{ ...tdRight, background: '#fafafa' }}>{r.vals.variation !== 0 ? r.vals.variation.toFixed(1) + ' %' : ''}</td>
        <td style={tdRight}>{renderCreanceInput(r.label, 'dettes1an')}</td>
        <td style={tdRight}>{renderCreanceInput(r.label, 'dettes1a2ans')}</td>
        <td style={tdRight}>{renderCreanceInput(r.label, 'dettesPlus2ans')}</td>
      </tr>
    );
  };

  const renderTotalRow = (label: string, totals: { anneeN: number; anneeN1: number }, variation: number) => (
    <tr>
      <td style={{ ...tdBold, background: '#f0f0f0' }}>{label}</td>
      <td style={{ ...tdBoldRight, background: '#f0f0f0' }}>{fmtM(totals.anneeN)}</td>
      <td style={{ ...tdBoldRight, background: '#f0f0f0' }}>{fmtM(totals.anneeN1)}</td>
      <td style={{ ...tdBoldRight, background: '#f0f0f0' }}>{variation !== 0 ? variation.toFixed(1) + ' %' : ''}</td>
      <td style={{ ...tdBold, background: '#f0f0f0' }}></td>
      <td style={{ ...tdBold, background: '#f0f0f0' }}></td>
      <td style={{ ...tdBold, background: '#f0f0f0' }}></td>
    </tr>
  );

  return (
    <div>
      <NoteToolbar
        title="Note 17 — Fournisseurs d'exploitation"
        exercices={exercices} selectedExercice={selectedExercice} onSelectExercice={setSelectedExercice}
        editing={editing} saving={saving} saved={saved}
        onEdit={() => setEditing(true)} onSave={handleSave} onPreview={pdf.openPreview} onBack={onBack}
      >
        <button className="etat-action-btn" onClick={() => setHideEmpty(!hideEmpty)} style={{ background: hideEmpty ? '#1A3A5C' : '#e5e7eb', color: hideEmpty ? '#fff' : '#333', border: 'none' }}><LuEyeOff size={16} /> {hideEmpty ? 'Afficher tout' : 'Masquer vides'}</button>
      </NoteToolbar>

      {pdf.previewUrl && (
        <PDFPreviewModal previewUrl={pdf.previewUrl} title="Apercu — Note 17" onClose={pdf.closePreview} onDownload={pdf.downloadPDF} onPrint={pdf.printPDF} />
      )}

      <div style={{ margin: '12px 20px', padding: '12px 16px', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 8, fontSize: 12, color: '#1e40af', lineHeight: 1.6 }}>
        <div style={{ fontWeight: 700, marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
          <LuInfo size={14} /> Note d'information — Note 17
        </div>
        <ul style={{ margin: 0, paddingLeft: 18 }}>
          <li>Comptes fournisseurs (401, 402, 404, 408) : solde créditeur = dettes fournisseurs.</li>
          <li>Fournisseurs débiteurs (409) : avances et acomptes versés, solde débiteur.</li>
          <li>Échéances : à renseigner manuellement (1 an, 1-2 ans, plus de 2 ans).</li>
        </ul>
      </div>

      <BalanceSourcePanel
        lignes={lignesN}
        groups={[...RUBRIQUES_FOURNISSEURS, ...RUBRIQUES_DEBITEURS].map(r => ({ label: r.label, prefixes: r.prefixes }))}
        title="Soldes balance — Fournisseurs d'exploitation"
      />

      <div ref={pageRef} style={{
        width: '297mm', minHeight: '210mm', background: '#fff',
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
          NOTE 17 — FOURNISSEURS D'EXPLOITATION
        </h3>

        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 0 }}>
          <thead>
            <tr>
              <th style={{ ...thStyle, width: '30%' }} rowSpan={2}>Libelles</th>
              <th style={thStyle} rowSpan={2}>Annee N</th>
              <th style={thStyle} rowSpan={2}>Annee N-1</th>
              <th style={thStyle} rowSpan={2}>Variation en %</th>
              <th style={thStyle} colSpan={3}>Echeances des dettes</th>
            </tr>
            <tr>
              <th style={{ ...thStyle, fontSize: 10 }}>Dettes a un an au plus</th>
              <th style={{ ...thStyle, fontSize: 10 }}>Dettes a plus d'un an et a deux ans au plus</th>
              <th style={{ ...thStyle, fontSize: 10 }}>Dettes a plus de deux ans</th>
            </tr>
          </thead>
          <tbody>
            {fournRows.map(r => renderRow(r))}
            {renderTotalRow('TOTAL FOURNISSEURS', totalFourn, totalFournVar)}
            {debitRows.map(r => renderRow(r))}
            {renderTotalRow('TOTAL FOURNISSEURS DEBITEURS', totalDebit, totalDebitVar)}
          </tbody>
        </table>

        <div style={{ border: '0.5px solid #000', borderTop: 'none', padding: '10px 12px' }}>
          <p style={{ fontSize: 12, fontWeight: 700, marginBottom: 6, marginTop: 0 }}>Commentaire :</p>
          <EditableComment value={commentaire} onChange={setCommentaire} editing={editing} minHeight={50} />
        </div>
      </div>
    </div>
  );
}

export default Note17;
