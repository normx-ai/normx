// Contrôle 4 : dettes sociales (comptes 43x), comparaison N vs N-1.

import React from 'react';
import { LuCheck, LuInfo, LuChevronDown, LuChevronRight } from 'react-icons/lu';
import { fmt, DetteSocialeLigne } from '../revisionTypes';

interface Controle4Props {
  dettesLignes: DetteSocialeLigne[];
  dettesCommentaires: Record<string, string>;
  setDettesCommentaires: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  setSaved: (v: boolean) => void;
  totalDettesN: number;
  totalDettesN1: number;
  totalDettesVariation: number;
  hasDettesAnomalie: boolean;
  exerciceAnnee: number;
  isOpen: boolean;
  toggle: () => void;
}

export function Controle4Dettes(p: Controle4Props): React.ReactElement {
  const hasLignes = p.dettesLignes.length > 0;
  return (
    <div className="revision-control">
      <div className="revision-control-title" onClick={p.toggle} style={{ cursor: 'pointer' }}>
        {p.isOpen ? <LuChevronDown size={14} /> : <LuChevronRight size={14} />}
        <span>Contrôle 4 — Dettes sociales (comptes 43x)</span>
        {hasLignes && (p.hasDettesAnomalie
          ? <span className="revision-badge ko"><LuInfo size={11} /> Variation significative</span>
          : <span className="revision-badge ok"><LuCheck size={11} /> Cohérent</span>)}
      </div>
      <div className="revision-ref">Comparaison N vs N-1 des dettes sociales — signaler les variations significatives</div>

      {p.isOpen && (
        <div className="revision-table-wrapper" style={{ marginTop: 8 }}>
          <table className="revision-table">
            <thead>
              <tr>
                <th style={{ width: 90 }}>Compte</th>
                <th>Désignation</th>
                <th className="num" style={{ width: 120 }}>Solde N ({p.exerciceAnnee})</th>
                <th className="num" style={{ width: 120 }}>Solde N-1 ({p.exerciceAnnee - 1})</th>
                <th className="num" style={{ width: 110 }}>Variation</th>
                <th className="editable-col" style={{ width: 180 }}>Commentaire</th>
              </tr>
            </thead>
            <tbody>
              {p.dettesLignes.map(l => {
                const pct = l.soldeN1 !== 0 ? Math.abs(l.variation / Math.abs(l.soldeN1)) * 100 : (l.variation !== 0 ? 100 : 0);
                const isAnomalie = pct > 20;
                return (
                  <tr key={l.compte} className={isAnomalie ? 'ecart-row' : ''}>
                    <td className="compte">{l.compte}</td>
                    <td>{l.designation}</td>
                    <td className="num">{fmt(l.soldeN)}</td>
                    <td className="num">{fmt(l.soldeN1)}</td>
                    <td className={`num ${isAnomalie ? 'ecart-val' : ''}`}>{fmt(l.variation)}</td>
                    <td className="editable-cell">
                      <input type="text" value={p.dettesCommentaires[l.compte] || ''}
                        onChange={e => { p.setDettesCommentaires(prev => ({ ...prev, [l.compte]: e.target.value })); p.setSaved(false); }}
                        style={{ maxWidth: 'none', fontSize: '11px' }} placeholder="..." />
                    </td>
                  </tr>
                );
              })}
              {!hasLignes && (
                <tr><td colSpan={6} style={{ textAlign: 'center', color: '#999', padding: 16, fontStyle: 'italic' }}>Aucun compte 43x dans la balance.</td></tr>
              )}
            </tbody>
            {hasLignes && (
              <tfoot>
                <tr>
                  <td colSpan={2}><strong>Total</strong></td>
                  <td className="num"><strong>{fmt(p.totalDettesN)}</strong></td>
                  <td className="num"><strong>{fmt(p.totalDettesN1)}</strong></td>
                  <td className="num"><strong>{fmt(p.totalDettesVariation)}</strong></td>
                  <td></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      )}
    </div>
  );
}
