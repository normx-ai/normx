import React, { useState, useEffect } from 'react';
import { LuSave, LuChevronDown, LuChevronRight, LuClipboardList, LuPlus, LuTrash2 } from 'react-icons/lu';
import { BalanceLigne } from '../types';
import { ODEcriture, Suggestion, fmt, fmtInput, parseInputValue, getSD, getSC, soldeNet, soldeCreditNet, totalSoldeNet, totalSoldeCreditNet } from './revisionTypes';
import JournalOD from './JournalOD';
import FonctionnementCompte from './FonctionnementCompte';

interface RevisionFournProps {
  balanceN: BalanceLigne[];
  exerciceAnnee: number;
  entiteId: number;
  exerciceId: number;
}

// Contrôle 1 : Réconciliation comptes fournisseurs
interface ReconFournLigne {
  id: number;
  codeFourn: string;
  designation: string;
  solde3112: number;
  soldeReconcilie: number;
  commentaire: string;
}

// Contrôle 2 : Charges à payer / Factures à recevoir (408)
interface FarLigne {
  id: number;
  numCommande: string;
  libellePrestation: string;
  docJustificatif: string;
  montant: number;
}

// Contrôle 3 : Fournisseurs débiteurs (409)
interface FournDebiteurLigne {
  id: number;
  codeFourn: string;
  designation: string;
  solde3112: number;
  dateDebit: string;
  objetDebit: string;
  commentaire: string;
}

// Contrôle 4 : Avances et acomptes versés (4091)
interface AvanceFournLigne {
  id: number;
  codeFourn: string;
  designation: string;
  avance: number;
  objetAvance: string;
  conclusion: string;
}

// Contrôle 5 : Dettes en monnaie étrangère
interface DetteDeviseLigne {
  id: number;
  codeFourn: string;
  nomFourn: string;
  monnaie: string;
  valeurInitialeFCFA: number;
  parite3112: number;
  valeurDevise: number;
}

// Contrôle 6 : Circularisation des fournisseurs
interface CircuFournLigne {
  id: number;
  codeFourn: string;
  nomFourn: string;
  solde3112: number;
  soldeReconcilie: number;
  commentaire: string;
}

const TRAVAUX_FOURN = [
  'Éditer la balance auxiliaire fournisseurs et la rapprocher avec la comptabilité générale',
  'Éditer la balance âgée fournisseurs et analyser les encours à forte antériorité (90 et 180 jours)',
  'Détail des factures à recevoir (support de comptabilisation, apurement post-clôture)',
  'Détail des avoirs à recevoir (vérification de l\'évaluation et justification)',
  'Journal d\'achats de la dernière période N et de la première période N+1 (cut-off)',
  'Analyser et justifier les comptes de fournisseurs débiteurs',
  'Analyser l\'apurement post-clôture',
  'Rapprocher les principaux fournisseurs (volumes d\'achats et soldes de clôture)',
  'Insérer la balance auxiliaire à la date de clôture',
  'Circulariser les fournisseurs en collaboration avec les CAC',
];

function RevisionFourn({ balanceN, exerciceAnnee, entiteId, exerciceId }: RevisionFournProps): React.ReactElement {
  const [reconLignes, setReconLignes] = useState<ReconFournLigne[]>([]);
  const [farLignes, setFarLignes] = useState<FarLigne[]>([]);
  const [debiteurLignes, setDebiteurLignes] = useState<FournDebiteurLigne[]>([]);
  const [avanceLignes, setAvanceLignes] = useState<AvanceFournLigne[]>([]);
  const [deviseLignes, setDeviseLignes] = useState<DetteDeviseLigne[]>([]);
  const [circuLignes, setCircuLignes] = useState<CircuFournLigne[]>([]);
  const [nextIds, setNextIds] = useState({ recon: 1, far: 1, deb: 1, av: 1, dev: 1, circ: 1 });
  const [saved, setSaved] = useState(false);
  const [odEcritures, setOdEcritures] = useState<ODEcriture[]>([]);
  const [nextOdId, setNextOdId] = useState(1);
  const [showTravaux, setShowTravaux] = useState(true);

  // Comptes 40x (fournisseurs) en balance
  const comptes40 = balanceN.filter(l => l.numero_compte.startsWith('40'));
  // Comptes 401x (fournisseurs individuels pour circularisation)
  const comptes401 = balanceN.filter(l => l.numero_compte.startsWith('401'));
  // Comptes 408 (factures non parvenues)
  const comptes408 = balanceN.filter(l => l.numero_compte.startsWith('408'));
  // Comptes 409 (fournisseurs débiteurs)
  const comptes409 = balanceN.filter(l => l.numero_compte.startsWith('409'));
  // Comptes 481 (fournisseurs d'investissement)
  const comptes481 = balanceN.filter(l => l.numero_compte.startsWith('481'));

  const totalFourn40Balance = totalSoldeCreditNet(comptes40);
  const totalFar408Balance = totalSoldeCreditNet(comptes408);
  const totalDebiteur409Balance = totalSoldeNet(comptes409);

  useEffect(() => { loadSaved(); }, [entiteId, exerciceId]);

  const loadSaved = (): void => {
    fetch(`/api/revision/${entiteId}/${exerciceId}/fourn`)
      .then(r => { if (r.ok) return r.json(); throw new Error(); })
      .then((data: any) => {
        if (data.reconLignes) { setReconLignes(data.reconLignes); if (data.reconLignes.length > 0) setNextIds(prev => ({ ...prev, recon: Math.max(...data.reconLignes.map((a: ReconFournLigne) => a.id)) + 1 })); }
        if (data.farLignes) { setFarLignes(data.farLignes); if (data.farLignes.length > 0) setNextIds(prev => ({ ...prev, far: Math.max(...data.farLignes.map((a: FarLigne) => a.id)) + 1 })); }
        if (data.debiteurLignes) { setDebiteurLignes(data.debiteurLignes); if (data.debiteurLignes.length > 0) setNextIds(prev => ({ ...prev, deb: Math.max(...data.debiteurLignes.map((a: FournDebiteurLigne) => a.id)) + 1 })); }
        if (data.avanceLignes) { setAvanceLignes(data.avanceLignes); if (data.avanceLignes.length > 0) setNextIds(prev => ({ ...prev, av: Math.max(...data.avanceLignes.map((a: AvanceFournLigne) => a.id)) + 1 })); }
        if (data.deviseLignes) { setDeviseLignes(data.deviseLignes); if (data.deviseLignes.length > 0) setNextIds(prev => ({ ...prev, dev: Math.max(...data.deviseLignes.map((a: DetteDeviseLigne) => a.id)) + 1 })); }
        if (data.circuLignes) { setCircuLignes(data.circuLignes); if (data.circuLignes.length > 0) setNextIds(prev => ({ ...prev, circ: Math.max(...data.circuLignes.map((a: CircuFournLigne) => a.id)) + 1 })); }
        if (data.odEcritures) { setOdEcritures(data.odEcritures); if (data.odEcritures.length > 0) setNextOdId(Math.max(...data.odEcritures.map((e: ODEcriture) => e.id)) + 1); }
      })
      .catch(() => {});
  };

  const handleSave = async (): Promise<void> => {
    try {
      const res = await fetch(`/api/revision/${entiteId}/${exerciceId}/fourn`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reconLignes, farLignes, debiteurLignes, avanceLignes, deviseLignes, circuLignes, odEcritures }),
      });
      if (!res.ok) throw new Error('Erreur sauvegarde');
      setSaved(true);
    } catch {
      setSaved(false);
      alert('Erreur lors de la sauvegarde. Reessayez.');
    }
  };

  // --- CRUD ---
  const addRecon = (): void => { setReconLignes(prev => [...prev, { id: nextIds.recon, codeFourn: '', designation: '', solde3112: 0, soldeReconcilie: 0, commentaire: '' }]); setNextIds(prev => ({ ...prev, recon: prev.recon + 1 })); setSaved(false); };
  const updateRecon = (id: number, field: keyof ReconFournLigne, value: string | number): void => { setReconLignes(prev => prev.map(l => l.id === id ? { ...l, [field]: value } : l)); setSaved(false); };
  const removeRecon = (id: number): void => { setReconLignes(prev => prev.filter(l => l.id !== id)); setSaved(false); };

  const addFar = (): void => { setFarLignes(prev => [...prev, { id: nextIds.far, numCommande: '', libellePrestation: '', docJustificatif: '', montant: 0 }]); setNextIds(prev => ({ ...prev, far: prev.far + 1 })); setSaved(false); };
  const updateFar = (id: number, field: keyof FarLigne, value: string | number): void => { setFarLignes(prev => prev.map(l => l.id === id ? { ...l, [field]: value } : l)); setSaved(false); };
  const removeFar = (id: number): void => { setFarLignes(prev => prev.filter(l => l.id !== id)); setSaved(false); };

  const addDebiteur = (): void => { setDebiteurLignes(prev => [...prev, { id: nextIds.deb, codeFourn: '', designation: '', solde3112: 0, dateDebit: '', objetDebit: '', commentaire: '' }]); setNextIds(prev => ({ ...prev, deb: prev.deb + 1 })); setSaved(false); };
  const updateDebiteur = (id: number, field: keyof FournDebiteurLigne, value: string | number): void => { setDebiteurLignes(prev => prev.map(l => l.id === id ? { ...l, [field]: value } : l)); setSaved(false); };
  const removeDebiteur = (id: number): void => { setDebiteurLignes(prev => prev.filter(l => l.id !== id)); setSaved(false); };

  const addAvance = (): void => { setAvanceLignes(prev => [...prev, { id: nextIds.av, codeFourn: '', designation: '', avance: 0, objetAvance: '', conclusion: '' }]); setNextIds(prev => ({ ...prev, av: prev.av + 1 })); setSaved(false); };
  const updateAvance = (id: number, field: keyof AvanceFournLigne, value: string | number): void => { setAvanceLignes(prev => prev.map(l => l.id === id ? { ...l, [field]: value } : l)); setSaved(false); };
  const removeAvance = (id: number): void => { setAvanceLignes(prev => prev.filter(l => l.id !== id)); setSaved(false); };

  const addDevise = (): void => { setDeviseLignes(prev => [...prev, { id: nextIds.dev, codeFourn: '', nomFourn: '', monnaie: 'USD', valeurInitialeFCFA: 0, parite3112: 0, valeurDevise: 0 }]); setNextIds(prev => ({ ...prev, dev: prev.dev + 1 })); setSaved(false); };
  const updateDevise = (id: number, field: keyof DetteDeviseLigne, value: string | number): void => { setDeviseLignes(prev => prev.map(l => l.id === id ? { ...l, [field]: value } : l)); setSaved(false); };
  const removeDevise = (id: number): void => { setDeviseLignes(prev => prev.filter(l => l.id !== id)); setSaved(false); };

  const addCircu = (): void => { setCircuLignes(prev => [...prev, { id: nextIds.circ, codeFourn: '', nomFourn: '', solde3112: 0, soldeReconcilie: 0, commentaire: '' }]); setNextIds(prev => ({ ...prev, circ: prev.circ + 1 })); setSaved(false); };
  const updateCircu = (id: number, field: keyof CircuFournLigne, value: string | number): void => { setCircuLignes(prev => prev.map(l => l.id === id ? { ...l, [field]: value } : l)); setSaved(false); };
  const removeCircu = (id: number): void => { setCircuLignes(prev => prev.filter(l => l.id !== id)); setSaved(false); };
  const autoPopulateCircu = (): void => {
    if (comptes401.length === 0) return;
    const existing = new Set(circuLignes.map(l => l.codeFourn));
    let currentId = nextIds.circ;
    const newLignes: CircuFournLigne[] = [];
    comptes401.forEach(c => {
      if (!existing.has(c.numero_compte)) {
        const solde = soldeCreditNet(c);
        newLignes.push({ id: currentId, codeFourn: c.numero_compte, nomFourn: c.libelle_compte || '', solde3112: solde, soldeReconcilie: 0, commentaire: '' });
        currentId++;
      }
    });
    if (newLignes.length > 0) {
      setCircuLignes(prev => [...prev, ...newLignes]);
      setNextIds(prev => ({ ...prev, circ: currentId }));
      setSaved(false);
    }
  };

  // --- Calculs Contrôle 1 ---
  const totalSolde = reconLignes.reduce((s, l) => s + l.solde3112, 0);
  const totalReconcilie = reconLignes.reduce((s, l) => s + l.soldeReconcilie, 0);
  const totalEcartRecon = totalReconcilie - totalSolde;

  // --- Calculs Contrôle 2 ---
  const totalFarMontant = farLignes.reduce((s, l) => s + l.montant, 0);
  const ecartFar = totalFar408Balance - totalFarMontant;

  // --- Calculs Contrôle 5 : Dettes en devises ---
  const deviseCalcs = deviseLignes.map(d => {
    const valeurInventaire = d.valeurDevise * d.parite3112;
    const perteLatente = Math.max(0, valeurInventaire - d.valeurInitialeFCFA);
    const gainLatent = Math.max(0, d.valeurInitialeFCFA - valeurInventaire);
    return { ...d, valeurInventaire, perteLatente, gainLatent };
  });
  const totalPertesLatentes = deviseCalcs.reduce((s, d) => s + d.perteLatente, 0);
  const totalGainsLatents = deviseCalcs.reduce((s, d) => s + d.gainLatent, 0);

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

  // Suggestion pertes de change latentes
  if (totalPertesLatentes > 0.5) {
    const dejaPropose = odEcritures.some(od => od.source === 'Fourn-C5-perte');
    if (!dejaPropose) {
      suggestions.push({
        compteDebit: '478', libelleDebit: 'Écarts de conversion — Actif',
        compteCredit: '401', libelleCredit: 'Fournisseurs',
        montant: totalPertesLatentes, libelle: 'Constatation pertes de change latentes sur dettes fournisseurs',
        source: 'Fourn-C5-perte',
      });
    }
  }

  // Suggestion gains de change latents
  if (totalGainsLatents > 0.5) {
    const dejaPropose = odEcritures.some(od => od.source === 'Fourn-C5-gain');
    if (!dejaPropose) {
      suggestions.push({
        compteDebit: '401', libelleDebit: 'Fournisseurs',
        compteCredit: '479', libelleCredit: 'Écarts de conversion — Passif',
        montant: totalGainsLatents, libelle: 'Constatation gains de change latents sur dettes fournisseurs',
        source: 'Fourn-C5-gain',
      });
    }
  }

  return (
    <div className="revision-kp">
      <div className="revision-section-header">
        <h3>Fournisseurs</h3>
        <button className="revision-save-btn" onClick={handleSave}>
          <LuSave size={14} /> {saved ? 'Sauvegardé' : 'Sauvegarder'}
        </button>
      </div>

      <div className="revision-objectif">
        <strong>Objectif :</strong> S'assurer de l'exhaustivité et de la correcte évaluation des dettes fournisseurs (401), des factures non parvenues (408), des avances versées (4091) et de la correcte conversion des dettes en devises au cours de clôture. Les fournisseurs d'immobilisations relèvent du compte 481, pas du 401.
      </div>


      <div className="revision-travaux">
        <button className="revision-travaux-toggle" onClick={() => setShowTravaux(!showTravaux)}>
          {showTravaux ? <LuChevronDown size={14} /> : <LuChevronRight size={14} />}
          <LuClipboardList size={14} />
          <span>Travaux à effectuer</span>
        </button>
        {showTravaux && (
          <ul className="revision-travaux-list">
            {TRAVAUX_FOURN.map((t, i) => <li key={i}>{t}</li>)}
          </ul>
        )}
      </div>

      <FonctionnementCompte prefixes={['40']} titre="Fournisseurs" />

      {/* Note si comptes 40x en balance */}
      {comptes40.length > 0 && reconLignes.length === 0 && (
        <div className="revision-objectif">
          <strong>Information :</strong> La balance contient {comptes40.length} compte{comptes40.length > 1 ? 's' : ''} fournisseurs (40x) pour un solde total de <strong>{fmt(totalFourn40Balance)}</strong>.
          {comptes408.length > 0 && <> Factures non parvenues (408) : <strong>{fmt(totalFar408Balance)}</strong>.</>}
          {comptes409.length > 0 && <> Fournisseurs débiteurs (409) : <strong>{fmt(totalDebiteur409Balance)}</strong>.</>}
          {comptes481.length > 0 && <> Fournisseurs d'investissement (481) : <strong>{fmt(totalSoldeCreditNet(comptes481))}</strong>.</>}
          <br />Complétez les contrôles ci-dessous.
        </div>
      )}

      {/* Contrôle 1 : Réconciliation comptes fournisseurs */}
      <div className="revision-control">
        <div className="revision-control-title">
          <span>Contrôle 1 — Réconciliation des comptes fournisseurs</span>
          {reconLignes.length > 0 && (Math.abs(totalEcartRecon) < 0.5
            ? <span className="revision-badge ok">Conforme</span>
            : <span className="revision-badge ko">Écart détecté</span>
          )}
        </div>
        <div className="revision-ref">Balance auxiliaire fournisseurs vs comptabilité générale (401, 402)</div>

        <div className="revision-table-wrapper" style={{ marginTop: 8 }}>
          <table className="revision-table">
            <thead>
              <tr>
                <th style={{ width: 90 }}>Code fourn.</th>
                <th>Désignation</th>
                <th className="num editable-col" style={{ width: 130 }}>Solde au 31/12/N</th>
                <th className="num editable-col" style={{ width: 130 }}>Solde réconcilié</th>
                <th className="num" style={{ width: 100 }}>Écart</th>
                <th style={{ width: 150 }}>Commentaire</th>
                <th style={{ width: 30 }}></th>
              </tr>
            </thead>
            <tbody>
              {reconLignes.map(l => {
                const ecart = l.soldeReconcilie - l.solde3112;
                return (
                  <tr key={l.id} className={Math.abs(ecart) > 0.5 ? 'ecart-row' : ''}>
                    <td className="editable-cell"><input type="text" value={l.codeFourn} onChange={e => updateRecon(l.id, 'codeFourn', e.target.value)} style={{ maxWidth: 'none', fontFamily: 'monospace' }} /></td>
                    <td className="editable-cell"><input type="text" value={l.designation} onChange={e => updateRecon(l.id, 'designation', e.target.value)} style={{ maxWidth: 'none' }} /></td>
                    <td className="editable-cell"><input type="text" inputMode="numeric" value={fmtInput(l.solde3112)} onChange={e => updateRecon(l.id, 'solde3112', parseInputValue(e.target.value))} style={{ maxWidth: 'none' }} /></td>
                    <td className="editable-cell"><input type="text" inputMode="numeric" value={fmtInput(l.soldeReconcilie)} onChange={e => updateRecon(l.id, 'soldeReconcilie', parseInputValue(e.target.value))} style={{ maxWidth: 'none' }} /></td>
                    <td className={`num ${Math.abs(ecart) > 0.5 ? 'ecart-val' : 'ok-val'}`}>{fmt(ecart)}</td>
                    <td className="editable-cell"><input type="text" value={l.commentaire} onChange={e => updateRecon(l.id, 'commentaire', e.target.value)} style={{ maxWidth: 'none', fontSize: '11px' }} /></td>
                    <td><button className="revision-od-delete" onClick={() => removeRecon(l.id)} title="Supprimer"><LuTrash2 size={13} /></button></td>
                  </tr>
                );
              })}
              {reconLignes.length === 0 && (
                <tr><td colSpan={7} style={{ textAlign: 'center', color: '#999', padding: 16, fontStyle: 'italic' }}>Aucun fournisseur saisi. Ajoutez les principaux fournisseurs à réconcilier.</td></tr>
              )}
            </tbody>
            {reconLignes.length > 0 && (
              <tfoot>
                <tr>
                  <td colSpan={2}><strong>Total</strong></td>
                  <td className="num"><strong>{fmt(totalSolde)}</strong></td>
                  <td className="num"><strong>{fmt(totalReconcilie)}</strong></td>
                  <td className={`num ${Math.abs(totalEcartRecon) > 0.5 ? 'ecart-val' : 'ok-val'}`}><strong>{fmt(totalEcartRecon)}</strong></td>
                  <td colSpan={2}></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
        <div className="revision-od-actions">
          <button className="revision-od-add" onClick={addRecon}><LuPlus size={13} /> Ajouter un fournisseur</button>
        </div>
      </div>

      {/* Contrôle 2 : Charges à payer / Factures à recevoir (408) */}
      <div className="revision-control">
        <div className="revision-control-title">
          <span>Contrôle 2 — Charges à payer / Factures non parvenues</span>
          {farLignes.length > 0 && (Math.abs(ecartFar) < 0.5
            ? <span className="revision-badge ok">Conforme</span>
            : <span className="revision-badge ko">Écart détecté</span>
          )}
        </div>
        <div className="revision-ref">Comptes 408x — D achats (6xx) + D TVA (4455) / C 408</div>

        <div className="revision-table-wrapper" style={{ marginTop: 8 }}>
          <table className="revision-table">
            <thead>
              <tr>
                <th style={{ width: 100 }}>N° commande</th>
                <th>Libellé prestation</th>
                <th style={{ width: 140 }}>Doc. justificatif</th>
                <th className="num editable-col" style={{ width: 130 }}>Montant</th>
                <th style={{ width: 30 }}></th>
              </tr>
            </thead>
            <tbody>
              {farLignes.map(l => (
                <tr key={l.id}>
                  <td className="editable-cell"><input type="text" value={l.numCommande} onChange={e => updateFar(l.id, 'numCommande', e.target.value)} style={{ maxWidth: 'none', fontFamily: 'monospace' }} /></td>
                  <td className="editable-cell"><input type="text" value={l.libellePrestation} onChange={e => updateFar(l.id, 'libellePrestation', e.target.value)} style={{ maxWidth: 'none' }} /></td>
                  <td className="editable-cell"><input type="text" value={l.docJustificatif} onChange={e => updateFar(l.id, 'docJustificatif', e.target.value)} style={{ maxWidth: 'none', fontSize: '11px' }} placeholder="BL, contrat..." /></td>
                  <td className="editable-cell"><input type="text" inputMode="numeric" value={fmtInput(l.montant)} onChange={e => updateFar(l.id, 'montant', parseInputValue(e.target.value))} style={{ maxWidth: 'none' }} /></td>
                  <td><button className="revision-od-delete" onClick={() => removeFar(l.id)} title="Supprimer"><LuTrash2 size={13} /></button></td>
                </tr>
              ))}
              {farLignes.length === 0 && (
                <tr><td colSpan={5} style={{ textAlign: 'center', color: '#999', padding: 16, fontStyle: 'italic' }}>Aucune facture à recevoir saisie.</td></tr>
              )}
            </tbody>
            {farLignes.length > 0 && (
              <tfoot>
                <tr>
                  <td colSpan={3}><strong>Total</strong></td>
                  <td className="num"><strong>{fmt(totalFarMontant)}</strong></td>
                  <td></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>

        {(farLignes.length > 0 || totalFar408Balance !== 0) && (
          <div style={{ marginTop: 12, padding: '10px 14px', background: '#f8f9fa', borderRadius: 6, fontSize: '12.5px' }}>
            <table className="revision-table revision-table-small" style={{ maxWidth: 400 }}>
              <tbody>
                <tr><td>Total FAR (Contrôle 2)</td><td className="num"><strong>{fmt(totalFarMontant)}</strong></td></tr>
                <tr><td>Balance 408x</td><td className="num"><strong>{fmt(totalFar408Balance)}</strong></td></tr>
                <tr><td>Écart</td><td className={`num ${Math.abs(ecartFar) > 0.5 ? 'ecart-val' : 'ok-val'}`}><strong>{fmt(ecartFar)}</strong></td></tr>
              </tbody>
            </table>
          </div>
        )}

        <div className="revision-od-actions">
          <button className="revision-od-add" onClick={addFar}><LuPlus size={13} /> Ajouter une FAR</button>
        </div>
      </div>

      {/* Contrôle 3 : Fournisseurs débiteurs (409) */}
      <div className="revision-control">
        <div className="revision-control-title">
          <span>Contrôle 3 — Analyse des fournisseurs débiteurs</span>
        </div>
        <div className="revision-ref">Comptes 409x — avances (4091), emballages à rendre (4094), RRR à obtenir (4098). À déprécier si recouvrement incertain.</div>

        <div className="revision-table-wrapper" style={{ marginTop: 8 }}>
          <table className="revision-table">
            <thead>
              <tr>
                <th style={{ width: 90 }}>Code fourn.</th>
                <th>Désignation</th>
                <th className="num editable-col" style={{ width: 130 }}>Solde au 31/12/N</th>
                <th style={{ width: 110 }}>Date du débit</th>
                <th>Objet du débit</th>
                <th style={{ width: 160 }}>Commentaire</th>
                <th style={{ width: 30 }}></th>
              </tr>
            </thead>
            <tbody>
              {debiteurLignes.map(l => (
                <tr key={l.id}>
                  <td className="editable-cell"><input type="text" value={l.codeFourn} onChange={e => updateDebiteur(l.id, 'codeFourn', e.target.value)} style={{ maxWidth: 'none', fontFamily: 'monospace' }} /></td>
                  <td className="editable-cell"><input type="text" value={l.designation} onChange={e => updateDebiteur(l.id, 'designation', e.target.value)} style={{ maxWidth: 'none' }} /></td>
                  <td className="editable-cell"><input type="text" inputMode="numeric" value={fmtInput(l.solde3112)} onChange={e => updateDebiteur(l.id, 'solde3112', parseInputValue(e.target.value))} style={{ maxWidth: 'none' }} /></td>
                  <td className="editable-cell"><input type="date" value={l.dateDebit} onChange={e => updateDebiteur(l.id, 'dateDebit', e.target.value)} style={{ maxWidth: 'none' }} /></td>
                  <td className="editable-cell"><input type="text" value={l.objetDebit} onChange={e => updateDebiteur(l.id, 'objetDebit', e.target.value)} style={{ maxWidth: 'none' }} /></td>
                  <td className="editable-cell"><input type="text" value={l.commentaire} onChange={e => updateDebiteur(l.id, 'commentaire', e.target.value)} style={{ maxWidth: 'none', fontSize: '11px' }} placeholder="À récupérer, à déprécier..." /></td>
                  <td><button className="revision-od-delete" onClick={() => removeDebiteur(l.id)} title="Supprimer"><LuTrash2 size={13} /></button></td>
                </tr>
              ))}
              {debiteurLignes.length === 0 && (
                <tr><td colSpan={7} style={{ textAlign: 'center', color: '#999', padding: 16, fontStyle: 'italic' }}>Aucun fournisseur débiteur à analyser.</td></tr>
              )}
            </tbody>
            {debiteurLignes.length > 0 && (
              <tfoot>
                <tr>
                  <td colSpan={2}><strong>Total</strong></td>
                  <td className="num"><strong>{fmt(debiteurLignes.reduce((s, l) => s + l.solde3112, 0))}</strong></td>
                  <td colSpan={4}></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
        <div className="revision-od-actions">
          <button className="revision-od-add" onClick={addDebiteur}><LuPlus size={13} /> Ajouter un fournisseur débiteur</button>
        </div>
      </div>

      {/* Contrôle 4 : Avances et acomptes versés (4091) */}
      <div className="revision-control">
        <div className="revision-control-title">
          <span>Contrôle 4 — Avances et acomptes versés</span>
        </div>
        <div className="revision-ref">Compte 4091 — Attention : les avances sur immobilisations doivent être en 25x, pas en 4091</div>

        <div className="revision-table-wrapper" style={{ marginTop: 8 }}>
          <table className="revision-table">
            <thead>
              <tr>
                <th style={{ width: 90 }}>Code fourn.</th>
                <th>Désignation</th>
                <th className="num editable-col" style={{ width: 130 }}>Avance</th>
                <th>Objet de l'avance</th>
                <th style={{ width: 180 }}>Conclusion</th>
                <th style={{ width: 30 }}></th>
              </tr>
            </thead>
            <tbody>
              {avanceLignes.map(l => (
                <tr key={l.id} className={l.conclusion.toLowerCase().includes('transf') ? 'revision-modified-row' : ''}>
                  <td className="editable-cell"><input type="text" value={l.codeFourn} onChange={e => updateAvance(l.id, 'codeFourn', e.target.value)} style={{ maxWidth: 'none', fontFamily: 'monospace' }} /></td>
                  <td className="editable-cell"><input type="text" value={l.designation} onChange={e => updateAvance(l.id, 'designation', e.target.value)} style={{ maxWidth: 'none' }} /></td>
                  <td className="editable-cell"><input type="text" inputMode="numeric" value={fmtInput(l.avance)} onChange={e => updateAvance(l.id, 'avance', parseInputValue(e.target.value))} style={{ maxWidth: 'none' }} /></td>
                  <td className="editable-cell"><input type="text" value={l.objetAvance} onChange={e => updateAvance(l.id, 'objetAvance', e.target.value)} style={{ maxWidth: 'none' }} /></td>
                  <td className="editable-cell"><input type="text" value={l.conclusion} onChange={e => updateAvance(l.id, 'conclusion', e.target.value)} style={{ maxWidth: 'none', fontSize: '11px' }} placeholder="OK / Transférer en 25x..." /></td>
                  <td><button className="revision-od-delete" onClick={() => removeAvance(l.id)} title="Supprimer"><LuTrash2 size={13} /></button></td>
                </tr>
              ))}
              {avanceLignes.length === 0 && (
                <tr><td colSpan={6} style={{ textAlign: 'center', color: '#999', padding: 16, fontStyle: 'italic' }}>Aucune avance fournisseur à analyser.</td></tr>
              )}
            </tbody>
            {avanceLignes.length > 0 && (
              <tfoot>
                <tr>
                  <td colSpan={2}><strong>Total</strong></td>
                  <td className="num"><strong>{fmt(avanceLignes.reduce((s, l) => s + l.avance, 0))}</strong></td>
                  <td colSpan={3}></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
        <div className="revision-od-actions">
          <button className="revision-od-add" onClick={addAvance}><LuPlus size={13} /> Ajouter une avance</button>
        </div>
      </div>

      {/* Contrôle 5 : Dettes en monnaie étrangère */}
      <div className="revision-control">
        <div className="revision-control-title">
          <span>Contrôle 5 — Dettes en monnaie étrangère</span>
        </div>
        <div className="revision-ref">Pertes latentes : D 478 (Écarts de conversion — Actif) / C 401. Gains latents : D 401 / C 479 (Écarts de conversion — Passif)</div>

        <div className="revision-table-wrapper" style={{ marginTop: 8 }}>
          <table className="revision-table">
            <thead>
              <tr>
                <th style={{ width: 90 }}>Code fourn.</th>
                <th>Nom fournisseur</th>
                <th style={{ width: 70 }}>Monnaie</th>
                <th className="num editable-col" style={{ width: 110 }}>Valeur devises</th>
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
                  <td className="editable-cell"><input type="text" value={d.codeFourn} onChange={e => updateDevise(d.id, 'codeFourn', e.target.value)} style={{ maxWidth: 'none', fontFamily: 'monospace' }} /></td>
                  <td className="editable-cell"><input type="text" value={d.nomFourn} onChange={e => updateDevise(d.id, 'nomFourn', e.target.value)} style={{ maxWidth: 'none' }} /></td>
                  <td className="editable-cell">
                    <select value={d.monnaie} onChange={e => updateDevise(d.id, 'monnaie', e.target.value)} style={{ padding: '3px 4px', borderRadius: 4, border: '1px solid #ddd', width: '100%', fontSize: '11.5px' }}>
                      <option value="USD">USD</option>
                      <option value="EUR">EUR</option>
                      <option value="GBP">GBP</option>
                      <option value="CNY">CNY</option>
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
                <tr><td colSpan={10} style={{ textAlign: 'center', color: '#999', padding: 16, fontStyle: 'italic' }}>Aucune dette en devise saisie.</td></tr>
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
          <button className="revision-od-add" onClick={addDevise}><LuPlus size={13} /> Ajouter une dette en devise</button>
        </div>
      </div>

      {/* Contrôle 6 : Circularisation des fournisseurs */}
      <div className="revision-control">
        <div className="revision-control-title">
          <span>Contrôle 6 — Circularisation des fournisseurs</span>
          {circuLignes.length > 0 && (circuLignes.every(l => Math.abs(l.soldeReconcilie - l.solde3112) < 0.5)
            ? <span className="revision-badge ok">Conforme</span>
            : <span className="revision-badge ko">Écart détecté</span>
          )}
        </div>
        <div className="revision-ref">Confirmation directe des soldes fournisseurs (401x) — contrôle de confirmation, pas d'OD à proposer</div>

        <div className="revision-table-wrapper" style={{ marginTop: 8 }}>
          <table className="revision-table">
            <thead>
              <tr>
                <th style={{ width: 110 }}>Code fournisseur</th>
                <th>Nom fournisseur</th>
                <th className="num" style={{ width: 140 }}>Solde au 31/12/N</th>
                <th className="num editable-col" style={{ width: 140 }}>Solde réconcilié</th>
                <th className="num" style={{ width: 110 }}>Écart</th>
                <th style={{ width: 180 }}>Commentaire</th>
                <th style={{ width: 30 }}></th>
              </tr>
            </thead>
            <tbody>
              {circuLignes.map(l => {
                const ecart = l.soldeReconcilie - l.solde3112;
                return (
                  <tr key={l.id} className={Math.abs(ecart) > 0.5 ? 'ecart-row' : ''}>
                    <td className="editable-cell"><input type="text" value={l.codeFourn} onChange={e => updateCircu(l.id, 'codeFourn', e.target.value)} style={{ maxWidth: 'none', fontFamily: 'monospace' }} /></td>
                    <td className="editable-cell"><input type="text" value={l.nomFourn} onChange={e => updateCircu(l.id, 'nomFourn', e.target.value)} style={{ maxWidth: 'none' }} /></td>
                    <td className="num">{fmt(l.solde3112)}</td>
                    <td className="editable-cell"><input type="text" inputMode="numeric" value={fmtInput(l.soldeReconcilie)} onChange={e => updateCircu(l.id, 'soldeReconcilie', parseInputValue(e.target.value))} style={{ maxWidth: 'none' }} /></td>
                    <td className={`num ${Math.abs(ecart) > 0.5 ? 'ecart-val' : 'ok-val'}`}>{fmt(ecart)}</td>
                    <td className="editable-cell"><input type="text" value={l.commentaire} onChange={e => updateCircu(l.id, 'commentaire', e.target.value)} style={{ maxWidth: 'none', fontSize: '11px' }} placeholder="Réponse reçue, relance..." /></td>
                    <td><button className="revision-od-delete" onClick={() => removeCircu(l.id)} title="Supprimer"><LuTrash2 size={13} /></button></td>
                  </tr>
                );
              })}
              {circuLignes.length === 0 && (
                <tr><td colSpan={7} style={{ textAlign: 'center', color: '#999', padding: 16, fontStyle: 'italic' }}>Aucun fournisseur circularisé. Utilisez « Pré-remplir depuis la balance » pour importer les comptes 401x.</td></tr>
              )}
            </tbody>
            {circuLignes.length > 0 && (
              <tfoot>
                <tr>
                  <td colSpan={2}><strong>Total</strong></td>
                  <td className="num"><strong>{fmt(circuLignes.reduce((s, l) => s + l.solde3112, 0))}</strong></td>
                  <td className="num"><strong>{fmt(circuLignes.reduce((s, l) => s + l.soldeReconcilie, 0))}</strong></td>
                  <td className={`num ${Math.abs(circuLignes.reduce((s, l) => s + l.soldeReconcilie, 0) - circuLignes.reduce((s, l) => s + l.solde3112, 0)) > 0.5 ? 'ecart-val' : 'ok-val'}`}><strong>{fmt(circuLignes.reduce((s, l) => s + l.soldeReconcilie, 0) - circuLignes.reduce((s, l) => s + l.solde3112, 0))}</strong></td>
                  <td colSpan={2}></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
        <div className="revision-od-actions">
          {comptes401.length > 0 && (
            <button className="revision-od-add" onClick={autoPopulateCircu} style={{ marginRight: 8 }}><LuPlus size={13} /> Pré-remplir depuis la balance (401x)</button>
          )}
          <button className="revision-od-add" onClick={addCircu}><LuPlus size={13} /> Ajouter un fournisseur</button>
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

export default RevisionFourn;
