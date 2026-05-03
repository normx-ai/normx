import { useCallback, useEffect, useState } from 'react';

const KEY = 'normx-favoris-compta';

const safeRead = (): string[] => {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr.filter((x: unknown): x is string => typeof x === 'string') : [];
  } catch {
    return [];
  }
};

const safeWrite = (ids: string[]): void => {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(ids));
  } catch {
    /* quota / private mode : on ignore silencieusement, l'UI reste fonctionnelle */
  }
};

export interface UseFavoritesResult {
  favorites: string[];
  has: (id: string) => boolean;
  add: (id: string) => void;
  remove: (id: string) => void;
  toggle: (id: string) => void;
  clear: () => void;
}

// Stockage localStorage (MVP). Migration vers backend possible plus tard
// en remplacant safeRead/safeWrite par un appel API + React Query.
export function useFavorites(): UseFavoritesResult {
  const [favorites, setFavorites] = useState<string[]>(() => safeRead());

  // Sync inter-onglets : si l'utilisateur ajoute un favori dans un autre
  // onglet, l'onglet courant se met a jour.
  useEffect(() => {
    const handler = (e: StorageEvent): void => {
      if (e.key === KEY) setFavorites(safeRead());
    };
    window.addEventListener('storage', handler);
    return () => window.removeEventListener('storage', handler);
  }, []);

  const persist = useCallback((next: string[]) => {
    setFavorites(next);
    safeWrite(next);
  }, []);

  const has = useCallback((id: string) => favorites.includes(id), [favorites]);

  const add = useCallback((id: string) => {
    if (favorites.includes(id)) return;
    persist([...favorites, id]);
  }, [favorites, persist]);

  const remove = useCallback((id: string) => {
    if (!favorites.includes(id)) return;
    persist(favorites.filter(f => f !== id));
  }, [favorites, persist]);

  const toggle = useCallback((id: string) => {
    if (favorites.includes(id)) persist(favorites.filter(f => f !== id));
    else persist([...favorites, id]);
  }, [favorites, persist]);

  const clear = useCallback(() => persist([]), [persist]);

  return { favorites, has, add, remove, toggle, clear };
}
