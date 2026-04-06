import React, { useState, useEffect } from 'react';
import { LuSave, LuChevronDown, LuChevronRight, LuClipboardList } from 'react-icons/lu';
import { BalanceLigne } from '../types';
import {
  ODEcriture, Suggestion, fmt,
  RecouvLigne, CreanceDouteuseLigne, DeprecVarLigne,
  CreanceDeviseLigne, CircularClientLigne, ProdRecevoirLigne,
  getSD, getSC, soldeNet, soldeCreditNet, totalSoldeNet, totalSoldeCreditNet,
} from './revisionTypes';
import JournalOD from './JournalOD';
import FonctionnementCompte from './FonctionnementCompte';
import RevisionClientsTable from './RevisionClientsTable';

interface RevisionClientsProps {
  balanceN: BalanceLigne[];
  exerciceAnnee: number;
  entiteId: number;
  exerciceId: number;
}

const TRAVAUX_CLIENTS = [
  'Rapprocher les données commerciales des données comptables',
  'Éditer la balance auxiliaire clients et la rapprocher à la comptabilité générale',
  'Éditer la balance âgée clients (analyser encours à 90 et 180 jours, vérifier le provisionnement)',
  'Détail des produits à recevoir / factures à établir et justifications',
  'Détail des avoirs à établir et justifications',
  'Détail des créances douteuses et de la dépréciation pour créances douteuses',
  'Justifier les soldes des comptes clients à la clôture',
  'Vérifier la séparation des exercices (journaux ventes décembre N et janvier N+1)',
  'Préparer les lettres de circularisation avec les CAC',
];

function RevisionClients({ balanceN, exerciceAnnee, entiteId, exerciceId }: RevisionClientsProps): React.ReactElement {
  const [recouvLignes, setRecouvLignes] = useState<RecouvLigne[]>([]);
  const [douteuseLignes, setDouteuseLignes] = useState<CreanceDouteuseLigne[]>([]);
  const [deprecEdit, setDeprecEdit] = useState<Record<string, { soldeN1: number; dotations: number; reprises: number }>>({});
  const [deviseLignes, setDeviseLignes] = useState<CreanceDeviseLigne[]>([]);
  const [circularLignes, setCircularLignes] = useState<CircularClientLigne[]>([]);
  const [prodRecevoirEdit, setProdRecevoirEdit] = useState<Record<string, { commentaire: string }>>({});
  const [nextIds, setNextIds] = useState({ recouv: 1, dout: 1, dev: 1, circ: 1 });
  const [saved, setSaved] = useState(false);
  const [odEcritures, setOdEcritures] = useState<ODEcriture[]>([]);
  const [nextOdId, setNextOdId] = useState(1);
  const [showTravaux, setShowTravaux] = useState(true);

  // Comptes en balance
  const comptes41 = balanceN.filter(l => l.numero_compte.startsWith('41'));
  const comptes411 = balanceN.filter(l => l.numero_compte.startsWith('411'));
  const comptes416 = balanceN.filter(l => l.numero_compte.startsWith('416'));
  const comptes491 = balanceN.filter(l => l.numero_compte.startsWith('491'));
  const comptes4181 = balanceN.filter(l => l.numero_compte.startsWith('4181'));
  const comptes4191 = balanceN.filter(l => l.numero_compte.startsWith('4191'));
  const comptes418 = balanceN.filter(l => l.numero_compte.startsWith('418'));

  const totalClient41Balance = totalSoldeNet(comptes41);
  const totalDeprec491Balance = totalSoldeCreditNet(comptes491);

  useEffect(() => { loadSaved(); }, [entiteId, exerciceId]);

  const loadSaved = (): void => {
    fetch(`/api/revision/${entiteId}/${exerciceId}/clients`)
      .then(r => { if (r.ok) return r.json(); throw new Error(); })
      .then((data: { recouvLignes?: RecouvLigne[]; douteuseLignes?: CreanceDouteuseLigne[]; deprecEdit?: Record<string, { soldeN1: number; dotations: number; reprises: number }>; deviseLignes?: CreanceDeviseLigne[]; circularLignes?: CircularClientLigne[]; prodRecevoirEdit?: Record<string, { commentaire: string }>; odEcritures?: ODEcriture[] }) => {
        if (data.recouvLignes) { setRecouvLignes(data.recouvLignes); if (data.recouvLignes.length > 0) setNextIds(prev => ({ ...prev, recouv: Math.max(...data.recouvLignes!.map((a: RecouvLigne) => a.id)) + 1 })); }
        if (data.douteuseLignes) { setDouteuseLignes(data.douteuseLignes); if (data.douteuseLignes.length > 0) setNextIds(prev => ({ ...prev, dout: Math.max(...data.douteuseLignes!.map((a: CreanceDouteuseLigne) => a.id)) + 1 })); }
        if (data.deprecEdit) setDeprecEdit(data.deprecEdit);
        if (data.deviseLignes) { setDeviseLignes(data.deviseLignes); if (data.deviseLignes.length > 0) setNextIds(prev => ({ ...prev, dev: Math.max(...data.deviseLignes!.map((a: CreanceDeviseLigne) => a.id)) + 1 })); }
        if (data.circularLignes) { setCircularLignes(data.circularLignes); if (data.circularLignes.length > 0) setNextIds(prev => ({ ...prev, circ: Math.max(...data.circularLignes!.map((a: CircularClientLigne) => a.id)) + 1 })); }
        if (data.prodRecevoirEdit) setProdRecevoirEdit(data.prodRecevoirEdit);
        if (data.odEcritures) { setOdEcritures(data.odEcritures); if (data.odEcritures.length > 0) setNextOdId(Math.max(...data.odEcritures.map((e: ODEcriture) => e.id)) + 1); }
      })
      .catch(() => {});
  };

  const handleSave = async (): Promise<void> => {
    try {
      const res = await fetch(`/api/revision/${entiteId}/${exerciceId}/clients`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recouvLignes, douteuseLignes, deprecEdit, deviseLignes, circularLignes, prodRecevoirEdit, odEcritures }),
      });
      if (!res.ok) throw new Error('Erreur sauvegarde');
      setSaved(true);
    } catch {
      setSaved(false);
      alert('Erreur lors de la sauvegarde. Reessayez.');
    }
  };

  // --- CRUD ---
  const addRecouv = (): void => { setRecouvLignes(prev => [...prev, { id: nextIds.recouv, codeClient: '', nomClient: '', balanceAux: 0, montantReconnu: 0, reconnaissanceSignee: 'Non' }]); setNextIds(prev => ({ ...prev, recouv: prev.recouv + 1 })); setSaved(false); };
  const updateRecouv = (id: number, field: keyof RecouvLigne, value: string | number): void => { setRecouvLignes(prev => prev.map(l => l.id === id ? { ...l, [field]: value } : l)); setSaved(false); };
  const removeRecouv = (id: number): void => { setRecouvLignes(prev => prev.filter(l => l.id !== id)); setSaved(false); };

  const addDouteuse = (): void => { setDouteuseLignes(prev => [...prev, { id: nextIds.dout, codeClient: '', nomClient: '', soldeN1Creance: 0, nouvellesCreances: 0, paiements: 0, soldeN1Deprec: 0, dotations: 0, reprises: 0 }]); setNextIds(prev => ({ ...prev, dout: prev.dout + 1 })); setSaved(false); };
  const updateDouteuse = (id: number, field: keyof CreanceDouteuseLigne, value: string | number): void => { setDouteuseLignes(prev => prev.map(l => l.id === id ? { ...l, [field]: value } : l)); setSaved(false); };
  const removeDouteuse = (id: number): void => { setDouteuseLignes(prev => prev.filter(l => l.id !== id)); setSaved(false); };

  const addDevise = (): void => { setDeviseLignes(prev => [...prev, { id: nextIds.dev, codeClient: '', nomClient: '', monnaie: 'USD', valeurDevise: 0, valeurInitialeFCFA: 0, parite3112: 0 }]); setNextIds(prev => ({ ...prev, dev: prev.dev + 1 })); setSaved(false); };
  const updateDevise = (id: number, field: keyof CreanceDeviseLigne, value: string | number): void => { setDeviseLignes(prev => prev.map(l => l.id === id ? { ...l, [field]: value } : l)); setSaved(false); };
  const removeDevise = (id: number): void => { setDeviseLignes(prev => prev.filter(l => l.id !== id)); setSaved(false); };

  const addCircular = (): void => { setCircularLignes(prev => [...prev, { id: nextIds.circ, codeClient: '', nomClient: '', balanceAux: 0, montantReconnu: 0, reconnaissanceSignee: 'Non', commentaire: '' }]); setNextIds(prev => ({ ...prev, circ: prev.circ + 1 })); setSaved(false); };
  const autoPopulateCircular = (): void => {
    if (comptes411.length === 0) return;
    let idCounter = nextIds.circ;
    const newLignes: CircularClientLigne[] = comptes411.map(l => {
      const solde = soldeNet(l);
      const ligne: CircularClientLigne = { id: idCounter, codeClient: l.numero_compte, nomClient: l.libelle_compte, balanceAux: solde, montantReconnu: 0, reconnaissanceSignee: 'Non', commentaire: '' };
      idCounter++;
      return ligne;
    });
    setCircularLignes(prev => [...prev, ...newLignes]);
    setNextIds(prev => ({ ...prev, circ: idCounter }));
    setSaved(false);
  };
  const updateCircular = (id: number, field: keyof CircularClientLigne, value: string | number): void => { setCircularLignes(prev => prev.map(l => l.id === id ? { ...l, [field]: value } : l)); setSaved(false); };
  const removeCircular = (id: number): void => { setCircularLignes(prev => prev.filter(l => l.id !== id)); setSaved(false); };

  // --- Calculs ---
  const totalBalAux = recouvLignes.reduce((s, l) => s + l.balanceAux, 0);
  const totalReconnu = recouvLignes.reduce((s, l) => s + l.montantReconnu, 0);
  const totalEcartRecouv = totalReconnu - totalBalAux;

  const douteuseCalcs = douteuseLignes.map(d => {
    const soldeNCreance = d.soldeN1Creance + d.nouvellesCreances - d.paiements;
    const soldeNDeprec = d.soldeN1Deprec + d.dotations - d.reprises;
    return { ...d, soldeNCreance, soldeNDeprec };
  });

  const deprecVarLignes: DeprecVarLigne[] = comptes491.map(l => {
    const soldeN = soldeCreditNet(l);
    const soldeN1Auto = (parseFloat(String(l.si_credit)) || 0) - (parseFloat(String(l.si_debit)) || 0);
    const edit = deprecEdit[l.numero_compte];
    const soldeN1 = edit?.soldeN1 ?? soldeN1Auto;
    const dotations = edit?.dotations ?? 0;
    const reprises = edit?.reprises ?? 0;
    return { compte: l.numero_compte, libelle: l.libelle_compte, soldeN1, dotations6594: dotations, reprises7594: reprises, soldeNCalc: soldeN1 + dotations - reprises, soldeNBalance: soldeN };
  });

  const totalDeprecN1 = deprecVarLignes.reduce((s, l) => s + l.soldeN1, 0);
  const totalDeprecDot = deprecVarLignes.reduce((s, l) => s + l.dotations6594, 0);
  const totalDeprecRep = deprecVarLignes.reduce((s, l) => s + l.reprises7594, 0);
  const totalDeprecCalc = deprecVarLignes.reduce((s, l) => s + l.soldeNCalc, 0);
  const totalDeprecBal = deprecVarLignes.reduce((s, l) => s + l.soldeNBalance, 0);
  const totalDeprecEcart = totalDeprecBal - totalDeprecCalc;

  const deviseCalcs = deviseLignes.map(d => {
    const valeurInventaire = d.valeurDevise * d.parite3112;
    const perteLatente = Math.max(0, d.valeurInitialeFCFA - valeurInventaire);
    const gainLatent = Math.max(0, valeurInventaire - d.valeurInitialeFCFA);
    return { ...d, valeurInventaire, perteLatente, gainLatent };
  });
  const totalPertesLatentes = deviseCalcs.reduce((s, d) => s + d.perteLatente, 0);
  const totalGainsLatents = deviseCalcs.reduce((s, d) => s + d.gainLatent, 0);

  const totalCircBalAux = circularLignes.reduce((s, l) => s + l.balanceAux, 0);
  const totalCircReconnu = circularLignes.reduce((s, l) => s + l.montantReconnu, 0);
  const totalCircEcart = totalCircReconnu - totalCircBalAux;
  const circularHasEcart = circularLignes.some(l => Math.abs(l.montantReconnu - l.balanceAux) > 0.5);

  const prodRecevoirLignes: ProdRecevoirLigne[] = comptes418.map(l => {
    const soldeN = soldeNet(l);
    const soldeN1 = (parseFloat(String(l.si_debit)) || 0) - (parseFloat(String(l.si_credit)) || 0);
    const edit = prodRecevoirEdit[l.numero_compte];
    return { compte: l.numero_compte, designation: l.libelle_compte, soldeN, soldeN1, commentaire: edit?.commentaire ?? '' };
  });
  const totalProdRecN = prodRecevoirLignes.reduce((s, l) => s + l.soldeN, 0);
  const totalProdRecN1 = prodRecevoirLignes.reduce((s, l) => s + l.soldeN1, 0);
  const totalProdRecVar = totalProdRecN - totalProdRecN1;
  const prodRecevoirSignificantAndIncreasing = totalProdRecN > 0.5 && totalProdRecVar > 0.5;

  // --- Journal OD ---
  const addOdEcriture = (source?: string, compteDebit?: string, compteCredit?: string, montant?: number, libelle?: string): void => {
    const newOd: ODEcriture = { id: nextOdId, date: `${exerciceAnnee}-12-31`, compteDebit: compteDebit || '', libelleDebit: '', compteCredit: compteCredit || '', libelleCredit: '', montant: montant || 0, libelle: libelle || '', source: source || 'Manuel' };
    setOdEcritures(prev => [...prev, newOd]);
    setNextOdId(prev => prev + 1);
    setSaved(false);
  };
  const updateOd = (id: number, field: keyof ODEcriture, value: string | number): void => { setOdEcritures(prev => prev.map(e => e.id === id ? { ...e, [field]: value } : e)); setSaved(false); };
  const removeOd = (id: number): void => { setOdEcritures(prev => prev.filter(e => e.id !== id)); setSaved(false); };

  // --- Suggestions ---
  const suggestions: Suggestion[] = [];
  if (deprecVarLignes.length > 0 && Math.abs(totalDeprecEcart) > 0.5) {
    if (!odEcritures.some(od => od.source === 'Clients-C3')) {
      if (totalDeprecEcart > 0) {
        suggestions.push({ compteDebit: '6594', libelleDebit: 'Charges provisionnées sur créances', compteCredit: '491', libelleCredit: 'Dépréciations comptes clients', montant: totalDeprecEcart, libelle: 'Complément de dépréciation créances clients', source: 'Clients-C3' });
      } else {
        suggestions.push({ compteDebit: '491', libelleDebit: 'Dépréciations comptes clients', compteCredit: '7594', libelleCredit: 'Reprises charges provisionnées sur créances', montant: Math.abs(totalDeprecEcart), libelle: 'Reprise de dépréciation excédentaire', source: 'Clients-C3' });
      }
    }
  }
  if (totalPertesLatentes > 0.5) {
    if (!odEcritures.some(od => od.source === 'Clients-C4-perte')) {
      suggestions.push({ compteDebit: '478', libelleDebit: 'Écarts de conversion — Actif', compteCredit: '411', libelleCredit: 'Clients', montant: totalPertesLatentes, libelle: 'Pertes de change latentes sur créances clients', source: 'Clients-C4-perte' });
    }
  }
  if (totalGainsLatents > 0.5) {
    if (!odEcritures.some(od => od.source === 'Clients-C4-gain')) {
      suggestions.push({ compteDebit: '411', libelleDebit: 'Clients', compteCredit: '479', libelleCredit: 'Écarts de conversion — Passif', montant: totalGainsLatents, libelle: 'Gains de change latents sur créances clients', source: 'Clients-C4-gain' });
    }
  }
  if (prodRecevoirSignificantAndIncreasing) {
    if (!odEcritures.some(od => od.source === 'Clients-C6')) {
      suggestions.push({ compteDebit: '4181', libelleDebit: 'Clients — Factures à établir', compteCredit: '70', libelleCredit: 'Ventes de marchandises / produits', montant: totalProdRecVar, libelle: 'Produits à recevoir — factures à établir', source: 'Clients-C6' });
    }
  }

  // Deprec edit handler for table
  const handleUpdateDeprecEdit = (compte: string, field: 'soldeN1' | 'dotations' | 'reprises', value: number, currentSoldeN1: number): void => {
    setDeprecEdit(prev => ({
      ...prev,
      [compte]: {
        soldeN1: field === 'soldeN1' ? value : (prev[compte]?.soldeN1 ?? currentSoldeN1),
        dotations: field === 'dotations' ? value : (prev[compte]?.dotations ?? 0),
        reprises: field === 'reprises' ? value : (prev[compte]?.reprises ?? 0),
      },
    }));
    setSaved(false);
  };

  return (
    <div className="revision-kp">
      <div className="revision-section-header">
        <h3>Clients</h3>
        <button className="revision-save-btn" onClick={handleSave}>
          <LuSave size={14} /> {saved ? 'Sauvegardé' : 'Sauvegarder'}
        </button>
      </div>

      <div className="revision-objectif">
        <strong>Objectif :</strong> S'assurer de l'exhaustivité, de la réalité et de la correcte évaluation des créances clients (411), du bon reclassement des créances douteuses (416), de l'adéquation des dépréciations (D 6594 / C 491) et de la correcte conversion des créances en devises.
      </div>

      <div className="revision-travaux">
        <button className="revision-travaux-toggle" onClick={() => setShowTravaux(!showTravaux)}>
          {showTravaux ? <LuChevronDown size={14} /> : <LuChevronRight size={14} />}
          <LuClipboardList size={14} />
          <span>Travaux à effectuer</span>
        </button>
        {showTravaux && (
          <ul className="revision-travaux-list">
            {TRAVAUX_CLIENTS.map((t, i) => <li key={i}>{t}</li>)}
          </ul>
        )}
      </div>

      <FonctionnementCompte prefixes={['41','49']} titre="Clients" />

      {comptes41.length > 0 && recouvLignes.length === 0 && (
        <div className="revision-objectif">
          <strong>Information :</strong> La balance contient {comptes41.length} compte{comptes41.length > 1 ? 's' : ''} clients (41x) pour un solde net de <strong>{fmt(totalClient41Balance)}</strong>.
          {comptes416.length > 0 && <> Créances douteuses (416) : <strong>{fmt(totalSoldeNet(comptes416))}</strong>.</>}
          {comptes491.length > 0 && <> Dépréciations (491) : <strong>{fmt(totalDeprec491Balance)}</strong>.</>}
          {comptes4181.length > 0 && <> Factures à établir (4181) : <strong>{fmt(totalSoldeNet(comptes4181))}</strong>.</>}
          {comptes4191.length > 0 && <> Avances reçues (4191) : <strong>{fmt(totalSoldeCreditNet(comptes4191))}</strong>.</>}
          <br />Complétez les contrôles ci-dessous.
        </div>
      )}

      <RevisionClientsTable
        recouvLignes={recouvLignes} onAddRecouv={addRecouv} onUpdateRecouv={updateRecouv} onRemoveRecouv={removeRecouv}
        totalBalAux={totalBalAux} totalReconnu={totalReconnu} totalEcartRecouv={totalEcartRecouv}
        douteuseCalcs={douteuseCalcs} douteuseLignes={douteuseLignes}
        onAddDouteuse={addDouteuse} onUpdateDouteuse={updateDouteuse} onRemoveDouteuse={removeDouteuse}
        deprecVarLignes={deprecVarLignes}
        totalDeprecN1={totalDeprecN1} totalDeprecDot={totalDeprecDot} totalDeprecRep={totalDeprecRep}
        totalDeprecCalc={totalDeprecCalc} totalDeprecBal={totalDeprecBal} totalDeprecEcart={totalDeprecEcart}
        onUpdateDeprecEdit={handleUpdateDeprecEdit}
        deviseCalcs={deviseCalcs} deviseLignes={deviseLignes}
        onAddDevise={addDevise} onUpdateDevise={updateDevise} onRemoveDevise={removeDevise}
        totalPertesLatentes={totalPertesLatentes} totalGainsLatents={totalGainsLatents}
        circularLignes={circularLignes} onAddCircular={addCircular} onAutoPopulateCircular={autoPopulateCircular}
        onUpdateCircular={updateCircular} onRemoveCircular={removeCircular}
        totalCircBalAux={totalCircBalAux} totalCircReconnu={totalCircReconnu} totalCircEcart={totalCircEcart}
        circularHasEcart={circularHasEcart} comptes411Length={comptes411.length}
        prodRecevoirLignes={prodRecevoirLignes}
        totalProdRecN={totalProdRecN} totalProdRecN1={totalProdRecN1} totalProdRecVar={totalProdRecVar}
        prodRecevoirSignificantAndIncreasing={prodRecevoirSignificantAndIncreasing}
        onUpdateProdRecevoirComment={(compte, commentaire) => setProdRecevoirEdit(prev => ({ ...prev, [compte]: { commentaire } }))}
        onMarkUnsaved={() => setSaved(false)}
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

export default RevisionClients;
