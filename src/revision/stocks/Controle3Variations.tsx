// Contrôle 3 : variations bilantielles (31x-38x) vs compte de résultat (603x / 73x).

import React from 'react';
import { fmt, fmtInput, parseInputValue, VarLigne } from '../revisionTypes';

interface Controle3Props {
  varLignes: VarLigne[];
  totalVarN1: number;
  totalVarVar: number;
  totalVarCalc: number;
  totalVarBal: number;
  totalVarEcart: number;
  setVarEdit: React.Dispatch<React.SetStateAction<Record<string, { soldeN1: number; variation: number }>>>;
  setSaved: (v: boolean) => void;
}

export function Controle3Variations({
  varLignes, totalVarN1, totalVarVar, totalVarCalc, totalVarBal, totalVarEcart,
  setVarEdit, setSaved,
}: Controle3Props): React.ReactElement {
  const hasLignes = varLignes.length > 0;
  return (
    <div className="revision-control">
      <div className="revision-control-title">
        <span>Contrôle 3 — Variations bilantielles vs compte de résultat</span>
        {hasLignes && (Math.abs(totalVarEcart) < 0.5
          ? <span className="revision-badge ok">Conforme</span>
          : <span className="revision-badge ko">Écart détecté</span>
        )}
      </div>
      <div className="revision-ref">Biens achetés (31x-33x, 38x) : variation 603x — Biens produits (34x-37x) : variation 73x</div>

      <div className="revision-table-wrapper" style={{ marginTop: 8 }}>
        <table className="revision-table">
          <thead>
            <tr>
              <th style={{ width: 90 }}>Compte</th>
              <th>Désignation</th>
              <th className="num editable-col" style={{ width: 130 }}>Solde N-1</th>
              <th className="num editable-col" style={{ width: 130 }}>Variation (603/73)</th>
              <th className="num" style={{ width: 130 }}>Solde N calculé</th>
              <th className="num" style={{ width: 130 }}>Balance N</th>
              <th className="num" style={{ width: 100 }}>Écart</th>
            </tr>
          </thead>
          <tbody>
            {varLignes.map(l => {
              const ecart = l.soldeNBalance - l.soldeNCalc;
              return (
                <tr key={l.compte} className={Math.abs(ecart) > 0.5 ? 'ecart-row' : ''}>
                  <td className="compte">{l.compte}</td>
                  <td>{l.designation}</td>
                  <td className="editable-cell">
                    <input type="text" inputMode="numeric" value={fmtInput(l.soldeN1)} onChange={e => {
                      const val = parseInputValue(e.target.value);
                      setVarEdit(prev => ({ ...prev, [l.compte]: { ...prev[l.compte], soldeN1: val, variation: prev[l.compte]?.variation ?? 0 } }));
                      setSaved(false);
                    }} style={{ maxWidth: 'none' }} />
                  </td>
                  <td className="editable-cell">
                    <input type="text" inputMode="numeric" value={fmtInput(l.variation603ou73)} onChange={e => {
                      const val = parseInputValue(e.target.value);
                      setVarEdit(prev => ({ ...prev, [l.compte]: { soldeN1: prev[l.compte]?.soldeN1 ?? l.soldeN1, variation: val } }));
                      setSaved(false);
                    }} style={{ maxWidth: 'none' }} />
                  </td>
                  <td className="num computed">{fmt(l.soldeN1 + l.variation603ou73)}</td>
                  <td className="num">{fmt(l.soldeNBalance)}</td>
                  <td className={`num ${Math.abs(ecart) > 0.5 ? 'ecart-val' : 'ok-val'}`}>{fmt(ecart)}</td>
                </tr>
              );
            })}
            {!hasLignes && (
              <tr><td colSpan={7} style={{ textAlign: 'center', color: '#999', padding: 16, fontStyle: 'italic' }}>Aucun compte de stock (31x-38x) dans la balance.</td></tr>
            )}
          </tbody>
          {hasLignes && (
            <tfoot>
              <tr>
                <td colSpan={2}><strong>Total</strong></td>
                <td className="num"><strong>{fmt(totalVarN1)}</strong></td>
                <td className="num"><strong>{fmt(totalVarVar)}</strong></td>
                <td className="num"><strong>{fmt(totalVarCalc)}</strong></td>
                <td className="num"><strong>{fmt(totalVarBal)}</strong></td>
                <td className={`num ${Math.abs(totalVarEcart) > 0.5 ? 'ecart-val' : 'ok-val'}`}><strong>{fmt(totalVarEcart)}</strong></td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
}
