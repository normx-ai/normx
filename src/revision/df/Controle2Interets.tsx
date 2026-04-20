// Contrôle 2 : charges d'intérêts (compte 671).

import React from 'react';
import { LuPlus, LuTrash2 } from 'react-icons/lu';
import { fmt, fmtInput, parseInputValue, InteretLigne } from '../revisionTypes';

interface Controle2Props {
  interetCalcs: Array<InteretLigne & { ecart1: number; ecart2: number }>;
  interets: InteretLigne[];
  totalInteretCharge: number;
  totalInteretReleve: number;
  totalInteretPlan: number;
  addInteret: () => void;
  updateInteret: (id: number, field: keyof InteretLigne, value: string | number) => void;
  removeInteret: (id: number) => void;
}

export function Controle2Interets(p: Controle2Props): React.ReactElement {
  const hasLignes = p.interets.length > 0;
  return (
    <div className="revision-control">
      <div className="revision-control-title">
        <span>Contrôle 2 — Charges d'intérêts</span>
        {hasLignes && (Math.abs(p.totalInteretCharge - p.totalInteretReleve) < 0.5
          ? <span className="revision-badge ok">Conforme</span>
          : <span className="revision-badge ko">Écart détecté</span>)}
      </div>
      <div className="revision-ref">Compte de référence : 671200 — Intérêts des emprunts</div>

      <div className="revision-table-wrapper" style={{ marginTop: 8 }}>
        <table className="revision-table">
          <thead>
            <tr>
              <th style={{ width: 90 }}>Contrat n°</th>
              <th>Bailleur de fonds</th>
              <th style={{ width: 90 }}>Compte</th>
              <th className="num editable-col" style={{ width: 130 }}>Charges compt.</th>
              <th className="num editable-col" style={{ width: 130 }}>Relevé bancaire</th>
              <th className="num" style={{ width: 100 }}>Écart 1</th>
              <th className="num editable-col" style={{ width: 130 }}>Plan rembours.</th>
              <th className="num" style={{ width: 100 }}>Écart 2</th>
              <th style={{ width: 30 }}></th>
            </tr>
          </thead>
          <tbody>
            {p.interetCalcs.map(i => (
              <tr key={i.id} className={Math.abs(i.ecart1) > 0.5 ? 'ecart-row' : ''}>
                <td className="editable-cell"><input type="text" value={i.contratNo} onChange={e => p.updateInteret(i.id, 'contratNo', e.target.value)} style={{ maxWidth: 'none' }} /></td>
                <td className="editable-cell"><input type="text" value={i.bailleur} onChange={e => p.updateInteret(i.id, 'bailleur', e.target.value)} style={{ maxWidth: 'none' }} /></td>
                <td className="editable-cell"><input type="text" value={i.compte} onChange={e => p.updateInteret(i.id, 'compte', e.target.value)} style={{ fontFamily: 'monospace', maxWidth: 90 }} /></td>
                <td className="editable-cell"><input type="text" inputMode="numeric" value={fmtInput(i.chargesComptabilisees)} onChange={e => p.updateInteret(i.id, 'chargesComptabilisees', parseInputValue(e.target.value))} style={{ maxWidth: 'none' }} /></td>
                <td className="editable-cell"><input type="text" inputMode="numeric" value={fmtInput(i.releveBancaire)} onChange={e => p.updateInteret(i.id, 'releveBancaire', parseInputValue(e.target.value))} style={{ maxWidth: 'none' }} /></td>
                <td className={`num ${Math.abs(i.ecart1) > 0.5 ? 'ecart-val' : 'ok-val'}`}>{fmt(i.ecart1)}</td>
                <td className="editable-cell"><input type="text" inputMode="numeric" value={fmtInput(i.planRemboursement)} onChange={e => p.updateInteret(i.id, 'planRemboursement', parseInputValue(e.target.value))} style={{ maxWidth: 'none' }} /></td>
                <td className={`num ${Math.abs(i.ecart2) > 0.5 ? 'ecart-val' : 'ok-val'}`}>{fmt(i.ecart2)}</td>
                <td><button className="revision-od-delete" onClick={() => p.removeInteret(i.id)} title="Supprimer"><LuTrash2 size={13} /></button></td>
              </tr>
            ))}
            {!hasLignes && (
              <tr><td colSpan={9} style={{ textAlign: 'center', color: '#999', padding: 16, fontStyle: 'italic' }}>Aucune charge d'intérêt saisie.</td></tr>
            )}
          </tbody>
          {hasLignes && (
            <tfoot>
              <tr>
                <td colSpan={3}><strong>Total</strong></td>
                <td className="num"><strong>{fmt(p.totalInteretCharge)}</strong></td>
                <td className="num"><strong>{fmt(p.totalInteretReleve)}</strong></td>
                <td className={`num ${Math.abs(p.totalInteretCharge - p.totalInteretReleve) > 0.5 ? 'ecart-val' : 'ok-val'}`}><strong>{fmt(p.totalInteretCharge - p.totalInteretReleve)}</strong></td>
                <td className="num"><strong>{fmt(p.totalInteretPlan)}</strong></td>
                <td className={`num ${Math.abs(p.totalInteretPlan - p.totalInteretReleve) > 0.5 ? 'ecart-val' : 'ok-val'}`}><strong>{fmt(p.totalInteretPlan - p.totalInteretReleve)}</strong></td>
                <td></td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
      <div className="revision-od-actions">
        <button className="revision-od-add" onClick={p.addInteret}><LuPlus size={13} /> Ajouter une charge d'intérêt</button>
      </div>
    </div>
  );
}
