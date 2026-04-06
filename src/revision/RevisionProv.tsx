import React, { useState, useEffect } from 'react';
import { LuSave, LuChevronDown, LuChevronRight, LuClipboardList, LuPlus, LuTrash2, LuInfo } from 'react-icons/lu';
import { BalanceLigne } from '../types';
import { ODEcriture, Suggestion, fmt, fmtInput, parseInputValue, getSD, getSC, soldeNet, soldeCreditNet, totalSoldeNet, totalSoldeCreditNet } from './revisionTypes';
import JournalOD from './JournalOD';
import FonctionnementCompte from './FonctionnementCompte';

interface RevisionProvProps {
  balanceN: BalanceLigne[];
  exerciceAnnee: number;
  entiteId: number;
  exerciceId: number;
}

interface ProvLigne {
  compte: string;
  designation: string;
  soldeN1: number;
  dotation: number;
  reprise: number;
  soldeNCalcule: number;
  soldeNBalance: number;
  ecart: number;
}

interface AmortDerogLigne {
  id: number;
  bien: string;
  refImmo: string;
  valeurBrute: number;
  amortDerog: number;
  cede: boolean;
  repriseDerog: number;
}

interface ProvRCLigne {
  compte: string;
  designation: string;
  soldeN1: number;
  dotation: number;
  reprise: number;
  soldeNCalcule: number;
  soldeNBalance: number;
  ecart: number;
}

const TRAVAUX_PROV = [
  'Vérifier le bien-fondé et le mode de calcul de chaque provision réglementée',
  'Contrôler la cohérence entre dotations, reprises et variations bilantielles',
  'Analyser les provisions pour investissement, hausse des prix, amortissements dérogatoires',
  'Vérifier la conformité avec la réglementation fiscale en vigueur',
  'S\'assurer que les provisions ne sont pas maintenues sans justification',
  'Rapprocher les dotations/reprises avec les comptes 851/861 correspondants',
];

const PROV_RC_TYPES: Record<string, string> = {
  '191': 'Provisions pour litiges',
  '192': 'Provisions pour garanties données aux clients',
  '193': 'Provisions pour pertes sur marchés/contrats déficitaires',
  '194': 'Provisions pour pertes de change',
  '195': 'Provisions pour impôts',
  '196': 'Provisions pour pensions et obligations similaires (retraite)',
  '197': 'Provisions pour charges à répartir',
};

function RevisionProv({ balanceN, exerciceAnnee, entiteId, exerciceId }: RevisionProvProps): React.ReactElement {
  const [lignes, setLignes] = useState<ProvLigne[]>([]);
  const [amortDerog, setAmortDerog] = useState<AmortDerogLigne[]>([]);
  const [nextDerogId, setNextDerogId] = useState(1);
  const [provRC, setProvRC] = useState<ProvRCLigne[]>([]);
  const [saved, setSaved] = useState(false);
  const [odEcritures, setOdEcritures] = useState<ODEcriture[]>([]);
  const [nextOdId, setNextOdId] = useState(1);
  const [showTravaux, setShowTravaux] = useState(true);

  useEffect(() => {
    const provLignes: ProvLigne[] = [];
    const comptesVus = new Set<string>();

    for (const bl of balanceN) {
      const p2 = bl.numero_compte.substring(0, 2);
      if (p2 !== '15') continue;
      if (comptesVus.has(bl.numero_compte)) continue;
      comptesVus.add(bl.numero_compte);

      const sfN = soldeCreditNet(bl);
      const sfN1 = (parseFloat(String(bl.si_credit ?? 0)) || 0) - (parseFloat(String(bl.si_debit ?? 0)) || 0);

      provLignes.push({
        compte: bl.numero_compte,
        designation: bl.libelle_compte,
        soldeN1: sfN1,
        dotation: 0,
        reprise: 0,
        soldeNCalcule: sfN1,
        soldeNBalance: sfN,
        ecart: sfN - sfN1,
      });
    }

    provLignes.sort((a, b) => a.compte.localeCompare(b.compte));
    setLignes(provLignes);

    // --- Contrôle 3 : Provisions pour risques et charges (19x) ---
    const rcLignes: ProvRCLigne[] = [];
    const comptesRC = new Set<string>();

    // Comptes de dotation 6911/6912/6913
    const comptes6911 = balanceN.filter(l => l.numero_compte.startsWith('6911'));
    const comptes6912 = balanceN.filter(l => l.numero_compte.startsWith('6912'));
    const comptes6913 = balanceN.filter(l => l.numero_compte.startsWith('6913'));
    const totalDotExploit = comptes6911.reduce((s, l) => s + getSD(l), 0);
    const totalDotFinancier = comptes6912.reduce((s, l) => s + getSD(l), 0);
    const totalDotHAO = comptes6913.reduce((s, l) => s + getSD(l), 0);
    const totalDotRC = totalDotExploit + totalDotFinancier + totalDotHAO;

    // Comptes de reprise 7911/7912/7913
    const comptes7911 = balanceN.filter(l => l.numero_compte.startsWith('7911'));
    const comptes7912 = balanceN.filter(l => l.numero_compte.startsWith('7912'));
    const comptes7913 = balanceN.filter(l => l.numero_compte.startsWith('7913'));
    const totalRepExploit = comptes7911.reduce((s, l) => s + getSC(l), 0);
    const totalRepFinancier = comptes7912.reduce((s, l) => s + getSC(l), 0);
    const totalRepHAO = comptes7913.reduce((s, l) => s + getSC(l), 0);
    const totalRepRC = totalRepExploit + totalRepFinancier + totalRepHAO;

    // Count of 19x accounts for proportional allocation
    const all19N = balanceN.filter(l => l.numero_compte.startsWith('19') && !comptesRC.has(l.numero_compte));
    const total19Accounts = new Set([...all19N.map(l => l.numero_compte)]);

    for (const bl of balanceN) {
      if (!bl.numero_compte.startsWith('19')) continue;
      if (comptesRC.has(bl.numero_compte)) continue;
      comptesRC.add(bl.numero_compte);

      const sfN = soldeCreditNet(bl);
      const sfN1 = (parseFloat(String(bl.si_credit ?? 0)) || 0) - (parseFloat(String(bl.si_debit ?? 0)) || 0);

      // Mouvement crédit sur le 19x = dotation, mouvement débit = reprise
      const mvtC = parseFloat(String(bl.credit)) || 0;
      const mvtD = parseFloat(String(bl.debit)) || 0;

      // Use individual account movements as proxy for allocation
      const dotation = mvtC;
      const reprise = mvtD;

      const soldeNCalcule = sfN1 + dotation - reprise;

      rcLignes.push({
        compte: bl.numero_compte,
        designation: bl.libelle_compte,
        soldeN1: sfN1,
        dotation,
        reprise,
        soldeNCalcule,
        soldeNBalance: sfN,
        ecart: sfN - soldeNCalcule,
      });
    }

    rcLignes.sort((a, b) => a.compte.localeCompare(b.compte));
    setProvRC(rcLignes);

    loadSaved(provLignes, rcLignes);
  }, [balanceN]);

  const recalc = (l: ProvLigne[]): void => {
    for (const row of l) {
      row.soldeNCalcule = row.soldeN1 + row.dotation - row.reprise;
      row.ecart = row.soldeNBalance - row.soldeNCalcule;
    }
  };

  const recalcRC = (l: ProvRCLigne[]): void => {
    for (const row of l) {
      row.soldeNCalcule = row.soldeN1 + row.dotation - row.reprise;
      row.ecart = row.soldeNBalance - row.soldeNCalcule;
    }
  };

  const loadSaved = (defaultLignes: ProvLigne[], defaultRC: ProvRCLigne[]): void => {
    fetch(`/api/revision/${entiteId}/${exerciceId}/prov`)
      .then(r => { if (r.ok) return r.json(); throw new Error(); })
      .then((data: { lignes?: ProvLigne[]; amortDerog?: AmortDerogLigne[]; provRC?: ProvRCLigne[]; odEcritures?: ODEcriture[] }) => {
        if (data.lignes && data.lignes.length > 0) {
          const merged = defaultLignes.map(dl => {
            const s = data.lignes!.find(x => x.compte === dl.compte);
            return s ? { ...dl, dotation: s.dotation || 0, reprise: s.reprise || 0 } : dl;
          });
          recalc(merged);
          setLignes(merged);
        }
        if (data.amortDerog && data.amortDerog.length > 0) {
          setAmortDerog(data.amortDerog);
          setNextDerogId(Math.max(...data.amortDerog.map(a => a.id)) + 1);
        }
        if (data.provRC && data.provRC.length > 0) {
          const mergedRC = defaultRC.map(dl => {
            const s = data.provRC!.find(x => x.compte === dl.compte);
            return s ? { ...dl, dotation: s.dotation || 0, reprise: s.reprise || 0 } : dl;
          });
          recalcRC(mergedRC);
          setProvRC(mergedRC);
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
      await fetch(`/api/revision/${entiteId}/${exerciceId}/prov`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lignes, amortDerog, provRC, odEcritures }),
      });
      setSaved(true);
    } catch { /* silently */ }
  };

  const updateLigne = (idx: number, field: 'soldeN1' | 'dotation' | 'reprise', value: number): void => {
    setLignes(prev => {
      const next = [...prev];
      next[idx] = { ...next[idx], [field]: value };
      recalc(next);
      return next;
    });
    setSaved(false);
  };

  const updateProvRC = (idx: number, field: 'soldeN1' | 'dotation' | 'reprise', value: number): void => {
    setProvRC(prev => {
      const next = [...prev];
      next[idx] = { ...next[idx], [field]: value };
      recalcRC(next);
      return next;
    });
    setSaved(false);
  };

  // --- Amortissements dérogatoires (Contrôle 2) ---
  const addDerogLigne = (): void => {
    setAmortDerog(prev => [...prev, { id: nextDerogId, bien: '', refImmo: '', valeurBrute: 0, amortDerog: 0, cede: false, repriseDerog: 0 }]);
    setNextDerogId(prev => prev + 1);
    setSaved(false);
  };

  const updateDerog = (id: number, field: keyof AmortDerogLigne, value: string | number | boolean): void => {
    setAmortDerog(prev => prev.map(a => a.id === id ? { ...a, [field]: value } : a));
    setSaved(false);
  };

  const removeDerog = (id: number): void => {
    setAmortDerog(prev => prev.filter(a => a.id !== id));
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

  const odImpact = (compte: string): number => {
    return odEcritures.reduce((sum, od) => {
      if (od.compteDebit === compte) return sum - od.montant;
      if (od.compteCredit === compte) return sum + od.montant;
      return sum;
    }, 0);
  };

  // --- Suggestions Contrôle 1 ---
  const suggestions: Suggestion[] = [];
  for (const l of lignes) {
    const ecartNet = l.ecart - odImpact(l.compte);
    if (Math.abs(ecartNet) < 0.5) continue;
    const dejaPropose = odEcritures.some(od => od.source === `Prov — ${l.compte}`);
    if (dejaPropose) continue;

    if (ecartNet > 0) {
      suggestions.push({
        compteDebit: '851000', libelleDebit: 'Dotation provisions réglementées',
        compteCredit: l.compte, libelleCredit: l.designation,
        montant: ecartNet, libelle: `Dotation provision réglementée — ${l.designation}`,
        source: `Prov — ${l.compte}`,
      });
    } else {
      suggestions.push({
        compteDebit: l.compte, libelleDebit: l.designation,
        compteCredit: '861000', libelleCredit: 'Reprise provisions réglementées',
        montant: Math.abs(ecartNet), libelle: `Reprise provision réglementée — ${l.designation}`,
        source: `Prov — ${l.compte}`,
      });
    }
  }

  // --- Suggestions Contrôle 3 (Provisions pour risques et charges) ---
  for (const l of provRC) {
    const ecartNet = l.ecart - odImpact(l.compte);
    if (Math.abs(ecartNet) < 0.5) continue;
    const dejaPropose = odEcritures.some(od => od.source === `ProvRC — ${l.compte}`);
    if (dejaPropose) continue;

    if (ecartNet > 0) {
      // Dotation manquante : D 691x / C 19x
      suggestions.push({
        compteDebit: '691100', libelleDebit: 'Dotations aux provisions d\'exploitation',
        compteCredit: l.compte, libelleCredit: l.designation,
        montant: ecartNet, libelle: `Dotation provision risques et charges — ${l.designation}`,
        source: `ProvRC — ${l.compte}`,
      });
    } else {
      // Reprise manquante : D 19x / C 791x
      suggestions.push({
        compteDebit: l.compte, libelleDebit: l.designation,
        compteCredit: '791100', libelleCredit: 'Reprises de provisions d\'exploitation',
        montant: Math.abs(ecartNet), libelle: `Reprise provision risques et charges — ${l.designation}`,
        source: `ProvRC — ${l.compte}`,
      });
    }
  }

  // Totaux contrôle 1
  const totalN1 = lignes.reduce((s, l) => s + l.soldeN1, 0);
  const totalDot = lignes.reduce((s, l) => s + l.dotation, 0);
  const totalRep = lignes.reduce((s, l) => s + l.reprise, 0);
  const totalCalc = lignes.reduce((s, l) => s + l.soldeNCalcule, 0);
  const totalBal = lignes.reduce((s, l) => s + l.soldeNBalance, 0);
  const totalEcart = lignes.reduce((s, l) => s + l.ecart, 0);

  // Totaux contrôle 2
  const totalDerogVB = amortDerog.reduce((s, a) => s + a.valeurBrute, 0);
  const totalDerogAmort = amortDerog.reduce((s, a) => s + a.amortDerog, 0);
  const totalDerogReprise = amortDerog.reduce((s, a) => s + a.repriseDerog, 0);

  // Rapprochement Contrôle 2 vs solde 151x du Contrôle 1
  const solde151Balance = lignes.filter(l => l.compte.startsWith('151')).reduce((s, l) => s + l.soldeNBalance, 0);
  const ecartRapprochement = totalDerogAmort - totalDerogReprise - solde151Balance;

  // Totaux contrôle 3
  const totalRCN1 = provRC.reduce((s, l) => s + l.soldeN1, 0);
  const totalRCDot = provRC.reduce((s, l) => s + l.dotation, 0);
  const totalRCRep = provRC.reduce((s, l) => s + l.reprise, 0);
  const totalRCCalc = provRC.reduce((s, l) => s + l.soldeNCalcule, 0);
  const totalRCBal = provRC.reduce((s, l) => s + l.soldeNBalance, 0);
  const totalRCEcart = provRC.reduce((s, l) => s + l.ecart, 0);

  // Alerte 196 : provision retraite en N-1 sans mouvement en N
  const alerte196 = provRC.some(l =>
    l.compte.startsWith('196') && l.soldeN1 !== 0 && l.dotation === 0 && l.reprise === 0
  );

  return (
    <div className="revision-kp">
      <div className="revision-section-header">
        <h3>Provisions réglementées</h3>
        <button className="revision-save-btn" onClick={handleSave}>
          <LuSave size={14} /> {saved ? 'Sauvegardé' : 'Sauvegarder'}
        </button>
      </div>

      <div className="revision-objectif">
        <strong>Objectif :</strong> S'assurer de l'exhaustivité, du bien-fondé et de la correcte évaluation des provisions réglementées (amortissements dérogatoires, provisions pour investissement, hausse des prix, etc.).
      </div>


      <div className="revision-travaux">
        <button className="revision-travaux-toggle" onClick={() => setShowTravaux(!showTravaux)}>
          {showTravaux ? <LuChevronDown size={14} /> : <LuChevronRight size={14} />}
          <LuClipboardList size={14} />
          <span>Travaux à effectuer</span>
        </button>
        {showTravaux && (
          <ul className="revision-travaux-list">
            {TRAVAUX_PROV.map((t, i) => <li key={i}>{t}</li>)}
          </ul>
        )}
      </div>

      <FonctionnementCompte prefixes={['15']} titre="Provisions réglementées" />

      {/* Guide comptes de contrepartie — Provisions réglementées (15x) */}
      {lignes.length > 0 && (
        <div className="revision-guide-info">
          <LuInfo size={14} />
          <div>
            <strong>Fonctionnement SYSCOHADA — Provisions réglementées (15x) :</strong>
            <ul style={{ margin: '4px 0 0 16px', padding: 0, listStyle: 'disc' }}>
              <li><strong>Dotation :</strong> D <strong>851</strong> (Dotations HAO aux provisions réglementées) / C 15x</li>
              <li><strong>Reprise :</strong> D 15x / C <strong>861</strong> (Reprises HAO sur provisions réglementées)</li>
            </ul>
            <span style={{ fontSize: '11px', color: '#555', marginTop: 4, display: 'block' }}>
              Reportez les montants des comptes 851/861 de votre balance. Si votre balance utilise d'autres comptes (ex : 852, 862), reportez le montant correspondant et signalez l'anomalie.
            </span>
          </div>
        </div>
      )}

      {/* Contrôle 1 : Reconstitution */}
      <div className="revision-control">
        <div className="revision-control-title">
          <span>Contrôle 1 — Reconstitution des provisions réglementées</span>
          {Math.abs(totalEcart) < 0.5
            ? <span className="revision-badge ok">Conforme</span>
            : <span className="revision-badge ko">Écart détecté</span>
          }
        </div>

        <div className="revision-table-wrapper">
          <table className="revision-table">
            <thead>
              <tr>
                <th style={{ width: 80 }}>Compte</th>
                <th>Désignation</th>
                <th className="num editable-col" style={{ width: 130 }}>Solde N-1</th>
                <th className="num editable-col" style={{ width: 130 }}>Dotations (851xxx)</th>
                <th className="num editable-col" style={{ width: 130 }}>Reprises (861xxx)</th>
                <th className="num" style={{ width: 130 }}>Solde au 31/12/N</th>
                <th className="num" style={{ width: 130 }}>Balance générale</th>
                <th className="num" style={{ width: 100 }}>Écart</th>
              </tr>
            </thead>
            <tbody>
              {lignes.map((l, i) => {
                const ecartNet = l.ecart - odImpact(l.compte);
                return (
                  <tr key={l.compte} className={Math.abs(ecartNet) > 0.5 ? 'ecart-row' : ''}>
                    <td className="compte">{l.compte}</td>
                    <td>{l.designation}</td>
                    <td className="editable-cell">
                      <input type="text" inputMode="numeric" style={{ maxWidth: 'none' }} value={fmtInput(l.soldeN1)} onChange={e => updateLigne(i, 'soldeN1', parseInputValue(e.target.value))} />
                    </td>
                    <td className="editable-cell">
                      <input type="text" inputMode="numeric" style={{ maxWidth: 'none' }} value={fmtInput(l.dotation)} onChange={e => updateLigne(i, 'dotation', parseInputValue(e.target.value))} />
                    </td>
                    <td className="editable-cell">
                      <input type="text" inputMode="numeric" style={{ maxWidth: 'none' }} value={fmtInput(l.reprise)} onChange={e => updateLigne(i, 'reprise', parseInputValue(e.target.value))} />
                    </td>
                    <td className="num computed">{fmt(l.soldeNCalcule)}</td>
                    <td className="num">{fmt(l.soldeNBalance)}</td>
                    <td className={`num ${Math.abs(ecartNet) > 0.5 ? 'ecart-val' : 'ok-val'}`}>{fmt(ecartNet)}</td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={2}><strong>TOTAL</strong></td>
                <td className="num"><strong>{fmt(totalN1)}</strong></td>
                <td className="num"><strong>{fmt(totalDot)}</strong></td>
                <td className="num"><strong>{fmt(totalRep)}</strong></td>
                <td className="num"><strong>{fmt(totalCalc)}</strong></td>
                <td className="num"><strong>{fmt(totalBal)}</strong></td>
                <td className={`num ${Math.abs(totalEcart) > 0.5 ? 'ecart-val' : 'ok-val'}`}><strong>{fmt(totalEcart)}</strong></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Contrôle 2 : Amortissements dérogatoires */}
      <div className="revision-control">
        <div className="revision-control-title">
          <span>Contrôle 2 — Spécificité amortissements dérogatoires</span>
        </div>

        <div className="revision-table-wrapper">
          <table className="revision-table">
            <thead>
              <tr>
                <th style={{ minWidth: 160 }}>Biens concernés</th>
                <th style={{ width: 100 }}>Réf. fichier immo</th>
                <th className="num" style={{ width: 130 }}>Valeur brute</th>
                <th className="num" style={{ width: 140 }}>Amort. dérogatoire</th>
                <th style={{ width: 90, textAlign: 'center' }}>Bien cédé ?</th>
                <th className="num" style={{ width: 140 }}>Amort. dérog. repris</th>
                <th style={{ width: 30 }}></th>
              </tr>
            </thead>
            <tbody>
              {amortDerog.map(a => (
                <tr key={a.id}>
                  <td className="editable-cell">
                    <input type="text" value={a.bien} onChange={e => updateDerog(a.id, 'bien', e.target.value)} placeholder="Ex: Matériel industriel" style={{ maxWidth: 'none' }} />
                  </td>
                  <td className="editable-cell">
                    <input type="text" value={a.refImmo} onChange={e => updateDerog(a.id, 'refImmo', e.target.value)} placeholder="N° réf" style={{ fontFamily: 'monospace', maxWidth: 100 }} />
                  </td>
                  <td className="editable-cell">
                    <input type="text" inputMode="numeric" style={{ maxWidth: 'none' }} value={fmtInput(a.valeurBrute)} onChange={e => updateDerog(a.id, 'valeurBrute', parseInputValue(e.target.value))} />
                  </td>
                  <td className="editable-cell">
                    <input type="text" inputMode="numeric" style={{ maxWidth: 'none' }} value={fmtInput(a.amortDerog)} onChange={e => updateDerog(a.id, 'amortDerog', parseInputValue(e.target.value))} />
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <select value={a.cede ? 'Oui' : 'Non'} onChange={e => updateDerog(a.id, 'cede', e.target.value === 'Oui')} style={{ padding: '3px 6px', borderRadius: 4, border: '1px solid #ddd', width: '100%' }}>
                      <option value="Non">Non</option>
                      <option value="Oui">Oui</option>
                    </select>
                  </td>
                  <td className="editable-cell">
                    <input type="text" inputMode="numeric" style={{ maxWidth: 'none' }} value={a.cede ? fmtInput(a.repriseDerog) : 'N/A'} disabled={!a.cede} onChange={e => updateDerog(a.id, 'repriseDerog', parseInputValue(e.target.value))} />
                  </td>
                  <td>
                    <button className="revision-od-delete" onClick={() => removeDerog(a.id)} title="Supprimer"><LuTrash2 size={13} /></button>
                  </td>
                </tr>
              ))}
              {amortDerog.length === 0 && (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', color: '#999', padding: 16, fontStyle: 'italic' }}>
                    Aucun bien saisi. Ajoutez les biens concernés par les amortissements dérogatoires.
                  </td>
                </tr>
              )}
            </tbody>
            {amortDerog.length > 0 && (
              <tfoot>
                <tr>
                  <td colSpan={2}><strong>Total</strong></td>
                  <td className="num"><strong>{fmt(totalDerogVB)}</strong></td>
                  <td className="num"><strong>{fmt(totalDerogAmort)}</strong></td>
                  <td></td>
                  <td className="num"><strong>{fmt(totalDerogReprise)}</strong></td>
                  <td></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>

        <div className="revision-od-actions">
          <button className="revision-od-add" onClick={addDerogLigne}>
            <LuPlus size={13} /> Ajouter un bien
          </button>
        </div>

        {/* Rapprochement Contrôle 2 vs Contrôle 1 (151x) */}
        {(amortDerog.length > 0 || solde151Balance !== 0) && (
          <div className="revision-control-footer" style={{ marginTop: 12, padding: '10px 14px', background: '#f8f9fa', borderRadius: 6, fontSize: '12.5px' }}>
            <table className="revision-table revision-table-small" style={{ maxWidth: 420 }}>
              <tbody>
                <tr>
                  <td>Total amort. dérogatoires (Contrôle 2)</td>
                  <td className="num"><strong>{fmt(totalDerogAmort - totalDerogReprise)}</strong></td>
                </tr>
                <tr>
                  <td>Solde 151x en balance (Contrôle 1)</td>
                  <td className="num"><strong>{fmt(solde151Balance)}</strong></td>
                </tr>
                <tr>
                  <td>Écart</td>
                  <td className={`num ${Math.abs(ecartRapprochement) > 0.5 ? 'ecart-val' : 'ok-val'}`}>
                    <strong>{fmt(ecartRapprochement)}</strong>
                  </td>
                </tr>
              </tbody>
            </table>
            {Math.abs(ecartRapprochement) < 0.5
              ? <span className="revision-badge ok" style={{ marginLeft: 12 }}>Conforme</span>
              : <span className="revision-badge ko" style={{ marginLeft: 12 }}>Écart</span>
            }
          </div>
        )}
      </div>

      {/* Contrôle 3 : Provisions pour risques et charges (19x) */}
      <div className="revision-control">
        <div className="revision-control-title">
          <span>Contrôle 3 — Provisions pour risques et charges (19x)</span>
          {Math.abs(totalRCEcart) < 0.5
            ? <span className="revision-badge ok">Conforme</span>
            : <span className="revision-badge ko">Écart détecté</span>
          }
        </div>

        {/* Alerte 196 retraite sans mouvement */}
        {alerte196 && (
          <div className="revision-alerte">
            <strong>Attention :</strong> Le compte <strong>196</strong> (Provisions pour pensions et obligations similaires / retraite) présente un solde en N-1 mais aucun mouvement (dotation ou reprise) n'a été constaté en N.
            Vérifiez si une dotation complémentaire ou une reprise est nécessaire.
          </div>
        )}

        <div className="revision-table-wrapper">
          <table className="revision-table">
            <thead>
              <tr>
                <th style={{ width: 80 }}>Compte</th>
                <th>Désignation</th>
                <th className="num editable-col" style={{ width: 120 }}>Solde N-1</th>
                <th className="num editable-col" style={{ width: 140 }}>Dotation (D 691x/C 19x)</th>
                <th className="num editable-col" style={{ width: 140 }}>Reprise (D 19x/C 791x)</th>
                <th className="num" style={{ width: 120 }}>Solde N calculé</th>
                <th className="num" style={{ width: 120 }}>Solde N balance</th>
                <th className="num" style={{ width: 100 }}>Écart</th>
              </tr>
            </thead>
            <tbody>
              {provRC.length === 0 && (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', color: '#999', padding: 16, fontStyle: 'italic' }}>
                    Aucun compte 19x trouvé dans la balance N.
                  </td>
                </tr>
              )}
              {provRC.map((l, i) => {
                const ecartNet = l.ecart - odImpact(l.compte);
                const prefix3 = l.compte.substring(0, 3);
                const typeLabel = PROV_RC_TYPES[prefix3];
                return (
                  <tr key={l.compte} className={Math.abs(ecartNet) > 0.5 ? 'ecart-row' : ''}>
                    <td className="compte" title={typeLabel || ''}>{l.compte}</td>
                    <td>{l.designation}{typeLabel && l.designation !== typeLabel ? ` — ${typeLabel}` : ''}</td>
                    <td className="editable-cell">
                      <input type="text" inputMode="numeric" style={{ maxWidth: 'none' }} value={fmtInput(l.soldeN1)} onChange={e => updateProvRC(i, 'soldeN1', parseInputValue(e.target.value))} />
                    </td>
                    <td className="editable-cell">
                      <input type="text" inputMode="numeric" style={{ maxWidth: 'none' }} value={fmtInput(l.dotation)} onChange={e => updateProvRC(i, 'dotation', parseInputValue(e.target.value))} />
                    </td>
                    <td className="editable-cell">
                      <input type="text" inputMode="numeric" style={{ maxWidth: 'none' }} value={fmtInput(l.reprise)} onChange={e => updateProvRC(i, 'reprise', parseInputValue(e.target.value))} />
                    </td>
                    <td className="num computed">{fmt(l.soldeNCalcule)}</td>
                    <td className="num">{fmt(l.soldeNBalance)}</td>
                    <td className={`num ${Math.abs(ecartNet) > 0.5 ? 'ecart-val' : 'ok-val'}`}>{fmt(ecartNet)}</td>
                  </tr>
                );
              })}
            </tbody>
            {provRC.length > 0 && (
              <tfoot>
                <tr>
                  <td colSpan={2}><strong>TOTAL</strong></td>
                  <td className="num"><strong>{fmt(totalRCN1)}</strong></td>
                  <td className="num"><strong>{fmt(totalRCDot)}</strong></td>
                  <td className="num"><strong>{fmt(totalRCRep)}</strong></td>
                  <td className="num"><strong>{fmt(totalRCCalc)}</strong></td>
                  <td className="num"><strong>{fmt(totalRCBal)}</strong></td>
                  <td className={`num ${Math.abs(totalRCEcart) > 0.5 ? 'ecart-val' : 'ok-val'}`}><strong>{fmt(totalRCEcart)}</strong></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>

        {/* Détail des comptes de dotation/reprise trouvés */}
        {provRC.length > 0 && (
          <div className="revision-control-footer" style={{ marginTop: 12, padding: '10px 14px', background: '#f8f9fa', borderRadius: 6, fontSize: '12px' }}>
            <strong>Comptes de contrepartie identifiés :</strong>
            <ul style={{ margin: '6px 0 0 16px', padding: 0, listStyle: 'disc' }}>
              <li><strong>Dotations :</strong> 6911 (exploitation), 6912 (financier), 6913 (HAO)</li>
              <li><strong>Reprises :</strong> 7911 (exploitation), 7912 (financier), 7913 (HAO)</li>
            </ul>
          </div>
        )}
      </div>

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

export default RevisionProv;
