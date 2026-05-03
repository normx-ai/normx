import React, { useState, useRef, useEffect, useMemo } from 'react';
import '../BilanSYCEBNL.css';
import '../FicheIdentification.css';
import type { EtatBaseProps, BalanceLigne } from '../../types';
import { useNoteData } from './useNoteData';
import { useBalanceLignes } from '../../hooks/useBalanceLignes';
import { usePDFPreview } from './usePDFPreview';
import NoteToolbar from './NoteToolbar';
import PDFPreviewModal from './PDFPreviewModal';
import { thStyle, tdStyle, tdRight, tdBold, inputSt } from './noteStyles';
import { LuInfo } from 'react-icons/lu';
import { computeAllCR, getValue as crGetValue, type CRBalanceResult } from '../cr/crSyscohadaData';
import { rawSC, sumSoldeDebiteur } from '../tft/soldes';
import { fmtMontant, fmtDate } from '../../utils/formatters';

interface Note31Props extends EtatBaseProps { onGoToParametres?: () => void; }

interface Ctx {
  lignes: BalanceLigne[];
  cr: Record<string, CRBalanceResult>;
}

type Compute = (c: Ctx) => number | null;

interface Section {
  label: string;
  bold?: boolean;
  compute?: Compute;
}

const cap = (c: Ctx): number => rawSC(c.lignes, ['101']);
const ca = (c: Ctx): number => crGetValue('XB', c.cr);
const raoHorsDotRepr = (c: Ctx): number => {
  const xg = crGetValue('XG', c.cr);
  const TJ = c.cr['TJ']?.net ?? 0;
  const RL = c.cr['RL']?.net ?? 0;
  const TL = c.cr['TL']?.net ?? 0;
  const RN = c.cr['RN']?.net ?? 0;
  return xg + RL + RN - TJ - TL;
};
const participation = (c: Ctx): number => c.cr['RQ']?.net ?? 0;
const impot = (c: Ctx): number => c.cr['RS']?.net ?? 0;
const resultatNet = (c: Ctx): number => crGetValue('XI', c.cr);
const masseSalariale = (c: Ctx): number => sumSoldeDebiteur(c.lignes, ['661', '662', '663']);
const avantagesSociaux = (c: Ctx): number => sumSoldeDebiteur(c.lignes, ['664', '668']);
const personnelExterieur = (c: Ctx): number => sumSoldeDebiteur(c.lignes, ['667']);

const SECTIONS: Section[] = [
  { label: "STRUCTURE DU CAPITAL A LA CLOTURE DE L'EXERCICE (²)", bold: true },
  { label: 'Capital social', compute: cap },
  { label: 'Actions ordinaires' },
  { label: 'Actions à dividendes prioritaires (A.D.P) sans droit de vote' },
  { label: 'Actions nouvelles à émettre :' },
  { label: "  - par conversion d'obligations" },
  { label: '  - par exercice de droits de souscription' },
  { label: "OPERATIONS ET RESULTATS DE L'EXERCICE (³)", bold: true },
  { label: "Chiffre d'affaires hors taxes", compute: ca },
  { label: 'Résultat des activités ordinaires (R.A.O) hors dotations et reprises (exploitation et financières)', compute: raoHorsDotRepr },
  { label: 'Participation des travailleurs aux bénéfices', compute: participation },
  { label: 'Impôt sur le résultat', compute: impot },
  { label: 'Résultat net (⁴)', compute: resultatNet },
  { label: 'RESULTAT ET DIVIDENDE DISTRIBUES', bold: true },
  { label: 'Résultat distribué (⁵)' },
  { label: 'Dividende attribué à chaque action' },
  { label: 'PERSONNEL ET POLITIQUE SALARIALE', bold: true },
  { label: "Effectif moyen des travailleurs au cours de l'exercice (⁶)" },
  { label: 'Effectif moyen de personnel extérieur' },
  { label: "Masse salariale distribuée au cours de l'exercice (⁷)", compute: masseSalariale },
  { label: "Avantages sociaux versés au cours de l'exercice (⁸) [Sécurité sociale, œuvres sociales]", compute: avantagesSociaux },
  { label: 'Personnel extérieur facturé à l\'entité (9)', compute: personnelExterieur },
];

function buildCtx(lignes: BalanceLigne[]): Ctx {
  return { lignes, cr: computeAllCR(lignes) };
}

function Note31({ entiteName, entiteNif = '', entiteId, offre, onBack }: Note31Props): React.JSX.Element {
  const {
    exercices, selectedExercice, setSelectedExercice,
    params, editing, setEditing, saving, saved, saveParams, annee, dateFin, duree,
  } = useNoteData({ entiteId });

  const pageRef = useRef<HTMLDivElement>(null);
  const pdf = usePDFPreview({ pageRef, fileName: `Note31_${annee}.pdf`, editing, setEditing });
  const { lignesN, lignesN1 } = useBalanceLignes({ entiteId, selectedExercice, exercices, offre });

  const [data, setData] = useState<Record<string, string>>({});
  const getVal = (row: number, col: number): string => data[`r${row}_c${col}`] || '';
  const setVal = (row: number, col: number, value: string) =>
    setData(prev => ({ ...prev, [`r${row}_c${col}`]: value }));

  useEffect(() => {
    if (!params['note31_data']) return;
    try { setData(JSON.parse(params['note31_data'])); } catch { /* */ }
  }, [params]);

  const handleSave = () => saveParams({ ...params, note31_data: JSON.stringify(data) });

  const ctxN = useMemo(() => buildCtx(lignesN), [lignesN]);
  const ctxN1 = useMemo(() => buildCtx(lignesN1), [lignesN1]);

  const parseNVal = (v: string): number => {
    const n = parseFloat(v.replace(/\s/g, '').replace(',', '.'));
    return isNaN(n) ? 0 : n;
  };

  const computedValue = (i: number, col: number): number | null => {
    const s = SECTIONS[i];
    if (!s.compute) return null;
    if (col === 0) return s.compute(ctxN);
    if (col === 1) return s.compute(ctxN1);
    return null;
  };

  const displayValue = (i: number, col: number): string => {
    const ov = getVal(i, col);
    if (ov.trim()) return fmtMontant(parseNVal(ov));
    const calc = computedValue(i, col);
    return calc === null ? '' : fmtMontant(calc);
  };

  const inp: React.CSSProperties = { ...inputSt, fontSize: 11 };
  const COLS = ['N', 'N-1', 'N-2', 'N-3', 'N-4'];

  return (
    <div>
      <NoteToolbar
        title="Note 31 — Répartition du résultat des cinq derniers exercices"
        exercices={exercices} selectedExercice={selectedExercice} onSelectExercice={setSelectedExercice}
        editing={editing} saving={saving} saved={saved}
        onEdit={() => setEditing(true)} onSave={handleSave} onPreview={pdf.openPreview} onBack={onBack}
      />

      {pdf.previewUrl && (
        <PDFPreviewModal previewUrl={pdf.previewUrl} title="Apercu — Note 31" onClose={pdf.closePreview} onDownload={pdf.downloadPDF} onPrint={pdf.printPDF} />
      )}

      <div style={{ margin: '12px 20px', padding: '12px 16px', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 8, fontSize: 12, color: '#1e40af', lineHeight: 1.6 }}>
        <div style={{ fontWeight: 700, marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
          <LuInfo size={14} /> Note d'information — Note 31
        </div>
        <ul style={{ margin: 0, paddingLeft: 18 }}>
          <li>Colonnes N et N-1 pré-remplies depuis la balance courante (capital, CA, RAO hors dotations/reprises, participation, impôt, résultat net, masse salariale, avantages sociaux, personnel extérieur).</li>
          <li>Colonnes N-2 à N-4 et lignes manuelles (effectifs, dividendes, actions) à saisir en mode édition.</li>
          <li>Une saisie en N ou N-1 surcharge le calcul automatique pour cette cellule.</li>
        </ul>
      </div>

      <div ref={pageRef} style={{ width: '210mm', minHeight: '297mm', background: '#fff', margin: '0 auto 20px', padding: '6mm 10mm', boxShadow: '0 2px 12px rgba(0,0,0,0.1)', boxSizing: 'border-box', fontFamily: "'Inter', 'Segoe UI', Arial, sans-serif", fontSize: 11, color: '#1a1a1a' }}>
        <div className="etat-header-officiel"><div className="etat-header-grid"><div className="etat-header-row"><span className="etat-header-label">Designation entite :</span><span className="etat-header-value">{entiteName || ''}</span><span className="etat-header-label">Exercice clos le :</span><span className="etat-header-value-right">{fmtDate(dateFin)}</span></div><div className="etat-header-row"><span className="etat-header-label">Numero d'identification :</span><span className="etat-header-value">{entiteNif || ''}</span><span className="etat-header-label">Duree (en mois) :</span><span className="etat-header-value-right">{duree}</span></div></div></div>
        <h3 style={{ textAlign: 'center', fontSize: 14, fontWeight: 700, margin: '30px 0 20px', textDecoration: 'underline' }}>
          NOTE 31 — REPARTITION DU RESULTAT ET AUTRES ELEMENTS CARACTERISTIQUES DES CINQ DERNIERS EXERCICES
        </h3>

        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={{ ...thStyle, width: '40%' }} rowSpan={2}>NATURE DES INDICATIONS</th>
              <th style={thStyle} colSpan={5}>EXERCICES CONCERNES <sup>(1)</sup></th>
            </tr>
            <tr>{COLS.map(c => <th key={c} style={thStyle}>{c}</th>)}</tr>
          </thead>
          <tbody>
            {SECTIONS.map((s, i) => (
              <tr key={i}>
                <td style={s.bold ? tdBold : tdStyle}>{s.label}</td>
                {COLS.map((_, ci) => {
                  if (s.bold) return <td key={ci} style={{ ...tdBold, textAlign: 'right' }}></td>;
                  const display = displayValue(i, ci);
                  if (editing) {
                    const placeholder = (() => {
                      const calc = computedValue(i, ci);
                      return calc === null ? '' : fmtMontant(calc);
                    })();
                    return (
                      <td key={ci} style={tdRight}>
                        <input
                          value={getVal(i, ci)}
                          placeholder={placeholder}
                          onChange={e => setVal(i, ci, e.target.value)}
                          style={inp}
                        />
                      </td>
                    );
                  }
                  return <td key={ci} style={tdRight}>{display}</td>;
                })}
              </tr>
            ))}
          </tbody>
        </table>

        <div style={{ fontSize: 9, marginTop: 10, color: '#555', lineHeight: 1.6 }}>
          <p style={{ margin: '2px 0' }}>(1) Y compris l'exercice dont les états financiers sont soumis à l'approbation de l'Assemblée.</p>
          <p style={{ margin: '2px 0' }}>(2) Indication, en cas de libération partielle du capital, du montant du capital non appelé.</p>
          <p style={{ margin: '2px 0' }}>(3) Les éléments de cette rubrique sont ceux figurant au compte de résultat.</p>
          <p style={{ margin: '2px 0' }}>(4) Le résultat, lorsqu'il est négatif, doit être mis entre parenthèses.</p>
          <p style={{ margin: '2px 0' }}>(5) L'exercice N correspond au dividende proposé du dernier exercice.</p>
          <p style={{ margin: '2px 0' }}>(6) Personnel propre.</p>
          <p style={{ margin: '2px 0' }}>(7) Total des comptes 661, 662, 663.</p>
          <p style={{ margin: '2px 0' }}>(8) Total des comptes 664, 668.</p>
          <p style={{ margin: '2px 0' }}>(9) Compte 667.</p>
        </div>
      </div>
    </div>
  );
}

export default Note31;
