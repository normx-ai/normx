// Modale de creation / edition d'une rubrique.

import React from 'react';
import { RubriqueFormData } from './rubriquesTypes';

interface Props {
  editingId: number | null;
  form: RubriqueFormData;
  saving: boolean;
  error: string;
  updateField: (field: keyof RubriqueFormData, value: string | boolean) => void;
  onSave: () => void;
  onClose: () => void;
}

export function RubriqueModal({ editingId, form, saving, error, updateField, onSave, onClose }: Props): React.ReactElement {
  return (
    <div className="wizard-overlay" onClick={onClose}>
      <div
        className="avantages-modal"
        onClick={(e: React.MouseEvent) => e.stopPropagation()}
        style={{ maxWidth: 640 }}
      >
        <div className="wizard-modal-header">
          <h3>{editingId ? 'Modifier la rubrique' : 'Nouvelle rubrique'}</h3>
          <button className="wizard-close-btn" onClick={onClose}>x</button>
        </div>

        <div className="avantages-modal-body">
          {error && <div className="wizard-alert error">{error}</div>}

          <div className="wizard-form-section">
            <h4>Informations generales</h4>
            <div className="wizard-form-row">
              <div className="wizard-form-group">
                <label>Code <span className="required">*</span></label>
                <input
                  type="text"
                  value={form.code}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateField('code', e.target.value)}
                  placeholder="SAL_BASE"
                  disabled={editingId !== null}
                />
              </div>
              <div className="wizard-form-group">
                <label>Libelle <span className="required">*</span></label>
                <input
                  type="text"
                  value={form.libelle}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateField('libelle', e.target.value)}
                  placeholder="Salaire de base"
                />
              </div>
            </div>
            <div className="wizard-form-row">
              <div className="wizard-form-group">
                <label>Type</label>
                <select
                  value={form.type}
                  onChange={(e: React.ChangeEvent<HTMLSelectElement>) => updateField('type', e.target.value)}
                >
                  <option value="gain">Gain</option>
                  <option value="retenue">Retenue</option>
                  <option value="cotisation">Cotisation</option>
                  <option value="indemnite">Indemnite</option>
                  <option value="avantage">Avantage</option>
                </select>
              </div>
              <div className="wizard-form-group">
                <label>Mode de calcul</label>
                <select
                  value={form.mode}
                  onChange={(e: React.ChangeEvent<HTMLSelectElement>) => updateField('mode', e.target.value)}
                >
                  <option value="fixe">Fixe</option>
                  <option value="pourcentage">Pourcentage</option>
                  <option value="horaire">Horaire</option>
                  <option value="variable">Variable</option>
                </select>
              </div>
            </div>
          </div>

          <div className="wizard-form-section">
            <h4>Parametres de calcul</h4>
            <div className="wizard-form-row">
              <div className="wizard-form-group">
                <label>Taux (%)</label>
                <input
                  type="number"
                  step="0.01"
                  value={form.taux}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateField('taux', e.target.value)}
                  placeholder="0.00"
                />
              </div>
              <div className="wizard-form-group">
                <label>Montant (FCFA)</label>
                <input
                  type="number"
                  step="1"
                  value={form.montant}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateField('montant', e.target.value)}
                  placeholder="0"
                />
              </div>
            </div>
            <div className="wizard-form-row">
              <div className="wizard-form-group">
                <label>Plafond (FCFA)</label>
                <input
                  type="number"
                  step="1"
                  value={form.plafond}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateField('plafond', e.target.value)}
                  placeholder="Aucun"
                />
              </div>
              <div className="wizard-form-group">
                <label>Base de calcul</label>
                <select
                  value={form.base}
                  onChange={(e: React.ChangeEvent<HTMLSelectElement>) => updateField('base', e.target.value)}
                >
                  <option value="">Aucune</option>
                  <option value="brut">Salaire brut</option>
                  <option value="net_imposable">Net imposable</option>
                  <option value="salaire_base">Salaire de base</option>
                </select>
              </div>
            </div>
          </div>

          <div className="wizard-form-section">
            <h4>Options</h4>
            <div className="wizard-form-row">
              <div className="wizard-form-group">
                <label>Ordre d&apos;affichage</label>
                <input
                  type="number"
                  value={form.ordre}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateField('ordre', e.target.value)}
                />
              </div>
              <div className="wizard-form-group" style={{ flexDirection: 'row', alignItems: 'center', gap: 16, paddingTop: 20 }}>
                <label className="avantages-checkbox-label">
                  <input
                    type="checkbox"
                    className="avantages-checkbox"
                    checked={form.imposable}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateField('imposable', e.target.checked)}
                  />
                  <span>Imposable (ITS)</span>
                </label>
                <label className="avantages-checkbox-label">
                  <input
                    type="checkbox"
                    className="avantages-checkbox"
                    checked={form.actif}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateField('actif', e.target.checked)}
                  />
                  <span>Actif</span>
                </label>
              </div>
            </div>
          </div>
        </div>

        <div className="wizard-footer">
          <div className="wizard-footer-left"></div>
          <div className="wizard-footer-right">
            <button className="btn-wizard-cancel" onClick={onClose}>Annuler</button>
            <button className="btn-wizard-save" onClick={onSave} disabled={saving}>
              {saving ? 'Enregistrement...' : (editingId ? 'Mettre a jour' : 'Creer')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
