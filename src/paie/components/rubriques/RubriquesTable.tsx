// Table des rubriques + actions (toggle actif, modifier, supprimer).

import React from 'react';
import { formatNumber, MODE_LABELS, Rubrique, TYPE_LABELS } from './rubriquesTypes';

interface Props {
  rubriques: Rubrique[];
  loading: boolean;
  onEdit: (rub: Rubrique) => void;
  onToggleActif: (rub: Rubrique) => void;
  onDelete: (id: number) => void;
  onInitDefaults: () => void;
}

export function RubriquesTable({ rubriques, loading, onEdit, onToggleActif, onDelete, onInitDefaults }: Props): React.ReactElement {
  if (loading) {
    return <div className="etab-table-empty">Chargement...</div>;
  }

  return (
    <div className="etab-table-wrapper">
      <table className="etab-table">
        <thead>
          <tr>
            <th>Code</th>
            <th>Libelle</th>
            <th>Type</th>
            <th>Mode</th>
            <th style={{ textAlign: 'right' }}>Taux (%)</th>
            <th style={{ textAlign: 'right' }}>Montant</th>
            <th style={{ textAlign: 'right' }}>Plafond</th>
            <th>Imposable</th>
            <th>Statut</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {rubriques.length === 0 ? (
            <tr>
              <td colSpan={10} className="etab-table-empty">
                Aucune rubrique.{' '}
                <button
                  className="wizard-form-link"
                  onClick={onInitDefaults}
                  style={{ display: 'inline' }}
                >
                  Initialiser les rubriques par defaut
                </button>
              </td>
            </tr>
          ) : (
            rubriques.map(rub => (
              <tr key={rub.id} style={{ opacity: rub.actif ? 1 : 0.5 }}>
                <td style={{ fontWeight: 600, fontFamily: 'monospace', fontSize: 12 }}>{rub.code}</td>
                <td>{rub.libelle}</td>
                <td>
                  <span style={{
                    display: 'inline-block',
                    padding: '2px 8px',
                    fontSize: 11,
                    fontWeight: 600,
                    background: rub.type === 'gain' ? '#dcfce7' : rub.type === 'cotisation' ? '#dbeafe' : '#fef3c7',
                    color: rub.type === 'gain' ? '#166534' : rub.type === 'cotisation' ? '#1e40af' : '#92400e',
                  }}>
                    {TYPE_LABELS[rub.type]}
                  </span>
                </td>
                <td style={{ fontSize: 12 }}>{MODE_LABELS[rub.mode]}</td>
                <td style={{ textAlign: 'right', fontFamily: 'monospace' }}>
                  {rub.taux !== null ? `${rub.taux}%` : '-'}
                </td>
                <td style={{ textAlign: 'right', fontFamily: 'monospace' }}>{formatNumber(rub.montant)}</td>
                <td style={{ textAlign: 'right', fontFamily: 'monospace' }}>{formatNumber(rub.plafond)}</td>
                <td>
                  {rub.imposable ? (
                    <span style={{ color: '#166534', fontSize: 12, fontWeight: 600 }}>Oui</span>
                  ) : (
                    <span style={{ color: '#6b7280', fontSize: 12 }}>Non</span>
                  )}
                </td>
                <td>
                  <button
                    className={rub.actif ? 'rubriques-badge-actif' : 'rubriques-badge-inactif'}
                    onClick={() => onToggleActif(rub)}
                    style={{ cursor: 'pointer', border: 'none' }}
                  >
                    {rub.actif ? 'Actif' : 'Inactif'}
                  </button>
                </td>
                <td>
                  <div style={{ display: 'flex', gap: 4 }}>
                    <button
                      className="btn-mini-cancel"
                      style={{ padding: '4px 10px', fontSize: 11 }}
                      onClick={() => onEdit(rub)}
                    >
                      Modifier
                    </button>
                    <button
                      className="btn-mini-cancel"
                      style={{ padding: '4px 10px', fontSize: 11, color: '#991b1b' }}
                      onClick={() => onDelete(rub.id)}
                    >
                      Suppr.
                    </button>
                  </div>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
