/**
 * Hook React Query pour charger la balance N et N-1 d'une entite.
 *
 * Centralise le pattern duplique dans 30+ notes annexes :
 * - selon offre 'comptabilite' -> /api/ecritures/balance/:entiteId/:exerciceId
 * - selon offre 'etats'        -> /api/balance/:entiteId/:exerciceId/(N|N-1)
 * - N-1 : si l'exercice precedent existe en BD on prend son 'N',
 *   sinon on prend la colonne 'N-1' de l'exercice courant
 *
 * Avantage : cache partage par cle ['balance-lignes', ...]. Quand 47
 * notes demandent la meme balance dans la liasse complete, une seule
 * requete reseau part. queryClient.isFetching() reflete fidelement
 * l'etat de chargement.
 */

import { useQuery } from '@tanstack/react-query';
import { clientFetch } from '../lib/api';
import { api } from '../lib/apiEndpoints';
import type { BalanceLigne, Exercice, Offre } from '../types';

interface UseBalanceLignesOptions {
  entiteId: number;
  selectedExercice: Exercice | null;
  exercices: Exercice[];
  offre?: Offre;
}

interface UseBalanceLignesResult {
  lignesN: BalanceLigne[];
  lignesN1: BalanceLigne[];
  isLoading: boolean;
}

interface BalanceResponse {
  lignes?: BalanceLigne[];
}

async function fetchBalance(url: string): Promise<BalanceLigne[]> {
  const res = await clientFetch(url);
  if (!res.ok) return [];
  const data = (await res.json()) as BalanceResponse;
  return data.lignes ?? [];
}

export function useBalanceLignes({
  entiteId,
  selectedExercice,
  exercices,
  offre = 'comptabilite',
}: UseBalanceLignesOptions): UseBalanceLignesResult {
  const source: 'ecritures' | 'import' = offre === 'comptabilite' ? 'ecritures' : 'import';
  const exN1 = selectedExercice
    ? exercices.find(e => e.annee === selectedExercice.annee - 1) ?? null
    : null;

  const enabled = entiteId > 0 && selectedExercice !== null;

  // Balance N
  const urlN = selectedExercice
    ? source === 'ecritures'
      ? api.ecritures.balance(entiteId, selectedExercice.id)
      : api.balance.byExercice(entiteId, selectedExercice.id, 'N')
    : '';

  const queryN = useQuery<BalanceLigne[]>({
    queryKey: ['balance-lignes', entiteId, selectedExercice?.id ?? null, source, 'N'],
    queryFn: () => fetchBalance(urlN),
    enabled: enabled && !!urlN,
    staleTime: 60 * 1000,
    gcTime: 5 * 60 * 1000,
  });

  // Balance N-1 : exercice precedent si existe, sinon colonne N-1 de l'exercice courant
  const urlN1 = !selectedExercice
    ? ''
    : exN1
      ? source === 'ecritures'
        ? api.ecritures.balance(entiteId, exN1.id)
        : api.balance.byExercice(entiteId, exN1.id, 'N')
      : api.balance.byExercice(entiteId, selectedExercice.id, 'N-1');

  const queryN1 = useQuery<BalanceLigne[]>({
    queryKey: ['balance-lignes', entiteId, exN1?.id ?? selectedExercice?.id ?? null, exN1 ? source : 'import', exN1 ? 'N' : 'N-1'],
    queryFn: () => fetchBalance(urlN1),
    enabled: enabled && !!urlN1,
    staleTime: 60 * 1000,
    gcTime: 5 * 60 * 1000,
  });

  return {
    lignesN: queryN.data ?? [],
    lignesN1: queryN1.data ?? [],
    isLoading: queryN.isLoading || queryN1.isLoading,
  };
}
