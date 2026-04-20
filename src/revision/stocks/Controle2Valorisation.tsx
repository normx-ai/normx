// Contrôle 2 : test de valorisation des stocks (PEPS / CMP vs système).

import React from 'react';
import { LuPlus, LuTrash2 } from 'react-icons/lu';
import { fmt, fmtInput, parseInputValue, ValoLigne } from '../revisionTypes';

interface Controle2Props {
  valoLignes: ValoLigne[];
  valoCalcs: Array<ValoLigne & { coutRecalcule: number; coutUnitRecalcule: number; coutUnitSysteme: number; ecart: number }>;
  addValo: () => void;
  updateValo: (id: number, field: keyof ValoLigne, value: string | number) => void;
  removeValo: (id: number) => void;
}

export function Controle2Valorisation({ valoLignes, valoCalcs, addValo, updateValo, removeValo }: Controle2Props): React.ReactElement {
  const hasLignes = valoLignes.length > 0;
  return (
    <div className="revision-control">
      <div className="revision-control-title">
        <span>Contrôle 2 — Test de valorisation des stocks</span>
      </div>
      <div className="revision-ref">Méthodes : PEPS (Premier Entré Premier Sorti) ou CMP (Coût Moyen Pondéré)</div>

      <div className="revision-table-wrapper" style={{ marginTop: 8 }}>
        <table className="revision-table">
          <thead>
            <tr>
              <th style={{ width: 80 }}>Réf.</th>
              <th>Désignation</th>
              <th className="num editable-col" style={{ width: 70 }}>Qté</th>
              <th className="num editable-col" style={{ width: 110 }}>Facture princ.</th>
              <th className="num editable-col" style={{ width: 100 }}>Transport</th>
              <th className="num editable-col" style={{ width: 100 }}>Douane</th>
              <th className="num editable-col" style={{ width: 100 }}>Autres coûts</th>
              <th className="num" style={{ width: 110 }}>Coût recalculé</th>
              <th className="num editable-col" style={{ width: 110 }}>Coût système</th>
              <th className="num" style={{ width: 100 }}>Écart unit.</th>
              <th style={{ width: 30 }}></th>
            </tr>
          </thead>
          <tbody>
            {valoCalcs.map(v => (
              <tr key={v.id} className={Math.abs(v.ecart) > 0.5 ? 'ecart-row' : ''}>
                <td className="editable-cell"><input type="text" value={v.reference} onChange={e => updateValo(v.id, 'reference', e.target.value)} style={{ maxWidth: 'none', fontFamily: 'monospace' }} /></td>
                <td className="editable-cell"><input type="text" value={v.designation} onChange={e => updateValo(v.id, 'designation', e.target.value)} style={{ maxWidth: 'none' }} /></td>
                <td className="editable-cell"><input type="text" inputMode="numeric" value={v.quantite || ''} onChange={e => updateValo(v.id, 'quantite', parseInt(e.target.value) || 0)} style={{ maxWidth: 'none' }} /></td>
                <td className="editable-cell"><input type="text" inputMode="numeric" value={fmtInput(v.facturePrincipale)} onChange={e => updateValo(v.id, 'facturePrincipale', parseInputValue(e.target.value))} style={{ maxWidth: 'none' }} /></td>
                <td className="editable-cell"><input type="text" inputMode="numeric" value={fmtInput(v.transport)} onChange={e => updateValo(v.id, 'transport', parseInputValue(e.target.value))} style={{ maxWidth: 'none' }} /></td>
                <td className="editable-cell"><input type="text" inputMode="numeric" value={fmtInput(v.douane)} onChange={e => updateValo(v.id, 'douane', parseInputValue(e.target.value))} style={{ maxWidth: 'none' }} /></td>
                <td className="editable-cell"><input type="text" inputMode="numeric" value={fmtInput(v.autresCouts)} onChange={e => updateValo(v.id, 'autresCouts', parseInputValue(e.target.value))} style={{ maxWidth: 'none' }} /></td>
                <td className="num computed">{fmt(v.coutRecalcule)}</td>
                <td className="editable-cell"><input type="text" inputMode="numeric" value={fmtInput(v.coutSysteme)} onChange={e => updateValo(v.id, 'coutSysteme', parseInputValue(e.target.value))} style={{ maxWidth: 'none' }} /></td>
                <td className={`num ${Math.abs(v.ecart) > 0.5 ? 'ecart-val' : 'ok-val'}`}>{fmt(v.ecart)}</td>
                <td><button className="revision-od-delete" onClick={() => removeValo(v.id)} title="Supprimer"><LuTrash2 size={13} /></button></td>
              </tr>
            ))}
            {!hasLignes && (
              <tr><td colSpan={11} style={{ textAlign: 'center', color: '#999', padding: 16, fontStyle: 'italic' }}>Aucun test de valorisation saisi.</td></tr>
            )}
          </tbody>
          {hasLignes && (
            <tfoot>
              <tr>
                <td colSpan={3}><strong>Total</strong></td>
                <td className="num"><strong>{fmt(valoLignes.reduce((s, v) => s + v.facturePrincipale, 0))}</strong></td>
                <td className="num"><strong>{fmt(valoLignes.reduce((s, v) => s + v.transport, 0))}</strong></td>
                <td className="num"><strong>{fmt(valoLignes.reduce((s, v) => s + v.douane, 0))}</strong></td>
                <td className="num"><strong>{fmt(valoLignes.reduce((s, v) => s + v.autresCouts, 0))}</strong></td>
                <td className="num"><strong>{fmt(valoCalcs.reduce((s, v) => s + v.coutRecalcule, 0))}</strong></td>
                <td className="num"><strong>{fmt(valoLignes.reduce((s, v) => s + v.coutSysteme, 0))}</strong></td>
                <td></td>
                <td></td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
      <div className="revision-od-actions">
        <button className="revision-od-add" onClick={addValo}><LuPlus size={13} /> Ajouter un test</button>
      </div>
    </div>
  );
}
