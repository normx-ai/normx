import React from 'react';
import type { SalarieForm, UpdateSectionFn } from './wizardTypes';

interface WizardStepIdentiteProps {
  form: SalarieForm;
  updateSection: UpdateSectionFn;
}

function WizardStepIdentite({ form, updateSection }: WizardStepIdentiteProps): React.ReactElement {
  return (
    <div className="wizard-form-section">
      <h4>Identité du salarié</h4>
      <div className="wizard-form-row">
        <div className="wizard-form-group">
          <label>Code salarié <span style={{ fontSize: 10, color: '#888', fontWeight: 400 }}>(auto)</span></label>
          <input type="text" value={form.identite.code as string} readOnly style={{ background: '#f3f4f6', color: '#555', cursor: 'default' }} />
        </div>
        <div className="wizard-form-group">
          <label>Civilité</label>
          <select value={form.identite.civilite as string} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => updateSection('identite', 'civilite', e.target.value)}>
            <option>Monsieur</option><option>Madame</option>
          </select>
        </div>
      </div>
      <div className="wizard-form-row">
        <div className="wizard-form-group">
          <label>Nom <span className="required">*</span></label>
          <input type="text" value={form.identite.nom as string} onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateSection('identite', 'nom', e.target.value)} />
        </div>
        <div className="wizard-form-group">
          <label>Prénom <span className="required">*</span></label>
          <input type="text" value={form.identite.prenom as string} onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateSection('identite', 'prenom', e.target.value)} />
        </div>
      </div>
      <div className="wizard-form-row">
        <div className="wizard-form-group">
          <label>Date de naissance</label>
          <input type="date" value={form.identite.date_naissance as string} onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateSection('identite', 'date_naissance', e.target.value)} />
        </div>
        <div className="wizard-form-group">
          <label>Situation familiale <span className="required">*</span></label>
          <select value={form.identite.situation_familiale as string} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => updateSection('identite', 'situation_familiale', e.target.value)}>
            <option value="">Sélectionnez...</option>
            <option>Célibataire</option><option>Marié(e)</option><option>Divorcé(e)</option><option>Veuf/veuve</option>
          </select>
        </div>
      </div>
      <div className="wizard-form-row">
        <div className="wizard-form-group">
          <label>Nombre d'enfants <span className="required">*</span></label>
          <input type="number" value={form.identite.nb_enfants as string} onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateSection('identite', 'nb_enfants', e.target.value)} min="0" />
        </div>
        <div className="wizard-form-group">
          <label>N° Sécurité Sociale (CNSS)</label>
          <input type="text" value={form.identite.num_ss as string} onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateSection('identite', 'num_ss', e.target.value)} placeholder="Numéro CNSS" />
        </div>
      </div>
      <div className="wizard-form-row">
        <div className="wizard-form-group">
          <label>Nationalité</label>
          <select value={form.identite.nationalite as string} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => updateSection('identite', 'nationalite', e.target.value)}>
            <option value="CONGO">Congo</option><option value="CAMEROUN">Cameroun</option><option value="GABON">Gabon</option><option value="RDC">RDC</option><option value="FRANCE">France</option><option value="AUTRE">Autre</option>
          </select>
        </div>
        <div className="wizard-form-group">
          <label>Lieu de naissance</label>
          <input type="text" value={form.identite.commune_naissance as string} onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateSection('identite', 'commune_naissance', e.target.value)} placeholder="Brazzaville, Pointe-Noire..." />
        </div>
      </div>
    </div>
  );
}

export default WizardStepIdentite;
