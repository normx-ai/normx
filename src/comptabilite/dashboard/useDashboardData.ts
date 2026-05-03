import { useQuery } from '@tanstack/react-query';
import { clientFetch } from '../../lib/api';
import { api } from '../../lib/apiEndpoints';
import type { TableauBordData, BalanceTiersRow, DashboardEcritureRow } from './types';

interface ListResponse<T> { data?: T[]; rows?: T[] }

const extractList = <T,>(json: T[] | ListResponse<T>): T[] => {
  if (Array.isArray(json)) return json;
  if (Array.isArray(json.data)) return json.data;
  if (Array.isArray(json.rows)) return json.rows;
  return [];
};

export interface UseDashboardDataResult {
  tableauBord: TableauBordData | undefined;
  tbLoading: boolean;
  clientsTiers: BalanceTiersRow[];
  ecrituresRecentes: DashboardEcritureRow[];
}

export function useDashboardData(entiteId: number, exerciceId: number | null): UseDashboardDataResult {
  const enabled = !!entiteId && !!exerciceId;

  const { data: tableauBord, isLoading: tbLoading } = useQuery<TableauBordData>({
    queryKey: ['compta-dashboard-tb', entiteId, exerciceId],
    queryFn: async () => {
      const r = await clientFetch(api.ecritures.rapports.tableauBord(entiteId, exerciceId as number));
      if (!r.ok) throw new Error('Erreur tableau de bord');
      return r.json();
    },
    enabled,
    staleTime: 60_000,
  });

  const { data: clientsTiers = [] } = useQuery<BalanceTiersRow[]>({
    queryKey: ['compta-dashboard-clients', entiteId, exerciceId],
    queryFn: async () => {
      const r = await clientFetch(api.ecritures.balanceTiers(entiteId, exerciceId as number, { type_tiers: 'client' }));
      if (!r.ok) throw new Error('Erreur tiers clients');
      return extractList<BalanceTiersRow>(await r.json());
    },
    enabled,
    staleTime: 60_000,
  });

  const { data: ecrituresRecentes = [] } = useQuery<DashboardEcritureRow[]>({
    queryKey: ['compta-dashboard-ecritures', entiteId, exerciceId],
    queryFn: async () => {
      const r = await clientFetch(api.ecritures.list(entiteId, exerciceId as number, { limit: 5 }));
      if (!r.ok) throw new Error('Erreur ecritures');
      return extractList<DashboardEcritureRow>(await r.json());
    },
    enabled,
    staleTime: 30_000,
  });

  return { tableauBord, tbLoading, clientsTiers, ecrituresRecentes };
}
