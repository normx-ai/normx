import React, { useState, useRef, useEffect, useMemo } from 'react';
import '../BilanSYCEBNL.css';
import '../FicheIdentification.css';
import type { EtatBaseProps, BalanceLigne } from '../../types';
import { useNoteData } from './useNoteData';
import { useBalanceLignes } from '../../hooks/useBalanceLignes';
import { usePDFPreview } from './usePDFPreview';
import NoteToolbar from './NoteToolbar';
import PDFPreviewModal from './PDFPreviewModal';
import { thStyle, tdStyle, tdRight, tdBold, tdBoldRight, inputSt } from './noteStyles';
import { LuInfo } from 'react-icons/lu';
import { computeAllCR, getValue as crGetValue, type CRBalanceResult } from '../cr/crSyscohadaData';
import {
  computeActifFromBalance, computePassifFromBalance,
} from '../bilan/bilanSyscohadaCompute';
import {
  ACTIF_MAPPING, PASSIF_MAPPING,
  type ActifResult, type PassifResult,
} from '../bilan/bilanSyscohadaData';
import { computeAllFlux } from '../tft/calculs';
import { rawSD, rawSC } from '../tft/soldes';

interface Note34Props extends EtatBaseProps { onGoToParametres?: () => void; }

interface Ctx {
  lignes: BalanceLigne[];
  cr: Record<string, CRBalanceResult>;
  actif: Record<string, ActifResult>;
  passif: Record<string, PassifResult>;
  flux: Record<string, number> | null;
}

type Compute = (c: Ctx) => number | null;

interface Section {
  label: string;
  bold?: boolean;
  indent?: boolean;
  prefix?: string;
  compute?: Compute;
  isPercent?: boolean;
  manualKey?: string;
}

const sumActifNet = (a: Record<string, ActifResult>, refs: string[]): number =>
  refs.reduce((s, r) => s + (a[r]?.net ?? 0), 0);
const sumPassifNet = (p: Record<string, PassifResult>, refs: string[]): number =>
  refs.reduce((s, r) => s + (p[r]?.net ?? 0), 0);

const ACTIF_IMMO_REFS = ['AE', 'AF', 'AG', 'AH', 'AJ', 'AK', 'AL', 'AM', 'AN', 'AP', 'AR', 'AS'];
const AC_EXP_REFS = ['BB', 'BH', 'BI', 'BJ'];
const PC_EXP_REFS = ['DI', 'DJ', 'DK', 'DM', 'DN'];
const TRESO_ACTIF_REFS = ['BQ', 'BR', 'BS'];
const TRESO_PASSIF_REFS = ['DQ', 'DR'];

const cp = (c: Ctx): number => c.passif['CP']?.net ?? 0;
const dettesFin = (c: Ctx): number => (c.passif['DA']?.net ?? 0) + (c.passif['DB']?.net ?? 0);
const ressourcesStables = (c: Ctx): number => cp(c) + dettesFin(c);
const actifImmo = (c: Ctx): number => c.actif['AZ']?.net ?? sumActifNet(c.actif, ACTIF_IMMO_REFS);
const fr = (c: Ctx): number => ressourcesStables(c) - actifImmo(c);
const bfrExp = (c: Ctx): number => sumActifNet(c.actif, AC_EXP_REFS) - sumPassifNet(c.passif, PC_EXP_REFS);
const bfrHao = (c: Ctx): number => (c.actif['BA']?.net ?? 0) - (c.passif['DH']?.net ?? 0);
const tresoNette = (c: Ctx): number => fr(c) - (bfrExp(c) + bfrHao(c));
const tresoControl = (c: Ctx): number => sumActifNet(c.actif, TRESO_ACTIF_REFS) - sumPassifNet(c.passif, TRESO_PASSIF_REFS);
const endBrut = (c: Ctx): number => dettesFin(c) + sumPassifNet(c.passif, TRESO_PASSIF_REFS);

const cafe = (c: Ctx): number =>
  crGetValue('XD', c.cr) + rawSD(c.lignes, ['654']) - rawSC(c.lignes, ['754']);

const cafg = (c: Ctx): number => {
  // Formule officielle SYSCOHADA (cafg2.png) :
  // CAFG = EBE + 654 - 754 + (Resultat fin) + TO - RP - RQ - RS
  // Resultat fin retenu dans calculs.ts: TK + TM - RM (encaissable).
  // TO = 84+86+88 ; RP = 83+85 ; RQ = 87 ; RS = 89.
  const TK = c.cr['TK']?.net ?? 0;          // 77
  const TM = c.cr['TM']?.net ?? 0;          // 787
  const TO = c.cr['TO']?.net ?? 0;          // 84+86+88
  const RM = c.cr['RM']?.net ?? 0;          // 67
  const RP = c.cr['RP']?.net ?? 0;          // 83+85
  const RQ = c.cr['RQ']?.net ?? 0;          // 87
  const RS = c.cr['RS']?.net ?? 0;          // 89
  return cafe(c) + TK + TM + TO - RM - RP - RQ - RS;
};

const SECTIONS: Section[] = [
  { label: "ANALYSE DE L'ACTIVITE", bold: true },
  { label: 'SOLDES INTERMEDIAIRES DE GESTION', bold: true },
  { label: "Chiffre d'affaires", compute: (c) => crGetValue('XB', c.cr) },
  { label: 'Marge commerciale', compute: (c) => crGetValue('XA', c.cr) },
  { label: 'Valeur ajoutée', compute: (c) => crGetValue('XC', c.cr) },
  { label: "Excédent brut d'exploitation (EBE)", compute: (c) => crGetValue('XD', c.cr) },
  { label: "Résultat d'exploitation", compute: (c) => crGetValue('XE', c.cr) },
  { label: 'Résultat financier', compute: (c) => crGetValue('XF', c.cr) },
  { label: 'Résultat des activités ordinaires', compute: (c) => crGetValue('XG', c.cr) },
  { label: 'Résultat hors activités ordinaires', compute: (c) => crGetValue('XH', c.cr) },
  { label: 'Résultat net', compute: (c) => crGetValue('XI', c.cr) },

  { label: "DETERMINATION DE LA CAPACITE D'AUTOFINANCEMENT", bold: true },
  { label: "Excédent brut d'exploitation (EBE)", compute: (c) => crGetValue('XD', c.cr) },
  { label: "Valeurs comptables des cessions courantes d'immobilisation (compte 654)", prefix: '+', compute: (c) => rawSD(c.lignes, ['654']) },
  { label: "Produits des cessions courantes d'immobilisation (compte 754)", prefix: '-', compute: (c) => rawSC(c.lignes, ['754']) },
  { label: "CAPACITE D'AUTOFINANCEMENT D'EXPLOITATION", bold: true, prefix: '=', compute: cafe },
  // Revenus financiers (77) hors 776 ; gains de change (776) affiches separement.
  { label: 'Revenus financiers', prefix: '+', compute: (c) => (c.cr['TK']?.net ?? 0) - rawSC(c.lignes, ['776']) },
  { label: 'Gains de change', prefix: '+', compute: (c) => rawSC(c.lignes, ['776']) },
  { label: 'Transferts de charges financières', prefix: '+', compute: (c) => c.cr['TM']?.net ?? 0 },
  // Produits HAO = poste TO du SIG (84+86+88) hors transferts charges HAO (848).
  { label: 'Produits HAO', prefix: '+', compute: (c) => (c.cr['TO']?.net ?? 0) - rawSC(c.lignes, ['848']) },
  { label: 'Transferts de charges HAO', prefix: '+', compute: (c) => rawSC(c.lignes, ['848']) },
  // Frais financiers (67) hors 676 ; pertes de change (676) affichees separement.
  { label: 'Frais financiers', prefix: '-', compute: (c) => (c.cr['RM']?.net ?? 0) - rawSD(c.lignes, ['676']) },
  { label: 'Pertes de change', prefix: '-', compute: (c) => rawSD(c.lignes, ['676']) },
  { label: 'Charges HAO', prefix: '-', compute: (c) => c.cr['RP']?.net ?? 0 },
  { label: 'Participation', prefix: '-', compute: (c) => c.cr['RQ']?.net ?? 0 },
  { label: 'Impôts sur les résultats', prefix: '-', compute: (c) => c.cr['RS']?.net ?? 0 },
  { label: "CAPACITE D'AUTOFINANCEMENT GLOBALE (C.A.F.G.)", bold: true, prefix: '=', compute: cafg },
  { label: "Distributions de dividendes opérées durant l'exercice", prefix: '-', manualKey: 'dividendes' },
  { label: 'AUTOFINANCEMENT', bold: true, prefix: '=' },

  { label: 'ANALYSE DE LA RENTABILITE', bold: true },
  { label: "Rentabilité économique = Résultat d'exploitation (a) / Capitaux propres + dettes financières", isPercent: true, compute: (c) => {
    const denom = cp(c) + dettesFin(c);
    return denom === 0 ? 0 : (crGetValue('XE', c.cr) / denom) * 100;
  } },
  { label: 'Rentabilité financière = Résultat net / Capitaux propres', isPercent: true, compute: (c) => {
    const d = cp(c);
    return d === 0 ? 0 : (crGetValue('XI', c.cr) / d) * 100;
  } },

  { label: 'ANALYSE DE LA STRUCTURE FINANCIERE', bold: true },
  { label: 'Capitaux propres et ressources assimilées', compute: cp },
  { label: 'Dettes financières* et autres ressources assimilées (b)', prefix: '+', compute: dettesFin },
  { label: 'RESSOURCES STABLES', bold: true, prefix: '=', compute: ressourcesStables },
  { label: 'Actif immobilisé (b)', prefix: '-', compute: actifImmo },
  { label: 'FONDS DE ROULEMENT (1)', bold: true, prefix: '=', compute: fr },
  { label: "Actif circulant d'exploitation (b)", indent: true, compute: (c) => sumActifNet(c.actif, AC_EXP_REFS) },
  { label: "Passif circulant d'exploitation (b)", indent: true, prefix: '-', compute: (c) => sumPassifNet(c.passif, PC_EXP_REFS) },
  { label: "BESOIN DE FINANCEMENT D'EXPLOITATION (2)", bold: true, prefix: '=', compute: bfrExp },
  { label: 'Actif circulant HAO (b)', indent: true, compute: (c) => c.actif['BA']?.net ?? 0 },
  { label: 'Passif circulant HAO (b)', indent: true, prefix: '-', compute: (c) => c.passif['DH']?.net ?? 0 },
  { label: 'BESOIN DE FINANCEMENT HAO (3)', bold: true, prefix: '=', compute: bfrHao },
  { label: 'BESOIN DE FINANCEMENT GLOBAL (4) = (2) + (3)', bold: true, compute: (c) => bfrExp(c) + bfrHao(c) },
  { label: 'TRESORERIE NETTE (5) = (1) - (4)', bold: true, compute: tresoNette },
  { label: 'Contrôle : trésorerie nette = (trésorerie - actif) - (trésorerie - passif)', compute: tresoControl },

  { label: 'ANALYSE DE LA VARIATION DE LA TRESORERIE', bold: true },
  { label: "Flux de trésorerie des activités opérationnelles", compute: (c) => c.flux ? (c.flux['ZB'] ?? 0) : null },
  { label: "Flux de trésorerie des activités d'investissement", prefix: '-', compute: (c) => c.flux ? (c.flux['ZC'] ?? 0) : null },
  { label: 'Flux de trésorerie des activités de financement', prefix: '+', compute: (c) => c.flux ? (c.flux['ZF'] ?? 0) : null },
  { label: 'VARIATION DE LA TRESORERIE NETTE DE LA PERIODE', bold: true, prefix: '=', compute: (c) => c.flux ? (c.flux['ZG'] ?? 0) : null },

  { label: "ANALYSE DE LA VARIATION DE L'ENDETTEMENT FINANCIER NET", bold: true },
  { label: 'Endettement financier brut (Dettes financières* + Trésorerie - passif)', compute: endBrut },
  { label: 'Trésorerie - actif', prefix: '-', compute: (c) => sumActifNet(c.actif, TRESO_ACTIF_REFS) },
  { label: 'ENDETTEMENT FINANCIER NET', bold: true, prefix: '=', compute: (c) => endBrut(c) - sumActifNet(c.actif, TRESO_ACTIF_REFS) },
];

function buildCtx(lignes: BalanceLigne[], flux: Record<string, number> | null): Ctx {
  return {
    lignes,
    cr: computeAllCR(lignes),
    actif: computeActifFromBalance(lignes, ACTIF_MAPPING),
    passif: computePassifFromBalance(lignes, PASSIF_MAPPING),
    flux,
  };
}

function Note34({ entiteName, entiteNif = '', entiteId, offre, onBack }: Note34Props): React.JSX.Element {
  const {
    exercices, selectedExercice, setSelectedExercice,
    params, setParams: _setParams, editing, setEditing, saving, saved, saveParams, annee, dateFin, duree,
  } = useNoteData({ entiteId });
  void _setParams;

  const pageRef = useRef<HTMLDivElement>(null);
  const pdf = usePDFPreview({ pageRef, fileName: `Note34_${annee}.pdf`, editing, setEditing });
  const { lignesN, lignesN1 } = useBalanceLignes({ entiteId, selectedExercice, exercices, offre });

  // Overrides manuels (par ligne et colonne) : si saisi, l'emporte sur le calcul
  const [overrides, setOverrides] = useState<Record<string, string>>({});
  const getOv = (row: number, col: number): string => overrides[`r${row}_c${col}`] || '';
  const setOv = (row: number, col: number, value: string) =>
    setOverrides(prev => ({ ...prev, [`r${row}_c${col}`]: value }));

  // Saisies libres (lignes manualKey, ex. dividendes) — partagees entre N et N-1
  const [manual, setManual] = useState<Record<string, string>>({});
  const getMan = (key: string): string => manual[key] || '';
  const setMan = (key: string, value: string) => setManual(prev => ({ ...prev, [key]: value }));

  useEffect(() => {
    if (params['note34_overrides']) {
      try { setOverrides(JSON.parse(params['note34_overrides'])); } catch { /* */ }
    }
    if (params['note34_manual']) {
      try { setManual(JSON.parse(params['note34_manual'])); } catch { /* */ }
    }
  }, [params]);

  const handleSave = () => saveParams({
    ...params,
    note34_overrides: JSON.stringify(overrides),
    note34_manual: JSON.stringify(manual),
  });

  const ctxN = useMemo(() => buildCtx(lignesN, computeAllFlux(lignesN, lignesN1)), [lignesN, lignesN1]);
  const ctxN1 = useMemo(() => buildCtx(lignesN1, null), [lignesN1]);

  const fmtDateShort = (d: string): string => {
    if (!d) return '';
    return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };
  const parseNVal = (v: string): number => {
    const n = parseFloat(v.replace(/\s/g, '').replace(',', '.'));
    return isNaN(n) ? 0 : n;
  };
  const fmtM = (v: number): string => v === 0 ? '0' : Math.round(v).toLocaleString('fr-FR');
  const fmtPct = (v: number): string => v.toFixed(1).replace('.', ',') + ' %';

  // Resoudre la valeur d'une ligne pour une colonne (override > calc > vide)
  const resolveValue = (i: number, col: number): number | null => {
    const s = SECTIONS[i];
    const ov = getOv(i, col);
    if (ov.trim()) return parseNVal(ov);
    if (s.manualKey) {
      const m = getMan(s.manualKey);
      return m.trim() ? parseNVal(m) : 0;
    }
    if (!s.compute) return null;
    const ctx = col === 0 ? ctxN : ctxN1;
    if (col === 0) {
      // AUTOFINANCEMENT depend du dividendes (manual key)
      if (s.label === 'AUTOFINANCEMENT') {
        const div = parseNVal(getMan('dividendes'));
        return cafg(ctx) - div;
      }
    } else if (s.label === 'AUTOFINANCEMENT') {
      // pas d'AUTOFIN en N-1 sauf si override saisi
      return null;
    }
    return s.compute(ctx);
  };

  const computeVariation = (row: number): string => {
    const s = SECTIONS[row];
    if (s.isPercent) return '';
    const vN = resolveValue(row, 0);
    const vN1 = resolveValue(row, 1);
    if (vN === null || vN1 === null || vN1 === 0) return '';
    const pct = ((vN - vN1) / Math.abs(vN1)) * 100;
    return pct.toFixed(1).replace('.', ',');
  };

  const formatCell = (s: Section, v: number | null): string => {
    if (v === null) return '';
    if (s.isPercent) return fmtPct(v);
    return fmtM(v);
  };

  const th: React.CSSProperties = { ...thStyle, padding: '6px 10px', fontSize: 9 };
  const td: React.CSSProperties = { ...tdStyle, fontSize: 9 };
  const tdR: React.CSSProperties = { ...tdRight, fontSize: 9 };
  const tdB: React.CSSProperties = { ...tdBold, background: '#f0f0f0', fontSize: 9 };
  const tdBR: React.CSSProperties = { ...tdBoldRight, background: '#f0f0f0', fontSize: 9 };
  const inp: React.CSSProperties = { ...inputSt, padding: '3px 6px', fontSize: 9 };

  const COLS = ['Année N', 'Année N-1', 'Variation en %'];

  const renderCell = (i: number, col: number, isBold: boolean): React.ReactNode => {
    const s = SECTIONS[i];
    const v = resolveValue(i, col);
    const display = formatCell(s, v);
    const cellStyle = isBold ? tdBR : tdR;
    if (editing) {
      const ov = getOv(i, col);
      // pour les lignes manualKey, la saisie est partagee N seulement (col 0) via setMan
      if (s.manualKey && col === 0) {
        return (
          <td style={cellStyle}>
            <input
              value={getMan(s.manualKey)}
              onChange={e => setMan(s.manualKey!, e.target.value)}
              style={inp}
            />
          </td>
        );
      }
      return (
        <td style={cellStyle}>
          <input
            value={ov}
            placeholder={display}
            onChange={e => setOv(i, col, e.target.value)}
            style={inp}
          />
        </td>
      );
    }
    return <td style={cellStyle}>{display}</td>;
  };

  return (
    <div>
      <NoteToolbar
        title="Note 34 — Fiche de synthèse des principaux indicateurs financiers"
        exercices={exercices} selectedExercice={selectedExercice} onSelectExercice={setSelectedExercice}
        editing={editing} saving={saving} saved={saved}
        onEdit={() => setEditing(true)} onSave={handleSave} onPreview={pdf.openPreview} onBack={onBack}
      />

      {pdf.previewUrl && (
        <PDFPreviewModal previewUrl={pdf.previewUrl} title="Apercu — Note 34" onClose={pdf.closePreview} onDownload={pdf.downloadPDF} onPrint={pdf.printPDF} />
      )}

      <div style={{ margin: '12px 20px', padding: '12px 16px', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 8, fontSize: 12, color: '#1e40af', lineHeight: 1.6 }}>
        <div style={{ fontWeight: 700, marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
          <LuInfo size={14} /> Note d'information — Note 34
        </div>
        <ul style={{ margin: 0, paddingLeft: 18 }}>
          <li>Les valeurs sont calculées automatiquement à partir de la balance N / N-1 (Bilan, Compte de résultat, TFT).</li>
          <li>En mode édition, vous pouvez saisir une valeur pour surcharger le calcul automatique d'une ligne.</li>
          <li>Les distributions de dividendes restent à saisir manuellement (décision d'AG).</li>
          <li>Les flux de trésorerie N-1 ne sont pas calculables (besoin de la balance N-2) — saisie possible en édition.</li>
        </ul>
      </div>

      <div ref={pageRef} style={{ width: '210mm', minHeight: '297mm', background: '#fff', margin: '0 auto 20px', padding: '5mm 8mm', boxShadow: '0 2px 12px rgba(0,0,0,0.1)', boxSizing: 'border-box', fontFamily: "'Inter', 'Segoe UI', Arial, sans-serif", fontSize: 9, color: '#1a1a1a' }}>
        <div className="etat-header-officiel"><div className="etat-header-grid"><div className="etat-header-row"><span className="etat-header-label">Designation entite :</span><span className="etat-header-value">{entiteName || ''}</span><span className="etat-header-label">Exercice clos le :</span><span className="etat-header-value-right">{fmtDateShort(dateFin)}</span></div><div className="etat-header-row"><span className="etat-header-label">Numero d'identification :</span><span className="etat-header-value">{entiteNif || ''}</span><span className="etat-header-label">Duree (en mois) :</span><span className="etat-header-value-right">{duree}</span></div></div></div>
        <h3 style={{ textAlign: 'center', fontSize: 14, fontWeight: 700, margin: '30px 0 20px', textDecoration: 'underline' }}>
          NOTE 34 — FICHE DE SYNTHESE DES PRINCIPAUX INDICATEURS FINANCIERS
        </h3>

        <div style={{ textAlign: 'right', fontSize: 8, marginBottom: 4, fontStyle: 'italic' }}>(EN MILLIERS DE FRANCS)</div>

        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={{ ...th, width: '55%', textAlign: 'left' }}></th>
              {COLS.map(c => <th key={c} style={th}>{c}</th>)}
            </tr>
          </thead>
          <tbody>
            {SECTIONS.map((s, i) => {
              const labelText = (s.prefix ? s.prefix + ' ' : '') + (s.indent ? '  ' : '') + s.label;
              const variation = computeVariation(i);
              return (
                <tr key={i}>
                  <td style={s.bold ? tdB : { ...td, paddingLeft: s.indent ? 20 : s.prefix ? 14 : 8 }}>{labelText}</td>
                  {!s.compute && !s.manualKey ? (
                    <>
                      <td style={s.bold ? tdBR : tdR}></td>
                      <td style={s.bold ? tdBR : tdR}></td>
                      <td style={{ ...(s.bold ? tdBR : tdR), textAlign: 'center' }}></td>
                    </>
                  ) : (
                    <>
                      {renderCell(i, 0, !!s.bold)}
                      {renderCell(i, 1, !!s.bold)}
                      <td style={{ ...(s.bold ? tdBR : tdR), textAlign: 'center' }}>
                        {variation}{variation ? ' %' : ''}
                      </td>
                    </>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>

        <div style={{ fontSize: 7, marginTop: 8, color: '#555', lineHeight: 1.5 }}>
          <p style={{ margin: '2px 0' }}>(a) Résultat d'exploitation après impôt théorique sur le bénéfice.</p>
          <p style={{ margin: '2px 0' }}>(b) Les écarts de conversion doivent être éliminés afin de ramener les créances et les dettes concernées à leur valeur initiale.</p>
          <p style={{ margin: '2px 0' }}>Dettes financières* = emprunts et dettes financières diverses + dettes de location acquisition.</p>
        </div>
      </div>
    </div>
  );
}

export default Note34;
