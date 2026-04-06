import React from 'react';
import { getRubriquesConvention } from '../data/conventionsRubriques';
import type { SalarieForm, UpdateSectionFn } from './wizardTypes';

interface WizardStepSalaireProps {
  form: SalarieForm;
  updateSection: UpdateSectionFn;
}

function WizardStepSalaire({ form, updateSection }: WizardStepSalaireProps): React.ReactElement {
  const convCode = form.emploi.convention_collective || '';
  const convRubriques = getRubriquesConvention(convCode);
  const convPrimes = convRubriques.primes || [];
  const convIndemnites = convRubriques.indemnites || [];
  const convMajorations = convRubriques.majorations || [];

  return (
    <div className="wizard-form-section">
      <h4>Salaire et horaires</h4>
      <div className="wizard-form-row">
        <div className="wizard-form-group">
          <label>Type de salaire</label>
          <select value={form.salaire_horaires.type_salaire as string} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => updateSection('salaire_horaires', 'type_salaire', e.target.value)}>
            <option>Mensuel</option><option>Horaire</option><option>Forfait jour</option>
          </select>
        </div>
        <div className="wizard-form-group">
          <label>Salaire de base (XAF) <span className="required">*</span></label>
          <input type="text" value={form.salaire_horaires.salaire_base as string} onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateSection('salaire_horaires', 'salaire_base', e.target.value)} placeholder="0" />
        </div>
      </div>
      <div className="wizard-form-row">
        <div className="wizard-form-group">
          <label>Horaire mensuel</label>
          <input type="text" value={form.salaire_horaires.horaire_mensuel as string} onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateSection('salaire_horaires', 'horaire_mensuel', e.target.value)} />
          <span style={{ fontSize: 11, color: '#9ca3af' }}>173,33h par défaut (40h/semaine)</span>
        </div>
        <div className="wizard-form-group">
          <label>Heures par jour</label>
          <input type="text" value={form.salaire_horaires.heures_jour as string} onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateSection('salaire_horaires', 'heures_jour', e.target.value)} />
        </div>
      </div>

      {/* Anciennete convention */}
      {convRubriques.anciennete && (
        <div style={{ marginTop: 16, padding: 12, background: '#f9f7f0', borderRadius: 8, border: '1px solid #e5e0cc' }}>
          <h5 style={{ fontSize: 13, fontWeight: 700, marginBottom: 8, color: '#1A3A5C' }}>
            Ancienneté — {convRubriques.label}
          </h5>
          <span style={{ fontSize: 11, color: '#888' }}>
            Début : {convRubriques.anciennete.debut} ans | Départ : {convRubriques.anciennete.tauxDepart}% | Max : {convRubriques.anciennete.max}%
          </span>
        </div>
      )}

      {/* Primes convention */}
      {convPrimes.length > 1 && (
        <div style={{ marginTop: 16 }}>
          <h5 style={{ fontSize: 13, fontWeight: 700, color: '#1A3A5C', marginBottom: 8 }}>
            Primes — {convRubriques.label}
          </h5>
          <div style={{ display: 'grid', gap: 8 }}>
            {convPrimes.filter(p => p.code !== 'PRIME_ANCIENNETE').map(p => (
              <div key={p.code} className="wizard-form-row" style={{ alignItems: 'center' }}>
                <div className="wizard-form-group" style={{ flex: 2 }}>
                  <label style={{ fontSize: 12 }}>
                    {p.label}
                    {p.article && <span style={{ color: '#999', fontSize: 10, marginLeft: 4 }}>({p.article})</span>}
                  </label>
                  {p.conditions && <span style={{ fontSize: 10, color: '#999', display: 'block' }}>{p.conditions}</span>}
                </div>
                <div className="wizard-form-group" style={{ flex: 1 }}>
                  <input
                    type="text"
                    placeholder={p.mode === 'fixe' ? String(p.montant || 0) : 'Montant'}
                    value={((form.salaire_horaires.primes_convention || {}) as Record<string, string>)[p.code] || ''}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                      const prConv = { ...((form.salaire_horaires.primes_convention || {}) as Record<string, string>), [p.code]: e.target.value };
                      updateSection('salaire_horaires', 'primes_convention', prConv);
                    }}
                  />
                  {p.mode === 'fixe' && p.unite && (
                    <span style={{ fontSize: 10, color: '#999' }}>/{p.unite}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Indemnites convention */}
      {convIndemnites.length > 0 && (
        <div style={{ marginTop: 16 }}>
          <h5 style={{ fontSize: 13, fontWeight: 700, color: '#1A3A5C', marginBottom: 8 }}>
            Indemnités — {convRubriques.label}
          </h5>
          <div style={{ display: 'grid', gap: 8 }}>
            {convIndemnites.map(ind => (
              <div key={ind.code} className="wizard-form-row" style={{ alignItems: 'center' }}>
                <div className="wizard-form-group" style={{ flex: 2 }}>
                  <label style={{ fontSize: 12 }}>
                    {ind.label}
                    {ind.article && <span style={{ color: '#999', fontSize: 10, marginLeft: 4 }}>({ind.article})</span>}
                  </label>
                  {ind.conditions && <span style={{ fontSize: 10, color: '#999', display: 'block' }}>{ind.conditions}</span>}
                </div>
                <div className="wizard-form-group" style={{ flex: 1 }}>
                  <input
                    type="text"
                    placeholder={ind.mode === 'fixe' ? String(ind.montant || 0) : 'Montant'}
                    value={((form.salaire_horaires.indemnites_convention || {}) as Record<string, string>)[ind.code] || ''}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                      const indConv = { ...((form.salaire_horaires.indemnites_convention || {}) as Record<string, string>), [ind.code]: e.target.value };
                      updateSection('salaire_horaires', 'indemnites_convention', indConv);
                    }}
                  />
                  {ind.mode === 'fixe' && ind.unite && (
                    <span style={{ fontSize: 10, color: '#999' }}>/{ind.unite}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Majorations diplome/langue */}
      {convMajorations && convMajorations.length > 0 && (
        <div style={{ marginTop: 16 }}>
          <h5 style={{ fontSize: 13, fontWeight: 700, color: '#1A3A5C', marginBottom: 8 }}>
            Majorations diplôme / langue
          </h5>
          <div style={{ display: 'grid', gap: 8 }}>
            {convMajorations.map(maj => (
              <div key={maj.code} className="wizard-form-row" style={{ alignItems: 'center' }}>
                <div className="wizard-form-group" style={{ flex: 2 }}>
                  <label style={{ fontSize: 12 }}>{maj.label}</label>
                </div>
                <div className="wizard-form-group" style={{ flex: 1 }}>
                  <input
                    type="text"
                    placeholder={String(maj.montant || 0)}
                    value={((form.salaire_horaires.majorations_convention || {}) as Record<string, string>)[maj.code] || ''}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                      const majConv = { ...((form.salaire_horaires.majorations_convention || {}) as Record<string, string>), [maj.code]: e.target.value };
                      updateSection('salaire_horaires', 'majorations_convention', majConv);
                    }}
                  />
                  {maj.unite && <span style={{ fontSize: 10, color: '#999' }}>/{maj.unite}</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Heures supplementaires convention */}
      {convRubriques.heuresSupp && (
        <div style={{ marginTop: 16, padding: 12, background: '#f0f4ff', borderRadius: 8, border: '1px solid #d0d8f0' }}>
          <h5 style={{ fontSize: 13, fontWeight: 700, marginBottom: 8, color: '#1A3A5C' }}>
            Heures supplémentaires — {convRubriques.label}
          </h5>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {convRubriques.heuresSupp.map((hs, i) => (
              <span key={i} style={{ fontSize: 11, padding: '4px 8px', background: '#fff', borderRadius: 4, border: '1px solid #d0d8f0' }}>
                {hs.label}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default WizardStepSalaire;
