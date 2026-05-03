import { useQuery } from '@tanstack/react-query';
import { clientFetch } from '../lib/api';
import { api } from '../lib/apiEndpoints';
import type { MenuItem, MenuBadge } from './types';

interface PaginatedTotal { pagination?: { total?: number } }

// Compteur d'ecritures filtrees, lit pagination.total (limit=1 pour ne
// pas charger toutes les lignes juste pour un badge).
function useEcrituresCount(entiteId: number, exerciceId: number | null, filters: Record<string, string>) {
  return useQuery<number>({
    queryKey: ['ecritures-count', entiteId, exerciceId, filters],
    queryFn: async () => {
      if (!exerciceId) return 0;
      const url = api.ecritures.list(entiteId, exerciceId, { ...filters, limit: '1' });
      const r = await clientFetch(url);
      if (!r.ok) throw new Error('Erreur comptage ecritures');
      const json: PaginatedTotal = await r.json();
      return json.pagination?.total ?? 0;
    },
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
    enabled: entiteId > 0 && !!exerciceId,
  });
}

// Hook public : retourne tous les compteurs/badges utilises dans la sidebar.
// L'ajout d'un nouveau badge se fait ici (un compteur React Query + son
// build de MenuBadge), puis dans attachBadges() pour rattacher a l'item.
export interface SidebarBadges {
  saisie?: MenuBadge;
}

export function useSidebarBadges(entiteId: number, exerciceId: number | null): SidebarBadges {
  const { data: brouillardCount = 0 } = useEcrituresCount(entiteId, exerciceId, { statut: 'brouillard' });

  const saisie: MenuBadge | undefined = brouillardCount > 0
    ? {
        text: String(brouillardCount),
        variant: brouillardCount >= 10 ? 'warning' : 'info',
        title: `${brouillardCount} écriture${brouillardCount > 1 ? 's' : ''} en brouillard`,
      }
    : undefined;

  return { saisie };
}

// Injecte les badges dans les bons items (par id) sans muter l'array original.
export function attachBadges(items: MenuItem[], badges: SidebarBadges): MenuItem[] {
  return items.map(item => {
    if (item.id === 'saisie' && badges.saisie) return { ...item, badge: badges.saisie };
    return item;
  });
}
