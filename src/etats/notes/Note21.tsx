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

interface Note21Props extends EtatBaseProps {
  onGoToParametres?: () => void;
}

interface Rubrique {
  label: string;
  prefixes: string[];
  bold?: boolean;
  isTotal?: boolean;
  group?: 'marchandises' | 'produits_fabriques' | 'travaux_services' | 'ca' | 'autres';
}

const RUBRIQUES: Rubrique[] = [
  // Ventes marchandises
  { label: 'Ventes dans la Région', prefixes: ['7011'], group: 'marchandises' },
  { label: 'Ventes hors Région', prefixes: ['7012'], group: 'marchandises' },
  { label: 'Ventes Groupe', prefixes: ['7013', '7014'], group: 'marchandises' },
  { label: 'Rabais, remises, ristournes accordés', prefixes: ['7019'], group: 'marchandises' },
  { label: 'TOTAL : VENTES MARCHANDISES', prefixes: [], bold: true, isTotal: true, group: 'marchandises' },
  // Produits fabriqués
  { label: 'Ventes dans la Région', prefixes: ['7021', '7031', '7041'], group: 'produits_fabriques' },
  { label: 'Ventes hors Région', prefixes: ['7022', '7032', '7042'], group: 'produits_fabriques' },
  { label: 'Ventes Groupe', prefixes: ['7023', '7024', '7033', '7034', '7043', '7044'], group: 'produits_fabriques' },
  { label: 'Rabais, remises, ristournes accordés', prefixes: ['7029', '7039', '7049'], group: 'produits_fabriques' },
  { label: 'TOTAL : VENTES DE PRODUITS FABRIQUES', prefixes: [], bold: true, isTotal: true, group: 'produits_fabriques' },
  // Travaux et services
  { label: 'Ventes dans la Région', prefixes: ['7051', '7061'], group: 'travaux_services' },
  { label: 'Ventes hors Région', prefixes: ['7052', '7062'], group: 'travaux_services' },
  { label: 'Ventes Groupe', prefixes: ['7053', '7054', '7063', '7064'], group: 'travaux_services' },
  { label: 'Rabais, remises, ristournes accordés', prefixes: ['7059', '7069'], group: 'travaux_services' },
  { label: 'TOTAL : VENTES DE TRAVAUX ET SERVICES', prefixes: [], bold: true, isTotal: true, group: 'travaux_services' },
  // Produits accessoires + Total CA
  { label: 'Produits accessoires', prefixes: ['707'] },
  { label: 'TOTAL : CHIFFRE D\'AFFAIRES', prefixes: [], bold: true, isTotal: true, group: 'ca' },
  // Lignes standalone (pas dans le groupe 'autres')
  // Production immobilisee (72) et Subventions d'exploitation (71) sont
  // affichees comme lignes distinctes et entrent dans le grand TOTAL, mais
  // ne sont pas agregees dans "TOTAL : AUTRES PRODUITS" (= compte 75 seul)
  { label: 'Production immobilisée', prefixes: ['72'] },
  { label: 'Subventions d\'exploitation', prefixes: ['71'] },
  { label: 'Autres produits', prefixes: ['75'] },
  { label: 'TOTAL : AUTRES PRODUITS', prefixes: [], bold: true, isTotal: true, group: 'autres' },
];

const DEFAULT_COMMENTAIRE = `• Justifier toute variation significative.\n• Détailler, produits, intermédiaires, produits résiduels, produits accessoires, autres produits si significatifs.`;

function Note21({ entiteName, entiteNif = '', entiteId, offre, onBack }: Note21Props): React.JSX.Element {
  const {
    exercices, selectedExercice, setSelectedExercice,
    params, setParams, editing, setEditing, saving, saved, saveParams, annee, dateFin, duree,
  } = useNoteData({ entiteId });

  const pageRef = useRef<HTMLDivElement>(null);
  const pdf = usePDFPreview({ pageRef, fileName: `Note21_${annee}.pdf`, editing, setEditing });

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
    if (!params['note21_commentaire'] && !params['note21_adjustments']) return;
    setCommentaire(params['note21_commentaire'] || DEFAULT_COMMENTAIRE);
    if (params['note21_adjustments']) {
      try { setAdjustments(JSON.parse(params['note21_adjustments'])); } catch { /* */ }
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
    note21_adjustments: JSON.stringify(adjustments),
    note21_commentaire: commentaire,
  });

  const fmtDateShort = (d: string): string => {
    if (!d) return '';
    return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };
  const fmtM = (val: number): string => val === 0 ? '0' : Math.round(val).toLocaleString('fr-FR');

  // Produits = solde créditeur
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
    const n = computeForPrefixes(lignesN, r.prefixes) + getAdj(r.label + '_' + (r.group || ''), 'anneeN');
    const n1 = computeForPrefixes(lignesN1, r.prefixes) + getAdj(r.label + '_' + (r.group || ''), 'anneeN1');
    const variation = n1 !== 0 ? ((n - n1) / Math.abs(n1) * 100) : 0;
    return { anneeN: n, anneeN1: n1, variation };
  };

  // Calcul des totaux par groupe
  const detailsOf = (group: string) => RUBRIQUES.filter(r => r.group === group && !r.isTotal);
  const sumGroup = (group: string) => detailsOf(group).reduce((a, r) => { const v = computeRow(r); return { anneeN: a.anneeN + v.anneeN, anneeN1: a.anneeN1 + v.anneeN1 }; }, { anneeN: 0, anneeN1: 0 });

  const totalMarchandises = sumGroup('marchandises');
  const totalProduitsFab = sumGroup('produits_fabriques');
  const totalTravaux = sumGroup('travaux_services');
  const produitsAccessoires = computeRow(RUBRIQUES.find(r => r.label === 'Produits accessoires')!);
  const totalCA = { anneeN: totalMarchandises.anneeN + totalProduitsFab.anneeN + totalTravaux.anneeN + produitsAccessoires.anneeN, anneeN1: totalMarchandises.anneeN1 + totalProduitsFab.anneeN1 + totalTravaux.anneeN1 + produitsAccessoires.anneeN1 };

  // "Autres produits" (TOTAL) = compte 75 uniquement
  const autresProduits = computeRow(RUBRIQUES.find(r => r.label === 'Autres produits')!);
  const totalAutres = { anneeN: autresProduits.anneeN, anneeN1: autresProduits.anneeN1 };

  // Lignes standalone qui entrent dans le grand TOTAL sans etre dans "autres produits"
  const productionImmo = computeRow(RUBRIQUES.find(r => r.label === 'Production immobilisée')!);
  const subventions = computeRow(RUBRIQUES.find(r => r.label === 'Subventions d\'exploitation')!);

  const totalGeneral = {
    anneeN: totalCA.anneeN + productionImmo.anneeN + subventions.anneeN + totalAutres.anneeN,
    anneeN1: totalCA.anneeN1 + productionImmo.anneeN1 + subventions.anneeN1 + totalAutres.anneeN1,
  };
  const calcVar = (t: { anneeN: number; anneeN1: number }) => t.anneeN1 !== 0 ? ((t.anneeN - t.anneeN1) / Math.abs(t.anneeN1) * 100) : 0;

  const renderAdjInput = (label: string, group: string, field: string, baseValue: number) => {
    const key = label + '_' + group;
    if (!editing) return fmtM(baseValue);
    const adj = getAdj(key, field);
    return <input value={adj || ''} onChange={e => { const v = e.target.value === '' ? 0 : parseFloat(e.target.value.replace(/\s/g, '').replace(',', '.')) || 0; setAdj(key, field, v); }} style={inputSt} placeholder={fmtM(baseValue - adj)} />;
  };

  const renderDetailRow = (r: Rubrique) => {
    const vals = computeRow(r);
    if (hideEmpty && vals.anneeN === 0 && vals.anneeN1 === 0) return null;
    return (
      <tr key={r.label + '_' + (r.group || '')}>
        <td style={tdStyle}>{r.label}</td>
        <td style={tdRight}>{renderAdjInput(r.label, r.group || '', 'anneeN', vals.anneeN)}</td>
        <td style={tdRight}>{renderAdjInput(r.label, r.group || '', 'anneeN1', vals.anneeN1)}</td>
        <td style={{ ...tdRight, background: '#fafafa' }}>{vals.variation !== 0 ? vals.variation.toFixed(1) + ' %' : ''}</td>
      </tr>
    );
  };

  const renderTotalRow = (label: string, totals: { anneeN: number; anneeN1: number }) => {
    const variation = calcVar(totals);
    return (
      <tr key={label}>
        <td style={{ ...tdBold, background: '#f0f0f0' }}>{label}</td>
        <td style={{ ...tdBoldRight, background: '#f0f0f0' }}>{fmtM(totals.anneeN)}</td>
        <td style={{ ...tdBoldRight, background: '#f0f0f0' }}>{fmtM(totals.anneeN1)}</td>
        <td style={{ ...tdBoldRight, background: '#f0f0f0' }}>{variation !== 0 ? variation.toFixed(1) + ' %' : ''}</td>
      </tr>
    );
  };

  return (
    <div>
      <NoteToolbar
        title="Note 21 — Chiffre d'affaires et autres produits"
        exercices={exercices} selectedExercice={selectedExercice} onSelectExercice={setSelectedExercice}
        editing={editing} saving={saving} saved={saved}
        onEdit={() => setEditing(true)} onSave={handleSave} onPreview={pdf.openPreview} onBack={onBack}
      >
        <button className="etat-action-btn" onClick={() => setHideEmpty(!hideEmpty)} style={{ background: hideEmpty ? '#1A3A5C' : '#e5e7eb', color: hideEmpty ? '#fff' : '#333', border: 'none' }}><LuEyeOff size={16} /> {hideEmpty ? 'Afficher tout' : 'Masquer vides'}</button>
      </NoteToolbar>

      {pdf.previewUrl && (
        <PDFPreviewModal previewUrl={pdf.previewUrl} title="Apercu — Note 21" onClose={pdf.closePreview} onDownload={pdf.downloadPDF} onPrint={pdf.printPDF} />
      )}

      <BalanceSourcePanel
        lignes={lignesN}
        groups={RUBRIQUES.filter(r => !r.isTotal).map(r => ({ label: r.label, prefixes: r.prefixes }))}
        title="Soldes balance — Chiffre d'affaires et autres produits"
      />


      {/* Bulle d'information */}
      <div style={{ margin: '12px 20px', padding: '12px 16px', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 8, fontSize: 12, color: '#1e40af', lineHeight: 1.6 }}>
        <div style={{ fontWeight: 700, marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
          <LuInfo size={14} /> Note d'information — Note 21
        </div>
        <ul style={{ margin: 0, paddingLeft: 18 }}>
          <li><strong>Chiffre d'affaires :</strong> Ventes de marchandises, de produits fabriques, de travaux et services (comptes 70).</li>
          <li><strong>Ventilation :</strong> Par nature d'activite, par zone geographique ou par segment si information sectorielle.</li>
          <li><strong>Comptabilisation :</strong> A la livraison pour les biens, a l'avancement ou a l'achevement pour les services et contrats longs.</li>
          <li>Doit rester coherent avec le compte de resultat et la Note 32 (production de l'exercice).</li>
        </ul>
      </div>

      <div ref={pageRef} style={{
        width: '210mm', minHeight: '297mm', background: '#fff',
        margin: '0 auto 20px', padding: '6mm 10mm',
        boxShadow: '0 2px 12px rgba(0,0,0,0.1)', boxSizing: 'border-box',
        fontFamily: "'Inter', 'Segoe UI', Arial, sans-serif", fontSize: 12, color: '#1a1a1a',
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
          NOTE 21 — CHIFFRE D'AFFAIRES ET AUTRES PRODUITS
        </h3>

        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 0 }}>
          <thead>
            <tr>
              <th style={{ ...thStyle, width: '50%' }}>Libellés</th>
              <th style={thStyle}>Année N</th>
              <th style={thStyle}>Année N-1</th>
              <th style={thStyle}>Variation en %</th>
            </tr>
          </thead>
          <tbody>
            {detailsOf('marchandises').map(r => renderDetailRow(r))}
            {renderTotalRow('TOTAL : VENTES MARCHANDISES', totalMarchandises)}
            {detailsOf('produits_fabriques').map(r => renderDetailRow(r))}
            {renderTotalRow('TOTAL : VENTES DE PRODUITS FABRIQUES', totalProduitsFab)}
            {detailsOf('travaux_services').map(r => renderDetailRow(r))}
            {renderTotalRow('TOTAL : VENTES DE TRAVAUX ET SERVICES VENDUS', totalTravaux)}
            {renderDetailRow(RUBRIQUES.find(r => r.label === 'Produits accessoires')!)}
            {renderTotalRow('TOTAL : CHIFFRES D\'AFFAIRES', totalCA)}
            {renderDetailRow(RUBRIQUES.find(r => r.label === 'Production immobilisée')!)}
            {renderDetailRow(RUBRIQUES.find(r => r.label === 'Subventions d\'exploitation')!)}
            {renderDetailRow(RUBRIQUES.find(r => r.label === 'Autres produits')!)}
            {renderTotalRow('TOTAL : AUTRES PRODUITS', totalAutres)}
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

export default Note21;
