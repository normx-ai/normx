import React, { useState, useEffect } from 'react';
import { LuSave, LuChevronDown, LuChevronRight, LuClipboardList, LuPlus, LuTrash2 } from 'react-icons/lu';
import { BalanceLigne } from '../types';
import { ODEcriture, Suggestion, fmt, fmtInput, parseInputValue, getSD, getSC, soldeNet, soldeCreditNet, totalSoldeNet, totalSoldeCreditNet } from './revisionTypes';
import JournalOD from './JournalOD';
import FonctionnementCompte from './FonctionnementCompte';

interface RevisionStocksProps {
  balanceN: BalanceLigne[];
  exerciceAnnee: number;
  entiteId: number;
  exerciceId: number;
}

// Contrôle 1 : Rapprochement PV inventaire vs Balance
interface InvStockLigne {
  id: number;
  designation: string;
  compte: string;
  coutUnitaire: number;
  quantitePV: number;
}

// Contrôle 2 : Test de valorisation
interface ValoLigne {
  id: number;
  reference: string;
  designation: string;
  quantite: number;
  facturePrincipale: number;
  transport: number;
  douane: number;
  autresCouts: number;
  coutSysteme: number;
}

// Contrôle 3 : Variations bilantielles vs Compte de résultat
interface VarLigne {
  compte: string;
  designation: string;
  soldeN1: number;
  variation603ou73: number;
  soldeNCalc: number;
  soldeNBalance: number;
}

// Contrôle 4 : Encours de route
interface EncoursRouteLigne {
  id: number;
  dossierImport: string;
  fournisseur: string;
  facturePrincipale: number;
  transport: number;
  douane: number;
  debours: number;
}

// Contrôle 5 : Dépréciation des stocks
interface DeprecLigne {
  id: number;
  designation: string;
  compte: string;
  quantite: number;
  coutUnitaire: number;
  valeurActuelle: number;
  motif: string;
}

const TRAVAUX_STOCKS = [
  'Obtenir et vérifier le procès-verbal d\'inventaire physique de fin d\'exercice',
  'Rapprocher les quantités physiques avec les soldes comptables',
  'Vérifier la méthode de valorisation utilisée (PEPS ou CMP)',
  'Analyser les coûts d\'acquisition (factures, transport, douane, frais accessoires)',
  'Contrôler la cohérence des variations de stocks (603x pour achats, 73x pour production)',
  'Examiner les stocks en cours de route et vérifier les dossiers d\'importation',
  'Identifier les stocks à déprécier (faible rotation, baisse de prix, dommages)',
  'Vérifier les dotations/reprises de dépréciations (D 6593 / C 39x et D 39x / C 7593)',
];

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
  // Comptes 39x (dépréciations)
  const comptes39 = balanceN.filter(l => l.numero_compte.startsWith('39'));
  // Comptes 603x (variations stocks achetés)
  const comptes603 = balanceN.filter(l => l.numero_compte.startsWith('603'));
  // Comptes 73x (variations stocks produits)
  const comptes73 = balanceN.filter(l => l.numero_compte.startsWith('73'));

  const totalStockBalance = totalSoldeNet(comptesStock);

  useEffect(() => { loadSaved(); }, [entiteId, exerciceId]);

  const loadSaved = (): void => {
    fetch(`/api/revision/${entiteId}/${exerciceId}/stocks`)
      .then(r => { if (r.ok) return r.json(); throw new Error(); })
      .then((data: any) => {
        if (data.invLignes) { setInvLignes(data.invLignes); if (data.invLignes.length > 0) setNextIds(prev => ({ ...prev, inv: Math.max(...data.invLignes.map((a: InvStockLigne) => a.id)) + 1 })); }
        if (data.valoLignes) { setValoLignes(data.valoLignes); if (data.valoLignes.length > 0) setNextIds(prev => ({ ...prev, valo: Math.max(...data.valoLignes.map((a: ValoLigne) => a.id)) + 1 })); }
        if (data.encoursLignes) { setEncoursLignes(data.encoursLignes); if (data.encoursLignes.length > 0) setNextIds(prev => ({ ...prev, enc: Math.max(...data.encoursLignes.map((a: EncoursRouteLigne) => a.id)) + 1 })); }
        if (data.deprecLignes) { setDeprecLignes(data.deprecLignes); if (data.deprecLignes.length > 0) setNextIds(prev => ({ ...prev, deprec: Math.max(...data.deprecLignes.map((a: DeprecLigne) => a.id)) + 1 })); }
        if (data.varEdit) setVarEdit(data.varEdit);
        if (data.odEcritures) { setOdEcritures(data.odEcritures); if (data.odEcritures.length > 0) setNextOdId(Math.max(...data.odEcritures.map((e: ODEcriture) => e.id)) + 1); }
      })
      .catch(() => {});
  };

  const handleSave = async (): Promise<void> => {
    try {
      const res = await fetch(`/api/revision/${entiteId}/${exerciceId}/stocks`, {
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

      {/* Contrôle 1 : Rapprochement PV inventaire vs Balance */}
      <div className="revision-control">
        <div className="revision-control-title">
          <span>Contrôle 1 — Rapprochement PV d'inventaire vs balance générale</span>
          {invLignes.length > 0 && (Math.abs(ecartInvBalance) < 0.5
            ? <span className="revision-badge ok">Conforme</span>
            : <span className="revision-badge ko">Écart détecté</span>
          )}
        </div>

        <div className="revision-table-wrapper">
          <table className="revision-table">
            <thead>
              <tr>
                <th>Désignation</th>
                <th style={{ width: 90 }}>Compte</th>
                <th className="num editable-col" style={{ width: 120 }}>Coût unitaire</th>
                <th className="num editable-col" style={{ width: 100 }}>Qté PV</th>
                <th className="num" style={{ width: 130 }}>Valeur PV</th>
                <th style={{ width: 30 }}></th>
              </tr>
            </thead>
            <tbody>
              {invCalcs.map(l => (
                <tr key={l.id}>
                  <td className="editable-cell"><input type="text" value={l.designation} onChange={e => updateInv(l.id, 'designation', e.target.value)} style={{ maxWidth: 'none' }} /></td>
                  <td className="editable-cell"><input type="text" value={l.compte} onChange={e => updateInv(l.id, 'compte', e.target.value)} style={{ maxWidth: 'none', fontFamily: 'monospace' }} placeholder="31x..." /></td>
                  <td className="editable-cell"><input type="text" inputMode="numeric" value={fmtInput(l.coutUnitaire)} onChange={e => updateInv(l.id, 'coutUnitaire', parseInputValue(e.target.value))} style={{ maxWidth: 'none' }} /></td>
                  <td className="editable-cell"><input type="text" inputMode="numeric" value={l.quantitePV || ''} onChange={e => updateInv(l.id, 'quantitePV', parseInt(e.target.value) || 0)} style={{ maxWidth: 'none' }} /></td>
                  <td className="num computed">{fmt(l.valeurPV)}</td>
                  <td><button className="revision-od-delete" onClick={() => removeInv(l.id)} title="Supprimer"><LuTrash2 size={13} /></button></td>
                </tr>
              ))}
              {invLignes.length === 0 && (
                <tr><td colSpan={6} style={{ textAlign: 'center', color: '#999', padding: 16, fontStyle: 'italic' }}>Aucun article saisi. Ajoutez les lignes du PV d'inventaire.</td></tr>
              )}
            </tbody>
            {invLignes.length > 0 && (
              <tfoot>
                <tr>
                  <td colSpan={4}><strong>Total PV inventaire</strong></td>
                  <td className="num"><strong>{fmt(totalValeurPV)}</strong></td>
                  <td></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>

        {invLignes.length > 0 && (
          <div style={{ marginTop: 12, padding: '10px 14px', background: '#f8f9fa', borderRadius: 6, fontSize: '12.5px' }}>
            <table className="revision-table revision-table-small" style={{ maxWidth: 400 }}>
              <tbody>
                <tr><td>Total PV inventaire</td><td className="num"><strong>{fmt(totalValeurPV)}</strong></td></tr>
                <tr><td>Balance générale (31x-38x)</td><td className="num"><strong>{fmt(totalStockBalance)}</strong></td></tr>
                <tr><td>Écart</td><td className={`num ${Math.abs(ecartInvBalance) > 0.5 ? 'ecart-val' : 'ok-val'}`}><strong>{fmt(ecartInvBalance)}</strong></td></tr>
              </tbody>
            </table>
          </div>
        )}

        <div className="revision-od-actions">
          <button className="revision-od-add" onClick={addInv}><LuPlus size={13} /> Ajouter un article</button>
        </div>
      </div>

      {/* Contrôle 2 : Test de valorisation */}
      <div className="revision-control">
        <div className="revision-control-title">
          <span>Contrôle 2 — Test de valorisation des stocks</span>
        </div>
        <div className="revision-ref">Méthodes : PEPS (Premier Entré Premier Sorti) ou CMP (Coût Moyen Pondéré)</div>

        <div className="revision-table-wrapper" style={{ marginTop: 8 }}>
          <table className="revision-table">
            <thead>
              <tr>
                <th style={{ width: 80 }}>Réf.</th>
                <th>Désignation</th>
                <th className="num editable-col" style={{ width: 70 }}>Qté</th>
                <th className="num editable-col" style={{ width: 110 }}>Facture princ.</th>
                <th className="num editable-col" style={{ width: 100 }}>Transport</th>
                <th className="num editable-col" style={{ width: 100 }}>Douane</th>
                <th className="num editable-col" style={{ width: 100 }}>Autres coûts</th>
                <th className="num" style={{ width: 110 }}>Coût recalculé</th>
                <th className="num editable-col" style={{ width: 110 }}>Coût système</th>
                <th className="num" style={{ width: 100 }}>Écart unit.</th>
                <th style={{ width: 30 }}></th>
              </tr>
            </thead>
            <tbody>
              {valoCalcs.map(v => (
                <tr key={v.id} className={Math.abs(v.ecart) > 0.5 ? 'ecart-row' : ''}>
                  <td className="editable-cell"><input type="text" value={v.reference} onChange={e => updateValo(v.id, 'reference', e.target.value)} style={{ maxWidth: 'none', fontFamily: 'monospace' }} /></td>
                  <td className="editable-cell"><input type="text" value={v.designation} onChange={e => updateValo(v.id, 'designation', e.target.value)} style={{ maxWidth: 'none' }} /></td>
                  <td className="editable-cell"><input type="text" inputMode="numeric" value={v.quantite || ''} onChange={e => updateValo(v.id, 'quantite', parseInt(e.target.value) || 0)} style={{ maxWidth: 'none' }} /></td>
                  <td className="editable-cell"><input type="text" inputMode="numeric" value={fmtInput(v.facturePrincipale)} onChange={e => updateValo(v.id, 'facturePrincipale', parseInputValue(e.target.value))} style={{ maxWidth: 'none' }} /></td>
                  <td className="editable-cell"><input type="text" inputMode="numeric" value={fmtInput(v.transport)} onChange={e => updateValo(v.id, 'transport', parseInputValue(e.target.value))} style={{ maxWidth: 'none' }} /></td>
                  <td className="editable-cell"><input type="text" inputMode="numeric" value={fmtInput(v.douane)} onChange={e => updateValo(v.id, 'douane', parseInputValue(e.target.value))} style={{ maxWidth: 'none' }} /></td>
                  <td className="editable-cell"><input type="text" inputMode="numeric" value={fmtInput(v.autresCouts)} onChange={e => updateValo(v.id, 'autresCouts', parseInputValue(e.target.value))} style={{ maxWidth: 'none' }} /></td>
                  <td className="num computed">{fmt(v.coutRecalcule)}</td>
                  <td className="editable-cell"><input type="text" inputMode="numeric" value={fmtInput(v.coutSysteme)} onChange={e => updateValo(v.id, 'coutSysteme', parseInputValue(e.target.value))} style={{ maxWidth: 'none' }} /></td>
                  <td className={`num ${Math.abs(v.ecart) > 0.5 ? 'ecart-val' : 'ok-val'}`}>{fmt(v.ecart)}</td>
                  <td><button className="revision-od-delete" onClick={() => removeValo(v.id)} title="Supprimer"><LuTrash2 size={13} /></button></td>
                </tr>
              ))}
              {valoLignes.length === 0 && (
                <tr><td colSpan={11} style={{ textAlign: 'center', color: '#999', padding: 16, fontStyle: 'italic' }}>Aucun test de valorisation saisi.</td></tr>
              )}
            </tbody>
            {valoLignes.length > 0 && (
              <tfoot>
                <tr>
                  <td colSpan={3}><strong>Total</strong></td>
                  <td className="num"><strong>{fmt(valoLignes.reduce((s, v) => s + v.facturePrincipale, 0))}</strong></td>
                  <td className="num"><strong>{fmt(valoLignes.reduce((s, v) => s + v.transport, 0))}</strong></td>
                  <td className="num"><strong>{fmt(valoLignes.reduce((s, v) => s + v.douane, 0))}</strong></td>
                  <td className="num"><strong>{fmt(valoLignes.reduce((s, v) => s + v.autresCouts, 0))}</strong></td>
                  <td className="num"><strong>{fmt(valoCalcs.reduce((s, v) => s + v.coutRecalcule, 0))}</strong></td>
                  <td className="num"><strong>{fmt(valoLignes.reduce((s, v) => s + v.coutSysteme, 0))}</strong></td>
                  <td></td>
                  <td></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
        <div className="revision-od-actions">
          <button className="revision-od-add" onClick={addValo}><LuPlus size={13} /> Ajouter un test</button>
        </div>
      </div>

      {/* Contrôle 3 : Variations bilantielles vs Compte de résultat */}
      <div className="revision-control">
        <div className="revision-control-title">
          <span>Contrôle 3 — Variations bilantielles vs compte de résultat</span>
          {varLignes.length > 0 && (Math.abs(totalVarEcart) < 0.5
            ? <span className="revision-badge ok">Conforme</span>
            : <span className="revision-badge ko">Écart détecté</span>
          )}
        </div>
        <div className="revision-ref">Biens achetés (31x-33x, 38x) : variation 603x — Biens produits (34x-37x) : variation 73x</div>

        <div className="revision-table-wrapper" style={{ marginTop: 8 }}>
          <table className="revision-table">
            <thead>
              <tr>
                <th style={{ width: 90 }}>Compte</th>
                <th>Désignation</th>
                <th className="num editable-col" style={{ width: 130 }}>Solde N-1</th>
                <th className="num editable-col" style={{ width: 130 }}>Variation (603/73)</th>
                <th className="num" style={{ width: 130 }}>Solde N calculé</th>
                <th className="num" style={{ width: 130 }}>Balance N</th>
                <th className="num" style={{ width: 100 }}>Écart</th>
              </tr>
            </thead>
            <tbody>
              {varLignes.map(l => {
                const ecart = l.soldeNBalance - l.soldeNCalc;
                return (
                  <tr key={l.compte} className={Math.abs(ecart) > 0.5 ? 'ecart-row' : ''}>
                    <td className="compte">{l.compte}</td>
                    <td>{l.designation}</td>
                    <td className="editable-cell">
                      <input type="text" inputMode="numeric" value={fmtInput(l.soldeN1)} onChange={e => {
                        const val = parseInputValue(e.target.value);
                        setVarEdit(prev => ({ ...prev, [l.compte]: { ...prev[l.compte], soldeN1: val, variation: prev[l.compte]?.variation ?? 0 } }));
                        setSaved(false);
                      }} style={{ maxWidth: 'none' }} />
                    </td>
                    <td className="editable-cell">
                      <input type="text" inputMode="numeric" value={fmtInput(l.variation603ou73)} onChange={e => {
                        const val = parseInputValue(e.target.value);
                        setVarEdit(prev => ({ ...prev, [l.compte]: { soldeN1: prev[l.compte]?.soldeN1 ?? l.soldeN1, variation: val } }));
                        setSaved(false);
                      }} style={{ maxWidth: 'none' }} />
                    </td>
                    <td className="num computed">{fmt(l.soldeN1 + l.variation603ou73)}</td>
                    <td className="num">{fmt(l.soldeNBalance)}</td>
                    <td className={`num ${Math.abs(ecart) > 0.5 ? 'ecart-val' : 'ok-val'}`}>{fmt(ecart)}</td>
                  </tr>
                );
              })}
              {varLignes.length === 0 && (
                <tr><td colSpan={7} style={{ textAlign: 'center', color: '#999', padding: 16, fontStyle: 'italic' }}>Aucun compte de stock (31x-38x) dans la balance.</td></tr>
              )}
            </tbody>
            {varLignes.length > 0 && (
              <tfoot>
                <tr>
                  <td colSpan={2}><strong>Total</strong></td>
                  <td className="num"><strong>{fmt(totalVarN1)}</strong></td>
                  <td className="num"><strong>{fmt(totalVarVar)}</strong></td>
                  <td className="num"><strong>{fmt(totalVarCalc)}</strong></td>
                  <td className="num"><strong>{fmt(totalVarBal)}</strong></td>
                  <td className={`num ${Math.abs(totalVarEcart) > 0.5 ? 'ecart-val' : 'ok-val'}`}><strong>{fmt(totalVarEcart)}</strong></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {/* Contrôle 4 : Encours de route */}
      <div className="revision-control">
        <div className="revision-control-title">
          <span>Contrôle 4 — Valorisation des stocks en cours de route</span>
          {encoursLignes.length > 0 && (Math.abs(ecartEncours) < 0.5
            ? <span className="revision-badge ok">Conforme</span>
            : <span className="revision-badge ko">Écart détecté</span>
          )}
        </div>
        <div className="revision-ref">Comptes 38x — stocks en cours de route, en consignation ou en dépôt</div>

        <div className="revision-table-wrapper" style={{ marginTop: 8 }}>
          <table className="revision-table">
            <thead>
              <tr>
                <th style={{ width: 100 }}>Dossier import</th>
                <th>Fournisseur</th>
                <th className="num editable-col" style={{ width: 120 }}>Facture princ.</th>
                <th className="num editable-col" style={{ width: 100 }}>Transport</th>
                <th className="num editable-col" style={{ width: 100 }}>Douane</th>
                <th className="num editable-col" style={{ width: 100 }}>Débours</th>
                <th className="num" style={{ width: 120 }}>Total recalculé</th>
                <th style={{ width: 30 }}></th>
              </tr>
            </thead>
            <tbody>
              {encoursCalcs.map(e => (
                <tr key={e.id}>
                  <td className="editable-cell"><input type="text" value={e.dossierImport} onChange={ev => updateEncours(e.id, 'dossierImport', ev.target.value)} style={{ maxWidth: 'none', fontFamily: 'monospace' }} /></td>
                  <td className="editable-cell"><input type="text" value={e.fournisseur} onChange={ev => updateEncours(e.id, 'fournisseur', ev.target.value)} style={{ maxWidth: 'none' }} /></td>
                  <td className="editable-cell"><input type="text" inputMode="numeric" value={fmtInput(e.facturePrincipale)} onChange={ev => updateEncours(e.id, 'facturePrincipale', parseInputValue(ev.target.value))} style={{ maxWidth: 'none' }} /></td>
                  <td className="editable-cell"><input type="text" inputMode="numeric" value={fmtInput(e.transport)} onChange={ev => updateEncours(e.id, 'transport', parseInputValue(ev.target.value))} style={{ maxWidth: 'none' }} /></td>
                  <td className="editable-cell"><input type="text" inputMode="numeric" value={fmtInput(e.douane)} onChange={ev => updateEncours(e.id, 'douane', parseInputValue(ev.target.value))} style={{ maxWidth: 'none' }} /></td>
                  <td className="editable-cell"><input type="text" inputMode="numeric" value={fmtInput(e.debours)} onChange={ev => updateEncours(e.id, 'debours', parseInputValue(ev.target.value))} style={{ maxWidth: 'none' }} /></td>
                  <td className="num computed">{fmt(e.totalRecalcule)}</td>
                  <td><button className="revision-od-delete" onClick={() => removeEncours(e.id)} title="Supprimer"><LuTrash2 size={13} /></button></td>
                </tr>
              ))}
              {encoursLignes.length === 0 && (
                <tr><td colSpan={8} style={{ textAlign: 'center', color: '#999', padding: 16, fontStyle: 'italic' }}>Aucun dossier d'import en transit saisi.</td></tr>
              )}
            </tbody>
            {encoursLignes.length > 0 && (
              <tfoot>
                <tr>
                  <td colSpan={2}><strong>Total</strong></td>
                  <td className="num"><strong>{fmt(encoursLignes.reduce((s, e) => s + e.facturePrincipale, 0))}</strong></td>
                  <td className="num"><strong>{fmt(encoursLignes.reduce((s, e) => s + e.transport, 0))}</strong></td>
                  <td className="num"><strong>{fmt(encoursLignes.reduce((s, e) => s + e.douane, 0))}</strong></td>
                  <td className="num"><strong>{fmt(encoursLignes.reduce((s, e) => s + e.debours, 0))}</strong></td>
                  <td className="num"><strong>{fmt(totalEncoursRecalcule)}</strong></td>
                  <td></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>

        {encoursLignes.length > 0 && (
          <div style={{ marginTop: 12, padding: '10px 14px', background: '#f8f9fa', borderRadius: 6, fontSize: '12.5px' }}>
            <table className="revision-table revision-table-small" style={{ maxWidth: 400 }}>
              <tbody>
                <tr><td>Total recalculé</td><td className="num"><strong>{fmt(totalEncoursRecalcule)}</strong></td></tr>
                <tr><td>Balance 38x</td><td className="num"><strong>{fmt(totalEncours38Balance)}</strong></td></tr>
                <tr><td>Écart</td><td className={`num ${Math.abs(ecartEncours) > 0.5 ? 'ecart-val' : 'ok-val'}`}><strong>{fmt(ecartEncours)}</strong></td></tr>
              </tbody>
            </table>
          </div>
        )}

        <div className="revision-od-actions">
          <button className="revision-od-add" onClick={addEncours}><LuPlus size={13} /> Ajouter un dossier</button>
        </div>
      </div>

      {/* Contrôle 5 : Dépréciation des stocks */}
      <div className="revision-control">
        <div className="revision-control-title">
          <span>Contrôle 5 — Dépréciation des stocks</span>
          {deprecLignes.length > 0 && (Math.abs(ecartDeprec) < 0.5
            ? <span className="revision-badge ok">Conforme</span>
            : <span className="revision-badge ko">Écart détecté</span>
          )}
        </div>
        <div className="revision-ref">Dotation : D 6593 / C 39x — Reprise : D 39x / C 7593 (AO). HAO : D 839 / C 39x et D 39x / C 849</div>

        <div className="revision-table-wrapper" style={{ marginTop: 8 }}>
          <table className="revision-table">
            <thead>
              <tr>
                <th>Désignation</th>
                <th style={{ width: 90 }}>Compte</th>
                <th className="num editable-col" style={{ width: 80 }}>Qté</th>
                <th className="num editable-col" style={{ width: 110 }}>Coût unit.</th>
                <th className="num" style={{ width: 120 }}>Valeur stock</th>
                <th className="num editable-col" style={{ width: 120 }}>Valeur actuelle</th>
                <th className="num" style={{ width: 120 }}>Dépréciation</th>
                <th style={{ width: 130 }}>Motif</th>
                <th style={{ width: 30 }}></th>
              </tr>
            </thead>
            <tbody>
              {deprecCalcs.map(d => (
                <tr key={d.id} className={d.depreciation > 0 ? 'ecart-row' : ''}>
                  <td className="editable-cell"><input type="text" value={d.designation} onChange={e => updateDeprec(d.id, 'designation', e.target.value)} style={{ maxWidth: 'none' }} /></td>
                  <td className="editable-cell"><input type="text" value={d.compte} onChange={e => updateDeprec(d.id, 'compte', e.target.value)} style={{ maxWidth: 'none', fontFamily: 'monospace' }} placeholder="39x..." /></td>
                  <td className="editable-cell"><input type="text" inputMode="numeric" value={d.quantite || ''} onChange={e => updateDeprec(d.id, 'quantite', parseInt(e.target.value) || 0)} style={{ maxWidth: 'none' }} /></td>
                  <td className="editable-cell"><input type="text" inputMode="numeric" value={fmtInput(d.coutUnitaire)} onChange={e => updateDeprec(d.id, 'coutUnitaire', parseInputValue(e.target.value))} style={{ maxWidth: 'none' }} /></td>
                  <td className="num computed">{fmt(d.valeurStock)}</td>
                  <td className="editable-cell"><input type="text" inputMode="numeric" value={fmtInput(d.valeurActuelle)} onChange={e => updateDeprec(d.id, 'valeurActuelle', parseInputValue(e.target.value))} style={{ maxWidth: 'none' }} /></td>
                  <td className="num ecart-val">{fmt(d.depreciation)}</td>
                  <td className="editable-cell"><input type="text" value={d.motif} onChange={e => updateDeprec(d.id, 'motif', e.target.value)} style={{ maxWidth: 'none', fontSize: '11px' }} placeholder="Rotation, prix..." /></td>
                  <td><button className="revision-od-delete" onClick={() => removeDeprec(d.id)} title="Supprimer"><LuTrash2 size={13} /></button></td>
                </tr>
              ))}
              {deprecLignes.length === 0 && (
                <tr><td colSpan={9} style={{ textAlign: 'center', color: '#999', padding: 16, fontStyle: 'italic' }}>Aucun stock à déprécier identifié.</td></tr>
              )}
            </tbody>
            {deprecLignes.length > 0 && (
              <tfoot>
                <tr>
                  <td colSpan={4}><strong>Total</strong></td>
                  <td className="num"><strong>{fmt(deprecCalcs.reduce((s, d) => s + d.valeurStock, 0))}</strong></td>
                  <td className="num"><strong>{fmt(deprecLignes.reduce((s, d) => s + d.valeurActuelle, 0))}</strong></td>
                  <td className="num ecart-val"><strong>{fmt(totalDeprec)}</strong></td>
                  <td colSpan={2}></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>

        {(deprecLignes.length > 0 || totalDeprec39Balance !== 0) && (
          <div style={{ marginTop: 12, padding: '10px 14px', background: '#f8f9fa', borderRadius: 6, fontSize: '12.5px' }}>
            <table className="revision-table revision-table-small" style={{ maxWidth: 420 }}>
              <tbody>
                <tr><td>Dépréciation calculée (Contrôle 5)</td><td className="num"><strong>{fmt(totalDeprec)}</strong></td></tr>
                <tr><td>Solde 39x en balance</td><td className="num"><strong>{fmt(totalDeprec39Balance)}</strong></td></tr>
                <tr><td>Écart</td><td className={`num ${Math.abs(ecartDeprec) > 0.5 ? 'ecart-val' : 'ok-val'}`}><strong>{fmt(ecartDeprec)}</strong></td></tr>
              </tbody>
            </table>
            {Math.abs(ecartDeprec) < 0.5
              ? <span className="revision-badge ok" style={{ marginLeft: 12 }}>Conforme</span>
              : <span className="revision-badge ko" style={{ marginLeft: 12 }}>Écart</span>
            }
          </div>
        )}

        <div className="revision-od-actions">
          <button className="revision-od-add" onClick={addDeprec}><LuPlus size={13} /> Ajouter un stock à déprécier</button>
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

export default RevisionStocks;
