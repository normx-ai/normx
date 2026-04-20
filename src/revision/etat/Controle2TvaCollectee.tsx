// Controle 2 : TVA collectee (comptes 4431/4432).

import React from 'react';
import { LuPlus, LuTrash2 } from 'react-icons/lu';
import { TVACollecteeLigne, fmt, fmtInput, parseInputValue } from '../revisionTypes';

interface Props {
  tvaCollecteeLignes: TVACollecteeLigne[];
  onAddTvaCollectee: () => void;
  onUpdateTvaCollectee: (id: number, field: keyof TVACollecteeLigne, value: string | number) => void;
  onRemoveTvaCollectee: (id: number) => void;
  totalTvaCalculee: number;
  totalTvaDeclareeCollectee: number;
  ecartTvaCollectee: number;
  total4431Balance: number;
}

export function Controle2TvaCollectee(p: Props): React.JSX.Element {
  return (
    <div className="revision-control">
      <div className="revision-control-title">
        <span>Contrôle 2 — TVA collectée</span>
        {p.tvaCollecteeLignes.length > 0 && (Math.abs(p.ecartTvaCollectee) < 0.5
          ? <span className="revision-badge ok">Conforme</span>
          : <span className="revision-badge ko">Écart détecté</span>
        )}
      </div>
      <div className="revision-ref">Comptes 4431 (TVA facturée sur ventes), 4432 — TVA calculée = Base HT x Taux TVA</div>

      <div className="revision-table-wrapper" style={{ marginTop: 8 }}>
        <table className="revision-table">
          <thead>
            <tr>
              <th>Nature</th>
              <th className="num editable-col" style={{ width: 130 }}>Base HT</th>
              <th className="num editable-col" style={{ width: 80 }}>Taux TVA %</th>
              <th className="num" style={{ width: 130 }}>TVA calculée</th>
              <th className="num editable-col" style={{ width: 130 }}>TVA déclarée</th>
              <th className="num" style={{ width: 110 }}>Écart</th>
              <th style={{ width: 30 }}></th>
            </tr>
          </thead>
          <tbody>
            {p.tvaCollecteeLignes.map(l => (
              <tr key={l.id} className={Math.abs(l.ecart) > 0.5 ? 'ecart-row' : ''}>
                <td className="editable-cell"><input type="text" value={l.nature} onChange={e => p.onUpdateTvaCollectee(l.id, 'nature', e.target.value)} style={{ maxWidth: 'none' }} /></td>
                <td className="editable-cell"><input type="text" inputMode="numeric" value={fmtInput(l.baseHT)} onChange={e => p.onUpdateTvaCollectee(l.id, 'baseHT', parseInputValue(e.target.value))} style={{ maxWidth: 'none' }} /></td>
                <td className="editable-cell"><input type="text" inputMode="numeric" value={l.tauxTVA || ''} onChange={e => p.onUpdateTvaCollectee(l.id, 'tauxTVA', parseFloat(e.target.value) || 0)} style={{ maxWidth: 'none', textAlign: 'center' }} /></td>
                <td className="num computed">{fmt(l.tvaCalculee)}</td>
                <td className="editable-cell"><input type="text" inputMode="numeric" value={fmtInput(l.tvaDeclaree)} onChange={e => p.onUpdateTvaCollectee(l.id, 'tvaDeclaree', parseInputValue(e.target.value))} style={{ maxWidth: 'none' }} /></td>
                <td className={`num ${Math.abs(l.ecart) > 0.5 ? 'ecart-val' : 'ok-val'}`}>{fmt(l.ecart)}</td>
                <td><button className="revision-od-delete" onClick={() => p.onRemoveTvaCollectee(l.id)} title="Supprimer"><LuTrash2 size={13} /></button></td>
              </tr>
            ))}
            {p.tvaCollecteeLignes.length === 0 && (
              <tr><td colSpan={7} style={{ textAlign: 'center', color: '#999', padding: 16, fontStyle: 'italic' }}>Aucune ligne de TVA collectée saisie. Ajoutez les bases HT par nature d'opération.</td></tr>
            )}
          </tbody>
          {p.tvaCollecteeLignes.length > 0 && (
            <tfoot>
              <tr>
                <td colSpan={2}><strong>Total</strong></td>
                <td></td>
                <td className="num"><strong>{fmt(p.totalTvaCalculee)}</strong></td>
                <td className="num"><strong>{fmt(p.totalTvaDeclareeCollectee)}</strong></td>
                <td className={`num ${Math.abs(p.ecartTvaCollectee) > 0.5 ? 'ecart-val' : 'ok-val'}`}><strong>{fmt(p.ecartTvaCollectee)}</strong></td>
                <td></td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      {(p.tvaCollecteeLignes.length > 0 || p.total4431Balance !== 0) && (
        <div style={{ marginTop: 12, padding: '10px 14px', background: '#f8f9fa', borderRadius: 6, fontSize: '12.5px' }}>
          <table className="revision-table revision-table-small" style={{ maxWidth: 400 }}>
            <tbody>
              <tr><td>Total TVA déclarée (Contrôle 2)</td><td className="num"><strong>{fmt(p.totalTvaDeclareeCollectee)}</strong></td></tr>
              <tr><td>Balance 4431/4432</td><td className="num"><strong>{fmt(p.total4431Balance)}</strong></td></tr>
              <tr><td>Écart</td><td className={`num ${Math.abs(p.totalTvaDeclareeCollectee - p.total4431Balance) > 0.5 ? 'ecart-val' : 'ok-val'}`}><strong>{fmt(p.totalTvaDeclareeCollectee - p.total4431Balance)}</strong></td></tr>
            </tbody>
          </table>
        </div>
      )}

      <div className="revision-od-actions">
        <button className="revision-od-add" onClick={p.onAddTvaCollectee}><LuPlus size={13} /> Ajouter une ligne TVA collectée</button>
      </div>
    </div>
  );
}
