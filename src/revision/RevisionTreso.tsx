import React, { useState, useEffect } from 'react';
import { LuSave, LuChevronDown, LuChevronRight, LuClipboardList, LuPlus, LuTrash2 } from 'react-icons/lu';
import { BalanceLigne } from '../types';
import { ODEcriture, Suggestion, fmt, fmtInput, parseInputValue } from './revisionTypes';
import JournalOD from './JournalOD';
import FonctionnementCompte from './FonctionnementCompte';

interface RevisionTresoProps {
  balanceN: BalanceLigne[];
  exerciceAnnee: number;
  entiteId: number;
  exerciceId: number;
}

// Contrôle 1 : Rapprochement bancaire
interface RapprochBancaireLigne {
  id: number;
  banque: string;
  compteBanque: string;
  soldeCompta: number;
  soldeReleve: number;
  chequesNonEncaisses: number;
  virEmisNonDebites: number;
  soldeReconcilie: number;
  ecart: number;
}

// Contrôle 2 : Contrôle de caisse
interface CaisseLigne {
  id: number;
  compte: string;
  designation: string;
  soldeCompta: number;
  pvCaisse: number;
  ecart: number;
}

// Contrôle 3 : Titres de placement et dépréciations
interface TitrePlacementLigne {
  id: number;
  designation: string;
  compte: string;
  valeurAcquisition: number;
  valeurInventaire: number;
  depreciationNecessaire: number;
  depreciationBalance: number;
  ecartDeprec: number;
}

// Contrôle 4 : Virements internes (auto)
interface VirementInterneLigne {
  compte: string;
  libelle: string;
  soldeN: number;
  observation: string;
}

// Contrôle 5 : Disponibilités en devises
interface DispoDeviseLigne {
  id: number;
  banque: string;
  devise: string;
  soldeDevise: number;
  coursHistorique: number;
  valeurHistorique: number;
  coursCloture: number;
  valeurCloture: number;
  ecartChange: number;
}

// Contrôle 6 : Circularisation bancaire
interface CircularisationLigne {
  id: number;
  banque: string;
  soldeCompte: number;
  soldeConfirme: number;
  ecart: number;
  empruntsConfirmes: string;
  cautions: string;
  signatairesAutorises: string;
  commentaire: string;
}

const TRAVAUX_TRESO = [
  'Obtenir les rapprochements bancaires de tous les comptes à la date de clôture',
  'Vérifier la concordance entre les soldes comptables et les relevés bancaires',
  'Analyser les éléments en rapprochement anciens (chèques non encaissés > 6 mois)',
  'Procéder au contrôle physique de la caisse (PV de caisse au 31/12)',
  'Vérifier que les comptes de caisse ne présentent jamais de solde créditeur',
  'Vérifier que les comptes de virements internes (58x) sont soldés à la clôture',
  'Analyser les titres de placement et vérifier les dépréciations nécessaires',
  'Contrôler la conversion des disponibilités en devises au cours de clôture',
  'Circulariser les banques en collaboration avec les CAC',
  'Vérifier les autorisations de découvert et les lignes de crédit',
];

function RevisionTreso({ balanceN, exerciceAnnee, entiteId, exerciceId }: RevisionTresoProps): React.ReactElement {
  const [rapprochLignes, setRapprochLignes] = useState<RapprochBancaireLigne[]>([]);
  const [caisseLignes, setCaisseLignes] = useState<CaisseLigne[]>([]);
  const [titreLignes, setTitreLignes] = useState<TitrePlacementLigne[]>([]);
  const [deviseLignes, setDeviseLignes] = useState<DispoDeviseLigne[]>([]);
  const [circularLignes, setCircularLignes] = useState<CircularisationLigne[]>([]);
  const [nextIds, setNextIds] = useState({ rapp: 1, caisse: 1, titre: 1, dev: 1, circ: 1 });
  const [saved, setSaved] = useState(false);
  const [odEcritures, setOdEcritures] = useState<ODEcriture[]>([]);
  const [nextOdId, setNextOdId] = useState(1);
  const [showTravaux, setShowTravaux] = useState(true);

  // Comptes de trésorerie en balance
  const comptes50 = balanceN.filter(l => l.numero_compte.startsWith('50'));
  const comptes52 = balanceN.filter(l => l.numero_compte.startsWith('52'));
  const comptes53 = balanceN.filter(l => l.numero_compte.startsWith('53'));
  const comptes56 = balanceN.filter(l => l.numero_compte.startsWith('56'));
  const comptes57 = balanceN.filter(l => l.numero_compte.startsWith('57'));
  const comptes58 = balanceN.filter(l => l.numero_compte.startsWith('58'));
  const comptes59 = balanceN.filter(l => l.numero_compte.startsWith('59'));
  const comptes5 = balanceN.filter(l => l.numero_compte.startsWith('5'));

  const soldeNet = (l: BalanceLigne): number =>
    (parseFloat(String(l.solde_debiteur)) || 0) - (parseFloat(String(l.solde_crediteur)) || 0);
  const soldeCrediteur = (l: BalanceLigne): number =>
    (parseFloat(String(l.solde_crediteur)) || 0) - (parseFloat(String(l.solde_debiteur)) || 0);

  const totalBanques = comptes52.reduce((s, l) => s + soldeNet(l), 0);
  const totalCaisses = comptes57.reduce((s, l) => s + soldeNet(l), 0);
  const totalTreso5 = comptes5.reduce((s, l) => s + soldeNet(l), 0);

  // Détection caisse créditrice
  const caissesCrediTrices = comptes57.filter(l => soldeCrediteur(l) > 0.5);

  // Virements internes non soldés
  const virInternes: VirementInterneLigne[] = comptes58.map(l => {
    const solde = soldeNet(l);
    return {
      compte: l.numero_compte,
      libelle: l.libelle_compte,
      soldeN: solde,
      observation: Math.abs(solde) > 0.5 ? 'Non soldé — à régulariser' : 'Soldé',
    };
  });
  const virNonSoldes = virInternes.filter(v => Math.abs(v.soldeN) > 0.5);

  useEffect(() => { loadSaved(); }, [entiteId, exerciceId]);

  const loadSaved = (): void => {
    fetch(`/api/revision/${entiteId}/${exerciceId}/treso`)
      .then(r => { if (r.ok) return r.json(); throw new Error(); })
      .then((data: any) => {
        if (data.rapprochLignes?.length > 0) { setRapprochLignes(data.rapprochLignes); setNextIds(prev => ({ ...prev, rapp: Math.max(...data.rapprochLignes.map((a: RapprochBancaireLigne) => a.id)) + 1 })); }
        if (data.caisseLignes?.length > 0) { setCaisseLignes(data.caisseLignes); setNextIds(prev => ({ ...prev, caisse: Math.max(...data.caisseLignes.map((a: CaisseLigne) => a.id)) + 1 })); }
        if (data.titreLignes?.length > 0) { setTitreLignes(data.titreLignes); setNextIds(prev => ({ ...prev, titre: Math.max(...data.titreLignes.map((a: TitrePlacementLigne) => a.id)) + 1 })); }
        if (data.deviseLignes?.length > 0) { setDeviseLignes(data.deviseLignes); setNextIds(prev => ({ ...prev, dev: Math.max(...data.deviseLignes.map((a: DispoDeviseLigne) => a.id)) + 1 })); }
        if (data.circularLignes?.length > 0) { setCircularLignes(data.circularLignes); setNextIds(prev => ({ ...prev, circ: Math.max(...data.circularLignes.map((a: CircularisationLigne) => a.id)) + 1 })); }
        if (data.odEcritures?.length > 0) { setOdEcritures(data.odEcritures); setNextOdId(Math.max(...data.odEcritures.map((e: ODEcriture) => e.id)) + 1); }
      })
      .catch(() => {});
  };

  const handleSave = async (): Promise<void> => {
    try {
      await fetch(`/api/revision/${entiteId}/${exerciceId}/treso`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rapprochLignes, caisseLignes, titreLignes, deviseLignes, circularLignes, odEcritures }),
      });
      setSaved(true);
    } catch { /* silently */ }
  };

  // --- CRUD Rapprochement bancaire ---
  const addRapproch = (): void => {
    setRapprochLignes(prev => [...prev, { id: nextIds.rapp, banque: '', compteBanque: '', soldeCompta: 0, soldeReleve: 0, chequesNonEncaisses: 0, virEmisNonDebites: 0, soldeReconcilie: 0, ecart: 0 }]);
    setNextIds(prev => ({ ...prev, rapp: prev.rapp + 1 }));
    setSaved(false);
  };
  const updateRapproch = (id: number, field: keyof RapprochBancaireLigne, value: string | number): void => { setRapprochLignes(prev => prev.map(l => l.id === id ? { ...l, [field]: value } : l)); setSaved(false); };
  const removeRapproch = (id: number): void => { setRapprochLignes(prev => prev.filter(l => l.id !== id)); setSaved(false); };

  // Auto-populate rapprochement from 52x accounts
  const autoPopulateRapproch = (): void => {
    const newLignes: RapprochBancaireLigne[] = comptes52.map((l, i) => {
      const solde = soldeNet(l);
      return {
        id: nextIds.rapp + i,
        banque: l.libelle_compte,
        compteBanque: l.numero_compte,
        soldeCompta: solde,
        soldeReleve: 0,
        chequesNonEncaisses: 0,
        virEmisNonDebites: 0,
        soldeReconcilie: 0,
        ecart: solde,
      };
    });
    setRapprochLignes(prev => [...prev, ...newLignes]);
    setNextIds(prev => ({ ...prev, rapp: prev.rapp + newLignes.length }));
    setSaved(false);
  };

  // --- CRUD Caisse ---
  const addCaisse = (): void => {
    setCaisseLignes(prev => [...prev, { id: nextIds.caisse, compte: '', designation: '', soldeCompta: 0, pvCaisse: 0, ecart: 0 }]);
    setNextIds(prev => ({ ...prev, caisse: prev.caisse + 1 }));
    setSaved(false);
  };
  const updateCaisse = (id: number, field: keyof CaisseLigne, value: string | number): void => { setCaisseLignes(prev => prev.map(l => l.id === id ? { ...l, [field]: value } : l)); setSaved(false); };
  const removeCaisse = (id: number): void => { setCaisseLignes(prev => prev.filter(l => l.id !== id)); setSaved(false); };

  // Auto-populate caisse from 57x accounts
  const autoPopulateCaisse = (): void => {
    const newLignes: CaisseLigne[] = comptes57.map((l, i) => {
      const solde = soldeNet(l);
      return {
        id: nextIds.caisse + i,
        compte: l.numero_compte,
        designation: l.libelle_compte,
        soldeCompta: solde,
        pvCaisse: 0,
        ecart: solde,
      };
    });
    setCaisseLignes(prev => [...prev, ...newLignes]);
    setNextIds(prev => ({ ...prev, caisse: prev.caisse + newLignes.length }));
    setSaved(false);
  };

  // --- CRUD Titres de placement ---
  const addTitre = (): void => {
    setTitreLignes(prev => [...prev, { id: nextIds.titre, designation: '', compte: '', valeurAcquisition: 0, valeurInventaire: 0, depreciationNecessaire: 0, depreciationBalance: 0, ecartDeprec: 0 }]);
    setNextIds(prev => ({ ...prev, titre: prev.titre + 1 }));
    setSaved(false);
  };
  const updateTitre = (id: number, field: keyof TitrePlacementLigne, value: string | number): void => { setTitreLignes(prev => prev.map(l => l.id === id ? { ...l, [field]: value } : l)); setSaved(false); };
  const removeTitre = (id: number): void => { setTitreLignes(prev => prev.filter(l => l.id !== id)); setSaved(false); };

  // Auto-populate titres from 50x accounts
  const autoPopulateTitres = (): void => {
    const newLignes: TitrePlacementLigne[] = comptes50.map((l, i) => {
      const valAcq = soldeNet(l);
      const deprec59 = comptes59.find(d => d.numero_compte === '59' + l.numero_compte.substring(2));
      const deprecBal = deprec59 ? soldeCrediteur(deprec59) : 0;
      return {
        id: nextIds.titre + i,
        designation: l.libelle_compte,
        compte: l.numero_compte,
        valeurAcquisition: valAcq,
        valeurInventaire: 0,
        depreciationNecessaire: 0,
        depreciationBalance: deprecBal,
        ecartDeprec: 0,
      };
    });
    setTitreLignes(prev => [...prev, ...newLignes]);
    setNextIds(prev => ({ ...prev, titre: prev.titre + newLignes.length }));
    setSaved(false);
  };

  // --- CRUD Devises ---
  const addDevise = (): void => {
    setDeviseLignes(prev => [...prev, { id: nextIds.dev, banque: '', devise: 'USD', soldeDevise: 0, coursHistorique: 0, valeurHistorique: 0, coursCloture: 0, valeurCloture: 0, ecartChange: 0 }]);
    setNextIds(prev => ({ ...prev, dev: prev.dev + 1 }));
    setSaved(false);
  };
  const updateDevise = (id: number, field: keyof DispoDeviseLigne, value: string | number): void => { setDeviseLignes(prev => prev.map(l => l.id === id ? { ...l, [field]: value } : l)); setSaved(false); };
  const removeDevise = (id: number): void => { setDeviseLignes(prev => prev.filter(l => l.id !== id)); setSaved(false); };

  // --- CRUD Circularisation bancaire ---
  const addCircular = (): void => {
    setCircularLignes(prev => [...prev, { id: nextIds.circ, banque: '', soldeCompte: 0, soldeConfirme: 0, ecart: 0, empruntsConfirmes: '', cautions: '', signatairesAutorises: '', commentaire: '' }]);
    setNextIds(prev => ({ ...prev, circ: prev.circ + 1 }));
    setSaved(false);
  };
  const updateCircular = (id: number, field: keyof CircularisationLigne, value: string | number): void => { setCircularLignes(prev => prev.map(l => l.id === id ? { ...l, [field]: value } : l)); setSaved(false); };
  const removeCircular = (id: number): void => { setCircularLignes(prev => prev.filter(l => l.id !== id)); setSaved(false); };

  // Auto-populate circularisation from 52x accounts
  const autoPopulateCircular = (): void => {
    const newLignes: CircularisationLigne[] = comptes52.map((l, i) => {
      const solde = soldeNet(l);
      return {
        id: nextIds.circ + i,
        banque: l.libelle_compte,
        soldeCompte: solde,
        soldeConfirme: 0,
        ecart: solde,
        empruntsConfirmes: '',
        cautions: '',
        signatairesAutorises: '',
        commentaire: '',
      };
    });
    setCircularLignes(prev => [...prev, ...newLignes]);
    setNextIds(prev => ({ ...prev, circ: prev.circ + newLignes.length }));
    setSaved(false);
  };

  // --- Contrôle 1 calculs ---
  const rapprochCalcs = rapprochLignes.map(r => {
    const soldeReconcilie = r.soldeReleve - r.chequesNonEncaisses + r.virEmisNonDebites;
    const ecart = r.soldeCompta - soldeReconcilie;
    return { ...r, soldeReconcilie, ecart };
  });
  const totalSoldeCompta = rapprochCalcs.reduce((s, r) => s + r.soldeCompta, 0);
  const totalSoldeReleve = rapprochCalcs.reduce((s, r) => s + r.soldeReleve, 0);
  const totalChequesNE = rapprochCalcs.reduce((s, r) => s + r.chequesNonEncaisses, 0);
  const totalVirND = rapprochCalcs.reduce((s, r) => s + r.virEmisNonDebites, 0);
  const totalSoldeRecon = rapprochCalcs.reduce((s, r) => s + r.soldeReconcilie, 0);
  const totalEcartRappr = rapprochCalcs.reduce((s, r) => s + r.ecart, 0);

  // --- Contrôle 2 calculs ---
  const caisseCalcs = caisseLignes.map(c => {
    const ecart = c.soldeCompta - c.pvCaisse;
    return { ...c, ecart };
  });
  const totalSoldeCaisse = caisseCalcs.reduce((s, c) => s + c.soldeCompta, 0);
  const totalPvCaisse = caisseCalcs.reduce((s, c) => s + c.pvCaisse, 0);
  const totalEcartCaisse = caisseCalcs.reduce((s, c) => s + c.ecart, 0);

  // --- Contrôle 3 calculs ---
  const titreCalcs = titreLignes.map(t => {
    const depreciationNecessaire = Math.max(0, t.valeurAcquisition - t.valeurInventaire);
    const ecartDeprec = depreciationNecessaire - t.depreciationBalance;
    return { ...t, depreciationNecessaire, ecartDeprec };
  });
  const totalValAcq = titreCalcs.reduce((s, t) => s + t.valeurAcquisition, 0);
  const totalValInv = titreCalcs.reduce((s, t) => s + t.valeurInventaire, 0);
  const totalDeprecNec = titreCalcs.reduce((s, t) => s + t.depreciationNecessaire, 0);
  const totalDeprecBal = titreCalcs.reduce((s, t) => s + t.depreciationBalance, 0);
  const totalEcartDeprec = titreCalcs.reduce((s, t) => s + t.ecartDeprec, 0);

  // --- Contrôle 5 calculs ---
  const deviseCalcs = deviseLignes.map(d => {
    const valeurHistorique = d.soldeDevise * d.coursHistorique;
    const valeurCloture = d.soldeDevise * d.coursCloture;
    const ecartChange = valeurCloture - valeurHistorique;
    return { ...d, valeurHistorique, valeurCloture, ecartChange };
  });
  const totalValHist = deviseCalcs.reduce((s, d) => s + d.valeurHistorique, 0);
  const totalValClot = deviseCalcs.reduce((s, d) => s + d.valeurCloture, 0);
  const totalEcartChange = deviseCalcs.reduce((s, d) => s + d.ecartChange, 0);
  const totalGainsChange = deviseCalcs.reduce((s, d) => s + Math.max(0, d.ecartChange), 0);
  const totalPertesChange = deviseCalcs.reduce((s, d) => s + Math.max(0, -d.ecartChange), 0);

  // --- Contrôle 6 calculs ---
  const circularCalcs = circularLignes.map(c => {
    const ecart = c.soldeCompte - c.soldeConfirme;
    return { ...c, ecart };
  });
  const totalSoldeCompteCirc = circularCalcs.reduce((s, c) => s + c.soldeCompte, 0);
  const totalSoldeConfirme = circularCalcs.reduce((s, c) => s + c.soldeConfirme, 0);
  const totalEcartCirc = circularCalcs.reduce((s, c) => s + c.ecart, 0);

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

  // Suggestion : Écart dépréciation titres de placement
  if (titreCalcs.length > 0 && Math.abs(totalEcartDeprec) > 0.5) {
    const dejaPropose = odEcritures.some(od => od.source === 'Treso-C3');
    if (!dejaPropose) {
      if (totalEcartDeprec > 0) {
        suggestions.push({
          compteDebit: '679', libelleDebit: 'Charges provisionnées financières',
          compteCredit: '590', libelleCredit: 'Dépréciations titres de placement',
          montant: totalEcartDeprec, libelle: 'Dotation dépréciation titres de placement',
          source: 'Treso-C3',
        });
      } else {
        suggestions.push({
          compteDebit: '590', libelleDebit: 'Dépréciations titres de placement',
          compteCredit: '779', libelleCredit: 'Reprises charges provisionnées financières',
          montant: Math.abs(totalEcartDeprec), libelle: 'Reprise dépréciation excédentaire titres de placement',
          source: 'Treso-C3',
        });
      }
    }
  }

  // Suggestion : Pertes de change sur disponibilités en devises
  if (totalPertesChange > 0.5) {
    const dejaPropose = odEcritures.some(od => od.source === 'Treso-C5-perte');
    if (!dejaPropose) {
      suggestions.push({
        compteDebit: '676', libelleDebit: 'Pertes de change',
        compteCredit: '521', libelleCredit: 'Banques',
        montant: totalPertesChange, libelle: 'Pertes de change sur disponibilités en devises',
        source: 'Treso-C5-perte',
      });
    }
  }

  // Suggestion : Gains de change sur disponibilités en devises
  if (totalGainsChange > 0.5) {
    const dejaPropose = odEcritures.some(od => od.source === 'Treso-C5-gain');
    if (!dejaPropose) {
      suggestions.push({
        compteDebit: '521', libelleDebit: 'Banques',
        compteCredit: '776', libelleCredit: 'Gains de change',
        montant: totalGainsChange, libelle: 'Gains de change sur disponibilités en devises',
        source: 'Treso-C5-gain',
      });
    }
  }

  return (
    <div className="revision-kp">
      <div className="revision-section-header">
        <h3>Trésorerie</h3>
        <button className="revision-save-btn" onClick={handleSave}>
          <LuSave size={14} /> {saved ? 'Sauvegardé' : 'Sauvegarder'}
        </button>
      </div>

      <div className="revision-objectif">
        <strong>Objectif :</strong> S'assurer de l'exhaustivité, de la réalité et de la correcte évaluation des disponibilités (52x, 57x), des titres de placement (50x), des virements internes (58x) et des dépréciations (59x). Vérifier la concordance avec les relevés bancaires et les PV de caisse.
      </div>


      <div className="revision-travaux">
        <button className="revision-travaux-toggle" onClick={() => setShowTravaux(!showTravaux)}>
          {showTravaux ? <LuChevronDown size={14} /> : <LuChevronRight size={14} />}
          <LuClipboardList size={14} />
          <span>Travaux à effectuer</span>
        </button>
        {showTravaux && (
          <ul className="revision-travaux-list">
            {TRAVAUX_TRESO.map((t, i) => <li key={i}>{t}</li>)}
          </ul>
        )}
      </div>

      <FonctionnementCompte prefixes={['50','51','52','53','54','56','57','58','59']} titre="Trésorerie" />

      {/* Note si comptes 5x en balance */}
      {comptes5.length > 0 && rapprochLignes.length === 0 && caisseLignes.length === 0 && (
        <div className="revision-objectif">
          <strong>Information :</strong> La balance contient {comptes5.length} compte{comptes5.length > 1 ? 's' : ''} de trésorerie (classe 5) pour un solde net de <strong>{fmt(totalTreso5)}</strong>.
          {comptes52.length > 0 && <> Banques (52x) : <strong>{fmt(totalBanques)}</strong>.</>}
          {comptes57.length > 0 && <> Caisses (57x) : <strong>{fmt(totalCaisses)}</strong>.</>}
          {comptes50.length > 0 && <> Titres de placement (50x) : <strong>{fmt(comptes50.reduce((s, l) => s + soldeNet(l), 0))}</strong>.</>}
          {comptes59.length > 0 && <> Dépréciations (59x) : <strong>{fmt(comptes59.reduce((s, l) => s + soldeCrediteur(l), 0))}</strong>.</>}
          {comptes58.length > 0 && <> Virements internes (58x) : <strong>{fmt(comptes58.reduce((s, l) => s + soldeNet(l), 0))}</strong>.</>}
          <br />Complétez les contrôles ci-dessous.
        </div>
      )}

      {/* Alerte : Caisse créditrice */}
      {caissesCrediTrices.length > 0 && (
        <div className="revision-objectif" style={{ background: '#fef2f2', borderLeft: '4px solid #ef4444' }}>
          <strong style={{ color: '#dc2626' }}>Alerte — Solde créditeur sur compte de caisse :</strong>{' '}
          {caissesCrediTrices.map(l => (
            <span key={l.numero_compte}> Compte <strong>{l.numero_compte}</strong> ({l.libelle_compte}) : solde créditeur de <strong>{fmt(soldeCrediteur(l))}</strong>. </span>
          ))}
          <br /><em style={{ color: '#dc2626' }}>Solde créditeur sur le compte caisse — présomption d'irrégularité (règle OHADA).</em>
        </div>
      )}

      {/* Alerte : Virements internes non soldés */}
      {virNonSoldes.length > 0 && (
        <div className="revision-objectif" style={{ background: '#fffbeb', borderLeft: '4px solid #f59e0b' }}>
          <strong style={{ color: '#d97706' }}>Alerte — Virements internes non soldés :</strong>{' '}
          Les comptes de virements internes (58x) doivent être soldés en fin d'exercice.
          {virNonSoldes.map(v => (
            <span key={v.compte}> Compte <strong>{v.compte}</strong> : solde de <strong>{fmt(v.soldeN)}</strong>. </span>
          ))}
        </div>
      )}

      {/* Contrôle 1 : Rapprochement bancaire */}
      <div className="revision-control">
        <div className="revision-control-title">
          <span>Contrôle 1 — Rapprochement bancaire</span>
          {rapprochCalcs.length > 0 && (Math.abs(totalEcartRappr) < 0.5
            ? <span className="revision-badge ok">Conforme</span>
            : <span className="revision-badge ko">Écart détecté</span>
          )}
        </div>
        <div className="revision-ref">Solde réconcilié = Solde relevé - Chèques non encaissés + Virements émis non débités</div>

        <div className="revision-table-wrapper">
          <table className="revision-table">
            <thead>
              <tr>
                <th>Banque</th>
                <th style={{ width: 80 }}>Compte</th>
                <th className="num" style={{ width: 120 }}>Solde compta.</th>
                <th className="num editable-col" style={{ width: 120 }}>Solde relevé</th>
                <th className="num editable-col" style={{ width: 120 }}>Chèques NE</th>
                <th className="num editable-col" style={{ width: 120 }}>Vir. émis ND</th>
                <th className="num" style={{ width: 120 }}>Solde réconcilié</th>
                <th className="num" style={{ width: 100 }}>Écart</th>
                <th style={{ width: 30 }}></th>
              </tr>
            </thead>
            <tbody>
              {rapprochCalcs.map(r => (
                <tr key={r.id} className={Math.abs(r.ecart) > 0.5 ? 'ecart-row' : ''}>
                  <td className="editable-cell"><input type="text" value={r.banque} onChange={e => updateRapproch(r.id, 'banque', e.target.value)} style={{ maxWidth: 'none' }} /></td>
                  <td className="editable-cell"><input type="text" value={r.compteBanque} onChange={e => updateRapproch(r.id, 'compteBanque', e.target.value)} style={{ maxWidth: 'none', fontFamily: 'monospace' }} /></td>
                  <td className="editable-cell"><input type="text" inputMode="numeric" value={fmtInput(r.soldeCompta)} onChange={e => updateRapproch(r.id, 'soldeCompta', parseInputValue(e.target.value))} style={{ maxWidth: 'none' }} /></td>
                  <td className="editable-cell"><input type="text" inputMode="numeric" value={fmtInput(r.soldeReleve)} onChange={e => updateRapproch(r.id, 'soldeReleve', parseInputValue(e.target.value))} style={{ maxWidth: 'none' }} /></td>
                  <td className="editable-cell"><input type="text" inputMode="numeric" value={fmtInput(r.chequesNonEncaisses)} onChange={e => updateRapproch(r.id, 'chequesNonEncaisses', parseInputValue(e.target.value))} style={{ maxWidth: 'none' }} /></td>
                  <td className="editable-cell"><input type="text" inputMode="numeric" value={fmtInput(r.virEmisNonDebites)} onChange={e => updateRapproch(r.id, 'virEmisNonDebites', parseInputValue(e.target.value))} style={{ maxWidth: 'none' }} /></td>
                  <td className="num computed">{fmt(r.soldeReconcilie)}</td>
                  <td className={`num ${Math.abs(r.ecart) > 0.5 ? 'ecart-val' : 'ok-val'}`}>{fmt(r.ecart)}</td>
                  <td><button className="revision-od-delete" onClick={() => removeRapproch(r.id)} title="Supprimer"><LuTrash2 size={13} /></button></td>
                </tr>
              ))}
              {rapprochLignes.length === 0 && (
                <tr><td colSpan={9} style={{ textAlign: 'center', color: '#999', padding: 16, fontStyle: 'italic' }}>Aucun rapprochement bancaire saisi. Utilisez le bouton ci-dessous pour pré-remplir depuis la balance.</td></tr>
              )}
            </tbody>
            {rapprochCalcs.length > 0 && (
              <tfoot>
                <tr>
                  <td colSpan={2}><strong>Total</strong></td>
                  <td className="num"><strong>{fmt(totalSoldeCompta)}</strong></td>
                  <td className="num"><strong>{fmt(totalSoldeReleve)}</strong></td>
                  <td className="num"><strong>{fmt(totalChequesNE)}</strong></td>
                  <td className="num"><strong>{fmt(totalVirND)}</strong></td>
                  <td className="num"><strong>{fmt(totalSoldeRecon)}</strong></td>
                  <td className={`num ${Math.abs(totalEcartRappr) > 0.5 ? 'ecart-val' : 'ok-val'}`}><strong>{fmt(totalEcartRappr)}</strong></td>
                  <td></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
        <div className="revision-od-actions">
          <button className="revision-od-add" onClick={addRapproch}><LuPlus size={13} /> Ajouter une banque</button>
          {comptes52.length > 0 && rapprochLignes.length === 0 && (
            <button className="revision-od-add" onClick={autoPopulateRapproch} style={{ marginLeft: 8 }}><LuClipboardList size={13} /> Pré-remplir depuis la balance (52x)</button>
          )}
        </div>
      </div>

      {/* Contrôle 2 : Contrôle de caisse */}
      <div className="revision-control">
        <div className="revision-control-title">
          <span>Contrôle 2 — Contrôle de caisse</span>
          {caisseCalcs.length > 0 && (Math.abs(totalEcartCaisse) < 0.5
            ? <span className="revision-badge ok">Conforme</span>
            : <span className="revision-badge ko">Écart détecté</span>
          )}
        </div>
        <div className="revision-ref">Écart = Solde comptable - PV de caisse au 31/12</div>

        <div className="revision-table-wrapper">
          <table className="revision-table">
            <thead>
              <tr>
                <th style={{ width: 90 }}>Compte</th>
                <th>Désignation</th>
                <th className="num" style={{ width: 130 }}>Solde comptable</th>
                <th className="num editable-col" style={{ width: 130 }}>PV de caisse</th>
                <th className="num" style={{ width: 110 }}>Écart</th>
                <th style={{ width: 30 }}></th>
              </tr>
            </thead>
            <tbody>
              {caisseCalcs.map(c => (
                <tr key={c.id} className={Math.abs(c.ecart) > 0.5 ? 'ecart-row' : ''}>
                  <td className="editable-cell"><input type="text" value={c.compte} onChange={e => updateCaisse(c.id, 'compte', e.target.value)} style={{ maxWidth: 'none', fontFamily: 'monospace' }} /></td>
                  <td className="editable-cell"><input type="text" value={c.designation} onChange={e => updateCaisse(c.id, 'designation', e.target.value)} style={{ maxWidth: 'none' }} /></td>
                  <td className="editable-cell"><input type="text" inputMode="numeric" value={fmtInput(c.soldeCompta)} onChange={e => updateCaisse(c.id, 'soldeCompta', parseInputValue(e.target.value))} style={{ maxWidth: 'none' }} /></td>
                  <td className="editable-cell"><input type="text" inputMode="numeric" value={fmtInput(c.pvCaisse)} onChange={e => updateCaisse(c.id, 'pvCaisse', parseInputValue(e.target.value))} style={{ maxWidth: 'none' }} /></td>
                  <td className={`num ${Math.abs(c.ecart) > 0.5 ? 'ecart-val' : 'ok-val'}`}>{fmt(c.ecart)}</td>
                  <td><button className="revision-od-delete" onClick={() => removeCaisse(c.id)} title="Supprimer"><LuTrash2 size={13} /></button></td>
                </tr>
              ))}
              {caisseLignes.length === 0 && (
                <tr><td colSpan={6} style={{ textAlign: 'center', color: '#999', padding: 16, fontStyle: 'italic' }}>Aucune caisse saisie. Utilisez le bouton ci-dessous pour pré-remplir depuis la balance.</td></tr>
              )}
            </tbody>
            {caisseCalcs.length > 0 && (
              <tfoot>
                <tr>
                  <td colSpan={2}><strong>Total</strong></td>
                  <td className="num"><strong>{fmt(totalSoldeCaisse)}</strong></td>
                  <td className="num"><strong>{fmt(totalPvCaisse)}</strong></td>
                  <td className={`num ${Math.abs(totalEcartCaisse) > 0.5 ? 'ecart-val' : 'ok-val'}`}><strong>{fmt(totalEcartCaisse)}</strong></td>
                  <td></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
        <div className="revision-od-actions">
          <button className="revision-od-add" onClick={addCaisse}><LuPlus size={13} /> Ajouter une caisse</button>
          {comptes57.length > 0 && caisseLignes.length === 0 && (
            <button className="revision-od-add" onClick={autoPopulateCaisse} style={{ marginLeft: 8 }}><LuClipboardList size={13} /> Pré-remplir depuis la balance (57x)</button>
          )}
        </div>
      </div>

      {/* Contrôle 3 : Titres de placement et dépréciations */}
      <div className="revision-control">
        <div className="revision-control-title">
          <span>Contrôle 3 — Titres de placement et dépréciations</span>
          {titreCalcs.length > 0 && (Math.abs(totalEcartDeprec) < 0.5
            ? <span className="revision-badge ok">Conforme</span>
            : <span className="revision-badge ko">Écart détecté</span>
          )}
        </div>
        <div className="revision-ref">Dotation : D 679 / C 59x — Reprise : D 59x / C 779</div>

        <div className="revision-table-wrapper">
          <table className="revision-table">
            <thead>
              <tr>
                <th style={{ width: 90 }}>Compte</th>
                <th>Désignation</th>
                <th className="num editable-col" style={{ width: 120 }}>Val. acquisition</th>
                <th className="num editable-col" style={{ width: 120 }}>Val. inventaire</th>
                <th className="num" style={{ width: 120 }}>Dépr. nécessaire</th>
                <th className="num editable-col" style={{ width: 120 }}>Dépr. balance</th>
                <th className="num" style={{ width: 100 }}>Écart</th>
                <th style={{ width: 30 }}></th>
              </tr>
            </thead>
            <tbody>
              {titreCalcs.map(t => (
                <tr key={t.id} className={Math.abs(t.ecartDeprec) > 0.5 ? 'ecart-row' : ''}>
                  <td className="editable-cell"><input type="text" value={t.compte} onChange={e => updateTitre(t.id, 'compte', e.target.value)} style={{ maxWidth: 'none', fontFamily: 'monospace' }} /></td>
                  <td className="editable-cell"><input type="text" value={t.designation} onChange={e => updateTitre(t.id, 'designation', e.target.value)} style={{ maxWidth: 'none' }} /></td>
                  <td className="editable-cell"><input type="text" inputMode="numeric" value={fmtInput(t.valeurAcquisition)} onChange={e => updateTitre(t.id, 'valeurAcquisition', parseInputValue(e.target.value))} style={{ maxWidth: 'none' }} /></td>
                  <td className="editable-cell"><input type="text" inputMode="numeric" value={fmtInput(t.valeurInventaire)} onChange={e => updateTitre(t.id, 'valeurInventaire', parseInputValue(e.target.value))} style={{ maxWidth: 'none' }} /></td>
                  <td className="num computed">{fmt(t.depreciationNecessaire)}</td>
                  <td className="editable-cell"><input type="text" inputMode="numeric" value={fmtInput(t.depreciationBalance)} onChange={e => updateTitre(t.id, 'depreciationBalance', parseInputValue(e.target.value))} style={{ maxWidth: 'none' }} /></td>
                  <td className={`num ${Math.abs(t.ecartDeprec) > 0.5 ? 'ecart-val' : 'ok-val'}`}>{fmt(t.ecartDeprec)}</td>
                  <td><button className="revision-od-delete" onClick={() => removeTitre(t.id)} title="Supprimer"><LuTrash2 size={13} /></button></td>
                </tr>
              ))}
              {titreLignes.length === 0 && (
                <tr><td colSpan={8} style={{ textAlign: 'center', color: '#999', padding: 16, fontStyle: 'italic' }}>Aucun titre de placement saisi.</td></tr>
              )}
            </tbody>
            {titreCalcs.length > 0 && (
              <tfoot>
                <tr>
                  <td colSpan={2}><strong>Total</strong></td>
                  <td className="num"><strong>{fmt(totalValAcq)}</strong></td>
                  <td className="num"><strong>{fmt(totalValInv)}</strong></td>
                  <td className="num"><strong>{fmt(totalDeprecNec)}</strong></td>
                  <td className="num"><strong>{fmt(totalDeprecBal)}</strong></td>
                  <td className={`num ${Math.abs(totalEcartDeprec) > 0.5 ? 'ecart-val' : 'ok-val'}`}><strong>{fmt(totalEcartDeprec)}</strong></td>
                  <td></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
        <div className="revision-od-actions">
          <button className="revision-od-add" onClick={addTitre}><LuPlus size={13} /> Ajouter un titre</button>
          {comptes50.length > 0 && titreLignes.length === 0 && (
            <button className="revision-od-add" onClick={autoPopulateTitres} style={{ marginLeft: 8 }}><LuClipboardList size={13} /> Pré-remplir depuis la balance (50x)</button>
          )}
        </div>
      </div>

      {/* Contrôle 4 : Virements internes */}
      <div className="revision-control">
        <div className="revision-control-title">
          <span>Contrôle 4 — Virements internes (58x)</span>
          {virInternes.length > 0 && (virNonSoldes.length === 0
            ? <span className="revision-badge ok">Tous soldés</span>
            : <span className="revision-badge ko">{virNonSoldes.length} non soldé{virNonSoldes.length > 1 ? 's' : ''}</span>
          )}
        </div>
        <div className="revision-ref">Les comptes de virements internes (58x) doivent impérativement être soldés en fin d'exercice</div>

        <div className="revision-table-wrapper">
          <table className="revision-table">
            <thead>
              <tr>
                <th style={{ width: 90 }}>Compte</th>
                <th>Libellé</th>
                <th className="num" style={{ width: 130 }}>Solde N</th>
                <th style={{ width: 200 }}>Observation</th>
              </tr>
            </thead>
            <tbody>
              {virInternes.map(v => (
                <tr key={v.compte} className={Math.abs(v.soldeN) > 0.5 ? 'ecart-row' : ''}>
                  <td className="compte">{v.compte}</td>
                  <td>{v.libelle}</td>
                  <td className={`num ${Math.abs(v.soldeN) > 0.5 ? 'ecart-val' : 'ok-val'}`}>{fmt(v.soldeN)}</td>
                  <td>{v.observation}</td>
                </tr>
              ))}
              {virInternes.length === 0 && (
                <tr><td colSpan={4} style={{ textAlign: 'center', color: '#999', padding: 16, fontStyle: 'italic' }}>Aucun compte 58x dans la balance.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Contrôle 5 : Disponibilités en devises */}
      <div className="revision-control">
        <div className="revision-control-title">
          <span>Contrôle 5 — Disponibilités en devises</span>
        </div>
        <div className="revision-ref">Gain de change : D 52x / C 776 — Perte de change : D 676 / C 52x</div>

        <div className="revision-table-wrapper">
          <table className="revision-table">
            <thead>
              <tr>
                <th>Banque</th>
                <th style={{ width: 70 }}>Devise</th>
                <th className="num editable-col" style={{ width: 110 }}>Solde devise</th>
                <th className="num editable-col" style={{ width: 110 }}>Cours hist.</th>
                <th className="num" style={{ width: 120 }}>Val. historique</th>
                <th className="num editable-col" style={{ width: 110 }}>Cours clôture</th>
                <th className="num" style={{ width: 120 }}>Val. clôture</th>
                <th className="num" style={{ width: 110 }}>Écart change</th>
                <th style={{ width: 30 }}></th>
              </tr>
            </thead>
            <tbody>
              {deviseCalcs.map(d => (
                <tr key={d.id} className={Math.abs(d.ecartChange) > 0.5 ? (d.ecartChange < 0 ? 'ecart-row' : '') : ''}>
                  <td className="editable-cell"><input type="text" value={d.banque} onChange={e => updateDevise(d.id, 'banque', e.target.value)} style={{ maxWidth: 'none' }} /></td>
                  <td className="editable-cell">
                    <select value={d.devise} onChange={e => updateDevise(d.id, 'devise', e.target.value)} style={{ padding: '3px 4px', borderRadius: 4, border: '1px solid #ddd', width: '100%', fontSize: '11.5px' }}>
                      <option value="USD">USD</option>
                      <option value="EUR">EUR</option>
                      <option value="GBP">GBP</option>
                      <option value="CNY">CNY</option>
                      <option value="JPY">JPY</option>
                      <option value="Autre">Autre</option>
                    </select>
                  </td>
                  <td className="editable-cell"><input type="text" inputMode="numeric" value={fmtInput(d.soldeDevise)} onChange={e => updateDevise(d.id, 'soldeDevise', parseInputValue(e.target.value))} style={{ maxWidth: 'none' }} /></td>
                  <td className="editable-cell"><input type="text" inputMode="numeric" value={fmtInput(d.coursHistorique)} onChange={e => updateDevise(d.id, 'coursHistorique', parseInputValue(e.target.value))} style={{ maxWidth: 'none' }} /></td>
                  <td className="num computed">{fmt(d.valeurHistorique)}</td>
                  <td className="editable-cell"><input type="text" inputMode="numeric" value={fmtInput(d.coursCloture)} onChange={e => updateDevise(d.id, 'coursCloture', parseInputValue(e.target.value))} style={{ maxWidth: 'none' }} /></td>
                  <td className="num computed">{fmt(d.valeurCloture)}</td>
                  <td className={`num ${d.ecartChange < -0.5 ? 'ecart-val' : d.ecartChange > 0.5 ? 'ok-val' : ''}`}>{fmt(d.ecartChange)}</td>
                  <td><button className="revision-od-delete" onClick={() => removeDevise(d.id)} title="Supprimer"><LuTrash2 size={13} /></button></td>
                </tr>
              ))}
              {deviseLignes.length === 0 && (
                <tr><td colSpan={9} style={{ textAlign: 'center', color: '#999', padding: 16, fontStyle: 'italic' }}>Aucune disponibilité en devise saisie.</td></tr>
              )}
            </tbody>
            {deviseCalcs.length > 0 && (
              <tfoot>
                <tr>
                  <td colSpan={4}><strong>Total</strong></td>
                  <td className="num"><strong>{fmt(totalValHist)}</strong></td>
                  <td></td>
                  <td className="num"><strong>{fmt(totalValClot)}</strong></td>
                  <td className={`num ${Math.abs(totalEcartChange) > 0.5 ? (totalEcartChange < 0 ? 'ecart-val' : 'ok-val') : ''}`}><strong>{fmt(totalEcartChange)}</strong></td>
                  <td></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
        <div className="revision-od-actions">
          <button className="revision-od-add" onClick={addDevise}><LuPlus size={13} /> Ajouter une disponibilité en devise</button>
        </div>
      </div>

      {/* Contrôle 6 : Circularisation bancaire */}
      <div className="revision-control">
        <div className="revision-control-title">
          <span>Contrôle 6 — Circularisation des banques</span>
          {circularCalcs.length > 0 && (Math.abs(totalEcartCirc) < 0.5
            ? <span className="revision-badge ok">Conforme</span>
            : <span className="revision-badge ko">Écart détecté</span>
          )}
        </div>
        <div className="revision-ref">Confirmation directe des soldes, emprunts, cautions et signataires auprès des établissements bancaires</div>

        {/* Alerte si écart */}
        {circularCalcs.some(c => Math.abs(c.ecart) > 0.5) && (
          <div className="revision-objectif" style={{ background: '#fef2f2', borderLeft: '4px solid #ef4444' }}>
            <strong style={{ color: '#dc2626' }}>Alerte — Écart de confirmation bancaire :</strong>{' '}
            {circularCalcs.filter(c => Math.abs(c.ecart) > 0.5).map(c => (
              <span key={c.id}> <strong>{c.banque || '(banque non renseignée)'}</strong> : écart de <strong>{fmt(c.ecart)}</strong>. </span>
            ))}
            <br /><em style={{ color: '#dc2626' }}>Investiguer les écarts entre le solde comptable et le solde confirmé par la banque.</em>
          </div>
        )}

        <div className="revision-table-wrapper">
          <table className="revision-table">
            <thead>
              <tr>
                <th>Banque</th>
                <th className="num" style={{ width: 120 }}>Solde compte</th>
                <th className="num editable-col" style={{ width: 120 }}>Solde confirmé</th>
                <th className="num" style={{ width: 100 }}>Écart</th>
                <th className="editable-col" style={{ width: 130 }}>Emprunts confirmés</th>
                <th className="editable-col" style={{ width: 120 }}>Cautions</th>
                <th className="editable-col" style={{ width: 130 }}>Signataires autorisés</th>
                <th className="editable-col" style={{ width: 140 }}>Commentaire</th>
                <th style={{ width: 30 }}></th>
              </tr>
            </thead>
            <tbody>
              {circularCalcs.map(c => (
                <tr key={c.id} className={Math.abs(c.ecart) > 0.5 ? 'ecart-row' : ''}>
                  <td className="editable-cell"><input type="text" value={c.banque} onChange={e => updateCircular(c.id, 'banque', e.target.value)} style={{ maxWidth: 'none' }} /></td>
                  <td className="editable-cell"><input type="text" inputMode="numeric" value={fmtInput(c.soldeCompte)} onChange={e => updateCircular(c.id, 'soldeCompte', parseInputValue(e.target.value))} style={{ maxWidth: 'none' }} /></td>
                  <td className="editable-cell"><input type="text" inputMode="numeric" value={fmtInput(c.soldeConfirme)} onChange={e => updateCircular(c.id, 'soldeConfirme', parseInputValue(e.target.value))} style={{ maxWidth: 'none' }} /></td>
                  <td className={`num ${Math.abs(c.ecart) > 0.5 ? 'ecart-val' : 'ok-val'}`}>{fmt(c.ecart)}</td>
                  <td className="editable-cell"><input type="text" value={c.empruntsConfirmes} onChange={e => updateCircular(c.id, 'empruntsConfirmes', e.target.value)} style={{ maxWidth: 'none' }} /></td>
                  <td className="editable-cell"><input type="text" value={c.cautions} onChange={e => updateCircular(c.id, 'cautions', e.target.value)} style={{ maxWidth: 'none' }} /></td>
                  <td className="editable-cell"><input type="text" value={c.signatairesAutorises} onChange={e => updateCircular(c.id, 'signatairesAutorises', e.target.value)} style={{ maxWidth: 'none' }} /></td>
                  <td className="editable-cell"><input type="text" value={c.commentaire} onChange={e => updateCircular(c.id, 'commentaire', e.target.value)} style={{ maxWidth: 'none' }} /></td>
                  <td><button className="revision-od-delete" onClick={() => removeCircular(c.id)} title="Supprimer"><LuTrash2 size={13} /></button></td>
                </tr>
              ))}
              {circularLignes.length === 0 && (
                <tr><td colSpan={9} style={{ textAlign: 'center', color: '#999', padding: 16, fontStyle: 'italic' }}>Aucune circularisation saisie. Utilisez le bouton ci-dessous pour pré-remplir depuis la balance.</td></tr>
              )}
            </tbody>
            {circularCalcs.length > 0 && (
              <tfoot>
                <tr>
                  <td><strong>Total</strong></td>
                  <td className="num"><strong>{fmt(totalSoldeCompteCirc)}</strong></td>
                  <td className="num"><strong>{fmt(totalSoldeConfirme)}</strong></td>
                  <td className={`num ${Math.abs(totalEcartCirc) > 0.5 ? 'ecart-val' : 'ok-val'}`}><strong>{fmt(totalEcartCirc)}</strong></td>
                  <td colSpan={4}></td>
                  <td></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
        <div className="revision-od-actions">
          <button className="revision-od-add" onClick={addCircular}><LuPlus size={13} /> Ajouter une banque</button>
          {comptes52.length > 0 && circularLignes.length === 0 && (
            <button className="revision-od-add" onClick={autoPopulateCircular} style={{ marginLeft: 8 }}><LuClipboardList size={13} /> Pré-remplir depuis la balance (52x)</button>
          )}
        </div>
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

export default RevisionTreso;
