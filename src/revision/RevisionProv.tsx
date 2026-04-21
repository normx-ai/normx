import { clientFetch } from '../lib/api';
import { api } from '../lib/apiEndpoints';
import React, { useState, useEffect } from 'react';
import { LuSave, LuChevronDown, LuChevronRight, LuClipboardList } from 'react-icons/lu';
import { BalanceLigne } from '../types';
import {
  ODEcriture, Suggestion, soldeCreditNet,
  ProvLigne, AmortDerogLigne, ProvRCLigne, TRAVAUX_PROV,
} from './revisionTypes';
import JournalOD from './JournalOD';
import FonctionnementCompte from './FonctionnementCompte';
import { Controle1Reconstitution } from './prov/Controle1Reconstitution';
import { Controle2AmortDerog } from './prov/Controle2AmortDerog';
import { Controle3RisquesCharges } from './prov/Controle3RisquesCharges';

interface RevisionProvProps {
  balanceN: BalanceLigne[];
  exerciceAnnee: number;
  entiteId: number;
  exerciceId: number;
}

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

    for (const bl of balanceN) {
      if (!bl.numero_compte.startsWith('19')) continue;
      if (comptesRC.has(bl.numero_compte)) continue;
      comptesRC.add(bl.numero_compte);

      const sfN = soldeCreditNet(bl);
      const sfN1 = (parseFloat(String(bl.si_credit ?? 0)) || 0) - (parseFloat(String(bl.si_debit ?? 0)) || 0);
      const mvtC = parseFloat(String(bl.credit)) || 0;
      const mvtD = parseFloat(String(bl.debit)) || 0;
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
    clientFetch(api.revision.onglet(entiteId, exerciceId, 'prov'))
      .then(r => { if (r.ok) return r.json(); throw new Error(); })
      .then((data: { lignes?: ProvLigne[]; amortDerog?: AmortDerogLigne[]; provRC?: ProvRCLigne[]; odEcritures?: ODEcriture[] }) => {
        if (data.lignes) {
          const merged = defaultLignes.map(dl => {
            const s = data.lignes!.find(x => x.compte === dl.compte);
            return s ? { ...dl, dotation: s.dotation || 0, reprise: s.reprise || 0 } : dl;
          });
          recalc(merged);
          setLignes(merged);
        }
        if (data.amortDerog) {
          setAmortDerog(data.amortDerog);
          if (data.amortDerog.length > 0) setNextDerogId(Math.max(...data.amortDerog.map(a => a.id)) + 1);
        }
        if (data.provRC) {
          const mergedRC = defaultRC.map(dl => {
            const s = data.provRC!.find(x => x.compte === dl.compte);
            return s ? { ...dl, dotation: s.dotation || 0, reprise: s.reprise || 0 } : dl;
          });
          recalcRC(mergedRC);
          setProvRC(mergedRC);
        }
        if (data.odEcritures) {
          setOdEcritures(data.odEcritures);
          if (data.odEcritures.length > 0) setNextOdId(Math.max(...data.odEcritures.map(e => e.id)) + 1);
        }
      })
      .catch(() => {});
  };

  const handleSave = async (): Promise<void> => {
    try {
      const res = await clientFetch(api.revision.onglet(entiteId, exerciceId, 'prov'), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lignes, amortDerog, provRC, odEcritures }),
      });
      if (!res.ok) throw new Error('Erreur sauvegarde');
      setSaved(true);
    } catch {
      setSaved(false);
      alert('Erreur lors de la sauvegarde. Reessayez.');
    }
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

  const addDerogLigne = (): void => {
    setAmortDerog(prev => [...prev, { id: nextDerogId, bien: '', refImmo: '', valeurBrute: 0, amortDerog: 0, cede: false, repriseDerog: 0 }]);
    setNextDerogId(prev => prev + 1);
    setSaved(false);
  };
  const updateDerog = (id: number, field: keyof AmortDerogLigne, value: string | number | boolean): void => { setAmortDerog(prev => prev.map(a => a.id === id ? { ...a, [field]: value } : a)); setSaved(false); };
  const removeDerog = (id: number): void => { setAmortDerog(prev => prev.filter(a => a.id !== id)); setSaved(false); };

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
  const updateOd = (id: number, field: keyof ODEcriture, value: string | number): void => { setOdEcritures(prev => prev.map(e => e.id === id ? { ...e, [field]: value } : e)); setSaved(false); };
  const removeOd = (id: number): void => { setOdEcritures(prev => prev.filter(e => e.id !== id)); setSaved(false); };

  const odImpact = (compte: string): number => {
    return odEcritures.reduce((sum, od) => {
      if (od.compteDebit === compte) return sum - od.montant;
      if (od.compteCredit === compte) return sum + od.montant;
      return sum;
    }, 0);
  };

  // --- Suggestions ---
  const suggestions: Suggestion[] = [];
  for (const l of lignes) {
    const ecartNet = l.ecart - odImpact(l.compte);
    if (Math.abs(ecartNet) < 0.5) continue;
    if (odEcritures.some(od => od.source === `Prov — ${l.compte}`)) continue;
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

  for (const l of provRC) {
    const ecartNet = l.ecart - odImpact(l.compte);
    if (Math.abs(ecartNet) < 0.5) continue;
    if (odEcritures.some(od => od.source === `ProvRC — ${l.compte}`)) continue;
    if (ecartNet > 0) {
      suggestions.push({
        compteDebit: '691100', libelleDebit: "Dotations aux provisions d'exploitation",
        compteCredit: l.compte, libelleCredit: l.designation,
        montant: ecartNet, libelle: `Dotation provision risques et charges — ${l.designation}`,
        source: `ProvRC — ${l.compte}`,
      });
    } else {
      suggestions.push({
        compteDebit: l.compte, libelleDebit: l.designation,
        compteCredit: '791100', libelleCredit: "Reprises de provisions d'exploitation",
        montant: Math.abs(ecartNet), libelle: `Reprise provision risques et charges — ${l.designation}`,
        source: `ProvRC — ${l.compte}`,
      });
    }
  }

  const totalN1 = lignes.reduce((s, l) => s + l.soldeN1, 0);
  const totalDot = lignes.reduce((s, l) => s + l.dotation, 0);
  const totalRep = lignes.reduce((s, l) => s + l.reprise, 0);
  const totalCalc = lignes.reduce((s, l) => s + l.soldeNCalcule, 0);
  const totalBal = lignes.reduce((s, l) => s + l.soldeNBalance, 0);
  const totalEcart = lignes.reduce((s, l) => s + l.ecart, 0);

  const totalDerogVB = amortDerog.reduce((s, a) => s + a.valeurBrute, 0);
  const totalDerogAmort = amortDerog.reduce((s, a) => s + a.amortDerog, 0);
  const totalDerogReprise = amortDerog.reduce((s, a) => s + a.repriseDerog, 0);
  const solde151Balance = lignes.filter(l => l.compte.startsWith('151')).reduce((s, l) => s + l.soldeNBalance, 0);
  const ecartRapprochement = totalDerogAmort - totalDerogReprise - solde151Balance;

  const totalRCN1 = provRC.reduce((s, l) => s + l.soldeN1, 0);
  const totalRCDot = provRC.reduce((s, l) => s + l.dotation, 0);
  const totalRCRep = provRC.reduce((s, l) => s + l.reprise, 0);
  const totalRCCalc = provRC.reduce((s, l) => s + l.soldeNCalcule, 0);
  const totalRCBal = provRC.reduce((s, l) => s + l.soldeNBalance, 0);
  const totalRCEcart = provRC.reduce((s, l) => s + l.ecart, 0);
  const alerte196 = provRC.some(l => l.compte.startsWith('196') && l.soldeN1 !== 0 && l.dotation === 0 && l.reprise === 0);

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

      <Controle1Reconstitution
        lignes={lignes}
        totalN1={totalN1}
        totalDot={totalDot}
        totalRep={totalRep}
        totalCalc={totalCalc}
        totalBal={totalBal}
        totalEcart={totalEcart}
        updateLigne={updateLigne}
        odImpact={odImpact}
      />

      <Controle2AmortDerog
        amortDerog={amortDerog}
        totalDerogVB={totalDerogVB}
        totalDerogAmort={totalDerogAmort}
        totalDerogReprise={totalDerogReprise}
        solde151Balance={solde151Balance}
        ecartRapprochement={ecartRapprochement}
        addDerogLigne={addDerogLigne}
        updateDerog={updateDerog}
        removeDerog={removeDerog}
      />

      <Controle3RisquesCharges
        provRC={provRC}
        totalRCN1={totalRCN1}
        totalRCDot={totalRCDot}
        totalRCRep={totalRCRep}
        totalRCCalc={totalRCCalc}
        totalRCBal={totalRCBal}
        totalRCEcart={totalRCEcart}
        alerte196={alerte196}
        updateProvRC={updateProvRC}
        odImpact={odImpact}
      />

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
