import React, { useState, useRef, useEffect } from 'react';
import { LuPlus, LuTrash2 , LuInfo } from 'react-icons/lu';
import '../BilanSYCEBNL.css';
import '../FicheIdentification.css';
import type { EtatBaseProps } from '../../types';
import { useNoteData } from './useNoteData';
import { usePDFPreview } from './usePDFPreview';
import NoteToolbar from './NoteToolbar';
import PDFPreviewModal from './PDFPreviewModal';
import { thStyle, tdStyle, tdRight, tdBold, tdBoldRight, inputSt } from './noteStyles';

interface Note32Props extends EtatBaseProps { onGoToParametres?: () => void; }

interface LigneProd {
  designation: string; unite: string;
  pays_qte: string; pays_val: string;
  autres_qte: string; autres_val: string;
  hors_qte: string; hors_val: string;
  immo_qte: string; immo_val: string;
  stock_ouv_qte: string; stock_ouv_val: string;
  stock_clo_qte: string; stock_clo_val: string;
}

interface LigneNonVentile { pays_val: string; autres_val: string; hors_val: string; immo_val: string; stock_ouv_val: string; stock_clo_val: string; }

const emptyLigne = (): LigneProd => ({ designation: '', unite: '', pays_qte: '', pays_val: '', autres_qte: '', autres_val: '', hors_qte: '', hors_val: '', immo_qte: '', immo_val: '', stock_ouv_qte: '', stock_ouv_val: '', stock_clo_qte: '', stock_clo_val: '' });
const emptyNonVentile = (): LigneNonVentile => ({ pays_val: '', autres_val: '', hors_val: '', immo_val: '', stock_ouv_val: '', stock_clo_val: '' });

function Note32({ entiteName, entiteNif = '', entiteId, onBack }: Note32Props): React.JSX.Element {
  const {
    exercices, selectedExercice, setSelectedExercice,
    params, setParams, editing, setEditing, saving, saved, saveParams, annee, dateFin, duree,
  } = useNoteData({ entiteId });

  const pageRef = useRef<HTMLDivElement>(null);
  const pdf = usePDFPreview({ pageRef, fileName: `Note32_${annee}.pdf`, editing, setEditing, orientation: 'l' });

  const [lignes, setLignes] = useState<LigneProd[]>([emptyLigne(), emptyLigne(), emptyLigne(), emptyLigne(), emptyLigne(), emptyLigne(), emptyLigne(), emptyLigne(), emptyLigne(), emptyLigne()]);
  const [nonVentile, setNonVentile] = useState<LigneNonVentile>(emptyNonVentile());

  // Charger data depuis params
  useEffect(() => {
    if (!params['note32_lignes'] && !params['note32_nonventile']) return;
    if (params['note32_lignes']) {
      try { const p = JSON.parse(params['note32_lignes']); if (Array.isArray(p) && p.length > 0) setLignes(p); } catch { /* */ }
    }
    if (params['note32_nonventile']) {
      try { setNonVentile(JSON.parse(params['note32_nonventile'])); } catch { /* */ }
    }
  }, [params]);

  const handleSave = () => saveParams({
    ...params,
    note32_lignes: JSON.stringify(lignes),
    note32_nonventile: JSON.stringify(nonVentile),
  });

  const fmtDateShort = (d: string): string => {
    if (!d) return '';
    return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };
  const parseN = (v: string): number => { const n = parseFloat(v.replace(/\s/g, '').replace(',', '.')); return isNaN(n) ? 0 : n; };
  const fmtM = (v: number): string => v === 0 ? '0' : Math.round(v).toLocaleString('fr-FR');

  const updateLigne = (idx: number, field: keyof LigneProd, value: string) => { setLignes(prev => prev.map((l, i) => i === idx ? { ...l, [field]: value } : l)); };

  // Totaux
  const valFields: (keyof LigneProd)[] = ['pays_val', 'autres_val', 'hors_val', 'immo_val', 'stock_ouv_val', 'stock_clo_val'];
  const totals: Record<string, number> = {};
  for (const f of valFields) { totals[f] = lignes.reduce((s, l) => s + parseN(l[f]), 0) + parseN(nonVentile[f.replace('pays_val', 'pays_val').replace('autres_val', 'autres_val') as keyof LigneNonVentile] || '0'); }

  const th: React.CSSProperties = { ...thStyle, fontSize: 8 };
  const td: React.CSSProperties = { ...tdStyle, fontSize: 9 };
  const tdR: React.CSSProperties = { ...tdRight, fontSize: 9 };
  const tdB: React.CSSProperties = { ...tdBold, background: '#f0f0f0', fontSize: 9 };
  const tdBR: React.CSSProperties = { ...tdBoldRight, background: '#f0f0f0', fontSize: 9 };
  const inp: React.CSSProperties = { ...inputSt, fontSize: 9 };
  const inpL: React.CSSProperties = { ...inp, textAlign: 'left' };

  const renderInput = (value: string, onChange: (v: string) => void, style = inp) => {
    if (!editing) return value;
    return <input value={value} onChange={e => onChange(e.target.value)} style={style} />;
  };

  return (
    <div>
      <NoteToolbar
        title="Note 32 — Production de l'exercice"
        exercices={exercices} selectedExercice={selectedExercice} onSelectExercice={setSelectedExercice}
        editing={editing} saving={saving} saved={saved}
        onEdit={() => setEditing(true)} onSave={handleSave} onPreview={pdf.openPreview} onBack={onBack}
      />

      {pdf.previewUrl && (
        <PDFPreviewModal previewUrl={pdf.previewUrl} title="Apercu — Note 32" onClose={pdf.closePreview} onDownload={pdf.downloadPDF} onPrint={pdf.printPDF} />
      )}


      {/* Bulle d'information */}
      <div style={{ margin: '12px 20px', padding: '12px 16px', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 8, fontSize: 12, color: '#1e40af', lineHeight: 1.6 }}>
        <div style={{ fontWeight: 700, marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
          <LuInfo size={14} /> Note d'information — Note 32
        </div>
        <ul style={{ margin: 0, paddingLeft: 18 }}>
          <li><strong>Production vendue :</strong> Chiffre d'affaires sur produits fabriques (compte 702).</li>
          <li><strong>Production stockee :</strong> Variation des stocks de produits finis et en cours (compte 73).</li>
          <li><strong>Production immobilisee :</strong> Travaux faits par l'entite pour elle-meme (compte 72).</li>
          <li>Indicateur cle pour mesurer l'activite industrielle, distinct du chiffre d'affaires global.</li>
        </ul>
      </div>

      <div ref={pageRef} style={{ width: '297mm', minHeight: '210mm', background: '#fff', margin: '0 auto 20px', padding: '5mm 6mm', boxShadow: '0 2px 12px rgba(0,0,0,0.1)', boxSizing: 'border-box', fontFamily: "'Inter', 'Segoe UI', Arial, sans-serif", fontSize: 9, color: '#1a1a1a' }}>
        <div className="etat-header-officiel"><div className="etat-header-grid"><div className="etat-header-row"><span className="etat-header-label">Designation entite :</span><span className="etat-header-value">{entiteName || ''}</span><span className="etat-header-label">Exercice clos le :</span><span className="etat-header-value-right">{fmtDateShort(dateFin)}</span></div><div className="etat-header-row"><span className="etat-header-label">Numero d'identification :</span><span className="etat-header-value">{entiteNif || ''}</span><span className="etat-header-label">Duree (en mois) :</span><span className="etat-header-value-right">{duree}</span></div></div></div>
        <h3 style={{ textAlign: 'center', fontSize: 14, fontWeight: 700, margin: '30px 0 20px', textDecoration: 'underline' }}>
          NOTE 32 — PRODUCTION DE L'EXERCICE
        </h3>

        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={{ ...th, width: '12%' }} rowSpan={2}>Désignation du produit</th>
              <th style={{ ...th, width: '5%' }} rowSpan={2}>Unité de quantité choisie</th>
              <th style={th} colSpan={2}>Production vendue dans le pays</th>
              <th style={th} colSpan={2}>Production vendue dans les autres pays de l'OHADA</th>
              <th style={th} colSpan={2}>Production vendue hors OHADA</th>
              <th style={th} colSpan={2}>Production immobilisée</th>
              <th style={th} colSpan={2}>Stock ouverture de l'exercice</th>
              <th style={th} colSpan={2}>Stock clôture de l'exercice</th>
            </tr>
            <tr>
              <th style={th}>Quantité</th><th style={th}>Valeur</th>
              <th style={th}>Quantité</th><th style={th}>Valeur</th>
              <th style={th}>Quantité</th><th style={th}>Valeur</th>
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
                <td style={tdR}>{renderInput(l.pays_qte, v => updateLigne(i, 'pays_qte', v))}</td>
                <td style={tdR}>{renderInput(l.pays_val, v => updateLigne(i, 'pays_val', v))}</td>
                <td style={tdR}>{renderInput(l.autres_qte, v => updateLigne(i, 'autres_qte', v))}</td>
                <td style={tdR}>{renderInput(l.autres_val, v => updateLigne(i, 'autres_val', v))}</td>
                <td style={tdR}>{renderInput(l.hors_qte, v => updateLigne(i, 'hors_qte', v))}</td>
                <td style={tdR}>{renderInput(l.hors_val, v => updateLigne(i, 'hors_val', v))}</td>
                <td style={tdR}>{renderInput(l.immo_qte, v => updateLigne(i, 'immo_qte', v))}</td>
                <td style={tdR}>{renderInput(l.immo_val, v => updateLigne(i, 'immo_val', v))}</td>
                <td style={tdR}>{renderInput(l.stock_ouv_qte, v => updateLigne(i, 'stock_ouv_qte', v))}</td>
                <td style={tdR}>{renderInput(l.stock_ouv_val, v => updateLigne(i, 'stock_ouv_val', v))}</td>
                <td style={tdR}>{renderInput(l.stock_clo_qte, v => updateLigne(i, 'stock_clo_qte', v))}</td>
                <td style={tdR}>{renderInput(l.stock_clo_val, v => updateLigne(i, 'stock_clo_val', v))}</td>
              </tr>
            ))}
            {editing && (
              <tr className="no-print">
                <td colSpan={14} style={{ border: 'none', padding: '4px 0' }}>
                  <button onClick={() => setLignes(prev => [...prev, emptyLigne()])} style={{ background: '#D4A843', color: '#fff', border: 'none', borderRadius: 4, padding: '3px 10px', fontSize: 11, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}><LuPlus size={12} /> Ajouter un produit</button>
                </td>
              </tr>
            )}
            {/* NON VENTILE */}
            <tr>
              <td style={tdB} colSpan={2}>NON VENTILE</td>
              <td style={tdBR}></td>
              <td style={tdR}>{renderInput(nonVentile.pays_val, v => setNonVentile(p => ({ ...p, pays_val: v })))}</td>
              <td style={tdBR}></td>
              <td style={tdR}>{renderInput(nonVentile.autres_val, v => setNonVentile(p => ({ ...p, autres_val: v })))}</td>
              <td style={tdBR}></td>
              <td style={tdR}>{renderInput(nonVentile.hors_val, v => setNonVentile(p => ({ ...p, hors_val: v })))}</td>
              <td style={tdBR}></td>
              <td style={tdR}>{renderInput(nonVentile.immo_val, v => setNonVentile(p => ({ ...p, immo_val: v })))}</td>
              <td style={tdBR}></td>
              <td style={tdR}>{renderInput(nonVentile.stock_ouv_val, v => setNonVentile(p => ({ ...p, stock_ouv_val: v })))}</td>
              <td style={tdBR}></td>
              <td style={tdR}>{renderInput(nonVentile.stock_clo_val, v => setNonVentile(p => ({ ...p, stock_clo_val: v })))}</td>
            </tr>
            {/* TOTAL */}
            <tr>
              <td style={{ ...tdB, background: '#e8e8e8' }} colSpan={2}>TOTAL</td>
              <td style={{ ...tdBR, background: '#e8e8e8' }}></td>
              <td style={{ ...tdBR, background: '#e8e8e8' }}>{fmtM(totals.pays_val)}</td>
              <td style={{ ...tdBR, background: '#e8e8e8' }}></td>
              <td style={{ ...tdBR, background: '#e8e8e8' }}>{fmtM(totals.autres_val)}</td>
              <td style={{ ...tdBR, background: '#e8e8e8' }}></td>
              <td style={{ ...tdBR, background: '#e8e8e8' }}>{fmtM(totals.hors_val)}</td>
              <td style={{ ...tdBR, background: '#e8e8e8' }}></td>
              <td style={{ ...tdBR, background: '#e8e8e8' }}>{fmtM(totals.immo_val)}</td>
              <td style={{ ...tdBR, background: '#e8e8e8' }}></td>
              <td style={{ ...tdBR, background: '#e8e8e8' }}>{fmtM(totals.stock_ouv_val)}</td>
              <td style={{ ...tdBR, background: '#e8e8e8' }}></td>
              <td style={{ ...tdBR, background: '#e8e8e8' }}>{fmtM(totals.stock_clo_val)}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default Note32;
