import React from 'react';
import { LuFilter } from 'react-icons/lu';
import type { EcrituresFiltersProps } from './SaisieJournal.types';
import { JOURNAUX, MOIS } from './SaisieJournal.types';

function EcrituresFilters({
  filterJournal,
  setFilterJournal,
  filterStatut,
  setFilterStatut,
  filterMois,
  setFilterMois,
  filterDateDu,
  setFilterDateDu,
  filterDateAu,
  setFilterDateAu,
  exerciceDateDebut,
  exerciceDateFin,
}: EcrituresFiltersProps): React.JSX.Element {
  const hasFilter = !!(filterJournal || filterStatut || filterMois || filterDateDu || filterDateAu);

  const reset = (): void => {
    setFilterJournal('');
    setFilterStatut('');
    setFilterMois('');
    setFilterDateDu('');
    setFilterDateAu('');
  };

  return (
    <section className="saisie-filters-card" aria-label="Filtres des écritures">
      <header className="saisie-filters-card-header">
        <div className="saisie-filters-card-title">
          <LuFilter />
          <span>Filtres</span>
        </div>
        <button
          type="button"
          className="saisie-filters-reset"
          onClick={reset}
          disabled={!hasFilter}
        >
          Réinitialiser
        </button>
      </header>
      <div className="saisie-filters-grid">
        <div className="saisie-field">
          <label className="saisie-field-label" htmlFor="f-journal">Journal</label>
          <select
            id="f-journal"
            className="saisie-field-select"
            value={filterJournal}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setFilterJournal(e.target.value)}
          >
            <option value="">Tous les journaux</option>
            {JOURNAUX.map(j => <option key={j.code} value={j.code}>{j.code} - {j.intitule}</option>)}
          </select>
        </div>
        <div className="saisie-field">
          <label className="saisie-field-label" htmlFor="f-statut">Statut</label>
          <select
            id="f-statut"
            className="saisie-field-select"
            value={filterStatut}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setFilterStatut(e.target.value)}
          >
            <option value="">Tous</option>
            <option value="brouillard">Brouillard</option>
            <option value="validee">Validée</option>
          </select>
        </div>
        <div className="saisie-field">
          <label className="saisie-field-label" htmlFor="f-mois">Mois</label>
          <select
            id="f-mois"
            className="saisie-field-select"
            value={filterMois}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setFilterMois(e.target.value)}
          >
            <option value="">Tous</option>
            {MOIS.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>
        <div className="saisie-field">
          <label className="saisie-field-label" htmlFor="f-du">Du</label>
          <input
            id="f-du"
            type="date"
            className="saisie-field-input"
            value={filterDateDu}
            min={exerciceDateDebut}
            max={exerciceDateFin}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => { setFilterDateDu(e.target.value); setFilterMois(''); }}
          />
        </div>
        <div className="saisie-field">
          <label className="saisie-field-label" htmlFor="f-au">Au</label>
          <input
            id="f-au"
            type="date"
            className="saisie-field-input"
            value={filterDateAu}
            min={exerciceDateDebut}
            max={exerciceDateFin}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => { setFilterDateAu(e.target.value); setFilterMois(''); }}
          />
        </div>
      </div>
    </section>
  );
}

export default EcrituresFilters;
