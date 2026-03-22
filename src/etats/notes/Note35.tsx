import React, { useState, useRef, useEffect } from 'react';
import { LuDownload, LuArrowLeft, LuEye, LuX, LuPrinter, LuSave, LuPenLine } from 'react-icons/lu';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import '../BilanSYCEBNL.css';
import '../FicheIdentification.css';
import type { Exercice, EtatBaseProps } from '../../types';

interface Note35Props extends EtatBaseProps { onGoToParametres?: () => void; }

interface Section {
  key: string;
  category?: string;
  title: string;
  items: string[];
}

const SECTIONS: Section[] = [
  {
    key: 'emploi', category: 'INFORMATIONS SOCIALES', title: 'Emploi',
    items: [
      "l'effectif total et la répartition des salariés par sexe, âge et zone géographique ;",
      "les embauches et les licenciements ;",
      "les rémunérations et leur évolution.",
    ],
  },
  {
    key: 'relations_sociales', title: 'Relations sociales',
    items: [
      "l'organisation du dialogue social ;",
      "le bilan des accords collectifs.",
    ],
  },
  {
    key: 'sante_securite', title: 'Santé et sécurité',
    items: [
      "les conditions de santé et de sécurité au travail ;",
      "le bilan des accords signés avec les organisations syndicales ou les représentants du personnel en matière de santé et de sécurité au travail.",
    ],
  },
  {
    key: 'formation', title: 'Formation',
    items: [
      "les politiques mises en œuvre en matière de formation ;",
      "le nombre total d'heures de formation.",
    ],
  },
  {
    key: 'egalite', title: 'Égalité de traitement',
    items: [
      "les mesures prises en faveur de l'égalité entre les femmes et les hommes ;",
      "les mesures prises en faveur de l'emploi et de l'insertion des personnes handicapées.",
    ],
  },
  {
    key: 'politique_env', category: 'INFORMATIONS ENVIRONNEMENTALES', title: 'Politique générale en matière environnementale',
    items: [
      "l'organisation de la société pour prendre en compte les questions environnementales et, le cas échéant, les démarches d'évaluation ou de certification en matière d'environnement ;",
      "les actions de formation et d'information des salariés menées en matière de protection de l'environnement ;",
      "les moyens consacrés à la prévention des risques environnementaux et des pollutions.",
    ],
  },
  {
    key: 'pollution', title: 'Pollution et gestion des déchets',
    items: [
      "les mesures de prévention, de réduction ou de réparation de rejets dans l'air, l'eau et le sol affectant gravement l'environnement ;",
      "les mesures de prévention, de recyclage et d'élimination des déchets ;",
      "la prise en compte des nuisances sonores et de toute autre forme de pollution spécifique à une activité.",
    ],
  },
  {
    key: 'ressources', title: 'Utilisation durable des ressources',
    items: [
      "la consommation d'eau et l'approvisionnement en eau en fonction des contraintes locales ;",
      "la consommation de matières premières et les mesures prises pour améliorer l'efficacité dans leur utilisation ;",
      "la consommation d'énergie, les mesures prises pour améliorer l'efficacité énergétique et le recours aux énergies renouvelables.",
    ],
  },
  {
    key: 'climat', title: 'Changement climatique',
    items: ["les rejets de gaz à effet de serre."],
  },
  {
    key: 'biodiversite', title: 'Protection de la biodiversité',
    items: ["les mesures prises pour préserver ou développer la biodiversité."],
  },
  {
    key: 'impact_territorial', category: 'INFORMATIONS RELATIVES AUX ENGAGEMENTS SOCIÉTAUX EN FAVEUR DU DÉVELOPPEMENT DURABLE', title: "Impact territorial, économique et social de l'activité de la société",
    items: [
      "en matière d'emploi et de développement régional ;",
      "sur les populations riveraines ou locales.",
    ],
  },
  {
    key: 'relations_parties', title: "Relations entretenues avec les personnes ou les organisations intéressées par l'activité de la société (associations d'insertion, établissements d'enseignement...)",
    items: [
      "les conditions du dialogue avec ces personnes ou organisations ;",
      "les actions de partenariat ou de mécénat.",
    ],
  },
  {
    key: 'sous_traitance', title: 'Sous-traitance et fournisseurs',
    items: [
      "la prise en compte dans la politique d'achat des enjeux sociaux et environnementaux.",
    ],
  },
];

function Note35({ entiteName, entiteNif = '', entiteId, offre, onBack }: Note35Props): React.JSX.Element {
  const [exercices, setExercices] = useState<Exercice[]>([]); const [selectedExercice, setSelectedExercice] = useState<Exercice | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null); const [pdfBlob, setPdfBlob] = useState<Blob | null>(null);
  const [params, setParams] = useState<Record<string, string>>({}); const [editing, setEditing] = useState(false); const [saving, setSaving] = useState(false); const [saved, setSaved] = useState(false);
  const [data, setData] = useState<Record<string, string>>({});
  const pageRef = useRef<HTMLDivElement>(null);

  const getVal = (key: string): string => data[key] || '';
  const setVal = (key: string, value: string) => setData(prev => ({ ...prev, [key]: value }));

  useEffect(() => { if (!entiteId) return; fetch('/api/entites/' + entiteId).then(r => r.json()).then(ent => { const d = ent.data || {}; setParams(d); if (d['note35_data']) { try { setData(JSON.parse(d['note35_data'])); } catch { /* */ } } }).catch(() => {}); }, [entiteId]);
  useEffect(() => { if (!entiteId) return; fetch('/api/balance/exercices/' + entiteId).then(r => r.json()).then((d: Exercice[]) => { setExercices(d); if (d.length > 0) { const now = new Date(); const y = now.getFullYear(); const m = now.getMonth(); const py = m <= 2 ? y - 1 : y; setSelectedExercice(d.find(e => e.annee === py) || d.find(e => e.annee === y) || d.find(e => e.annee === y - 1) || d[0]); } }).catch(() => {}); }, [entiteId]);

  const handleSave = async () => { setSaving(true); try { const d: Record<string, string> = { ...params, note35_data: JSON.stringify(data) }; const r = await fetch(`/api/entites/${entiteId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ data: d }) }); if (r.ok) { setParams(d); setSaved(true); setEditing(false); setTimeout(() => setSaved(false), 3000); } } catch { /* */ } setSaving(false); };

  const duree = selectedExercice?.duree_mois || 12; const dateFin = selectedExercice?.date_fin ? new Date(selectedExercice.date_fin) : null; const annee = selectedExercice ? selectedExercice.annee : new Date().getFullYear();
  const fmtDateShort = (d: Date | null): string => { if (!d) return ''; return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' }); };

  const generatePDF = async (): Promise<jsPDF> => { const w = editing; if (w) setEditing(false); await new Promise(r => setTimeout(r, 100)); const pdf = new jsPDF('p', 'mm', 'a4'); if (!pageRef.current) return pdf; const c = await html2canvas(pageRef.current, { scale: 2, useCORS: true, backgroundColor: '#ffffff' }); const imgW = 210; const imgH = (c.height * imgW) / c.width; let yOff = 0; while (yOff < imgH) { if (yOff > 0) pdf.addPage(); pdf.addImage(c.toDataURL('image/png'), 'PNG', 0, -yOff, imgW, imgH); yOff += 297; } if (w) setEditing(true); return pdf; };
  const openPreview = async () => { const pdf = await generatePDF(); const blob = pdf.output('blob'); setPdfBlob(blob); setPreviewUrl(URL.createObjectURL(blob)); };
  const closePreview = () => { if (previewUrl) URL.revokeObjectURL(previewUrl); setPreviewUrl(null); setPdfBlob(null); };
  const downloadPDF = () => { if (!pdfBlob) return; const u = URL.createObjectURL(pdfBlob); const a = document.createElement('a'); a.href = u; a.download = 'Note35_' + annee + '.pdf'; a.click(); URL.revokeObjectURL(u); };
  const printPDF = () => { if (!previewUrl) return; const w = window.open(previewUrl); if (w) { w.onload = () => w.print(); } };

  const cellStyle: React.CSSProperties = { border: '0.5px solid #000', padding: '5px 8px', fontSize: 9, verticalAlign: 'top' };
  const headerStyle: React.CSSProperties = { ...cellStyle, fontWeight: 700, background: '#e8e8e8', textAlign: 'center', fontSize: 10 };
  const sectionHeader: React.CSSProperties = { ...cellStyle, fontWeight: 700, background: '#f0f0f0', textDecoration: 'underline' };
  const taStyle: React.CSSProperties = { width: '100%', minHeight: 50, padding: '4px 6px', fontSize: 9, border: '1px solid #D4A843', borderRadius: 2, background: '#fffbf0', fontFamily: 'inherit', boxSizing: 'border-box', resize: 'vertical', lineHeight: 1.5 };

  return (
    <div>
      <div className="etat-toolbar">
        <button className="etat-back-btn" onClick={onBack}><LuArrowLeft size={18} /> Retour</button>
        <div className="etat-toolbar-title">Note 35 — Informations sociales, environnementales et sociétales</div>
        <div className="etat-toolbar-actions">
          <select className="etat-exercice-select" value={selectedExercice?.id || ''} onChange={e => { const ex = exercices.find(x => x.id === Number(e.target.value)); if (ex) setSelectedExercice(ex); }}>{exercices.map(ex => (<option key={ex.id} value={ex.id}>{ex.annee}</option>))}</select>
          {!editing ? (<button className="etat-action-btn" onClick={() => setEditing(true)} style={{ background: '#D4A843', color: '#fff', border: 'none' }}><LuPenLine size={16} /> Modifier</button>) : (<button className="etat-action-btn" onClick={handleSave} disabled={saving} style={{ background: '#059669', color: '#fff', border: 'none' }}><LuSave size={16} /> {saving ? 'Sauvegarde...' : 'Sauvegarder'}</button>)}
          <button className="etat-action-btn" onClick={openPreview}><LuEye size={16} /> Aperçu</button>
        </div>
      </div>
      {previewUrl && (<div className="etat-preview-overlay" onClick={closePreview}><div className="etat-preview-modal" onClick={e => e.stopPropagation()}><div className="etat-preview-header"><span>Aperçu — Note 35</span><div className="etat-preview-actions"><button onClick={printPDF} title="Imprimer"><LuPrinter size={18} /></button><button onClick={downloadPDF} title="Télécharger"><LuDownload size={18} /></button><button onClick={closePreview}><LuX size={18} /></button></div></div><iframe src={previewUrl} className="etat-preview-iframe" title="Aperçu Note 35" /></div></div>)}

      <div ref={pageRef} style={{ width: '210mm', minHeight: '297mm', background: '#fff', margin: '0 auto 20px', padding: '5mm 8mm', boxShadow: '0 2px 12px rgba(0,0,0,0.1)', boxSizing: 'border-box', fontFamily: "'Outfit', 'Segoe UI', Arial, sans-serif", fontSize: 9, color: '#1a1a1a' }}>
        <div className="etat-header-officiel"><div className="etat-header-grid"><div className="etat-header-row"><span className="etat-header-label">Désignation entité :</span><span className="etat-header-value">{entiteName || ''}</span><span className="etat-header-label">Exercice clos le :</span><span className="etat-header-value-right">{dateFin ? fmtDateShort(dateFin) : ''}</span></div><div className="etat-header-row"><span className="etat-header-label">Numéro d'identification :</span><span className="etat-header-value">{entiteNif || ''}</span><span className="etat-header-label">Durée (en mois) :</span><span className="etat-header-value-right">{duree}</span></div></div></div>
        <h3 style={{ textAlign: 'center', fontSize: 14, fontWeight: 700, margin: '30px 0 20px', textDecoration: 'underline' }}>
          NOTE 35 — LISTE DES INFORMATIONS SOCIALES, ENVIRONNEMENTALES ET SOCIETALES A FOURNIR
        </h3>

        <div style={{ textAlign: 'center', fontSize: 9, fontWeight: 700, marginBottom: 8, fontStyle: 'italic' }}>NOTE OBLIGATOIRE POUR LES ENTITES AYANT UN EFFECTIF DE PLUS DE 250 SALARIES</div>
        <div style={{ textAlign: 'center', fontSize: 8, marginBottom: 10, fontStyle: 'italic' }}>Liste des informations sociales, environnementales et sociétales à fournir</div>

        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <colgroup>
            <col style={{ width: '50%' }} />
            <col style={{ width: '50%' }} />
          </colgroup>
          <tbody>
            {SECTIONS.map((s) => (
              <React.Fragment key={s.key}>
                {s.category && (
                  <tr><td colSpan={2} style={headerStyle}>{s.category}</td></tr>
                )}
                <tr>
                  <td style={sectionHeader} colSpan={2}>
                    {s.title} :
                  </td>
                </tr>
                <tr>
                  <td style={cellStyle}>
                    <ul style={{ margin: '2px 0', paddingLeft: 14, lineHeight: 1.6 }}>
                      {s.items.map((item, j) => (
                        <li key={j} style={{ marginBottom: 2 }}>{item}</li>
                      ))}
                    </ul>
                  </td>
                  <td style={cellStyle}>
                    {editing ? (
                      <textarea value={getVal(s.key)} onChange={e => setVal(s.key, e.target.value)} style={taStyle} placeholder="Renseignez les informations ici..." />
                    ) : (
                      <span style={{ whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>{getVal(s.key)}</span>
                    )}
                  </td>
                </tr>
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default Note35;
