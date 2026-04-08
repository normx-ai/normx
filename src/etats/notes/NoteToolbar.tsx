/**
 * Toolbar reutilisable pour toutes les Notes
 * Remplace les ~30 lignes dupliquees dans 47+ fichiers
 */

import React from 'react';
import { LuArrowLeft, LuEye, LuPenLine, LuSave } from 'react-icons/lu';
import type { Exercice } from '../../types';

interface NoteToolbarProps {
  title: string;
  exercices: Exercice[];
  selectedExercice: Exercice | null;
  onSelectExercice: (ex: Exercice) => void;
  editing: boolean;
  saving: boolean;
  saved: boolean;
  onEdit: () => void;
  onSave: () => void;
  onPreview: () => void;
  onBack?: () => void;
  children?: React.ReactNode;
}

export default function NoteToolbar({
  title, exercices, selectedExercice,
  onSelectExercice, editing, saving, saved,
  onEdit, onSave, onPreview, onBack, children,
}: NoteToolbarProps): React.JSX.Element {
  return (
    <div className="etat-toolbar">
      {onBack && (
        <button className="etat-back-btn" onClick={onBack}>
          <LuArrowLeft size={18} /> Retour
        </button>
      )}
      <div className="etat-toolbar-title">{title}</div>
      <div className="etat-toolbar-actions">
        <select
          className="etat-exercice-select"
          value={selectedExercice?.id || ''}
          onChange={e => {
            const ex = exercices.find(ex => ex.id === Number(e.target.value));
            if (ex) onSelectExercice(ex);
          }}
        >
          {exercices.map(ex => (
            <option key={ex.id} value={ex.id}>{ex.annee}</option>
          ))}
        </select>
        {!editing ? (
          <button
            className="etat-action-btn"
            onClick={onEdit}
            style={{ background: '#D4A843', color: '#fff', border: 'none' }}
          >
            <LuPenLine size={16} /> Modifier
          </button>
        ) : (
          <button
            className="etat-action-btn"
            onClick={onSave}
            disabled={saving}
            style={{ background: '#059669', color: '#fff', border: 'none' }}
          >
            <LuSave size={16} /> {saving ? 'Sauvegarde...' : saved ? 'Sauvegarde' : 'Sauvegarder'}
          </button>
        )}
        <button className="etat-action-btn" onClick={onPreview}>
          <LuEye size={16} /> Apercu
        </button>
        {children}
      </div>
    </div>
  );
}
