// Contrôle 3 : immobilisations en cours (219x, 229x, 239x, 249x, avances 25x).

import React from 'react';
import { LuPlus, LuTrash2 } from 'react-icons/lu';
import { fmt, fmtInput, parseInputValue, EncoursLigne } from '../revisionTypes';

interface Controle3Props {
  encoursLignes: EncoursLigne[];
  addEncours: () => void;
  updateEncours: (id: number, field: keyof EncoursLigne, value: string | number) => void;
  removeEncours: (id: number) => void;
}

export function Controle3Encours({ encoursLignes, addEncours, updateEncours, removeEncours }: Controle3Props): React.ReactElement {
  const hasLignes = encoursLignes.length > 0;
  return (
    <div className="revision-control">
      <div className="revision-control-title">
        <span>Contrôle 3 — Vérification des immobilisations en cours</span>
      </div>
      <div className="revision-ref">Comptes 219x, 229x, 239x, 249x — avances et acomptes (25x)</div>

      <div className="revision-table-wrapper" style={{ marginTop: 8 }}>
        <table className="revision-table">
          <thead>
            <tr>
              <th style={{ width: 90 }}>Projet</th>
              <th>Désignation</th>
              <th>Fournisseur</th>
              <th style={{ width: 100 }}>N° facture</th>
              <th style={{ width: 110 }}>Date facture</th>
              <th className="num editable-col" style={{ width: 130 }}>Montant</th>
              <th style={{ width: 30 }}></th>
            </tr>
          </thead>
          <tbody>
            {encoursLignes.map(l => (
              <tr key={l.id}>
                <td className="editable-cell"><input type="text" value={l.projet} onChange={e => updateEncours(l.id, 'projet', e.target.value)} style={{ maxWidth: 'none', fontFamily: 'monospace' }} /></td>
                <td className="editable-cell"><input type="text" value={l.designation} onChange={e => updateEncours(l.id, 'designation', e.target.value)} style={{ maxWidth: 'none' }} /></td>
                <td className="editable-cell"><input type="text" value={l.fournisseur} onChange={e => updateEncours(l.id, 'fournisseur', e.target.value)} style={{ maxWidth: 'none' }} /></td>
                <td className="editable-cell"><input type="text" value={l.numFacture} onChange={e => updateEncours(l.id, 'numFacture', e.target.value)} style={{ maxWidth: 'none', fontFamily: 'monospace' }} /></td>
                <td className="editable-cell"><input type="date" value={l.dateFacture} onChange={e => updateEncours(l.id, 'dateFacture', e.target.value)} style={{ maxWidth: 'none' }} /></td>
                <td className="editable-cell"><input type="text" inputMode="numeric" value={fmtInput(l.montant)} onChange={e => updateEncours(l.id, 'montant', parseInputValue(e.target.value))} style={{ maxWidth: 'none' }} /></td>
                <td><button className="revision-od-delete" onClick={() => removeEncours(l.id)} title="Supprimer"><LuTrash2 size={13} /></button></td>
              </tr>
            ))}
            {!hasLignes && (
              <tr><td colSpan={7} style={{ textAlign: 'center', color: '#999', padding: 16, fontStyle: 'italic' }}>Aucun encours saisi.</td></tr>
            )}
          </tbody>
          {hasLignes && (
            <tfoot>
              <tr>
                <td colSpan={5}><strong>Total</strong></td>
                <td className="num"><strong>{fmt(encoursLignes.reduce((s, l) => s + l.montant, 0))}</strong></td>
                <td></td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
      <div className="revision-od-actions">
        <button className="revision-od-add" onClick={addEncours}><LuPlus size={13} /> Ajouter un encours</button>
      </div>
    </div>
  );
}
