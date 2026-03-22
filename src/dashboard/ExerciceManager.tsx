import React, { useState } from 'react';
import { LuLock, LuX } from 'react-icons/lu';
import { Exercice } from '../types';

interface ExerciceManagerProps {
  exercices: Exercice[];
  exerciceId: number | null;
  exerciceLoading: boolean;
  currentExStatut: string;
  onSelectExercice: (id: number) => void;
  onOpenExerciceModal: () => void;
  onCloturerExercice: (id: number) => void;
  onRouvrirExercice: (id: number) => void;
}

export function ExerciceSelector({
  exercices, exerciceId, exerciceLoading, currentExStatut,
  onSelectExercice, onOpenExerciceModal, onCloturerExercice, onRouvrirExercice,
}: ExerciceManagerProps): React.ReactElement {
  return (
    <div className="exercice-selector">
      <label>Exercice :</label>
      <select
        value={exerciceId || ''}
        onChange={(e: React.ChangeEvent<HTMLSelectElement>) => onSelectExercice(parseInt(e.target.value, 10))}
      >
        {exercices.map((ex: Exercice) => (
          <option key={ex.id} value={ex.id}>
            {ex.annee} {ex.duree_mois && ex.duree_mois !== 12 ? `(${ex.duree_mois} mois)` : ''} {ex.statut === 'cloture' ? '— Clôturé' : ''}
          </option>
        ))}
      </select>
      {exerciceId && currentExStatut === 'ouvert' && (
        <button className="exercice-status-btn exercice-cloturer" onClick={() => onCloturerExercice(exerciceId)} title="Clôturer l'exercice">
          <LuLock size={13} /> Clôturer
        </button>
      )}
      {exerciceId && currentExStatut === 'cloture' && (
        <button className="exercice-status-btn exercice-rouvrir" onClick={() => onRouvrirExercice(exerciceId)} title="Rouvrir l'exercice">
          Rouvrir
        </button>
      )}
      <button
        className="exercice-create-btn"
        onClick={onOpenExerciceModal}
        disabled={exerciceLoading || exercices.length >= 2}
      >
        + Nouvel exercice
      </button>
    </div>
  );
}

interface ExerciceModalProps {
  show: boolean;
  onClose: () => void;
  onCreate: () => void;
  loading: boolean;
  error: string;
  dateDebut: string;
  dateFin: string;
  onDateDebutChange: (v: string) => void;
  onDateFinChange: (v: string) => void;
  dureeMois: number;
}

export function ExerciceModal({
  show, onClose, onCreate, loading, error,
  dateDebut, dateFin, onDateDebutChange, onDateFinChange, dureeMois,
}: ExerciceModalProps): React.ReactElement | null {
  if (!show) return null;
  return (
    <div className="gc-modal-overlay" onClick={onClose}>
      <div className="gc-modal" style={{ maxWidth: 420 }} onClick={(e) => e.stopPropagation()}>
        <div className="gc-modal-header">
          <h3>Nouvel exercice</h3>
          <button className="gc-modal-close" onClick={onClose}><LuX size={18} /></button>
        </div>
        {error && <div className="gc-modal-error">{error}</div>}
        <div className="gc-modal-body">
          <div className="gc-form-row">
            <div className="gc-form-group">
              <label>Date de début <span className="required">*</span></label>
              <input type="date" value={dateDebut} onChange={(e) => onDateDebutChange(e.target.value)} />
            </div>
            <div className="gc-form-group">
              <label>Date de fin <span className="required">*</span></label>
              <input type="date" value={dateFin} onChange={(e) => onDateFinChange(e.target.value)} />
            </div>
          </div>
          <p className="gc-form-hint">
            Durée : {dureeMois} mois — Autorisé : 7 à 12 mois ou 18 mois.
          </p>
        </div>
        <div className="gc-modal-footer">
          <button className="gc-btn-cancel" onClick={onClose}>Annuler</button>
          <button className="gc-btn-save" onClick={onCreate} disabled={loading}>
            {loading ? 'Création...' : 'Créer l\'exercice'}
          </button>
        </div>
      </div>
    </div>
  );
}
