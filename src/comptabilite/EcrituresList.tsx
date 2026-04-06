import React from 'react';
import { LuPenLine, LuTrash2 } from 'react-icons/lu';
import type { EcrituresListProps } from './SaisieJournal.types';
import { fmt } from '../utils/formatters';

function EcrituresList({
  ecritures,
  selectedIds,
  onToggleSelect,
  onToggleSelectAll,
  onEdit,
  onDelete,
}: EcrituresListProps): React.JSX.Element {
  return (
    <div className="ecritures-table-wrapper">
      <table className="ecritures-main-table">
        <thead>
          <tr>
            <th style={{ width: 36 }}>
              <input type="checkbox" checked={ecritures.length > 0 && selectedIds.size === ecritures.length} onChange={onToggleSelectAll} />
            </th>
            <th>N°</th>
            <th>Journal</th>
            <th>Date</th>
            <th>N° piece</th>
            <th>Compte</th>
            <th style={{ width: 130 }}>Tiers</th>
            <th>Libelle</th>
            <th style={{ textAlign: 'right' }}>Debit</th>
            <th style={{ textAlign: 'right' }}>Credit</th>
            <th style={{ width: 90 }}>Statut</th>
            <th style={{ width: 70 }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {ecritures.length === 0 ? (
            <tr>
              <td colSpan={12} className="empty-cell">
                <div className="empty-state-inline">
                  <LuPenLine size={32} />
                  <p>Aucune ecriture</p>
                  <span>Cliquez sur "Creer" pour saisir votre premiere ecriture</span>
                </div>
              </td>
            </tr>
          ) : (
            ecritures.map(ecr => (
              ecr.lignes.map((l, i) => (
                <tr key={ecr.id + '-' + i} className={i > 0 ? 'sub-line' : 'main-line'}>
                  {i === 0 && (
                    <td rowSpan={ecr.lignes.length} className="cell-center">
                      <input type="checkbox" checked={selectedIds.has(ecr.id)} onChange={() => onToggleSelect(ecr.id)} />
                    </td>
                  )}
                  {i === 0 && <td rowSpan={ecr.lignes.length} className="cell-center">{ecr.id}</td>}
                  {i === 0 && <td rowSpan={ecr.lignes.length} className="cell-journal">{ecr.journal}</td>}
                  {i === 0 && <td rowSpan={ecr.lignes.length}>{new Date(ecr.date_ecriture).toLocaleDateString('fr-FR')}</td>}
                  {i === 0 && <td rowSpan={ecr.lignes.length}>{ecr.numero_piece || ''}</td>}
                  <td className={parseFloat(String(l.credit)) > 0 ? 'cell-credit' : ''}>{l.numero_compte}</td>
                  <td style={{ fontSize: 12, color: '#666' }}>{l.tiers_nom || ''}</td>
                  <td className={parseFloat(String(l.credit)) > 0 ? 'cell-credit indent' : ''}>
                    {i === 0 ? ecr.libelle : l.libelle_compte}
                  </td>
                  <td style={{ textAlign: 'right' }}>{fmt(l.debit)}</td>
                  <td style={{ textAlign: 'right' }}>{fmt(l.credit)}</td>
                  {i === 0 && (
                    <td rowSpan={ecr.lignes.length} className="cell-center">
                      <span className={'statut-badge ' + (ecr.statut === 'validee' ? 'validee' : 'brouillard')}>
                        {ecr.statut === 'validee' ? 'Validee' : 'Brouillard'}
                      </span>
                    </td>
                  )}
                  {i === 0 && (
                    <td rowSpan={ecr.lignes.length} className="cell-actions">
                      {ecr.statut !== 'validee' && (
                        <>
                          <button className="action-icon-btn edit" onClick={() => onEdit(ecr)} title="Modifier"><LuPenLine /></button>
                          <button className="action-icon-btn delete" onClick={() => onDelete(ecr.id)} title="Supprimer"><LuTrash2 /></button>
                        </>
                      )}
                    </td>
                  )}
                </tr>
              ))
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

export default EcrituresList;
