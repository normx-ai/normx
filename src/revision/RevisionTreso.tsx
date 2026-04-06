import React, { useState, useEffect } from 'react';
import { LuSave, LuChevronDown, LuChevronRight, LuClipboardList } from 'react-icons/lu';
import { BalanceLigne } from '../types';
import {
  ODEcriture, Suggestion, fmt,
  RapprochBancaireLigne, CaisseLigne, TitrePlacementLigne,
  VirementInterneLigne, DispoDeviseLigne, CircularisationBancaireLigne,
} from './revisionTypes';
import JournalOD from './JournalOD';
import FonctionnementCompte from './FonctionnementCompte';
import RevisionTresoTable from './RevisionTresoTable';

interface RevisionTresoProps {
  balanceN: BalanceLigne[];
  exerciceAnnee: number;
  entiteId: number;
  exerciceId: number;
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
  const [circularLignes, setCircularLignes] = useState<CircularisationBancaireLigne[]>([]);
  const [nextIds, setNextIds] = useState({ rapp: 1, caisse: 1, titre: 1, dev: 1, circ: 1 });
  const [saved, setSaved] = useState(false);
  const [odEcritures, setOdEcritures] = useState<ODEcriture[]>([]);
  const [nextOdId, setNextOdId] = useState(1);
  const [showTravaux, setShowTravaux] = useState(true);

  // Comptes de trésorerie en balance
  const comptes50 = balanceN.filter(l => l.numero_compte.startsWith('50'));
  const comptes52 = balanceN.filter(l => l.numero_compte.startsWith('52'));
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

  const caissesCrediTrices = comptes57.filter(l => soldeCrediteur(l) > 0.5);

  const virInternes: VirementInterneLigne[] = comptes58.map(l => {
    const solde = soldeNet(l);
    return { compte: l.numero_compte, libelle: l.libelle_compte, soldeN: solde, observation: Math.abs(solde) > 0.5 ? 'Non soldé — à régulariser' : 'Soldé' };
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
        if (data.circularLignes?.length > 0) { setCircularLignes(data.circularLignes); setNextIds(prev => ({ ...prev, circ: Math.max(...data.circularLignes.map((a: CircularisationBancaireLigne) => a.id)) + 1 })); }
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
  const addRapproch = (): void => { setRapprochLignes(prev => [...prev, { id: nextIds.rapp, banque: '', compteBanque: '', soldeCompta: 0, soldeReleve: 0, chequesNonEncaisses: 0, virEmisNonDebites: 0, soldeReconcilie: 0, ecart: 0 }]); setNextIds(prev => ({ ...prev, rapp: prev.rapp + 1 })); setSaved(false); };
  const updateRapproch = (id: number, field: keyof RapprochBancaireLigne, value: string | number): void => { setRapprochLignes(prev => prev.map(l => l.id === id ? { ...l, [field]: value } : l)); setSaved(false); };
  const removeRapproch = (id: number): void => { setRapprochLignes(prev => prev.filter(l => l.id !== id)); setSaved(false); };
  const autoPopulateRapproch = (): void => {
    const newLignes: RapprochBancaireLigne[] = comptes52.map((l, i) => {
      const solde = soldeNet(l);
      return { id: nextIds.rapp + i, banque: l.libelle_compte, compteBanque: l.numero_compte, soldeCompta: solde, soldeReleve: 0, chequesNonEncaisses: 0, virEmisNonDebites: 0, soldeReconcilie: 0, ecart: solde };
    });
    setRapprochLignes(prev => [...prev, ...newLignes]);
    setNextIds(prev => ({ ...prev, rapp: prev.rapp + newLignes.length }));
    setSaved(false);
  };

  // --- CRUD Caisse ---
  const addCaisse = (): void => { setCaisseLignes(prev => [...prev, { id: nextIds.caisse, compte: '', designation: '', soldeCompta: 0, pvCaisse: 0, ecart: 0 }]); setNextIds(prev => ({ ...prev, caisse: prev.caisse + 1 })); setSaved(false); };
  const updateCaisse = (id: number, field: keyof CaisseLigne, value: string | number): void => { setCaisseLignes(prev => prev.map(l => l.id === id ? { ...l, [field]: value } : l)); setSaved(false); };
  const removeCaisse = (id: number): void => { setCaisseLignes(prev => prev.filter(l => l.id !== id)); setSaved(false); };
  const autoPopulateCaisse = (): void => {
    const newLignes: CaisseLigne[] = comptes57.map((l, i) => {
      const solde = soldeNet(l);
      return { id: nextIds.caisse + i, compte: l.numero_compte, designation: l.libelle_compte, soldeCompta: solde, pvCaisse: 0, ecart: solde };
    });
    setCaisseLignes(prev => [...prev, ...newLignes]);
    setNextIds(prev => ({ ...prev, caisse: prev.caisse + newLignes.length }));
    setSaved(false);
  };

  // --- CRUD Titres de placement ---
  const addTitre = (): void => { setTitreLignes(prev => [...prev, { id: nextIds.titre, designation: '', compte: '', valeurAcquisition: 0, valeurInventaire: 0, depreciationNecessaire: 0, depreciationBalance: 0, ecartDeprec: 0 }]); setNextIds(prev => ({ ...prev, titre: prev.titre + 1 })); setSaved(false); };
  const updateTitre = (id: number, field: keyof TitrePlacementLigne, value: string | number): void => { setTitreLignes(prev => prev.map(l => l.id === id ? { ...l, [field]: value } : l)); setSaved(false); };
  const removeTitre = (id: number): void => { setTitreLignes(prev => prev.filter(l => l.id !== id)); setSaved(false); };
  const autoPopulateTitres = (): void => {
    const newLignes: TitrePlacementLigne[] = comptes50.map((l, i) => {
      const valAcq = soldeNet(l);
      const deprec59 = comptes59.find(d => d.numero_compte === '59' + l.numero_compte.substring(2));
      const deprecBal = deprec59 ? soldeCrediteur(deprec59) : 0;
      return { id: nextIds.titre + i, designation: l.libelle_compte, compte: l.numero_compte, valeurAcquisition: valAcq, valeurInventaire: 0, depreciationNecessaire: 0, depreciationBalance: deprecBal, ecartDeprec: 0 };
    });
    setTitreLignes(prev => [...prev, ...newLignes]);
    setNextIds(prev => ({ ...prev, titre: prev.titre + newLignes.length }));
    setSaved(false);
  };

  // --- CRUD Devises ---
  const addDevise = (): void => { setDeviseLignes(prev => [...prev, { id: nextIds.dev, banque: '', devise: 'USD', soldeDevise: 0, coursHistorique: 0, valeurHistorique: 0, coursCloture: 0, valeurCloture: 0, ecartChange: 0 }]); setNextIds(prev => ({ ...prev, dev: prev.dev + 1 })); setSaved(false); };
  const updateDevise = (id: number, field: keyof DispoDeviseLigne, value: string | number): void => { setDeviseLignes(prev => prev.map(l => l.id === id ? { ...l, [field]: value } : l)); setSaved(false); };
  const removeDevise = (id: number): void => { setDeviseLignes(prev => prev.filter(l => l.id !== id)); setSaved(false); };

  // --- CRUD Circularisation bancaire ---
  const addCircular = (): void => { setCircularLignes(prev => [...prev, { id: nextIds.circ, banque: '', soldeCompte: 0, soldeConfirme: 0, ecart: 0, empruntsConfirmes: '', cautions: '', signatairesAutorises: '', commentaire: '' }]); setNextIds(prev => ({ ...prev, circ: prev.circ + 1 })); setSaved(false); };
  const updateCircular = (id: number, field: keyof CircularisationBancaireLigne, value: string | number): void => { setCircularLignes(prev => prev.map(l => l.id === id ? { ...l, [field]: value } : l)); setSaved(false); };
  const removeCircular = (id: number): void => { setCircularLignes(prev => prev.filter(l => l.id !== id)); setSaved(false); };
  const autoPopulateCircular = (): void => {
    const newLignes: CircularisationBancaireLigne[] = comptes52.map((l, i) => {
      const solde = soldeNet(l);
      return { id: nextIds.circ + i, banque: l.libelle_compte, soldeCompte: solde, soldeConfirme: 0, ecart: solde, empruntsConfirmes: '', cautions: '', signatairesAutorises: '', commentaire: '' };
    });
    setCircularLignes(prev => [...prev, ...newLignes]);
    setNextIds(prev => ({ ...prev, circ: prev.circ + newLignes.length }));
    setSaved(false);
  };

  // --- Calculs ---
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

  const caisseCalcs = caisseLignes.map(c => ({ ...c, ecart: c.soldeCompta - c.pvCaisse }));
  const totalSoldeCaisse = caisseCalcs.reduce((s, c) => s + c.soldeCompta, 0);
  const totalPvCaisse = caisseCalcs.reduce((s, c) => s + c.pvCaisse, 0);
  const totalEcartCaisse = caisseCalcs.reduce((s, c) => s + c.ecart, 0);

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

  const circularCalcs = circularLignes.map(c => ({ ...c, ecart: c.soldeCompte - c.soldeConfirme }));
  const totalSoldeCompteCirc = circularCalcs.reduce((s, c) => s + c.soldeCompte, 0);
  const totalSoldeConfirme = circularCalcs.reduce((s, c) => s + c.soldeConfirme, 0);
  const totalEcartCirc = circularCalcs.reduce((s, c) => s + c.ecart, 0);

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
  if (titreCalcs.length > 0 && Math.abs(totalEcartDeprec) > 0.5) {
    if (!odEcritures.some(od => od.source === 'Treso-C3')) {
      if (totalEcartDeprec > 0) {
        suggestions.push({ compteDebit: '679', libelleDebit: 'Charges provisionnées financières', compteCredit: '590', libelleCredit: 'Dépréciations titres de placement', montant: totalEcartDeprec, libelle: 'Dotation dépréciation titres de placement', source: 'Treso-C3' });
      } else {
        suggestions.push({ compteDebit: '590', libelleDebit: 'Dépréciations titres de placement', compteCredit: '779', libelleCredit: 'Reprises charges provisionnées financières', montant: Math.abs(totalEcartDeprec), libelle: 'Reprise dépréciation excédentaire titres de placement', source: 'Treso-C3' });
      }
    }
  }
  if (totalPertesChange > 0.5) {
    if (!odEcritures.some(od => od.source === 'Treso-C5-perte')) {
      suggestions.push({ compteDebit: '676', libelleDebit: 'Pertes de change', compteCredit: '521', libelleCredit: 'Banques', montant: totalPertesChange, libelle: 'Pertes de change sur disponibilités en devises', source: 'Treso-C5-perte' });
    }
  }
  if (totalGainsChange > 0.5) {
    if (!odEcritures.some(od => od.source === 'Treso-C5-gain')) {
      suggestions.push({ compteDebit: '521', libelleDebit: 'Banques', compteCredit: '776', libelleCredit: 'Gains de change', montant: totalGainsChange, libelle: 'Gains de change sur disponibilités en devises', source: 'Treso-C5-gain' });
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

      {caissesCrediTrices.length > 0 && (
        <div className="revision-objectif" style={{ background: '#fef2f2', borderLeft: '4px solid #ef4444' }}>
          <strong style={{ color: '#dc2626' }}>Alerte — Solde créditeur sur compte de caisse :</strong>{' '}
          {caissesCrediTrices.map(l => (
            <span key={l.numero_compte}> Compte <strong>{l.numero_compte}</strong> ({l.libelle_compte}) : solde créditeur de <strong>{fmt(soldeCrediteur(l))}</strong>. </span>
          ))}
          <br /><em style={{ color: '#dc2626' }}>Solde créditeur sur le compte caisse — présomption d'irrégularité (règle OHADA).</em>
        </div>
      )}

      {virNonSoldes.length > 0 && (
        <div className="revision-objectif" style={{ background: '#fffbeb', borderLeft: '4px solid #f59e0b' }}>
          <strong style={{ color: '#d97706' }}>Alerte — Virements internes non soldés :</strong>{' '}
          Les comptes de virements internes (58x) doivent être soldés en fin d'exercice.
          {virNonSoldes.map(v => (
            <span key={v.compte}> Compte <strong>{v.compte}</strong> : solde de <strong>{fmt(v.soldeN)}</strong>. </span>
          ))}
        </div>
      )}

      <RevisionTresoTable
        rapprochCalcs={rapprochCalcs} rapprochLignesLength={rapprochLignes.length}
        onAddRapproch={addRapproch} onUpdateRapproch={updateRapproch} onRemoveRapproch={removeRapproch} onAutoPopulateRapproch={autoPopulateRapproch}
        totalSoldeCompta={totalSoldeCompta} totalSoldeReleve={totalSoldeReleve} totalChequesNE={totalChequesNE}
        totalVirND={totalVirND} totalSoldeRecon={totalSoldeRecon} totalEcartRappr={totalEcartRappr} comptes52Length={comptes52.length}
        caisseCalcs={caisseCalcs} caisseLignesLength={caisseLignes.length}
        onAddCaisse={addCaisse} onUpdateCaisse={updateCaisse} onRemoveCaisse={removeCaisse} onAutoPopulateCaisse={autoPopulateCaisse}
        totalSoldeCaisse={totalSoldeCaisse} totalPvCaisse={totalPvCaisse} totalEcartCaisse={totalEcartCaisse} comptes57Length={comptes57.length}
        titreCalcs={titreCalcs} titreLignesLength={titreLignes.length}
        onAddTitre={addTitre} onUpdateTitre={updateTitre} onRemoveTitre={removeTitre} onAutoPopulateTitres={autoPopulateTitres}
        totalValAcq={totalValAcq} totalValInv={totalValInv} totalDeprecNec={totalDeprecNec} totalDeprecBal={totalDeprecBal}
        totalEcartDeprec={totalEcartDeprec} comptes50Length={comptes50.length}
        virInternes={virInternes} virNonSoldes={virNonSoldes}
        deviseCalcs={deviseCalcs} deviseLignesLength={deviseLignes.length}
        onAddDevise={addDevise} onUpdateDevise={updateDevise} onRemoveDevise={removeDevise}
        totalValHist={totalValHist} totalValClot={totalValClot} totalEcartChange={totalEcartChange}
        circularCalcs={circularCalcs} circularLignesLength={circularLignes.length}
        onAddCircular={addCircular} onUpdateCircular={updateCircular} onRemoveCircular={removeCircular} onAutoPopulateCircular={autoPopulateCircular}
        totalSoldeCompteCirc={totalSoldeCompteCirc} totalSoldeConfirme={totalSoldeConfirme} totalEcartCirc={totalEcartCirc}
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

export default RevisionTreso;
