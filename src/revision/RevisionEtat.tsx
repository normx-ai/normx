import { clientFetch } from '../lib/api';
import React, { useState, useEffect } from 'react';
import { LuSave, LuChevronDown, LuChevronRight, LuClipboardList } from 'react-icons/lu';
import { BalanceLigne } from '../types';
import {
  ODEcriture, Suggestion, fmt,
  ISVerifLigne, TVACollecteeLigne, TVADeductibleLigne,
  AutresImpotsLigne, DettesFiscalesLigne, RedressementLigne,
  getSD, getSC, soldeNet, soldeCreditNet, totalSoldeNet, totalSoldeCreditNet,
} from './revisionTypes';
import JournalOD from './JournalOD';
import FonctionnementCompte from './FonctionnementCompte';
import RevisionEtatTable from './RevisionEtatTable';

interface RevisionEtatProps {
  balanceN: BalanceLigne[];
  exerciceAnnee: number;
  entiteId: number;
  exerciceId: number;
}

const TRAVAUX_ETAT = [
  'Éditer le détail des comptes 44x (État) et rapprocher avec les déclarations fiscales',
  'Vérifier le calcul de l\'IS : résultat comptable, réintégrations, déductions, résultat fiscal',
  'Rapprocher l\'IS comptabilisé (891) avec le solde du compte 441',
  'Vérifier la cohérence TVA collectée (4431) avec le chiffre d\'affaires déclaré',
  'Rapprocher la TVA déductible (445x) avec les déclarations mensuelles',
  'Vérifier le solde de TVA : TVA collectée - TVA déductible = TVA due (4441) ou crédit (4449)',
  'Analyser les comptes 64x (impôts et taxes) et rapprocher avec les avis d\'imposition',
  'Vérifier les pénalités fiscales (647) et s\'assurer de leur correcte comptabilisation',
  'Rapprocher l\'IMF (895) avec les déclarations et le minimum fiscal applicable',
  'Circulariser l\'administration fiscale si nécessaire',
];

function RevisionEtat({ balanceN, exerciceAnnee, entiteId, exerciceId }: RevisionEtatProps): React.ReactElement {
  // --- IS ---
  const [isLignes, setIsLignes] = useState<ISVerifLigne[]>([
    { id: 1, designation: 'Résultat comptable avant impôt', montant: 0 },
    { id: 2, designation: 'Réintégrations fiscales', montant: 0 },
    { id: 3, designation: 'Déductions fiscales', montant: 0 },
  ]);
  const [tauxIS, setTauxIS] = useState(28);
  const [tvaCollecteeLignes, setTvaCollecteeLignes] = useState<TVACollecteeLigne[]>([]);
  const [tvaDeductibleLignes, setTvaDeductibleLignes] = useState<TVADeductibleLigne[]>([]);
  const [autresImpotsLignes, setAutresImpotsLignes] = useState<AutresImpotsLigne[]>([]);
  const [dettesFiscalesLignes, setDettesFiscalesLignes] = useState<DettesFiscalesLigne[]>([]);
  const [redressementLignes, setRedressementLignes] = useState<RedressementLigne[]>([]);
  const [nextIds, setNextIds] = useState({ is: 4, tvac: 1, tvad: 1, autres: 1, dettes: 1, redress: 1 });
  const [saved, setSaved] = useState(false);
  const [odEcritures, setOdEcritures] = useState<ODEcriture[]>([]);
  const [nextOdId, setNextOdId] = useState(1);
  const [showTravaux, setShowTravaux] = useState(true);

  // --- Comptes balance ---
  const comptes44 = balanceN.filter(l => l.numero_compte.startsWith('44'));
  const comptes441 = balanceN.filter(l => l.numero_compte.startsWith('441'));
  const comptes4431 = balanceN.filter(l => l.numero_compte.startsWith('4431') || l.numero_compte.startsWith('4432'));
  const comptes4441 = balanceN.filter(l => l.numero_compte.startsWith('4441'));
  const comptes4449 = balanceN.filter(l => l.numero_compte.startsWith('4449'));
  const comptes445 = balanceN.filter(l => l.numero_compte.startsWith('445') && !l.numero_compte.startsWith('4449'));
  const comptes4451 = balanceN.filter(l => l.numero_compte.startsWith('4451'));
  const comptes4452 = balanceN.filter(l => l.numero_compte.startsWith('4452'));
  const comptes4453 = balanceN.filter(l => l.numero_compte.startsWith('4453'));
  const comptes4454 = balanceN.filter(l => l.numero_compte.startsWith('4454'));
  const comptes891 = balanceN.filter(l => l.numero_compte.startsWith('891'));
  const comptes89 = balanceN.filter(l => l.numero_compte.startsWith('89'));
  const comptes64 = balanceN.filter(l => l.numero_compte.startsWith('64'));

  const comptesAutres44 = balanceN.filter(l => {
    const c = l.numero_compte;
    return c.startsWith('44') &&
      !c.startsWith('441') &&
      !c.startsWith('443') &&
      !c.startsWith('4441') &&
      !c.startsWith('445') &&
      !c.startsWith('4449');
  });

  const soldeCredit = (lignes: BalanceLigne[]): number => totalSoldeCreditNet(lignes);
  const soldeDebit = (lignes: BalanceLigne[]): number => totalSoldeNet(lignes);

  const total441Balance = soldeCredit(comptes441);
  const total891Balance = soldeDebit(comptes891);
  const total4431Balance = soldeCredit(comptes4431);
  const total4441Balance = soldeCredit(comptes4441);
  const total4449Balance = soldeDebit(comptes4449);
  const total4451Balance = soldeDebit(comptes4451);
  const total4452Balance = soldeDebit(comptes4452);
  const total4453Balance = soldeDebit(comptes4453);
  const total4454Balance = soldeDebit(comptes4454);
  const total445Balance = soldeDebit(comptes445);

  // --- Chargement / Sauvegarde ---
  useEffect(() => { loadSaved(); }, [entiteId, exerciceId]);

  const loadSaved = (): void => {
    clientFetch(`/api/revision/${entiteId}/${exerciceId}/etat`)
      .then(r => { if (r.ok) return r.json(); throw new Error(); })
      .then((data: { isLignes?: ISVerifLigne[]; tauxIS?: number; tvaCollecteeLignes?: TVACollecteeLigne[]; tvaDeductibleLignes?: TVADeductibleLigne[]; autresImpotsLignes?: AutresImpotsLigne[]; dettesFiscalesLignes?: DettesFiscalesLigne[]; redressementLignes?: RedressementLigne[]; odEcritures?: ODEcriture[] }) => {
        if (data.isLignes) { setIsLignes(data.isLignes); if (data.isLignes.length > 0) setNextIds(prev => ({ ...prev, is: Math.max(...data.isLignes!.map((a: ISVerifLigne) => a.id)) + 1 })); }
        if (data.tauxIS !== undefined) setTauxIS(data.tauxIS);
        if (data.tvaCollecteeLignes) { setTvaCollecteeLignes(data.tvaCollecteeLignes); if (data.tvaCollecteeLignes.length > 0) setNextIds(prev => ({ ...prev, tvac: Math.max(...data.tvaCollecteeLignes!.map((a: TVACollecteeLigne) => a.id)) + 1 })); }
        if (data.tvaDeductibleLignes) { setTvaDeductibleLignes(data.tvaDeductibleLignes); if (data.tvaDeductibleLignes.length > 0) setNextIds(prev => ({ ...prev, tvad: Math.max(...data.tvaDeductibleLignes!.map((a: TVADeductibleLigne) => a.id)) + 1 })); }
        if (data.autresImpotsLignes) { setAutresImpotsLignes(data.autresImpotsLignes); if (data.autresImpotsLignes.length > 0) setNextIds(prev => ({ ...prev, autres: Math.max(...data.autresImpotsLignes!.map((a: AutresImpotsLigne) => a.id)) + 1 })); }
        if (data.dettesFiscalesLignes) { setDettesFiscalesLignes(data.dettesFiscalesLignes); if (data.dettesFiscalesLignes.length > 0) setNextIds(prev => ({ ...prev, dettes: Math.max(...data.dettesFiscalesLignes!.map((a: DettesFiscalesLigne) => a.id)) + 1 })); }
        if (data.redressementLignes) { setRedressementLignes(data.redressementLignes); if (data.redressementLignes.length > 0) setNextIds(prev => ({ ...prev, redress: Math.max(...data.redressementLignes!.map((a: RedressementLigne) => a.id)) + 1 })); }
        if (data.odEcritures) { setOdEcritures(data.odEcritures); if (data.odEcritures.length > 0) setNextOdId(Math.max(...data.odEcritures.map((e: ODEcriture) => e.id)) + 1); }
      })
      .catch(() => {});
  };

  const handleSave = async (): Promise<void> => {
    try {
      const res = await clientFetch(`/api/revision/${entiteId}/${exerciceId}/etat`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isLignes, tauxIS, tvaCollecteeLignes, tvaDeductibleLignes, autresImpotsLignes, dettesFiscalesLignes, redressementLignes, odEcritures }),
      });
      if (!res.ok) throw new Error('Erreur sauvegarde');
      setSaved(true);
    } catch {
      setSaved(false);
      alert('Erreur lors de la sauvegarde. Reessayez.');
    }
  };

  // --- CRUD IS ---
  const addIsLigne = (): void => { setIsLignes(prev => [...prev, { id: nextIds.is, designation: '', montant: 0 }]); setNextIds(prev => ({ ...prev, is: prev.is + 1 })); setSaved(false); };
  const updateIsLigne = (id: number, field: keyof ISVerifLigne, value: string | number): void => { setIsLignes(prev => prev.map(l => l.id === id ? { ...l, [field]: value } : l)); setSaved(false); };
  const removeIsLigne = (id: number): void => { setIsLignes(prev => prev.filter(l => l.id !== id)); setSaved(false); };

  // --- CRUD TVA collectée ---
  const addTvaCollectee = (): void => { setTvaCollecteeLignes(prev => [...prev, { id: nextIds.tvac, nature: '', baseHT: 0, tauxTVA: 18, tvaCalculee: 0, tvaDeclaree: 0, ecart: 0 }]); setNextIds(prev => ({ ...prev, tvac: prev.tvac + 1 })); setSaved(false); };
  const updateTvaCollectee = (id: number, field: keyof TVACollecteeLigne, value: string | number): void => {
    setTvaCollecteeLignes(prev => prev.map(l => {
      if (l.id !== id) return l;
      const updated = { ...l, [field]: value };
      updated.tvaCalculee = updated.baseHT * updated.tauxTVA / 100;
      updated.ecart = updated.tvaCalculee - updated.tvaDeclaree;
      return updated;
    }));
    setSaved(false);
  };
  const removeTvaCollectee = (id: number): void => { setTvaCollecteeLignes(prev => prev.filter(l => l.id !== id)); setSaved(false); };

  // --- CRUD TVA déductible ---
  const addTvaDeductible = (): void => { setTvaDeductibleLignes(prev => [...prev, { id: nextIds.tvad, nature: '', compte: '', tvaDeclaree: 0, tvaBalance: 0, ecart: 0 }]); setNextIds(prev => ({ ...prev, tvad: prev.tvad + 1 })); setSaved(false); };
  const updateTvaDeductible = (id: number, field: keyof TVADeductibleLigne, value: string | number): void => {
    setTvaDeductibleLignes(prev => prev.map(l => {
      if (l.id !== id) return l;
      const updated = { ...l, [field]: value };
      updated.ecart = updated.tvaDeclaree - updated.tvaBalance;
      return updated;
    }));
    setSaved(false);
  };
  const removeTvaDeductible = (id: number): void => { setTvaDeductibleLignes(prev => prev.filter(l => l.id !== id)); setSaved(false); };

  // Auto-populate TVA déductible from balance (if empty)
  useEffect(() => {
    if (tvaDeductibleLignes.length === 0 && (comptes4451.length > 0 || comptes4452.length > 0 || comptes4453.length > 0 || comptes4454.length > 0)) {
      const lignes: TVADeductibleLigne[] = [];
      let idCounter = 1;
      if (comptes4451.length > 0) { lignes.push({ id: idCounter++, nature: 'TVA sur immobilisations', compte: '4451', tvaDeclaree: 0, tvaBalance: total4451Balance, ecart: -total4451Balance }); }
      if (comptes4452.length > 0) { lignes.push({ id: idCounter++, nature: 'TVA sur achats', compte: '4452', tvaDeclaree: 0, tvaBalance: total4452Balance, ecart: -total4452Balance }); }
      if (comptes4453.length > 0) { lignes.push({ id: idCounter++, nature: 'TVA sur transports', compte: '4453', tvaDeclaree: 0, tvaBalance: total4453Balance, ecart: -total4453Balance }); }
      if (comptes4454.length > 0) { lignes.push({ id: idCounter++, nature: 'TVA sur services', compte: '4454', tvaDeclaree: 0, tvaBalance: total4454Balance, ecart: -total4454Balance }); }
      if (lignes.length > 0) { setTvaDeductibleLignes(lignes); setNextIds(prev => ({ ...prev, tvad: idCounter })); }
    }
  }, [balanceN]);

  // --- CRUD Autres impôts ---
  const addAutresImpots = (): void => { setAutresImpotsLignes(prev => [...prev, { id: nextIds.autres, compte: '', designation: '', balance: 0, justification: '', observation: '' }]); setNextIds(prev => ({ ...prev, autres: prev.autres + 1 })); setSaved(false); };
  const updateAutresImpots = (id: number, field: keyof AutresImpotsLigne, value: string | number): void => { setAutresImpotsLignes(prev => prev.map(l => l.id === id ? { ...l, [field]: value } : l)); setSaved(false); };
  const removeAutresImpots = (id: number): void => { setAutresImpotsLignes(prev => prev.filter(l => l.id !== id)); setSaved(false); };

  // --- CRUD Dettes fiscales périodiques ---
  const getSoldeCompte = (prefix: string): number => {
    const lignes = balanceN.filter(l => l.numero_compte.startsWith(prefix));
    return soldeCredit(lignes);
  };
  const addDettesFiscales = (): void => { setDettesFiscalesLignes(prev => [...prev, { id: nextIds.dettes, compte: '', description: '', baseImposition: 0, impotDeclare: 0, balanceGenerale: 0, ecart: 0 }]); setNextIds(prev => ({ ...prev, dettes: prev.dettes + 1 })); setSaved(false); };
  const updateDettesFiscales = (id: number, field: keyof DettesFiscalesLigne, value: string | number): void => {
    setDettesFiscalesLignes(prev => prev.map(l => {
      if (l.id !== id) return l;
      const updated = { ...l, [field]: value };
      updated.ecart = updated.impotDeclare - updated.balanceGenerale;
      return updated;
    }));
    setSaved(false);
  };
  const removeDettesFiscales = (id: number): void => { setDettesFiscalesLignes(prev => prev.filter(l => l.id !== id)); setSaved(false); };

  // --- CRUD Redressements fiscaux ---
  const addRedressement = (): void => { setRedressementLignes(prev => [...prev, { id: nextIds.redress, typeControle: '', dateControle: '', referenceAMR: '', paye: '', chargeAPayer4486: 0, provisionContestation19: 0 }]); setNextIds(prev => ({ ...prev, redress: prev.redress + 1 })); setSaved(false); };
  const updateRedressement = (id: number, field: keyof RedressementLigne, value: string | number): void => { setRedressementLignes(prev => prev.map(l => l.id === id ? { ...l, [field]: value } : l)); setSaved(false); };
  const removeRedressement = (id: number): void => { setRedressementLignes(prev => prev.filter(l => l.id !== id)); setSaved(false); };

  // Auto-populate Autres impôts from balance (if empty)
  useEffect(() => {
    if (autresImpotsLignes.length === 0 && (comptesAutres44.length > 0 || comptes64.length > 0)) {
      const lignes: AutresImpotsLigne[] = [];
      let idCounter = 1;
      comptesAutres44.forEach(c => {
        const solde = soldeCreditNet(c);
        lignes.push({ id: idCounter++, compte: c.numero_compte, designation: c.libelle_compte, balance: solde, justification: '', observation: '' });
      });
      comptes64.forEach(c => {
        const solde = soldeNet(c);
        lignes.push({ id: idCounter++, compte: c.numero_compte, designation: c.libelle_compte, balance: solde, justification: '', observation: '' });
      });
      if (lignes.length > 0) { setAutresImpotsLignes(lignes); setNextIds(prev => ({ ...prev, autres: idCounter })); }
    }
  }, [balanceN]);

  // Auto-populate Dettes fiscales périodiques from balance (if empty)
  useEffect(() => {
    if (dettesFiscalesLignes.length === 0) {
      const defaultRows: { compte: string; description: string }[] = [
        { compte: '4411', description: 'Acomptes IS' },
        { compte: '4421', description: 'Cotisations patronales (CNSS, etc.)' },
        { compte: '4441', description: 'TVA due' },
        { compte: '4471', description: 'Impôts retenus à la source (IRPP, etc.)' },
      ];
      const lignes: DettesFiscalesLigne[] = defaultRows.map((row, idx) => {
        const bal = getSoldeCompte(row.compte);
        return { id: idx + 1, compte: row.compte, description: row.description, baseImposition: 0, impotDeclare: 0, balanceGenerale: bal, ecart: 0 - bal };
      });
      setDettesFiscalesLignes(lignes);
      setNextIds(prev => ({ ...prev, dettes: lignes.length + 1 }));
    }
  }, [balanceN]);

  // --- Calculs ---
  const resultatComptable = isLignes.find(l => l.id === 1)?.montant || 0;
  const reintegrations = isLignes.find(l => l.id === 2)?.montant || 0;
  const deductions = isLignes.find(l => l.id === 3)?.montant || 0;
  const resultatFiscal = resultatComptable + reintegrations - deductions;
  const isTheorique = resultatFiscal > 0 ? resultatFiscal * tauxIS / 100 : 0;
  const isComptabilise = total891Balance;
  const ecartIS = isTheorique - isComptabilise;

  const totalTvaCalculee = tvaCollecteeLignes.reduce((s, l) => s + l.tvaCalculee, 0);
  const totalTvaDeclareeCollectee = tvaCollecteeLignes.reduce((s, l) => s + l.tvaDeclaree, 0);
  const ecartTvaCollectee = totalTvaCalculee - totalTvaDeclareeCollectee;

  const totalTvaDeclareeDeductible = tvaDeductibleLignes.reduce((s, l) => s + l.tvaDeclaree, 0);
  const totalTvaBalanceDeductible = tvaDeductibleLignes.reduce((s, l) => s + l.tvaBalance, 0);
  const ecartTvaDeductible = totalTvaDeclareeDeductible - totalTvaBalanceDeductible;

  const tvaDueTheorique = totalTvaDeclareeCollectee - totalTvaDeclareeDeductible;
  const tvaDueBalance = total4441Balance;
  const creditTvaBalance = total4449Balance;
  const soldeTvaTheorique = tvaDueTheorique > 0 ? tvaDueTheorique : 0;
  const creditTvaTheorique = tvaDueTheorique < 0 ? Math.abs(tvaDueTheorique) : 0;
  const ecartTvaDue = soldeTvaTheorique - tvaDueBalance;
  const ecartCreditTva = creditTvaTheorique - creditTvaBalance;

  const totalDettesDeclare = dettesFiscalesLignes.reduce((s, l) => s + l.impotDeclare, 0);
  const totalDettesBalance = dettesFiscalesLignes.reduce((s, l) => s + l.balanceGenerale, 0);
  const totalDettesEcart = dettesFiscalesLignes.reduce((s, l) => s + l.ecart, 0);

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
  if (Math.abs(ecartIS) > 0.5 && isTheorique > 0) {
    const dejaPropose = odEcritures.some(od => od.source === 'Etat-C1-IS');
    if (!dejaPropose) {
      if (ecartIS > 0) {
        suggestions.push({ compteDebit: '891', libelleDebit: 'Impôts sur les bénéfices', compteCredit: '441', libelleCredit: 'État, impôt sur les bénéfices', montant: ecartIS, libelle: 'Complément IS à comptabiliser (IS théorique > IS comptabilisé)', source: 'Etat-C1-IS' });
      } else {
        suggestions.push({ compteDebit: '441', libelleDebit: 'État, impôt sur les bénéfices', compteCredit: '891', libelleCredit: 'Impôts sur les bénéfices', montant: Math.abs(ecartIS), libelle: 'Excédent IS comptabilisé à reprendre (IS comptabilisé > IS théorique)', source: 'Etat-C1-IS' });
      }
    }
  }
  if (Math.abs(ecartTvaDue) > 0.5 && soldeTvaTheorique > 0) {
    if (!odEcritures.some(od => od.source === 'Etat-C4-TVAdue')) {
      suggestions.push({ compteDebit: '4431', libelleDebit: 'TVA facturée sur ventes', compteCredit: '4441', libelleCredit: 'TVA due', montant: Math.abs(ecartTvaDue), libelle: `Régularisation TVA due (écart ${fmt(ecartTvaDue)})`, source: 'Etat-C4-TVAdue' });
    }
  }
  if (Math.abs(ecartCreditTva) > 0.5 && creditTvaTheorique > 0) {
    if (!odEcritures.some(od => od.source === 'Etat-C4-CreditTVA')) {
      suggestions.push({ compteDebit: '4449', libelleDebit: 'Crédit de TVA à reporter', compteCredit: '445', libelleCredit: 'TVA récupérable', montant: Math.abs(ecartCreditTva), libelle: `Régularisation crédit de TVA (écart ${fmt(ecartCreditTva)})`, source: 'Etat-C4-CreditTVA' });
    }
  }
  redressementLignes.forEach(r => {
    if (r.paye === 'Oui' && r.chargeAPayer4486 > 0) {
      const source = `Etat-C7-Redress-${r.id}-accepte`;
      if (!odEcritures.some(od => od.source === source)) {
        suggestions.push({ compteDebit: '6xx', libelleDebit: 'Charge fiscale (redressement accepté)', compteCredit: '4486', libelleCredit: 'État, charges à payer', montant: r.chargeAPayer4486, libelle: `Redressement accepté — ${r.referenceAMR || r.typeControle} : D 6xx / C 4486`, source });
      }
    }
    if (r.paye === 'Non' && r.provisionContestation19 > 0) {
      const source = `Etat-C7-Redress-${r.id}-conteste`;
      if (!odEcritures.some(od => od.source === source)) {
        suggestions.push({ compteDebit: '6591', libelleDebit: 'Dotation provisions pour litiges fiscaux', compteCredit: '19xx', libelleCredit: 'Provisions pour risques fiscaux', montant: r.provisionContestation19, libelle: `Redressement contesté — ${r.referenceAMR || r.typeControle} : D 6591 / C 19xx`, source });
      }
    }
  });

  return (
    <div className="revision-kp">
      <div className="revision-section-header">
        <h3>État (IS, TVA)</h3>
        <button className="revision-save-btn" onClick={handleSave}>
          <LuSave size={14} /> {saved ? 'Sauvegardé' : 'Sauvegarder'}
        </button>
      </div>

      <div className="revision-objectif">
        <strong>Objectif :</strong> S'assurer de la correcte détermination de l'impôt sur les sociétés (IS), de la cohérence des déclarations de TVA avec la comptabilité (TVA collectée, TVA déductible, solde de TVA) et de la justification de l'ensemble des dettes fiscales (comptes 44x) et charges d'impôts (64x, 89x).
      </div>

      <div className="revision-travaux">
        <button className="revision-travaux-toggle" onClick={() => setShowTravaux(!showTravaux)}>
          {showTravaux ? <LuChevronDown size={14} /> : <LuChevronRight size={14} />}
          <LuClipboardList size={14} />
          <span>Travaux à effectuer</span>
        </button>
        {showTravaux && (
          <ul className="revision-travaux-list">
            {TRAVAUX_ETAT.map((t, i) => <li key={i}>{t}</li>)}
          </ul>
        )}
      </div>

      <FonctionnementCompte prefixes={['44','43']} titre="État et organismes sociaux" />

      {comptes44.length > 0 && (
        <div className="revision-objectif">
          <strong>Information :</strong> La balance contient {comptes44.length} compte{comptes44.length > 1 ? 's' : ''} fiscaux (44x).
          {comptes441.length > 0 && <> IS à payer (441) : <strong>{fmt(total441Balance)}</strong>.</>}
          {comptes891.length > 0 && <> IS comptabilisé (891) : <strong>{fmt(isComptabilise)}</strong>.</>}
          {comptes4431.length > 0 && <> TVA collectée (4431/4432) : <strong>{fmt(total4431Balance)}</strong>.</>}
          {comptes4441.length > 0 && <> TVA due (4441) : <strong>{fmt(tvaDueBalance)}</strong>.</>}
          {comptes4449.length > 0 && <> Crédit TVA (4449) : <strong>{fmt(creditTvaBalance)}</strong>.</>}
          {comptes64.length > 0 && <> Charges d'impôts (64x) : <strong>{fmt(soldeDebit(comptes64))}</strong>.</>}
          <br />Complétez les contrôles ci-dessous pour valider la cohérence.
        </div>
      )}

      <RevisionEtatTable
        isLignes={isLignes} tauxIS={tauxIS}
        onAddIsLigne={addIsLigne} onUpdateIsLigne={updateIsLigne} onRemoveIsLigne={removeIsLigne} onSetTauxIS={setTauxIS}
        resultatFiscal={resultatFiscal} isTheorique={isTheorique} isComptabilise={isComptabilise} ecartIS={ecartIS}
        total891Balance={total891Balance} total441Balance={total441Balance} comptes89={comptes89} soldeDebit={soldeDebit}
        tvaCollecteeLignes={tvaCollecteeLignes} onAddTvaCollectee={addTvaCollectee} onUpdateTvaCollectee={updateTvaCollectee} onRemoveTvaCollectee={removeTvaCollectee}
        totalTvaCalculee={totalTvaCalculee} totalTvaDeclareeCollectee={totalTvaDeclareeCollectee} ecartTvaCollectee={ecartTvaCollectee} total4431Balance={total4431Balance}
        tvaDeductibleLignes={tvaDeductibleLignes} onAddTvaDeductible={addTvaDeductible} onUpdateTvaDeductible={updateTvaDeductible} onRemoveTvaDeductible={removeTvaDeductible}
        totalTvaDeclareeDeductible={totalTvaDeclareeDeductible} totalTvaBalanceDeductible={totalTvaBalanceDeductible} ecartTvaDeductible={ecartTvaDeductible}
        tvaDueTheorique={tvaDueTheorique} tvaDueBalance={tvaDueBalance} creditTvaBalance={creditTvaBalance}
        soldeTvaTheorique={soldeTvaTheorique} creditTvaTheorique={creditTvaTheorique} ecartTvaDue={ecartTvaDue} ecartCreditTva={ecartCreditTva} total445Balance={total445Balance}
        autresImpotsLignes={autresImpotsLignes} onAddAutresImpots={addAutresImpots} onUpdateAutresImpots={updateAutresImpots} onRemoveAutresImpots={removeAutresImpots}
        dettesFiscalesLignes={dettesFiscalesLignes} onAddDettesFiscales={addDettesFiscales} onUpdateDettesFiscales={updateDettesFiscales} onRemoveDettesFiscales={removeDettesFiscales}
        totalDettesDeclare={totalDettesDeclare} totalDettesBalance={totalDettesBalance} totalDettesEcart={totalDettesEcart}
        redressementLignes={redressementLignes} onAddRedressement={addRedressement} onUpdateRedressement={updateRedressement} onRemoveRedressement={removeRedressement}
        onMarkUnsaved={() => setSaved(false)}
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

export default RevisionEtat;
