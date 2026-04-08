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

interface Note6Props extends EtatBaseProps {
  onGoToParametres?: () => void;
}

interface RubriqueStock {
  label: string;
  prefixes: string[];
}

const RUBRIQUES_STOCKS: RubriqueStock[] = [
  { label: 'Marchandises', prefixes: ['31'] },
  { label: 'Matières premières et fournitures liées', prefixes: ['32'] },
  { label: 'Autres approvisionnements', prefixes: ['33'] },
  { label: 'Produits en cours', prefixes: ['34'] },
  { label: 'Services en cours', prefixes: ['35'] },
  { label: 'Produits finis', prefixes: ['36'] },
  { label: 'Produits intermédiaires et résiduels', prefixes: ['37'] },
  { label: 'Stocks en cours de route, en consignation ou en dépôt', prefixes: ['38'] },
];

const RUBRIQUES_DEPRECIATION: RubriqueStock[] = [
  { label: 'Dépréciations des stocks', prefixes: ['39'] },
];

const DEFAULT_COMMENTAIRE = `• Indiquer la date de prise d'inventaire et décrire brièvement la procédure, les méthodes comptables adoptées pour évaluer le stock.\n• Commenter toute variation significative des stocks.\n• Indiquer le détail des stocks dépréciés ainsi que les événements et circonstances qui ont conduit à la dépréciation et à la reprise.`;

function Note6({ entiteName, entiteNif = '', entiteId, offre, onBack }: Note6Props): React.JSX.Element {
  const {
    exercices, selectedExercice, setSelectedExercice,
    params, setParams, editing, setEditing, saving, saved, saveParams, annee, dateFin, duree,
  } = useNoteData({ entiteId });

  const pageRef = useRef<HTMLDivElement>(null);
  const pdf = usePDFPreview({ pageRef, fileName: `Note6_${annee}.pdf`, editing, setEditing });

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
    if (!params['note6_commentaire'] && !params['note6_adjustments']) return;
    setCommentaire(params['note6_commentaire'] || DEFAULT_COMMENTAIRE);
    if (params['note6_adjustments']) {
      try { setAdjustments(JSON.parse(params['note6_adjustments'])); } catch { /* */ }
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
    note6_adjustments: JSON.stringify(adjustments),
    note6_commentaire: commentaire,
  });

  const fmtDateShort = (d: string): string => {
    if (!d) return '';
    return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };
  const fmtM = (val: number): string => val === 0 ? '0' : Math.round(val).toLocaleString('fr-FR');

  const computeForPrefixes = (lignes: BalanceLigne[], prefixes: string[], crediteur = false) => {
    let total = 0;
    for (const l of lignes) {
      const num = (l.numero_compte || '').trim();
      if (!prefixes.some(p => num.startsWith(p))) continue;
      if (crediteur) total += (parseFloat(String(l.solde_crediteur)) || 0) - (parseFloat(String(l.solde_debiteur)) || 0);
      else total += (parseFloat(String(l.solde_debiteur)) || 0) - (parseFloat(String(l.solde_crediteur)) || 0);
    }
    return total;
  };

  const computeRow = (r: RubriqueStock, crediteur = false) => {
    const n = computeForPrefixes(lignesN, r.prefixes, crediteur) + getAdj(r.label, 'anneeN');
    const n1 = computeForPrefixes(lignesN1, r.prefixes, crediteur) + getAdj(r.label, 'anneeN1');
    return { anneeN: n, anneeN1: n1, variation: n1 !== 0 ? ((n - n1) / Math.abs(n1) * 100) : 0 };
  };

  const stockRows = RUBRIQUES_STOCKS.map(r => ({ ...r, vals: computeRow(r) }));
  const depRows = RUBRIQUES_DEPRECIATION.map(r => ({ ...r, vals: computeRow(r, true) }));
  const totalBrut = stockRows.reduce((a, r) => ({ anneeN: a.anneeN + r.vals.anneeN, anneeN1: a.anneeN1 + r.vals.anneeN1 }), { anneeN: 0, anneeN1: 0 });
  const totalBrutVar = totalBrut.anneeN1 !== 0 ? ((totalBrut.anneeN - totalBrut.anneeN1) / Math.abs(totalBrut.anneeN1) * 100) : 0;
  const totalDep = depRows.reduce((a, r) => ({ anneeN: a.anneeN + r.vals.anneeN, anneeN1: a.anneeN1 + r.vals.anneeN1 }), { anneeN: 0, anneeN1: 0 });
  const totalNet = { anneeN: totalBrut.anneeN - totalDep.anneeN, anneeN1: totalBrut.anneeN1 - totalDep.anneeN1 };
  const totalNetVar = totalNet.anneeN1 !== 0 ? ((totalNet.anneeN - totalNet.anneeN1) / Math.abs(totalNet.anneeN1) * 100) : 0;

  const renderAdjInput = (label: string, field: string, baseValue: number) => {
    if (!editing) return fmtM(baseValue);
    const adj = getAdj(label, field);
    return <input value={adj || ''} onChange={e => { const v = e.target.value === '' ? 0 : parseFloat(e.target.value.replace(/\s/g, '').replace(',', '.')) || 0; setAdj(label, field, v); }} style={inputSt} placeholder={fmtM(baseValue - adj)} />;
  };

  const renderRow = (r: { label: string; vals: { anneeN: number; anneeN1: number; variation: number } }) => {
    if (hideEmpty && r.vals.anneeN === 0 && r.vals.anneeN1 === 0) return null;
    const varStock = r.vals.anneeN - r.vals.anneeN1;
    return (
      <tr key={r.label}>
        <td style={tdStyle}>{r.label}</td>
        <td style={tdRight}>{renderAdjInput(r.label, 'anneeN', r.vals.anneeN)}</td>
        <td style={tdRight}>{renderAdjInput(r.label, 'anneeN1', r.vals.anneeN1)}</td>
        <td style={{ ...tdRight, color: varStock < 0 ? '#dc2626' : '#333' }}>{varStock !== 0 ? fmtM(varStock) : ''}</td>
        <td style={{ ...tdRight, background: '#fafafa' }}>{r.vals.variation !== 0 ? r.vals.variation.toFixed(1) + ' %' : ''}</td>
      </tr>
    );
  };

  const renderTotalRow = (label: string, totals: { anneeN: number; anneeN1: number }, variation: number) => {
    const varStock = totals.anneeN - totals.anneeN1;
    return (
      <tr>
        <td style={tdBold}>{label}</td>
        <td style={tdBoldRight}>{fmtM(totals.anneeN)}</td>
        <td style={tdBoldRight}>{fmtM(totals.anneeN1)}</td>
        <td style={{ ...tdBoldRight, color: varStock < 0 ? '#dc2626' : '#333' }}>{varStock !== 0 ? fmtM(varStock) : ''}</td>
        <td style={{ ...tdBoldRight, background: '#fafafa' }}>{variation !== 0 ? variation.toFixed(1) + ' %' : ''}</td>
      </tr>
    );
  };

  return (
    <div>
      <NoteToolbar
        title="Note 6 — Stocks et en cours"
        exercices={exercices} selectedExercice={selectedExercice} onSelectExercice={setSelectedExercice}
        editing={editing} saving={saving} saved={saved}
        onEdit={() => setEditing(true)} onSave={handleSave} onPreview={pdf.openPreview} onBack={onBack}
      >
        <button className="etat-action-btn" onClick={() => setHideEmpty(!hideEmpty)} style={{ background: hideEmpty ? '#1A3A5C' : '#e5e7eb', color: hideEmpty ? '#fff' : '#333', border: 'none' }}><LuEyeOff size={16} /> {hideEmpty ? 'Afficher tout' : 'Masquer vides'}</button>
      </NoteToolbar>

      {pdf.previewUrl && (
        <PDFPreviewModal previewUrl={pdf.previewUrl} title="Apercu — Note 6" onClose={pdf.closePreview} onDownload={pdf.downloadPDF} onPrint={pdf.printPDF} />
      )}

      <div style={{ margin: '12px 20px', padding: '12px 16px', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 8, fontSize: 12, color: '#1e40af', lineHeight: 1.6 }}>
        <div style={{ fontWeight: 700, marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
          <LuInfo size={14} /> Note d'information — Note 6
        </div>
        <ul style={{ margin: 0, paddingLeft: 18 }}>
          <li>Comptes de stocks (31-38) : valeur brute au solde débiteur.</li>
          <li>Dépréciations des stocks (39) : solde créditeur, vient en déduction.</li>
          <li>Variation de stock : différence entre Année N et Année N-1.</li>
        </ul>
      </div>

      <BalanceSourcePanel lignes={lignesN} groups={[...RUBRIQUES_STOCKS, ...RUBRIQUES_DEPRECIATION].map(r => ({ label: r.label, prefixes: r.prefixes }))} title="Soldes balance — Stocks et en cours" />

      <div ref={pageRef} style={{ width: '210mm', minHeight: '297mm', background: '#fff', margin: '0 auto 20px', padding: '8mm 10mm', boxShadow: '0 2px 12px rgba(0,0,0,0.1)', boxSizing: 'border-box', fontFamily: "'Inter', 'Segoe UI', Arial, sans-serif", fontSize: 12, color: '#1a1a1a' }}>
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
          NOTE 6 — STOCKS ET EN COURS
        </h3>

        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 0 }}>
          <thead>
            <tr>
              <th style={{ ...thStyle, width: '34%' }}>Libelles</th>
              <th style={thStyle}>Annee N</th>
              <th style={thStyle}>Annee N-1</th>
              <th style={thStyle}>Variation de stock</th>
              <th style={thStyle}>Variation en %</th>
            </tr>
          </thead>
          <tbody>
            {stockRows.map(r => renderRow(r))}
            {renderTotalRow('TOTAL BRUT STOCKS ET EN COURS', totalBrut, totalBrutVar)}
            {depRows.map(r => renderRow(r))}
            {renderTotalRow('TOTAL NET DE DEPRECIATIONS', totalNet, totalNetVar)}
          </tbody>
        </table>

        <p style={{ fontSize: 11, margin: '10px 0 6px', fontStyle: 'italic', color: '#444' }}>
          (1) Les stocks H.A.O. seront inscrits dans l'actif circulant H.A.O. que lorsque leur montant total est significatif (superieur a 5 % du total de l'actif circulant).
        </p>

        <div style={{ border: '0.5px solid #000', padding: '10px 12px' }}>
          <p style={{ fontSize: 12, fontWeight: 700, marginBottom: 6, marginTop: 0 }}>Commentaire :</p>
          <EditableComment value={commentaire} onChange={setCommentaire} editing={editing} minHeight={60} />
        </div>
      </div>
    </div>
  );
}

export default Note6;
