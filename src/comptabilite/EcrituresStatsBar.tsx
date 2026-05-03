import React from 'react';
import { LuFileText } from 'react-icons/lu';
import type { EcritureAPI, StatsData } from './SaisieJournal.types';
import { fmt } from '../utils/formatters';

export interface EcrituresStatsBarProps {
  ecritures: EcritureAPI[];
  stats: StatsData | null;
}

function EcrituresStatsBar({ ecritures, stats }: EcrituresStatsBarProps): React.JSX.Element {
  const totalDebit = (ecritures || []).reduce((s, e) =>
    s + (e.lignes || []).reduce((s2, l) => s2 + (parseFloat(String(l.debit)) || 0), 0), 0);
  const totalCredit = (ecritures || []).reduce((s, e) =>
    s + (e.lignes || []).reduce((s2, l) => s2 + (parseFloat(String(l.credit)) || 0), 0), 0);
  const ecart = Math.abs(totalDebit - totalCredit);
  const equilibre = ecart < 0.01;

  const nbCount = ecritures.length;
  const nbComptes = stats?.nb_comptes ?? 0;

  return (
    <div className="saisie-stats-bar">
      <div className="saisie-stats-info">
        <div className="saisie-stats-info-icon">
          <LuFileText size={18} />
        </div>
        <div>
          <div className="saisie-stats-info-primary">
            {nbCount} écriture{nbCount > 1 ? 's' : ''} saisie{nbCount > 1 ? 's' : ''}
          </div>
          <div className="saisie-stats-info-secondary">
            {stats ? `${nbComptes} compte${nbComptes > 1 ? 's' : ''} mouvementé${nbComptes > 1 ? 's' : ''}` : '—'}
          </div>
        </div>
      </div>
      <div className="saisie-stat-item">
        <div className="saisie-stat-label">Total débit</div>
        <div className="saisie-stat-value">{fmt(totalDebit)}<span className="saisie-stat-unit">FCFA</span></div>
      </div>
      <div className="saisie-stat-item">
        <div className="saisie-stat-label">Total crédit</div>
        <div className="saisie-stat-value">{fmt(totalCredit)}<span className="saisie-stat-unit">FCFA</span></div>
      </div>
      <div className={'saisie-stat-item ' + (equilibre ? 'balanced' : 'unbalanced')}>
        <div className="saisie-stat-label">Solde</div>
        <div className="saisie-stat-value">
          {equilibre ? 'Équilibré' : fmt(ecart)}
          {equilibre
            ? <span className="saisie-stat-unit ok">✓</span>
            : <span className="saisie-stat-unit ko">FCFA</span>}
        </div>
      </div>
    </div>
  );
}

export default EcrituresStatsBar;
