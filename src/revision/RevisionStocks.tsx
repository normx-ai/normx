import { clientFetch } from '../lib/api';
import { api } from '../lib/apiEndpoints';
import React, { useState, useEffect } from 'react';
import { LuSave, LuChevronDown, LuChevronRight, LuClipboardList } from 'react-icons/lu';
import { BalanceLigne } from '../types';
import {
  ODEcriture, Suggestion, fmt,
  InvStockLigne, ValoLigne, VarLigne, EncoursRouteLigne, DeprecLigne, TRAVAUX_STOCKS,
  soldeNet, totalSoldeNet, totalSoldeCreditNet,
} from './revisionTypes';
import JournalOD from './JournalOD';
import FonctionnementCompte from './FonctionnementCompte';
import { Controle1Inventaire } from './stocks/Controle1Inventaire';
import { Controle2Valorisation } from './stocks/Controle2Valorisation';
import { Controle3Variations } from './stocks/Controle3Variations';
import { Controle4Encours } from './stocks/Controle4Encours';
import { Controle5Depreciation } from './stocks/Controle5Depreciation';

interface RevisionStocksProps {
  balanceN: BalanceLigne[];
  exerciceAnnee: number;
  entiteId: number;
  exerciceId: number;
}

function RevisionStocks({ balanceN, exerciceAnnee, entiteId, exerciceId }: RevisionStocksProps): React.ReactElement {
  const [invLignes, setInvLignes] = useState<InvStockLigne[]>([]);
  const [valoLignes, setValoLignes] = useState<ValoLigne[]>([]);
  const [encoursLignes, setEncoursLignes] = useState<EncoursRouteLigne[]>([]);
  const [deprecLignes, setDeprecLignes] = useState<DeprecLigne[]>([]);
  const [varEdit, setVarEdit] = useState<Record<string, { soldeN1: number; variation: number }>>({});
  const [nextIds, setNextIds] = useState({ inv: 1, valo: 1, enc: 1, deprec: 1 });
  const [saved, setSaved] = useState(false);
  const [odEcritures, setOdEcritures] = useState<ODEcriture[]>([]);
  const [nextOdId, setNextOdId] = useState(1);
  const [showTravaux, setShowTravaux] = useState(true);

  // Comptes de stocks (31x-38x) en balance
  const comptesStock = balanceN.filter(l => {
    const p2 = l.numero_compte.substring(0, 2);
    return p2 >= '31' && p2 <= '38';
  });
  const comptes39 = balanceN.filter(l => l.numero_compte.startsWith('39'));

  const totalStockBalance = totalSoldeNet(comptesStock);

  useEffect(() => { loadSaved(); }, [entiteId, exerciceId]);

  const loadSaved = (): void => {
    clientFetch(api.revision.onglet(entiteId, exerciceId, 'stocks'))
      .then(r => { if (r.ok) return r.json(); throw new Error(); })
      .then((data: { invLignes?: InvStockLigne[]; valoLignes?: ValoLigne[]; encoursLignes?: EncoursRouteLigne[]; deprecLignes?: DeprecLigne[]; varEdit?: Record<string, { soldeN1: number; variation: number }>; odEcritures?: ODEcriture[] }) => {
        if (data.invLignes) { setInvLignes(data.invLignes); if (data.invLignes.length > 0) setNextIds(prev => ({ ...prev, inv: Math.max(...data.invLignes!.map((a: InvStockLigne) => a.id)) + 1 })); }
        if (data.valoLignes) { setValoLignes(data.valoLignes); if (data.valoLignes.length > 0) setNextIds(prev => ({ ...prev, valo: Math.max(...data.valoLignes!.map((a: ValoLigne) => a.id)) + 1 })); }
        if (data.encoursLignes) { setEncoursLignes(data.encoursLignes); if (data.encoursLignes.length > 0) setNextIds(prev => ({ ...prev, enc: Math.max(...data.encoursLignes!.map((a: EncoursRouteLigne) => a.id)) + 1 })); }
        if (data.deprecLignes) { setDeprecLignes(data.deprecLignes); if (data.deprecLignes.length > 0) setNextIds(prev => ({ ...prev, deprec: Math.max(...data.deprecLignes!.map((a: DeprecLigne) => a.id)) + 1 })); }
        if (data.varEdit) setVarEdit(data.varEdit);
        if (data.odEcritures) { setOdEcritures(data.odEcritures); if (data.odEcritures.length > 0) setNextOdId(Math.max(...data.odEcritures.map((e: ODEcriture) => e.id)) + 1); }
      })
      .catch(() => {});
  };

  const handleSave = async (): Promise<void> => {
    try {
      const res = await clientFetch(api.revision.onglet(entiteId, exerciceId, 'stocks'), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ invLignes, valoLignes, varEdit, encoursLignes, deprecLignes, odEcritures }),
      });
      if (!res.ok) throw new Error('Erreur sauvegarde');
      setSaved(true);
    } catch {
      setSaved(false);
      alert('Erreur lors de la sauvegarde. Reessayez.');
    }
  };

  // --- CRUD helpers ---
  const addInv = (): void => { setInvLignes(prev => [...prev, { id: nextIds.inv, designation: '', compte: '', coutUnitaire: 0, quantitePV: 0 }]); setNextIds(prev => ({ ...prev, inv: prev.inv + 1 })); setSaved(false); };
  const updateInv = (id: number, field: keyof InvStockLigne, value: string | number): void => { setInvLignes(prev => prev.map(l => l.id === id ? { ...l, [field]: value } : l)); setSaved(false); };
  const removeInv = (id: number): void => { setInvLignes(prev => prev.filter(l => l.id !== id)); setSaved(false); };

  const addValo = (): void => { setValoLignes(prev => [...prev, { id: nextIds.valo, reference: '', designation: '', quantite: 0, facturePrincipale: 0, transport: 0, douane: 0, autresCouts: 0, coutSysteme: 0 }]); setNextIds(prev => ({ ...prev, valo: prev.valo + 1 })); setSaved(false); };
  const updateValo = (id: number, field: keyof ValoLigne, value: string | number): void => { setValoLignes(prev => prev.map(l => l.id === id ? { ...l, [field]: value } : l)); setSaved(false); };
  const removeValo = (id: number): void => { setValoLignes(prev => prev.filter(l => l.id !== id)); setSaved(false); };

  const addEncours = (): void => { setEncoursLignes(prev => [...prev, { id: nextIds.enc, dossierImport: '', fournisseur: '', facturePrincipale: 0, transport: 0, douane: 0, debours: 0 }]); setNextIds(prev => ({ ...prev, enc: prev.enc + 1 })); setSaved(false); };
  const updateEncours = (id: number, field: keyof EncoursRouteLigne, value: string | number): void => { setEncoursLignes(prev => prev.map(l => l.id === id ? { ...l, [field]: value } : l)); setSaved(false); };
  const removeEncours = (id: number): void => { setEncoursLignes(prev => prev.filter(l => l.id !== id)); setSaved(false); };

  const addDeprec = (): void => { setDeprecLignes(prev => [...prev, { id: nextIds.deprec, designation: '', compte: '', quantite: 0, coutUnitaire: 0, valeurActuelle: 0, motif: '' }]); setNextIds(prev => ({ ...prev, deprec: prev.deprec + 1 })); setSaved(false); };
  const updateDeprec = (id: number, field: keyof DeprecLigne, value: string | number): void => { setDeprecLignes(prev => prev.map(l => l.id === id ? { ...l, [field]: value } : l)); setSaved(false); };
  const removeDeprec = (id: number): void => { setDeprecLignes(prev => prev.filter(l => l.id !== id)); setSaved(false); };

  // --- Contrôle 1 calculs ---
  const invCalcs = invLignes.map(l => {
    const valeurPV = l.coutUnitaire * l.quantitePV;
    return { ...l, valeurPV };
  });
  const totalValeurPV = invCalcs.reduce((s, l) => s + l.valeurPV, 0);
  const ecartInvBalance = totalValeurPV - totalStockBalance;

  // --- Contrôle 2 calculs ---
  const valoCalcs = valoLignes.map(v => {
    const coutRecalcule = v.facturePrincipale + v.transport + v.douane + v.autresCouts;
    const coutUnitRecalcule = v.quantite > 0 ? coutRecalcule / v.quantite : 0;
    const coutUnitSysteme = v.quantite > 0 ? v.coutSysteme / v.quantite : 0;
    const ecart = coutUnitSysteme - coutUnitRecalcule;
    return { ...v, coutRecalcule, coutUnitRecalcule, coutUnitSysteme, ecart };
  });

  // --- Contrôle 3 : Variations bilantielles auto depuis balance ---
  const varLignes: VarLigne[] = comptesStock.map(l => {
    const soldeN = soldeNet(l);
    const soldeN1Auto = (parseFloat(String(l.si_debit ?? 0)) || 0) - (parseFloat(String(l.si_credit ?? 0)) || 0);

    const edit = varEdit[l.numero_compte];
    const soldeN1 = edit?.soldeN1 ?? soldeN1Auto;
    const variation = edit?.variation ?? 0;

    return {
      compte: l.numero_compte,
      designation: l.libelle_compte,
      soldeN1,
      variation603ou73: variation,
      soldeNCalc: soldeN1 + variation,
      soldeNBalance: soldeN,
    };
  });

  const totalVarN1 = varLignes.reduce((s, l) => s + l.soldeN1, 0);
  const totalVarVar = varLignes.reduce((s, l) => s + l.variation603ou73, 0);
  const totalVarCalc = varLignes.reduce((s, l) => s + l.soldeNCalc, 0);
  const totalVarBal = varLignes.reduce((s, l) => s + l.soldeNBalance, 0);
  const totalVarEcart = totalVarBal - totalVarCalc;

  // --- Contrôle 4 calculs ---
  const encoursCalcs = encoursLignes.map(e => {
    const totalRecalcule = e.facturePrincipale + e.transport + e.douane + e.debours;
    return { ...e, totalRecalcule };
  });
  const totalEncours38Balance = totalSoldeNet(balanceN.filter(l => l.numero_compte.startsWith('38')));
  const totalEncoursRecalcule = encoursCalcs.reduce((s, e) => s + e.totalRecalcule, 0);
  const ecartEncours = totalEncoursRecalcule - totalEncours38Balance;

  // --- Contrôle 5 calculs ---
  const deprecCalcs = deprecLignes.map(d => {
    const valeurStock = d.quantite * d.coutUnitaire;
    const depreciation = Math.max(0, valeurStock - d.valeurActuelle);
    return { ...d, valeurStock, depreciation };
  });
  const totalDeprec = deprecCalcs.reduce((s, d) => s + d.depreciation, 0);
  const totalDeprec39Balance = totalSoldeCreditNet(comptes39);
  const ecartDeprec = totalDeprec - totalDeprec39Balance;

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

  // Suggestion dépréciation
  if (deprecLignes.length > 0 && Math.abs(ecartDeprec) > 0.5) {
    const dejaPropose = odEcritures.some(od => od.source === 'Stock-C5');
    if (!dejaPropose) {
      if (ecartDeprec > 0) {
        suggestions.push({
          compteDebit: '6593', libelleDebit: 'Charges provisionnées sur stocks',
          compteCredit: '39', libelleCredit: 'Dépréciations des stocks',
          montant: ecartDeprec, libelle: 'Complément de dépréciation des stocks',
          source: 'Stock-C5',
        });
      } else {
        suggestions.push({
          compteDebit: '39', libelleDebit: 'Dépréciations des stocks',
          compteCredit: '7593', libelleCredit: 'Reprises charges provisionnées sur stocks',
          montant: Math.abs(ecartDeprec), libelle: 'Reprise de dépréciation excédentaire',
          source: 'Stock-C5',
        });
      }
    }
  }

  return (
    <div className="revision-kp">
      <div className="revision-section-header">
        <h3>Stocks</h3>
        <button className="revision-save-btn" onClick={handleSave}>
          <LuSave size={14} /> {saved ? 'Sauvegardé' : 'Sauvegarder'}
        </button>
      </div>

      <div className="revision-objectif">
        <strong>Objectif :</strong> S'assurer de l'exhaustivité, de la réalité et de la correcte évaluation des stocks, ainsi que de la cohérence des variations de stocks avec le compte de résultat (603x pour biens achetés, 73x pour biens produits) et de la correcte comptabilisation des dépréciations (D 6593 / C 39x).
      </div>

      <div className="revision-travaux">
        <button className="revision-travaux-toggle" onClick={() => setShowTravaux(!showTravaux)}>
          {showTravaux ? <LuChevronDown size={14} /> : <LuChevronRight size={14} />}
          <LuClipboardList size={14} />
          <span>Travaux à effectuer</span>
        </button>
        {showTravaux && (
          <ul className="revision-travaux-list">
            {TRAVAUX_STOCKS.map((t, i) => <li key={i}>{t}</li>)}
          </ul>
        )}
      </div>

      <FonctionnementCompte prefixes={['31','32','33','34','35','36','37','38','39']} titre="Stocks" />

      {/* Note si comptes stocks en balance */}
      {comptesStock.length > 0 && invLignes.length === 0 && (
        <div className="revision-objectif">
          <strong>Information :</strong> La balance contient {comptesStock.length} compte{comptesStock.length > 1 ? 's' : ''} de stocks (31x-38x) pour un solde total de <strong>{fmt(totalStockBalance)}</strong>.
          {comptes39.length > 0 && <> Dépréciations (39x) : <strong>{fmt(totalDeprec39Balance)}</strong>.</>}
          <ul>
            {comptesStock.map(l => (
              <li key={l.numero_compte}>
                <strong>{l.numero_compte}</strong> — {l.libelle_compte} : {fmt(soldeNet(l))}
              </li>
            ))}
          </ul>
          Complétez les contrôles ci-dessous pour vérifier la cohérence.
        </div>
      )}

      <Controle1Inventaire
        invCalcs={invCalcs}
        totalValeurPV={totalValeurPV}
        totalStockBalance={totalStockBalance}
        ecartInvBalance={ecartInvBalance}
        addInv={addInv}
        updateInv={updateInv}
        removeInv={removeInv}
      />

      <Controle2Valorisation
        valoLignes={valoLignes}
        valoCalcs={valoCalcs}
        addValo={addValo}
        updateValo={updateValo}
        removeValo={removeValo}
      />

      <Controle3Variations
        varLignes={varLignes}
        totalVarN1={totalVarN1}
        totalVarVar={totalVarVar}
        totalVarCalc={totalVarCalc}
        totalVarBal={totalVarBal}
        totalVarEcart={totalVarEcart}
        setVarEdit={setVarEdit}
        setSaved={setSaved}
      />

      <Controle4Encours
        encoursLignes={encoursLignes}
        encoursCalcs={encoursCalcs}
        totalEncoursRecalcule={totalEncoursRecalcule}
        totalEncours38Balance={totalEncours38Balance}
        ecartEncours={ecartEncours}
        addEncours={addEncours}
        updateEncours={updateEncours}
        removeEncours={removeEncours}
      />

      <Controle5Depreciation
        deprecLignes={deprecLignes}
        deprecCalcs={deprecCalcs}
        totalDeprec={totalDeprec}
        totalDeprec39Balance={totalDeprec39Balance}
        ecartDeprec={ecartDeprec}
        addDeprec={addDeprec}
        updateDeprec={updateDeprec}
        removeDeprec={removeDeprec}
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

export default RevisionStocks;
