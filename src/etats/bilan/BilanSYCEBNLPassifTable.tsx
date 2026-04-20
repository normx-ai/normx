// Table PASSIF du bilan SYCEBNL (colonnes Net N / Net N-1) + controle d'equilibre.

import React from 'react';
import type { BilanRow } from '../../types';
import {
  PASSIF_ROWS, ActifValues, PassifValues,
  formatMontant, getActifValueFor, getPassifValueFor,
} from './bilanSYCEBNLData';

interface Props {
  passifN: Record<string, PassifValues>;
  passifN1: Record<string, PassifValues>;
  actifN: Record<string, ActifValues>;
  annee: number;
}

export function BilanSYCEBNLPassifTable({ passifN, passifN1, actifN, annee }: Props): React.JSX.Element {
  const totalActif = getActifValueFor('BZ', 'net', actifN);
  const totalPassif = getPassifValueFor('DZ', passifN);
  const ecart = Math.abs(totalActif - totalPassif);
  const ok = ecart < 1;

  return (
    <>
      <table className="bilan-table">
        <thead>
          <tr>
            <th className="col-ref">REF</th>
            <th className="col-libelle">PASSIF</th>
            <th className="col-note">Note</th>
            <th className="col-montant">EXERCICE AU 31/12/{annee}<br/>NET</th>
            <th className="col-montant">EXERCICE AU 31/12/{annee - 1}<br/>NET</th>
          </tr>
        </thead>
        <tbody>
          {PASSIF_ROWS.map((row: BilanRow, i: number) => {
            const rowClass = row.type === 'total' ? 'row-total'
              : row.type === 'subtotal' ? 'row-subtotal'
              : 'row-indent';

            const ref = row.ref || '';
            const isComputed = row.type === 'subtotal' || row.type === 'total';

            const netN = isComputed ? getPassifValueFor(ref, passifN) : (passifN[ref] ? passifN[ref].net : 0);
            const netN1Val = isComputed ? getPassifValueFor(ref, passifN1) : (passifN1[ref] ? passifN1[ref].net : 0);

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

      <div className="bilan-equilibre">
        <span className={ok ? 'equilibre-ok' : 'equilibre-ko'}>
          {ok
            ? 'Equilibre verifie : Actif = Passif'
            : 'Ecart Actif/Passif : ' + formatMontant(ecart) + ' FCFA'
          }
        </span>
      </div>
    </>
  );
}
