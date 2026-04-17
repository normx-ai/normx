import React from 'react';
import { LuSearch } from 'react-icons/lu';
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
  searchTerm,
  setSearchTerm,
}: EcrituresFiltersProps): React.JSX.Element {
  return (
    <div className="saisie-filters">
      <div className="saisie-filter-group">
        <label>Journal</label>
        <select value={filterJournal} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setFilterJournal(e.target.value)}>
          <option value="">Tous</option>
          {JOURNAUX.map(j => <option key={j.code} value={j.code}>{j.code} - {j.intitule}</option>)}
        </select>
      </div>
      <div className="saisie-filter-group">
        <label>Statut</label>
        <select value={filterStatut} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setFilterStatut(e.target.value)}>
          <option value="">Tous</option>
          <option value="brouillard">Brouillard</option>
          <option value="validee">Validée</option>
        </select>
      </div>
      <div className="saisie-filter-group">
        <label>Mois</label>
        <select value={filterMois} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setFilterMois(e.target.value)}>
          <option value="">Tous</option>
          {MOIS.map(m => <option key={m} value={m}>{m}</option>)}
        </select>
      </div>
      <div className="saisie-filter-group">
        <label>Du</label>
        <input type="date" value={filterDateDu} onChange={(e: React.ChangeEvent<HTMLInputElement>) => { setFilterDateDu(e.target.value); setFilterMois(''); }} />
      </div>
      <div className="saisie-filter-group">
        <label>Au</label>
        <input type="date" value={filterDateAu} onChange={(e: React.ChangeEvent<HTMLInputElement>) => { setFilterDateAu(e.target.value); setFilterMois(''); }} />
      </div>
      <div className="saisie-filter-search">
        <LuSearch />
        <input type="text" value={searchTerm} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)} placeholder="Rechercher..." />
      </div>
    </div>
  );
}

export default EcrituresFilters;
