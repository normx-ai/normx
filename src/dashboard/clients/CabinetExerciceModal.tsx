import React, { useState } from 'react';
import { LuX } from 'react-icons/lu';
import { apiPost } from '../../api';

interface CabinetExerciceModalProps {
  open: boolean;
  onClose: () => void;
  onCreated: () => void | Promise<void>;
}

function CabinetExerciceModal({ open, onClose, onCreated }: CabinetExerciceModalProps): React.ReactElement | null {
  const currentYear = new Date().getFullYear();
  const [annee, setAnnee] = useState<number>(currentYear);
  const [dateDebut, setDateDebut] = useState<string>(`${currentYear}-01-01`);
  const [dateFin, setDateFin] = useState<string>(`${currentYear}-12-31`);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');

  if (!open) return null;

  const handleAnneeChange = (value: string): void => {
    const next = parseInt(value, 10) || currentYear;
    setAnnee(next);
    setDateDebut(`${next}-01-01`);
    setDateFin(`${next}-12-31`);
  };

  const handleSubmit = async (): Promise<void> => {
    if (!annee || !dateDebut || !dateFin) {
      setError('Tous les champs sont requis.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await apiPost('/api/tenant/exercice', { annee, date_debut: dateDebut, date_fin: dateFin });
      await onCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la creation de l\'exercice.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="gc-modal-overlay" onClick={() => !loading && onClose()}>
      <div className="gc-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 460 }}>
        <div className="gc-modal-header">
          <h3>Créer l'exercice du cabinet</h3>
          <button className="gc-modal-close" onClick={onClose} disabled={loading}><LuX size={18} /></button>
        </div>
        <div className="gc-modal-body">
          <p style={{ fontSize: 14, color: '#6b7280', marginBottom: 16, lineHeight: 1.5 }}>
            Votre cabinet n'a pas encore d'exercice. Créez-le ici — il sera automatiquement copié vers tous vos clients (existants et futurs).
          </p>
          {error && <div className="gc-modal-error">{error}</div>}
          <div className="gc-form-row">
            <div className="gc-form-group gc-form-wide">
              <label>Année <span className="required">*</span></label>
              <input type="number" value={annee} onChange={(e) => handleAnneeChange(e.target.value)} />
            </div>
          </div>
          <div className="gc-form-row">
            <div className="gc-form-group">
              <label>Date de début <span className="required">*</span></label>
              <input type="date" value={dateDebut} onChange={(e) => setDateDebut(e.target.value)} />
            </div>
            <div className="gc-form-group">
              <label>Date de fin <span className="required">*</span></label>
              <input type="date" value={dateFin} onChange={(e) => setDateFin(e.target.value)} />
            </div>
          </div>
        </div>
        <div className="gc-modal-footer">
          <button className="gc-btn-cancel" onClick={onClose} disabled={loading}>Annuler</button>
          <button className="gc-btn-save" onClick={handleSubmit} disabled={loading}>
            {loading ? 'Création...' : 'Créer et continuer'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default CabinetExerciceModal;
