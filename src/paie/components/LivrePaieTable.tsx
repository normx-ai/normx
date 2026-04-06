import React from 'react';
import { formaterMontant } from '../utils/calculPaie';
import { MOIS_NOMS } from './livrePaieTypes';
import type {
  LivrePaieMensuel,
  LivrePaieAnnuel,
  LivrePaieEmploye,
  SalarieItem,
} from './livrePaieTypes';

/* ---- Livre mensuel ---- */

interface LivrePaieMensuelTableProps {
  livreMensuel: LivrePaieMensuel;
  employeur: string;
  selectedMois: number;
  selectedAnnee: number;
}

export function LivrePaieMensuelTable({
  livreMensuel,
  employeur,
  selectedMois,
  selectedAnnee,
}: LivrePaieMensuelTableProps): React.ReactElement {
  return (
    <div>
      <div className="declarations-section-header">
        <h4>Livre de paie — {MOIS_NOMS[selectedMois]} {selectedAnnee}</h4>
      </div>
      <div className="declarations-info-bar">
        <div className="declarations-info-item">
          <span className="declarations-info-label">Employeur</span>
          <span className="declarations-info-value">{employeur}</span>
        </div>
        <div className="declarations-info-item">
          <span className="declarations-info-label">Effectif</span>
          <span className="declarations-info-value">{livreMensuel.lignes.length}</span>
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
            <th>Salaire base</th>
            <th>Brut</th>
            <th>CNSS Sal.</th>
            <th>ITS</th>
            <th>CAMU</th>
            <th>TOL</th>
            <th>Total ret.</th>
            <th>Net a payer</th>
          </tr>
        </thead>
        <tbody>
          {livreMensuel.lignes.length === 0 ? (
            <tr>
              <td colSpan={10} className="etab-table-empty">
                Aucune donnee
              </td>
            </tr>
          ) : (
            livreMensuel.lignes.map((l) => (
              <tr key={l.salarie_id}>
                <td>{l.nom}</td>
                <td>{l.prenom}</td>
                <td>{formaterMontant(l.salaire_base)}</td>
                <td>{formaterMontant(l.brut)}</td>
                <td>{formaterMontant(l.cnss_salariale)}</td>
                <td>{formaterMontant(l.its)}</td>
                <td>{formaterMontant(l.camu)}</td>
                <td>{formaterMontant(l.tol)}</td>
                <td>{formaterMontant(l.total_retenues)}</td>
                <td>{formaterMontant(l.net_a_payer)}</td>
              </tr>
            ))
          )}
        </tbody>
        {livreMensuel.lignes.length > 0 && (
          <tfoot>
            <tr className="livre-paie-totaux">
              <td colSpan={2}>TOTAUX</td>
              <td>{formaterMontant(livreMensuel.totaux.salaire_base)}</td>
              <td>{formaterMontant(livreMensuel.totaux.brut)}</td>
              <td>{formaterMontant(livreMensuel.totaux.cnss_salariale)}</td>
              <td>{formaterMontant(livreMensuel.totaux.its)}</td>
              <td>{formaterMontant(livreMensuel.totaux.camu)}</td>
              <td>{formaterMontant(livreMensuel.totaux.tol)}</td>
              <td>{formaterMontant(livreMensuel.totaux.total_retenues)}</td>
              <td>{formaterMontant(livreMensuel.totaux.net_a_payer)}</td>
            </tr>
          </tfoot>
        )}
      </table>
      {livreMensuel.lignes.length > 0 && (
        <div className="declarations-footer-total">
          <span>Masse salariale nette</span>
          <span className="declarations-footer-amount">
            {formaterMontant(livreMensuel.totaux.net_a_payer)}
          </span>
        </div>
      )}
    </div>
  );
}

/* ---- Livre annuel ---- */

interface LivrePaieAnnuelTableProps {
  livreAnnuel: LivrePaieAnnuel;
  employeur: string;
  selectedAnnee: number;
}

export function LivrePaieAnnuelTable({
  livreAnnuel,
  employeur,
  selectedAnnee,
}: LivrePaieAnnuelTableProps): React.ReactElement {
  return (
    <div>
      <div className="declarations-section-header">
        <h4>Livre de paie annuel — {selectedAnnee}</h4>
      </div>
      <div className="declarations-info-bar">
        <div className="declarations-info-item">
          <span className="declarations-info-label">Employeur</span>
          <span className="declarations-info-value">{employeur}</span>
        </div>
        <div className="declarations-info-item">
          <span className="declarations-info-label">Annee</span>
          <span className="declarations-info-value">{selectedAnnee}</span>
        </div>
      </div>
      <table className="etab-table">
        <thead>
          <tr>
            <th>Mois</th>
            <th>Effectif</th>
            <th>Brut</th>
            <th>CNSS Sal.</th>
            <th>ITS</th>
            <th>CAMU</th>
            <th>TOL</th>
            <th>Total ret.</th>
            <th>Net a payer</th>
          </tr>
        </thead>
        <tbody>
          {livreAnnuel.mois.length === 0 ? (
            <tr>
              <td colSpan={9} className="etab-table-empty">
                Aucune donnee
              </td>
            </tr>
          ) : (
            livreAnnuel.mois.map((m) => (
              <tr key={m.mois}>
                <td>{MOIS_NOMS[m.mois]}</td>
                <td>{m.lignes.length}</td>
                <td>{formaterMontant(m.totaux.brut)}</td>
                <td>{formaterMontant(m.totaux.cnss_salariale)}</td>
                <td>{formaterMontant(m.totaux.its)}</td>
                <td>{formaterMontant(m.totaux.camu)}</td>
                <td>{formaterMontant(m.totaux.tol)}</td>
                <td>{formaterMontant(m.totaux.total_retenues)}</td>
                <td>{formaterMontant(m.totaux.net_a_payer)}</td>
              </tr>
            ))
          )}
        </tbody>
        {livreAnnuel.mois.length > 0 && (
          <tfoot>
            <tr className="livre-paie-totaux">
              <td colSpan={2}>TOTAUX</td>
              <td>{formaterMontant(livreAnnuel.totaux.brut)}</td>
              <td>{formaterMontant(livreAnnuel.totaux.cnss_salariale)}</td>
              <td>{formaterMontant(livreAnnuel.totaux.its)}</td>
              <td>{formaterMontant(livreAnnuel.totaux.camu)}</td>
              <td>{formaterMontant(livreAnnuel.totaux.tol)}</td>
              <td>{formaterMontant(livreAnnuel.totaux.total_retenues)}</td>
              <td>{formaterMontant(livreAnnuel.totaux.net_a_payer)}</td>
            </tr>
          </tfoot>
        )}
      </table>
      {livreAnnuel.mois.length > 0 && (
        <div className="declarations-footer-total">
          <span>Masse salariale nette annuelle</span>
          <span className="declarations-footer-amount">
            {formaterMontant(livreAnnuel.totaux.net_a_payer)}
          </span>
        </div>
      )}
    </div>
  );
}

/* ---- Livre par employe ---- */

interface LivrePaieEmployeTableProps {
  livreEmploye: LivrePaieEmploye | null;
  salaries: SalarieItem[];
  selectedSalarieId: string;
  selectedAnnee: number;
  onSalarieChange: (id: string) => void;
}

export function LivrePaieEmployeTable({
  livreEmploye,
  salaries,
  selectedSalarieId,
  selectedAnnee,
  onSalarieChange,
}: LivrePaieEmployeTableProps): React.ReactElement {
  if (salaries.length === 0) {
    return (
      <div className="wizard-alert info">
        Aucune donnee — ajoutez des salaries pour consulter le livre par employe.
      </div>
    );
  }

  return (
    <div>
      <div className="declarations-section-header">
        <h4>Livre de paie par employe — {selectedAnnee}</h4>
      </div>
      <div className="livre-paie-selector">
        <div className="wizard-form-group">
          <label>Salarie</label>
          <select
            value={selectedSalarieId}
            onChange={(e) => onSalarieChange(e.target.value)}
          >
            {salaries.map((s) => (
              <option key={String(s.id)} value={String(s.id)}>
                {s.identite?.nom || ''} {s.identite?.prenom || ''}
              </option>
            ))}
          </select>
        </div>
      </div>
      {livreEmploye ? (
        <>
          <div className="declarations-info-bar">
            <div className="declarations-info-item">
              <span className="declarations-info-label">Salarie</span>
              <span className="declarations-info-value">{livreEmploye.nom} {livreEmploye.prenom}</span>
            </div>
            <div className="declarations-info-item">
              <span className="declarations-info-label">Annee</span>
              <span className="declarations-info-value">{livreEmploye.annee}</span>
            </div>
          </div>
          <table className="etab-table">
            <thead>
              <tr>
                <th>Mois</th>
                <th>Salaire base</th>
                <th>Brut</th>
                <th>CNSS Sal.</th>
                <th>ITS</th>
                <th>CAMU</th>
                <th>TOL</th>
                <th>Total ret.</th>
                <th>Net a payer</th>
              </tr>
            </thead>
            <tbody>
              {livreEmploye.mois.length === 0 ? (
                <tr>
                  <td colSpan={9} className="etab-table-empty">
                    Aucune donnee
                  </td>
                </tr>
              ) : (
                livreEmploye.mois.map((m) => (
                  <tr key={m.mois}>
                    <td>{MOIS_NOMS[m.mois]}</td>
                    <td>{formaterMontant(m.salaire_base)}</td>
                    <td>{formaterMontant(m.brut)}</td>
                    <td>{formaterMontant(m.cnss_salariale)}</td>
                    <td>{formaterMontant(m.its)}</td>
                    <td>{formaterMontant(m.camu)}</td>
                    <td>{formaterMontant(m.tol)}</td>
                    <td>{formaterMontant(m.total_retenues)}</td>
                    <td>{formaterMontant(m.net_a_payer)}</td>
                  </tr>
                ))
              )}
            </tbody>
            {livreEmploye.mois.length > 0 && (
              <tfoot>
                <tr className="livre-paie-totaux">
                  <td>TOTAUX</td>
                  <td>{formaterMontant(livreEmploye.totaux.salaire_base)}</td>
                  <td>{formaterMontant(livreEmploye.totaux.brut)}</td>
                  <td>{formaterMontant(livreEmploye.totaux.cnss_salariale)}</td>
                  <td>{formaterMontant(livreEmploye.totaux.its)}</td>
                  <td>{formaterMontant(livreEmploye.totaux.camu)}</td>
                  <td>{formaterMontant(livreEmploye.totaux.tol)}</td>
                  <td>{formaterMontant(livreEmploye.totaux.total_retenues)}</td>
                  <td>{formaterMontant(livreEmploye.totaux.net_a_payer)}</td>
                </tr>
              </tfoot>
            )}
          </table>
          {livreEmploye.mois.length > 0 && (
            <div className="declarations-footer-total">
              <span>Net annuel {livreEmploye.nom} {livreEmploye.prenom}</span>
              <span className="declarations-footer-amount">
                {formaterMontant(livreEmploye.totaux.net_a_payer)}
              </span>
            </div>
          )}
        </>
      ) : (
        <div className="wizard-alert info">
          Selectionnez un salarie pour afficher son livre de paie.
        </div>
      )}
    </div>
  );
}
