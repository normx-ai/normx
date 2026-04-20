// Controle 7 : Redressements fiscaux (AMR, charges a payer 4486 / provisions 19xx).

import React from 'react';
import { LuPlus, LuTrash2 } from 'react-icons/lu';
import { RedressementLigne, fmtInput, parseInputValue } from '../revisionTypes';

interface Props {
  redressementLignes: RedressementLigne[];
  onAddRedressement: () => void;
  onUpdateRedressement: (id: number, field: keyof RedressementLigne, value: string | number) => void;
  onRemoveRedressement: (id: number) => void;
}

export function Controle7Redressements(p: Props): React.JSX.Element {
  return (
    <div className="revision-control">
      <div className="revision-control-title">
        <span>Contrôle 7 — Redressements fiscaux</span>
      </div>
      <div className="revision-ref">Suivi des redressements fiscaux — Si accepté : D 6xx / C 4486 (charges à payer) ; Si contesté : D 6591 / C 19xx (provision pour risques)</div>

      <div className="revision-table-wrapper" style={{ marginTop: 8 }}>
        <table className="revision-table">
          <thead>
            <tr>
              <th style={{ width: 140 }}>Type contrôle</th>
              <th style={{ width: 110 }}>Date contrôle</th>
              <th style={{ width: 130 }}>Référence AMR</th>
              <th style={{ width: 80 }}>Payé ?</th>
              <th className="num editable-col" style={{ width: 140 }}>Charge à payer (4486x)</th>
              <th className="num editable-col" style={{ width: 140 }}>Provision contestation (19xx)</th>
              <th style={{ width: 30 }}></th>
            </tr>
          </thead>
          <tbody>
            {p.redressementLignes.map(l => (
              <tr key={l.id}>
                <td className="editable-cell"><input type="text" value={l.typeControle} onChange={e => p.onUpdateRedressement(l.id, 'typeControle', e.target.value)} style={{ maxWidth: 'none' }} placeholder="IS, TVA, Patente..." /></td>
                <td className="editable-cell"><input type="date" value={l.dateControle} onChange={e => p.onUpdateRedressement(l.id, 'dateControle', e.target.value)} style={{ maxWidth: 'none' }} /></td>
                <td className="editable-cell"><input type="text" value={l.referenceAMR} onChange={e => p.onUpdateRedressement(l.id, 'referenceAMR', e.target.value)} style={{ maxWidth: 'none', fontFamily: 'monospace' }} placeholder="N° AMR" /></td>
                <td className="editable-cell">
                  <select value={l.paye} onChange={e => p.onUpdateRedressement(l.id, 'paye', e.target.value)} style={{ width: '100%', border: '1px solid #ddd', borderRadius: 4, padding: '2px 4px', fontSize: '12px' }}>
                    <option value="">—</option>
                    <option value="Oui">Oui</option>
                    <option value="Non">Non</option>
                  </select>
                </td>
                <td className="editable-cell"><input type="text" inputMode="numeric" value={fmtInput(l.chargeAPayer4486)} onChange={e => p.onUpdateRedressement(l.id, 'chargeAPayer4486', parseInputValue(e.target.value))} style={{ maxWidth: 'none' }} /></td>
                <td className="editable-cell"><input type="text" inputMode="numeric" value={fmtInput(l.provisionContestation19)} onChange={e => p.onUpdateRedressement(l.id, 'provisionContestation19', parseInputValue(e.target.value))} style={{ maxWidth: 'none' }} /></td>
                <td><button className="revision-od-delete" onClick={() => p.onRemoveRedressement(l.id)} title="Supprimer"><LuTrash2 size={13} /></button></td>
              </tr>
            ))}
            {p.redressementLignes.length === 0 && (
              <tr><td colSpan={7} style={{ textAlign: 'center', color: '#999', padding: 16, fontStyle: 'italic' }}>Aucun redressement fiscal à signaler.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {p.redressementLignes.length > 0 && (
        <div style={{ marginTop: 8, padding: '10px 14px', background: '#f0f4f8', borderRadius: 6, fontSize: '12.5px' }}>
          <strong>Écritures suggérées :</strong>
          <ul style={{ margin: '6px 0 0', paddingLeft: 18, lineHeight: 1.7 }}>
            <li>Si redressement <strong>accepté</strong> (payé = Oui) : <code>D 6xx (charge fiscale) / C 4486 (État, charges à payer)</code></li>
            <li>Si redressement <strong>contesté</strong> (payé = Non) : <code>D 6591 (dotation provisions litiges) / C 19xx (provisions pour risques)</code></li>
          </ul>
        </div>
      )}

      <div className="revision-od-actions">
        <button className="revision-od-add" onClick={p.onAddRedressement}><LuPlus size={13} /> Ajouter un redressement</button>
      </div>
    </div>
  );
}
