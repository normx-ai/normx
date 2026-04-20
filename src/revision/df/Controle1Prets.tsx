// Contrôle 1 : nouveaux prêts et remboursements (dettes financières 16x).

import React from 'react';
import { LuPlus, LuTrash2 } from 'react-icons/lu';
import { fmt, fmtInput, parseInputValue, PretLigne } from '../revisionTypes';

interface Controle1Props {
  pretCalcs: Array<PretLigne & { soldeN: number; balanceGenerale: number; ecart1: number; ecart2: number }>;
  prets: PretLigne[];
  totalSolde16Balance: number;
  totalPretN1: number;
  totalNouveaux: number;
  totalRembours: number;
  totalSoldeNCalc: number;
  totalPlanAmort: number;
  ecartC1Global: number;
  addPret: () => void;
  updatePret: (id: number, field: keyof PretLigne, value: string | number) => void;
  removePret: (id: number) => void;
}

export function Controle1Prets(p: Controle1Props): React.ReactElement {
  const hasLignes = p.prets.length > 0;
  return (
    <div className="revision-control">
      <div className="revision-control-title">
        <span>Contrôle 1 — Nouveaux prêts et remboursements</span>
        {hasLignes && (Math.abs(p.ecartC1Global) < 0.5
          ? <span className="revision-badge ok">Conforme</span>
          : <span className="revision-badge ko">Écart détecté</span>)}
      </div>

      <div className="revision-table-wrapper">
        <table className="revision-table">
          <thead>
            <tr>
              <th style={{ width: 90 }}>Contrat n°</th>
              <th>Bailleur de fonds</th>
              <th style={{ width: 110 }}>Date obtention</th>
              <th className="num editable-col" style={{ width: 120 }}>Solde 31/12/N-1</th>
              <th className="num editable-col" style={{ width: 120 }}>Nvx emprunts</th>
              <th className="num editable-col" style={{ width: 120 }}>Remboursement</th>
              <th className="num" style={{ width: 120 }}>Solde 31/12/N</th>
              <th className="num" style={{ width: 120 }}>Balance gén.</th>
              <th className="num" style={{ width: 90 }}>Écart 1</th>
              <th className="num editable-col" style={{ width: 120 }}>Plan amort.</th>
              <th className="num" style={{ width: 90 }}>Écart 2</th>
              <th style={{ width: 30 }}></th>
            </tr>
          </thead>
          <tbody>
            {p.pretCalcs.map(r => (
              <tr key={r.id} className={Math.abs(r.ecart1) > 0.5 ? 'ecart-row' : ''}>
                <td className="editable-cell"><input type="text" value={r.contratNo} onChange={e => p.updatePret(r.id, 'contratNo', e.target.value)} style={{ maxWidth: 'none' }} /></td>
                <td className="editable-cell"><input type="text" value={r.bailleur} onChange={e => p.updatePret(r.id, 'bailleur', e.target.value)} style={{ maxWidth: 'none' }} /></td>
                <td className="editable-cell"><input type="date" value={r.dateObtention} onChange={e => p.updatePret(r.id, 'dateObtention', e.target.value)} style={{ maxWidth: 'none' }} /></td>
                <td className="editable-cell"><input type="text" inputMode="numeric" value={fmtInput(r.soldeN1)} onChange={e => p.updatePret(r.id, 'soldeN1', parseInputValue(e.target.value))} style={{ maxWidth: 'none' }} /></td>
                <td className="editable-cell"><input type="text" inputMode="numeric" value={fmtInput(r.nouveauxEmprunts)} onChange={e => p.updatePret(r.id, 'nouveauxEmprunts', parseInputValue(e.target.value))} style={{ maxWidth: 'none' }} /></td>
                <td className="editable-cell"><input type="text" inputMode="numeric" value={fmtInput(r.remboursement)} onChange={e => p.updatePret(r.id, 'remboursement', parseInputValue(e.target.value))} style={{ maxWidth: 'none' }} /></td>
                <td className="num computed">{fmt(r.soldeN)}</td>
                <td className="num">{fmt(r.balanceGenerale)}</td>
                <td className={`num ${Math.abs(r.ecart1) > 0.5 ? 'ecart-val' : 'ok-val'}`}>{fmt(r.ecart1)}</td>
                <td className="editable-cell"><input type="text" inputMode="numeric" value={fmtInput(r.planAmort)} onChange={e => p.updatePret(r.id, 'planAmort', parseInputValue(e.target.value))} style={{ maxWidth: 'none' }} /></td>
                <td className={`num ${Math.abs(r.ecart2) > 0.5 ? 'ecart-val' : 'ok-val'}`}>{fmt(r.ecart2)}</td>
                <td><button className="revision-od-delete" onClick={() => p.removePret(r.id)} title="Supprimer"><LuTrash2 size={13} /></button></td>
              </tr>
            ))}
            {!hasLignes && (
              <tr><td colSpan={12} style={{ textAlign: 'center', color: '#999', padding: 16, fontStyle: 'italic' }}>Aucun prêt saisi. Ajoutez les prêts en cours à la clôture.</td></tr>
            )}
          </tbody>
          {hasLignes && (
            <tfoot>
              <tr>
                <td colSpan={3}><strong>Total</strong></td>
                <td className="num"><strong>{fmt(p.totalPretN1)}</strong></td>
                <td className="num"><strong>{fmt(p.totalNouveaux)}</strong></td>
                <td className="num"><strong>{fmt(p.totalRembours)}</strong></td>
                <td className="num"><strong>{fmt(p.totalSoldeNCalc)}</strong></td>
                <td className="num"><strong>{fmt(p.totalSolde16Balance)}</strong></td>
                <td className={`num ${Math.abs(p.ecartC1Global) > 0.5 ? 'ecart-val' : 'ok-val'}`}><strong>{fmt(p.ecartC1Global)}</strong></td>
                <td className="num"><strong>{fmt(p.totalPlanAmort)}</strong></td>
                <td className={`num ${Math.abs(p.totalSolde16Balance - p.totalPlanAmort) > 0.5 ? 'ecart-val' : 'ok-val'}`}><strong>{fmt(p.totalSolde16Balance - p.totalPlanAmort)}</strong></td>
                <td></td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
      <div className="revision-od-actions">
        <button className="revision-od-add" onClick={p.addPret}><LuPlus size={13} /> Ajouter un prêt</button>
      </div>
    </div>
  );
}
