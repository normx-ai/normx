// Table du TFT SYCEBNL (methode directe) : sections + lignes FA..ZH.

import React from 'react';
import type { TFTRow } from '../../types';
import { TFT_ROWS_SYCEBNL, formatMontant } from './sycebnlData';

interface Props {
  annee: number;
  getValue: (ref: string) => number;
}

export function TFT_SYCEBNL_Table({ annee, getValue }: Props): React.JSX.Element {
  return (
    <table className="bilan-table">
      <thead>
        <tr>
          <th className="col-ref">REF</th>
          <th className="col-libelle">LIBELLES</th>
          <th className="col-note">Note</th>
          <th className="col-montant">EXERCICE AU 31/12/{annee}</th>
        </tr>
      </thead>
      <tbody>
        {TFT_ROWS_SYCEBNL.map((row: TFTRow, i: number) => {
          if (row.type === 'section') {
            return (
              <tr key={i} className="row-section">
                <td colSpan={4} className="col-section-label">{row.libelle}</td>
              </tr>
            );
          }
          if (row.type === 'label') {
            return (
              <tr key={i} className="row-label">
                <td></td>
                <td colSpan={2} style={{ fontStyle: 'italic', fontSize: '8px', paddingTop: 2, paddingBottom: 2 }}>{row.libelle}</td>
                <td></td>
              </tr>
            );
          }

          const rowClass = row.type === 'total' ? 'row-total'
            : row.type === 'result' ? 'row-subtotal'
            : row.type === 'subtotal' ? 'row-subtotal'
            : 'row-indent';

          const val = getValue(row.ref || '');

          return (
            <tr key={i} className={rowClass}>
              <td className="col-ref">{row.ref || ''}</td>
              <td className="col-libelle">{row.libelle}</td>
              <td className="col-note">{row.note || ''}</td>
              <td className="col-montant">{formatMontant(val)}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
