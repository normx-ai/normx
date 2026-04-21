/**
 * useNoteHasData : charge la balance de l'exercice et les parametres de l'entite,
 * puis expose une fonction `noteHasData(noteId)` qui indique si une note annexe
 * SYSCOHADA doit etre affichee (presence de comptes concernes ou saisie manuelle).
 */

import { useState, useEffect, useCallback } from 'react';
import { clientFetch } from '../lib/api';
import { api } from '../lib/apiEndpoints';
import type { Offre } from '../types';
import {
  NOTE_ACCOUNT_MAP,
  ALWAYS_VISIBLE_NOTES,
  MANUAL_NOTE_PARAMS,
} from './notesConfig';

interface BalanceLigne {
  numero_compte: string;
  solde_debiteur: number;
  solde_crediteur: number;
}

interface UseNoteHasDataResult {
  balanceLignes: BalanceLigne[];
  entiteParams: Record<string, string>;
  noteHasData: (noteId: string) => boolean;
}

export function useNoteHasData(entiteId: number, exerciceId: number | null, offre: Offre): UseNoteHasDataResult {
  const [balanceLignes, setBalanceLignes] = useState<BalanceLigne[]>([]);
  const [entiteParams, setEntiteParams] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!entiteId || !exerciceId) return;
    const balSrc = offre === 'comptabilite' ? 'ecritures' : 'import';
    const url = balSrc === 'ecritures'
      ? api.ecritures.balance(entiteId, exerciceId)
      : api.balance.byExercice(entiteId, exerciceId, 'N');
    clientFetch(url)
      .then(r => r.json())
      .then(data => setBalanceLignes(data.lignes || []))
      .catch(() => setBalanceLignes([]));
  }, [entiteId, exerciceId, offre]);

  useEffect(() => {
    if (!entiteId) return;
    clientFetch(api.entites.byId(entiteId))
      .then(r => r.json())
      .then(ent => setEntiteParams(ent.data || {}))
      .catch(() => setEntiteParams({}));
  }, [entiteId]);

  const noteHasData = useCallback((noteId: string): boolean => {
    if (ALWAYS_VISIBLE_NOTES.includes(noteId)) return true;

    const prefixes = NOTE_ACCOUNT_MAP[noteId];

    // Notes manuelles : verifier si des donnees ont ete saisies
    if (!prefixes || prefixes.length === 0) {
      const paramKey = MANUAL_NOTE_PARAMS[noteId];
      if (paramKey) {
        const val = entiteParams[paramKey];
        if (!val) return false;
        try {
          const parsed = JSON.parse(val);
          return Object.keys(parsed).length > 0;
        } catch { return false; }
      }
      return false;
    }

    // Notes avec prefixes : verifier la balance
    return balanceLignes.some(l => {
      const num = (l.numero_compte || '').trim();
      return prefixes.some(p => num.startsWith(p))
        && ((parseFloat(String(l.solde_debiteur)) || 0) !== 0 || (parseFloat(String(l.solde_crediteur)) || 0) !== 0);
    });
  }, [balanceLignes, entiteParams]);

  return { balanceLignes, entiteParams, noteHasData };
}
