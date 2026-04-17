/**
 * Hook partage pour le chargement des exercices d'une entite.
 * Utilise par les notes annexes (via useNoteData), les etats financiers
 * (BilanSYSCOHADA, CR, TFT, etc.) et les pages de consultation compta.
 *
 * Fonctionnement :
 * - Charge les exercices via /api/balance/exercices/:entiteId
 * - Auto-selectionne l'exercice le plus pertinent (annee courante ou N-1)
 * - Cache React Query : 2 min staleTime, partage entre tous les composants
 *   qui utilisent la meme entiteId
 */

import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { clientFetch } from '../lib/api';
import type { Exercice } from '../types';

function pickDefaultExercice(data: Exercice[]): Exercice | null {
  if (data.length === 0) return null;
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const preferYear = month <= 2 ? year - 1 : year;
  return data.find(e => e.annee === preferYear)
    || data.find(e => e.annee === year)
    || data.find(e => e.annee === year - 1)
    || data[0];
}

interface UseExercicesQueryResult {
  exercices: Exercice[];
  isLoading: boolean;
  selectedExercice: Exercice | null;
  setSelectedExercice: (e: Exercice | null) => void;
  annee: number;
  dateFin: string;
  duree: number;
}

export function useExercicesQuery(entiteId: number): UseExercicesQueryResult {
  const [selectedExercice, setSelectedExercice] = useState<Exercice | null>(null);

  const { data: exercicesData, isLoading } = useQuery({
    queryKey: ['exercices', entiteId],
    queryFn: async (): Promise<Exercice[]> => {
      const r = await clientFetch('/api/balance/exercices/' + entiteId);
      if (!r.ok) throw new Error('Erreur chargement exercices');
      return r.json();
    },
    staleTime: 2 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    enabled: entiteId > 0,
  });

  const exercices: Exercice[] = exercicesData ?? [];

  useEffect(() => {
    if (!selectedExercice && exercices.length > 0) {
      setSelectedExercice(pickDefaultExercice(exercices));
    }
  }, [exercices, selectedExercice]);

  const annee = selectedExercice ? selectedExercice.annee : new Date().getFullYear();
  const dateFin = selectedExercice?.date_fin || '';
  const duree = selectedExercice?.duree_mois || 12;

  return { exercices, isLoading, selectedExercice, setSelectedExercice, annee, dateFin, duree };
}
