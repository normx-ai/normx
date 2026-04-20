// Step banques : liste + formulaire d'ajout.

import React, { useState } from 'react';
import type { BanqueEntry, EtablissementFormData, EtablissementFormValue } from '../wizardTypes';

type BanqueForm = Omit<BanqueEntry, 'id'>;

interface Props {
  form: EtablissementFormData;
  updateForm: (field: string, value: EtablissementFormValue) => void;
}

export function StepBanques({ form, updateForm }: Props): React.ReactElement {
  const [showBanqueForm, setShowBanqueForm] = useState<boolean>(false);
  const [banqueForm, setBanqueForm] = useState<BanqueForm>({ nom: '', code: '', agence: '', rib: '', iban: '', swift: '' });

  return (
    <div className="wizard-form-section">
      <h4>Coordonnées bancaires</h4>
      <p style={{ fontSize: 14, color: '#7a8a9b', marginBottom: 12 }}>
        Ajoutez les coordonnées bancaires de l'établissement.
      </p>
      <button
        className="btn-add-small"
        onClick={() => {
          setShowBanqueForm(true);
          setBanqueForm({ nom: '', code: '', agence: '', rib: '', iban: '', swift: '' });
        }}
      >+ Ajouter une banque</button>

      {showBanqueForm && (
        <div style={{ marginTop: 16, padding: 16, background: '#fafafa', borderRadius: 8, border: '1px solid #e5e5e5' }}>
          <div className="wizard-form-row">
            <div className="wizard-form-group">
              <label>Nom de la banque <span className="required">*</span></label>
              <select value={banqueForm.nom} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setBanqueForm(p => ({ ...p, nom: e.target.value }))}>
                <option value="">Sélectionnez...</option>
                <option value="BGFI Bank">BGFI Bank Congo</option>
                <option value="Societe Generale">Société Générale Congo</option>
                <option value="UBA">UBA Congo</option>
                <option value="Ecobank">Ecobank Congo</option>
                <option value="Credit du Congo">Crédit du Congo (CdC)</option>
                <option value="LCB Bank">La Congolaise de Banque (LCB)</option>
                <option value="BSCA">BSCA Bank</option>
                <option value="Banque Postale">Banque Postale du Congo</option>
                <option value="Autre">Autre</option>
              </select>
            </div>
            <div className="wizard-form-group">
              <label>Code banque</label>
              <input type="text" value={banqueForm.code} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setBanqueForm(p => ({ ...p, code: e.target.value }))} placeholder="Ex: 30001" maxLength={5} />
            </div>
          </div>
          <div className="wizard-form-row">
            <div className="wizard-form-group">
              <label>Code agence</label>
              <input type="text" value={banqueForm.agence} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setBanqueForm(p => ({ ...p, agence: e.target.value }))} placeholder="Ex: 00010" maxLength={5} />
            </div>
            <div className="wizard-form-group">
              <label>N° de compte / RIB</label>
              <input type="text" value={banqueForm.rib} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setBanqueForm(p => ({ ...p, rib: e.target.value }))} placeholder="Numéro de compte" />
            </div>
          </div>
          <div className="wizard-form-row">
            <div className="wizard-form-group">
              <label>IBAN</label>
              <input type="text" value={banqueForm.iban} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setBanqueForm(p => ({ ...p, iban: e.target.value }))} placeholder="CG..." />
            </div>
            <div className="wizard-form-group">
              <label>Code SWIFT / BIC</label>
              <input type="text" value={banqueForm.swift} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setBanqueForm(p => ({ ...p, swift: e.target.value }))} placeholder="Ex: BGFICGCG" maxLength={11} />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
            <button
              className="btn-wizard-save"
              onClick={() => {
                if (!banqueForm.nom) return;
                updateForm('banques', [...form.banques, { ...banqueForm, id: Date.now() }]);
                setShowBanqueForm(false);
              }}
            >Valider</button>
            <button className="btn-wizard-cancel" onClick={() => setShowBanqueForm(false)}>Annuler</button>
          </div>
        </div>
      )}

      {form.banques.length === 0 && !showBanqueForm && (
        <p style={{ fontSize: 14, color: '#9ca3af', marginTop: 12 }}>Aucune banque ajoutée.</p>
      )}
      {form.banques.length > 0 && (
        <table className="wizard-table" style={{ marginTop: 16 }}>
          <thead>
            <tr><th>Banque</th><th>Code</th><th>Agence</th><th>RIB</th><th>SWIFT</th><th></th></tr>
          </thead>
          <tbody>
            {form.banques.map((b, i) => (
              <tr key={b.id || i}>
                <td>{b.nom}</td>
                <td>{b.code}</td>
                <td>{b.agence}</td>
                <td>{b.rib}</td>
                <td>{b.swift}</td>
                <td>
                  <button
                    style={{ color: '#e74c3c', border: 'none', background: 'none', cursor: 'pointer', fontSize: 14 }}
                    onClick={() => updateForm('banques', form.banques.filter((_, j) => j !== i))}
                  >x</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
