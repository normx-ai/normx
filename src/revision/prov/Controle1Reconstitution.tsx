// Contrôle 1 : reconstitution des provisions réglementées (15x).

import React from 'react';
import { LuInfo } from 'react-icons/lu';
import { fmt, fmtInput, parseInputValue, ProvLigne } from '../revisionTypes';

interface Controle1Props {
  lignes: ProvLigne[];
  totalN1: number;
  totalDot: number;
  totalRep: number;
  totalCalc: number;
  totalBal: number;
  totalEcart: number;
  updateLigne: (idx: number, field: 'soldeN1' | 'dotation' | 'reprise', value: number) => void;
  odImpact: (compte: string) => number;
}

export function Controle1Reconstitution(p: Controle1Props): React.ReactElement {
  return (
    <>
      {p.lignes.length > 0 && (
        <div className="revision-guide-info">
          <LuInfo size={14} />
          <div>
            <strong>Fonctionnement SYSCOHADA — Provisions réglementées (15x) :</strong>
            <ul style={{ margin: '4px 0 0 16px', padding: 0, listStyle: 'disc' }}>
              <li><strong>Dotation :</strong> D <strong>851</strong> (Dotations HAO aux provisions réglementées) / C 15x</li>
              <li><strong>Reprise :</strong> D 15x / C <strong>861</strong> (Reprises HAO sur provisions réglementées)</li>
            </ul>
            <span style={{ fontSize: '11px', color: '#555', marginTop: 4, display: 'block' }}>
              Reportez les montants des comptes 851/861 de votre balance. Si votre balance utilise d'autres comptes (ex : 852, 862), reportez le montant correspondant et signalez l'anomalie.
            </span>
          </div>
        </div>
      )}

      <div className="revision-control">
        <div className="revision-control-title">
          <span>Contrôle 1 — Reconstitution des provisions réglementées</span>
          {Math.abs(p.totalEcart) < 0.5
            ? <span className="revision-badge ok">Conforme</span>
            : <span className="revision-badge ko">Écart détecté</span>}
        </div>

        <div className="revision-table-wrapper">
          <table className="revision-table">
            <thead>
              <tr>
                <th style={{ width: 80 }}>Compte</th>
                <th>Désignation</th>
                <th className="num editable-col" style={{ width: 130 }}>Solde N-1</th>
                <th className="num editable-col" style={{ width: 130 }}>Dotations (851xxx)</th>
                <th className="num editable-col" style={{ width: 130 }}>Reprises (861xxx)</th>
                <th className="num" style={{ width: 130 }}>Solde au 31/12/N</th>
                <th className="num" style={{ width: 130 }}>Balance générale</th>
                <th className="num" style={{ width: 100 }}>Écart</th>
              </tr>
            </thead>
            <tbody>
              {p.lignes.map((l, i) => {
                const ecartNet = l.ecart - p.odImpact(l.compte);
                return (
                  <tr key={l.compte} className={Math.abs(ecartNet) > 0.5 ? 'ecart-row' : ''}>
                    <td className="compte">{l.compte}</td>
                    <td>{l.designation}</td>
                    <td className="editable-cell"><input type="text" inputMode="numeric" style={{ maxWidth: 'none' }} value={fmtInput(l.soldeN1)} onChange={e => p.updateLigne(i, 'soldeN1', parseInputValue(e.target.value))} /></td>
                    <td className="editable-cell"><input type="text" inputMode="numeric" style={{ maxWidth: 'none' }} value={fmtInput(l.dotation)} onChange={e => p.updateLigne(i, 'dotation', parseInputValue(e.target.value))} /></td>
                    <td className="editable-cell"><input type="text" inputMode="numeric" style={{ maxWidth: 'none' }} value={fmtInput(l.reprise)} onChange={e => p.updateLigne(i, 'reprise', parseInputValue(e.target.value))} /></td>
                    <td className="num computed">{fmt(l.soldeNCalcule)}</td>
                    <td className="num">{fmt(l.soldeNBalance)}</td>
                    <td className={`num ${Math.abs(ecartNet) > 0.5 ? 'ecart-val' : 'ok-val'}`}>{fmt(ecartNet)}</td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={2}><strong>TOTAL</strong></td>
                <td className="num"><strong>{fmt(p.totalN1)}</strong></td>
                <td className="num"><strong>{fmt(p.totalDot)}</strong></td>
                <td className="num"><strong>{fmt(p.totalRep)}</strong></td>
                <td className="num"><strong>{fmt(p.totalCalc)}</strong></td>
                <td className="num"><strong>{fmt(p.totalBal)}</strong></td>
                <td className={`num ${Math.abs(p.totalEcart) > 0.5 ? 'ecart-val' : 'ok-val'}`}><strong>{fmt(p.totalEcart)}</strong></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </>
  );
}
