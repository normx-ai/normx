import React, { useState, useRef, useEffect } from 'react';
import { LuEyeOff , LuInfo } from 'react-icons/lu';
import '../BilanSYCEBNL.css';
import '../FicheIdentification.css';
import type { EtatBaseProps, BalanceLigne } from '../../types';
import BalanceSourcePanel from './BalanceSourcePanel';
import { useNoteData } from './useNoteData';
import { useBalanceLignes } from '../../hooks/useBalanceLignes';
import { usePDFPreview } from './usePDFPreview';
import NoteToolbar from './NoteToolbar';
import PDFPreviewModal from './PDFPreviewModal';
import EditableComment from './EditableComment';
import { thStyle, tdStyle, tdRight, tdBold, tdBoldRight, inputSt } from './noteStyles';
import { fmtMontant, fmtDate } from '../../utils/formatters';

interface Note30Props extends EtatBaseProps { onGoToParametres?: () => void; }
interface Rubrique { label: string; prefixes: string[]; group: 'charges' | 'produits'; debit?: boolean; }

// Mapping aligné sur le plan SYSCOHADA révisé 2017 (server/data/plan_comptable_syscohada.json)
const RUBRIQUES: Rubrique[] = [
  // Charges HAO — comptes 83x
  { label: 'Charges HAO constatées', prefixes: ['831'], group: 'charges', debit: true },
  { label: 'Charges liées aux opérations de restructuration', prefixes: ['833'], group: 'charges', debit: true },
  { label: 'Pertes sur créances HAO', prefixes: ['834'], group: 'charges', debit: true },
  { label: 'Dons et libéralités accordés', prefixes: ['835'], group: 'charges', debit: true },
  { label: 'Abandons de créances consentis', prefixes: ['836'], group: 'charges', debit: true },
  { label: 'Charges liées aux opérations de liquidation', prefixes: ['837'], group: 'charges', debit: true },
  { label: 'Charges provisionnées HAO', prefixes: ['839'], group: 'charges', debit: true },
  { label: 'Dotations hors activités ordinaires', prefixes: ['85'], group: 'charges', debit: true },
  { label: 'Participation des travailleurs', prefixes: ['87'], group: 'charges', debit: true },
  { label: 'Subventions d\'équilibre', prefixes: ['88'], group: 'charges', debit: true },
  // Produits HAO — comptes 84x
  { label: 'Produits HAO constatés', prefixes: ['841'], group: 'produits' },
  { label: 'Produits liés aux opérations de restructuration', prefixes: ['843'], group: 'produits' },
  { label: 'Indemnités et subventions HAO', prefixes: ['844'], group: 'produits' },
  { label: 'Dons et libéralités obtenus', prefixes: ['845'], group: 'produits' },
  { label: 'Abandons de créances obtenus', prefixes: ['846'], group: 'produits' },
  { label: 'Produits liés aux opérations de liquidation', prefixes: ['847'], group: 'produits' },
  { label: 'Transferts de charges HAO', prefixes: ['848'], group: 'produits' },
  { label: 'Reprises de charges, provisions et dépréciations HAO', prefixes: ['86'], group: 'produits' },
];

const DEFAULT_COMMENTAIRE = `• Commenter toute variation significative.`;

function Note30({ entiteName, entiteNif = '', entiteId, offre, onBack }: Note30Props): React.JSX.Element {
  const {
    exercices, selectedExercice, setSelectedExercice,
    params, editing, setEditing, saving, saved, saveParams, annee, dateFin, duree,
  } = useNoteData({ entiteId });

  const pageRef = useRef<HTMLDivElement>(null);
  const pdf = usePDFPreview({ pageRef, fileName: `Note30_${annee}.pdf`, editing, setEditing });

  const [hideEmpty, setHideEmpty] = useState(false);
  const { lignesN, lignesN1 } = useBalanceLignes({ entiteId, selectedExercice, exercices, offre });
  const [adjustments, setAdjustments] = useState<Record<string, Record<string, number>>>({});
  const [commentaire, setCommentaire] = useState(DEFAULT_COMMENTAIRE);

  const setAdj = (l: string, f: string, v: number) => { setAdjustments(p => ({ ...p, [l]: { ...(p[l] || {}), [f]: v } })); };
  const getAdj = (l: string, f: string): number => adjustments[l]?.[f] || 0;

  // Charger adjustments/commentaire depuis params
  useEffect(() => {
    if (!params['note30_commentaire'] && !params['note30_adjustments']) return;
    setCommentaire(params['note30_commentaire'] || DEFAULT_COMMENTAIRE);
    if (params['note30_adjustments']) {
      try { setAdjustments(JSON.parse(params['note30_adjustments'])); } catch { /* */ }
    }
  }, [params]);


  const handleSave = () => saveParams({
    ...params,
    note30_adjustments: JSON.stringify(adjustments),
    note30_commentaire: commentaire,
  });

  const compDebit = (lignes: BalanceLigne[], pfx: string[]) => { let t = 0; for (const l of lignes) { const n = (l.numero_compte || '').trim(); if (!pfx.some(p => n.startsWith(p))) continue; t += (parseFloat(String(l.solde_debiteur)) || 0) - (parseFloat(String(l.solde_crediteur)) || 0); } return t; };
  const compCredit = (lignes: BalanceLigne[], pfx: string[]) => { let t = 0; for (const l of lignes) { const n = (l.numero_compte || '').trim(); if (!pfx.some(p => n.startsWith(p))) continue; t += (parseFloat(String(l.solde_crediteur)) || 0) - (parseFloat(String(l.solde_debiteur)) || 0); } return t; };
  const computeRow = (r: Rubrique) => { const calc = r.debit ? compDebit : compCredit; const n = calc(lignesN, r.prefixes) + getAdj(r.label, 'anneeN'); const n1 = calc(lignesN1, r.prefixes) + getAdj(r.label, 'anneeN1'); return { anneeN: n, anneeN1: n1, variation: n1 !== 0 ? ((n - n1) / Math.abs(n1) * 100) : 0 }; };

  const chargesRows = RUBRIQUES.filter(r => r.group === 'charges').map(r => ({ ...r, vals: computeRow(r) }));
  const produitsRows = RUBRIQUES.filter(r => r.group === 'produits').map(r => ({ ...r, vals: computeRow(r) }));
  const sumG = (rows: { vals: { anneeN: number; anneeN1: number } }[]) => rows.reduce((a, r) => ({ anneeN: a.anneeN + r.vals.anneeN, anneeN1: a.anneeN1 + r.vals.anneeN1 }), { anneeN: 0, anneeN1: 0 });
  const totalCharges = sumG(chargesRows); const totalProduits = sumG(produitsRows);
  const totalGeneral = { anneeN: totalProduits.anneeN - totalCharges.anneeN, anneeN1: totalProduits.anneeN1 - totalCharges.anneeN1 };
  const calcVar = (t: { anneeN: number; anneeN1: number }) => t.anneeN1 !== 0 ? ((t.anneeN - t.anneeN1) / Math.abs(t.anneeN1) * 100) : 0;
  const renderAdj = (l: string, f: string, bv: number) => { if (!editing) return fmtMontant(bv); const a = getAdj(l, f); return <input value={a || ''} onChange={e => { const v = e.target.value === '' ? 0 : parseFloat(e.target.value.replace(/\s/g, '').replace(',', '.')) || 0; setAdj(l, f, v); }} style={inputSt} placeholder={fmtMontant(bv - a)} />; };

  const renderRow = (r: { label: string; vals: { anneeN: number; anneeN1: number; variation: number } }) => {
    if (hideEmpty && r.vals.anneeN === 0 && r.vals.anneeN1 === 0) return null;
    return (
    <tr key={r.label}><td style={tdStyle}>{r.label}</td><td style={tdRight}>{renderAdj(r.label, 'anneeN', r.vals.anneeN)}</td><td style={tdRight}>{renderAdj(r.label, 'anneeN1', r.vals.anneeN1)}</td><td style={{ ...tdRight, background: '#fafafa' }}>{r.vals.anneeN1 === 0 ? '-' : r.vals.variation.toFixed(1) + ' %'}</td></tr>
  ); };
  const renderTotalRow = (label: string, t: { anneeN: number; anneeN1: number }) => (
    <tr key={label}><td style={{ ...tdBold, background: '#f0f0f0' }}>{label}</td><td style={{ ...tdBoldRight, background: '#f0f0f0' }}>{fmtMontant(t.anneeN)}</td><td style={{ ...tdBoldRight, background: '#f0f0f0' }}>{fmtMontant(t.anneeN1)}</td><td style={{ ...tdBoldRight, background: '#f0f0f0' }}>{t.anneeN1 === 0 ? '-' : calcVar(t).toFixed(1) + ' %'}</td></tr>
  );

  return (
    <div>
      <NoteToolbar
        title="Note 30 — Autres charges et produits HAO"
        exercices={exercices} selectedExercice={selectedExercice} onSelectExercice={setSelectedExercice}
        editing={editing} saving={saving} saved={saved}
        onEdit={() => setEditing(true)} onSave={handleSave} onPreview={pdf.openPreview} onBack={onBack}
      >
        <button className="etat-action-btn" onClick={() => setHideEmpty(!hideEmpty)} style={{ background: hideEmpty ? '#1A3A5C' : '#e5e7eb', color: hideEmpty ? '#fff' : '#333', border: 'none' }}><LuEyeOff size={16} /> {hideEmpty ? 'Afficher tout' : 'Masquer vides'}</button>
      </NoteToolbar>

      {pdf.previewUrl && (
        <PDFPreviewModal previewUrl={pdf.previewUrl} title="Apercu — Note 30" onClose={pdf.closePreview} onDownload={pdf.downloadPDF} onPrint={pdf.printPDF} />
      )}

      <BalanceSourcePanel
        lignes={lignesN}
        groups={RUBRIQUES.map(r => ({ label: r.label, prefixes: r.prefixes }))}
        title="Soldes balance — Charges et produits HAO"
      />


      {/* Bulle d'information */}
      <div style={{ margin: '12px 20px', padding: '12px 16px', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 8, fontSize: 12, color: '#1e40af', lineHeight: 1.6 }}>
        <div style={{ fontWeight: 700, marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
          <LuInfo size={14} /> Note d'information — Note 30
        </div>
        <ul style={{ margin: 0, paddingLeft: 18 }}>
          <li><strong>Operations HAO :</strong> Operations non liees a l'activite ordinaire (cessions d'immobilisations, restructurations).</li>
          <li><strong>Valeurs comptables cedees :</strong> Compte 81 — valeur nette comptable des immobilisations sorties.</li>
          <li><strong>Produits de cession :</strong> Compte 82 — prix de vente des immobilisations cedees.</li>
          <li><strong>Autres charges / produits HAO :</strong> Subventions d'equilibre, indemnites d'assurance sur sinistre, amendes.</li>
          <li>Le resultat HAO impacte directement le resultat net de l'exercice.</li>
        </ul>
      </div>

      <div ref={pageRef} style={{ width: '210mm', minHeight: '297mm', background: '#fff', margin: '0 auto 20px', padding: '6mm 10mm', boxShadow: '0 2px 12px rgba(0,0,0,0.1)', boxSizing: 'border-box', fontFamily: "'Inter', 'Segoe UI', Arial, sans-serif", fontSize: 12, color: '#1a1a1a' }}>
        <div className="etat-header-officiel"><div className="etat-header-grid"><div className="etat-header-row"><span className="etat-header-label">Designation entite :</span><span className="etat-header-value">{entiteName || ''}</span><span className="etat-header-label">Exercice clos le :</span><span className="etat-header-value-right">{fmtDate(dateFin)}</span></div><div className="etat-header-row"><span className="etat-header-label">Numero d'identification :</span><span className="etat-header-value">{entiteNif || ''}</span><span className="etat-header-label">Duree (en mois) :</span><span className="etat-header-value-right">{duree}</span></div></div></div>
        <h3 style={{ textAlign: 'center', fontSize: 14, fontWeight: 700, margin: '30px 0 20px', textDecoration: 'underline' }}>
          NOTE 30 — AUTRES CHARGES ET PRODUITS HAO
        </h3>

        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 0 }}>
          <thead><tr><th style={{ ...thStyle, width: '55%' }}>Libelles</th><th style={thStyle}>Annee N</th><th style={thStyle}>Annee N-1</th><th style={thStyle}>Variation en %</th></tr></thead>
          <tbody>
            {chargesRows.map(r => renderRow(r))}
            {renderTotalRow('SOUS TOTAL : AUTRES CHARGES HAO', totalCharges)}
            {produitsRows.map(r => renderRow(r))}
            {renderTotalRow('SOUS TOTAL : AUTRES PRODUITS HAO', totalProduits)}
            <tr><td colSpan={4} style={{ ...tdStyle, height: 6 }}></td></tr>
            {renderTotalRow('TOTAL', totalGeneral)}
          </tbody>
        </table>

        <div style={{ border: '0.5px solid #000', borderTop: 'none', padding: '10px 12px' }}>
          <p style={{ fontSize: 12, fontWeight: 700, marginBottom: 6, marginTop: 0 }}>Commentaire :</p>
          <EditableComment value={commentaire} onChange={setCommentaire} editing={editing} minHeight={30} />
        </div>
      </div>
    </div>
  );
}

export default Note30;
