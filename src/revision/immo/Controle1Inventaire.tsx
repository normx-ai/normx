// Contrôle 1 : rapprochement fichier immo vs inventaire physique (nombres).

import React from 'react';
import { LuPlus, LuTrash2 } from 'react-icons/lu';
import { fmt, fmtInput, parseInputValue, InvLigne } from '../revisionTypes';

interface Controle1Props {
  invLignes: InvLigne[];
  addInv: () => void;
  updateInv: (id: number, field: keyof InvLigne, value: string | number) => void;
  removeInv: (id: number) => void;
}

export function Controle1Inventaire({ invLignes, addInv, updateInv, removeInv }: Controle1Props): React.ReactElement {
  const hasLignes = invLignes.length > 0;
  return (
    <div className="revision-control">
      <div className="revision-control-title">
        <span>Contrôle 1 — Rapprochement fichier des immobilisations vs inventaire physique</span>
      </div>

      <div className="revision-table-wrapper">
        <table className="revision-table">
          <thead>
            <tr>
              <th style={{ width: 90 }}>Id immo</th>
              <th>Désignation</th>
              <th className="num editable-col" style={{ width: 80 }}>Nombre</th>
              <th className="num editable-col" style={{ width: 140 }}>Valeur fichier immo</th>
              <th className="num editable-col" style={{ width: 120 }}>PV inventaire</th>
              <th className="num" style={{ width: 100 }}>Écart</th>
              <th style={{ width: 30 }}></th>
            </tr>
          </thead>
          <tbody>
            {invLignes.map(l => {
              const ecart = l.pvInventaire - l.nombre;
              return (
                <tr key={l.id} className={ecart !== 0 ? 'ecart-row' : ''}>
                  <td className="editable-cell"><input type="text" value={l.idImmo} onChange={e => updateInv(l.id, 'idImmo', e.target.value)} style={{ maxWidth: 'none', fontFamily: 'monospace' }} /></td>
                  <td className="editable-cell"><input type="text" value={l.designation} onChange={e => updateInv(l.id, 'designation', e.target.value)} style={{ maxWidth: 'none' }} /></td>
                  <td className="editable-cell"><input type="text" inputMode="numeric" value={l.nombre || ''} onChange={e => updateInv(l.id, 'nombre', parseInt(e.target.value) || 0)} style={{ maxWidth: 'none' }} /></td>
                  <td className="editable-cell"><input type="text" inputMode="numeric" value={fmtInput(l.valeurFichier)} onChange={e => updateInv(l.id, 'valeurFichier', parseInputValue(e.target.value))} style={{ maxWidth: 'none' }} /></td>
                  <td className="editable-cell"><input type="text" inputMode="numeric" value={l.pvInventaire || ''} onChange={e => updateInv(l.id, 'pvInventaire', parseInt(e.target.value) || 0)} style={{ maxWidth: 'none' }} /></td>
                  <td className={`num ${ecart !== 0 ? 'ecart-val' : 'ok-val'}`}>{ecart !== 0 ? ecart : ''}</td>
                  <td><button className="revision-od-delete" onClick={() => removeInv(l.id)} title="Supprimer"><LuTrash2 size={13} /></button></td>
                </tr>
              );
            })}
            {!hasLignes && (
              <tr><td colSpan={7} style={{ textAlign: 'center', color: '#999', padding: 16, fontStyle: 'italic' }}>Aucune immobilisation saisie. Ajoutez les éléments du fichier des immobilisations.</td></tr>
            )}
          </tbody>
          {hasLignes && (
            <tfoot>
              <tr>
                <td colSpan={3}><strong>Total</strong></td>
                <td className="num"><strong>{fmt(invLignes.reduce((s, l) => s + l.valeurFichier, 0))}</strong></td>
                <td colSpan={3}></td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
      <div className="revision-od-actions">
        <button className="revision-od-add" onClick={addInv}><LuPlus size={13} /> Ajouter une immobilisation</button>
      </div>
    </div>
  );
}
