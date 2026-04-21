// Onglet Declaration Annuelle des Salaires (DAS).

import React from 'react';
import { formaterMontant } from '../../utils/calculPaie';
import type { DeclarationDAS, VerificationResult } from '../../data/declarations';
import { StatusBadge } from './StatusBadge';

interface Props {
  das: DeclarationDAS;
  validation: VerificationResult;
  annee: number;
}

export function DASTab({ das, validation, annee }: Props): React.ReactElement {
  return (
    <div>
      <div className="declarations-section-header">
        <h4>Declaration Annuelle des Salaires (DAS) — {annee}</h4>
        <StatusBadge valide={validation.valide} />
      </div>
      {!validation.valide && (
        <div className="wizard-alert error">
          {validation.erreurs.map((err, i) => (<div key={i}>{err}</div>))}
        </div>
      )}
      <div className="declarations-info-bar">
        <div className="declarations-info-item">
          <span className="declarations-info-label">Employeur</span>
          <span className="declarations-info-value">{das.employeur}</span>
        </div>
        <div className="declarations-info-item">
          <span className="declarations-info-label">NUI</span>
          <span className="declarations-info-value">{das.nui || '—'}</span>
        </div>
        <div className="declarations-info-item">
          <span className="declarations-info-label">Annee</span>
          <span className="declarations-info-value">{das.annee}</span>
        </div>
      </div>
      <table className="etab-table">
        <thead>
          <tr>
            <th>Nom</th>
            <th>Prenom</th>
            <th>Brut annuel</th>
            <th>ITS annuel</th>
            <th>CNSS annuel</th>
            <th>Net annuel</th>
          </tr>
        </thead>
        <tbody>
          {das.lignes.length === 0 ? (
            <tr><td colSpan={6} className="etab-table-empty">Aucune donnee</td></tr>
          ) : (
            das.lignes.map((sal, idx) => (
              <tr key={idx}>
                <td>{sal.nom}</td>
                <td>{sal.prenom}</td>
                <td>{formaterMontant(sal.brut_annuel)}</td>
                <td>{formaterMontant(sal.its_annuel)}</td>
                <td>{formaterMontant(sal.cnss_salariale_annuel)}</td>
                <td>{formaterMontant(sal.net_annuel)}</td>
              </tr>
            ))
          )}
        </tbody>
        {das.lignes.length > 0 && (
          <tfoot>
            <tr className="declarations-totaux">
              <td colSpan={2}>TOTAUX</td>
              <td>{formaterMontant(das.totaux.brut_total)}</td>
              <td>{formaterMontant(das.totaux.its_total)}</td>
              <td>{formaterMontant(das.totaux.cnss_total)}</td>
              <td>{formaterMontant(das.totaux.net_total)}</td>
            </tr>
          </tfoot>
        )}
      </table>
    </div>
  );
}
