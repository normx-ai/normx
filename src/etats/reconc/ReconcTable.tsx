// Table de la Reconciliation de Tresorerie (REF / LIBELLE / MONTANT editable ou calcule).

import React from 'react';
import { RECONC_ROWS, ReconcRow, ReconcTotals, formatMontant, getRowValue } from './reconcData';

interface Props {
  totals: ReconcTotals;
  editableValues: Record<string, number>;
  onEditableChange: (ref: string, value: string) => void;
}

export function ReconcTable({ totals, editableValues, onEditableChange }: Props): React.JSX.Element {
  return (
    <table className="bilan-table">
      <thead>
        <tr>
          <th className="col-ref">REF</th>
          <th className="col-libelle">LIBELLE</th>
          <th className="col-montant">MONTANT</th>
        </tr>
      </thead>
      <tbody>
        {RECONC_ROWS.map((row: ReconcRow, i: number) => {
          const rowClass = row.type === 'total' ? 'row-total'
            : row.type === 'section' ? 'row-section'
            : 'row-indent';

          const val = getRowValue(row, totals, editableValues);
          return (
            <tr key={i} className={rowClass}>
              <td className="col-ref">{row.ref}</td>
              <td className="col-libelle">{row.libelle}</td>
              <td className="col-montant">
                {row.editable ? (
                  <input
                    type="number"
                    value={editableValues[row.ref] || ''}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => onEditableChange(row.ref, e.target.value)}
                    placeholder="0"
                    className="bilan-input"
                  />
                ) : (
                  formatMontant(val)
                )}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
