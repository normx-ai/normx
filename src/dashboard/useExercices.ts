import { useState, useEffect, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { clientFetch } from '../lib/api';
import { api } from '../lib/apiEndpoints';
import { Exercice } from '../types';

interface ExerciceModalState {
  show: boolean;
  dateDebut: string;
  dateFin: string;
  error: string;
}

interface ConfirmModalState {
  open: boolean;
  title: string;
  message: string;
  variant: 'danger' | 'archive' | 'warning';
  confirmLabel?: string;
  onConfirm: () => void;
}

export interface UseExercicesReturn {
  exerciceId: number | null;
  setExerciceId: (id: number | null) => void;
  exercices: Exercice[];
  exerciceLoading: boolean;
  currentExStatut: string;
  // Exercice modal
  showExerciceModal: boolean;
  newExDateDebut: string;
  newExDateFin: string;
  exerciceError: string;
  dureeMois: number;
  setNewExDateDebut: (v: string) => void;
  setNewExDateFin: (v: string) => void;
  openExerciceModal: () => void;
  closeExerciceModal: () => void;
  createExercice: () => Promise<void>;
  // Confirm modal
  confirmModal: ConfirmModalState;
  closeConfirmModal: () => void;
  cloturerExercice: (exId: number) => void;
  rouvrirExercice: (exId: number) => void;
}

export function useExercices(entiteId: number): UseExercicesReturn {
  const queryClient = useQueryClient();
  const [exerciceId, setExerciceIdLocal] = useState<number | null>(null);
  const [exerciceLoading, setExerciceLoading] = useState<boolean>(false);

  // Exercice modal state
  const [modal, setModal] = useState<ExerciceModalState>({
    show: false,
    dateDebut: `${new Date().getFullYear()}-01-01`,
    dateFin: `${new Date().getFullYear()}-12-31`,
    error: '',
  });

  // Confirm modal state
  const [confirmModal, setConfirmModal] = useState<ConfirmModalState>({
    open: false, title: '', message: '', variant: 'danger', onConfirm: () => {},
  });

  // Liste exercices via React Query (meme cache que useExercicesQuery)
  const { data: exercicesData = [] } = useQuery({
    queryKey: ['exercices', entiteId],
    queryFn: async (): Promise<Exercice[]> => {
      const r = await clientFetch(api.balance.exercicesByEntite(entiteId));
      if (!r.ok) throw new Error('Erreur chargement exercices');
      return r.json();
    },
    staleTime: 2 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    enabled: entiteId > 0,
  });
  const exercices: Exercice[] = exercicesData;

  // Selection partagee via React Query : meme cle que useExercicesQuery
  const { data: cachedSelected = null } = useQuery<Exercice | null>({
    queryKey: ['selected-exercice', entiteId],
    queryFn: () => null,
    enabled: false,
    staleTime: Infinity,
    gcTime: Infinity,
  });

  // Reset local quand on change d'entite
  useEffect(() => {
    setExerciceIdLocal(null);
  }, [entiteId]);

  // Auto-pick par defaut si rien n'est selectionne
  useEffect(() => {
    if (cachedSelected || exercices.length === 0) return;
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const preferYear = month <= 2 ? year - 1 : year;
    const pick = exercices.find(e => e.annee === preferYear)
      || exercices.find(e => e.annee === year)
      || exercices.find(e => e.annee === year - 1)
      || exercices[0];
    queryClient.setQueryData<Exercice | null>(['selected-exercice', entiteId], pick);
  }, [cachedSelected, exercices, queryClient, entiteId]);

  // Sync cache -> exerciceId local
  useEffect(() => {
    setExerciceIdLocal(cachedSelected?.id ?? null);
  }, [cachedSelected]);

  // setExerciceId : ecrit dans le cache (les autres hooks suivent)
  const setExerciceId = useCallback((id: number | null) => {
    if (id === null) {
      queryClient.setQueryData<Exercice | null>(['selected-exercice', entiteId], null);
      return;
    }
    const ex = exercices.find(e => e.id === id);
    if (ex) queryClient.setQueryData<Exercice | null>(['selected-exercice', entiteId], ex);
  }, [exercices, queryClient, entiteId]);

  const calcDureeMois = (debut: string, fin: string): number => {
    const d1 = new Date(debut);
    const d2 = new Date(fin);
    return (d2.getFullYear() - d1.getFullYear()) * 12 + (d2.getMonth() - d1.getMonth()) + 1;
  };

  const openExerciceModal = (): void => {
    if (exercices.length >= 2) {
      setModal(prev => ({ ...prev, error: 'Maximum 2 exercices par entité.' }));
      return;
    }
    const y = new Date().getFullYear();
    setModal({ show: true, dateDebut: `${y}-01-01`, dateFin: `${y}-12-31`, error: '' });
  };

  const createExercice = async (): Promise<void> => {
    const duree = calcDureeMois(modal.dateDebut, modal.dateFin);
    if (duree !== 18 && (duree < 7 || duree > 12)) {
      setModal(prev => ({ ...prev, error: 'Durée invalide (' + duree + ' mois). Autorisé : 7 à 12 mois ou 18 mois.' }));
      return;
    }
    const annee = new Date(modal.dateDebut).getFullYear();
    setExerciceLoading(true);
    setModal(prev => ({ ...prev, error: '' }));
    try {
      const res = await clientFetch(api.balance.exercice, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entite_id: entiteId, annee, duree_mois: duree, date_debut: modal.dateDebut, date_fin: modal.dateFin }),
      });
      const data = await res.json();
      if (res.ok) {
        queryClient.setQueryData<Exercice[]>(['exercices', entiteId], prev => [data, ...(prev ?? [])]);
        queryClient.setQueryData<Exercice | null>(['selected-exercice', entiteId], data);
        setModal(prev => ({ ...prev, show: false }));
      } else {
        setModal(prev => ({ ...prev, error: data.error || 'Erreur lors de la création.' }));
      }
    } catch {
      setModal(prev => ({ ...prev, error: 'Impossible de contacter le serveur.' }));
    } finally {
      setExerciceLoading(false);
    }
  };

  const cloturerExercice = (exId: number): void => {
    setConfirmModal({
      open: true, title: 'Clôturer l\'exercice',
      message: 'Les écritures ne pourront plus être modifiées après la clôture. Confirmer ?',
      variant: 'warning', confirmLabel: 'Clôturer',
      onConfirm: async () => {
        setConfirmModal(prev => ({ ...prev, open: false }));
        try {
          const res = await clientFetch(api.balance.cloturerExercice(exId), { method: 'PUT' });
          if (res.ok) {
            const updated = await res.json();
            queryClient.setQueryData<Exercice[]>(['exercices', entiteId], prev => (prev ?? []).map(e => e.id === exId ? updated : e));
          }
        } catch { /* silently */ }
      },
    });
  };

  const rouvrirExercice = (exId: number): void => {
    setConfirmModal({
      open: true, title: 'Rouvrir l\'exercice',
      message: 'L\'exercice sera de nouveau modifiable. Confirmer ?',
      variant: 'warning', confirmLabel: 'Rouvrir',
      onConfirm: async () => {
        setConfirmModal(prev => ({ ...prev, open: false }));
        try {
          const res = await clientFetch(api.balance.rouvrirExercice(exId), { method: 'PUT' });
          if (res.ok) {
            const updated = await res.json();
            queryClient.setQueryData<Exercice[]>(['exercices', entiteId], prev => (prev ?? []).map(e => e.id === exId ? updated : e));
          }
        } catch { /* silently */ }
      },
    });
  };

  const currentExStatut = exercices.find(e => e.id === exerciceId)?.statut || 'ouvert';

  return {
    exerciceId, setExerciceId, exercices, exerciceLoading, currentExStatut,
    showExerciceModal: modal.show,
    newExDateDebut: modal.dateDebut,
    newExDateFin: modal.dateFin,
    exerciceError: modal.error,
    dureeMois: calcDureeMois(modal.dateDebut, modal.dateFin),
    setNewExDateDebut: (v: string) => setModal(prev => ({ ...prev, dateDebut: v })),
    setNewExDateFin: (v: string) => setModal(prev => ({ ...prev, dateFin: v })),
    openExerciceModal,
    closeExerciceModal: () => setModal(prev => ({ ...prev, show: false })),
    createExercice,
    confirmModal,
    closeConfirmModal: () => setConfirmModal(prev => ({ ...prev, open: false })),
    cloturerExercice,
    rouvrirExercice,
  };
}
