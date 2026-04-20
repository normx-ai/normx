// Contrôle 6 : circularisation des fournisseurs (confirmation directe des soldes).

import React from 'react';
import { LuPlus, LuTrash2 } from 'react-icons/lu';
import { fmt, fmtInput, parseInputValue, CircuFournLigne } from '../revisionTypes';

interface Controle6Props {
  circuLignes: CircuFournLigne[];
  hasBalance401: boolean;
  addCircu: () => void;
  autoPopulate: () => void;
  updateCircu: (id: number, field: keyof CircuFournLigne, value: string | number) => void;
  removeCircu: (id: number) => void;
}

export function Controle6Circu({ circuLignes, hasBalance401, addCircu, autoPopulate, updateCircu, removeCircu }: Controle6Props): React.ReactElement {
  const hasLignes = circuLignes.length > 0;
  const totalSolde = circuLignes.reduce((s, l) => s + l.solde3112, 0);
  const totalRecon = circuLignes.reduce((s, l) => s + l.soldeReconcilie, 0);
  const ecartTotal = totalRecon - totalSolde;
  const conforme = hasLignes && circuLignes.every(l => Math.abs(l.soldeReconcilie - l.solde3112) < 0.5);

  return (
    <div className="revision-control">
      <div className="revision-control-title">
        <span>Contrôle 6 — Circularisation des fournisseurs</span>
        {hasLignes && (conforme
          ? <span className="revision-badge ok">Conforme</span>
          : <span className="revision-badge ko">Écart détecté</span>)}
      </div>
      <div className="revision-ref">Confirmation directe des soldes fournisseurs (401x) — contrôle de confirmation, pas d'OD à proposer</div>

      <div className="revision-table-wrapper" style={{ marginTop: 8 }}>
        <table className="revision-table">
          <thead>
            <tr>
              <th style={{ width: 110 }}>Code fournisseur</th>
              <th>Nom fournisseur</th>
              <th className="num" style={{ width: 140 }}>Solde au 31/12/N</th>
              <th className="num editable-col" style={{ width: 140 }}>Solde réconcilié</th>
              <th className="num" style={{ width: 110 }}>Écart</th>
              <th style={{ width: 180 }}>Commentaire</th>
              <th style={{ width: 30 }}></th>
            </tr>
          </thead>
          <tbody>
            {circuLignes.map(l => {
              const ecart = l.soldeReconcilie - l.solde3112;
              return (
                <tr key={l.id} className={Math.abs(ecart) > 0.5 ? 'ecart-row' : ''}>
                  <td className="editable-cell"><input type="text" value={l.codeFourn} onChange={e => updateCircu(l.id, 'codeFourn', e.target.value)} style={{ maxWidth: 'none', fontFamily: 'monospace' }} /></td>
                  <td className="editable-cell"><input type="text" value={l.nomFourn} onChange={e => updateCircu(l.id, 'nomFourn', e.target.value)} style={{ maxWidth: 'none' }} /></td>
                  <td className="num">{fmt(l.solde3112)}</td>
                  <td className="editable-cell"><input type="text" inputMode="numeric" value={fmtInput(l.soldeReconcilie)} onChange={e => updateCircu(l.id, 'soldeReconcilie', parseInputValue(e.target.value))} style={{ maxWidth: 'none' }} /></td>
                  <td className={`num ${Math.abs(ecart) > 0.5 ? 'ecart-val' : 'ok-val'}`}>{fmt(ecart)}</td>
                  <td className="editable-cell"><input type="text" value={l.commentaire} onChange={e => updateCircu(l.id, 'commentaire', e.target.value)} style={{ maxWidth: 'none', fontSize: '11px' }} placeholder="Réponse reçue, relance..." /></td>
                  <td><button className="revision-od-delete" onClick={() => removeCircu(l.id)} title="Supprimer"><LuTrash2 size={13} /></button></td>
                </tr>
              );
            })}
            {!hasLignes && (
              <tr><td colSpan={7} style={{ textAlign: 'center', color: '#999', padding: 16, fontStyle: 'italic' }}>Aucun fournisseur circularisé. Utilisez « Pré-remplir depuis la balance » pour importer les comptes 401x.</td></tr>
            )}
          </tbody>
          {hasLignes && (
            <tfoot>
              <tr>
                <td colSpan={2}><strong>Total</strong></td>
                <td className="num"><strong>{fmt(totalSolde)}</strong></td>
                <td className="num"><strong>{fmt(totalRecon)}</strong></td>
                <td className={`num ${Math.abs(ecartTotal) > 0.5 ? 'ecart-val' : 'ok-val'}`}><strong>{fmt(ecartTotal)}</strong></td>
                <td colSpan={2}></td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
      <div className="revision-od-actions">
        {hasBalance401 && (
          <button className="revision-od-add" onClick={autoPopulate} style={{ marginRight: 8 }}><LuPlus size={13} /> Pré-remplir depuis la balance (401x)</button>
        )}
        <button className="revision-od-add" onClick={addCircu}><LuPlus size={13} /> Ajouter un fournisseur</button>
      </div>
    </div>
  );
}
