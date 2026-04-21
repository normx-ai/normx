import { clientFetch } from '../lib/api';
import { api } from '../lib/apiEndpoints';
import React, { useState, useEffect } from 'react';
import { LuSave, LuChevronDown, LuChevronRight, LuClipboardList } from 'react-icons/lu';
import { BalanceLigne } from '../types';
import {
  ODEcriture, Suggestion, fmt, soldeCreditNet, totalSoldeCreditNet,
  PretLigne, InteretLigne, InteretCoururLigne, AutreChargeLigne, TRAVAUX_DF,
} from './revisionTypes';
import JournalOD from './JournalOD';
import FonctionnementCompte from './FonctionnementCompte';
import { Controle1Prets } from './df/Controle1Prets';
import { Controle2Interets } from './df/Controle2Interets';
import { Controle3Courus } from './df/Controle3Courus';
import { Controle4Autres } from './df/Controle4Autres';

interface RevisionDFProps {
  balanceN: BalanceLigne[];
  exerciceAnnee: number;
  entiteId: number;
  exerciceId: number;
}

function RevisionDF({ balanceN, exerciceAnnee, entiteId, exerciceId }: RevisionDFProps): React.ReactElement {
  const [prets, setPrets] = useState<PretLigne[]>([]);
  const [interets, setInterets] = useState<InteretLigne[]>([]);
  const [interetsCourus, setInteretsCourus] = useState<InteretCoururLigne[]>([]);
  const [autresCharges, setAutresCharges] = useState<AutreChargeLigne[]>([]);
  const [nextIds, setNextIds] = useState({ pret: 1, interet: 1, couru: 1, autre: 1 });
  const [saved, setSaved] = useState(false);
  const [odEcritures, setOdEcritures] = useState<ODEcriture[]>([]);
  const [nextOdId, setNextOdId] = useState(1);
  const [showTravaux, setShowTravaux] = useState(true);

  const comptes16 = balanceN.filter(l => l.numero_compte.startsWith('16'));
  const comptes166 = balanceN.filter(l => l.numero_compte.startsWith('166'));
  const totalSolde16Balance = totalSoldeCreditNet(comptes16);

  useEffect(() => { loadSaved(); }, [entiteId, exerciceId]);

  const loadSaved = (): void => {
    clientFetch(api.revision.onglet(entiteId, exerciceId, 'df'))
      .then(r => { if (r.ok) return r.json(); throw new Error(); })
      .then((data: { prets?: PretLigne[]; interets?: InteretLigne[]; interetsCourus?: InteretCoururLigne[]; autresCharges?: AutreChargeLigne[]; odEcritures?: ODEcriture[] }) => {
        if (data.prets) { setPrets(data.prets); if (data.prets.length > 0) setNextIds(prev => ({ ...prev, pret: Math.max(...data.prets!.map((a: PretLigne) => a.id)) + 1 })); }
        if (data.interets) { setInterets(data.interets); if (data.interets.length > 0) setNextIds(prev => ({ ...prev, interet: Math.max(...data.interets!.map((a: InteretLigne) => a.id)) + 1 })); }
        if (data.interetsCourus) { setInteretsCourus(data.interetsCourus); if (data.interetsCourus.length > 0) setNextIds(prev => ({ ...prev, couru: Math.max(...data.interetsCourus!.map((a: InteretCoururLigne) => a.id)) + 1 })); }
        if (data.autresCharges) { setAutresCharges(data.autresCharges); if (data.autresCharges.length > 0) setNextIds(prev => ({ ...prev, autre: Math.max(...data.autresCharges!.map((a: AutreChargeLigne) => a.id)) + 1 })); }
        if (data.odEcritures) { setOdEcritures(data.odEcritures); if (data.odEcritures.length > 0) setNextOdId(Math.max(...data.odEcritures!.map((e: ODEcriture) => e.id)) + 1); }
      })
      .catch(() => {});
  };

  const handleSave = async (): Promise<void> => {
    try {
      const res = await clientFetch(api.revision.onglet(entiteId, exerciceId, 'df'), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prets, interets, interetsCourus, autresCharges, odEcritures }),
      });
      if (!res.ok) throw new Error('Erreur sauvegarde');
      setSaved(true);
    } catch {
      setSaved(false);
      alert('Erreur lors de la sauvegarde. Reessayez.');
    }
  };

  // --- CRUD ---
  const addPret = (): void => { setPrets(prev => [...prev, { id: nextIds.pret, contratNo: '', bailleur: '', dateObtention: '', soldeN1: 0, nouveauxEmprunts: 0, remboursement: 0, planAmort: 0 }]); setNextIds(prev => ({ ...prev, pret: prev.pret + 1 })); setSaved(false); };
  const updatePret = (id: number, field: keyof PretLigne, value: string | number): void => { setPrets(prev => prev.map(p => p.id === id ? { ...p, [field]: value } : p)); setSaved(false); };
  const removePret = (id: number): void => { setPrets(prev => prev.filter(p => p.id !== id)); setSaved(false); };

  const addInteret = (): void => { setInterets(prev => [...prev, { id: nextIds.interet, contratNo: '', bailleur: '', compte: '671200', chargesComptabilisees: 0, releveBancaire: 0, planRemboursement: 0 }]); setNextIds(prev => ({ ...prev, interet: prev.interet + 1 })); setSaved(false); };
  const updateInteret = (id: number, field: keyof InteretLigne, value: string | number): void => { setInterets(prev => prev.map(p => p.id === id ? { ...p, [field]: value } : p)); setSaved(false); };
  const removeInteret = (id: number): void => { setInterets(prev => prev.filter(p => p.id !== id)); setSaved(false); };

  const addCouru = (): void => { setInteretsCourus(prev => [...prev, { id: nextIds.couru, contratNo: '', bailleur: '', compte: '1662', dateEcheance: '', dateFinMois: `${exerciceAnnee}-12-31`, interetsMensuels: 0 }]); setNextIds(prev => ({ ...prev, couru: prev.couru + 1 })); setSaved(false); };
  const updateCouru = (id: number, field: keyof InteretCoururLigne, value: string | number): void => { setInteretsCourus(prev => prev.map(p => p.id === id ? { ...p, [field]: value } : p)); setSaved(false); };
  const removeCouru = (id: number): void => { setInteretsCourus(prev => prev.filter(p => p.id !== id)); setSaved(false); };

  const addAutre = (): void => { setAutresCharges(prev => [...prev, { id: nextIds.autre, contratNo: '', bailleur: '', compte: '', natureCharge: '', releveBancaire: 0, balance: 0, planRemboursement: 0 }]); setNextIds(prev => ({ ...prev, autre: prev.autre + 1 })); setSaved(false); };
  const updateAutre = (id: number, field: keyof AutreChargeLigne, value: string | number): void => { setAutresCharges(prev => prev.map(p => p.id === id ? { ...p, [field]: value } : p)); setSaved(false); };
  const removeAutre = (id: number): void => { setAutresCharges(prev => prev.filter(p => p.id !== id)); setSaved(false); };

  // --- Calculs ---
  const pretCalcs = prets.map(p => {
    const soldeN = p.soldeN1 + p.nouveauxEmprunts - p.remboursement;
    const ecart1 = soldeN - totalSolde16Balance;
    const ecart2 = totalSolde16Balance - p.planAmort;
    return { ...p, soldeN, balanceGenerale: totalSolde16Balance, ecart1, ecart2 };
  });

  const interetCalcs = interets.map(i => {
    const ecart1 = i.chargesComptabilisees - i.releveBancaire;
    const ecart2 = i.planRemboursement - i.releveBancaire;
    return { ...i, ecart1, ecart2 };
  });

  const couruCalcs = interetsCourus.map(c => {
    const d1 = c.dateEcheance ? new Date(c.dateEcheance) : null;
    const d2 = c.dateFinMois ? new Date(c.dateFinMois) : null;
    const decalage = d1 && d2 ? Math.max(0, Math.round((d1.getTime() - d2.getTime()) / (1000 * 60 * 60 * 24))) : 0;
    const calc = decalage > 0 ? (c.interetsMensuels * decalage) / 31 : 0;
    const balLigne = comptes166.find(l => l.numero_compte === c.compte) || comptes166.find(l => l.numero_compte.startsWith(c.compte));
    const balanceGenerale = balLigne ? soldeCreditNet(balLigne) : 0;
    const ecart = balanceGenerale - calc;
    return { ...c, decalage, interetsCourus: calc, balanceGenerale, ecart };
  });

  const autreCalcs = autresCharges.map(a => {
    const ecart1 = a.releveBancaire - a.balance;
    const ecart2 = a.planRemboursement - a.balance;
    return { ...a, ecart1, ecart2 };
  });

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

  // --- Suggestions ---
  const suggestions: Suggestion[] = [];
  const totalSoldeNCalc = prets.reduce((s, p) => s + p.soldeN1 + p.nouveauxEmprunts - p.remboursement, 0);
  const ecartC1Global = totalSoldeNCalc - totalSolde16Balance;
  if (prets.length > 0 && Math.abs(ecartC1Global) > 0.5 && !odEcritures.some(od => od.source === 'DF-C1')) {
    if (ecartC1Global > 0) {
      suggestions.push({
        compteDebit: '164000', libelleDebit: 'Emprunts auprès des ét. de crédit',
        compteCredit: '521000', libelleCredit: 'Banque',
        montant: ecartC1Global, libelle: 'Remboursement emprunt non comptabilisé',
        source: 'DF-C1',
      });
    } else {
      suggestions.push({
        compteDebit: '521000', libelleDebit: 'Banque',
        compteCredit: '164000', libelleCredit: 'Emprunts auprès des ét. de crédit',
        montant: Math.abs(ecartC1Global), libelle: 'Nouvel emprunt non comptabilisé',
        source: 'DF-C1',
      });
    }
  }

  const totalPretN1 = prets.reduce((s, p) => s + p.soldeN1, 0);
  const totalNouveaux = prets.reduce((s, p) => s + p.nouveauxEmprunts, 0);
  const totalRembours = prets.reduce((s, p) => s + p.remboursement, 0);
  const totalPlanAmort = prets.reduce((s, p) => s + p.planAmort, 0);
  const totalInteretCharge = interets.reduce((s, i) => s + i.chargesComptabilisees, 0);
  const totalInteretReleve = interets.reduce((s, i) => s + i.releveBancaire, 0);
  const totalInteretPlan = interets.reduce((s, i) => s + i.planRemboursement, 0);
  const totalCouruMensuel = couruCalcs.reduce((s, c) => s + c.interetsMensuels, 0);
  const totalCouruCalc = couruCalcs.reduce((s, c) => s + c.interetsCourus, 0);
  const totalCouruBalance = couruCalcs.reduce((s, c) => s + c.balanceGenerale, 0);
  const totalAutreReleve = autresCharges.reduce((s, a) => s + a.releveBancaire, 0);
  const totalAutreBalance = autresCharges.reduce((s, a) => s + a.balance, 0);
  const totalAutrePlan = autresCharges.reduce((s, a) => s + a.planRemboursement, 0);

  return (
    <div className="revision-kp">
      <div className="revision-section-header">
        <h3>Dettes financières</h3>
        <button className="revision-save-btn" onClick={handleSave}>
          <LuSave size={14} /> {saved ? 'Sauvegardé' : 'Sauvegarder'}
        </button>
      </div>

      <div className="revision-objectif">
        <strong>Objectif :</strong> S'assurer de l'exhaustivité et de la correcte évaluation des dettes financières et emprunts contractés auprès d'établissements bancaires ou financiers, ainsi que du bon calcul des charges d'intérêts et intérêts courus.
      </div>

      <div className="revision-travaux">
        <button className="revision-travaux-toggle" onClick={() => setShowTravaux(!showTravaux)}>
          {showTravaux ? <LuChevronDown size={14} /> : <LuChevronRight size={14} />}
          <LuClipboardList size={14} />
          <span>Travaux à effectuer</span>
        </button>
        {showTravaux && (
          <ul className="revision-travaux-list">
            {TRAVAUX_DF.map((t, i) => <li key={i}>{t}</li>)}
          </ul>
        )}
      </div>

      <FonctionnementCompte prefixes={['16','17','18','19']} titre="Dettes financières" />

      {comptes16.length > 0 && prets.length === 0 && (
        <div className="revision-objectif">
          <strong>Information :</strong> La balance contient {comptes16.length} compte{comptes16.length > 1 ? 's' : ''} de dettes financières (16x) pour un solde total de <strong>{fmt(totalSolde16Balance)}</strong>.
          <ul>
            {comptes16.map(l => (
              <li key={l.numero_compte}>
                <strong>{l.numero_compte}</strong> — {l.libelle_compte} : {fmt(soldeCreditNet(l))}
              </li>
            ))}
          </ul>
          Ajoutez les prêts correspondants dans le contrôle ci-dessous pour vérifier la cohérence.
        </div>
      )}

      <Controle1Prets
        pretCalcs={pretCalcs}
        prets={prets}
        totalSolde16Balance={totalSolde16Balance}
        totalPretN1={totalPretN1}
        totalNouveaux={totalNouveaux}
        totalRembours={totalRembours}
        totalSoldeNCalc={totalSoldeNCalc}
        totalPlanAmort={totalPlanAmort}
        ecartC1Global={ecartC1Global}
        addPret={addPret}
        updatePret={updatePret}
        removePret={removePret}
      />

      <Controle2Interets
        interetCalcs={interetCalcs}
        interets={interets}
        totalInteretCharge={totalInteretCharge}
        totalInteretReleve={totalInteretReleve}
        totalInteretPlan={totalInteretPlan}
        addInteret={addInteret}
        updateInteret={updateInteret}
        removeInteret={removeInteret}
      />

      <Controle3Courus
        couruCalcs={couruCalcs}
        interetsCourus={interetsCourus}
        totalCouruMensuel={totalCouruMensuel}
        totalCouruCalc={totalCouruCalc}
        totalCouruBalance={totalCouruBalance}
        addCouru={addCouru}
        updateCouru={updateCouru}
        removeCouru={removeCouru}
      />

      <Controle4Autres
        autreCalcs={autreCalcs}
        autresCharges={autresCharges}
        totalAutreReleve={totalAutreReleve}
        totalAutreBalance={totalAutreBalance}
        totalAutrePlan={totalAutrePlan}
        addAutre={addAutre}
        updateAutre={updateAutre}
        removeAutre={removeAutre}
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

export default RevisionDF;
