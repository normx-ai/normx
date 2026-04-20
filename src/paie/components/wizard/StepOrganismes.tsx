// Step organismes : accordion CNSS/impots avec champs et taux.

import React from 'react';
import CONFIG_CONGO from '../../data/configCongo';
import type { EtablissementFormData, EtablissementFormValue } from '../wizardTypes';

interface Props {
  form: EtablissementFormData;
  updateForm: (field: string, value: EtablissementFormValue) => void;
}

export function StepOrganismes({ form, updateForm }: Props): React.ReactElement {
  return (
    <div className="wizard-form-section">
      <h4>Organismes sociaux et fiscaux</h4>
      <p style={{ fontSize: 14, color: '#7a8a9b', marginBottom: 16 }}>
        Renseignez vos numéros d'affiliation auprès de chaque organisme.
      </p>
      {CONFIG_CONGO.organismes.map(org => {
        const isOpen = ((form.organismes._open || []) as string[]).includes(org.key);
        return (
          <div key={org.key} className="wizard-accordion" style={{ marginBottom: 12, border: '1px solid #e5e5e5', borderRadius: 8, overflow: 'hidden' }}>
            <div
              className="wizard-accordion-header"
              style={{ padding: '12px 16px', background: isOpen ? '#f5f0e0' : '#fafafa', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontWeight: 600, fontSize: 16, borderLeft: '3px solid #D4A843' }}
              onClick={() => {
                const openList = (form.organismes._open || []) as string[];
                const newOpen = isOpen ? openList.filter(k => k !== org.key) : [...openList, org.key];
                updateForm('organismes', { ...form.organismes, _open: newOpen });
              }}
            >
              <span>{org.label}</span>
              <span style={{ fontSize: 18, color: '#888' }}>{isOpen ? '\u2212' : '+'}</span>
            </div>
            {isOpen && (
              <div style={{ padding: 16, background: '#fff' }}>
                <p style={{ fontSize: 14, color: '#888', marginBottom: 12 }}>{org.description}</p>
                {org.champs.map(champ => (
                  <div key={champ.id} className="wizard-form-group" style={{ marginBottom: 12 }}>
                    <label>{champ.label} {champ.required && <span className="required">*</span>}</label>
                    {champ.source ? (
                      <input
                        type="text"
                        value={(form as Record<string, string>)[champ.source] || ''}
                        readOnly
                        style={{ background: '#f0f0f0', color: '#666' }}
                      />
                    ) : champ.type === 'select' ? (
                      <select
                        value={(form.organismes[champ.id] as string) || ''}
                        onChange={(e: React.ChangeEvent<HTMLSelectElement>) => updateForm('organismes', { ...form.organismes, [champ.id]: e.target.value })}
                      >
                        <option value="">Sélectionnez...</option>
                        {(champ.options || []).map(opt => <option key={opt} value={opt}>{opt}</option>)}
                      </select>
                    ) : (
                      <input
                        type={champ.type || 'text'}
                        value={(form.organismes[champ.id] as string) || ''}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateForm('organismes', { ...form.organismes, [champ.id]: e.target.value })}
                        placeholder={champ.placeholder || ''}
                      />
                    )}
                  </div>
                ))}
                {org.taux && org.taux.length > 0 && (
                  <div style={{ marginTop: 12 }}>
                    <p style={{ fontSize: 14, fontWeight: 600, color: '#1A3A5C', marginBottom: 8 }}>Taux applicables :</p>
                    <table className="wizard-table">
                      <thead>
                        <tr><th>Élément</th><th>Taux</th><th>Plafond</th></tr>
                      </thead>
                      <tbody>
                        {org.taux.map((t, i) => (
                          <tr key={i}><td>{t.label}</td><td style={{ fontWeight: 600 }}>{t.valeur}</td><td style={{ color: '#888' }}>{t.plafond}</td></tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
