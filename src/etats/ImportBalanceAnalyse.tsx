import React, { useMemo, useState, useEffect } from 'react';
import { LuTriangleAlert, LuChevronDown, LuChevronRight, LuCheck } from 'react-icons/lu';
import { BalanceLigne } from '../types';
import { PlanCompte, CompteAnomalie, isCompteInEtats, findSuggestionByNumero, findSimilarByLibelle, formatMontant } from './ImportBalance.parsers';
import { detectAnomalies, getSoldeAttendu } from './anomaliesComptes';
import type { SoldeAttendu } from './anomaliesComptes';

interface BalanceLigneWithMeta extends BalanceLigne {
  id: number;
  note_revision?: string;
}

interface ImportBalanceAnalyseProps {
  currentLignes: BalanceLigneWithMeta[];
  exerciceId: number | undefined;
  loadBalances: (exId: number) => void;
  setMessage: (msg: string) => void;
  setError: (msg: string) => void;
}

function AnomaliesTable({ anomalies, corrections, onCorrection }: {
  anomalies: CompteAnomalie[];
  corrections: Record<number, string>;
  onCorrection: (ligneId: number, newNumero: string) => void;
}) {
  return (
    <table className="ib-analyse-table">
      <thead><tr><th>Compte importé</th><th>Libellé</th><th>Suggestion</th><th>Action</th></tr></thead>
      <tbody>
        {anomalies.map(a => {
          const corrected = corrections[a.ligneId];
          return (
            <tr key={a.ligneId} className={corrected ? 'corrected' : ''}>
              <td className="compte-anomalie">{a.numero}</td>
              <td>{a.libelle}</td>
              <td>
                {a.similarites.length > 0 ? (
                  <select defaultValue={a.similarites[0]?.numero || ''} className="ib-suggestion-select" id={`suggest-${a.ligneId}`}>
                    {a.suggestion && !a.similarites.find(s => s.numero === a.suggestion!.numero) && (
                      <option value={a.suggestion.numero}>{a.suggestion.numero} — {a.suggestion.libelle} (préfixe)</option>
                    )}
                    {a.similarites.map(s => (<option key={s.numero} value={s.numero}>{s.numero} — {s.libelle}</option>))}
                  </select>
                ) : a.suggestion ? (
                  <span className="ib-suggestion">{a.suggestion.numero} — {a.suggestion.libelle}</span>
                ) : (<span className="ib-no-suggestion">Aucune suggestion</span>)}
              </td>
              <td>
                {corrected ? (
                  <span className="ib-corrected"><LuCheck size={14} /> {corrected}</span>
                ) : (
                  <button className="ib-correct-btn" onClick={() => {
                    const select = document.getElementById(`suggest-${a.ligneId}`) as HTMLSelectElement | null;
                    const val = select ? select.value : (a.suggestion?.numero || '');
                    if (val) onCorrection(a.ligneId, val);
                  }}>Corriger</button>
                )}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

function ImportBalanceAnalyse({ currentLignes, exerciceId, loadBalances, setMessage, setError }: ImportBalanceAnalyseProps): React.JSX.Element {
  const [planComptable, setPlanComptable] = useState<PlanCompte[]>([]);
  const [showAnalyse, setShowAnalyse] = useState(false);
  const [corrections, setCorrections] = useState<Record<number, string>>({});
  const [comptesValides, setComptesValides] = useState<Set<number>>(new Set());

  useEffect(() => {
    fetch('/api/plan-comptable?referentiel=syscohada')
      .then(r => r.json()).then((data: PlanCompte[]) => setPlanComptable(data)).catch(() => {});
  }, []);

  const anomalies: CompteAnomalie[] = useMemo(() => {
    if (planComptable.length === 0 || currentLignes.length === 0) return [];
    const pcSet = new Set(planComptable.map(p => p.numero));
    const result: CompteAnomalie[] = [];
    for (const l of currentLignes) {
      const num = (l.numero_compte || '').trim();
      if (!num) continue;
      let found = false;
      for (let len = num.length; len >= 2; len--) { if (pcSet.has(num.slice(0, len))) { found = true; break; } }
      if (!found) {
        result.push({ ligneId: l.id, numero: num, libelle: l.libelle_compte || '',
          suggestion: findSuggestionByNumero(num, planComptable), similarites: findSimilarByLibelle(num, l.libelle_compte || '', planComptable) });
      }
    }
    return result;
  }, [planComptable, currentLignes]);

  const comptesNonMappes = useMemo(() => {
    if (currentLignes.length === 0) return [];
    return currentLignes.filter(l => { const num = (l.numero_compte || '').trim(); return num && num.length === 4 && !isCompteInEtats(num); })
      .map(l => ({ ligneId: l.id, numero: (l.numero_compte || '').trim(), libelle: l.libelle_compte || '' }));
  }, [currentLignes]);

  const comptesTooLong = useMemo(() => {
    if (currentLignes.length === 0) return [];
    return currentLignes.filter(l => { const num = (l.numero_compte || '').trim(); return num && num.length > 6; })
      .map(l => ({ ligneId: l.id, numero: (l.numero_compte || '').trim(), libelle: l.libelle_compte || '', suggestion: (l.numero_compte || '').trim().slice(0, 4) }));
  }, [currentLignes]);

  const sensAnomalies = useMemo(() => {
    if (currentLignes.length === 0) return [];
    return currentLignes.filter(l => (l.numero_compte || '').length > 2).map(l => {
      const a = detectAnomalies(l); const sensErr = a.find(x => x.type === 'solde_inverse');
      if (!sensErr) return null;
      return { id: l.id, numero: l.numero_compte, libelle: l.libelle_compte || '', message: sensErr.message,
        sensAttendu: getSoldeAttendu(l.numero_compte), sd: parseFloat(String(l.solde_debiteur)) || 0, sc: parseFloat(String(l.solde_crediteur)) || 0 };
    }).filter(Boolean) as { id: number; numero: string; libelle: string; message: string; sensAttendu: SoldeAttendu; sd: number; sc: number }[];
  }, [currentLignes]);

  const handleCorrection = async (ligneId: number, newNumero: string): Promise<void> => {
    try {
      const res = await fetch(`/api/balance/ligne/${ligneId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ numero_compte: newNumero }) });
      if (res.ok) {
        if (exerciceId) loadBalances(exerciceId);
        setCorrections(prev => ({ ...prev, [ligneId]: newNumero }));
        setMessage(`Compte corrigé : ${newNumero}`);
      }
    } catch { setError('Erreur lors de la correction.'); }
  };

  if (currentLignes.length === 0) return <></>;

  const toggleAnalyse = () => setShowAnalyse(!showAnalyse);

  return (
    <>
      {anomalies.length > 0 && (
        <div className="ib-analyse-banner has-warnings">
          <div className="ib-analyse-header" onClick={toggleAnalyse} style={{ cursor: 'pointer' }}>
            <span className="ib-anomaly-count"><LuTriangleAlert size={16} /> {anomalies.length} compte{anomalies.length > 1 ? 's' : ''} non reconnu{anomalies.length > 1 ? 's' : ''} dans le plan comptable SYSCOHADA</span>
            <span style={{ fontSize: 12 }}>{showAnalyse ? <LuChevronDown size={14} /> : <LuChevronRight size={14} />} {showAnalyse ? 'Masquer' : 'Détail'}</span>
          </div>
          {showAnalyse && <div className="ib-analyse-detail"><AnomaliesTable anomalies={anomalies} corrections={corrections} onCorrection={handleCorrection} /></div>}
        </div>
      )}

      {comptesTooLong.length > 0 && (
        <div className="ib-analyse-banner has-warnings" style={{ borderColor: '#8b5cf6' }}>
          <div className="ib-analyse-header" onClick={toggleAnalyse} style={{ cursor: 'pointer' }}>
            <span className="ib-anomaly-count" style={{ color: '#8b5cf6' }}><LuTriangleAlert size={16} /> {comptesTooLong.length} compte{comptesTooLong.length > 1 ? 's' : ''} à plus de 6 chiffres (troncature à 4 chiffres suggérée)</span>
            <span style={{ fontSize: 12 }}>{showAnalyse ? <LuChevronDown size={14} /> : <LuChevronRight size={14} />} {showAnalyse ? 'Masquer' : 'Détail'}</span>
          </div>
          {showAnalyse && (
            <div className="ib-analyse-detail">
              <table className="ib-analyse-table">
                <thead><tr><th>Compte actuel</th><th>Libellé</th><th>Compte suggéré (4 chiffres)</th><th>Action</th></tr></thead>
                <tbody>
                  {comptesTooLong.map(c => {
                    const corrected = corrections[c.ligneId];
                    return (
                      <tr key={c.ligneId} className={corrected ? 'corrected' : ''}>
                        <td className="compte-anomalie">{c.numero}</td><td>{c.libelle}</td>
                        <td>{corrected ? <span className="ib-corrected"><LuCheck size={14} /> {corrected}</span> : <input id={`toolong-fix-${c.ligneId}`} defaultValue={c.suggestion} className="ib-suggestion-select" style={{ width: 100, padding: '4px 8px', fontSize: 13, border: '1px solid #d1d5db', borderRadius: 4 }} />}</td>
                        <td>{!corrected && <button className="ib-correct-btn" style={{ background: '#8b5cf6', color: '#fff', border: 'none', borderRadius: 4, padding: '4px 10px', cursor: 'pointer', fontSize: 12 }} onClick={() => { const input = document.getElementById(`toolong-fix-${c.ligneId}`) as HTMLInputElement | null; handleCorrection(c.ligneId, input ? input.value.trim() : c.suggestion); }}>Corriger</button>}</td>
                      </tr>);
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {sensAnomalies.length > 0 && (
        <div className="ib-analyse-banner has-warnings" style={{ borderColor: '#dc2626', background: '#fef2f2' }}>
          <div className="ib-analyse-header" onClick={toggleAnalyse} style={{ cursor: 'pointer' }}>
            <span className="ib-anomaly-count" style={{ color: '#dc2626' }}><LuTriangleAlert size={16} /> {sensAnomalies.length} compte{sensAnomalies.length > 1 ? 's' : ''} avec solde inversé — impact probable sur le TFT</span>
            <span style={{ fontSize: 12 }}>{showAnalyse ? <LuChevronDown size={14} /> : <LuChevronRight size={14} />} {showAnalyse ? 'Masquer' : 'Détail'}</span>
          </div>
          {showAnalyse && (
            <div className="ib-analyse-detail">
              <p style={{ fontSize: 12, color: '#991b1b', margin: '4px 0 8px', lineHeight: 1.4 }}>Ces comptes ont un solde contraire au sens normal SYSCOHADA. Cela peut fausser le calcul du TFT.</p>
              <table className="ib-analyse-table">
                <thead><tr><th>Statut</th><th>Compte</th><th>Libellé</th><th>SF Débit</th><th>SF Crédit</th><th>Sens attendu</th><th>Anomalie</th></tr></thead>
                <tbody>
                  {sensAnomalies.map(a => (
                    <tr key={a.id}>
                      <td style={{ textAlign: 'center', color: '#dc2626', fontWeight: 700, fontSize: 16 }}>&#10007;</td>
                      <td className="compte-anomalie">{a.numero}</td><td>{a.libelle}</td>
                      <td className="num">{formatMontant(a.sd)}</td><td className="num">{formatMontant(a.sc)}</td>
                      <td style={{ textAlign: 'center', fontSize: 12 }}>{a.sensAttendu === 'debiteur' ? 'Débiteur' : a.sensAttendu === 'crediteur' ? 'Créditeur' : 'Variable'}</td>
                      <td style={{ fontSize: 12, color: '#dc2626' }}>{a.message}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {anomalies.length === 0 && comptesNonMappes.length === 0 && comptesTooLong.length === 0 && planComptable.length > 0 && (
        <div className="ib-analyse-banner clean"><span className="ib-anomaly-count"><LuCheck size={16} /> Tous les comptes sont conformes au plan comptable SYSCOHADA</span></div>
      )}

      {comptesNonMappes.length > 0 && (
        <div className="ib-analyse-banner has-warnings" style={{ borderColor: '#e67e22' }}>
          <div className="ib-analyse-header" onClick={toggleAnalyse} style={{ cursor: 'pointer' }}>
            <span className="ib-anomaly-count" style={{ color: '#e67e22' }}><LuTriangleAlert size={16} /> {comptesNonMappes.length} compte{comptesNonMappes.length > 1 ? 's' : ''} non repris dans les états financiers (Bilan, CR, TFT)</span>
            <span style={{ fontSize: 12 }}>{showAnalyse ? <LuChevronDown size={14} /> : <LuChevronRight size={14} />} {showAnalyse ? 'Masquer' : 'Détail'}</span>
          </div>
          {showAnalyse && (
            <div className="ib-analyse-detail">
              <table className="ib-analyse-table">
                <thead><tr><th>Compte</th><th>Libellé</th><th>Nouveau N° suggéré</th><th>Action</th></tr></thead>
                <tbody>
                  {comptesNonMappes.map(c => {
                    const corrected = corrections[c.ligneId]; const validated = comptesValides.has(c.ligneId);
                    return (
                      <tr key={c.ligneId} className={corrected || validated ? 'corrected' : ''}>
                        <td className="compte-anomalie">{c.numero}</td><td>{c.libelle}</td>
                        <td>
                          {corrected ? <span className="ib-corrected"><LuCheck size={14} /> {corrected}</span>
                          : validated ? <span style={{ color: '#059669', fontSize: 12 }}>Validé tel quel</span>
                          : (() => { const sims = findSimilarByLibelle(c.numero, c.libelle, planComptable); const sug = findSuggestionByNumero(c.numero, planComptable);
                            return (<select id={`mapping-fix-${c.ligneId}`} defaultValue={sims.length > 0 ? sims[0].numero : (sug?.numero || c.numero)} className="ib-suggestion-select">
                              {sims.map(s => { const p = s.numero.padEnd(6, '0'); return <option key={s.numero} value={p}>{p} — {s.libelle}</option>; })}
                              {sug && !sims.find(s => s.numero === sug.numero) && (() => { const p = sug.numero.padEnd(6, '0'); return <option value={p}>{p} — {sug.libelle} (préfixe)</option>; })()}
                              <option value={c.numero}>{c.numero} — Garder tel quel</option>
                            </select>); })()}
                        </td>
                        <td>
                          {!corrected && !validated && (
                            <div style={{ display: 'flex', gap: 6 }}>
                              <button className="ib-correct-btn" style={{ background: '#059669', color: '#fff', border: 'none', borderRadius: 4, padding: '4px 10px', cursor: 'pointer', fontSize: 12 }} onClick={() => setComptesValides(prev => new Set(prev).add(c.ligneId))}>Valider</button>
                              <button className="ib-correct-btn" style={{ background: '#D4A843', color: '#fff', border: 'none', borderRadius: 4, padding: '4px 10px', cursor: 'pointer', fontSize: 12 }} onClick={() => { const sel = document.getElementById(`mapping-fix-${c.ligneId}`) as HTMLSelectElement | null; const val = sel ? sel.value.trim() : ''; if (val && val !== c.numero) handleCorrection(c.ligneId, val); }}>Corriger</button>
                            </div>
                          )}
                        </td>
                      </tr>);
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </>
  );
}

export default ImportBalanceAnalyse;
