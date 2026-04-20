// Steps restants du wizard (tous courts) : param_organismes, taux, parametres, retraite, specificites.

import React from 'react';
import CONFIG_CONGO from '../../data/configCongo';
import type { EtablissementFormData, EtablissementFormValue } from '../wizardTypes';

interface Props {
  form: EtablissementFormData;
  updateForm: (field: string, value: EtablissementFormValue) => void;
}

export function StepParamOrganismes({ form, updateForm }: Props): React.ReactElement {
  return (
    <div className="wizard-form-section">
      <h4>Paramètres des organismes</h4>
      <p style={{ fontSize: 14, color: '#7a8a9b', marginBottom: 12 }}>Informations complémentaires pour les déclarations.</p>
      <div className="wizard-form-row">
        <div className="wizard-form-group">
          <label>Mode de déclaration CNSS</label>
          <select
            value={form.param_organismes.mode_cnss || ''}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => updateForm('param_organismes', { ...form.param_organismes, mode_cnss: e.target.value })}
          >
            <option value="">Sélectionnez...</option>
            <option value="mensuelle">Mensuelle (DNS)</option>
            <option value="trimestrielle">Trimestrielle</option>
          </select>
        </div>
        <div className="wizard-form-group">
          <label>Taux AT spécifique</label>
          <input
            type="text"
            value={form.param_organismes.taux_at || ''}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateForm('param_organismes', { ...form.param_organismes, taux_at: e.target.value })}
            placeholder="2.25% par défaut (1% à 5%)"
          />
        </div>
      </div>
      <div className="wizard-form-row">
        <div className="wizard-form-group">
          <label>Zone TOL</label>
          <select
            value={form.param_organismes.zone_tol || 'centre_ville'}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => updateForm('param_organismes', { ...form.param_organismes, zone_tol: e.target.value })}
          >
            <option value="centre_ville">Centre-ville (5 000 FCFA)</option>
            <option value="peripherie">Périphérie (1 000 FCFA)</option>
          </select>
        </div>
        <div className="wizard-form-group">
          <label>Profil salariés par défaut</label>
          <select
            value={form.param_organismes.profil || 'national'}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => updateForm('param_organismes', { ...form.param_organismes, profil: e.target.value })}
          >
            <option value="national">National (résident)</option>
            <option value="non_resident">Non-résident</option>
          </select>
        </div>
      </div>
    </div>
  );
}

export function StepTaux(): React.ReactElement {
  return (
    <div className="wizard-form-section">
      <h4>Taux de cotisations</h4>
      {CONFIG_CONGO.tauxSections.map(section => (
        <div key={section.key} className="taux-section">
          <h5>{section.label}</h5>
          <table className="wizard-table">
            <thead>
              <tr><th>Élément</th><th>Valeur</th><th>Unité</th></tr>
            </thead>
            <tbody>
              {section.lignes.map((l, i) => (
                <tr key={i}><td>{l.element}</td><td>{l.valeur}</td><td>{l.unite}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  );
}

export function StepParametres(): React.ReactElement {
  return (
    <div className="wizard-form-section">
      <h4>Paramètres</h4>
      <div className="wizard-accordion">
        <div className="wizard-accordion-header">Planning hebdomadaire</div>
        <div className="wizard-accordion-body">
          <p style={{ fontSize: 14, color: '#7a8a9b', marginBottom: 8 }}>
            Horaires par défaut : {CONFIG_CONGO.planningDefaults.heuresJour}h/jour, {CONFIG_CONGO.planningDefaults.heuresSemaine}h/semaine, {CONFIG_CONGO.planningDefaults.heuresMois}h/mois
          </p>
        </div>
      </div>
      <div className="wizard-accordion">
        <div className="wizard-accordion-header">Paiement</div>
        <div className="wizard-accordion-body">
          <div className="wizard-form-row">
            <div className="wizard-form-group">
              <label>Mode de paiement</label>
              <select defaultValue="Virement">
                <option>Virement</option>
                <option>Chèque</option>
                <option>Espèces</option>
              </select>
            </div>
            <div className="wizard-form-group">
              <label>Jour de paiement</label>
              <select defaultValue="Dernier jour du mois">
                <option>Dernier jour du mois</option>
                <option>25</option>
                <option>28</option>
              </select>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function StepRetraite(): React.ReactElement {
  return (
    <div className="wizard-form-section">
      <h4>Retraite</h4>
      <div className="wizard-alert info">
        <span>La retraite au Congo est gérée par la CNSS (branche PVID). Taux : 4% salarial + 8% patronal, plafond 1 200 000 XAF.</span>
      </div>
    </div>
  );
}

export function StepSpecificites({ form, updateForm }: Props): React.ReactElement {
  return (
    <div className="wizard-form-section">
      <h4>Spécificités Congo</h4>
      <div className="wizard-form-row">
        <div className="wizard-form-group">
          <label>Convention collective applicable</label>
          <select
            value={form.specificites?.convention || ''}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => updateForm('specificites', { ...form.specificites, convention: e.target.value })}
          >
            <option value="">Convention générale du travail</option>
            <option value="AGRI_FORET">Agriculture et Forêt</option>
            <option value="AUXILIAIRES_TRANSPORT">Auxiliaires de Transport</option>
            <option value="BAM">Banques, Assurances et Microfinance (BAM)</option>
            <option value="BTP">Bâtiment et Travaux Publics (BTP)</option>
            <option value="COMMERCE">Commerce</option>
            <option value="DOMESTIQUE">Domestique de Maison</option>
            <option value="FORESTIERE">Forestière</option>
            <option value="HOTELLERIE_CATERING">Hôtellerie et Catering</option>
            <option value="INDUSTRIE">Industrie</option>
            <option value="INFO_COMM">Information et Communication</option>
            <option value="MINIERE">Exploitation Minière</option>
            <option value="NTIC">NTIC</option>
            <option value="PARA_PETROLE">Para-Pétrole</option>
            <option value="PECHE_MARITIME">Pêche Maritime Industrielle</option>
            <option value="PETROLE">Pétrole</option>
            <option value="TRANSPORT_AERIEN">Transport Aérien</option>
          </select>
        </div>
      </div>
      <div className="wizard-form-row">
        <div className="wizard-form-group">
          <label>Secteur d'activité</label>
          <input type="text" placeholder="Ex: Services, BTP, Commerce..." />
        </div>
      </div>
    </div>
  );
}
