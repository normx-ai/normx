import React from 'react';
import PanelHeader from './PanelHeader';
import { fmtMontant } from '../../utils/formatters';
import type { DashboardEcritureRow } from './types';

export interface ActiviteRecentePanelProps {
  ecrituresRecentes: DashboardEcritureRow[];
  onSeeAll: () => void;
}

const fmtJour = (iso: string): string =>
  new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });

function ActiviteRecentePanel({ ecrituresRecentes, onSeeAll }: ActiviteRecentePanelProps): React.ReactElement {
  return (
    <div className="cd-panel cd-panel-mt">
      <PanelHeader
        title="Activité récente"
        sub="5 dernières écritures validées"
        action={
          <button type="button" className="cd-link-btn" onClick={onSeeAll}>Tout voir</button>
        }
      />
      {ecrituresRecentes.length === 0 ? (
        <div className="cd-empty">Aucune écriture pour cet exercice.</div>
      ) : (
        <table className="cd-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Pièce</th>
              <th>Journal</th>
              <th>Libellé</th>
              <th className="cd-right">Total</th>
            </tr>
          </thead>
          <tbody>
            {ecrituresRecentes.slice(0, 5).map(e => (
              <tr key={e.id}>
                <td>{fmtJour(e.date_ecriture)}</td>
                <td>{e.numero_piece || '—'}</td>
                <td>{e.journal_code || '—'}</td>
                <td>{e.libelle || ''}</td>
                <td className="cd-right">{fmtMontant(e.total_debit || 0, { abbreviate: true })}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

export default ActiviteRecentePanel;
