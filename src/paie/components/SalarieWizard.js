import React, { useState } from 'react';
import { SALARIE_STEPS, getEmptySalarieForm, CONVENTIONS_COLLECTIVES } from '../data/salarieData';
import { getRubriquesConvention } from '../data/conventionsRubriques';
import { getGrille, getCategoriesGrille, getEchelonsGrille, getSalaireBase } from '../data/grillesSalariales';

function genererCodeSalarie(salaries = []) {
  const existants = (salaries || [])
    .map(s => s.identite?.code || '')
    .filter(c => /^SAL-\d+$/.test(c))
    .map(c => parseInt(c.replace('SAL-', ''), 10));
  const max = existants.length > 0 ? Math.max(...existants) : 0;
  return `SAL-${String(max + 1).padStart(4, '0')}`;
}

function SalarieWizard({ onClose, onSave, etablissements, salaries }) {
  const [currentStep, setCurrentStep] = useState(0);
  const [form, setForm] = useState(() => {
    const f = getEmptySalarieForm();
    f.identite.code = genererCodeSalarie(salaries);
    return f;
  });

  const stepId = SALARIE_STEPS[currentStep].id;

  const updateSection = (section, field, value) => {
    setForm(prev => ({
      ...prev,
      [section]: { ...prev[section], [field]: value },
    }));
  };

  const handleSave = () => {
    // Validation champs obligatoires
    const erreurs = [];
    if (!form.identite.nom) erreurs.push('Nom');
    if (!form.identite.prenom) erreurs.push('Prénom');
    if (!form.identite.situation_familiale) erreurs.push('Situation familiale');
    if (form.identite.nb_enfants === '' || form.identite.nb_enfants === undefined) erreurs.push('Nombre d\'enfants');
    if (!form.contrat.date_embauche) erreurs.push('Date d\'embauche');
    if (!form.contrat.type_contrat) erreurs.push('Type de contrat');
    if (!form.salaire_horaires.salaire_base || form.salaire_horaires.salaire_base === '0') erreurs.push('Salaire de base');

    if (erreurs.length > 0) {
      alert(`Champs obligatoires manquants :\n• ${erreurs.join('\n• ')}\n\nLa situation familiale et le nombre d'enfants sont nécessaires pour le calcul de l'ITS.`);
      return;
    }
    onSave(form);
  };

  const renderStepContent = () => {
    switch (stepId) {
      case 'identite':
        return (
          <div className="wizard-form-section">
            <h4>Identité du salarié</h4>
            <div className="wizard-form-row">
              <div className="wizard-form-group">
                <label>Code salarié <span style={{ fontSize: 10, color: '#888', fontWeight: 400 }}>(auto)</span></label>
                <input type="text" value={form.identite.code} readOnly style={{ background: '#f3f4f6', color: '#555', cursor: 'default' }} />
              </div>
              <div className="wizard-form-group">
                <label>Civilité</label>
                <select value={form.identite.civilite} onChange={e => updateSection('identite', 'civilite', e.target.value)}>
                  <option>Monsieur</option><option>Madame</option>
                </select>
              </div>
            </div>
            <div className="wizard-form-row">
              <div className="wizard-form-group">
                <label>Nom <span className="required">*</span></label>
                <input type="text" value={form.identite.nom} onChange={e => updateSection('identite', 'nom', e.target.value)} />
              </div>
              <div className="wizard-form-group">
                <label>Prénom <span className="required">*</span></label>
                <input type="text" value={form.identite.prenom} onChange={e => updateSection('identite', 'prenom', e.target.value)} />
              </div>
            </div>
            <div className="wizard-form-row">
              <div className="wizard-form-group">
                <label>Date de naissance</label>
                <input type="date" value={form.identite.date_naissance} onChange={e => updateSection('identite', 'date_naissance', e.target.value)} />
              </div>
              <div className="wizard-form-group">
                <label>Situation familiale <span className="required">*</span></label>
                <select value={form.identite.situation_familiale} onChange={e => updateSection('identite', 'situation_familiale', e.target.value)}>
                  <option value="">Sélectionnez...</option>
                  <option>Célibataire</option><option>Marié(e)</option><option>Divorcé(e)</option><option>Veuf/veuve</option>
                </select>
              </div>
            </div>
            <div className="wizard-form-row">
              <div className="wizard-form-group">
                <label>Nombre d'enfants <span className="required">*</span></label>
                <input type="number" value={form.identite.nb_enfants} onChange={e => updateSection('identite', 'nb_enfants', e.target.value)} min="0" />
              </div>
              <div className="wizard-form-group">
                <label>N° Sécurité Sociale (CNSS)</label>
                <input type="text" value={form.identite.num_ss} onChange={e => updateSection('identite', 'num_ss', e.target.value)} placeholder="Numéro CNSS" />
              </div>
            </div>
            <div className="wizard-form-row">
              <div className="wizard-form-group">
                <label>Nationalité</label>
                <select value={form.identite.nationalite} onChange={e => updateSection('identite', 'nationalite', e.target.value)}>
                  <option value="CONGO">Congo</option><option value="CAMEROUN">Cameroun</option><option value="GABON">Gabon</option><option value="RDC">RDC</option><option value="FRANCE">France</option><option value="AUTRE">Autre</option>
                </select>
              </div>
              <div className="wizard-form-group">
                <label>Lieu de naissance</label>
                <input type="text" value={form.identite.commune_naissance} onChange={e => updateSection('identite', 'commune_naissance', e.target.value)} placeholder="Brazzaville, Pointe-Noire..." />
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
                <label>Adresse</label>
                <input type="text" value={form.adresse.numero_voie} onChange={e => updateSection('adresse', 'numero_voie', e.target.value)} />
              </div>
            </div>
            <div className="wizard-form-row">
              <div className="wizard-form-group">
                <label>Ville</label>
                <input type="text" value={form.adresse.ville} onChange={e => updateSection('adresse', 'ville', e.target.value)} />
              </div>
              <div className="wizard-form-group">
                <label>Téléphone</label>
                <input type="tel" value={form.adresse.telephone1} onChange={e => updateSection('adresse', 'telephone1', e.target.value)} placeholder="+242..." />
              </div>
            </div>
            <div className="wizard-form-row">
              <div className="wizard-form-group">
                <label>Email professionnel</label>
                <input type="email" value={form.adresse.email_pro} onChange={e => updateSection('adresse', 'email_pro', e.target.value)} />
              </div>
              <div className="wizard-form-group">
                <label>Email personnel</label>
                <input type="email" value={form.adresse.email_perso} onChange={e => updateSection('adresse', 'email_perso', e.target.value)} />
              </div>
            </div>
          </div>
        );
      case 'banque':
        return (
          <div className="wizard-form-section">
            <h4>Coordonnées bancaires</h4>
            <div className="wizard-form-row">
              <div className="wizard-form-group">
                <label>Nom de la banque</label>
                <input type="text" value={form.banque.nom_banque} onChange={e => updateSection('banque', 'nom_banque', e.target.value)} />
              </div>
              <div className="wizard-form-group">
                <label>Titulaire</label>
                <input type="text" value={form.banque.titulaire} onChange={e => updateSection('banque', 'titulaire', e.target.value)} />
              </div>
            </div>
            <div className="wizard-form-row">
              <div className="wizard-form-group">
                <label>IBAN</label>
                <input type="text" value={form.banque.iban} onChange={e => updateSection('banque', 'iban', e.target.value)} />
              </div>
              <div className="wizard-form-group">
                <label>Code BIC</label>
                <input type="text" value={form.banque.code_bic} onChange={e => updateSection('banque', 'code_bic', e.target.value)} />
              </div>
            </div>
          </div>
        );
      case 'contrat': {
        const isCDI = form.contrat.type_contrat.startsWith('CDI');
        return (
          <div className="wizard-form-section">
            <h4>Contrat de travail</h4>
            <div className="wizard-form-row">
              <div className="wizard-form-group">
                <label>Date d'embauche <span className="required">*</span></label>
                <input type="date" value={form.contrat.date_embauche} onChange={e => updateSection('contrat', 'date_embauche', e.target.value)} />
              </div>
              <div className="wizard-form-group">
                <label>Type de contrat <span className="required">*</span></label>
                <select value={form.contrat.type_contrat} onChange={e => {
                  updateSection('contrat', 'type_contrat', e.target.value);
                  if (e.target.value.startsWith('CDI')) {
                    updateSection('contrat', 'date_fin_previsionnelle', '');
                  }
                }}>
                  <option value="">Sélectionnez...</option>
                  <option>CDI - Contrat à Durée Indéterminée</option>
                  <option>CDD - Contrat à Durée Déterminée</option>
                  <option>Contrat journalier</option>
                  <option>Contrat saisonnier</option>
                  <option>Contrat d'apprentissage</option>
                  <option>Stage</option>
                </select>
              </div>
            </div>
            <div className="wizard-form-row">
              <div className="wizard-form-group">
                <label>Fin période d'essai</label>
                <input type="date" value={form.contrat.fin_periode_essai} onChange={e => updateSection('contrat', 'fin_periode_essai', e.target.value)} />
              </div>
              <div className="wizard-form-group">
                <label>Date fin prévisionnelle (CDD) {!isCDI && <span className="required">*</span>}</label>
                <input
                  type="date"
                  value={isCDI ? '' : form.contrat.date_fin_previsionnelle}
                  onChange={e => updateSection('contrat', 'date_fin_previsionnelle', e.target.value)}
                  disabled={isCDI}
                  style={isCDI ? { background: '#f3f4f6', color: '#999', cursor: 'not-allowed' } : {}}
                />
                {isCDI && <span style={{ fontSize: 11, color: '#999' }}>Non applicable en CDI</span>}
              </div>
            </div>
          </div>
        );
      }
      case 'emploi': {
        const convEmploi = form.emploi.convention_collective || '';
        const categoriesConv = getCategoriesGrille(convEmploi);
        const hasGrille = categoriesConv.length > 0;
        return (
          <div className="wizard-form-section">
            <h4>Emploi</h4>
            <div className="wizard-form-row">
              <div className="wizard-form-group">
                <label>Établissement</label>
                <select value={form.emploi.etablissement} onChange={e => updateSection('emploi', 'etablissement', e.target.value)}>
                  <option value="">Sélectionnez...</option>
                  {etablissements.map(e => <option key={e.id} value={e.id}>{e.raison_sociale}</option>)}
                </select>
              </div>
              <div className="wizard-form-group">
                <label>Emploi / Poste</label>
                <input type="text" value={form.emploi.emploi} onChange={e => updateSection('emploi', 'emploi', e.target.value)} />
              </div>
            </div>
            <div className="wizard-form-row">
              <div className="wizard-form-group">
                <label>Convention collective <span className="required">*</span></label>
                <select value={convEmploi} onChange={e => {
                  updateSection('emploi', 'convention_collective', e.target.value);
                  // Réinitialiser catégorie et classification quand on change de convention
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
                  <select value={form.emploi.categorie} onChange={e => {
                    const cat = e.target.value;
                    updateSection('emploi', 'categorie', cat);
                    // Synchroniser avec classification
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
                  <select value={form.emploi.categorie} onChange={e => updateSection('emploi', 'categorie', e.target.value)}>
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
                  <select value={form.classification.echelon_grille || ''} onChange={e => {
                    const ech = e.target.value;
                    const salaire = getSalaireBase(convEmploi, form.emploi.categorie, ech);
                    setForm(prev => ({
                      ...prev,
                      classification: { ...prev.classification, echelon_grille: ech },
                      salaire_horaires: { ...prev.salaire_horaires, salaire_base: salaire ? String(salaire) : prev.salaire_horaires.salaire_base },
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
      case 'salaire_horaires': {
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
                <select value={form.salaire_horaires.type_salaire} onChange={e => updateSection('salaire_horaires', 'type_salaire', e.target.value)}>
                  <option>Mensuel</option><option>Horaire</option><option>Forfait jour</option>
                </select>
              </div>
              <div className="wizard-form-group">
                <label>Salaire de base (XAF) <span className="required">*</span></label>
                <input type="text" value={form.salaire_horaires.salaire_base} onChange={e => updateSection('salaire_horaires', 'salaire_base', e.target.value)} placeholder="0" />
              </div>
            </div>
            <div className="wizard-form-row">
              <div className="wizard-form-group">
                <label>Horaire mensuel</label>
                <input type="text" value={form.salaire_horaires.horaire_mensuel} onChange={e => updateSection('salaire_horaires', 'horaire_mensuel', e.target.value)} />
                <span style={{ fontSize: 11, color: '#9ca3af' }}>173,33h par défaut (40h/semaine)</span>
              </div>
              <div className="wizard-form-group">
                <label>Heures par jour</label>
                <input type="text" value={form.salaire_horaires.heures_jour} onChange={e => updateSection('salaire_horaires', 'heures_jour', e.target.value)} />
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
                          value={(form.salaire_horaires.primes_convention || {})[p.code] || ''}
                          onChange={e => {
                            const prConv = { ...(form.salaire_horaires.primes_convention || {}), [p.code]: e.target.value };
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
                          value={(form.salaire_horaires.indemnites_convention || {})[ind.code] || ''}
                          onChange={e => {
                            const indConv = { ...(form.salaire_horaires.indemnites_convention || {}), [ind.code]: e.target.value };
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
            {convMajorations.length > 0 && (
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
                          value={(form.salaire_horaires.majorations_convention || {})[maj.code] || ''}
                          onChange={e => {
                            const majConv = { ...(form.salaire_horaires.majorations_convention || {}), [maj.code]: e.target.value };
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
      case 'classification': {
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
                      onChange={e => {
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
                      onChange={e => {
                        const ech = e.target.value;
                        const salaire = getSalaireBase(ccCode, form.classification.categorie_grille, ech);
                        setForm(prev => ({
                          ...prev,
                          classification: { ...prev.classification, echelon_grille: ech },
                          salaire_horaires: { ...prev.salaire_horaires, salaire_base: salaire ? String(salaire) : prev.salaire_horaires.salaire_base },
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
                <input type="text" value={form.classification.emploi_conventionnel} onChange={e => updateSection('classification', 'emploi_conventionnel', e.target.value)} />
              </div>
              <div className="wizard-form-group">
                <label>Catégorie conventionnelle</label>
                <input type="text" value={form.classification.categorie_conventionnelle} onChange={e => updateSection('classification', 'categorie_conventionnelle', e.target.value)} />
              </div>
            </div>
            <div className="wizard-form-row">
              <div className="wizard-form-group">
                <label>Niveau</label>
                <input type="text" value={form.classification.niveau} onChange={e => updateSection('classification', 'niveau', e.target.value)} />
              </div>
              <div className="wizard-form-group">
                <label>Coefficient</label>
                <input type="text" value={form.classification.coefficient} onChange={e => updateSection('classification', 'coefficient', e.target.value)} />
              </div>
              <div className="wizard-form-group">
                <label>Indice</label>
                <input type="text" value={form.classification.indice} onChange={e => updateSection('classification', 'indice', e.target.value)} />
              </div>
            </div>
          </div>
        );
      }
      default:
        return (
          <div className="wizard-form-section">
            <h4>{SALARIE_STEPS[currentStep].label}</h4>
            <p style={{ fontSize: 12, color: '#9ca3af' }}>Configuration de cette section en cours de développement.</p>
          </div>
        );
    }
  };

  return (
    <div className="wizard-overlay">
      <div className="wizard-modal">
        <div className="wizard-modal-header">
          <h3>Nouveau salarié</h3>
          <button className="wizard-close-btn" onClick={onClose}>&times;</button>
        </div>

        <div className="wizard-body">
          <div className="wizard-sidebar">
            {SALARIE_STEPS.map((step, i) => (
              <button
                key={step.id}
                className={`wizard-nav-item ${currentStep === i ? 'active' : ''}`}
                onClick={() => setCurrentStep(i)}
              >
                <span className="wizard-nav-icon">{i + 1}</span>
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
            {currentStep < SALARIE_STEPS.length - 1 ? (
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

export default SalarieWizard;
