import React from 'react';
import { LuPlus, LuCheck, LuUndo, LuFileUp } from 'react-icons/lu';
import type { EcrituresStatsProps } from './SaisieJournal.types';
import { fmt } from '../utils/formatters';

function EcrituresStats({
  ecritures,
  stats,
  nbSelectedBrouillard,
  nbSelectedValidee,
  onValider,
  onDevalider,
  onBack,
  onOpenCreate,
  onOpenImport,
}: EcrituresStatsProps): React.JSX.Element {
  const listTotalDebit = ecritures.reduce((s, e) =>
    s + e.lignes.reduce((s2, l) => s2 + (parseFloat(String(l.debit)) || 0), 0), 0);
  const listTotalCredit = ecritures.reduce((s, e) =>
    s + e.lignes.reduce((s2, l) => s2 + (parseFloat(String(l.credit)) || 0), 0), 0);

  return (
    <>
      {/* Header */}
      <div className="compta-page-header">
        <div>
          <h1 className="compta-page-title">Saisie des ecritures</h1>
          <p className="compta-page-subtitle">Saisissez les ecritures comptables selon le plan SYCEBNL</p>
        </div>
        <div className="compta-header-actions">
          {nbSelectedBrouillard > 0 && (
            <button className="compta-action-btn success" onClick={onValider}>
              <LuCheck /> Valider ({nbSelectedBrouillard})
            </button>
          )}
          {nbSelectedValidee > 0 && (
            <button className="compta-action-btn warning" onClick={onDevalider}>
              <LuUndo /> Devalider ({nbSelectedValidee})
            </button>
          )}
          <button className="compta-action-btn" onClick={onBack}>&larr; Retour</button>
          {onOpenImport && (
            <button className="compta-action-btn" onClick={onOpenImport} style={{ background: '#eff6ff', color: '#1e40af', border: '1px solid #bfdbfe' }}>
              <LuFileUp /> Importer
            </button>
          )}
          <button className="compta-action-btn primary" onClick={onOpenCreate}>
            <LuPlus /> Creer
          </button>
        </div>
      </div>

      {/* Footer totaux */}
      <div className="saisie-footer">
        <div className="saisie-footer-count">
          {ecritures.length} ecriture{ecritures.length > 1 ? 's' : ''}
          {stats && <span> | {stats.nb_comptes} comptes mouvementes</span>}
        </div>
        <div className="saisie-footer-totaux">
          <div className="footer-total-card">
            <span className="footer-total-amount">{fmt(listTotalDebit)}</span>
            <span className="footer-total-label">Total debit</span>
          </div>
          <div className="footer-total-card">
            <span className="footer-total-amount">{fmt(listTotalCredit)}</span>
            <span className="footer-total-label">Total credit</span>
          </div>
          <div className="footer-total-card">
            <span className={'footer-total-amount ' + (Math.abs(listTotalDebit - listTotalCredit) < 0.01 ? 'ok' : 'ko')}>
              {fmt(Math.abs(listTotalDebit - listTotalCredit))}
            </span>
            <span className="footer-total-label">Solde</span>
          </div>
        </div>
      </div>
    </>
  );
}

export default EcrituresStats;
