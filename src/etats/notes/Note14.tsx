import React, { useState, useRef, useEffect } from 'react';
import { LuDownload, LuArrowLeft, LuEye, LuX, LuPrinter, LuSave, LuPenLine } from 'react-icons/lu';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import '../BilanSYCEBNL.css';
import '../FicheIdentification.css';
import type { Exercice, EtatBaseProps, BalanceLigne } from '../../types';

interface Note14Props extends EtatBaseProps {
  onGoToParametres?: () => void;
}

interface RubriquePrime {
  label: string;
  prefixes: string[];
  bold?: boolean;
  isTotal?: boolean;
}

const RUBRIQUES: RubriquePrime[] = [
  { label: 'Primes d\'apport', prefixes: ['1051'] },
  { label: 'Primes d\'émission', prefixes: ['1052'] },
  { label: 'Primes de fusion', prefixes: ['1053'] },
  { label: 'Primes de conversion', prefixes: ['1054'] },
  { label: 'Autres primes', prefixes: ['1058', '1059'] },
  { label: 'TOTAL PRIMES', prefixes: [], bold: true, isTotal: true },
  { label: 'Réserves légales', prefixes: ['111'] },
  { label: 'Réserves statutaires', prefixes: ['112'] },
  { label: 'Réserves de plus-values nettes à long terme', prefixes: ['113'] },
  { label: 'Réserves d\'attribution gratuite d\'actions au personnel salarié et aux dirigeants', prefixes: ['114'] },
  { label: 'Autres réserves réglementées', prefixes: ['118'] },
  { label: 'TOTAL RESERVES INDISPONIBLES', prefixes: [], bold: true, isTotal: true },
  { label: 'Réserves libres', prefixes: ['115'] },
  { label: 'Report à nouveau', prefixes: ['12'] },
];

function Note14({ entiteName, entiteNif = '', entiteId, offre, onBack }: Note14Props): React.JSX.Element {
  const [exercices, setExercices] = useState<Exercice[]>([]);
  const [selectedExercice, setSelectedExercice] = useState<Exercice | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [pdfBlob, setPdfBlob] = useState<Blob | null>(null);
  const [params, setParams] = useState<Record<string, string>>({});
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const [lignesN, setLignesN] = useState<BalanceLigne[]>([]);
  const [lignesN1, setLignesN1] = useState<BalanceLigne[]>([]);
  const [adjustments, setAdjustments] = useState<Record<string, Record<string, number>>>({});

  const DEFAULT_COMMENTAIRE = `• Indiquer les dates de l'AGE qui a décidé des primes d'apport, d'émission de fusion.\n• Indiquer le détail des réserves libres.\n• Indiquer le montant restant à doter et le taux de dotation de la réserve légale.\n• Indiquer la date de l'AGO qui justifie la variation des réserves et du report à nouveau.`;
  const [commentaire, setCommentaire] = useState(DEFAULT_COMMENTAIRE);

  const pageRef = useRef<HTMLDivElement>(null);

  const setAdj = (label: string, field: string, value: number) => {
    setAdjustments(prev => ({ ...prev, [label]: { ...(prev[label] || {}), [field]: value } }));
  };
  const getAdj = (label: string, field: string): number => adjustments[label]?.[field] || 0;

  useEffect(() => {
    if (!entiteId) return;
    fetch('/api/entites/' + entiteId)
      .then(r => r.json())
      .then(ent => {
        const data = ent.data || {};
        setParams(data);
        setCommentaire(data['note14_commentaire'] || DEFAULT_COMMENTAIRE);
        if (data['note14_adjustments']) {
          try { setAdjustments(JSON.parse(data['note14_adjustments'])); } catch { /* */ }
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
          const pick = data.find(e => e.annee === preferYear) || data.find(e => e.annee === year) || data.find(e => e.annee === year - 1) || data[0];
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

  const handleSave = async () => {
    setSaving(true);
    try {
      const data: Record<string, string> = {
        ...params,
        note14_adjustments: JSON.stringify(adjustments),
        note14_commentaire: commentaire,
      };
      const res = await fetch(`/api/entites/${entiteId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data }),
      });
      if (res.ok) { setParams(data); setSaved(true); setEditing(false); setTimeout(() => setSaved(false), 3000); }
    } catch { /* */ }
    setSaving(false);
  };

  const duree = selectedExercice?.duree_mois || 12;
  const dateFin = selectedExercice?.date_fin ? new Date(selectedExercice.date_fin) : null;
  const annee = selectedExercice ? selectedExercice.annee : new Date().getFullYear();
  const fmtDateShort = (d: Date | null): string => { if (!d) return ''; return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' }); };
  const fmtM = (val: number): string => { if (val === 0) return ''; return Math.round(val).toLocaleString('fr-FR'); };

  // Comptes créditeurs (capitaux propres)
  const computeForPrefixes = (lignes: BalanceLigne[], prefixes: string[]) => {
    let total = 0;
    for (const l of lignes) {
      const num = (l.numero_compte || '').trim();
      if (!prefixes.some(p => num.startsWith(p))) continue;
      total += (parseFloat(String(l.solde_crediteur)) || 0) - (parseFloat(String(l.solde_debiteur)) || 0);
    }
    return total;
  };

  const computeRow = (r: RubriquePrime) => {
    const n = computeForPrefixes(lignesN, r.prefixes) + getAdj(r.label, 'anneeN');
    const n1 = computeForPrefixes(lignesN1, r.prefixes) + getAdj(r.label, 'anneeN1');
    const variation = n1 !== 0 ? (n - n1) : 0;
    return { anneeN: n, anneeN1: n1, variation };
  };

  // Calcul des totaux
  const primesRows = RUBRIQUES.filter(r => !r.isTotal && RUBRIQUES.indexOf(r) < RUBRIQUES.findIndex(r2 => r2.label === 'TOTAL PRIMES'));
  const reservesIndispRows = RUBRIQUES.filter(r => !r.isTotal && RUBRIQUES.indexOf(r) > RUBRIQUES.findIndex(r2 => r2.label === 'TOTAL PRIMES') && RUBRIQUES.indexOf(r) < RUBRIQUES.findIndex(r2 => r2.label === 'TOTAL RESERVES INDISPONIBLES'));

  const sumRows = (rows: RubriquePrime[]) => rows.reduce((a, r) => {
    const v = computeRow(r);
    return { anneeN: a.anneeN + v.anneeN, anneeN1: a.anneeN1 + v.anneeN1 };
  }, { anneeN: 0, anneeN1: 0 });

  const totalPrimes = sumRows(primesRows);
  const totalReservesIndisp = sumRows(reservesIndispRows);

  const renderAdjInput = (label: string, field: string, baseValue: number) => {
    if (!editing) return fmtM(baseValue);
    const adj = getAdj(label, field);
    return <input value={adj || ''} onChange={e => { const v = e.target.value === '' ? 0 : parseFloat(e.target.value.replace(/\s/g, '').replace(',', '.')) || 0; setAdj(label, field, v); }} style={inputSt} placeholder={fmtM(baseValue - adj)} />;
  };

  // PDF
  const generatePDF = async (): Promise<jsPDF> => {
    const wasEditing = editing;
    if (wasEditing) setEditing(false);
    await new Promise(r => setTimeout(r, 100));
    const pdf = new jsPDF('p', 'mm', 'a4');
    if (!pageRef.current) return pdf;
    const canvas = await html2canvas(pageRef.current, { scale: 2, useCORS: true, backgroundColor: '#ffffff' });
    const imgData = canvas.toDataURL('image/png');
    const pdfWidth = 210;
    const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
    pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, Math.min(pdfHeight, 297));
    if (wasEditing) setEditing(true);
    return pdf;
  };

  const openPreview = async () => { const pdf = await generatePDF(); const blob = pdf.output('blob'); setPdfBlob(blob); setPreviewUrl(URL.createObjectURL(blob)); };
  const closePreview = () => { if (previewUrl) URL.revokeObjectURL(previewUrl); setPreviewUrl(null); setPdfBlob(null); };
  const downloadPDF = () => { if (!pdfBlob) return; const url = URL.createObjectURL(pdfBlob); const a = document.createElement('a'); a.href = url; a.download = 'Note14_' + annee + '.pdf'; a.click(); URL.revokeObjectURL(url); };
  const printPDF = () => { if (!previewUrl) return; const w = window.open(previewUrl); if (w) { w.onload = () => w.print(); } };

  const thStyle: React.CSSProperties = { border: '0.5px solid #000', padding: '5px 8px', fontSize: 11, fontWeight: 700, textAlign: 'center', verticalAlign: 'middle', background: '#f5f5f5' };
  const tdStyle: React.CSSProperties = { border: '0.5px solid #000', padding: '5px 8px', fontSize: 11, verticalAlign: 'middle' };
  const tdRight: React.CSSProperties = { ...tdStyle, textAlign: 'right', fontVariantNumeric: 'tabular-nums' };
  const tdBold: React.CSSProperties = { ...tdStyle, fontWeight: 700 };
  const tdBoldRight: React.CSSProperties = { ...tdRight, fontWeight: 700 };
  const inputSt: React.CSSProperties = { width: '100%', padding: '5px 8px', fontSize: 12, border: '1px solid #D4A843', borderRadius: 2, background: '#fffbf0', textAlign: 'right', boxSizing: 'border-box' };
  const textareaStyle: React.CSSProperties = { width: '100%', minHeight: 60, padding: '8px 10px', fontSize: 12, lineHeight: '1.6', border: '1px solid #D4A843', borderRadius: 3, background: '#fffbf0', fontFamily: 'inherit', boxSizing: 'border-box', resize: 'vertical' };

  const renderTotalRow = (label: string, totals: { anneeN: number; anneeN1: number }) => {
    const variation = totals.anneeN1 !== 0 ? (totals.anneeN - totals.anneeN1) : 0;
    return (
      <tr>
        <td style={{ ...tdBold, background: '#f0f0f0' }}>{label}</td>
        <td style={{ ...tdBoldRight, background: '#f0f0f0' }}>{fmtM(totals.anneeN)}</td>
        <td style={{ ...tdBoldRight, background: '#f0f0f0' }}>{fmtM(totals.anneeN1)}</td>
        <td style={{ ...tdBoldRight, background: '#f0f0f0' }}>{fmtM(variation)}</td>
      </tr>
    );
  };

  return (
    <div>
      <div className="etat-toolbar">
        <button className="etat-back-btn" onClick={onBack}><LuArrowLeft size={18} /> Retour</button>
        <div className="etat-toolbar-title">Note 14 — Primes et réserves</div>
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
              <span>Aperçu — Note 14</span>
              <div className="etat-preview-actions">
                <button onClick={printPDF} title="Imprimer"><LuPrinter size={18} /></button>
                <button onClick={downloadPDF} title="Télécharger"><LuDownload size={18} /></button>
                <button onClick={closePreview}><LuX size={18} /></button>
              </div>
            </div>
            <iframe src={previewUrl} className="etat-preview-iframe" title="Aperçu Note 14" />
          </div>
        </div>
      )}

      <div ref={pageRef} style={{
        width: '210mm', minHeight: '297mm', background: '#fff',
        margin: '0 auto 20px', padding: '8mm 10mm',
        boxShadow: '0 2px 12px rgba(0,0,0,0.1)', boxSizing: 'border-box',
        fontFamily: "'Outfit', 'Segoe UI', Arial, sans-serif", fontSize: 12, color: '#1a1a1a',
      }}>
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
          NOTE 14 — PRIMES ET RESERVES
        </h3>

        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 0 }}>
          <thead>
            <tr>
              <th style={{ ...thStyle, width: '50%' }}>Libellés</th>
              <th style={thStyle}>Année N</th>
              <th style={thStyle}>Année N-1</th>
              <th style={thStyle}>Variation en valeur absolue</th>
            </tr>
          </thead>
          <tbody>
            {RUBRIQUES.map(r => {
              if (r.isTotal) {
                const totals = r.label === 'TOTAL PRIMES' ? totalPrimes : totalReservesIndisp;
                return <React.Fragment key={r.label}>{renderTotalRow(r.label, totals)}</React.Fragment>;
              }
              const vals = computeRow(r);
              return (
                <tr key={r.label}>
                  <td style={r.bold ? tdBold : tdStyle}>{r.label}</td>
                  <td style={r.bold ? tdBoldRight : tdRight}>{renderAdjInput(r.label, 'anneeN', vals.anneeN)}</td>
                  <td style={r.bold ? tdBoldRight : tdRight}>{renderAdjInput(r.label, 'anneeN1', vals.anneeN1)}</td>
                  <td style={{ ...(r.bold ? tdBoldRight : tdRight), background: '#fafafa' }}>{fmtM(vals.variation)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>

        <div style={{ border: '0.5px solid #000', borderTop: 'none', padding: '10px 12px' }}>
          <p style={{ fontSize: 12, fontWeight: 700, marginBottom: 6, marginTop: 0 }}>Commentaire :</p>
          {editing ? (
            <textarea value={commentaire} onChange={e => setCommentaire(e.target.value)} style={textareaStyle} />
          ) : (
            <div style={{ fontSize: 12, lineHeight: 1.6, whiteSpace: 'pre-wrap', minHeight: 50 }}>{commentaire}</div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Note14;
