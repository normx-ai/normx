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

interface Note7Props extends EtatBaseProps {
  onGoToParametres?: () => void;
}

interface RubriqueClient {
  label: string;
  prefixes: string[];
  crediteur?: boolean;
}

// Clients brut (comptes débiteurs classe 41)
const RUBRIQUES_CLIENTS_BRUT: RubriqueClient[] = [
  { label: 'Clients hors réserves de propriété (Hors Groupe)', prefixes: ['411'] },
  { label: 'Clients, effets à recevoir (hors réserves de propriété)', prefixes: ['412'] },
  { label: 'Clients et effets à recevoir avec réserves de propriété', prefixes: ['413'] },
  { label: 'Clients et effets à recevoir, Groupe', prefixes: ['414'] },
  { label: 'Clients, effets escomptés non échus', prefixes: ['415'] },
  { label: 'Créances clients litigieuses ou douteuses', prefixes: ['416'] },
  { label: 'Clients, produits à recevoir', prefixes: ['418'] },
];

const RUBRIQUES_DEPRECIATION: RubriqueClient[] = [
  { label: 'Dépréciations des comptes clients', prefixes: ['491'] },
];

// Clients créditeurs (avances reçues)
const RUBRIQUES_CLIENTS_CREDITEURS: RubriqueClient[] = [
  { label: 'Clients, avances reçues hors Groupe', prefixes: ['4191'] },
  { label: 'Clients, avances reçues Groupe', prefixes: ['4192'] },
  { label: 'Autres clients créditeurs', prefixes: ['4193', '4194', '4195', '4196', '4197', '4198', '4199'] },
];

const DEFAULT_COMMENTAIRE = `• Commenter toute variation significative.\n• Commenter les créances anciennes.\n• Indiquer pour les créances du groupe, le nom de la société du groupe et le % de titres détenus.\n• Indiquer les événements et circonstances qui ont conduit à la dépréciation et à la reprise.`;

function Note7({ entiteName, entiteNif = '', entiteId, offre, onBack }: Note7Props): React.JSX.Element {
  const {
    exercices, selectedExercice, setSelectedExercice,
    params, setParams, editing, setEditing, saving, saved, saveParams, annee, dateFin, duree,
  } = useNoteData({ entiteId });

  const pageRef = useRef<HTMLDivElement>(null);
  const pdf = usePDFPreview({ pageRef, fileName: `Note7_${annee}.pdf`, editing, setEditing, orientation: 'l' });

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
    if (!params['note7_commentaire'] && !params['note7_adjustments']) return;
    setCommentaire(params['note7_commentaire'] || DEFAULT_COMMENTAIRE);
    if (params['note7_adjustments']) {
      try { setAdjustments(JSON.parse(params['note7_adjustments'])); } catch { /* */ }
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
    note7_adjustments: JSON.stringify(adjustments),
    note7_commentaire: commentaire,
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
      if (crediteur) {
        total += (parseFloat(String(l.solde_crediteur)) || 0) - (parseFloat(String(l.solde_debiteur)) || 0);
      } else {
        total += (parseFloat(String(l.solde_debiteur)) || 0) - (parseFloat(String(l.solde_crediteur)) || 0);
      }
    }
    return total;
  };

  const computeRow = (r: RubriqueClient) => {
    const credit = r.crediteur || false;
    const n = computeForPrefixes(lignesN, r.prefixes, credit) + getAdj(r.label, 'anneeN');
    const n1 = computeForPrefixes(lignesN1, r.prefixes, credit) + getAdj(r.label, 'anneeN1');
    const variation = n1 !== 0 ? ((n - n1) / Math.abs(n1) * 100) : 0;
    const creances1an = getAdj(r.label, 'creances1an');
    const creances1a2ans = getAdj(r.label, 'creances1a2ans');
    const creancesPlus2ans = getAdj(r.label, 'creancesPlus2ans');
    return { anneeN: n, anneeN1: n1, variation, creances1an, creances1a2ans, creancesPlus2ans };
  };

  const clientsBrutRows = RUBRIQUES_CLIENTS_BRUT.map(r => ({ ...r, vals: computeRow(r) }));
  const depRows = RUBRIQUES_DEPRECIATION.map(r => ({ ...r, vals: computeRow({ ...r, crediteur: true }) }));
  const crediteurRows = RUBRIQUES_CLIENTS_CREDITEURS.map(r => ({ ...r, vals: computeRow({ ...r, crediteur: true }) }));

  const sumRows = (rows: { vals: ReturnType<typeof computeRow> }[]) => rows.reduce(
    (a, r) => ({
      anneeN: a.anneeN + r.vals.anneeN, anneeN1: a.anneeN1 + r.vals.anneeN1,
      creances1an: a.creances1an + r.vals.creances1an, creances1a2ans: a.creances1a2ans + r.vals.creances1a2ans,
      creancesPlus2ans: a.creancesPlus2ans + r.vals.creancesPlus2ans,
    }),
    { anneeN: 0, anneeN1: 0, creances1an: 0, creances1a2ans: 0, creancesPlus2ans: 0 }
  );

  const totalBrut = sumRows(clientsBrutRows);
  const totalBrutVar = totalBrut.anneeN1 !== 0 ? ((totalBrut.anneeN - totalBrut.anneeN1) / Math.abs(totalBrut.anneeN1) * 100) : 0;

  const totalDep = sumRows(depRows);

  const totalNet = {
    anneeN: totalBrut.anneeN - totalDep.anneeN, anneeN1: totalBrut.anneeN1 - totalDep.anneeN1,
    creances1an: totalBrut.creances1an - totalDep.creances1an, creances1a2ans: totalBrut.creances1a2ans - totalDep.creances1a2ans,
    creancesPlus2ans: totalBrut.creancesPlus2ans - totalDep.creancesPlus2ans,
  };
  const totalNetVar = totalNet.anneeN1 !== 0 ? ((totalNet.anneeN - totalNet.anneeN1) / Math.abs(totalNet.anneeN1) * 100) : 0;

  const totalCrediteurs = sumRows(crediteurRows);
  const totalCrediteursVar = totalCrediteurs.anneeN1 !== 0 ? ((totalCrediteurs.anneeN - totalCrediteurs.anneeN1) / Math.abs(totalCrediteurs.anneeN1) * 100) : 0;

  const renderAdjInput = (label: string, field: string, baseValue: number) => {
    if (!editing) return fmtM(baseValue);
    const adj = getAdj(label, field);
    return <input value={adj || ''} onChange={e => { const v = e.target.value === '' ? 0 : parseFloat(e.target.value.replace(/\s/g, '').replace(',', '.')) || 0; setAdj(label, field, v); }} style={inputSt} placeholder={fmtM(baseValue - adj)} />;
  };

  const renderCreanceInput = (label: string, field: string) => {
    if (!editing) return fmtM(getAdj(label, field));
    return <input value={getAdj(label, field) || ''} onChange={e => { const v = e.target.value === '' ? 0 : parseFloat(e.target.value.replace(/\s/g, '').replace(',', '.')) || 0; setAdj(label, field, v); }} style={inputSt} />;
  };

  const renderRow = (r: { label: string; vals: ReturnType<typeof computeRow> }) => {
    if (hideEmpty && r.vals.anneeN === 0 && r.vals.anneeN1 === 0) return null;
    return (
    <tr key={r.label}>
      <td style={tdStyle}>{r.label}</td>
      <td style={tdRight}>{renderAdjInput(r.label, 'anneeN', r.vals.anneeN)}</td>
      <td style={tdRight}>{renderAdjInput(r.label, 'anneeN1', r.vals.anneeN1)}</td>
      <td style={{ ...tdRight, background: '#fafafa' }}>{r.vals.variation !== 0 ? r.vals.variation.toFixed(1) + ' %' : ''}</td>
      <td style={tdRight}>{renderCreanceInput(r.label, 'creances1an')}</td>
      <td style={tdRight}>{renderCreanceInput(r.label, 'creances1a2ans')}</td>
      <td style={tdRight}>{renderCreanceInput(r.label, 'creancesPlus2ans')}</td>
    </tr>
  ); };

  const renderTotalRow = (label: string, totals: { anneeN: number; anneeN1: number; creances1an: number; creances1a2ans: number; creancesPlus2ans: number }, variation: number) => (
    <tr>
      <td style={tdBold}>{label}</td>
      <td style={tdBoldRight}>{fmtM(totals.anneeN)}</td>
      <td style={tdBoldRight}>{fmtM(totals.anneeN1)}</td>
      <td style={{ ...tdBoldRight, background: '#fafafa' }}>{variation !== 0 ? variation.toFixed(1) + ' %' : ''}</td>
      <td style={tdBoldRight}>{fmtM(totals.creances1an)}</td>
      <td style={tdBoldRight}>{fmtM(totals.creances1a2ans)}</td>
      <td style={tdBoldRight}>{fmtM(totals.creancesPlus2ans)}</td>
    </tr>
  );

  return (
    <div>
      <NoteToolbar
        title="Note 7 — Clients"
        exercices={exercices} selectedExercice={selectedExercice} onSelectExercice={setSelectedExercice}
        editing={editing} saving={saving} saved={saved}
        onEdit={() => setEditing(true)} onSave={handleSave} onPreview={pdf.openPreview} onBack={onBack}
      >
        <button className="etat-action-btn" onClick={() => setHideEmpty(!hideEmpty)} style={{ background: hideEmpty ? '#1A3A5C' : '#e5e7eb', color: hideEmpty ? '#fff' : '#333', border: 'none' }}><LuEyeOff size={16} /> {hideEmpty ? 'Afficher tout' : 'Masquer vides'}</button>
      </NoteToolbar>

      {pdf.previewUrl && (
        <PDFPreviewModal previewUrl={pdf.previewUrl} title="Apercu — Note 7" onClose={pdf.closePreview} onDownload={pdf.downloadPDF} onPrint={pdf.printPDF} />
      )}

      <div style={{ margin: '12px 20px', padding: '12px 16px', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 8, fontSize: 12, color: '#1e40af', lineHeight: 1.6 }}>
        <div style={{ fontWeight: 700, marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
          <LuInfo size={14} /> Note d'information — Note 7
        </div>
        <ul style={{ margin: 0, paddingLeft: 18 }}>
          <li>Comptes clients (411-418) : solde débiteur = créances brutes.</li>
          <li>Dépréciations (491) : solde créditeur, vient en déduction.</li>
          <li>Clients créditeurs (419) : avances et acomptes reçus des clients.</li>
          <li>Échéances : à renseigner manuellement (1 an, 1-2 ans, plus de 2 ans).</li>
        </ul>
      </div>

      <BalanceSourcePanel
        lignes={lignesN}
        groups={[...RUBRIQUES_CLIENTS_BRUT, ...RUBRIQUES_DEPRECIATION, ...RUBRIQUES_CLIENTS_CREDITEURS].map(r => ({ label: r.label, prefixes: r.prefixes }))}
        title="Soldes balance — Clients"
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
          NOTE 7 — CLIENTS
        </h3>

        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 0 }}>
          <thead>
            <tr>
              <th style={{ ...thStyle, width: '36%' }} rowSpan={2}>Libelles</th>
              <th style={thStyle} rowSpan={2}>Annee N</th>
              <th style={thStyle} rowSpan={2}>Annee N-1</th>
              <th style={thStyle} rowSpan={2}>Variation en %</th>
              <th style={thStyle} colSpan={3}>Echeances des creances</th>
            </tr>
            <tr>
              <th style={{ ...thStyle, fontSize: 10 }}>Creances a un an au plus</th>
              <th style={{ ...thStyle, fontSize: 10 }}>Creances a plus d'un an et a deux ans au plus</th>
              <th style={{ ...thStyle, fontSize: 10 }}>Creances a plus de deux ans</th>
            </tr>
          </thead>
          <tbody>
            {clientsBrutRows.map(r => renderRow(r))}
            {renderTotalRow('TOTAL BRUT CLIENTS', totalBrut, totalBrutVar)}
            {depRows.map(r => renderRow(r))}
            {renderTotalRow('TOTAL NET DE DEPRECIATIONS', totalNet, totalNetVar)}
            <tr><td colSpan={7} style={{ ...tdStyle, height: 6, background: '#f5f5f5' }}></td></tr>
            {crediteurRows.map(r => renderRow(r))}
            {renderTotalRow('TOTAL CLIENTS CREDITEURS', totalCrediteurs, totalCrediteursVar)}
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

export default Note7;
