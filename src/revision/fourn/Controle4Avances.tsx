// Contrôle 4 : avances et acomptes versés (4091).

import React from 'react';
import { LuPlus, LuTrash2 } from 'react-icons/lu';
import { fmt, fmtInput, parseInputValue, AvanceFournLigne } from '../revisionTypes';

interface Controle4Props {
  avanceLignes: AvanceFournLigne[];
  addAvance: () => void;
  updateAvance: (id: number, field: keyof AvanceFournLigne, value: string | number) => void;
  removeAvance: (id: number) => void;
}

export function Controle4Avances({ avanceLignes, addAvance, updateAvance, removeAvance }: Controle4Props): React.ReactElement {
  const hasLignes = avanceLignes.length > 0;
  return (
    <div className="revision-control">
      <div className="revision-control-title">
        <span>Contrôle 4 — Avances et acomptes versés</span>
      </div>
      <div className="revision-ref">Compte 4091 — Attention : les avances sur immobilisations doivent être en 25x, pas en 4091</div>

      <div className="revision-table-wrapper" style={{ marginTop: 8 }}>
        <table className="revision-table">
          <thead>
            <tr>
              <th style={{ width: 90 }}>Code fourn.</th>
              <th>Désignation</th>
              <th className="num editable-col" style={{ width: 130 }}>Avance</th>
              <th>Objet de l'avance</th>
              <th style={{ width: 180 }}>Conclusion</th>
              <th style={{ width: 30 }}></th>
            </tr>
          </thead>
          <tbody>
            {avanceLignes.map(l => (
              <tr key={l.id} className={l.conclusion.toLowerCase().includes('transf') ? 'revision-modified-row' : ''}>
                <td className="editable-cell"><input type="text" value={l.codeFourn} onChange={e => updateAvance(l.id, 'codeFourn', e.target.value)} style={{ maxWidth: 'none', fontFamily: 'monospace' }} /></td>
                <td className="editable-cell"><input type="text" value={l.designation} onChange={e => updateAvance(l.id, 'designation', e.target.value)} style={{ maxWidth: 'none' }} /></td>
                <td className="editable-cell"><input type="text" inputMode="numeric" value={fmtInput(l.avance)} onChange={e => updateAvance(l.id, 'avance', parseInputValue(e.target.value))} style={{ maxWidth: 'none' }} /></td>
                <td className="editable-cell"><input type="text" value={l.objetAvance} onChange={e => updateAvance(l.id, 'objetAvance', e.target.value)} style={{ maxWidth: 'none' }} /></td>
                <td className="editable-cell"><input type="text" value={l.conclusion} onChange={e => updateAvance(l.id, 'conclusion', e.target.value)} style={{ maxWidth: 'none', fontSize: '11px' }} placeholder="OK / Transférer en 25x..." /></td>
                <td><button className="revision-od-delete" onClick={() => removeAvance(l.id)} title="Supprimer"><LuTrash2 size={13} /></button></td>
              </tr>
            ))}
            {!hasLignes && (
              <tr><td colSpan={6} style={{ textAlign: 'center', color: '#999', padding: 16, fontStyle: 'italic' }}>Aucune avance fournisseur à analyser.</td></tr>
            )}
          </tbody>
          {hasLignes && (
            <tfoot>
              <tr>
                <td colSpan={2}><strong>Total</strong></td>
                <td className="num"><strong>{fmt(avanceLignes.reduce((s, l) => s + l.avance, 0))}</strong></td>
                <td colSpan={3}></td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
      <div className="revision-od-actions">
        <button className="revision-od-add" onClick={addAvance}><LuPlus size={13} /> Ajouter une avance</button>
      </div>
    </div>
  );
}
