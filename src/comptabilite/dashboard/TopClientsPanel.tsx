import React from 'react';
import PanelHeader from './PanelHeader';
import { fmtMontant } from '../../utils/formatters';
import type { BalanceTiersRow } from './types';

export interface TopClientsPanelProps {
  clientsTiers: BalanceTiersRow[];
}

function TopClientsPanel({ clientsTiers }: TopClientsPanelProps): React.ReactElement {
  const top = [...clientsTiers]
    .map(t => ({ ...t, encours: (t.debit || 0) - (t.credit || 0) }))
    .filter(t => t.encours > 0)
    .sort((a, b) => b.encours - a.encours)
    .slice(0, 5);

  return (
    <div className="cd-panel">
      <PanelHeader title="Top clients par encours" sub="Comptes 411 — solde débiteur" />
      {top.length === 0 ? (
        <div className="cd-empty">Aucun encours client.</div>
      ) : (
        <table className="cd-table">
          <thead>
            <tr><th>Tiers</th><th className="cd-right">Encours</th></tr>
          </thead>
          <tbody>
            {top.map(t => (
              <tr key={t.tiers_id}>
                <td>
                  <div className="cd-tiers-name">{t.tiers_nom}</div>
                  <div className="cd-tiers-code">{t.tiers_code || ''}</div>
                </td>
                <td className="cd-right">{fmtMontant(t.encours, { abbreviate: true })}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

export default TopClientsPanel;
