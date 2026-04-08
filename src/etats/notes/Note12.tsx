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
import EditableComment from './EditableComment';
import { thStyle, tdStyle, tdRight, inputSt } from './noteStyles';

interface Note12Props extends EtatBaseProps {
  onGoToParametres?: () => void;
}

interface LigneEcart {
  libelle: string;
  devises: string;
  montantDevises: string;
  coursAcquisition: string;
  cours3112: string;
  variationAbsolue: string;
}

interface LigneTransfert {
  libelle: string;
  anneeN: string;
  anneeN1: string;
}

const emptyEcart = (): LigneEcart => ({ libelle: '', devises: '', montantDevises: '', coursAcquisition: '', cours3112: '', variationAbsolue: '' });
const emptyTransfert = (): LigneTransfert => ({ libelle: '', anneeN: '', anneeN1: '' });

function Note12({ entiteName, entiteNif = '', entiteId, offre, onBack }: Note12Props): React.JSX.Element {
  const {
    exercices, selectedExercice, setSelectedExercice,
    params, setParams, editing, setEditing, saving, saved, saveParams, annee, dateFin, duree,
  } = useNoteData({ entiteId });

  const pageRef = useRef<HTMLDivElement>(null);
  const pdf = usePDFPreview({ pageRef, fileName: `Note12_${annee}.pdf`, editing, setEditing, orientation: 'l' });

  const [ecartsActif, setEcartsActif] = useState<LigneEcart[]>([emptyEcart(), emptyEcart(), emptyEcart(), emptyEcart(), emptyEcart(), emptyEcart()]);
  const [ecartsPassif, setEcartsPassif] = useState<LigneEcart[]>([emptyEcart(), emptyEcart(), emptyEcart(), emptyEcart(), emptyEcart(), emptyEcart()]);
  const [commentaireEcarts, setCommentaireEcarts] = useState('• Faire un commentaire');

  const [transfertsExploitation, setTransfertsExploitation] = useState<LigneTransfert[]>([emptyTransfert(), emptyTransfert(), emptyTransfert(), emptyTransfert(), emptyTransfert()]);
  const [transfertsFinancieres, setTransfertsFinancieres] = useState<LigneTransfert[]>([emptyTransfert(), emptyTransfert(), emptyTransfert(), emptyTransfert(), emptyTransfert()]);
  const [commentaireTransferts, setCommentaireTransferts] = useState('• Faire un commentaire');

  const [lignesN, setLignesN] = useState<BalanceLigne[]>([]);
  const [lignesN1, setLignesN1] = useState<BalanceLigne[]>([]);

  // Charger donnees Note-specifiques depuis params
  useEffect(() => {
    if (!params['note12_ecarts_actif'] && !params['note12_commentaire_ecarts']) return;
    if (params['note12_ecarts_actif']) { try { const p = JSON.parse(params['note12_ecarts_actif']); if (Array.isArray(p) && p.length > 0) setEcartsActif(p); } catch { /* */ } }
    if (params['note12_ecarts_passif']) { try { const p = JSON.parse(params['note12_ecarts_passif']); if (Array.isArray(p) && p.length > 0) setEcartsPassif(p); } catch { /* */ } }
    if (params['note12_transferts_exploitation']) { try { const p = JSON.parse(params['note12_transferts_exploitation']); if (Array.isArray(p) && p.length > 0) setTransfertsExploitation(p); } catch { /* */ } }
    if (params['note12_transferts_financieres']) { try { const p = JSON.parse(params['note12_transferts_financieres']); if (Array.isArray(p) && p.length > 0) setTransfertsFinancieres(p); } catch { /* */ } }
    setCommentaireEcarts(params['note12_commentaire_ecarts'] || '• Faire un commentaire');
    setCommentaireTransferts(params['note12_commentaire_transferts'] || '• Faire un commentaire');
  }, [params]);

  // Chargement balance N et N-1
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
      try {
        const exN1 = exercices.find(e => e.annee === selectedExercice.annee - 1);
        if (exN1) {
          if (balanceSource === 'ecritures') {
            const res = await fetch('/api/ecritures/balance/' + entiteId + '/' + exN1.id);
            setLignesN1((await res.json()).lignes || []);
          } else {
            const res = await fetch('/api/balance/' + entiteId + '/' + exN1.id + '/N');
            setLignesN1((await res.json()).lignes || []);
          }
        } else {
          const res = await fetch('/api/balance/' + entiteId + '/' + selectedExercice.id + '/N-1');
          setLignesN1((await res.json()).lignes || []);
        }
      } catch { setLignesN1([]); }
    };
    load();
  }, [entiteId, selectedExercice, balanceSource, exercices]);

  // Soldes depuis la balance
  const computeSolde = (lignes: BalanceLigne[], prefix: string, type: 'debiteur' | 'crediteur') => {
    let total = 0;
    for (const l of lignes) {
      const num = (l.numero_compte || '').trim();
      if (!num.startsWith(prefix)) continue;
      total += parseFloat(String(type === 'debiteur' ? l.solde_debiteur : l.solde_crediteur)) || 0;
    }
    return total;
  };

  // 478 = Ecarts de conversion actif (solde debiteur)
  const solde478N = computeSolde(lignesN, '478', 'debiteur');
  const solde478N1 = computeSolde(lignesN1, '478', 'debiteur');
  // 479 = Ecarts de conversion passif (solde crediteur)
  const solde479N = computeSolde(lignesN, '479', 'crediteur');
  const solde479N1 = computeSolde(lignesN1, '479', 'crediteur');
  // 781 = Transferts de charges d'exploitation
  const solde781N = computeSolde(lignesN, '781', 'crediteur');
  const solde781N1 = computeSolde(lignesN1, '781', 'crediteur');
  // 787 = Transferts de charges financieres
  const solde787N = computeSolde(lignesN, '787', 'crediteur');
  const solde787N1 = computeSolde(lignesN1, '787', 'crediteur');

  const fmtSolde = (v: number): string => v === 0 ? '' : Math.round(v).toLocaleString('fr-FR');

  const handleSave = () => saveParams({
    ...params,
    note12_ecarts_actif: JSON.stringify(ecartsActif),
    note12_ecarts_passif: JSON.stringify(ecartsPassif),
    note12_transferts_exploitation: JSON.stringify(transfertsExploitation),
    note12_transferts_financieres: JSON.stringify(transfertsFinancieres),
    note12_commentaire_ecarts: commentaireEcarts,
    note12_commentaire_transferts: commentaireTransferts,
  });

  const fmtDateShort = (d: string): string => {
    if (!d) return '';
    return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  const parseN = (v: string): number => { const n = parseFloat(v.replace(/\s/g, '').replace(',', '.')); return isNaN(n) ? 0 : n; };
  const fmtM = (v: number): string => v === 0 ? '0' : Math.round(v).toLocaleString('fr-FR');

  const inputLeft: React.CSSProperties = { ...inputSt, textAlign: 'left' };

  const updateEcart = (setter: React.Dispatch<React.SetStateAction<LigneEcart[]>>, idx: number, field: keyof LigneEcart, value: string) => {
    setter(prev => prev.map((l, i) => i === idx ? { ...l, [field]: value } : l));
  };
  const updateTransfert = (setter: React.Dispatch<React.SetStateAction<LigneTransfert[]>>, idx: number, field: keyof LigneTransfert, value: string) => {
    setter(prev => prev.map((l, i) => i === idx ? { ...l, [field]: value } : l));
  };

  const renderInput = (value: string, onChange: (v: string) => void, style = inputSt) => {
    if (!editing) return value;
    return <input value={value} onChange={e => onChange(e.target.value)} style={style} />;
  };

  const renderEcartRows = (lignes: LigneEcart[], setter: React.Dispatch<React.SetStateAction<LigneEcart[]>>, sectionLabel: string) => (
    <>
      <tr>
        <td style={{ ...tdStyle, fontWeight: 600, fontStyle: 'italic' }} colSpan={6}>{sectionLabel}</td>
      </tr>
      {lignes.map((l, i) => {
        const montant = parseN(l.montantDevises);
        const coursAcq = parseN(l.coursAcquisition);
        const cours31 = parseN(l.cours3112);
        const variationCalc = montant !== 0 && coursAcq !== 0 && cours31 !== 0 ? montant * (cours31 - coursAcq) : 0;
        return (
          <tr key={i}>
            <td style={tdStyle}>
              {editing ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <input value={l.libelle} onChange={e => updateEcart(setter, i, 'libelle', e.target.value)} style={inputLeft} />
                  <button onClick={() => setter(prev => prev.filter((_, j) => j !== i))} style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer', padding: 2, flexShrink: 0 }}><LuTrash2 size={12} /></button>
                </div>
              ) : l.libelle}
            </td>
            <td style={tdStyle}>{renderInput(l.devises, v => updateEcart(setter, i, 'devises', v), inputLeft)}</td>
            <td style={tdRight}>{renderInput(l.montantDevises, v => updateEcart(setter, i, 'montantDevises', v))}</td>
            <td style={tdRight}>{renderInput(l.coursAcquisition, v => updateEcart(setter, i, 'coursAcquisition', v))}</td>
            <td style={tdRight}>{renderInput(l.cours3112, v => updateEcart(setter, i, 'cours3112', v))}</td>
            <td style={{ ...tdRight, background: '#fafafa' }}>{variationCalc !== 0 ? fmtM(Math.abs(variationCalc)) : ''}</td>
          </tr>
        );
      })}
      {editing && (
        <tr className="no-print">
          <td colSpan={6} style={{ border: 'none', padding: '2px 0' }}>
            <button onClick={() => setter(prev => [...prev, emptyEcart()])} style={{ background: 'none', border: 'none', color: '#D4A843', cursor: 'pointer', fontSize: 11 }}><LuPlus size={12} /> Ajouter une ligne</button>
          </td>
        </tr>
      )}
    </>
  );

  const renderTransfertRows = (lignes: LigneTransfert[], setter: React.Dispatch<React.SetStateAction<LigneTransfert[]>>, sectionLabel: string) => (
    <>
      <tr>
        <td style={{ ...tdStyle, fontWeight: 600, fontStyle: 'italic' }} colSpan={4}>{sectionLabel}</td>
      </tr>
      {lignes.map((l, i) => (
        <tr key={i}>
          <td style={tdStyle}>
            {editing ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <input value={l.libelle} onChange={e => updateTransfert(setter, i, 'libelle', e.target.value)} style={inputLeft} />
                <button onClick={() => setter(prev => prev.filter((_, j) => j !== i))} style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer', padding: 2, flexShrink: 0 }}><LuTrash2 size={12} /></button>
              </div>
            ) : l.libelle}
          </td>
          <td style={tdRight}>{renderInput(l.anneeN, v => updateTransfert(setter, i, 'anneeN', v))}</td>
          <td style={tdRight}>{renderInput(l.anneeN1, v => updateTransfert(setter, i, 'anneeN1', v))}</td>
          <td style={{ ...tdRight, background: '#fafafa' }}>
            {(() => { const n = parseN(l.anneeN); const n1 = parseN(l.anneeN1); return n1 !== 0 ? ((n - n1) / Math.abs(n1) * 100).toFixed(1) + ' %' : ''; })()}
          </td>
        </tr>
      ))}
      {editing && (
        <tr className="no-print">
          <td colSpan={4} style={{ border: 'none', padding: '2px 0' }}>
            <button onClick={() => setter(prev => [...prev, emptyTransfert()])} style={{ background: 'none', border: 'none', color: '#D4A843', cursor: 'pointer', fontSize: 11 }}><LuPlus size={12} /> Ajouter une ligne</button>
          </td>
        </tr>
      )}
    </>
  );

  return (
    <div>
      <NoteToolbar
        title="Note 12 — Ecarts de conversion et Transferts de charges"
        exercices={exercices} selectedExercice={selectedExercice} onSelectExercice={setSelectedExercice}
        editing={editing} saving={saving} saved={saved}
        onEdit={() => setEditing(true)} onSave={handleSave} onPreview={pdf.openPreview} onBack={onBack}
      />

      {pdf.previewUrl && (
        <PDFPreviewModal previewUrl={pdf.previewUrl} title="Apercu — Note 12" onClose={pdf.closePreview} onDownload={pdf.downloadPDF} onPrint={pdf.printPDF} />
      )}

      <BalanceSourcePanel
        lignes={lignesN}
        groups={[
          { label: 'Ecarts de conversion actif (478)', prefixes: ['478'] },
          { label: 'Ecarts de conversion passif (479)', prefixes: ['479'] },
          { label: 'Transferts charges exploitation (781)', prefixes: ['781'] },
          { label: 'Transferts charges financieres (787)', prefixes: ['787'] },
        ]}
        title="Soldes balance — Ecarts de conversion et Transferts"
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
          NOTE 12 — ECARTS DE CONVERSION
        </h3>

        {/* Tableau Ecarts de conversion */}
        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 0 }}>
          <thead>
            <tr>
              <th style={{ ...thStyle, width: '30%' }}>Libelles</th>
              <th style={thStyle}>Devises</th>
              <th style={thStyle}>Montant en devises</th>
              <th style={thStyle}>Cours UML Annee acquisition</th>
              <th style={thStyle}>Cours UML 31/12</th>
              <th style={thStyle}>Variation en valeur absolue</th>
            </tr>
          </thead>
          <tbody>
            {renderEcartRows(ecartsActif, setEcartsActif, 'Ecarts de conversion actif : detailler les creances et dettes concernees')}
            {renderEcartRows(ecartsPassif, setEcartsPassif, 'Ecart de conversion passif : detailler les creances et dettes concernees')}
          </tbody>
        </table>

        {/* Commentaire ecarts */}
        <div style={{ border: '0.5px solid #000', borderTop: 'none', padding: '10px 12px', marginBottom: 20 }}>
          <p style={{ fontSize: 12, fontWeight: 700, marginBottom: 6, marginTop: 0 }}>Commentaire :</p>
          <EditableComment value={commentaireEcarts} onChange={setCommentaireEcarts} editing={editing} minHeight={40} />
        </div>

        {/* Titre Transferts */}
        <div style={{ textAlign: 'center', fontWeight: 700, fontSize: 14, margin: '16px 0 8px' }}>TRANSFERTS DE CHARGES</div>

        {/* Tableau Transferts de charges */}
        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 0 }}>
          <thead>
            <tr>
              <th style={{ ...thStyle, width: '50%' }}>Libelles</th>
              <th style={thStyle}>Annee N</th>
              <th style={thStyle}>Annee N-1</th>
              <th style={thStyle}>Variation en %</th>
            </tr>
          </thead>
          <tbody>
            {renderTransfertRows(transfertsExploitation, setTransfertsExploitation, 'Transferts de charges d\'exploitation : detailler la nature des charges transferees')}
            {renderTransfertRows(transfertsFinancieres, setTransfertsFinancieres, 'Transferts de charges financieres : detailler la nature des charges transferees')}
          </tbody>
        </table>

        {/* Commentaire transferts */}
        <div style={{ border: '0.5px solid #000', borderTop: 'none', padding: '10px 12px' }}>
          <p style={{ fontSize: 12, fontWeight: 700, marginBottom: 6, marginTop: 0 }}>Commentaire :</p>
          <EditableComment value={commentaireTransferts} onChange={setCommentaireTransferts} editing={editing} minHeight={40} />
        </div>
      </div>
    </div>
  );
}

export default Note12;
