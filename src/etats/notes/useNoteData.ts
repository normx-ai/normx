import { useState, useEffect, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { clientFetch } from '../../lib/api';
import { useExercicesQuery } from '../../hooks/useExercicesQuery';
import type { Exercice } from '../../types';

interface UseNoteDataOptions {
  entiteId: number;
}

interface UseNoteDataResult {
  exercices: Exercice[];
  exercicesLoading: boolean;
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
  const queryClient = useQueryClient();
  const {
    exercices, isLoading: exercicesLoading,
    selectedExercice, setSelectedExercice,
    annee, dateFin, duree,
  } = useExercicesQuery(entiteId);

  const [params, setParams] = useState<Record<string, string>>({});
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [pdfBlob, setPdfBlob] = useState<Blob | null>(null);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const { data: entiteParams } = useQuery({
    queryKey: ['entite-params', entiteId],
    queryFn: async (): Promise<Record<string, string>> => {
      const r = await clientFetch('/api/entites/' + entiteId);
      if (!r.ok) throw new Error('Erreur');
      const ent = await r.json();
      return ent.data || {};
    },
    staleTime: 5 * 60 * 1000,
    enabled: entiteId > 0,
  });

  useEffect(() => {
    if (entiteParams) setParams(entiteParams);
  }, [entiteParams]);

  const saveParams = useCallback(async (updatedParams: Record<string, string>) => {
    setSaving(true);
    try {
      const res = await clientFetch(`/api/entites/${entiteId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: updatedParams }),
      });
      if (res.ok) {
        setParams(updatedParams);
        queryClient.invalidateQueries({ queryKey: ['entite-params', entiteId] });
        setSaved(true);
        setEditing(false);
        setTimeout(() => setSaved(false), 3000);
      }
    } catch { /* */ }
    setSaving(false);
  }, [entiteId, queryClient]);

  return {
    exercices, exercicesLoading,
    selectedExercice, setSelectedExercice,
    params, setParams,
    previewUrl, setPreviewUrl,
    pdfBlob, setPdfBlob,
    editing, setEditing,
    saving, saved, saveParams,
    annee, dateFin, duree,
  };
}
