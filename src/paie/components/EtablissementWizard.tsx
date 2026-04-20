import React, { useState } from 'react';
import CONFIG_CONGO from '../data/configCongo';
import type { EtablissementFormData, EtablissementFormValue } from './wizardTypes';
import { EMPTY_FORM, STEP_LABELS, mergeInitial } from './wizard/wizardConstants';
import { StepIdentite, StepAdresse } from './wizard/StepIdentiteAdresse';
import { StepBanques } from './wizard/StepBanques';
import { StepContacts } from './wizard/StepContacts';
import { StepOrganismes } from './wizard/StepOrganismes';
import {
  StepParamOrganismes,
  StepTaux,
  StepParametres,
  StepRetraite,
  StepSpecificites,
} from './wizard/StepsSimples';

export type { EtablissementFormData } from './wizardTypes';

void EMPTY_FORM;

interface EtablissementWizardProps {
  onClose: () => void;
  onSave: (data: EtablissementFormData) => void;
  initialData?: EtablissementFormData;
}

function EtablissementWizard({ onClose, onSave, initialData }: EtablissementWizardProps): React.ReactElement {
  const isEdit = !!initialData;
  const [currentStep, setCurrentStep] = useState<number>(0);
  const [form, setForm] = useState<EtablissementFormData>(() => mergeInitial(initialData));

  const updateForm = (field: string, value: EtablissementFormValue): void => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = (): void => { onSave(form); };

  const stepId = CONFIG_CONGO.steps[currentStep];

  const renderStepContent = (): React.ReactElement => {
    switch (stepId) {
      case 'identite': return <StepIdentite form={form} updateForm={updateForm} />;
      case 'adresse': return <StepAdresse form={form} updateForm={updateForm} />;
      case 'banques': return <StepBanques form={form} updateForm={updateForm} />;
      case 'contacts': return <StepContacts form={form} updateForm={updateForm} />;
      case 'organismes': return <StepOrganismes form={form} updateForm={updateForm} />;
      case 'param_organismes': return <StepParamOrganismes form={form} updateForm={updateForm} />;
      case 'taux': return <StepTaux />;
      case 'parametres': return <StepParametres />;
      case 'retraite': return <StepRetraite />;
      case 'specificites': return <StepSpecificites form={form} updateForm={updateForm} />;
      default: return <p style={{ color: '#9ca3af' }}>Section en cours de développement.</p>;
    }
  };

  return (
    <div className="wizard-overlay">
      <div className="wizard-modal">
        <div className="wizard-modal-header">
          <h3>{isEdit ? "Modifier l'établissement" : 'Nouvel établissement'}</h3>
          <button className="wizard-close-btn" onClick={onClose}>&times;</button>
        </div>

        <div className="wizard-body">
          <div className="wizard-sidebar">
            {STEP_LABELS.map((step, i) => (
              <button
                key={step.id}
                className={`wizard-nav-item ${currentStep === i ? 'active' : ''}`}
                onClick={() => setCurrentStep(i)}
              >
                <span className="wizard-nav-icon">{step.num}</span>
                <span>{step.label}</span>
              </button>
            ))}
          </div>

          <div className="wizard-step-content">
            {renderStepContent()}
          </div>
        </div>

        <div className="wizard-footer">
          <div className="wizard-footer-left">
            {currentStep > 0 && (
              <button className="btn-wizard-cancel" onClick={() => setCurrentStep(s => s - 1)}>Précédent</button>
            )}
          </div>
          <div className="wizard-footer-right">
            <button className="btn-wizard-cancel" onClick={onClose}>Annuler</button>
            {currentStep < CONFIG_CONGO.steps.length - 1 ? (
              <button className="btn-wizard-next" onClick={() => setCurrentStep(s => s + 1)}>Suivant</button>
            ) : (
              <button className="btn-wizard-save" onClick={handleSave}>Enregistrer</button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default EtablissementWizard;
