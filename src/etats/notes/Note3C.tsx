import React, { useState, useRef, useEffect } from 'react';
import { LuDownload, LuArrowLeft, LuEye, LuX, LuPrinter, LuSave, LuPenLine, LuInfo, LuEyeOff } from 'react-icons/lu';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import '../BilanSYCEBNL.css';
import '../FicheIdentification.css';
import type { Exercice, EtatBaseProps, BalanceLigne } from '../../types';

interface Note3CProps extends EtatBaseProps {
  onGoToParametres?: () => void;
}

interface Rubrique {
  label: string;
  prefixes: string[];
  bold?: boolean;
  isSousTotal?: boolean;
  isTotal?: boolean;
  isSeparator?: boolean;
}

// Rubriques fidèles au PDF officiel SYSCOHADA — Amortissements comptes 28x
const ALL_RUBRIQUES: Rubrique[] = [
  // INCORPORELLES
  { label: 'Frais de développement et de prospection', prefixes: ['2811'] },
  { label: 'Brevets, licences, logiciels et droits similaires', prefixes: ['2812', '2813'] },
  { label: 'Fonds commercial et droit au bail', prefixes: ['2815', '2816'] },
  { label: 'Autres immobilisations incorporelles', prefixes: ['2814', '2817', '2818', '2819'] },
  { label: 'SOUS TOTAL : IMMOBILISATIONS INCORPORELLES', prefixes: [], bold: true, isSousTotal: true },
  { label: '', prefixes: [], isSeparator: true },
  // CORPORELLES
  { label: 'Terrains hors immeuble de placement', prefixes: ['2821', '2822', '2823'] },
  { label: 'Terrains - immeuble de placement', prefixes: ['2824'] },
  { label: 'Bâtiments hors immeuble de placement', prefixes: ['2831', '2832', '2833'] },
  { label: 'Bâtiments - immeuble de placement', prefixes: ['2834'] },
  { label: 'Aménagements, agencements et installations', prefixes: ['2835', '2836', '2837', '2838'] },
  { label: 'Matériel, mobilier et actifs biologiques', prefixes: ['2841', '2842', '2843', '2844'] },
  { label: 'Matériel de transport', prefixes: ['2845'] },
  { label: 'SOUS TOTAL : IMMOBILISATIONS CORPORELLES', prefixes: [], bold: true, isSousTotal: true },
  { label: '', prefixes: [], isSeparator: true },
  // TOTAL
  { label: 'TOTAL GENERAL', prefixes: [], bold: true, isTotal: true },
];

const DEFAULT_COMMENTAIRE = `Indiquer
  - les modes d'amortissement utilisés ;
  - la durée de vie ou les taux d'amortissements utilisés.`;

function Note3C({ entiteName, entiteNif = '', entiteId, offre, onBack }: Note3CProps): React.JSX.Element {
  const [exercices, setExercices] = useState<Exercice[]>([]);
  const [selectedExercice, setSelectedExercice] = useState<Exercice | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [pdfBlob, setPdfBlob] = useState<Blob | null>(null);
  const [params, setParams] = useState<Record<string, string>>({});
  const [lignesN, setLignesN] = useState<BalanceLigne[]>([]);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [hideEmpty, setHideEmpty] = useState(false);
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

  useEffect(() => {
    if (!entiteId) return;
    fetch('/api/entites/' + entiteId)
      .then(r => r.json())
      .then(ent => {
        const data = ent.data || {};
        setParams(data);
        setCommentaire(data['note3c_commentaire'] || DEFAULT_COMMENTAIRE);
        if (data['note3c_adjustments']) {
          try { setAdjustments(JSON.parse(data['note3c_adjustments'])); } catch { /* */ }
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
        }
      })
      .catch(() => {});
  }, [entiteId]);

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
    setSaving(true);
    try {
      const data: Record<string, string> = {
        ...params,
        note3c_commentaire: commentaire,
        note3c_adjustments: JSON.stringify(adjustments),
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

  const fmtM = (val: number): string => {
    if (val === 0) return '0';
    return Math.round(val).toLocaleString('fr-FR');
  };

  // Valeurs depuis la balance pour comptes 28x (amortissements)
  const computeForPrefixes = (prefixes: string[]) => {
    let siCredit = 0; // A — amortissements cumulés ouverture
    let credit = 0;   // B — dotations de l'exercice
    let debit = 0;    // C base — diminutions

    for (const l of lignesN) {
      const num = (l.numero_compte || '').trim();
      if (!prefixes.some(p => num.startsWith(p))) continue;
      siCredit += parseFloat(String(l.si_credit)) || 0;
      credit += parseFloat(String(l.credit)) || 0;
      debit += parseFloat(String(l.debit)) || 0;
    }

    return { a: siCredit, b: credit, c: debit };
  };

  const computeRow = (label: string, prefixes: string[]) => {
    const base = computeForPrefixes(prefixes);
    const c = base.c + getAdj(label, 'c_adj');
    const d = base.a + base.b - c;
    return { a: base.a, b: base.b, c, d, baseC: base.c };
  };

  // Lignes de détail (pas sous-totaux, pas séparateurs, pas total)
  const detailRows = ALL_RUBRIQUES.filter(r => !r.isSousTotal && !r.isTotal && !r.isSeparator);
  const incorpRows = detailRows.slice(0, 4);
  const corpRows = detailRows.slice(4);

  const sumRows = (rows: Rubrique[]) => {
    return rows.reduce((acc, r) => {
      const v = computeRow(r.label, r.prefixes);
      return { a: acc.a + v.a, b: acc.b + v.b, c: acc.c + v.c, d: acc.d + v.d };
    }, { a: 0, b: 0, c: 0, d: 0 });
  };

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
    a.download = 'Note3C_' + annee + '.pdf';
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
  const inputSt: React.CSSProperties = {
    width: '100%', padding: '1px 3px', fontSize: 12, border: '1px solid #D4A843',
    borderRadius: 2, background: '#fffbf0', textAlign: 'right', boxSizing: 'border-box',
  };

  return (
    <div>
      <div className="etat-toolbar">
        <button className="etat-back-btn" onClick={onBack}><LuArrowLeft size={18} /> Retour</button>
        <div className="etat-toolbar-title">Note 3C — Immobilisations (Amortissements)</div>
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
              <span>Aperçu — Note 3C</span>
              <div className="etat-preview-actions">
                <button onClick={printPDF} title="Imprimer"><LuPrinter size={18} /></button>
                <button onClick={downloadPDF} title="Télécharger"><LuDownload size={18} /></button>
                <button onClick={closePreview}><LuX size={18} /></button>
              </div>
            </div>
            <iframe src={previewUrl} className="etat-preview-iframe" title="Aperçu Note 3C" />
          </div>
        </div>
      )}

      {/* Bulle d'information */}
      <div style={{ margin: '12px 20px', padding: '12px 16px', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 8, fontSize: 12, color: '#1e40af', lineHeight: 1.6 }}>
        <div style={{ fontWeight: 700, marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
          <LuInfo size={14} /> Note d'information — Note 3C
        </div>
        <ul style={{ margin: 0, paddingLeft: 18 }}>
          <li><strong>Amort. A :</strong> Cumul des amortissements au début de l'exercice (solde initial créditeur des comptes 28x).</li>
          <li><strong>Dotations :</strong> Dotations aux amortissements de l'exercice (comptes 681x).</li>
          <li><strong>Reprises :</strong> Amortissements repris lors des cessions ou mises au rebut.</li>
          <li><strong>Amort. B :</strong> Calculé = Amort. A + Dotations - Reprises.</li>
          <li>Les amortissements dérogatoires (compte 151) ne figurent pas ici mais dans la Note 15A.</li>
        </ul>
      </div>

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
          NOTE 3C — IMMOBILISATIONS (AMORTISSEMENTS)
        </h3>

        {/* Tableau */}
        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 12 }}>
          <thead>
            <tr>
              <th rowSpan={2} style={{ ...thStyle, width: '30%', textAlign: 'left' }}>
                <div style={{ fontWeight: 700 }}>SITUATIONS ET MOUVEMENTS</div>
                <div style={{ marginTop: 6, fontWeight: 700 }}>RUBRIQUES</div>
              </th>
              <th style={{ ...thStyle, width: '18%' }}>A</th>
              <th style={{ ...thStyle, width: '18%' }}>B</th>
              <th style={{ ...thStyle, width: '16%' }}>C<br /><span style={{ fontSize: 10 }}>DIMINUTIONS</span></th>
              <th style={{ ...thStyle, width: '18%' }}>D = A + B - C</th>
            </tr>
            <tr>
              <th style={{ ...thStyle, fontSize: 10 }}>
                AMORTISSEMENTS<br />CUMULES<br />A L'OUVERTURE<br />DE L'EXERCICE
              </th>
              <th style={{ ...thStyle, fontSize: 10 }}>
                AUGMENTATIONS :<br />DOTATIONS DE<br />L'EXERCICE
              </th>
              <th style={{ ...thStyle, fontSize: 10 }}>
                Amortissements<br />relatifs aux<br />éléments sortis<br />de l'actif
              </th>
              <th style={{ ...thStyle, fontSize: 10 }}>
                CUMUL DES<br />AMORTISSEMENTS<br />A LA CLOTURE<br />DE L'EXERCICE
              </th>
            </tr>
          </thead>
          <tbody>
            {ALL_RUBRIQUES.map((r, i) => {
              // Séparateur
              if (r.isSeparator) {
                return <tr key={i}><td colSpan={5} style={{ ...tdStyle, height: 4, padding: 0 }}></td></tr>;
              }

              // Sous-total
              if (r.isSousTotal) {
                const isIncorp = r.label.includes('INCORPORELLES');
                const sourceRows = isIncorp ? incorpRows : corpRows;
                const vals = sumRows(sourceRows);
                return (
                  <tr key={i}>
                    <td style={{ ...tdStyle, fontWeight: 700 }}>{r.label}</td>
                    <td style={{ ...tdRight, fontWeight: 700 }}>{fmtM(vals.a)}</td>
                    <td style={{ ...tdRight, fontWeight: 700 }}>{fmtM(vals.b)}</td>
                    <td style={{ ...tdRight, fontWeight: 700 }}>{fmtM(vals.c)}</td>
                    <td style={{ ...tdRight, fontWeight: 700 }}>{fmtM(vals.d)}</td>
                  </tr>
                );
              }

              // Total général
              if (r.isTotal) {
                const vals = sumRows(detailRows);
                return (
                  <tr key={i} style={{ borderTop: '2px solid #000' }}>
                    <td style={{ ...tdStyle, fontWeight: 700 }}>{r.label}</td>
                    <td style={{ ...tdRight, fontWeight: 700 }}>{fmtM(vals.a)}</td>
                    <td style={{ ...tdRight, fontWeight: 700 }}>{fmtM(vals.b)}</td>
                    <td style={{ ...tdRight, fontWeight: 700 }}>{fmtM(vals.c)}</td>
                    <td style={{ ...tdRight, fontWeight: 700 }}>{fmtM(vals.d)}</td>
                  </tr>
                );
              }

              // Ligne de détail
              const vals = computeRow(r.label, r.prefixes);
              if (hideEmpty && vals.a === 0 && vals.b === 0 && vals.c === 0 && vals.d === 0) return null;
              return (
                <tr key={i}>
                  <td style={tdStyle}>{r.label}</td>
                  <td style={tdRight}>{fmtM(vals.a)}</td>
                  <td style={tdRight}>{fmtM(vals.b)}</td>
                  <td style={tdRight}>
                    {editing ? (
                      <input type="number" value={vals.c || ''} onChange={e => {
                        const newVal = parseFloat(e.target.value) || 0;
                        setAdj(r.label, 'c_adj', newVal - vals.baseC);
                      }} placeholder="0" style={inputSt} />
                    ) : fmtM(vals.c)}
                  </td>
                  <td style={tdRight}>{fmtM(vals.d)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {/* Commentaire */}
        <div>
          <p style={{ fontSize: 12, fontWeight: 700, marginBottom: 6, marginTop: 0 }}>Commentaire :</p>
          {editing ? (
            <textarea
              value={commentaire}
              onChange={e => setCommentaire(e.target.value)}
              style={{
                width: '100%', minHeight: 80, padding: '6px 8px', fontSize: 12,
                fontStyle: 'italic', lineHeight: '1.6', border: '1px solid #D4A843',
                borderRadius: 4, background: '#fffbf0', fontFamily: 'inherit',
                boxSizing: 'border-box', resize: 'vertical',
              }}
            />
          ) : (
            <div style={{ fontSize: 12, fontStyle: 'italic', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
              {commentaire}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Note3C;
