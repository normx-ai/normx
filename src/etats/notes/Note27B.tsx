import React, { useState, useRef, useEffect } from 'react';
import '../BilanSYCEBNL.css';
import '../FicheIdentification.css';
import type { EtatBaseProps } from '../../types';
import { useNoteData } from './useNoteData';
import { usePDFPreview } from './usePDFPreview';
import NoteToolbar from './NoteToolbar';
import PDFPreviewModal from './PDFPreviewModal';
import EditableComment from './EditableComment';
import { thStyle as thBase, tdStyle as tdBase } from './noteStyles';
import { LuInfo } from 'react-icons/lu';

interface Note27BProps extends EtatBaseProps { onGoToParametres?: () => void; }

interface LigneEffectif {
  ref: string;
  label: string;
  nat_m: string; nat_f: string;
  autres_m: string; autres_f: string;
  hors_m: string; hors_f: string;
  total_eff: string;
  ms_nat_m: string; ms_nat_f: string;
  ms_autres_m: string; ms_autres_f: string;
  ms_hors_m: string; ms_hors_f: string;
  ms_total: string;
}

const emptyLigne = (ref: string, label: string): LigneEffectif => ({
  ref, label,
  nat_m: '', nat_f: '', autres_m: '', autres_f: '', hors_m: '', hors_f: '', total_eff: '',
  ms_nat_m: '', ms_nat_f: '', ms_autres_m: '', ms_autres_f: '', ms_hors_m: '', ms_hors_f: '', ms_total: '',
});

const SECTION1 = [
  { ref: 'YA', label: '1. Cadres supérieurs' },
  { ref: 'YB', label: '2. Techniciens supérieurs et cadres moyens' },
  { ref: 'YC', label: '3. Techniciens, agents de maîtrise et ouvriers qualifiés' },
  { ref: 'YD', label: '4. Employés, manœuvres, ouvriers, et apprentis' },
  { ref: 'YE', label: 'TOTAL (1)' },
  { ref: 'YF', label: 'Permanents' },
  { ref: 'YG', label: 'Saisonniers' },
];

const SECTION2 = [
  { ref: 'YH', label: '1. Cadres supérieurs' },
  { ref: 'YI', label: '2. Techniciens supérieurs et cadres moyens' },
  { ref: 'YJ', label: '3. Techniciens, agents de maîtrise et ouvriers qualifiés' },
  { ref: 'YK', label: '4. Employés, manœuvres, ouvriers, et apprentis' },
  { ref: 'YL', label: 'TOTAL (2)' },
  { ref: 'YM', label: 'Permanents' },
  { ref: 'YN', label: 'Saisonniers' },
  { ref: 'YO', label: 'TOTAL (1 + 2)' },
];

const DEFAULT_COMMENTAIRE = `• Faire un commentaire si nécessaire en cas de mouvement significatif du personnel.`;

function Note27B({ entiteName, entiteNif = '', entiteId, onBack }: Note27BProps): React.JSX.Element {
  const {
    exercices, selectedExercice, setSelectedExercice,
    params, setParams, editing, setEditing, saving, saved, saveParams, annee, dateFin, duree,
  } = useNoteData({ entiteId });

  const pageRef = useRef<HTMLDivElement>(null);
  const pdf = usePDFPreview({ pageRef, fileName: `Note27B_${annee}.pdf`, editing, setEditing, orientation: 'l' });

  const [section1, setSection1] = useState<LigneEffectif[]>(SECTION1.map(s => emptyLigne(s.ref, s.label)));
  const [section2, setSection2] = useState<LigneEffectif[]>(SECTION2.map(s => emptyLigne(s.ref, s.label)));
  const [facturation, setFacturation] = useState('');
  const [commentaire, setCommentaire] = useState(DEFAULT_COMMENTAIRE);

  // Charger donnees depuis params
  useEffect(() => {
    if (!params['note27b_commentaire'] && !params['note27b_section1'] && !params['note27b_section2'] && !params['note27b_facturation']) return;
    setCommentaire(params['note27b_commentaire'] || DEFAULT_COMMENTAIRE);
    setFacturation(params['note27b_facturation'] || '');
    if (params['note27b_section1']) {
      try { const p = JSON.parse(params['note27b_section1']); if (Array.isArray(p) && p.length > 0) setSection1(p); } catch { /* */ }
    }
    if (params['note27b_section2']) {
      try { const p = JSON.parse(params['note27b_section2']); if (Array.isArray(p) && p.length > 0) setSection2(p); } catch { /* */ }
    }
  }, [params]);

  const handleSave = () => saveParams({
    ...params,
    note27b_section1: JSON.stringify(section1),
    note27b_section2: JSON.stringify(section2),
    note27b_facturation: facturation,
    note27b_commentaire: commentaire,
  });

  const fmtDateShort = (d: string): string => {
    if (!d) return '';
    return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  const updateLigne = (setter: React.Dispatch<React.SetStateAction<LigneEffectif[]>>, idx: number, field: keyof LigneEffectif, value: string) => {
    setter(prev => prev.map((l, i) => i === idx ? { ...l, [field]: value } : l));
  };

  // Note-specific styles (smaller font for landscape table)
  const th: React.CSSProperties = { ...thBase, fontSize: 9 };
  const td: React.CSSProperties = { ...tdBase, fontSize: 9, textAlign: 'center' };
  const tdL: React.CSSProperties = { ...td, textAlign: 'left', fontSize: 10 };
  const inp: React.CSSProperties = { width: 28, padding: '5px 8px', fontSize: 9, border: '1px solid #D4A843', borderRadius: 2, background: '#fffbf0', textAlign: 'center', boxSizing: 'border-box' };

  const renderInput = (value: string, onChange: (v: string) => void) => {
    if (!editing) return value;
    return <input value={value} onChange={e => onChange(e.target.value)} style={inp} />;
  };

  const FIELDS_EFF: (keyof LigneEffectif)[] = ['nat_m', 'nat_f', 'autres_m', 'autres_f', 'hors_m', 'hors_f', 'total_eff'];
  const FIELDS_MS: (keyof LigneEffectif)[] = ['ms_nat_m', 'ms_nat_f', 'ms_autres_m', 'ms_autres_f', 'ms_hors_m', 'ms_hors_f', 'ms_total'];

  const renderSection = (lignes: LigneEffectif[], setter: React.Dispatch<React.SetStateAction<LigneEffectif[]>>, title: string, showFacturation = false) => (
    <>
      {title && <tr><td colSpan={16} style={{ ...th, fontSize: 11, textAlign: 'left', padding: '6px 8px' }}>{title}</td></tr>}
      {lignes.map((l, i) => {
        const isBold = l.label.startsWith('TOTAL');
        const st = isBold ? { ...tdL, fontWeight: 700, background: '#f0f0f0' } : tdL;
        const stC = isBold ? { ...td, fontWeight: 700, background: '#f0f0f0' } : td;
        return (
          <tr key={l.ref}>
            <td style={stC}>{l.ref}</td>
            <td style={st}>{l.label}</td>
            {FIELDS_EFF.map(f => <td key={f} style={stC}>{renderInput(l[f], v => updateLigne(setter, i, f, v))}</td>)}
            {FIELDS_MS.map(f => <td key={f} style={stC}>{renderInput(l[f], v => updateLigne(setter, i, f, v))}</td>)}
            {showFacturation && i === 0 && <td rowSpan={lignes.length} style={{ ...td, verticalAlign: 'top' }}>{editing ? <input value={facturation} onChange={e => setFacturation(e.target.value)} style={{ ...inp, width: 50 }} /> : facturation}</td>}
          </tr>
        );
      })}
    </>
  );

  return (
    <div>
      <NoteToolbar
        title="Note 27B — Effectifs, masse salariale et personnel exterieur"
        exercices={exercices} selectedExercice={selectedExercice} onSelectExercice={setSelectedExercice}
        editing={editing} saving={saving} saved={saved}
        onEdit={() => setEditing(true)} onSave={handleSave} onPreview={pdf.openPreview} onBack={onBack}
      />

      {pdf.previewUrl && (
        <PDFPreviewModal previewUrl={pdf.previewUrl} title="Apercu — Note 27B" onClose={pdf.closePreview} onDownload={pdf.downloadPDF} onPrint={pdf.printPDF} />
      )}


      {/* Bulle d'information */}
      <div style={{ margin: '12px 20px', padding: '12px 16px', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 8, fontSize: 12, color: '#1e40af', lineHeight: 1.6 }}>
        <div style={{ fontWeight: 700, marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
          <LuInfo size={14} /> Note d'information — Note 27B
        </div>
        <ul style={{ margin: 0, paddingLeft: 18 }}>
          <li><strong>Effectif moyen :</strong> Calcule au prorata temporis sur l'exercice, par categorie (cadres, employes, ouvriers).</li>
          <li><strong>Masse salariale brute :</strong> Salaires bruts + primes, avant cotisations sociales.</li>
          <li><strong>Personnel exterieur :</strong> Interimaires et mises a disposition — comptabilises en services exterieurs (compte 637), distingues ici.</li>
          <li><strong>Ventilation :</strong> Par qualification, par sexe, par nationalite si pertinent.</li>
        </ul>
      </div>

      <div ref={pageRef} style={{ width: '297mm', minHeight: '210mm', background: '#fff', margin: '0 auto 20px', padding: '5mm 6mm', boxShadow: '0 2px 12px rgba(0,0,0,0.1)', boxSizing: 'border-box', fontFamily: "'Inter', 'Segoe UI', Arial, sans-serif", fontSize: 10, color: '#1a1a1a' }}>
        <div className="etat-header-officiel"><div className="etat-header-grid"><div className="etat-header-row"><span className="etat-header-label">Designation entite :</span><span className="etat-header-value">{entiteName || ''}</span><span className="etat-header-label">Exercice clos le :</span><span className="etat-header-value-right">{fmtDateShort(dateFin)}</span></div><div className="etat-header-row"><span className="etat-header-label">Numero d'identification :</span><span className="etat-header-value">{entiteNif || ''}</span><span className="etat-header-label">Duree (en mois) :</span><span className="etat-header-value-right">{duree}</span></div></div></div>
        <h3 style={{ textAlign: 'center', fontSize: 14, fontWeight: 700, margin: '30px 0 20px', textDecoration: 'underline' }}>
          NOTE 27B — EFFECTIFS, MASSE SALARIALE ET PERSONNEL EXTERIEUR
        </h3>

        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 0 }}>
          <thead>
            <tr>
              <th style={th} rowSpan={3}></th>
              <th style={{ ...th, width: '22%' }} rowSpan={3}>EFFECTIF ET MASSE SALARIALE<br /><br />QUALIFICATIONS</th>
              <th style={th} colSpan={7}>EFFECTIFS</th>
              <th style={th} colSpan={7}>MASSE SALARIALE</th>
            </tr>
            <tr>
              <th style={th} colSpan={2}>Nationaux</th>
              <th style={th} colSpan={2}>Autres Etats de l'OHADA</th>
              <th style={th} colSpan={2}>Hors OHADA</th>
              <th style={th} rowSpan={2}>TOTAL</th>
              <th style={th} colSpan={2}>Nationaux</th>
              <th style={th} colSpan={2}>Autres Etats de l'OHADA</th>
              <th style={th} colSpan={2}>Hors OHADA</th>
              <th style={th} rowSpan={2}>TOTAL</th>
            </tr>
            <tr>
              <th style={th}>M</th><th style={th}>F</th>
              <th style={th}>M</th><th style={th}>F</th>
              <th style={th}>M</th><th style={th}>F</th>
              <th style={th}>M</th><th style={th}>F</th>
              <th style={th}>M</th><th style={th}>F</th>
              <th style={th}>M</th><th style={th}>F</th>
            </tr>
          </thead>
          <tbody>
            {renderSection(section1, setSection1, '')}
            {renderSection(section2, setSection2, '2. Personnel extérieur', true)}
          </tbody>
        </table>

        <p style={{ fontSize: 9, margin: '4px 0', color: '#666' }}>M : Masculin &nbsp;&nbsp; F : Féminin</p>

        <div style={{ border: '0.5px solid #000', padding: '8px 10px', marginTop: 8 }}>
          <p style={{ fontSize: 11, fontWeight: 700, marginBottom: 4, marginTop: 0 }}>Commentaire :</p>
          <EditableComment value={commentaire} onChange={setCommentaire} editing={editing} minHeight={30} />
        </div>
      </div>
    </div>
  );
}

export default Note27B;
