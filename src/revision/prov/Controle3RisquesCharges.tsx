// Contrôle 3 : provisions pour risques et charges (comptes 19x).

import React from 'react';
import { fmt, fmtInput, parseInputValue, ProvRCLigne, PROV_RC_TYPES } from '../revisionTypes';

interface Controle3Props {
  provRC: ProvRCLigne[];
  totalRCN1: number;
  totalRCDot: number;
  totalRCRep: number;
  totalRCCalc: number;
  totalRCBal: number;
  totalRCEcart: number;
  alerte196: boolean;
  updateProvRC: (idx: number, field: 'soldeN1' | 'dotation' | 'reprise', value: number) => void;
  odImpact: (compte: string) => number;
}

export function Controle3RisquesCharges(p: Controle3Props): React.ReactElement {
  const hasLignes = p.provRC.length > 0;
  return (
    <div className="revision-control">
      <div className="revision-control-title">
        <span>Contrôle 3 — Provisions pour risques et charges (19x)</span>
        {Math.abs(p.totalRCEcart) < 0.5
          ? <span className="revision-badge ok">Conforme</span>
          : <span className="revision-badge ko">Écart détecté</span>}
      </div>

      {p.alerte196 && (
        <div className="revision-alerte">
          <strong>Attention :</strong> Le compte <strong>196</strong> (Provisions pour pensions et obligations similaires / retraite) présente un solde en N-1 mais aucun mouvement (dotation ou reprise) n'a été constaté en N.
          Vérifiez si une dotation complémentaire ou une reprise est nécessaire.
        </div>
      )}

      <div className="revision-table-wrapper">
        <table className="revision-table">
          <thead>
            <tr>
              <th style={{ width: 80 }}>Compte</th>
              <th>Désignation</th>
              <th className="num editable-col" style={{ width: 120 }}>Solde N-1</th>
              <th className="num editable-col" style={{ width: 140 }}>Dotation (D 691x/C 19x)</th>
              <th className="num editable-col" style={{ width: 140 }}>Reprise (D 19x/C 791x)</th>
              <th className="num" style={{ width: 120 }}>Solde N calculé</th>
              <th className="num" style={{ width: 120 }}>Solde N balance</th>
              <th className="num" style={{ width: 100 }}>Écart</th>
            </tr>
          </thead>
          <tbody>
            {!hasLignes && (
              <tr><td colSpan={8} style={{ textAlign: 'center', color: '#999', padding: 16, fontStyle: 'italic' }}>Aucun compte 19x trouvé dans la balance N.</td></tr>
            )}
            {p.provRC.map((l, i) => {
              const ecartNet = l.ecart - p.odImpact(l.compte);
              const prefix3 = l.compte.substring(0, 3);
              const typeLabel = PROV_RC_TYPES[prefix3];
              return (
                <tr key={l.compte} className={Math.abs(ecartNet) > 0.5 ? 'ecart-row' : ''}>
                  <td className="compte" title={typeLabel || ''}>{l.compte}</td>
                  <td>{l.designation}{typeLabel && l.designation !== typeLabel ? ` — ${typeLabel}` : ''}</td>
                  <td className="editable-cell"><input type="text" inputMode="numeric" style={{ maxWidth: 'none' }} value={fmtInput(l.soldeN1)} onChange={e => p.updateProvRC(i, 'soldeN1', parseInputValue(e.target.value))} /></td>
                  <td className="editable-cell"><input type="text" inputMode="numeric" style={{ maxWidth: 'none' }} value={fmtInput(l.dotation)} onChange={e => p.updateProvRC(i, 'dotation', parseInputValue(e.target.value))} /></td>
                  <td className="editable-cell"><input type="text" inputMode="numeric" style={{ maxWidth: 'none' }} value={fmtInput(l.reprise)} onChange={e => p.updateProvRC(i, 'reprise', parseInputValue(e.target.value))} /></td>
                  <td className="num computed">{fmt(l.soldeNCalcule)}</td>
                  <td className="num">{fmt(l.soldeNBalance)}</td>
                  <td className={`num ${Math.abs(ecartNet) > 0.5 ? 'ecart-val' : 'ok-val'}`}>{fmt(ecartNet)}</td>
                </tr>
              );
            })}
          </tbody>
          {hasLignes && (
            <tfoot>
              <tr>
                <td colSpan={2}><strong>TOTAL</strong></td>
                <td className="num"><strong>{fmt(p.totalRCN1)}</strong></td>
                <td className="num"><strong>{fmt(p.totalRCDot)}</strong></td>
                <td className="num"><strong>{fmt(p.totalRCRep)}</strong></td>
                <td className="num"><strong>{fmt(p.totalRCCalc)}</strong></td>
                <td className="num"><strong>{fmt(p.totalRCBal)}</strong></td>
                <td className={`num ${Math.abs(p.totalRCEcart) > 0.5 ? 'ecart-val' : 'ok-val'}`}><strong>{fmt(p.totalRCEcart)}</strong></td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      {hasLignes && (
        <div className="revision-control-footer" style={{ marginTop: 12, padding: '10px 14px', background: '#f8f9fa', borderRadius: 6, fontSize: '12px' }}>
          <strong>Comptes de contrepartie identifiés :</strong>
          <ul style={{ margin: '6px 0 0 16px', padding: 0, listStyle: 'disc' }}>
            <li><strong>Dotations :</strong> 6911 (exploitation), 6912 (financier), 6913 (HAO)</li>
            <li><strong>Reprises :</strong> 7911 (exploitation), 7912 (financier), 7913 (HAO)</li>
          </ul>
        </div>
      )}
    </div>
  );
}
