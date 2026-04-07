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
import { thStyle, tdStyle, tdRight, tdBold, tdBoldRight, inputSt } from './noteStyles';

interface Note13Props extends EtatBaseProps {
  onGoToParametres?: () => void;
}

interface LigneActionnaire {
  nom: string;
  nationalite: string;
  nature: string;
  nombre: string;
  montantTotal: string;
  cessions: string;
}

const emptyLigne = (): LigneActionnaire => ({ nom: '', nationalite: '', nature: '', nombre: '', montantTotal: '', cessions: '' });

const DEFAULT_COMMENTAIRE = `• Indiquer si possible le montant du capital à la constitution.\n• Indiquer si possible les dates des AGE et le montant du capital augmenté en cas d'augmentation de capital.\n• Indiquer si possible les dates des AGE et le montant du capital diminué en cas de réduction de capital.\n• Indiquer les avantages accordés aux actions de préférence.\n• Apporteurs, capital non appelé : indiquer le délai restant pour appeler le capital.`;

function Note13({ entiteName, entiteNif = '', entiteId, offre, onBack }: Note13Props): React.JSX.Element {
  const {
    exercices, selectedExercice, setSelectedExercice,
    params, setParams, editing, setEditing, saving, saved, saveParams, annee, dateFin, duree,
  } = useNoteData({ entiteId });

  const pageRef = useRef<HTMLDivElement>(null);
  const pdf = usePDFPreview({ pageRef, fileName: `Note13_${annee}.pdf`, editing, setEditing });

  const [valeurNominale, setValeurNominale] = useState('');
  const [lignes, setLignes] = useState<LigneActionnaire[]>([emptyLigne(), emptyLigne(), emptyLigne(), emptyLigne(), emptyLigne(), emptyLigne(), emptyLigne(), emptyLigne()]);
  const [capitalNonAppeleNombre, setCapitalNonAppeleNombre] = useState('');
  const [capitalNonAppeleMontant, setCapitalNonAppeleMontant] = useState('');
  const [commentaire, setCommentaire] = useState(DEFAULT_COMMENTAIRE);

  // Charger donnees Note-specifiques depuis params
  useEffect(() => {
    if (!params['note13_commentaire'] && !params['note13_lignes'] && !params['note13_valeur_nominale']) return;
    setValeurNominale(params['note13_valeur_nominale'] || '');
    setCapitalNonAppeleNombre(params['note13_capital_non_appele_nombre'] || '');
    setCapitalNonAppeleMontant(params['note13_capital_non_appele_montant'] || '');
    setCommentaire(params['note13_commentaire'] || DEFAULT_COMMENTAIRE);
    if (params['note13_lignes']) {
      try { const p = JSON.parse(params['note13_lignes']); if (Array.isArray(p) && p.length > 0) setLignes(p); } catch { /* */ }
    }
  }, [params]);

  const handleSave = () => saveParams({
    ...params,
    note13_valeur_nominale: valeurNominale,
    note13_lignes: JSON.stringify(lignes),
    note13_capital_non_appele_nombre: capitalNonAppeleNombre,
    note13_capital_non_appele_montant: capitalNonAppeleMontant,
    note13_commentaire: commentaire,
  });

  const fmtDateShort = (d: string): string => {
    if (!d) return '';
    return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  const parseN = (v: string): number => { const n = parseFloat(v.replace(/\s/g, '').replace(',', '.')); return isNaN(n) ? 0 : n; };
  const fmtM = (v: number): string => v === 0 ? '0' : Math.round(v).toLocaleString('fr-FR');

  // Totaux
  const vn = parseN(valeurNominale);
  const totalNombre = lignes.reduce((s, l) => s + parseN(l.nombre), 0);
  const totalMontant = totalNombre * vn - parseN(capitalNonAppeleMontant);
  const totalCessions = lignes.reduce((s, l) => s + parseN(l.cessions), 0);

  const updateLigne = (idx: number, field: keyof LigneActionnaire, value: string) => {
    setLignes(prev => prev.map((l, i) => i === idx ? { ...l, [field]: value } : l));
  };

  const inputLeft: React.CSSProperties = { ...inputSt, textAlign: 'left' };

  const renderInput = (value: string, onChange: (v: string) => void, style = inputSt) => {
    if (!editing) return value;
    return <input value={value} onChange={e => onChange(e.target.value)} style={style} />;
  };

  return (
    <div>
      <NoteToolbar
        title="Note 13 — Capital"
        exercices={exercices} selectedExercice={selectedExercice} onSelectExercice={setSelectedExercice}
        editing={editing} saving={saving} saved={saved}
        onEdit={() => setEditing(true)} onSave={handleSave} onPreview={pdf.openPreview} onBack={onBack}
      />

      {pdf.previewUrl && (
        <PDFPreviewModal previewUrl={pdf.previewUrl} title="Apercu — Note 13" onClose={pdf.closePreview} onDownload={pdf.downloadPDF} onPrint={pdf.printPDF} />
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
          NOTE 13 — CAPITAL
        </h3>

        {/* Valeur nominale */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 12, marginBottom: 8 }}>
          <span style={{ fontSize: 12, fontWeight: 700 }}>Valeur nominale des actions ou des parts :</span>
          {renderInput(valeurNominale, setValeurNominale, { ...inputSt, width: 150 })}
        </div>

        {/* Tableau */}
        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 0 }}>
          <thead>
            <tr>
              <th style={{ ...thStyle, width: '28%' }}>Nom et prenoms</th>
              <th style={thStyle}>Nationalite</th>
              <th style={thStyle}>Nature des actions ou parts (Ordinaires ou preferences)</th>
              <th style={thStyle}>Nombre</th>
              <th style={{ ...thStyle, width: '16%' }}>Montant total</th>
              <th style={{ ...thStyle, width: '11%' }}>Cessions enregistrements au cours d'exercice</th>
            </tr>
          </thead>
          <tbody>
            {lignes.map((l, i) => (
              <tr key={i}>
                <td style={tdStyle}>
                  {editing ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <input value={l.nom} onChange={e => updateLigne(i, 'nom', e.target.value)} style={inputLeft} />
                      <button onClick={() => setLignes(prev => prev.filter((_, j) => j !== i))} style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer', padding: 2, flexShrink: 0 }}><LuTrash2 size={12} /></button>
                    </div>
                  ) : l.nom}
                </td>
                <td style={tdStyle}>{renderInput(l.nationalite, v => updateLigne(i, 'nationalite', v), inputLeft)}</td>
                <td style={{ ...tdStyle, textAlign: 'center' }}>{renderInput(l.nature, v => updateLigne(i, 'nature', v), { ...inputLeft, textAlign: 'center' })}</td>
                <td style={tdRight}>{renderInput(l.nombre, v => updateLigne(i, 'nombre', v))}</td>
                <td style={{ ...tdRight, background: '#fafafa' }}>{(() => { const mt = parseN(l.nombre) * parseN(valeurNominale); return mt !== 0 ? fmtM(mt) : ''; })()}</td>
                <td style={tdRight}>{renderInput(l.cessions, v => updateLigne(i, 'cessions', v))}</td>
              </tr>
            ))}

            {editing && (
              <tr className="no-print">
                <td colSpan={6} style={{ border: 'none', padding: '4px 0' }}>
                  <button onClick={() => setLignes(prev => [...prev, emptyLigne()])} style={{ background: '#D4A843', color: '#fff', border: 'none', borderRadius: 4, padding: '4px 12px', fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
                    <LuPlus size={14} /> Ajouter un actionnaire
                  </button>
                </td>
              </tr>
            )}

            {/* Capital non appele */}
            <tr>
              <td style={tdBold} colSpan={3}>Apporteurs, capital non appele</td>
              <td style={tdRight}></td>
              <td style={tdRight}>{renderInput(capitalNonAppeleMontant, setCapitalNonAppeleMontant)}</td>
              <td style={tdRight}></td>
            </tr>

            {/* Total */}
            <tr>
              <td style={{ ...tdBold, background: '#f0f0f0' }} colSpan={3}>TOTAL</td>
              <td style={{ ...tdBoldRight, background: '#f0f0f0' }}>{fmtM(totalNombre)}</td>
              <td style={{ ...tdBoldRight, background: '#f0f0f0' }}>{fmtM(totalMontant)}</td>
              <td style={{ ...tdBoldRight, background: '#f0f0f0' }}>{fmtM(totalCessions)}</td>
            </tr>
          </tbody>
        </table>

        {/* Commentaire */}
        <div style={{ border: '0.5px solid #000', borderTop: 'none', padding: '10px 12px' }}>
          <p style={{ fontSize: 12, fontWeight: 700, marginBottom: 6, marginTop: 0 }}>Commentaire :</p>
          <EditableComment value={commentaire} onChange={setCommentaire} editing={editing} minHeight={70} />
        </div>
      </div>
    </div>
  );
}

export default Note13;
