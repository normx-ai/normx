import { clientFetch } from '../lib/api';
import { api } from '../lib/apiEndpoints';
import React, { useState, useEffect } from 'react';
import { LuSave, LuChevronDown, LuChevronRight, LuClipboardList } from 'react-icons/lu';
import { BalanceLigne } from '../types';
import {
  ODEcriture, Suggestion, fmt, soldeCreditNet,
  totalSoldeNet, totalSoldeCreditNet,
  ReconFournLigne, FarLigne, FournDebiteurLigne, AvanceFournLigne,
  DetteDeviseLigne, CircuFournLigne, TRAVAUX_FOURN,
} from './revisionTypes';
import JournalOD from './JournalOD';
import FonctionnementCompte from './FonctionnementCompte';
import { Controle1Recon } from './fourn/Controle1Recon';
import { Controle2Far } from './fourn/Controle2Far';
import { Controle3Debiteurs } from './fourn/Controle3Debiteurs';
import { Controle4Avances } from './fourn/Controle4Avances';
import { Controle5Devises } from './fourn/Controle5Devises';
import { Controle6Circu } from './fourn/Controle6Circu';

interface RevisionFournProps {
  balanceN: BalanceLigne[];
  exerciceAnnee: number;
  entiteId: number;
  exerciceId: number;
}

function RevisionFourn({ balanceN, exerciceAnnee, entiteId, exerciceId }: RevisionFournProps): React.ReactElement {
  const [reconLignes, setReconLignes] = useState<ReconFournLigne[]>([]);
  const [farLignes, setFarLignes] = useState<FarLigne[]>([]);
  const [debiteurLignes, setDebiteurLignes] = useState<FournDebiteurLigne[]>([]);
  const [avanceLignes, setAvanceLignes] = useState<AvanceFournLigne[]>([]);
  const [deviseLignes, setDeviseLignes] = useState<DetteDeviseLigne[]>([]);
  const [circuLignes, setCircuLignes] = useState<CircuFournLigne[]>([]);
  const [nextIds, setNextIds] = useState({ recon: 1, far: 1, deb: 1, av: 1, dev: 1, circ: 1 });
  const [saved, setSaved] = useState(false);
  const [odEcritures, setOdEcritures] = useState<ODEcriture[]>([]);
  const [nextOdId, setNextOdId] = useState(1);
  const [showTravaux, setShowTravaux] = useState(true);

  const comptes40 = balanceN.filter(l => l.numero_compte.startsWith('40'));
  const comptes401 = balanceN.filter(l => l.numero_compte.startsWith('401'));
  const comptes408 = balanceN.filter(l => l.numero_compte.startsWith('408'));
  const comptes409 = balanceN.filter(l => l.numero_compte.startsWith('409'));
  const comptes481 = balanceN.filter(l => l.numero_compte.startsWith('481'));

  const totalFourn40Balance = totalSoldeCreditNet(comptes40);
  const totalFar408Balance = totalSoldeCreditNet(comptes408);
  const totalDebiteur409Balance = totalSoldeNet(comptes409);

  useEffect(() => { loadSaved(); }, [entiteId, exerciceId]);

  const loadSaved = (): void => {
    clientFetch(api.revision.onglet(entiteId, exerciceId, 'fourn'))
      .then(r => { if (r.ok) return r.json(); throw new Error(); })
      .then((data: { reconLignes?: ReconFournLigne[]; farLignes?: FarLigne[]; debiteurLignes?: FournDebiteurLigne[]; avanceLignes?: AvanceFournLigne[]; deviseLignes?: DetteDeviseLigne[]; circuLignes?: CircuFournLigne[]; odEcritures?: ODEcriture[] }) => {
        if (data.reconLignes) { setReconLignes(data.reconLignes); if (data.reconLignes.length > 0) setNextIds(prev => ({ ...prev, recon: Math.max(...data.reconLignes!.map((a: ReconFournLigne) => a.id)) + 1 })); }
        if (data.farLignes) { setFarLignes(data.farLignes); if (data.farLignes.length > 0) setNextIds(prev => ({ ...prev, far: Math.max(...data.farLignes!.map((a: FarLigne) => a.id)) + 1 })); }
        if (data.debiteurLignes) { setDebiteurLignes(data.debiteurLignes); if (data.debiteurLignes.length > 0) setNextIds(prev => ({ ...prev, deb: Math.max(...data.debiteurLignes!.map((a: FournDebiteurLigne) => a.id)) + 1 })); }
        if (data.avanceLignes) { setAvanceLignes(data.avanceLignes); if (data.avanceLignes.length > 0) setNextIds(prev => ({ ...prev, av: Math.max(...data.avanceLignes!.map((a: AvanceFournLigne) => a.id)) + 1 })); }
        if (data.deviseLignes) { setDeviseLignes(data.deviseLignes); if (data.deviseLignes.length > 0) setNextIds(prev => ({ ...prev, dev: Math.max(...data.deviseLignes!.map((a: DetteDeviseLigne) => a.id)) + 1 })); }
        if (data.circuLignes) { setCircuLignes(data.circuLignes); if (data.circuLignes.length > 0) setNextIds(prev => ({ ...prev, circ: Math.max(...data.circuLignes!.map((a: CircuFournLigne) => a.id)) + 1 })); }
        if (data.odEcritures) { setOdEcritures(data.odEcritures); if (data.odEcritures.length > 0) setNextOdId(Math.max(...data.odEcritures.map((e: ODEcriture) => e.id)) + 1); }
      })
      .catch(() => {});
  };

  const handleSave = async (): Promise<void> => {
    try {
      const res = await clientFetch(api.revision.onglet(entiteId, exerciceId, 'fourn'), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reconLignes, farLignes, debiteurLignes, avanceLignes, deviseLignes, circuLignes, odEcritures }),
      });
      if (!res.ok) throw new Error('Erreur sauvegarde');
      setSaved(true);
    } catch {
      setSaved(false);
      alert('Erreur lors de la sauvegarde. Reessayez.');
    }
  };

  // --- CRUD ---
  const addRecon = (): void => { setReconLignes(prev => [...prev, { id: nextIds.recon, codeFourn: '', designation: '', solde3112: 0, soldeReconcilie: 0, commentaire: '' }]); setNextIds(prev => ({ ...prev, recon: prev.recon + 1 })); setSaved(false); };
  const updateRecon = (id: number, field: keyof ReconFournLigne, value: string | number): void => { setReconLignes(prev => prev.map(l => l.id === id ? { ...l, [field]: value } : l)); setSaved(false); };
  const removeRecon = (id: number): void => { setReconLignes(prev => prev.filter(l => l.id !== id)); setSaved(false); };

  const addFar = (): void => { setFarLignes(prev => [...prev, { id: nextIds.far, numCommande: '', libellePrestation: '', docJustificatif: '', montant: 0 }]); setNextIds(prev => ({ ...prev, far: prev.far + 1 })); setSaved(false); };
  const updateFar = (id: number, field: keyof FarLigne, value: string | number): void => { setFarLignes(prev => prev.map(l => l.id === id ? { ...l, [field]: value } : l)); setSaved(false); };
  const removeFar = (id: number): void => { setFarLignes(prev => prev.filter(l => l.id !== id)); setSaved(false); };

  const addDebiteur = (): void => { setDebiteurLignes(prev => [...prev, { id: nextIds.deb, codeFourn: '', designation: '', solde3112: 0, dateDebit: '', objetDebit: '', commentaire: '' }]); setNextIds(prev => ({ ...prev, deb: prev.deb + 1 })); setSaved(false); };
  const updateDebiteur = (id: number, field: keyof FournDebiteurLigne, value: string | number): void => { setDebiteurLignes(prev => prev.map(l => l.id === id ? { ...l, [field]: value } : l)); setSaved(false); };
  const removeDebiteur = (id: number): void => { setDebiteurLignes(prev => prev.filter(l => l.id !== id)); setSaved(false); };

  const addAvance = (): void => { setAvanceLignes(prev => [...prev, { id: nextIds.av, codeFourn: '', designation: '', avance: 0, objetAvance: '', conclusion: '' }]); setNextIds(prev => ({ ...prev, av: prev.av + 1 })); setSaved(false); };
  const updateAvance = (id: number, field: keyof AvanceFournLigne, value: string | number): void => { setAvanceLignes(prev => prev.map(l => l.id === id ? { ...l, [field]: value } : l)); setSaved(false); };
  const removeAvance = (id: number): void => { setAvanceLignes(prev => prev.filter(l => l.id !== id)); setSaved(false); };

  const addDevise = (): void => { setDeviseLignes(prev => [...prev, { id: nextIds.dev, codeFourn: '', nomFourn: '', monnaie: 'USD', valeurInitialeFCFA: 0, parite3112: 0, valeurDevise: 0 }]); setNextIds(prev => ({ ...prev, dev: prev.dev + 1 })); setSaved(false); };
  const updateDevise = (id: number, field: keyof DetteDeviseLigne, value: string | number): void => { setDeviseLignes(prev => prev.map(l => l.id === id ? { ...l, [field]: value } : l)); setSaved(false); };
  const removeDevise = (id: number): void => { setDeviseLignes(prev => prev.filter(l => l.id !== id)); setSaved(false); };

  const addCircu = (): void => { setCircuLignes(prev => [...prev, { id: nextIds.circ, codeFourn: '', nomFourn: '', solde3112: 0, soldeReconcilie: 0, commentaire: '' }]); setNextIds(prev => ({ ...prev, circ: prev.circ + 1 })); setSaved(false); };
  const updateCircu = (id: number, field: keyof CircuFournLigne, value: string | number): void => { setCircuLignes(prev => prev.map(l => l.id === id ? { ...l, [field]: value } : l)); setSaved(false); };
  const removeCircu = (id: number): void => { setCircuLignes(prev => prev.filter(l => l.id !== id)); setSaved(false); };
  const autoPopulateCircu = (): void => {
    if (comptes401.length === 0) return;
    const existing = new Set(circuLignes.map(l => l.codeFourn));
    let currentId = nextIds.circ;
    const newLignes: CircuFournLigne[] = [];
    comptes401.forEach(c => {
      if (!existing.has(c.numero_compte)) {
        const solde = soldeCreditNet(c);
        newLignes.push({ id: currentId, codeFourn: c.numero_compte, nomFourn: c.libelle_compte || '', solde3112: solde, soldeReconcilie: 0, commentaire: '' });
        currentId++;
      }
    });
    if (newLignes.length > 0) {
      setCircuLignes(prev => [...prev, ...newLignes]);
      setNextIds(prev => ({ ...prev, circ: currentId }));
      setSaved(false);
    }
  };

  // --- Calculs ---
  const totalSolde = reconLignes.reduce((s, l) => s + l.solde3112, 0);
  const totalReconcilie = reconLignes.reduce((s, l) => s + l.soldeReconcilie, 0);
  const totalEcartRecon = totalReconcilie - totalSolde;

  const totalFarMontant = farLignes.reduce((s, l) => s + l.montant, 0);
  const ecartFar = totalFar408Balance - totalFarMontant;

  const deviseCalcs = deviseLignes.map(d => {
    const valeurInventaire = d.valeurDevise * d.parite3112;
    const perteLatente = Math.max(0, valeurInventaire - d.valeurInitialeFCFA);
    const gainLatent = Math.max(0, d.valeurInitialeFCFA - valeurInventaire);
    return { ...d, valeurInventaire, perteLatente, gainLatent };
  });
  const totalPertesLatentes = deviseCalcs.reduce((s, d) => s + d.perteLatente, 0);
  const totalGainsLatents = deviseCalcs.reduce((s, d) => s + d.gainLatent, 0);

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

  if (totalPertesLatentes > 0.5 && !odEcritures.some(od => od.source === 'Fourn-C5-perte')) {
    suggestions.push({
      compteDebit: '478', libelleDebit: 'Écarts de conversion — Actif',
      compteCredit: '401', libelleCredit: 'Fournisseurs',
      montant: totalPertesLatentes, libelle: 'Constatation pertes de change latentes sur dettes fournisseurs',
      source: 'Fourn-C5-perte',
    });
  }

  if (totalGainsLatents > 0.5 && !odEcritures.some(od => od.source === 'Fourn-C5-gain')) {
    suggestions.push({
      compteDebit: '401', libelleDebit: 'Fournisseurs',
      compteCredit: '479', libelleCredit: 'Écarts de conversion — Passif',
      montant: totalGainsLatents, libelle: 'Constatation gains de change latents sur dettes fournisseurs',
      source: 'Fourn-C5-gain',
    });
  }

  return (
    <div className="revision-kp">
      <div className="revision-section-header">
        <h3>Fournisseurs</h3>
        <button className="revision-save-btn" onClick={handleSave}>
          <LuSave size={14} /> {saved ? 'Sauvegardé' : 'Sauvegarder'}
        </button>
      </div>

      <div className="revision-objectif">
        <strong>Objectif :</strong> S'assurer de l'exhaustivité et de la correcte évaluation des dettes fournisseurs (401), des factures non parvenues (408), des avances versées (4091) et de la correcte conversion des dettes en devises au cours de clôture. Les fournisseurs d'immobilisations relèvent du compte 481, pas du 401.
      </div>

      <div className="revision-travaux">
        <button className="revision-travaux-toggle" onClick={() => setShowTravaux(!showTravaux)}>
          {showTravaux ? <LuChevronDown size={14} /> : <LuChevronRight size={14} />}
          <LuClipboardList size={14} />
          <span>Travaux à effectuer</span>
        </button>
        {showTravaux && (
          <ul className="revision-travaux-list">
            {TRAVAUX_FOURN.map((t, i) => <li key={i}>{t}</li>)}
          </ul>
        )}
      </div>

      <FonctionnementCompte prefixes={['40']} titre="Fournisseurs" />

      {comptes40.length > 0 && reconLignes.length === 0 && (
        <div className="revision-objectif">
          <strong>Information :</strong> La balance contient {comptes40.length} compte{comptes40.length > 1 ? 's' : ''} fournisseurs (40x) pour un solde total de <strong>{fmt(totalFourn40Balance)}</strong>.
          {comptes408.length > 0 && <> Factures non parvenues (408) : <strong>{fmt(totalFar408Balance)}</strong>.</>}
          {comptes409.length > 0 && <> Fournisseurs débiteurs (409) : <strong>{fmt(totalDebiteur409Balance)}</strong>.</>}
          {comptes481.length > 0 && <> Fournisseurs d'investissement (481) : <strong>{fmt(totalSoldeCreditNet(comptes481))}</strong>.</>}
          <br />Complétez les contrôles ci-dessous.
        </div>
      )}

      <Controle1Recon
        reconLignes={reconLignes}
        totalSolde={totalSolde}
        totalReconcilie={totalReconcilie}
        totalEcartRecon={totalEcartRecon}
        addRecon={addRecon}
        updateRecon={updateRecon}
        removeRecon={removeRecon}
      />

      <Controle2Far
        farLignes={farLignes}
        totalFarMontant={totalFarMontant}
        totalFar408Balance={totalFar408Balance}
        ecartFar={ecartFar}
        addFar={addFar}
        updateFar={updateFar}
        removeFar={removeFar}
      />

      <Controle3Debiteurs
        debiteurLignes={debiteurLignes}
        addDebiteur={addDebiteur}
        updateDebiteur={updateDebiteur}
        removeDebiteur={removeDebiteur}
      />

      <Controle4Avances
        avanceLignes={avanceLignes}
        addAvance={addAvance}
        updateAvance={updateAvance}
        removeAvance={removeAvance}
      />

      <Controle5Devises
        deviseLignes={deviseLignes}
        deviseCalcs={deviseCalcs}
        totalPertesLatentes={totalPertesLatentes}
        totalGainsLatents={totalGainsLatents}
        addDevise={addDevise}
        updateDevise={updateDevise}
        removeDevise={removeDevise}
      />

      <Controle6Circu
        circuLignes={circuLignes}
        hasBalance401={comptes401.length > 0}
        addCircu={addCircu}
        autoPopulate={autoPopulateCircu}
        updateCircu={updateCircu}
        removeCircu={removeCircu}
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

export default RevisionFourn;
