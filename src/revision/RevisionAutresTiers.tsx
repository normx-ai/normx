import { clientFetch } from '../lib/api';
import { api } from '../lib/apiEndpoints';
import React, { useState, useEffect } from 'react';
import { LuSave, LuChevronDown, LuChevronRight, LuClipboardList } from 'react-icons/lu';
import { BalanceLigne } from '../types';
import {
  ODEcriture, Suggestion, fmt, soldeNet, soldeCreditNet,
  CCALigne, PCALigne, AttenteLigne, DiversLigne, EcartConversionLigne,
  TRAVAUX_AUTRES_TIERS,
} from './revisionTypes';
import JournalOD from './JournalOD';
import FonctionnementCompte from './FonctionnementCompte';
import { Controle1CCA } from './autresTiers/Controle1CCA';
import { Controle2PCA } from './autresTiers/Controle2PCA';
import { Controle3Attente } from './autresTiers/Controle3Attente';
import { Controle4Divers } from './autresTiers/Controle4Divers';
import { Controle5Ecarts } from './autresTiers/Controle5Ecarts';

interface RevisionAutresTiersProps {
  balanceN: BalanceLigne[];
  exerciceAnnee: number;
  entiteId: number;
  exerciceId: number;
}

function RevisionAutresTiers({ balanceN, exerciceAnnee, entiteId, exerciceId }: RevisionAutresTiersProps): React.ReactElement {
  const [ccaLignes, setCcaLignes] = useState<CCALigne[]>([]);
  const [pcaLignes, setPcaLignes] = useState<PCALigne[]>([]);
  const [attenteLignes, setAttenteLignes] = useState<AttenteLigne[]>([]);
  const [diversLignes, setDiversLignes] = useState<DiversLigne[]>([]);
  const [ecartLignes, setEcartLignes] = useState<EcartConversionLigne[]>([]);
  const [nextIds, setNextIds] = useState({ cca: 1, pca: 1, attente: 1, divers: 1, ecart: 1 });
  const [saved, setSaved] = useState(false);
  const [odEcritures, setOdEcritures] = useState<ODEcriture[]>([]);
  const [nextOdId, setNextOdId] = useState(1);
  const [showTravaux, setShowTravaux] = useState(true);
  const [openControls, setOpenControls] = useState<Record<number, boolean>>({ 1: true, 2: true, 3: true, 4: true, 5: true });

  const toggleControl = (n: number): void => {
    setOpenControls(prev => ({ ...prev, [n]: !prev[n] }));
  };

  // --- Helper (utilise valeurs revisees avec fallback) ---
  const soldeDebit = soldeNet;
  const soldeCredit = soldeCreditNet;

  // --- Comptes balance ---
  const comptes476 = balanceN.filter(l => l.numero_compte.startsWith('476'));
  const comptes477 = balanceN.filter(l => l.numero_compte.startsWith('477'));
  const comptes471 = balanceN.filter(l => l.numero_compte.startsWith('471'));
  const comptesDivers = balanceN.filter(l => {
    const c = l.numero_compte;
    return (c.startsWith('46') || c.startsWith('47')) &&
      !c.startsWith('471') &&
      !c.startsWith('476') &&
      !c.startsWith('477') &&
      !c.startsWith('478') &&
      !c.startsWith('479');
  });
  const comptes478 = balanceN.filter(l => l.numero_compte.startsWith('478'));
  const comptes479 = balanceN.filter(l => l.numero_compte.startsWith('479'));

  const totalCCA = comptes476.reduce((s, l) => s + soldeDebit(l), 0);
  const totalPCA = comptes477.reduce((s, l) => s + soldeCredit(l), 0);
  const totalAttente = comptes471.reduce((s, l) => s + soldeDebit(l), 0);
  const totalECA = comptes478.reduce((s, l) => s + soldeDebit(l), 0);
  const totalECP = comptes479.reduce((s, l) => s + soldeCredit(l), 0);

  useEffect(() => { loadSaved(); }, [entiteId, exerciceId]);

  const loadSaved = (): void => {
    clientFetch(api.revision.onglet(entiteId, exerciceId, 'autres-tiers'))
      .then(r => { if (r.ok) return r.json(); throw new Error(); })
      .then((data: { ccaLignes?: CCALigne[]; pcaLignes?: PCALigne[]; attenteLignes?: AttenteLigne[]; diversLignes?: DiversLigne[]; ecartLignes?: EcartConversionLigne[]; odEcritures?: ODEcriture[] }) => {
        if (data.ccaLignes) { setCcaLignes(data.ccaLignes); if (data.ccaLignes.length > 0) setNextIds(prev => ({ ...prev, cca: Math.max(...data.ccaLignes!.map((a: CCALigne) => a.id)) + 1 })); }
        if (data.pcaLignes) { setPcaLignes(data.pcaLignes); if (data.pcaLignes.length > 0) setNextIds(prev => ({ ...prev, pca: Math.max(...data.pcaLignes!.map((a: PCALigne) => a.id)) + 1 })); }
        if (data.attenteLignes) { setAttenteLignes(data.attenteLignes); if (data.attenteLignes.length > 0) setNextIds(prev => ({ ...prev, attente: Math.max(...data.attenteLignes!.map((a: AttenteLigne) => a.id)) + 1 })); }
        if (data.diversLignes) { setDiversLignes(data.diversLignes); if (data.diversLignes.length > 0) setNextIds(prev => ({ ...prev, divers: Math.max(...data.diversLignes!.map((a: DiversLigne) => a.id)) + 1 })); }
        if (data.ecartLignes) { setEcartLignes(data.ecartLignes); if (data.ecartLignes.length > 0) setNextIds(prev => ({ ...prev, ecart: Math.max(...data.ecartLignes!.map((a: EcartConversionLigne) => a.id)) + 1 })); }
        if (data.odEcritures) { setOdEcritures(data.odEcritures); if (data.odEcritures.length > 0) setNextOdId(Math.max(...data.odEcritures.map((e: ODEcriture) => e.id)) + 1); }
      })
      .catch(() => {});
  };

  const handleSave = async (): Promise<void> => {
    try {
      const res = await clientFetch(api.revision.onglet(entiteId, exerciceId, 'autres-tiers'), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ccaLignes, pcaLignes, attenteLignes, diversLignes, ecartLignes, odEcritures }),
      });
      if (!res.ok) throw new Error('Erreur sauvegarde');
      setSaved(true);
    } catch {
      setSaved(false);
      alert('Erreur lors de la sauvegarde. Reessayez.');
    }
  };

  // --- Auto-populate CCA from balance ---
  useEffect(() => {
    if (ccaLignes.length === 0 && comptes476.length > 0) {
      const lignes: CCALigne[] = [];
      let idCounter = 1;
      comptes476.forEach(c => {
        const sN = soldeDebit(c);
        const sN1 = (parseFloat(String(c.si_debit)) || 0) - (parseFloat(String(c.si_credit)) || 0);
        lignes.push({ id: idCounter++, compte: c.numero_compte, designation: c.libelle_compte, soldeN: sN, soldeN1: sN1, natureCharge: '', periodeCouverte: '', justifie: 'Non' });
      });
      if (lignes.length > 0) {
        setCcaLignes(lignes);
        setNextIds(prev => ({ ...prev, cca: idCounter }));
      }
    }
  }, [balanceN]);

  useEffect(() => {
    if (pcaLignes.length === 0 && comptes477.length > 0) {
      const lignes: PCALigne[] = [];
      let idCounter = 1;
      comptes477.forEach(c => {
        const sN = soldeCredit(c);
        const sN1 = (parseFloat(String(c.si_credit)) || 0) - (parseFloat(String(c.si_debit)) || 0);
        lignes.push({ id: idCounter++, compte: c.numero_compte, designation: c.libelle_compte, soldeN: sN, soldeN1: sN1, natureProduit: '', periodeCouverte: '', justifie: 'Non' });
      });
      if (lignes.length > 0) {
        setPcaLignes(lignes);
        setNextIds(prev => ({ ...prev, pca: idCounter }));
      }
    }
  }, [balanceN]);

  useEffect(() => {
    if (attenteLignes.length === 0 && comptes471.length > 0) {
      const lignes: AttenteLigne[] = [];
      let idCounter = 1;
      comptes471.forEach(c => {
        const sN = soldeDebit(c);
        lignes.push({ id: idCounter++, compte: c.numero_compte, designation: c.libelle_compte, soldeN: sN, natureOperation: '', regularisationProposee: '' });
      });
      if (lignes.length > 0) {
        setAttenteLignes(lignes);
        setNextIds(prev => ({ ...prev, attente: idCounter }));
      }
    }
  }, [balanceN]);

  useEffect(() => {
    if (diversLignes.length === 0 && comptesDivers.length > 0) {
      const lignes: DiversLigne[] = [];
      let idCounter = 1;
      comptesDivers.forEach(c => {
        const sN = soldeDebit(c);
        const sN1 = (parseFloat(String(c.si_credit)) || 0) - (parseFloat(String(c.si_debit)) || 0);
        const variation = sN - sN1;
        lignes.push({ id: idCounter++, compte: c.numero_compte, designation: c.libelle_compte, soldeN: sN, soldeN1: sN1, variation, nature: '', commentaire: '' });
      });
      if (lignes.length > 0) {
        setDiversLignes(lignes);
        setNextIds(prev => ({ ...prev, divers: idCounter }));
      }
    }
  }, [balanceN]);

  useEffect(() => {
    if (ecartLignes.length === 0 && (comptes478.length > 0 || comptes479.length > 0)) {
      const lignes: EcartConversionLigne[] = [];
      let idCounter = 1;
      comptes478.forEach(c => {
        lignes.push({ id: idCounter++, compte: c.numero_compte, designation: c.libelle_compte, soldeN: soldeDebit(c) });
      });
      comptes479.forEach(c => {
        lignes.push({ id: idCounter++, compte: c.numero_compte, designation: c.libelle_compte, soldeN: soldeCredit(c) });
      });
      if (lignes.length > 0) {
        setEcartLignes(lignes);
        setNextIds(prev => ({ ...prev, ecart: idCounter }));
      }
    }
  }, [balanceN]);

  // --- CRUD CCA / PCA / Attente / Divers / Ecart ---
  const addCca = (): void => { setCcaLignes(prev => [...prev, { id: nextIds.cca, compte: '476', designation: '', soldeN: 0, soldeN1: 0, natureCharge: '', periodeCouverte: '', justifie: 'Non' }]); setNextIds(prev => ({ ...prev, cca: prev.cca + 1 })); setSaved(false); };
  const updateCca = (id: number, field: keyof CCALigne, value: string | number): void => { setCcaLignes(prev => prev.map(l => l.id === id ? { ...l, [field]: value } : l)); setSaved(false); };
  const removeCca = (id: number): void => { setCcaLignes(prev => prev.filter(l => l.id !== id)); setSaved(false); };

  const addPca = (): void => { setPcaLignes(prev => [...prev, { id: nextIds.pca, compte: '477', designation: '', soldeN: 0, soldeN1: 0, natureProduit: '', periodeCouverte: '', justifie: 'Non' }]); setNextIds(prev => ({ ...prev, pca: prev.pca + 1 })); setSaved(false); };
  const updatePca = (id: number, field: keyof PCALigne, value: string | number): void => { setPcaLignes(prev => prev.map(l => l.id === id ? { ...l, [field]: value } : l)); setSaved(false); };
  const removePca = (id: number): void => { setPcaLignes(prev => prev.filter(l => l.id !== id)); setSaved(false); };

  const addAttente = (): void => { setAttenteLignes(prev => [...prev, { id: nextIds.attente, compte: '471', designation: '', soldeN: 0, natureOperation: '', regularisationProposee: '' }]); setNextIds(prev => ({ ...prev, attente: prev.attente + 1 })); setSaved(false); };
  const updateAttente = (id: number, field: keyof AttenteLigne, value: string | number): void => { setAttenteLignes(prev => prev.map(l => l.id === id ? { ...l, [field]: value } : l)); setSaved(false); };
  const removeAttente = (id: number): void => { setAttenteLignes(prev => prev.filter(l => l.id !== id)); setSaved(false); };

  const addDivers = (): void => { setDiversLignes(prev => [...prev, { id: nextIds.divers, compte: '', designation: '', soldeN: 0, soldeN1: 0, variation: 0, nature: '', commentaire: '' }]); setNextIds(prev => ({ ...prev, divers: prev.divers + 1 })); setSaved(false); };
  const updateDivers = (id: number, field: keyof DiversLigne, value: string | number): void => {
    setDiversLignes(prev => prev.map(l => {
      if (l.id !== id) return l;
      const updated = { ...l, [field]: value };
      updated.variation = updated.soldeN - updated.soldeN1;
      return updated;
    }));
    setSaved(false);
  };
  const removeDivers = (id: number): void => { setDiversLignes(prev => prev.filter(l => l.id !== id)); setSaved(false); };

  const addEcart = (): void => { setEcartLignes(prev => [...prev, { id: nextIds.ecart, compte: '', designation: '', soldeN: 0 }]); setNextIds(prev => ({ ...prev, ecart: prev.ecart + 1 })); setSaved(false); };
  const updateEcart = (id: number, field: keyof EcartConversionLigne, value: string | number): void => { setEcartLignes(prev => prev.map(l => l.id === id ? { ...l, [field]: value } : l)); setSaved(false); };
  const removeEcart = (id: number): void => { setEcartLignes(prev => prev.filter(l => l.id !== id)); setSaved(false); };

  // --- Alertes ---
  const ccaCrediteurAlerts = ccaLignes.filter(l => l.soldeN < 0);
  const ccaHausseAlerts = ccaLignes.filter(l => l.soldeN1 > 0 && l.soldeN > l.soldeN1 * 1.5);
  const pcaDebiteurAlerts = pcaLignes.filter(l => l.soldeN < 0);
  const attenteNonSoldes = attenteLignes.filter(l => Math.abs(l.soldeN) > 0.5);
  const diversAnciensAlerts = diversLignes.filter(l => Math.abs(l.soldeN) > 0.5 && Math.abs(l.variation) < 0.5 && Math.abs(l.soldeN1) > 0.5);
  const diversDebiteursSignificatifs = diversLignes.filter(l => l.soldeN > 100000);
  const ecaLignes478 = ecartLignes.filter(l => l.compte.startsWith('478'));

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

  if (ccaLignes.length > 0) {
    const totalCcaN = ccaLignes.reduce((s, l) => s + Math.max(0, l.soldeN), 0);
    if (totalCcaN > 0.5 && !odEcritures.some(od => od.source === 'AutresTiers-C1-CCA')) {
      suggestions.push({
        compteDebit: '476', libelleDebit: "Charges constatees d'avance",
        compteCredit: '6xx', libelleCredit: 'Charges (loyer, assurance, maintenance...)',
        montant: totalCcaN, libelle: `Constatation CCA au 31/12/${exerciceAnnee} (D 476 / C 6xx)`,
        source: 'AutresTiers-C1-CCA',
      });
    }
  }

  if (pcaLignes.length > 0) {
    const totalPcaN = pcaLignes.reduce((s, l) => s + Math.max(0, l.soldeN), 0);
    if (totalPcaN > 0.5 && !odEcritures.some(od => od.source === 'AutresTiers-C2-PCA')) {
      suggestions.push({
        compteDebit: '7xx', libelleDebit: 'Produits (ventes, prestations...)',
        compteCredit: '477', libelleCredit: "Produits constates d'avance",
        montant: totalPcaN, libelle: `Constatation PCA au 31/12/${exerciceAnnee} (D 7xx / C 477)`,
        source: 'AutresTiers-C2-PCA',
      });
    }
  }

  if (attenteNonSoldes.length > 0) {
    attenteNonSoldes.forEach(l => {
      const src = `AutresTiers-C3-${l.compte}`;
      if (odEcritures.some(od => od.source === src)) return;
      if (l.soldeN > 0) {
        suggestions.push({
          compteDebit: 'xxx', libelleDebit: 'Compte de reclassement (a preciser)',
          compteCredit: l.compte, libelleCredit: l.designation || "Compte d'attente",
          montant: Math.abs(l.soldeN), libelle: `Reclassement compte d'attente ${l.compte} (solde debiteur a apurer)`,
          source: src,
        });
      } else {
        suggestions.push({
          compteDebit: l.compte, libelleDebit: l.designation || "Compte d'attente",
          compteCredit: 'xxx', libelleCredit: 'Compte de reclassement (a preciser)',
          montant: Math.abs(l.soldeN), libelle: `Reclassement compte d'attente ${l.compte} (solde crediteur a apurer)`,
          source: src,
        });
      }
    });
  }

  if (ecaLignes478.length > 0) {
    const totalEcaSolde = ecaLignes478.reduce((s, l) => s + l.soldeN, 0);
    if (totalEcaSolde > 0.5 && !odEcritures.some(od => od.source === 'AutresTiers-C5-ECA')) {
      suggestions.push({
        compteDebit: '6591', libelleDebit: 'Charges provisionnees - risques de change',
        compteCredit: '4991', libelleCredit: 'Provision pour risque de change',
        montant: totalEcaSolde, libelle: `Provision pour risque de change sur ECA (478) au 31/12/${exerciceAnnee}`,
        source: 'AutresTiers-C5-ECA',
      });
    }
  }

  return (
    <div className="revision-kp">
      <div className="revision-section-header">
        <h3>Autres Tiers (CCA, PCA, Comptes d'attente)</h3>
        <button className="revision-save-btn" onClick={handleSave}>
          <LuSave size={14} /> {saved ? 'Sauvegarde' : 'Sauvegarder'}
        </button>
      </div>

      <div className="revision-objectif">
        <strong>Objectif :</strong> S'assurer de la realite, de l'exhaustivite et de la correcte evaluation des charges et produits constates d'avance (476, 477), de l'apurement des comptes d'attente (471), de la justification des debiteurs et crediteurs divers (46x, 47x) et du traitement correct des ecarts de conversion (478, 479).
      </div>

      <div className="revision-travaux">
        <button className="revision-travaux-toggle" onClick={() => setShowTravaux(!showTravaux)}>
          {showTravaux ? <LuChevronDown size={14} /> : <LuChevronRight size={14} />}
          <LuClipboardList size={14} />
          <span>Travaux a effectuer</span>
        </button>
        {showTravaux && (
          <ul className="revision-travaux-list">
            {TRAVAUX_AUTRES_TIERS.map((t, i) => <li key={i}>{t}</li>)}
          </ul>
        )}
      </div>

      <FonctionnementCompte prefixes={['45','46','47','48']} titre="Autres tiers" />

      {/* Information generale */}
      {(comptes476.length > 0 || comptes477.length > 0 || comptes471.length > 0 || comptesDivers.length > 0 || comptes478.length > 0 || comptes479.length > 0) && (
        <div className="revision-objectif">
          <strong>Information :</strong> La balance contient :
          {comptes476.length > 0 && <> CCA (476) : <strong>{fmt(totalCCA)}</strong>.</>}
          {comptes477.length > 0 && <> PCA (477) : <strong>{fmt(totalPCA)}</strong>.</>}
          {comptes471.length > 0 && <> Comptes d'attente (471) : <strong>{fmt(totalAttente)}</strong>.</>}
          {comptesDivers.length > 0 && <> Divers (46x/47x) : <strong>{comptesDivers.length} compte{comptesDivers.length > 1 ? 's' : ''}</strong>.</>}
          {comptes478.length > 0 && <> ECA (478) : <strong>{fmt(totalECA)}</strong>.</>}
          {comptes479.length > 0 && <> ECP (479) : <strong>{fmt(totalECP)}</strong>.</>}
          <br />Completez les controles ci-dessous.
        </div>
      )}

      <Controle1CCA
        ccaLignes={ccaLignes}
        ccaCrediteurAlerts={ccaCrediteurAlerts}
        ccaHausseAlerts={ccaHausseAlerts}
        isOpen={openControls[1]}
        toggle={() => toggleControl(1)}
        addCca={addCca}
        updateCca={updateCca}
        removeCca={removeCca}
      />

      <Controle2PCA
        pcaLignes={pcaLignes}
        pcaDebiteurAlerts={pcaDebiteurAlerts}
        isOpen={openControls[2]}
        toggle={() => toggleControl(2)}
        addPca={addPca}
        updatePca={updatePca}
        removePca={removePca}
      />

      <Controle3Attente
        attenteLignes={attenteLignes}
        attenteNonSoldes={attenteNonSoldes}
        isOpen={openControls[3]}
        toggle={() => toggleControl(3)}
        addAttente={addAttente}
        updateAttente={updateAttente}
        removeAttente={removeAttente}
      />

      <Controle4Divers
        diversLignes={diversLignes}
        diversAnciensAlerts={diversAnciensAlerts}
        diversDebiteursSignificatifs={diversDebiteursSignificatifs}
        isOpen={openControls[4]}
        toggle={() => toggleControl(4)}
        addDivers={addDivers}
        updateDivers={updateDivers}
        removeDivers={removeDivers}
      />

      <Controle5Ecarts
        ecartLignes={ecartLignes}
        ecaLignes478={ecaLignes478}
        isOpen={openControls[5]}
        toggle={() => toggleControl(5)}
        addEcart={addEcart}
        updateEcart={updateEcart}
        removeEcart={removeEcart}
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

export default RevisionAutresTiers;
