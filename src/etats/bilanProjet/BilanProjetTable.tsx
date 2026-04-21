// Table du Bilan Projet reutilisable (ACTIF ou PASSIF — meme structure).

import React from 'react';
import { BilanProjetRow, formatMontant } from './bilanProjetData';

interface Props {
  rows: BilanProjetRow[];
  valsN: Record<string, number>;
  valsN1: Record<string, number>;
  headerLabel: string;
  annee: number;
}

export function BilanProjetTable({ rows, valsN, valsN1, headerLabel, annee }: Props): React.JSX.Element {
  return (
    <table className="bilan-table">
      <thead>
        <tr>
          <th className="col-ref">REF</th>
          <th className="col-libelle">{headerLabel}</th>
          <th className="col-montant">EXERCICE AU 31/12/{annee}<br/>NET</th>
          <th className="col-montant">EXERCICE AU 31/12/{annee - 1}<br/>NET</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row, i) => {
          const rowClass = row.type === 'header' ? 'row-section'
            : row.type === 'total' ? 'row-total'
            : row.type === 'subtotal' ? 'row-subtotal'
            : 'row-indent';
          const valN = row.ref ? (valsN[row.ref] || 0) : 0;
          const valN1 = row.ref ? (valsN1[row.ref] || 0) : 0;

          return (
            <tr key={i} className={rowClass}>
              <td className="col-ref">{row.ref}</td>
              <td className="col-libelle">{row.libelle}</td>
              <td className="col-montant">{row.type !== 'header' ? formatMontant(valN) : ''}</td>
              <td className="col-montant">{row.type !== 'header' ? formatMontant(valN1) : ''}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
