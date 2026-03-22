import React, { useState, useEffect } from 'react';
import { LuSave, LuChevronDown, LuChevronRight, LuClipboardList, LuPlus, LuTrash2, LuCheck, LuInfo } from 'react-icons/lu';
import { BalanceLigne } from '../types';
import { ODEcriture, Suggestion, fmt, fmtInput, parseInputValue } from './revisionTypes';
import JournalOD from './JournalOD';
import FonctionnementCompte from './FonctionnementCompte';
import AlertesCompte from './AlertesCompte';

interface RevisionAutresTiersProps {
  balanceN: BalanceLigne[];
  exerciceAnnee: number;
  entiteId: number;
  exerciceId: number;
}

// Controle 1 : CCA (476)
interface CCALigne {
  id: number;
  compte: string;
  designation: string;
  soldeN: number;
  soldeN1: number;
  natureCharge: string;
  periodeCouverte: string;
  justifie: 'Oui' | 'Non';
}

// Controle 2 : PCA (477)
interface PCALigne {
  id: number;
  compte: string;
  designation: string;
  soldeN: number;
  soldeN1: number;
  natureProduit: string;
  periodeCouverte: string;
  justifie: 'Oui' | 'Non';
}

// Controle 3 : Comptes d'attente (471)
interface AttenteLigne {
  id: number;
  compte: string;
  designation: string;
  soldeN: number;
  natureOperation: string;
  regularisationProposee: string;
}

// Controle 4 : Debiteurs et crediteurs divers (46x, 47x hors 471/476/477)
interface DiversLigne {
  id: number;
  compte: string;
  designation: string;
  soldeN: number;
  soldeN1: number;
  variation: number;
  nature: string;
  commentaire: string;
}

// Controle 5 : Ecarts de conversion (478/479)
interface EcartConversionLigne {
  id: number;
  compte: string;
  designation: string;
  soldeN: number;
}

const TRAVAUX_AUTRES_TIERS = [
  'Justifier les soldes des comptes de charges constatees d\'avance (476) a la cloture',
  'Verifier la nature et la periode couverte par chaque CCA',
  'Justifier les soldes des comptes de produits constates d\'avance (477)',
  'Verifier que les comptes d\'attente (471) sont soldes a la cloture',
  'Analyser les debiteurs et crediteurs divers (46x, 47x) et verifier leur recouvrabilite',
  'Verifier les ecarts de conversion actif (478) et passif (479)',
  'S\'assurer que les ecarts de conversion actif sont couverts par une provision pour risque de change',
  'Verifier la contrepassation des CCA et PCA au 01/01/N+1',
];

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

  // --- Helper ---
  const soldeDebit = (l: BalanceLigne): number =>
    (parseFloat(String(l.solde_debiteur)) || 0) - (parseFloat(String(l.solde_crediteur)) || 0);
  const soldeCredit = (l: BalanceLigne): number =>
    (parseFloat(String(l.solde_crediteur)) || 0) - (parseFloat(String(l.solde_debiteur)) || 0);

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

  // Totals
  const totalCCA = comptes476.reduce((s, l) => s + soldeDebit(l), 0);
  const totalPCA = comptes477.reduce((s, l) => s + soldeCredit(l), 0);
  const totalAttente = comptes471.reduce((s, l) => s + soldeDebit(l), 0);
  const totalECA = comptes478.reduce((s, l) => s + soldeDebit(l), 0);
  const totalECP = comptes479.reduce((s, l) => s + soldeCredit(l), 0);

  // --- Chargement / Sauvegarde ---
  useEffect(() => { loadSaved(); }, [entiteId, exerciceId]);

  const loadSaved = (): void => {
    fetch(`/api/revision/${entiteId}/${exerciceId}/autres-tiers`)
      .then(r => { if (r.ok) return r.json(); throw new Error(); })
      .then((data: any) => {
        if (data.ccaLignes?.length > 0) { setCcaLignes(data.ccaLignes); setNextIds(prev => ({ ...prev, cca: Math.max(...data.ccaLignes.map((a: CCALigne) => a.id)) + 1 })); }
        if (data.pcaLignes?.length > 0) { setPcaLignes(data.pcaLignes); setNextIds(prev => ({ ...prev, pca: Math.max(...data.pcaLignes.map((a: PCALigne) => a.id)) + 1 })); }
        if (data.attenteLignes?.length > 0) { setAttenteLignes(data.attenteLignes); setNextIds(prev => ({ ...prev, attente: Math.max(...data.attenteLignes.map((a: AttenteLigne) => a.id)) + 1 })); }
        if (data.diversLignes?.length > 0) { setDiversLignes(data.diversLignes); setNextIds(prev => ({ ...prev, divers: Math.max(...data.diversLignes.map((a: DiversLigne) => a.id)) + 1 })); }
        if (data.ecartLignes?.length > 0) { setEcartLignes(data.ecartLignes); setNextIds(prev => ({ ...prev, ecart: Math.max(...data.ecartLignes.map((a: EcartConversionLigne) => a.id)) + 1 })); }
        if (data.odEcritures?.length > 0) { setOdEcritures(data.odEcritures); setNextOdId(Math.max(...data.odEcritures.map((e: ODEcriture) => e.id)) + 1); }
      })
      .catch(() => {});
  };

  const handleSave = async (): Promise<void> => {
    try {
      await fetch(`/api/revision/${entiteId}/${exerciceId}/autres-tiers`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ccaLignes, pcaLignes, attenteLignes, diversLignes, ecartLignes, odEcritures }),
      });
      setSaved(true);
    } catch { /* silently */ }
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

  // --- Auto-populate PCA from balance ---
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

  // --- Auto-populate Attente from balance ---
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

  // --- Auto-populate Divers from balance ---
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

  // --- Auto-populate Ecarts de conversion from balance ---
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

  // --- CRUD CCA ---
  const addCca = (): void => { setCcaLignes(prev => [...prev, { id: nextIds.cca, compte: '476', designation: '', soldeN: 0, soldeN1: 0, natureCharge: '', periodeCouverte: '', justifie: 'Non' }]); setNextIds(prev => ({ ...prev, cca: prev.cca + 1 })); setSaved(false); };
  const updateCca = (id: number, field: keyof CCALigne, value: string | number): void => { setCcaLignes(prev => prev.map(l => l.id === id ? { ...l, [field]: value } : l)); setSaved(false); };
  const removeCca = (id: number): void => { setCcaLignes(prev => prev.filter(l => l.id !== id)); setSaved(false); };

  // --- CRUD PCA ---
  const addPca = (): void => { setPcaLignes(prev => [...prev, { id: nextIds.pca, compte: '477', designation: '', soldeN: 0, soldeN1: 0, natureProduit: '', periodeCouverte: '', justifie: 'Non' }]); setNextIds(prev => ({ ...prev, pca: prev.pca + 1 })); setSaved(false); };
  const updatePca = (id: number, field: keyof PCALigne, value: string | number): void => { setPcaLignes(prev => prev.map(l => l.id === id ? { ...l, [field]: value } : l)); setSaved(false); };
  const removePca = (id: number): void => { setPcaLignes(prev => prev.filter(l => l.id !== id)); setSaved(false); };

  // --- CRUD Attente ---
  const addAttente = (): void => { setAttenteLignes(prev => [...prev, { id: nextIds.attente, compte: '471', designation: '', soldeN: 0, natureOperation: '', regularisationProposee: '' }]); setNextIds(prev => ({ ...prev, attente: prev.attente + 1 })); setSaved(false); };
  const updateAttente = (id: number, field: keyof AttenteLigne, value: string | number): void => { setAttenteLignes(prev => prev.map(l => l.id === id ? { ...l, [field]: value } : l)); setSaved(false); };
  const removeAttente = (id: number): void => { setAttenteLignes(prev => prev.filter(l => l.id !== id)); setSaved(false); };

  // --- CRUD Divers ---
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

  // --- CRUD Ecarts ---
  const addEcart = (): void => { setEcartLignes(prev => [...prev, { id: nextIds.ecart, compte: '', designation: '', soldeN: 0 }]); setNextIds(prev => ({ ...prev, ecart: prev.ecart + 1 })); setSaved(false); };
  const updateEcart = (id: number, field: keyof EcartConversionLigne, value: string | number): void => { setEcartLignes(prev => prev.map(l => l.id === id ? { ...l, [field]: value } : l)); setSaved(false); };
  const removeEcart = (id: number): void => { setEcartLignes(prev => prev.filter(l => l.id !== id)); setSaved(false); };

  // --- Alertes ---
  // CCA crediteur = anomalie
  const ccaCrediteurAlerts = ccaLignes.filter(l => l.soldeN < 0);
  // CCA N >> N-1 significativement
  const ccaHausseAlerts = ccaLignes.filter(l => l.soldeN1 > 0 && l.soldeN > l.soldeN1 * 1.5);
  // PCA debiteur = anomalie
  const pcaDebiteurAlerts = pcaLignes.filter(l => l.soldeN < 0);
  // Comptes d'attente non soldes
  const attenteNonSoldes = attenteLignes.filter(l => Math.abs(l.soldeN) > 0.5);
  // Divers avec solde ancien sans mouvement
  const diversAnciensAlerts = diversLignes.filter(l => Math.abs(l.soldeN) > 0.5 && Math.abs(l.variation) < 0.5 && Math.abs(l.soldeN1) > 0.5);
  // Divers debiteurs avec solde significatif
  const diversDebiteursSignificatifs = diversLignes.filter(l => l.soldeN > 100000);
  // ECA sans provision
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

  // Suggestion : CCA - ecriture de constatation type
  if (ccaLignes.length > 0) {
    const totalCcaN = ccaLignes.reduce((s, l) => s + Math.max(0, l.soldeN), 0);
    if (totalCcaN > 0.5) {
      const dejaPropose = odEcritures.some(od => od.source === 'AutresTiers-C1-CCA');
      if (!dejaPropose) {
        suggestions.push({
          compteDebit: '476', libelleDebit: 'Charges constatees d\'avance',
          compteCredit: '6xx', libelleCredit: 'Charges (loyer, assurance, maintenance...)',
          montant: totalCcaN, libelle: `Constatation CCA au 31/12/${exerciceAnnee} (D 476 / C 6xx)`,
          source: 'AutresTiers-C1-CCA',
        });
      }
    }
  }

  // Suggestion : PCA - ecriture de constatation type
  if (pcaLignes.length > 0) {
    const totalPcaN = pcaLignes.reduce((s, l) => s + Math.max(0, l.soldeN), 0);
    if (totalPcaN > 0.5) {
      const dejaPropose = odEcritures.some(od => od.source === 'AutresTiers-C2-PCA');
      if (!dejaPropose) {
        suggestions.push({
          compteDebit: '7xx', libelleDebit: 'Produits (ventes, prestations...)',
          compteCredit: '477', libelleCredit: 'Produits constates d\'avance',
          montant: totalPcaN, libelle: `Constatation PCA au 31/12/${exerciceAnnee} (D 7xx / C 477)`,
          source: 'AutresTiers-C2-PCA',
        });
      }
    }
  }

  // Suggestion : Comptes d'attente a solder
  if (attenteNonSoldes.length > 0) {
    attenteNonSoldes.forEach(l => {
      const dejaPropose = odEcritures.some(od => od.source === `AutresTiers-C3-${l.compte}`);
      if (!dejaPropose) {
        if (l.soldeN > 0) {
          suggestions.push({
            compteDebit: 'xxx', libelleDebit: 'Compte de reclassement (a preciser)',
            compteCredit: l.compte, libelleCredit: l.designation || 'Compte d\'attente',
            montant: Math.abs(l.soldeN), libelle: `Reclassement compte d'attente ${l.compte} (solde debiteur a apurer)`,
            source: `AutresTiers-C3-${l.compte}`,
          });
        } else {
          suggestions.push({
            compteDebit: l.compte, libelleDebit: l.designation || 'Compte d\'attente',
            compteCredit: 'xxx', libelleCredit: 'Compte de reclassement (a preciser)',
            montant: Math.abs(l.soldeN), libelle: `Reclassement compte d'attente ${l.compte} (solde crediteur a apurer)`,
            source: `AutresTiers-C3-${l.compte}`,
          });
        }
      }
    });
  }

  // Suggestion : ECA (478) sans provision pour risque de change
  if (ecaLignes478.length > 0) {
    const totalEcaSolde = ecaLignes478.reduce((s, l) => s + l.soldeN, 0);
    if (totalEcaSolde > 0.5) {
      const dejaPropose = odEcritures.some(od => od.source === 'AutresTiers-C5-ECA');
      if (!dejaPropose) {
        suggestions.push({
          compteDebit: '6591', libelleDebit: 'Charges provisionnees - risques de change',
          compteCredit: '4991', libelleCredit: 'Provision pour risque de change',
          montant: totalEcaSolde, libelle: `Provision pour risque de change sur ECA (478) au 31/12/${exerciceAnnee}`,
          source: 'AutresTiers-C5-ECA',
        });
      }
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

      <AlertesCompte lignes={balanceN} titre="Autres tiers" />

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

      {/* ========== Controle 1 : CCA (476) ========== */}
      <div className="revision-control">
        <div className="revision-control-title" onClick={() => toggleControl(1)} style={{ cursor: 'pointer' }}>
          <span>Controle 1 — Charges constatees d'avance (476)</span>
          {ccaLignes.length > 0 && ccaCrediteurAlerts.length === 0 && ccaLignes.every(l => l.justifie === 'Oui')
            ? <span className="revision-badge ok"><LuCheck size={12} /> Conforme</span>
            : ccaLignes.length > 0
              ? <span className="revision-badge ko"><LuInfo size={12} /> A verifier</span>
              : null
          }
          {openControls[1] ? <LuChevronRight size={14} /> : <LuChevronDown size={14} />}
        </div>
        {openControls[1] && (
          <>
            <div className="revision-ref">Constatation : D 476 / C 6xx — Contrepassation 01/01/N+1 : D 6xx / C 476</div>

            {ccaCrediteurAlerts.length > 0 && (
              <div className="revision-alert rouge">
                <LuInfo size={14} /> <strong>Anomalie :</strong> Les CCA suivants ont un solde crediteur (anormal, doit etre debiteur) : {ccaCrediteurAlerts.map(l => l.compte).join(', ')}
              </div>
            )}
            {ccaHausseAlerts.length > 0 && (
              <div className="revision-alert orange">
                <LuInfo size={14} /> <strong>Attention :</strong> Hausse significative des CCA par rapport a N-1 : {ccaHausseAlerts.map(l => `${l.compte} (N: ${fmt(l.soldeN)}, N-1: ${fmt(l.soldeN1)})`).join(', ')}
              </div>
            )}

            <div className="revision-table-wrapper" style={{ marginTop: 8 }}>
              <table className="revision-table">
                <thead>
                  <tr>
                    <th style={{ width: 80 }}>Compte</th>
                    <th>Designation</th>
                    <th className="num" style={{ width: 110 }}>Solde N</th>
                    <th className="num" style={{ width: 110 }}>Solde N-1</th>
                    <th className="editable-col" style={{ width: 140 }}>Nature charge</th>
                    <th className="editable-col" style={{ width: 130 }}>Periode couverte</th>
                    <th style={{ width: 70 }}>Justifie</th>
                    <th style={{ width: 30 }}></th>
                  </tr>
                </thead>
                <tbody>
                  {ccaLignes.map(l => (
                    <tr key={l.id} className={l.soldeN < 0 ? 'ecart-row' : ''}>
                      <td className="editable-cell"><input type="text" value={l.compte} onChange={e => updateCca(l.id, 'compte', e.target.value)} style={{ maxWidth: 'none', fontFamily: 'monospace' }} /></td>
                      <td className="editable-cell"><input type="text" value={l.designation} onChange={e => updateCca(l.id, 'designation', e.target.value)} style={{ maxWidth: 'none' }} /></td>
                      <td className="editable-cell"><input type="text" inputMode="numeric" value={fmtInput(l.soldeN)} onChange={e => updateCca(l.id, 'soldeN', parseInputValue(e.target.value))} style={{ maxWidth: 'none' }} /></td>
                      <td className="editable-cell"><input type="text" inputMode="numeric" value={fmtInput(l.soldeN1)} onChange={e => updateCca(l.id, 'soldeN1', parseInputValue(e.target.value))} style={{ maxWidth: 'none' }} /></td>
                      <td className="editable-cell"><input type="text" value={l.natureCharge} onChange={e => updateCca(l.id, 'natureCharge', e.target.value)} style={{ maxWidth: 'none', fontSize: '11px' }} placeholder="Loyer, assurance, maintenance..." /></td>
                      <td className="editable-cell"><input type="text" value={l.periodeCouverte} onChange={e => updateCca(l.id, 'periodeCouverte', e.target.value)} style={{ maxWidth: 'none', fontSize: '11px' }} placeholder="01/01-31/03/N+1" /></td>
                      <td>
                        <select value={l.justifie} onChange={e => updateCca(l.id, 'justifie', e.target.value)} style={{ padding: '3px 4px', borderRadius: 4, border: '1px solid #ddd', width: '100%', fontSize: '11.5px' }}>
                          <option value="Oui">Oui</option>
                          <option value="Non">Non</option>
                        </select>
                      </td>
                      <td><button className="revision-od-delete" onClick={() => removeCca(l.id)} title="Supprimer"><LuTrash2 size={13} /></button></td>
                    </tr>
                  ))}
                  {ccaLignes.length === 0 && (
                    <tr><td colSpan={8} style={{ textAlign: 'center', color: '#999', padding: 16, fontStyle: 'italic' }}>Aucun CCA (476) en balance. Ajoutez une ligne si necessaire.</td></tr>
                  )}
                </tbody>
                {ccaLignes.length > 0 && (
                  <tfoot>
                    <tr>
                      <td colSpan={2}><strong>Total</strong></td>
                      <td className="num"><strong>{fmt(ccaLignes.reduce((s, l) => s + l.soldeN, 0))}</strong></td>
                      <td className="num"><strong>{fmt(ccaLignes.reduce((s, l) => s + l.soldeN1, 0))}</strong></td>
                      <td colSpan={4}></td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
            <div className="revision-od-actions">
              <button className="revision-od-add" onClick={addCca}><LuPlus size={13} /> Ajouter un CCA</button>
            </div>
          </>
        )}
      </div>

      {/* ========== Controle 2 : PCA (477) ========== */}
      <div className="revision-control">
        <div className="revision-control-title" onClick={() => toggleControl(2)} style={{ cursor: 'pointer' }}>
          <span>Controle 2 — Produits constates d'avance (477)</span>
          {pcaLignes.length > 0 && pcaDebiteurAlerts.length === 0 && pcaLignes.every(l => l.justifie === 'Oui')
            ? <span className="revision-badge ok"><LuCheck size={12} /> Conforme</span>
            : pcaLignes.length > 0
              ? <span className="revision-badge ko"><LuInfo size={12} /> A verifier</span>
              : null
          }
          {openControls[2] ? <LuChevronRight size={14} /> : <LuChevronDown size={14} />}
        </div>
        {openControls[2] && (
          <>
            <div className="revision-ref">Constatation : D 7xx / C 477 — Contrepassation 01/01/N+1 : D 477 / C 7xx</div>

            {pcaDebiteurAlerts.length > 0 && (
              <div className="revision-alert rouge">
                <LuInfo size={14} /> <strong>Anomalie :</strong> Les PCA suivants ont un solde debiteur (anormal, doit etre crediteur) : {pcaDebiteurAlerts.map(l => l.compte).join(', ')}
              </div>
            )}

            <div className="revision-table-wrapper" style={{ marginTop: 8 }}>
              <table className="revision-table">
                <thead>
                  <tr>
                    <th style={{ width: 80 }}>Compte</th>
                    <th>Designation</th>
                    <th className="num" style={{ width: 110 }}>Solde N</th>
                    <th className="num" style={{ width: 110 }}>Solde N-1</th>
                    <th className="editable-col" style={{ width: 140 }}>Nature produit</th>
                    <th className="editable-col" style={{ width: 130 }}>Periode couverte</th>
                    <th style={{ width: 70 }}>Justifie</th>
                    <th style={{ width: 30 }}></th>
                  </tr>
                </thead>
                <tbody>
                  {pcaLignes.map(l => (
                    <tr key={l.id} className={l.soldeN < 0 ? 'ecart-row' : ''}>
                      <td className="editable-cell"><input type="text" value={l.compte} onChange={e => updatePca(l.id, 'compte', e.target.value)} style={{ maxWidth: 'none', fontFamily: 'monospace' }} /></td>
                      <td className="editable-cell"><input type="text" value={l.designation} onChange={e => updatePca(l.id, 'designation', e.target.value)} style={{ maxWidth: 'none' }} /></td>
                      <td className="editable-cell"><input type="text" inputMode="numeric" value={fmtInput(l.soldeN)} onChange={e => updatePca(l.id, 'soldeN', parseInputValue(e.target.value))} style={{ maxWidth: 'none' }} /></td>
                      <td className="editable-cell"><input type="text" inputMode="numeric" value={fmtInput(l.soldeN1)} onChange={e => updatePca(l.id, 'soldeN1', parseInputValue(e.target.value))} style={{ maxWidth: 'none' }} /></td>
                      <td className="editable-cell"><input type="text" value={l.natureProduit} onChange={e => updatePca(l.id, 'natureProduit', e.target.value)} style={{ maxWidth: 'none', fontSize: '11px' }} placeholder="Abonnement, loyer percu..." /></td>
                      <td className="editable-cell"><input type="text" value={l.periodeCouverte} onChange={e => updatePca(l.id, 'periodeCouverte', e.target.value)} style={{ maxWidth: 'none', fontSize: '11px' }} placeholder="01/01-31/03/N+1" /></td>
                      <td>
                        <select value={l.justifie} onChange={e => updatePca(l.id, 'justifie', e.target.value)} style={{ padding: '3px 4px', borderRadius: 4, border: '1px solid #ddd', width: '100%', fontSize: '11.5px' }}>
                          <option value="Oui">Oui</option>
                          <option value="Non">Non</option>
                        </select>
                      </td>
                      <td><button className="revision-od-delete" onClick={() => removePca(l.id)} title="Supprimer"><LuTrash2 size={13} /></button></td>
                    </tr>
                  ))}
                  {pcaLignes.length === 0 && (
                    <tr><td colSpan={8} style={{ textAlign: 'center', color: '#999', padding: 16, fontStyle: 'italic' }}>Aucun PCA (477) en balance. Ajoutez une ligne si necessaire.</td></tr>
                  )}
                </tbody>
                {pcaLignes.length > 0 && (
                  <tfoot>
                    <tr>
                      <td colSpan={2}><strong>Total</strong></td>
                      <td className="num"><strong>{fmt(pcaLignes.reduce((s, l) => s + l.soldeN, 0))}</strong></td>
                      <td className="num"><strong>{fmt(pcaLignes.reduce((s, l) => s + l.soldeN1, 0))}</strong></td>
                      <td colSpan={4}></td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
            <div className="revision-od-actions">
              <button className="revision-od-add" onClick={addPca}><LuPlus size={13} /> Ajouter un PCA</button>
            </div>
          </>
        )}
      </div>

      {/* ========== Controle 3 : Comptes d'attente (471) ========== */}
      <div className="revision-control">
        <div className="revision-control-title" onClick={() => toggleControl(3)} style={{ cursor: 'pointer' }}>
          <span>Controle 3 — Comptes d'attente (471)</span>
          {attenteLignes.length > 0 && attenteNonSoldes.length === 0
            ? <span className="revision-badge ok"><LuCheck size={12} /> Tous soldes</span>
            : attenteNonSoldes.length > 0
              ? <span className="revision-badge ko" style={{ background: '#fee2e2', color: '#dc2626' }}><LuInfo size={12} /> Non soldes !</span>
              : null
          }
          {openControls[3] ? <LuChevronRight size={14} /> : <LuChevronDown size={14} />}
        </div>
        {openControls[3] && (
          <>
            <div className="revision-ref">Les comptes d'attente (471) doivent imperativement etre soldes a la cloture de l'exercice</div>

            {attenteNonSoldes.length > 0 && (
              <div className="revision-alert rouge" style={{ background: '#fee2e2', border: '1px solid #fca5a5', color: '#991b1b', padding: '10px 14px', borderRadius: 6, marginTop: 8, fontSize: '12.5px' }}>
                <LuInfo size={14} /> <strong>ALERTE :</strong> Les comptes d'attente doivent etre soldes a la cloture. {attenteNonSoldes.length} compte{attenteNonSoldes.length > 1 ? 's' : ''} non solde{attenteNonSoldes.length > 1 ? 's' : ''} : {attenteNonSoldes.map(l => `${l.compte} (${fmt(l.soldeN)})`).join(', ')}
              </div>
            )}

            <div className="revision-table-wrapper" style={{ marginTop: 8 }}>
              <table className="revision-table">
                <thead>
                  <tr>
                    <th style={{ width: 80 }}>Compte</th>
                    <th>Designation</th>
                    <th className="num" style={{ width: 120 }}>Solde N</th>
                    <th className="editable-col" style={{ width: 180 }}>Nature operation</th>
                    <th className="editable-col" style={{ width: 200 }}>Regularisation proposee</th>
                    <th style={{ width: 30 }}></th>
                  </tr>
                </thead>
                <tbody>
                  {attenteLignes.map(l => (
                    <tr key={l.id} className={Math.abs(l.soldeN) > 0.5 ? 'ecart-row' : ''}>
                      <td className="editable-cell"><input type="text" value={l.compte} onChange={e => updateAttente(l.id, 'compte', e.target.value)} style={{ maxWidth: 'none', fontFamily: 'monospace' }} /></td>
                      <td className="editable-cell"><input type="text" value={l.designation} onChange={e => updateAttente(l.id, 'designation', e.target.value)} style={{ maxWidth: 'none' }} /></td>
                      <td className={`editable-cell ${Math.abs(l.soldeN) > 0.5 ? 'ecart-val' : 'ok-val'}`}><input type="text" inputMode="numeric" value={fmtInput(l.soldeN)} onChange={e => updateAttente(l.id, 'soldeN', parseInputValue(e.target.value))} style={{ maxWidth: 'none' }} /></td>
                      <td className="editable-cell"><input type="text" value={l.natureOperation} onChange={e => updateAttente(l.id, 'natureOperation', e.target.value)} style={{ maxWidth: 'none', fontSize: '11px' }} placeholder="Virement en attente, cheque non identifie..." /></td>
                      <td className="editable-cell"><input type="text" value={l.regularisationProposee} onChange={e => updateAttente(l.id, 'regularisationProposee', e.target.value)} style={{ maxWidth: 'none', fontSize: '11px' }} placeholder="Reclasser vers compte xxx..." /></td>
                      <td><button className="revision-od-delete" onClick={() => removeAttente(l.id)} title="Supprimer"><LuTrash2 size={13} /></button></td>
                    </tr>
                  ))}
                  {attenteLignes.length === 0 && (
                    <tr><td colSpan={6} style={{ textAlign: 'center', color: '#999', padding: 16, fontStyle: 'italic' }}>Aucun compte d'attente (471) en balance.</td></tr>
                  )}
                </tbody>
                {attenteLignes.length > 0 && (
                  <tfoot>
                    <tr>
                      <td colSpan={2}><strong>Total</strong></td>
                      <td className={`num ${Math.abs(attenteLignes.reduce((s, l) => s + l.soldeN, 0)) > 0.5 ? 'ecart-val' : 'ok-val'}`}><strong>{fmt(attenteLignes.reduce((s, l) => s + l.soldeN, 0))}</strong></td>
                      <td colSpan={3}></td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
            <div className="revision-od-actions">
              <button className="revision-od-add" onClick={addAttente}><LuPlus size={13} /> Ajouter un compte d'attente</button>
            </div>
          </>
        )}
      </div>

      {/* ========== Controle 4 : Debiteurs et crediteurs divers (46x, 47x hors 471/476/477/478/479) ========== */}
      <div className="revision-control">
        <div className="revision-control-title" onClick={() => toggleControl(4)} style={{ cursor: 'pointer' }}>
          <span>Controle 4 — Debiteurs et crediteurs divers (46x, 47x)</span>
          {diversLignes.length > 0 && diversAnciensAlerts.length === 0 && diversDebiteursSignificatifs.length === 0
            ? <span className="revision-badge ok"><LuCheck size={12} /> Conforme</span>
            : diversLignes.length > 0
              ? <span className="revision-badge ko"><LuInfo size={12} /> A verifier</span>
              : null
          }
          {openControls[4] ? <LuChevronRight size={14} /> : <LuChevronDown size={14} />}
        </div>
        {openControls[4] && (
          <>
            <div className="revision-ref">Comptes 46x et 47x (hors 471, 476, 477, 478, 479)</div>

            {diversAnciensAlerts.length > 0 && (
              <div className="revision-alert orange">
                <LuInfo size={14} /> <strong>Attention :</strong> Soldes anciens sans mouvement : {diversAnciensAlerts.map(l => `${l.compte} (${fmt(l.soldeN)})`).join(', ')}. Verifier si ces soldes sont encore justifies.
              </div>
            )}
            {diversDebiteursSignificatifs.length > 0 && (
              <div className="revision-alert orange">
                <LuInfo size={14} /> <strong>Attention :</strong> Debiteurs divers avec solde significatif : {diversDebiteursSignificatifs.map(l => `${l.compte} (${fmt(l.soldeN)})`).join(', ')}. Verifier la recouvrabilite.
              </div>
            )}

            <div className="revision-table-wrapper" style={{ marginTop: 8 }}>
              <table className="revision-table">
                <thead>
                  <tr>
                    <th style={{ width: 80 }}>Compte</th>
                    <th>Designation</th>
                    <th className="num" style={{ width: 110 }}>Solde N</th>
                    <th className="num" style={{ width: 110 }}>Solde N-1</th>
                    <th className="num" style={{ width: 100 }}>Variation</th>
                    <th className="editable-col" style={{ width: 130 }}>Nature</th>
                    <th className="editable-col" style={{ width: 150 }}>Commentaire</th>
                    <th style={{ width: 30 }}></th>
                  </tr>
                </thead>
                <tbody>
                  {diversLignes.map(l => {
                    const isAncien = Math.abs(l.soldeN) > 0.5 && Math.abs(l.variation) < 0.5 && Math.abs(l.soldeN1) > 0.5;
                    return (
                      <tr key={l.id} className={isAncien ? 'ecart-row' : ''}>
                        <td className="editable-cell"><input type="text" value={l.compte} onChange={e => updateDivers(l.id, 'compte', e.target.value)} style={{ maxWidth: 'none', fontFamily: 'monospace' }} /></td>
                        <td className="editable-cell"><input type="text" value={l.designation} onChange={e => updateDivers(l.id, 'designation', e.target.value)} style={{ maxWidth: 'none' }} /></td>
                        <td className="editable-cell"><input type="text" inputMode="numeric" value={fmtInput(l.soldeN)} onChange={e => updateDivers(l.id, 'soldeN', parseInputValue(e.target.value))} style={{ maxWidth: 'none' }} /></td>
                        <td className="editable-cell"><input type="text" inputMode="numeric" value={fmtInput(l.soldeN1)} onChange={e => updateDivers(l.id, 'soldeN1', parseInputValue(e.target.value))} style={{ maxWidth: 'none' }} /></td>
                        <td className={`num ${Math.abs(l.variation) > 0.5 ? '' : 'ok-val'}`}>{fmt(l.variation)}</td>
                        <td className="editable-cell"><input type="text" value={l.nature} onChange={e => updateDivers(l.id, 'nature', e.target.value)} style={{ maxWidth: 'none', fontSize: '11px' }} placeholder="Pret, caution, acompte..." /></td>
                        <td className="editable-cell"><input type="text" value={l.commentaire} onChange={e => updateDivers(l.id, 'commentaire', e.target.value)} style={{ maxWidth: 'none', fontSize: '11px' }} placeholder="RAS / A regulariser..." /></td>
                        <td><button className="revision-od-delete" onClick={() => removeDivers(l.id)} title="Supprimer"><LuTrash2 size={13} /></button></td>
                      </tr>
                    );
                  })}
                  {diversLignes.length === 0 && (
                    <tr><td colSpan={8} style={{ textAlign: 'center', color: '#999', padding: 16, fontStyle: 'italic' }}>Aucun debiteur/crediteur divers en balance.</td></tr>
                  )}
                </tbody>
                {diversLignes.length > 0 && (
                  <tfoot>
                    <tr>
                      <td colSpan={2}><strong>Total</strong></td>
                      <td className="num"><strong>{fmt(diversLignes.reduce((s, l) => s + l.soldeN, 0))}</strong></td>
                      <td className="num"><strong>{fmt(diversLignes.reduce((s, l) => s + l.soldeN1, 0))}</strong></td>
                      <td className="num"><strong>{fmt(diversLignes.reduce((s, l) => s + l.variation, 0))}</strong></td>
                      <td colSpan={3}></td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
            <div className="revision-od-actions">
              <button className="revision-od-add" onClick={addDivers}><LuPlus size={13} /> Ajouter un compte divers</button>
            </div>
          </>
        )}
      </div>

      {/* ========== Controle 5 : Ecarts de conversion (478/479) ========== */}
      <div className="revision-control">
        <div className="revision-control-title" onClick={() => toggleControl(5)} style={{ cursor: 'pointer' }}>
          <span>Controle 5 — Ecarts de conversion (478 / 479)</span>
          {ecartLignes.length > 0 && ecaLignes478.filter(l => l.soldeN > 0.5).length === 0
            ? <span className="revision-badge ok"><LuCheck size={12} /> Conforme</span>
            : ecaLignes478.filter(l => l.soldeN > 0.5).length > 0
              ? <span className="revision-badge ko"><LuInfo size={12} /> Provision requise</span>
              : null
          }
          {openControls[5] ? <LuChevronRight size={14} /> : <LuChevronDown size={14} />}
        </div>
        {openControls[5] && (
          <>
            <div className="revision-ref">ECA (478) = perte latente de change (actif) — ECP (479) = gain latent de change (passif). Provision obligatoire sur ECA : D 6591 / C 4991</div>

            {ecaLignes478.filter(l => l.soldeN > 0.5).length > 0 && (
              <div className="revision-alert rouge" style={{ background: '#fee2e2', border: '1px solid #fca5a5', color: '#991b1b', padding: '10px 14px', borderRadius: 6, marginTop: 8, fontSize: '12.5px' }}>
                <LuInfo size={14} /> <strong>ALERTE :</strong> Ecart de conversion — Actif (478) detecte pour un montant de <strong>{fmt(ecaLignes478.reduce((s, l) => s + l.soldeN, 0))}</strong>. Une provision pour risque de change (D 6591 / C 4991) est obligatoire.
              </div>
            )}

            <div className="revision-table-wrapper" style={{ marginTop: 8 }}>
              <table className="revision-table">
                <thead>
                  <tr>
                    <th style={{ width: 80 }}>Compte</th>
                    <th>Designation</th>
                    <th className="num" style={{ width: 130 }}>Solde N</th>
                    <th style={{ width: 30 }}></th>
                  </tr>
                </thead>
                <tbody>
                  {ecartLignes.map(l => (
                    <tr key={l.id} className={l.compte.startsWith('478') && l.soldeN > 0.5 ? 'ecart-row' : ''}>
                      <td className="editable-cell"><input type="text" value={l.compte} onChange={e => updateEcart(l.id, 'compte', e.target.value)} style={{ maxWidth: 'none', fontFamily: 'monospace' }} /></td>
                      <td className="editable-cell"><input type="text" value={l.designation} onChange={e => updateEcart(l.id, 'designation', e.target.value)} style={{ maxWidth: 'none' }} /></td>
                      <td className="editable-cell"><input type="text" inputMode="numeric" value={fmtInput(l.soldeN)} onChange={e => updateEcart(l.id, 'soldeN', parseInputValue(e.target.value))} style={{ maxWidth: 'none' }} /></td>
                      <td><button className="revision-od-delete" onClick={() => removeEcart(l.id)} title="Supprimer"><LuTrash2 size={13} /></button></td>
                    </tr>
                  ))}
                  {ecartLignes.length === 0 && (
                    <tr><td colSpan={4} style={{ textAlign: 'center', color: '#999', padding: 16, fontStyle: 'italic' }}>Aucun ecart de conversion (478/479) en balance.</td></tr>
                  )}
                </tbody>
                {ecartLignes.length > 0 && (
                  <tfoot>
                    <tr>
                      <td colSpan={2}><strong>Total</strong></td>
                      <td className="num"><strong>{fmt(ecartLignes.reduce((s, l) => s + l.soldeN, 0))}</strong></td>
                      <td></td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
            <div className="revision-od-actions">
              <button className="revision-od-add" onClick={addEcart}><LuPlus size={13} /> Ajouter un ecart de conversion</button>
            </div>
          </>
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

export default RevisionAutresTiers;
