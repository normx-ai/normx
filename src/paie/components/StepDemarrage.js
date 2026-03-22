import React from 'react';
import Icon from '../../dashboard/Icon';

const MOIS = [
  'Janvier','Février','Mars','Avril','Mai','Juin',
  'Juillet','Août','Septembre','Octobre','Novembre','Décembre'
];
const ANNEES = [2024, 2025, 2026, 2027];

function StepDemarrage({ mois, annee, onMoisChange, onAnneeChange }) {
  return (
    <div className="paie-dashboard">
      <div className="paie-dashboard-header">
        <h3>Démarrage</h3>
        <p>
          Bienvenue dans l'assistant de création de votre dossier de paie.
          Cet assistant va vous guider à travers les différentes étapes de paramétrage.
        </p>
      </div>

      <div className="step-periode-section">
        <h4>Paramètres de démarrage</h4>
        <p className="step-periode-desc">Sélectionnez le mois et l'année de démarrage de votre dossier.</p>
        <div className="step-periode-selects">
          <div className="wizard-form-group">
            <label>Pays</label>
            <select disabled value="congo">
              <option value="congo">Congo-Brazzaville</option>
            </select>
          </div>
          <div className="wizard-form-group">
            <label>Mois <span className="required">*</span></label>
            <select value={mois} onChange={e => onMoisChange(Number(e.target.value))}>
              {MOIS.map((m, i) => <option key={i} value={i}>{m}</option>)}
            </select>
          </div>
          <div className="wizard-form-group">
            <label>Année <span className="required">*</span></label>
            <select value={annee} onChange={e => onAnneeChange(Number(e.target.value))}>
              {ANNEES.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>
        </div>
      </div>

      <div className="step-demarrage-content">
        <div className="step-card">
          <div className="step-card-icon"><Icon name="task" size="lg" /></div>
          <h4>Ce que vous allez configurer :</h4>
          <ul className="step-checklist">
            <li>Les informations de votre dossier de paie</li>
            <li>Vos établissements et leurs paramètres</li>
            <li>Les salariés rattachés à chaque établissement</li>
            <li>Les taux, organismes et cotisations CNSS/CAMU</li>
          </ul>
        </div>

        <div className="step-card">
          <div className="step-card-icon"><Icon name="info" size="lg" /></div>
          <h4>Avant de commencer :</h4>
          <ul className="step-checklist">
            <li>Munissez-vous du NUI de chaque établissement</li>
            <li>Préparez les coordonnées bancaires (IBAN)</li>
            <li>Identifiez vos organismes sociaux (CNSS, CAMU)</li>
            <li>Rassemblez les taux de cotisations applicables</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

export default StepDemarrage;
