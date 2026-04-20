// Controle 4 : Solde de TVA (TVA due 4441 ou credit 4449).

import React from 'react';
import { TVACollecteeLigne, TVADeductibleLigne, fmt } from '../revisionTypes';

interface Props {
  tvaCollecteeLignes: TVACollecteeLigne[];
  tvaDeductibleLignes: TVADeductibleLigne[];
  totalTvaDeclareeCollectee: number;
  totalTvaDeclareeDeductible: number;
  total4431Balance: number;
  total445Balance: number;
  tvaDueTheorique: number;
  tvaDueBalance: number;
  creditTvaBalance: number;
  soldeTvaTheorique: number;
  creditTvaTheorique: number;
  ecartTvaDue: number;
  ecartCreditTva: number;
}

export function Controle4SoldeTva(p: Props): React.JSX.Element {
  return (
    <div className="revision-control">
      <div className="revision-control-title">
        <span>Contrôle 4 — Solde de TVA (TVA collectée - TVA déductible)</span>
        {(p.tvaCollecteeLignes.length > 0 || p.tvaDeductibleLignes.length > 0) && (
          Math.abs(p.ecartTvaDue) < 0.5 && Math.abs(p.ecartCreditTva) < 0.5
            ? <span className="revision-badge ok">Conforme</span>
            : <span className="revision-badge ko">Écart détecté</span>
        )}
      </div>
      <div className="revision-ref">TVA due (4441) = TVA collectée - TVA déductible ; Crédit de TVA (4449) si solde négatif</div>

      <div style={{ marginTop: 8, padding: '10px 14px', background: '#f8f9fa', borderRadius: 6, fontSize: '12.5px' }}>
        <table className="revision-table revision-table-small" style={{ maxWidth: 550 }}>
          <thead>
            <tr>
              <th></th>
              <th className="num" style={{ width: 130 }}>Théorique</th>
              <th className="num" style={{ width: 130 }}>Balance</th>
              <th className="num" style={{ width: 110 }}>Écart</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>TVA collectée (déclarée)</td>
              <td className="num">{fmt(p.totalTvaDeclareeCollectee)}</td>
              <td className="num">{fmt(p.total4431Balance)}</td>
              <td className={`num ${Math.abs(p.totalTvaDeclareeCollectee - p.total4431Balance) > 0.5 ? 'ecart-val' : 'ok-val'}`}>{fmt(p.totalTvaDeclareeCollectee - p.total4431Balance)}</td>
            </tr>
            <tr>
              <td>TVA déductible (déclarée)</td>
              <td className="num">({fmt(p.totalTvaDeclareeDeductible)})</td>
              <td className="num">({fmt(p.total445Balance)})</td>
              <td className={`num ${Math.abs(p.totalTvaDeclareeDeductible - p.total445Balance) > 0.5 ? 'ecart-val' : 'ok-val'}`}>{fmt(p.totalTvaDeclareeDeductible - p.total445Balance)}</td>
            </tr>
            <tr style={{ borderTop: '2px solid #ccc' }}>
              <td><strong>= TVA due / (Crédit TVA)</strong></td>
              <td className="num"><strong>{fmt(p.tvaDueTheorique)}</strong></td>
              <td className="num"><strong>{p.tvaDueBalance > 0 ? fmt(p.tvaDueBalance) : p.creditTvaBalance > 0 ? `(${fmt(p.creditTvaBalance)})` : ''}</strong></td>
              <td></td>
            </tr>
          </tbody>
        </table>
      </div>

      <div style={{ marginTop: 8, padding: '10px 14px', background: '#f0f4f8', borderRadius: 6, fontSize: '12.5px' }}>
        <strong>Rapprochement :</strong>
        <table className="revision-table revision-table-small" style={{ maxWidth: 500, marginTop: 6 }}>
          <tbody>
            {p.tvaDueTheorique >= 0 ? (
              <>
                <tr><td>TVA due théorique</td><td className="num">{fmt(p.soldeTvaTheorique)}</td></tr>
                <tr><td>TVA due balance (4441)</td><td className="num">{fmt(p.tvaDueBalance)}</td></tr>
                <tr><td>Écart</td><td className={`num ${Math.abs(p.ecartTvaDue) > 0.5 ? 'ecart-val' : 'ok-val'}`}><strong>{fmt(p.ecartTvaDue)}</strong></td></tr>
              </>
            ) : (
              <>
                <tr><td>Crédit TVA théorique</td><td className="num">{fmt(p.creditTvaTheorique)}</td></tr>
                <tr><td>Crédit TVA balance (4449)</td><td className="num">{fmt(p.creditTvaBalance)}</td></tr>
                <tr><td>Écart</td><td className={`num ${Math.abs(p.ecartCreditTva) > 0.5 ? 'ecart-val' : 'ok-val'}`}><strong>{fmt(p.ecartCreditTva)}</strong></td></tr>
              </>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
