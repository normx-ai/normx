// Contrôle 4 : validation des sorties d'immobilisations (cessions, rebuts, transferts).

import React from 'react';
import { LuPlus, LuTrash2 } from 'react-icons/lu';
import { fmt, fmtInput, parseInputValue, SortieLigne } from '../revisionTypes';

interface Controle4Props {
  sortieLignes: SortieLigne[];
  sortieCalcs: Array<SortieLigne & { vnc: number; plusMoinsValue: number }>;
  addSortie: () => void;
  updateSortie: (id: number, field: keyof SortieLigne, value: string | number) => void;
  removeSortie: (id: number) => void;
}

export function Controle4Sorties({ sortieLignes, sortieCalcs, addSortie, updateSortie, removeSortie }: Controle4Props): React.ReactElement {
  const hasLignes = sortieLignes.length > 0;
  return (
    <div className="revision-control">
      <div className="revision-control-title">
        <span>Contrôle 4 — Validation des sorties d'immobilisations</span>
      </div>
      <div className="revision-ref">Cessions : D 81 (VNC) / C immo + D 28 (amort) / C immo — Prix de cession : D tréso / C 82. Mises au rebut : même schéma avec prix = 0</div>

      <div className="revision-table-wrapper" style={{ marginTop: 8 }}>
        <table className="revision-table">
          <thead>
            <tr>
              <th style={{ width: 80 }}>N° fichier</th>
              <th>Désignation</th>
              <th style={{ width: 100 }}>Nature sortie</th>
              <th className="num editable-col" style={{ width: 120 }}>Valeur brute</th>
              <th className="num editable-col" style={{ width: 120 }}>Cumul amort.</th>
              <th className="num" style={{ width: 110 }}>VNC</th>
              <th className="num editable-col" style={{ width: 120 }}>Prix cession</th>
              <th className="num" style={{ width: 110 }}>+/- value</th>
              <th style={{ width: 120 }}>Justificatif</th>
              <th style={{ width: 30 }}></th>
            </tr>
          </thead>
          <tbody>
            {sortieCalcs.map(s => (
              <tr key={s.id} className={s.plusMoinsValue < -0.5 ? 'ecart-row' : ''}>
                <td className="editable-cell"><input type="text" value={s.numFichier} onChange={e => updateSortie(s.id, 'numFichier', e.target.value)} style={{ maxWidth: 'none', fontFamily: 'monospace' }} /></td>
                <td className="editable-cell"><input type="text" value={s.designation} onChange={e => updateSortie(s.id, 'designation', e.target.value)} style={{ maxWidth: 'none' }} /></td>
                <td>
                  <select value={s.natureSortie} onChange={e => updateSortie(s.id, 'natureSortie', e.target.value)} style={{ padding: '3px 6px', borderRadius: 4, border: '1px solid #ddd', width: '100%', fontSize: '11.5px' }}>
                    <option value="Cession">Cession</option>
                    <option value="Mise au rebut">Mise au rebut</option>
                    <option value="Transfert">Transfert</option>
                  </select>
                </td>
                <td className="editable-cell"><input type="text" inputMode="numeric" value={fmtInput(s.valeurBrute)} onChange={e => updateSortie(s.id, 'valeurBrute', parseInputValue(e.target.value))} style={{ maxWidth: 'none' }} /></td>
                <td className="editable-cell"><input type="text" inputMode="numeric" value={fmtInput(s.cumulAmort)} onChange={e => updateSortie(s.id, 'cumulAmort', parseInputValue(e.target.value))} style={{ maxWidth: 'none' }} /></td>
                <td className="num computed">{fmt(s.vnc)}</td>
                <td className="editable-cell"><input type="text" inputMode="numeric" value={fmtInput(s.prixCession)} onChange={e => updateSortie(s.id, 'prixCession', parseInputValue(e.target.value))} style={{ maxWidth: 'none' }} /></td>
                <td className={`num ${s.plusMoinsValue < -0.5 ? 'ecart-val' : s.plusMoinsValue > 0.5 ? 'ok-val' : ''}`}>{fmt(s.plusMoinsValue)}</td>
                <td className="editable-cell"><input type="text" value={s.docJustificatif} onChange={e => updateSortie(s.id, 'docJustificatif', e.target.value)} style={{ maxWidth: 'none', fontSize: '11px' }} placeholder="Facture, PV..." /></td>
                <td><button className="revision-od-delete" onClick={() => removeSortie(s.id)} title="Supprimer"><LuTrash2 size={13} /></button></td>
              </tr>
            ))}
            {!hasLignes && (
              <tr><td colSpan={10} style={{ textAlign: 'center', color: '#999', padding: 16, fontStyle: 'italic' }}>Aucune sortie saisie.</td></tr>
            )}
          </tbody>
          {hasLignes && (
            <tfoot>
              <tr>
                <td colSpan={3}><strong>Total</strong></td>
                <td className="num"><strong>{fmt(sortieLignes.reduce((s, l) => s + l.valeurBrute, 0))}</strong></td>
                <td className="num"><strong>{fmt(sortieLignes.reduce((s, l) => s + l.cumulAmort, 0))}</strong></td>
                <td className="num"><strong>{fmt(sortieCalcs.reduce((s, l) => s + l.vnc, 0))}</strong></td>
                <td className="num"><strong>{fmt(sortieLignes.reduce((s, l) => s + l.prixCession, 0))}</strong></td>
                <td className="num"><strong>{fmt(sortieCalcs.reduce((s, l) => s + l.plusMoinsValue, 0))}</strong></td>
                <td colSpan={2}></td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
      <div className="revision-od-actions">
        <button className="revision-od-add" onClick={addSortie}><LuPlus size={13} /> Ajouter une sortie</button>
      </div>
    </div>
  );
}
