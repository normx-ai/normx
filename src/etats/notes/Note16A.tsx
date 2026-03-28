import React, { useState, useRef, useEffect } from 'react';
import { LuDownload, LuArrowLeft, LuEye, LuX, LuPrinter, LuSave, LuPenLine, LuEyeOff } from 'react-icons/lu';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import '../BilanSYCEBNL.css';
import '../FicheIdentification.css';
import type { Exercice, EtatBaseProps, BalanceLigne } from '../../types';

interface Note16AProps extends EtatBaseProps {
  onGoToParametres?: () => void;
}

interface Rubrique {
  label: string;
  prefixes: string[];
  bold?: boolean;
  isTotal?: boolean;
  excludes?: string[];
  group?: 'emprunts' | 'location' | 'provisions';
}

const RUBRIQUES: Rubrique[] = [
  // Emprunts et dettes financières
  { label: 'Emprunts obligataires', prefixes: ['161'], group: 'emprunts' },
  { label: 'Emprunts et dettes auprès des établissements de crédit', prefixes: ['162'], group: 'emprunts' },
  { label: 'Avances reçues de l\'Etat', prefixes: ['163'], group: 'emprunts' },
  { label: 'Avances reçues et comptes courants bloqués', prefixes: ['164'], group: 'emprunts' },
  { label: 'Dépôts et cautionnements reçus', prefixes: ['165'], group: 'emprunts' },
  { label: 'Intérêts courus', prefixes: ['166'], group: 'emprunts' },
  { label: 'Avances assorties de conditions particulières', prefixes: ['167'], group: 'emprunts' },
  { label: 'Autres emprunts et dettes', prefixes: ['168'], group: 'emprunts' },
  { label: 'Dettes liées à des participations', prefixes: ['171'], group: 'emprunts' },
  { label: 'Comptes permanents bloqués des établissements et succursales', prefixes: ['172'], group: 'emprunts' },
  { label: 'Intérêts courus sur emprunts et dettes', prefixes: ['173'], group: 'emprunts' },
  { label: 'Dettes rattachées à des participations', prefixes: ['174'], group: 'emprunts' },
  { label: 'TOTAL EMPRUNTS ET DETTES FINANCIERES', prefixes: [], bold: true, isTotal: true, group: 'emprunts' },
  // Location-acquisition
  { label: 'Crédit bail', prefixes: ['181'], group: 'location' },
  { label: 'Location-vente', prefixes: ['182'], group: 'location' },
  { label: 'Intérêts courus', prefixes: ['183'], group: 'location' },
  { label: 'Autres location-acquisition', prefixes: ['184', '185', '186'], group: 'location' },
  { label: 'TOTAL DETTES DE LOCATION-ACQUISITION', prefixes: [], bold: true, isTotal: true, group: 'location' },
  // Provisions financières pour risques et charges
  { label: 'Provisions pour litiges', prefixes: ['191'], group: 'provisions' },
  { label: 'Provisions pour garantie données aux clients', prefixes: ['192'], group: 'provisions' },
  { label: 'Provisions pour pertes sur marchés à achèvement futur', prefixes: ['193'], group: 'provisions' },
  { label: 'Provisions pour pertes de change', prefixes: ['194'], group: 'provisions' },
  { label: 'Provisions pour impôts', prefixes: ['195'], group: 'provisions' },
  { label: 'Provisions pour pensions et obligations assimilées', prefixes: ['196'], group: 'provisions' },
  { label: 'Provisions pour restructuration', prefixes: ['197'], group: 'provisions' },
  { label: 'Autres provisions', prefixes: ['198'], group: 'provisions' },
  { label: 'TOTAL PROVISIONS FINANCIERES POUR RISQUES ET CHARGES', prefixes: [], bold: true, isTotal: true, group: 'provisions' },
];

function Note16A({ entiteName, entiteNif = '', entiteId, offre, onBack }: Note16AProps): React.JSX.Element {
  const [exercices, setExercices] = useState<Exercice[]>([]);
  const [selectedExercice, setSelectedExercice] = useState<Exercice | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [pdfBlob, setPdfBlob] = useState<Blob | null>(null);
  const [params, setParams] = useState<Record<string, string>>({});
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [hideEmpty, setHideEmpty] = useState(false);

  const [lignesN, setLignesN] = useState<BalanceLigne[]>([]);
  const [lignesN1, setLignesN1] = useState<BalanceLigne[]>([]);
  const [adjustments, setAdjustments] = useState<Record<string, Record<string, number>>>({});

  const DEFAULT_COMMENTAIRE = `• Pour chaque emprunt et dette de location acquisition: mentionner la date d'octroi, le nom de l'organisme financier, le montant initial de l'emprunt ou de la dette, la durée du crédit, les garanties données par l'entité.\n• Indiquer les événements et circonstances qui ont conduit à la provision et à la reprise.\n• Pour les pensions et obligations de retraite :\n  - indiquer la méthode d'évaluation retenue ;\n  - pour les actifs du régime, indiquer le nom de la compagnie d'assurance ou du fonds de pension, le descriptif de la convention signée avec l'organisme, la périodicité des versements, le montant et la durée de la convention ;\n  - indication de la valeur retenue pour les principales hypothèses actuarielles à la date de clôture et leur base de détermination.`;
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
        setCommentaire(data['note16a_commentaire'] || DEFAULT_COMMENTAIRE);
        if (data['note16a_adjustments']) { try { setAdjustments(JSON.parse(data['note16a_adjustments'])); } catch { /* */ } }
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
          const now = new Date(); const year = now.getFullYear(); const month = now.getMonth();
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
        if (balanceSource === 'ecritures') { const res = await fetch('/api/ecritures/balance/' + entiteId + '/' + selectedExercice.id); setLignesN((await res.json()).lignes || []); }
        else { const res = await fetch('/api/balance/' + entiteId + '/' + selectedExercice.id + '/N'); setLignesN((await res.json()).lignes || []); }
      } catch { setLignesN([]); }
      try {
        const exN1 = exercices.find(e => e.annee === selectedExercice.annee - 1);
        if (exN1) {
          if (balanceSource === 'ecritures') { const res = await fetch('/api/ecritures/balance/' + entiteId + '/' + exN1.id); setLignesN1((await res.json()).lignes || []); }
          else { const res = await fetch('/api/balance/' + entiteId + '/' + exN1.id + '/N'); setLignesN1((await res.json()).lignes || []); }
        } else { const res = await fetch('/api/balance/' + entiteId + '/' + selectedExercice.id + '/N-1'); setLignesN1((await res.json()).lignes || []); }
      } catch { setLignesN1([]); }
    };
    load();
  }, [entiteId, selectedExercice, balanceSource, exercices]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const data: Record<string, string> = { ...params, note16a_adjustments: JSON.stringify(adjustments), note16a_commentaire: commentaire };
      const res = await fetch(`/api/entites/${entiteId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ data }) });
      if (res.ok) { setParams(data); setSaved(true); setEditing(false); setTimeout(() => setSaved(false), 3000); }
    } catch { /* */ }
    setSaving(false);
  };

  const duree = selectedExercice?.duree_mois || 12;
  const dateFin = selectedExercice?.date_fin ? new Date(selectedExercice.date_fin) : null;
  const annee = selectedExercice ? selectedExercice.annee : new Date().getFullYear();
  const fmtDateShort = (d: Date | null): string => { if (!d) return ''; return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' }); };
  const fmtM = (val: number): string => { if (val === 0) return '0'; return Math.round(val).toLocaleString('fr-FR'); };

  const computeForPrefixes = (lignes: BalanceLigne[], prefixes: string[], excludes?: string[]) => {
    let total = 0;
    for (const l of lignes) {
      const num = (l.numero_compte || '').trim();
      if (!prefixes.some(p => num.startsWith(p))) continue;
      if (excludes && excludes.some(e => num.startsWith(e))) continue;
      total += (parseFloat(String(l.solde_crediteur)) || 0) - (parseFloat(String(l.solde_debiteur)) || 0);
    }
    return total;
  };

  const computeRow = (r: Rubrique) => {
    const n = computeForPrefixes(lignesN, r.prefixes, r.excludes) + getAdj(r.label, 'anneeN');
    const n1 = computeForPrefixes(lignesN1, r.prefixes, r.excludes) + getAdj(r.label, 'anneeN1');
    const variationAbs = n - n1;
    const variationPct = n1 !== 0 ? ((n - n1) / Math.abs(n1) * 100) : 0;
    return { anneeN: n, anneeN1: n1, variationAbs, variationPct };
  };

  const detailRows = (group: string) => RUBRIQUES.filter(r => r.group === group && !r.isTotal);
  const sumGroup = (group: string) => detailRows(group).reduce((a, r) => { const v = computeRow(r); return { anneeN: a.anneeN + v.anneeN, anneeN1: a.anneeN1 + v.anneeN1 }; }, { anneeN: 0, anneeN1: 0 });

  const totalEmprunts = sumGroup('emprunts');
  const totalLocation = sumGroup('location');
  const totalProvisions = sumGroup('provisions');

  const renderAdjInput = (label: string, field: string, baseValue: number) => {
    if (!editing) return fmtM(baseValue);
    const adj = getAdj(label, field);
    return <input value={adj || ''} onChange={e => { const v = e.target.value === '' ? 0 : parseFloat(e.target.value.replace(/\s/g, '').replace(',', '.')) || 0; setAdj(label, field, v); }} style={inputSt} placeholder={fmtM(baseValue - adj)} />;
  };

  const renderCreanceInput = (label: string, field: string) => {
    if (!editing) return fmtM(getAdj(label, field));
    return <input value={getAdj(label, field) || ''} onChange={e => { const v = e.target.value === '' ? 0 : parseFloat(e.target.value.replace(/\s/g, '').replace(',', '.')) || 0; setAdj(label, field, v); }} style={inputSt} />;
  };

  const generatePDF = async (): Promise<jsPDF> => {
    const wasEditing = editing; if (wasEditing) setEditing(false); await new Promise(r => setTimeout(r, 100));
    const pdf = new jsPDF('l', 'mm', 'a4'); if (!pageRef.current) return pdf;
    const canvas = await html2canvas(pageRef.current, { scale: 2, useCORS: true, backgroundColor: '#ffffff' });
    const imgData = canvas.toDataURL('image/png'); const pdfWidth = 297; const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
    pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, Math.min(pdfHeight, 210)); if (wasEditing) setEditing(true); return pdf;
  };

  const openPreview = async () => { const pdf = await generatePDF(); const blob = pdf.output('blob'); setPdfBlob(blob); setPreviewUrl(URL.createObjectURL(blob)); };
  const closePreview = () => { if (previewUrl) URL.revokeObjectURL(previewUrl); setPreviewUrl(null); setPdfBlob(null); };
  const downloadPDF = () => { if (!pdfBlob) return; const url = URL.createObjectURL(pdfBlob); const a = document.createElement('a'); a.href = url; a.download = 'Note16A_' + annee + '.pdf'; a.click(); URL.revokeObjectURL(url); };
  const printPDF = () => { if (!previewUrl) return; const w = window.open(previewUrl); if (w) { w.onload = () => w.print(); } };

  const thStyle: React.CSSProperties = { border: '0.5px solid #000', padding: '5px 8px', fontSize: 11, fontWeight: 700, textAlign: 'center', verticalAlign: 'middle', background: '#f5f5f5' };
  const tdStyle: React.CSSProperties = { border: '0.5px solid #000', padding: '5px 8px', fontSize: 11, verticalAlign: 'middle' };
  const tdRight: React.CSSProperties = { ...tdStyle, textAlign: 'right', fontVariantNumeric: 'tabular-nums' };
  const tdBold: React.CSSProperties = { ...tdStyle, fontWeight: 700 };
  const tdBoldRight: React.CSSProperties = { ...tdRight, fontWeight: 700 };
  const inputSt: React.CSSProperties = { width: '100%', padding: '5px 8px', fontSize: 11, border: '1px solid #D4A843', borderRadius: 2, background: '#fffbf0', textAlign: 'right', boxSizing: 'border-box' };
  const textareaStyle: React.CSSProperties = { width: '100%', minHeight: 80, padding: '8px 10px', fontSize: 12, lineHeight: '1.6', border: '1px solid #D4A843', borderRadius: 3, background: '#fffbf0', fontFamily: 'inherit', boxSizing: 'border-box', resize: 'vertical' };

  const renderDataRow = (r: Rubrique) => {
    const vals = computeRow(r);
    if (hideEmpty && vals.anneeN === 0 && vals.anneeN1 === 0) return null;
    return (
      <tr key={r.label}>
        <td style={tdStyle}>{r.label}</td>
        <td style={tdRight}>{renderAdjInput(r.label, 'anneeN', vals.anneeN)}</td>
        <td style={tdRight}>{renderAdjInput(r.label, 'anneeN1', vals.anneeN1)}</td>
        <td style={{ ...tdRight, background: '#fafafa' }}>{fmtM(vals.variationAbs)}</td>
        <td style={{ ...tdRight, background: '#fafafa' }}>{vals.variationPct !== 0 ? vals.variationPct.toFixed(1) + ' %' : ''}</td>
        <td style={tdRight}>{renderCreanceInput(r.label, 'dettes1an')}</td>
        <td style={tdRight}>{renderCreanceInput(r.label, 'dettes1a2ans')}</td>
        <td style={tdRight}>{renderCreanceInput(r.label, 'dettesPlus2ans')}</td>
      </tr>
    );
  };

  const renderTotalRow = (label: string, totals: { anneeN: number; anneeN1: number }) => {
    const variationAbs = totals.anneeN - totals.anneeN1;
    const variationPct = totals.anneeN1 !== 0 ? ((totals.anneeN - totals.anneeN1) / Math.abs(totals.anneeN1) * 100) : 0;
    return (
      <tr key={label}>
        <td style={{ ...tdBold, background: '#f0f0f0' }}>{label}</td>
        <td style={{ ...tdBoldRight, background: '#f0f0f0' }}>{fmtM(totals.anneeN)}</td>
        <td style={{ ...tdBoldRight, background: '#f0f0f0' }}>{fmtM(totals.anneeN1)}</td>
        <td style={{ ...tdBoldRight, background: '#f0f0f0' }}>{fmtM(variationAbs)}</td>
        <td style={{ ...tdBoldRight, background: '#f0f0f0' }}>{variationPct !== 0 ? variationPct.toFixed(1) + ' %' : ''}</td>
        <td style={{ ...tdBold, background: '#f0f0f0' }}></td>
        <td style={{ ...tdBold, background: '#f0f0f0' }}></td>
        <td style={{ ...tdBold, background: '#f0f0f0' }}></td>
      </tr>
    );
  };

  return (
    <div>
      <div className="etat-toolbar">
        <button className="etat-back-btn" onClick={onBack}><LuArrowLeft size={18} /> Retour</button>
        <div className="etat-toolbar-title">Note 16A — Dettes financières et ressources assimilées</div>
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
          <button
            className="etat-action-btn"
            onClick={() => setHideEmpty(!hideEmpty)}
            style={{ background: hideEmpty ? '#1A3A5C' : '#e5e7eb', color: hideEmpty ? '#fff' : '#333', border: 'none' }}
          >
            <LuEyeOff size={16} /> {hideEmpty ? 'Afficher tout' : 'Masquer vides'}
          </button>
        </div>
      </div>

      {previewUrl && (
        <div className="etat-preview-overlay" onClick={closePreview}>
          <div className="etat-preview-modal" onClick={e => e.stopPropagation()}>
            <div className="etat-preview-header">
              <span>Aperçu — Note 16A</span>
              <div className="etat-preview-actions">
                <button onClick={printPDF} title="Imprimer"><LuPrinter size={18} /></button>
                <button onClick={downloadPDF} title="Télécharger"><LuDownload size={18} /></button>
                <button onClick={closePreview}><LuX size={18} /></button>
              </div>
            </div>
            <iframe src={previewUrl} className="etat-preview-iframe" title="Aperçu Note 16A" />
          </div>
        </div>
      )}

      <div ref={pageRef} style={{
        width: '297mm', minHeight: '210mm', background: '#fff',
        margin: '0 auto 20px', padding: '6mm 8mm',
        boxShadow: '0 2px 12px rgba(0,0,0,0.1)', boxSizing: 'border-box',
        fontFamily: "'Outfit', 'Segoe UI', Arial, sans-serif", fontSize: 11, color: '#1a1a1a',
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
          NOTE 16A — DETTES FINANCIERES ET RESSOURCES ASSIMILEES
        </h3>

        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 0 }}>
          <thead>
            <tr>
              <th style={{ ...thStyle, width: '28%' }} rowSpan={2}>Libellés</th>
              <th style={thStyle} rowSpan={2}>Année N</th>
              <th style={thStyle} rowSpan={2}>Année N-1</th>
              <th style={thStyle} rowSpan={2}>Variation en valeur absolue</th>
              <th style={thStyle} rowSpan={2}>Variation en %</th>
              <th style={thStyle} colSpan={3}>Échéances des dettes</th>
            </tr>
            <tr>
              <th style={{ ...thStyle, fontSize: 9 }}>Dettes à un an au plus</th>
              <th style={{ ...thStyle, fontSize: 9 }}>Dettes à plus d'un an et à deux ans au plus</th>
              <th style={{ ...thStyle, fontSize: 9 }}>Dettes à plus de deux ans</th>
            </tr>
          </thead>
          <tbody>
            {detailRows('emprunts').map(r => renderDataRow(r))}
            {renderTotalRow('TOTAL EMPRUNTS ET DETTES FINANCIERES', totalEmprunts)}
            {detailRows('location').map(r => renderDataRow(r))}
            {renderTotalRow('TOTAL DETTES DE LOCATION-ACQUISITION', totalLocation)}
            {detailRows('provisions').map(r => renderDataRow(r))}
            {renderTotalRow('TOTAL PROVISIONS FINANCIERES POUR RISQUES ET CHARGES', totalProvisions)}
          </tbody>
        </table>

        <div style={{ border: '0.5px solid #000', borderTop: 'none', padding: '8px 10px' }}>
          <p style={{ fontSize: 11, fontWeight: 700, marginBottom: 4, marginTop: 0 }}>Commentaire :</p>
          {editing ? (
            <textarea value={commentaire} onChange={e => setCommentaire(e.target.value)} style={textareaStyle} />
          ) : (
            <div style={{ fontSize: 11, lineHeight: 1.5, whiteSpace: 'pre-wrap', minHeight: 50 }}>{commentaire}</div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Note16A;
