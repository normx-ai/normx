// Contrôle 6 : charges pouvant être immobilisées (analyse des comptes 624x/625x...).

import React from 'react';
import { LuPlus, LuTrash2 } from 'react-icons/lu';
import { fmt, fmtInput, parseInputValue, ChargeImmoLigne } from '../revisionTypes';

interface Controle6Props {
  chargeImmoLignes: ChargeImmoLigne[];
  addCharge: () => void;
  updateCharge: (id: number, field: keyof ChargeImmoLigne, value: string | number) => void;
  removeCharge: (id: number) => void;
}

export function Controle6ChargesImmo({ chargeImmoLignes, addCharge, updateCharge, removeCharge }: Controle6Props): React.ReactElement {
  const hasLignes = chargeImmoLignes.length > 0;
  return (
    <div className="revision-control">
      <div className="revision-control-title">
        <span>Contrôle 6 — Analyse des charges pouvant être immobilisées</span>
      </div>
      <div className="revision-ref">Immobilisation via D 21x-24x / C 78 (Transferts de charges). Comptes courants à analyser : 624x, 625x, etc.</div>

      <div className="revision-table-wrapper" style={{ marginTop: 8 }}>
        <table className="revision-table">
          <thead>
            <tr>
              <th style={{ width: 90 }}>Compte</th>
              <th>Désignation</th>
              <th>Nature dépense</th>
              <th className="num editable-col" style={{ width: 120 }}>Montant</th>
              <th style={{ width: 110 }}>Fréquence</th>
              <th style={{ width: 140 }}>Conclusion</th>
              <th style={{ width: 30 }}></th>
            </tr>
          </thead>
          <tbody>
            {chargeImmoLignes.map(l => (
              <tr key={l.id} className={l.conclusion === 'immobiliser' ? 'revision-modified-row' : ''}>
                <td className="editable-cell"><input type="text" value={l.compte} onChange={e => updateCharge(l.id, 'compte', e.target.value)} style={{ maxWidth: 'none', fontFamily: 'monospace' }} /></td>
                <td className="editable-cell"><input type="text" value={l.designation} onChange={e => updateCharge(l.id, 'designation', e.target.value)} style={{ maxWidth: 'none' }} /></td>
                <td className="editable-cell"><input type="text" value={l.natureDepense} onChange={e => updateCharge(l.id, 'natureDepense', e.target.value)} style={{ maxWidth: 'none' }} /></td>
                <td className="editable-cell"><input type="text" inputMode="numeric" value={fmtInput(l.montant)} onChange={e => updateCharge(l.id, 'montant', parseInputValue(e.target.value))} style={{ maxWidth: 'none' }} /></td>
                <td className="editable-cell"><input type="text" value={l.frequence} onChange={e => updateCharge(l.id, 'frequence', e.target.value)} style={{ maxWidth: 'none', fontSize: '11px' }} placeholder="Annuelle, ponctuelle..." /></td>
                <td>
                  <select value={l.conclusion} onChange={e => updateCharge(l.id, 'conclusion', e.target.value)} style={{ padding: '3px 6px', borderRadius: 4, border: '1px solid #ddd', width: '100%', fontSize: '11px' }}>
                    <option value="ne_pas_immobiliser">Ne pas immobiliser</option>
                    <option value="immobiliser">À immobiliser</option>
                  </select>
                </td>
                <td><button className="revision-od-delete" onClick={() => removeCharge(l.id)} title="Supprimer"><LuTrash2 size={13} /></button></td>
              </tr>
            ))}
            {!hasLignes && (
              <tr><td colSpan={7} style={{ textAlign: 'center', color: '#999', padding: 16, fontStyle: 'italic' }}>Aucune charge analysée. Ajoutez les charges d'entretien/réparation à vérifier.</td></tr>
            )}
          </tbody>
          {hasLignes && (
            <tfoot>
              <tr>
                <td colSpan={3}><strong>Total</strong></td>
                <td className="num"><strong>{fmt(chargeImmoLignes.reduce((s, l) => s + l.montant, 0))}</strong></td>
                <td colSpan={3}>
                  <strong style={{ color: '#166534' }}>
                    À immobiliser : {fmt(chargeImmoLignes.filter(l => l.conclusion === 'immobiliser').reduce((s, l) => s + l.montant, 0))}
                  </strong>
                </td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
      <div className="revision-od-actions">
        <button className="revision-od-add" onClick={addCharge}><LuPlus size={13} /> Ajouter une charge à analyser</button>
      </div>
    </div>
  );
}
