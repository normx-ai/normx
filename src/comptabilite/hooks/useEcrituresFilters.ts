import { useState, useEffect, useMemo } from 'react';
import { type StatutTab } from '../SaisieJournal.types';
import { MOIS } from '../../utils/formatters';

export interface UseEcrituresFiltersResult {
  filterJournal: string;
  setFilterJournal: (v: string) => void;
  filterStatut: string;
  setFilterStatut: (v: string) => void;
  filterMois: string;
  setFilterMois: (v: string) => void;
  filterDateDu: string;
  setFilterDateDu: (v: string) => void;
  filterDateAu: string;
  setFilterDateAu: (v: string) => void;
  searchTerm: string;
  setSearchTerm: (v: string) => void;
  activeTab: StatutTab;
  setActiveTab: (t: StatutTab) => void;
  ecrituresFilters: Record<string, string>;
  hasActiveFilters: boolean;
  resetAllFilters: () => void;
}

export function useEcrituresFilters(exerciceAnnee: number): UseEcrituresFiltersResult {
  const [filterJournal, setFilterJournal] = useState<string>('');
  const [filterStatut, setFilterStatut] = useState<string>('');
  const [filterMois, setFilterMois] = useState<string>('');
  const [filterDateDu, setFilterDateDu] = useState<string>('');
  const [filterDateAu, setFilterDateAu] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [activeTab, setActiveTabState] = useState<StatutTab>('all');

  const setActiveTab = (t: StatutTab): void => {
    setActiveTabState(t);
    setFilterStatut(t === 'all' ? '' : t);
  };

  // Mois → plage de dates
  useEffect(() => {
    if (filterMois) {
      const moisIdx = MOIS.indexOf(filterMois);
      if (moisIdx >= 0) {
        const year = exerciceAnnee || new Date().getFullYear();
        const m = String(moisIdx + 1).padStart(2, '0');
        setFilterDateDu(year + '-' + m + '-01');
        const lastDay = new Date(year, moisIdx + 1, 0).getDate();
        setFilterDateAu(year + '-' + m + '-' + lastDay);
      }
    } else {
      setFilterDateDu('');
      setFilterDateAu('');
    }
  }, [filterMois, exerciceAnnee]);

  const ecrituresFilters = useMemo<Record<string, string>>(() => {
    const f: Record<string, string> = {};
    if (filterJournal) f.journal = filterJournal;
    if (filterStatut) f.statut = filterStatut;
    if (filterDateDu) f.date_du = filterDateDu;
    if (filterDateAu) f.date_au = filterDateAu;
    if (searchTerm) f.search = searchTerm;
    return f;
  }, [filterJournal, filterStatut, filterDateDu, filterDateAu, searchTerm]);

  const hasActiveFilters = !!(
    filterJournal || filterStatut || filterMois || filterDateDu || filterDateAu || searchTerm || activeTab !== 'all'
  );

  const resetAllFilters = (): void => {
    setFilterJournal('');
    setFilterStatut('');
    setFilterMois('');
    setFilterDateDu('');
    setFilterDateAu('');
    setSearchTerm('');
    setActiveTabState('all');
  };

  return {
    filterJournal, setFilterJournal,
    filterStatut, setFilterStatut,
    filterMois, setFilterMois,
    filterDateDu, setFilterDateDu,
    filterDateAu, setFilterDateAu,
    searchTerm, setSearchTerm,
    activeTab, setActiveTab,
    ecrituresFilters,
    hasActiveFilters,
    resetAllFilters,
  };
}
