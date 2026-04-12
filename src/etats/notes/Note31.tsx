import React, { useState, useRef, useEffect } from 'react';
import '../BilanSYCEBNL.css';
import '../FicheIdentification.css';
import type { EtatBaseProps } from '../../types';
import { useNoteData } from './useNoteData';
import { usePDFPreview } from './usePDFPreview';
import NoteToolbar from './NoteToolbar';
import PDFPreviewModal from './PDFPreviewModal';
import { thStyle, tdStyle, tdRight, tdBold, inputSt } from './noteStyles';
import { LuInfo } from 'react-icons/lu';

interface Note31Props extends EtatBaseProps { onGoToParametres?: () => void; }

const SECTIONS: { label: string; bold?: boolean }[] = [
  { label: 'STRUCTURE DU CAPITAL A LA CLOTURE DE L\'EXERCICE (²)', bold: true },
  { label: 'Capital social' },
  { label: 'Actions ordinaires' },
  { label: 'Actions à dividendes prioritaires (A.D.P) sans droit de vote' },
  { label: 'Actions nouvelles à émettre :' },
  { label: '  - par conversion d\'obligations' },
  { label: '  - par exercice de droits de souscription' },
  { label: 'OPERATIONS ET RESULTATS DE L\'EXERCICE (³)', bold: true },
  { label: 'Chiffre d\'affaires hors taxes' },
  { label: 'Résultat des activités ordinaires (R.A.O) hors dotations et reprises (exploitation et financières)' },
  { label: 'Participation des travailleurs aux bénéfices' },
  { label: 'Impôt sur le résultat' },
  { label: 'Résultat net (⁴)' },
  { label: 'RESULTAT ET DIVIDENDE DISTRIBUES', bold: true },
  { label: 'Résultat distribué (⁵)' },
  { label: 'Dividende attribué à chaque action' },
  { label: 'PERSONNEL ET POLITIQUE SALARIALE', bold: true },
  { label: 'Effectif moyen des travailleurs au cours de l\'exercice (⁶)' },
  { label: 'Effectif moyen de personnel extérieur' },
  { label: 'Masse salariale distribuée au cours de l\'exercice (⁷)' },
  { label: 'Avantages sociaux versés au cours de l\'exercice (⁸) [Sécurité sociale, œuvres sociales]' },
  { label: 'Personnel extérieur facturé à l\'entité (9)' },
];

function Note31({ entiteName, entiteNif = '', entiteId, onBack }: Note31Props): React.JSX.Element {
  const {
    exercices, selectedExercice, setSelectedExercice,
    params, setParams, editing, setEditing, saving, saved, saveParams, annee, dateFin, duree,
  } = useNoteData({ entiteId });

  const pageRef = useRef<HTMLDivElement>(null);
  const pdf = usePDFPreview({ pageRef, fileName: `Note31_${annee}.pdf`, editing, setEditing });

  const [data, setData] = useState<Record<string, string>>({});

  const getVal = (row: number, col: number): string => data[`r${row}_c${col}`] || '';
  const setVal = (row: number, col: number, value: string) => setData(prev => ({ ...prev, [`r${row}_c${col}`]: value }));

  // Charger data depuis params
  useEffect(() => {
    if (!params['note31_data']) return;
    try { setData(JSON.parse(params['note31_data'])); } catch { /* */ }
  }, [params]);

  const handleSave = () => saveParams({
    ...params,
    note31_data: JSON.stringify(data),
  });

  const fmtDateShort = (d: string): string => {
    if (!d) return '';
    return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
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


      {/* Bulle d'information */}
      <div style={{ margin: '12px 20px', padding: '12px 16px', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 8, fontSize: 12, color: '#1e40af', lineHeight: 1.6 }}>
        <div style={{ fontWeight: 700, marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
          <LuInfo size={14} /> Note d'information — Note 31
        </div>
        <ul style={{ margin: 0, paddingLeft: 18 }}>
          <li><strong>Affectation du resultat :</strong> Decision de l'AG : dividendes, mise en reserves, report a nouveau.</li>
          <li><strong>Tableau 5 exercices :</strong> Capital, chiffre d'affaires, resultat net, dividendes, effectif moyen.</li>
          <li><strong>Ratios cles :</strong> Resultat par action / part, evolution en % annuelle.</li>
          <li>Obligatoire pour les entites du systeme normal SYSCOHADA.</li>
        </ul>
      </div>

      <div ref={pageRef} style={{ width: '210mm', minHeight: '297mm', background: '#fff', margin: '0 auto 20px', padding: '6mm 10mm', boxShadow: '0 2px 12px rgba(0,0,0,0.1)', boxSizing: 'border-box', fontFamily: "'Inter', 'Segoe UI', Arial, sans-serif", fontSize: 11, color: '#1a1a1a' }}>
        <div className="etat-header-officiel"><div className="etat-header-grid"><div className="etat-header-row"><span className="etat-header-label">Designation entite :</span><span className="etat-header-value">{entiteName || ''}</span><span className="etat-header-label">Exercice clos le :</span><span className="etat-header-value-right">{fmtDateShort(dateFin)}</span></div><div className="etat-header-row"><span className="etat-header-label">Numero d'identification :</span><span className="etat-header-value">{entiteNif || ''}</span><span className="etat-header-label">Duree (en mois) :</span><span className="etat-header-value-right">{duree}</span></div></div></div>
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
                {COLS.map((_, ci) => (
                  <td key={ci} style={s.bold ? { ...tdBold, textAlign: 'right' } : tdRight}>
                    {s.bold ? '' : (editing ? <input value={getVal(i, ci)} onChange={e => setVal(i, ci, e.target.value)} style={inp} /> : getVal(i, ci))}
                  </td>
                ))}
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
