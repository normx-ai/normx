// Contrôle 3 : intérêts courus (compte 166x au bilan).

import React from 'react';
import { LuPlus, LuTrash2 } from 'react-icons/lu';
import { fmt, fmtInput, parseInputValue, InteretCoururLigne } from '../revisionTypes';

interface Controle3Props {
  couruCalcs: Array<InteretCoururLigne & { decalage: number; interetsCourus: number; balanceGenerale: number; ecart: number }>;
  interetsCourus: InteretCoururLigne[];
  totalCouruMensuel: number;
  totalCouruCalc: number;
  totalCouruBalance: number;
  addCouru: () => void;
  updateCouru: (id: number, field: keyof InteretCoururLigne, value: string | number) => void;
  removeCouru: (id: number) => void;
}

export function Controle3Courus(p: Controle3Props): React.ReactElement {
  const hasLignes = p.interetsCourus.length > 0;
  return (
    <div className="revision-control">
      <div className="revision-control-title">
        <span>Contrôle 3 — Intérêts courus</span>
        {hasLignes && (Math.abs(p.totalCouruBalance - p.totalCouruCalc) < 0.5
          ? <span className="revision-badge ok">Conforme</span>
          : <span className="revision-badge ko">Écart détecté</span>)}
      </div>

      <div className="revision-table-wrapper">
        <table className="revision-table">
          <thead>
            <tr>
              <th style={{ width: 90 }}>Contrat n°</th>
              <th>Bailleur de fonds</th>
              <th style={{ width: 90 }}>Compte</th>
              <th style={{ width: 110 }}>Date échéance</th>
              <th style={{ width: 110 }}>Fin de mois</th>
              <th className="num" style={{ width: 80 }}>Décalage (j)</th>
              <th className="num editable-col" style={{ width: 120 }}>Intérêts mens.</th>
              <th className="num" style={{ width: 120 }}>Int. courus calc.</th>
              <th className="num" style={{ width: 120 }}>Balance gén.</th>
              <th className="num" style={{ width: 90 }}>Écart</th>
              <th style={{ width: 30 }}></th>
            </tr>
          </thead>
          <tbody>
            {p.couruCalcs.map(c => (
              <tr key={c.id} className={Math.abs(c.ecart) > 0.5 ? 'ecart-row' : ''}>
                <td className="editable-cell"><input type="text" value={c.contratNo} onChange={e => p.updateCouru(c.id, 'contratNo', e.target.value)} style={{ maxWidth: 'none' }} /></td>
                <td className="editable-cell"><input type="text" value={c.bailleur} onChange={e => p.updateCouru(c.id, 'bailleur', e.target.value)} style={{ maxWidth: 'none' }} /></td>
                <td className="editable-cell"><input type="text" value={c.compte} onChange={e => p.updateCouru(c.id, 'compte', e.target.value)} style={{ fontFamily: 'monospace', maxWidth: 90 }} /></td>
                <td className="editable-cell"><input type="date" value={c.dateEcheance} onChange={e => p.updateCouru(c.id, 'dateEcheance', e.target.value)} style={{ maxWidth: 'none' }} /></td>
                <td className="editable-cell"><input type="date" value={c.dateFinMois} onChange={e => p.updateCouru(c.id, 'dateFinMois', e.target.value)} style={{ maxWidth: 'none' }} /></td>
                <td className="num computed">{c.decalage}</td>
                <td className="editable-cell"><input type="text" inputMode="numeric" value={fmtInput(c.interetsMensuels)} onChange={e => p.updateCouru(c.id, 'interetsMensuels', parseInputValue(e.target.value))} style={{ maxWidth: 'none' }} /></td>
                <td className="num computed">{fmt(c.interetsCourus)}</td>
                <td className="num">{fmt(c.balanceGenerale)}</td>
                <td className={`num ${Math.abs(c.ecart) > 0.5 ? 'ecart-val' : 'ok-val'}`}>{fmt(c.ecart)}</td>
                <td><button className="revision-od-delete" onClick={() => p.removeCouru(c.id)} title="Supprimer"><LuTrash2 size={13} /></button></td>
              </tr>
            ))}
            {!hasLignes && (
              <tr><td colSpan={11} style={{ textAlign: 'center', color: '#999', padding: 16, fontStyle: 'italic' }}>Aucun intérêt couru saisi.</td></tr>
            )}
          </tbody>
          {hasLignes && (
            <tfoot>
              <tr>
                <td colSpan={6}><strong>Total</strong></td>
                <td className="num"><strong>{fmt(p.totalCouruMensuel)}</strong></td>
                <td className="num"><strong>{fmt(p.totalCouruCalc)}</strong></td>
                <td className="num"><strong>{fmt(p.totalCouruBalance)}</strong></td>
                <td className={`num ${Math.abs(p.totalCouruBalance - p.totalCouruCalc) > 0.5 ? 'ecart-val' : 'ok-val'}`}><strong>{fmt(p.totalCouruBalance - p.totalCouruCalc)}</strong></td>
                <td></td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
      <div className="revision-od-actions">
        <button className="revision-od-add" onClick={p.addCouru}><LuPlus size={13} /> Ajouter un intérêt couru</button>
      </div>
    </div>
  );
}
