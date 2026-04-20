// Contrôle 2 : amortissements dérogatoires (biens + rapprochement vs solde 151x).

import React from 'react';
import { LuPlus, LuTrash2 } from 'react-icons/lu';
import { fmt, fmtInput, parseInputValue, AmortDerogLigne } from '../revisionTypes';

interface Controle2Props {
  amortDerog: AmortDerogLigne[];
  totalDerogVB: number;
  totalDerogAmort: number;
  totalDerogReprise: number;
  solde151Balance: number;
  ecartRapprochement: number;
  addDerogLigne: () => void;
  updateDerog: (id: number, field: keyof AmortDerogLigne, value: string | number | boolean) => void;
  removeDerog: (id: number) => void;
}

export function Controle2AmortDerog(p: Controle2Props): React.ReactElement {
  const hasLignes = p.amortDerog.length > 0;
  return (
    <div className="revision-control">
      <div className="revision-control-title">
        <span>Contrôle 2 — Spécificité amortissements dérogatoires</span>
      </div>

      <div className="revision-table-wrapper">
        <table className="revision-table">
          <thead>
            <tr>
              <th style={{ minWidth: 160 }}>Biens concernés</th>
              <th style={{ width: 100 }}>Réf. fichier immo</th>
              <th className="num" style={{ width: 130 }}>Valeur brute</th>
              <th className="num" style={{ width: 140 }}>Amort. dérogatoire</th>
              <th style={{ width: 90, textAlign: 'center' }}>Bien cédé ?</th>
              <th className="num" style={{ width: 140 }}>Amort. dérog. repris</th>
              <th style={{ width: 30 }}></th>
            </tr>
          </thead>
          <tbody>
            {p.amortDerog.map(a => (
              <tr key={a.id}>
                <td className="editable-cell"><input type="text" value={a.bien} onChange={e => p.updateDerog(a.id, 'bien', e.target.value)} placeholder="Ex: Matériel industriel" style={{ maxWidth: 'none' }} /></td>
                <td className="editable-cell"><input type="text" value={a.refImmo} onChange={e => p.updateDerog(a.id, 'refImmo', e.target.value)} placeholder="N° réf" style={{ fontFamily: 'monospace', maxWidth: 100 }} /></td>
                <td className="editable-cell"><input type="text" inputMode="numeric" style={{ maxWidth: 'none' }} value={fmtInput(a.valeurBrute)} onChange={e => p.updateDerog(a.id, 'valeurBrute', parseInputValue(e.target.value))} /></td>
                <td className="editable-cell"><input type="text" inputMode="numeric" style={{ maxWidth: 'none' }} value={fmtInput(a.amortDerog)} onChange={e => p.updateDerog(a.id, 'amortDerog', parseInputValue(e.target.value))} /></td>
                <td style={{ textAlign: 'center' }}>
                  <select value={a.cede ? 'Oui' : 'Non'} onChange={e => p.updateDerog(a.id, 'cede', e.target.value === 'Oui')} style={{ padding: '3px 6px', borderRadius: 4, border: '1px solid #ddd', width: '100%' }}>
                    <option value="Non">Non</option>
                    <option value="Oui">Oui</option>
                  </select>
                </td>
                <td className="editable-cell"><input type="text" inputMode="numeric" style={{ maxWidth: 'none' }} value={a.cede ? fmtInput(a.repriseDerog) : 'N/A'} disabled={!a.cede} onChange={e => p.updateDerog(a.id, 'repriseDerog', parseInputValue(e.target.value))} /></td>
                <td><button className="revision-od-delete" onClick={() => p.removeDerog(a.id)} title="Supprimer"><LuTrash2 size={13} /></button></td>
              </tr>
            ))}
            {!hasLignes && (
              <tr><td colSpan={7} style={{ textAlign: 'center', color: '#999', padding: 16, fontStyle: 'italic' }}>Aucun bien saisi. Ajoutez les biens concernés par les amortissements dérogatoires.</td></tr>
            )}
          </tbody>
          {hasLignes && (
            <tfoot>
              <tr>
                <td colSpan={2}><strong>Total</strong></td>
                <td className="num"><strong>{fmt(p.totalDerogVB)}</strong></td>
                <td className="num"><strong>{fmt(p.totalDerogAmort)}</strong></td>
                <td></td>
                <td className="num"><strong>{fmt(p.totalDerogReprise)}</strong></td>
                <td></td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      <div className="revision-od-actions">
        <button className="revision-od-add" onClick={p.addDerogLigne}><LuPlus size={13} /> Ajouter un bien</button>
      </div>

      {(hasLignes || p.solde151Balance !== 0) && (
        <div className="revision-control-footer" style={{ marginTop: 12, padding: '10px 14px', background: '#f8f9fa', borderRadius: 6, fontSize: '12.5px' }}>
          <table className="revision-table revision-table-small" style={{ maxWidth: 420 }}>
            <tbody>
              <tr><td>Total amort. dérogatoires (Contrôle 2)</td><td className="num"><strong>{fmt(p.totalDerogAmort - p.totalDerogReprise)}</strong></td></tr>
              <tr><td>Solde 151x en balance (Contrôle 1)</td><td className="num"><strong>{fmt(p.solde151Balance)}</strong></td></tr>
              <tr><td>Écart</td><td className={`num ${Math.abs(p.ecartRapprochement) > 0.5 ? 'ecart-val' : 'ok-val'}`}><strong>{fmt(p.ecartRapprochement)}</strong></td></tr>
            </tbody>
          </table>
          {Math.abs(p.ecartRapprochement) < 0.5
            ? <span className="revision-badge ok" style={{ marginLeft: 12 }}>Conforme</span>
            : <span className="revision-badge ko" style={{ marginLeft: 12 }}>Écart</span>
          }
        </div>
      )}
    </div>
  );
}
