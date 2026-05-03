import React from 'react';
import PanelHeader from './PanelHeader';
import type { Echeance } from './types';

export interface EcheancesPanelProps {
  echeances: Echeance[];
}

const badgeClass = (daysLeft: number): string => {
  if (daysLeft <= 7) return 'cd-badge cd-badge-danger';
  if (daysLeft <= 30) return 'cd-badge cd-badge-warn';
  return 'cd-badge cd-badge-info';
};

function EcheancesPanel({ echeances }: EcheancesPanelProps): React.ReactElement {
  return (
    <div className="cd-panel">
      <PanelHeader title="Échéances fiscales" sub="CGI Congo · 60 prochains jours" />
      {echeances.map(e => (
        <div key={e.title} className="cd-deadline">
          <div className="cd-deadline-date">
            <div className="cd-deadline-day">{e.day}</div>
            <div className="cd-deadline-month">{e.month}</div>
          </div>
          <div className="cd-deadline-content">
            <div className="cd-deadline-title">{e.title}</div>
            <div className="cd-deadline-desc">{e.desc}</div>
            <div className="cd-deadline-badge-row">
              <span className={badgeClass(e.daysLeft)}>Dans {e.daysLeft} j</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export default EcheancesPanel;
