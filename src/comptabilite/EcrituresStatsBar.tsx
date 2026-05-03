import React from 'react';
import { LuFileText } from 'react-icons/lu';
import type { EcritureAPI } from './SaisieJournal.types';
import { fmt } from '../utils/formatters';

export interface EcrituresStatsBarProps {
  ecritures: EcritureAPI[];
}

function EcrituresStatsBar({ ecritures }: EcrituresStatsBarProps): React.JSX.Element {
  const totalDebit = (ecritures || []).reduce((s, e) =>
    s + (e.lignes || []).reduce((s2, l) => s2 + (parseFloat(String(l.debit)) || 0), 0), 0);
  const totalCredit = (ecritures || []).reduce((s, e) =>
    s + (e.lignes || []).reduce((s2, l) => s2 + (parseFloat(String(l.credit)) || 0), 0), 0);
  const ecart = Math.abs(totalDebit - totalCredit);
  const equilibre = ecart < 0.01;

  const nbCount = ecritures.length;
  // Comptes uniques mouvementes dans les ecritures filtrees (cohesion avec la liste).
  const comptes = new Set<string>();
  for (const e of ecritures) {
    for (const l of e.lignes || []) {
      if (l.numero_compte) comptes.add(l.numero_compte);
    }
  }
  const nbComptes = comptes.size;

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
            {nbComptes} compte{nbComptes > 1 ? 's' : ''} mouvementé{nbComptes > 1 ? 's' : ''}
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
