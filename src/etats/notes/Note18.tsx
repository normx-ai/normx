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

interface Note18Props extends EtatBaseProps {
  onGoToParametres?: () => void;
}

interface Rubrique {
  label: string;
  prefixes: string[];
  group: 'sociales' | 'fiscales';
}

const RUBRIQUES: Rubrique[] = [
  { label: 'Personnel, avances et acomptes', prefixes: ['421'], group: 'sociales' },
  { label: 'Personnel, remunerations dues', prefixes: ['422'], group: 'sociales' },
  { label: 'Personnel, oppositions, saisies-arrets', prefixes: ['423'], group: 'sociales' },
  { label: 'Personnel, oeuvres sociales internes', prefixes: ['424'], group: 'sociales' },
  { label: 'Representant du personnel', prefixes: ['425'], group: 'sociales' },
  { label: 'Syndicats', prefixes: ['426'], group: 'sociales' },
  { label: 'Personnel, depots recus', prefixes: ['427'], group: 'sociales' },
  { label: 'Personnel, conges a payer', prefixes: ['4281'], group: 'sociales' },
  { label: 'Personnel, autres charges a payer', prefixes: ['4282', '4283', '4284', '4285', '4286', '4287', '4288', '4289'], group: 'sociales' },
  { label: 'Caisse de securite sociale', prefixes: ['431'], group: 'sociales' },
  { label: 'Caisses de retraite', prefixes: ['432'], group: 'sociales' },
  { label: 'Mutuelles', prefixes: ['433'], group: 'sociales' },
  { label: 'Autres organismes sociaux', prefixes: ['434', '435', '436', '437', '438'], group: 'sociales' },
  { label: 'Etat, impots sur les benefices', prefixes: ['441'], group: 'fiscales' },
  { label: 'Etat, autres impots et taxes', prefixes: ['442', '443'], group: 'fiscales' },
  { label: 'Etat, TVA due', prefixes: ['4441', '4443'], group: 'fiscales' },
  { label: 'Etat, autres taxes sur le chiffre d\'affaires', prefixes: ['446'], group: 'fiscales' },
  { label: 'Etat, impots retenus a la source', prefixes: ['447'], group: 'fiscales' },
  { label: 'Etat, charges a payer et produits a recevoir', prefixes: ['448'], group: 'fiscales' },
  { label: 'Etat, creances et dettes diverses', prefixes: ['449'], group: 'fiscales' },
];

const DEFAULT_COMMENTAIRE = `• Commenter toute variation significative.\n• Commenter les dettes anciennes.`;

function Note18({ entiteName, entiteNif = '', entiteId, offre, onBack }: Note18Props): React.JSX.Element {
  const {
    exercices, selectedExercice, setSelectedExercice,
    params, setParams, editing, setEditing, saving, saved, saveParams, annee, dateFin, duree,
  } = useNoteData({ entiteId });

  const pageRef = useRef<HTMLDivElement>(null);
  const pdf = usePDFPreview({ pageRef, fileName: `Note18_${annee}.pdf`, editing, setEditing, orientation: 'l' });

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
    if (!params['note18_commentaire'] && !params['note18_adjustments']) return;
    setCommentaire(params['note18_commentaire'] || DEFAULT_COMMENTAIRE);
    if (params['note18_adjustments']) {
      try { setAdjustments(JSON.parse(params['note18_adjustments'])); } catch { /* */ }
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
    note18_adjustments: JSON.stringify(adjustments),
    note18_commentaire: commentaire,
  });

  const fmtDateShort = (d: string): string => {
    if (!d) return '';
    return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };
  const fmtM = (val: number): string => val === 0 ? '0' : Math.round(val).toLocaleString('fr-FR');

  const computeForPrefixes = (lignes: BalanceLigne[], prefixes: string[]) => {
    let total = 0;
    for (const l of lignes) { const num = (l.numero_compte || '').trim(); if (!prefixes.some(p => num.startsWith(p))) continue; total += parseFloat(String(l.solde_crediteur)) || 0; }
    return total;
  };

  const computeRow = (r: Rubrique) => {
    const n = computeForPrefixes(lignesN, r.prefixes) + getAdj(r.label, 'anneeN');
    const n1 = computeForPrefixes(lignesN1, r.prefixes) + getAdj(r.label, 'anneeN1');
    const variationAbs = n - n1;
    const variationPct = n1 !== 0 ? ((n - n1) / Math.abs(n1) * 100) : 0;
    return { anneeN: n, anneeN1: n1, variationAbs, variationPct };
  };

  const socialesRows = RUBRIQUES.filter(r => r.group === 'sociales').map(r => ({ ...r, vals: computeRow(r) }));
  const fiscalesRows = RUBRIQUES.filter(r => r.group === 'fiscales').map(r => ({ ...r, vals: computeRow(r) }));

  const sumGroup = (rows: { vals: { anneeN: number; anneeN1: number } }[]) => rows.reduce((a, r) => ({ anneeN: a.anneeN + r.vals.anneeN, anneeN1: a.anneeN1 + r.vals.anneeN1 }), { anneeN: 0, anneeN1: 0 });

  const totalSociales = sumGroup(socialesRows);
  const totalFiscales = sumGroup(fiscalesRows);
  const totalGeneral = { anneeN: totalSociales.anneeN + totalFiscales.anneeN, anneeN1: totalSociales.anneeN1 + totalFiscales.anneeN1 };

  const renderAdjInput = (label: string, field: string, baseValue: number) => {
    if (!editing) return fmtM(baseValue);
    const adj = getAdj(label, field);
    return <input value={adj || ''} onChange={e => { const v = e.target.value === '' ? 0 : parseFloat(e.target.value.replace(/\s/g, '').replace(',', '.')) || 0; setAdj(label, field, v); }} style={inputSt} placeholder={fmtM(baseValue - adj)} />;
  };

  const renderCreanceInput = (label: string, field: string) => {
    if (!editing) return fmtM(getAdj(label, field));
    return <input value={getAdj(label, field) || ''} onChange={e => { const v = e.target.value === '' ? 0 : parseFloat(e.target.value.replace(/\s/g, '').replace(',', '.')) || 0; setAdj(label, field, v); }} style={inputSt} />;
  };

  const renderRow = (r: { label: string; vals: { anneeN: number; anneeN1: number; variationAbs: number; variationPct: number } }) => {
    if (hideEmpty && r.vals.anneeN === 0 && r.vals.anneeN1 === 0) return null;
    return (
      <tr key={r.label}>
        <td style={tdStyle}>{r.label}</td>
        <td style={tdRight}>{renderAdjInput(r.label, 'anneeN', r.vals.anneeN)}</td>
        <td style={tdRight}>{renderAdjInput(r.label, 'anneeN1', r.vals.anneeN1)}</td>
        <td style={{ ...tdRight, background: '#fafafa' }}>{fmtM(r.vals.variationAbs)}</td>
        <td style={{ ...tdRight, background: '#fafafa' }}>{r.vals.variationPct !== 0 ? r.vals.variationPct.toFixed(1) + ' %' : ''}</td>
        <td style={tdRight}>{renderCreanceInput(r.label, 'dettes1an')}</td>
        <td style={tdRight}>{renderCreanceInput(r.label, 'dettes1a2ans')}</td>
        <td style={tdRight}>{renderCreanceInput(r.label, 'dettesPlus2ans')}</td>
      </tr>
    );
  };

  const renderTotalRow = (label: string, totals: { anneeN: number; anneeN1: number }) => {
    const variationAbs = totals.anneeN - totals.anneeN1;
    const variationPct = totals.anneeN1 !== 0 ? ((totals.anneeN - totals.anneeN1) / Math.abs(totals.anneeN1) * 100) : 0;
    return (
      <tr key={label}>
        <td style={{ ...tdBold, background: '#f0f0f0' }}>{label}</td>
        <td style={{ ...tdBoldRight, background: '#f0f0f0' }}>{fmtM(totals.anneeN)}</td>
        <td style={{ ...tdBoldRight, background: '#f0f0f0' }}>{fmtM(totals.anneeN1)}</td>
        <td style={{ ...tdBoldRight, background: '#f0f0f0' }}>{fmtM(variationAbs)}</td>
        <td style={{ ...tdBoldRight, background: '#f0f0f0' }}>{variationPct !== 0 ? variationPct.toFixed(1) + ' %' : ''}</td>
        <td style={{ ...tdBold, background: '#f0f0f0' }}></td>
        <td style={{ ...tdBold, background: '#f0f0f0' }}></td>
        <td style={{ ...tdBold, background: '#f0f0f0' }}></td>
      </tr>
    );
  };

  return (
    <div>
      <NoteToolbar
        title="Note 18 — Dettes fiscales et sociales"
        exercices={exercices} selectedExercice={selectedExercice} onSelectExercice={setSelectedExercice}
        editing={editing} saving={saving} saved={saved}
        onEdit={() => setEditing(true)} onSave={handleSave} onPreview={pdf.openPreview} onBack={onBack}
      >
        <button className="etat-action-btn" onClick={() => setHideEmpty(!hideEmpty)} style={{ background: hideEmpty ? '#1A3A5C' : '#e5e7eb', color: hideEmpty ? '#fff' : '#333', border: 'none' }}><LuEyeOff size={16} /> {hideEmpty ? 'Afficher tout' : 'Masquer vides'}</button>
      </NoteToolbar>

      {pdf.previewUrl && (
        <PDFPreviewModal previewUrl={pdf.previewUrl} title="Apercu — Note 18" onClose={pdf.closePreview} onDownload={pdf.downloadPDF} onPrint={pdf.printPDF} />
      )}

      <div style={{ margin: '12px 20px', padding: '12px 16px', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 8, fontSize: 12, color: '#1e40af', lineHeight: 1.6 }}>
        <div style={{ fontWeight: 700, marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
          <LuInfo size={14} /> Note d'information — Note 18
        </div>
        <ul style={{ margin: 0, paddingLeft: 18 }}>
          <li>Dettes sociales (422-438) : solde créditeur = dettes envers le personnel et organismes sociaux. Le compte 421 (avances) est une créance, traitée en Note 8.</li>
          <li>Dettes fiscales (441-449) : solde créditeur = dettes envers l'État (impôts, TVA, retenues à la source).</li>
          <li>Échéances : à renseigner manuellement (1 an, 1-2 ans, plus de 2 ans).</li>
        </ul>
      </div>

      <BalanceSourcePanel
        lignes={lignesN}
        groups={RUBRIQUES.map(r => ({ label: r.label, prefixes: r.prefixes }))}
        title="Soldes balance — Dettes fiscales et sociales"
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
          NOTE 18 — DETTES FISCALES ET SOCIALES
        </h3>

        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 0 }}>
          <thead>
            <tr>
              <th style={{ ...thStyle, width: '28%' }} rowSpan={2}>Libelles</th>
              <th style={thStyle} rowSpan={2}>Annee N</th>
              <th style={thStyle} rowSpan={2}>Annee N-1</th>
              <th style={thStyle} rowSpan={2}>Variation en valeur absolue</th>
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
            {socialesRows.map(r => renderRow(r))}
            {renderTotalRow('TOTAL DETTES SOCIALES', totalSociales)}
            {fiscalesRows.map(r => renderRow(r))}
            {renderTotalRow('TOTAL DETTES FISCALES', totalFiscales)}
            <tr><td colSpan={8} style={{ ...tdStyle, height: 6 }}></td></tr>
            {renderTotalRow('TOTAL DETTES SOCIALES ET FISCALES', totalGeneral)}
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

export default Note18;
