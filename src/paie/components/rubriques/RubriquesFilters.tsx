// Barre de filtres (tabs par type de rubrique) avec compteurs.

import React from 'react';
import { FILTER_TABS, Rubrique } from './rubriquesTypes';

interface Props {
  activeFilter: string;
  setActiveFilter: (key: string) => void;
  rubriques: Rubrique[];
}

export function RubriquesFilters({ activeFilter, setActiveFilter, rubriques }: Props): React.ReactElement {
  return (
    <div style={{ padding: '16px 24px 0' }}>
      <div className="rubriques-filter-tabs">
        {FILTER_TABS.map(tab => (
          <button
            key={tab.key}
            className={`rubriques-filter-tab ${activeFilter === tab.key ? 'active' : ''}`}
            onClick={() => setActiveFilter(tab.key)}
          >
            {tab.label}
            {tab.type !== null && (
              <span style={{ marginLeft: 4, fontSize: 10, opacity: 0.7 }}>
                ({rubriques.filter(r => r.type === tab.type).length})
              </span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
