// Contrôle 1 : rapprochement PV d'inventaire vs balance générale.
// Presentation pure — les donnees et callbacks viennent du parent RevisionStocks.

import React from 'react';
import { LuPlus, LuTrash2 } from 'react-icons/lu';
import { fmt, fmtInput, parseInputValue, InvStockLigne } from '../revisionTypes';

interface Controle1Props {
  invCalcs: Array<InvStockLigne & { valeurPV: number }>;
  totalValeurPV: number;
  totalStockBalance: number;
  ecartInvBalance: number;
  addInv: () => void;
  updateInv: (id: number, field: keyof InvStockLigne, value: string | number) => void;
  removeInv: (id: number) => void;
}

export function Controle1Inventaire({
  invCalcs, totalValeurPV, totalStockBalance, ecartInvBalance,
  addInv, updateInv, removeInv,
}: Controle1Props): React.ReactElement {
  const hasLignes = invCalcs.length > 0;
  return (
    <div className="revision-control">
      <div className="revision-control-title">
        <span>Contrôle 1 — Rapprochement PV d'inventaire vs balance générale</span>
        {hasLignes && (Math.abs(ecartInvBalance) < 0.5
          ? <span className="revision-badge ok">Conforme</span>
          : <span className="revision-badge ko">Écart détecté</span>
        )}
      </div>

      <div className="revision-table-wrapper">
        <table className="revision-table">
          <thead>
            <tr>
              <th>Désignation</th>
              <th style={{ width: 90 }}>Compte</th>
              <th className="num editable-col" style={{ width: 120 }}>Coût unitaire</th>
              <th className="num editable-col" style={{ width: 100 }}>Qté PV</th>
              <th className="num" style={{ width: 130 }}>Valeur PV</th>
              <th style={{ width: 30 }}></th>
            </tr>
          </thead>
          <tbody>
            {invCalcs.map(l => (
              <tr key={l.id}>
                <td className="editable-cell"><input type="text" value={l.designation} onChange={e => updateInv(l.id, 'designation', e.target.value)} style={{ maxWidth: 'none' }} /></td>
                <td className="editable-cell"><input type="text" value={l.compte} onChange={e => updateInv(l.id, 'compte', e.target.value)} style={{ maxWidth: 'none', fontFamily: 'monospace' }} placeholder="31x..." /></td>
                <td className="editable-cell"><input type="text" inputMode="numeric" value={fmtInput(l.coutUnitaire)} onChange={e => updateInv(l.id, 'coutUnitaire', parseInputValue(e.target.value))} style={{ maxWidth: 'none' }} /></td>
                <td className="editable-cell"><input type="text" inputMode="numeric" value={l.quantitePV || ''} onChange={e => updateInv(l.id, 'quantitePV', parseInt(e.target.value) || 0)} style={{ maxWidth: 'none' }} /></td>
                <td className="num computed">{fmt(l.valeurPV)}</td>
                <td><button className="revision-od-delete" onClick={() => removeInv(l.id)} title="Supprimer"><LuTrash2 size={13} /></button></td>
              </tr>
            ))}
            {!hasLignes && (
              <tr><td colSpan={6} style={{ textAlign: 'center', color: '#999', padding: 16, fontStyle: 'italic' }}>Aucun article saisi. Ajoutez les lignes du PV d'inventaire.</td></tr>
            )}
          </tbody>
          {hasLignes && (
            <tfoot>
              <tr>
                <td colSpan={4}><strong>Total PV inventaire</strong></td>
                <td className="num"><strong>{fmt(totalValeurPV)}</strong></td>
                <td></td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      {hasLignes && (
        <div style={{ marginTop: 12, padding: '10px 14px', background: '#f8f9fa', borderRadius: 6, fontSize: '12.5px' }}>
          <table className="revision-table revision-table-small" style={{ maxWidth: 400 }}>
            <tbody>
              <tr><td>Total PV inventaire</td><td className="num"><strong>{fmt(totalValeurPV)}</strong></td></tr>
              <tr><td>Balance générale (31x-38x)</td><td className="num"><strong>{fmt(totalStockBalance)}</strong></td></tr>
              <tr><td>Écart</td><td className={`num ${Math.abs(ecartInvBalance) > 0.5 ? 'ecart-val' : 'ok-val'}`}><strong>{fmt(ecartInvBalance)}</strong></td></tr>
            </tbody>
          </table>
        </div>
      )}

      <div className="revision-od-actions">
        <button className="revision-od-add" onClick={addInv}><LuPlus size={13} /> Ajouter un article</button>
      </div>
    </div>
  );
}
