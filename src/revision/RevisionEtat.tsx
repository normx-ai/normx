import React, { useState, useEffect } from 'react';
import { LuSave, LuChevronDown, LuChevronRight, LuClipboardList, LuPlus, LuTrash2 } from 'react-icons/lu';
import { BalanceLigne } from '../types';
import { ODEcriture, Suggestion, fmt, fmtInput, parseInputValue } from './revisionTypes';
import JournalOD from './JournalOD';

interface RevisionEtatProps {
  balanceN: BalanceLigne[];
  exerciceAnnee: number;
  entiteId: number;
  exerciceId: number;
}

// Contrôle 1 : Vérification IS
interface ISVerifLigne {
  id: number;
  designation: string;
  montant: number;
}

// Contrôle 2 : TVA collectée
interface TVACollecteeLigne {
  id: number;
  nature: string;
  baseHT: number;
  tauxTVA: number;
  tvaCalculee: number;
  tvaDeclaree: number;
  ecart: number;
}

// Contrôle 3 : TVA déductible
interface TVADeductibleLigne {
  id: number;
  nature: string;
  compte: string;
  tvaDeclaree: number;
  tvaBalance: number;
  ecart: number;
}

// Contrôle 5 : Autres impôts et taxes
interface AutresImpotsLigne {
  id: number;
  compte: string;
  designation: string;
  balance: number;
  justification: string;
  observation: string;
}

// Contrôle 6 : Bouclage dettes fiscales périodiques
interface DettesFiscalesLigne {
  id: number;
  compte: string;
  description: string;
  baseImposition: number;
  impotDeclare: number;
  balanceGenerale: number;
  ecart: number;
}

// Contrôle 7 : Redressements fiscaux
interface RedressementLigne {
  id: number;
  typeControle: string;
  dateControle: string;
  referenceAMR: string;
  paye: 'Oui' | 'Non' | '';
  chargeAPayer4486: number;
  provisionContestation19: number;
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
  // --- TVA collectée ---
  const [tvaCollecteeLignes, setTvaCollecteeLignes] = useState<TVACollecteeLigne[]>([]);
  // --- TVA déductible ---
  const [tvaDeductibleLignes, setTvaDeductibleLignes] = useState<TVADeductibleLigne[]>([]);
  // --- Autres impôts ---
  const [autresImpotsLignes, setAutresImpotsLignes] = useState<AutresImpotsLigne[]>([]);
  // --- Dettes fiscales périodiques (Contrôle 6) ---
  const [dettesFiscalesLignes, setDettesFiscalesLignes] = useState<DettesFiscalesLigne[]>([]);
  // --- Redressements fiscaux (Contrôle 7) ---
  const [redressementLignes, setRedressementLignes] = useState<RedressementLigne[]>([]);
  // --- IDs ---
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
  const comptes4411 = balanceN.filter(l => l.numero_compte.startsWith('4411'));
  const comptes4421 = balanceN.filter(l => l.numero_compte.startsWith('4421'));
  const comptes4471 = balanceN.filter(l => l.numero_compte.startsWith('4471'));

  // Comptes 44x non couverts par les contrôles 1-4 (pas 441, 443x, 444x, 445x, 4449)
  const comptesAutres44 = balanceN.filter(l => {
    const c = l.numero_compte;
    return c.startsWith('44') &&
      !c.startsWith('441') &&
      !c.startsWith('443') &&
      !c.startsWith('4441') &&
      !c.startsWith('445') &&
      !c.startsWith('4449');
  });

  const soldeCredit = (lignes: BalanceLigne[]): number =>
    lignes.reduce((s, l) => s + ((parseFloat(String(l.solde_crediteur)) || 0) - (parseFloat(String(l.solde_debiteur)) || 0)), 0);
  const soldeDebit = (lignes: BalanceLigne[]): number =>
    lignes.reduce((s, l) => s + ((parseFloat(String(l.solde_debiteur)) || 0) - (parseFloat(String(l.solde_crediteur)) || 0)), 0);

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
    fetch(`/api/revision/${entiteId}/${exerciceId}/etat`)
      .then(r => { if (r.ok) return r.json(); throw new Error(); })
      .then((data: any) => {
        if (data.isLignes?.length > 0) { setIsLignes(data.isLignes); setNextIds(prev => ({ ...prev, is: Math.max(...data.isLignes.map((a: ISVerifLigne) => a.id)) + 1 })); }
        if (data.tauxIS !== undefined) setTauxIS(data.tauxIS);
        if (data.tvaCollecteeLignes?.length > 0) { setTvaCollecteeLignes(data.tvaCollecteeLignes); setNextIds(prev => ({ ...prev, tvac: Math.max(...data.tvaCollecteeLignes.map((a: TVACollecteeLigne) => a.id)) + 1 })); }
        if (data.tvaDeductibleLignes?.length > 0) { setTvaDeductibleLignes(data.tvaDeductibleLignes); setNextIds(prev => ({ ...prev, tvad: Math.max(...data.tvaDeductibleLignes.map((a: TVADeductibleLigne) => a.id)) + 1 })); }
        if (data.autresImpotsLignes?.length > 0) { setAutresImpotsLignes(data.autresImpotsLignes); setNextIds(prev => ({ ...prev, autres: Math.max(...data.autresImpotsLignes.map((a: AutresImpotsLigne) => a.id)) + 1 })); }
        if (data.dettesFiscalesLignes?.length > 0) { setDettesFiscalesLignes(data.dettesFiscalesLignes); setNextIds(prev => ({ ...prev, dettes: Math.max(...data.dettesFiscalesLignes.map((a: DettesFiscalesLigne) => a.id)) + 1 })); }
        if (data.redressementLignes?.length > 0) { setRedressementLignes(data.redressementLignes); setNextIds(prev => ({ ...prev, redress: Math.max(...data.redressementLignes.map((a: RedressementLigne) => a.id)) + 1 })); }
        if (data.odEcritures?.length > 0) { setOdEcritures(data.odEcritures); setNextOdId(Math.max(...data.odEcritures.map((e: ODEcriture) => e.id)) + 1); }
      })
      .catch(() => {});
  };

  const handleSave = async (): Promise<void> => {
    try {
      await fetch(`/api/revision/${entiteId}/${exerciceId}/etat`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isLignes, tauxIS, tvaCollecteeLignes, tvaDeductibleLignes, autresImpotsLignes, dettesFiscalesLignes, redressementLignes, odEcritures }),
      });
      setSaved(true);
    } catch { /* silently */ }
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
      if (comptes4451.length > 0) {
        lignes.push({ id: idCounter++, nature: 'TVA sur immobilisations', compte: '4451', tvaDeclaree: 0, tvaBalance: total4451Balance, ecart: -total4451Balance });
      }
      if (comptes4452.length > 0) {
        lignes.push({ id: idCounter++, nature: 'TVA sur achats', compte: '4452', tvaDeclaree: 0, tvaBalance: total4452Balance, ecart: -total4452Balance });
      }
      if (comptes4453.length > 0) {
        lignes.push({ id: idCounter++, nature: 'TVA sur transports', compte: '4453', tvaDeclaree: 0, tvaBalance: total4453Balance, ecart: -total4453Balance });
      }
      if (comptes4454.length > 0) {
        lignes.push({ id: idCounter++, nature: 'TVA sur services', compte: '4454', tvaDeclaree: 0, tvaBalance: total4454Balance, ecart: -total4454Balance });
      }
      if (lignes.length > 0) {
        setTvaDeductibleLignes(lignes);
        setNextIds(prev => ({ ...prev, tvad: idCounter }));
      }
    }
  }, [balanceN]);

  // --- CRUD Autres impôts ---
  const addAutresImpots = (): void => { setAutresImpotsLignes(prev => [...prev, { id: nextIds.autres, compte: '', designation: '', balance: 0, justification: '', observation: '' }]); setNextIds(prev => ({ ...prev, autres: prev.autres + 1 })); setSaved(false); };
  const updateAutresImpots = (id: number, field: keyof AutresImpotsLigne, value: string | number): void => { setAutresImpotsLignes(prev => prev.map(l => l.id === id ? { ...l, [field]: value } : l)); setSaved(false); };
  const removeAutresImpots = (id: number): void => { setAutresImpotsLignes(prev => prev.filter(l => l.id !== id)); setSaved(false); };

  // --- CRUD Dettes fiscales périodiques (Contrôle 6) ---
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

  // --- CRUD Redressements fiscaux (Contrôle 7) ---
  const addRedressement = (): void => { setRedressementLignes(prev => [...prev, { id: nextIds.redress, typeControle: '', dateControle: '', referenceAMR: '', paye: '', chargeAPayer4486: 0, provisionContestation19: 0 }]); setNextIds(prev => ({ ...prev, redress: prev.redress + 1 })); setSaved(false); };
  const updateRedressement = (id: number, field: keyof RedressementLigne, value: string | number): void => { setRedressementLignes(prev => prev.map(l => l.id === id ? { ...l, [field]: value } : l)); setSaved(false); };
  const removeRedressement = (id: number): void => { setRedressementLignes(prev => prev.filter(l => l.id !== id)); setSaved(false); };

  // Auto-populate Autres impôts from balance (if empty)
  useEffect(() => {
    if (autresImpotsLignes.length === 0 && (comptesAutres44.length > 0 || comptes64.length > 0)) {
      const lignes: AutresImpotsLigne[] = [];
      let idCounter = 1;
      comptesAutres44.forEach(c => {
        const solde = (parseFloat(String(c.solde_crediteur)) || 0) - (parseFloat(String(c.solde_debiteur)) || 0);
        lignes.push({ id: idCounter++, compte: c.numero_compte, designation: c.libelle_compte, balance: solde, justification: '', observation: '' });
      });
      comptes64.forEach(c => {
        const solde = (parseFloat(String(c.solde_debiteur)) || 0) - (parseFloat(String(c.solde_crediteur)) || 0);
        lignes.push({ id: idCounter++, compte: c.numero_compte, designation: c.libelle_compte, balance: solde, justification: '', observation: '' });
      });
      if (lignes.length > 0) {
        setAutresImpotsLignes(lignes);
        setNextIds(prev => ({ ...prev, autres: idCounter }));
      }
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

  // --- Calculs Contrôle 1 : IS ---
  const resultatComptable = isLignes.find(l => l.id === 1)?.montant || 0;
  const reintegrations = isLignes.find(l => l.id === 2)?.montant || 0;
  const deductions = isLignes.find(l => l.id === 3)?.montant || 0;
  const resultatFiscal = resultatComptable + reintegrations - deductions;
  const isTheorique = resultatFiscal > 0 ? resultatFiscal * tauxIS / 100 : 0;
  const isComptabilise = total891Balance;
  const ecartIS = isTheorique - isComptabilise;

  // --- Calculs Contrôle 2 : TVA collectée ---
  const totalTvaCalculee = tvaCollecteeLignes.reduce((s, l) => s + l.tvaCalculee, 0);
  const totalTvaDeclareeCollectee = tvaCollecteeLignes.reduce((s, l) => s + l.tvaDeclaree, 0);
  const ecartTvaCollectee = totalTvaCalculee - totalTvaDeclareeCollectee;

  // --- Calculs Contrôle 3 : TVA déductible ---
  const totalTvaDeclareeDeductible = tvaDeductibleLignes.reduce((s, l) => s + l.tvaDeclaree, 0);
  const totalTvaBalanceDeductible = tvaDeductibleLignes.reduce((s, l) => s + l.tvaBalance, 0);
  const ecartTvaDeductible = totalTvaDeclareeDeductible - totalTvaBalanceDeductible;

  // --- Calculs Contrôle 4 : Solde TVA ---
  const tvaDueTheorique = totalTvaDeclareeCollectee - totalTvaDeclareeDeductible;
  const tvaDueBalance = total4441Balance;
  const creditTvaBalance = total4449Balance;
  const soldeTvaTheorique = tvaDueTheorique > 0 ? tvaDueTheorique : 0;
  const creditTvaTheorique = tvaDueTheorique < 0 ? Math.abs(tvaDueTheorique) : 0;
  const ecartTvaDue = soldeTvaTheorique - tvaDueBalance;
  const ecartCreditTva = creditTvaTheorique - creditTvaBalance;

  // --- Calculs Contrôle 6 : Dettes fiscales périodiques ---
  const totalDettesDeclare = dettesFiscalesLignes.reduce((s, l) => s + l.impotDeclare, 0);
  const totalDettesBalance = dettesFiscalesLignes.reduce((s, l) => s + l.balanceGenerale, 0);
  const totalDettesEcart = dettesFiscalesLignes.reduce((s, l) => s + l.ecart, 0);

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

  // Suggestion IS : écart entre IS théorique et IS comptabilisé
  if (Math.abs(ecartIS) > 0.5 && isTheorique > 0) {
    const dejaPropose = odEcritures.some(od => od.source === 'Etat-C1-IS');
    if (!dejaPropose) {
      if (ecartIS > 0) {
        suggestions.push({
          compteDebit: '891', libelleDebit: 'Impôts sur les bénéfices',
          compteCredit: '441', libelleCredit: 'État, impôt sur les bénéfices',
          montant: ecartIS, libelle: 'Complément IS à comptabiliser (IS théorique > IS comptabilisé)',
          source: 'Etat-C1-IS',
        });
      } else {
        suggestions.push({
          compteDebit: '441', libelleDebit: 'État, impôt sur les bénéfices',
          compteCredit: '891', libelleCredit: 'Impôts sur les bénéfices',
          montant: Math.abs(ecartIS), libelle: 'Excédent IS comptabilisé à reprendre (IS comptabilisé > IS théorique)',
          source: 'Etat-C1-IS',
        });
      }
    }
  }

  // Suggestion TVA due : écart entre TVA due théorique et balance 4441
  if (Math.abs(ecartTvaDue) > 0.5 && soldeTvaTheorique > 0) {
    const dejaPropose = odEcritures.some(od => od.source === 'Etat-C4-TVAdue');
    if (!dejaPropose) {
      suggestions.push({
        compteDebit: '4431', libelleDebit: 'TVA facturée sur ventes',
        compteCredit: '4441', libelleCredit: 'TVA due',
        montant: Math.abs(ecartTvaDue), libelle: `Régularisation TVA due (écart ${fmt(ecartTvaDue)})`,
        source: 'Etat-C4-TVAdue',
      });
    }
  }

  // Suggestion crédit TVA : écart entre crédit théorique et balance 4449
  if (Math.abs(ecartCreditTva) > 0.5 && creditTvaTheorique > 0) {
    const dejaPropose = odEcritures.some(od => od.source === 'Etat-C4-CreditTVA');
    if (!dejaPropose) {
      suggestions.push({
        compteDebit: '4449', libelleDebit: 'Crédit de TVA à reporter',
        compteCredit: '445', libelleCredit: 'TVA récupérable',
        montant: Math.abs(ecartCreditTva), libelle: `Régularisation crédit de TVA (écart ${fmt(ecartCreditTva)})`,
        source: 'Etat-C4-CreditTVA',
      });
    }
  }

  // Suggestions Contrôle 7 : Redressements fiscaux
  redressementLignes.forEach(r => {
    if (r.paye === 'Oui' && r.chargeAPayer4486 > 0) {
      const source = `Etat-C7-Redress-${r.id}-accepte`;
      const dejaPropose = odEcritures.some(od => od.source === source);
      if (!dejaPropose) {
        suggestions.push({
          compteDebit: '6xx', libelleDebit: 'Charge fiscale (redressement accepté)',
          compteCredit: '4486', libelleCredit: 'État, charges à payer',
          montant: r.chargeAPayer4486,
          libelle: `Redressement accepté — ${r.referenceAMR || r.typeControle} : D 6xx / C 4486`,
          source,
        });
      }
    }
    if (r.paye === 'Non' && r.provisionContestation19 > 0) {
      const source = `Etat-C7-Redress-${r.id}-conteste`;
      const dejaPropose = odEcritures.some(od => od.source === source);
      if (!dejaPropose) {
        suggestions.push({
          compteDebit: '6591', libelleDebit: 'Dotation provisions pour litiges fiscaux',
          compteCredit: '19xx', libelleCredit: 'Provisions pour risques fiscaux',
          montant: r.provisionContestation19,
          libelle: `Redressement contesté — ${r.referenceAMR || r.typeControle} : D 6591 / C 19xx`,
          source,
        });
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

      {/* Note si comptes 44x en balance */}
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

      {/* ========== Contrôle 1 : Vérification IS ========== */}
      <div className="revision-control">
        <div className="revision-control-title">
          <span>Contrôle 1 — Vérification de l'Impôt sur les Sociétés (IS)</span>
          {isLignes.length > 0 && (Math.abs(ecartIS) < 0.5
            ? <span className="revision-badge ok">Conforme</span>
            : <span className="revision-badge ko">Écart détecté</span>
          )}
        </div>
        <div className="revision-ref">Comptes 891 (IS exercice), 892 (rappels IS), 895 (IMF) / 441 (État, IS à payer)</div>

        <div className="revision-table-wrapper" style={{ marginTop: 8 }}>
          <table className="revision-table">
            <thead>
              <tr>
                <th>Désignation</th>
                <th className="num editable-col" style={{ width: 160 }}>Montant</th>
                <th style={{ width: 30 }}></th>
              </tr>
            </thead>
            <tbody>
              {isLignes.map(l => (
                <tr key={l.id}>
                  <td className="editable-cell"><input type="text" value={l.designation} onChange={e => updateIsLigne(l.id, 'designation', e.target.value)} style={{ maxWidth: 'none' }} /></td>
                  <td className="editable-cell"><input type="text" inputMode="numeric" value={fmtInput(l.montant)} onChange={e => updateIsLigne(l.id, 'montant', parseInputValue(e.target.value))} style={{ maxWidth: 'none' }} /></td>
                  <td>{l.id > 3 && <button className="revision-od-delete" onClick={() => removeIsLigne(l.id)} title="Supprimer"><LuTrash2 size={13} /></button>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="revision-od-actions">
          <button className="revision-od-add" onClick={addIsLigne}><LuPlus size={13} /> Ajouter une ligne</button>
        </div>

        <div style={{ marginTop: 12, padding: '10px 14px', background: '#f8f9fa', borderRadius: 6, fontSize: '12.5px' }}>
          <div style={{ marginBottom: 8 }}>
            <strong>Taux IS applicable :</strong>{' '}
            <input type="text" inputMode="numeric" value={tauxIS} onChange={e => { setTauxIS(parseFloat(e.target.value) || 0); setSaved(false); }} style={{ width: 50, textAlign: 'center', border: '1px solid #ddd', borderRadius: 4, padding: '2px 4px' }} /> %
          </div>
          <table className="revision-table revision-table-small" style={{ maxWidth: 500 }}>
            <tbody>
              <tr><td>Résultat fiscal calculé</td><td className="num"><strong>{fmt(resultatFiscal)}</strong></td></tr>
              <tr><td>IS théorique ({tauxIS}%)</td><td className="num"><strong>{fmt(isTheorique)}</strong></td></tr>
              <tr><td>IS comptabilisé (891x balance)</td><td className="num"><strong>{fmt(isComptabilise)}</strong></td></tr>
              <tr><td>Écart</td><td className={`num ${Math.abs(ecartIS) > 0.5 ? 'ecart-val' : 'ok-val'}`}><strong>{fmt(ecartIS)}</strong></td></tr>
            </tbody>
          </table>
        </div>

        {/* Rapprochement IS */}
        <div style={{ marginTop: 8, padding: '10px 14px', background: '#f0f4f8', borderRadius: 6, fontSize: '12.5px' }}>
          <strong>Rapprochement :</strong>
          <table className="revision-table revision-table-small" style={{ maxWidth: 500, marginTop: 6 }}>
            <tbody>
              <tr><td>IS théorique</td><td className="num">{fmt(isTheorique)}</td></tr>
              <tr><td>Solde 891 (IS en balance)</td><td className="num">{fmt(total891Balance)}</td></tr>
              <tr><td>Solde 441 (IS à payer en balance)</td><td className="num">{fmt(total441Balance)}</td></tr>
              {comptes89.filter(c => !c.numero_compte.startsWith('891')).map(c => (
                <tr key={c.numero_compte}>
                  <td>{c.numero_compte} — {c.libelle_compte}</td>
                  <td className="num">{fmt(soldeDebit([c]))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ========== Contrôle 2 : TVA collectée ========== */}
      <div className="revision-control">
        <div className="revision-control-title">
          <span>Contrôle 2 — TVA collectée</span>
          {tvaCollecteeLignes.length > 0 && (Math.abs(ecartTvaCollectee) < 0.5
            ? <span className="revision-badge ok">Conforme</span>
            : <span className="revision-badge ko">Écart détecté</span>
          )}
        </div>
        <div className="revision-ref">Comptes 4431 (TVA facturée sur ventes), 4432 — TVA calculée = Base HT x Taux TVA</div>

        <div className="revision-table-wrapper" style={{ marginTop: 8 }}>
          <table className="revision-table">
            <thead>
              <tr>
                <th>Nature</th>
                <th className="num editable-col" style={{ width: 130 }}>Base HT</th>
                <th className="num editable-col" style={{ width: 80 }}>Taux TVA %</th>
                <th className="num" style={{ width: 130 }}>TVA calculée</th>
                <th className="num editable-col" style={{ width: 130 }}>TVA déclarée</th>
                <th className="num" style={{ width: 110 }}>Écart</th>
                <th style={{ width: 30 }}></th>
              </tr>
            </thead>
            <tbody>
              {tvaCollecteeLignes.map(l => (
                <tr key={l.id} className={Math.abs(l.ecart) > 0.5 ? 'ecart-row' : ''}>
                  <td className="editable-cell"><input type="text" value={l.nature} onChange={e => updateTvaCollectee(l.id, 'nature', e.target.value)} style={{ maxWidth: 'none' }} /></td>
                  <td className="editable-cell"><input type="text" inputMode="numeric" value={fmtInput(l.baseHT)} onChange={e => updateTvaCollectee(l.id, 'baseHT', parseInputValue(e.target.value))} style={{ maxWidth: 'none' }} /></td>
                  <td className="editable-cell"><input type="text" inputMode="numeric" value={l.tauxTVA || ''} onChange={e => updateTvaCollectee(l.id, 'tauxTVA', parseFloat(e.target.value) || 0)} style={{ maxWidth: 'none', textAlign: 'center' }} /></td>
                  <td className="num computed">{fmt(l.tvaCalculee)}</td>
                  <td className="editable-cell"><input type="text" inputMode="numeric" value={fmtInput(l.tvaDeclaree)} onChange={e => updateTvaCollectee(l.id, 'tvaDeclaree', parseInputValue(e.target.value))} style={{ maxWidth: 'none' }} /></td>
                  <td className={`num ${Math.abs(l.ecart) > 0.5 ? 'ecart-val' : 'ok-val'}`}>{fmt(l.ecart)}</td>
                  <td><button className="revision-od-delete" onClick={() => removeTvaCollectee(l.id)} title="Supprimer"><LuTrash2 size={13} /></button></td>
                </tr>
              ))}
              {tvaCollecteeLignes.length === 0 && (
                <tr><td colSpan={7} style={{ textAlign: 'center', color: '#999', padding: 16, fontStyle: 'italic' }}>Aucune ligne de TVA collectée saisie. Ajoutez les bases HT par nature d'opération.</td></tr>
              )}
            </tbody>
            {tvaCollecteeLignes.length > 0 && (
              <tfoot>
                <tr>
                  <td colSpan={2}><strong>Total</strong></td>
                  <td></td>
                  <td className="num"><strong>{fmt(totalTvaCalculee)}</strong></td>
                  <td className="num"><strong>{fmt(totalTvaDeclareeCollectee)}</strong></td>
                  <td className={`num ${Math.abs(ecartTvaCollectee) > 0.5 ? 'ecart-val' : 'ok-val'}`}><strong>{fmt(ecartTvaCollectee)}</strong></td>
                  <td></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>

        {(tvaCollecteeLignes.length > 0 || total4431Balance !== 0) && (
          <div style={{ marginTop: 12, padding: '10px 14px', background: '#f8f9fa', borderRadius: 6, fontSize: '12.5px' }}>
            <table className="revision-table revision-table-small" style={{ maxWidth: 400 }}>
              <tbody>
                <tr><td>Total TVA déclarée (Contrôle 2)</td><td className="num"><strong>{fmt(totalTvaDeclareeCollectee)}</strong></td></tr>
                <tr><td>Balance 4431/4432</td><td className="num"><strong>{fmt(total4431Balance)}</strong></td></tr>
                <tr><td>Écart</td><td className={`num ${Math.abs(totalTvaDeclareeCollectee - total4431Balance) > 0.5 ? 'ecart-val' : 'ok-val'}`}><strong>{fmt(totalTvaDeclareeCollectee - total4431Balance)}</strong></td></tr>
              </tbody>
            </table>
          </div>
        )}

        <div className="revision-od-actions">
          <button className="revision-od-add" onClick={addTvaCollectee}><LuPlus size={13} /> Ajouter une ligne TVA collectée</button>
        </div>
      </div>

      {/* ========== Contrôle 3 : TVA déductible ========== */}
      <div className="revision-control">
        <div className="revision-control-title">
          <span>Contrôle 3 — TVA déductible</span>
          {tvaDeductibleLignes.length > 0 && (Math.abs(ecartTvaDeductible) < 0.5
            ? <span className="revision-badge ok">Conforme</span>
            : <span className="revision-badge ko">Écart détecté</span>
          )}
        </div>
        <div className="revision-ref">Comptes 4451 (sur immobilisations), 4452 (sur achats), 4453 (sur transports), 4454 (sur services)</div>

        <div className="revision-table-wrapper" style={{ marginTop: 8 }}>
          <table className="revision-table">
            <thead>
              <tr>
                <th>Nature</th>
                <th style={{ width: 80 }}>Compte</th>
                <th className="num editable-col" style={{ width: 140 }}>TVA déclarée</th>
                <th className="num" style={{ width: 140 }}>TVA balance</th>
                <th className="num" style={{ width: 110 }}>Écart</th>
                <th style={{ width: 30 }}></th>
              </tr>
            </thead>
            <tbody>
              {tvaDeductibleLignes.map(l => (
                <tr key={l.id} className={Math.abs(l.ecart) > 0.5 ? 'ecart-row' : ''}>
                  <td className="editable-cell"><input type="text" value={l.nature} onChange={e => updateTvaDeductible(l.id, 'nature', e.target.value)} style={{ maxWidth: 'none' }} /></td>
                  <td className="editable-cell"><input type="text" value={l.compte} onChange={e => updateTvaDeductible(l.id, 'compte', e.target.value)} style={{ maxWidth: 'none', fontFamily: 'monospace' }} /></td>
                  <td className="editable-cell"><input type="text" inputMode="numeric" value={fmtInput(l.tvaDeclaree)} onChange={e => updateTvaDeductible(l.id, 'tvaDeclaree', parseInputValue(e.target.value))} style={{ maxWidth: 'none' }} /></td>
                  <td className="num computed">{fmt(l.tvaBalance)}</td>
                  <td className={`num ${Math.abs(l.ecart) > 0.5 ? 'ecart-val' : 'ok-val'}`}>{fmt(l.ecart)}</td>
                  <td><button className="revision-od-delete" onClick={() => removeTvaDeductible(l.id)} title="Supprimer"><LuTrash2 size={13} /></button></td>
                </tr>
              ))}
              {tvaDeductibleLignes.length === 0 && (
                <tr><td colSpan={6} style={{ textAlign: 'center', color: '#999', padding: 16, fontStyle: 'italic' }}>Aucun compte de TVA déductible en balance.</td></tr>
              )}
            </tbody>
            {tvaDeductibleLignes.length > 0 && (
              <tfoot>
                <tr>
                  <td colSpan={2}><strong>Total</strong></td>
                  <td className="num"><strong>{fmt(totalTvaDeclareeDeductible)}</strong></td>
                  <td className="num"><strong>{fmt(totalTvaBalanceDeductible)}</strong></td>
                  <td className={`num ${Math.abs(ecartTvaDeductible) > 0.5 ? 'ecart-val' : 'ok-val'}`}><strong>{fmt(ecartTvaDeductible)}</strong></td>
                  <td></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
        <div className="revision-od-actions">
          <button className="revision-od-add" onClick={addTvaDeductible}><LuPlus size={13} /> Ajouter une ligne TVA déductible</button>
        </div>
      </div>

      {/* ========== Contrôle 4 : Solde TVA ========== */}
      <div className="revision-control">
        <div className="revision-control-title">
          <span>Contrôle 4 — Solde de TVA (TVA collectée - TVA déductible)</span>
          {(tvaCollecteeLignes.length > 0 || tvaDeductibleLignes.length > 0) && (
            Math.abs(ecartTvaDue) < 0.5 && Math.abs(ecartCreditTva) < 0.5
              ? <span className="revision-badge ok">Conforme</span>
              : <span className="revision-badge ko">Écart détecté</span>
          )}
        </div>
        <div className="revision-ref">TVA due (4441) = TVA collectée - TVA déductible ; Crédit de TVA (4449) si solde négatif</div>

        <div style={{ marginTop: 8, padding: '10px 14px', background: '#f8f9fa', borderRadius: 6, fontSize: '12.5px' }}>
          <table className="revision-table revision-table-small" style={{ maxWidth: 550 }}>
            <thead>
              <tr>
                <th></th>
                <th className="num" style={{ width: 130 }}>Théorique</th>
                <th className="num" style={{ width: 130 }}>Balance</th>
                <th className="num" style={{ width: 110 }}>Écart</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>TVA collectée (déclarée)</td>
                <td className="num">{fmt(totalTvaDeclareeCollectee)}</td>
                <td className="num">{fmt(total4431Balance)}</td>
                <td className={`num ${Math.abs(totalTvaDeclareeCollectee - total4431Balance) > 0.5 ? 'ecart-val' : 'ok-val'}`}>{fmt(totalTvaDeclareeCollectee - total4431Balance)}</td>
              </tr>
              <tr>
                <td>TVA déductible (déclarée)</td>
                <td className="num">({fmt(totalTvaDeclareeDeductible)})</td>
                <td className="num">({fmt(total445Balance)})</td>
                <td className={`num ${Math.abs(totalTvaDeclareeDeductible - total445Balance) > 0.5 ? 'ecart-val' : 'ok-val'}`}>{fmt(totalTvaDeclareeDeductible - total445Balance)}</td>
              </tr>
              <tr style={{ borderTop: '2px solid #ccc' }}>
                <td><strong>= TVA due / (Crédit TVA)</strong></td>
                <td className="num"><strong>{fmt(tvaDueTheorique)}</strong></td>
                <td className="num"><strong>{tvaDueBalance > 0 ? fmt(tvaDueBalance) : creditTvaBalance > 0 ? `(${fmt(creditTvaBalance)})` : ''}</strong></td>
                <td></td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Rapprochement détaillé */}
        <div style={{ marginTop: 8, padding: '10px 14px', background: '#f0f4f8', borderRadius: 6, fontSize: '12.5px' }}>
          <strong>Rapprochement :</strong>
          <table className="revision-table revision-table-small" style={{ maxWidth: 500, marginTop: 6 }}>
            <tbody>
              {tvaDueTheorique >= 0 ? (
                <>
                  <tr><td>TVA due théorique</td><td className="num">{fmt(soldeTvaTheorique)}</td></tr>
                  <tr><td>TVA due balance (4441)</td><td className="num">{fmt(tvaDueBalance)}</td></tr>
                  <tr><td>Écart</td><td className={`num ${Math.abs(ecartTvaDue) > 0.5 ? 'ecart-val' : 'ok-val'}`}><strong>{fmt(ecartTvaDue)}</strong></td></tr>
                </>
              ) : (
                <>
                  <tr><td>Crédit TVA théorique</td><td className="num">{fmt(creditTvaTheorique)}</td></tr>
                  <tr><td>Crédit TVA balance (4449)</td><td className="num">{fmt(creditTvaBalance)}</td></tr>
                  <tr><td>Écart</td><td className={`num ${Math.abs(ecartCreditTva) > 0.5 ? 'ecart-val' : 'ok-val'}`}><strong>{fmt(ecartCreditTva)}</strong></td></tr>
                </>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ========== Contrôle 5 : Autres impôts et taxes ========== */}
      <div className="revision-control">
        <div className="revision-control-title">
          <span>Contrôle 5 — Autres impôts et taxes</span>
        </div>
        <div className="revision-ref">Comptes 44x résiduels + 64x (641 directs, 645 indirects, 646 droits d'enregistrement, 647 pénalités fiscales)</div>

        <div className="revision-table-wrapper" style={{ marginTop: 8 }}>
          <table className="revision-table">
            <thead>
              <tr>
                <th style={{ width: 80 }}>Compte</th>
                <th>Désignation</th>
                <th className="num" style={{ width: 130 }}>Balance</th>
                <th style={{ width: 180 }}>Justification</th>
                <th style={{ width: 160 }}>Observation</th>
                <th style={{ width: 30 }}></th>
              </tr>
            </thead>
            <tbody>
              {autresImpotsLignes.map(l => (
                <tr key={l.id}>
                  <td className="editable-cell"><input type="text" value={l.compte} onChange={e => updateAutresImpots(l.id, 'compte', e.target.value)} style={{ maxWidth: 'none', fontFamily: 'monospace' }} /></td>
                  <td className="editable-cell"><input type="text" value={l.designation} onChange={e => updateAutresImpots(l.id, 'designation', e.target.value)} style={{ maxWidth: 'none' }} /></td>
                  <td className="editable-cell"><input type="text" inputMode="numeric" value={fmtInput(l.balance)} onChange={e => updateAutresImpots(l.id, 'balance', parseInputValue(e.target.value))} style={{ maxWidth: 'none' }} /></td>
                  <td className="editable-cell"><input type="text" value={l.justification} onChange={e => updateAutresImpots(l.id, 'justification', e.target.value)} style={{ maxWidth: 'none', fontSize: '11px' }} placeholder="Avis d'imposition, déclaration..." /></td>
                  <td className="editable-cell"><input type="text" value={l.observation} onChange={e => updateAutresImpots(l.id, 'observation', e.target.value)} style={{ maxWidth: 'none', fontSize: '11px' }} placeholder="RAS / À régulariser..." /></td>
                  <td><button className="revision-od-delete" onClick={() => removeAutresImpots(l.id)} title="Supprimer"><LuTrash2 size={13} /></button></td>
                </tr>
              ))}
              {autresImpotsLignes.length === 0 && (
                <tr><td colSpan={6} style={{ textAlign: 'center', color: '#999', padding: 16, fontStyle: 'italic' }}>Aucun autre impôt ou taxe à analyser.</td></tr>
              )}
            </tbody>
            {autresImpotsLignes.length > 0 && (
              <tfoot>
                <tr>
                  <td colSpan={2}><strong>Total</strong></td>
                  <td className="num"><strong>{fmt(autresImpotsLignes.reduce((s, l) => s + l.balance, 0))}</strong></td>
                  <td colSpan={3}></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
        <div className="revision-od-actions">
          <button className="revision-od-add" onClick={addAutresImpots}><LuPlus size={13} /> Ajouter un impôt / taxe</button>
        </div>
      </div>

      {/* ========== Contrôle 6 : Bouclage dettes fiscales périodiques ========== */}
      <div className="revision-control">
        <div className="revision-control-title">
          <span>Contrôle 6 — Bouclage dettes fiscales périodiques</span>
          {dettesFiscalesLignes.length > 0 && (Math.abs(totalDettesEcart) < 0.5
            ? <span className="revision-badge ok">Conforme</span>
            : <span className="revision-badge ko">Écart détecté</span>
          )}
        </div>
        <div className="revision-ref">Comptes 4411 (acomptes IS), 4421 (cotisations patronales), 4441 (TVA due), 4471 (impôts retenus à la source) — Rapprochement déclarations fiscales / balance générale</div>

        <div className="revision-table-wrapper" style={{ marginTop: 8 }}>
          <table className="revision-table">
            <thead>
              <tr>
                <th style={{ width: 80 }}>Compte</th>
                <th>Description</th>
                <th className="num editable-col" style={{ width: 140 }}>Base d'imposition</th>
                <th className="num editable-col" style={{ width: 140 }}>Impôt déclaré</th>
                <th className="num" style={{ width: 140 }}>Balance générale</th>
                <th className="num" style={{ width: 110 }}>Écart</th>
                <th style={{ width: 30 }}></th>
              </tr>
            </thead>
            <tbody>
              {dettesFiscalesLignes.map(l => (
                <tr key={l.id} className={Math.abs(l.ecart) > 0.5 ? 'ecart-row' : ''}>
                  <td className="editable-cell"><input type="text" value={l.compte} onChange={e => updateDettesFiscales(l.id, 'compte', e.target.value)} style={{ maxWidth: 'none', fontFamily: 'monospace' }} /></td>
                  <td className="editable-cell"><input type="text" value={l.description} onChange={e => updateDettesFiscales(l.id, 'description', e.target.value)} style={{ maxWidth: 'none' }} /></td>
                  <td className="editable-cell"><input type="text" inputMode="numeric" value={fmtInput(l.baseImposition)} onChange={e => updateDettesFiscales(l.id, 'baseImposition', parseInputValue(e.target.value))} style={{ maxWidth: 'none' }} /></td>
                  <td className="editable-cell"><input type="text" inputMode="numeric" value={fmtInput(l.impotDeclare)} onChange={e => updateDettesFiscales(l.id, 'impotDeclare', parseInputValue(e.target.value))} style={{ maxWidth: 'none' }} /></td>
                  <td className="num computed">{fmt(l.balanceGenerale)}</td>
                  <td className={`num ${Math.abs(l.ecart) > 0.5 ? 'ecart-val' : 'ok-val'}`}>{fmt(l.ecart)}</td>
                  <td><button className="revision-od-delete" onClick={() => removeDettesFiscales(l.id)} title="Supprimer"><LuTrash2 size={13} /></button></td>
                </tr>
              ))}
              {dettesFiscalesLignes.length === 0 && (
                <tr><td colSpan={7} style={{ textAlign: 'center', color: '#999', padding: 16, fontStyle: 'italic' }}>Aucune dette fiscale périodique à analyser.</td></tr>
              )}
            </tbody>
            {dettesFiscalesLignes.length > 0 && (
              <tfoot>
                <tr>
                  <td colSpan={2}><strong>Total</strong></td>
                  <td className="num"><strong>{fmt(dettesFiscalesLignes.reduce((s, l) => s + l.baseImposition, 0))}</strong></td>
                  <td className="num"><strong>{fmt(totalDettesDeclare)}</strong></td>
                  <td className="num"><strong>{fmt(totalDettesBalance)}</strong></td>
                  <td className={`num ${Math.abs(totalDettesEcart) > 0.5 ? 'ecart-val' : 'ok-val'}`}><strong>{fmt(totalDettesEcart)}</strong></td>
                  <td></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>

        {Math.abs(totalDettesEcart) > 0.5 && (
          <div style={{ marginTop: 8, padding: '10px 14px', background: '#fff3cd', borderRadius: 6, fontSize: '12.5px', color: '#856404' }}>
            <strong>Alerte :</strong> Un écart de <strong>{fmt(totalDettesEcart)}</strong> existe entre les impôts déclarés et la balance générale. Vérifiez les déclarations fiscales et rapprochez avec les comptes concernés.
          </div>
        )}

        <div className="revision-od-actions">
          <button className="revision-od-add" onClick={addDettesFiscales}><LuPlus size={13} /> Ajouter une dette fiscale</button>
        </div>
      </div>

      {/* ========== Contrôle 7 : Redressements fiscaux ========== */}
      <div className="revision-control">
        <div className="revision-control-title">
          <span>Contrôle 7 — Redressements fiscaux</span>
        </div>
        <div className="revision-ref">Suivi des redressements fiscaux — Si accepté : D 6xx / C 4486 (charges à payer) ; Si contesté : D 6591 / C 19xx (provision pour risques)</div>

        <div className="revision-table-wrapper" style={{ marginTop: 8 }}>
          <table className="revision-table">
            <thead>
              <tr>
                <th style={{ width: 140 }}>Type contrôle</th>
                <th style={{ width: 110 }}>Date contrôle</th>
                <th style={{ width: 130 }}>Référence AMR</th>
                <th style={{ width: 80 }}>Payé ?</th>
                <th className="num editable-col" style={{ width: 140 }}>Charge à payer (4486x)</th>
                <th className="num editable-col" style={{ width: 140 }}>Provision contestation (19xx)</th>
                <th style={{ width: 30 }}></th>
              </tr>
            </thead>
            <tbody>
              {redressementLignes.map(l => (
                <tr key={l.id}>
                  <td className="editable-cell"><input type="text" value={l.typeControle} onChange={e => updateRedressement(l.id, 'typeControle', e.target.value)} style={{ maxWidth: 'none' }} placeholder="IS, TVA, Patente..." /></td>
                  <td className="editable-cell"><input type="date" value={l.dateControle} onChange={e => updateRedressement(l.id, 'dateControle', e.target.value)} style={{ maxWidth: 'none' }} /></td>
                  <td className="editable-cell"><input type="text" value={l.referenceAMR} onChange={e => updateRedressement(l.id, 'referenceAMR', e.target.value)} style={{ maxWidth: 'none', fontFamily: 'monospace' }} placeholder="N° AMR" /></td>
                  <td className="editable-cell">
                    <select value={l.paye} onChange={e => updateRedressement(l.id, 'paye', e.target.value)} style={{ width: '100%', border: '1px solid #ddd', borderRadius: 4, padding: '2px 4px', fontSize: '12px' }}>
                      <option value="">—</option>
                      <option value="Oui">Oui</option>
                      <option value="Non">Non</option>
                    </select>
                  </td>
                  <td className="editable-cell"><input type="text" inputMode="numeric" value={fmtInput(l.chargeAPayer4486)} onChange={e => updateRedressement(l.id, 'chargeAPayer4486', parseInputValue(e.target.value))} style={{ maxWidth: 'none' }} /></td>
                  <td className="editable-cell"><input type="text" inputMode="numeric" value={fmtInput(l.provisionContestation19)} onChange={e => updateRedressement(l.id, 'provisionContestation19', parseInputValue(e.target.value))} style={{ maxWidth: 'none' }} /></td>
                  <td><button className="revision-od-delete" onClick={() => removeRedressement(l.id)} title="Supprimer"><LuTrash2 size={13} /></button></td>
                </tr>
              ))}
              {redressementLignes.length === 0 && (
                <tr><td colSpan={7} style={{ textAlign: 'center', color: '#999', padding: 16, fontStyle: 'italic' }}>Aucun redressement fiscal à signaler.</td></tr>
              )}
            </tbody>
          </table>
        </div>

        {redressementLignes.length > 0 && (
          <div style={{ marginTop: 8, padding: '10px 14px', background: '#f0f4f8', borderRadius: 6, fontSize: '12.5px' }}>
            <strong>Écritures suggérées :</strong>
            <ul style={{ margin: '6px 0 0', paddingLeft: 18, lineHeight: 1.7 }}>
              <li>Si redressement <strong>accepté</strong> (payé = Oui) : <code>D 6xx (charge fiscale) / C 4486 (État, charges à payer)</code></li>
              <li>Si redressement <strong>contesté</strong> (payé = Non) : <code>D 6591 (dotation provisions litiges) / C 19xx (provisions pour risques)</code></li>
            </ul>
          </div>
        )}

        <div className="revision-od-actions">
          <button className="revision-od-add" onClick={addRedressement}><LuPlus size={13} /> Ajouter un redressement</button>
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

export default RevisionEtat;
