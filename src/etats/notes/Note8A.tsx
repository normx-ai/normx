import React, { useState, useRef, useEffect } from 'react';
import { LuDownload, LuArrowLeft, LuEye, LuX, LuPrinter, LuSave, LuPenLine, LuPlus, LuTrash2 } from 'react-icons/lu';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import '../BilanSYCEBNL.css';
import '../FicheIdentification.css';
import type { Exercice, EtatBaseProps } from '../../types';

interface Note8AProps extends EtatBaseProps {
  onGoToParametres?: () => void;
}

interface LigneExercice {
  comptesFrais: string;
  montantsFrais: string;
  comptesCharges: string;
  montantsCharges: string;
  comptesPrimes: string;
  montantsPrimes: string;
}

interface ExerciceBlock {
  annee: string;
  lignes: LigneExercice[];
}

const emptyLigne = (): LigneExercice => ({
  comptesFrais: '', montantsFrais: '', comptesCharges: '', montantsCharges: '', comptesPrimes: '', montantsPrimes: '',
});

const defaultExerciceBlock = (annee: string): ExerciceBlock => ({
  annee,
  lignes: [
    { comptesFrais: '60...', montantsFrais: '', comptesCharges: '60...', montantsCharges: '', comptesPrimes: '6714', montantsPrimes: '' },
    { comptesFrais: '61...', montantsFrais: '', comptesCharges: '61...', montantsCharges: '', comptesPrimes: '', montantsPrimes: '' },
    { comptesFrais: '62...', montantsFrais: '', comptesCharges: '62...', montantsCharges: '', comptesPrimes: '', montantsPrimes: '' },
    { comptesFrais: '63...', montantsFrais: '', comptesCharges: '63...', montantsCharges: '', comptesPrimes: '', montantsPrimes: '' },
    { comptesFrais: '...', montantsFrais: '', comptesCharges: '...', montantsCharges: '', comptesPrimes: '', montantsPrimes: '' },
  ],
});

function Note8A({ entiteName, entiteNif = '', entiteId, offre, onBack }: Note8AProps): React.JSX.Element {
  const [exercices, setExercices] = useState<Exercice[]>([]);
  const [selectedExercice, setSelectedExercice] = useState<Exercice | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [pdfBlob, setPdfBlob] = useState<Blob | null>(null);
  const [params, setParams] = useState<Record<string, string>>({});
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const [montantGlobalFrais, setMontantGlobalFrais] = useState('');
  const [montantGlobalCharges, setMontantGlobalCharges] = useState('');
  const [montantGlobalPrimes, setMontantGlobalPrimes] = useState('');
  const [dureeFrais, setDureeFrais] = useState('');
  const [dureeCharges, setDureeCharges] = useState('');
  const [dureePrimes, setDureePrimes] = useState('');
  const [exerciceBlocks, setExerciceBlocks] = useState<ExerciceBlock[]>([]);
  const [totalExercices, setTotalExercices] = useState<{ annee: string; frais: string; charges: string; primes: string }[]>([]);

  const pageRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!entiteId) return;
    fetch('/api/entites/' + entiteId)
      .then(r => r.json())
      .then(ent => {
        const data = ent.data || {};
        setParams(data);
        setMontantGlobalFrais(data['note8a_montant_frais'] || '');
        setMontantGlobalCharges(data['note8a_montant_charges'] || '');
        setMontantGlobalPrimes(data['note8a_montant_primes'] || '');
        setDureeFrais(data['note8a_duree_frais'] || '');
        setDureeCharges(data['note8a_duree_charges'] || '');
        setDureePrimes(data['note8a_duree_primes'] || '');
        if (data['note8a_exercice_blocks']) {
          try { const p = JSON.parse(data['note8a_exercice_blocks']); if (Array.isArray(p)) setExerciceBlocks(p); } catch { /* */ }
        }
        if (data['note8a_total_exercices']) {
          try { const p = JSON.parse(data['note8a_total_exercices']); if (Array.isArray(p)) setTotalExercices(p); } catch { /* */ }
        }
      })
      .catch(() => {});
  }, [entiteId]);

  useEffect(() => {
    if (!entiteId) return;
    fetch('/api/balance/exercices/' + entiteId)
      .then(r => r.json())
      .then((data: Exercice[]) => {
        setExercices(data);
        if (data.length > 0) {
          const now = new Date();
          const year = now.getFullYear();
          const month = now.getMonth();
          const preferYear = month <= 2 ? year - 1 : year;
          const pick = data.find(e => e.annee === preferYear)
            || data.find(e => e.annee === year)
            || data.find(e => e.annee === year - 1)
            || data[0];
          setSelectedExercice(pick);
          // Initialiser les blocs si vides
          if (exerciceBlocks.length === 0) {
            setExerciceBlocks([defaultExerciceBlock(String(pick.annee))]);
          }
          if (totalExercices.length === 0) {
            const years: string[] = [];
            for (let i = 4; i >= 0; i--) years.push(String(pick.annee - i));
            setTotalExercices(years.map(y => ({ annee: y, frais: '', charges: '', primes: '' })));
          }
        }
      })
      .catch(() => {});
  }, [entiteId]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const data: Record<string, string> = {
        ...params,
        note8a_montant_frais: montantGlobalFrais,
        note8a_montant_charges: montantGlobalCharges,
        note8a_montant_primes: montantGlobalPrimes,
        note8a_duree_frais: dureeFrais,
        note8a_duree_charges: dureeCharges,
        note8a_duree_primes: dureePrimes,
        note8a_exercice_blocks: JSON.stringify(exerciceBlocks),
        note8a_total_exercices: JSON.stringify(totalExercices),
      };
      const res = await fetch(`/api/entites/${entiteId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data }),
      });
      if (res.ok) {
        setParams(data);
        setSaved(true);
        setEditing(false);
        setTimeout(() => setSaved(false), 3000);
      }
    } catch { /* */ }
    setSaving(false);
  };

  const duree = selectedExercice?.duree_mois || 12;
  const dateFin = selectedExercice?.date_fin ? new Date(selectedExercice.date_fin) : null;
  const annee = selectedExercice ? selectedExercice.annee : new Date().getFullYear();

  const fmtDateShort = (d: Date | null): string => {
    if (!d) return '';
    return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  const updateBlockLigne = (bIdx: number, lIdx: number, field: keyof LigneExercice, value: string) => {
    setExerciceBlocks(prev => prev.map((b, bi) => bi === bIdx ? { ...b, lignes: b.lignes.map((l, li) => li === lIdx ? { ...l, [field]: value } : l) } : b));
  };

  const addBlockLigne = (bIdx: number) => {
    setExerciceBlocks(prev => prev.map((b, bi) => bi === bIdx ? { ...b, lignes: [...b.lignes, emptyLigne()] } : b));
  };

  const removeBlockLigne = (bIdx: number, lIdx: number) => {
    setExerciceBlocks(prev => prev.map((b, bi) => bi === bIdx ? { ...b, lignes: b.lignes.filter((_, li) => li !== lIdx) } : b));
  };

  const addBlock = () => {
    setExerciceBlocks(prev => [...prev, defaultExerciceBlock(String(annee))]);
  };

  const removeBlock = (bIdx: number) => {
    setExerciceBlocks(prev => prev.filter((_, i) => i !== bIdx));
  };

  const updateTotalExercice = (idx: number, field: string, value: string) => {
    setTotalExercices(prev => prev.map((t, i) => i === idx ? { ...t, [field]: value } : t));
  };

  // Calcul TOTAL GENERAL
  const parseN = (v: string): number => { const n = parseFloat(v.replace(/\s/g, '').replace(',', '.')); return isNaN(n) ? 0 : n; };
  const totalGeneralFrais = totalExercices.reduce((s, t) => s + parseN(t.frais), 0);
  const totalGeneralCharges = totalExercices.reduce((s, t) => s + parseN(t.charges), 0);
  const totalGeneralPrimes = totalExercices.reduce((s, t) => s + parseN(t.primes), 0);
  const fmtM = (v: number): string => v === 0 ? '' : Math.round(v).toLocaleString('fr-FR');

  // PDF
  const generatePDF = async (): Promise<jsPDF> => {
    const wasEditing = editing;
    if (wasEditing) setEditing(false);
    await new Promise(r => setTimeout(r, 100));
    const pdf = new jsPDF('l', 'mm', 'a4');
    if (!pageRef.current) return pdf;
    const canvas = await html2canvas(pageRef.current, { scale: 2, useCORS: true, backgroundColor: '#ffffff' });
    const imgData = canvas.toDataURL('image/png');
    const pdfWidth = 297;
    const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
    pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, Math.min(pdfHeight, 210));
    if (wasEditing) setEditing(true);
    return pdf;
  };

  const openPreview = async () => { const pdf = await generatePDF(); const blob = pdf.output('blob'); setPdfBlob(blob); setPreviewUrl(URL.createObjectURL(blob)); };
  const closePreview = () => { if (previewUrl) URL.revokeObjectURL(previewUrl); setPreviewUrl(null); setPdfBlob(null); };
  const downloadPDF = () => { if (!pdfBlob) return; const url = URL.createObjectURL(pdfBlob); const a = document.createElement('a'); a.href = url; a.download = 'Note8A_' + annee + '.pdf'; a.click(); URL.revokeObjectURL(url); };
  const printPDF = () => { if (!previewUrl) return; const w = window.open(previewUrl); if (w) { w.onload = () => w.print(); } };

  // Styles
  const thStyle: React.CSSProperties = { border: '0.5px solid #000', padding: '5px 8px', fontSize: 11, fontWeight: 700, textAlign: 'center', verticalAlign: 'middle', background: '#f5f5f5' };
  const tdStyle: React.CSSProperties = { border: '0.5px solid #000', padding: '5px 8px', fontSize: 11, verticalAlign: 'middle' };
  const tdRight: React.CSSProperties = { ...tdStyle, textAlign: 'right', fontVariantNumeric: 'tabular-nums' };
  const tdBold: React.CSSProperties = { ...tdStyle, fontWeight: 700 };
  const tdBoldRight: React.CSSProperties = { ...tdRight, fontWeight: 700 };
  const inputSt: React.CSSProperties = { width: '100%', padding: '5px 8px', fontSize: 12, border: '1px solid #D4A843', borderRadius: 2, background: '#fffbf0', textAlign: 'right', boxSizing: 'border-box' };
  const inputLeft: React.CSSProperties = { ...inputSt, textAlign: 'left', width: 80 };

  const renderInput = (value: string, onChange: (v: string) => void, style = inputSt) => {
    if (!editing) return value;
    return <input value={value} onChange={e => onChange(e.target.value)} style={style} />;
  };

  return (
    <div>
      <div className="etat-toolbar">
        <button className="etat-back-btn" onClick={onBack}><LuArrowLeft size={18} /> Retour</button>
        <div className="etat-toolbar-title">Note 8A — Charges immobilisées : étalement</div>
        <div className="etat-toolbar-actions">
          <select className="etat-exercice-select" value={selectedExercice?.id || ''} onChange={e => { const ex = exercices.find(ex => ex.id === Number(e.target.value)); if (ex) setSelectedExercice(ex); }}>
            {exercices.map(ex => (<option key={ex.id} value={ex.id}>{ex.annee}</option>))}
          </select>
          {!editing ? (
            <button className="etat-action-btn" onClick={() => setEditing(true)} style={{ background: '#D4A843', color: '#fff', border: 'none' }}><LuPenLine size={16} /> Modifier</button>
          ) : (
            <button className="etat-action-btn" onClick={handleSave} disabled={saving} style={{ background: '#059669', color: '#fff', border: 'none' }}><LuSave size={16} /> {saving ? 'Sauvegarde...' : 'Sauvegarder'}</button>
          )}
          <button className="etat-action-btn" onClick={openPreview}><LuEye size={16} /> Aperçu</button>
        </div>
      </div>

      {previewUrl && (
        <div className="etat-preview-overlay" onClick={closePreview}>
          <div className="etat-preview-modal" onClick={e => e.stopPropagation()}>
            <div className="etat-preview-header">
              <span>Aperçu — Note 8A</span>
              <div className="etat-preview-actions">
                <button onClick={printPDF} title="Imprimer"><LuPrinter size={18} /></button>
                <button onClick={downloadPDF} title="Télécharger"><LuDownload size={18} /></button>
                <button onClick={closePreview}><LuX size={18} /></button>
              </div>
            </div>
            <iframe src={previewUrl} className="etat-preview-iframe" title="Aperçu Note 8A" />
          </div>
        </div>
      )}

      <div ref={pageRef} style={{
        width: '297mm', minHeight: '210mm', background: '#fff',
        margin: '0 auto 20px', padding: '8mm 10mm',
        boxShadow: '0 2px 12px rgba(0,0,0,0.1)', boxSizing: 'border-box',
        fontFamily: "'Outfit', 'Segoe UI', Arial, sans-serif", fontSize: 12, color: '#1a1a1a',
      }}>
        {/* Header */}
        <div className="etat-header-officiel">
          <div className="etat-header-grid">
            <div className="etat-header-row">
              <span className="etat-header-label">Désignation entité :</span>
              <span className="etat-header-value">{entiteName || ''}</span>
              <span className="etat-header-label">Exercice clos le :</span>
              <span className="etat-header-value-right">{dateFin ? fmtDateShort(dateFin) : ''}</span>
            </div>
            <div className="etat-header-row">
              <span className="etat-header-label">Numéro d'identification :</span>
              <span className="etat-header-value">{entiteNif || ''}</span>
              <span className="etat-header-label">Durée (en mois) :</span>
              <span className="etat-header-value-right">{duree}</span>
            </div>
          </div>
        </div>
        <h3 style={{ textAlign: 'center', fontSize: 14, fontWeight: 700, margin: '30px 0 20px', textDecoration: 'underline' }}>
          NOTE 8A — TABLEAU D'ETALEMENT DES CHARGES IMMOBILISEES ET DES PROVISIONS POUR CHARGES A REPARTIR
        </h3>

        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={{ ...thStyle, width: '30%' }}>Libellés</th>
              <th style={thStyle} colSpan={2}>Frais d'établissement</th>
              <th style={thStyle} colSpan={2}>Charges à répartir sur plusieurs exercices</th>
              <th style={thStyle} colSpan={2}>Primes de remboursement des obligations</th>
            </tr>
          </thead>
          <tbody>
            {/* Montant global */}
            <tr>
              <td style={tdBold}>Montant global à étaler au 1<sup>er</sup> janvier {annee}</td>
              <td style={tdRight} colSpan={2}>{renderInput(montantGlobalFrais, setMontantGlobalFrais)}</td>
              <td style={tdRight} colSpan={2}>{renderInput(montantGlobalCharges, setMontantGlobalCharges)}</td>
              <td style={tdRight} colSpan={2}>{renderInput(montantGlobalPrimes, setMontantGlobalPrimes)}</td>
            </tr>
            {/* Durée */}
            <tr>
              <td style={tdBold}>Durée d'étalement retenue</td>
              <td style={tdRight} colSpan={2}>{renderInput(dureeFrais, setDureeFrais)}</td>
              <td style={tdRight} colSpan={2}>{renderInput(dureeCharges, setDureeCharges)}</td>
              <td style={tdRight} colSpan={2}>{renderInput(dureePrimes, setDureePrimes)}</td>
            </tr>
            {/* Sous-headers Comptes / Montants */}
            <tr>
              <td style={tdStyle}></td>
              <td style={{ ...thStyle, fontSize: 11 }}>Comptes</td>
              <td style={{ ...thStyle, fontSize: 11 }}>Montants</td>
              <td style={{ ...thStyle, fontSize: 11 }}>Comptes</td>
              <td style={{ ...thStyle, fontSize: 11 }}>Montants</td>
              <td style={{ ...thStyle, fontSize: 11 }}>Comptes</td>
              <td style={{ ...thStyle, fontSize: 11 }}>Montants</td>
            </tr>
            {/* Blocs exercices détaillés */}
            {exerciceBlocks.map((block, bIdx) => (
              <React.Fragment key={bIdx}>
                {block.lignes.map((l, lIdx) => (
                  <tr key={`${bIdx}-${lIdx}`}>
                    {lIdx === 0 && (
                      <td style={{ ...tdBold, textAlign: 'center' }} rowSpan={block.lignes.length}>
                        Exercice {editing ? <input value={block.annee} onChange={e => setExerciceBlocks(prev => prev.map((b, i) => i === bIdx ? { ...b, annee: e.target.value } : b))} style={{ ...inputLeft, width: 60, textAlign: 'center' }} /> : block.annee}
                        {editing && (
                          <button onClick={() => removeBlock(bIdx)} style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer', marginLeft: 4 }}><LuTrash2 size={12} /></button>
                        )}
                      </td>
                    )}
                    <td style={tdStyle}>{renderInput(l.comptesFrais, v => updateBlockLigne(bIdx, lIdx, 'comptesFrais', v), inputLeft)}</td>
                    <td style={tdRight}>{renderInput(l.montantsFrais, v => updateBlockLigne(bIdx, lIdx, 'montantsFrais', v))}</td>
                    <td style={tdStyle}>{renderInput(l.comptesCharges, v => updateBlockLigne(bIdx, lIdx, 'comptesCharges', v), inputLeft)}</td>
                    <td style={tdRight}>{renderInput(l.montantsCharges, v => updateBlockLigne(bIdx, lIdx, 'montantsCharges', v))}</td>
                    <td style={tdStyle}>{renderInput(l.comptesPrimes, v => updateBlockLigne(bIdx, lIdx, 'comptesPrimes', v), inputLeft)}</td>
                    <td style={tdRight}>{renderInput(l.montantsPrimes, v => updateBlockLigne(bIdx, lIdx, 'montantsPrimes', v))}</td>
                  </tr>
                ))}
                {editing && (
                  <tr className="no-print">
                    <td colSpan={7} style={{ border: 'none', padding: '2px 0' }}>
                      <button onClick={() => addBlockLigne(bIdx)} style={{ background: 'none', border: 'none', color: '#D4A843', cursor: 'pointer', fontSize: 11 }}><LuPlus size={12} /> Ajouter une ligne</button>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
            {editing && (
              <tr className="no-print">
                <td colSpan={7} style={{ border: 'none', padding: '6px 0' }}>
                  <button onClick={addBlock} style={{ background: '#D4A843', color: '#fff', border: 'none', borderRadius: 4, padding: '4px 12px', fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
                    <LuPlus size={14} /> Ajouter un exercice
                  </button>
                </td>
              </tr>
            )}
            {/* Totaux par exercice */}
            {totalExercices.map((t, i) => (
              <tr key={`total-${i}`}>
                <td style={tdBold}>Total exercice {editing ? <input value={t.annee} onChange={e => updateTotalExercice(i, 'annee', e.target.value)} style={{ ...inputLeft, width: 50, textAlign: 'center' }} /> : t.annee}</td>
                <td style={tdRight} colSpan={2}>{renderInput(t.frais, v => updateTotalExercice(i, 'frais', v))}</td>
                <td style={tdRight} colSpan={2}>{renderInput(t.charges, v => updateTotalExercice(i, 'charges', v))}</td>
                <td style={tdRight} colSpan={2}>{renderInput(t.primes, v => updateTotalExercice(i, 'primes', v))}</td>
              </tr>
            ))}
            {/* Total général */}
            <tr>
              <td style={{ ...tdBold, background: '#f0f0f0' }}>TOTAL GENERAL</td>
              <td style={{ ...tdBoldRight, background: '#f0f0f0' }} colSpan={2}>{fmtM(totalGeneralFrais)}</td>
              <td style={{ ...tdBoldRight, background: '#f0f0f0' }} colSpan={2}>{fmtM(totalGeneralCharges)}</td>
              <td style={{ ...tdBoldRight, background: '#f0f0f0' }} colSpan={2}>{fmtM(totalGeneralPrimes)}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default Note8A;
