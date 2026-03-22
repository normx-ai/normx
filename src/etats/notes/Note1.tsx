import React, { useState, useRef, useEffect } from 'react';
import { LuDownload, LuArrowLeft, LuEye, LuX, LuPrinter, LuSave, LuPenLine, LuInfo } from 'react-icons/lu';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import '../BilanSYCEBNL.css';
import '../FicheIdentification.css';
import type { Exercice, EtatBaseProps, BalanceLigne } from '../../types';

interface Note1Props extends EtatBaseProps {
  onGoToParametres?: () => void;
}

function Note1({ entiteName, entiteNif = '', entiteId, offre, onBack }: Note1Props): React.JSX.Element {
  const [exercices, setExercices] = useState<Exercice[]>([]);
  const [selectedExercice, setSelectedExercice] = useState<Exercice | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [pdfBlob, setPdfBlob] = useState<Blob | null>(null);
  const [params, setParams] = useState<Record<string, string>>({});
  const [lignesBalance, setLignesBalance] = useState<BalanceLigne[]>([]);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Editable fields
  const [hypotheques, setHypotheques] = useState('');
  const [nantissements, setNantissements] = useState('');
  const [gages, setGages] = useState('');
  const [commentaire, setCommentaire] = useState('');
  const [montantBrutEmprunts, setMontantBrutEmprunts] = useState('');
  const [montantBrutIC, setMontantBrutIC] = useState('');
  const [montantBrutCB, setMontantBrutCB] = useState('');

  const pageRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!entiteId) return;
    fetch('/api/entites/' + entiteId)
      .then(r => r.json())
      .then(ent => {
        const data = ent.data || {};
        setParams(data);
        setHypotheques(data['note1_hypotheques'] || '');
        setNantissements(data['note1_nantissements'] || '');
        setGages(data['note1_gages'] || '');
        setCommentaire(data['note1_commentaire'] || '');
        setMontantBrutEmprunts(data['note1_montant_emprunts'] || '');
        setMontantBrutIC(data['note1_montant_ic'] || '');
        setMontantBrutCB(data['note1_montant_cb'] || '');
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
        setLignesBalance(lignes);
      } catch { setLignesBalance([]); }
    };
    load();
  }, [entiteId, selectedExercice, balanceSource]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const data: Record<string, string> = {
        ...params,
        note1_hypotheques: hypotheques,
        note1_nantissements: nantissements,
        note1_gages: gages,
        note1_commentaire: commentaire,
        note1_montant_emprunts: montantBrutEmprunts,
        note1_montant_ic: montantBrutIC,
        note1_montant_cb: montantBrutCB,
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

  const annee = selectedExercice ? selectedExercice.annee : new Date().getFullYear();
  const duree = selectedExercice?.duree_mois || 12;
  const dateFin = selectedExercice?.date_fin ? new Date(selectedExercice.date_fin) : null;

  const fmtDateShort = (d: Date | null): string => {
    if (!d) return '';
    return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  const fmtMontant = (val: number): string => {
    if (!val || val === 0) return '';
    return Math.round(val).toLocaleString('fr-FR');
  };

  // Calculer les dettes financières depuis la balance — détail par sous-compte
  // 16x complet (intérêts courus 166 inclus car rattachés à l'emprunt)
  const emprunts16 = lignesBalance.filter(l => {
    const num = (l.numero_compte || '').trim();
    return num.startsWith('16');
  });

  // Valeur brute = solde créditeur uniquement (pas le net SC-SD)
  const calcMontant = (lignes: BalanceLigne[]): number => {
    let total = 0;
    lignes.forEach(l => {
      const sc = parseFloat(String(l.solde_crediteur_revise ?? l.solde_crediteur)) || 0;
      total += sc;
    });
    return total;
  };

  // Valeur balance (référence) — uniquement 16x (emprunts propres de l'entité)
  const balRef16 = calcMontant(emprunts16);

  // Montant affiché : valeur saisie si existante, sinon balance comme référence
  const val16 = montantBrutEmprunts ? parseFloat(montantBrutEmprunts.replace(/\s/g, '').replace(/,/g, '.')) || 0 : balRef16;
  const totalMontant = val16;

  const generatePDF = async (): Promise<jsPDF> => {
    const wasEditing = editing;
    if (wasEditing) setEditing(false);
    // Wait for re-render
    await new Promise(r => setTimeout(r, 100));
    const pdf = new jsPDF('landscape', 'mm', 'a4');
    if (!pageRef.current) return pdf;
    const canvas = await html2canvas(pageRef.current, { scale: 2, useCORS: true, backgroundColor: '#ffffff' });
    const imgData = canvas.toDataURL('image/png');
    const pdfWidth = 287; // A4 paysage = 297mm - marges 5mm chaque côté
    const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
    pdf.addImage(imgData, 'PNG', 5, 5, pdfWidth, pdfHeight);
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
    a.download = 'Note1_' + annee + '.pdf';
    a.click();
    URL.revokeObjectURL(url);
  };

  const printPDF = () => {
    if (!previewUrl) return;
    const w = window.open(previewUrl);
    if (w) { w.onload = () => w.print(); }
  };

  const thStyle: React.CSSProperties = {
    border: '0.5px solid #000',
    padding: '6px 8px',
    fontSize: 12,
    fontWeight: 600,
    textAlign: 'center',
    verticalAlign: 'middle',
    background: '#f5f5f5',
  };

  const tdStyle: React.CSSProperties = {
    border: '0.5px solid #000',
    padding: '6px 8px',
    fontSize: 12,
    verticalAlign: 'middle',
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '4px 6px',
    fontSize: 12,
    border: '1px solid #D4A843',
    borderRadius: 3,
    background: '#fffbf0',
    boxSizing: 'border-box',
    textAlign: 'center',
  };

  return (
    <div>
      {/* Toolbar */}
      <div className="etat-toolbar">
        <button className="etat-back-btn" onClick={onBack}><LuArrowLeft size={18} /> Retour</button>
        <div className="etat-toolbar-title">Note 1 — Dettes garanties par des sûretés réelles</div>
        <div className="etat-toolbar-actions">
          <select
            className="etat-exercice-select"
            value={selectedExercice?.id || ''}
            onChange={e => {
              const ex = exercices.find(ex => ex.id === Number(e.target.value));
              if (ex) setSelectedExercice(ex);
            }}
          >
            {exercices.map(ex => (
              <option key={ex.id} value={ex.id}>{ex.annee}</option>
            ))}
          </select>
          {!editing ? (
            <button className="etat-action-btn" onClick={() => setEditing(true)} style={{ background: '#D4A843', color: '#fff', border: 'none' }}>
              <LuPenLine size={16} /> Modifier
            </button>
          ) : (
            <button
              className="etat-action-btn"
              onClick={handleSave}
              disabled={saving}
              style={{ background: saved ? '#059669' : '#059669', color: '#fff', border: 'none' }}
            >
              <LuSave size={16} /> {saving ? 'Sauvegarde...' : saved ? 'Sauvegardé' : 'Sauvegarder'}
            </button>
          )}
          <button className="etat-action-btn" onClick={openPreview}><LuEye size={16} /> Aperçu</button>
        </div>
      </div>

      {/* Preview modal */}
      {previewUrl && (
        <div className="etat-preview-overlay" onClick={closePreview}>
          <div className="etat-preview-modal" onClick={e => e.stopPropagation()}>
            <div className="etat-preview-header">
              <span>Aperçu — Note 1</span>
              <div className="etat-preview-actions">
                <button onClick={printPDF} title="Imprimer"><LuPrinter size={18} /></button>
                <button onClick={downloadPDF} title="Télécharger"><LuDownload size={18} /></button>
                <button onClick={closePreview}><LuX size={18} /></button>
              </div>
            </div>
            <iframe src={previewUrl} className="etat-preview-iframe" title="Aperçu Note 1" />
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
          <LuInfo size={14} /> Note d'information — Note 1
        </div>
        <ul style={{ margin: 0, paddingLeft: 18 }}>
          <li><strong>Montant brut :</strong> Renseigner la valeur initiale brute de chaque emprunt (montant emprunté à l'origine), pas le solde restant dû. La balance (comptes 16x) est utilisée comme pré-remplissage à titre indicatif.</li>
          <li><strong>Sûretés réelles :</strong> Indiquer la référence du contrat et les montants des hypothèques, nantissements et gages/autres garanties. Ces informations sont extra-comptables (contrats de prêt, actes notariés, conventions de garantie).</li>
          <li><strong>Crédit-bail (17x) :</strong> Les biens en crédit-bail n'appartiennent pas à l'entité et ne sont donc pas concernés par cette note.</li>
          <li>Cliquer sur <strong>Modifier</strong> pour saisir les montants, puis <strong>Sauvegarder</strong>.</li>
        </ul>
      </div>

      {/* Page A4 paysage */}
      <div className="a4-page fi-page" ref={pageRef} style={{ width: 1050, minHeight: 680, padding: '25px 35px' }}>
        {/* En-tête */}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
          <div>
            <div style={{ fontSize: 12 }}><strong>Désignation entité :</strong> {entiteName}</div>
            <div style={{ fontSize: 12 }}><strong>Numéro d'identification :</strong> {entiteNif}</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 12 }}><strong>Exercice clos le</strong> {dateFin ? fmtDateShort(dateFin) : ''}</div>
            <div style={{ fontSize: 12 }}><strong>Durée (en mois)</strong> {duree}</div>
          </div>
        </div>

        {/* Titre */}
        <h3 style={{ textAlign: 'center', fontSize: 14, fontWeight: 700, margin: '20px 0 6px', textDecoration: 'underline' }}>
          NOTE 1 — DETTES GARANTIES PAR DES SURETES REELLES DONNEES PAR L'ENTITE
        </h3>
        <p style={{ textAlign: 'center', fontSize: 11, color: '#666', marginBottom: 20 }}>
          (montants en FCFA)
        </p>

        {/* Tableau */}
        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 20 }}>
          <thead>
            <tr>
              <th rowSpan={2} style={{ ...thStyle, width: '28%' }}>LIBELLES</th>
              <th rowSpan={2} style={{ ...thStyle, width: '8%' }}>Note</th>
              <th rowSpan={2} style={{ ...thStyle, width: '18%' }}>Montant brut</th>
              <th colSpan={3} style={thStyle}>SURETES REELLES</th>
            </tr>
            <tr>
              <th style={{ ...thStyle, width: '16%' }}>Hypothèques</th>
              <th style={{ ...thStyle, width: '16%' }}>Nantissements</th>
              <th style={{ ...thStyle, width: '14%' }}>Gages/<br />autres</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td colSpan={6} style={{ ...tdStyle, fontWeight: 600, textDecoration: 'underline' }}>
                Dettes financières et ressources assimilées :
              </td>
            </tr>
            {/* Emprunts 16x (hors intérêts courus) */}
            <tr>
              <td style={tdStyle}>Emprunts et dettes des établissements de crédit</td>
              <td style={{ ...tdStyle, textAlign: 'center' }}>16A</td>
              <td style={{ ...tdStyle, textAlign: 'right' }}>
                {editing ? (
                  <input style={{ ...inputStyle, textAlign: 'right' }} value={montantBrutEmprunts || String(Math.round(balRef16))} onChange={e => setMontantBrutEmprunts(e.target.value)} />
                ) : fmtMontant(val16)}
              </td>
              <td style={{ ...tdStyle, textAlign: 'center' }}>
                {editing ? <input style={inputStyle} value={hypotheques} onChange={e => setHypotheques(e.target.value)} /> : hypotheques}
              </td>
              <td style={{ ...tdStyle, textAlign: 'center' }}>
                {editing ? <input style={inputStyle} value={nantissements} onChange={e => setNantissements(e.target.value)} /> : nantissements}
              </td>
              <td style={{ ...tdStyle, textAlign: 'center' }}>
                {editing ? <input style={inputStyle} value={gages} onChange={e => setGages(e.target.value)} /> : gages}
              </td>
            </tr>
            <tr>
              <td style={{ ...tdStyle, fontWeight: 700, textAlign: 'center' }}>TOTAL</td>
              <td style={tdStyle}></td>
              <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 700 }}>{fmtMontant(totalMontant)}</td>
              <td style={tdStyle}></td>
              <td style={tdStyle}></td>
              <td style={tdStyle}></td>
            </tr>
          </tbody>
        </table>

        {/* Commentaire */}
        <div style={{ marginTop: 20 }}>
          <p style={{ fontSize: 12, fontWeight: 700, textDecoration: 'underline', marginBottom: 10 }}>Commentaire :</p>
          {editing ? (
            <textarea
              value={commentaire}
              onChange={e => setCommentaire(e.target.value)}
              style={{
                width: '100%',
                minHeight: 100,
                padding: '8px 10px',
                fontSize: 12,
                fontStyle: 'italic',
                lineHeight: '1.8',
                border: '1px solid #D4A843',
                borderRadius: 4,
                background: '#fffbf0',
                fontFamily: 'inherit',
                boxSizing: 'border-box',
                resize: 'vertical',
              }}
            />
          ) : (
            <p style={{ fontSize: 12, fontStyle: 'italic', lineHeight: 1.8, whiteSpace: 'pre-wrap' }}>
              {commentaire}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export default Note1;
