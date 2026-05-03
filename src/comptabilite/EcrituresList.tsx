import React from 'react';
import { LuChevronDown } from 'react-icons/lu';
import type { EcrituresListProps } from './SaisieJournal.types';
import EcrituresToolbar from './EcrituresToolbar';
import EcrituresEmpty from './EcrituresEmpty';
import EcritureRow from './EcritureRow';

function EcrituresList({
  ecritures,
  selectedIds,
  onToggleSelect,
  onToggleSelectAll,
  onEdit,
  onDelete,
  searchTerm,
  setSearchTerm,
  activeTab,
  setActiveTab,
  countAll,
  countBrouillard,
  countValidee,
  onOpenCreate,
  onOpenImport,
  onShortcut,
}: EcrituresListProps): React.JSX.Element {
  const isEmpty = ecritures.length === 0;

  return (
    <div className="saisie-table-card">
      <EcrituresToolbar
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        countAll={countAll}
        countBrouillard={countBrouillard}
        countValidee={countValidee}
      />

      <table className="ecritures-main-table">
        <thead>
          <tr>
            <th style={{ width: 36 }}>
              <input
                type="checkbox"
                checked={!isEmpty && selectedIds.size === ecritures.length}
                onChange={onToggleSelectAll}
                aria-label="Tout sélectionner"
              />
            </th>
            <th><span className="th-sortable">N° <LuChevronDown size={10} /></span></th>
            <th>Journal</th>
            <th><span className="th-sortable">Date <LuChevronDown size={10} /></span></th>
            <th>N° pièce</th>
            <th>Compte</th>
            <th style={{ width: 130 }}>Tiers</th>
            <th>Libellé</th>
            <th style={{ textAlign: 'right' }}>Débit</th>
            <th style={{ textAlign: 'right' }}>Crédit</th>
            <th style={{ width: 90 }}>Statut</th>
            <th style={{ width: 70 }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {isEmpty ? (
            <tr>
              <td colSpan={12} className="empty-cell">
                <EcrituresEmpty
                  onOpenCreate={onOpenCreate}
                  onOpenImport={onOpenImport}
                  onShortcut={onShortcut}
                />
              </td>
            </tr>
          ) : (
            ecritures.map(ecr => (
              <EcritureRow
                key={ecr.id}
                ecr={ecr}
                selected={selectedIds.has(ecr.id)}
                onToggleSelect={onToggleSelect}
                onEdit={onEdit}
                onDelete={onDelete}
              />
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

export default EcrituresList;
