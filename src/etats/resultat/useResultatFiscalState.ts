// Hook partage entre la page Resultat Fiscal et la page Liquidation IS/IBA.
// Encapsule le chargement balance + lignes persistees, la sauvegarde, et le
// calcul. Les deux pages instancient leur propre copie : apres un save sur
// une page, un changement d'exercice dans l'autre rechargera les donnees.

import { useState, useEffect, useCallback } from 'react';
import { clientFetch } from '../../lib/api';
import { api } from '../../lib/apiEndpoints';
import { useExercicesQuery } from '../../hooks/useExercicesQuery';
import {
  TAUX_IS_NORMAL, TAUX_MIN_IS, TAUX_IBA, TAUX_MIN_IBA,
} from '../../constants/taxation';
import type { BalanceLigne, Offre, Exercice } from '../../types';
import {
  AcomptesIS,
  BalanceApiRow,
  LigneARD,
  LigneDeficit,
  LigneReintegration,
  ModeImpot,
  ResultatFiscalCalc,
  buildDefaultDeductions,
  buildDefaultDeficits,
  buildDefaultReintegrations,
  computeResultatFiscal,
  modeImpotParDefaut,
} from './resultatFiscalData';

let nextId = 1;

interface LigneApi {
  id: number;
  type: 'reintegration' | 'deduction' | 'deficit_reportable' | 'ard';
  libelle: string;
  montant: number;
  article: string;
  metadata?: Record<string, unknown>;
}

export interface UseResultatFiscalStateResult {
  exercices: Exercice[];
  selectedExercice: Exercice | null;
  setSelectedExercice: (e: Exercice | null) => void;
  annee: number;
  duree: number;
  lignesN: BalanceLigne[];
  balanceFound: boolean;
  loading: boolean;
  sourceUsed: string;
  balanceSource: 'ecritures' | 'import';

  regimeFiscal: 'is' | 'iba';
  setRegimeFiscal: (r: 'is' | 'iba') => void;
  tauxIS: number;
  setTauxIS: (t: number) => void;

  reintegrations: LigneReintegration[];
  setReintegrations: React.Dispatch<React.SetStateAction<LigneReintegration[]>>;
  addReintegration: (type?: { libelle: string; article: string }) => void;
  removeReintegration: (id: number) => void;
  updateReintegration: (id: number, field: 'libelle' | 'montant' | 'article', value: string | number) => void;

  deductions: LigneReintegration[];
  setDeductions: React.Dispatch<React.SetStateAction<LigneReintegration[]>>;
  addDeduction: (type?: { libelle: string; article: string }) => void;
  removeDeduction: (id: number) => void;
  updateDeduction: (id: number, field: 'libelle' | 'montant' | 'article', value: string | number) => void;

  deficits: LigneDeficit[];
  updateDeficit: (id: number, field: 'annee_origine' | 'montant_reportable' | 'montant_impute', value: number) => void;

  ard: LigneARD;
  updateArd: (field: 'solde_debut' | 'ard_exercice' | 'ard_utilises', value: number) => void;

  modeImpot: ModeImpot;
  setModeImpot: (m: ModeImpot) => void;
  acomptesIS: AcomptesIS;
  setAcompteAt: (idx: 0 | 1 | 2 | 3, value: number) => void;

  saveLignes: () => Promise<void>;
  saving: boolean;
  savedAt: Date | null;
  saveError: string | null;

  calc: ResultatFiscalCalc;
}

interface UseResultatFiscalStateOptions {
  entiteId: number;
  offre: Offre;
  typeActiviteRegimeDefault?: 'is' | 'iba';
}

async function loadBalanceFromEcritures(entId: number, exId: number): Promise<BalanceLigne[]> {
  const res = await clientFetch(api.ecritures.balance(entId, exId));
  if (!res.ok) return [];
  const data: BalanceApiRow[] = await res.json();
  return data.map((row): BalanceLigne => ({
    numero_compte: row.numero_compte,
    libelle_compte: row.libelle_compte,
    debit: parseFloat(String(row.debit)) || 0,
    credit: parseFloat(String(row.credit)) || 0,
    solde_debiteur: parseFloat(String(row.solde_debiteur)) || 0,
    solde_crediteur: parseFloat(String(row.solde_crediteur)) || 0,
    solde_debiteur_revise: row.solde_debiteur_revise != null ? parseFloat(String(row.solde_debiteur_revise)) : undefined,
    solde_crediteur_revise: row.solde_crediteur_revise != null ? parseFloat(String(row.solde_crediteur_revise)) : undefined,
  }));
}

export function useResultatFiscalState({
  entiteId, offre, typeActiviteRegimeDefault = 'is',
}: UseResultatFiscalStateOptions): UseResultatFiscalStateResult {
  const { exercices, selectedExercice, setSelectedExercice } = useExercicesQuery(entiteId);
  const [lignesN, setLignesN] = useState<BalanceLigne[]>([]);
  const [balanceFound, setBalanceFound] = useState(false);
  const [loading, setLoading] = useState(false);
  const [sourceUsed, setSourceUsed] = useState('');
  const balanceSource: 'ecritures' | 'import' = offre === 'comptabilite' ? 'ecritures' : 'import';

  const [regimeFiscal, setRegimeFiscal] = useState<'is' | 'iba'>(typeActiviteRegimeDefault);
  const [tauxIS, setTauxIS] = useState(TAUX_IS_NORMAL);
  const [reintegrations, setReintegrations] = useState<LigneReintegration[]>([]);
  const [deductions, setDeductions] = useState<LigneReintegration[]>([]);
  const [deficits, setDeficits] = useState<LigneDeficit[]>([]);
  const [ard, setArd] = useState<LigneARD>({ solde_debut: 0, ard_exercice: 0, ard_utilises: 0 });
  const [modeImpot, setModeImpot] = useState<ModeImpot>('minimum_perception');
  const [acomptesIS, setAcomptesIS] = useState<AcomptesIS>([0, 0, 0, 0]);
  const setAcompteAt = useCallback((idx: 0 | 1 | 2 | 3, value: number): void => {
    setAcomptesIS(prev => {
      const next: AcomptesIS = [prev[0], prev[1], prev[2], prev[3]];
      next[idx] = value;
      return next;
    });
  }, []);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  const loadBalance = useCallback(async (): Promise<void> => {
    if (!entiteId || !selectedExercice) return;
    setLoading(true);
    try {
      let result: BalanceLigne[] = [];
      let source = '';
      if (balanceSource === 'ecritures') {
        result = await loadBalanceFromEcritures(entiteId, selectedExercice.id);
        source = 'Ecritures comptables';
      } else {
        const res = await clientFetch(api.balance.byExercice(entiteId, selectedExercice.id, 'N'));
        const data = await res.json();
        result = data.lignes || [];
        source = 'Import balance';
      }
      setLignesN(result);
      setBalanceFound(result.length > 0);
      setSourceUsed(source);
    } catch {
      // silently ignored
    } finally {
      setLoading(false);
    }
  }, [entiteId, selectedExercice, balanceSource]);

  useEffect(() => { loadBalance(); }, [loadBalance]);

  useEffect(() => {
    if (!selectedExercice) {
      setReintegrations([]);
      setDeductions([]);
      setDeficits([]);
      setArd({ solde_debut: 0, ard_exercice: 0, ard_utilises: 0 });
      setModeImpot('minimum_perception');
      setAcomptesIS([0, 0, 0, 0]);
      setSavedAt(null);
      return;
    }
    setModeImpot(modeImpotParDefaut(selectedExercice.annee));
    setAcomptesIS([0, 0, 0, 0]);
    let cancelled = false;
    (async () => {
      try {
        const res = await clientFetch(api.resultatFiscal.lignes(selectedExercice.id));
        if (!res.ok || cancelled) return;
        const data: { lignes: LigneApi[] } = await res.json();
        const reints: LigneReintegration[] = [];
        const deds: LigneReintegration[] = [];
        const defs: LigneDeficit[] = [];
        const ardLoaded: LigneARD = { solde_debut: 0, ard_exercice: 0, ard_utilises: 0 };
        const acomptesLoaded: AcomptesIS = [0, 0, 0, 0];
        let maxId = 0;
        for (const l of data.lignes) {
          if (l.id > maxId) maxId = l.id;
          if (l.type === 'reintegration' || l.type === 'deduction') {
            const ligne: LigneReintegration = { id: l.id, libelle: l.libelle, montant: Number(l.montant) || 0, article: l.article };
            if (l.type === 'reintegration') reints.push(ligne); else deds.push(ligne);
          } else if (l.type === 'deficit_reportable') {
            const meta = l.metadata || {};
            defs.push({
              id: l.id,
              annee_origine: Number(meta['annee_origine']) || (selectedExercice.annee - 1),
              montant_reportable: Number(meta['montant_reportable']) || 0,
              montant_impute: Number(l.montant) || 0,
            });
          } else if (l.type === 'ard') {
            const meta = l.metadata || {};
            const sousType = meta['sous_type'] as string | undefined;
            if (sousType === 'solde_debut') ardLoaded.solde_debut = Number(l.montant) || 0;
            else if (sousType === 'exercice') ardLoaded.ard_exercice = Number(l.montant) || 0;
            else if (sousType === 'utilises') ardLoaded.ard_utilises = Number(l.montant) || 0;
            else if (sousType === 'mode_impot') {
              const mode = meta['mode'] as string | undefined;
              if (mode === 'minimum_perception' || mode === 'acompte_is') setModeImpot(mode);
            }
            else if (sousType === 'acompte_is') {
              const trim = Number(meta['trimestre']);
              if (trim >= 1 && trim <= 4) {
                acomptesLoaded[(trim - 1) as 0 | 1 | 2 | 3] = Number(l.montant) || 0;
              } else {
                // Retro-compat : ancienne ligne sans trimestre — on l'attribue a T1
                acomptesLoaded[0] = Number(l.montant) || 0;
              }
            }
          }
        }
        if (cancelled) return;
        setAcomptesIS(acomptesLoaded);
        nextId = Math.max(nextId, maxId + 1);
        if (reints.length === 0) {
          const built = buildDefaultReintegrations(nextId);
          nextId += built.length;
          setReintegrations(built);
        } else {
          setReintegrations(reints);
        }
        if (deds.length === 0) {
          const built = buildDefaultDeductions(nextId);
          nextId += built.length;
          setDeductions(built);
        } else {
          setDeductions(deds);
        }
        if (defs.length === 0) {
          const built = buildDefaultDeficits(nextId, selectedExercice.annee);
          nextId += built.length;
          setDeficits(built);
        } else {
          defs.sort((a, b) => a.annee_origine - b.annee_origine);
          setDeficits(defs);
        }
        setArd(ardLoaded);
        setSavedAt(null);
      } catch {
        // silently ignore
      }
    })();
    return () => { cancelled = true; };
  }, [selectedExercice]);

  const saveLignes = useCallback(async (): Promise<void> => {
    if (!selectedExercice) return;
    setSaving(true);
    setSaveError(null);
    try {
      const payload = {
        lignes: [
          ...reintegrations.map(r => ({ type: 'reintegration' as const, libelle: r.libelle, montant: r.montant, article: r.article })),
          ...deductions.map(d => ({ type: 'deduction' as const, libelle: d.libelle, montant: d.montant, article: d.article })),
          ...deficits.map(d => ({
            type: 'deficit_reportable' as const,
            libelle: 'Déficit ' + d.annee_origine,
            montant: d.montant_impute,
            article: 'Art. 15-bis',
            metadata: { annee_origine: d.annee_origine, montant_reportable: d.montant_reportable },
          })),
          { type: 'ard' as const, libelle: 'ARD solde début', montant: ard.solde_debut, article: '', metadata: { sous_type: 'solde_debut' } },
          { type: 'ard' as const, libelle: 'ARD exercice', montant: ard.ard_exercice, article: '', metadata: { sous_type: 'exercice' } },
          { type: 'ard' as const, libelle: 'ARD utilisés', montant: ard.ard_utilises, article: '', metadata: { sous_type: 'utilises' } },
          { type: 'ard' as const, libelle: 'Mode impôt', montant: 0, article: '', metadata: { sous_type: 'mode_impot', mode: modeImpot } },
          ...acomptesIS.map((m, i) => ({
            type: 'ard' as const,
            libelle: `Acompte IS T${i + 1}`,
            montant: m,
            article: '',
            metadata: { sous_type: 'acompte_is', trimestre: i + 1 },
          })),
        ],
      };
      const res = await clientFetch(api.resultatFiscal.lignes(selectedExercice.id), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Erreur sauvegarde');
      }
      const data: { lignes: LigneApi[] } = await res.json();
      const reints: LigneReintegration[] = [];
      const deds: LigneReintegration[] = [];
      const defs: LigneDeficit[] = [];
      const ardSaved: LigneARD = { solde_debut: 0, ard_exercice: 0, ard_utilises: 0 };
      const acomptesSaved: AcomptesIS = [0, 0, 0, 0];
      let maxId = 0;
      for (const l of data.lignes) {
        if (l.id > maxId) maxId = l.id;
        if (l.type === 'reintegration' || l.type === 'deduction') {
          const ligne: LigneReintegration = { id: l.id, libelle: l.libelle, montant: Number(l.montant) || 0, article: l.article };
          if (l.type === 'reintegration') reints.push(ligne); else deds.push(ligne);
        } else if (l.type === 'deficit_reportable') {
          const meta = l.metadata || {};
          defs.push({
            id: l.id,
            annee_origine: Number(meta['annee_origine']) || (selectedExercice.annee - 1),
            montant_reportable: Number(meta['montant_reportable']) || 0,
            montant_impute: Number(l.montant) || 0,
          });
        } else if (l.type === 'ard') {
          const meta = l.metadata || {};
          const sousType = meta['sous_type'] as string | undefined;
          if (sousType === 'solde_debut') ardSaved.solde_debut = Number(l.montant) || 0;
          else if (sousType === 'exercice') ardSaved.ard_exercice = Number(l.montant) || 0;
          else if (sousType === 'utilises') ardSaved.ard_utilises = Number(l.montant) || 0;
          else if (sousType === 'mode_impot') {
            const mode = meta['mode'] as string | undefined;
            if (mode === 'minimum_perception' || mode === 'acompte_is') setModeImpot(mode);
          }
          else if (sousType === 'acompte_is') {
            const trim = Number(meta['trimestre']);
            if (trim >= 1 && trim <= 4) {
              acomptesSaved[(trim - 1) as 0 | 1 | 2 | 3] = Number(l.montant) || 0;
            } else {
              acomptesSaved[0] = Number(l.montant) || 0;
            }
          }
        }
      }
      nextId = Math.max(nextId, maxId + 1);
      defs.sort((a, b) => a.annee_origine - b.annee_origine);
      setReintegrations(reints);
      setDeductions(deds);
      setDeficits(defs);
      setArd(ardSaved);
      setAcomptesIS(acomptesSaved);
      setSavedAt(new Date());
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Erreur sauvegarde');
    } finally {
      setSaving(false);
    }
  }, [selectedExercice, reintegrations, deductions, deficits, ard, modeImpot, acomptesIS]);

  const updateDeficit = useCallback((id: number, field: 'annee_origine' | 'montant_reportable' | 'montant_impute', value: number): void => {
    setDeficits(prev => prev.map(d => d.id === id ? { ...d, [field]: value } : d));
  }, []);
  const updateArd = useCallback((field: 'solde_debut' | 'ard_exercice' | 'ard_utilises', value: number): void => {
    setArd(prev => ({ ...prev, [field]: value }));
  }, []);

  const addReintegration = useCallback((type?: { libelle: string; article: string }): void => {
    setReintegrations(prev => [...prev, { id: nextId++, libelle: type?.libelle || '', montant: 0, article: type?.article || '' }]);
  }, []);
  const removeReintegration = useCallback((id: number): void => {
    setReintegrations(prev => prev.filter(r => r.id !== id));
  }, []);
  const updateReintegration = useCallback((id: number, field: 'libelle' | 'montant' | 'article', value: string | number): void => {
    setReintegrations(prev => prev.map(r => r.id === id ? { ...r, [field]: value } : r));
  }, []);
  const addDeduction = useCallback((type?: { libelle: string; article: string }): void => {
    setDeductions(prev => [...prev, { id: nextId++, libelle: type?.libelle || '', montant: 0, article: type?.article || '' }]);
  }, []);
  const removeDeduction = useCallback((id: number): void => {
    setDeductions(prev => prev.filter(d => d.id !== id));
  }, []);
  const updateDeduction = useCallback((id: number, field: 'libelle' | 'montant' | 'article', value: string | number): void => {
    setDeductions(prev => prev.map(d => d.id === id ? { ...d, [field]: value } : d));
  }, []);

  const calc = computeResultatFiscal(
    lignesN, reintegrations, deductions, deficits, ard,
    regimeFiscal, tauxIS, TAUX_IBA, TAUX_MIN_IS, TAUX_MIN_IBA,
    modeImpot, acomptesIS,
  );
  const annee = selectedExercice ? selectedExercice.annee : new Date().getFullYear();
  const duree = selectedExercice?.duree_mois || 12;

  return {
    exercices, selectedExercice, setSelectedExercice, annee, duree,
    lignesN, balanceFound, loading, sourceUsed, balanceSource,
    regimeFiscal, setRegimeFiscal, tauxIS, setTauxIS,
    reintegrations, setReintegrations, addReintegration, removeReintegration, updateReintegration,
    deductions, setDeductions, addDeduction, removeDeduction, updateDeduction,
    deficits, updateDeficit,
    ard, updateArd,
    modeImpot, setModeImpot, acomptesIS, setAcompteAt,
    saveLignes, saving, savedAt, saveError,
    calc,
  };
}
