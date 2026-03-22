import React, { useState, useEffect } from 'react';
import { LuSave, LuChevronDown, LuChevronRight, LuClipboardList, LuPlus, LuTrash2 } from 'react-icons/lu';
import { BalanceLigne } from '../types';
import { ODEcriture, Suggestion, fmt, fmtInput, parseInputValue } from './revisionTypes';
import JournalOD from './JournalOD';

interface RevisionDFProps {
  balanceN: BalanceLigne[];
  exerciceAnnee: number;
  entiteId: number;
  exerciceId: number;
}

// Contrôle 1 : Nouveaux prêts et remboursements
interface PretLigne {
  id: number;
  contratNo: string;
  bailleur: string;
  dateObtention: string;
  soldeN1: number;
  nouveauxEmprunts: number;
  remboursement: number;
  planAmort: number;
}

// Contrôle 2 : Charges d'intérêts
interface InteretLigne {
  id: number;
  contratNo: string;
  bailleur: string;
  compte: string;
  chargesComptabilisees: number;
  releveBancaire: number;
  planRemboursement: number;
}

// Contrôle 3 : Intérêts courus
interface InteretCoururLigne {
  id: number;
  contratNo: string;
  bailleur: string;
  compte: string;
  dateEcheance: string;
  dateFinMois: string;
  interetsMensuels: number;
}

// Contrôle 4 : Autres charges d'emprunt (saisie manuelle, pas de lecture BG)
interface AutreChargeLigne {
  id: number;
  contratNo: string;
  bailleur: string;
  compte: string;
  natureCharge: string;
  releveBancaire: number;
  balance: number;
  planRemboursement: number;
}

const TRAVAUX_DF = [
  'Lister les prêts encore ouverts à la clôture',
  'Préparer les contrats de prêts signés',
  'Réconcilier avec les tableaux d\'amortissement',
  'Vérifier le calcul des dettes rattachées (intérêts courus)',
  'Justifier le paiement des échéances',
  'Vérifier le traitement des contrats de location remplissant les conditions d\'activation (voir DL)',
];

function RevisionDF({ balanceN, exerciceAnnee, entiteId, exerciceId }: RevisionDFProps): React.ReactElement {
  const [prets, setPrets] = useState<PretLigne[]>([]);
  const [interets, setInterets] = useState<InteretLigne[]>([]);
  const [interetsCourus, setInteretsCourus] = useState<InteretCoururLigne[]>([]);
  const [autresCharges, setAutresCharges] = useState<AutreChargeLigne[]>([]);
  const [nextIds, setNextIds] = useState({ pret: 1, interet: 1, couru: 1, autre: 1 });
  const [saved, setSaved] = useState(false);
  const [odEcritures, setOdEcritures] = useState<ODEcriture[]>([]);
  const [nextOdId, setNextOdId] = useState(1);
  const [showTravaux, setShowTravaux] = useState(true);

  // Comptes 16x (emprunts) de la balance
  const comptes16 = balanceN.filter(l => l.numero_compte.startsWith('16'));
  // Comptes 671 (intérêts des emprunts)
  const comptes671 = balanceN.filter(l => l.numero_compte.startsWith('671'));
  // Comptes 631 (autres charges d'emprunt)
  const comptes631 = balanceN.filter(l => l.numero_compte.startsWith('631'));

  const totalSolde16Balance = comptes16.reduce((s, l) =>
    s + ((parseFloat(String(l.solde_crediteur)) || 0) - (parseFloat(String(l.solde_debiteur)) || 0)), 0);

  useEffect(() => { loadSaved(); }, [entiteId, exerciceId]);

  const loadSaved = (): void => {
    fetch(`/api/revision/${entiteId}/${exerciceId}/df`)
      .then(r => { if (r.ok) return r.json(); throw new Error(); })
      .then((data: any) => {
        if (data.prets?.length > 0) {
          setPrets(data.prets);
          setNextIds(prev => ({ ...prev, pret: Math.max(...data.prets.map((a: PretLigne) => a.id)) + 1 }));
        }
        if (data.interets?.length > 0) {
          setInterets(data.interets);
          setNextIds(prev => ({ ...prev, interet: Math.max(...data.interets.map((a: InteretLigne) => a.id)) + 1 }));
        }
        if (data.interetsCourus?.length > 0) {
          setInteretsCourus(data.interetsCourus);
          setNextIds(prev => ({ ...prev, couru: Math.max(...data.interetsCourus.map((a: InteretCoururLigne) => a.id)) + 1 }));
        }
        if (data.autresCharges?.length > 0) {
          setAutresCharges(data.autresCharges);
          setNextIds(prev => ({ ...prev, autre: Math.max(...data.autresCharges.map((a: AutreChargeLigne) => a.id)) + 1 }));
        }
        if (data.odEcritures?.length > 0) {
          setOdEcritures(data.odEcritures);
          setNextOdId(Math.max(...data.odEcritures.map((e: ODEcriture) => e.id)) + 1);
        }
      })
      .catch(() => {});
  };

  const handleSave = async (): Promise<void> => {
    try {
      await fetch(`/api/revision/${entiteId}/${exerciceId}/df`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prets, interets, interetsCourus, autresCharges, odEcritures }),
      });
      setSaved(true);
    } catch { /* silently */ }
  };

  // --- Contrôle 1 : Prêts ---
  const addPret = (): void => {
    setPrets(prev => [...prev, { id: nextIds.pret, contratNo: '', bailleur: '', dateObtention: '', soldeN1: 0, nouveauxEmprunts: 0, remboursement: 0, planAmort: 0 }]);
    setNextIds(prev => ({ ...prev, pret: prev.pret + 1 }));
    setSaved(false);
  };
  const updatePret = (id: number, field: keyof PretLigne, value: string | number): void => {
    setPrets(prev => prev.map(p => p.id === id ? { ...p, [field]: value } : p));
    setSaved(false);
  };
  const removePret = (id: number): void => { setPrets(prev => prev.filter(p => p.id !== id)); setSaved(false); };

  // Calculs Contrôle 1
  const pretCalcs = prets.map(p => {
    const soldeN = p.soldeN1 + p.nouveauxEmprunts - p.remboursement;
    const ecart1 = soldeN - totalSolde16Balance;
    const ecart2 = totalSolde16Balance - p.planAmort;
    return { ...p, soldeN, balanceGenerale: totalSolde16Balance, ecart1, ecart2 };
  });

  // --- Contrôle 2 : Charges d'intérêts ---
  const addInteret = (): void => {
    setInterets(prev => [...prev, { id: nextIds.interet, contratNo: '', bailleur: '', compte: '671200', chargesComptabilisees: 0, releveBancaire: 0, planRemboursement: 0 }]);
    setNextIds(prev => ({ ...prev, interet: prev.interet + 1 }));
    setSaved(false);
  };
  const updateInteret = (id: number, field: keyof InteretLigne, value: string | number): void => {
    setInterets(prev => prev.map(p => p.id === id ? { ...p, [field]: value } : p));
    setSaved(false);
  };
  const removeInteret = (id: number): void => { setInterets(prev => prev.filter(p => p.id !== id)); setSaved(false); };

  const interetCalcs = interets.map(i => {
    const ecart1 = i.chargesComptabilisees - i.releveBancaire;
    const ecart2 = i.planRemboursement - i.releveBancaire;
    return { ...i, ecart1, ecart2 };
  });

  // --- Contrôle 3 : Intérêts courus ---
  const addCouru = (): void => {
    setInteretsCourus(prev => [...prev, { id: nextIds.couru, contratNo: '', bailleur: '', compte: '1662', dateEcheance: '', dateFinMois: `${exerciceAnnee}-12-31`, interetsMensuels: 0 }]);
    setNextIds(prev => ({ ...prev, couru: prev.couru + 1 }));
    setSaved(false);
  };
  const updateCouru = (id: number, field: keyof InteretCoururLigne, value: string | number): void => {
    setInteretsCourus(prev => prev.map(p => p.id === id ? { ...p, [field]: value } : p));
    setSaved(false);
  };
  const removeCouru = (id: number): void => { setInteretsCourus(prev => prev.filter(p => p.id !== id)); setSaved(false); };

  // Comptes 166x (intérêts courus au bilan)
  const comptes166 = balanceN.filter(l => l.numero_compte.startsWith('166'));

  const couruCalcs = interetsCourus.map(c => {
    const d1 = c.dateEcheance ? new Date(c.dateEcheance) : null;
    const d2 = c.dateFinMois ? new Date(c.dateFinMois) : null;
    const decalage = d1 && d2 ? Math.max(0, Math.round((d1.getTime() - d2.getTime()) / (1000 * 60 * 60 * 24))) : 0;
    const interetsCourus = decalage > 0 ? (c.interetsMensuels * decalage) / 31 : 0;
    // Chercher solde balance sur 166x (intérêts courus au bilan)
    const balLigne = comptes166.find(l => l.numero_compte === c.compte) || comptes166.find(l => l.numero_compte.startsWith(c.compte));
    const balanceGenerale = balLigne ? (parseFloat(String(balLigne.solde_crediteur)) || 0) - (parseFloat(String(balLigne.solde_debiteur)) || 0) : 0;
    const ecart = balanceGenerale - interetsCourus;
    return { ...c, decalage, interetsCourus, balanceGenerale, ecart };
  });

  // --- Contrôle 4 : Autres charges d'emprunt ---
  const addAutre = (): void => {
    setAutresCharges(prev => [...prev, { id: nextIds.autre, contratNo: '', bailleur: '', compte: '', natureCharge: '', releveBancaire: 0, balance: 0, planRemboursement: 0 }]);
    setNextIds(prev => ({ ...prev, autre: prev.autre + 1 }));
    setSaved(false);
  };
  const updateAutre = (id: number, field: keyof AutreChargeLigne, value: string | number): void => {
    setAutresCharges(prev => prev.map(p => p.id === id ? { ...p, [field]: value } : p));
    setSaved(false);
  };
  const removeAutre = (id: number): void => { setAutresCharges(prev => prev.filter(p => p.id !== id)); setSaved(false); };

  const autreCalcs = autresCharges.map(a => {
    const ecart1 = a.releveBancaire - a.balance;
    const ecart2 = a.planRemboursement - a.balance;
    return { ...a, ecart1, ecart2 };
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
  const updateOd = (id: number, field: keyof ODEcriture, value: string | number): void => {
    setOdEcritures(prev => prev.map(e => e.id === id ? { ...e, [field]: value } : e));
    setSaved(false);
  };
  const removeOd = (id: number): void => { setOdEcritures(prev => prev.filter(e => e.id !== id)); setSaved(false); };

  // --- Suggestions ---
  const suggestions: Suggestion[] = [];

  // Suggestions Contrôle 1 : écart entre solde calculé et balance
  const totalSoldeNCalc = prets.reduce((s, p) => s + p.soldeN1 + p.nouveauxEmprunts - p.remboursement, 0);
  const ecartC1Global = totalSoldeNCalc - totalSolde16Balance;
  if (prets.length > 0 && Math.abs(ecartC1Global) > 0.5) {
    const dejaPropose = odEcritures.some(od => od.source === 'DF-C1');
    if (!dejaPropose) {
      if (ecartC1Global > 0) {
        suggestions.push({
          compteDebit: '164000', libelleDebit: 'Emprunts auprès des ét. de crédit',
          compteCredit: '521000', libelleCredit: 'Banque',
          montant: ecartC1Global, libelle: 'Remboursement emprunt non comptabilisé',
          source: 'DF-C1',
        });
      } else {
        suggestions.push({
          compteDebit: '521000', libelleDebit: 'Banque',
          compteCredit: '164000', libelleCredit: 'Emprunts auprès des ét. de crédit',
          montant: Math.abs(ecartC1Global), libelle: 'Nouvel emprunt non comptabilisé',
          source: 'DF-C1',
        });
      }
    }
  }

  // Totaux
  const totalPretN1 = prets.reduce((s, p) => s + p.soldeN1, 0);
  const totalNouveaux = prets.reduce((s, p) => s + p.nouveauxEmprunts, 0);
  const totalRembours = prets.reduce((s, p) => s + p.remboursement, 0);
  const totalPlanAmort = prets.reduce((s, p) => s + p.planAmort, 0);

  const totalInteretCharge = interets.reduce((s, i) => s + i.chargesComptabilisees, 0);
  const totalInteretReleve = interets.reduce((s, i) => s + i.releveBancaire, 0);
  const totalInteretPlan = interets.reduce((s, i) => s + i.planRemboursement, 0);

  const totalCouruMensuel = couruCalcs.reduce((s, c) => s + c.interetsMensuels, 0);
  const totalCouruCalc = couruCalcs.reduce((s, c) => s + c.interetsCourus, 0);
  const totalCouruBalance = couruCalcs.reduce((s, c) => s + c.balanceGenerale, 0);

  const totalAutreReleve = autresCharges.reduce((s, a) => s + a.releveBancaire, 0);
  const totalAutreBalance = autresCharges.reduce((s, a) => s + a.balance, 0);
  const totalAutrePlan = autresCharges.reduce((s, a) => s + a.planRemboursement, 0);

  return (
    <div className="revision-kp">
      <div className="revision-section-header">
        <h3>Dettes financières</h3>
        <button className="revision-save-btn" onClick={handleSave}>
          <LuSave size={14} /> {saved ? 'Sauvegardé' : 'Sauvegarder'}
        </button>
      </div>

      <div className="revision-objectif">
        <strong>Objectif :</strong> S'assurer de l'exhaustivité et de la correcte évaluation des dettes financières et emprunts contractés auprès d'établissements bancaires ou financiers, ainsi que du bon calcul des charges d'intérêts et intérêts courus.
      </div>

      <div className="revision-travaux">
        <button className="revision-travaux-toggle" onClick={() => setShowTravaux(!showTravaux)}>
          {showTravaux ? <LuChevronDown size={14} /> : <LuChevronRight size={14} />}
          <LuClipboardList size={14} />
          <span>Travaux à effectuer</span>
        </button>
        {showTravaux && (
          <ul className="revision-travaux-list">
            {TRAVAUX_DF.map((t, i) => <li key={i}>{t}</li>)}
          </ul>
        )}
      </div>

      {/* Note d'information si comptes 16x présents */}
      {comptes16.length > 0 && prets.length === 0 && (
        <div className="revision-objectif">
          <strong>Information :</strong> La balance contient {comptes16.length} compte{comptes16.length > 1 ? 's' : ''} de dettes financières (16x) pour un solde total de <strong>{fmt(totalSolde16Balance)}</strong>.
          <ul>
            {comptes16.map(l => (
              <li key={l.numero_compte}>
                <strong>{l.numero_compte}</strong> — {l.libelle_compte} : {fmt((parseFloat(String(l.solde_crediteur)) || 0) - (parseFloat(String(l.solde_debiteur)) || 0))}
              </li>
            ))}
          </ul>
          Ajoutez les prêts correspondants dans le contrôle ci-dessous pour vérifier la cohérence.
        </div>
      )}

      {/* Contrôle 1 : Nouveaux prêts et remboursements */}
      <div className="revision-control">
        <div className="revision-control-title">
          <span>Contrôle 1 — Nouveaux prêts et remboursements</span>
          {prets.length > 0 && (Math.abs(ecartC1Global) < 0.5
            ? <span className="revision-badge ok">Conforme</span>
            : <span className="revision-badge ko">Écart détecté</span>
          )}
        </div>

        <div className="revision-table-wrapper">
          <table className="revision-table">
            <thead>
              <tr>
                <th style={{ width: 90 }}>Contrat n°</th>
                <th>Bailleur de fonds</th>
                <th style={{ width: 110 }}>Date obtention</th>
                <th className="num editable-col" style={{ width: 120 }}>Solde 31/12/N-1</th>
                <th className="num editable-col" style={{ width: 120 }}>Nvx emprunts</th>
                <th className="num editable-col" style={{ width: 120 }}>Remboursement</th>
                <th className="num" style={{ width: 120 }}>Solde 31/12/N</th>
                <th className="num" style={{ width: 120 }}>Balance gén.</th>
                <th className="num" style={{ width: 90 }}>Écart 1</th>
                <th className="num editable-col" style={{ width: 120 }}>Plan amort.</th>
                <th className="num" style={{ width: 90 }}>Écart 2</th>
                <th style={{ width: 30 }}></th>
              </tr>
            </thead>
            <tbody>
              {pretCalcs.map(p => (
                <tr key={p.id} className={Math.abs(p.ecart1) > 0.5 ? 'ecart-row' : ''}>
                  <td className="editable-cell"><input type="text" value={p.contratNo} onChange={e => updatePret(p.id, 'contratNo', e.target.value)} style={{ maxWidth: 'none' }} /></td>
                  <td className="editable-cell"><input type="text" value={p.bailleur} onChange={e => updatePret(p.id, 'bailleur', e.target.value)} style={{ maxWidth: 'none' }} /></td>
                  <td className="editable-cell"><input type="date" value={p.dateObtention} onChange={e => updatePret(p.id, 'dateObtention', e.target.value)} style={{ maxWidth: 'none' }} /></td>
                  <td className="editable-cell"><input type="text" inputMode="numeric" value={fmtInput(p.soldeN1)} onChange={e => updatePret(p.id, 'soldeN1', parseInputValue(e.target.value))} style={{ maxWidth: 'none' }} /></td>
                  <td className="editable-cell"><input type="text" inputMode="numeric" value={fmtInput(p.nouveauxEmprunts)} onChange={e => updatePret(p.id, 'nouveauxEmprunts', parseInputValue(e.target.value))} style={{ maxWidth: 'none' }} /></td>
                  <td className="editable-cell"><input type="text" inputMode="numeric" value={fmtInput(p.remboursement)} onChange={e => updatePret(p.id, 'remboursement', parseInputValue(e.target.value))} style={{ maxWidth: 'none' }} /></td>
                  <td className="num computed">{fmt(p.soldeN)}</td>
                  <td className="num">{fmt(p.balanceGenerale)}</td>
                  <td className={`num ${Math.abs(p.ecart1) > 0.5 ? 'ecart-val' : 'ok-val'}`}>{fmt(p.ecart1)}</td>
                  <td className="editable-cell"><input type="text" inputMode="numeric" value={fmtInput(p.planAmort)} onChange={e => updatePret(p.id, 'planAmort', parseInputValue(e.target.value))} style={{ maxWidth: 'none' }} /></td>
                  <td className={`num ${Math.abs(p.ecart2) > 0.5 ? 'ecart-val' : 'ok-val'}`}>{fmt(p.ecart2)}</td>
                  <td><button className="revision-od-delete" onClick={() => removePret(p.id)} title="Supprimer"><LuTrash2 size={13} /></button></td>
                </tr>
              ))}
              {prets.length === 0 && (
                <tr><td colSpan={12} style={{ textAlign: 'center', color: '#999', padding: 16, fontStyle: 'italic' }}>Aucun prêt saisi. Ajoutez les prêts en cours à la clôture.</td></tr>
              )}
            </tbody>
            {prets.length > 0 && (
              <tfoot>
                <tr>
                  <td colSpan={3}><strong>Total</strong></td>
                  <td className="num"><strong>{fmt(totalPretN1)}</strong></td>
                  <td className="num"><strong>{fmt(totalNouveaux)}</strong></td>
                  <td className="num"><strong>{fmt(totalRembours)}</strong></td>
                  <td className="num"><strong>{fmt(totalSoldeNCalc)}</strong></td>
                  <td className="num"><strong>{fmt(totalSolde16Balance)}</strong></td>
                  <td className={`num ${Math.abs(ecartC1Global) > 0.5 ? 'ecart-val' : 'ok-val'}`}><strong>{fmt(ecartC1Global)}</strong></td>
                  <td className="num"><strong>{fmt(totalPlanAmort)}</strong></td>
                  <td className={`num ${Math.abs(totalSolde16Balance - totalPlanAmort) > 0.5 ? 'ecart-val' : 'ok-val'}`}><strong>{fmt(totalSolde16Balance - totalPlanAmort)}</strong></td>
                  <td></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
        <div className="revision-od-actions">
          <button className="revision-od-add" onClick={addPret}><LuPlus size={13} /> Ajouter un prêt</button>
        </div>
      </div>

      {/* Contrôle 2 : Charges d'intérêts */}
      <div className="revision-control">
        <div className="revision-control-title">
          <span>Contrôle 2 — Charges d'intérêts</span>
          {interets.length > 0 && (Math.abs(totalInteretCharge - totalInteretReleve) < 0.5
            ? <span className="revision-badge ok">Conforme</span>
            : <span className="revision-badge ko">Écart détecté</span>
          )}
        </div>
        <div className="revision-ref">Compte de référence : 671200 — Intérêts des emprunts</div>

        <div className="revision-table-wrapper" style={{ marginTop: 8 }}>
          <table className="revision-table">
            <thead>
              <tr>
                <th style={{ width: 90 }}>Contrat n°</th>
                <th>Bailleur de fonds</th>
                <th style={{ width: 90 }}>Compte</th>
                <th className="num editable-col" style={{ width: 130 }}>Charges compt.</th>
                <th className="num editable-col" style={{ width: 130 }}>Relevé bancaire</th>
                <th className="num" style={{ width: 100 }}>Écart 1</th>
                <th className="num editable-col" style={{ width: 130 }}>Plan rembours.</th>
                <th className="num" style={{ width: 100 }}>Écart 2</th>
                <th style={{ width: 30 }}></th>
              </tr>
            </thead>
            <tbody>
              {interetCalcs.map(i => (
                <tr key={i.id} className={Math.abs(i.ecart1) > 0.5 ? 'ecart-row' : ''}>
                  <td className="editable-cell"><input type="text" value={i.contratNo} onChange={e => updateInteret(i.id, 'contratNo', e.target.value)} style={{ maxWidth: 'none' }} /></td>
                  <td className="editable-cell"><input type="text" value={i.bailleur} onChange={e => updateInteret(i.id, 'bailleur', e.target.value)} style={{ maxWidth: 'none' }} /></td>
                  <td className="editable-cell"><input type="text" value={i.compte} onChange={e => updateInteret(i.id, 'compte', e.target.value)} style={{ fontFamily: 'monospace', maxWidth: 90 }} /></td>
                  <td className="editable-cell"><input type="text" inputMode="numeric" value={fmtInput(i.chargesComptabilisees)} onChange={e => updateInteret(i.id, 'chargesComptabilisees', parseInputValue(e.target.value))} style={{ maxWidth: 'none' }} /></td>
                  <td className="editable-cell"><input type="text" inputMode="numeric" value={fmtInput(i.releveBancaire)} onChange={e => updateInteret(i.id, 'releveBancaire', parseInputValue(e.target.value))} style={{ maxWidth: 'none' }} /></td>
                  <td className={`num ${Math.abs(i.ecart1) > 0.5 ? 'ecart-val' : 'ok-val'}`}>{fmt(i.ecart1)}</td>
                  <td className="editable-cell"><input type="text" inputMode="numeric" value={fmtInput(i.planRemboursement)} onChange={e => updateInteret(i.id, 'planRemboursement', parseInputValue(e.target.value))} style={{ maxWidth: 'none' }} /></td>
                  <td className={`num ${Math.abs(i.ecart2) > 0.5 ? 'ecart-val' : 'ok-val'}`}>{fmt(i.ecart2)}</td>
                  <td><button className="revision-od-delete" onClick={() => removeInteret(i.id)} title="Supprimer"><LuTrash2 size={13} /></button></td>
                </tr>
              ))}
              {interets.length === 0 && (
                <tr><td colSpan={9} style={{ textAlign: 'center', color: '#999', padding: 16, fontStyle: 'italic' }}>Aucune charge d'intérêt saisie.</td></tr>
              )}
            </tbody>
            {interets.length > 0 && (
              <tfoot>
                <tr>
                  <td colSpan={3}><strong>Total</strong></td>
                  <td className="num"><strong>{fmt(totalInteretCharge)}</strong></td>
                  <td className="num"><strong>{fmt(totalInteretReleve)}</strong></td>
                  <td className={`num ${Math.abs(totalInteretCharge - totalInteretReleve) > 0.5 ? 'ecart-val' : 'ok-val'}`}><strong>{fmt(totalInteretCharge - totalInteretReleve)}</strong></td>
                  <td className="num"><strong>{fmt(totalInteretPlan)}</strong></td>
                  <td className={`num ${Math.abs(totalInteretPlan - totalInteretReleve) > 0.5 ? 'ecart-val' : 'ok-val'}`}><strong>{fmt(totalInteretPlan - totalInteretReleve)}</strong></td>
                  <td></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
        <div className="revision-od-actions">
          <button className="revision-od-add" onClick={addInteret}><LuPlus size={13} /> Ajouter une charge d'intérêt</button>
        </div>
      </div>

      {/* Contrôle 3 : Intérêts courus */}
      <div className="revision-control">
        <div className="revision-control-title">
          <span>Contrôle 3 — Intérêts courus</span>
          {interetsCourus.length > 0 && (Math.abs(totalCouruBalance - totalCouruCalc) < 0.5
            ? <span className="revision-badge ok">Conforme</span>
            : <span className="revision-badge ko">Écart détecté</span>
          )}
        </div>

        <div className="revision-table-wrapper">
          <table className="revision-table">
            <thead>
              <tr>
                <th style={{ width: 90 }}>Contrat n°</th>
                <th>Bailleur de fonds</th>
                <th style={{ width: 90 }}>Compte</th>
                <th style={{ width: 110 }}>Date échéance</th>
                <th style={{ width: 110 }}>Fin de mois</th>
                <th className="num" style={{ width: 80 }}>Décalage (j)</th>
                <th className="num editable-col" style={{ width: 120 }}>Intérêts mens.</th>
                <th className="num" style={{ width: 120 }}>Int. courus calc.</th>
                <th className="num" style={{ width: 120 }}>Balance gén.</th>
                <th className="num" style={{ width: 90 }}>Écart</th>
                <th style={{ width: 30 }}></th>
              </tr>
            </thead>
            <tbody>
              {couruCalcs.map(c => (
                <tr key={c.id} className={Math.abs(c.ecart) > 0.5 ? 'ecart-row' : ''}>
                  <td className="editable-cell"><input type="text" value={c.contratNo} onChange={e => updateCouru(c.id, 'contratNo', e.target.value)} style={{ maxWidth: 'none' }} /></td>
                  <td className="editable-cell"><input type="text" value={c.bailleur} onChange={e => updateCouru(c.id, 'bailleur', e.target.value)} style={{ maxWidth: 'none' }} /></td>
                  <td className="editable-cell"><input type="text" value={c.compte} onChange={e => updateCouru(c.id, 'compte', e.target.value)} style={{ fontFamily: 'monospace', maxWidth: 90 }} /></td>
                  <td className="editable-cell"><input type="date" value={c.dateEcheance} onChange={e => updateCouru(c.id, 'dateEcheance', e.target.value)} style={{ maxWidth: 'none' }} /></td>
                  <td className="editable-cell"><input type="date" value={c.dateFinMois} onChange={e => updateCouru(c.id, 'dateFinMois', e.target.value)} style={{ maxWidth: 'none' }} /></td>
                  <td className="num computed">{c.decalage}</td>
                  <td className="editable-cell"><input type="text" inputMode="numeric" value={fmtInput(c.interetsMensuels)} onChange={e => updateCouru(c.id, 'interetsMensuels', parseInputValue(e.target.value))} style={{ maxWidth: 'none' }} /></td>
                  <td className="num computed">{fmt(c.interetsCourus)}</td>
                  <td className="num">{fmt(c.balanceGenerale)}</td>
                  <td className={`num ${Math.abs(c.ecart) > 0.5 ? 'ecart-val' : 'ok-val'}`}>{fmt(c.ecart)}</td>
                  <td><button className="revision-od-delete" onClick={() => removeCouru(c.id)} title="Supprimer"><LuTrash2 size={13} /></button></td>
                </tr>
              ))}
              {interetsCourus.length === 0 && (
                <tr><td colSpan={11} style={{ textAlign: 'center', color: '#999', padding: 16, fontStyle: 'italic' }}>Aucun intérêt couru saisi.</td></tr>
              )}
            </tbody>
            {interetsCourus.length > 0 && (
              <tfoot>
                <tr>
                  <td colSpan={6}><strong>Total</strong></td>
                  <td className="num"><strong>{fmt(totalCouruMensuel)}</strong></td>
                  <td className="num"><strong>{fmt(totalCouruCalc)}</strong></td>
                  <td className="num"><strong>{fmt(totalCouruBalance)}</strong></td>
                  <td className={`num ${Math.abs(totalCouruBalance - totalCouruCalc) > 0.5 ? 'ecart-val' : 'ok-val'}`}><strong>{fmt(totalCouruBalance - totalCouruCalc)}</strong></td>
                  <td></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
        <div className="revision-od-actions">
          <button className="revision-od-add" onClick={addCouru}><LuPlus size={13} /> Ajouter un intérêt couru</button>
        </div>
      </div>

      {/* Contrôle 4 : Autres charges d'emprunt */}
      <div className="revision-control">
        <div className="revision-control-title">
          <span>Contrôle 4 — Autres charges d'emprunt</span>
          {autresCharges.length > 0 && (Math.abs(totalAutreReleve - totalAutreBalance) < 0.5
            ? <span className="revision-badge ok">Conforme</span>
            : <span className="revision-badge ko">Écart détecté</span>
          )}
        </div>
        <div className="revision-ref">Saisie manuelle — les comptes concernés peuvent varier (6316 frais d'émission, 6318 autres frais bancaires, etc.)</div>

        <div className="revision-table-wrapper" style={{ marginTop: 8 }}>
          <table className="revision-table">
            <thead>
              <tr>
                <th style={{ width: 90 }}>Contrat n°</th>
                <th>Bailleur de fonds</th>
                <th style={{ width: 90 }}>Compte</th>
                <th>Nature charge</th>
                <th className="num editable-col" style={{ width: 120 }}>Relevé bancaire</th>
                <th className="num editable-col" style={{ width: 120 }}>Balance</th>
                <th className="num" style={{ width: 90 }}>Écart 1</th>
                <th className="num editable-col" style={{ width: 120 }}>Plan rembours.</th>
                <th className="num" style={{ width: 90 }}>Écart 2</th>
                <th style={{ width: 30 }}></th>
              </tr>
            </thead>
            <tbody>
              {autreCalcs.map(a => (
                <tr key={a.id} className={Math.abs(a.ecart1) > 0.5 ? 'ecart-row' : ''}>
                  <td className="editable-cell"><input type="text" value={a.contratNo} onChange={e => updateAutre(a.id, 'contratNo', e.target.value)} style={{ maxWidth: 'none' }} /></td>
                  <td className="editable-cell"><input type="text" value={a.bailleur} onChange={e => updateAutre(a.id, 'bailleur', e.target.value)} style={{ maxWidth: 'none' }} /></td>
                  <td className="editable-cell"><input type="text" value={a.compte} onChange={e => updateAutre(a.id, 'compte', e.target.value)} style={{ fontFamily: 'monospace', maxWidth: 90 }} /></td>
                  <td className="editable-cell"><input type="text" value={a.natureCharge} onChange={e => updateAutre(a.id, 'natureCharge', e.target.value)} style={{ maxWidth: 'none' }} /></td>
                  <td className="editable-cell"><input type="text" inputMode="numeric" value={fmtInput(a.releveBancaire)} onChange={e => updateAutre(a.id, 'releveBancaire', parseInputValue(e.target.value))} style={{ maxWidth: 'none' }} /></td>
                  <td className="editable-cell"><input type="text" inputMode="numeric" value={fmtInput(a.balance)} onChange={e => updateAutre(a.id, 'balance', parseInputValue(e.target.value))} style={{ maxWidth: 'none' }} /></td>
                  <td className={`num ${Math.abs(a.ecart1) > 0.5 ? 'ecart-val' : 'ok-val'}`}>{fmt(a.ecart1)}</td>
                  <td className="editable-cell"><input type="text" inputMode="numeric" value={fmtInput(a.planRemboursement)} onChange={e => updateAutre(a.id, 'planRemboursement', parseInputValue(e.target.value))} style={{ maxWidth: 'none' }} /></td>
                  <td className={`num ${Math.abs(a.ecart2) > 0.5 ? 'ecart-val' : 'ok-val'}`}>{fmt(a.ecart2)}</td>
                  <td><button className="revision-od-delete" onClick={() => removeAutre(a.id)} title="Supprimer"><LuTrash2 size={13} /></button></td>
                </tr>
              ))}
              {autresCharges.length === 0 && (
                <tr><td colSpan={10} style={{ textAlign: 'center', color: '#999', padding: 16, fontStyle: 'italic' }}>Aucune autre charge d'emprunt saisie.</td></tr>
              )}
            </tbody>
            {autresCharges.length > 0 && (
              <tfoot>
                <tr>
                  <td colSpan={4}><strong>Total</strong></td>
                  <td className="num"><strong>{fmt(totalAutreReleve)}</strong></td>
                  <td className="num"><strong>{fmt(totalAutreBalance)}</strong></td>
                  <td className={`num ${Math.abs(totalAutreReleve - totalAutreBalance) > 0.5 ? 'ecart-val' : 'ok-val'}`}><strong>{fmt(totalAutreReleve - totalAutreBalance)}</strong></td>
                  <td className="num"><strong>{fmt(totalAutrePlan)}</strong></td>
                  <td className={`num ${Math.abs(totalAutrePlan - totalAutreBalance) > 0.5 ? 'ecart-val' : 'ok-val'}`}><strong>{fmt(totalAutrePlan - totalAutreBalance)}</strong></td>
                  <td></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
        <div className="revision-od-actions">
          <button className="revision-od-add" onClick={addAutre}><LuPlus size={13} /> Ajouter une charge</button>
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

export default RevisionDF;
