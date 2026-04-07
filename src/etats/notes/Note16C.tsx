import React, { useState, useRef, useEffect } from 'react';
import { LuPlus, LuTrash2 } from 'react-icons/lu';
import '../BilanSYCEBNL.css';
import '../FicheIdentification.css';
import type { EtatBaseProps } from '../../types';
import { useNoteData } from './useNoteData';
import { usePDFPreview } from './usePDFPreview';
import NoteToolbar from './NoteToolbar';
import PDFPreviewModal from './PDFPreviewModal';
import EditableComment from './EditableComment';
import { thStyle, tdStyle, tdRight, tdBold, inputSt } from './noteStyles';

interface Note16CProps extends EtatBaseProps {
  onGoToParametres?: () => void;
}

interface LigneEventuel {
  libelle: string;
  anneeN: string;
  anneeN1: string;
}

const emptyLigne = (): LigneEventuel => ({ libelle: '', anneeN: '', anneeN1: '' });

const DEFAULT_COMMENTAIRE = `• Decrire les principales caracteristiques des actifs / passifs eventuels, l'horizon de temps auquel les encaissements / decaissements sont attendus et les eventuels remboursements a percevoir.`;

function Note16C({ entiteName, entiteNif = '', entiteId, offre, onBack }: Note16CProps): React.JSX.Element {
  const {
    exercices, selectedExercice, setSelectedExercice,
    params, setParams, editing, setEditing, saving, saved, saveParams, annee, dateFin, duree,
  } = useNoteData({ entiteId });

  const pageRef = useRef<HTMLDivElement>(null);
  const pdf = usePDFPreview({ pageRef, fileName: `Note16C_${annee}.pdf`, editing, setEditing });

  const [actifsLitiges, setActifsLitiges] = useState<LigneEventuel[]>([emptyLigne(), emptyLigne(), emptyLigne()]);
  const [passifsLitiges, setPassifsLitiges] = useState<LigneEventuel[]>([emptyLigne(), emptyLigne(), emptyLigne()]);
  const [commentaire, setCommentaire] = useState(DEFAULT_COMMENTAIRE);

  // Charger data depuis params
  useEffect(() => {
    if (!params['note16c_commentaire'] && !params['note16c_actifs'] && !params['note16c_passifs']) return;
    setCommentaire(params['note16c_commentaire'] || DEFAULT_COMMENTAIRE);
    if (params['note16c_actifs']) { try { const p = JSON.parse(params['note16c_actifs']); if (Array.isArray(p) && p.length > 0) setActifsLitiges(p); } catch { /* */ } }
    if (params['note16c_passifs']) { try { const p = JSON.parse(params['note16c_passifs']); if (Array.isArray(p) && p.length > 0) setPassifsLitiges(p); } catch { /* */ } }
  }, [params]);

  const handleSave = () => saveParams({
    ...params,
    note16c_actifs: JSON.stringify(actifsLitiges),
    note16c_passifs: JSON.stringify(passifsLitiges),
    note16c_commentaire: commentaire,
  });

  const fmtDateShort = (d: string): string => {
    if (!d) return '';
    return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  const updateLigne = (setter: React.Dispatch<React.SetStateAction<LigneEventuel[]>>, idx: number, field: keyof LigneEventuel, value: string) => {
    setter(prev => prev.map((l, i) => i === idx ? { ...l, [field]: value } : l));
  };

  const inputLeft: React.CSSProperties = { ...inputSt, textAlign: 'left' };

  const renderInput = (value: string, onChange: (v: string) => void, style = inputSt) => {
    if (!editing) return value;
    return <input value={value} onChange={e => onChange(e.target.value)} style={style} />;
  };

  const renderSection = (title: string, subTitle: string, lignes: LigneEventuel[], setter: React.Dispatch<React.SetStateAction<LigneEventuel[]>>) => (
    <>
      <tr>
        <td style={tdBold}>{title}</td>
        <td style={tdBold}></td>
        <td style={tdBold}></td>
      </tr>
      <tr>
        <td style={{ ...tdStyle, fontWeight: 600 }}>{subTitle}</td>
        <td style={tdRight}></td>
        <td style={tdRight}></td>
      </tr>
      {lignes.map((l, i) => (
        <tr key={i}>
          <td style={tdStyle}>
            {editing ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <input value={l.libelle} onChange={e => updateLigne(setter, i, 'libelle', e.target.value)} style={inputLeft} placeholder="................" />
                <button onClick={() => setter(prev => prev.filter((_, j) => j !== i))} style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer', padding: 2, flexShrink: 0 }}><LuTrash2 size={12} /></button>
              </div>
            ) : l.libelle || '................'}
          </td>
          <td style={tdRight}>{renderInput(l.anneeN, v => updateLigne(setter, i, 'anneeN', v))}</td>
          <td style={tdRight}>{renderInput(l.anneeN1, v => updateLigne(setter, i, 'anneeN1', v))}</td>
        </tr>
      ))}
      {editing && (
        <tr className="no-print">
          <td colSpan={3} style={{ border: 'none', padding: '2px 0' }}>
            <button onClick={() => setter(prev => [...prev, emptyLigne()])} style={{ background: 'none', border: 'none', color: '#D4A843', cursor: 'pointer', fontSize: 11 }}><LuPlus size={12} /> Ajouter une ligne</button>
          </td>
        </tr>
      )}
    </>
  );

  return (
    <div>
      <NoteToolbar
        title="Note 16C — Actifs et passifs eventuels"
        exercices={exercices} selectedExercice={selectedExercice} onSelectExercice={setSelectedExercice}
        editing={editing} saving={saving} saved={saved}
        onEdit={() => setEditing(true)} onSave={handleSave} onPreview={pdf.openPreview} onBack={onBack}
      />

      {pdf.previewUrl && (
        <PDFPreviewModal previewUrl={pdf.previewUrl} title="Apercu — Note 16C" onClose={pdf.closePreview} onDownload={pdf.downloadPDF} onPrint={pdf.printPDF} />
      )}

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
          NOTE 16C — ACTIFS ET PASSIFS EVENTUELS
        </h3>

        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 0 }}>
          <thead>
            <tr>
              <th style={{ ...thStyle, width: '60%' }}>Libelles</th>
              <th style={thStyle}>Annee N</th>
              <th style={thStyle}>Annee N-1</th>
            </tr>
          </thead>
          <tbody>
            {renderSection('Actif eventuel', 'Litiges', actifsLitiges, setActifsLitiges)}
            {renderSection('Passif eventuel', 'Litiges', passifsLitiges, setPassifsLitiges)}
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

export default Note16C;
