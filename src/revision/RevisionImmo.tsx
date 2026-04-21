import { clientFetch } from '../lib/api';
import { api } from '../lib/apiEndpoints';
import React, { useState, useEffect } from 'react';
import { LuSave, LuChevronDown, LuChevronRight, LuClipboardList } from 'react-icons/lu';
import { BalanceLigne } from '../types';
import {
  ODEcriture, Suggestion, fmt, soldeNet, totalSoldeCreditNet,
  InvLigne, RapprochLigne, EncoursLigne, SortieLigne, AmortLigne, ChargeImmoLigne,
  TRAVAUX_IMMO,
} from './revisionTypes';
import JournalOD from './JournalOD';
import FonctionnementCompte from './FonctionnementCompte';
import { Controle1Inventaire } from './immo/Controle1Inventaire';
import { Controle2Rapproch } from './immo/Controle2Rapproch';
import { Controle3Encours } from './immo/Controle3Encours';
import { Controle4Sorties } from './immo/Controle4Sorties';
import { Controle5Amort } from './immo/Controle5Amort';
import { Controle6ChargesImmo } from './immo/Controle6ChargesImmo';

interface RevisionImmoProps {
  balanceN: BalanceLigne[];
  exerciceAnnee: number;
  entiteId: number;
  exerciceId: number;
}

function RevisionImmo({ balanceN, exerciceAnnee, entiteId, exerciceId }: RevisionImmoProps): React.ReactElement {
  const [invLignes, setInvLignes] = useState<InvLigne[]>([]);
  const [encoursLignes, setEncoursLignes] = useState<EncoursLigne[]>([]);
  const [sortieLignes, setSortieLignes] = useState<SortieLigne[]>([]);
  const [amortLignes, setAmortLignes] = useState<AmortLigne[]>([]);
  const [chargeImmoLignes, setChargeImmoLignes] = useState<ChargeImmoLigne[]>([]);
  const [rapprochEdit, setRapprochEdit] = useState<Record<string, number>>({});
  const [nextIds, setNextIds] = useState({ inv: 1, enc: 1, sort: 1, amort: 1, charge: 1 });
  const [saved, setSaved] = useState(false);
  const [odEcritures, setOdEcritures] = useState<ODEcriture[]>([]);
  const [nextOdId, setNextOdId] = useState(1);
  const [showTravaux, setShowTravaux] = useState(true);

  const comptesImmo = balanceN.filter(l => {
    const p2 = l.numero_compte.substring(0, 2);
    return p2 >= '21' && p2 <= '27';
  });
  const comptesAmort = balanceN.filter(l => l.numero_compte.startsWith('28'));
  const comptesProv29 = balanceN.filter(l => l.numero_compte.startsWith('29'));

  useEffect(() => { loadSaved(); }, [entiteId, exerciceId]);

  const loadSaved = (): void => {
    clientFetch(api.revision.onglet(entiteId, exerciceId, 'immo'))
      .then(r => { if (r.ok) return r.json(); throw new Error(); })
      .then((data: { invLignes?: InvLigne[]; encoursLignes?: EncoursLigne[]; sortieLignes?: SortieLigne[]; amortLignes?: AmortLigne[]; chargeImmoLignes?: ChargeImmoLigne[]; rapprochEdit?: Record<string, number>; odEcritures?: ODEcriture[] }) => {
        if (data.invLignes) { setInvLignes(data.invLignes); if (data.invLignes.length > 0) setNextIds(prev => ({ ...prev, inv: Math.max(...data.invLignes!.map((a: InvLigne) => a.id)) + 1 })); }
        if (data.encoursLignes) { setEncoursLignes(data.encoursLignes); if (data.encoursLignes.length > 0) setNextIds(prev => ({ ...prev, enc: Math.max(...data.encoursLignes!.map((a: EncoursLigne) => a.id)) + 1 })); }
        if (data.sortieLignes) { setSortieLignes(data.sortieLignes); if (data.sortieLignes.length > 0) setNextIds(prev => ({ ...prev, sort: Math.max(...data.sortieLignes!.map((a: SortieLigne) => a.id)) + 1 })); }
        if (data.amortLignes) { setAmortLignes(data.amortLignes); if (data.amortLignes.length > 0) setNextIds(prev => ({ ...prev, amort: Math.max(...data.amortLignes!.map((a: AmortLigne) => a.id)) + 1 })); }
        if (data.chargeImmoLignes) { setChargeImmoLignes(data.chargeImmoLignes); if (data.chargeImmoLignes.length > 0) setNextIds(prev => ({ ...prev, charge: Math.max(...data.chargeImmoLignes!.map((a: ChargeImmoLigne) => a.id)) + 1 })); }
        if (data.rapprochEdit) setRapprochEdit(data.rapprochEdit);
        if (data.odEcritures) { setOdEcritures(data.odEcritures); if (data.odEcritures.length > 0) setNextOdId(Math.max(...data.odEcritures.map((e: ODEcriture) => e.id)) + 1); }
      })
      .catch(() => {});
  };

  const handleSave = async (): Promise<void> => {
    try {
      const res = await clientFetch(api.revision.onglet(entiteId, exerciceId, 'immo'), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ invLignes, rapprochEdit, encoursLignes, sortieLignes, amortLignes, chargeImmoLignes, odEcritures }),
      });
      if (!res.ok) throw new Error('Erreur sauvegarde');
      setSaved(true);
    } catch {
      setSaved(false);
      alert('Erreur lors de la sauvegarde. Reessayez.');
    }
  };

  // --- CRUD ---
  const addInv = (): void => { setInvLignes(prev => [...prev, { id: nextIds.inv, idImmo: '', designation: '', nombre: 0, valeurFichier: 0, pvInventaire: 0 }]); setNextIds(prev => ({ ...prev, inv: prev.inv + 1 })); setSaved(false); };
  const updateInv = (id: number, field: keyof InvLigne, value: string | number): void => { setInvLignes(prev => prev.map(l => l.id === id ? { ...l, [field]: value } : l)); setSaved(false); };
  const removeInv = (id: number): void => { setInvLignes(prev => prev.filter(l => l.id !== id)); setSaved(false); };

  const addEncours = (): void => { setEncoursLignes(prev => [...prev, { id: nextIds.enc, projet: '', designation: '', fournisseur: '', numFacture: '', dateFacture: '', montant: 0 }]); setNextIds(prev => ({ ...prev, enc: prev.enc + 1 })); setSaved(false); };
  const updateEncours = (id: number, field: keyof EncoursLigne, value: string | number): void => { setEncoursLignes(prev => prev.map(l => l.id === id ? { ...l, [field]: value } : l)); setSaved(false); };
  const removeEncours = (id: number): void => { setEncoursLignes(prev => prev.filter(l => l.id !== id)); setSaved(false); };

  const addSortie = (): void => { setSortieLignes(prev => [...prev, { id: nextIds.sort, numFichier: '', designation: '', natureSortie: 'Cession', valeurBrute: 0, cumulAmort: 0, prixCession: 0, docJustificatif: '' }]); setNextIds(prev => ({ ...prev, sort: prev.sort + 1 })); setSaved(false); };
  const updateSortie = (id: number, field: keyof SortieLigne, value: string | number): void => { setSortieLignes(prev => prev.map(l => l.id === id ? { ...l, [field]: value } : l)); setSaved(false); };
  const removeSortie = (id: number): void => { setSortieLignes(prev => prev.filter(l => l.id !== id)); setSaved(false); };

  const addAmort = (): void => { setAmortLignes(prev => [...prev, { id: nextIds.amort, numFichier: '', designation: '', dateMiseEnService: '', natureImmo: '', dureeUtilite: 5, baseAmortissable: 0 }]); setNextIds(prev => ({ ...prev, amort: prev.amort + 1 })); setSaved(false); };
  const updateAmort = (id: number, field: keyof AmortLigne, value: string | number): void => { setAmortLignes(prev => prev.map(l => l.id === id ? { ...l, [field]: value } : l)); setSaved(false); };
  const removeAmort = (id: number): void => { setAmortLignes(prev => prev.filter(l => l.id !== id)); setSaved(false); };

  const addCharge = (): void => { setChargeImmoLignes(prev => [...prev, { id: nextIds.charge, compte: '', designation: '', natureDepense: '', montant: 0, frequence: '', conclusion: 'ne_pas_immobiliser' }]); setNextIds(prev => ({ ...prev, charge: prev.charge + 1 })); setSaved(false); };
  const updateCharge = (id: number, field: keyof ChargeImmoLigne, value: string | number): void => { setChargeImmoLignes(prev => prev.map(l => l.id === id ? { ...l, [field]: value } : l)); setSaved(false); };
  const removeCharge = (id: number): void => { setChargeImmoLignes(prev => prev.filter(l => l.id !== id)); setSaved(false); };

  // --- Contrôle 2 : rapprochement auto ---
  const rapprochLignes: RapprochLigne[] = comptesImmo.map(l => ({
    compte: l.numero_compte,
    designation: l.libelle_compte,
    fichierImmo: rapprochEdit[l.numero_compte] ?? 0,
    balanceGenerale: soldeNet(l),
  }));

  const totalFichierImmo = rapprochLignes.reduce((s, l) => s + l.fichierImmo, 0);
  const totalBalanceImmo = rapprochLignes.reduce((s, l) => s + l.balanceGenerale, 0);
  const totalEcartRapproch = totalFichierImmo - totalBalanceImmo;

  // --- Contrôle 5 : amortissements ---
  const dateCloture = new Date(`${exerciceAnnee}-12-31`);
  const amortCalcs = amortLignes.map(a => {
    const taux = a.dureeUtilite > 0 ? 1 / a.dureeUtilite : 0;
    const dateMES = a.dateMiseEnService ? new Date(a.dateMiseEnService) : null;
    const joursEcoules = dateMES ? Math.max(0, (dateCloture.getTime() - dateMES.getTime()) / (1000 * 60 * 60 * 24)) : 0;
    const joursTotal = a.dureeUtilite * 365;
    const cumulAmortCalc = joursTotal > 0 ? a.baseAmortissable * taux * joursEcoules / 365 : 0;
    const cumulFinal = Math.min(cumulAmortCalc, a.baseAmortissable);
    return { ...a, taux, cumulAmortCalc: cumulFinal };
  });

  const totalBaseAmort = amortLignes.reduce((s, a) => s + a.baseAmortissable, 0);
  const totalCumulAmortCalc = amortCalcs.reduce((s, a) => s + a.cumulAmortCalc, 0);
  const totalAmort28Balance = totalSoldeCreditNet(comptesAmort);
  const ecartAmort = totalCumulAmortCalc - totalAmort28Balance;

  // --- Contrôle 4 : cessions ---
  const sortieCalcs = sortieLignes.map(s => {
    const vnc = s.valeurBrute - s.cumulAmort;
    const plusMoinsValue = s.prixCession - vnc;
    return { ...s, vnc, plusMoinsValue };
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

  if (rapprochLignes.length > 0 && Math.abs(totalEcartRapproch) > 0.5 && !odEcritures.some(od => od.source === 'Immo-C2')) {
    suggestions.push({
      compteDebit: totalEcartRapproch > 0 ? '471000' : comptesImmo[0]?.numero_compte || '240000',
      libelleDebit: totalEcartRapproch > 0 ? 'Charges à répartir' : 'Immobilisation',
      compteCredit: totalEcartRapproch > 0 ? comptesImmo[0]?.numero_compte || '240000' : '471000',
      libelleCredit: totalEcartRapproch > 0 ? 'Immobilisation' : 'Charges à répartir',
      montant: Math.abs(totalEcartRapproch),
      libelle: 'Écart fichier immo vs balance — à investiguer',
      source: 'Immo-C2',
    });
  }

  if (amortLignes.length > 0 && Math.abs(ecartAmort) > 0.5 && !odEcritures.some(od => od.source === 'Immo-C5')) {
    if (ecartAmort > 0) {
      suggestions.push({
        compteDebit: '6813', libelleDebit: 'Dotations aux amortissements des immob. corporelles',
        compteCredit: '28', libelleCredit: 'Amortissements des immobilisations',
        montant: ecartAmort, libelle: 'Complément de dotation aux amortissements',
        source: 'Immo-C5',
      });
    } else {
      suggestions.push({
        compteDebit: '28', libelleDebit: 'Amortissements des immobilisations',
        compteCredit: '798', libelleCredit: "Reprises d'amortissements",
        montant: Math.abs(ecartAmort), libelle: "Reprise d'amortissement excédentaire",
        source: 'Immo-C5',
      });
    }
  }

  return (
    <div className="revision-kp">
      <div className="revision-section-header">
        <h3>Immobilisations</h3>
        <button className="revision-save-btn" onClick={handleSave}>
          <LuSave size={14} /> {saved ? 'Sauvegardé' : 'Sauvegarder'}
        </button>
      </div>

      <div className="revision-objectif">
        <strong>Objectif :</strong> S'assurer de l'exhaustivité, de la réalité et de la correcte évaluation des immobilisations inscrites au bilan, ainsi que du bon calcul des amortissements (comptes 681x) et de la correcte comptabilisation des cessions (comptes 81/82 HAO ou 654/754 AO).
      </div>

      <div className="revision-travaux">
        <button className="revision-travaux-toggle" onClick={() => setShowTravaux(!showTravaux)}>
          {showTravaux ? <LuChevronDown size={14} /> : <LuChevronRight size={14} />}
          <LuClipboardList size={14} />
          <span>Travaux à effectuer</span>
        </button>
        {showTravaux && (
          <ul className="revision-travaux-list">
            {TRAVAUX_IMMO.map((t, i) => <li key={i}>{t}</li>)}
          </ul>
        )}
      </div>

      <FonctionnementCompte prefixes={['20','21','22','23','24','25','26','27','28','29']} titre="Immobilisations" />

      {comptesImmo.length > 0 && invLignes.length === 0 && rapprochLignes.every(l => l.fichierImmo === 0) && (
        <div className="revision-objectif">
          <strong>Information :</strong> La balance contient {comptesImmo.length} compte{comptesImmo.length > 1 ? 's' : ''} d'immobilisations (21x-27x) pour une valeur brute totale de <strong>{fmt(totalBalanceImmo)}</strong>.
          {comptesAmort.length > 0 && <> Amortissements (28x) : <strong>{fmt(totalAmort28Balance)}</strong>.</>}
          {comptesProv29.length > 0 && <> Provisions pour dépréciation (29x) : <strong>{fmt(totalSoldeCreditNet(comptesProv29))}</strong>.</>}
          <br />Complétez les contrôles ci-dessous pour vérifier la cohérence avec le fichier des immobilisations.
        </div>
      )}

      <Controle1Inventaire invLignes={invLignes} addInv={addInv} updateInv={updateInv} removeInv={removeInv} />

      <Controle2Rapproch
        rapprochLignes={rapprochLignes}
        totalFichierImmo={totalFichierImmo}
        totalBalanceImmo={totalBalanceImmo}
        totalEcartRapproch={totalEcartRapproch}
        setRapprochEdit={setRapprochEdit}
        setSaved={setSaved}
      />

      <Controle3Encours encoursLignes={encoursLignes} addEncours={addEncours} updateEncours={updateEncours} removeEncours={removeEncours} />

      <Controle4Sorties sortieLignes={sortieLignes} sortieCalcs={sortieCalcs} addSortie={addSortie} updateSortie={updateSortie} removeSortie={removeSortie} />

      <Controle5Amort
        amortLignes={amortLignes}
        amortCalcs={amortCalcs}
        totalBaseAmort={totalBaseAmort}
        totalCumulAmortCalc={totalCumulAmortCalc}
        totalAmort28Balance={totalAmort28Balance}
        ecartAmort={ecartAmort}
        addAmort={addAmort}
        updateAmort={updateAmort}
        removeAmort={removeAmort}
      />

      <Controle6ChargesImmo chargeImmoLignes={chargeImmoLignes} addCharge={addCharge} updateCharge={updateCharge} removeCharge={removeCharge} />

      <JournalOD suggestions={suggestions} odEcritures={odEcritures} onAddOd={addOdEcriture} onUpdateOd={updateOd} onRemoveOd={removeOd} />
    </div>
  );
}

export default RevisionImmo;
