import React, { useState, useRef, useEffect } from 'react';
import '../BilanSYCEBNL.css';
import '../FicheIdentification.css';
import type { EtatBaseProps, BalanceLigne } from '../../types';
import { useNoteData } from './useNoteData';
import { usePDFPreview } from './usePDFPreview';
import NoteToolbar from './NoteToolbar';
import PDFPreviewModal from './PDFPreviewModal';
import EditableComment from './EditableComment';
import { thStyle as thBase, tdStyle as tdBase } from './noteStyles';
import { LuInfo, LuEyeOff } from 'react-icons/lu';

interface Note28Props extends EtatBaseProps { onGoToParametres?: () => void; }

interface LigneProvision {
  num: string;
  label: string;
  prefixes?: string[];      // comptes bilan pour ouverture/cloture auto
  ouverture: string;
  aug_exploitation: string;
  aug_financieres: string;
  aug_hao: string;
  dim_exploitation: string;
  dim_financieres: string;
  dim_hao: string;
  cloture: string;
  bold?: boolean;
  isTotal?: boolean;
  group?: 'dotations' | 'charges';
}

// Prefixes : comptes bilan SYSCOHADA. Ouverture = si_credit, Cloture = solde_crediteur.
const LIGNES_INIT: Omit<LigneProvision, 'ouverture' | 'aug_exploitation' | 'aug_financieres' | 'aug_hao' | 'dim_exploitation' | 'dim_financieres' | 'dim_hao' | 'cloture'>[] = [
  { num: '1.', label: 'Provisions réglementées', group: 'dotations', prefixes: ['151', '152', '153', '154', '155', '156', '157', '158'] },
  { num: '2.', label: 'Provisions financières pour risques et charges', group: 'dotations', prefixes: ['191', '192', '193', '194', '195', '196', '197', '198'] },
  { num: '3.', label: 'Dépréciations des immobilisations', group: 'dotations', prefixes: ['29'] },
  { num: '', label: 'TOTAL : DOTATIONS', bold: true, isTotal: true, group: 'dotations' },
  { num: '4.', label: 'Dépréciations des stocks', group: 'charges', prefixes: ['39'] },
  { num: '5.', label: 'Dépréciations actif circulant HAO', group: 'charges', prefixes: ['498'] },
  { num: '6.', label: 'Dépréciations clients', group: 'charges', prefixes: ['491'] },
  { num: '7.', label: 'Dépréciations autres créances', group: 'charges', prefixes: ['492', '493', '494', '495', '496', '497'] },
  { num: '8.', label: 'Dépréciations titres de placement', group: 'charges', prefixes: ['590'] },
  { num: '9.', label: 'Dépréciations valeurs à encaisser', group: 'charges', prefixes: ['591'] },
  { num: '10.', label: 'Dépréciations disponibilités', group: 'charges', prefixes: ['592', '593', '594'] },
  { num: '11.', label: 'Provisions pour risques à court terme exploitation', group: 'charges', prefixes: ['499'] },
  { num: '12.', label: 'Provisions pour risques à court terme à caractère financier', group: 'charges', prefixes: ['599'] },
  { num: '', label: 'TOTAL : CHARGES POUR DEPRECIATIONS ET PROVISIONS A COURT TERME', bold: true, isTotal: true, group: 'charges' },
  { num: '', label: 'TOTAL', bold: true, isTotal: true },
];

const emptyVals = { ouverture: '', aug_exploitation: '', aug_financieres: '', aug_hao: '', dim_exploitation: '', dim_financieres: '', dim_hao: '', cloture: '' };

const DEFAULT_COMMENTAIRE = `• Indiquer les événements et circonstances qui ont conduit à la constitution et à la reprise de la dépréciation et de la provision.`;

function Note28({ entiteName, entiteNif = '', entiteId, offre, onBack }: Note28Props): React.JSX.Element {
  const {
    exercices, selectedExercice, setSelectedExercice,
    params, setParams, editing, setEditing, saving, saved, saveParams, annee, dateFin, duree,
  } = useNoteData({ entiteId });

  const pageRef = useRef<HTMLDivElement>(null);
  const pdf = usePDFPreview({ pageRef, fileName: `Note28_${annee}.pdf`, editing, setEditing, orientation: 'l' });

  const [lignes, setLignes] = useState<LigneProvision[]>(LIGNES_INIT.map(l => ({ ...l, ...emptyVals })));
  const [commentaire, setCommentaire] = useState(DEFAULT_COMMENTAIRE);
  const [lignesN, setLignesN] = useState<BalanceLigne[]>([]);
  const [hideEmpty, setHideEmpty] = useState(false);

  // Charger donnees depuis params
  useEffect(() => {
    if (!params['note28_commentaire'] && !params['note28_lignes']) return;
    setCommentaire(params['note28_commentaire'] || DEFAULT_COMMENTAIRE);
    if (params['note28_lignes']) {
      try { const p = JSON.parse(params['note28_lignes']); if (Array.isArray(p) && p.length > 0) setLignes(p); } catch { /* */ }
    }
  }, [params]);

  // Charger la balance N pour calcul auto de ouverture / cloture
  const balanceSource = offre === 'comptabilite' ? 'ecritures' : 'import';
  useEffect(() => {
    if (!entiteId || !selectedExercice) return;
    const load = async () => {
      try {
        let bl: BalanceLigne[] = [];
        if (balanceSource === 'ecritures') {
          const res = await fetch('/api/ecritures/balance/' + entiteId + '/' + selectedExercice.id);
          const data = await res.json();
          bl = data.lignes || [];
        } else {
          const res = await fetch('/api/balance/' + entiteId + '/' + selectedExercice.id + '/N');
          const data = await res.json();
          bl = data.lignes || [];
        }
        setLignesN(bl);
      } catch { setLignesN([]); }
    };
    load();
  }, [entiteId, selectedExercice, balanceSource]);

  // Auto-calcul ouverture (si_credit) et cloture (solde_crediteur) pour une ligne
  const computeAuto = (prefixes: string[] | undefined) => {
    if (!prefixes || prefixes.length === 0) return { ouverture: 0, cloture: 0 };
    let ouv = 0, clo = 0;
    for (const l of lignesN) {
      const num = (l.numero_compte || '').trim();
      if (!prefixes.some(p => num.startsWith(p))) continue;
      ouv += parseFloat(String(l.si_credit)) || 0;
      clo += parseFloat(String(l.solde_crediteur)) || 0;
    }
    return { ouverture: ouv, cloture: clo };
  };

  const handleSave = () => saveParams({
    ...params,
    note28_lignes: JSON.stringify(lignes),
    note28_commentaire: commentaire,
  });

  const fmtDateShort = (d: string): string => {
    if (!d) return '';
    return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  const parseN = (v: string): number => { const n = parseFloat(v.replace(/\s/g, '').replace(',', '.')); return isNaN(n) ? 0 : n; };
  const fmtM = (v: number): string => v === 0 ? '0' : Math.round(v).toLocaleString('fr-FR');

  const updateLigne = (idx: number, field: keyof LigneProvision, value: string) => {
    setLignes(prev => prev.map((l, i) => i === idx ? { ...l, [field]: value } : l));
  };

  // Calcul automatique des totaux (ouverture/cloture pris depuis la balance)
  const dotationsDetail = lignes.filter(l => l.group === 'dotations' && !l.isTotal);
  const chargesDetail = lignes.filter(l => l.group === 'charges' && !l.isTotal);
  const allDetail = [...dotationsDetail, ...chargesDetail];

  const getOuverture = (l: LigneProvision) => computeAuto(l.prefixes).ouverture;
  const getCloture = (l: LigneProvision) => computeAuto(l.prefixes).cloture;

  const sumFields = (rows: LigneProvision[]) => {
    const mouvFields: (keyof LigneProvision)[] = ['aug_exploitation', 'aug_financieres', 'aug_hao', 'dim_exploitation', 'dim_financieres', 'dim_hao'];
    const result: Record<string, number> = {};
    result.ouverture = rows.reduce((s, r) => s + getOuverture(r), 0);
    for (const f of mouvFields) result[f] = rows.reduce((s, r) => s + parseN(r[f] as string), 0);
    result.cloture = rows.reduce((s, r) => s + getCloture(r), 0);
    return result;
  };

  const totalDot = sumFields(dotationsDetail);
  const totalCharges = sumFields(chargesDetail);
  const totalGeneral = sumFields(allDetail);

  const getTotalFor = (l: LigneProvision) => {
    if (l.label.includes('DOTATIONS')) return totalDot;
    if (l.label.includes('CHARGES')) return totalCharges;
    if (l.label === 'TOTAL') return totalGeneral;
    return null;
  };

  // Note-specific styles (smaller font for landscape table)
  const th: React.CSSProperties = { ...thBase, fontSize: 10 };
  const td: React.CSSProperties = { ...tdBase, fontSize: 10 };
  const tdR: React.CSSProperties = { ...td, textAlign: 'right', fontVariantNumeric: 'tabular-nums' };
  const tdB: React.CSSProperties = { ...td, fontWeight: 700, background: '#f0f0f0' };
  const tdBR: React.CSSProperties = { ...tdR, fontWeight: 700, background: '#f0f0f0' };
  const inp: React.CSSProperties = { width: '100%', padding: '5px 8px', fontSize: 10, border: '1px solid #D4A843', borderRadius: 2, background: '#fffbf0', textAlign: 'right', boxSizing: 'border-box' };

  const renderInput = (idx: number, field: keyof LigneProvision) => {
    const val = lignes[idx][field] as string;
    if (!editing) return val;
    return <input value={val} onChange={e => updateLigne(idx, field, e.target.value)} style={inp} />;
  };

  const MOUV_FIELDS: (keyof LigneProvision)[] = ['aug_exploitation', 'aug_financieres', 'aug_hao', 'dim_exploitation', 'dim_financieres', 'dim_hao'];

  return (
    <div>
      <NoteToolbar
        title="Note 28 — Provisions et depreciations inscrites au bilan"
        exercices={exercices} selectedExercice={selectedExercice} onSelectExercice={setSelectedExercice}
        editing={editing} saving={saving} saved={saved}
        onEdit={() => setEditing(true)} onSave={handleSave} onPreview={pdf.openPreview} onBack={onBack}
      >
        <button className="etat-action-btn" onClick={() => setHideEmpty(!hideEmpty)} style={{ background: hideEmpty ? '#1A3A5C' : '#e5e7eb', color: hideEmpty ? '#fff' : '#333', border: 'none' }}><LuEyeOff size={16} /> {hideEmpty ? 'Afficher tout' : 'Masquer vides'}</button>
      </NoteToolbar>

      {pdf.previewUrl && (
        <PDFPreviewModal previewUrl={pdf.previewUrl} title="Apercu — Note 28" onClose={pdf.closePreview} onDownload={pdf.downloadPDF} onPrint={pdf.printPDF} />
      )}


      {/* Bulle d'information */}
      <div style={{ margin: '12px 20px', padding: '12px 16px', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 8, fontSize: 12, color: '#1e40af', lineHeight: 1.6 }}>
        <div style={{ fontWeight: 700, marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
          <LuInfo size={14} /> Note d'information — Note 28
        </div>
        <ul style={{ margin: 0, paddingLeft: 18 }}>
          <li><strong>Provisions pour risques :</strong> Comptes 19 — litiges, garanties donnees, amendes et penalites probables.</li>
          <li><strong>Provisions pour charges :</strong> Charges probables non encore realisees (gros entretien, restructurations).</li>
          <li><strong>Depreciations :</strong> Comptes 29 (immobilisations), 39 (stocks), 49 (creances), 59 (titres).</li>
          <li><strong>Tableau de variation :</strong> Dotations et reprises de l'exercice par nature — explication des mouvements significatifs.</li>
          <li>Les reprises doivent etre justifiees (disparition du risque, realisation de la charge).</li>
        </ul>
      </div>

      <div ref={pageRef} style={{ width: '297mm', minHeight: '210mm', background: '#fff', margin: '0 auto 20px', padding: '6mm 8mm', boxShadow: '0 2px 12px rgba(0,0,0,0.1)', boxSizing: 'border-box', fontFamily: "'Inter', 'Segoe UI', Arial, sans-serif", fontSize: 10, color: '#1a1a1a' }}>
        <div className="etat-header-officiel"><div className="etat-header-grid"><div className="etat-header-row"><span className="etat-header-label">Designation entite :</span><span className="etat-header-value">{entiteName || ''}</span><span className="etat-header-label">Exercice clos le :</span><span className="etat-header-value-right">{fmtDateShort(dateFin)}</span></div><div className="etat-header-row"><span className="etat-header-label">Numero d'identification :</span><span className="etat-header-value">{entiteNif || ''}</span><span className="etat-header-label">Duree (en mois) :</span><span className="etat-header-value-right">{duree}</span></div></div></div>
        <h3 style={{ textAlign: 'center', fontSize: 14, fontWeight: 700, margin: '30px 0 20px', textDecoration: 'underline' }}>
          NOTE 28 — PROVISIONS ET DEPRECIATIONS INSCRITES AU BILAN
        </h3>

        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 0 }}>
          <thead>
            <tr>
              <th style={{ ...th, width: '25%' }} rowSpan={3}>NATURE</th>
              <th style={th} rowSpan={2}>A<br />Provisions a l'ouverture de l'exercice</th>
              <th style={th} colSpan={3}>B<br />Augmentations : dotations</th>
              <th style={th} colSpan={3}>C<br />Diminutions : reprises</th>
              <th style={th} rowSpan={2}>D = A + B - C<br />Provisions a la cloture de l'exercice</th>
            </tr>
            <tr>
              <th style={th}>d'exploitation</th>
              <th style={th}>financieres</th>
              <th style={th}>Hors activites ordinaires</th>
              <th style={th}>d'exploitation</th>
              <th style={th}>financieres</th>
              <th style={th}>Hors activites ordinaires</th>
            </tr>
          </thead>
          <tbody>
            {lignes.map((l, i) => {
              const tot = l.isTotal ? getTotalFor(l) : null;
              if (tot) {
                return (
                  <tr key={i}>
                    <td style={tdB}>{l.num ? l.num + ' ' : ''}{l.label}</td>
                    <td style={tdBR}>{fmtM(tot.ouverture)}</td>
                    {MOUV_FIELDS.map(f => <td key={f} style={tdBR}>{fmtM(tot[f])}</td>)}
                    <td style={tdBR}>{fmtM(tot.cloture)}</td>
                  </tr>
                );
              }
              // Masquer les lignes vides si hideEmpty
              const ouv = getOuverture(l);
              const clo = getCloture(l);
              const mouvSum = MOUV_FIELDS.reduce((s, f) => s + parseN(l[f] as string), 0);
              if (hideEmpty && ouv === 0 && clo === 0 && mouvSum === 0) return null;
              return (
                <tr key={i}>
                  <td style={td}>{l.num ? l.num + ' ' : ''}{l.label}</td>
                  <td style={{ ...tdR, background: '#fafafa' }}>{fmtM(ouv)}</td>
                  {MOUV_FIELDS.map(f => <td key={f} style={tdR}>{renderInput(i, f)}</td>)}
                  <td style={{ ...tdR, background: '#fafafa' }}>{fmtM(clo)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>

        <div style={{ border: '0.5px solid #000', borderTop: 'none', padding: '8px 10px' }}>
          <p style={{ fontSize: 11, fontWeight: 700, marginBottom: 4, marginTop: 0 }}>Commentaire :</p>
          <EditableComment value={commentaire} onChange={setCommentaire} editing={editing} minHeight={30} />
        </div>
      </div>
    </div>
  );
}

export default Note28;
