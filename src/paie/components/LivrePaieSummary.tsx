import React from 'react';
import { formaterMontant } from '../utils/calculPaie';
import { MOIS_NOMS } from './livrePaieTypes';
import type { EtatChargesFiscales, EtatChargesSociales } from './livrePaieTypes';

/* ---- Charges fiscales ---- */

interface LivrePaieFiscalProps {
  chargesFiscales: EtatChargesFiscales;
  employeur: string;
  selectedMois: number;
  selectedAnnee: number;
}

export function LivrePaieFiscal({
  chargesFiscales,
  employeur,
  selectedMois,
  selectedAnnee,
}: LivrePaieFiscalProps): React.ReactElement {
  return (
    <div>
      <div className="declarations-section-header">
        <h4>Etat des charges fiscales — {MOIS_NOMS[selectedMois]} {selectedAnnee}</h4>
      </div>
      <div className="declarations-info-bar">
        <div className="declarations-info-item">
          <span className="declarations-info-label">Employeur</span>
          <span className="declarations-info-value">{employeur}</span>
        </div>
        <div className="declarations-info-item">
          <span className="declarations-info-label">Periode</span>
          <span className="declarations-info-value">{MOIS_NOMS[selectedMois]} {selectedAnnee}</span>
        </div>
      </div>
      <table className="etab-table">
        <thead>
          <tr>
            <th>Nom</th>
            <th>Prenom</th>
            <th>Brut</th>
            <th>ITS</th>
            <th>TUS Impot</th>
            <th>TUS CNSS</th>
            <th>TOL</th>
            <th>Taxe reg.</th>
            <th>Total fiscal</th>
          </tr>
        </thead>
        <tbody>
          {chargesFiscales.lignes.length === 0 ? (
            <tr>
              <td colSpan={9} className="etab-table-empty">
                Aucune donnee
              </td>
            </tr>
          ) : (
            chargesFiscales.lignes.map((l, idx) => (
              <tr key={idx}>
                <td>{l.nom}</td>
                <td>{l.prenom}</td>
                <td>{formaterMontant(l.brut)}</td>
                <td>{formaterMontant(l.its)}</td>
                <td>{formaterMontant(l.tus_impot)}</td>
                <td>{formaterMontant(l.tus_cnss)}</td>
                <td>{formaterMontant(l.tol)}</td>
                <td>{formaterMontant(l.taxe_regionale)}</td>
                <td>{formaterMontant(l.total_fiscal)}</td>
              </tr>
            ))
          )}
        </tbody>
        {chargesFiscales.lignes.length > 0 && (
          <tfoot>
            <tr className="livre-paie-totaux">
              <td colSpan={2}>TOTAUX</td>
              <td>{formaterMontant(chargesFiscales.totaux.brut)}</td>
              <td>{formaterMontant(chargesFiscales.totaux.its)}</td>
              <td>{formaterMontant(chargesFiscales.totaux.tus_impot)}</td>
              <td>{formaterMontant(chargesFiscales.totaux.tus_cnss)}</td>
              <td>{formaterMontant(chargesFiscales.totaux.tol)}</td>
              <td>{formaterMontant(chargesFiscales.totaux.taxe_regionale)}</td>
              <td>{formaterMontant(chargesFiscales.totaux.total_fiscal)}</td>
            </tr>
          </tfoot>
        )}
      </table>
      {chargesFiscales.lignes.length > 0 && (
        <div className="declarations-footer-total">
          <span>Total charges fiscales</span>
          <span className="declarations-footer-amount">
            {formaterMontant(chargesFiscales.totaux.total_fiscal)}
          </span>
        </div>
      )}
    </div>
  );
}

/* ---- Charges sociales ---- */

interface LivrePaieSocialProps {
  chargesSociales: EtatChargesSociales;
  employeur: string;
  selectedMois: number;
  selectedAnnee: number;
}

export function LivrePaieSocial({
  chargesSociales,
  employeur,
  selectedMois,
  selectedAnnee,
}: LivrePaieSocialProps): React.ReactElement {
  return (
    <div>
      <div className="declarations-section-header">
        <h4>Etat des charges sociales — {MOIS_NOMS[selectedMois]} {selectedAnnee}</h4>
      </div>
      <div className="declarations-info-bar">
        <div className="declarations-info-item">
          <span className="declarations-info-label">Employeur</span>
          <span className="declarations-info-value">{employeur}</span>
        </div>
        <div className="declarations-info-item">
          <span className="declarations-info-label">Periode</span>
          <span className="declarations-info-value">{MOIS_NOMS[selectedMois]} {selectedAnnee}</span>
        </div>
      </div>
      <table className="etab-table">
        <thead>
          <tr>
            <th>Nom</th>
            <th>Prenom</th>
            <th>Brut</th>
            <th>CNSS Sal.</th>
            <th>PVID Pat.</th>
            <th>AF Pat.</th>
            <th>AT Pat.</th>
            <th>CAMU</th>
            <th>Total social</th>
          </tr>
        </thead>
        <tbody>
          {chargesSociales.lignes.length === 0 ? (
            <tr>
              <td colSpan={9} className="etab-table-empty">
                Aucune donnee
              </td>
            </tr>
          ) : (
            chargesSociales.lignes.map((l, idx) => (
              <tr key={idx}>
                <td>{l.nom}</td>
                <td>{l.prenom}</td>
                <td>{formaterMontant(l.brut)}</td>
                <td>{formaterMontant(l.cnss_salariale)}</td>
                <td>{formaterMontant(l.cnss_patronale_pvid)}</td>
                <td>{formaterMontant(l.cnss_patronale_af)}</td>
                <td>{formaterMontant(l.cnss_patronale_at)}</td>
                <td>{formaterMontant(l.camu)}</td>
                <td>{formaterMontant(l.total_social)}</td>
              </tr>
            ))
          )}
        </tbody>
        {chargesSociales.lignes.length > 0 && (
          <tfoot>
            <tr className="livre-paie-totaux">
              <td colSpan={2}>TOTAUX</td>
              <td>{formaterMontant(chargesSociales.totaux.brut)}</td>
              <td>{formaterMontant(chargesSociales.totaux.cnss_salariale)}</td>
              <td>{formaterMontant(chargesSociales.totaux.cnss_patronale_pvid)}</td>
              <td>{formaterMontant(chargesSociales.totaux.cnss_patronale_af)}</td>
              <td>{formaterMontant(chargesSociales.totaux.cnss_patronale_at)}</td>
              <td>{formaterMontant(chargesSociales.totaux.camu)}</td>
              <td>{formaterMontant(chargesSociales.totaux.total_social)}</td>
            </tr>
          </tfoot>
        )}
      </table>
      {chargesSociales.lignes.length > 0 && (
        <div className="declarations-footer-total">
          <span>Total charges sociales</span>
          <span className="declarations-footer-amount">
            {formaterMontant(chargesSociales.totaux.total_social)}
          </span>
        </div>
      )}
    </div>
  );
}
