import React, { useState, useEffect } from 'react';
import { LuSave, LuChevronDown, LuChevronRight, LuClipboardList, LuPlus, LuTrash2 } from 'react-icons/lu';
import { BalanceLigne } from '../types';
import { ODEcriture, Suggestion, fmt, fmtInput, parseInputValue } from './revisionTypes';
import JournalOD from './JournalOD';

interface RevisionClientsProps {
  balanceN: BalanceLigne[];
  exerciceAnnee: number;
  entiteId: number;
  exerciceId: number;
}

// Contrôle 1 : Recouvrabilité des créances
interface RecouvLigne {
  id: number;
  codeClient: string;
  nomClient: string;
  balanceAux: number;
  montantReconnu: number;
  reconnaissanceSignee: string;
}

// Contrôle 2 : Créances douteuses
interface CreanceDouteuseLigne {
  id: number;
  codeClient: string;
  nomClient: string;
  soldeN1Creance: number;
  nouvellesCreances: number;
  paiements: number;
  soldeN1Deprec: number;
  dotations: number;
  reprises: number;
}

// Contrôle 3 : Cohérence variations dépréciations bilan/résultat (auto depuis balance)
interface DeprecVarLigne {
  compte: string;
  libelle: string;
  soldeN1: number;
  dotations6594: number;
  reprises7594: number;
  soldeNCalc: number;
  soldeNBalance: number;
}

// Contrôle 4 : Créances en devises
interface CreanceDeviseLigne {
  id: number;
  codeClient: string;
  nomClient: string;
  monnaie: string;
  valeurDevise: number;
  valeurInitialeFCFA: number;
  parite3112: number;
}

// Contrôle 5 : Circularisation des clients
interface CircularLigne {
  id: number;
  codeClient: string;
  nomClient: string;
  balanceAux: number;
  montantReconnu: number;
  reconnaissanceSignee: string;
  commentaire: string;
}

// Contrôle 6 : Produits à recevoir (418)
interface ProdRecevoirLigne {
  compte: string;
  designation: string;
  soldeN: number;
  soldeN1: number;
  commentaire: string;
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
  const [circularLignes, setCircularLignes] = useState<CircularLigne[]>([]);
  const [prodRecevoirEdit, setProdRecevoirEdit] = useState<Record<string, { commentaire: string }>>({});
  const [nextIds, setNextIds] = useState({ recouv: 1, dout: 1, dev: 1, circ: 1 });
  const [saved, setSaved] = useState(false);
  const [odEcritures, setOdEcritures] = useState<ODEcriture[]>([]);
  const [nextOdId, setNextOdId] = useState(1);
  const [showTravaux, setShowTravaux] = useState(true);

  // Comptes 41x (clients) en balance
  const comptes41 = balanceN.filter(l => l.numero_compte.startsWith('41'));
  // Comptes 411 (clients — balance auxiliaire pour circularisation)
  const comptes411 = balanceN.filter(l => l.numero_compte.startsWith('411'));
  // Comptes 416 (créances douteuses)
  const comptes416 = balanceN.filter(l => l.numero_compte.startsWith('416'));
  // Comptes 491 (dépréciations clients)
  const comptes491 = balanceN.filter(l => l.numero_compte.startsWith('491'));
  // Comptes 4181 (factures à établir)
  const comptes4181 = balanceN.filter(l => l.numero_compte.startsWith('4181'));
  // Comptes 4191 (avances reçues)
  const comptes4191 = balanceN.filter(l => l.numero_compte.startsWith('4191'));
  // Comptes 418 (produits à recevoir)
  const comptes418 = balanceN.filter(l => l.numero_compte.startsWith('418'));

  const totalClient41Balance = comptes41.reduce((s, l) =>
    s + ((parseFloat(String(l.solde_debiteur)) || 0) - (parseFloat(String(l.solde_crediteur)) || 0)), 0);
  const totalDeprec491Balance = comptes491.reduce((s, l) =>
    s + ((parseFloat(String(l.solde_crediteur)) || 0) - (parseFloat(String(l.solde_debiteur)) || 0)), 0);

  useEffect(() => { loadSaved(); }, [entiteId, exerciceId]);

  const loadSaved = (): void => {
    fetch(`/api/revision/${entiteId}/${exerciceId}/clients`)
      .then(r => { if (r.ok) return r.json(); throw new Error(); })
      .then((data: any) => {
        if (data.recouvLignes?.length > 0) { setRecouvLignes(data.recouvLignes); setNextIds(prev => ({ ...prev, recouv: Math.max(...data.recouvLignes.map((a: RecouvLigne) => a.id)) + 1 })); }
        if (data.douteuseLignes?.length > 0) { setDouteuseLignes(data.douteuseLignes); setNextIds(prev => ({ ...prev, dout: Math.max(...data.douteuseLignes.map((a: CreanceDouteuseLigne) => a.id)) + 1 })); }
        if (data.deprecEdit) setDeprecEdit(data.deprecEdit);
        if (data.deviseLignes?.length > 0) { setDeviseLignes(data.deviseLignes); setNextIds(prev => ({ ...prev, dev: Math.max(...data.deviseLignes.map((a: CreanceDeviseLigne) => a.id)) + 1 })); }
        if (data.circularLignes?.length > 0) { setCircularLignes(data.circularLignes); setNextIds(prev => ({ ...prev, circ: Math.max(...data.circularLignes.map((a: CircularLigne) => a.id)) + 1 })); }
        if (data.prodRecevoirEdit) setProdRecevoirEdit(data.prodRecevoirEdit);
        if (data.odEcritures?.length > 0) { setOdEcritures(data.odEcritures); setNextOdId(Math.max(...data.odEcritures.map((e: ODEcriture) => e.id)) + 1); }
      })
      .catch(() => {});
  };

  const handleSave = async (): Promise<void> => {
    try {
      await fetch(`/api/revision/${entiteId}/${exerciceId}/clients`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recouvLignes, douteuseLignes, deprecEdit, deviseLignes, circularLignes, prodRecevoirEdit, odEcritures }),
      });
      setSaved(true);
    } catch { /* silently */ }
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

  // --- CRUD Contrôle 5 : Circularisation ---
  const addCircular = (): void => { setCircularLignes(prev => [...prev, { id: nextIds.circ, codeClient: '', nomClient: '', balanceAux: 0, montantReconnu: 0, reconnaissanceSignee: 'Non', commentaire: '' }]); setNextIds(prev => ({ ...prev, circ: prev.circ + 1 })); setSaved(false); };
  const autoPopulateCircular = (): void => {
    if (comptes411.length === 0) return;
    let idCounter = nextIds.circ;
    const newLignes: CircularLigne[] = comptes411.map(l => {
      const solde = (parseFloat(String(l.solde_debiteur)) || 0) - (parseFloat(String(l.solde_crediteur)) || 0);
      const ligne: CircularLigne = { id: idCounter, codeClient: l.numero_compte, nomClient: l.libelle_compte, balanceAux: solde, montantReconnu: 0, reconnaissanceSignee: 'Non', commentaire: '' };
      idCounter++;
      return ligne;
    });
    setCircularLignes(prev => [...prev, ...newLignes]);
    setNextIds(prev => ({ ...prev, circ: idCounter }));
    setSaved(false);
  };
  const updateCircular = (id: number, field: keyof CircularLigne, value: string | number): void => { setCircularLignes(prev => prev.map(l => l.id === id ? { ...l, [field]: value } : l)); setSaved(false); };
  const removeCircular = (id: number): void => { setCircularLignes(prev => prev.filter(l => l.id !== id)); setSaved(false); };

  // --- Contrôle 1 calculs ---
  const totalBalAux = recouvLignes.reduce((s, l) => s + l.balanceAux, 0);
  const totalReconnu = recouvLignes.reduce((s, l) => s + l.montantReconnu, 0);
  const totalEcartRecouv = totalReconnu - totalBalAux;

  // --- Contrôle 2 calculs ---
  const douteuseCalcs = douteuseLignes.map(d => {
    const soldeNCreance = d.soldeN1Creance + d.nouvellesCreances - d.paiements;
    const soldeNDeprec = d.soldeN1Deprec + d.dotations - d.reprises;
    return { ...d, soldeNCreance, soldeNDeprec };
  });

  // --- Contrôle 3 : Cohérence dépréciations bilan/résultat (auto) ---
  const deprecVarLignes: DeprecVarLigne[] = comptes491.map(l => {
    const soldeN = (parseFloat(String(l.solde_crediteur)) || 0) - (parseFloat(String(l.solde_debiteur)) || 0);
    // Solde N-1 calculé à partir des SI de la balance N (comptes 491 = créditeurs)
    const soldeN1Auto = (parseFloat(String(l.si_credit)) || 0) - (parseFloat(String(l.si_debit)) || 0);

    const edit = deprecEdit[l.numero_compte];
    const soldeN1 = edit?.soldeN1 ?? soldeN1Auto;
    const dotations = edit?.dotations ?? 0;
    const reprises = edit?.reprises ?? 0;

    return {
      compte: l.numero_compte,
      libelle: l.libelle_compte,
      soldeN1,
      dotations6594: dotations,
      reprises7594: reprises,
      soldeNCalc: soldeN1 + dotations - reprises,
      soldeNBalance: soldeN,
    };
  });

  const totalDeprecN1 = deprecVarLignes.reduce((s, l) => s + l.soldeN1, 0);
  const totalDeprecDot = deprecVarLignes.reduce((s, l) => s + l.dotations6594, 0);
  const totalDeprecRep = deprecVarLignes.reduce((s, l) => s + l.reprises7594, 0);
  const totalDeprecCalc = deprecVarLignes.reduce((s, l) => s + l.soldeNCalc, 0);
  const totalDeprecBal = deprecVarLignes.reduce((s, l) => s + l.soldeNBalance, 0);
  const totalDeprecEcart = totalDeprecBal - totalDeprecCalc;

  // --- Contrôle 4 : Créances en devises ---
  const deviseCalcs = deviseLignes.map(d => {
    const valeurInventaire = d.valeurDevise * d.parite3112;
    // Pour les créances : perte si valeur inventaire < valeur initiale, gain si >
    const perteLatente = Math.max(0, d.valeurInitialeFCFA - valeurInventaire);
    const gainLatent = Math.max(0, valeurInventaire - d.valeurInitialeFCFA);
    return { ...d, valeurInventaire, perteLatente, gainLatent };
  });
  const totalPertesLatentes = deviseCalcs.reduce((s, d) => s + d.perteLatente, 0);
  const totalGainsLatents = deviseCalcs.reduce((s, d) => s + d.gainLatent, 0);

  // --- Contrôle 5 : Circularisation calculs ---
  const totalCircBalAux = circularLignes.reduce((s, l) => s + l.balanceAux, 0);
  const totalCircReconnu = circularLignes.reduce((s, l) => s + l.montantReconnu, 0);
  const totalCircEcart = totalCircReconnu - totalCircBalAux;
  const circularHasEcart = circularLignes.some(l => Math.abs(l.montantReconnu - l.balanceAux) > 0.5);

  // --- Contrôle 6 : Produits à recevoir (418) ---
  const prodRecevoirLignes: ProdRecevoirLigne[] = comptes418.map(l => {
    const soldeN = (parseFloat(String(l.solde_debiteur)) || 0) - (parseFloat(String(l.solde_crediteur)) || 0);
    // Solde N-1 calculé à partir des SI de la balance N (comptes 418 = débiteurs)
    const soldeN1 = (parseFloat(String(l.si_debit)) || 0) - (parseFloat(String(l.si_credit)) || 0);
    const edit = prodRecevoirEdit[l.numero_compte];
    return {
      compte: l.numero_compte,
      designation: l.libelle_compte,
      soldeN,
      soldeN1,
      commentaire: edit?.commentaire ?? '',
    };
  });
  const totalProdRecN = prodRecevoirLignes.reduce((s, l) => s + l.soldeN, 0);
  const totalProdRecN1 = prodRecevoirLignes.reduce((s, l) => s + l.soldeN1, 0);
  const totalProdRecVar = totalProdRecN - totalProdRecN1;
  // Alert if 418 balance is significant (> 0) and increasing
  const prodRecevoirSignificantAndIncreasing = totalProdRecN > 0.5 && totalProdRecVar > 0.5;

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

  // Écart dépréciations
  if (deprecVarLignes.length > 0 && Math.abs(totalDeprecEcart) > 0.5) {
    const dejaPropose = odEcritures.some(od => od.source === 'Clients-C3');
    if (!dejaPropose) {
      if (totalDeprecEcart > 0) {
        suggestions.push({
          compteDebit: '6594', libelleDebit: 'Charges provisionnées sur créances',
          compteCredit: '491', libelleCredit: 'Dépréciations comptes clients',
          montant: totalDeprecEcart, libelle: 'Complément de dépréciation créances clients',
          source: 'Clients-C3',
        });
      } else {
        suggestions.push({
          compteDebit: '491', libelleDebit: 'Dépréciations comptes clients',
          compteCredit: '7594', libelleCredit: 'Reprises charges provisionnées sur créances',
          montant: Math.abs(totalDeprecEcart), libelle: 'Reprise de dépréciation excédentaire',
          source: 'Clients-C3',
        });
      }
    }
  }

  // Pertes de change latentes sur créances
  if (totalPertesLatentes > 0.5) {
    const dejaPropose = odEcritures.some(od => od.source === 'Clients-C4-perte');
    if (!dejaPropose) {
      suggestions.push({
        compteDebit: '478', libelleDebit: 'Écarts de conversion — Actif',
        compteCredit: '411', libelleCredit: 'Clients',
        montant: totalPertesLatentes, libelle: 'Pertes de change latentes sur créances clients',
        source: 'Clients-C4-perte',
      });
    }
  }

  if (totalGainsLatents > 0.5) {
    const dejaPropose = odEcritures.some(od => od.source === 'Clients-C4-gain');
    if (!dejaPropose) {
      suggestions.push({
        compteDebit: '411', libelleDebit: 'Clients',
        compteCredit: '479', libelleCredit: 'Écarts de conversion — Passif',
        montant: totalGainsLatents, libelle: 'Gains de change latents sur créances clients',
        source: 'Clients-C4-gain',
      });
    }
  }

  // Suggestion Contrôle 6 : Produits à recevoir significatifs et en hausse
  if (prodRecevoirSignificantAndIncreasing) {
    const dejaPropose = odEcritures.some(od => od.source === 'Clients-C6');
    if (!dejaPropose) {
      suggestions.push({
        compteDebit: '4181', libelleDebit: 'Clients — Factures à établir',
        compteCredit: '70', libelleCredit: 'Ventes de marchandises / produits',
        montant: totalProdRecVar, libelle: 'Produits à recevoir — factures à établir',
        source: 'Clients-C6',
      });
    }
  }

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

      {/* Note si comptes 41x en balance */}
      {comptes41.length > 0 && recouvLignes.length === 0 && (
        <div className="revision-objectif">
          <strong>Information :</strong> La balance contient {comptes41.length} compte{comptes41.length > 1 ? 's' : ''} clients (41x) pour un solde net de <strong>{fmt(totalClient41Balance)}</strong>.
          {comptes416.length > 0 && <> Créances douteuses (416) : <strong>{fmt(comptes416.reduce((s, l) => s + ((parseFloat(String(l.solde_debiteur)) || 0) - (parseFloat(String(l.solde_crediteur)) || 0)), 0))}</strong>.</>}
          {comptes491.length > 0 && <> Dépréciations (491) : <strong>{fmt(totalDeprec491Balance)}</strong>.</>}
          {comptes4181.length > 0 && <> Factures à établir (4181) : <strong>{fmt(comptes4181.reduce((s, l) => s + ((parseFloat(String(l.solde_debiteur)) || 0) - (parseFloat(String(l.solde_crediteur)) || 0)), 0))}</strong>.</>}
          {comptes4191.length > 0 && <> Avances reçues (4191) : <strong>{fmt(comptes4191.reduce((s, l) => s + ((parseFloat(String(l.solde_crediteur)) || 0) - (parseFloat(String(l.solde_debiteur)) || 0)), 0))}</strong>.</>}
          <br />Complétez les contrôles ci-dessous.
        </div>
      )}

      {/* Contrôle 1 : Recouvrabilité des créances */}
      <div className="revision-control">
        <div className="revision-control-title">
          <span>Contrôle 1 — Vérifier le caractère recouvrable des créances</span>
          {recouvLignes.length > 0 && (Math.abs(totalEcartRecouv) < 0.5
            ? <span className="revision-badge ok">Conforme</span>
            : <span className="revision-badge ko">Écart détecté</span>
          )}
        </div>

        <div className="revision-table-wrapper">
          <table className="revision-table">
            <thead>
              <tr>
                <th style={{ width: 90 }}>Code client</th>
                <th>Nom client</th>
                <th className="num editable-col" style={{ width: 130 }}>Balance aux.</th>
                <th className="num editable-col" style={{ width: 130 }}>Montant reconnu</th>
                <th className="num" style={{ width: 100 }}>Écart</th>
                <th style={{ width: 90 }}>Reconn. signée</th>
                <th style={{ width: 30 }}></th>
              </tr>
            </thead>
            <tbody>
              {recouvLignes.map(l => {
                const ecart = l.montantReconnu - l.balanceAux;
                return (
                  <tr key={l.id} className={Math.abs(ecart) > 0.5 ? 'ecart-row' : ''}>
                    <td className="editable-cell"><input type="text" value={l.codeClient} onChange={e => updateRecouv(l.id, 'codeClient', e.target.value)} style={{ maxWidth: 'none', fontFamily: 'monospace' }} /></td>
                    <td className="editable-cell"><input type="text" value={l.nomClient} onChange={e => updateRecouv(l.id, 'nomClient', e.target.value)} style={{ maxWidth: 'none' }} /></td>
                    <td className="editable-cell"><input type="text" inputMode="numeric" value={fmtInput(l.balanceAux)} onChange={e => updateRecouv(l.id, 'balanceAux', parseInputValue(e.target.value))} style={{ maxWidth: 'none' }} /></td>
                    <td className="editable-cell"><input type="text" inputMode="numeric" value={fmtInput(l.montantReconnu)} onChange={e => updateRecouv(l.id, 'montantReconnu', parseInputValue(e.target.value))} style={{ maxWidth: 'none' }} /></td>
                    <td className={`num ${Math.abs(ecart) > 0.5 ? 'ecart-val' : 'ok-val'}`}>{fmt(ecart)}</td>
                    <td>
                      <select value={l.reconnaissanceSignee} onChange={e => updateRecouv(l.id, 'reconnaissanceSignee', e.target.value)} style={{ padding: '3px 4px', borderRadius: 4, border: '1px solid #ddd', width: '100%', fontSize: '11.5px' }}>
                        <option value="Oui">Oui</option>
                        <option value="Non">Non</option>
                      </select>
                    </td>
                    <td><button className="revision-od-delete" onClick={() => removeRecouv(l.id)} title="Supprimer"><LuTrash2 size={13} /></button></td>
                  </tr>
                );
              })}
              {recouvLignes.length === 0 && (
                <tr><td colSpan={7} style={{ textAlign: 'center', color: '#999', padding: 16, fontStyle: 'italic' }}>Aucun client saisi. Ajoutez les principaux clients à vérifier.</td></tr>
              )}
            </tbody>
            {recouvLignes.length > 0 && (
              <tfoot>
                <tr>
                  <td colSpan={2}><strong>Total</strong></td>
                  <td className="num"><strong>{fmt(totalBalAux)}</strong></td>
                  <td className="num"><strong>{fmt(totalReconnu)}</strong></td>
                  <td className={`num ${Math.abs(totalEcartRecouv) > 0.5 ? 'ecart-val' : 'ok-val'}`}><strong>{fmt(totalEcartRecouv)}</strong></td>
                  <td colSpan={2}></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
        <div className="revision-od-actions">
          <button className="revision-od-add" onClick={addRecouv}><LuPlus size={13} /> Ajouter un client</button>
        </div>
      </div>

      {/* Contrôle 2 : Créances douteuses */}
      <div className="revision-control">
        <div className="revision-control-title">
          <span>Contrôle 2 — Suivi des créances douteuses</span>
        </div>
        <div className="revision-ref">Reclassement : D 416 / C 411 — Dépréciation : D 6594 / C 491 — Perte définitive : D 6511 + 443 / C 416</div>

        <div className="revision-table-wrapper" style={{ marginTop: 8 }}>
          <table className="revision-table">
            <thead>
              <tr>
                <th style={{ width: 80 }}>Code</th>
                <th>Nom client</th>
                <th className="num editable-col" style={{ width: 95 }}>Créance N-1</th>
                <th className="num editable-col" style={{ width: 95 }}>Nouvelles</th>
                <th className="num editable-col" style={{ width: 95 }}>Paiements</th>
                <th className="num" style={{ width: 95 }}>Créance N</th>
                <th className="num editable-col" style={{ width: 95 }}>Dépr. N-1</th>
                <th className="num editable-col" style={{ width: 95 }}>Dotations</th>
                <th className="num editable-col" style={{ width: 95 }}>Reprises</th>
                <th className="num" style={{ width: 95 }}>Dépr. N</th>
                <th style={{ width: 30 }}></th>
              </tr>
            </thead>
            <tbody>
              {douteuseCalcs.map(d => (
                <tr key={d.id}>
                  <td className="editable-cell"><input type="text" value={d.codeClient} onChange={e => updateDouteuse(d.id, 'codeClient', e.target.value)} style={{ maxWidth: 'none', fontFamily: 'monospace' }} /></td>
                  <td className="editable-cell"><input type="text" value={d.nomClient} onChange={e => updateDouteuse(d.id, 'nomClient', e.target.value)} style={{ maxWidth: 'none' }} /></td>
                  <td className="editable-cell"><input type="text" inputMode="numeric" value={fmtInput(d.soldeN1Creance)} onChange={e => updateDouteuse(d.id, 'soldeN1Creance', parseInputValue(e.target.value))} style={{ maxWidth: 'none' }} /></td>
                  <td className="editable-cell"><input type="text" inputMode="numeric" value={fmtInput(d.nouvellesCreances)} onChange={e => updateDouteuse(d.id, 'nouvellesCreances', parseInputValue(e.target.value))} style={{ maxWidth: 'none' }} /></td>
                  <td className="editable-cell"><input type="text" inputMode="numeric" value={fmtInput(d.paiements)} onChange={e => updateDouteuse(d.id, 'paiements', parseInputValue(e.target.value))} style={{ maxWidth: 'none' }} /></td>
                  <td className="num computed">{fmt(d.soldeNCreance)}</td>
                  <td className="editable-cell"><input type="text" inputMode="numeric" value={fmtInput(d.soldeN1Deprec)} onChange={e => updateDouteuse(d.id, 'soldeN1Deprec', parseInputValue(e.target.value))} style={{ maxWidth: 'none' }} /></td>
                  <td className="editable-cell"><input type="text" inputMode="numeric" value={fmtInput(d.dotations)} onChange={e => updateDouteuse(d.id, 'dotations', parseInputValue(e.target.value))} style={{ maxWidth: 'none' }} /></td>
                  <td className="editable-cell"><input type="text" inputMode="numeric" value={fmtInput(d.reprises)} onChange={e => updateDouteuse(d.id, 'reprises', parseInputValue(e.target.value))} style={{ maxWidth: 'none' }} /></td>
                  <td className="num computed">{fmt(d.soldeNDeprec)}</td>
                  <td><button className="revision-od-delete" onClick={() => removeDouteuse(d.id)} title="Supprimer"><LuTrash2 size={13} /></button></td>
                </tr>
              ))}
              {douteuseLignes.length === 0 && (
                <tr><td colSpan={11} style={{ textAlign: 'center', color: '#999', padding: 16, fontStyle: 'italic' }}>Aucune créance douteuse saisie.</td></tr>
              )}
            </tbody>
            {douteuseLignes.length > 0 && (
              <tfoot>
                <tr>
                  <td colSpan={2}><strong>Total</strong></td>
                  <td className="num"><strong>{fmt(douteuseLignes.reduce((s, d) => s + d.soldeN1Creance, 0))}</strong></td>
                  <td className="num"><strong>{fmt(douteuseLignes.reduce((s, d) => s + d.nouvellesCreances, 0))}</strong></td>
                  <td className="num"><strong>{fmt(douteuseLignes.reduce((s, d) => s + d.paiements, 0))}</strong></td>
                  <td className="num"><strong>{fmt(douteuseCalcs.reduce((s, d) => s + d.soldeNCreance, 0))}</strong></td>
                  <td className="num"><strong>{fmt(douteuseLignes.reduce((s, d) => s + d.soldeN1Deprec, 0))}</strong></td>
                  <td className="num"><strong>{fmt(douteuseLignes.reduce((s, d) => s + d.dotations, 0))}</strong></td>
                  <td className="num"><strong>{fmt(douteuseLignes.reduce((s, d) => s + d.reprises, 0))}</strong></td>
                  <td className="num"><strong>{fmt(douteuseCalcs.reduce((s, d) => s + d.soldeNDeprec, 0))}</strong></td>
                  <td></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
        <div className="revision-od-actions">
          <button className="revision-od-add" onClick={addDouteuse}><LuPlus size={13} /> Ajouter une créance douteuse</button>
        </div>
      </div>

      {/* Contrôle 3 : Cohérence dépréciations bilan/résultat */}
      <div className="revision-control">
        <div className="revision-control-title">
          <span>Contrôle 3 — Cohérence dépréciations bilan / résultat</span>
          {deprecVarLignes.length > 0 && (Math.abs(totalDeprecEcart) < 0.5
            ? <span className="revision-badge ok">Conforme</span>
            : <span className="revision-badge ko">Écart détecté</span>
          )}
        </div>
        <div className="revision-ref">Dotation : D 6594 / C 491 — Reprise : D 491 / C 7594</div>

        <div className="revision-table-wrapper" style={{ marginTop: 8 }}>
          <table className="revision-table">
            <thead>
              <tr>
                <th style={{ width: 90 }}>Compte</th>
                <th>Libellé</th>
                <th className="num editable-col" style={{ width: 110 }}>Solde N-1</th>
                <th className="num editable-col" style={{ width: 110 }}>Dotations 6594</th>
                <th className="num editable-col" style={{ width: 110 }}>Reprises 7594</th>
                <th className="num" style={{ width: 110 }}>Solde N calc.</th>
                <th className="num" style={{ width: 110 }}>Balance N</th>
                <th className="num" style={{ width: 90 }}>Écart</th>
              </tr>
            </thead>
            <tbody>
              {deprecVarLignes.map(l => {
                const ecart = l.soldeNBalance - l.soldeNCalc;
                return (
                  <tr key={l.compte} className={Math.abs(ecart) > 0.5 ? 'ecart-row' : ''}>
                    <td className="compte">{l.compte}</td>
                    <td>{l.libelle}</td>
                    <td className="editable-cell">
                      <input type="text" inputMode="numeric" value={fmtInput(l.soldeN1)} onChange={e => {
                        const val = parseInputValue(e.target.value);
                        setDeprecEdit(prev => ({ ...prev, [l.compte]: { ...prev[l.compte], soldeN1: val, dotations: prev[l.compte]?.dotations ?? 0, reprises: prev[l.compte]?.reprises ?? 0 } }));
                        setSaved(false);
                      }} style={{ maxWidth: 'none' }} />
                    </td>
                    <td className="editable-cell">
                      <input type="text" inputMode="numeric" value={fmtInput(l.dotations6594)} onChange={e => {
                        const val = parseInputValue(e.target.value);
                        setDeprecEdit(prev => ({ ...prev, [l.compte]: { soldeN1: prev[l.compte]?.soldeN1 ?? l.soldeN1, dotations: val, reprises: prev[l.compte]?.reprises ?? 0 } }));
                        setSaved(false);
                      }} style={{ maxWidth: 'none' }} />
                    </td>
                    <td className="editable-cell">
                      <input type="text" inputMode="numeric" value={fmtInput(l.reprises7594)} onChange={e => {
                        const val = parseInputValue(e.target.value);
                        setDeprecEdit(prev => ({ ...prev, [l.compte]: { soldeN1: prev[l.compte]?.soldeN1 ?? l.soldeN1, dotations: prev[l.compte]?.dotations ?? 0, reprises: val } }));
                        setSaved(false);
                      }} style={{ maxWidth: 'none' }} />
                    </td>
                    <td className="num computed">{fmt(l.soldeNCalc)}</td>
                    <td className="num">{fmt(l.soldeNBalance)}</td>
                    <td className={`num ${Math.abs(ecart) > 0.5 ? 'ecart-val' : 'ok-val'}`}>{fmt(ecart)}</td>
                  </tr>
                );
              })}
              {deprecVarLignes.length === 0 && (
                <tr><td colSpan={8} style={{ textAlign: 'center', color: '#999', padding: 16, fontStyle: 'italic' }}>Aucun compte 491 dans la balance.</td></tr>
              )}
            </tbody>
            {deprecVarLignes.length > 0 && (
              <tfoot>
                <tr>
                  <td colSpan={2}><strong>Total</strong></td>
                  <td className="num"><strong>{fmt(totalDeprecN1)}</strong></td>
                  <td className="num"><strong>{fmt(totalDeprecDot)}</strong></td>
                  <td className="num"><strong>{fmt(totalDeprecRep)}</strong></td>
                  <td className="num"><strong>{fmt(totalDeprecCalc)}</strong></td>
                  <td className="num"><strong>{fmt(totalDeprecBal)}</strong></td>
                  <td className={`num ${Math.abs(totalDeprecEcart) > 0.5 ? 'ecart-val' : 'ok-val'}`}><strong>{fmt(totalDeprecEcart)}</strong></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {/* Contrôle 4 : Créances en devises */}
      <div className="revision-control">
        <div className="revision-control-title">
          <span>Contrôle 4 — Créances en monnaie étrangère</span>
        </div>
        <div className="revision-ref">Pertes latentes (baisse devise) : D 478 / C 411. Gains latents (hausse devise) : D 411 / C 479</div>

        <div className="revision-table-wrapper" style={{ marginTop: 8 }}>
          <table className="revision-table">
            <thead>
              <tr>
                <th style={{ width: 80 }}>Code</th>
                <th>Nom client</th>
                <th style={{ width: 70 }}>Monnaie</th>
                <th className="num editable-col" style={{ width: 110 }}>Val. devises</th>
                <th className="num editable-col" style={{ width: 130 }}>Val. initiale FCFA</th>
                <th className="num editable-col" style={{ width: 100 }}>Parité 31/12</th>
                <th className="num" style={{ width: 130 }}>Val. inventaire</th>
                <th className="num" style={{ width: 110 }}>Perte latente</th>
                <th className="num" style={{ width: 110 }}>Gain latent</th>
                <th style={{ width: 30 }}></th>
              </tr>
            </thead>
            <tbody>
              {deviseCalcs.map(d => (
                <tr key={d.id} className={d.perteLatente > 0.5 ? 'ecart-row' : ''}>
                  <td className="editable-cell"><input type="text" value={d.codeClient} onChange={e => updateDevise(d.id, 'codeClient', e.target.value)} style={{ maxWidth: 'none', fontFamily: 'monospace' }} /></td>
                  <td className="editable-cell"><input type="text" value={d.nomClient} onChange={e => updateDevise(d.id, 'nomClient', e.target.value)} style={{ maxWidth: 'none' }} /></td>
                  <td className="editable-cell">
                    <select value={d.monnaie} onChange={e => updateDevise(d.id, 'monnaie', e.target.value)} style={{ padding: '3px 4px', borderRadius: 4, border: '1px solid #ddd', width: '100%', fontSize: '11.5px' }}>
                      <option value="USD">USD</option>
                      <option value="EUR">EUR</option>
                      <option value="GBP">GBP</option>
                      <option value="CNY">CNY</option>
                      <option value="JPY">JPY</option>
                      <option value="Autre">Autre</option>
                    </select>
                  </td>
                  <td className="editable-cell"><input type="text" inputMode="numeric" value={fmtInput(d.valeurDevise)} onChange={e => updateDevise(d.id, 'valeurDevise', parseInputValue(e.target.value))} style={{ maxWidth: 'none' }} /></td>
                  <td className="editable-cell"><input type="text" inputMode="numeric" value={fmtInput(d.valeurInitialeFCFA)} onChange={e => updateDevise(d.id, 'valeurInitialeFCFA', parseInputValue(e.target.value))} style={{ maxWidth: 'none' }} /></td>
                  <td className="editable-cell"><input type="text" inputMode="numeric" value={fmtInput(d.parite3112)} onChange={e => updateDevise(d.id, 'parite3112', parseInputValue(e.target.value))} style={{ maxWidth: 'none' }} /></td>
                  <td className="num computed">{fmt(d.valeurInventaire)}</td>
                  <td className={`num ${d.perteLatente > 0.5 ? 'ecart-val' : ''}`}>{fmt(d.perteLatente)}</td>
                  <td className={`num ${d.gainLatent > 0.5 ? 'ok-val' : ''}`}>{fmt(d.gainLatent)}</td>
                  <td><button className="revision-od-delete" onClick={() => removeDevise(d.id)} title="Supprimer"><LuTrash2 size={13} /></button></td>
                </tr>
              ))}
              {deviseLignes.length === 0 && (
                <tr><td colSpan={10} style={{ textAlign: 'center', color: '#999', padding: 16, fontStyle: 'italic' }}>Aucune créance en devise saisie.</td></tr>
              )}
            </tbody>
            {deviseLignes.length > 0 && (
              <tfoot>
                <tr>
                  <td colSpan={4}><strong>Total</strong></td>
                  <td className="num"><strong>{fmt(deviseLignes.reduce((s, d) => s + d.valeurInitialeFCFA, 0))}</strong></td>
                  <td></td>
                  <td className="num"><strong>{fmt(deviseCalcs.reduce((s, d) => s + d.valeurInventaire, 0))}</strong></td>
                  <td className="num ecart-val"><strong>{fmt(totalPertesLatentes)}</strong></td>
                  <td className="num ok-val"><strong>{fmt(totalGainsLatents)}</strong></td>
                  <td></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
        <div className="revision-od-actions">
          <button className="revision-od-add" onClick={addDevise}><LuPlus size={13} /> Ajouter une créance en devise</button>
        </div>
      </div>

      {/* Contrôle 5 : Circularisation des clients */}
      <div className="revision-control">
        <div className="revision-control-title">
          <span>Contrôle 5 — Circularisation clients</span>
          {circularLignes.length > 0 && (circularHasEcart
            ? <span className="revision-badge ko">Écart détecté</span>
            : <span className="revision-badge ok">Conforme</span>
          )}
        </div>
        <div className="revision-ref">Contrôle de confirmation : rapprochement des soldes confirmés par les clients avec la balance auxiliaire (411x)</div>

        <div className="revision-table-wrapper" style={{ marginTop: 8 }}>
          <table className="revision-table">
            <thead>
              <tr>
                <th style={{ width: 100 }}>Code client</th>
                <th>Nom client</th>
                <th className="num" style={{ width: 130 }}>Balance aux. (411x)</th>
                <th className="num editable-col" style={{ width: 130 }}>Montant reconnu</th>
                <th className="num" style={{ width: 100 }}>Écart</th>
                <th style={{ width: 90 }}>Reconn. signée</th>
                <th>Commentaire</th>
                <th style={{ width: 30 }}></th>
              </tr>
            </thead>
            <tbody>
              {circularLignes.map(l => {
                const ecart = l.montantReconnu - l.balanceAux;
                return (
                  <tr key={l.id} className={Math.abs(ecart) > 0.5 ? 'ecart-row' : ''}>
                    <td className="editable-cell"><input type="text" value={l.codeClient} onChange={e => updateCircular(l.id, 'codeClient', e.target.value)} style={{ maxWidth: 'none', fontFamily: 'monospace' }} /></td>
                    <td className="editable-cell"><input type="text" value={l.nomClient} onChange={e => updateCircular(l.id, 'nomClient', e.target.value)} style={{ maxWidth: 'none' }} /></td>
                    <td className="num">{fmt(l.balanceAux)}</td>
                    <td className="editable-cell"><input type="text" inputMode="numeric" value={fmtInput(l.montantReconnu)} onChange={e => updateCircular(l.id, 'montantReconnu', parseInputValue(e.target.value))} style={{ maxWidth: 'none' }} /></td>
                    <td className={`num ${Math.abs(ecart) > 0.5 ? 'ecart-val' : 'ok-val'}`}>{fmt(ecart)}</td>
                    <td>
                      <select value={l.reconnaissanceSignee} onChange={e => updateCircular(l.id, 'reconnaissanceSignee', e.target.value)} style={{ padding: '3px 4px', borderRadius: 4, border: '1px solid #ddd', width: '100%', fontSize: '11.5px' }}>
                        <option value="Oui">Oui</option>
                        <option value="Non">Non</option>
                      </select>
                    </td>
                    <td className="editable-cell"><input type="text" value={l.commentaire} onChange={e => updateCircular(l.id, 'commentaire', e.target.value)} style={{ maxWidth: 'none' }} /></td>
                    <td><button className="revision-od-delete" onClick={() => removeCircular(l.id)} title="Supprimer"><LuTrash2 size={13} /></button></td>
                  </tr>
                );
              })}
              {circularLignes.length === 0 && (
                <tr><td colSpan={8} style={{ textAlign: 'center', color: '#999', padding: 16, fontStyle: 'italic' }}>Aucun client saisi. Utilisez le bouton ci-dessous pour pré-remplir depuis les comptes 411x.</td></tr>
              )}
            </tbody>
            {circularLignes.length > 0 && (
              <tfoot>
                <tr>
                  <td colSpan={2}><strong>Total</strong></td>
                  <td className="num"><strong>{fmt(totalCircBalAux)}</strong></td>
                  <td className="num"><strong>{fmt(totalCircReconnu)}</strong></td>
                  <td className={`num ${Math.abs(totalCircEcart) > 0.5 ? 'ecart-val' : 'ok-val'}`}><strong>{fmt(totalCircEcart)}</strong></td>
                  <td colSpan={3}></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
        <div className="revision-od-actions">
          {comptes411.length > 0 && circularLignes.length === 0 && (
            <button className="revision-od-add" onClick={autoPopulateCircular} style={{ marginRight: 8 }}><LuPlus size={13} /> Pré-remplir depuis 411x ({comptes411.length} comptes)</button>
          )}
          <button className="revision-od-add" onClick={addCircular}><LuPlus size={13} /> Ajouter un client</button>
        </div>
      </div>

      {/* Contrôle 6 : Produits à recevoir (418) */}
      <div className="revision-control">
        <div className="revision-control-title">
          <span>Contrôle 6 — Produits à recevoir (418)</span>
          {prodRecevoirLignes.length > 0 && (prodRecevoirSignificantAndIncreasing
            ? <span className="revision-badge ko">Solde significatif et en hausse</span>
            : <span className="revision-badge ok">Conforme</span>
          )}
        </div>
        <div className="revision-ref">Produits à recevoir : D 4181 / C 70x — Vérifier la justification des factures à établir</div>

        {prodRecevoirSignificantAndIncreasing && (
          <div className="revision-objectif" style={{ marginTop: 6 }}>
            <strong>Alerte :</strong> Le solde des comptes 418 est significatif (<strong>{fmt(totalProdRecN)}</strong>) et en augmentation de <strong>{fmt(totalProdRecVar)}</strong> par rapport à N-1. Vérifier la justification et le dénouement des produits à recevoir.
          </div>
        )}

        <div className="revision-table-wrapper" style={{ marginTop: 8 }}>
          <table className="revision-table">
            <thead>
              <tr>
                <th style={{ width: 100 }}>Compte</th>
                <th>Désignation</th>
                <th className="num" style={{ width: 120 }}>Solde N</th>
                <th className="num" style={{ width: 120 }}>Solde N-1</th>
                <th className="num" style={{ width: 120 }}>Variation</th>
                <th>Commentaire</th>
              </tr>
            </thead>
            <tbody>
              {prodRecevoirLignes.map(l => {
                const variation = l.soldeN - l.soldeN1;
                return (
                  <tr key={l.compte} className={l.soldeN > 0.5 && variation > 0.5 ? 'ecart-row' : ''}>
                    <td className="compte">{l.compte}</td>
                    <td>{l.designation}</td>
                    <td className="num">{fmt(l.soldeN)}</td>
                    <td className="num">{fmt(l.soldeN1)}</td>
                    <td className={`num ${variation > 0.5 ? 'ecart-val' : variation < -0.5 ? 'ok-val' : ''}`}>{fmt(variation)}</td>
                    <td className="editable-cell">
                      <input type="text" value={l.commentaire} onChange={e => {
                        setProdRecevoirEdit(prev => ({ ...prev, [l.compte]: { commentaire: e.target.value } }));
                        setSaved(false);
                      }} style={{ maxWidth: 'none' }} />
                    </td>
                  </tr>
                );
              })}
              {prodRecevoirLignes.length === 0 && (
                <tr><td colSpan={6} style={{ textAlign: 'center', color: '#999', padding: 16, fontStyle: 'italic' }}>Aucun compte 418 dans la balance.</td></tr>
              )}
            </tbody>
            {prodRecevoirLignes.length > 0 && (
              <tfoot>
                <tr>
                  <td colSpan={2}><strong>Total</strong></td>
                  <td className="num"><strong>{fmt(totalProdRecN)}</strong></td>
                  <td className="num"><strong>{fmt(totalProdRecN1)}</strong></td>
                  <td className={`num ${totalProdRecVar > 0.5 ? 'ecart-val' : totalProdRecVar < -0.5 ? 'ok-val' : ''}`}><strong>{fmt(totalProdRecVar)}</strong></td>
                  <td></td>
                </tr>
              </tfoot>
            )}
          </table>
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

export default RevisionClients;
