// Contrôle 4 : autres charges d'emprunt (frais d'émission, frais bancaires...).

import React from 'react';
import { LuPlus, LuTrash2 } from 'react-icons/lu';
import { fmt, fmtInput, parseInputValue, AutreChargeLigne } from '../revisionTypes';

interface Controle4Props {
  autreCalcs: Array<AutreChargeLigne & { ecart1: number; ecart2: number }>;
  autresCharges: AutreChargeLigne[];
  totalAutreReleve: number;
  totalAutreBalance: number;
  totalAutrePlan: number;
  addAutre: () => void;
  updateAutre: (id: number, field: keyof AutreChargeLigne, value: string | number) => void;
  removeAutre: (id: number) => void;
}

export function Controle4Autres(p: Controle4Props): React.ReactElement {
  const hasLignes = p.autresCharges.length > 0;
  return (
    <div className="revision-control">
      <div className="revision-control-title">
        <span>Contrôle 4 — Autres charges d'emprunt</span>
        {hasLignes && (Math.abs(p.totalAutreReleve - p.totalAutreBalance) < 0.5
          ? <span className="revision-badge ok">Conforme</span>
          : <span className="revision-badge ko">Écart détecté</span>)}
      </div>
      <div className="revision-ref">Saisie manuelle — les comptes concernés peuvent varier (6316 frais d'émission, 6318 autres frais bancaires, etc.)</div>

      <div className="revision-table-wrapper" style={{ marginTop: 8 }}>
        <table className="revision-table">
          <thead>
            <tr>
              <th style={{ width: 90 }}>Contrat n°</th>
              <th>Bailleur de fonds</th>
              <th style={{ width: 90 }}>Compte</th>
              <th>Nature charge</th>
              <th className="num editable-col" style={{ width: 120 }}>Relevé bancaire</th>
              <th className="num editable-col" style={{ width: 120 }}>Balance</th>
              <th className="num" style={{ width: 90 }}>Écart 1</th>
              <th className="num editable-col" style={{ width: 120 }}>Plan rembours.</th>
              <th className="num" style={{ width: 90 }}>Écart 2</th>
              <th style={{ width: 30 }}></th>
            </tr>
          </thead>
          <tbody>
            {p.autreCalcs.map(a => (
              <tr key={a.id} className={Math.abs(a.ecart1) > 0.5 ? 'ecart-row' : ''}>
                <td className="editable-cell"><input type="text" value={a.contratNo} onChange={e => p.updateAutre(a.id, 'contratNo', e.target.value)} style={{ maxWidth: 'none' }} /></td>
                <td className="editable-cell"><input type="text" value={a.bailleur} onChange={e => p.updateAutre(a.id, 'bailleur', e.target.value)} style={{ maxWidth: 'none' }} /></td>
                <td className="editable-cell"><input type="text" value={a.compte} onChange={e => p.updateAutre(a.id, 'compte', e.target.value)} style={{ fontFamily: 'monospace', maxWidth: 90 }} /></td>
                <td className="editable-cell"><input type="text" value={a.natureCharge} onChange={e => p.updateAutre(a.id, 'natureCharge', e.target.value)} style={{ maxWidth: 'none' }} /></td>
                <td className="editable-cell"><input type="text" inputMode="numeric" value={fmtInput(a.releveBancaire)} onChange={e => p.updateAutre(a.id, 'releveBancaire', parseInputValue(e.target.value))} style={{ maxWidth: 'none' }} /></td>
                <td className="editable-cell"><input type="text" inputMode="numeric" value={fmtInput(a.balance)} onChange={e => p.updateAutre(a.id, 'balance', parseInputValue(e.target.value))} style={{ maxWidth: 'none' }} /></td>
                <td className={`num ${Math.abs(a.ecart1) > 0.5 ? 'ecart-val' : 'ok-val'}`}>{fmt(a.ecart1)}</td>
                <td className="editable-cell"><input type="text" inputMode="numeric" value={fmtInput(a.planRemboursement)} onChange={e => p.updateAutre(a.id, 'planRemboursement', parseInputValue(e.target.value))} style={{ maxWidth: 'none' }} /></td>
                <td className={`num ${Math.abs(a.ecart2) > 0.5 ? 'ecart-val' : 'ok-val'}`}>{fmt(a.ecart2)}</td>
                <td><button className="revision-od-delete" onClick={() => p.removeAutre(a.id)} title="Supprimer"><LuTrash2 size={13} /></button></td>
              </tr>
            ))}
            {!hasLignes && (
              <tr><td colSpan={10} style={{ textAlign: 'center', color: '#999', padding: 16, fontStyle: 'italic' }}>Aucune autre charge d'emprunt saisie.</td></tr>
            )}
          </tbody>
          {hasLignes && (
            <tfoot>
              <tr>
                <td colSpan={4}><strong>Total</strong></td>
                <td className="num"><strong>{fmt(p.totalAutreReleve)}</strong></td>
                <td className="num"><strong>{fmt(p.totalAutreBalance)}</strong></td>
                <td className={`num ${Math.abs(p.totalAutreReleve - p.totalAutreBalance) > 0.5 ? 'ecart-val' : 'ok-val'}`}><strong>{fmt(p.totalAutreReleve - p.totalAutreBalance)}</strong></td>
                <td className="num"><strong>{fmt(p.totalAutrePlan)}</strong></td>
                <td className={`num ${Math.abs(p.totalAutrePlan - p.totalAutreBalance) > 0.5 ? 'ecart-val' : 'ok-val'}`}><strong>{fmt(p.totalAutrePlan - p.totalAutreBalance)}</strong></td>
                <td></td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
      <div className="revision-od-actions">
        <button className="revision-od-add" onClick={p.addAutre}><LuPlus size={13} /> Ajouter une charge</button>
      </div>
    </div>
  );
}
