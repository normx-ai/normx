import React from 'react';
import { CONVENTIONS_COLLECTIVES } from '../data/salarieData';
import { getGrille, getCategoriesGrille, getEchelonsGrille, getSalaireBase } from '../data/grillesSalariales';
import type { SalarieForm, SetFormFn, UpdateSectionFn, Etablissement } from './wizardTypes';

interface WizardStepEmploiProps {
  form: SalarieForm;
  setForm: SetFormFn;
  updateSection: UpdateSectionFn;
  etablissements: Etablissement[];
}

function WizardStepEmploi({ form, setForm, updateSection, etablissements }: WizardStepEmploiProps): React.ReactElement {
  const convEmploi = form.emploi.convention_collective || '';
  const categoriesConv = getCategoriesGrille(convEmploi);
  const hasGrille = categoriesConv.length > 0;

  return (
    <div className="wizard-form-section">
      <h4>Emploi</h4>
      <div className="wizard-form-row">
        <div className="wizard-form-group">
          <label>Établissement</label>
          <select value={form.emploi.etablissement} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => updateSection('emploi', 'etablissement', e.target.value)}>
            <option value="">Sélectionnez...</option>
            {etablissements.map(e => <option key={e.id} value={e.id as string}>{e.raison_sociale}</option>)}
          </select>
        </div>
        <div className="wizard-form-group">
          <label>Emploi / Poste</label>
          <input type="text" value={form.emploi.emploi} onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateSection('emploi', 'emploi', e.target.value)} />
        </div>
      </div>
      <div className="wizard-form-row">
        <div className="wizard-form-group">
          <label>Convention collective <span className="required">*</span></label>
          <select value={convEmploi} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
            updateSection('emploi', 'convention_collective', e.target.value);
            setForm(prev => ({
              ...prev,
              emploi: { ...prev.emploi, convention_collective: e.target.value, categorie: '' },
              classification: { ...prev.classification, categorie_grille: '', echelon_grille: '' },
            }));
          }}>
            {CONVENTIONS_COLLECTIVES.map(c => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </select>
        </div>
        <div className="wizard-form-group">
          <label>Catégorie <span className="required">*</span></label>
          {hasGrille ? (
            <select value={form.emploi.categorie} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
              const cat = e.target.value;
              updateSection('emploi', 'categorie', cat);
              setForm(prev => ({
                ...prev,
                emploi: { ...prev.emploi, categorie: cat },
                classification: { ...prev.classification, categorie_grille: cat, echelon_grille: '' },
              }));
            }}>
              <option value="">Sélectionnez...</option>
              {categoriesConv.map(c => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
          ) : (
            <select value={form.emploi.categorie} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => updateSection('emploi', 'categorie', e.target.value)}>
              <option value="">Sélectionnez...</option>
              <option>Manoeuvre</option><option>Ouvrier</option><option>Employé</option>
              <option>Agent de maîtrise</option><option>Cadre</option><option>Cadre supérieur</option>
            </select>
          )}
          {hasGrille && <span style={{ fontSize: 10, color: '#888' }}>Catégories de la convention {getGrille(convEmploi)?.label}</span>}
        </div>
      </div>
      {hasGrille && form.emploi.categorie && (
        <div className="wizard-form-row">
          <div className="wizard-form-group">
            <label>Échelon <span className="required">*</span></label>
            <select value={form.classification.echelon_grille || ''} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
              const ech = e.target.value;
              const salaire = getSalaireBase(convEmploi, form.emploi.categorie, ech);
              setForm(prev => ({
                ...prev,
                classification: { ...prev.classification, echelon_grille: ech },
                salaire_horaires: { ...prev.salaire_horaires, salaire_base: salaire ? String(salaire) : prev.salaire_horaires.salaire_base as string },
              }));
            }}>
              <option value="">Sélectionnez...</option>
              {getEchelonsGrille(convEmploi, form.emploi.categorie).map(e => (
                <option key={e.value} value={e.value}>{e.label}</option>
              ))}
            </select>
          </div>
          <div className="wizard-form-group">
            <label>Salaire de base (grille)</label>
            {form.classification.echelon_grille ? (
              <div style={{ padding: '8px 12px', background: '#e8f5e9', borderRadius: 6, border: '1px solid #a5d6a7', fontWeight: 700, color: '#2e7d32', fontSize: 14 }}>
                {new Intl.NumberFormat('fr-FR').format(getSalaireBase(convEmploi, form.emploi.categorie, form.classification.echelon_grille) || 0)} FCFA
              </div>
            ) : (
              <div style={{ padding: '8px 12px', background: '#f3f4f6', borderRadius: 6, color: '#999', fontSize: 12 }}>
                Sélectionnez un échelon
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default WizardStepEmploi;
