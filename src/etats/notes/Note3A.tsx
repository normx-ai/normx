import React, { useState, useRef, useEffect } from 'react';
import { LuDownload, LuArrowLeft, LuEye, LuX, LuPrinter, LuSave, LuPenLine, LuInfo, LuEyeOff } from 'react-icons/lu';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import '../BilanSYCEBNL.css';
import '../FicheIdentification.css';
import type { EtatBaseProps, BalanceLigne } from '../../types';
import { useNoteData } from './useNoteData';
import BalanceSourcePanel from './BalanceSourcePanel';

interface Note3AProps extends EtatBaseProps {
  onGoToParametres?: () => void;
}

interface Rubrique {
  label: string;
  prefixes: string[];
  bold?: boolean;
  isTotal?: boolean;
}

// Rubriques fidèles au PDF officiel SYSCOHADA
const ALL_RUBRIQUES: Rubrique[] = [
  // INCORPORELLES
  { label: 'IMMOBILISATIONS INCORPORELLES', prefixes: ['21'], bold: true },
  { label: 'Frais de développement et de prospection', prefixes: ['211'] },
  { label: 'Brevets, licences, logiciels, et droits similaires', prefixes: ['212', '213'] },
  { label: 'Fonds commercial et droit au bail', prefixes: ['215', '216'] },
  { label: 'Autres immobilisations incorporelles', prefixes: ['214', '217', '218', '219'] },
  // CORPORELLES
  { label: 'IMMOBILISATIONS CORPORELLES', prefixes: ['22', '23', '24'], bold: true },
  { label: 'Terrains hors immeuble de placement', prefixes: ['221', '222', '223', '225', '226', '227', '228', '229'] },
  { label: 'Terrains - immeuble de placement', prefixes: ['224'] },
  { label: 'Bâtiments hors immeuble de placement', prefixes: ['231', '232', '233'] },
  { label: 'Bâtiments - immeuble de placement', prefixes: ['234'] },
  { label: 'Aménagements, agencements et installations', prefixes: ['235', '236', '237', '238', '239'] },
  { label: 'Matériel, mobilier et actifs biologiques', prefixes: ['241', '242', '243', '244', '246'] },
  { label: 'Matériel de transport', prefixes: ['245'] },
  { label: 'Agencements, aménagements matériel et autres', prefixes: ['247', '248', '249'] },
  // AVANCES
  { label: 'AVANCES ET ACOMPTES VERSES SUR IMMOBILISATIONS', prefixes: ['25'], bold: true },
  { label: 'Immobilisations incorporelles', prefixes: ['251'] },
  { label: 'Immobilisations corporelles', prefixes: ['252'] },
  // FINANCIERES
  { label: 'IMMOBILISATIONS FINANCIERES', prefixes: ['26', '27'], bold: true },
  { label: 'Titres de participation', prefixes: ['26'] },
  { label: 'Autres immobilisations financières', prefixes: ['27'] },
  // TOTAL
  { label: 'TOTAL GENERAL', prefixes: [], bold: true, isTotal: true },
];

function Note3A({ entiteName, entiteNif = '', entiteId, offre, onBack }: Note3AProps): React.JSX.Element {
  const {
    exercices, selectedExercice, setSelectedExercice,
    params, previewUrl, setPreviewUrl,
    pdfBlob, setPdfBlob, editing, setEditing,
    saving, saved, saveParams, annee, dateFin: dateFinStr, duree,
  } = useNoteData({ entiteId });

  const [lignesN, setLignesN] = useState<BalanceLigne[]>([]);
  const [hideEmpty, setHideEmpty] = useState(false);
  const DEFAULT_COMMENTAIRE = `• Toute variation significative doit être commentée.
• Détailler les éléments constitutifs du fonds commercial et indiquer la date d'acquisition.
• Pour l'immobilisation incorporelle relative à la concession faire un descriptif de l'accord.
• Indiquer :
  - la nature de la créance ;
  - la durée de la concession ;
  - l'échéance.
• Indiquer les créances du groupe avec nature et date d'échéance.
• Pour les banques, DAT indiquer le nom de la banque le montant et la date d'échéance.`;
  const [commentaire, setCommentaire] = useState(DEFAULT_COMMENTAIRE);
  const [adjustments, setAdjustments] = useState<Record<string, Record<string, number>>>({});

  const pageRef = useRef<HTMLDivElement>(null);

  const setAdj = (label: string, field: string, value: number) => {
    setAdjustments(prev => ({
      ...prev,
      [label]: { ...(prev[label] || {}), [field]: value },
    }));
  };

  const getAdj = (label: string, field: string): number => {
    return adjustments[label]?.[field] || 0;
  };

  // Initialiser les champs editables depuis les params charges
  useEffect(() => {
    if (!params || Object.keys(params).length === 0) return;
    setCommentaire(params['note3a_commentaire'] || DEFAULT_COMMENTAIRE);
    if (params['note3a_adjustments']) {
      try { setAdjustments(JSON.parse(params['note3a_adjustments'])); } catch { /* */ }
    }
  }, [params]);

  const balanceSource = offre === 'comptabilite' ? 'ecritures' : 'import';
  useEffect(() => {
    if (!entiteId || !selectedExercice) return;
    const load = async () => {
      try {
        let lignes: BalanceLigne[] = [];
        if (balanceSource === 'ecritures') {
          const res = await fetch('/api/ecritures/balance/' + entiteId + '/' + selectedExercice.id);
          const data = await res.json();
          lignes = data.lignes || [];
        } else {
          const res = await fetch('/api/balance/' + entiteId + '/' + selectedExercice.id + '/N');
          const data = await res.json();
          lignes = data.lignes || [];
        }
        setLignesN(lignes);
      } catch { setLignesN([]); }
    };
    load();
  }, [entiteId, selectedExercice, balanceSource]);

  const handleSave = async () => {
    const data: Record<string, string> = {
      ...params,
      note3a_commentaire: commentaire,
      note3a_adjustments: JSON.stringify(adjustments),
    };
    await saveParams(data);
  };

  const dateFin = dateFinStr ? new Date(dateFinStr) : null;

  const fmtDateShort = (d: Date | null): string => {
    if (!d) return '';
    return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  const fmtM = (val: number): string => {
    if (val === 0) return '0';
    return Math.round(val).toLocaleString('fr-FR');
  };

  // Valeurs de base depuis la balance
  const computeForPrefixes = (prefixes: string[]) => {
    let siDebit = 0;
    let debit = 0;
    let credit = 0;

    for (const l of lignesN) {
      const num = (l.numero_compte || '').trim();
      if (!prefixes.some(p => num.startsWith(p))) continue;
      siDebit += parseFloat(String(l.si_debit)) || 0;
      debit += parseFloat(String(l.debit)) || 0;
      credit += parseFloat(String(l.credit)) || 0;
    }

    return { a: siDebit, acq: debit, cess: credit };
  };

  // Pour chaque ligne détail : valeur = base_balance + ajustement manuel
  // Toutes les colonnes sont ajustables pour équilibrer
  const computeRow = (label: string, prefixes: string[]) => {
    const base = computeForPrefixes(prefixes);
    const a = base.a + getAdj(label, 'a_adj');
    const acq = base.acq + getAdj(label, 'acq_adj');
    const vir_aug = getAdj(label, 'vir_aug');
    const reeval = getAdj(label, 'reeval');
    const cess = base.cess + getAdj(label, 'cess_adj');
    const vir_dim = getAdj(label, 'vir_dim');
    const d = a + acq + vir_aug + reeval - cess - vir_dim;
    return { a, acq, vir_aug, reeval, cess, vir_dim, d };
  };

  // Lignes de détail (non bold, non total)
  const detailRows = ALL_RUBRIQUES.filter(r => !r.bold && !r.isTotal);

  const sumChildren = (children: Rubrique[]) => {
    return children.reduce((acc, dr) => {
      const v = computeRow(dr.label, dr.prefixes);
      return {
        a: acc.a + v.a, acq: acc.acq + v.acq,
        vir_aug: acc.vir_aug + v.vir_aug, reeval: acc.reeval + v.reeval,
        cess: acc.cess + v.cess, vir_dim: acc.vir_dim + v.vir_dim, d: acc.d + v.d,
      };
    }, { a: 0, acq: 0, vir_aug: 0, reeval: 0, cess: 0, vir_dim: 0, d: 0 });
  };

  const rows = ALL_RUBRIQUES.map(r => {
    if (r.isTotal) {
      return { ...r, vals: sumChildren(detailRows) };
    }
    if (r.bold) {
      const idx = ALL_RUBRIQUES.indexOf(r);
      const children: Rubrique[] = [];
      for (let i = idx + 1; i < ALL_RUBRIQUES.length; i++) {
        if (ALL_RUBRIQUES[i].bold || ALL_RUBRIQUES[i].isTotal) break;
        children.push(ALL_RUBRIQUES[i]);
      }
      return { ...r, vals: sumChildren(children) };
    }
    return { ...r, vals: computeRow(r.label, r.prefixes) };
  });

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

  const openPreview = async () => {
    const pdf = await generatePDF();
    const blob = pdf.output('blob');
    setPdfBlob(blob);
    setPreviewUrl(URL.createObjectURL(blob));
  };

  const closePreview = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setPdfBlob(null);
  };

  const downloadPDF = () => {
    if (!pdfBlob) return;
    const url = URL.createObjectURL(pdfBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'Note3A_' + annee + '.pdf';
    a.click();
    URL.revokeObjectURL(url);
  };

  const printPDF = () => {
    if (!previewUrl) return;
    const w = window.open(previewUrl);
    if (w) { w.onload = () => w.print(); }
  };

  const thStyle: React.CSSProperties = {
    border: '0.5px solid #000', padding: '5px 8px', fontSize: 12,
    fontWeight: 600, textAlign: 'center', verticalAlign: 'middle', background: '#f5f5f5',
  };
  const tdStyle: React.CSSProperties = {
    border: '0.5px solid #000', padding: '5px 8px', fontSize: 12, verticalAlign: 'middle',
  };
  const tdRight: React.CSSProperties = {
    ...tdStyle, textAlign: 'right', fontVariantNumeric: 'tabular-nums',
  };

  return (
    <div>
      <div className="etat-toolbar">
        <button className="etat-back-btn" onClick={onBack}><LuArrowLeft size={18} /> Retour</button>
        <div className="etat-toolbar-title">Note 3A — Immobilisation brute</div>
        <div className="etat-toolbar-actions">
          <select className="etat-exercice-select" value={selectedExercice?.id || ''}
            onChange={e => { const ex = exercices.find(ex => ex.id === Number(e.target.value)); if (ex) setSelectedExercice(ex); }}>
            {exercices.map(ex => (<option key={ex.id} value={ex.id}>{ex.annee}</option>))}
          </select>
          {!editing ? (
            <button className="etat-action-btn" onClick={() => setEditing(true)} style={{ background: '#D4A843', color: '#fff', border: 'none' }}>
              <LuPenLine size={16} /> Modifier
            </button>
          ) : (
            <button className="etat-action-btn" onClick={handleSave} disabled={saving} style={{ background: '#059669', color: '#fff', border: 'none' }}>
              <LuSave size={16} /> {saving ? 'Sauvegarde...' : 'Sauvegarder'}
            </button>
          )}
          <button className="etat-action-btn" onClick={openPreview}><LuEye size={16} /> Aperçu</button>
          <button className="etat-action-btn" onClick={() => setHideEmpty(!hideEmpty)} style={{ background: hideEmpty ? '#1A3A5C' : '#e5e7eb', color: hideEmpty ? '#fff' : '#333', border: 'none' }}><LuEyeOff size={16} /> {hideEmpty ? 'Afficher tout' : 'Masquer vides'}</button>
        </div>
      </div>

      {previewUrl && (
        <div className="etat-preview-overlay" onClick={closePreview}>
          <div className="etat-preview-modal" onClick={e => e.stopPropagation()}>
            <div className="etat-preview-header">
              <span>Aperçu — Note 3A</span>
              <div className="etat-preview-actions">
                <button onClick={printPDF} title="Imprimer"><LuPrinter size={18} /></button>
                <button onClick={downloadPDF} title="Télécharger"><LuDownload size={18} /></button>
                <button onClick={closePreview}><LuX size={18} /></button>
              </div>
            </div>
            <iframe src={previewUrl} className="etat-preview-iframe" title="Aperçu Note 3A" />
          </div>
        </div>
      )}

      {/* Bulle d'information */}
      <div style={{ margin: '12px 20px', padding: '12px 16px', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 8, fontSize: 12, color: '#1e40af', lineHeight: 1.6 }}>
        <div style={{ fontWeight: 700, marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
          <LuInfo size={14} /> Note d'information — Note 3A
        </div>
        <ul style={{ margin: 0, paddingLeft: 18 }}>
          <li><strong>Brut A :</strong> Valeur brute des immobilisations au début de l'exercice (solde initial débiteur des comptes 2x).</li>
          <li><strong>Acquisitions :</strong> Mouvements débit de l'exercice (nouvelles acquisitions, transferts d'en-cours).</li>
          <li><strong>Cessions / Retraits :</strong> Mouvements crédit de l'exercice (sorties d'actif, mises au rebut).</li>
          <li><strong>Brut B :</strong> Calculé automatiquement = Brut A + Acquisitions - Cessions.</li>
          <li>Toute variation significative doit être commentée dans la zone commentaire.</li>
        </ul>
      </div>

      <BalanceSourcePanel
        lignes={lignesN}
        groups={ALL_RUBRIQUES.filter(r => !r.bold && !r.isTotal).map(r => ({ label: r.label, prefixes: r.prefixes }))}
        title="Soldes balance — Immobilisations brutes"
      />

      <div ref={pageRef} style={{
        width: '297mm', minHeight: '210mm', background: '#fff',
        margin: '0 auto 20px', padding: '8mm 10mm',
        boxShadow: '0 2px 12px rgba(0,0,0,0.1)', boxSizing: 'border-box',
        fontFamily: "'Inter', 'Segoe UI', Arial, sans-serif", fontSize: 12, color: '#1a1a1a',
      }}>
        {/* Header officiel comme Bilan/CR */}
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
          NOTE 3A — IMMOBILISATION BRUTE
        </h3>

        {/* Tableau */}
        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 10 }}>
          <thead>
            <tr>
              <th rowSpan={2} style={{ ...thStyle, width: '28%', textAlign: 'left' }}>
                <div>SITUATIONS ET MOUVEMENTS</div>
                <div style={{ marginTop: 8 }}>RUBRIQUES</div>
              </th>
              <th rowSpan={2} style={{ ...thStyle, width: '10%' }}>
                <span style={{ fontSize: 10 }}>MONTANT BRUT<br />A L'OUVERTURE<br />DE L'EXERCICE</span>
              </th>
              <th colSpan={3} style={thStyle}>AUGMENTATIONS</th>
              <th colSpan={2} style={thStyle}>DIMINUTIONS</th>
              <th rowSpan={2} style={{ ...thStyle, width: '10%' }}>
                <span style={{ fontSize: 10 }}>MONTANT BRUT<br />A LA CLOTURE<br />DE L'EXERCICE</span>
              </th>
            </tr>
            <tr>
              <th style={{ ...thStyle, width: '9%' }}><span style={{ fontSize: 10 }}>Acquisitions<br />Apports<br />Créations</span></th>
              <th style={{ ...thStyle, width: '8%' }}><span style={{ fontSize: 10 }}>Virements de<br />poste à poste</span></th>
              <th style={{ ...thStyle, width: '9%' }}><span style={{ fontSize: 10 }}>Suite à une<br />réévaluation<br />pratiquée au cours<br />de l'exercice</span></th>
              <th style={{ ...thStyle, width: '9%' }}><span style={{ fontSize: 10 }}>Cessions Scissions<br />Hors service</span></th>
              <th style={{ ...thStyle, width: '8%' }}><span style={{ fontSize: 10 }}>Virements de<br />poste à poste</span></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => {
              const isBold = r.bold || r.isTotal;
              const isDetail = !r.bold && !r.isTotal;
              if (hideEmpty && isDetail && r.vals.a === 0 && r.vals.acq === 0 && r.vals.cess === 0 && r.vals.d === 0) return null;
              const bgStyle = isBold ? { background: '#f0f0f0' } : {};
              const fw = isBold ? 700 : 400;
              const inputSt: React.CSSProperties = { width: '100%', padding: '1px 3px', fontSize: 12, border: '1px solid #D4A843', borderRadius: 2, background: '#fffbf0', textAlign: 'right', boxSizing: 'border-box' };

              // Cellule éditable : affiche la valeur complète (balance + ajustement)
              // Quand l'utilisateur modifie, on stocke la différence avec la base balance
              const editableCell = (adjField: string, displayVal: number, baseBalance: number) => {
                if (!editing || !isDetail) return fmtM(displayVal);
                return (
                  <input type="number" value={displayVal || ''} onChange={e => {
                    const newVal = parseFloat(e.target.value) || 0;
                    setAdj(r.label, adjField, newVal - baseBalance);
                  }}
                    placeholder="0" style={inputSt} />
                );
              };

              // Base balance pour chaque rubrique détail
              const base = isDetail ? computeForPrefixes(r.prefixes) : { a: 0, acq: 0, cess: 0 };

              return (
                <tr key={i}>
                  <td style={{ ...tdStyle, fontWeight: fw, ...bgStyle }}>{r.label}</td>
                  {/* A = Montant ouverture — NON EDITABLE */}
                  <td style={{ ...tdRight, fontWeight: fw, ...bgStyle }}>{fmtM(r.vals.a)}</td>
                  {/* Acquisitions — éditable, pré-rempli avec valeur balance */}
                  <td style={{ ...tdRight, fontWeight: fw, ...bgStyle }}>{editableCell('acq_adj', r.vals.acq, base.acq)}</td>
                  {/* Virements augmentation — éditable (pas de base balance) */}
                  <td style={{ ...tdRight, fontWeight: fw, ...bgStyle }}>{editableCell('vir_aug', r.vals.vir_aug, 0)}</td>
                  {/* Réévaluation — éditable (pas de base balance) */}
                  <td style={{ ...tdRight, fontWeight: fw, ...bgStyle }}>{editableCell('reeval', r.vals.reeval, 0)}</td>
                  {/* Cessions — éditable, pré-rempli avec valeur balance */}
                  <td style={{ ...tdRight, fontWeight: fw, ...bgStyle }}>{editableCell('cess_adj', r.vals.cess, base.cess)}</td>
                  {/* Virements diminution — éditable (pas de base balance) */}
                  <td style={{ ...tdRight, fontWeight: fw, ...bgStyle }}>{editableCell('vir_dim', r.vals.vir_dim, 0)}</td>
                  {/* D = Montant clôture — NON EDITABLE (calculé) */}
                  <td style={{ ...tdRight, fontWeight: fw, ...bgStyle }}>{fmtM(r.vals.d)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {/* Commentaire */}
        <div>
          <p style={{ fontSize: 12, fontWeight: 700, textDecoration: 'underline', marginBottom: 6, marginTop: 0 }}>Commentaire :</p>
          {editing ? (
            <textarea
              value={commentaire}
              onChange={e => setCommentaire(e.target.value)}
              style={{
                width: '100%', minHeight: 80, padding: '6px 8px', fontSize: 10,
                fontStyle: 'italic', lineHeight: '1.6', border: '1px solid #D4A843',
                borderRadius: 4, background: '#fffbf0', fontFamily: 'inherit',
                boxSizing: 'border-box', resize: 'vertical',
              }}
            />
          ) : (
            <div style={{ fontSize: 10, fontStyle: 'italic', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
              {commentaire}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Note3A;
