import { useState } from 'react';
import type { EcritureAPI } from '../SaisieJournal.types';
import { clientFetch } from '../../lib/api';
import { api } from '../../lib/apiEndpoints';
import { parseInputNumber } from '../../utils/formatters';
import type { UseEcritureFormResult } from './useEcritureForm';

export interface UseEcrituresActionsParams {
  entiteId: number;
  exerciceId: number;
  ecritures: EcritureAPI[];
  form: UseEcritureFormResult;
  invalidate: () => void;
}

export interface UseEcrituresActionsResult {
  selectedIds: Set<number>;
  toggleSelect: (id: number) => void;
  toggleSelectAll: () => void;
  nbSelectedBrouillard: number;
  nbSelectedValidee: number;
  saveEcriture: () => Promise<void>;
  deleteEcriture: (id: number) => Promise<void>;
  validerSelection: () => Promise<void>;
  devaliderSelection: () => Promise<void>;
}

export function useEcrituresActions({
  entiteId, exerciceId, ecritures, form, invalidate,
}: UseEcrituresActionsParams): UseEcrituresActionsResult {
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  const toggleSelect = (id: number): void => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = (): void => {
    setSelectedIds(selectedIds.size === ecritures.length ? new Set() : new Set(ecritures.map(e => e.id)));
  };

  const nbSelectedBrouillard = [...selectedIds].filter(id => {
    const ecr = ecritures.find(e => e.id === id);
    return ecr && ecr.statut !== 'validee';
  }).length;

  const nbSelectedValidee = [...selectedIds].filter(id => {
    const ecr = ecritures.find(e => e.id === id);
    return ecr && ecr.statut === 'validee';
  }).length;

  const saveEcriture = async (): Promise<void> => {
    const totalDebit = form.lignes.reduce((s, l) => s + parseInputNumber(String(l.debit)), 0);
    if (!form.dateEcriture || !form.libelle || totalDebit <= 0) return;
    form.setSaving(true);
    try {
      const body = {
        entite_id: entiteId,
        exercice_id: exerciceId,
        date_ecriture: form.dateEcriture,
        journal: form.journal,
        numero_piece: form.numeroPiece,
        libelle: form.libelle,
        lignes: form.lignes.filter(l => l.numero_compte && (parseFloat(String(l.debit)) || parseFloat(String(l.credit)))),
      };
      const url = form.editingId ? api.ecritures.byId(form.editingId) : api.ecritures.root;
      const method = form.editingId ? 'PUT' : 'POST';
      const res = await clientFetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        invalidate();
        if (form.editingId) form.closeOverlay();
        else form.resetForm();
      } else {
        const err: { error?: string } = await res.json();
        alert(err.error || 'Erreur');
      }
    } catch (_err) {
      alert('Erreur reseau');
    } finally {
      form.setSaving(false);
    }
  };

  const deleteEcriture = async (id: number): Promise<void> => {
    if (!window.confirm('Supprimer cette ecriture ?')) return;
    try {
      await clientFetch(api.ecritures.byId(id), { method: 'DELETE' });
      invalidate();
    } catch (_err) { /* ignore */ }
  };

  const validerSelection = async (): Promise<void> => {
    const brouillards = [...selectedIds].filter(id => {
      const ecr = ecritures.find(e => e.id === id);
      return ecr && ecr.statut !== 'validee';
    });
    if (brouillards.length === 0) return;
    try {
      const res = await clientFetch(api.ecritures.valider, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: brouillards }),
      });
      if (res.ok) { setSelectedIds(new Set()); invalidate(); }
      else { const err: { error?: string } = await res.json(); alert(err.error || 'Erreur'); }
    } catch (_err) { alert('Erreur reseau'); }
  };

  const devaliderSelection = async (): Promise<void> => {
    const validees = [...selectedIds].filter(id => {
      const ecr = ecritures.find(e => e.id === id);
      return ecr && ecr.statut === 'validee';
    });
    if (validees.length === 0) return;
    if (!window.confirm('Repasser ' + validees.length + ' ecriture(s) en brouillard ?')) return;
    try {
      const res = await clientFetch(api.ecritures.devalider, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: validees }),
      });
      if (res.ok) { setSelectedIds(new Set()); invalidate(); }
      else { const err: { error?: string } = await res.json(); alert(err.error || 'Erreur'); }
    } catch (_err) { alert('Erreur reseau'); }
  };

  return {
    selectedIds, toggleSelect, toggleSelectAll,
    nbSelectedBrouillard, nbSelectedValidee,
    saveEcriture, deleteEcriture, validerSelection, devaliderSelection,
  };
}
