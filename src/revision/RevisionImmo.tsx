import React, { useState, useEffect } from 'react';
import { LuSave, LuChevronDown, LuChevronRight, LuClipboardList, LuPlus, LuTrash2 } from 'react-icons/lu';
import { BalanceLigne } from '../types';
import { ODEcriture, Suggestion, fmt, fmtInput, parseInputValue } from './revisionTypes';
import JournalOD from './JournalOD';
import FonctionnementCompte from './FonctionnementCompte';

interface RevisionImmoProps {
  balanceN: BalanceLigne[];
  exerciceAnnee: number;
  entiteId: number;
  exerciceId: number;
}

// Contrôle 1 : Rapprochement Fichier immo vs Inventaire
interface InvLigne {
  id: number;
  idImmo: string;
  designation: string;
  nombre: number;
  valeurFichier: number;
  pvInventaire: number;
}

// Contrôle 2 : Rapprochement Fichier immo vs Balance générale
interface RapprochLigne {
  compte: string;
  designation: string;
  fichierImmo: number;
  balanceGenerale: number;
}

// Contrôle 3 : Encours
interface EncoursLigne {
  id: number;
  projet: string;
  designation: string;
  fournisseur: string;
  numFacture: string;
  dateFacture: string;
  montant: number;
}

// Contrôle 4 : Sorties / Cessions
interface SortieLigne {
  id: number;
  numFichier: string;
  designation: string;
  natureSortie: string; // Cession, Mise au rebut
  valeurBrute: number;
  cumulAmort: number;
  prixCession: number;
  docJustificatif: string;
}

// Contrôle 5 : Calcul des amortissements
interface AmortLigne {
  id: number;
  numFichier: string;
  designation: string;
  dateMiseEnService: string;
  natureImmo: string;
  dureeUtilite: number;
  baseAmortissable: number;
}

// Contrôle 6 : Charges pouvant être immobilisées
interface ChargeImmoLigne {
  id: number;
  compte: string;
  designation: string;
  natureDepense: string;
  montant: number;
  frequence: string;
  conclusion: string; // 'immobiliser' | 'ne_pas_immobiliser'
}

const TRAVAUX_IMMO = [
  'Inventaires de fin d\'année et rapprochement avec le(s) fichier(s) des immobilisations',
  'Dresser un procès-verbal d\'inventaire',
  'Tableau de mouvements des immobilisations incorporelles, corporelles, financières',
  'Fichier des immobilisations, des acquisitions, des cessions, des transferts, des amortissements',
  'Détail des immobilisations en cours',
  'Détail des mises au rebut (préparer les procès-verbaux associés)',
  'Dossiers des cessions d\'immobilisations (factures, actes notariés, preuves de paiements)',
  'États financiers à la clôture des filiales et participations (titres de participation)',
  'Justifier le compte "Avances sur immobilisations" ou le solder si N/A',
  'Vérifier le calcul des amortissements (dotations de l\'exercice) et le taux appliqué',
  'Analyser les charges pouvant être immobilisées et justifier l\'immobilisation si applicable',
  'Vérifier le calcul des amortissements différés (si applicable)',
  'Préparer les lettres de circularisation avec les CAC pour les dépôts et cautionnements',
];

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

  // Comptes d'immobilisations (21x-27x) en balance — le SYSCOHADA révisé n'a plus de compte 20
  const comptesImmo = balanceN.filter(l => {
    const p2 = l.numero_compte.substring(0, 2);
    return p2 >= '21' && p2 <= '27';
  });
  // Comptes d'amortissements (28x)
  const comptesAmort = balanceN.filter(l => l.numero_compte.startsWith('28'));
  // Comptes de provisions pour dépréciation (29x)
  const comptesProv29 = balanceN.filter(l => l.numero_compte.startsWith('29'));

  useEffect(() => { loadSaved(); }, [entiteId, exerciceId]);

  const loadSaved = (): void => {
    fetch(`/api/revision/${entiteId}/${exerciceId}/immo`)
      .then(r => { if (r.ok) return r.json(); throw new Error(); })
      .then((data: any) => {
        if (data.invLignes?.length > 0) { setInvLignes(data.invLignes); setNextIds(prev => ({ ...prev, inv: Math.max(...data.invLignes.map((a: InvLigne) => a.id)) + 1 })); }
        if (data.encoursLignes?.length > 0) { setEncoursLignes(data.encoursLignes); setNextIds(prev => ({ ...prev, enc: Math.max(...data.encoursLignes.map((a: EncoursLigne) => a.id)) + 1 })); }
        if (data.sortieLignes?.length > 0) { setSortieLignes(data.sortieLignes); setNextIds(prev => ({ ...prev, sort: Math.max(...data.sortieLignes.map((a: SortieLigne) => a.id)) + 1 })); }
        if (data.amortLignes?.length > 0) { setAmortLignes(data.amortLignes); setNextIds(prev => ({ ...prev, amort: Math.max(...data.amortLignes.map((a: AmortLigne) => a.id)) + 1 })); }
        if (data.chargeImmoLignes?.length > 0) { setChargeImmoLignes(data.chargeImmoLignes); setNextIds(prev => ({ ...prev, charge: Math.max(...data.chargeImmoLignes.map((a: ChargeImmoLigne) => a.id)) + 1 })); }
        if (data.rapprochEdit) setRapprochEdit(data.rapprochEdit);
        if (data.odEcritures?.length > 0) { setOdEcritures(data.odEcritures); setNextOdId(Math.max(...data.odEcritures.map((e: ODEcriture) => e.id)) + 1); }
      })
      .catch(() => {});
  };

  const handleSave = async (): Promise<void> => {
    try {
      await fetch(`/api/revision/${entiteId}/${exerciceId}/immo`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ invLignes, rapprochEdit, encoursLignes, sortieLignes, amortLignes, chargeImmoLignes, odEcritures }),
      });
      setSaved(true);
    } catch { /* silently */ }
  };

  // --- Helpers CRUD ---
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

  // --- Contrôle 2 : Rapprochement auto depuis balance ---
  const rapprochLignes: RapprochLigne[] = comptesImmo.map(l => {
    const solde = (parseFloat(String(l.solde_debiteur)) || 0) - (parseFloat(String(l.solde_crediteur)) || 0);
    return {
      compte: l.numero_compte,
      designation: l.libelle_compte,
      fichierImmo: rapprochEdit[l.numero_compte] ?? 0,
      balanceGenerale: solde,
    };
  });

  const totalFichierImmo = rapprochLignes.reduce((s, l) => s + l.fichierImmo, 0);
  const totalBalanceImmo = rapprochLignes.reduce((s, l) => s + l.balanceGenerale, 0);
  const totalEcartRapproch = totalFichierImmo - totalBalanceImmo;

  // --- Contrôle 5 : Calcul amortissements ---
  const dateCloture = new Date(`${exerciceAnnee}-12-31`);
  const amortCalcs = amortLignes.map(a => {
    const taux = a.dureeUtilite > 0 ? 1 / a.dureeUtilite : 0;
    const dateMES = a.dateMiseEnService ? new Date(a.dateMiseEnService) : null;
    const joursEcoules = dateMES ? Math.max(0, (dateCloture.getTime() - dateMES.getTime()) / (1000 * 60 * 60 * 24)) : 0;
    const joursTotal = a.dureeUtilite * 365;
    const cumulAmortCalc = joursTotal > 0 ? a.baseAmortissable * taux * joursEcoules / 365 : 0;
    // Plafonner au base amortissable
    const cumulFinal = Math.min(cumulAmortCalc, a.baseAmortissable);
    return { ...a, taux, cumulAmortCalc: cumulFinal };
  });

  const totalBaseAmort = amortLignes.reduce((s, a) => s + a.baseAmortissable, 0);
  const totalCumulAmortCalc = amortCalcs.reduce((s, a) => s + a.cumulAmortCalc, 0);
  // Solde 28x en balance pour rapprochement
  const totalAmort28Balance = comptesAmort.reduce((s, l) =>
    s + ((parseFloat(String(l.solde_crediteur)) || 0) - (parseFloat(String(l.solde_debiteur)) || 0)), 0);
  const ecartAmort = totalCumulAmortCalc - totalAmort28Balance;

  // --- Contrôle 4 : Calculs cessions ---
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

  // Suggestion si écart fichier immo vs balance (contrôle 2)
  if (rapprochLignes.length > 0 && Math.abs(totalEcartRapproch) > 0.5) {
    const dejaPropose = odEcritures.some(od => od.source === 'Immo-C2');
    if (!dejaPropose) {
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
  }

  // Suggestion si écart amortissements calculés vs balance (contrôle 5)
  if (amortLignes.length > 0 && Math.abs(ecartAmort) > 0.5) {
    const dejaPropose = odEcritures.some(od => od.source === 'Immo-C5');
    if (!dejaPropose) {
      if (ecartAmort > 0) {
        // Amort calculé > balance → dotation manquante
        suggestions.push({
          compteDebit: '6813', libelleDebit: 'Dotations aux amortissements des immob. corporelles',
          compteCredit: '28', libelleCredit: 'Amortissements des immobilisations',
          montant: ecartAmort, libelle: 'Complément de dotation aux amortissements',
          source: 'Immo-C5',
        });
      } else {
        // Amort calculé < balance → excès d'amortissement
        suggestions.push({
          compteDebit: '28', libelleDebit: 'Amortissements des immobilisations',
          compteCredit: '798', libelleCredit: 'Reprises d\'amortissements',
          montant: Math.abs(ecartAmort), libelle: 'Reprise d\'amortissement excédentaire',
          source: 'Immo-C5',
        });
      }
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

      {/* Note si comptes immo présents en balance */}
      {comptesImmo.length > 0 && invLignes.length === 0 && rapprochLignes.every(l => l.fichierImmo === 0) && (
        <div className="revision-objectif">
          <strong>Information :</strong> La balance contient {comptesImmo.length} compte{comptesImmo.length > 1 ? 's' : ''} d'immobilisations (21x-27x) pour une valeur brute totale de <strong>{fmt(totalBalanceImmo)}</strong>.
          {comptesAmort.length > 0 && <> Amortissements (28x) : <strong>{fmt(totalAmort28Balance)}</strong>.</>}
          {comptesProv29.length > 0 && <> Provisions pour dépréciation (29x) : <strong>{fmt(comptesProv29.reduce((s, l) => s + ((parseFloat(String(l.solde_crediteur)) || 0) - (parseFloat(String(l.solde_debiteur)) || 0)), 0))}</strong>.</>}
          <br />Complétez les contrôles ci-dessous pour vérifier la cohérence avec le fichier des immobilisations.
        </div>
      )}

      {/* Contrôle 1 : Rapprochement Fichier immo vs Inventaire physique */}
      <div className="revision-control">
        <div className="revision-control-title">
          <span>Contrôle 1 — Rapprochement fichier des immobilisations vs inventaire physique</span>
        </div>

        <div className="revision-table-wrapper">
          <table className="revision-table">
            <thead>
              <tr>
                <th style={{ width: 90 }}>Id immo</th>
                <th>Désignation</th>
                <th className="num editable-col" style={{ width: 80 }}>Nombre</th>
                <th className="num editable-col" style={{ width: 140 }}>Valeur fichier immo</th>
                <th className="num editable-col" style={{ width: 120 }}>PV inventaire</th>
                <th className="num" style={{ width: 100 }}>Écart</th>
                <th style={{ width: 30 }}></th>
              </tr>
            </thead>
            <tbody>
              {invLignes.map(l => {
                const ecart = l.pvInventaire - l.nombre;
                return (
                  <tr key={l.id} className={ecart !== 0 ? 'ecart-row' : ''}>
                    <td className="editable-cell"><input type="text" value={l.idImmo} onChange={e => updateInv(l.id, 'idImmo', e.target.value)} style={{ maxWidth: 'none', fontFamily: 'monospace' }} /></td>
                    <td className="editable-cell"><input type="text" value={l.designation} onChange={e => updateInv(l.id, 'designation', e.target.value)} style={{ maxWidth: 'none' }} /></td>
                    <td className="editable-cell"><input type="text" inputMode="numeric" value={l.nombre || ''} onChange={e => updateInv(l.id, 'nombre', parseInt(e.target.value) || 0)} style={{ maxWidth: 'none' }} /></td>
                    <td className="editable-cell"><input type="text" inputMode="numeric" value={fmtInput(l.valeurFichier)} onChange={e => updateInv(l.id, 'valeurFichier', parseInputValue(e.target.value))} style={{ maxWidth: 'none' }} /></td>
                    <td className="editable-cell"><input type="text" inputMode="numeric" value={l.pvInventaire || ''} onChange={e => updateInv(l.id, 'pvInventaire', parseInt(e.target.value) || 0)} style={{ maxWidth: 'none' }} /></td>
                    <td className={`num ${ecart !== 0 ? 'ecart-val' : 'ok-val'}`}>{ecart !== 0 ? ecart : ''}</td>
                    <td><button className="revision-od-delete" onClick={() => removeInv(l.id)} title="Supprimer"><LuTrash2 size={13} /></button></td>
                  </tr>
                );
              })}
              {invLignes.length === 0 && (
                <tr><td colSpan={7} style={{ textAlign: 'center', color: '#999', padding: 16, fontStyle: 'italic' }}>Aucune immobilisation saisie. Ajoutez les éléments du fichier des immobilisations.</td></tr>
              )}
            </tbody>
            {invLignes.length > 0 && (
              <tfoot>
                <tr>
                  <td colSpan={3}><strong>Total</strong></td>
                  <td className="num"><strong>{fmt(invLignes.reduce((s, l) => s + l.valeurFichier, 0))}</strong></td>
                  <td colSpan={3}></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
        <div className="revision-od-actions">
          <button className="revision-od-add" onClick={addInv}><LuPlus size={13} /> Ajouter une immobilisation</button>
        </div>
      </div>

      {/* Contrôle 2 : Rapprochement Fichier immo vs Balance générale */}
      <div className="revision-control">
        <div className="revision-control-title">
          <span>Contrôle 2 — Rapprochement fichier des immobilisations vs balance générale</span>
          {rapprochLignes.length > 0 && (Math.abs(totalEcartRapproch) < 0.5
            ? <span className="revision-badge ok">Conforme</span>
            : <span className="revision-badge ko">Écart détecté</span>
          )}
        </div>
        <div className="revision-ref">Comptes 20x à 27x — saisissez la valeur du fichier immo pour chaque compte</div>

        <div className="revision-table-wrapper" style={{ marginTop: 8 }}>
          <table className="revision-table">
            <thead>
              <tr>
                <th style={{ width: 90 }}>Compte</th>
                <th>Désignation</th>
                <th className="num editable-col" style={{ width: 140 }}>Fichier des immo</th>
                <th className="num" style={{ width: 140 }}>Balance générale</th>
                <th className="num" style={{ width: 120 }}>Écart</th>
                <th style={{ width: 120 }}>Observations</th>
              </tr>
            </thead>
            <tbody>
              {rapprochLignes.map(l => {
                const ecart = l.fichierImmo - l.balanceGenerale;
                return (
                  <tr key={l.compte} className={Math.abs(ecart) > 0.5 ? 'ecart-row' : ''}>
                    <td className="compte">{l.compte}</td>
                    <td>{l.designation}</td>
                    <td className="editable-cell">
                      <input type="text" inputMode="numeric" value={fmtInput(l.fichierImmo)} onChange={e => {
                        const val = parseInputValue(e.target.value);
                        setRapprochEdit(prev => ({ ...prev, [l.compte]: val }));
                        setSaved(false);
                      }} style={{ maxWidth: 'none' }} />
                    </td>
                    <td className="num">{fmt(l.balanceGenerale)}</td>
                    <td className={`num ${Math.abs(ecart) > 0.5 ? 'ecart-val' : 'ok-val'}`}>{fmt(ecart)}</td>
                    <td></td>
                  </tr>
                );
              })}
              {rapprochLignes.length === 0 && (
                <tr><td colSpan={6} style={{ textAlign: 'center', color: '#999', padding: 16, fontStyle: 'italic' }}>Aucun compte d'immobilisation (21x-27x) dans la balance.</td></tr>
              )}
            </tbody>
            {rapprochLignes.length > 0 && (
              <tfoot>
                <tr>
                  <td colSpan={2}><strong>Total</strong></td>
                  <td className="num"><strong>{fmt(totalFichierImmo)}</strong></td>
                  <td className="num"><strong>{fmt(totalBalanceImmo)}</strong></td>
                  <td className={`num ${Math.abs(totalEcartRapproch) > 0.5 ? 'ecart-val' : 'ok-val'}`}><strong>{fmt(totalEcartRapproch)}</strong></td>
                  <td></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {/* Contrôle 3 : Vérification des encours */}
      <div className="revision-control">
        <div className="revision-control-title">
          <span>Contrôle 3 — Vérification des immobilisations en cours</span>
        </div>
        <div className="revision-ref">Comptes 219x, 229x, 239x, 249x — avances et acomptes (25x)</div>

        <div className="revision-table-wrapper" style={{ marginTop: 8 }}>
          <table className="revision-table">
            <thead>
              <tr>
                <th style={{ width: 90 }}>Projet</th>
                <th>Désignation</th>
                <th>Fournisseur</th>
                <th style={{ width: 100 }}>N° facture</th>
                <th style={{ width: 110 }}>Date facture</th>
                <th className="num editable-col" style={{ width: 130 }}>Montant</th>
                <th style={{ width: 30 }}></th>
              </tr>
            </thead>
            <tbody>
              {encoursLignes.map(l => (
                <tr key={l.id}>
                  <td className="editable-cell"><input type="text" value={l.projet} onChange={e => updateEncours(l.id, 'projet', e.target.value)} style={{ maxWidth: 'none', fontFamily: 'monospace' }} /></td>
                  <td className="editable-cell"><input type="text" value={l.designation} onChange={e => updateEncours(l.id, 'designation', e.target.value)} style={{ maxWidth: 'none' }} /></td>
                  <td className="editable-cell"><input type="text" value={l.fournisseur} onChange={e => updateEncours(l.id, 'fournisseur', e.target.value)} style={{ maxWidth: 'none' }} /></td>
                  <td className="editable-cell"><input type="text" value={l.numFacture} onChange={e => updateEncours(l.id, 'numFacture', e.target.value)} style={{ maxWidth: 'none', fontFamily: 'monospace' }} /></td>
                  <td className="editable-cell"><input type="date" value={l.dateFacture} onChange={e => updateEncours(l.id, 'dateFacture', e.target.value)} style={{ maxWidth: 'none' }} /></td>
                  <td className="editable-cell"><input type="text" inputMode="numeric" value={fmtInput(l.montant)} onChange={e => updateEncours(l.id, 'montant', parseInputValue(e.target.value))} style={{ maxWidth: 'none' }} /></td>
                  <td><button className="revision-od-delete" onClick={() => removeEncours(l.id)} title="Supprimer"><LuTrash2 size={13} /></button></td>
                </tr>
              ))}
              {encoursLignes.length === 0 && (
                <tr><td colSpan={7} style={{ textAlign: 'center', color: '#999', padding: 16, fontStyle: 'italic' }}>Aucun encours saisi.</td></tr>
              )}
            </tbody>
            {encoursLignes.length > 0 && (
              <tfoot>
                <tr>
                  <td colSpan={5}><strong>Total</strong></td>
                  <td className="num"><strong>{fmt(encoursLignes.reduce((s, l) => s + l.montant, 0))}</strong></td>
                  <td></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
        <div className="revision-od-actions">
          <button className="revision-od-add" onClick={addEncours}><LuPlus size={13} /> Ajouter un encours</button>
        </div>
      </div>

      {/* Contrôle 4 : Validation des sorties / cessions */}
      <div className="revision-control">
        <div className="revision-control-title">
          <span>Contrôle 4 — Validation des sorties d'immobilisations</span>
        </div>
        <div className="revision-ref">Cessions : D 81 (VNC) / C immo + D 28 (amort) / C immo — Prix de cession : D tréso / C 82. Mises au rebut : même schéma avec prix = 0</div>

        <div className="revision-table-wrapper" style={{ marginTop: 8 }}>
          <table className="revision-table">
            <thead>
              <tr>
                <th style={{ width: 80 }}>N° fichier</th>
                <th>Désignation</th>
                <th style={{ width: 100 }}>Nature sortie</th>
                <th className="num editable-col" style={{ width: 120 }}>Valeur brute</th>
                <th className="num editable-col" style={{ width: 120 }}>Cumul amort.</th>
                <th className="num" style={{ width: 110 }}>VNC</th>
                <th className="num editable-col" style={{ width: 120 }}>Prix cession</th>
                <th className="num" style={{ width: 110 }}>+/- value</th>
                <th style={{ width: 120 }}>Justificatif</th>
                <th style={{ width: 30 }}></th>
              </tr>
            </thead>
            <tbody>
              {sortieCalcs.map(s => (
                <tr key={s.id} className={s.plusMoinsValue < -0.5 ? 'ecart-row' : ''}>
                  <td className="editable-cell"><input type="text" value={s.numFichier} onChange={e => updateSortie(s.id, 'numFichier', e.target.value)} style={{ maxWidth: 'none', fontFamily: 'monospace' }} /></td>
                  <td className="editable-cell"><input type="text" value={s.designation} onChange={e => updateSortie(s.id, 'designation', e.target.value)} style={{ maxWidth: 'none' }} /></td>
                  <td>
                    <select value={s.natureSortie} onChange={e => updateSortie(s.id, 'natureSortie', e.target.value)} style={{ padding: '3px 6px', borderRadius: 4, border: '1px solid #ddd', width: '100%', fontSize: '11.5px' }}>
                      <option value="Cession">Cession</option>
                      <option value="Mise au rebut">Mise au rebut</option>
                      <option value="Transfert">Transfert</option>
                    </select>
                  </td>
                  <td className="editable-cell"><input type="text" inputMode="numeric" value={fmtInput(s.valeurBrute)} onChange={e => updateSortie(s.id, 'valeurBrute', parseInputValue(e.target.value))} style={{ maxWidth: 'none' }} /></td>
                  <td className="editable-cell"><input type="text" inputMode="numeric" value={fmtInput(s.cumulAmort)} onChange={e => updateSortie(s.id, 'cumulAmort', parseInputValue(e.target.value))} style={{ maxWidth: 'none' }} /></td>
                  <td className="num computed">{fmt(s.vnc)}</td>
                  <td className="editable-cell"><input type="text" inputMode="numeric" value={fmtInput(s.prixCession)} onChange={e => updateSortie(s.id, 'prixCession', parseInputValue(e.target.value))} style={{ maxWidth: 'none' }} /></td>
                  <td className={`num ${s.plusMoinsValue < -0.5 ? 'ecart-val' : s.plusMoinsValue > 0.5 ? 'ok-val' : ''}`}>{fmt(s.plusMoinsValue)}</td>
                  <td className="editable-cell"><input type="text" value={s.docJustificatif} onChange={e => updateSortie(s.id, 'docJustificatif', e.target.value)} style={{ maxWidth: 'none', fontSize: '11px' }} placeholder="Facture, PV..." /></td>
                  <td><button className="revision-od-delete" onClick={() => removeSortie(s.id)} title="Supprimer"><LuTrash2 size={13} /></button></td>
                </tr>
              ))}
              {sortieLignes.length === 0 && (
                <tr><td colSpan={10} style={{ textAlign: 'center', color: '#999', padding: 16, fontStyle: 'italic' }}>Aucune sortie saisie.</td></tr>
              )}
            </tbody>
            {sortieLignes.length > 0 && (
              <tfoot>
                <tr>
                  <td colSpan={3}><strong>Total</strong></td>
                  <td className="num"><strong>{fmt(sortieLignes.reduce((s, l) => s + l.valeurBrute, 0))}</strong></td>
                  <td className="num"><strong>{fmt(sortieLignes.reduce((s, l) => s + l.cumulAmort, 0))}</strong></td>
                  <td className="num"><strong>{fmt(sortieCalcs.reduce((s, l) => s + l.vnc, 0))}</strong></td>
                  <td className="num"><strong>{fmt(sortieLignes.reduce((s, l) => s + l.prixCession, 0))}</strong></td>
                  <td className="num"><strong>{fmt(sortieCalcs.reduce((s, l) => s + l.plusMoinsValue, 0))}</strong></td>
                  <td colSpan={2}></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
        <div className="revision-od-actions">
          <button className="revision-od-add" onClick={addSortie}><LuPlus size={13} /> Ajouter une sortie</button>
        </div>
      </div>

      {/* Contrôle 5 : Calcul des amortissements */}
      <div className="revision-control">
        <div className="revision-control-title">
          <span>Contrôle 5 — Vérification du calcul des amortissements</span>
          {amortLignes.length > 0 && (Math.abs(ecartAmort) < 0.5
            ? <span className="revision-badge ok">Conforme</span>
            : <span className="revision-badge ko">Écart détecté</span>
          )}
        </div>
        <div className="revision-ref">Dotations : D 6813 / C 28x (AO) — D 852 / C 28x (HAO). Reprises : D 28x / C 798 (AO) ou C 862 (HAO)</div>

        <div className="revision-table-wrapper" style={{ marginTop: 8 }}>
          <table className="revision-table">
            <thead>
              <tr>
                <th style={{ width: 80 }}>N° fichier</th>
                <th>Désignation</th>
                <th style={{ width: 110 }}>Mise en service</th>
                <th>Nature immo</th>
                <th className="num editable-col" style={{ width: 80 }}>Durée (ans)</th>
                <th className="num" style={{ width: 80 }}>Taux</th>
                <th className="num editable-col" style={{ width: 130 }}>Base amortissable</th>
                <th className="num" style={{ width: 130 }}>Cumul amort. calc.</th>
                <th style={{ width: 30 }}></th>
              </tr>
            </thead>
            <tbody>
              {amortCalcs.map(a => (
                <tr key={a.id}>
                  <td className="editable-cell"><input type="text" value={a.numFichier} onChange={e => updateAmort(a.id, 'numFichier', e.target.value)} style={{ maxWidth: 'none', fontFamily: 'monospace' }} /></td>
                  <td className="editable-cell"><input type="text" value={a.designation} onChange={e => updateAmort(a.id, 'designation', e.target.value)} style={{ maxWidth: 'none' }} /></td>
                  <td className="editable-cell"><input type="date" value={a.dateMiseEnService} onChange={e => updateAmort(a.id, 'dateMiseEnService', e.target.value)} style={{ maxWidth: 'none' }} /></td>
                  <td className="editable-cell"><input type="text" value={a.natureImmo} onChange={e => updateAmort(a.id, 'natureImmo', e.target.value)} style={{ maxWidth: 'none' }} /></td>
                  <td className="editable-cell"><input type="text" inputMode="numeric" value={a.dureeUtilite || ''} onChange={e => updateAmort(a.id, 'dureeUtilite', parseInt(e.target.value) || 0)} style={{ maxWidth: 'none' }} /></td>
                  <td className="num computed">{a.taux > 0 ? `${(a.taux * 100).toFixed(1)}%` : ''}</td>
                  <td className="editable-cell"><input type="text" inputMode="numeric" value={fmtInput(a.baseAmortissable)} onChange={e => updateAmort(a.id, 'baseAmortissable', parseInputValue(e.target.value))} style={{ maxWidth: 'none' }} /></td>
                  <td className="num computed">{fmt(a.cumulAmortCalc)}</td>
                  <td><button className="revision-od-delete" onClick={() => removeAmort(a.id)} title="Supprimer"><LuTrash2 size={13} /></button></td>
                </tr>
              ))}
              {amortLignes.length === 0 && (
                <tr><td colSpan={9} style={{ textAlign: 'center', color: '#999', padding: 16, fontStyle: 'italic' }}>Aucune immobilisation saisie pour le calcul des amortissements.</td></tr>
              )}
            </tbody>
            {amortLignes.length > 0 && (
              <tfoot>
                <tr>
                  <td colSpan={6}><strong>Total</strong></td>
                  <td className="num"><strong>{fmt(totalBaseAmort)}</strong></td>
                  <td className="num"><strong>{fmt(totalCumulAmortCalc)}</strong></td>
                  <td></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>

        {/* Rapprochement amortissements calculés vs balance 28x */}
        {(amortLignes.length > 0 || totalAmort28Balance !== 0) && (
          <div style={{ marginTop: 12, padding: '10px 14px', background: '#f8f9fa', borderRadius: 6, fontSize: '12.5px' }}>
            <table className="revision-table revision-table-small" style={{ maxWidth: 420 }}>
              <tbody>
                <tr>
                  <td>Cumul amort. calculé (Contrôle 5)</td>
                  <td className="num"><strong>{fmt(totalCumulAmortCalc)}</strong></td>
                </tr>
                <tr>
                  <td>Solde 28x en balance</td>
                  <td className="num"><strong>{fmt(totalAmort28Balance)}</strong></td>
                </tr>
                <tr>
                  <td>Écart</td>
                  <td className={`num ${Math.abs(ecartAmort) > 0.5 ? 'ecart-val' : 'ok-val'}`}>
                    <strong>{fmt(ecartAmort)}</strong>
                  </td>
                </tr>
              </tbody>
            </table>
            {Math.abs(ecartAmort) < 0.5
              ? <span className="revision-badge ok" style={{ marginLeft: 12 }}>Conforme</span>
              : <span className="revision-badge ko" style={{ marginLeft: 12 }}>Écart</span>
            }
          </div>
        )}

        <div className="revision-od-actions">
          <button className="revision-od-add" onClick={addAmort}><LuPlus size={13} /> Ajouter une immobilisation</button>
        </div>
      </div>

      {/* Contrôle 6 : Analyse des charges pouvant être immobilisées */}
      <div className="revision-control">
        <div className="revision-control-title">
          <span>Contrôle 6 — Analyse des charges pouvant être immobilisées</span>
        </div>
        <div className="revision-ref">Immobilisation via D 21x-24x / C 78 (Transferts de charges). Comptes courants à analyser : 624x, 625x, etc.</div>

        <div className="revision-table-wrapper" style={{ marginTop: 8 }}>
          <table className="revision-table">
            <thead>
              <tr>
                <th style={{ width: 90 }}>Compte</th>
                <th>Désignation</th>
                <th>Nature dépense</th>
                <th className="num editable-col" style={{ width: 120 }}>Montant</th>
                <th style={{ width: 110 }}>Fréquence</th>
                <th style={{ width: 140 }}>Conclusion</th>
                <th style={{ width: 30 }}></th>
              </tr>
            </thead>
            <tbody>
              {chargeImmoLignes.map(l => (
                <tr key={l.id} className={l.conclusion === 'immobiliser' ? 'revision-modified-row' : ''}>
                  <td className="editable-cell"><input type="text" value={l.compte} onChange={e => updateCharge(l.id, 'compte', e.target.value)} style={{ maxWidth: 'none', fontFamily: 'monospace' }} /></td>
                  <td className="editable-cell"><input type="text" value={l.designation} onChange={e => updateCharge(l.id, 'designation', e.target.value)} style={{ maxWidth: 'none' }} /></td>
                  <td className="editable-cell"><input type="text" value={l.natureDepense} onChange={e => updateCharge(l.id, 'natureDepense', e.target.value)} style={{ maxWidth: 'none' }} /></td>
                  <td className="editable-cell"><input type="text" inputMode="numeric" value={fmtInput(l.montant)} onChange={e => updateCharge(l.id, 'montant', parseInputValue(e.target.value))} style={{ maxWidth: 'none' }} /></td>
                  <td className="editable-cell"><input type="text" value={l.frequence} onChange={e => updateCharge(l.id, 'frequence', e.target.value)} style={{ maxWidth: 'none', fontSize: '11px' }} placeholder="Annuelle, ponctuelle..." /></td>
                  <td>
                    <select value={l.conclusion} onChange={e => updateCharge(l.id, 'conclusion', e.target.value)} style={{ padding: '3px 6px', borderRadius: 4, border: '1px solid #ddd', width: '100%', fontSize: '11px' }}>
                      <option value="ne_pas_immobiliser">Ne pas immobiliser</option>
                      <option value="immobiliser">À immobiliser</option>
                    </select>
                  </td>
                  <td><button className="revision-od-delete" onClick={() => removeCharge(l.id)} title="Supprimer"><LuTrash2 size={13} /></button></td>
                </tr>
              ))}
              {chargeImmoLignes.length === 0 && (
                <tr><td colSpan={7} style={{ textAlign: 'center', color: '#999', padding: 16, fontStyle: 'italic' }}>Aucune charge analysée. Ajoutez les charges d'entretien/réparation à vérifier.</td></tr>
              )}
            </tbody>
            {chargeImmoLignes.length > 0 && (
              <tfoot>
                <tr>
                  <td colSpan={3}><strong>Total</strong></td>
                  <td className="num"><strong>{fmt(chargeImmoLignes.reduce((s, l) => s + l.montant, 0))}</strong></td>
                  <td colSpan={3}>
                    <strong style={{ color: '#166534' }}>
                      À immobiliser : {fmt(chargeImmoLignes.filter(l => l.conclusion === 'immobiliser').reduce((s, l) => s + l.montant, 0))}
                    </strong>
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
        <div className="revision-od-actions">
          <button className="revision-od-add" onClick={addCharge}><LuPlus size={13} /> Ajouter une charge à analyser</button>
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

export default RevisionImmo;
