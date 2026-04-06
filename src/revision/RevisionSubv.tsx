import React, { useState, useEffect } from 'react';
import { LuSave, LuChevronDown, LuChevronRight, LuClipboardList, LuPlus, LuTrash2 } from 'react-icons/lu';
import { BalanceLigne } from '../types';
import { ODEcriture, Suggestion, fmt, fmtInput, parseInputValue, soldeCreditNet, totalSoldeCreditNet } from './revisionTypes';
import JournalOD from './JournalOD';
import FonctionnementCompte from './FonctionnementCompte';

interface RevisionSubvProps {
  balanceN: BalanceLigne[];
  exerciceAnnee: number;
  entiteId: number;
  exerciceId: number;
}

interface SubvAmortLigne {
  id: number;
  bien: string;
  refImmo: string;
  valeurBrute: number;
  cumulAmort: number;
  compteSubv: string;
  subvBrute: number;
}

interface SubvNonAmortLigne {
  id: number;
  bien: string;
  refImmo: string;
  valeurBrute: number;
  dureeInalienabilite: number;
  compteSubv: string;
  subvBrute: number;
}

const TRAVAUX_SUBV = [
  'Obtenir les conventions de subventions et vérifier les conditions d\'octroi',
  'Vérifier l\'inscription au bilan des subventions reçues et non encore utilisées',
  'Contrôler le rythme de reprise au résultat (cohérence avec l\'amortissement du bien subventionné)',
  'S\'assurer que les reprises au compte de résultat sont conformes au plan d\'amortissement',
  'Pour les biens non amortissables, vérifier la reprise sur la durée d\'inaliénabilité',
  'Vérifier le traitement fiscal des subventions (réintégration, imposition étalée)',
];

function RevisionSubv({ balanceN, exerciceAnnee, entiteId, exerciceId }: RevisionSubvProps): React.ReactElement {
  const [subvAmort, setSubvAmort] = useState<SubvAmortLigne[]>([]);
  const [subvNonAmort, setSubvNonAmort] = useState<SubvNonAmortLigne[]>([]);
  const [nextAmortId, setNextAmortId] = useState(1);
  const [nextNonAmortId, setNextNonAmortId] = useState(1);
  const [saved, setSaved] = useState(false);
  const [odEcritures, setOdEcritures] = useState<ODEcriture[]>([]);
  const [nextOdId, setNextOdId] = useState(1);
  const [showTravaux, setShowTravaux] = useState(true);

  // Comptes 14x de la balance
  const comptesSubv = balanceN.filter(l => l.numero_compte.startsWith('14'));

  useEffect(() => {
    loadSaved();
  }, [entiteId, exerciceId]);

  const loadSaved = (): void => {
    fetch(`/api/revision/${entiteId}/${exerciceId}/subv`)
      .then(r => { if (r.ok) return r.json(); throw new Error(); })
      .then((data: { subvAmort?: SubvAmortLigne[]; subvNonAmort?: SubvNonAmortLigne[]; odEcritures?: ODEcriture[] }) => {
        if (data.subvAmort && data.subvAmort.length > 0) {
          setSubvAmort(data.subvAmort);
          setNextAmortId(Math.max(...data.subvAmort.map(a => a.id)) + 1);
        }
        if (data.subvNonAmort && data.subvNonAmort.length > 0) {
          setSubvNonAmort(data.subvNonAmort);
          setNextNonAmortId(Math.max(...data.subvNonAmort.map(a => a.id)) + 1);
        }
        if (data.odEcritures && data.odEcritures.length > 0) {
          setOdEcritures(data.odEcritures);
          setNextOdId(Math.max(...data.odEcritures.map(e => e.id)) + 1);
        }
      })
      .catch(() => {});
  };

  const handleSave = async (): Promise<void> => {
    try {
      await fetch(`/api/revision/${entiteId}/${exerciceId}/subv`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subvAmort, subvNonAmort, odEcritures }),
      });
      setSaved(true);
    } catch { /* silently */ }
  };

  // --- Contrôle 1 : Biens amortissables ---
  const addAmort = (): void => {
    setSubvAmort(prev => [...prev, { id: nextAmortId, bien: '', refImmo: '', valeurBrute: 0, cumulAmort: 0, compteSubv: '', subvBrute: 0 }]);
    setNextAmortId(prev => prev + 1);
    setSaved(false);
  };

  const updateAmort = (id: number, field: keyof SubvAmortLigne, value: string | number): void => {
    setSubvAmort(prev => prev.map(a => a.id === id ? { ...a, [field]: value } : a));
    setSaved(false);
  };

  const removeAmort = (id: number): void => {
    setSubvAmort(prev => prev.filter(a => a.id !== id));
    setSaved(false);
  };

  // --- Contrôle 2 : Biens non amortissables ---
  const addNonAmort = (): void => {
    setSubvNonAmort(prev => [...prev, { id: nextNonAmortId, bien: '', refImmo: '', valeurBrute: 0, dureeInalienabilite: 10, compteSubv: '', subvBrute: 0 }]);
    setNextNonAmortId(prev => prev + 1);
    setSaved(false);
  };

  const updateNonAmort = (id: number, field: keyof SubvNonAmortLigne, value: string | number): void => {
    setSubvNonAmort(prev => prev.map(a => a.id === id ? { ...a, [field]: value } : a));
    setSaved(false);
  };

  const removeNonAmort = (id: number): void => {
    setSubvNonAmort(prev => prev.filter(a => a.id !== id));
    setSaved(false);
  };

  // --- Journal OD ---
  const addOdEcriture = (source?: string, compteDebit?: string, compteCredit?: string, montant?: number, libelle?: string): void => {
    const newOd: ODEcriture = {
      id: nextOdId, date: `${exerciceAnnee}-12-31`,
      compteDebit: compteDebit || '', libelleDebit: '',
      compteCredit: compteCredit || '', libelleCredit: '',
      montant: montant || 0, libelle: libelle || '',
      source: source || 'Manuel',
    };
    setOdEcritures(prev => [...prev, newOd]);
    setNextOdId(prev => prev + 1);
    setSaved(false);
  };

  const updateOd = (id: number, field: keyof ODEcriture, value: string | number): void => {
    setOdEcritures(prev => prev.map(e => e.id === id ? { ...e, [field]: value } : e));
    setSaved(false);
  };

  const removeOd = (id: number): void => {
    setOdEcritures(prev => prev.filter(e => e.id !== id));
    setSaved(false);
  };

  // --- Calculs contrôle 1 ---
  const amortCalcs = subvAmort.map(a => {
    const fractionAmortie = a.valeurBrute > 0 ? a.cumulAmort / a.valeurBrute : 0;
    const rapporteTheorique = a.subvBrute * fractionAmortie;
    const soldeTheorique = a.subvBrute - rapporteTheorique;
    const balanceLigne = comptesSubv.find(l => l.numero_compte === a.compteSubv);
    const soldeBalance = balanceLigne ? soldeCreditNet(balanceLigne) : 0;
    const ecart = soldeBalance - soldeTheorique;
    return { ...a, fractionAmortie, rapporteTheorique, soldeTheorique, soldeBalance, ecart };
  });

  // --- Calculs contrôle 2 ---
  const nonAmortCalcs = subvNonAmort.map(a => {
    const fractionARapporter = a.dureeInalienabilite > 0 ? 1 / a.dureeInalienabilite : 0;
    const rapporteTheorique = a.subvBrute * fractionARapporter;
    const soldeTheorique = a.subvBrute - rapporteTheorique;
    const balanceLigne = comptesSubv.find(l => l.numero_compte === a.compteSubv);
    const soldeBalance = balanceLigne ? soldeCreditNet(balanceLigne) : 0;
    const ecart = soldeBalance - soldeTheorique;
    return { ...a, fractionARapporter, rapporteTheorique, soldeTheorique, soldeBalance, ecart };
  });

  // --- Suggestions ---
  const suggestions: Suggestion[] = [];

  // Suggestions contrôle 1
  for (const c of amortCalcs) {
    if (Math.abs(c.ecart) < 0.5) continue;
    const dejaPropose = odEcritures.some(od => od.source === `Subv1 — ${c.compteSubv}`);
    if (dejaPropose) continue;
    if (c.ecart > 0) {
      suggestions.push({
        compteDebit: c.compteSubv, libelleDebit: 'Subvention d\'investissement',
        compteCredit: '865000', libelleCredit: 'Reprises de subventions d\'investissement',
        montant: c.ecart, libelle: `Reprise subvention (bien amortissable) — ${c.bien}`,
        source: `Subv1 — ${c.compteSubv}`,
      });
    } else {
      suggestions.push({
        compteDebit: '865000', libelleDebit: 'Reprises de subventions d\'investissement',
        compteCredit: c.compteSubv, libelleCredit: 'Subvention d\'investissement',
        montant: Math.abs(c.ecart), libelle: `Correction reprise excédentaire — ${c.bien}`,
        source: `Subv1 — ${c.compteSubv}`,
      });
    }
  }

  // Suggestions contrôle 2
  for (const c of nonAmortCalcs) {
    if (Math.abs(c.ecart) < 0.5) continue;
    const dejaPropose = odEcritures.some(od => od.source === `Subv2 — ${c.compteSubv}`);
    if (dejaPropose) continue;
    if (c.ecart > 0) {
      suggestions.push({
        compteDebit: c.compteSubv, libelleDebit: 'Subvention d\'investissement',
        compteCredit: '865000', libelleCredit: 'Reprises de subventions d\'investissement',
        montant: c.ecart, libelle: `Reprise subvention (bien non amortissable) — ${c.bien}`,
        source: `Subv2 — ${c.compteSubv}`,
      });
    } else {
      suggestions.push({
        compteDebit: '865000', libelleDebit: 'Reprises de subventions d\'investissement',
        compteCredit: c.compteSubv, libelleCredit: 'Subvention d\'investissement',
        montant: Math.abs(c.ecart), libelle: `Correction reprise excédentaire — ${c.bien}`,
        source: `Subv2 — ${c.compteSubv}`,
      });
    }
  }

  const totalAmort1Ecart = amortCalcs.reduce((s, c) => s + c.ecart, 0);
  const totalAmort2Ecart = nonAmortCalcs.reduce((s, c) => s + c.ecart, 0);

  // Rapprochement global : total soldes théoriques vs solde 14x en balance
  const totalSoldeTheorique = amortCalcs.reduce((s, c) => s + c.soldeTheorique, 0) + nonAmortCalcs.reduce((s, c) => s + c.soldeTheorique, 0);
  const totalSolde14xBalance = totalSoldeCreditNet(comptesSubv);
  const ecartRapprochement = totalSolde14xBalance - totalSoldeTheorique;

  return (
    <div className="revision-kp">
      <div className="revision-section-header">
        <h3>Subventions d'investissement</h3>
        <button className="revision-save-btn" onClick={handleSave}>
          <LuSave size={14} /> {saved ? 'Sauvegardé' : 'Sauvegarder'}
        </button>
      </div>

      <div className="revision-objectif">
        <strong>Objectif :</strong> S'assurer que les subventions d'investissement sont correctement comptabilisées et que les reprises au résultat suivent le rythme d'amortissement des biens subventionnés (ou la durée d'inaliénabilité pour les biens non amortissables).
      </div>


      <div className="revision-travaux">
        <button className="revision-travaux-toggle" onClick={() => setShowTravaux(!showTravaux)}>
          {showTravaux ? <LuChevronDown size={14} /> : <LuChevronRight size={14} />}
          <LuClipboardList size={14} />
          <span>Travaux à effectuer</span>
        </button>
        {showTravaux && (
          <ul className="revision-travaux-list">
            {TRAVAUX_SUBV.map((t, i) => <li key={i}>{t}</li>)}
          </ul>
        )}
      </div>

      <FonctionnementCompte prefixes={['14']} titre="Subventions d'investissement" />

      {/* Note d'information si comptes 14x présents en balance */}
      {comptesSubv.length > 0 && subvAmort.length === 0 && subvNonAmort.length === 0 && (
        <div className="revision-objectif">
          <strong>Information :</strong> La balance contient {comptesSubv.length} compte{comptesSubv.length > 1 ? 's' : ''} de subventions d'investissement (14x) pour un solde total de <strong>{fmt(totalSoldeCreditNet(comptesSubv))}</strong>.
          <ul>
            {comptesSubv.map(l => (
              <li key={l.numero_compte}>
                <strong>{l.numero_compte}</strong> — {l.libelle_compte} : {fmt(soldeCreditNet(l))}
              </li>
            ))}
          </ul>
          Ajoutez les biens correspondants dans les contrôles ci-dessous pour vérifier la cohérence des reprises au résultat.
        </div>
      )}

      {/* Contrôle 1 : Biens amortissables */}
      <div className="revision-control">
        <div className="revision-control-title">
          <span>Contrôle 1 — Rapport au résultat des subventions portant sur biens amortissables</span>
          {subvAmort.length > 0 && (Math.abs(totalAmort1Ecart) < 0.5
            ? <span className="revision-badge ok">Conforme</span>
            : <span className="revision-badge ko">Écart détecté</span>
          )}
        </div>

        <div className="revision-table-wrapper">
          <table className="revision-table">
            <thead>
              <tr>
                <th>Nature bien financé</th>
                <th>Réf. immo</th>
                <th className="num">Valeur brute</th>
                <th className="num">Cumul amort.</th>
                <th className="num">Fraction amortie (%)</th>
                <th>N° compte subv.</th>
                <th className="num">Subvention brute</th>
                <th className="num">Rapporté théorique</th>
                <th className="num">Solde théorique</th>
                <th className="num">Balance</th>
                <th className="num">Écart</th>
                <th style={{ width: 30 }}></th>
              </tr>
            </thead>
            <tbody>
              {amortCalcs.map((c, i) => (
                <tr key={c.id} className={Math.abs(c.ecart) > 0.5 ? 'ecart-row' : ''}>
                  <td className="editable-cell"><input type="text" value={c.bien} onChange={e => updateAmort(c.id, 'bien', e.target.value)} placeholder="Ex: Matériel Auto" style={{ maxWidth: 'none' }} /></td>
                  <td className="editable-cell"><input type="text" value={c.refImmo} onChange={e => updateAmort(c.id, 'refImmo', e.target.value)} placeholder="N°" style={{ fontFamily: 'monospace', maxWidth: 80 }} /></td>
                  <td className="editable-cell"><input type="text" inputMode="numeric" value={fmtInput(c.valeurBrute)} onChange={e => updateAmort(c.id, 'valeurBrute', parseInputValue(e.target.value))} /></td>
                  <td className="editable-cell"><input type="text" inputMode="numeric" value={fmtInput(c.cumulAmort)} onChange={e => updateAmort(c.id, 'cumulAmort', parseInputValue(e.target.value))} /></td>
                  <td className="num computed">{(c.fractionAmortie * 100).toFixed(0)}%</td>
                  <td className="editable-cell"><input type="text" value={c.compteSubv} onChange={e => updateAmort(c.id, 'compteSubv', e.target.value)} placeholder="141xxx" style={{ fontFamily: 'monospace', maxWidth: 90 }} /></td>
                  <td className="editable-cell"><input type="text" inputMode="numeric" value={fmtInput(c.subvBrute)} onChange={e => updateAmort(c.id, 'subvBrute', parseInputValue(e.target.value))} /></td>
                  <td className="num computed">{fmt(c.rapporteTheorique)}</td>
                  <td className="num computed">{fmt(c.soldeTheorique)}</td>
                  <td className="num">{fmt(c.soldeBalance)}</td>
                  <td className={`num ${Math.abs(c.ecart) > 0.5 ? 'ecart-val' : 'ok-val'}`}>{fmt(c.ecart)}</td>
                  <td><button className="revision-od-delete" onClick={() => removeAmort(c.id)} title="Supprimer"><LuTrash2 size={13} /></button></td>
                </tr>
              ))}
              {subvAmort.length === 0 && (
                <tr><td colSpan={12} style={{ textAlign: 'center', color: '#999', padding: 16, fontStyle: 'italic' }}>Aucun bien saisi. Ajoutez les biens amortissables financés par subvention.</td></tr>
              )}
            </tbody>
            {subvAmort.length > 0 && (
              <tfoot>
                <tr>
                  <td colSpan={2}><strong>Total</strong></td>
                  <td className="num"><strong>{fmt(subvAmort.reduce((s, a) => s + a.valeurBrute, 0))}</strong></td>
                  <td className="num"><strong>{fmt(subvAmort.reduce((s, a) => s + a.cumulAmort, 0))}</strong></td>
                  <td></td>
                  <td></td>
                  <td className="num"><strong>{fmt(subvAmort.reduce((s, a) => s + a.subvBrute, 0))}</strong></td>
                  <td className="num"><strong>{fmt(amortCalcs.reduce((s, c) => s + c.rapporteTheorique, 0))}</strong></td>
                  <td className="num"><strong>{fmt(amortCalcs.reduce((s, c) => s + c.soldeTheorique, 0))}</strong></td>
                  <td className="num"><strong>{fmt(amortCalcs.reduce((s, c) => s + c.soldeBalance, 0))}</strong></td>
                  <td className={`num ${Math.abs(totalAmort1Ecart) > 0.5 ? 'ecart-val' : 'ok-val'}`}><strong>{fmt(totalAmort1Ecart)}</strong></td>
                  <td></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
        <div className="revision-od-actions">
          <button className="revision-od-add" onClick={addAmort}><LuPlus size={13} /> Ajouter un bien amortissable</button>
        </div>
      </div>

      {/* Contrôle 2 : Biens non amortissables */}
      <div className="revision-control">
        <div className="revision-control-title">
          <span>Contrôle 2 — Rapport au résultat des subventions portant sur biens non amortissables</span>
          {subvNonAmort.length > 0 && (Math.abs(totalAmort2Ecart) < 0.5
            ? <span className="revision-badge ok">Conforme</span>
            : <span className="revision-badge ko">Écart détecté</span>
          )}
        </div>

        <div className="revision-table-wrapper">
          <table className="revision-table">
            <thead>
              <tr>
                <th>Nature bien financé</th>
                <th>Réf. immo</th>
                <th className="num">Valeur brute</th>
                <th className="num">Durée inaliénab. (ans)</th>
                <th>N° compte subv.</th>
                <th className="num">Subvention brute</th>
                <th className="num">Fraction à rapporter (%)</th>
                <th className="num">Rapporté théorique</th>
                <th className="num">Solde théorique</th>
                <th className="num">Balance</th>
                <th className="num">Écart</th>
                <th style={{ width: 30 }}></th>
              </tr>
            </thead>
            <tbody>
              {nonAmortCalcs.map(c => (
                <tr key={c.id} className={Math.abs(c.ecart) > 0.5 ? 'ecart-row' : ''}>
                  <td className="editable-cell"><input type="text" value={c.bien} onChange={e => updateNonAmort(c.id, 'bien', e.target.value)} placeholder="Ex: Terrain" style={{ maxWidth: 'none' }} /></td>
                  <td className="editable-cell"><input type="text" value={c.refImmo} onChange={e => updateNonAmort(c.id, 'refImmo', e.target.value)} placeholder="N°" style={{ fontFamily: 'monospace', maxWidth: 80 }} /></td>
                  <td className="editable-cell"><input type="text" inputMode="numeric" value={fmtInput(c.valeurBrute)} onChange={e => updateNonAmort(c.id, 'valeurBrute', parseInputValue(e.target.value))} /></td>
                  <td className="editable-cell"><input type="text" inputMode="numeric" value={String(c.dureeInalienabilite)} onChange={e => updateNonAmort(c.id, 'dureeInalienabilite', parseInt(e.target.value) || 0)} style={{ maxWidth: 60 }} /></td>
                  <td className="editable-cell"><input type="text" value={c.compteSubv} onChange={e => updateNonAmort(c.id, 'compteSubv', e.target.value)} placeholder="141xxx" style={{ fontFamily: 'monospace', maxWidth: 90 }} /></td>
                  <td className="editable-cell"><input type="text" inputMode="numeric" value={fmtInput(c.subvBrute)} onChange={e => updateNonAmort(c.id, 'subvBrute', parseInputValue(e.target.value))} /></td>
                  <td className="num computed">{(c.fractionARapporter * 100).toFixed(1)}%</td>
                  <td className="num computed">{fmt(c.rapporteTheorique)}</td>
                  <td className="num computed">{fmt(c.soldeTheorique)}</td>
                  <td className="num">{fmt(c.soldeBalance)}</td>
                  <td className={`num ${Math.abs(c.ecart) > 0.5 ? 'ecart-val' : 'ok-val'}`}>{fmt(c.ecart)}</td>
                  <td><button className="revision-od-delete" onClick={() => removeNonAmort(c.id)} title="Supprimer"><LuTrash2 size={13} /></button></td>
                </tr>
              ))}
              {subvNonAmort.length === 0 && (
                <tr><td colSpan={12} style={{ textAlign: 'center', color: '#999', padding: 16, fontStyle: 'italic' }}>Aucun bien saisi. Ajoutez les biens non amortissables financés par subvention.</td></tr>
              )}
            </tbody>
            {subvNonAmort.length > 0 && (
              <tfoot>
                <tr>
                  <td colSpan={2}><strong>Total</strong></td>
                  <td className="num"><strong>{fmt(subvNonAmort.reduce((s, a) => s + a.valeurBrute, 0))}</strong></td>
                  <td></td>
                  <td></td>
                  <td className="num"><strong>{fmt(subvNonAmort.reduce((s, a) => s + a.subvBrute, 0))}</strong></td>
                  <td></td>
                  <td className="num"><strong>{fmt(nonAmortCalcs.reduce((s, c) => s + c.rapporteTheorique, 0))}</strong></td>
                  <td className="num"><strong>{fmt(nonAmortCalcs.reduce((s, c) => s + c.soldeTheorique, 0))}</strong></td>
                  <td className="num"><strong>{fmt(nonAmortCalcs.reduce((s, c) => s + c.soldeBalance, 0))}</strong></td>
                  <td className={`num ${Math.abs(totalAmort2Ecart) > 0.5 ? 'ecart-val' : 'ok-val'}`}><strong>{fmt(totalAmort2Ecart)}</strong></td>
                  <td></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
        <div className="revision-od-actions">
          <button className="revision-od-add" onClick={addNonAmort}><LuPlus size={13} /> Ajouter un bien non amortissable</button>
        </div>
      </div>

      {/* Rapprochement global : Contrôle 1 + 2 vs solde 14x en balance */}
      {(subvAmort.length > 0 || subvNonAmort.length > 0 || totalSolde14xBalance !== 0) && (
        <div className="revision-control">
          <div className="revision-control-title">
            <span>Rapprochement — Soldes théoriques vs Balance 14x</span>
            {Math.abs(ecartRapprochement) < 0.5
              ? <span className="revision-badge ok">Conforme</span>
              : <span className="revision-badge ko">Écart</span>
            }
          </div>
          <div style={{ padding: '0 4px' }}>
            <table className="revision-table revision-table-small" style={{ maxWidth: 480 }}>
              <tbody>
                <tr>
                  <td>Total soldes théoriques (biens amortissables)</td>
                  <td className="num"><strong>{fmt(amortCalcs.reduce((s, c) => s + c.soldeTheorique, 0))}</strong></td>
                </tr>
                <tr>
                  <td>Total soldes théoriques (biens non amortissables)</td>
                  <td className="num"><strong>{fmt(nonAmortCalcs.reduce((s, c) => s + c.soldeTheorique, 0))}</strong></td>
                </tr>
                <tr style={{ borderTop: '2px solid #e5e7eb' }}>
                  <td><strong>Total soldes théoriques</strong></td>
                  <td className="num"><strong>{fmt(totalSoldeTheorique)}</strong></td>
                </tr>
                <tr>
                  <td>Solde comptes 14x en balance</td>
                  <td className="num"><strong>{fmt(totalSolde14xBalance)}</strong></td>
                </tr>
                <tr style={{ borderTop: '2px solid #e5e7eb' }}>
                  <td><strong>Écart</strong></td>
                  <td className={`num ${Math.abs(ecartRapprochement) > 0.5 ? 'ecart-val' : 'ok-val'}`}>
                    <strong>{fmt(ecartRapprochement)}</strong>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      <JournalOD
        suggestions={suggestions}
        odEcritures={odEcritures}
        onAddOd={addOdEcriture}
        onUpdateOd={updateOd}
        onRemoveOd={removeOd}
      />
    </div>
  );
}

export default RevisionSubv;
