// Table principale du TFT SYSCOHADA : une ligne par REF (ZA..ZI),
// avec formatage (parentheses pour negatifs) et types de lignes
// (section, label, subtotal, result, total, indent).

import React from 'react';
import { TFT_ROWS, formatMontant } from '../TFT_helpers';

interface Props {
  annee: number;
  getValue: (ref: string) => number;
  getValueN1: (ref: string) => number;
}

export function TFT_SYSCOHADA_Table({ annee, getValue, getValueN1 }: Props): React.JSX.Element {
  return (
    <table className="bilan-table">
      <thead>
        <tr>
          <th className="col-ref">REF</th>
          <th className="col-libelle">LIBELLES</th>
          <th className="col-note">Note</th>
          <th className="col-montant">EXERCICE N<br />AU 31/12/{annee}</th>
          <th className="col-montant">EXERCICE N-1<br />AU 31/12/{annee - 1}</th>
        </tr>
      </thead>
      <tbody>
        {TFT_ROWS.map((row, i) => {
          if (row.type === 'section') {
            return (
              <tr key={i} className="row-section">
                <td colSpan={5} className="col-section-label">{row.libelle}</td>
              </tr>
            );
          }
          if (row.type === 'label') {
            return (
              <tr key={i} className="row-label">
                <td></td>
                <td colSpan={2} style={{ fontStyle: 'italic', fontSize: '8px', paddingTop: 2, paddingBottom: 2 }}>{row.libelle}</td>
                <td></td>
                <td></td>
              </tr>
            );
          }

          const rowClass = row.type === 'total' ? 'row-total'
            : row.type === 'result' ? 'row-subtotal'
            : row.type === 'subtotal' ? 'row-subtotal'
            : 'row-indent';

          const val = getValue(row.ref || '');
          const valN1 = getValueN1(row.ref || '');

          return (
            <tr key={i} className={rowClass}>
              <td className="col-ref">{row.ref}</td>
              <td className="col-libelle">{row.libelle}</td>
              <td className="col-note">{row.note || ''}</td>
              <td className="col-montant">{formatMontant(val)}</td>
              <td className="col-montant">{formatMontant(valN1)}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
