import React, { useState, useRef, useEffect } from 'react';
import { LuPlus, LuTrash2 } from 'react-icons/lu';
import '../BilanSYCEBNL.css';
import '../FicheIdentification.css';
import type { EtatBaseProps, BalanceLigne } from '../../types';
import BalanceSourcePanel from './BalanceSourcePanel';
import { useNoteData } from './useNoteData';
import { usePDFPreview } from './usePDFPreview';
import NoteToolbar from './NoteToolbar';
import PDFPreviewModal from './PDFPreviewModal';
import { thStyle, tdStyle, tdRight, tdBold, tdBoldRight, inputSt } from './noteStyles';

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
  const {
    exercices, selectedExercice, setSelectedExercice,
    params, setParams, editing, setEditing, saving, saved, saveParams, annee, dateFin, duree,
  } = useNoteData({ entiteId });

  const pageRef = useRef<HTMLDivElement>(null);
  const pdf = usePDFPreview({ pageRef, fileName: `Note8A_${annee}.pdf`, editing, setEditing, orientation: 'l' });

  const [lignesN, setLignesN] = useState<BalanceLigne[]>([]);

  const [montantGlobalFrais, setMontantGlobalFrais] = useState('');
  const [montantGlobalCharges, setMontantGlobalCharges] = useState('');
  const [montantGlobalPrimes, setMontantGlobalPrimes] = useState('');
  const [dureeFrais, setDureeFrais] = useState('');
  const [dureeCharges, setDureeCharges] = useState('');
  const [dureePrimes, setDureePrimes] = useState('');
  const [exerciceBlocks, setExerciceBlocks] = useState<ExerciceBlock[]>([]);
  const [totalExercices, setTotalExercices] = useState<{ annee: string; frais: string; charges: string; primes: string }[]>([]);

  const inputLeft: React.CSSProperties = { ...inputSt, textAlign: 'left', width: 80 };

  // Charger les données spécifiques depuis params
  useEffect(() => {
    if (!params['note8a_montant_frais'] && !params['note8a_exercice_blocks']) return;
    setMontantGlobalFrais(params['note8a_montant_frais'] || '');
    setMontantGlobalCharges(params['note8a_montant_charges'] || '');
    setMontantGlobalPrimes(params['note8a_montant_primes'] || '');
    setDureeFrais(params['note8a_duree_frais'] || '');
    setDureeCharges(params['note8a_duree_charges'] || '');
    setDureePrimes(params['note8a_duree_primes'] || '');
    if (params['note8a_exercice_blocks']) {
      try { const p = JSON.parse(params['note8a_exercice_blocks']); if (Array.isArray(p)) setExerciceBlocks(p); } catch { /* */ }
    }
    if (params['note8a_total_exercices']) {
      try { const p = JSON.parse(params['note8a_total_exercices']); if (Array.isArray(p)) setTotalExercices(p); } catch { /* */ }
    }
  }, [params]);

  // Initialiser les blocs si vides quand selectedExercice change
  useEffect(() => {
    if (!selectedExercice) return;
    if (exerciceBlocks.length === 0) {
      setExerciceBlocks([defaultExerciceBlock(String(selectedExercice.annee))]);
    }
    if (totalExercices.length === 0) {
      const years: string[] = [];
      for (let i = 4; i >= 0; i--) years.push(String(selectedExercice.annee - i));
      setTotalExercices(years.map(y => ({ annee: y, frais: '', charges: '', primes: '' })));
    }
  }, [selectedExercice]);

  // Chargement balance N pour soldes 475
  const balanceSource = offre === 'comptabilite' ? 'ecritures' : 'import';
  useEffect(() => {
    if (!entiteId || !selectedExercice) return;
    const load = async () => {
      try {
        if (balanceSource === 'ecritures') {
          const res = await fetch('/api/ecritures/balance/' + entiteId + '/' + selectedExercice.id);
          setLignesN((await res.json()).lignes || []);
        } else {
          const res = await fetch('/api/balance/' + entiteId + '/' + selectedExercice.id + '/N');
          setLignesN((await res.json()).lignes || []);
        }
      } catch { setLignesN([]); }
    };
    load();
  }, [entiteId, selectedExercice, balanceSource]);

  // Soldes 4751 (débiteur) et 4752 (créditeur) depuis la balance
  const solde4751 = lignesN.reduce((total, l) => {
    const num = (l.numero_compte || '').trim();
    if (!num.startsWith('4751')) return total;
    return total + (parseFloat(String(l.solde_debiteur)) || 0);
  }, 0);

  const solde4752 = lignesN.reduce((total, l) => {
    const num = (l.numero_compte || '').trim();
    if (!num.startsWith('4752')) return total;
    return total + (parseFloat(String(l.solde_crediteur)) || 0);
  }, 0);

  // Montant global affiché = valeur manuelle si saisie, sinon solde balance 475
  const montantFraisDisplay = montantGlobalFrais || (solde4751 ? String(Math.round(solde4751)) : '');
  const montantChargesDisplay = montantGlobalCharges || (solde4752 ? String(Math.round(solde4752)) : '');
  const montantPrimesDisplay = montantGlobalPrimes;

  const handleSave = () => saveParams({
    ...params,
    note8a_montant_frais: montantGlobalFrais,
    note8a_montant_charges: montantGlobalCharges,
    note8a_montant_primes: montantGlobalPrimes,
    note8a_duree_frais: dureeFrais,
    note8a_duree_charges: dureeCharges,
    note8a_duree_primes: dureePrimes,
    note8a_exercice_blocks: JSON.stringify(exerciceBlocks),
    note8a_total_exercices: JSON.stringify(totalExercices),
  });

  const fmtDateShort = (d: string): string => {
    if (!d) return '';
    return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
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
  const fmtM = (v: number): string => v === 0 ? '0' : Math.round(v).toLocaleString('fr-FR');

  const renderInput = (value: string, onChange: (v: string) => void, style = inputSt) => {
    if (!editing) return value;
    return <input value={value} onChange={e => onChange(e.target.value)} style={style} />;
  };

  return (
    <div>
      <NoteToolbar
        title="Note 8A — Charges immobilisees : etalement"
        exercices={exercices} selectedExercice={selectedExercice} onSelectExercice={setSelectedExercice}
        editing={editing} saving={saving} saved={saved}
        onEdit={() => setEditing(true)} onSave={handleSave} onPreview={pdf.openPreview} onBack={onBack}
      />

      {pdf.previewUrl && (
        <PDFPreviewModal previewUrl={pdf.previewUrl} title="Apercu — Note 8A" onClose={pdf.closePreview} onDownload={pdf.downloadPDF} onPrint={pdf.printPDF} />
      )}

      <BalanceSourcePanel
        lignes={lignesN}
        groups={[
          { label: 'Frais d\'etablissement (4751)', prefixes: ['4751'] },
          { label: 'Charges a repartir (4752)', prefixes: ['4752'] },
        ]}
        title="Soldes balance — Charges immobilisees"
      />

      <div ref={pageRef} style={{
        width: '297mm', minHeight: '210mm', background: '#fff',
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
          NOTE 8A — TABLEAU D'ETALEMENT DES CHARGES IMMOBILISEES ET DES PROVISIONS POUR CHARGES A REPARTIR
        </h3>

        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={{ ...thStyle, width: '30%' }}>Libelles</th>
              <th style={thStyle} colSpan={2}>Frais d'etablissement</th>
              <th style={thStyle} colSpan={2}>Charges a repartir sur plusieurs exercices</th>
              <th style={thStyle} colSpan={2}>Primes de remboursement des obligations</th>
            </tr>
          </thead>
          <tbody>
            {/* Montant global */}
            <tr>
              <td style={tdBold}>Montant global a etaler au 1<sup>er</sup> janvier {annee}</td>
              <td style={tdRight} colSpan={2}>{editing ? <input value={montantGlobalFrais} onChange={e => setMontantGlobalFrais(e.target.value)} style={inputSt} placeholder={solde4751 ? String(Math.round(solde4751)) : ''} /> : montantFraisDisplay}</td>
              <td style={tdRight} colSpan={2}>{editing ? <input value={montantGlobalCharges} onChange={e => setMontantGlobalCharges(e.target.value)} style={inputSt} placeholder={solde4752 ? String(Math.round(solde4752)) : ''} /> : montantChargesDisplay}</td>
              <td style={tdRight} colSpan={2}>{renderInput(montantGlobalPrimes, setMontantGlobalPrimes)}</td>
            </tr>
            {/* Durée */}
            <tr>
              <td style={tdBold}>Duree d'etalement retenue</td>
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
