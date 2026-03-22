import React, { useState, useRef, useEffect } from 'react';
import { LuDownload, LuArrowLeft, LuEye, LuX, LuPrinter, LuSave, LuPenLine, LuInfo } from 'react-icons/lu';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import '../BilanSYCEBNL.css';
import '../FicheIdentification.css';
import type { Exercice, EtatBaseProps, BalanceLigne } from '../../types';

interface Note3DProps extends EtatBaseProps {
  onGoToParametres?: () => void;
}

interface Rubrique {
  label: string;
  immoPrefixes: string[];   // comptes 2x (montant brut)
  amortPrefixes: string[];  // comptes 28x (amortissements)
  bold?: boolean;
  isSousTotal?: boolean;
  isTotal?: boolean;
  isSeparator?: boolean;
}

// Rubriques fidèles au PDF officiel SYSCOHADA
const ALL_RUBRIQUES: Rubrique[] = [
  // INCORPORELLES
  { label: 'Frais de développement et de prospection', immoPrefixes: ['211'], amortPrefixes: ['2811'] },
  { label: 'Brevets, licences, logiciels et droits similaires', immoPrefixes: ['212', '213'], amortPrefixes: ['2812', '2813'] },
  { label: 'Fonds commercial et droit au bail', immoPrefixes: ['215', '216'], amortPrefixes: ['2815', '2816'] },
  { label: 'Autres immobilisations incorporelles', immoPrefixes: ['214', '217', '218', '219'], amortPrefixes: ['2814', '2817', '2818', '2819'] },
  { label: 'SOUS TOTAL : IMMOBILISATIONS INCORPORELLES', immoPrefixes: [], amortPrefixes: [], bold: true, isSousTotal: true },
  { label: '', immoPrefixes: [], amortPrefixes: [], isSeparator: true },
  // CORPORELLES
  { label: 'Terrains', immoPrefixes: ['22'], amortPrefixes: ['282'] },
  { label: 'Bâtiments', immoPrefixes: ['231', '232', '233', '234'], amortPrefixes: ['2831', '2832', '2833', '2834'] },
  { label: 'Aménagements, agencements et installations', immoPrefixes: ['235', '236', '237', '238'], amortPrefixes: ['2835', '2836', '2837', '2838'] },
  { label: 'Matériel, mobilier et actifs biologiques', immoPrefixes: ['241', '242', '243', '244'], amortPrefixes: ['2841', '2842', '2843', '2844'] },
  { label: 'Matériel de transport', immoPrefixes: ['245'], amortPrefixes: ['2845'] },
  { label: 'SOUS TOTAL : IMMOBILISATIONS CORPORELLES', immoPrefixes: [], amortPrefixes: [], bold: true, isSousTotal: true },
  { label: '', immoPrefixes: [], amortPrefixes: [], isSeparator: true },
  // FINANCIERES
  { label: 'Titres de participations', immoPrefixes: ['26'], amortPrefixes: [] },
  { label: 'Autres immobilisations financières', immoPrefixes: ['27'], amortPrefixes: [] },
  { label: 'SOUS TOTAL : IMMOBILISATIONS FINANCIERES', immoPrefixes: [], amortPrefixes: [], bold: true, isSousTotal: true },
  { label: '', immoPrefixes: [], amortPrefixes: [], isSeparator: true },
  // TOTAL
  { label: 'TOTAL GENERAL', immoPrefixes: [], amortPrefixes: [], bold: true, isTotal: true },
];

const DEFAULT_COMMENTAIRE = `Mentionner la justification de la cession ainsi que la date d'acquisition et la date de sortie.`;

function Note3D({ entiteName, entiteNif = '', entiteId, offre, onBack }: Note3DProps): React.JSX.Element {
  const [exercices, setExercices] = useState<Exercice[]>([]);
  const [selectedExercice, setSelectedExercice] = useState<Exercice | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [pdfBlob, setPdfBlob] = useState<Blob | null>(null);
  const [params, setParams] = useState<Record<string, string>>({});
  const [lignesN, setLignesN] = useState<BalanceLigne[]>([]);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [commentaire, setCommentaire] = useState(DEFAULT_COMMENTAIRE);
  const [cessions, setCessions] = useState<Record<string, number>>({});

  const pageRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!entiteId) return;
    fetch('/api/entites/' + entiteId)
      .then(r => r.json())
      .then(ent => {
        const data = ent.data || {};
        setParams(data);
        setCommentaire(data['note3d_commentaire'] || DEFAULT_COMMENTAIRE);
        if (data['note3d_cessions']) {
          try { setCessions(JSON.parse(data['note3d_cessions'])); } catch { /* */ }
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
        note3d_commentaire: commentaire,
        note3d_cessions: JSON.stringify(cessions),
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
    if (val === 0) return '';
    return Math.round(val).toLocaleString('fr-FR');
  };

  // Note 3D = saisie MANUELLE — les mouvements crédit sur les comptes immo
  // peuvent être des cessions, annulations ou reclassements.
  // Seul le comptable sait quels biens ont réellement été cédés.

  // Indicateur depuis la balance : montant des comptes 82 (produits des cessions HAO)
  // et 754 (cessions courantes) pour aider le comptable
  const prixCessionBalance = (() => {
    let total = 0;
    for (const l of lignesN) {
      const num = (l.numero_compte || '').trim();
      if (num.startsWith('82') || num.startsWith('754')) {
        total += parseFloat(String(l.solde_crediteur_revise ?? l.solde_crediteur ?? l.credit)) || 0;
      }
    }
    return total;
  })();

  // VNC depuis la balance : comptes 81 (valeur comptable des cessions)
  const vncCessionBalance = (() => {
    let total = 0;
    for (const l of lignesN) {
      const num = (l.numero_compte || '').trim();
      if (num.startsWith('81') || num.startsWith('654')) {
        total += parseFloat(String(l.solde_debiteur_revise ?? l.solde_debiteur ?? l.debit)) || 0;
      }
    }
    return total;
  })();

  // Toutes les colonnes sont en saisie manuelle (stockées dans cessions[label_field])
  const getVal = (label: string, field: string): number => {
    return cessions[label + '_' + field] || 0;
  };
  const setVal = (label: string, field: string, value: number) => {
    setCessions(prev => ({ ...prev, [label + '_' + field]: value }));
  };

  const computeRow = (r: Rubrique) => {
    const a = getVal(r.label, 'brut');       // Valeur brute saisie
    const b = getVal(r.label, 'amort');      // Amortissements saisis
    const c = a - b;                          // VNC calculée
    const d = getVal(r.label, 'prix');        // Prix de cession saisi
    const e = d - c;                          // Plus/moins-value calculée
    return { a, b, c, d, e };
  };

  // Lignes de détail
  const detailRows = ALL_RUBRIQUES.filter(r => !r.isSousTotal && !r.isTotal && !r.isSeparator);
  const incorpRows = detailRows.slice(0, 4);
  const corpRows = detailRows.slice(4, 9);
  const finRows = detailRows.slice(9);

  const sumRowVals = (rows: Rubrique[]) => {
    return rows.reduce((acc, r) => {
      const v = computeRow(r);
      return { a: acc.a + v.a, b: acc.b + v.b, c: acc.c + v.c, d: acc.d + v.d, e: acc.e + v.e };
    }, { a: 0, b: 0, c: 0, d: 0, e: 0 });
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
    a.download = 'Note3D_' + annee + '.pdf';
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

  const renderValsRow = (label: string, vals: { a: number; b: number; c: number; d: number; e: number }, bold: boolean) => (
    <>
      <td style={{ ...tdRight, fontWeight: bold ? 700 : 400 }}>{fmtM(vals.a)}</td>
      <td style={{ ...tdRight, fontWeight: bold ? 700 : 400 }}>{fmtM(vals.b)}</td>
      <td style={{ ...tdRight, fontWeight: bold ? 700 : 400 }}>{fmtM(vals.c)}</td>
      <td style={{ ...tdRight, fontWeight: bold ? 700 : 400 }}>{fmtM(vals.d)}</td>
      <td style={{ ...tdRight, fontWeight: bold ? 700 : 400 }}>{fmtM(vals.e)}</td>
    </>
  );

  return (
    <div>
      <div className="etat-toolbar">
        <button className="etat-back-btn" onClick={onBack}><LuArrowLeft size={18} /> Retour</button>
        <div className="etat-toolbar-title">Note 3D — Plus-values et moins-values de cession</div>
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
        </div>
      </div>

      {previewUrl && (
        <div className="etat-preview-overlay" onClick={closePreview}>
          <div className="etat-preview-modal" onClick={e => e.stopPropagation()}>
            <div className="etat-preview-header">
              <span>Aperçu — Note 3D</span>
              <div className="etat-preview-actions">
                <button onClick={printPDF} title="Imprimer"><LuPrinter size={18} /></button>
                <button onClick={downloadPDF} title="Télécharger"><LuDownload size={18} /></button>
                <button onClick={closePreview}><LuX size={18} /></button>
              </div>
            </div>
            <iframe src={previewUrl} className="etat-preview-iframe" title="Aperçu Note 3D" />
          </div>
        </div>
      )}

      {/* Bulle d'information */}
      <div style={{
        margin: '12px 20px', padding: '12px 16px',
        background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 8,
        fontSize: 12, color: '#1e40af', lineHeight: 1.6,
      }}>
        <div style={{ fontWeight: 700, marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
          <LuInfo size={14} /> Note d'information — Note 3D
        </div>
        <ul style={{ margin: 0, paddingLeft: 18 }}>
          <li><strong>Saisie manuelle :</strong> Cette note est entièrement à renseigner manuellement. Les mouvements crédit sur les comptes d'immobilisations peuvent être des cessions, annulations ou reclassements — seul le comptable sait quels biens ont été cédés.</li>
          <li><strong>Valeur brute :</strong> Montant d'origine du bien cédé (valeur d'entrée dans l'actif).</li>
          <li><strong>Amortissements :</strong> Cumul des amortissements pratiqués jusqu'à la date de cession.</li>
          <li><strong>Prix de cession :</strong> Prix de vente effectif ou indemnité d'assurance reçue.</li>
        </ul>
        {(prixCessionBalance > 0 || vncCessionBalance > 0) && (
          <div style={{ marginTop: 8, padding: '6px 10px', background: '#dbeafe', borderRadius: 4, fontSize: 11 }}>
            <strong>Indicateurs balance :</strong>
            {vncCessionBalance > 0 && <span> Compte 81/654 (VNC cessions) = {fmtM(vncCessionBalance)}</span>}
            {prixCessionBalance > 0 && <span> | Compte 82/754 (Prix de cession) = {fmtM(prixCessionBalance)}</span>}
          </div>
        )}
      </div>

      <div ref={pageRef} style={{
        width: '297mm', minHeight: '210mm', background: '#fff',
        margin: '0 auto 20px', padding: '8mm 10mm',
        boxShadow: '0 2px 12px rgba(0,0,0,0.1)', boxSizing: 'border-box',
        fontFamily: "'Outfit', 'Segoe UI', Arial, sans-serif", fontSize: 12, color: '#1a1a1a',
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
          NOTE 3D — IMMOBILISATIONS : PLUS-VALUES ET MOINS VALUE DE CESSION
        </h3>

        {/* Tableau */}
        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 12 }}>
          <thead>
            <tr>
              <th rowSpan={2} style={{ ...thStyle, width: '28%', textAlign: 'left' }}>
                <div style={{ fontWeight: 700 }}>LIBELLES</div>
              </th>
              <th style={{ ...thStyle, width: '13%' }}>MONTANT<br />BRUT</th>
              <th style={{ ...thStyle, width: '13%' }}>AMORTISSEMENTS<br />PRATIQUES</th>
              <th style={{ ...thStyle, width: '13%' }}>VALEUR<br />COMPTABLE<br />NETTE</th>
              <th style={{ ...thStyle, width: '13%' }}>PRIX<br />DE<br />CESSION</th>
              <th style={{ ...thStyle, width: '15%' }}>PLUS-VALUE<br />OU MOINS-VALUE</th>
            </tr>
            <tr>
              <th style={thStyle}>A</th>
              <th style={thStyle}>B</th>
              <th style={thStyle}>C = A - B</th>
              <th style={thStyle}>D</th>
              <th style={thStyle}>E = D - C</th>
            </tr>
          </thead>
          <tbody>
            {ALL_RUBRIQUES.map((r, i) => {
              if (r.isSeparator) {
                return <tr key={i}><td colSpan={6} style={{ ...tdStyle, height: 4, padding: 0 }}></td></tr>;
              }

              if (r.isSousTotal) {
                const isIncorp = r.label.includes('INCORPORELLES');
                const isCorp = r.label.includes('CORPORELLES') && !r.label.includes('INCORPORELLES');
                const isFin = r.label.includes('FINANCIERES');
                const sourceRows = isIncorp ? incorpRows : isCorp ? corpRows : isFin ? finRows : [];
                const vals = sumRowVals(sourceRows);
                return (
                  <tr key={i}>
                    <td style={{ ...tdStyle, fontWeight: 700 }}>{r.label}</td>
                    {renderValsRow(r.label, vals, true)}
                  </tr>
                );
              }

              if (r.isTotal) {
                const vals = sumRowVals(detailRows);
                return (
                  <tr key={i} style={{ borderTop: '2px solid #000' }}>
                    <td style={{ ...tdStyle, fontWeight: 700 }}>{r.label}</td>
                    {renderValsRow(r.label, vals, true)}
                  </tr>
                );
              }

              // Ligne de détail — toutes les colonnes saisies manuellement
              const vals = computeRow(r);
              return (
                <tr key={i}>
                  <td style={tdStyle}>{r.label}</td>
                  <td style={tdRight}>
                    {editing ? (
                      <input type="number" value={getVal(r.label, 'brut') || ''} onChange={e => setVal(r.label, 'brut', parseFloat(e.target.value) || 0)}
                        placeholder="0" style={inputSt} />
                    ) : fmtM(vals.a)}
                  </td>
                  <td style={tdRight}>
                    {editing ? (
                      <input type="number" value={getVal(r.label, 'amort') || ''} onChange={e => setVal(r.label, 'amort', parseFloat(e.target.value) || 0)}
                        placeholder="0" style={inputSt} />
                    ) : fmtM(vals.b)}
                  </td>
                  <td style={tdRight}>{fmtM(vals.c)}</td>
                  <td style={tdRight}>
                    {editing ? (
                      <input type="number" value={getVal(r.label, 'prix') || ''} onChange={e => setVal(r.label, 'prix', parseFloat(e.target.value) || 0)}
                        placeholder="0" style={inputSt} />
                    ) : fmtM(vals.d)}
                  </td>
                  <td style={tdRight}>{fmtM(vals.e)}</td>
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
                width: '100%', minHeight: 60, padding: '6px 8px', fontSize: 12,
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

export default Note3D;
