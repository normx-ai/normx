// Contrôle 3 : comptes d'attente (471) — doivent etre soldes a la cloture.

import React from 'react';
import { LuPlus, LuTrash2, LuCheck, LuInfo, LuChevronDown, LuChevronRight } from 'react-icons/lu';
import { fmt, fmtInput, parseInputValue, AttenteLigne } from '../revisionTypes';

interface Controle3Props {
  attenteLignes: AttenteLigne[];
  attenteNonSoldes: AttenteLigne[];
  isOpen: boolean;
  toggle: () => void;
  addAttente: () => void;
  updateAttente: (id: number, field: keyof AttenteLigne, value: string | number) => void;
  removeAttente: (id: number) => void;
}

export function Controle3Attente({
  attenteLignes, attenteNonSoldes, isOpen, toggle,
  addAttente, updateAttente, removeAttente,
}: Controle3Props): React.ReactElement {
  const hasLignes = attenteLignes.length > 0;
  const allSoldes = hasLignes && attenteNonSoldes.length === 0;

  return (
    <div className="revision-control">
      <div className="revision-control-title" onClick={toggle} style={{ cursor: 'pointer' }}>
        <span>Controle 3 — Comptes d'attente (471)</span>
        {allSoldes
          ? <span className="revision-badge ok"><LuCheck size={12} /> Tous soldes</span>
          : attenteNonSoldes.length > 0
            ? <span className="revision-badge ko" style={{ background: '#fee2e2', color: '#dc2626' }}><LuInfo size={12} /> Non soldes !</span>
            : null
        }
        {isOpen ? <LuChevronRight size={14} /> : <LuChevronDown size={14} />}
      </div>
      {isOpen && (
        <>
          <div className="revision-ref">Les comptes d'attente (471) doivent imperativement etre soldes a la cloture de l'exercice</div>

          {attenteNonSoldes.length > 0 && (
            <div className="revision-alert rouge" style={{ background: '#fee2e2', border: '1px solid #fca5a5', color: '#991b1b', padding: '10px 14px', borderRadius: 6, marginTop: 8, fontSize: '12.5px' }}>
              <LuInfo size={14} /> <strong>ALERTE :</strong> Les comptes d'attente doivent etre soldes a la cloture. {attenteNonSoldes.length} compte{attenteNonSoldes.length > 1 ? 's' : ''} non solde{attenteNonSoldes.length > 1 ? 's' : ''} : {attenteNonSoldes.map(l => `${l.compte} (${fmt(l.soldeN)})`).join(', ')}
            </div>
          )}

          <div className="revision-table-wrapper" style={{ marginTop: 8 }}>
            <table className="revision-table">
              <thead>
                <tr>
                  <th style={{ width: 80 }}>Compte</th>
                  <th>Designation</th>
                  <th className="num" style={{ width: 120 }}>Solde N</th>
                  <th className="editable-col" style={{ width: 180 }}>Nature operation</th>
                  <th className="editable-col" style={{ width: 200 }}>Regularisation proposee</th>
                  <th style={{ width: 30 }}></th>
                </tr>
              </thead>
              <tbody>
                {attenteLignes.map(l => (
                  <tr key={l.id} className={Math.abs(l.soldeN) > 0.5 ? 'ecart-row' : ''}>
                    <td className="editable-cell"><input type="text" value={l.compte} onChange={e => updateAttente(l.id, 'compte', e.target.value)} style={{ maxWidth: 'none', fontFamily: 'monospace' }} /></td>
                    <td className="editable-cell"><input type="text" value={l.designation} onChange={e => updateAttente(l.id, 'designation', e.target.value)} style={{ maxWidth: 'none' }} /></td>
                    <td className={`editable-cell ${Math.abs(l.soldeN) > 0.5 ? 'ecart-val' : 'ok-val'}`}><input type="text" inputMode="numeric" value={fmtInput(l.soldeN)} onChange={e => updateAttente(l.id, 'soldeN', parseInputValue(e.target.value))} style={{ maxWidth: 'none' }} /></td>
                    <td className="editable-cell"><input type="text" value={l.natureOperation} onChange={e => updateAttente(l.id, 'natureOperation', e.target.value)} style={{ maxWidth: 'none', fontSize: '11px' }} placeholder="Virement en attente, cheque non identifie..." /></td>
                    <td className="editable-cell"><input type="text" value={l.regularisationProposee} onChange={e => updateAttente(l.id, 'regularisationProposee', e.target.value)} style={{ maxWidth: 'none', fontSize: '11px' }} placeholder="Reclasser vers compte xxx..." /></td>
                    <td><button className="revision-od-delete" onClick={() => removeAttente(l.id)} title="Supprimer"><LuTrash2 size={13} /></button></td>
                  </tr>
                ))}
                {!hasLignes && (
                  <tr><td colSpan={6} style={{ textAlign: 'center', color: '#999', padding: 16, fontStyle: 'italic' }}>Aucun compte d'attente (471) en balance.</td></tr>
                )}
              </tbody>
              {hasLignes && (
                <tfoot>
                  <tr>
                    <td colSpan={2}><strong>Total</strong></td>
                    <td className={`num ${Math.abs(attenteLignes.reduce((s, l) => s + l.soldeN, 0)) > 0.5 ? 'ecart-val' : 'ok-val'}`}><strong>{fmt(attenteLignes.reduce((s, l) => s + l.soldeN, 0))}</strong></td>
                    <td colSpan={3}></td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
          <div className="revision-od-actions">
            <button className="revision-od-add" onClick={addAttente}><LuPlus size={13} /> Ajouter un compte d'attente</button>
          </div>
        </>
      )}
    </div>
  );
}
