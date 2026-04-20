// Contrôle 1 : réconciliation balance auxiliaire fournisseurs vs compta générale.

import React from 'react';
import { LuPlus, LuTrash2 } from 'react-icons/lu';
import { fmt, fmtInput, parseInputValue, ReconFournLigne } from '../revisionTypes';

interface Controle1Props {
  reconLignes: ReconFournLigne[];
  totalSolde: number;
  totalReconcilie: number;
  totalEcartRecon: number;
  addRecon: () => void;
  updateRecon: (id: number, field: keyof ReconFournLigne, value: string | number) => void;
  removeRecon: (id: number) => void;
}

export function Controle1Recon({ reconLignes, totalSolde, totalReconcilie, totalEcartRecon, addRecon, updateRecon, removeRecon }: Controle1Props): React.ReactElement {
  const hasLignes = reconLignes.length > 0;
  return (
    <div className="revision-control">
      <div className="revision-control-title">
        <span>Contrôle 1 — Réconciliation des comptes fournisseurs</span>
        {hasLignes && (Math.abs(totalEcartRecon) < 0.5
          ? <span className="revision-badge ok">Conforme</span>
          : <span className="revision-badge ko">Écart détecté</span>)}
      </div>
      <div className="revision-ref">Balance auxiliaire fournisseurs vs comptabilité générale (401, 402)</div>

      <div className="revision-table-wrapper" style={{ marginTop: 8 }}>
        <table className="revision-table">
          <thead>
            <tr>
              <th style={{ width: 90 }}>Code fourn.</th>
              <th>Désignation</th>
              <th className="num editable-col" style={{ width: 130 }}>Solde au 31/12/N</th>
              <th className="num editable-col" style={{ width: 130 }}>Solde réconcilié</th>
              <th className="num" style={{ width: 100 }}>Écart</th>
              <th style={{ width: 150 }}>Commentaire</th>
              <th style={{ width: 30 }}></th>
            </tr>
          </thead>
          <tbody>
            {reconLignes.map(l => {
              const ecart = l.soldeReconcilie - l.solde3112;
              return (
                <tr key={l.id} className={Math.abs(ecart) > 0.5 ? 'ecart-row' : ''}>
                  <td className="editable-cell"><input type="text" value={l.codeFourn} onChange={e => updateRecon(l.id, 'codeFourn', e.target.value)} style={{ maxWidth: 'none', fontFamily: 'monospace' }} /></td>
                  <td className="editable-cell"><input type="text" value={l.designation} onChange={e => updateRecon(l.id, 'designation', e.target.value)} style={{ maxWidth: 'none' }} /></td>
                  <td className="editable-cell"><input type="text" inputMode="numeric" value={fmtInput(l.solde3112)} onChange={e => updateRecon(l.id, 'solde3112', parseInputValue(e.target.value))} style={{ maxWidth: 'none' }} /></td>
                  <td className="editable-cell"><input type="text" inputMode="numeric" value={fmtInput(l.soldeReconcilie)} onChange={e => updateRecon(l.id, 'soldeReconcilie', parseInputValue(e.target.value))} style={{ maxWidth: 'none' }} /></td>
                  <td className={`num ${Math.abs(ecart) > 0.5 ? 'ecart-val' : 'ok-val'}`}>{fmt(ecart)}</td>
                  <td className="editable-cell"><input type="text" value={l.commentaire} onChange={e => updateRecon(l.id, 'commentaire', e.target.value)} style={{ maxWidth: 'none', fontSize: '11px' }} /></td>
                  <td><button className="revision-od-delete" onClick={() => removeRecon(l.id)} title="Supprimer"><LuTrash2 size={13} /></button></td>
                </tr>
              );
            })}
            {!hasLignes && (
              <tr><td colSpan={7} style={{ textAlign: 'center', color: '#999', padding: 16, fontStyle: 'italic' }}>Aucun fournisseur saisi. Ajoutez les principaux fournisseurs à réconcilier.</td></tr>
            )}
          </tbody>
          {hasLignes && (
            <tfoot>
              <tr>
                <td colSpan={2}><strong>Total</strong></td>
                <td className="num"><strong>{fmt(totalSolde)}</strong></td>
                <td className="num"><strong>{fmt(totalReconcilie)}</strong></td>
                <td className={`num ${Math.abs(totalEcartRecon) > 0.5 ? 'ecart-val' : 'ok-val'}`}><strong>{fmt(totalEcartRecon)}</strong></td>
                <td colSpan={2}></td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
      <div className="revision-od-actions">
        <button className="revision-od-add" onClick={addRecon}><LuPlus size={13} /> Ajouter un fournisseur</button>
      </div>
    </div>
  );
}
