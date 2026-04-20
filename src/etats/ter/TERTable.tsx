// Table du TER (REF, DESIGNATION, cumul debut N, exercice N, cumul fin N).

import React from 'react';
import { TERComputedData, TER_ROWS, formatMontant } from './terData';

interface Props {
  data: TERComputedData;
}

export function TERTable({ data }: Props): React.ReactElement {
  return (
    <table className="bilan-table">
      <thead>
        <tr>
          <th className="col-ref">REF</th>
          <th className="col-libelle">DESIGNATION</th>
          <th className="col-montant">SOLDE CUMULE{'\n'}DEBUT EXERCICE N</th>
          <th className="col-montant">EXERCICE N</th>
          <th className="col-montant">SOLDE CUMULE{'\n'}FIN EXERCICE N</th>
        </tr>
      </thead>
      <tbody>
        {TER_ROWS.map((row, i) => {
          const rowClass = row.type === 'total' ? 'row-total'
            : row.type === 'section' ? 'row-section'
            : row.type === 'subtotal' ? 'row-subtotal'
            : 'row-indent';
          const valN = data.processedN[row.ref] || 0;
          const valDebut = data.cumulDebutN[row.ref] || 0;
          const valFin = data.cumulFinN[row.ref] || 0;
          return (
            <tr key={i} className={rowClass}>
              <td className="col-ref">{row.ref}</td>
              <td className="col-libelle">{row.libelle}</td>
              <td className="col-montant">{formatMontant(valDebut)}</td>
              <td className="col-montant">{formatMontant(valN)}</td>
              <td className="col-montant">{formatMontant(valFin)}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
