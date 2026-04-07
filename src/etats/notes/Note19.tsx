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

interface Note19Props extends EtatBaseProps {
  onGoToParametres?: () => void;
}

interface Rubrique {
  label: string;
  prefixes: string[];
  group: 'associes' | 'crediteurs' | 'liaison' | 'provisions';
}

const RUBRIQUES: Rubrique[] = [
  { label: 'Organismes internationaux', prefixes: ['451'], group: 'associes' },
  { label: 'Apporteurs, opérations sur le capital', prefixes: ['452'], group: 'associes' },
  { label: 'Associés, compte courant', prefixes: ['453'], group: 'associes' },
  { label: 'Associés dividendes à payer', prefixes: ['454'], group: 'associes' },
  { label: 'Groupe, comptes courants', prefixes: ['455'], group: 'associes' },
  { label: 'Autres dettes associés', prefixes: ['456', '457', '458'], group: 'associes' },
  { label: 'Créditeurs divers', prefixes: ['471'], group: 'crediteurs' },
  { label: 'Obligataires', prefixes: ['472'], group: 'crediteurs' },
  { label: 'Rémunérations d\'administrateurs', prefixes: ['473'], group: 'crediteurs' },
  { label: 'Compte du factor', prefixes: ['474'], group: 'crediteurs' },
  { label: 'Versements restant à effectuer sur titres de placement non libérés', prefixes: ['475'], group: 'crediteurs' },
  { label: 'Compte transitoire ajustement spécial lié à la révision du SYSCOHADA', prefixes: ['478'], group: 'crediteurs' },
  { label: 'Autres créditeurs divers', prefixes: ['479'], group: 'crediteurs' },
  { label: 'Comptes permanents non bloqués des établissements et des succursales', prefixes: ['481'], group: 'liaison' },
  { label: 'Comptes de liaison charges et produits', prefixes: ['482'], group: 'liaison' },
  { label: 'Comptes de liaison des sociétés en participation', prefixes: ['483'], group: 'liaison' },
  { label: 'Provisions pour risques à court terme (voir note 28)', prefixes: ['499'], group: 'provisions' },
];

const DEFAULT_COMMENTAIRE = `• Commenter toute variation significative.\n• Indiquer le taux de rémunération si compte courant rémunéré.\n• Commenter les dettes anciennes.\n• Compte transitoire ajustement spécial, indiquer le détail du compte et la durée restant pour l'apurement.`;

function Note19({ entiteName, entiteNif = '', entiteId, offre, onBack }: Note19Props): React.JSX.Element {
  const {
    exercices, selectedExercice, setSelectedExercice,
    params, setParams, editing, setEditing, saving, saved, saveParams, annee, dateFin, duree,
  } = useNoteData({ entiteId });

  const pageRef = useRef<HTMLDivElement>(null);
  const pdf = usePDFPreview({ pageRef, fileName: `Note19_${annee}.pdf`, editing, setEditing, orientation: 'l' });

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
    if (!params['note19_commentaire'] && !params['note19_adjustments']) return;
    setCommentaire(params['note19_commentaire'] || DEFAULT_COMMENTAIRE);
    if (params['note19_adjustments']) {
      try { setAdjustments(JSON.parse(params['note19_adjustments'])); } catch { /* */ }
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
    note19_adjustments: JSON.stringify(adjustments),
    note19_commentaire: commentaire,
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

  const groups: { key: string; label: string; rows: (Rubrique & { vals: ReturnType<typeof computeRow> })[] }[] = [
    { key: 'associes', label: 'TOTAL DETTES ASSOCIES', rows: RUBRIQUES.filter(r => r.group === 'associes').map(r => ({ ...r, vals: computeRow(r) })) },
    { key: 'crediteurs', label: 'TOTAL CREDITEURS DIVERS', rows: RUBRIQUES.filter(r => r.group === 'crediteurs').map(r => ({ ...r, vals: computeRow(r) })) },
    { key: 'liaison', label: 'TOTAL COMPTES DE LIAISON', rows: RUBRIQUES.filter(r => r.group === 'liaison').map(r => ({ ...r, vals: computeRow(r) })) },
  ];
  const provisionsRow = RUBRIQUES.filter(r => r.group === 'provisions').map(r => ({ ...r, vals: computeRow(r) }));

  const sumGroup = (rows: { vals: { anneeN: number; anneeN1: number } }[]) => rows.reduce((a, r) => ({ anneeN: a.anneeN + r.vals.anneeN, anneeN1: a.anneeN1 + r.vals.anneeN1 }), { anneeN: 0, anneeN1: 0 });

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
        title="Note 19 — Autres dettes et provisions pour risques à court terme"
        exercices={exercices} selectedExercice={selectedExercice} onSelectExercice={setSelectedExercice}
        editing={editing} saving={saving} saved={saved}
        onEdit={() => setEditing(true)} onSave={handleSave} onPreview={pdf.openPreview} onBack={onBack}
      />
      <div className="etat-toolbar-actions" style={{ justifyContent: 'flex-end', padding: '0 16px' }}>
        <button className="etat-action-btn" onClick={() => setHideEmpty(!hideEmpty)} style={{ background: hideEmpty ? '#1A3A5C' : '#e5e7eb', color: hideEmpty ? '#fff' : '#333', border: 'none' }}><LuEyeOff size={16} /> {hideEmpty ? 'Afficher tout' : 'Masquer vides'}</button>
      </div>

      {pdf.previewUrl && (
        <PDFPreviewModal previewUrl={pdf.previewUrl} title="Apercu — Note 19" onClose={pdf.closePreview} onDownload={pdf.downloadPDF} onPrint={pdf.printPDF} />
      )}

      <BalanceSourcePanel
        lignes={lignesN}
        groups={RUBRIQUES.map(r => ({ label: r.label, prefixes: r.prefixes }))}
        title="Soldes balance — Autres dettes et provisions"
      />

      <div ref={pageRef} style={{
        width: '297mm', minHeight: '210mm', background: '#fff',
        margin: '0 auto 20px', padding: '6mm 8mm',
        boxShadow: '0 2px 12px rgba(0,0,0,0.1)', boxSizing: 'border-box',
        fontFamily: "'Inter', 'Segoe UI', Arial, sans-serif", fontSize: 11, color: '#1a1a1a',
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
          NOTE 19 — AUTRES DETTES ET PROVISIONS POUR RISQUES A COURT TERME
        </h3>

        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 0 }}>
          <thead>
            <tr>
              <th style={{ ...thStyle, width: '28%' }} rowSpan={2}>Libellés</th>
              <th style={thStyle} rowSpan={2}>Année N</th>
              <th style={thStyle} rowSpan={2}>Année N-1</th>
              <th style={thStyle} rowSpan={2}>Variation en valeur absolue</th>
              <th style={thStyle} rowSpan={2}>Variation en %</th>
              <th style={thStyle} colSpan={3}>Échéances des dettes</th>
            </tr>
            <tr>
              <th style={{ ...thStyle, fontSize: 9 }}>Dettes à un an au plus</th>
              <th style={{ ...thStyle, fontSize: 9 }}>Dettes à plus d'un an et à deux ans au plus</th>
              <th style={{ ...thStyle, fontSize: 9 }}>Dettes à plus de deux ans</th>
            </tr>
          </thead>
          <tbody>
            {groups.map(g => (
              <React.Fragment key={g.key}>
                {g.rows.map(r => renderRow(r))}
                {renderTotalRow(g.label, sumGroup(g.rows))}
              </React.Fragment>
            ))}
            {provisionsRow.map(r => renderRow(r))}
          </tbody>
        </table>

        <div style={{ border: '0.5px solid #000', borderTop: 'none', padding: '8px 10px' }}>
          <p style={{ fontSize: 11, fontWeight: 700, marginBottom: 6, marginTop: 0 }}>Commentaire :</p>
          <EditableComment value={commentaire} onChange={setCommentaire} editing={editing} minHeight={40} />
        </div>
      </div>
    </div>
  );
}

export default Note19;
