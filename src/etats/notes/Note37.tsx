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

interface Note37Props extends EtatBaseProps { onGoToParametres?: () => void; }

interface LigneDetail { libelle: string; montant: string; }

interface Note37Data {
  resultat_net: string;
  reintegrations: LigneDetail[];
  deductions: LigneDetail[];
  deficits: LigneDetail[];
  amort_differes: LigneDetail[];
  amort_a_differer: LigneDetail[];
  taux_impot: string;
}

const emptyLigne = (): LigneDetail => ({ libelle: '', montant: '' });

const defaultData = (): Note37Data => ({
  resultat_net: '',
  reintegrations: [emptyLigne(), emptyLigne(), emptyLigne(), emptyLigne(), emptyLigne(), emptyLigne()],
  deductions: [emptyLigne(), emptyLigne(), emptyLigne(), emptyLigne(), emptyLigne(), emptyLigne()],
  deficits: [emptyLigne(), emptyLigne()],
  amort_differes: [emptyLigne(), emptyLigne()],
  amort_a_differer: [emptyLigne()],
  taux_impot: '',
});

function Note37({ entiteName, entiteNif = '', entiteId, onBack }: Note37Props): React.JSX.Element {
  const {
    exercices, selectedExercice, setSelectedExercice,
    params, setParams, editing, setEditing, saving, saved, saveParams, annee, dateFin, duree,
  } = useNoteData({ entiteId });

  const pageRef = useRef<HTMLDivElement>(null);
  const pdf = usePDFPreview({ pageRef, fileName: `Note37_${annee}.pdf`, editing, setEditing });

  const [data, setData] = useState<Note37Data>(defaultData());

  // Charger data depuis params
  useEffect(() => {
    if (!params['note37_data']) return;
    try { const p = JSON.parse(params['note37_data']); setData({ ...defaultData(), ...p }); } catch { /* */ }
  }, [params]);

  const handleSave = () => saveParams({
    ...params,
    note37_data: JSON.stringify(data),
  });

  const fmtDateShort = (d: string): string => {
    if (!d) return '';
    return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };
  const parseN = (v: string): number => { const n = parseFloat(v.replace(/\s/g, '').replace(',', '.')); return isNaN(n) ? 0 : n; };
  const fmtM = (v: number): string => v === 0 ? '0' : Math.round(v).toLocaleString('fr-FR');

  const sumSection = (lignes: LigneDetail[]): number => lignes.reduce((s, l) => s + parseN(l.montant), 0);

  const totalReint = sumSection(data.reintegrations);
  const totalDeduc = sumSection(data.deductions);
  const resultatNet = parseN(data.resultat_net);
  const resultatImposable = resultatNet + totalReint - totalDeduc;
  const totalDeficits = sumSection(data.deficits);
  const totalAmortDiff = sumSection(data.amort_differes);
  const totalAmortADiff = sumSection(data.amort_a_differer);
  const resultatFiscal = resultatImposable - totalDeficits - totalAmortDiff + totalAmortADiff;
  const tauxImpot = parseN(data.taux_impot);
  const impot = tauxImpot > 0 ? resultatFiscal * tauxImpot / 100 : 0;

  const updateLigne = (section: keyof Note37Data, idx: number, field: keyof LigneDetail, value: string) => {
    setData(prev => {
      const arr = [...(prev[section] as LigneDetail[])];
      arr[idx] = { ...arr[idx], [field]: value };
      return { ...prev, [section]: arr };
    });
  };
  const addLigne = (section: keyof Note37Data) => {
    setData(prev => ({ ...prev, [section]: [...(prev[section] as LigneDetail[]), emptyLigne()] }));
  };
  const removeLigne = (section: keyof Note37Data, idx: number) => {
    setData(prev => ({ ...prev, [section]: (prev[section] as LigneDetail[]).filter((_, i) => i !== idx) }));
  };

  const td: React.CSSProperties = { ...tdStyle, fontSize: 10, padding: '6px 10px' };
  const tdR: React.CSSProperties = { ...tdRight, fontSize: 10, width: '22%', padding: '6px 10px' };
  const tdB: React.CSSProperties = { ...tdBold, background: '#f0f0f0', fontSize: 10, padding: '6px 10px' };
  const tdBR: React.CSSProperties = { ...tdBoldRight, background: '#f0f0f0', width: '22%', fontSize: 10, padding: '6px 10px' };
  const th: React.CSSProperties = { ...thStyle, fontSize: 10, padding: '8px 10px' };
  const inp: React.CSSProperties = { ...inputSt, padding: '4px 6px', fontSize: 10 };
  const inpL: React.CSSProperties = { ...inp, textAlign: 'left' };

  const renderSection = (label: string, num: string, section: keyof Note37Data, lignes: LigneDetail[], showTotal?: boolean, totalVal?: number) => (
    <>
      <tr>
        <td style={tdB}>{num} : {label} <sup>(1)</sup></td>
        <td style={tdBR}>{showTotal && totalVal !== undefined ? fmtM(totalVal) : ''}</td>
      </tr>
      {lignes.map((l, i) => (
        <tr key={`${section}_${i}`}>
          <td style={td}>
            {editing ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <input value={l.libelle} onChange={e => updateLigne(section, i, 'libelle', e.target.value)} style={inpL} placeholder="Libellé..." />
                <button onClick={() => removeLigne(section, i)} style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer', padding: 1, flexShrink: 0 }}><LuTrash2 size={12} /></button>
              </div>
            ) : l.libelle}
          </td>
          <td style={tdR}>
            {editing ? <input value={l.montant} onChange={e => updateLigne(section, i, 'montant', e.target.value)} style={inp} /> : (l.montant ? fmtM(parseN(l.montant)) : '')}
          </td>
        </tr>
      ))}
      {editing && (
        <tr className="no-print">
          <td colSpan={2} style={{ border: 'none', padding: '3px 0' }}>
            <button onClick={() => addLigne(section)} style={{ background: '#D4A843', color: '#fff', border: 'none', borderRadius: 4, padding: '2px 10px', fontSize: 10, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}><LuPlus size={11} /> Ajouter</button>
          </td>
        </tr>
      )}
    </>
  );

  return (
    <div>
      <NoteToolbar
        title="Note 37 — Détermination impôts sur le résultat"
        exercices={exercices} selectedExercice={selectedExercice} onSelectExercice={setSelectedExercice}
        editing={editing} saving={saving} saved={saved}
        onEdit={() => setEditing(true)} onSave={handleSave} onPreview={pdf.openPreview} onBack={onBack}
      />

      {pdf.previewUrl && (
        <PDFPreviewModal previewUrl={pdf.previewUrl} title="Apercu — Note 37" onClose={pdf.closePreview} onDownload={pdf.downloadPDF} onPrint={pdf.printPDF} />
      )}

      <div ref={pageRef} style={{ width: '210mm', minHeight: '297mm', background: '#fff', margin: '0 auto 20px', padding: '6mm 10mm', boxShadow: '0 2px 12px rgba(0,0,0,0.1)', boxSizing: 'border-box', fontFamily: "'Inter', 'Segoe UI', Arial, sans-serif", fontSize: 10, color: '#1a1a1a' }}>
        <div className="etat-header-officiel"><div className="etat-header-grid"><div className="etat-header-row"><span className="etat-header-label">Designation entite :</span><span className="etat-header-value">{entiteName || ''}</span><span className="etat-header-label">Exercice clos le :</span><span className="etat-header-value-right">{fmtDateShort(dateFin)}</span></div><div className="etat-header-row"><span className="etat-header-label">Numero d'identification :</span><span className="etat-header-value">{entiteNif || ''}</span><span className="etat-header-label">Duree (en mois) :</span><span className="etat-header-value-right">{duree}</span></div></div></div>
        <h3 style={{ textAlign: 'center', fontSize: 14, fontWeight: 700, margin: '30px 0 20px', textDecoration: 'underline' }}>
          NOTE 37 — DETERMINATION IMPOTS SUR LE RESULTAT
        </h3>

        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={{ ...th, textAlign: 'left', width: '78%' }}>Libellés</th>
              <th style={th}>Montant</th>
            </tr>
          </thead>
          <tbody>
            {/* 1 : Résultat net comptable */}
            <tr>
              <td style={tdB}>1 : RESULTAT NET COMPTABLE DE L'EXERCICE</td>
              <td style={tdBR}>
                {editing ? <input value={data.resultat_net} onChange={e => setData(prev => ({ ...prev, resultat_net: e.target.value }))} style={inp} /> : (data.resultat_net ? fmtM(parseN(data.resultat_net)) : '')}
              </td>
            </tr>

            {/* 2 : A réintégrer */}
            {renderSection('A REINTEGRER', '2', 'reintegrations', data.reintegrations)}

            {/* 3 : A déduire */}
            {renderSection('A DEDUIRE', '3', 'deductions', data.deductions)}

            {/* 4 : Résultat imposable avant déduction des déficits */}
            <tr>
              <td style={{ ...tdB, background: '#e8e8e8' }}>4 : RESULTAT IMPOSABLE AVANT DEDUCTION DES DEFICITS (4 = 1+2-3)</td>
              <td style={{ ...tdBR, background: '#e8e8e8' }}>{fmtM(resultatImposable)}</td>
            </tr>

            {/* 5 : Déficits antérieurs */}
            {renderSection('DEFICITS ANTERIEURS A L\'EXERCICE', '5', 'deficits', data.deficits)}

            {/* 6 : Amortissements régulièrement différés */}
            {renderSection('AMORTISSEMENTS REGULIEREMENT DIFFERES', '6', 'amort_differes', data.amort_differes)}

            {/* 7 : Amortissements de l'exercice à différer */}
            {renderSection('AMORTISSEMENTS DE L\'EXERCICE A DIFFERER', '7', 'amort_a_differer', data.amort_a_differer)}

            {/* 8 : Résultat fiscal de l'exercice */}
            <tr>
              <td style={{ ...tdB, background: '#e8e8e8' }}>8 : RESULTAT FISCAL DE L'EXERCICE (8 = 4-5-6+7)</td>
              <td style={{ ...tdBR, background: '#e8e8e8' }}>{fmtM(resultatFiscal)}</td>
            </tr>

            {/* 9 : Impôt sur le résultat */}
            <tr>
              <td style={tdB}>
                9 : IMPOTS SUR LE RESULTAT AU TAUX DE{' '}
                {editing ? (
                  <input value={data.taux_impot} onChange={e => setData(prev => ({ ...prev, taux_impot: e.target.value }))} style={{ ...inp, width: 60, display: 'inline-block', textAlign: 'center' }} placeholder="%" />
                ) : (
                  <span style={{ fontWeight: 400 }}>{data.taux_impot ? data.taux_impot + ' %' : '.......... %'}</span>
                )}
              </td>
              <td style={tdBR}>{fmtM(Math.round(impot))}</td>
            </tr>
          </tbody>
        </table>

        <div style={{ fontSize: 8, marginTop: 12, color: '#555', lineHeight: 1.6 }}>
          <p style={{ margin: '2px 0' }}>(1) A détailler.</p>
        </div>
      </div>
    </div>
  );
}

export default Note37;
