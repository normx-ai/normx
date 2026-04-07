import React, { useState, useRef, useEffect } from 'react';
import '../BilanSYCEBNL.css';
import '../FicheIdentification.css';
import type { EtatBaseProps } from '../../types';
import { useNoteData } from './useNoteData';
import { usePDFPreview } from './usePDFPreview';
import NoteToolbar from './NoteToolbar';
import PDFPreviewModal from './PDFPreviewModal';
import { thStyle, tdStyle, tdRight, tdBold, tdBoldRight, inputSt } from './noteStyles';

interface Note34Props extends EtatBaseProps { onGoToParametres?: () => void; }

const SECTIONS: { label: string; bold?: boolean; indent?: boolean; prefix?: string }[] = [
  { label: 'ANALYSE DE L\'ACTIVITE', bold: true },
  { label: 'SOLDES INTERMEDIAIRES DE GESTION', bold: true },
  { label: 'Chiffre d\'affaires' },
  { label: 'Marge commerciale' },
  { label: 'Valeur ajoutée' },
  { label: 'Excédent brut d\'exploitation (EBE)' },
  { label: 'Résultat d\'exploitation' },
  { label: 'Résultat financier' },
  { label: 'Résultat des activités ordinaires' },
  { label: 'Résultat hors activités ordinaires' },
  { label: 'Résultat net' },
  { label: 'DETERMINATION DE LA CAPACITE D\'AUTOFINANCEMENT', bold: true },
  { label: 'Excédent brut d\'exploitation (EBE)' },
  { label: 'Valeurs comptables des cessions courantes d\'immobilisation (compte 654)', prefix: '+' },
  { label: 'Produits des cessions courantes d\'immobilisation (compte 754)', prefix: '-' },
  { label: 'CAPACITE D\'AUTOFINANCEMENT D\'EXPLOITATION', bold: true, prefix: '=' },
  { label: 'Revenus financiers', prefix: '+' },
  { label: 'Gains de change', prefix: '+' },
  { label: 'Transferts de charges financières', prefix: '+' },
  { label: 'Produits HAO', prefix: '+' },
  { label: 'Transferts de charges HAO', prefix: '+' },
  { label: 'Frais financiers', prefix: '-' },
  { label: 'Pertes de change', prefix: '-' },
  { label: 'Participation', prefix: '-' },
  { label: 'Impôts sur les résultats', prefix: '-' },
  { label: 'CAPACITE D\'AUTOFINANCEMENT GLOBALE (C.A.F.G.)', bold: true, prefix: '=' },
  { label: 'Distributions de dividendes opérées durant l\'exercice', prefix: '-' },
  { label: 'AUTOFINANCEMENT', bold: true, prefix: '=' },
  { label: 'ANALYSE DE LA RENTABILITE', bold: true },
  { label: 'Rentabilité économique = Résultat d\'exploitation (a) / Capitaux propres + dettes financières' },
  { label: 'Rentabilité financière = Résultat net / Capitaux propres' },
  { label: 'ANALYSE DE LA STRUCTURE FINANCIERE', bold: true },
  { label: 'Capitaux propres et ressources assimilées' },
  { label: 'Dettes financières* et autres ressources assimilées (b)', prefix: '+' },
  { label: 'RESSOURCES STABLES', bold: true, prefix: '=' },
  { label: 'Actif immobilisé (b)', prefix: '-' },
  { label: 'FONDS DE ROULEMENT (1)', bold: true, prefix: '=' },
  { label: 'Actif circulant d\'exploitation (b)', indent: true },
  { label: 'Passif circulant d\'exploitation (b)', indent: true, prefix: '-' },
  { label: 'BESOIN DE FINANCEMENT D\'EXPLOITATION (2)', bold: true, prefix: '=' },
  { label: 'Actif circulant HAO (b)', indent: true },
  { label: 'Passif circulant HAO (b)', indent: true, prefix: '-' },
  { label: 'BESOIN DE FINANCEMENT HAO (3)', bold: true, prefix: '=' },
  { label: 'BESOIN DE FINANCEMENT GLOBAL (4) = (2) + (3)', bold: true },
  { label: 'TRESORERIE NETTE (5) = (1) - (4)', bold: true },
  { label: 'Contrôle : trésorerie nette = (trésorerie - actif) - (trésorerie - passif)' },
  { label: 'ANALYSE DE LA VARIATION DE LA TRESORERIE', bold: true },
  { label: 'Flux de trésorerie des activités opérationnelles' },
  { label: 'Flux de trésorerie des activités d\'investissement', prefix: '-' },
  { label: 'Flux de trésorerie des activités de financement', prefix: '+' },
  { label: 'VARIATION DE LA TRESORERIE NETTE DE LA PERIODE', bold: true, prefix: '=' },
  { label: 'ANALYSE DE LA VARIATION DE L\'ENDETTEMENT FINANCIER NET', bold: true },
  { label: 'Endettement financier brut (Dettes financières* + Trésorerie - passif)' },
  { label: 'Trésorerie - actif', prefix: '-' },
  { label: 'ENDETTEMENT FINANCIER NET', bold: true, prefix: '=' },
];

function Note34({ entiteName, entiteNif = '', entiteId, onBack }: Note34Props): React.JSX.Element {
  const {
    exercices, selectedExercice, setSelectedExercice,
    params, setParams, editing, setEditing, saving, saved, saveParams, annee, dateFin, duree,
  } = useNoteData({ entiteId });

  const pageRef = useRef<HTMLDivElement>(null);
  const pdf = usePDFPreview({ pageRef, fileName: `Note34_${annee}.pdf`, editing, setEditing });

  const [data, setData] = useState<Record<string, string>>({});

  const getVal = (row: number, col: number): string => data[`r${row}_c${col}`] || '';
  const setVal = (row: number, col: number, value: string) => setData(prev => ({ ...prev, [`r${row}_c${col}`]: value }));

  // Charger data depuis params
  useEffect(() => {
    if (!params['note34_data']) return;
    try { setData(JSON.parse(params['note34_data'])); } catch { /* */ }
  }, [params]);

  const handleSave = () => saveParams({
    ...params,
    note34_data: JSON.stringify(data),
  });

  const fmtDateShort = (d: string): string => {
    if (!d) return '';
    return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };
  const parseNVal = (v: string): number => { const n = parseFloat(v.replace(/\s/g, '').replace(',', '.')); return isNaN(n) ? 0 : n; };
  const fmtM = (v: number): string => v === 0 ? '0' : Math.round(v).toLocaleString('fr-FR');

  const computeVariation = (row: number): string => {
    const vN = parseNVal(getVal(row, 0));
    const vN1 = parseNVal(getVal(row, 1));
    if (vN1 === 0) return '';
    const pct = ((vN - vN1) / Math.abs(vN1)) * 100;
    return pct.toFixed(1).replace('.', ',');
  };

  const th: React.CSSProperties = { ...thStyle, padding: '6px 10px', fontSize: 9 };
  const td: React.CSSProperties = { ...tdStyle, fontSize: 9 };
  const tdR: React.CSSProperties = { ...tdRight, fontSize: 9 };
  const tdB: React.CSSProperties = { ...tdBold, background: '#f0f0f0', fontSize: 9 };
  const tdBR: React.CSSProperties = { ...tdBoldRight, background: '#f0f0f0', fontSize: 9 };
  const inp: React.CSSProperties = { ...inputSt, padding: '3px 6px', fontSize: 9 };

  const COLS = ['Année N', 'Année N-1', 'Variation en %'];

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
              return (
                <tr key={i}>
                  <td style={s.bold ? tdB : { ...td, paddingLeft: s.indent ? 20 : s.prefix ? 14 : 8 }}>{labelText}</td>
                  {s.bold ? (
                    <>
                      <td style={tdBR}>{getVal(i, 0) ? (editing ? <input value={getVal(i, 0)} onChange={e => setVal(i, 0, e.target.value)} style={inp} /> : fmtM(parseNVal(getVal(i, 0)))) : ''}</td>
                      <td style={tdBR}>{getVal(i, 1) ? (editing ? <input value={getVal(i, 1)} onChange={e => setVal(i, 1, e.target.value)} style={inp} /> : fmtM(parseNVal(getVal(i, 1)))) : ''}</td>
                      <td style={{ ...tdBR, textAlign: 'center' }}>{computeVariation(i)}{computeVariation(i) ? ' %' : ''}</td>
                    </>
                  ) : (
                    <>
                      <td style={tdR}>{editing ? <input value={getVal(i, 0)} onChange={e => setVal(i, 0, e.target.value)} style={inp} /> : (getVal(i, 0) ? fmtM(parseNVal(getVal(i, 0))) : '')}</td>
                      <td style={tdR}>{editing ? <input value={getVal(i, 1)} onChange={e => setVal(i, 1, e.target.value)} style={inp} /> : (getVal(i, 1) ? fmtM(parseNVal(getVal(i, 1))) : '')}</td>
                      <td style={{ ...tdR, textAlign: 'center' }}>{computeVariation(i)}{computeVariation(i) ? ' %' : ''}</td>
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
