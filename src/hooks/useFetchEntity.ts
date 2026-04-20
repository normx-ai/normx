/**
 * useFetchEntity<T> — hook React Query generique pour les listes du domaine.
 *
 * Factorise le pattern repete dans ~50 composants :
 *   - appel clientFetch
 *   - test res.ok
 *   - json + normalisation (Array | { data } | { <key> })
 *   - setLoading, try/catch silencieux
 *
 * Les listes backend renvoient parfois un tableau nu (`[...]`), parfois un
 * objet enveloppe (`{ data: [...] }` pour les reponses paginated, ou
 * `{ tiers: [...] }`, `{ ecritures: [...] }` selon l'endpoint). Le helper
 * `normalizeList` unifie ces formes en un seul tableau.
 */

import { useQuery, UseQueryResult } from '@tanstack/react-query';
import { clientFetch } from '../lib/api';

export function normalizeList<T>(raw: unknown, fallbackKeys: string[] = []): T[] {
  if (Array.isArray(raw)) return raw as T[];
  if (raw && typeof raw === 'object') {
    const obj = raw as Record<string, unknown>;
    if (Array.isArray(obj.data)) return obj.data as T[];
    for (const k of fallbackKeys) {
      if (Array.isArray(obj[k])) return obj[k] as T[];
    }
  }
  return [];
}

export interface UseFetchEntityOptions {
  enabled?: boolean;
  // Cles possibles du tableau dans la reponse non-paginee (`tiers`, `ecritures`, etc.)
  fallbackKeys?: string[];
  // staleTime / gcTime : laisser le hook decider par defaut (2 min / 30 min)
  staleTime?: number;
  gcTime?: number;
}

export function useFetchEntity<T>(
  queryKey: readonly unknown[],
  url: string,
  options: UseFetchEntityOptions = {},
): UseQueryResult<T[]> {
  const { enabled = true, fallbackKeys = [], staleTime = 2 * 60 * 1000, gcTime = 30 * 60 * 1000 } = options;
  return useQuery<T[]>({
    queryKey,
    queryFn: async () => {
      const r = await clientFetch(url);
      if (!r.ok) throw new Error('Erreur chargement: ' + url);
      return normalizeList<T>(await r.json(), fallbackKeys);
    },
    enabled,
    staleTime,
    gcTime,
  });
}
