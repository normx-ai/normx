import { useState, useEffect, useCallback } from 'react';
import type { Exercice } from '../../types';

interface UseNoteDataOptions {
  entiteId: number;
}

interface UseNoteDataResult {
  exercices: Exercice[];
  selectedExercice: Exercice | null;
  setSelectedExercice: (e: Exercice | null) => void;
  params: Record<string, string>;
  setParams: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  previewUrl: string | null;
  setPreviewUrl: (url: string | null) => void;
  pdfBlob: Blob | null;
  setPdfBlob: (b: Blob | null) => void;
  editing: boolean;
  setEditing: (e: boolean) => void;
  saving: boolean;
  saved: boolean;
  saveParams: (updatedParams: Record<string, string>) => Promise<void>;
  annee: number;
  dateFin: string;
  duree: number;
}

export function useNoteData({ entiteId }: UseNoteDataOptions): UseNoteDataResult {
  const [exercices, setExercices] = useState<Exercice[]>([]);
  const [selectedExercice, setSelectedExercice] = useState<Exercice | null>(null);
  const [params, setParams] = useState<Record<string, string>>({});
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [pdfBlob, setPdfBlob] = useState<Blob | null>(null);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Charger les params de l'entite
  useEffect(() => {
    if (!entiteId) return;
    fetch('/api/entites/' + entiteId)
      .then(r => r.json())
      .then(ent => {
        const data = ent.data || {};
        setParams(data);
      })
      .catch(() => {});
  }, [entiteId]);

  // Charger les exercices et selection auto
  useEffect(() => {
    if (!entiteId) return;
    fetch('/api/balance/exercices/' + entiteId)
      .then(r => r.json())
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
          setSelectedExercice(pick);
        }
      })
      .catch(() => {});
  }, [entiteId]);

  // Sauvegarder les params
  const saveParams = useCallback(async (updatedParams: Record<string, string>) => {
    setSaving(true);
    try {
      const res = await fetch(`/api/entites/${entiteId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: updatedParams }),
      });
      if (res.ok) {
        setParams(updatedParams);
        setSaved(true);
        setEditing(false);
        setTimeout(() => setSaved(false), 3000);
      }
    } catch { /* */ }
    setSaving(false);
  }, [entiteId]);

  // Computed
  const annee = selectedExercice ? selectedExercice.annee : new Date().getFullYear();
  const dateFin = selectedExercice?.date_fin || '';
  const duree = selectedExercice?.duree_mois || 12;

  return {
    exercices,
    selectedExercice,
    setSelectedExercice,
    params,
    setParams,
    previewUrl,
    setPreviewUrl,
    pdfBlob,
    setPdfBlob,
    editing,
    setEditing,
    saving,
    saved,
    saveParams,
    annee,
    dateFin,
    duree,
  };
}
