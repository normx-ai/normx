// Table des tiers + actions (modifier / supprimer) + selection ligne.

import React from 'react';
import { LuPenLine, LuTrash2, LuUsers } from 'react-icons/lu';
import { TiersItem, getTypeConfig } from './tiersTypes';

interface Props {
  tiersAffiches: TiersItem[];
  loading: boolean;
  selectedTiers: TiersItem | null;
  setSelectedTiers: (t: TiersItem | null) => void;
  onEdit: (t: TiersItem) => void;
  onDelete: (id: number) => void;
}

export function TiersTable({ tiersAffiches, loading, selectedTiers, setSelectedTiers, onEdit, onDelete }: Props): React.JSX.Element {
  return (
    <div className="ecritures-table-wrapper">
      <table className="ecritures-main-table">
        <thead>
          <tr>
            <th style={{ width: 140 }}>Type</th>
            <th style={{ width: 90 }}>Code</th>
            <th>Nom</th>
            <th style={{ width: 90 }}>Compte</th>
            <th>Telephone</th>
            <th>Email</th>
            <th style={{ width: 70 }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {tiersAffiches.length === 0 && !loading ? (
            <tr>
              <td colSpan={7} className="empty-cell">
                <div className="empty-state-inline">
                  <LuUsers size={32} />
                  <p>Aucun tiers</p>
                  <span>Cliquez sur "Nouveau tiers" pour commencer</span>
                </div>
              </td>
            </tr>
          ) : (
            tiersAffiches.map(t => {
              const tc = getTypeConfig(t.type);
              return (
                <tr
                  key={t.id}
                  className={selectedTiers?.id === t.id ? 'main-line selected-row' : 'main-line'}
                  onClick={() => setSelectedTiers(t)}
                >
                  <td>
                    <span className="tiers-badge" style={{ background: tc.color + '18', color: tc.color, borderColor: tc.color + '40' }}>
                      {React.createElement(tc.icon, { size: 13 })} {tc.label}
                    </span>
                  </td>
                  <td className="cell-journal">{t.code_tiers || '—'}</td>
                  <td style={{ fontWeight: 600 }}>{t.nom}</td>
                  <td className="compte-cell">{t.compte_comptable || ''}</td>
                  <td>{t.telephone || ''}</td>
                  <td>{t.email || ''}</td>
                  <td className="cell-actions">
                    <button
                      className="action-icon-btn edit"
                      onClick={(e: React.MouseEvent<HTMLButtonElement>) => { e.stopPropagation(); onEdit(t); }}
                      title="Modifier"
                    ><LuPenLine /></button>
                    <button
                      className="action-icon-btn delete"
                      onClick={(e: React.MouseEvent<HTMLButtonElement>) => { e.stopPropagation(); onDelete(t.id); }}
                      title="Supprimer"
                    ><LuTrash2 /></button>
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}
