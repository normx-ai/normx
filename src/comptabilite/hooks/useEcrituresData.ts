import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { CompteComptable } from '../../types';
import type { EcritureAPI, StatsData, TiersItem } from '../SaisieJournal.types';
import { useReferentiel } from '../../contexts/ReferentielContext';
import { usePlanComptable } from '../../lib/queries';
import { clientFetch } from '../../lib/api';
import { api } from '../../lib/apiEndpoints';
import { useFetchEntity } from '../../hooks/useFetchEntity';

export interface UseEcrituresDataResult {
  ecritures: EcritureAPI[];
  planComptable: CompteComptable[];
  tiersList: TiersItem[];
  stats: StatsData | null;
  invalidate: () => void;
}

export function useEcrituresData(
  entiteId: number,
  exerciceId: number,
  ecrituresFilters: Record<string, string>,
): UseEcrituresDataResult {
  const { referentiel } = useReferentiel();
  const queryClient = useQueryClient();

  const { data: ecritures = [] } = useQuery<EcritureAPI[]>({
    queryKey: ['ecritures', entiteId, exerciceId, ecrituresFilters],
    queryFn: async () => {
      const res = await clientFetch(api.ecritures.list(entiteId, exerciceId, ecrituresFilters));
      if (!res.ok) throw new Error('Erreur chargement ecritures');
      const data = await res.json();
      return Array.isArray(data) ? data : data.ecritures || [];
    },
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
    enabled: entiteId > 0 && exerciceId > 0,
  });

  const { data: planComptableRaw = [] } = usePlanComptable(referentiel);
  const planComptable = planComptableRaw as CompteComptable[];

  const { data: tiersList = [] } = useFetchEntity<TiersItem>(
    ['tiers', entiteId],
    api.tiers.byEntite(entiteId),
    {
      enabled: entiteId > 0,
      fallbackKeys: ['tiers'],
      staleTime: 5 * 60 * 1000,
    },
  );

  const { data: stats = null } = useQuery<StatsData | null>({
    queryKey: ['ecritures-stats', entiteId, exerciceId],
    queryFn: async () => {
      const res = await clientFetch(api.ecritures.stats(entiteId, exerciceId));
      if (!res.ok) throw new Error('Erreur chargement stats');
      return res.json();
    },
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
    enabled: entiteId > 0 && exerciceId > 0,
  });

  const invalidate = (): void => {
    queryClient.invalidateQueries({ queryKey: ['ecritures', entiteId, exerciceId] });
    queryClient.invalidateQueries({ queryKey: ['ecritures-stats', entiteId, exerciceId] });
  };

  return { ecritures, planComptable, tiersList, stats, invalidate };
}
