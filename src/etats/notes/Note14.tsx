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

interface Note14Props extends EtatBaseProps {
  onGoToParametres?: () => void;
}

interface RubriquePrime {
  label: string;
  prefixes: string[];
  bold?: boolean;
  isTotal?: boolean;
}

const RUBRIQUES: RubriquePrime[] = [
  { label: 'Primes d\'émission', prefixes: ['1051'] },
  { label: 'Primes d\'apport', prefixes: ['1052'] },
  { label: 'Primes de fusion', prefixes: ['1053'] },
  { label: 'Primes de conversion', prefixes: ['1054'] },
  { label: 'Autres primes', prefixes: ['1058'] },
  { label: 'TOTAL PRIMES', prefixes: [], bold: true, isTotal: true },
  { label: 'Réserve légale', prefixes: ['111'] },
  { label: 'Réserves statutaires ou contractuelles', prefixes: ['112'] },
  { label: 'Réserves réglementées', prefixes: ['113'] },
  { label: 'Autres réserves', prefixes: ['118'] },
  { label: 'TOTAL RESERVES INDISPONIBLES', prefixes: [], bold: true, isTotal: true },
  { label: 'Report à nouveau', prefixes: ['12'] },
];

const DEFAULT_COMMENTAIRE = `• Indiquer les dates de l'AGE qui a décidé des primes d'apport, d'émission de fusion.\n• Indiquer le détail des réserves libres.\n• Indiquer le montant restant à doter et le taux de dotation de la réserve légale.\n• Indiquer la date de l'AGO qui justifie la variation des réserves et du report à nouveau.`;

function Note14({ entiteName, entiteNif = '', entiteId, offre, onBack }: Note14Props): React.JSX.Element {
  const {
    exercices, selectedExercice, setSelectedExercice,
    params, setParams, editing, setEditing, saving, saved, saveParams, annee, dateFin, duree,
  } = useNoteData({ entiteId });

  const pageRef = useRef<HTMLDivElement>(null);
  const pdf = usePDFPreview({ pageRef, fileName: `Note14_${annee}.pdf`, editing, setEditing });

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
    if (!params['note14_commentaire'] && !params['note14_adjustments']) return;
    setCommentaire(params['note14_commentaire'] || DEFAULT_COMMENTAIRE);
    if (params['note14_adjustments']) {
      try { setAdjustments(JSON.parse(params['note14_adjustments'])); } catch { /* */ }
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
    note14_adjustments: JSON.stringify(adjustments),
    note14_commentaire: commentaire,
  });

  const fmtDateShort = (d: string): string => {
    if (!d) return '';
    return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };
  const fmtM = (val: number): string => val === 0 ? '0' : Math.round(val).toLocaleString('fr-FR');

  // Comptes créditeurs (capitaux propres)
  const computeForPrefixes = (lignes: BalanceLigne[], prefixes: string[]) => {
    let total = 0;
    for (const l of lignes) {
      const num = (l.numero_compte || '').trim();
      if (!prefixes.some(p => num.startsWith(p))) continue;
      total += (parseFloat(String(l.solde_crediteur)) || 0) - (parseFloat(String(l.solde_debiteur)) || 0);
    }
    return total;
  };

  const computeRow = (r: RubriquePrime) => {
    const n = computeForPrefixes(lignesN, r.prefixes) + getAdj(r.label, 'anneeN');
    const n1 = computeForPrefixes(lignesN1, r.prefixes) + getAdj(r.label, 'anneeN1');
    const variation = n1 !== 0 ? (n - n1) : 0;
    return { anneeN: n, anneeN1: n1, variation };
  };

  // Calcul des totaux
  const primesRows = RUBRIQUES.filter(r => !r.isTotal && RUBRIQUES.indexOf(r) < RUBRIQUES.findIndex(r2 => r2.label === 'TOTAL PRIMES'));
  const reservesIndispRows = RUBRIQUES.filter(r => !r.isTotal && RUBRIQUES.indexOf(r) > RUBRIQUES.findIndex(r2 => r2.label === 'TOTAL PRIMES') && RUBRIQUES.indexOf(r) < RUBRIQUES.findIndex(r2 => r2.label === 'TOTAL RESERVES INDISPONIBLES'));

  const sumRows = (rows: RubriquePrime[]) => rows.reduce((a, r) => {
    const v = computeRow(r);
    return { anneeN: a.anneeN + v.anneeN, anneeN1: a.anneeN1 + v.anneeN1 };
  }, { anneeN: 0, anneeN1: 0 });

  const totalPrimes = sumRows(primesRows);
  const totalReservesIndisp = sumRows(reservesIndispRows);

  const renderAdjInput = (label: string, field: string, baseValue: number) => {
    if (!editing) return fmtM(baseValue);
    const adj = getAdj(label, field);
    return <input value={adj || ''} onChange={e => { const v = e.target.value === '' ? 0 : parseFloat(e.target.value.replace(/\s/g, '').replace(',', '.')) || 0; setAdj(label, field, v); }} style={inputSt} placeholder={fmtM(baseValue - adj)} />;
  };

  const renderTotalRow = (label: string, totals: { anneeN: number; anneeN1: number }) => {
    const variation = totals.anneeN1 !== 0 ? (totals.anneeN - totals.anneeN1) : 0;
    return (
      <tr>
        <td style={{ ...tdBold, background: '#f0f0f0' }}>{label}</td>
        <td style={{ ...tdBoldRight, background: '#f0f0f0' }}>{fmtM(totals.anneeN)}</td>
        <td style={{ ...tdBoldRight, background: '#f0f0f0' }}>{fmtM(totals.anneeN1)}</td>
        <td style={{ ...tdBoldRight, background: '#f0f0f0' }}>{fmtM(variation)}</td>
      </tr>
    );
  };

  return (
    <div>
      <NoteToolbar
        title="Note 14 — Primes et réserves"
        exercices={exercices} selectedExercice={selectedExercice} onSelectExercice={setSelectedExercice}
        editing={editing} saving={saving} saved={saved}
        onEdit={() => setEditing(true)} onSave={handleSave} onPreview={pdf.openPreview} onBack={onBack}
      >
        <button className="etat-action-btn" onClick={() => setHideEmpty(!hideEmpty)} style={{ background: hideEmpty ? '#1A3A5C' : '#e5e7eb', color: hideEmpty ? '#fff' : '#333', border: 'none' }}><LuEyeOff size={16} /> {hideEmpty ? 'Afficher tout' : 'Masquer vides'}</button>
      </NoteToolbar>

      {pdf.previewUrl && (
        <PDFPreviewModal previewUrl={pdf.previewUrl} title="Apercu — Note 14" onClose={pdf.closePreview} onDownload={pdf.downloadPDF} onPrint={pdf.printPDF} />
      )}

      <div style={{ margin: '12px 20px', padding: '12px 16px', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 8, fontSize: 12, color: '#1e40af', lineHeight: 1.6 }}>
        <div style={{ fontWeight: 700, marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
          <LuInfo size={14} /> Note d'information — Note 14
        </div>
        <ul style={{ margin: 0, paddingLeft: 18 }}>
          <li>Primes liées au capital (1051-1058) : solde créditeur.</li>
          <li>Réserves (111-118) : solde créditeur.</li>
          <li>Report à nouveau (12) : 121 créditeur (bénéfice), 129 débiteur (perte).</li>
        </ul>
      </div>

      <BalanceSourcePanel
        lignes={lignesN}
        groups={RUBRIQUES.filter(r => !r.isTotal).map(r => ({ label: r.label, prefixes: r.prefixes }))}
        title="Soldes balance — Primes et reserves"
      />

      <div ref={pageRef} style={{
        width: '210mm', minHeight: '297mm', background: '#fff',
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
          NOTE 14 — PRIMES ET RESERVES
        </h3>

        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 0 }}>
          <thead>
            <tr>
              <th style={{ ...thStyle, width: '50%' }}>Libelles</th>
              <th style={thStyle}>Annee N</th>
              <th style={thStyle}>Annee N-1</th>
              <th style={thStyle}>Variation en valeur absolue</th>
            </tr>
          </thead>
          <tbody>
            {RUBRIQUES.map(r => {
              if (r.isTotal) {
                const totals = r.label === 'TOTAL PRIMES' ? totalPrimes : totalReservesIndisp;
                return <React.Fragment key={r.label}>{renderTotalRow(r.label, totals)}</React.Fragment>;
              }
              const vals = computeRow(r);
              if (hideEmpty && vals.anneeN === 0 && vals.anneeN1 === 0) return null;
              return (
                <tr key={r.label}>
                  <td style={r.bold ? tdBold : tdStyle}>{r.label}</td>
                  <td style={r.bold ? tdBoldRight : tdRight}>{renderAdjInput(r.label, 'anneeN', vals.anneeN)}</td>
                  <td style={r.bold ? tdBoldRight : tdRight}>{renderAdjInput(r.label, 'anneeN1', vals.anneeN1)}</td>
                  <td style={{ ...(r.bold ? tdBoldRight : tdRight), background: '#fafafa' }}>{fmtM(vals.variation)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>

        <div style={{ border: '0.5px solid #000', borderTop: 'none', padding: '10px 12px' }}>
          <p style={{ fontSize: 12, fontWeight: 700, marginBottom: 6, marginTop: 0 }}>Commentaire :</p>
          <EditableComment value={commentaire} onChange={setCommentaire} editing={editing} minHeight={60} />
        </div>
      </div>
    </div>
  );
}

export default Note14;
