import { useState, useEffect } from 'react';
import { clientFetch } from '../lib/api';
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
  const [exerciceId, setExerciceId] = useState<number | null>(null);
  const [exercices, setExercices] = useState<Exercice[]>([]);
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

  // Fetch exercices on entite change
  useEffect(() => {
    if (!entiteId) return;
    setExerciceId(null);
    setExercices([]);
    clientFetch('/api/balance/exercices/' + entiteId)
      .then((r: Response) => r.json())
      .then((data: Exercice[]) => {
        setExercices(data);
        if (data.length > 0) {
          const now = new Date();
          const year = now.getFullYear();
          const month = now.getMonth();
          const preferYear = month <= 2 ? year - 1 : year;
          const pick = data.find(e => e.annee === preferYear)
            || data.find(e => e.annee === year)
            || data.find(e => e.annee === year - 1)
            || data[0];
          setExerciceId(pick.id);
        }
      })
      .catch(() => {});
  }, [entiteId]);

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
      const res = await clientFetch('/api/balance/exercice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entite_id: entiteId, annee, duree_mois: duree, date_debut: modal.dateDebut, date_fin: modal.dateFin }),
      });
      const data = await res.json();
      if (res.ok) {
        setExercices(prev => [data, ...prev]);
        setExerciceId(data.id);
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
          const res = await clientFetch(`/api/balance/exercice/${exId}/cloturer`, { method: 'PUT' });
          if (res.ok) { const updated = await res.json(); setExercices(prev => prev.map(e => e.id === exId ? updated : e)); }
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
          const res = await clientFetch(`/api/balance/exercice/${exId}/rouvrir`, { method: 'PUT' });
          if (res.ok) { const updated = await res.json(); setExercices(prev => prev.map(e => e.id === exId ? updated : e)); }
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
