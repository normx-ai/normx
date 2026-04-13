import React from 'react';
import { PASSIF_ROWS, type PassifResult } from './bilanSyscohadaData';
import { formatMontant } from './bilanSyscohadaCompute';

interface BilanPassifTableProps {
  passifN: Record<string, PassifResult>;
  passifN1: Record<string, PassifResult>;
  getPassifValue: (ref: string, isN1: boolean) => number;
  annee: number;
}

function BilanPassifTable({
  passifN,
  passifN1,
  getPassifValue,
  annee,
}: BilanPassifTableProps): React.JSX.Element {
  return (
    <table className="bilan-table">
      <thead>
        <tr>
          <th className="col-ref">REF</th>
          <th className="col-libelle">PASSIF</th>
          <th className="col-note">Note</th>
          <th className="col-montant">EXERCICE AU 31/12/{annee}<br />NET</th>
          <th className="col-montant">EXERCICE AU 31/12/{annee - 1}<br />NET</th>
        </tr>
      </thead>
      <tbody>
        {PASSIF_ROWS.map((row, i) => {
          const rowClass = row.type === 'total' ? 'row-total'
            : row.type === 'subtotal' ? 'row-subtotal'
            : 'row-indent';

          const ref = row.ref || '';
          const isComputed = row.type === 'subtotal' || row.type === 'total';

          let netN = isComputed ? getPassifValue(ref, false) : (passifN[ref] ? passifN[ref].net : 0);
          let netN1Val = isComputed ? getPassifValue(ref, true) : (passifN1[ref] ? passifN1[ref].net : 0);

          // CB est affiche en negatif (Apporteurs capital non appele)
          if (row.negativeRef && !isComputed) {
            netN = -netN;
            netN1Val = -netN1Val;
          }

          return (
            <tr key={i} className={rowClass}>
              <td className="col-ref">{ref}</td>
              <td className="col-libelle">{row.libelle}</td>
              <td className="col-note">{row.note || ''}</td>
              <td className="col-montant">{formatMontant(netN)}</td>
              <td className="col-montant">{formatMontant(netN1Val)}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

export default BilanPassifTable;
