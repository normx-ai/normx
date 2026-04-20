// Table ACTIF du bilan SYCEBNL (colonnes Brut / Amort / Net N / Net N-1).

import React from 'react';
import type { BilanRow } from '../../types';
import {
  ACTIF_ROWS, ActifValues, formatMontant, getActifValueFor,
} from './bilanSYCEBNLData';

interface Props {
  actifN: Record<string, ActifValues>;
  actifN1: Record<string, ActifValues>;
  annee: number;
}

export function BilanSYCEBNLActifTable({ actifN, actifN1, annee }: Props): React.JSX.Element {
  return (
    <table className="bilan-table">
      <thead>
        <tr>
          <th className="col-ref" rowSpan={2}>REF</th>
          <th className="col-libelle" rowSpan={2}>ACTIF</th>
          <th className="col-note" rowSpan={2}>Note</th>
          <th className="col-montant-group" colSpan={3}>EXERCICE AU 31/12/{annee}</th>
          <th className="col-montant" rowSpan={2}>EXERCICE AU 31/12/{annee - 1}<br/>NET</th>
        </tr>
        <tr>
          <th className="col-montant">Brut</th>
          <th className="col-montant">Amort. et deprec.</th>
          <th className="col-montant">Net</th>
        </tr>
      </thead>
      <tbody>
        {ACTIF_ROWS.map((row: BilanRow, i: number) => {
          const rowClass = row.type === 'subsection' ? 'row-subsection'
            : row.type === 'total' ? 'row-total'
            : row.type === 'subtotal' ? 'row-subtotal'
            : 'row-indent';

          const ref = row.ref || '';
          const isComputed = row.type === 'subtotal' || row.type === 'total';

          let brut: number;
          let amort: number;
          let netN: number;
          let netN1: number;
          if (isComputed) {
            brut = getActifValueFor(ref, 'brut', actifN);
            amort = getActifValueFor(ref, 'amort', actifN);
            netN = getActifValueFor(ref, 'net', actifN);
            netN1 = getActifValueFor(ref, 'net', actifN1);
          } else {
            brut = actifN[ref] ? actifN[ref].brut : 0;
            amort = actifN[ref] ? actifN[ref].amort : 0;
            netN = actifN[ref] ? actifN[ref].net : 0;
            netN1 = actifN1[ref] ? actifN1[ref].net : 0;
          }

          return (
            <tr key={i} className={rowClass}>
              <td className="col-ref">{ref}</td>
              <td className="col-libelle">{row.libelle}</td>
              <td className="col-note">{row.note || ''}</td>
              <td className="col-montant">{formatMontant(brut)}</td>
              <td className="col-montant">{formatMontant(amort)}</td>
              <td className="col-montant">{formatMontant(netN)}</td>
              <td className="col-montant">{formatMontant(netN1)}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
