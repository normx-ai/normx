import React from 'react';

function StepInitialisation() {
  return (
    <div className="paie-dashboard">
      <div className="paie-dashboard-header">
        <h3>Initialisation</h3>
        <p>Parametres generaux de votre dossier de paie Congo-Brazzaville.</p>
      </div>

      <div className="wizard-form-section">
        <h4>Parametres du dossier</h4>

        <div className="wizard-form-row">
          <div className="wizard-form-group">
            <label>Pays</label>
            <select disabled value="congo">
              <option value="congo">Congo-Brazzaville</option>
            </select>
          </div>
          <div className="wizard-form-group">
            <label>Devise</label>
            <select disabled value="XAF">
              <option value="XAF">XAF - Franc CFA</option>
            </select>
          </div>
        </div>

        <div className="wizard-form-row">
          <div className="wizard-form-group">
            <label>Regime de cotisations</label>
            <select disabled value="congo">
              <option value="congo">Regime CNSS Congo (2026)</option>
            </select>
            <span style={{ fontSize: 11, color: '#9ca3af', marginTop: 4 }}>
              Regime determine automatiquement : CNSS, CAMU, ACPE/FONEA, Direction des Impots.
            </span>
          </div>
        </div>

        <div className="wizard-alert info">
          <span>Organismes : CNSS (AF, PVID, AT) | CAMU | Direction des Impots (ITS, TUS)</span>
        </div>
      </div>
    </div>
  );
}

export default StepInitialisation;
