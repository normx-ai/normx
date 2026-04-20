// Contrôle 2 : rapprochement fichier immo vs balance générale (21x-27x).

import React from 'react';
import { fmt, fmtInput, parseInputValue, RapprochLigne } from '../revisionTypes';

interface Controle2Props {
  rapprochLignes: RapprochLigne[];
  totalFichierImmo: number;
  totalBalanceImmo: number;
  totalEcartRapproch: number;
  setRapprochEdit: React.Dispatch<React.SetStateAction<Record<string, number>>>;
  setSaved: (v: boolean) => void;
}

export function Controle2Rapproch({ rapprochLignes, totalFichierImmo, totalBalanceImmo, totalEcartRapproch, setRapprochEdit, setSaved }: Controle2Props): React.ReactElement {
  const hasLignes = rapprochLignes.length > 0;
  return (
    <div className="revision-control">
      <div className="revision-control-title">
        <span>Contrôle 2 — Rapprochement fichier des immobilisations vs balance générale</span>
        {hasLignes && (Math.abs(totalEcartRapproch) < 0.5
          ? <span className="revision-badge ok">Conforme</span>
          : <span className="revision-badge ko">Écart détecté</span>)}
      </div>
      <div className="revision-ref">Comptes 20x à 27x — saisissez la valeur du fichier immo pour chaque compte</div>

      <div className="revision-table-wrapper" style={{ marginTop: 8 }}>
        <table className="revision-table">
          <thead>
            <tr>
              <th style={{ width: 90 }}>Compte</th>
              <th>Désignation</th>
              <th className="num editable-col" style={{ width: 140 }}>Fichier des immo</th>
              <th className="num" style={{ width: 140 }}>Balance générale</th>
              <th className="num" style={{ width: 120 }}>Écart</th>
              <th style={{ width: 120 }}>Observations</th>
            </tr>
          </thead>
          <tbody>
            {rapprochLignes.map(l => {
              const ecart = l.fichierImmo - l.balanceGenerale;
              return (
                <tr key={l.compte} className={Math.abs(ecart) > 0.5 ? 'ecart-row' : ''}>
                  <td className="compte">{l.compte}</td>
                  <td>{l.designation}</td>
                  <td className="editable-cell">
                    <input type="text" inputMode="numeric" value={fmtInput(l.fichierImmo)} onChange={e => {
                      const val = parseInputValue(e.target.value);
                      setRapprochEdit(prev => ({ ...prev, [l.compte]: val }));
                      setSaved(false);
                    }} style={{ maxWidth: 'none' }} />
                  </td>
                  <td className="num">{fmt(l.balanceGenerale)}</td>
                  <td className={`num ${Math.abs(ecart) > 0.5 ? 'ecart-val' : 'ok-val'}`}>{fmt(ecart)}</td>
                  <td></td>
                </tr>
              );
            })}
            {!hasLignes && (
              <tr><td colSpan={6} style={{ textAlign: 'center', color: '#999', padding: 16, fontStyle: 'italic' }}>Aucun compte d'immobilisation (21x-27x) dans la balance.</td></tr>
            )}
          </tbody>
          {hasLignes && (
            <tfoot>
              <tr>
                <td colSpan={2}><strong>Total</strong></td>
                <td className="num"><strong>{fmt(totalFichierImmo)}</strong></td>
                <td className="num"><strong>{fmt(totalBalanceImmo)}</strong></td>
                <td className={`num ${Math.abs(totalEcartRapproch) > 0.5 ? 'ecart-val' : 'ok-val'}`}><strong>{fmt(totalEcartRapproch)}</strong></td>
                <td></td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
}
