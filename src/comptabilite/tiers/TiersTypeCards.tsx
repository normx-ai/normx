// Cartes de compteurs par type de tiers (tous / membre / fournisseur / bailleur / personnel).

import React from 'react';
import { TiersItem, TYPES_TIERS } from './tiersTypes';

interface Props {
  tiers: TiersItem[];
  filterType: string;
  setFilterType: (t: string) => void;
}

export function TiersTypeCards({ tiers, filterType, setFilterType }: Props): React.JSX.Element {
  const counts: Record<string, number> = {};
  for (const t of TYPES_TIERS) counts[t.value] = 0;
  for (const t of tiers) { if (counts[t.type] !== undefined) counts[t.type]++; }

  return (
    <div className="tiers-type-cards">
      <div className={'tiers-type-card' + (!filterType ? ' active' : '')} onClick={() => setFilterType('')}>
        <span className="tiers-type-count">{tiers.length}</span>
        <span className="tiers-type-label">Tous</span>
      </div>
      {TYPES_TIERS.map(tc => (
        <div
          key={tc.value}
          className={'tiers-type-card' + (filterType === tc.value ? ' active' : '')}
          style={{ '--type-color': tc.color } as React.CSSProperties}
          onClick={() => setFilterType(filterType === tc.value ? '' : tc.value)}
        >
          {React.createElement(tc.icon, { size: 18 })}
          <span className="tiers-type-count">{counts[tc.value]}</span>
          <span className="tiers-type-label">{tc.label}</span>
        </div>
      ))}
    </div>
  );
}
