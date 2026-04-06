import React, { useState } from 'react';
import { SALARIE_STEPS, getEmptySalarieForm } from '../data/salarieData';
import type { SalarieForm, Etablissement, Salarie } from './wizardTypes';
import WizardStepIdentite from './WizardStepIdentite';
import { WizardStepAdresse, WizardStepBanque, WizardStepContrat } from './WizardStepContrat';
import WizardStepEmploi from './WizardStepEmploi';
import WizardStepSalaire from './WizardStepSalaire';
import WizardStepClassification from './WizardStepClassification';

interface SalarieWizardProps {
  onClose: () => void;
  onSave: (data: Record<string, Record<string, string | number | boolean | null | undefined>>) => void;
  etablissements: Etablissement[];
  salaries: Salarie[];
}

function genererCodeSalarie(salaries: Salarie[] = []): string {
  const existants = (salaries || [])
    .map(s => s.identite?.code || '')
    .filter(c => /^SAL-\d+$/.test(c))
    .map(c => parseInt(c.replace('SAL-', ''), 10));
  const max = existants.length > 0 ? Math.max(...existants) : 0;
  return `SAL-${String(max + 1).padStart(4, '0')}`;
}

function SalarieWizard({ onClose, onSave, etablissements, salaries }: SalarieWizardProps): React.ReactElement {
  const [currentStep, setCurrentStep] = useState<number>(0);
  const [form, setForm] = useState<SalarieForm>(() => {
    const f = getEmptySalarieForm() as SalarieForm;
    if (!f.identite) f.identite = {} as Record<string, string | number | boolean | null>;
    (f.identite as Record<string, string | number | boolean | null>).code = genererCodeSalarie(salaries);
    return f;
  });

  const stepId = SALARIE_STEPS[currentStep].id;

  const updateSection = (section: string, field: string, value: string | boolean | Record<string, string>): void => {
    setForm(prev => ({
      ...prev,
      [section]: { ...(prev[section] as Record<string, string | number | boolean | null | Record<string, string>>), [field]: value },
    }));
  };

  const handleSave = (): void => {
    const erreurs: string[] = [];
    if (!form.identite.nom) erreurs.push('Nom');
    if (!form.identite.prenom) erreurs.push('Prénom');
    if (!form.identite.situation_familiale) erreurs.push('Situation familiale');
    if (form.identite.nb_enfants === '' || form.identite.nb_enfants === undefined) erreurs.push('Nombre d\'enfants');
    if (!form.contrat.date_embauche) erreurs.push('Date d\'embauche');
    if (!form.contrat.type_contrat) erreurs.push('Type de contrat');
    if (!form.salaire_horaires.salaire_base || form.salaire_horaires.salaire_base === '0') erreurs.push('Salaire de base');

    if (erreurs.length > 0) {
      alert(`Champs obligatoires manquants :\n\u2022 ${erreurs.join('\n\u2022 ')}\n\nLa situation familiale et le nombre d'enfants sont nécessaires pour le calcul de l'ITS.`);
      return;
    }
    onSave(form as Record<string, Record<string, string | number | boolean | null | undefined>>);
  };

  const renderStepContent = (): React.ReactElement => {
    switch (stepId) {
      case 'identite':
        return <WizardStepIdentite form={form} updateSection={updateSection} />;
      case 'adresse':
        return <WizardStepAdresse form={form} updateSection={updateSection} />;
      case 'banque':
        return <WizardStepBanque form={form} updateSection={updateSection} />;
      case 'contrat':
        return <WizardStepContrat form={form} updateSection={updateSection} />;
      case 'emploi':
        return <WizardStepEmploi form={form} setForm={setForm} updateSection={updateSection} etablissements={etablissements} />;
      case 'salaire_horaires':
        return <WizardStepSalaire form={form} updateSection={updateSection} />;
      case 'classification':
        return <WizardStepClassification form={form} setForm={setForm} updateSection={updateSection} />;
      default:
        return (
          <div className="wizard-form-section">
            <h4>{SALARIE_STEPS[currentStep].label}</h4>
            <p style={{ fontSize: 12, color: '#9ca3af' }}>Configuration de cette section en cours de développement.</p>
          </div>
        );
    }
  };

  return (
    <div className="wizard-overlay">
      <div className="wizard-modal">
        <div className="wizard-modal-header">
          <h3>Nouveau salarié</h3>
          <button className="wizard-close-btn" onClick={onClose}>&times;</button>
        </div>

        <div className="wizard-body">
          <div className="wizard-sidebar">
            {SALARIE_STEPS.map((step, i) => (
              <button
                key={step.id}
                className={`wizard-nav-item ${currentStep === i ? 'active' : ''}`}
                onClick={() => setCurrentStep(i)}
              >
                <span className="wizard-nav-icon">{i + 1}</span>
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
            {currentStep < SALARIE_STEPS.length - 1 ? (
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

export default SalarieWizard;
