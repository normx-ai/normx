// Onglet Declaration Nominative : fiche individuelle par salarie.

import React from 'react';
import { formaterMontant } from '../../utils/calculPaie';
import type { DeclarationNominative } from '../../data/declarations';
import { MOIS_NOMS, SalarieItem } from './declarationsShared';

interface Props {
  salaries: SalarieItem[];
  selectedSalarieId: string;
  setSelectedSalarieId: (id: string) => void;
  nominative: DeclarationNominative | null;
  mois: number;
  annee: number;
}

export function NominativeTab({ salaries, selectedSalarieId, setSelectedSalarieId, nominative, mois, annee }: Props): React.ReactElement {
  if (salaries.length === 0) {
    return (
      <div className="wizard-alert info">
        Aucune donnee — ajoutez des salaries pour generer les declarations nominatives.
      </div>
    );
  }

  return (
    <div>
      <div className="declarations-section-header">
        <h4>Declaration Nominative — {MOIS_NOMS[mois]} {annee}</h4>
      </div>
      <div className="declarations-salarie-selector">
        <div className="wizard-form-group">
          <label>Salarie</label>
          <select
            value={selectedSalarieId}
            onChange={(e) => setSelectedSalarieId(e.target.value)}
          >
            {salaries.map((s) => (
              <option key={String(s.id)} value={String(s.id)}>
                {s.identite?.nom || ''} {s.identite?.prenom || ''}
              </option>
            ))}
          </select>
        </div>
      </div>
      {nominative ? (
        <div className="declarations-card">
          <h4>Fiche individuelle — {nominative.salarie_nom} {nominative.salarie_prenom}</h4>
          <div className="declarations-card-row">
            <span className="declarations-card-label">N Securite Sociale</span>
            <span className="declarations-card-value">{nominative.numero_ss}</span>
          </div>
          <div className="declarations-card-row">
            <span className="declarations-card-label">Periode</span>
            <span className="declarations-card-value">{MOIS_NOMS[nominative.mois]} {nominative.annee}</span>
          </div>
          <div className="declarations-card-row">
            <span className="declarations-card-label">Salaire de base</span>
            <span className="declarations-card-value">{formaterMontant(nominative.salaire_base)}</span>
          </div>
          <div className="declarations-card-row">
            <span className="declarations-card-label">Salaire brut</span>
            <span className="declarations-card-value">{formaterMontant(nominative.brut)}</span>
          </div>
          <div className="declarations-card-row">
            <span className="declarations-card-label">CNSS salariale (4%)</span>
            <span className="declarations-card-value">{formaterMontant(nominative.cnss_salariale)}</span>
          </div>
          <div className="declarations-card-row">
            <span className="declarations-card-label">CNSS patronale PVID (8%)</span>
            <span className="declarations-card-value">{formaterMontant(nominative.cnss_patronale_vieillesse)}</span>
          </div>
          <div className="declarations-card-row">
            <span className="declarations-card-label">CNSS patronale AF (10,03%)</span>
            <span className="declarations-card-value">{formaterMontant(nominative.cnss_patronale_af)}</span>
          </div>
          <div className="declarations-card-row">
            <span className="declarations-card-label">CNSS patronale AT (2,25%)</span>
            <span className="declarations-card-value">{formaterMontant(nominative.cnss_patronale_at)}</span>
          </div>
          <div className="declarations-card-row">
            <span className="declarations-card-label">ITS (Art. 116 CGI)</span>
            <span className="declarations-card-value">{formaterMontant(nominative.its)}</span>
          </div>
          <div className="declarations-card-row">
            <span className="declarations-card-label">TUS Impot (1,5%)</span>
            <span className="declarations-card-value">{formaterMontant(nominative.tus_impot)}</span>
          </div>
          <div className="declarations-card-row">
            <span className="declarations-card-label">TUS CNSS (6%)</span>
            <span className="declarations-card-value">{formaterMontant(nominative.tus_cnss)}</span>
          </div>
          <div className="declarations-card-row">
            <span className="declarations-card-label">CAMU</span>
            <span className="declarations-card-value">{formaterMontant(nominative.camu_salariale)}</span>
          </div>
          <div className="declarations-card-row">
            <span className="declarations-card-label">Taxe sur les locaux</span>
            <span className="declarations-card-value">{formaterMontant(nominative.taxe_locaux)}</span>
          </div>
          <div className="declarations-card-row" style={{ borderTop: '2px solid #D4A843', marginTop: 8, paddingTop: 10 }}>
            <span className="declarations-card-label" style={{ fontWeight: 700, color: '#1A3A5C' }}>Net a payer</span>
            <span className="declarations-card-value" style={{ fontSize: 15, color: '#D4A843' }}>{formaterMontant(nominative.net_a_payer)}</span>
          </div>
        </div>
      ) : (
        <div className="wizard-alert info">
          Selectionnez un salarie pour afficher sa declaration nominative.
        </div>
      )}
    </div>
  );
}
