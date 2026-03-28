import React, { useState, useRef, useEffect } from 'react';
import { LuDownload, LuArrowLeft, LuEye, LuX, LuPrinter, LuSave, LuPenLine  } from 'react-icons/lu';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import '../BilanSYCEBNL.css';
import '../FicheIdentification.css';
import type { Exercice, EtatBaseProps } from '../../types';

interface Note36Props extends EtatBaseProps { onGoToParametres?: () => void; }

const FORMES_JURIDIQUES = [
  { label: 'Société Anonyme (SA) à participation publique', code1: '0', code2: '0' },
  { label: 'Société Anonyme (SA)', code1: '0', code2: '1' },
  { label: 'Société à Responsabilité Limitée (SARL)', code1: '0', code2: '2' },
  { label: 'Société en Commandite Simple (SCS)', code1: '0', code2: '3' },
  { label: 'Société en Nom Collectif (SNC)', code1: '0', code2: '4' },
  { label: 'Société en Participation (SP)', code1: '0', code2: '5' },
  { label: "Groupement d'Intérêt Economique (GIE)", code1: '0', code2: '6' },
  { label: 'Association', code1: '0', code2: '7' },
  { label: 'Société par Actions Simplifiée (SAS)', code1: '0', code2: '8' },
  { label: 'Autre forme juridique (à préciser)', code1: '0', code2: '9' },
];

const PAYS_SIEGE = [
  { label: 'Pays OHADA (²)', code1: '', code2: '' },
  { label: 'Autres pays africains', code1: '2', code2: '1' },
  { label: 'France', code1: '2', code2: '3' },
  { label: "Autres pays de l'Union Européenne", code1: '3', code2: '9' },
  { label: 'U.S.A.', code1: '4', code2: '0' },
  { label: 'Canada', code1: '4', code2: '1' },
  { label: 'Autres pays américains', code1: '4', code2: '9' },
  { label: 'Pays asiatiques', code1: '5', code2: '0' },
  { label: 'Autres pays', code1: '9', code2: '9' },
];

const REGIMES_FISCAUX = [
  { label: 'Réel normal', code: '1' },
  { label: 'Réel simplifié', code: '2' },
  { label: 'Synthétique', code: '3' },
  { label: 'Forfait', code: '4' },
];

function Note36({ entiteName, entiteNif = '', entiteId, offre, onBack }: Note36Props): React.JSX.Element {
  const [exercices, setExercices] = useState<Exercice[]>([]); const [selectedExercice, setSelectedExercice] = useState<Exercice | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null); const [pdfBlob, setPdfBlob] = useState<Blob | null>(null);
  const [params, setParams] = useState<Record<string, string>>({}); const [editing, setEditing] = useState(false); const [saving, setSaving] = useState(false); const [saved, setSaved] = useState(false);
  const [formeJuridique, setFormeJuridique] = useState('');
  const [paysSiege, setPaysSiege] = useState('');
  const [paysOhada, setPaysOhada] = useState('');
  const [regimeFiscal, setRegimeFiscal] = useState('');
  const pageRef = useRef<HTMLDivElement>(null);

  useEffect(() => { if (!entiteId) return; fetch('/api/entites/' + entiteId).then(r => r.json()).then(ent => { const d = ent.data || {}; setParams(d); setFormeJuridique(d['note36_forme_juridique'] || ''); setPaysSiege(d['note36_pays_siege'] || ''); setPaysOhada(d['note36_pays_ohada'] || ''); setRegimeFiscal(d['note36_regime_fiscal'] || ''); }).catch(() => {}); }, [entiteId]);
  useEffect(() => { if (!entiteId) return; fetch('/api/balance/exercices/' + entiteId).then(r => r.json()).then((d: Exercice[]) => { setExercices(d); if (d.length > 0) { const now = new Date(); const y = now.getFullYear(); const m = now.getMonth(); const py = m <= 2 ? y - 1 : y; setSelectedExercice(d.find(e => e.annee === py) || d.find(e => e.annee === y) || d.find(e => e.annee === y - 1) || d[0]); } }).catch(() => {}); }, [entiteId]);

  const handleSave = async () => { setSaving(true); try { const d: Record<string, string> = { ...params, note36_forme_juridique: formeJuridique, note36_pays_siege: paysSiege, note36_pays_ohada: paysOhada, note36_regime_fiscal: regimeFiscal }; const r = await fetch(`/api/entites/${entiteId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ data: d }) }); if (r.ok) { setParams(d); setSaved(true); setEditing(false); setTimeout(() => setSaved(false), 3000); } } catch { /* */ } setSaving(false); };

  const duree = selectedExercice?.duree_mois || 12; const dateFin = selectedExercice?.date_fin ? new Date(selectedExercice.date_fin) : null; const annee = selectedExercice ? selectedExercice.annee : new Date().getFullYear();
  const fmtDateShort = (d: Date | null): string => { if (!d) return ''; return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' }); };

  const generatePDF = async (): Promise<jsPDF> => { const w = editing; if (w) setEditing(false); await new Promise(r => setTimeout(r, 100)); const pdf = new jsPDF('p', 'mm', 'a4'); if (!pageRef.current) return pdf; const c = await html2canvas(pageRef.current, { scale: 2, useCORS: true, backgroundColor: '#ffffff' }); pdf.addImage(c.toDataURL('image/png'), 'PNG', 0, 0, 210, Math.min((c.height * 210) / c.width, 297)); if (w) setEditing(true); return pdf; };
  const openPreview = async () => { const pdf = await generatePDF(); const blob = pdf.output('blob'); setPdfBlob(blob); setPreviewUrl(URL.createObjectURL(blob)); };
  const closePreview = () => { if (previewUrl) URL.revokeObjectURL(previewUrl); setPreviewUrl(null); setPdfBlob(null); };
  const downloadPDF = () => { if (!pdfBlob) return; const u = URL.createObjectURL(pdfBlob); const a = document.createElement('a'); a.href = u; a.download = 'Note36_' + annee + '.pdf'; a.click(); URL.revokeObjectURL(u); };
  const printPDF = () => { if (!previewUrl) return; const w = window.open(previewUrl); if (w) { w.onload = () => w.print(); } };

  const th: React.CSSProperties = { border: '0.5px solid #000', padding: '8px 10px', fontSize: 10, fontWeight: 700, textAlign: 'center', verticalAlign: 'middle', background: '#f5f5f5' };
  const td: React.CSSProperties = { border: '0.5px solid #000', padding: '7px 10px', fontSize: 10, verticalAlign: 'middle' };
  const tdC: React.CSSProperties = { ...td, textAlign: 'center', width: 30, fontWeight: 600 };
  const radio: React.CSSProperties = { width: 14, height: 14, accentColor: '#D4A843', cursor: 'pointer' };

  const selectedFJ = FORMES_JURIDIQUES.find(f => f.label === formeJuridique);
  const selectedPS = PAYS_SIEGE.find(p => p.label === paysSiege);
  const selectedRF = REGIMES_FISCAUX.find(r => r.label === regimeFiscal);

  return (
    <div>
      <div className="etat-toolbar">
        <button className="etat-back-btn" onClick={onBack}><LuArrowLeft size={18} /> Retour</button>
        <div className="etat-toolbar-title">Note 36 — Table des codes</div>
        <div className="etat-toolbar-actions">
          <select className="etat-exercice-select" value={selectedExercice?.id || ''} onChange={e => { const ex = exercices.find(x => x.id === Number(e.target.value)); if (ex) setSelectedExercice(ex); }}>{exercices.map(ex => (<option key={ex.id} value={ex.id}>{ex.annee}</option>))}</select>
          {!editing ? (<button className="etat-action-btn" onClick={() => setEditing(true)} style={{ background: '#D4A843', color: '#fff', border: 'none' }}><LuPenLine size={16} /> Modifier</button>) : (<button className="etat-action-btn" onClick={handleSave} disabled={saving} style={{ background: '#059669', color: '#fff', border: 'none' }}><LuSave size={16} /> {saving ? 'Sauvegarde...' : 'Sauvegarder'}</button>)}
          <button className="etat-action-btn" onClick={openPreview}><LuEye size={16} /> Aperçu</button>
        </div>
      </div>
      {previewUrl && (<div className="etat-preview-overlay" onClick={closePreview}><div className="etat-preview-modal" onClick={e => e.stopPropagation()}><div className="etat-preview-header"><span>Aperçu — Note 36</span><div className="etat-preview-actions"><button onClick={printPDF} title="Imprimer"><LuPrinter size={18} /></button><button onClick={downloadPDF} title="Télécharger"><LuDownload size={18} /></button><button onClick={closePreview}><LuX size={18} /></button></div></div><iframe src={previewUrl} className="etat-preview-iframe" title="Aperçu Note 36" /></div></div>)}

      <div ref={pageRef} style={{ width: '210mm', minHeight: '297mm', background: '#fff', margin: '0 auto 20px', padding: '6mm 10mm', boxShadow: '0 2px 12px rgba(0,0,0,0.1)', boxSizing: 'border-box', fontFamily: "'Outfit', 'Segoe UI', Arial, sans-serif", fontSize: 10, color: '#1a1a1a' }}>
        <div className="etat-header-officiel"><div className="etat-header-grid"><div className="etat-header-row"><span className="etat-header-label">Désignation entité :</span><span className="etat-header-value">{entiteName || ''}</span><span className="etat-header-label">Exercice clos le :</span><span className="etat-header-value-right">{dateFin ? fmtDateShort(dateFin) : ''}</span></div><div className="etat-header-row"><span className="etat-header-label">Numéro d'identification :</span><span className="etat-header-value">{entiteNif || ''}</span><span className="etat-header-label">Durée (en mois) :</span><span className="etat-header-value-right">{duree}</span></div></div></div>
        <h3 style={{ textAlign: 'center', fontSize: 14, fontWeight: 700, margin: '30px 0 20px', textDecoration: 'underline' }}>
          NOTE 36 — TABLE DES CODES
        </h3>

        {/* Tableau principal : Forme juridique + Pays siège côte à côte */}
        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 20 }}>
          <thead>
            <tr>
              <th style={{ ...th, width: '36%' }}>1 - Code forme juridique <sup>(1)</sup></th>
              <th style={{ ...th, width: '4%' }}></th>
              <th style={{ ...th, width: '4%' }}></th>
              <th style={{ ...th, width: '36%' }}>3 - Code pays du siège social</th>
              <th style={{ ...th, width: '4%' }}></th>
              <th style={{ ...th, width: '4%' }}></th>
              {editing && <th style={{ ...th, width: '12%' }}></th>}
            </tr>
          </thead>
          <tbody>
            {FORMES_JURIDIQUES.map((fj, i) => {
              const isSelected = formeJuridique === fj.label;
              const ps = i < PAYS_SIEGE.length ? PAYS_SIEGE[i] : null;
              const psSelected = ps && paysSiege === ps.label;
              return (
                <tr key={i}>
                  <td style={{ ...td, fontWeight: isSelected ? 700 : 400, background: isSelected ? '#fffbf0' : undefined }}>
                    {editing ? (
                      <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                        <input type="radio" name="fj" checked={isSelected} onChange={() => setFormeJuridique(fj.label)} style={radio} />
                        {fj.label}
                      </label>
                    ) : fj.label}
                  </td>
                  <td style={{ ...tdC, background: isSelected ? '#fffbf0' : undefined }}>{isSelected ? fj.code1 : fj.code1}</td>
                  <td style={{ ...tdC, background: isSelected ? '#fffbf0' : undefined }}>{isSelected ? fj.code2 : fj.code2}</td>
                  {ps ? (
                    <>
                      <td style={{ ...td, fontWeight: psSelected ? 700 : 400, background: psSelected ? '#fffbf0' : undefined }}>
                        {ps.label === 'Pays OHADA (²)' ? (
                          <div>
                            {editing ? (
                              <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                                <input type="radio" name="ps" checked={psSelected || false} onChange={() => setPaysSiege(ps.label)} style={radio} />
                                {ps.label}
                              </label>
                            ) : ps.label}
                            {(psSelected || paysSiege === ps.label) && editing && (
                              <select value={paysOhada} onChange={e => setPaysOhada(e.target.value)} style={{ marginTop: 4, fontSize: 9, padding: '2px 4px', border: '1px solid #D4A843', borderRadius: 2, background: '#fffbf0' }}>
                                <option value="">-- Code pays --</option>
                                <option value="01">01 - Bénin</option>
                                <option value="02">02 - Burkina</option>
                                <option value="03">03 - Côte d'Ivoire</option>
                                <option value="04">04 - Guinée Bissau</option>
                                <option value="05">05 - Mali</option>
                                <option value="06">06 - Niger</option>
                                <option value="07">07 - Sénégal</option>
                                <option value="08">08 - Togo</option>
                                <option value="09">09 - Cameroun</option>
                                <option value="10">10 - Congo</option>
                                <option value="11">11 - Gabon</option>
                                <option value="12">12 - République Centrafricaine</option>
                                <option value="13">13 - Tchad</option>
                                <option value="14">14 - Comores</option>
                                <option value="15">15 - Guinée</option>
                                <option value="16">16 - Guinée Equatoriale</option>
                                <option value="17">17 - Congo RDC</option>
                              </select>
                            )}
                            {paysSiege === ps.label && !editing && paysOhada && (
                              <span style={{ fontSize: 9, marginLeft: 8, color: '#666' }}>({paysOhada})</span>
                            )}
                          </div>
                        ) : (
                          editing ? (
                            <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                              <input type="radio" name="ps" checked={psSelected || false} onChange={() => setPaysSiege(ps.label)} style={radio} />
                              {ps.label}
                            </label>
                          ) : ps.label
                        )}
                      </td>
                      <td style={{ ...tdC, background: psSelected ? '#fffbf0' : undefined }}>{ps.label === 'Pays OHADA (²)' && paysSiege === ps.label && paysOhada ? paysOhada[0] : ps.code1}</td>
                      <td style={{ ...tdC, background: psSelected ? '#fffbf0' : undefined }}>{ps.label === 'Pays OHADA (²)' && paysSiege === ps.label && paysOhada ? paysOhada[1] || '' : ps.code2}</td>
                    </>
                  ) : (
                    <>
                      <td style={td}></td>
                      <td style={tdC}></td>
                      <td style={tdC}></td>
                    </>
                  )}
                  {editing && <td style={{ ...td, border: 'none' }}></td>}
                </tr>
              );
            })}
          </tbody>
        </table>

        {/* Section 2 : Code régime fiscal */}
        <table style={{ width: '50%', borderCollapse: 'collapse', marginBottom: 20 }}>
          <thead>
            <tr>
              <th style={{ ...th, textAlign: 'left' }}>2 - Code régime fiscal</th>
              <th style={{ ...th, width: '8%' }}></th>
            </tr>
          </thead>
          <tbody>
            {REGIMES_FISCAUX.map((rf) => {
              const isSelected = regimeFiscal === rf.label;
              return (
                <tr key={rf.code}>
                  <td style={{ ...td, fontWeight: isSelected ? 700 : 400, background: isSelected ? '#fffbf0' : undefined }}>
                    {editing ? (
                      <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                        <input type="radio" name="rf" checked={isSelected} onChange={() => setRegimeFiscal(rf.label)} style={radio} />
                        {rf.label}
                      </label>
                    ) : rf.label}
                  </td>
                  <td style={{ ...tdC, background: isSelected ? '#fffbf0' : undefined }}>{rf.code}</td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {/* Notes de bas de page */}
        <div style={{ fontSize: 8, marginTop: 16, color: '#555', lineHeight: 1.6 }}>
          <p style={{ margin: '2px 0' }}>(1) Remplacer le premier 0 par 1 si l'entité bénéficie d'un agrément prioritaire.</p>
          <p style={{ margin: '2px 0' }}>(2) Bénin = 01 ; Burkina = 02 ; Côte d'Ivoire = 03 ; Guinée Bissau = 04 ; Mali = 05 ; Niger = 06 ; Sénégal = 07 ; Togo = 08 ; Cameroun = 09 ; Congo = 10 ; Gabon = 11 ; République Centrafricaine = 12 ; Tchad = 13 ; Comores = 14 ; Guinée = 15 ; Guinée Equatoriale = 16 ; Congo RDC = 17.</p>
        </div>
      </div>
    </div>
  );
}

export default Note36;
