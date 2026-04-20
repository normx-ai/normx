// Contrôle 5 : dépréciation des stocks (comparaison calcul vs balance 39x).

import React from 'react';
import { LuPlus, LuTrash2 } from 'react-icons/lu';
import { fmt, fmtInput, parseInputValue, DeprecLigne } from '../revisionTypes';

interface Controle5Props {
  deprecLignes: DeprecLigne[];
  deprecCalcs: Array<DeprecLigne & { valeurStock: number; depreciation: number }>;
  totalDeprec: number;
  totalDeprec39Balance: number;
  ecartDeprec: number;
  addDeprec: () => void;
  updateDeprec: (id: number, field: keyof DeprecLigne, value: string | number) => void;
  removeDeprec: (id: number) => void;
}

export function Controle5Depreciation({
  deprecLignes, deprecCalcs, totalDeprec, totalDeprec39Balance, ecartDeprec,
  addDeprec, updateDeprec, removeDeprec,
}: Controle5Props): React.ReactElement {
  const hasLignes = deprecLignes.length > 0;
  const showEcart = hasLignes || totalDeprec39Balance !== 0;
  return (
    <div className="revision-control">
      <div className="revision-control-title">
        <span>Contrôle 5 — Dépréciation des stocks</span>
        {hasLignes && (Math.abs(ecartDeprec) < 0.5
          ? <span className="revision-badge ok">Conforme</span>
          : <span className="revision-badge ko">Écart détecté</span>
        )}
      </div>
      <div className="revision-ref">Dotation : D 6593 / C 39x — Reprise : D 39x / C 7593 (AO). HAO : D 839 / C 39x et D 39x / C 849</div>

      <div className="revision-table-wrapper" style={{ marginTop: 8 }}>
        <table className="revision-table">
          <thead>
            <tr>
              <th>Désignation</th>
              <th style={{ width: 90 }}>Compte</th>
              <th className="num editable-col" style={{ width: 80 }}>Qté</th>
              <th className="num editable-col" style={{ width: 110 }}>Coût unit.</th>
              <th className="num" style={{ width: 120 }}>Valeur stock</th>
              <th className="num editable-col" style={{ width: 120 }}>Valeur actuelle</th>
              <th className="num" style={{ width: 120 }}>Dépréciation</th>
              <th style={{ width: 130 }}>Motif</th>
              <th style={{ width: 30 }}></th>
            </tr>
          </thead>
          <tbody>
            {deprecCalcs.map(d => (
              <tr key={d.id} className={d.depreciation > 0 ? 'ecart-row' : ''}>
                <td className="editable-cell"><input type="text" value={d.designation} onChange={e => updateDeprec(d.id, 'designation', e.target.value)} style={{ maxWidth: 'none' }} /></td>
                <td className="editable-cell"><input type="text" value={d.compte} onChange={e => updateDeprec(d.id, 'compte', e.target.value)} style={{ maxWidth: 'none', fontFamily: 'monospace' }} placeholder="39x..." /></td>
                <td className="editable-cell"><input type="text" inputMode="numeric" value={d.quantite || ''} onChange={e => updateDeprec(d.id, 'quantite', parseInt(e.target.value) || 0)} style={{ maxWidth: 'none' }} /></td>
                <td className="editable-cell"><input type="text" inputMode="numeric" value={fmtInput(d.coutUnitaire)} onChange={e => updateDeprec(d.id, 'coutUnitaire', parseInputValue(e.target.value))} style={{ maxWidth: 'none' }} /></td>
                <td className="num computed">{fmt(d.valeurStock)}</td>
                <td className="editable-cell"><input type="text" inputMode="numeric" value={fmtInput(d.valeurActuelle)} onChange={e => updateDeprec(d.id, 'valeurActuelle', parseInputValue(e.target.value))} style={{ maxWidth: 'none' }} /></td>
                <td className="num ecart-val">{fmt(d.depreciation)}</td>
                <td className="editable-cell"><input type="text" value={d.motif} onChange={e => updateDeprec(d.id, 'motif', e.target.value)} style={{ maxWidth: 'none', fontSize: '11px' }} placeholder="Rotation, prix..." /></td>
                <td><button className="revision-od-delete" onClick={() => removeDeprec(d.id)} title="Supprimer"><LuTrash2 size={13} /></button></td>
              </tr>
            ))}
            {!hasLignes && (
              <tr><td colSpan={9} style={{ textAlign: 'center', color: '#999', padding: 16, fontStyle: 'italic' }}>Aucun stock à déprécier identifié.</td></tr>
            )}
          </tbody>
          {hasLignes && (
            <tfoot>
              <tr>
                <td colSpan={4}><strong>Total</strong></td>
                <td className="num"><strong>{fmt(deprecCalcs.reduce((s, d) => s + d.valeurStock, 0))}</strong></td>
                <td className="num"><strong>{fmt(deprecLignes.reduce((s, d) => s + d.valeurActuelle, 0))}</strong></td>
                <td className="num ecart-val"><strong>{fmt(totalDeprec)}</strong></td>
                <td colSpan={2}></td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      {showEcart && (
        <div style={{ marginTop: 12, padding: '10px 14px', background: '#f8f9fa', borderRadius: 6, fontSize: '12.5px' }}>
          <table className="revision-table revision-table-small" style={{ maxWidth: 420 }}>
            <tbody>
              <tr><td>Dépréciation calculée (Contrôle 5)</td><td className="num"><strong>{fmt(totalDeprec)}</strong></td></tr>
              <tr><td>Solde 39x en balance</td><td className="num"><strong>{fmt(totalDeprec39Balance)}</strong></td></tr>
              <tr><td>Écart</td><td className={`num ${Math.abs(ecartDeprec) > 0.5 ? 'ecart-val' : 'ok-val'}`}><strong>{fmt(ecartDeprec)}</strong></td></tr>
            </tbody>
          </table>
          {Math.abs(ecartDeprec) < 0.5
            ? <span className="revision-badge ok" style={{ marginLeft: 12 }}>Conforme</span>
            : <span className="revision-badge ko" style={{ marginLeft: 12 }}>Écart</span>
          }
        </div>
      )}

      <div className="revision-od-actions">
        <button className="revision-od-add" onClick={addDeprec}><LuPlus size={13} /> Ajouter un stock à déprécier</button>
      </div>
    </div>
  );
}
