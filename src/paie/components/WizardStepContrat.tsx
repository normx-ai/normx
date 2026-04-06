import React from 'react';
import type { SalarieForm, UpdateSectionFn } from './wizardTypes';

interface WizardStepAdresseProps {
  form: SalarieForm;
  updateSection: UpdateSectionFn;
}

export function WizardStepAdresse({ form, updateSection }: WizardStepAdresseProps): React.ReactElement {
  return (
    <div className="wizard-form-section">
      <h4>Adresse</h4>
      <div className="wizard-form-row">
        <div className="wizard-form-group">
          <label>Adresse</label>
          <input type="text" value={form.adresse.numero_voie} onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateSection('adresse', 'numero_voie', e.target.value)} />
        </div>
      </div>
      <div className="wizard-form-row">
        <div className="wizard-form-group">
          <label>Ville</label>
          <input type="text" value={form.adresse.ville} onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateSection('adresse', 'ville', e.target.value)} />
        </div>
        <div className="wizard-form-group">
          <label>Téléphone</label>
          <input type="tel" value={form.adresse.telephone1} onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateSection('adresse', 'telephone1', e.target.value)} placeholder="+242..." />
        </div>
      </div>
      <div className="wizard-form-row">
        <div className="wizard-form-group">
          <label>Email professionnel</label>
          <input type="email" value={form.adresse.email_pro} onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateSection('adresse', 'email_pro', e.target.value)} />
        </div>
        <div className="wizard-form-group">
          <label>Email personnel</label>
          <input type="email" value={form.adresse.email_perso} onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateSection('adresse', 'email_perso', e.target.value)} />
        </div>
      </div>
    </div>
  );
}

interface WizardStepBanqueProps {
  form: SalarieForm;
  updateSection: UpdateSectionFn;
}

export function WizardStepBanque({ form, updateSection }: WizardStepBanqueProps): React.ReactElement {
  return (
    <div className="wizard-form-section">
      <h4>Coordonnées bancaires</h4>
      <div className="wizard-form-row">
        <div className="wizard-form-group">
          <label>Nom de la banque</label>
          <input type="text" value={form.banque.nom_banque} onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateSection('banque', 'nom_banque', e.target.value)} />
        </div>
        <div className="wizard-form-group">
          <label>Titulaire</label>
          <input type="text" value={form.banque.titulaire} onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateSection('banque', 'titulaire', e.target.value)} />
        </div>
      </div>
      <div className="wizard-form-row">
        <div className="wizard-form-group">
          <label>IBAN</label>
          <input type="text" value={form.banque.iban} onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateSection('banque', 'iban', e.target.value)} />
        </div>
        <div className="wizard-form-group">
          <label>Code BIC</label>
          <input type="text" value={form.banque.code_bic} onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateSection('banque', 'code_bic', e.target.value)} />
        </div>
      </div>
    </div>
  );
}

interface WizardStepContratProps {
  form: SalarieForm;
  updateSection: UpdateSectionFn;
}

export function WizardStepContrat({ form, updateSection }: WizardStepContratProps): React.ReactElement {
  const isCDI = (form.contrat.type_contrat as string).startsWith('CDI');
  return (
    <div className="wizard-form-section">
      <h4>Contrat de travail</h4>
      <div className="wizard-form-row">
        <div className="wizard-form-group">
          <label>Date d'embauche <span className="required">*</span></label>
          <input type="date" value={form.contrat.date_embauche as string} onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateSection('contrat', 'date_embauche', e.target.value)} />
        </div>
        <div className="wizard-form-group">
          <label>Type de contrat <span className="required">*</span></label>
          <select value={form.contrat.type_contrat as string} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
            updateSection('contrat', 'type_contrat', e.target.value);
            if (e.target.value.startsWith('CDI')) {
              updateSection('contrat', 'date_fin_previsionnelle', '');
            }
          }}>
            <option value="">Sélectionnez...</option>
            <option>CDI - Contrat à Durée Indéterminée</option>
            <option>CDD - Contrat à Durée Déterminée</option>
            <option>Contrat journalier</option>
            <option>Contrat saisonnier</option>
            <option>Contrat d'apprentissage</option>
            <option>Stage</option>
          </select>
        </div>
      </div>
      <div className="wizard-form-row">
        <div className="wizard-form-group">
          <label>Fin période d'essai</label>
          <input type="date" value={form.contrat.fin_periode_essai as string} onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateSection('contrat', 'fin_periode_essai', e.target.value)} />
        </div>
        <div className="wizard-form-group">
          <label>Date fin prévisionnelle (CDD) {!isCDI && <span className="required">*</span>}</label>
          <input
            type="date"
            value={isCDI ? '' : form.contrat.date_fin_previsionnelle as string}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateSection('contrat', 'date_fin_previsionnelle', e.target.value)}
            disabled={isCDI}
            style={isCDI ? { background: '#f3f4f6', color: '#999', cursor: 'not-allowed' } : {}}
          />
          {isCDI && <span style={{ fontSize: 11, color: '#999' }}>Non applicable en CDI</span>}
        </div>
      </div>
    </div>
  );
}
