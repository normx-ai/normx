import React from 'react';
import { getGrille, getCategoriesGrille, getEchelonsGrille, getSalaireBase } from '../data/grillesSalariales';
import type { SalarieForm, SetFormFn, UpdateSectionFn } from './wizardTypes';

interface WizardStepClassificationProps {
  form: SalarieForm;
  setForm: SetFormFn;
  updateSection: UpdateSectionFn;
}

function WizardStepClassification({ form, setForm, updateSection }: WizardStepClassificationProps): React.ReactElement {
  const ccCode = form.emploi.convention_collective || '';
  const grille = getGrille(ccCode);
  const categoriesGrille = getCategoriesGrille(ccCode);
  const echelonsGrille = form.classification.categorie_grille
    ? getEchelonsGrille(ccCode, form.classification.categorie_grille)
    : [];

  return (
    <div className="wizard-form-section">
      <h4>Classification</h4>

      {grille ? (
        <>
          <div style={{ marginBottom: 12, padding: 10, background: '#f9f7f0', borderRadius: 6, border: '1px solid #e5e0cc', fontSize: 12 }}>
            <strong>Grille salariale — {grille.label}</strong>
            <div style={{ color: '#888', fontSize: 11, marginTop: 2 }}>{grille.source}</div>
            <div style={{ color: '#888', fontSize: 11 }}>Date d'effet : {grille.dateEffet}</div>
          </div>

          <div className="wizard-form-row">
            <div className="wizard-form-group">
              <label>Catégorie <span className="required">*</span></label>
              <select
                value={form.classification.categorie_grille || ''}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
                  const cat = e.target.value;
                  setForm(prev => ({
                    ...prev,
                    classification: { ...prev.classification, categorie_grille: cat, echelon_grille: '' },
                  }));
                }}
              >
                <option value="">Sélectionnez...</option>
                {categoriesGrille.map(c => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </div>
            <div className="wizard-form-group">
              <label>Échelon <span className="required">*</span></label>
              <select
                value={form.classification.echelon_grille || ''}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
                  const ech = e.target.value;
                  const salaire = getSalaireBase(ccCode, form.classification.categorie_grille, ech);
                  setForm(prev => ({
                    ...prev,
                    classification: { ...prev.classification, echelon_grille: ech },
                    salaire_horaires: { ...prev.salaire_horaires, salaire_base: salaire ? String(salaire) : prev.salaire_horaires.salaire_base as string },
                  }));
                }}
              >
                <option value="">Sélectionnez...</option>
                {echelonsGrille.map(e => (
                  <option key={e.value} value={e.value}>{e.label}</option>
                ))}
              </select>
            </div>
          </div>

          {form.classification.categorie_grille && form.classification.echelon_grille && (
            <div style={{ marginTop: 12, padding: 12, background: '#e8f5e9', borderRadius: 6, border: '1px solid #a5d6a7' }}>
              <strong style={{ fontSize: 14, color: '#2e7d32' }}>
                Salaire de base : {new Intl.NumberFormat('fr-FR').format(getSalaireBase(ccCode, form.classification.categorie_grille, form.classification.echelon_grille) || 0)} FCFA
              </strong>
              <div style={{ fontSize: 11, color: '#388e3c', marginTop: 4 }}>
                Ce montant a été reporté dans l'étape "Salaire et horaires"
              </div>
            </div>
          )}
        </>
      ) : (
        <div style={{ marginBottom: 12, padding: 10, background: '#fff8e1', borderRadius: 6, border: '1px solid #ffe082', fontSize: 12, color: '#f57f17' }}>
          Aucune grille salariale disponible pour cette convention. Saisissez la classification manuellement.
        </div>
      )}

      <div className="wizard-form-row" style={{ marginTop: 16 }}>
        <div className="wizard-form-group">
          <label>Emploi conventionnel</label>
          <input type="text" value={form.classification.emploi_conventionnel} onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateSection('classification', 'emploi_conventionnel', e.target.value)} />
        </div>
        <div className="wizard-form-group">
          <label>Catégorie conventionnelle</label>
          <input type="text" value={form.classification.categorie_conventionnelle} onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateSection('classification', 'categorie_conventionnelle', e.target.value)} />
        </div>
      </div>
      <div className="wizard-form-row">
        <div className="wizard-form-group">
          <label>Niveau</label>
          <input type="text" value={form.classification.niveau} onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateSection('classification', 'niveau', e.target.value)} />
        </div>
        <div className="wizard-form-group">
          <label>Coefficient</label>
          <input type="text" value={form.classification.coefficient} onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateSection('classification', 'coefficient', e.target.value)} />
        </div>
        <div className="wizard-form-group">
          <label>Indice</label>
          <input type="text" value={form.classification.indice} onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateSection('classification', 'indice', e.target.value)} />
        </div>
      </div>
    </div>
  );
}

export default WizardStepClassification;
