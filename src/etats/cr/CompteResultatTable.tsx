// Table principale du Compte de Resultat SYSCOHADA (REF / LIBELLES / Note / +- / Net N / Net N-1).

import React from 'react';
import { CR_ROWS, CRBalanceResult, formatMontant, getValue } from './crSyscohadaData';

interface Props {
  annee: number;
  dataN: Record<string, CRBalanceResult>;
  dataN1: Record<string, CRBalanceResult>;
}

export function CompteResultatTable({ annee, dataN, dataN1 }: Props): React.JSX.Element {
  return (
    <table className="bilan-table">
      <thead>
        <tr>
          <th className="col-ref" rowSpan={2}>REF</th>
          <th className="col-libelle" rowSpan={2}>LIBELLES</th>
          <th className="col-note" rowSpan={2}>Note</th>
          <th className="col-signe" rowSpan={2}>+/-</th>
          <th className="col-montant">EXERCICE AU 31/12/{annee}</th>
          <th className="col-montant">EXERCICE AU 31/12/{annee - 1}</th>
        </tr>
        <tr>
          <th className="col-montant">NET</th>
          <th className="col-montant">NET</th>
        </tr>
      </thead>
      <tbody>
        {CR_ROWS.map((row, i) => {
          const rowClass = row.type === 'total' ? 'row-total'
            : row.type === 'result' ? 'row-subtotal'
            : row.type === 'subtotal' ? 'row-subtotal'
            : 'row-indent';

          const netN = getValue(row.ref, dataN);
          const netN1 = getValue(row.ref, dataN1);

          return (
            <tr key={i} className={rowClass}>
              <td className="col-ref">{row.ref}</td>
              <td className="col-libelle">{row.libelle}</td>
              <td className="col-note">{row.note || ''}</td>
              <td className="col-signe">{row.signe || ''}</td>
              <td className="col-montant">{formatMontant(netN)}</td>
              <td className="col-montant">{formatMontant(netN1)}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
