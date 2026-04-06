import React from 'react';
import { MOIS_NOMS } from './livrePaieTypes';

interface LivrePaieFiltersProps {
  selectedMois: number;
  selectedAnnee: number;
  onMoisChange: (mois: number) => void;
  onAnneeChange: (annee: number) => void;
}

function LivrePaieFilters({
  selectedMois,
  selectedAnnee,
  onMoisChange,
  onAnneeChange,
}: LivrePaieFiltersProps): React.ReactElement {
  return (
    <div className="declarations-period-selector">
      <div className="wizard-form-group">
        <label>Mois</label>
        <select
          value={selectedMois}
          onChange={(e) => onMoisChange(Number(e.target.value))}
        >
          {MOIS_NOMS.slice(1).map((nom, i) => (
            <option key={i + 1} value={i + 1}>{nom}</option>
          ))}
        </select>
      </div>
      <div className="wizard-form-group">
        <label>Annee</label>
        <select
          value={selectedAnnee}
          onChange={(e) => onAnneeChange(Number(e.target.value))}
        >
          {[selectedAnnee - 1, selectedAnnee, selectedAnnee + 1].map((a) => (
            <option key={a} value={a}>{a}</option>
          ))}
        </select>
      </div>
    </div>
  );
}

export default LivrePaieFilters;
