// Steps 1 et 2 du wizard : identite + adresse (courts).

import React from 'react';
import CONFIG_CONGO from '../../data/configCongo';
import type { EtablissementFormData, EtablissementFormValue } from '../wizardTypes';

interface StepProps {
  form: EtablissementFormData;
  updateForm: (field: string, value: EtablissementFormValue) => void;
}

export function StepIdentite({ form, updateForm }: StepProps): React.ReactElement {
  return (
    <div className="wizard-form-section">
      <h4>Identité de l'établissement</h4>
      <div className="wizard-form-row">
        <div className="wizard-form-group">
          <label>Raison sociale <span className="required">*</span></label>
          <input
            type="text"
            value={form.raison_sociale}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateForm('raison_sociale', e.target.value)}
            placeholder="Nom de l'établissement"
          />
        </div>
      </div>
      <div className="wizard-form-row">
        <div className="wizard-form-group">
          <label>{CONFIG_CONGO.identifiantLabel}</label>
          <input
            type="text"
            value={form.nui}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateForm('nui', e.target.value)}
            placeholder={CONFIG_CONGO.identifiantPlaceholder}
          />
        </div>
        <div className="wizard-form-group">
          <label>Forme juridique</label>
          <select
            value={form.forme_juridique || ''}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => updateForm('forme_juridique', e.target.value)}
          >
            <option value="">Sélectionnez...</option>
            <option value="SARL">SARL</option>
            <option value="SA">SA</option>
            <option value="SAS">SAS</option>
            <option value="EI">Entreprise Individuelle</option>
            <option value="ASSOCIATION">Association</option>
            <option value="ONG">ONG</option>
            <option value="ETAT">Établissement public</option>
          </select>
        </div>
      </div>
    </div>
  );
}

export function StepAdresse({ form, updateForm }: StepProps): React.ReactElement {
  return (
    <div className="wizard-form-section">
      <h4>Adresse</h4>
      <div className="wizard-form-row">
        <div className="wizard-form-group">
          <label>Numéro et voie</label>
          <input
            type="text"
            value={form.adresse.voie}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateForm('adresse', { ...form.adresse, voie: e.target.value })}
          />
        </div>
      </div>
      <div className="wizard-form-row">
        <div className="wizard-form-group">
          <label>Ville</label>
          <input
            type="text"
            value={form.adresse.ville}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateForm('adresse', { ...form.adresse, ville: e.target.value })}
            placeholder="Brazzaville"
          />
        </div>
        <div className="wizard-form-group">
          <label>Pays</label>
          <select disabled value="CONGO"><option>CONGO</option></select>
        </div>
      </div>
    </div>
  );
}
