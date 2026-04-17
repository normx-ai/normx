import { clientFetch } from '../../lib/api';
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

interface Note15AProps extends EtatBaseProps {
  onGoToParametres?: () => void;
}

interface Rubrique {
  label: string;
  prefixes: string[];
  note?: string;
  bold?: boolean;
  isTotal?: boolean;
  group?: 'subventions' | 'provisions';
}

const RUBRIQUES: Rubrique[] = [
  // Subventions d'investissement (détail sous 1411-1418)
  { label: 'État', prefixes: ['1411'], group: 'subventions' },
  { label: 'Régions', prefixes: ['1412'], group: 'subventions' },
  { label: 'Départements', prefixes: ['1413'], group: 'subventions' },
  { label: 'Communes et collectivités publiques décentralisées', prefixes: ['1414'], group: 'subventions' },
  { label: 'Entités publiques ou mixtes', prefixes: ['1415'], group: 'subventions' },
  { label: 'Entités et organismes privés', prefixes: ['1416'], group: 'subventions' },
  { label: 'Organismes internationaux', prefixes: ['1417'], group: 'subventions' },
  { label: 'Autres', prefixes: ['1418', '142', '148'], group: 'subventions' },
  { label: 'TOTAL SUBVENTIONS', prefixes: [], bold: true, isTotal: true, group: 'subventions' },
  // Provisions réglementées et fonds assimilés
  { label: 'Amortissements dérogatoires', prefixes: ['151'], group: 'provisions' },
  { label: 'Plus-values de cession à réinvestir', prefixes: ['152'], group: 'provisions' },
  { label: 'Provisions spéciales de réévaluation', prefixes: ['154'], note: '3E', group: 'provisions' },
  { label: 'Provisions réglementées relatives aux immobilisations', prefixes: ['155'], group: 'provisions' },
  { label: 'Provisions réglementées relatives aux stocks', prefixes: ['156'], group: 'provisions' },
  { label: 'Provisions pour investissement', prefixes: ['157'], group: 'provisions' },
  { label: 'Autres provisions et fonds réglementés', prefixes: ['153', '158'], group: 'provisions' },
  { label: 'TOTAL PROVISIONS REGLEMENTEES', prefixes: [], bold: true, isTotal: true, group: 'provisions' },
  // Grand total
  { label: 'TOTAL SUBVENTIONS ET PROVISIONS REGLEMENTEES', prefixes: [], bold: true, isTotal: true },
];

const DEFAULT_COMMENTAIRE = `• Indiquer pour la subvention la date d'octroi, la nature, les obligations éventuelles.\n• Pour les provisions réglementées, indiquer le texte de référence, les obligations.\n• Commenter toute variation significative.`;

function Note15A({ entiteName, entiteNif = '', entiteId, offre, onBack }: Note15AProps): React.JSX.Element {
  const {
    exercices, selectedExercice, setSelectedExercice,
    params, setParams, editing, setEditing, saving, saved, saveParams, annee, dateFin, duree,
  } = useNoteData({ entiteId });

  const pageRef = useRef<HTMLDivElement>(null);
  const pdf = usePDFPreview({ pageRef, fileName: `Note15A_${annee}.pdf`, editing, setEditing, orientation: 'l' });

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
    if (!params['note15a_commentaire'] && !params['note15a_adjustments']) return;
    setCommentaire(params['note15a_commentaire'] || DEFAULT_COMMENTAIRE);
    if (params['note15a_adjustments']) {
      try { setAdjustments(JSON.parse(params['note15a_adjustments'])); } catch { /* */ }
    }
  }, [params]);

  // Charger balance N et N-1
  const balanceSource = offre === 'comptabilite' ? 'ecritures' : 'import';
  useEffect(() => {
    if (!entiteId || !selectedExercice) return;
    const load = async () => {
      try {
        if (balanceSource === 'ecritures') {
          const res = await clientFetch('/api/ecritures/balance/' + entiteId + '/' + selectedExercice.id);
          setLignesN((await res.json()).lignes || []);
        } else {
          const res = await clientFetch('/api/balance/' + entiteId + '/' + selectedExercice.id + '/N');
          setLignesN((await res.json()).lignes || []);
        }
      } catch { setLignesN([]); }
      try {
        const exN1 = exercices.find(e => e.annee === selectedExercice.annee - 1);
        if (exN1) {
          if (balanceSource === 'ecritures') {
            const res = await clientFetch('/api/ecritures/balance/' + entiteId + '/' + exN1.id);
            setLignesN1((await res.json()).lignes || []);
          } else {
            const res = await clientFetch('/api/balance/' + entiteId + '/' + exN1.id + '/N');
            setLignesN1((await res.json()).lignes || []);
          }
        } else {
          const res = await clientFetch('/api/balance/' + entiteId + '/' + selectedExercice.id + '/N-1');
          setLignesN1((await res.json()).lignes || []);
        }
      } catch { setLignesN1([]); }
    };
    load();
  }, [entiteId, selectedExercice, balanceSource, exercices]);

  const handleSave = () => saveParams({
    ...params,
    note15a_adjustments: JSON.stringify(adjustments),
    note15a_commentaire: commentaire,
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
    const regimeFiscal = getAdj(r.label, 'regimeFiscal');
    const echeances = getAdj(r.label, 'echeances');
    return { anneeN: n, anneeN1: n1, variationAbs, variationPct, regimeFiscal, echeances };
  };

  const subventionRows = RUBRIQUES.filter(r => r.group === 'subventions' && !r.isTotal);
  const provisionRows = RUBRIQUES.filter(r => r.group === 'provisions' && !r.isTotal);

  const sumRows = (rows: Rubrique[]) => rows.reduce((a, r) => {
    const v = computeRow(r);
    return { anneeN: a.anneeN + v.anneeN, anneeN1: a.anneeN1 + v.anneeN1 };
  }, { anneeN: 0, anneeN1: 0 });

  const totalSubventions = sumRows(subventionRows);
  const totalProvisions = sumRows(provisionRows);
  const totalGeneral = { anneeN: totalSubventions.anneeN + totalProvisions.anneeN, anneeN1: totalSubventions.anneeN1 + totalProvisions.anneeN1 };

  const renderAdjInput = (label: string, field: string, baseValue: number) => {
    if (!editing) return fmtM(baseValue);
    const adj = getAdj(label, field);
    return <input value={adj || ''} onChange={e => { const v = e.target.value === '' ? 0 : parseFloat(e.target.value.replace(/\s/g, '').replace(',', '.')) || 0; setAdj(label, field, v); }} style={inputSt} placeholder={fmtM(baseValue - adj)} />;
  };

  const renderStringInput = (label: string, field: string) => {
    if (!editing) return fmtM(getAdj(label, field));
    return <input value={getAdj(label, field) || ''} onChange={e => { const v = e.target.value === '' ? 0 : parseFloat(e.target.value.replace(/\s/g, '').replace(',', '.')) || 0; setAdj(label, field, v); }} style={inputSt} />;
  };

  const renderDataRow = (r: Rubrique) => {
    const vals = computeRow(r);
    if (hideEmpty && vals.anneeN === 0 && vals.anneeN1 === 0) return null;
    return (
      <tr key={r.label}>
        <td style={tdStyle}>{r.label}</td>
        <td style={{ ...tdStyle, textAlign: 'center' }}>{r.note || ''}</td>
        <td style={tdRight}>{renderAdjInput(r.label, 'anneeN', vals.anneeN)}</td>
        <td style={tdRight}>{renderAdjInput(r.label, 'anneeN1', vals.anneeN1)}</td>
        <td style={{ ...tdRight, background: '#fafafa' }}>{fmtM(vals.variationAbs)}</td>
        <td style={{ ...tdRight, background: '#fafafa' }}>{vals.variationPct !== 0 ? vals.variationPct.toFixed(1) + ' %' : ''}</td>
        <td style={tdRight}>{renderStringInput(r.label, 'regimeFiscal')}</td>
        <td style={tdRight}>{renderStringInput(r.label, 'echeances')}</td>
      </tr>
    );
  };

  const renderTotalRow = (label: string, totals: { anneeN: number; anneeN1: number }) => {
    const variationAbs = totals.anneeN - totals.anneeN1;
    const variationPct = totals.anneeN1 !== 0 ? ((totals.anneeN - totals.anneeN1) / Math.abs(totals.anneeN1) * 100) : 0;
    return (
      <tr key={label}>
        <td style={{ ...tdBold, background: '#f0f0f0' }}>{label}</td>
        <td style={{ ...tdBold, background: '#f0f0f0', textAlign: 'center' }}></td>
        <td style={{ ...tdBoldRight, background: '#f0f0f0' }}>{fmtM(totals.anneeN)}</td>
        <td style={{ ...tdBoldRight, background: '#f0f0f0' }}>{fmtM(totals.anneeN1)}</td>
        <td style={{ ...tdBoldRight, background: '#f0f0f0' }}>{fmtM(variationAbs)}</td>
        <td style={{ ...tdBoldRight, background: '#f0f0f0' }}>{variationPct !== 0 ? variationPct.toFixed(1) + ' %' : ''}</td>
        <td style={{ ...tdBold, background: '#f0f0f0' }}></td>
        <td style={{ ...tdBold, background: '#f0f0f0' }}></td>
      </tr>
    );
  };

  return (
    <div>
      <NoteToolbar
        title="Note 15A — Subventions et provisions réglementées"
        exercices={exercices} selectedExercice={selectedExercice} onSelectExercice={setSelectedExercice}
        editing={editing} saving={saving} saved={saved}
        onEdit={() => setEditing(true)} onSave={handleSave} onPreview={pdf.openPreview} onBack={onBack}
      >
        <button className="etat-action-btn" onClick={() => setHideEmpty(!hideEmpty)} style={{ background: hideEmpty ? '#1A3A5C' : '#e5e7eb', color: hideEmpty ? '#fff' : '#333', border: 'none' }}><LuEyeOff size={16} /> {hideEmpty ? 'Afficher tout' : 'Masquer vides'}</button>
      </NoteToolbar>

      {pdf.previewUrl && (
        <PDFPreviewModal previewUrl={pdf.previewUrl} title="Apercu — Note 15A" onClose={pdf.closePreview} onDownload={pdf.downloadPDF} onPrint={pdf.printPDF} />
      )}

      <div style={{ margin: '12px 20px', padding: '12px 16px', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 8, fontSize: 12, color: '#1e40af', lineHeight: 1.6 }}>
        <div style={{ fontWeight: 700, marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
          <LuInfo size={14} /> Note d'information — Note 15A
        </div>
        <ul style={{ margin: 0, paddingLeft: 18 }}>
          <li>Subventions d'investissement (1411-1418, 142, 148) : solde créditeur.</li>
          <li>Provisions réglementées (151-158) : solde créditeur.</li>
          <li>Les subventions sont reprises au résultat au rythme des amortissements des biens financés.</li>
        </ul>
      </div>

      <BalanceSourcePanel
        lignes={lignesN}
        groups={RUBRIQUES.filter(r => !r.isTotal).map(r => ({ label: r.label, prefixes: r.prefixes }))}
        title="Soldes balance — Subventions et provisions reglementees"
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
          NOTE 15A — TOTAL SUBVENTIONS ET PROVISIONS REGLEMENTEES
        </h3>

        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 0 }}>
          <thead>
            <tr>
              <th style={{ ...thStyle, width: '28%' }}>Libelles</th>
              <th style={{ ...thStyle, width: '5%' }}>NOTE</th>
              <th style={thStyle}>Annee N</th>
              <th style={thStyle}>Annee N-1</th>
              <th style={thStyle}>Variation en valeur absolue</th>
              <th style={thStyle}>Variation en %</th>
              <th style={thStyle}>Regime fiscal</th>
              <th style={thStyle}>Echeances</th>
            </tr>
          </thead>
          <tbody>
            {subventionRows.map(r => renderDataRow(r))}
            {renderTotalRow('TOTAL SUBVENTIONS', totalSubventions)}
            {provisionRows.map(r => renderDataRow(r))}
            {renderTotalRow('TOTAL PROVISIONS REGLEMENTEES', totalProvisions)}
            {/* Ligne vide */}
            <tr><td colSpan={8} style={{ ...tdStyle, height: 8 }}></td></tr>
            {renderTotalRow('TOTAL SUBVENTIONS ET PROVISIONS REGLEMENTEES', totalGeneral)}
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

export default Note15A;
