// Contrôle 5 : calcul des amortissements + rapprochement avec balance 28x.

import React from 'react';
import { LuPlus, LuTrash2 } from 'react-icons/lu';
import { fmt, fmtInput, parseInputValue, AmortLigne } from '../revisionTypes';

interface Controle5Props {
  amortLignes: AmortLigne[];
  amortCalcs: Array<AmortLigne & { taux: number; cumulAmortCalc: number }>;
  totalBaseAmort: number;
  totalCumulAmortCalc: number;
  totalAmort28Balance: number;
  ecartAmort: number;
  addAmort: () => void;
  updateAmort: (id: number, field: keyof AmortLigne, value: string | number) => void;
  removeAmort: (id: number) => void;
}

export function Controle5Amort(p: Controle5Props): React.ReactElement {
  const hasLignes = p.amortLignes.length > 0;
  return (
    <div className="revision-control">
      <div className="revision-control-title">
        <span>Contrôle 5 — Vérification du calcul des amortissements</span>
        {hasLignes && (Math.abs(p.ecartAmort) < 0.5
          ? <span className="revision-badge ok">Conforme</span>
          : <span className="revision-badge ko">Écart détecté</span>)}
      </div>
      <div className="revision-ref">Dotations : D 6813 / C 28x (AO) — D 852 / C 28x (HAO). Reprises : D 28x / C 798 (AO) ou C 862 (HAO)</div>

      <div className="revision-table-wrapper" style={{ marginTop: 8 }}>
        <table className="revision-table">
          <thead>
            <tr>
              <th style={{ width: 80 }}>N° fichier</th>
              <th>Désignation</th>
              <th style={{ width: 110 }}>Mise en service</th>
              <th>Nature immo</th>
              <th className="num editable-col" style={{ width: 80 }}>Durée (ans)</th>
              <th className="num" style={{ width: 80 }}>Taux</th>
              <th className="num editable-col" style={{ width: 130 }}>Base amortissable</th>
              <th className="num" style={{ width: 130 }}>Cumul amort. calc.</th>
              <th style={{ width: 30 }}></th>
            </tr>
          </thead>
          <tbody>
            {p.amortCalcs.map(a => (
              <tr key={a.id}>
                <td className="editable-cell"><input type="text" value={a.numFichier} onChange={e => p.updateAmort(a.id, 'numFichier', e.target.value)} style={{ maxWidth: 'none', fontFamily: 'monospace' }} /></td>
                <td className="editable-cell"><input type="text" value={a.designation} onChange={e => p.updateAmort(a.id, 'designation', e.target.value)} style={{ maxWidth: 'none' }} /></td>
                <td className="editable-cell"><input type="date" value={a.dateMiseEnService} onChange={e => p.updateAmort(a.id, 'dateMiseEnService', e.target.value)} style={{ maxWidth: 'none' }} /></td>
                <td className="editable-cell"><input type="text" value={a.natureImmo} onChange={e => p.updateAmort(a.id, 'natureImmo', e.target.value)} style={{ maxWidth: 'none' }} /></td>
                <td className="editable-cell"><input type="text" inputMode="numeric" value={a.dureeUtilite || ''} onChange={e => p.updateAmort(a.id, 'dureeUtilite', parseInt(e.target.value) || 0)} style={{ maxWidth: 'none' }} /></td>
                <td className="num computed">{a.taux > 0 ? `${(a.taux * 100).toFixed(1)}%` : ''}</td>
                <td className="editable-cell"><input type="text" inputMode="numeric" value={fmtInput(a.baseAmortissable)} onChange={e => p.updateAmort(a.id, 'baseAmortissable', parseInputValue(e.target.value))} style={{ maxWidth: 'none' }} /></td>
                <td className="num computed">{fmt(a.cumulAmortCalc)}</td>
                <td><button className="revision-od-delete" onClick={() => p.removeAmort(a.id)} title="Supprimer"><LuTrash2 size={13} /></button></td>
              </tr>
            ))}
            {!hasLignes && (
              <tr><td colSpan={9} style={{ textAlign: 'center', color: '#999', padding: 16, fontStyle: 'italic' }}>Aucune immobilisation saisie pour le calcul des amortissements.</td></tr>
            )}
          </tbody>
          {hasLignes && (
            <tfoot>
              <tr>
                <td colSpan={6}><strong>Total</strong></td>
                <td className="num"><strong>{fmt(p.totalBaseAmort)}</strong></td>
                <td className="num"><strong>{fmt(p.totalCumulAmortCalc)}</strong></td>
                <td></td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      {(hasLignes || p.totalAmort28Balance !== 0) && (
        <div style={{ marginTop: 12, padding: '10px 14px', background: '#f8f9fa', borderRadius: 6, fontSize: '12.5px' }}>
          <table className="revision-table revision-table-small" style={{ maxWidth: 420 }}>
            <tbody>
              <tr><td>Cumul amort. calculé (Contrôle 5)</td><td className="num"><strong>{fmt(p.totalCumulAmortCalc)}</strong></td></tr>
              <tr><td>Solde 28x en balance</td><td className="num"><strong>{fmt(p.totalAmort28Balance)}</strong></td></tr>
              <tr><td>Écart</td><td className={`num ${Math.abs(p.ecartAmort) > 0.5 ? 'ecart-val' : 'ok-val'}`}><strong>{fmt(p.ecartAmort)}</strong></td></tr>
            </tbody>
          </table>
          {Math.abs(p.ecartAmort) < 0.5
            ? <span className="revision-badge ok" style={{ marginLeft: 12 }}>Conforme</span>
            : <span className="revision-badge ko" style={{ marginLeft: 12 }}>Écart</span>
          }
        </div>
      )}

      <div className="revision-od-actions">
        <button className="revision-od-add" onClick={p.addAmort}><LuPlus size={13} /> Ajouter une immobilisation</button>
      </div>
    </div>
  );
}
