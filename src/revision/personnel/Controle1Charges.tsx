// Contrôle 1 : cadrage charges de personnel (comptes 66x), revue N vs N-1.

import React from 'react';
import { LuCheck, LuInfo, LuChevronDown, LuChevronRight } from 'react-icons/lu';
import { fmt, ChargePersonnelLigne } from '../revisionTypes';

interface Controle1Props {
  chargesPersonnel: ChargePersonnelLigne[];
  totalChargesN: number;
  totalChargesN1: number;
  totalChargesVariation: number;
  totalChargesVariationPct: number;
  hasAnomalieCharges: boolean;
  exerciceAnnee: number;
  isOpen: boolean;
  toggle: () => void;
}

export function Controle1Charges(p: Controle1Props): React.ReactElement {
  const hasLignes = p.chargesPersonnel.length > 0;
  return (
    <div className="revision-control">
      <div className="revision-control-title" onClick={p.toggle} style={{ cursor: 'pointer' }}>
        {p.isOpen ? <LuChevronDown size={14} /> : <LuChevronRight size={14} />}
        <span>Contrôle 1 — Cadrage des charges de personnel (comptes 66x)</span>
        {hasLignes && (p.hasAnomalieCharges
          ? <span className="revision-badge ko"><LuInfo size={11} /> Variation {'>'} 10%</span>
          : <span className="revision-badge ok"><LuCheck size={11} /> Cohérent</span>)}
      </div>
      <div className="revision-ref">Revue analytique — comparaison N vs N-1 des comptes 66x (salaires et charges sociales)</div>

      {p.isOpen && (
        <div className="revision-table-wrapper" style={{ marginTop: 8 }}>
          <table className="revision-table">
            <thead>
              <tr>
                <th style={{ width: 90 }}>Compte</th>
                <th>Désignation</th>
                <th className="num" style={{ width: 130 }}>Solde N ({p.exerciceAnnee})</th>
                <th className="num" style={{ width: 130 }}>Solde N-1 ({p.exerciceAnnee - 1})</th>
                <th className="num" style={{ width: 120 }}>Variation</th>
                <th className="num" style={{ width: 90 }}>Variation %</th>
              </tr>
            </thead>
            <tbody>
              {p.chargesPersonnel.map(l => {
                const isAnomalie = Math.abs(l.variationPct) > 10;
                return (
                  <tr key={l.compte} className={isAnomalie ? 'ecart-row' : ''}>
                    <td className="compte">{l.compte}</td>
                    <td>{l.designation}</td>
                    <td className="num">{fmt(l.soldeN)}</td>
                    <td className="num">{fmt(l.soldeN1)}</td>
                    <td className={`num ${l.variation > 0.5 ? 'ecart-val' : l.variation < -0.5 ? 'ok-val' : ''}`}>{fmt(l.variation)}</td>
                    <td className={`num ${isAnomalie ? 'ecart-val' : ''}`}>
                      {l.soldeN1 !== 0 || l.soldeN !== 0 ? `${l.variationPct >= 0 ? '+' : ''}${l.variationPct.toFixed(1)}%` : ''}
                    </td>
                  </tr>
                );
              })}
              {!hasLignes && (
                <tr><td colSpan={6} style={{ textAlign: 'center', color: '#999', padding: 16, fontStyle: 'italic' }}>Aucun compte 66x dans la balance.</td></tr>
              )}
            </tbody>
            {hasLignes && (
              <tfoot>
                <tr>
                  <td colSpan={2}><strong>Total</strong></td>
                  <td className="num"><strong>{fmt(p.totalChargesN)}</strong></td>
                  <td className="num"><strong>{fmt(p.totalChargesN1)}</strong></td>
                  <td className="num"><strong>{fmt(p.totalChargesVariation)}</strong></td>
                  <td className={`num ${Math.abs(p.totalChargesVariationPct) > 10 ? 'ecart-val' : ''}`}>
                    <strong>{p.totalChargesN1 !== 0 ? `${p.totalChargesVariationPct >= 0 ? '+' : ''}${p.totalChargesVariationPct.toFixed(1)}%` : ''}</strong>
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      )}
    </div>
  );
}
