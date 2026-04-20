// Controle 5 : Autres impots et taxes (44x residuels, 64x).

import React from 'react';
import { LuPlus, LuTrash2 } from 'react-icons/lu';
import { AutresImpotsLigne, fmt, fmtInput, parseInputValue } from '../revisionTypes';

interface Props {
  autresImpotsLignes: AutresImpotsLigne[];
  onAddAutresImpots: () => void;
  onUpdateAutresImpots: (id: number, field: keyof AutresImpotsLigne, value: string | number) => void;
  onRemoveAutresImpots: (id: number) => void;
}

export function Controle5AutresImpots(p: Props): React.JSX.Element {
  return (
    <div className="revision-control">
      <div className="revision-control-title">
        <span>Contrôle 5 — Autres impôts et taxes</span>
      </div>
      <div className="revision-ref">Comptes 44x résiduels + 64x (641 directs, 645 indirects, 646 droits d'enregistrement, 647 pénalités fiscales)</div>

      <div className="revision-table-wrapper" style={{ marginTop: 8 }}>
        <table className="revision-table">
          <thead>
            <tr>
              <th style={{ width: 80 }}>Compte</th>
              <th>Désignation</th>
              <th className="num" style={{ width: 130 }}>Balance</th>
              <th style={{ width: 180 }}>Justification</th>
              <th style={{ width: 160 }}>Observation</th>
              <th style={{ width: 30 }}></th>
            </tr>
          </thead>
          <tbody>
            {p.autresImpotsLignes.map(l => (
              <tr key={l.id}>
                <td className="editable-cell"><input type="text" value={l.compte} onChange={e => p.onUpdateAutresImpots(l.id, 'compte', e.target.value)} style={{ maxWidth: 'none', fontFamily: 'monospace' }} /></td>
                <td className="editable-cell"><input type="text" value={l.designation} onChange={e => p.onUpdateAutresImpots(l.id, 'designation', e.target.value)} style={{ maxWidth: 'none' }} /></td>
                <td className="editable-cell"><input type="text" inputMode="numeric" value={fmtInput(l.balance)} onChange={e => p.onUpdateAutresImpots(l.id, 'balance', parseInputValue(e.target.value))} style={{ maxWidth: 'none' }} /></td>
                <td className="editable-cell"><input type="text" value={l.justification} onChange={e => p.onUpdateAutresImpots(l.id, 'justification', e.target.value)} style={{ maxWidth: 'none', fontSize: '11px' }} placeholder="Avis d'imposition, déclaration..." /></td>
                <td className="editable-cell"><input type="text" value={l.observation} onChange={e => p.onUpdateAutresImpots(l.id, 'observation', e.target.value)} style={{ maxWidth: 'none', fontSize: '11px' }} placeholder="RAS / À régulariser..." /></td>
                <td><button className="revision-od-delete" onClick={() => p.onRemoveAutresImpots(l.id)} title="Supprimer"><LuTrash2 size={13} /></button></td>
              </tr>
            ))}
            {p.autresImpotsLignes.length === 0 && (
              <tr><td colSpan={6} style={{ textAlign: 'center', color: '#999', padding: 16, fontStyle: 'italic' }}>Aucun autre impôt ou taxe à analyser.</td></tr>
            )}
          </tbody>
          {p.autresImpotsLignes.length > 0 && (
            <tfoot>
              <tr>
                <td colSpan={2}><strong>Total</strong></td>
                <td className="num"><strong>{fmt(p.autresImpotsLignes.reduce((s, l) => s + l.balance, 0))}</strong></td>
                <td colSpan={3}></td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
      <div className="revision-od-actions">
        <button className="revision-od-add" onClick={p.onAddAutresImpots}><LuPlus size={13} /> Ajouter un impôt / taxe</button>
      </div>
    </div>
  );
}
