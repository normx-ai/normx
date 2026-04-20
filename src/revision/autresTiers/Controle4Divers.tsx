// Contrôle 4 : debiteurs et crediteurs divers (46x, 47x hors 471/476/477/478/479).

import React from 'react';
import { LuPlus, LuTrash2, LuCheck, LuInfo, LuChevronDown, LuChevronRight } from 'react-icons/lu';
import { fmt, fmtInput, parseInputValue, DiversLigne } from '../revisionTypes';

interface Controle4Props {
  diversLignes: DiversLigne[];
  diversAnciensAlerts: DiversLigne[];
  diversDebiteursSignificatifs: DiversLigne[];
  isOpen: boolean;
  toggle: () => void;
  addDivers: () => void;
  updateDivers: (id: number, field: keyof DiversLigne, value: string | number) => void;
  removeDivers: (id: number) => void;
}

export function Controle4Divers({
  diversLignes, diversAnciensAlerts, diversDebiteursSignificatifs,
  isOpen, toggle, addDivers, updateDivers, removeDivers,
}: Controle4Props): React.ReactElement {
  const hasLignes = diversLignes.length > 0;
  const noAlerts = hasLignes && diversAnciensAlerts.length === 0 && diversDebiteursSignificatifs.length === 0;

  return (
    <div className="revision-control">
      <div className="revision-control-title" onClick={toggle} style={{ cursor: 'pointer' }}>
        <span>Controle 4 — Debiteurs et crediteurs divers (46x, 47x)</span>
        {noAlerts
          ? <span className="revision-badge ok"><LuCheck size={12} /> Conforme</span>
          : hasLignes
            ? <span className="revision-badge ko"><LuInfo size={12} /> A verifier</span>
            : null
        }
        {isOpen ? <LuChevronRight size={14} /> : <LuChevronDown size={14} />}
      </div>
      {isOpen && (
        <>
          <div className="revision-ref">Comptes 46x et 47x (hors 471, 476, 477, 478, 479)</div>

          {diversAnciensAlerts.length > 0 && (
            <div className="revision-alert orange">
              <LuInfo size={14} /> <strong>Attention :</strong> Soldes anciens sans mouvement : {diversAnciensAlerts.map(l => `${l.compte} (${fmt(l.soldeN)})`).join(', ')}. Verifier si ces soldes sont encore justifies.
            </div>
          )}
          {diversDebiteursSignificatifs.length > 0 && (
            <div className="revision-alert orange">
              <LuInfo size={14} /> <strong>Attention :</strong> Debiteurs divers avec solde significatif : {diversDebiteursSignificatifs.map(l => `${l.compte} (${fmt(l.soldeN)})`).join(', ')}. Verifier la recouvrabilite.
            </div>
          )}

          <div className="revision-table-wrapper" style={{ marginTop: 8 }}>
            <table className="revision-table">
              <thead>
                <tr>
                  <th style={{ width: 80 }}>Compte</th>
                  <th>Designation</th>
                  <th className="num" style={{ width: 110 }}>Solde N</th>
                  <th className="num" style={{ width: 110 }}>Solde N-1</th>
                  <th className="num" style={{ width: 100 }}>Variation</th>
                  <th className="editable-col" style={{ width: 130 }}>Nature</th>
                  <th className="editable-col" style={{ width: 150 }}>Commentaire</th>
                  <th style={{ width: 30 }}></th>
                </tr>
              </thead>
              <tbody>
                {diversLignes.map(l => {
                  const isAncien = Math.abs(l.soldeN) > 0.5 && Math.abs(l.variation) < 0.5 && Math.abs(l.soldeN1) > 0.5;
                  return (
                    <tr key={l.id} className={isAncien ? 'ecart-row' : ''}>
                      <td className="editable-cell"><input type="text" value={l.compte} onChange={e => updateDivers(l.id, 'compte', e.target.value)} style={{ maxWidth: 'none', fontFamily: 'monospace' }} /></td>
                      <td className="editable-cell"><input type="text" value={l.designation} onChange={e => updateDivers(l.id, 'designation', e.target.value)} style={{ maxWidth: 'none' }} /></td>
                      <td className="editable-cell"><input type="text" inputMode="numeric" value={fmtInput(l.soldeN)} onChange={e => updateDivers(l.id, 'soldeN', parseInputValue(e.target.value))} style={{ maxWidth: 'none' }} /></td>
                      <td className="editable-cell"><input type="text" inputMode="numeric" value={fmtInput(l.soldeN1)} onChange={e => updateDivers(l.id, 'soldeN1', parseInputValue(e.target.value))} style={{ maxWidth: 'none' }} /></td>
                      <td className={`num ${Math.abs(l.variation) > 0.5 ? '' : 'ok-val'}`}>{fmt(l.variation)}</td>
                      <td className="editable-cell"><input type="text" value={l.nature} onChange={e => updateDivers(l.id, 'nature', e.target.value)} style={{ maxWidth: 'none', fontSize: '11px' }} placeholder="Pret, caution, acompte..." /></td>
                      <td className="editable-cell"><input type="text" value={l.commentaire} onChange={e => updateDivers(l.id, 'commentaire', e.target.value)} style={{ maxWidth: 'none', fontSize: '11px' }} placeholder="RAS / A regulariser..." /></td>
                      <td><button className="revision-od-delete" onClick={() => removeDivers(l.id)} title="Supprimer"><LuTrash2 size={13} /></button></td>
                    </tr>
                  );
                })}
                {!hasLignes && (
                  <tr><td colSpan={8} style={{ textAlign: 'center', color: '#999', padding: 16, fontStyle: 'italic' }}>Aucun debiteur/crediteur divers en balance.</td></tr>
                )}
              </tbody>
              {hasLignes && (
                <tfoot>
                  <tr>
                    <td colSpan={2}><strong>Total</strong></td>
                    <td className="num"><strong>{fmt(diversLignes.reduce((s, l) => s + l.soldeN, 0))}</strong></td>
                    <td className="num"><strong>{fmt(diversLignes.reduce((s, l) => s + l.soldeN1, 0))}</strong></td>
                    <td className="num"><strong>{fmt(diversLignes.reduce((s, l) => s + l.variation, 0))}</strong></td>
                    <td colSpan={3}></td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
          <div className="revision-od-actions">
            <button className="revision-od-add" onClick={addDivers}><LuPlus size={13} /> Ajouter un compte divers</button>
          </div>
        </>
      )}
    </div>
  );
}
