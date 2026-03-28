import React, { useState, useRef, useEffect } from 'react';
import { LuDownload, LuArrowLeft, LuEye, LuX, LuPrinter, LuSave, LuPenLine, LuInfo } from 'react-icons/lu';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import '../BilanSYCEBNL.css';
import '../FicheIdentification.css';
import type { Exercice, EtatBaseProps } from '../../types';

interface Note3BProps extends EtatBaseProps {
  onGoToParametres?: () => void;
}

interface RowData {
  label: string;
  bold?: boolean;
  isSousTotal?: boolean;
  isTotal?: boolean;
  isSeparator?: boolean;
}

const ROWS: RowData[] = [
  { label: 'Brevets, licences, logiciels et droits similaires' },
  { label: 'Fonds commercial et droit au bail' },
  { label: 'Autres immobilisations incorporelles' },
  { label: 'SOUS TOTAL : IMMOBILISATIONS INCORPORELLES', bold: true, isSousTotal: true },
  { label: '', isSeparator: true },
  { label: 'Terrains' },
  { label: 'Bâtiments' },
  { label: 'Aménagements, agencements et installations' },
  { label: 'Matériel, mobilier et actifs biologiques' },
  { label: 'Matériel de transport' },
  { label: 'SOUS TOTAL : IMMOBILISATIONS CORPORELLES', bold: true, isSousTotal: true },
  { label: '', isSeparator: true },
  { label: 'TOTAL GENERAL', bold: true, isTotal: true },
];

// Colonnes de valeurs
const VALUE_COLS = ['nature', 'a', 'acq', 'vir_aug', 'reeval', 'cess', 'vir_dim', 'd'] as const;
type ColKey = typeof VALUE_COLS[number];

function Note3B({ entiteName, entiteNif = '', entiteId, onBack }: Note3BProps): React.JSX.Element {
  const [exercices, setExercices] = useState<Exercice[]>([]);
  const [selectedExercice, setSelectedExercice] = useState<Exercice | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [pdfBlob, setPdfBlob] = useState<Blob | null>(null);
  const [params, setParams] = useState<Record<string, string>>({});
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [commentaire, setCommentaire] = useState('');
  // Valeurs manuelles par ligne (label) et colonne
  const [values, setValues] = useState<Record<string, Record<string, string>>>({});

  const pageRef = useRef<HTMLDivElement>(null);

  const getVal = (label: string, col: string): string => values[label]?.[col] || '';
  const setVal = (label: string, col: string, v: string) => {
    setValues(prev => ({
      ...prev,
      [label]: { ...(prev[label] || {}), [col]: v },
    }));
  };
  const numVal = (label: string, col: string): number => parseFloat(getVal(label, col).replace(/\s/g, '').replace(',', '.')) || 0;

  useEffect(() => {
    if (!entiteId) return;
    fetch('/api/entites/' + entiteId)
      .then(r => r.json())
      .then(ent => {
        const data = ent.data || {};
        setParams(data);
        setCommentaire(data['note3b_commentaire'] || '');
        if (data['note3b_values']) {
          try { setValues(JSON.parse(data['note3b_values'])); } catch { /* */ }
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

  const handleSave = async () => {
    setSaving(true);
    try {
      const data: Record<string, string> = {
        ...params,
        note3b_commentaire: commentaire,
        note3b_values: JSON.stringify(values),
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

  // Lignes de détail (pas sous-totaux, pas séparateurs, pas total)
  const detailRows = ROWS.filter(r => !r.isSousTotal && !r.isTotal && !r.isSeparator);
  const incorpRows = detailRows.slice(0, 3);
  const corpRows = detailRows.slice(3);

  // Calcul sous-totaux et total
  const sumRows = (rows: RowData[], col: ColKey): number => {
    if (col === 'nature') return 0;
    return rows.reduce((s, r) => s + numVal(r.label, col), 0);
  };

  // D = A + acq + vir_aug + reeval - cess - vir_dim
  const calcD = (label: string): number => {
    return numVal(label, 'a') + numVal(label, 'acq') + numVal(label, 'vir_aug') + numVal(label, 'reeval') - numVal(label, 'cess') - numVal(label, 'vir_dim');
  };
  const calcDSum = (rows: RowData[]): number => {
    return rows.reduce((s, r) => s + calcD(r.label), 0);
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
    a.download = 'Note3B_' + annee + '.pdf';
    a.click();
    URL.revokeObjectURL(url);
  };

  const printPDF = () => {
    if (!previewUrl) return;
    const w = window.open(previewUrl);
    if (w) { w.onload = () => w.print(); }
  };

  const thStyle: React.CSSProperties = {
    border: '0.5px solid #000', padding: '4px 6px', fontSize: 12,
    fontWeight: 600, textAlign: 'center', verticalAlign: 'middle', background: '#f5f5f5',
  };
  const tdStyle: React.CSSProperties = {
    border: '0.5px solid #000', padding: '5px 8px', fontSize: 12, verticalAlign: 'middle',
  };
  const tdRight: React.CSSProperties = { ...tdStyle, textAlign: 'right', fontVariantNumeric: 'tabular-nums' };
  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '2px 4px', fontSize: 12, border: '1px solid #D4A843',
    borderRadius: 2, background: '#fffbf0', textAlign: 'right', boxSizing: 'border-box',
  };
  const inputCenter: React.CSSProperties = { ...inputStyle, textAlign: 'center' };

  const renderValueCell = (label: string, col: ColKey, isDetail: boolean) => {
    if (!isDetail) return null; // sous-totaux calculés séparément
    if (col === 'd') return <td style={tdRight}>{fmtM(calcD(label))}</td>;
    if (col === 'nature') {
      return (
        <td style={{ ...tdStyle, textAlign: 'center' }}>
          {editing ? <input style={inputCenter} value={getVal(label, col)} onChange={e => setVal(label, col, e.target.value)} /> : getVal(label, col)}
        </td>
      );
    }
    return (
      <td style={tdRight}>
        {editing ? <input style={inputStyle} value={getVal(label, col)} onChange={e => setVal(label, col, e.target.value)} /> : (getVal(label, col) || '0')}
      </td>
    );
  };

  const renderSousTotalCell = (rows: RowData[], col: ColKey) => {
    if (col === 'nature') return <td style={tdStyle}></td>;
    if (col === 'd') return <td style={{ ...tdRight, fontWeight: 700 }}>{fmtM(calcDSum(rows))}</td>;
    return <td style={{ ...tdRight, fontWeight: 700 }}>{fmtM(sumRows(rows, col))}</td>;
  };

  const renderTotalCell = (col: ColKey) => {
    const allDetail = [...incorpRows, ...corpRows];
    if (col === 'nature') return <td style={tdStyle}></td>;
    if (col === 'd') return <td style={{ ...tdRight, fontWeight: 700 }}>{fmtM(calcDSum(allDetail))}</td>;
    return <td style={{ ...tdRight, fontWeight: 700 }}>{fmtM(sumRows(allDetail, col))}</td>;
  };

  const numCols: ColKey[] = ['nature', 'a', 'acq', 'vir_aug', 'reeval', 'cess', 'vir_dim', 'd'];

  return (
    <div>
      <div className="etat-toolbar">
        <button className="etat-back-btn" onClick={onBack}><LuArrowLeft size={18} /> Retour</button>
        <div className="etat-toolbar-title">Note 3B — Biens pris en location acquisition</div>
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
              <span>Aperçu — Note 3B</span>
              <div className="etat-preview-actions">
                <button onClick={printPDF} title="Imprimer"><LuPrinter size={18} /></button>
                <button onClick={downloadPDF} title="Télécharger"><LuDownload size={18} /></button>
                <button onClick={closePreview}><LuX size={18} /></button>
              </div>
            </div>
            <iframe src={previewUrl} className="etat-preview-iframe" title="Aperçu Note 3B" />
          </div>
        </div>
      )}

      {/* Bulle d'information */}
      <div style={{ margin: '12px 20px', padding: '12px 16px', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 8, fontSize: 12, color: '#1e40af', lineHeight: 1.6 }}>
        <div style={{ fontWeight: 700, marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
          <LuInfo size={14} /> Note d'information — Note 3B
        </div>
        <ul style={{ margin: 0, paddingLeft: 18 }}>
          <li><strong>Biens en crédit-bail :</strong> Biens utilisés par l'entité mais dont elle n'est pas propriétaire (comptes 17x).</li>
          <li><strong>Redevances :</strong> Montant des loyers versés au titre du contrat de crédit-bail (compte 623).</li>
          <li><strong>Valeur résiduelle :</strong> Prix d'achat convenu pour le transfert de propriété en fin de contrat.</li>
          <li>Les biens en crédit-bail ne figurent pas à l'actif du bilan (sauf retraitement SYSCOHADA révisé).</li>
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
          NOTE 3B — BIENS PRIS EN LOCATION ACQUISITION
        </h3>

        {/* Tableau */}
        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 10 }}>
          <thead>
            <tr>
              <th rowSpan={2} style={{ ...thStyle, width: '22%', textAlign: 'left' }}>
                <div style={{ fontWeight: 700 }}>SITUATIONS ET MOUVEMENTS</div>
                <div style={{ marginTop: 6, fontWeight: 700 }}>RUBRIQUES</div>
              </th>
              <th rowSpan={2} style={{ ...thStyle, width: '6%' }}>
                NATURE<br />DU<br />CONTRAT<br /><span style={{ fontSize: 9 }}>(I ; M ; A)</span><br /><span style={{ fontSize: 9 }}>(1)</span>
              </th>
              <th rowSpan={2} style={{ ...thStyle, width: '10%' }}>
                A<br /><span style={{ fontWeight: 400, fontSize: 10 }}>MONTANT<br />BRUT A<br />L'OUVERTURE<br />DE L'EXERCICE</span>
              </th>
              <th colSpan={3} style={thStyle}>AUGMENTATIONS B</th>
              <th colSpan={2} style={thStyle}>DIMINUTIONS C</th>
              <th rowSpan={2} style={{ ...thStyle, width: '10%' }}>
                D = A + B - C<br /><span style={{ fontWeight: 400, fontSize: 10 }}>MONTANT<br />BRUT A LA<br />CLOTURE<br />DE<br />L'EXERCICE</span>
              </th>
            </tr>
            <tr>
              <th style={{ ...thStyle, width: '9%' }}><span style={{ fontSize: 10 }}>Acquisitions<br />Apports<br />Créations</span></th>
              <th style={{ ...thStyle, width: '8%' }}><span style={{ fontSize: 10 }}>Virements<br />de poste<br />à poste</span></th>
              <th style={{ ...thStyle, width: '9%' }}><span style={{ fontSize: 10 }}>Suite à une<br />réévaluation<br />pratiquée<br />au cours de<br />l'exercice</span></th>
              <th style={{ ...thStyle, width: '8%' }}><span style={{ fontSize: 10 }}>Cessions<br />Scissions<br />Hors<br />service</span></th>
              <th style={{ ...thStyle, width: '8%' }}><span style={{ fontSize: 10 }}>Virements<br />de poste<br />à poste</span></th>
            </tr>
          </thead>
          <tbody>
            {ROWS.map((r, i) => {
              if (r.isSeparator) {
                return <tr key={i}><td colSpan={9} style={{ ...tdStyle, height: 4, padding: 0, border: '0.5px solid #000' }}></td></tr>;
              }
              if (r.isSousTotal) {
                const isIncorp = r.label.includes('INCORPORELLES');
                const sourceRows = isIncorp ? incorpRows : corpRows;
                return (
                  <tr key={i}>
                    <td style={{ ...tdStyle, fontWeight: 700 }}>{r.label}</td>
                    {numCols.map(col => <React.Fragment key={col}>{renderSousTotalCell(sourceRows, col)}</React.Fragment>)}
                  </tr>
                );
              }
              if (r.isTotal) {
                return (
                  <tr key={i} style={{ borderTop: '2px solid #000' }}>
                    <td style={{ ...tdStyle, fontWeight: 700 }}>{r.label}</td>
                    {numCols.map(col => <React.Fragment key={col}>{renderTotalCell(col)}</React.Fragment>)}
                  </tr>
                );
              }
              return (
                <tr key={i}>
                  <td style={tdStyle}>{r.label}</td>
                  {numCols.map(col => <React.Fragment key={col}>{renderValueCell(r.label, col, true)}</React.Fragment>)}
                </tr>
              );
            })}
          </tbody>
        </table>

        {/* Note de bas */}
        <div style={{ fontSize: 10, marginBottom: 6 }}>
          <sup>(1)</sup> I : Crédit-bail immobilier ; M : Crédit-bail mobilier ; A : Autres contrats (dédoubler le poste si montants significatifs)
        </div>

        {/* Commentaire */}
        <div>
          <span style={{ fontSize: 12, fontWeight: 700 }}>Commentaire : </span>
          {editing ? (
            <textarea
              value={commentaire}
              onChange={e => setCommentaire(e.target.value)}
              style={{
                width: '100%', minHeight: 60, padding: '6px 8px', fontSize: 10,
                fontStyle: 'italic', lineHeight: '1.7', border: '1px solid #D4A843',
                borderRadius: 3, background: '#fffbf0', fontFamily: 'inherit',
                boxSizing: 'border-box', resize: 'vertical', marginTop: 4,
              }}
            />
          ) : (
            <span style={{ fontSize: 12, fontStyle: 'italic' }}>
              {commentaire || 'Indiquer la nature du bien, le nom du bailleur et la durée du bail.'}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

export default Note3B;
