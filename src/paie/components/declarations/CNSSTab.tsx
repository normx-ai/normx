// Onglet Bordereau CNSS : tableau mensuel + totaux CNSS.

import React from 'react';
import { formaterMontant } from '../../utils/calculPaie';
import type { DeclarationCNSS, VerificationResult } from '../../data/declarations';
import { MOIS_NOMS } from './declarationsShared';
import { StatusBadge } from './StatusBadge';

interface Props {
  bordereau: DeclarationCNSS;
  validation: VerificationResult;
  mois: number;
  annee: number;
}

export function CNSSTab({ bordereau, validation, mois, annee }: Props): React.ReactElement {
  return (
    <div>
      <div className="declarations-section-header">
        <h4>Bordereau CNSS — {MOIS_NOMS[mois]} {annee}</h4>
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
          <span className="declarations-info-value">{bordereau.employeur}</span>
        </div>
        <div className="declarations-info-item">
          <span className="declarations-info-label">N CNSS</span>
          <span className="declarations-info-value">{bordereau.numero_cnss || '—'}</span>
        </div>
        <div className="declarations-info-item">
          <span className="declarations-info-label">Effectif</span>
          <span className="declarations-info-value">{bordereau.lignes.length}</span>
        </div>
      </div>
      <table className="etab-table">
        <thead>
          <tr>
            <th>Nom</th>
            <th>Prenom</th>
            <th>Brut</th>
            <th>Plafond PVID</th>
            <th>Plafond AF/AT</th>
            <th>CNSS Sal.</th>
            <th>PVID Pat.</th>
            <th>AF Pat.</th>
            <th>AT Pat.</th>
          </tr>
        </thead>
        <tbody>
          {bordereau.lignes.length === 0 ? (
            <tr><td colSpan={9} className="etab-table-empty">Aucune donnee</td></tr>
          ) : (
            bordereau.lignes.map((sal) => (
              <tr key={sal.numero_ss}>
                <td>{sal.nom}</td>
                <td>{sal.prenom}</td>
                <td>{formaterMontant(sal.brut)}</td>
                <td>{formaterMontant(sal.plafond1)}</td>
                <td>{formaterMontant(sal.plafond2)}</td>
                <td>{formaterMontant(sal.cnss_salariale)}</td>
                <td>{formaterMontant(sal.cnss_patronale_pvid)}</td>
                <td>{formaterMontant(sal.cnss_patronale_af)}</td>
                <td>{formaterMontant(sal.cnss_patronale_at)}</td>
              </tr>
            ))
          )}
        </tbody>
        {bordereau.lignes.length > 0 && (
          <tfoot>
            <tr className="declarations-totaux">
              <td colSpan={2}>TOTAUX</td>
              <td>{formaterMontant(bordereau.totaux.brut_total)}</td>
              <td></td>
              <td></td>
              <td>{formaterMontant(bordereau.totaux.cnss_salariale_total)}</td>
              <td colSpan={3}>{formaterMontant(bordereau.totaux.cnss_patronale_total)}</td>
            </tr>
          </tfoot>
        )}
      </table>
      {bordereau.lignes.length > 0 && (
        <div className="declarations-footer-total">
          <span>Total a verser a la CNSS</span>
          <span className="declarations-footer-amount">
            {formaterMontant(bordereau.totaux.total_a_verser)}
          </span>
        </div>
      )}
    </div>
  );
}
