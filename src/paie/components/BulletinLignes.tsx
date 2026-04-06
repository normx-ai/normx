import React from 'react';
import { formaterMontant } from '../utils/calculPaie';
import type { LigneGain, LigneCotisation, LigneIndemnite, VariableMois } from './bulletinTypes';

interface BulletinLignesProps {
  lignesGains: LigneGain[];
  lignesCotisations: LigneCotisation[];
  lignesIndemnites: LigneIndemnite[];
  variables: VariableMois[];
  totalBrut: number;
  totalRetenues: number;
  totalPatronales: number;
  totalGains: number;
}

function BulletinLignes({
  lignesGains,
  lignesCotisations,
  lignesIndemnites,
  variables,
  totalBrut,
  totalRetenues,
  totalPatronales,
  totalGains,
}: BulletinLignesProps): React.ReactElement {
  const fmt = (v: number | null | undefined): string => v != null ? formaterMontant(Math.round(v)) : '';
  const fmtTaux = (v: number | null | undefined): string => v != null && v !== 0 ? v.toFixed(3).replace('.', ',') : '';

  return (
    <div className="bulletin-table-wrapper">
      <table className="bulletin-main-table">
        <thead>
          <tr>
            <th rowSpan={2} style={{ width: 24 }}>N°</th>
            <th rowSpan={2} style={{ width: 180 }}>Libellés</th>
            <th rowSpan={2} style={{ width: 50 }}>Nombre</th>
            <th rowSpan={2} style={{ width: 90 }}>Base</th>
            <th colSpan={3} className="section-header">Part salariale</th>
            <th colSpan={2} className="section-header">Part patronale</th>
          </tr>
          <tr>
            <th style={{ width: 50 }}>Taux (%)</th>
            <th style={{ width: 80 }}>Mt. à ajouter</th>
            <th style={{ width: 80 }}>Mt. à déduire</th>
            <th style={{ width: 50 }}>Taux (%)</th>
            <th style={{ width: 80 }}>Montant</th>
          </tr>
        </thead>
        <tbody>
          {/* GAINS */}
          {lignesGains.map((l, i) => (
            <tr key={`gain-${i}`}>
              <td></td>
              <td>{l.libelle}</td>
              <td className="text-right">{l.nombre ? String(l.nombre).replace('.', ',') : ''}</td>
              <td className="text-right">{l.base ? fmt(l.base) : ''}</td>
              <td></td>
              <td className="text-right">{fmt(l.montant)}</td>
              <td></td>
              <td></td>
              <td></td>
            </tr>
          ))}

          {/* TOTAL BRUT */}
          <tr className="total-row">
            <td></td>
            <td className="bold">Total Brut</td>
            <td></td>
            <td></td>
            <td></td>
            <td className="text-right bold">{fmt(totalBrut)}</td>
            <td></td>
            <td></td>
            <td></td>
          </tr>

          {/* COTISATIONS */}
          {lignesCotisations.map((l, i) => (
            <tr key={`cot-${i}`}>
              <td></td>
              <td>{l.libelle}</td>
              <td></td>
              <td className="text-right">{l.base ? fmt(l.base) : ''}</td>
              <td className="text-right">{fmtTaux(l.taux_sal)}</td>
              <td></td>
              <td className="text-right">{l.deduction ? fmt(l.deduction) : ''}</td>
              <td className="text-right">{fmtTaux(l.taux_pat)}</td>
              <td className="text-right">{l.patronale ? fmt(l.patronale) : ''}</td>
            </tr>
          ))}

          {/* TOTAL COTISATIONS */}
          <tr className="total-row">
            <td></td>
            <td className="bold">Total Cotisations</td>
            <td></td>
            <td></td>
            <td></td>
            <td></td>
            <td className="text-right bold">{fmt(totalRetenues)}</td>
            <td></td>
            <td className="text-right bold">{fmt(totalPatronales)}</td>
          </tr>

          {/* INDEMNITES NON SOUMISES */}
          {lignesIndemnites.map((l, i) => (
            <tr key={`ind-${i}`}>
              <td></td>
              <td>{l.libelle}</td>
              <td className="text-right">{l.nombre ? String(l.nombre).replace('.', ',') : ''}</td>
              <td className="text-right">{l.base ? fmt(l.base) : ''}</td>
              <td></td>
              <td className="text-right">{fmt(l.montant)}</td>
              <td></td>
              <td></td>
              <td></td>
            </tr>
          ))}

          {/* Lignes vides pour remplir */}
          {Array.from({ length: Math.max(0, 3 - lignesIndemnites.length) }).map((_, i) => (
            <tr key={`empty-${i}`}>
              <td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td>
            </tr>
          ))}

          {/* TOTAL GAINS */}
          <tr className="grand-total">
            <td></td>
            <td className="bold">TOTAL GAIN(S)</td>
            <td></td>
            <td></td>
            <td></td>
            <td className="text-right bold">{fmt(totalGains)}</td>
            <td></td>
            <td></td>
            <td></td>
          </tr>

          {/* TOTAL RETENUES */}
          <tr className="grand-total">
            <td></td>
            <td className="bold">TOTAL RETENUE(S)</td>
            <td></td>
            <td></td>
            <td></td>
            <td></td>
            <td className="text-right bold">{fmt(totalRetenues)}</td>
            <td></td>
            <td></td>
          </tr>
        </tbody>
      </table>

      {/* VARIABLES DU MOIS */}
      <table className="bulletin-variables-table">
        <thead>
          <tr>
            <th colSpan={3}>VARIABLES DU MOIS</th>
          </tr>
          <tr>
            <th>Date</th>
            <th>Pointage</th>
            <th>Quantités</th>
          </tr>
        </thead>
        <tbody>
          {variables.map((v, i) => (
            <tr key={i}>
              <td>{v.date}</td>
              <td>{v.pointage}</td>
              <td>{v.quantite}</td>
            </tr>
          ))}
          {Array.from({ length: Math.max(0, 31 - variables.length) }).map((_, i) => (
            <tr key={`ve-${i}`}>
              <td></td><td></td><td></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default BulletinLignes;
