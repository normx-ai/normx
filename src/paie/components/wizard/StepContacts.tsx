// Step contacts : liste + formulaire d'ajout.

import React, { useState } from 'react';
import type { ContactEntry, EtablissementFormData, EtablissementFormValue } from '../wizardTypes';

type ContactForm = Omit<ContactEntry, 'id'>;

interface Props {
  form: EtablissementFormData;
  updateForm: (field: string, value: EtablissementFormValue) => void;
}

export function StepContacts({ form, updateForm }: Props): React.ReactElement {
  const [showContactForm, setShowContactForm] = useState<boolean>(false);
  const [contactForm, setContactForm] = useState<ContactForm>({ nom: '', fonction: '', email: '', telephone: '' });

  return (
    <div className="wizard-form-section">
      <h4>Contacts</h4>
      <p style={{ fontSize: 14, color: '#7a8a9b', marginBottom: 12 }}>Responsable RH, responsable paie, etc.</p>
      <button
        className="btn-add-small"
        onClick={() => {
          setShowContactForm(true);
          setContactForm({ nom: '', fonction: '', email: '', telephone: '' });
        }}
      >+ Ajouter un contact</button>

      {showContactForm && (
        <div style={{ marginTop: 16, padding: 16, background: '#fafafa', borderRadius: 8, border: '1px solid #e5e5e5' }}>
          <div className="wizard-form-row">
            <div className="wizard-form-group">
              <label>Nom complet <span className="required">*</span></label>
              <input type="text" value={contactForm.nom} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setContactForm(p => ({ ...p, nom: e.target.value }))} placeholder="Nom et prénom" />
            </div>
            <div className="wizard-form-group">
              <label>Fonction</label>
              <select value={contactForm.fonction} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setContactForm(p => ({ ...p, fonction: e.target.value }))}>
                <option value="">Sélectionnez...</option>
                <option value="DRH">Directeur des Ressources Humaines</option>
                <option value="Responsable paie">Responsable paie</option>
                <option value="Comptable">Comptable</option>
                <option value="DAF">Directeur Administratif et Financier</option>
                <option value="Gerant">Gérant</option>
                <option value="Autre">Autre</option>
              </select>
            </div>
          </div>
          <div className="wizard-form-row">
            <div className="wizard-form-group">
              <label>Email</label>
              <input type="email" value={contactForm.email} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setContactForm(p => ({ ...p, email: e.target.value }))} placeholder="email@exemple.com" />
            </div>
            <div className="wizard-form-group">
              <label>Téléphone</label>
              <input type="tel" value={contactForm.telephone} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setContactForm(p => ({ ...p, telephone: e.target.value }))} placeholder="+242 06 XXX XXXX" />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
            <button
              className="btn-wizard-save"
              onClick={() => {
                if (!contactForm.nom) return;
                updateForm('contacts', [...(form.contacts || []), { ...contactForm, id: Date.now() }]);
                setShowContactForm(false);
              }}
            >Valider</button>
            <button className="btn-wizard-cancel" onClick={() => setShowContactForm(false)}>Annuler</button>
          </div>
        </div>
      )}

      {(form.contacts || []).length > 0 && (
        <table className="wizard-table" style={{ marginTop: 16 }}>
          <thead>
            <tr><th>Nom</th><th>Fonction</th><th>Email</th><th>Téléphone</th><th></th></tr>
          </thead>
          <tbody>
            {form.contacts.map((c, i) => (
              <tr key={c.id || i}>
                <td>{c.nom}</td>
                <td>{c.fonction}</td>
                <td>{c.email}</td>
                <td>{c.telephone}</td>
                <td>
                  <button
                    style={{ color: '#e74c3c', border: 'none', background: 'none', cursor: 'pointer', fontSize: 14 }}
                    onClick={() => updateForm('contacts', form.contacts.filter((_, j) => j !== i))}
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
