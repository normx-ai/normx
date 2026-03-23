import React, { useState, useRef, useEffect } from 'react';
import { LuDownload, LuArrowLeft, LuEye, LuX, LuPrinter, LuSave, LuPenLine, LuPlus, LuTrash2 } from 'react-icons/lu';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import '../BilanSYCEBNL.css';
import '../FicheIdentification.css';
import type { Exercice, EtatBaseProps, BalanceLigne } from '../../types';

interface Note4Props extends EtatBaseProps {
  onGoToParametres?: () => void;
}

interface LigneFiliale {
  denomination: string;
  localisation: string;
  valeurAcquisition: string;
  pctDetenu: string;
  capitauxPropres: string;
  resultatDernier: string;
}

// Mapping des lignes du tableau aux préfixes de comptes SYSCOHADA
interface RubriqueImmoFin {
  label: string;
  prefixes: string[];
}

const RUBRIQUES_BRUT: RubriqueImmoFin[] = [
  { label: 'Titres de participation', prefixes: ['26'] },
  { label: 'Prêts et créances', prefixes: ['271', '272'] },
  { label: 'Prêt au personnel', prefixes: ['273'] },
  { label: 'Créances sur l\'état', prefixes: ['274'] },
  { label: 'Titres immobilisés', prefixes: ['275'] },
  { label: 'Dépôts et cautionnements', prefixes: ['276'] },
  { label: 'Intérêts courus', prefixes: ['277'] },
];

const RUBRIQUES_DEPRECIATION: RubriqueImmoFin[] = [
  { label: 'Dépréciations titres de participation', prefixes: ['296'] },
  { label: 'Dépréciations autres immobilisations', prefixes: ['297'] },
];

const emptyFiliale = (): LigneFiliale => ({
  denomination: '', localisation: '', valeurAcquisition: '', pctDetenu: '', capitauxPropres: '', resultatDernier: '',
});

function Note4({ entiteName, entiteNif = '', entiteId, offre, onBack }: Note4Props): React.JSX.Element {
  const [exercices, setExercices] = useState<Exercice[]>([]);
  const [selectedExercice, setSelectedExercice] = useState<Exercice | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [pdfBlob, setPdfBlob] = useState<Blob | null>(null);
  const [params, setParams] = useState<Record<string, string>>({});
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Balance N et N-1
  const [lignesN, setLignesN] = useState<BalanceLigne[]>([]);
  const [lignesN1, setLignesN1] = useState<BalanceLigne[]>([]);

  // Ajustements manuels (pour corrections)
  const [adjustments, setAdjustments] = useState<Record<string, Record<string, number>>>({});

  // Filiales
  const [filiales, setFiliales] = useState<LigneFiliale[]>([emptyFiliale(), emptyFiliale(), emptyFiliale(), emptyFiliale(), emptyFiliale()]);

  // Commentaire
  const DEFAULT_COMMENTAIRE = `• Justifier toute variation significative.
• Commenter toutes les créances anciennes.
• Pour les créances relatives à la concession, faire un descriptif de l'accord.
• Indiquer :
  - la nature de la créance ;
  - la durée de la concession ;
  - l'échéance.
• Indiquer le nombre et la date d'acquisition des actions ou parts propres.
• Dépréciation : indiquer les événements et les circonstances qui ont motivé la dépréciation ou la reprise.`;
  const [commentaire, setCommentaire] = useState(DEFAULT_COMMENTAIRE);

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
        setCommentaire(data['note4_commentaire'] || DEFAULT_COMMENTAIRE);
        if (data['note4_adjustments']) {
          try { setAdjustments(JSON.parse(data['note4_adjustments'])); } catch { /* */ }
        }
        if (data['note4_filiales']) {
          try {
            const parsed = JSON.parse(data['note4_filiales']);
            if (Array.isArray(parsed) && parsed.length > 0) setFiliales(parsed);
          } catch { /* */ }
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

  // Chargement balance N et N-1
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

      // N-1
      try {
        const exN1 = exercices.find(e => e.annee === selectedExercice.annee - 1);
        if (exN1) {
          if (balanceSource === 'ecritures') {
            const res = await fetch('/api/ecritures/balance/' + entiteId + '/' + exN1.id);
            const data = await res.json();
            setLignesN1(data.lignes || []);
          } else {
            const res = await fetch('/api/balance/' + entiteId + '/' + exN1.id + '/N');
            const data = await res.json();
            setLignesN1(data.lignes || []);
          }
        } else {
          // Essayer balance N-1 importée
          try {
            const res = await fetch('/api/balance/' + entiteId + '/' + selectedExercice.id + '/N-1');
            const data = await res.json();
            setLignesN1(data.lignes || []);
          } catch { setLignesN1([]); }
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
        note4_adjustments: JSON.stringify(adjustments),
        note4_filiales: JSON.stringify(filiales),
        note4_commentaire: commentaire,
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

  // Calcul depuis la balance
  const computeForPrefixes = (lignes: BalanceLigne[], prefixes: string[]) => {
    let total = 0;
    for (const l of lignes) {
      const num = (l.numero_compte || '').trim();
      if (!prefixes.some(p => num.startsWith(p))) continue;
      total += (parseFloat(String(l.solde_debiteur)) || 0) - (parseFloat(String(l.solde_crediteur)) || 0);
    }
    return total;
  };

  const computeRow = (r: RubriqueImmoFin) => {
    const baseN = computeForPrefixes(lignesN, r.prefixes) + getAdj(r.label, 'anneeN');
    const baseN1 = computeForPrefixes(lignesN1, r.prefixes) + getAdj(r.label, 'anneeN1');
    const variation = baseN1 !== 0 ? ((baseN - baseN1) / Math.abs(baseN1) * 100) : 0;
    const creances1an = getAdj(r.label, 'creances1an');
    const creances1a2ans = getAdj(r.label, 'creances1a2ans');
    const creancesPlus2ans = getAdj(r.label, 'creancesPlus2ans');
    return { anneeN: baseN, anneeN1: baseN1, variation, creances1an, creances1a2ans, creancesPlus2ans };
  };

  const brutRows = RUBRIQUES_BRUT.map(r => ({ ...r, vals: computeRow(r) }));
  const depreciationRows = RUBRIQUES_DEPRECIATION.map(r => ({ ...r, vals: computeRow(r) }));

  const sumRows = (rows: { vals: ReturnType<typeof computeRow> }[]) => rows.reduce(
    (acc, r) => ({
      anneeN: acc.anneeN + r.vals.anneeN,
      anneeN1: acc.anneeN1 + r.vals.anneeN1,
      creances1an: acc.creances1an + r.vals.creances1an,
      creances1a2ans: acc.creances1a2ans + r.vals.creances1a2ans,
      creancesPlus2ans: acc.creancesPlus2ans + r.vals.creancesPlus2ans,
    }),
    { anneeN: 0, anneeN1: 0, creances1an: 0, creances1a2ans: 0, creancesPlus2ans: 0 }
  );

  const totalBrut = sumRows(brutRows);
  const totalBrutVariation = totalBrut.anneeN1 !== 0 ? ((totalBrut.anneeN - totalBrut.anneeN1) / Math.abs(totalBrut.anneeN1) * 100) : 0;

  const totalDep = sumRows(depreciationRows);

  const totalNet = {
    anneeN: totalBrut.anneeN - totalDep.anneeN,
    anneeN1: totalBrut.anneeN1 - totalDep.anneeN1,
    creances1an: totalBrut.creances1an - totalDep.creances1an,
    creances1a2ans: totalBrut.creances1a2ans - totalDep.creances1a2ans,
    creancesPlus2ans: totalBrut.creancesPlus2ans - totalDep.creancesPlus2ans,
  };
  const totalNetVariation = totalNet.anneeN1 !== 0 ? ((totalNet.anneeN - totalNet.anneeN1) / Math.abs(totalNet.anneeN1) * 100) : 0;

  const updateFiliale = (idx: number, field: keyof LigneFiliale, value: string) => {
    setFiliales(prev => prev.map((l, i) => i === idx ? { ...l, [field]: value } : l));
  };

  const addFiliale = () => setFiliales(prev => [...prev, emptyFiliale()]);
  const removeFiliale = (idx: number) => setFiliales(prev => prev.filter((_, i) => i !== idx));

  const generatePDF = async (): Promise<jsPDF> => {
    const wasEditing = editing;
    if (wasEditing) setEditing(false);
    await new Promise(r => setTimeout(r, 100));
    const pdf = new jsPDF('landscape', 'mm', 'a4');
    if (!pageRef.current) return pdf;
    const canvas = await html2canvas(pageRef.current, { scale: 2, useCORS: true, backgroundColor: '#ffffff' });
    const imgData = canvas.toDataURL('image/png');
    const pdfWidth = 287;
    const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
    pdf.addImage(imgData, 'PNG', 5, 5, pdfWidth, Math.min(pdfHeight, 200));
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
    a.download = 'Note4_' + annee + '.pdf';
    a.click();
    URL.revokeObjectURL(url);
  };

  const printPDF = () => {
    if (!previewUrl) return;
    const w = window.open(previewUrl);
    if (w) { w.onload = () => w.print(); }
  };

  const thStyle: React.CSSProperties = {
    border: '0.5px solid #000', padding: '5px 8px', fontSize: 11,
    fontWeight: 700, textAlign: 'center', verticalAlign: 'middle', background: '#f5f5f5',
  };
  const tdStyle: React.CSSProperties = {
    border: '0.5px solid #000', padding: '5px 8px', fontSize: 11, verticalAlign: 'middle',
  };
  const tdRight: React.CSSProperties = { ...tdStyle, textAlign: 'right', fontVariantNumeric: 'tabular-nums' };
  const tdBold: React.CSSProperties = { ...tdStyle, fontWeight: 700 };
  const tdBoldRight: React.CSSProperties = { ...tdRight, fontWeight: 700 };
  const inputSt: React.CSSProperties = {
    width: '100%', padding: '5px 8px', fontSize: 12, border: '1px solid #D4A843',
    borderRadius: 2, background: '#fffbf0', textAlign: 'right', boxSizing: 'border-box',
  };
  const inputLeft: React.CSSProperties = { ...inputSt, textAlign: 'left' };
  const textareaStyle: React.CSSProperties = {
    width: '100%', minHeight: 80, padding: '8px 10px', fontSize: 12,
    lineHeight: '1.6', border: '1px solid #D4A843', borderRadius: 3,
    background: '#fffbf0', fontFamily: 'inherit', boxSizing: 'border-box', resize: 'vertical',
  };

  const renderAdjInput = (label: string, field: string, baseValue: number) => {
    if (!editing) return fmtM(baseValue);
    const adj = getAdj(label, field);
    return (
      <input
        value={adj || ''}
        onChange={e => {
          const v = e.target.value === '' ? 0 : parseFloat(e.target.value.replace(/\s/g, '').replace(',', '.')) || 0;
          setAdj(label, field, v);
        }}
        style={inputSt}
        placeholder={fmtM(baseValue - adj)}
        title={`Base: ${fmtM(baseValue - adj)} | Ajustement: ${adj}`}
      />
    );
  };

  const renderCreanceInput = (label: string, field: string) => {
    if (!editing) return fmtM(getAdj(label, field));
    return (
      <input
        value={getAdj(label, field) || ''}
        onChange={e => {
          const v = e.target.value === '' ? 0 : parseFloat(e.target.value.replace(/\s/g, '').replace(',', '.')) || 0;
          setAdj(label, field, v);
        }}
        style={inputSt}
      />
    );
  };

  const renderImmoRow = (r: { label: string; vals: ReturnType<typeof computeRow> }) => (
    <tr key={r.label}>
      <td style={tdStyle}>{r.label}</td>
      <td style={tdRight}>{renderAdjInput(r.label, 'anneeN', r.vals.anneeN)}</td>
      <td style={tdRight}>{renderAdjInput(r.label, 'anneeN1', r.vals.anneeN1)}</td>
      <td style={{ ...tdRight, background: '#fafafa' }}>{r.vals.variation !== 0 ? r.vals.variation.toFixed(1) + ' %' : ''}</td>
      <td style={tdRight}>{renderCreanceInput(r.label, 'creances1an')}</td>
      <td style={tdRight}>{renderCreanceInput(r.label, 'creances1a2ans')}</td>
      <td style={tdRight}>{renderCreanceInput(r.label, 'creancesPlus2ans')}</td>
    </tr>
  );

  const renderTotalRow = (label: string, totals: { anneeN: number; anneeN1: number; creances1an: number; creances1a2ans: number; creancesPlus2ans: number }, variation: number) => (
    <tr>
      <td style={tdBold}>{label}</td>
      <td style={tdBoldRight}>{fmtM(totals.anneeN)}</td>
      <td style={tdBoldRight}>{fmtM(totals.anneeN1)}</td>
      <td style={{ ...tdBoldRight, background: '#fafafa' }}>{variation !== 0 ? variation.toFixed(1) + ' %' : ''}</td>
      <td style={tdBoldRight}>{fmtM(totals.creances1an)}</td>
      <td style={tdBoldRight}>{fmtM(totals.creances1a2ans)}</td>
      <td style={tdBoldRight}>{fmtM(totals.creancesPlus2ans)}</td>
    </tr>
  );

  return (
    <div>
      <div className="etat-toolbar">
        <button className="etat-back-btn" onClick={onBack}><LuArrowLeft size={18} /> Retour</button>
        <div className="etat-toolbar-title">Note 4 — Immobilisations financières</div>
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
              <span>Aperçu — Note 4</span>
              <div className="etat-preview-actions">
                <button onClick={printPDF} title="Imprimer"><LuPrinter size={18} /></button>
                <button onClick={downloadPDF} title="Télécharger"><LuDownload size={18} /></button>
                <button onClick={closePreview}><LuX size={18} /></button>
              </div>
            </div>
            <iframe src={previewUrl} className="etat-preview-iframe" title="Aperçu Note 4" />
          </div>
        </div>
      )}

      <div ref={pageRef} style={{
        width: '297mm', minHeight: '210mm', background: '#fff',
        margin: '0 auto 20px', padding: '8mm 10mm',
        boxShadow: '0 2px 12px rgba(0,0,0,0.1)', boxSizing: 'border-box',
        fontFamily: "'Outfit', 'Segoe UI', Arial, sans-serif", fontSize: 12, color: '#1a1a1a',
      }}>
        {/* Header officiel */}
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
          NOTE 4 — IMMOBILISATIONS FINANCIERES
        </h3>

        {/* Tableau principal */}
        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 16 }}>
          <thead>
            <tr>
              <th style={{ ...thStyle, width: '22%' }} rowSpan={2}>Libellés</th>
              <th style={{ ...thStyle, width: '12%' }} rowSpan={2}>Année N</th>
              <th style={{ ...thStyle, width: '12%' }} rowSpan={2}>Année N-1</th>
              <th style={{ ...thStyle, width: '8%' }} rowSpan={2}>Variation %</th>
              <th style={thStyle} colSpan={3}>Échéances des créances</th>
            </tr>
            <tr>
              <th style={{ ...thStyle, width: '15%', fontSize: 9 }}>À un an au plus</th>
              <th style={{ ...thStyle, width: '15%', fontSize: 9 }}>Plus d'un an à deux ans</th>
              <th style={{ ...thStyle, width: '16%', fontSize: 9 }}>Plus de deux ans</th>
            </tr>
          </thead>
          <tbody>
            {brutRows.map(r => renderImmoRow(r))}
            {renderTotalRow('TOTAL BRUT', totalBrut, totalBrutVariation)}
            {depreciationRows.map(r => renderImmoRow(r))}
            <tr>
              <td style={tdStyle}>&nbsp;</td>
              <td style={tdRight}></td>
              <td style={tdRight}></td>
              <td style={tdRight}></td>
              <td style={tdRight}></td>
              <td style={tdRight}></td>
              <td style={tdRight}></td>
            </tr>
            {renderTotalRow('TOTAL NET DE DEPRECIATION', totalNet, totalNetVariation)}
          </tbody>
        </table>

        {/* Liste des filiales et participations */}
        <p style={{ fontSize: 12, fontWeight: 700, textAlign: 'center', margin: '20px 0 8px' }}>Liste des filiales et participations :</p>
        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 16 }}>
          <thead>
            <tr>
              <th style={{ ...thStyle, width: '28%' }}>Dénomination sociale</th>
              <th style={thStyle}>Localisation (ville / pays)</th>
              <th style={thStyle}>Valeur d'acquisition</th>
              <th style={thStyle}>% Détenu</th>
              <th style={thStyle}>Montant des capitaux propres filiale</th>
              <th style={thStyle}>Résultat dernier exercice filiale</th>
            </tr>
          </thead>
          <tbody>
            {filiales.map((f, i) => (
              <tr key={i}>
                <td style={tdStyle}>
                  {editing ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <input value={f.denomination} onChange={e => updateFiliale(i, 'denomination', e.target.value)} style={inputLeft} />
                      <button onClick={() => removeFiliale(i)} style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer', padding: 2, flexShrink: 0 }}>
                        <LuTrash2 size={14} />
                      </button>
                    </div>
                  ) : f.denomination}
                </td>
                <td style={tdStyle}>
                  {editing ? <input value={f.localisation} onChange={e => updateFiliale(i, 'localisation', e.target.value)} style={inputLeft} /> : f.localisation}
                </td>
                <td style={tdRight}>
                  {editing ? <input value={f.valeurAcquisition} onChange={e => updateFiliale(i, 'valeurAcquisition', e.target.value)} style={inputSt} /> : f.valeurAcquisition}
                </td>
                <td style={{ ...tdRight, textAlign: 'center' }}>
                  {editing ? <input value={f.pctDetenu} onChange={e => updateFiliale(i, 'pctDetenu', e.target.value)} style={{ ...inputSt, textAlign: 'center' }} /> : f.pctDetenu}
                </td>
                <td style={tdRight}>
                  {editing ? <input value={f.capitauxPropres} onChange={e => updateFiliale(i, 'capitauxPropres', e.target.value)} style={inputSt} /> : f.capitauxPropres}
                </td>
                <td style={tdRight}>
                  {editing ? <input value={f.resultatDernier} onChange={e => updateFiliale(i, 'resultatDernier', e.target.value)} style={inputSt} /> : f.resultatDernier}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {editing && (
          <div style={{ marginTop: 6, marginBottom: 10 }} className="no-print">
            <button onClick={addFiliale} style={{ background: '#D4A843', color: '#fff', border: 'none', borderRadius: 4, padding: '4px 12px', fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
              <LuPlus size={14} /> Ajouter une filiale
            </button>
          </div>
        )}

        {/* Commentaire */}
        <div style={{ border: '0.5px solid #000', padding: '10px 12px' }}>
          <p style={{ fontSize: 12, fontWeight: 700, marginBottom: 6, marginTop: 0 }}>Commentaire :</p>
          {editing ? (
            <textarea value={commentaire} onChange={e => setCommentaire(e.target.value)} style={textareaStyle} />
          ) : (
            <div style={{ fontSize: 12, lineHeight: 1.6, margin: 0, whiteSpace: 'pre-wrap', minHeight: 60 }}>
              {commentaire}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Note4;
