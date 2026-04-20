// Controle 3 : TVA deductible (comptes 4451-4454).

import React from 'react';
import { LuPlus, LuTrash2 } from 'react-icons/lu';
import { TVADeductibleLigne, fmt, fmtInput, parseInputValue } from '../revisionTypes';

interface Props {
  tvaDeductibleLignes: TVADeductibleLigne[];
  onAddTvaDeductible: () => void;
  onUpdateTvaDeductible: (id: number, field: keyof TVADeductibleLigne, value: string | number) => void;
  onRemoveTvaDeductible: (id: number) => void;
  totalTvaDeclareeDeductible: number;
  totalTvaBalanceDeductible: number;
  ecartTvaDeductible: number;
}

export function Controle3TvaDeductible(p: Props): React.JSX.Element {
  return (
    <div className="revision-control">
      <div className="revision-control-title">
        <span>Contrôle 3 — TVA déductible</span>
        {p.tvaDeductibleLignes.length > 0 && (Math.abs(p.ecartTvaDeductible) < 0.5
          ? <span className="revision-badge ok">Conforme</span>
          : <span className="revision-badge ko">Écart détecté</span>
        )}
      </div>
      <div className="revision-ref">Comptes 4451 (sur immobilisations), 4452 (sur achats), 4453 (sur transports), 4454 (sur services)</div>

      <div className="revision-table-wrapper" style={{ marginTop: 8 }}>
        <table className="revision-table">
          <thead>
            <tr>
              <th>Nature</th>
              <th style={{ width: 80 }}>Compte</th>
              <th className="num editable-col" style={{ width: 140 }}>TVA déclarée</th>
              <th className="num" style={{ width: 140 }}>TVA balance</th>
              <th className="num" style={{ width: 110 }}>Écart</th>
              <th style={{ width: 30 }}></th>
            </tr>
          </thead>
          <tbody>
            {p.tvaDeductibleLignes.map(l => (
              <tr key={l.id} className={Math.abs(l.ecart) > 0.5 ? 'ecart-row' : ''}>
                <td className="editable-cell"><input type="text" value={l.nature} onChange={e => p.onUpdateTvaDeductible(l.id, 'nature', e.target.value)} style={{ maxWidth: 'none' }} /></td>
                <td className="editable-cell"><input type="text" value={l.compte} onChange={e => p.onUpdateTvaDeductible(l.id, 'compte', e.target.value)} style={{ maxWidth: 'none', fontFamily: 'monospace' }} /></td>
                <td className="editable-cell"><input type="text" inputMode="numeric" value={fmtInput(l.tvaDeclaree)} onChange={e => p.onUpdateTvaDeductible(l.id, 'tvaDeclaree', parseInputValue(e.target.value))} style={{ maxWidth: 'none' }} /></td>
                <td className="num computed">{fmt(l.tvaBalance)}</td>
                <td className={`num ${Math.abs(l.ecart) > 0.5 ? 'ecart-val' : 'ok-val'}`}>{fmt(l.ecart)}</td>
                <td><button className="revision-od-delete" onClick={() => p.onRemoveTvaDeductible(l.id)} title="Supprimer"><LuTrash2 size={13} /></button></td>
              </tr>
            ))}
            {p.tvaDeductibleLignes.length === 0 && (
              <tr><td colSpan={6} style={{ textAlign: 'center', color: '#999', padding: 16, fontStyle: 'italic' }}>Aucun compte de TVA déductible en balance.</td></tr>
            )}
          </tbody>
          {p.tvaDeductibleLignes.length > 0 && (
            <tfoot>
              <tr>
                <td colSpan={2}><strong>Total</strong></td>
                <td className="num"><strong>{fmt(p.totalTvaDeclareeDeductible)}</strong></td>
                <td className="num"><strong>{fmt(p.totalTvaBalanceDeductible)}</strong></td>
                <td className={`num ${Math.abs(p.ecartTvaDeductible) > 0.5 ? 'ecart-val' : 'ok-val'}`}><strong>{fmt(p.ecartTvaDeductible)}</strong></td>
                <td></td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
      <div className="revision-od-actions">
        <button className="revision-od-add" onClick={p.onAddTvaDeductible}><LuPlus size={13} /> Ajouter une ligne TVA déductible</button>
      </div>
    </div>
  );
}
