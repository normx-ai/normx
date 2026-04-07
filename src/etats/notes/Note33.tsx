import React, { useState, useRef, useEffect } from 'react';
import { LuPlus, LuTrash2 } from 'react-icons/lu';
import '../BilanSYCEBNL.css';
import '../FicheIdentification.css';
import type { EtatBaseProps } from '../../types';
import { useNoteData } from './useNoteData';
import { usePDFPreview } from './usePDFPreview';
import NoteToolbar from './NoteToolbar';
import PDFPreviewModal from './PDFPreviewModal';
import { thStyle, tdStyle, tdRight, tdBold, tdBoldRight, inputSt } from './noteStyles';

interface Note33Props extends EtatBaseProps { onGoToParametres?: () => void; }

interface LigneAchat {
  designation: string; unite: string;
  etat_qte: string; etat_val: string;
  imp_dans_qte: string; imp_dans_val: string;
  imp_hors_qte: string; imp_hors_val: string;
  variation_stocks: string;
}

interface LigneNonVentile { etat_val: string; imp_dans_val: string; imp_hors_val: string; variation_stocks: string; }

const emptyLigne = (): LigneAchat => ({ designation: '', unite: '', etat_qte: '', etat_val: '', imp_dans_qte: '', imp_dans_val: '', imp_hors_qte: '', imp_hors_val: '', variation_stocks: '' });
const emptyNV = (): LigneNonVentile => ({ etat_val: '', imp_dans_val: '', imp_hors_val: '', variation_stocks: '' });

function Note33({ entiteName, entiteNif = '', entiteId, onBack }: Note33Props): React.JSX.Element {
  const {
    exercices, selectedExercice, setSelectedExercice,
    params, setParams, editing, setEditing, saving, saved, saveParams, annee, dateFin, duree,
  } = useNoteData({ entiteId });

  const pageRef = useRef<HTMLDivElement>(null);
  const pdf = usePDFPreview({ pageRef, fileName: `Note33_${annee}.pdf`, editing, setEditing, orientation: 'l' });

  const [lignes, setLignes] = useState<LigneAchat[]>([emptyLigne(), emptyLigne(), emptyLigne(), emptyLigne(), emptyLigne(), emptyLigne(), emptyLigne(), emptyLigne(), emptyLigne(), emptyLigne()]);
  const [nonVentile, setNonVentile] = useState<LigneNonVentile>(emptyNV());

  // Charger data depuis params
  useEffect(() => {
    if (!params['note33_lignes'] && !params['note33_nonventile']) return;
    if (params['note33_lignes']) {
      try { const p = JSON.parse(params['note33_lignes']); if (Array.isArray(p) && p.length > 0) setLignes(p); } catch { /* */ }
    }
    if (params['note33_nonventile']) {
      try { setNonVentile(JSON.parse(params['note33_nonventile'])); } catch { /* */ }
    }
  }, [params]);

  const handleSave = () => saveParams({
    ...params,
    note33_lignes: JSON.stringify(lignes),
    note33_nonventile: JSON.stringify(nonVentile),
  });

  const fmtDateShort = (d: string): string => {
    if (!d) return '';
    return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };
  const parseN = (v: string): number => { const n = parseFloat(v.replace(/\s/g, '').replace(',', '.')); return isNaN(n) ? 0 : n; };
  const fmtM = (v: number): string => v === 0 ? '0' : Math.round(v).toLocaleString('fr-FR');

  const updateLigne = (idx: number, field: keyof LigneAchat, value: string) => { setLignes(prev => prev.map((l, i) => i === idx ? { ...l, [field]: value } : l)); };

  const valFields: (keyof LigneAchat)[] = ['etat_val', 'imp_dans_val', 'imp_hors_val', 'variation_stocks'];
  const totals: Record<string, number> = {};
  for (const f of valFields) { totals[f] = lignes.reduce((s, l) => s + parseN(l[f]), 0) + parseN(nonVentile[f as keyof LigneNonVentile] || '0'); }

  const th: React.CSSProperties = { ...thStyle, fontSize: 9 };
  const td: React.CSSProperties = { ...tdStyle, fontSize: 10 };
  const tdR: React.CSSProperties = { ...tdRight, fontSize: 10 };
  const tdB: React.CSSProperties = { ...tdBold, background: '#f0f0f0', fontSize: 10 };
  const tdBR: React.CSSProperties = { ...tdBoldRight, background: '#f0f0f0', fontSize: 10 };
  const inp: React.CSSProperties = { ...inputSt, fontSize: 10 };
  const inpL: React.CSSProperties = { ...inp, textAlign: 'left' };

  const renderInput = (value: string, onChange: (v: string) => void, style = inp) => {
    if (!editing) return value;
    return <input value={value} onChange={e => onChange(e.target.value)} style={style} />;
  };

  return (
    <div>
      <NoteToolbar
        title="Note 33 — Achats destinés à la production"
        exercices={exercices} selectedExercice={selectedExercice} onSelectExercice={setSelectedExercice}
        editing={editing} saving={saving} saved={saved}
        onEdit={() => setEditing(true)} onSave={handleSave} onPreview={pdf.openPreview} onBack={onBack}
      />

      {pdf.previewUrl && (
        <PDFPreviewModal previewUrl={pdf.previewUrl} title="Apercu — Note 33" onClose={pdf.closePreview} onDownload={pdf.downloadPDF} onPrint={pdf.printPDF} />
      )}

      <div ref={pageRef} style={{ width: '297mm', minHeight: '210mm', background: '#fff', margin: '0 auto 20px', padding: '5mm 6mm', boxShadow: '0 2px 12px rgba(0,0,0,0.1)', boxSizing: 'border-box', fontFamily: "'Inter', 'Segoe UI', Arial, sans-serif", fontSize: 10, color: '#1a1a1a' }}>
        <div className="etat-header-officiel"><div className="etat-header-grid"><div className="etat-header-row"><span className="etat-header-label">Designation entite :</span><span className="etat-header-value">{entiteName || ''}</span><span className="etat-header-label">Exercice clos le :</span><span className="etat-header-value-right">{fmtDateShort(dateFin)}</span></div><div className="etat-header-row"><span className="etat-header-label">Numero d'identification :</span><span className="etat-header-value">{entiteNif || ''}</span><span className="etat-header-label">Duree (en mois) :</span><span className="etat-header-value-right">{duree}</span></div></div></div>
        <h3 style={{ textAlign: 'center', fontSize: 14, fontWeight: 700, margin: '30px 0 20px', textDecoration: 'underline' }}>
          NOTE 33 — ACHATS DESTINES A LA PRODUCTION
        </h3>

        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={{ ...th, width: '18%' }} rowSpan={4}>Désignation des matières et produits</th>
              <th style={{ ...th, width: '6%' }} rowSpan={4}>Unité de quantité choisie</th>
              <th style={th} colSpan={6}>ACHATS EFFECTUES AU COURS DE L'EXERCICE</th>
              <th style={{ ...th, width: '8%' }} rowSpan={4}>Variation des stocks (en valeur)</th>
            </tr>
            <tr>
              <th style={th} colSpan={2} rowSpan={2}>Produits de l'Etat</th>
              <th style={th} colSpan={4}>Produits importés</th>
            </tr>
            <tr>
              <th style={th} colSpan={2}>achetés dans l'Etat</th>
              <th style={th} colSpan={2}>achetés hors de l'Etat</th>
            </tr>
            <tr>
              <th style={th}>Quantité</th><th style={th}>Valeur</th>
              <th style={th}>Quantité</th><th style={th}>Valeur</th>
              <th style={th}>Quantité</th><th style={th}>Valeur</th>
            </tr>
          </thead>
          <tbody>
            {lignes.map((l, i) => (
              <tr key={i}>
                <td style={td}>
                  {editing ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <input value={l.designation} onChange={e => updateLigne(i, 'designation', e.target.value)} style={inpL} />
                      <button onClick={() => setLignes(prev => prev.filter((_, j) => j !== i))} style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer', padding: 1, flexShrink: 0 }}><LuTrash2 size={10} /></button>
                    </div>
                  ) : l.designation}
                </td>
                <td style={{ ...td, textAlign: 'center' }}>{renderInput(l.unite, v => updateLigne(i, 'unite', v), { ...inp, textAlign: 'center', width: 40 })}</td>
                <td style={tdR}>{renderInput(l.etat_qte, v => updateLigne(i, 'etat_qte', v))}</td>
                <td style={tdR}>{renderInput(l.etat_val, v => updateLigne(i, 'etat_val', v))}</td>
                <td style={tdR}>{renderInput(l.imp_dans_qte, v => updateLigne(i, 'imp_dans_qte', v))}</td>
                <td style={tdR}>{renderInput(l.imp_dans_val, v => updateLigne(i, 'imp_dans_val', v))}</td>
                <td style={tdR}>{renderInput(l.imp_hors_qte, v => updateLigne(i, 'imp_hors_qte', v))}</td>
                <td style={tdR}>{renderInput(l.imp_hors_val, v => updateLigne(i, 'imp_hors_val', v))}</td>
                <td style={tdR}>{renderInput(l.variation_stocks, v => updateLigne(i, 'variation_stocks', v))}</td>
              </tr>
            ))}
            {editing && (
              <tr className="no-print">
                <td colSpan={9} style={{ border: 'none', padding: '4px 0' }}>
                  <button onClick={() => setLignes(prev => [...prev, emptyLigne()])} style={{ background: '#D4A843', color: '#fff', border: 'none', borderRadius: 4, padding: '3px 10px', fontSize: 11, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}><LuPlus size={12} /> Ajouter une ligne</button>
                </td>
              </tr>
            )}
            {/* NON VENTILES */}
            <tr>
              <td style={tdB} colSpan={2}>NON VENTILES</td>
              <td style={tdBR}></td>
              <td style={tdR}>{renderInput(nonVentile.etat_val, v => setNonVentile(p => ({ ...p, etat_val: v })))}</td>
              <td style={tdBR}></td>
              <td style={tdR}>{renderInput(nonVentile.imp_dans_val, v => setNonVentile(p => ({ ...p, imp_dans_val: v })))}</td>
              <td style={tdBR}></td>
              <td style={tdR}>{renderInput(nonVentile.imp_hors_val, v => setNonVentile(p => ({ ...p, imp_hors_val: v })))}</td>
              <td style={tdR}>{renderInput(nonVentile.variation_stocks, v => setNonVentile(p => ({ ...p, variation_stocks: v })))}</td>
            </tr>
            {/* TOTAL */}
            <tr>
              <td style={{ ...tdB, background: '#e8e8e8' }} colSpan={2}>TOTAL</td>
              <td style={{ ...tdBR, background: '#e8e8e8' }}></td>
              <td style={{ ...tdBR, background: '#e8e8e8' }}>{fmtM(totals.etat_val)}</td>
              <td style={{ ...tdBR, background: '#e8e8e8' }}></td>
              <td style={{ ...tdBR, background: '#e8e8e8' }}>{fmtM(totals.imp_dans_val)}</td>
              <td style={{ ...tdBR, background: '#e8e8e8' }}></td>
              <td style={{ ...tdBR, background: '#e8e8e8' }}>{fmtM(totals.imp_hors_val)}</td>
              <td style={{ ...tdBR, background: '#e8e8e8' }}>{fmtM(totals.variation_stocks)}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default Note33;
