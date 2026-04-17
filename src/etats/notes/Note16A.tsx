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

interface Note16AProps extends EtatBaseProps {
  onGoToParametres?: () => void;
}

interface Rubrique {
  label: string;
  prefixes: string[];
  bold?: boolean;
  isTotal?: boolean;
  excludes?: string[];
  group?: 'emprunts' | 'location' | 'provisions';
}

const RUBRIQUES: Rubrique[] = [
  // Emprunts et dettes financières
  { label: 'Emprunts obligataires', prefixes: ['161'], group: 'emprunts' },
  { label: 'Emprunts et dettes auprès des établissements de crédit', prefixes: ['162'], group: 'emprunts' },
  { label: 'Avances reçues de l\'Etat', prefixes: ['163'], group: 'emprunts' },
  { label: 'Avances reçues et comptes courants bloqués', prefixes: ['164'], group: 'emprunts' },
  { label: 'Dépôts et cautionnements reçus', prefixes: ['165'], group: 'emprunts' },
  { label: 'Intérêts courus', prefixes: ['166'], group: 'emprunts' },
  { label: 'Autres emprunts et dettes', prefixes: ['168'], group: 'emprunts' },
  { label: 'Dettes liées à des participations', prefixes: ['181'], group: 'emprunts' },
  { label: 'Dettes liées à des sociétés en participation', prefixes: ['182'], group: 'emprunts' },
  { label: 'Intérêts courus sur dettes liées à des participations', prefixes: ['183'], group: 'emprunts' },
  { label: 'Comptes permanents bloqués des établissements', prefixes: ['184'], group: 'emprunts' },
  { label: 'Comptes permanents non bloqués des établissements', prefixes: ['185'], group: 'emprunts' },
  { label: 'TOTAL EMPRUNTS ET DETTES FINANCIERES', prefixes: [], bold: true, isTotal: true, group: 'emprunts' },
  // Dettes de location-acquisition (17x)
  { label: 'Crédit-bail immobilier', prefixes: ['172'], group: 'location' },
  { label: 'Crédit-bail mobilier', prefixes: ['173'], group: 'location' },
  { label: 'Location-vente', prefixes: ['174'], group: 'location' },
  { label: 'Intérêts courus sur location-acquisition', prefixes: ['176'], group: 'location' },
  { label: 'Autres dettes de location-acquisition', prefixes: ['178'], group: 'location' },
  { label: 'TOTAL DETTES DE LOCATION-ACQUISITION', prefixes: [], bold: true, isTotal: true, group: 'location' },
  // Provisions financières pour risques et charges
  { label: 'Provisions pour litiges', prefixes: ['191'], group: 'provisions' },
  { label: 'Provisions pour garantie données aux clients', prefixes: ['192'], group: 'provisions' },
  { label: 'Provisions pour pertes sur marchés à achèvement futur', prefixes: ['193'], group: 'provisions' },
  { label: 'Provisions pour pertes de change', prefixes: ['194'], group: 'provisions' },
  { label: 'Provisions pour impôts', prefixes: ['195'], group: 'provisions' },
  { label: 'Provisions pour pensions et obligations assimilées', prefixes: ['196'], group: 'provisions' },
  { label: 'Provisions pour restructuration', prefixes: ['197'], group: 'provisions' },
  { label: 'Autres provisions', prefixes: ['198'], group: 'provisions' },
  { label: 'TOTAL PROVISIONS FINANCIERES POUR RISQUES ET CHARGES', prefixes: [], bold: true, isTotal: true, group: 'provisions' },
];

const DEFAULT_COMMENTAIRE = `• Pour chaque emprunt et dette de location acquisition: mentionner la date d'octroi, le nom de l'organisme financier, le montant initial de l'emprunt ou de la dette, la durée du crédit, les garanties données par l'entité.\n• Indiquer les événements et circonstances qui ont conduit à la provision et à la reprise.\n• Pour les pensions et obligations de retraite :\n  - indiquer la méthode d'évaluation retenue ;\n  - pour les actifs du régime, indiquer le nom de la compagnie d'assurance ou du fonds de pension, le descriptif de la convention signée avec l'organisme, la périodicité des versements, le montant et la durée de la convention ;\n  - indication de la valeur retenue pour les principales hypothèses actuarielles à la date de clôture et leur base de détermination.`;

function Note16A({ entiteName, entiteNif = '', entiteId, offre, onBack }: Note16AProps): React.JSX.Element {
  const {
    exercices, selectedExercice, setSelectedExercice,
    params, setParams, editing, setEditing, saving, saved, saveParams, annee, dateFin, duree,
  } = useNoteData({ entiteId });

  const pageRef = useRef<HTMLDivElement>(null);
  const pdf = usePDFPreview({ pageRef, fileName: `Note16A_${annee}.pdf`, editing, setEditing, orientation: 'l' });

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
    if (!params['note16a_commentaire'] && !params['note16a_adjustments']) return;
    setCommentaire(params['note16a_commentaire'] || DEFAULT_COMMENTAIRE);
    if (params['note16a_adjustments']) {
      try { setAdjustments(JSON.parse(params['note16a_adjustments'])); } catch { /* */ }
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
    note16a_adjustments: JSON.stringify(adjustments),
    note16a_commentaire: commentaire,
  });

  const fmtDateShort = (d: string): string => {
    if (!d) return '';
    return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };
  const fmtM = (val: number): string => val === 0 ? '0' : Math.round(val).toLocaleString('fr-FR');

  const computeForPrefixes = (lignes: BalanceLigne[], prefixes: string[], excludes?: string[]) => {
    let total = 0;
    for (const l of lignes) {
      const num = (l.numero_compte || '').trim();
      if (!prefixes.some(p => num.startsWith(p))) continue;
      if (excludes && excludes.some(e => num.startsWith(e))) continue;
      total += (parseFloat(String(l.solde_crediteur)) || 0) - (parseFloat(String(l.solde_debiteur)) || 0);
    }
    return total;
  };

  const computeRow = (r: Rubrique) => {
    const n = computeForPrefixes(lignesN, r.prefixes, r.excludes) + getAdj(r.label, 'anneeN');
    const n1 = computeForPrefixes(lignesN1, r.prefixes, r.excludes) + getAdj(r.label, 'anneeN1');
    const variationAbs = n - n1;
    const variationPct = n1 !== 0 ? ((n - n1) / Math.abs(n1) * 100) : 0;
    return { anneeN: n, anneeN1: n1, variationAbs, variationPct };
  };

  const detailRows = (group: string) => RUBRIQUES.filter(r => r.group === group && !r.isTotal);
  const sumGroup = (group: string) => detailRows(group).reduce((a, r) => { const v = computeRow(r); return { anneeN: a.anneeN + v.anneeN, anneeN1: a.anneeN1 + v.anneeN1 }; }, { anneeN: 0, anneeN1: 0 });

  const totalEmprunts = sumGroup('emprunts');
  const totalLocation = sumGroup('location');
  const totalProvisions = sumGroup('provisions');

  const renderAdjInput = (label: string, field: string, baseValue: number) => {
    if (!editing) return fmtM(baseValue);
    const adj = getAdj(label, field);
    return <input value={adj || ''} onChange={e => { const v = e.target.value === '' ? 0 : parseFloat(e.target.value.replace(/\s/g, '').replace(',', '.')) || 0; setAdj(label, field, v); }} style={inputSt} placeholder={fmtM(baseValue - adj)} />;
  };

  const renderCreanceInput = (label: string, field: string) => {
    if (!editing) return fmtM(getAdj(label, field));
    return <input value={getAdj(label, field) || ''} onChange={e => { const v = e.target.value === '' ? 0 : parseFloat(e.target.value.replace(/\s/g, '').replace(',', '.')) || 0; setAdj(label, field, v); }} style={inputSt} />;
  };

  const renderDataRow = (r: Rubrique) => {
    const vals = computeRow(r);
    if (hideEmpty && vals.anneeN === 0 && vals.anneeN1 === 0) return null;
    return (
      <tr key={r.label}>
        <td style={tdStyle}>{r.label}</td>
        <td style={tdRight}>{renderAdjInput(r.label, 'anneeN', vals.anneeN)}</td>
        <td style={tdRight}>{renderAdjInput(r.label, 'anneeN1', vals.anneeN1)}</td>
        <td style={{ ...tdRight, background: '#fafafa' }}>{fmtM(vals.variationAbs)}</td>
        <td style={{ ...tdRight, background: '#fafafa' }}>{vals.variationPct !== 0 ? vals.variationPct.toFixed(1) + ' %' : ''}</td>
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
        title="Note 16A — Dettes financières et ressources assimilées"
        exercices={exercices} selectedExercice={selectedExercice} onSelectExercice={setSelectedExercice}
        editing={editing} saving={saving} saved={saved}
        onEdit={() => setEditing(true)} onSave={handleSave} onPreview={pdf.openPreview} onBack={onBack}
      >
        <button className="etat-action-btn" onClick={() => setHideEmpty(!hideEmpty)} style={{ background: hideEmpty ? '#1A3A5C' : '#e5e7eb', color: hideEmpty ? '#fff' : '#333', border: 'none' }}><LuEyeOff size={16} /> {hideEmpty ? 'Afficher tout' : 'Masquer vides'}</button>
      </NoteToolbar>

      {pdf.previewUrl && (
        <PDFPreviewModal previewUrl={pdf.previewUrl} title="Apercu — Note 16A" onClose={pdf.closePreview} onDownload={pdf.downloadPDF} onPrint={pdf.printPDF} />
      )}

      <div style={{ margin: '12px 20px', padding: '12px 16px', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 8, fontSize: 12, color: '#1e40af', lineHeight: 1.6 }}>
        <div style={{ fontWeight: 700, marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
          <LuInfo size={14} /> Note d'information — Note 16A
        </div>
        <ul style={{ margin: 0, paddingLeft: 18 }}>
          <li>Emprunts et dettes assimilées (161-168) et dettes liées à des participations (181-185) : solde créditeur.</li>
          <li>Dettes de location-acquisition (172-178) : crédit-bail immobilier, mobilier, location-vente.</li>
          <li>Provisions pour risques et charges (191-198) : solde créditeur.</li>
          <li>Échéances : à renseigner manuellement (1 an, 1-2 ans, plus de 2 ans).</li>
        </ul>
      </div>

      <BalanceSourcePanel
        lignes={lignesN}
        groups={RUBRIQUES.filter(r => !r.isTotal).map(r => ({ label: r.label, prefixes: r.prefixes }))}
        title="Soldes balance — Dettes financieres et ressources assimilees"
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
          NOTE 16A — DETTES FINANCIERES ET RESSOURCES ASSIMILEES
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
              <th style={{ ...thStyle, fontSize: 9 }}>Dettes a un an au plus</th>
              <th style={{ ...thStyle, fontSize: 9 }}>Dettes a plus d'un an et a deux ans au plus</th>
              <th style={{ ...thStyle, fontSize: 9 }}>Dettes a plus de deux ans</th>
            </tr>
          </thead>
          <tbody>
            {detailRows('emprunts').map(r => renderDataRow(r))}
            {renderTotalRow('TOTAL EMPRUNTS ET DETTES FINANCIERES', totalEmprunts)}
            {detailRows('location').map(r => renderDataRow(r))}
            {renderTotalRow('TOTAL DETTES DE LOCATION-ACQUISITION', totalLocation)}
            {detailRows('provisions').map(r => renderDataRow(r))}
            {renderTotalRow('TOTAL PROVISIONS FINANCIERES POUR RISQUES ET CHARGES', totalProvisions)}
          </tbody>
        </table>

        <div style={{ border: '0.5px solid #000', borderTop: 'none', padding: '8px 10px' }}>
          <p style={{ fontSize: 11, fontWeight: 700, marginBottom: 4, marginTop: 0 }}>Commentaire :</p>
          <EditableComment value={commentaire} onChange={setCommentaire} editing={editing} minHeight={80} />
        </div>
      </div>
    </div>
  );
}

export default Note16A;
