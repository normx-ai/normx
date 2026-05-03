import React from 'react';
import { LuPenLine, LuTrash2 } from 'react-icons/lu';
import type { EcritureAPI } from './SaisieJournal.types';
import { fmt } from '../utils/formatters';

export interface EcritureRowProps {
  ecr: EcritureAPI;
  selected: boolean;
  onToggleSelect: (id: number) => void;
  onEdit: (ecr: EcritureAPI) => void;
  onDelete: (id: number) => void;
}

function EcritureRow({ ecr, selected, onToggleSelect, onEdit, onDelete }: EcritureRowProps): React.JSX.Element {
  const dateLabel = new Date(ecr.date_ecriture).toLocaleDateString('fr-FR');
  const validee = ecr.statut === 'validee';

  return (
    <>
      {ecr.lignes.map((l, i) => (
        <tr key={ecr.id + '-' + i} className={i > 0 ? 'sub-line' : 'main-line'}>
          {i === 0 && (
            <td rowSpan={ecr.lignes.length} className="cell-center">
              <input
                type="checkbox"
                checked={selected}
                onChange={() => onToggleSelect(ecr.id)}
                aria-label={'Sélectionner écriture ' + ecr.id}
              />
            </td>
          )}
          {i === 0 && <td rowSpan={ecr.lignes.length} className="cell-center">{ecr.id}</td>}
          {i === 0 && <td rowSpan={ecr.lignes.length} className="cell-journal">{ecr.journal}</td>}
          {i === 0 && <td rowSpan={ecr.lignes.length}>{dateLabel}</td>}
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
              <span className={'statut-badge ' + (validee ? 'validee' : 'brouillard')}>
                {validee ? 'Validée' : 'Brouillard'}
              </span>
            </td>
          )}
          {i === 0 && (
            <td rowSpan={ecr.lignes.length} className="cell-actions">
              {!validee && (
                <>
                  <button className="action-icon-btn edit" onClick={() => onEdit(ecr)} title="Modifier"><LuPenLine /></button>
                  <button className="action-icon-btn delete" onClick={() => onDelete(ecr.id)} title="Supprimer"><LuTrash2 /></button>
                </>
              )}
            </td>
          )}
        </tr>
      ))}
    </>
  );
}

export default EcritureRow;
