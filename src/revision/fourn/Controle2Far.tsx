// Contrôle 2 : factures a recevoir (compte 408).

import React from 'react';
import { LuPlus, LuTrash2 } from 'react-icons/lu';
import { fmt, fmtInput, parseInputValue, FarLigne } from '../revisionTypes';

interface Controle2Props {
  farLignes: FarLigne[];
  totalFarMontant: number;
  totalFar408Balance: number;
  ecartFar: number;
  addFar: () => void;
  updateFar: (id: number, field: keyof FarLigne, value: string | number) => void;
  removeFar: (id: number) => void;
}

export function Controle2Far({ farLignes, totalFarMontant, totalFar408Balance, ecartFar, addFar, updateFar, removeFar }: Controle2Props): React.ReactElement {
  const hasLignes = farLignes.length > 0;
  return (
    <div className="revision-control">
      <div className="revision-control-title">
        <span>Contrôle 2 — Charges à payer / Factures non parvenues</span>
        {hasLignes && (Math.abs(ecartFar) < 0.5
          ? <span className="revision-badge ok">Conforme</span>
          : <span className="revision-badge ko">Écart détecté</span>)}
      </div>
      <div className="revision-ref">Comptes 408x — D achats (6xx) + D TVA (4455) / C 408</div>

      <div className="revision-table-wrapper" style={{ marginTop: 8 }}>
        <table className="revision-table">
          <thead>
            <tr>
              <th style={{ width: 100 }}>N° commande</th>
              <th>Libellé prestation</th>
              <th style={{ width: 140 }}>Doc. justificatif</th>
              <th className="num editable-col" style={{ width: 130 }}>Montant</th>
              <th style={{ width: 30 }}></th>
            </tr>
          </thead>
          <tbody>
            {farLignes.map(l => (
              <tr key={l.id}>
                <td className="editable-cell"><input type="text" value={l.numCommande} onChange={e => updateFar(l.id, 'numCommande', e.target.value)} style={{ maxWidth: 'none', fontFamily: 'monospace' }} /></td>
                <td className="editable-cell"><input type="text" value={l.libellePrestation} onChange={e => updateFar(l.id, 'libellePrestation', e.target.value)} style={{ maxWidth: 'none' }} /></td>
                <td className="editable-cell"><input type="text" value={l.docJustificatif} onChange={e => updateFar(l.id, 'docJustificatif', e.target.value)} style={{ maxWidth: 'none', fontSize: '11px' }} placeholder="BL, contrat..." /></td>
                <td className="editable-cell"><input type="text" inputMode="numeric" value={fmtInput(l.montant)} onChange={e => updateFar(l.id, 'montant', parseInputValue(e.target.value))} style={{ maxWidth: 'none' }} /></td>
                <td><button className="revision-od-delete" onClick={() => removeFar(l.id)} title="Supprimer"><LuTrash2 size={13} /></button></td>
              </tr>
            ))}
            {!hasLignes && (
              <tr><td colSpan={5} style={{ textAlign: 'center', color: '#999', padding: 16, fontStyle: 'italic' }}>Aucune facture à recevoir saisie.</td></tr>
            )}
          </tbody>
          {hasLignes && (
            <tfoot>
              <tr>
                <td colSpan={3}><strong>Total</strong></td>
                <td className="num"><strong>{fmt(totalFarMontant)}</strong></td>
                <td></td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      {(hasLignes || totalFar408Balance !== 0) && (
        <div style={{ marginTop: 12, padding: '10px 14px', background: '#f8f9fa', borderRadius: 6, fontSize: '12.5px' }}>
          <table className="revision-table revision-table-small" style={{ maxWidth: 400 }}>
            <tbody>
              <tr><td>Total FAR (Contrôle 2)</td><td className="num"><strong>{fmt(totalFarMontant)}</strong></td></tr>
              <tr><td>Balance 408x</td><td className="num"><strong>{fmt(totalFar408Balance)}</strong></td></tr>
              <tr><td>Écart</td><td className={`num ${Math.abs(ecartFar) > 0.5 ? 'ecart-val' : 'ok-val'}`}><strong>{fmt(ecartFar)}</strong></td></tr>
            </tbody>
          </table>
        </div>
      )}

      <div className="revision-od-actions">
        <button className="revision-od-add" onClick={addFar}><LuPlus size={13} /> Ajouter une FAR</button>
      </div>
    </div>
  );
}
