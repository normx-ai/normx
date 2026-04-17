import React, { useMemo, useState } from 'react';
import { LuTriangleAlert, LuChevronDown, LuChevronRight, LuCheck } from 'react-icons/lu';
import { BalanceLigne } from '../types';
import { PlanCompte, CompteAnomalie, isCompteInEtats, findSuggestionByNumero, findSimilarByLibelle, formatMontant } from './ImportBalance.parsers';
import { detectAnomalies, getSoldeAttendu, buildPlanComptableSensMap } from './anomaliesComptes';
import type { SoldeAttendu } from './anomaliesComptes';
import BannerBalanceEquilibre, { useEquilibreEcarts } from './banners/BannerBalanceEquilibre';
import BannerCompte13Art20, { useCompte13Anomaly } from './banners/BannerCompte13Art20';
import { useReferentiel } from '../contexts/ReferentielContext';
import { usePlanComptable } from '../lib/queries';

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
  const { referentiel } = useReferentiel();
  const { data: planComptableRaw = [] } = usePlanComptable(referentiel);
  const planComptable = planComptableRaw as PlanCompte[];
  const [showAnalyse, setShowAnalyse] = useState(false);
  const [corrections, setCorrections] = useState<Record<number, string>>({});
  const [comptesValides, setComptesValides] = useState<Set<number>>(new Set());

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

  // Map numero -> sens construite depuis le plan comptable OHADA officiel.
  // C'est la seule source de verite pour le sens attendu d'un compte.
  const planSensMap = useMemo(() => buildPlanComptableSensMap(planComptable), [planComptable]);

  const sensAnomalies = useMemo(() => {
    if (currentLignes.length === 0 || planSensMap.size === 0) return [];
    return currentLignes.filter(l => (l.numero_compte || '').length > 2).map(l => {
      const a = detectAnomalies(l, planSensMap); const sensErr = a.find(x => x.type === 'solde_inverse');
      if (!sensErr) return null;
      return { id: l.id, numero: l.numero_compte, libelle: l.libelle_compte || '', message: sensErr.message,
        sensAttendu: getSoldeAttendu(l.numero_compte, planSensMap), sd: parseFloat(String(l.solde_debiteur)) || 0, sc: parseFloat(String(l.solde_crediteur)) || 0 };
    }).filter(Boolean) as { id: number; numero: string; libelle: string; message: string; sensAttendu: SoldeAttendu; sd: number; sc: number }[];
  }, [currentLignes, planSensMap]);

  // Hooks extraits : detection du residuel compte 13 (Art. 20 AUDCIF) et
  // desequilibre des colonnes SI / mouvements / solde.
  const compte13Anomaly = useCompte13Anomaly(currentLignes);
  const equilibreEcarts = useEquilibreEcarts(currentLignes);

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

  // Ajustement Article 20 AUDCIF : transferer le residuel du compte 13 vers
  // le compte 12 (Report a nouveau). Utilise la revision non destructive :
  // les valeurs originales importees sont conservees, on ecrit dans les
  // colonnes *_revise qui prennent precedence dans tous les calculs d'etats.
  const [art20Applied, setArt20Applied] = useState(false);
  const handleArt20Correction = async (): Promise<void> => {
    if (!compte13Anomaly) return;
    const { net13, lignes13, ligneReportCreditor, ligneReportDebitor, isProfit } = compte13Anomaly;
    const cible = isProfit ? ligneReportCreditor : ligneReportDebitor;
    if (!cible) {
      setError(`Compte ${isProfit ? '121 Report à nouveau créditeur' : '129 Report à nouveau débiteur'} introuvable dans la balance — l'ajustement ne peut pas être appliqué automatiquement.`);
      return;
    }
    try {
      // 1. Neutraliser le residuel de compte 13 en alignant SD et SC (net = 0)
      for (const l of lignes13) {
        const sd = parseFloat(String(l.solde_debiteur)) || 0;
        const sc = parseFloat(String(l.solde_crediteur)) || 0;
        const target = Math.max(sd, sc);
        await fetch(`/api/balance/revision/${l.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            solde_debiteur_revise: target,
            solde_crediteur_revise: target,
            note_revision: `Ajustement Art. 20 AUDCIF : résiduel transféré vers compte ${isProfit ? '121' : '129'} Report à nouveau`,
          }),
        });
      }
      // 2. Reporter le residuel sur la ligne 12x cible
      const sdCible = parseFloat(String(cible.solde_debiteur)) || 0;
      const scCible = parseFloat(String(cible.solde_crediteur)) || 0;
      const delta = Math.abs(net13);
      const newSd = isProfit ? sdCible : sdCible + delta;
      const newSc = isProfit ? scCible + delta : scCible;
      await fetch(`/api/balance/revision/${cible.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          solde_debiteur_revise: newSd,
          solde_crediteur_revise: newSc,
          note_revision: `Ajustement Art. 20 AUDCIF : +${formatMontant(delta)} reçu du compte 13 Résultat en instance d'affectation`,
        }),
      });
      setArt20Applied(true);
      setMessage(`Ajustement Art. 20 AUDCIF appliqué : ${formatMontant(delta)} FCFA transféré de 13 vers ${isProfit ? '121' : '129'}`);
      if (exerciceId) loadBalances(exerciceId);
    } catch {
      setError('Erreur lors de l\'application de l\'ajustement.');
    }
  };

  if (currentLignes.length === 0) return <></>;

  const toggleAnalyse = () => setShowAnalyse(!showAnalyse);

  return (
    <>
      {compte13Anomaly && !art20Applied && (
        <BannerCompte13Art20
          anomaly={compte13Anomaly}
          open={showAnalyse}
          onToggle={toggleAnalyse}
          onApply={handleArt20Correction}
        />
      )}

      {equilibreEcarts && equilibreEcarts.hasAnyError && (
        <BannerBalanceEquilibre
          ecarts={equilibreEcarts}
          open={showAnalyse}
          onToggle={toggleAnalyse}
        />
      )}

      {anomalies.length > 0 && (
        <div className="ib-analyse-banner has-warnings">
          <div className="ib-analyse-header" onClick={toggleAnalyse} style={{ cursor: 'pointer' }}>
            <span className="ib-anomaly-count"><LuTriangleAlert size={16} /> {anomalies.length} compte{anomalies.length > 1 ? 's' : ''} non reconnu{anomalies.length > 1 ? 's' : ''} dans le plan comptable SYSCOHADA</span>
            <span style={{ fontSize: 12 }}>{showAnalyse ? <LuChevronDown size={14} /> : <LuChevronRight size={14} />} {showAnalyse ? 'Masquer' : 'Détail'}</span>
          </div>
          {showAnalyse && <div className="ib-analyse-detail"><AnomaliesTable anomalies={anomalies} corrections={corrections} onCorrection={handleCorrection} /></div>}
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

      {anomalies.length === 0 && comptesNonMappes.length === 0 && planComptable.length > 0 && !(equilibreEcarts && equilibreEcarts.hasAnyError) && !(compte13Anomaly && !art20Applied) && (
        <div className="ib-analyse-banner clean"><span className="ib-anomaly-count"><LuCheck size={16} /> Tous les comptes sont conformes au plan comptable SYSCOHADA et la balance est équilibrée</span></div>
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
