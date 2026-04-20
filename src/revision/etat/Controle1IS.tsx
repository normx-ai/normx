// Controle 1 : Verification de l'Impot sur les Societes (IS).

import React from 'react';
import { LuPlus, LuTrash2 } from 'react-icons/lu';
import { BalanceLigne } from '../../types';
import { ISVerifLigne, fmt, fmtInput, parseInputValue } from '../revisionTypes';

interface Props {
  isLignes: ISVerifLigne[];
  tauxIS: number;
  onAddIsLigne: () => void;
  onUpdateIsLigne: (id: number, field: keyof ISVerifLigne, value: string | number) => void;
  onRemoveIsLigne: (id: number) => void;
  onSetTauxIS: (v: number) => void;
  onMarkUnsaved: () => void;
  resultatFiscal: number;
  isTheorique: number;
  isComptabilise: number;
  ecartIS: number;
  total891Balance: number;
  total441Balance: number;
  comptes89: BalanceLigne[];
  soldeDebit: (lignes: BalanceLigne[]) => number;
}

export function Controle1IS(p: Props): React.JSX.Element {
  return (
    <div className="revision-control">
      <div className="revision-control-title">
        <span>Contrôle 1 — Vérification de l'Impôt sur les Sociétés (IS)</span>
        {p.isLignes.length > 0 && (Math.abs(p.ecartIS) < 0.5
          ? <span className="revision-badge ok">Conforme</span>
          : <span className="revision-badge ko">Écart détecté</span>
        )}
      </div>
      <div className="revision-ref">Comptes 891 (IS exercice), 892 (rappels IS), 895 (IMF) / 441 (État, IS à payer)</div>

      <div className="revision-table-wrapper" style={{ marginTop: 8 }}>
        <table className="revision-table">
          <thead>
            <tr>
              <th>Désignation</th>
              <th className="num editable-col" style={{ width: 160 }}>Montant</th>
              <th style={{ width: 30 }}></th>
            </tr>
          </thead>
          <tbody>
            {p.isLignes.map(l => (
              <tr key={l.id}>
                <td className="editable-cell"><input type="text" value={l.designation} onChange={e => p.onUpdateIsLigne(l.id, 'designation', e.target.value)} style={{ maxWidth: 'none' }} /></td>
                <td className="editable-cell"><input type="text" inputMode="numeric" value={fmtInput(l.montant)} onChange={e => p.onUpdateIsLigne(l.id, 'montant', parseInputValue(e.target.value))} style={{ maxWidth: 'none' }} /></td>
                <td>{l.id > 3 && <button className="revision-od-delete" onClick={() => p.onRemoveIsLigne(l.id)} title="Supprimer"><LuTrash2 size={13} /></button>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="revision-od-actions">
        <button className="revision-od-add" onClick={p.onAddIsLigne}><LuPlus size={13} /> Ajouter une ligne</button>
      </div>

      <div style={{ marginTop: 12, padding: '10px 14px', background: '#f8f9fa', borderRadius: 6, fontSize: '12.5px' }}>
        <div style={{ marginBottom: 8 }}>
          <strong>Taux IS applicable :</strong>{' '}
          <input
            type="text"
            inputMode="numeric"
            value={p.tauxIS}
            onChange={e => { p.onSetTauxIS(parseFloat(e.target.value) || 0); p.onMarkUnsaved(); }}
            style={{ width: 50, textAlign: 'center', border: '1px solid #ddd', borderRadius: 4, padding: '2px 4px' }}
          /> %
        </div>
        <table className="revision-table revision-table-small" style={{ maxWidth: 500 }}>
          <tbody>
            <tr><td>Résultat fiscal calculé</td><td className="num"><strong>{fmt(p.resultatFiscal)}</strong></td></tr>
            <tr><td>IS théorique ({p.tauxIS}%)</td><td className="num"><strong>{fmt(p.isTheorique)}</strong></td></tr>
            <tr><td>IS comptabilisé (891x balance)</td><td className="num"><strong>{fmt(p.isComptabilise)}</strong></td></tr>
            <tr><td>Écart</td><td className={`num ${Math.abs(p.ecartIS) > 0.5 ? 'ecart-val' : 'ok-val'}`}><strong>{fmt(p.ecartIS)}</strong></td></tr>
          </tbody>
        </table>
      </div>

      <div style={{ marginTop: 8, padding: '10px 14px', background: '#f0f4f8', borderRadius: 6, fontSize: '12.5px' }}>
        <strong>Rapprochement :</strong>
        <table className="revision-table revision-table-small" style={{ maxWidth: 500, marginTop: 6 }}>
          <tbody>
            <tr><td>IS théorique</td><td className="num">{fmt(p.isTheorique)}</td></tr>
            <tr><td>Solde 891 (IS en balance)</td><td className="num">{fmt(p.total891Balance)}</td></tr>
            <tr><td>Solde 441 (IS à payer en balance)</td><td className="num">{fmt(p.total441Balance)}</td></tr>
            {p.comptes89.filter(c => !c.numero_compte.startsWith('891')).map(c => (
              <tr key={c.numero_compte}>
                <td>{c.numero_compte} — {c.libelle_compte}</td>
                <td className="num">{fmt(p.soldeDebit([c]))}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
