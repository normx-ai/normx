import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { CompteComptable } from '../../types';
import type { EcritureAPI, TiersItem } from '../SaisieJournal.types';
import { useReferentiel } from '../../contexts/ReferentielContext';
import { usePlanComptable } from '../../lib/queries';
import { clientFetch } from '../../lib/api';
import { api } from '../../lib/apiEndpoints';
import { useFetchEntity } from '../../hooks/useFetchEntity';

export interface UseEcrituresDataResult {
  ecritures: EcritureAPI[];
  planComptable: CompteComptable[];
  tiersList: TiersItem[];
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

  const invalidate = (): void => {
    queryClient.invalidateQueries({ queryKey: ['ecritures', entiteId, exerciceId] });
  };

  return { ecritures, planComptable, tiersList, invalidate };
}
