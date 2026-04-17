import { clientFetch } from '../../lib/api';
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

interface Note29Props extends EtatBaseProps { onGoToParametres?: () => void; }
interface Rubrique { label: string; prefixes: string[]; group: 'frais' | 'revenus'; debit?: boolean; }

const RUBRIQUES: Rubrique[] = [
  // Frais financiers (charges = debit)
  { label: 'Intérêts des emprunts', prefixes: ['671'], group: 'frais', debit: true },
  { label: 'Intérêts dans loyers de locations acquisition', prefixes: ['672'], group: 'frais', debit: true },
  { label: 'Escomptes accordés', prefixes: ['673'], group: 'frais', debit: true },
  { label: 'Autres intérêts', prefixes: ['674'], group: 'frais', debit: true },
  { label: 'Escomptes des effets de commerce', prefixes: ['675'], group: 'frais', debit: true },
  { label: 'Pertes de change', prefixes: ['676'], group: 'frais', debit: true },
  { label: 'Pertes sur cessions de titres de placement', prefixes: ['677'], group: 'frais', debit: true },
  { label: 'Malis provenant d\'attribution gratuite d\'actions au personnel salarié et aux dirigeants', prefixes: ['678'], group: 'frais', debit: true },
  { label: 'Pertes sur risques financiers', prefixes: ['679'], group: 'frais', debit: true },
  { label: 'Charges pour dépréciation et provisions à court terme à caractère financier (voir note 28)', prefixes: ['697'], group: 'frais', debit: true },
  // Revenus financiers (produits = credit)
  { label: 'Intérêts de prêts et créances diverses', prefixes: ['771'], group: 'revenus' },
  { label: 'Revenus de participations', prefixes: ['772'], group: 'revenus' },
  { label: 'Escomptes obtenus', prefixes: ['773'], group: 'revenus' },
  { label: 'Revenus de placement', prefixes: ['774'], group: 'revenus' },
  { label: 'Gains de change', prefixes: ['776'], group: 'revenus' },
  { label: 'Gains sur cessions de titres de placement', prefixes: ['777'], group: 'revenus' },
  { label: 'Gains sur risques financiers', prefixes: ['779'], group: 'revenus' },
  { label: 'Reprises de charges pour dépréciation et provisions à court terme à caractère financier (voir note 28)', prefixes: ['797'], group: 'revenus' },
];

const DEFAULT_COMMENTAIRE = `• Commenter toute variation significative.\n• En cas de paiement à terme, indiquer le montant des intérêts non comptabilisés.`;

function Note29({ entiteName, entiteNif = '', entiteId, offre, onBack }: Note29Props): React.JSX.Element {
  const {
    exercices, selectedExercice, setSelectedExercice,
    params, setParams, editing, setEditing, saving, saved, saveParams, annee, dateFin, duree,
  } = useNoteData({ entiteId });

  const pageRef = useRef<HTMLDivElement>(null);
  const pdf = usePDFPreview({ pageRef, fileName: `Note29_${annee}.pdf`, editing, setEditing });

  const [hideEmpty, setHideEmpty] = useState(false);
  const [lignesN, setLignesN] = useState<BalanceLigne[]>([]);
  const [lignesN1, setLignesN1] = useState<BalanceLigne[]>([]);
  const [adjustments, setAdjustments] = useState<Record<string, Record<string, number>>>({});
  const [commentaire, setCommentaire] = useState(DEFAULT_COMMENTAIRE);

  const setAdj = (l: string, f: string, v: number) => { setAdjustments(p => ({ ...p, [l]: { ...(p[l] || {}), [f]: v } })); };
  const getAdj = (l: string, f: string): number => adjustments[l]?.[f] || 0;

  // Charger adjustments/commentaire depuis params
  useEffect(() => {
    if (!params['note29_commentaire'] && !params['note29_adjustments']) return;
    setCommentaire(params['note29_commentaire'] || DEFAULT_COMMENTAIRE);
    if (params['note29_adjustments']) {
      try { setAdjustments(JSON.parse(params['note29_adjustments'])); } catch { /* */ }
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
    note29_adjustments: JSON.stringify(adjustments),
    note29_commentaire: commentaire,
  });

  const fmtDateShort = (d: string): string => {
    if (!d) return '';
    return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };
  const fmtM = (v: number): string => { if (v === 0) return ''; return Math.round(v).toLocaleString('fr-FR'); };

  const compDebit = (lignes: BalanceLigne[], pfx: string[]) => {
    let t = 0;
    for (const l of lignes) {
      const n = (l.numero_compte || '').trim();
      if (!pfx.some(p => n.startsWith(p))) continue;
      t += (parseFloat(String(l.solde_debiteur)) || 0) - (parseFloat(String(l.solde_crediteur)) || 0);
    }
    return t;
  };
  const compCredit = (lignes: BalanceLigne[], pfx: string[]) => {
    let t = 0;
    for (const l of lignes) {
      const n = (l.numero_compte || '').trim();
      if (!pfx.some(p => n.startsWith(p))) continue;
      t += (parseFloat(String(l.solde_crediteur)) || 0) - (parseFloat(String(l.solde_debiteur)) || 0);
    }
    return t;
  };

  const computeRow = (r: Rubrique) => {
    const calc = r.debit ? compDebit : compCredit;
    const n = calc(lignesN, r.prefixes) + getAdj(r.label, 'anneeN');
    const n1 = calc(lignesN1, r.prefixes) + getAdj(r.label, 'anneeN1');
    return { anneeN: n, anneeN1: n1, variation: n1 !== 0 ? ((n - n1) / Math.abs(n1) * 100) : 0 };
  };

  const fraisRows = RUBRIQUES.filter(r => r.group === 'frais').map(r => ({ ...r, vals: computeRow(r) }));
  const revenusRows = RUBRIQUES.filter(r => r.group === 'revenus').map(r => ({ ...r, vals: computeRow(r) }));

  const sumG = (rows: { vals: { anneeN: number; anneeN1: number } }[]) => rows.reduce((a, r) => ({ anneeN: a.anneeN + r.vals.anneeN, anneeN1: a.anneeN1 + r.vals.anneeN1 }), { anneeN: 0, anneeN1: 0 });
  const totalFrais = sumG(fraisRows);
  const totalRevenus = sumG(revenusRows);
  const totalGeneral = { anneeN: totalRevenus.anneeN - totalFrais.anneeN, anneeN1: totalRevenus.anneeN1 - totalFrais.anneeN1 };
  const calcVar = (t: { anneeN: number; anneeN1: number }) => t.anneeN1 !== 0 ? ((t.anneeN - t.anneeN1) / Math.abs(t.anneeN1) * 100) : 0;

  const renderAdj = (l: string, f: string, bv: number) => {
    if (!editing) return fmtM(bv);
    const a = getAdj(l, f);
    return <input value={a || ''} onChange={e => { const v = e.target.value === '' ? 0 : parseFloat(e.target.value.replace(/\s/g, '').replace(',', '.')) || 0; setAdj(l, f, v); }} style={inputSt} placeholder={fmtM(bv - a)} />;
  };

  const renderRow = (r: { label: string; vals: { anneeN: number; anneeN1: number; variation: number } }) => {
    if (hideEmpty && r.vals.anneeN === 0 && r.vals.anneeN1 === 0) return null;
    return (
      <tr key={r.label}>
        <td style={tdStyle}>{r.label}</td>
        <td style={tdRight}>{renderAdj(r.label, 'anneeN', r.vals.anneeN)}</td>
        <td style={tdRight}>{renderAdj(r.label, 'anneeN1', r.vals.anneeN1)}</td>
        <td style={{ ...tdRight, background: '#fafafa' }}>{r.vals.variation !== 0 ? r.vals.variation.toFixed(1) + ' %' : ''}</td>
      </tr>
    );
  };

  const renderTotalRow = (label: string, t: { anneeN: number; anneeN1: number }) => (
    <tr key={label}>
      <td style={{ ...tdBold, background: '#f0f0f0' }}>{label}</td>
      <td style={{ ...tdBoldRight, background: '#f0f0f0' }}>{fmtM(t.anneeN)}</td>
      <td style={{ ...tdBoldRight, background: '#f0f0f0' }}>{fmtM(t.anneeN1)}</td>
      <td style={{ ...tdBoldRight, background: '#f0f0f0' }}>{calcVar(t) !== 0 ? calcVar(t).toFixed(1) + ' %' : ''}</td>
    </tr>
  );

  return (
    <div>
      <NoteToolbar
        title="Note 29 — Charges et revenus financiers"
        exercices={exercices} selectedExercice={selectedExercice} onSelectExercice={setSelectedExercice}
        editing={editing} saving={saving} saved={saved}
        onEdit={() => setEditing(true)} onSave={handleSave} onPreview={pdf.openPreview} onBack={onBack}
      >
        <button className="etat-action-btn" onClick={() => setHideEmpty(!hideEmpty)} style={{ background: hideEmpty ? '#1A3A5C' : '#e5e7eb', color: hideEmpty ? '#fff' : '#333', border: 'none' }}><LuEyeOff size={16} /> {hideEmpty ? 'Afficher tout' : 'Masquer vides'}</button>
      </NoteToolbar>

      {pdf.previewUrl && (
        <PDFPreviewModal previewUrl={pdf.previewUrl} title="Apercu — Note 29" onClose={pdf.closePreview} onDownload={pdf.downloadPDF} onPrint={pdf.printPDF} />
      )}

      <BalanceSourcePanel
        lignes={lignesN}
        groups={RUBRIQUES.map(r => ({ label: r.label, prefixes: r.prefixes }))}
        title="Soldes balance — Charges et revenus financiers"
      />


      {/* Bulle d'information */}
      <div style={{ margin: '12px 20px', padding: '12px 16px', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 8, fontSize: 12, color: '#1e40af', lineHeight: 1.6 }}>
        <div style={{ fontWeight: 700, marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
          <LuInfo size={14} /> Note d'information — Note 29
        </div>
        <ul style={{ margin: 0, paddingLeft: 18 }}>
          <li><strong>Charges financieres :</strong> Interets des emprunts, agios bancaires, escomptes accordes, pertes de change (compte 67).</li>
          <li><strong>Revenus financiers :</strong> Dividendes recus, interets percus, gains de change, escomptes obtenus (compte 77).</li>
          <li><strong>Resultat de change :</strong> Gains et pertes de change realises et latents a la cloture.</li>
          <li><strong>Revenus de titres :</strong> A ventiler entre titres de participation, TIAP et VMP.</li>
          <li>Distinguer les elements recurrents des ponctuels pour l'analyse financiere.</li>
        </ul>
      </div>

      <div ref={pageRef} style={{ width: '210mm', minHeight: '297mm', background: '#fff', margin: '0 auto 20px', padding: '6mm 10mm', boxShadow: '0 2px 12px rgba(0,0,0,0.1)', boxSizing: 'border-box', fontFamily: "'Inter', 'Segoe UI', Arial, sans-serif", fontSize: 12, color: '#1a1a1a' }}>
        <div className="etat-header-officiel"><div className="etat-header-grid"><div className="etat-header-row"><span className="etat-header-label">Designation entite :</span><span className="etat-header-value">{entiteName || ''}</span><span className="etat-header-label">Exercice clos le :</span><span className="etat-header-value-right">{fmtDateShort(dateFin)}</span></div><div className="etat-header-row"><span className="etat-header-label">Numero d'identification :</span><span className="etat-header-value">{entiteNif || ''}</span><span className="etat-header-label">Duree (en mois) :</span><span className="etat-header-value-right">{duree}</span></div></div></div>
        <h3 style={{ textAlign: 'center', fontSize: 14, fontWeight: 700, margin: '30px 0 20px', textDecoration: 'underline' }}>
          NOTE 29 — CHARGES ET REVENUS FINANCIERS
        </h3>

        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 0 }}>
          <thead><tr><th style={{ ...thStyle, width: '55%' }}>Libelles</th><th style={thStyle}>Annee N</th><th style={thStyle}>Annee N-1</th><th style={thStyle}>Variation en %</th></tr></thead>
          <tbody>
            {fraisRows.map(r => renderRow(r))}
            {renderTotalRow('SOUS TOTAL : FRAIS FINANCIERS', totalFrais)}
            {revenusRows.map(r => renderRow(r))}
            {renderTotalRow('SOUS TOTAL : REVENUS FINANCIERS', totalRevenus)}
            <tr><td colSpan={4} style={{ ...tdStyle, height: 6 }}></td></tr>
            {renderTotalRow('TOTAL', totalGeneral)}
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

export default Note29;
