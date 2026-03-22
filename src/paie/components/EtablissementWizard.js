import React, { useState } from 'react';
import CONFIG_CONGO from '../data/configCongo';

const STEP_LABELS = CONFIG_CONGO.steps.map((s, i) => ({
  id: s,
  label: s.replace(/_/g, ' ').replace(/^\w/, c => c.toUpperCase()),
  num: i + 1,
}));

function EtablissementWizard({ onClose, onSave }) {
  const [currentStep, setCurrentStep] = useState(0);
  const [showBanqueForm, setShowBanqueForm] = useState(false);
  const [banqueForm, setBanqueForm] = useState({ nom: '', code: '', agence: '', rib: '', iban: '', swift: '' });
  const [showContactForm, setShowContactForm] = useState(false);
  const [contactForm, setContactForm] = useState({ nom: '', fonction: '', email: '', telephone: '' });
  const [form, setForm] = useState({
    raison_sociale: '',
    nui: '',
    adresse: { numero: '', voie: '', complement: '', code_postal: '', ville: '' },
    banques: [],
    contacts: [],
    organismes: {},
    param_organismes: {},
    taux: {},
    parametres: {
      planning: CONFIG_CONGO.planningDefaults,
      paiement: { mode: 'Virement', jour: 'Dernier jour du mois' },
    },
    retraite: {},
    specificites: {},
  });

  const updateForm = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = () => {
    onSave(form);
  };

  const stepId = CONFIG_CONGO.steps[currentStep];

  const renderStepContent = () => {
    switch (stepId) {
      case 'identite':
        return (
          <div className="wizard-form-section">
            <h4>Identité de l'établissement</h4>
            <div className="wizard-form-row">
              <div className="wizard-form-group">
                <label>Raison sociale <span className="required">*</span></label>
                <input type="text" value={form.raison_sociale} onChange={e => updateForm('raison_sociale', e.target.value)} placeholder="Nom de l'établissement" />
              </div>
            </div>
            <div className="wizard-form-row">
              <div className="wizard-form-group">
                <label>{CONFIG_CONGO.identifiantLabel}</label>
                <input type="text" value={form.nui} onChange={e => updateForm('nui', e.target.value)} placeholder={CONFIG_CONGO.identifiantPlaceholder} />
              </div>
              <div className="wizard-form-group">
                <label>Forme juridique</label>
                <select value={form.forme_juridique || ''} onChange={e => updateForm('forme_juridique', e.target.value)}>
                  <option value="">Sélectionnez...</option>
                  <option value="SARL">SARL</option>
                  <option value="SA">SA</option>
                  <option value="SAS">SAS</option>
                  <option value="EI">Entreprise Individuelle</option>
                  <option value="ASSOCIATION">Association</option>
                  <option value="ONG">ONG</option>
                  <option value="ETAT">Établissement public</option>
                </select>
              </div>
            </div>
          </div>
        );
      case 'adresse':
        return (
          <div className="wizard-form-section">
            <h4>Adresse</h4>
            <div className="wizard-form-row">
              <div className="wizard-form-group">
                <label>Numéro et voie</label>
                <input type="text" value={form.adresse.voie} onChange={e => updateForm('adresse', { ...form.adresse, voie: e.target.value })} />
              </div>
            </div>
            <div className="wizard-form-row">
              <div className="wizard-form-group">
                <label>Ville</label>
                <input type="text" value={form.adresse.ville} onChange={e => updateForm('adresse', { ...form.adresse, ville: e.target.value })} placeholder="Brazzaville" />
              </div>
              <div className="wizard-form-group">
                <label>Pays</label>
                <select disabled value="CONGO"><option>CONGO</option></select>
              </div>
            </div>
          </div>
        );
      case 'banques':
        return (
          <div className="wizard-form-section">
            <h4>Coordonnées bancaires</h4>
            <p style={{ fontSize: 12, color: '#7a8a9b', marginBottom: 12 }}>Ajoutez les coordonnées bancaires de l'établissement.</p>
            <button className="btn-add-small" onClick={() => { setShowBanqueForm(true); setBanqueForm({ nom: '', code: '', agence: '', rib: '', iban: '', swift: '' }); }}>+ Ajouter une banque</button>

            {showBanqueForm && (
              <div style={{ marginTop: 16, padding: 16, background: '#fafafa', borderRadius: 8, border: '1px solid #e5e5e5' }}>
                <div className="wizard-form-row">
                  <div className="wizard-form-group">
                    <label>Nom de la banque <span className="required">*</span></label>
                    <select value={banqueForm.nom} onChange={e => setBanqueForm(p => ({ ...p, nom: e.target.value }))}>
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
                    <input type="text" value={banqueForm.code} onChange={e => setBanqueForm(p => ({ ...p, code: e.target.value }))} placeholder="Ex: 30001" maxLength={5} />
                  </div>
                </div>
                <div className="wizard-form-row">
                  <div className="wizard-form-group">
                    <label>Code agence</label>
                    <input type="text" value={banqueForm.agence} onChange={e => setBanqueForm(p => ({ ...p, agence: e.target.value }))} placeholder="Ex: 00010" maxLength={5} />
                  </div>
                  <div className="wizard-form-group">
                    <label>N° de compte / RIB</label>
                    <input type="text" value={banqueForm.rib} onChange={e => setBanqueForm(p => ({ ...p, rib: e.target.value }))} placeholder="Numéro de compte" />
                  </div>
                </div>
                <div className="wizard-form-row">
                  <div className="wizard-form-group">
                    <label>IBAN</label>
                    <input type="text" value={banqueForm.iban} onChange={e => setBanqueForm(p => ({ ...p, iban: e.target.value }))} placeholder="CG..." />
                  </div>
                  <div className="wizard-form-group">
                    <label>Code SWIFT / BIC</label>
                    <input type="text" value={banqueForm.swift} onChange={e => setBanqueForm(p => ({ ...p, swift: e.target.value }))} placeholder="Ex: BGFICGCG" maxLength={11} />
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                  <button className="btn-wizard-save" onClick={() => {
                    if (!banqueForm.nom) return;
                    updateForm('banques', [...form.banques, { ...banqueForm, id: Date.now() }]);
                    setShowBanqueForm(false);
                  }}>Valider</button>
                  <button className="btn-wizard-cancel" onClick={() => setShowBanqueForm(false)}>Annuler</button>
                </div>
              </div>
            )}

            {form.banques.length === 0 && !showBanqueForm && <p style={{ fontSize: 12, color: '#9ca3af', marginTop: 12 }}>Aucune banque ajoutée.</p>}
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
                      <td><button style={{ color: '#e74c3c', border: 'none', background: 'none', cursor: 'pointer', fontSize: 14 }} onClick={() => updateForm('banques', form.banques.filter((_, j) => j !== i))}>x</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        );
      case 'contacts':
        return (
          <div className="wizard-form-section">
            <h4>Contacts</h4>
            <p style={{ fontSize: 12, color: '#7a8a9b', marginBottom: 12 }}>Responsable RH, responsable paie, etc.</p>
            <button className="btn-add-small" onClick={() => { setShowContactForm(true); setContactForm({ nom: '', fonction: '', email: '', telephone: '' }); }}>+ Ajouter un contact</button>

            {showContactForm && (
              <div style={{ marginTop: 16, padding: 16, background: '#fafafa', borderRadius: 8, border: '1px solid #e5e5e5' }}>
                <div className="wizard-form-row">
                  <div className="wizard-form-group">
                    <label>Nom complet <span className="required">*</span></label>
                    <input type="text" value={contactForm.nom} onChange={e => setContactForm(p => ({ ...p, nom: e.target.value }))} placeholder="Nom et prénom" />
                  </div>
                  <div className="wizard-form-group">
                    <label>Fonction</label>
                    <select value={contactForm.fonction} onChange={e => setContactForm(p => ({ ...p, fonction: e.target.value }))}>
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
                    <input type="email" value={contactForm.email} onChange={e => setContactForm(p => ({ ...p, email: e.target.value }))} placeholder="email@exemple.com" />
                  </div>
                  <div className="wizard-form-group">
                    <label>Téléphone</label>
                    <input type="tel" value={contactForm.telephone} onChange={e => setContactForm(p => ({ ...p, telephone: e.target.value }))} placeholder="+242 06 XXX XXXX" />
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                  <button className="btn-wizard-save" onClick={() => {
                    if (!contactForm.nom) return;
                    updateForm('contacts', [...(form.contacts || []), { ...contactForm, id: Date.now() }]);
                    setShowContactForm(false);
                  }}>Valider</button>
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
                      <td><button style={{ color: '#e74c3c', border: 'none', background: 'none', cursor: 'pointer', fontSize: 14 }} onClick={() => updateForm('contacts', form.contacts.filter((_, j) => j !== i))}>x</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        );
      case 'organismes':
        return (
          <div className="wizard-form-section">
            <h4>Organismes sociaux et fiscaux</h4>
            <p style={{ fontSize: 12, color: '#7a8a9b', marginBottom: 16 }}>Renseignez vos numéros d'affiliation auprès de chaque organisme.</p>
            {CONFIG_CONGO.organismes.map(org => {
              const isOpen = (form.organismes._open || []).includes(org.key);
              return (
                <div key={org.key} className="wizard-accordion" style={{ marginBottom: 12, border: '1px solid #e5e5e5', borderRadius: 8, overflow: 'hidden' }}>
                  <div
                    className="wizard-accordion-header"
                    style={{ padding: '12px 16px', background: isOpen ? '#f5f0e0' : '#fafafa', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontWeight: 600, fontSize: 14, borderLeft: '3px solid #D4A843' }}
                    onClick={() => {
                      const openList = form.organismes._open || [];
                      const newOpen = isOpen ? openList.filter(k => k !== org.key) : [...openList, org.key];
                      updateForm('organismes', { ...form.organismes, _open: newOpen });
                    }}
                  >
                    <span>{org.label}</span>
                    <span style={{ fontSize: 18, color: '#888' }}>{isOpen ? '−' : '+'}</span>
                  </div>
                  {isOpen && (
                    <div style={{ padding: 16, background: '#fff' }}>
                      <p style={{ fontSize: 12, color: '#888', marginBottom: 12 }}>{org.description}</p>
                      {org.champs.map(champ => (
                        <div key={champ.id} className="wizard-form-group" style={{ marginBottom: 12 }}>
                          <label>{champ.label} {champ.required && <span className="required">*</span>}</label>
                          {champ.source ? (
                            <input
                              type="text"
                              value={form[champ.source] || ''}
                              readOnly
                              style={{ background: '#f0f0f0', color: '#666' }}
                            />
                          ) : champ.type === 'select' ? (
                            <select
                              value={form.organismes[champ.id] || ''}
                              onChange={e => updateForm('organismes', { ...form.organismes, [champ.id]: e.target.value })}
                            >
                              <option value="">Sélectionnez...</option>
                              {champ.options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                            </select>
                          ) : (
                            <input
                              type={champ.type || 'text'}
                              value={form.organismes[champ.id] || ''}
                              onChange={e => updateForm('organismes', { ...form.organismes, [champ.id]: e.target.value })}
                              placeholder={champ.placeholder || ''}
                            />
                          )}
                        </div>
                      ))}
                      {org.taux && org.taux.length > 0 && (
                        <div style={{ marginTop: 12 }}>
                          <p style={{ fontSize: 12, fontWeight: 600, color: '#1A3A5C', marginBottom: 6 }}>Taux applicables :</p>
                          <table className="wizard-table" style={{ fontSize: 12 }}>
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
      case 'param_organismes':
        return (
          <div className="wizard-form-section">
            <h4>Paramètres des organismes</h4>
            <p style={{ fontSize: 12, color: '#7a8a9b', marginBottom: 12 }}>Informations complémentaires pour les déclarations.</p>
            <div className="wizard-form-row">
              <div className="wizard-form-group">
                <label>Mode de déclaration CNSS</label>
                <select value={form.param_organismes.mode_cnss || ''} onChange={e => updateForm('param_organismes', { ...form.param_organismes, mode_cnss: e.target.value })}>
                  <option value="">Sélectionnez...</option>
                  <option value="mensuelle">Mensuelle (DNS)</option>
                  <option value="trimestrielle">Trimestrielle</option>
                </select>
              </div>
              <div className="wizard-form-group">
                <label>Taux AT spécifique</label>
                <input type="text" value={form.param_organismes.taux_at || ''} onChange={e => updateForm('param_organismes', { ...form.param_organismes, taux_at: e.target.value })} placeholder="2.25% par défaut (1% à 5%)" />
              </div>
            </div>
            <div className="wizard-form-row">
              <div className="wizard-form-group">
                <label>Zone TOL</label>
                <select value={form.param_organismes.zone_tol || 'centre_ville'} onChange={e => updateForm('param_organismes', { ...form.param_organismes, zone_tol: e.target.value })}>
                  <option value="centre_ville">Centre-ville (5 000 FCFA)</option>
                  <option value="peripherie">Périphérie (1 000 FCFA)</option>
                </select>
              </div>
              <div className="wizard-form-group">
                <label>Profil salariés par défaut</label>
                <select value={form.param_organismes.profil || 'national'} onChange={e => updateForm('param_organismes', { ...form.param_organismes, profil: e.target.value })}>
                  <option value="national">National (résident)</option>
                  <option value="non_resident">Non-résident</option>
                </select>
              </div>
            </div>
          </div>
        );
      case 'taux':
        return (
          <div className="wizard-form-section">
            <h4>Taux de cotisations</h4>
            {CONFIG_CONGO.tauxSections.map(section => (
              <div key={section.key} className="taux-section">
                <h5>{section.label}</h5>
                <table className="wizard-table">
                  <thead>
                    <tr><th>Élément</th><th>Valeur</th><th>Unité</th></tr>
                  </thead>
                  <tbody>
                    {section.lignes.map((l, i) => (
                      <tr key={i}><td>{l.element}</td><td>{l.valeur}</td><td>{l.unite}</td></tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}
          </div>
        );
      case 'parametres':
        return (
          <div className="wizard-form-section">
            <h4>Paramètres</h4>
            <div className="wizard-accordion">
              <div className="wizard-accordion-header">Planning hebdomadaire</div>
              <div className="wizard-accordion-body">
                <p style={{ fontSize: 12, color: '#7a8a9b', marginBottom: 8 }}>
                  Horaires par défaut : {CONFIG_CONGO.planningDefaults.heuresJour}h/jour, {CONFIG_CONGO.planningDefaults.heuresSemaine}h/semaine, {CONFIG_CONGO.planningDefaults.heuresMois}h/mois
                </p>
              </div>
            </div>
            <div className="wizard-accordion">
              <div className="wizard-accordion-header">Paiement</div>
              <div className="wizard-accordion-body">
                <div className="wizard-form-row">
                  <div className="wizard-form-group">
                    <label>Mode de paiement</label>
                    <select defaultValue="Virement">
                      <option>Virement</option>
                      <option>Chèque</option>
                      <option>Espèces</option>
                    </select>
                  </div>
                  <div className="wizard-form-group">
                    <label>Jour de paiement</label>
                    <select defaultValue="Dernier jour du mois">
                      <option>Dernier jour du mois</option>
                      <option>25</option>
                      <option>28</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      case 'retraite':
        return (
          <div className="wizard-form-section">
            <h4>Retraite</h4>
            <div className="wizard-alert info">
              <span>La retraite au Congo est gérée par la CNSS (branche PVID). Taux : 4% salarial + 8% patronal, plafond 1 200 000 XAF.</span>
            </div>
          </div>
        );
      case 'specificites':
        return (
          <div className="wizard-form-section">
            <h4>Spécificités Congo</h4>
            <div className="wizard-form-row">
              <div className="wizard-form-group">
                <label>Convention collective applicable</label>
                <select value={form.specificites?.convention || ''} onChange={e => updateForm('specificites', { ...form.specificites, convention: e.target.value })}>
                  <option value="">Convention générale du travail</option>
                  <option value="AGRI_FORET">Agriculture et Forêt</option>
                  <option value="AUXILIAIRES_TRANSPORT">Auxiliaires de Transport</option>
                  <option value="BAM">Banques, Assurances et Microfinance (BAM)</option>
                  <option value="BTP">Bâtiment et Travaux Publics (BTP)</option>
                  <option value="COMMERCE">Commerce</option>
                  <option value="DOMESTIQUE">Domestique de Maison</option>
                  <option value="FORESTIERE">Forestière</option>
                  <option value="HOTELLERIE_CATERING">Hôtellerie et Catering</option>
                  <option value="INDUSTRIE">Industrie</option>
                  <option value="INFO_COMM">Information et Communication</option>
                  <option value="MINIERE">Exploitation Minière</option>
                  <option value="NTIC">NTIC</option>
                  <option value="PARA_PETROLE">Para-Pétrole</option>
                  <option value="PECHE_MARITIME">Pêche Maritime Industrielle</option>
                  <option value="PETROLE">Pétrole</option>
                  <option value="TRANSPORT_AERIEN">Transport Aérien</option>
                </select>
              </div>
            </div>
            <div className="wizard-form-row">
              <div className="wizard-form-group">
                <label>Secteur d'activité</label>
                <input type="text" placeholder="Ex: Services, BTP, Commerce..." />
              </div>
            </div>
          </div>
        );
      default:
        return <p style={{ color: '#9ca3af' }}>Section en cours de développement.</p>;
    }
  };

  return (
    <div className="wizard-overlay">
      <div className="wizard-modal">
        <div className="wizard-modal-header">
          <h3>Nouvel établissement</h3>
          <button className="wizard-close-btn" onClick={onClose}>&times;</button>
        </div>

        <div className="wizard-body">
          <div className="wizard-sidebar">
            {STEP_LABELS.map((step, i) => (
              <button
                key={step.id}
                className={`wizard-nav-item ${currentStep === i ? 'active' : ''}`}
                onClick={() => setCurrentStep(i)}
              >
                <span className="wizard-nav-icon">{step.num}</span>
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
            {currentStep < CONFIG_CONGO.steps.length - 1 ? (
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

export default EtablissementWizard;
