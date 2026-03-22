import React, { useState, useEffect, useMemo } from 'react';
import { LuUpload, LuFileSpreadsheet, LuTrash2, LuTriangleAlert, LuChevronDown, LuChevronRight, LuCheck } from 'react-icons/lu';
import { BalanceLigne } from '../types';
import ConfirmModal from '../components/ConfirmModal';
import { parseCSV, parseExcel, formatMontant, PlanCompte, CompteAnomalie, isCompteInEtats, findSuggestionByNumero, findSimilarByLibelle } from './ImportBalance.parsers';
import './ImportBalance.css';

interface ImportBalanceProps {
  entiteId: number;
  userId: number;
  exerciceId?: number;
  exerciceAnnee?: number;
}

interface BalanceRecord {
  id: number;
  nom_fichier: string;
  statut: string;
}

interface BalanceLigneWithMeta extends BalanceLigne {
  id: number;
  note_revision?: string;
}

interface ExerciceRecord {
  id: number;
  annee: number;
}


function ImportBalance({ entiteId, userId, exerciceId: parentExerciceId, exerciceAnnee }: ImportBalanceProps): React.JSX.Element {
  const [annee, setAnnee] = useState<number>(exerciceAnnee ?? new Date().getFullYear());
  const [exercice, setExercice] = useState<ExerciceRecord | null>(null);
  const [tab, setTab] = useState<'N' | 'N-1'>('N');
  const [balanceN, setBalanceN] = useState<BalanceRecord | null>(null);
  const [lignesN, setLignesN] = useState<BalanceLigneWithMeta[]>([]);
  const [balanceN1, setBalanceN1] = useState<BalanceRecord | null>(null);
  const [lignesN1, setLignesN1] = useState<BalanceLigneWithMeta[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [message, setMessage] = useState<string>('');
  const [error, setError] = useState<string>('');

  // Sync annee si le parent change d'exercice
  useEffect(() => {
    if (exerciceAnnee && exerciceAnnee !== annee) {
      setAnnee(exerciceAnnee);
    }
  }, [exerciceAnnee]);

  // Charger exercice existant (ne crée plus automatiquement)
  useEffect(() => {
    if (!entiteId) return;
    // Si le parent fournit un exerciceId, l'utiliser directement
    if (parentExerciceId) {
      fetch('/api/balance/exercices/' + entiteId)
        .then(r => r.json())
        .then((data: ExerciceRecord[]) => {
          const match = data.find((e: ExerciceRecord) => e.id === parentExerciceId);
          if (match) {
            setExercice(match);
            setAnnee(match.annee);
            loadBalances(match.id);
          }
        })
        .catch(() => {});
      return;
    }
    fetch('/api/balance/exercices/' + entiteId)
      .then(r => r.json())
      .then((data: ExerciceRecord[]) => {
        const match = data.find((e: ExerciceRecord) => e.annee === annee) || data[0];
        if (match) {
          setExercice(match);
          setAnnee(match.annee);
          loadBalances(match.id);
        }
      })
      .catch(() => {});
  }, [entiteId, annee, parentExerciceId]);

  const loadBalances = (exId: number): void => {
    fetch(`/api/balance/${entiteId}/${exId}/N`).then(r => r.json()).then((d: { balance: BalanceRecord | null; lignes: BalanceLigneWithMeta[] }) => {
      setBalanceN(d.balance);
      setLignesN(d.lignes);
    });
    fetch(`/api/balance/${entiteId}/${exId}/N-1`).then(r => r.json()).then((d: { balance: BalanceRecord | null; lignes: BalanceLigneWithMeta[] }) => {
      setBalanceN1(d.balance);
      setLignesN1(d.lignes);
    });
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, typeBalance: 'N' | 'N-1'): void => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setError('');
    setMessage('');

    const isExcel = /\.(xlsx?|xls)$/i.test(file.name);

    const reader = new FileReader();
    reader.onload = async (evt: ProgressEvent<FileReader>): Promise<void> => {
      try {
        const lignes = isExcel
          ? parseExcel(evt.target?.result as ArrayBuffer)
          : parseCSV(evt.target?.result as string);
        if (lignes.length === 0) {
          setError('Aucune ligne valide trouvee dans le fichier.');
          setLoading(false);
          return;
        }

        const res = await fetch('/api/balance/import', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            entite_id: entiteId,
            exercice_id: exercice!.id,
            type_balance: typeBalance,
            nom_fichier: file.name,
            lignes,
          }),
        });
        const data: { error?: string; message?: string } = await res.json();
        if (!res.ok) setError(data.error || 'Erreur inconnue');
        else {
          setMessage(data.message || '');
          loadBalances(exercice!.id);
        }
      } catch {
        setError('Erreur lors de l\'import.');
      } finally {
        setLoading(false);
      }
    };
    if (isExcel) {
      reader.readAsArrayBuffer(file);
    } else {
      reader.readAsText(file, 'UTF-8');
    }
    e.target.value = '';
  };


  const [deleteConfirm, setDeleteConfirm] = useState<{ open: boolean; balanceId: number | null }>({ open: false, balanceId: null });

  const handleDeleteBalance = async (balanceId: number): Promise<void> => {
    try {
      const res = await fetch(`/api/balance/${balanceId}`, { method: 'DELETE' });
      if (res.ok) {
        setMessage('Balance supprimée.');
        loadBalances(exercice!.id);
      } else {
        setError('Erreur lors de la suppression.');
      }
    } catch {
      setError('Erreur lors de la suppression.');
    }
  };

  const currentBalance: BalanceRecord | null = tab === 'N' ? balanceN : balanceN1;
  const currentLignes: BalanceLigneWithMeta[] = tab === 'N' ? lignesN : lignesN1;

  const totalSID: number = currentLignes.reduce((s: number, l: BalanceLigneWithMeta) => s + (parseFloat(String(l.si_debit)) || 0), 0);
  const totalSIC: number = currentLignes.reduce((s: number, l: BalanceLigneWithMeta) => s + (parseFloat(String(l.si_credit)) || 0), 0);
  const totalDebit: number = currentLignes.reduce((s: number, l: BalanceLigneWithMeta) => s + (parseFloat(String(l.debit)) || 0), 0);
  const totalCredit: number = currentLignes.reduce((s: number, l: BalanceLigneWithMeta) => s + (parseFloat(String(l.credit)) || 0), 0);
  const totalSD: number = currentLignes.reduce((s: number, l: BalanceLigneWithMeta) => s + (parseFloat(String(l.solde_debiteur)) || 0), 0);
  const totalSC: number = currentLignes.reduce((s: number, l: BalanceLigneWithMeta) => s + (parseFloat(String(l.solde_crediteur)) || 0), 0);

  // ========== ANALYSE PLAN COMPTABLE ==========
  const [planComptable, setPlanComptable] = useState<PlanCompte[]>([]);
  const [showAnalyse, setShowAnalyse] = useState(false);
  const [corrections, setCorrections] = useState<Record<number, string>>({});

  // Charger le plan comptable
  useEffect(() => {
    fetch('/api/plan-comptable?referentiel=syscohada')
      .then(r => r.json())
      .then((data: PlanCompte[]) => setPlanComptable(data))
      .catch(() => {});
  }, []);

  const [comptesValides, setComptesValides] = useState<Set<number>>(new Set());
  const [correctionsMapping, setCorrectionsMapping] = useState<Record<number, string>>({});

  // Comptes non couverts par les mappings des états financiers
  const comptesNonMappes: { ligneId: number; numero: string; libelle: string }[] = useMemo(() => {
    if (currentLignes.length === 0) return [];
    const result: { ligneId: number; numero: string; libelle: string }[] = [];
    for (const l of currentLignes) {
      const num = (l.numero_compte || '').trim();
      if (!num || num.length !== 4) continue;
      if (!isCompteInEtats(num)) {
        result.push({ ligneId: l.id, numero: num, libelle: l.libelle_compte || '' });
      }
    }
    return result;
  }, [currentLignes]);

  // Comptes à plus de 6 chiffres — proposer troncature à 4 chiffres
  const comptesTooLong: { ligneId: number; numero: string; libelle: string; suggestion: string }[] = useMemo(() => {
    if (currentLignes.length === 0) return [];
    const result: { ligneId: number; numero: string; libelle: string; suggestion: string }[] = [];
    for (const l of currentLignes) {
      const num = (l.numero_compte || '').trim();
      if (!num || num.length <= 6) continue;
      result.push({ ligneId: l.id, numero: num, libelle: l.libelle_compte || '', suggestion: num.slice(0, 4) });
    }
    return result;
  }, [currentLignes]);

  // Détecter les comptes non reconnus
  const anomalies: CompteAnomalie[] = useMemo(() => {
    if (planComptable.length === 0 || currentLignes.length === 0) return [];
    const pcSet = new Set(planComptable.map(p => p.numero));
    const result: CompteAnomalie[] = [];

    for (const l of currentLignes) {
      const num = (l.numero_compte || '').trim();
      if (!num) continue;
      // Vérifier si le compte ou un de ses préfixes existe dans le plan
      let found = false;
      for (let len = num.length; len >= 2; len--) {
        if (pcSet.has(num.slice(0, len))) { found = true; break; }
      }
      if (!found) {
        result.push({
          ligneId: l.id,
          numero: num,
          libelle: l.libelle_compte || '',
          suggestion: findSuggestionByNumero(num, planComptable),
          similarites: findSimilarByLibelle(num, l.libelle_compte || '', planComptable),
        });
      }
    }
    return result;
  }, [planComptable, currentLignes]);

  const handleCorrection = async (ligneId: number, newNumero: string): Promise<void> => {
    try {
      const res = await fetch(`/api/balance/ligne/${ligneId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ numero_compte: newNumero }),
      });
      if (res.ok) {
        // Recharger les balances
        loadBalances(exercice!.id);
        setCorrections(prev => ({ ...prev, [ligneId]: newNumero }));
        setMessage(`Compte corrigé : ${newNumero}`);
      }
    } catch {
      setError('Erreur lors de la correction.');
    }
  };

  const displayedLignes = currentLignes;

  return (
    <div className="import-balance">
      <div className="ib-header">
        <h2><LuFileSpreadsheet /> Import des balances</h2>
        {exercice && (
          <div className="ib-annee">
            <label>Exercice : {exercice.annee}</label>
          </div>
        )}
      </div>

      {message && <div className="ib-message success">{message}</div>}
      {error && <div className="ib-message error">{error}</div>}

      {/* Onglets N / N-1 — uniquement si un exercice existe */}
      {exercice && (
        <div className="ib-tabs">
          <button className={`ib-tab ${tab === 'N' ? 'active' : ''}`} onClick={() => setTab('N')}>
            Balance N ({annee})
            {balanceN && <span className={`ib-statut-badge ${balanceN.statut}`}>{balanceN.statut}</span>}
          </button>
          <button className={`ib-tab ${tab === 'N-1' ? 'active' : ''}`} onClick={() => setTab('N-1')}>
            Balance N-1 ({annee - 1})
            {balanceN1 && <span className={`ib-statut-badge ${balanceN1.statut}`}>{balanceN1.statut}</span>}
          </button>
        </div>
      )}

      {/* Zone import + actions */}
      {exercice && <div className="ib-actions">
        <label className="ib-upload-btn">
          <LuUpload /> Importer fichier ({tab})
          <input type="file" accept=".csv,.txt,.xlsx,.xls" onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleFileUpload(e, tab)} hidden />
        </label>

        {currentBalance && (
          <span className="ib-file-info">
            {currentBalance.nom_fichier} - {currentLignes.length} lignes
            <button
              className="ib-delete-btn"
              onClick={() => setDeleteConfirm({ open: true, balanceId: currentBalance.id })}
              title="Supprimer cette balance"
            >
              <LuTrash2 size={14} />
            </button>
          </span>
        )}
      </div>}

      {/* Format attendu */}
      {!currentBalance && (
        <div className="ib-format-info">
          <h4>Formats acceptés : Excel (.xlsx) ou CSV (séparateur point-virgule)</h4>
          <code>Compte ; Libellé ; SI Débit ; SI Crédit ; Débit ; Crédit ; SF Débit ; SF Crédit</code>
        </div>
      )}

      {/* Analyse plan comptable */}
      {currentLignes.length > 0 && anomalies.length > 0 && (
        <div className="ib-analyse-banner has-warnings">
          <div className="ib-analyse-header" onClick={() => setShowAnalyse(!showAnalyse)} style={{ cursor: 'pointer' }}>
            <span className="ib-anomaly-count">
              <LuTriangleAlert size={16} />
              {anomalies.length} compte{anomalies.length > 1 ? 's' : ''} non reconnu{anomalies.length > 1 ? 's' : ''} dans le plan comptable SYSCOHADA
            </span>
            <span style={{ fontSize: 12 }}>{showAnalyse ? <LuChevronDown size={14} /> : <LuChevronRight size={14} />} {showAnalyse ? 'Masquer' : 'Détail'}</span>
          </div>
          {showAnalyse && (
            <div className="ib-analyse-detail">
              <table className="ib-analyse-table">
                <thead>
                  <tr>
                    <th>Compte importé</th>
                    <th>Libellé</th>
                    <th>Suggestion</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {anomalies.map(a => {
                    const corrected = corrections[a.ligneId];
                    return (
                      <tr key={a.ligneId} className={corrected ? 'corrected' : ''}>
                        <td className="compte-anomalie">{a.numero}</td>
                        <td>{a.libelle}</td>
                        <td>
                          {a.similarites.length > 0 ? (
                            <select
                              defaultValue={a.similarites[0]?.numero || ''}
                              className="ib-suggestion-select"
                              id={`suggest-${a.ligneId}`}
                            >
                              {a.suggestion && !a.similarites.find(s => s.numero === a.suggestion!.numero) && (
                                <option value={a.suggestion.numero}>{a.suggestion.numero} — {a.suggestion.libelle} (préfixe)</option>
                              )}
                              {a.similarites.map(s => (
                                <option key={s.numero} value={s.numero}>{s.numero} — {s.libelle}</option>
                              ))}
                            </select>
                          ) : a.suggestion ? (
                            <span className="ib-suggestion">{a.suggestion.numero} — {a.suggestion.libelle}</span>
                          ) : (
                            <span className="ib-no-suggestion">Aucune suggestion</span>
                          )}
                        </td>
                        <td>
                          {corrected ? (
                            <span className="ib-corrected"><LuCheck size={14} /> {corrected}</span>
                          ) : (
                            <button
                              className="ib-correct-btn"
                              onClick={() => {
                                const select = document.getElementById(`suggest-${a.ligneId}`) as HTMLSelectElement | null;
                                const val = select ? select.value : (a.suggestion?.numero || '');
                                if (val) handleCorrection(a.ligneId, val);
                              }}
                            >
                              Corriger
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Comptes à plus de 6 chiffres — proposer troncature */}
      {currentLignes.length > 0 && comptesTooLong.length > 0 && (
        <div className="ib-analyse-banner has-warnings" style={{ borderColor: '#8b5cf6' }}>
          <div className="ib-analyse-header" onClick={() => setShowAnalyse(!showAnalyse)} style={{ cursor: 'pointer' }}>
            <span className="ib-anomaly-count" style={{ color: '#8b5cf6' }}>
              <LuTriangleAlert size={16} />
              {comptesTooLong.length} compte{comptesTooLong.length > 1 ? 's' : ''} à plus de 6 chiffres (troncature à 4 chiffres suggérée)
            </span>
            <span style={{ fontSize: 12 }}>{showAnalyse ? <LuChevronDown size={14} /> : <LuChevronRight size={14} />} {showAnalyse ? 'Masquer' : 'Détail'}</span>
          </div>
          {showAnalyse && (
            <div className="ib-analyse-detail">
              <table className="ib-analyse-table">
                <thead>
                  <tr>
                    <th>Compte actuel</th>
                    <th>Libellé</th>
                    <th>Compte suggéré (4 chiffres)</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {comptesTooLong.map(c => {
                    const corrected = corrections[c.ligneId];
                    return (
                      <tr key={c.ligneId} className={corrected ? 'corrected' : ''}>
                        <td className="compte-anomalie">{c.numero}</td>
                        <td>{c.libelle}</td>
                        <td>
                          {corrected ? (
                            <span className="ib-corrected"><LuCheck size={14} /> {corrected}</span>
                          ) : (
                            <input
                              id={`toolong-fix-${c.ligneId}`}
                              defaultValue={c.suggestion}
                              className="ib-suggestion-select"
                              style={{ width: 100, padding: '4px 8px', fontSize: 13, border: '1px solid #d1d5db', borderRadius: 4 }}
                            />
                          )}
                        </td>
                        <td>
                          {!corrected && (
                            <button
                              className="ib-correct-btn"
                              style={{ background: '#8b5cf6', color: '#fff', border: 'none', borderRadius: 4, padding: '4px 10px', cursor: 'pointer', fontSize: 12 }}
                              onClick={() => {
                                const input = document.getElementById(`toolong-fix-${c.ligneId}`) as HTMLInputElement | null;
                                const val = input ? input.value.trim() : c.suggestion;
                                if (val) handleCorrection(c.ligneId, val);
                              }}
                            >
                              Corriger
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {currentLignes.length > 0 && anomalies.length === 0 && comptesNonMappes.length === 0 && comptesTooLong.length === 0 && planComptable.length > 0 && (
        <div className="ib-analyse-banner clean">
          <span className="ib-anomaly-count">
            <LuCheck size={16} /> Tous les comptes sont conformes au plan comptable SYSCOHADA
          </span>
        </div>
      )}

      {/* Comptes non couverts par les états financiers */}
      {currentLignes.length > 0 && comptesNonMappes.length > 0 && (
        <div className="ib-analyse-banner has-warnings" style={{ borderColor: '#e67e22' }}>
          <div className="ib-analyse-header" onClick={() => setShowAnalyse(!showAnalyse)} style={{ cursor: 'pointer' }}>
            <span className="ib-anomaly-count" style={{ color: '#e67e22' }}>
              <LuTriangleAlert size={16} />
              {comptesNonMappes.length} compte{comptesNonMappes.length > 1 ? 's' : ''} non repris dans les états financiers (Bilan, CR, TFT)
            </span>
            <span style={{ fontSize: 12 }}>{showAnalyse ? <LuChevronDown size={14} /> : <LuChevronRight size={14} />} {showAnalyse ? 'Masquer' : 'Détail'}</span>
          </div>
          {showAnalyse && (
            <div className="ib-analyse-detail">
              <table className="ib-analyse-table">
                <thead>
                  <tr>
                    <th>Compte</th>
                    <th>Libellé</th>
                    <th>Nouveau N° suggéré</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {comptesNonMappes.map(c => {
                    const corrected = corrections[c.ligneId];
                    const validated = comptesValides.has(c.ligneId);
                    return (
                      <tr key={c.ligneId} className={corrected || validated ? 'corrected' : ''}>
                        <td className="compte-anomalie">{c.numero}</td>
                        <td>{c.libelle}</td>
                        <td>
                          {corrected ? (
                            <span className="ib-corrected"><LuCheck size={14} /> {corrected}</span>
                          ) : validated ? (
                            <span style={{ color: '#059669', fontSize: 12 }}>Validé tel quel</span>
                          ) : (() => {
                            const sims = findSimilarByLibelle(c.numero, c.libelle, planComptable);
                            const suggestion = findSuggestionByNumero(c.numero, planComptable);
                            return (
                              <select
                                id={`mapping-fix-${c.ligneId}`}
                                defaultValue={sims.length > 0 ? sims[0].numero : (suggestion?.numero || c.numero)}
                                className="ib-suggestion-select"
                              >
                                {sims.map(s => {
                                  const padded = s.numero.padEnd(6, '0');
                                  return <option key={s.numero} value={padded}>{padded} — {s.libelle}</option>;
                                })}
                                {suggestion && !sims.find(s => s.numero === suggestion.numero) && (() => {
                                  const padded = suggestion.numero.padEnd(6, '0');
                                  return <option value={padded}>{padded} — {suggestion.libelle} (préfixe)</option>;
                                })()}
                                <option value={c.numero}>{c.numero} — Garder tel quel</option>
                              </select>
                            );
                          })()}
                        </td>
                        <td>
                          {!corrected && !validated && (
                            <div style={{ display: 'flex', gap: 6 }}>
                              <button
                                className="ib-correct-btn"
                                style={{ background: '#059669', color: '#fff', border: 'none', borderRadius: 4, padding: '4px 10px', cursor: 'pointer', fontSize: 12 }}
                                onClick={() => setComptesValides(prev => new Set(prev).add(c.ligneId))}
                              >
                                Valider
                              </button>
                              <button
                                className="ib-correct-btn"
                                style={{ background: '#D4A843', color: '#fff', border: 'none', borderRadius: 4, padding: '4px 10px', cursor: 'pointer', fontSize: 12 }}
                                onClick={() => {
                                  const select = document.getElementById(`mapping-fix-${c.ligneId}`) as HTMLSelectElement | null;
                                  const val = select ? select.value.trim() : '';
                                  if (val && val !== c.numero) handleCorrection(c.ligneId, val);
                                }}
                              >
                                Corriger
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Tableau balance */}
      {currentLignes.length > 0 && (
        <div className="ib-table-wrapper">
          <table className="ib-table">
            <thead>
              <tr>
                <th>Compte</th>
                <th>Libellé</th>
                <th className="num">SI Débit</th>
                <th className="num">SI Crédit</th>
                <th className="num">Débit</th>
                <th className="num">Crédit</th>
                <th className="num">SF Débit</th>
                <th className="num">SF Crédit</th>
              </tr>
            </thead>
            <tbody>
              {displayedLignes.map((l: BalanceLigneWithMeta) => (
                <tr key={l.id}>
                  <td className="compte">{l.numero_compte}</td>
                  <td>{l.libelle_compte}</td>
                  <td className="num">{formatMontant(parseFloat(String(l.si_debit)))}</td>
                  <td className="num">{formatMontant(parseFloat(String(l.si_credit)))}</td>
                  <td className="num">{formatMontant(parseFloat(String(l.debit)))}</td>
                  <td className="num">{formatMontant(parseFloat(String(l.credit)))}</td>
                  <td className="num">{formatMontant(parseFloat(String(l.solde_debiteur)))}</td>
                  <td className="num">{formatMontant(parseFloat(String(l.solde_crediteur)))}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={2}><strong>TOTAUX</strong></td>
                <td className="num"><strong>{formatMontant(totalSID)}</strong></td>
                <td className="num"><strong>{formatMontant(totalSIC)}</strong></td>
                <td className="num"><strong>{formatMontant(totalDebit)}</strong></td>
                <td className="num"><strong>{formatMontant(totalCredit)}</strong></td>
                <td className="num"><strong>{formatMontant(totalSD)}</strong></td>
                <td className="num"><strong>{formatMontant(totalSC)}</strong></td>
              </tr>
              <tr className="equilibre-row">
                <td colSpan={2}>Équilibre</td>
                <td colSpan={2} className={`num ${Math.abs(totalSID - totalSIC) < 0.01 ? 'ok' : 'ko'}`}>
                  {Math.abs(totalSID - totalSIC) < 0.01 ? 'OK' : `Écart: ${formatMontant(totalSID - totalSIC)}`}
                </td>
                <td colSpan={2} className={`num ${Math.abs(totalDebit - totalCredit) < 0.01 ? 'ok' : 'ko'}`}>
                  {Math.abs(totalDebit - totalCredit) < 0.01 ? 'OK' : `Écart: ${formatMontant(totalDebit - totalCredit)}`}
                </td>
                <td colSpan={2} className={`num ${Math.abs(totalSD - totalSC) < 0.01 ? 'ok' : 'ko'}`}>
                  {Math.abs(totalSD - totalSC) < 0.01 ? 'OK' : `Écart: ${formatMontant(totalSD - totalSC)}`}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
      <ConfirmModal
        open={deleteConfirm.open}
        title="Supprimer la balance"
        message="Supprimer cette balance importée et toutes ses lignes ? Cette action est irréversible."
        variant="danger"
        confirmLabel="Supprimer"
        onConfirm={() => {
          if (deleteConfirm.balanceId) handleDeleteBalance(deleteConfirm.balanceId);
          setDeleteConfirm({ open: false, balanceId: null });
        }}
        onCancel={() => setDeleteConfirm({ open: false, balanceId: null })}
      />
    </div>
  );
}

export default ImportBalance;
