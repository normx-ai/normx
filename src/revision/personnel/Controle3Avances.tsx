// Contrôle 3 : avances et acomptes au personnel (comptes 421x).

import React from 'react';
import { LuChevronDown, LuChevronRight } from 'react-icons/lu';
import { fmt, AvanceLigne } from '../revisionTypes';

interface Controle3Props {
  avancesLignes: AvanceLigne[];
  avancesEdit: Record<string, { anteriorite: string; accordFormalise: string; observations: string }>;
  setAvancesEdit: React.Dispatch<React.SetStateAction<Record<string, { anteriorite: string; accordFormalise: string; observations: string }>>>;
  setSaved: (v: boolean) => void;
  totalAvancesN: number;
  totalAvancesN1: number;
  isOpen: boolean;
  toggle: () => void;
}

export function Controle3Avances(p: Controle3Props): React.ReactElement {
  const hasLignes = p.avancesLignes.length > 0;
  return (
    <div className="revision-control">
      <div className="revision-control-title" onClick={p.toggle} style={{ cursor: 'pointer' }}>
        {p.isOpen ? <LuChevronDown size={14} /> : <LuChevronRight size={14} />}
        <span>Contrôle 3 — Avances et acomptes au personnel (comptes 421x)</span>
      </div>
      <div className="revision-ref">Si antériorité {'>'} 6 mois : envisager une dépréciation (D 6594 / C 4912)</div>

      {p.isOpen && (
        <div className="revision-table-wrapper" style={{ marginTop: 8 }}>
          <table className="revision-table">
            <thead>
              <tr>
                <th style={{ width: 90 }}>Compte</th>
                <th>Désignation</th>
                <th className="num" style={{ width: 120 }}>Solde N</th>
                <th className="num" style={{ width: 120 }}>Solde N-1</th>
                <th className="editable-col" style={{ width: 130 }}>Antériorité</th>
                <th className="editable-col" style={{ width: 90 }}>Accord formalisé</th>
                <th className="editable-col" style={{ width: 160 }}>Observations</th>
              </tr>
            </thead>
            <tbody>
              {p.avancesLignes.map(l => {
                const edit = p.avancesEdit[l.compte] || { anteriorite: '', accordFormalise: 'Non', observations: '' };
                const isOld = edit.anteriorite.toLowerCase().includes('> 6') ||
                              edit.anteriorite.toLowerCase().includes('>6') ||
                              edit.anteriorite.toLowerCase().includes('ancien') ||
                              edit.anteriorite.toLowerCase().includes('plus de 6');
                return (
                  <tr key={l.compte} className={isOld && l.soldeN > 0 ? 'ecart-row' : ''}>
                    <td className="compte">{l.compte}</td>
                    <td>{l.designation}</td>
                    <td className="num">{fmt(l.soldeN)}</td>
                    <td className="num">{fmt(l.soldeN1)}</td>
                    <td className="editable-cell">
                      <input type="text" value={edit.anteriorite}
                        onChange={e => { p.setAvancesEdit(prev => ({ ...prev, [l.compte]: { ...edit, anteriorite: e.target.value } })); p.setSaved(false); }}
                        placeholder="Ex: > 6 mois" style={{ maxWidth: 'none', fontSize: '11px' }} />
                    </td>
                    <td className="editable-cell">
                      <select value={edit.accordFormalise}
                        onChange={e => { p.setAvancesEdit(prev => ({ ...prev, [l.compte]: { ...edit, accordFormalise: e.target.value } })); p.setSaved(false); }}
                        style={{ padding: '3px 6px', borderRadius: 4, border: '1px solid #ddd', width: '100%', fontSize: '11px' }}>
                        <option value="Oui">Oui</option>
                        <option value="Non">Non</option>
                      </select>
                    </td>
                    <td className="editable-cell">
                      <input type="text" value={edit.observations}
                        onChange={e => { p.setAvancesEdit(prev => ({ ...prev, [l.compte]: { ...edit, observations: e.target.value } })); p.setSaved(false); }}
                        style={{ maxWidth: 'none', fontSize: '11px' }} placeholder="..." />
                    </td>
                  </tr>
                );
              })}
              {!hasLignes && (
                <tr><td colSpan={7} style={{ textAlign: 'center', color: '#999', padding: 16, fontStyle: 'italic' }}>Aucun compte 421x dans la balance.</td></tr>
              )}
            </tbody>
            {hasLignes && (
              <tfoot>
                <tr>
                  <td colSpan={2}><strong>Total</strong></td>
                  <td className="num"><strong>{fmt(p.totalAvancesN)}</strong></td>
                  <td className="num"><strong>{fmt(p.totalAvancesN1)}</strong></td>
                  <td colSpan={3}></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      )}
    </div>
  );
}
