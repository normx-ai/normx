import React, { useState } from 'react';
import {
  LuBookOpen, LuFileSpreadsheet, LuCoins,
  LuGlobe, LuArrowRight, LuArrowLeft, LuBriefcase, LuBuilding2
} from 'react-icons/lu';
import { TypeActivite, Offre, User, NormxModule } from '../types';
import './Auth.css';

type TypeCompte = 'cabinet' | 'independant';

interface OffreOption {
  value: 'compta' | 'etats' | 'paie';
  label: string;
  icon: React.ComponentType<{ size?: number }>;
  desc: string;
  excludes?: string;
}

interface RegisterForm {
  typeCompte: TypeCompte | '';
  cabinetName: string;
  entite: string;
  typeActivite: TypeActivite | '';
  selectedOffres: Set<string>;
  nom: string;
  prenom: string;
  email: string;
  telephone: string;
  password: string;
  confirmPassword: string;
}

interface RegisteredUser extends User {
  entite: string;
  entite_id: number;
  type_activite: TypeActivite;
  offre: Offre;
}

interface RegisterResponse {
  user: User;
  otp: string;
  entite?: { id: number };
  error?: string;
}

interface RegisterProps {
  onBack: () => void;
  onRegistered: (email: string, otp: string, user: RegisteredUser) => void;
}

const OFFRES: OffreOption[] = [
  { value: 'compta', label: 'Comptabilité', icon: LuBookOpen, desc: 'Saisie, consultation, états financiers', excludes: 'etats' },
  { value: 'etats', label: 'États financiers', icon: LuFileSpreadsheet, desc: 'Import balance, révision comptable, états financiers', excludes: 'compta' },
  { value: 'paie', label: 'Paie', icon: LuCoins, desc: 'Bulletins de paie, salariés, déclarations' },
];

function Register({ onBack, onRegistered }: RegisterProps): React.ReactElement {
  const [step, setStep] = useState<1 | 2>(1);
  const [form, setForm] = useState<RegisterForm>({
    typeCompte: '', cabinetName: '', entite: '', typeActivite: '', selectedOffres: new Set(['compta']),
    nom: '', prenom: '', email: '', telephone: '', password: '', confirmPassword: ''
  });
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setError('');
  };

  const toggleOffre = (value: string): void => {
    const next = new Set(form.selectedOffres);
    const offreDef = OFFRES.find(o => o.value === value);
    if (next.has(value)) {
      next.delete(value);
    } else {
      if (offreDef?.excludes && next.has(offreDef.excludes)) {
        next.delete(offreDef.excludes);
      }
      next.add(value);
    }
    setForm({ ...form, selectedOffres: next });
    setError('');
  };

  const getModules = (): NormxModule[] => {
    const mods: NormxModule[] = [];
    if (form.selectedOffres.has('compta')) mods.push('compta');
    if (form.selectedOffres.has('etats')) mods.push('etats');
    if (form.selectedOffres.has('paie')) mods.push('paie');
    return mods;
  };

  const getOffre = (): Offre => {
    if (form.selectedOffres.has('compta')) return 'comptabilite';
    return 'etats';
  };

  // Validation etape 1
  const validateStep1 = (): boolean => {
    if (!form.typeCompte) {
      setError('Veuillez choisir votre type de compte.');
      return false;
    }
    if (form.typeCompte === 'cabinet' && !form.cabinetName.trim()) {
      setError('Veuillez saisir le nom du cabinet.');
      return false;
    }
    if (!form.typeActivite) {
      setError('Veuillez sélectionner un type d\'activité.');
      return false;
    }
    if (!form.entite.trim()) {
      setError('Veuillez saisir le nom de l\'entité.');
      return false;
    }
    if (!form.nom.trim() || !form.prenom.trim() || !form.email.trim() || !form.password) {
      setError('Veuillez remplir tous les champs obligatoires.');
      return false;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(form.email)) {
      setError('Adresse e-mail invalide.');
      return false;
    }
    if (form.password.length < 6) {
      setError('Le mot de passe doit contenir au moins 6 caractères.');
      return false;
    }
    if (form.password !== form.confirmPassword) {
      setError('Les mots de passe ne correspondent pas.');
      return false;
    }
    return true;
  };

  const goToStep2 = (): void => {
    setError('');
    if (validateStep1()) setStep(2);
  };

  const handleSubmit = async (): Promise<void> => {
    setError('');
    if (form.selectedOffres.size === 0) {
      setError('Veuillez sélectionner au moins une offre.');
      return;
    }

    const modules = getModules();
    const offre = getOffre();
    const cabinetName = form.typeCompte === 'cabinet' ? form.cabinetName.trim() : form.entite.trim();

    setLoading(true);
    try {
      const res = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nom: form.nom.trim(),
          prenom: form.prenom.trim(),
          email: form.email.trim(),
          password: form.password,
          telephone: form.telephone.trim() || undefined,
          entite: form.entite.trim(),
          cabinet_name: cabinetName,
          type_compte: form.typeCompte,
          type_activite: form.typeActivite,
          offre,
          modules,
        }),
      });
      const data: RegisterResponse = await res.json();
      if (!res.ok) setError(data.error || 'Erreur lors de la création.');
      else onRegistered(form.email, data.otp, {
        ...data.user,
        entite: form.entite,
        entite_id: data.entite?.id ?? 0,
        type_activite: form.typeActivite as TypeActivite,
        offre,
      });
    } catch {
      setError('Impossible de contacter le serveur.');
    } finally {
      setLoading(false);
    }
  };

  const entitePlaceholder = (): string => {
    if (form.typeCompte === 'cabinet') return 'Ex: SARL Client Alpha (premier dossier client)';
    switch (form.typeActivite) {
      case 'entreprise': return 'Ex: SARL Batiment Plus, SA Congo Mining';
      case 'projet_developpement': return 'Ex: Projet d\'appui au développement rural';
      case 'ordre_professionnel': return 'Ex: Ordre des experts-comptables';
      case 'smt': return 'Ex: GIC Entraide Villageoise';
      default: return 'Ex: Association Solidarité Congo';
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card auth-card-wide">
        <div className="auth-logo-block">
          <div className="auth-logo-icon">N</div>
          <div className="auth-logo">NORMX <span className="auth-logo-accent">AI</span></div>
        </div>
        <p className="auth-tagline">Comptabilité, États financiers & Paie</p>

        {/* Indicateur d'etapes */}
        <div className="register-steps">
          <div className={`register-step ${step >= 1 ? 'active' : ''}`}>
            <span className="step-number">1</span>
            <span className="step-label">Identité</span>
          </div>
          <div className="step-separator" />
          <div className={`register-step ${step >= 2 ? 'active' : ''}`}>
            <span className="step-number">2</span>
            <span className="step-label">Offres</span>
          </div>
        </div>

        {error && <div className="auth-error">{error}</div>}

        {/* ==================== ETAPE 1 ==================== */}
        {step === 1 && (
          <div>
            <h2>Créer un compte</h2>
            <p className="auth-subtitle">Renseignez les informations de votre entité et votre profil.</p>

            {/* Type de compte */}
            <div className="form-group">
              <label>Type de compte <span className="required">*</span></label>
              <div className="type-compte-row">
                <button
                  type="button"
                  className={`type-compte-btn ${form.typeCompte === 'cabinet' ? 'selected' : ''}`}
                  onClick={() => { setForm({ ...form, typeCompte: 'cabinet' }); setError(''); }}
                >
                  <LuBriefcase size={18} />
                  <div>
                    <div className="type-compte-label">Cabinet comptable</div>
                    <div className="type-compte-desc">Gérez plusieurs clients/dossiers</div>
                  </div>
                </button>
                <button
                  type="button"
                  className={`type-compte-btn ${form.typeCompte === 'independant' ? 'selected' : ''}`}
                  onClick={() => { setForm({ ...form, typeCompte: 'independant', cabinetName: '' }); setError(''); }}
                >
                  <LuBuilding2 size={18} />
                  <div>
                    <div className="type-compte-label">Entité indépendante</div>
                    <div className="type-compte-desc">Gérez votre propre comptabilité</div>
                  </div>
                </button>
              </div>
            </div>

            {/* Nom du cabinet (si cabinet) */}
            {form.typeCompte === 'cabinet' && (
              <div className="form-group">
                <label htmlFor="cabinetName">Nom du cabinet <span className="required">*</span></label>
                <input
                  id="cabinetName" name="cabinetName" type="text"
                  value={form.cabinetName} onChange={handleChange}
                  placeholder="Ex: Cabinet Expertise Plus, Fiduciaire Congo"
                  required
                />
              </div>
            )}

            {/* Type d'activité */}
            <div className="form-group">
              <label>Type d'activité {form.typeCompte === 'cabinet' ? 'du premier dossier' : ''} <span className="required">*</span></label>
              <select
                value={form.typeActivite === 'smt' ? 'entreprise' : form.typeActivite}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => { setForm({ ...form, typeActivite: e.target.value as TypeActivite }); setError(''); }}
              >
                <option value="">-- Sélectionnez --</option>
                <option value="entreprise">Entreprise — Société commerciale, SARL, SA, SAS</option>
                <option value="association">Association — ONG, fondation, syndicat, parti politique</option>
                <option value="ordre_professionnel">Ordre professionnel — Avocats, médecins, experts-comptables</option>
                <option value="projet_developpement">Projet de développement — Bailleurs de fonds, agences d'exécution</option>
              </select>
            </div>

            {/* Sous-choix système comptable pour Entreprise */}
            {(form.typeActivite === 'entreprise' || form.typeActivite === 'smt') && (
              <div className="form-group">
                <label>Système comptable <span className="required">*</span></label>
                <div className="type-compte-row">
                  <button
                    type="button"
                    className={`type-compte-btn ${form.typeActivite === 'entreprise' ? 'selected' : ''}`}
                    onClick={() => { setForm({ ...form, typeActivite: 'entreprise' }); setError(''); }}
                  >
                    <LuFileSpreadsheet size={18} />
                    <div>
                      <div className="type-compte-label">Système normal (SYSCOHADA)</div>
                      <div className="type-compte-desc">Comptabilité en partie double, plan comptable complet</div>
                    </div>
                  </button>
                  <button
                    type="button"
                    className={`type-compte-btn ${form.typeActivite === 'smt' ? 'selected' : ''}`}
                    onClick={() => { setForm({ ...form, typeActivite: 'smt' }); setError(''); }}
                  >
                    <LuCoins size={18} />
                    <div>
                      <div className="type-compte-label">Système minimal de trésorerie (SMT)</div>
                      <div className="type-compte-desc">Très petites entités : négoce &lt; 60M, artisanal &lt; 40M, services &lt; 30M FCFA</div>
                    </div>
                  </button>
                </div>
              </div>
            )}

            {/* Nom de l'entite */}
            <div className="form-group">
              <label htmlFor="entite">
                {form.typeCompte === 'cabinet' ? 'Nom du premier dossier' : 'Nom de l\'entité'} <span className="required">*</span>
              </label>
              <input
                id="entite" name="entite" type="text"
                value={form.entite} onChange={handleChange}
                placeholder={entitePlaceholder()}
                required
              />
            </div>

            {/* Espace OHADA */}
            <div className="form-group">
              <label>Espace OHADA</label>
              <div className="ohada-badge">
                <LuGlobe size={18} />
                <span>Espace OHADA (17 États membres)</span>
              </div>
            </div>

            {/* Nom + Prénom */}
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="nom">Nom <span className="required">*</span></label>
                <input id="nom" name="nom" type="text" value={form.nom} onChange={handleChange} required />
              </div>
              <div className="form-group">
                <label htmlFor="prenom">Prénom <span className="required">*</span></label>
                <input id="prenom" name="prenom" type="text" value={form.prenom} onChange={handleChange} required />
              </div>
            </div>

            {/* Email */}
            <div className="form-group">
              <label htmlFor="reg-email">E-mail <span className="required">*</span></label>
              <input id="reg-email" name="email" type="email" value={form.email} onChange={handleChange} placeholder="votre@email.com" required />
            </div>

            {/* Téléphone */}
            <div className="form-group">
              <label htmlFor="telephone">Téléphone</label>
              <input id="telephone" name="telephone" type="tel" value={form.telephone} onChange={handleChange} placeholder="+XXX XX XXX XX XX" />
            </div>

            {/* Mots de passe */}
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="reg-password">Mot de passe <span className="required">*</span></label>
                <div className="password-field">
                  <input
                    id="reg-password" name="password"
                    type={showPassword ? 'text' : 'password'}
                    value={form.password} onChange={handleChange} required
                  />
                  <button type="button" className="toggle-password" onClick={() => setShowPassword(!showPassword)}>
                    {showPassword ? '\u{1F648}' : '\u{1F441}'}
                  </button>
                </div>
              </div>
              <div className="form-group">
                <label htmlFor="confirmPassword">Confirmer <span className="required">*</span></label>
                <div className="password-field">
                  <input
                    id="confirmPassword" name="confirmPassword"
                    type={showPassword ? 'text' : 'password'}
                    value={form.confirmPassword} onChange={handleChange} required
                  />
                </div>
              </div>
            </div>

            <p className="admin-note">
              {form.typeCompte === 'cabinet'
                ? 'Vous serez l\'administrateur de ce cabinet.'
                : 'Vous serez l\'administrateur de cette entité.'}
            </p>

            <button type="button" className="btn-primary" onClick={goToStep2}>
              Suivant <LuArrowRight size={16} style={{ verticalAlign: 'middle', marginLeft: 6 }} />
            </button>

            <div className="auth-switch">
              Déjà un compte ?{' '}
              <button className="link-btn" onClick={onBack}>Se connecter</button>
            </div>
          </div>
        )}

        {/* ==================== ETAPE 2 ==================== */}
        {step === 2 && (
          <div>
            <h2>Choisissez vos offres</h2>
            <p className="auth-subtitle">
              Sélectionnez les modules que vous souhaitez activer pour{' '}
              <strong>{form.entite || 'votre entité'}</strong>.
            </p>

            <div className="offre-list">
              {OFFRES.map((o: OffreOption) => {
                const isSelected = form.selectedOffres.has(o.value);
                const isDisabled = !isSelected && !!o.excludes && form.selectedOffres.has(o.excludes);
                const OffreIcon = o.icon;
                return (
                  <div
                    key={o.value}
                    className={`offre-item ${isSelected ? 'selected' : ''} ${isDisabled ? 'disabled' : ''}`}
                    onClick={() => { if (!isDisabled) toggleOffre(o.value); }}
                  >
                    <input type="checkbox" checked={isSelected} disabled={isDisabled} readOnly />
                    <span className="offre-item-icon"><OffreIcon size={18} /></span>
                    <div className="offre-item-content">
                      <span className="offre-item-label">{o.label}</span>
                      <span className="offre-item-desc">{o.desc}</span>
                      {isDisabled && <span className="offre-item-hint">Déjà inclus dans Comptabilité</span>}
                    </div>
                  </div>
                );
              })}
            </div>

            <p className="offre-note">
              Comptabilité inclut les états financiers. Les deux ne peuvent pas être combinés.
            </p>

            <div className="register-actions">
              <button type="button" className="btn-secondary" onClick={() => { setStep(1); setError(''); }}>
                <LuArrowLeft size={16} style={{ verticalAlign: 'middle', marginRight: 6 }} /> Retour
              </button>
              <button type="button" className="btn-primary" onClick={handleSubmit} disabled={loading}>
                {loading ? 'Création en cours...' : 'Créer mon compte'}
              </button>
            </div>

            <div className="auth-switch">
              Déjà un compte ?{' '}
              <button className="link-btn" onClick={onBack}>Se connecter</button>
            </div>
          </div>
        )}
      </div>

      <div className="auth-footer">
        <span className="auth-footer-link">Aide</span>
        <span className="auth-footer-link">Confidentialité</span>
        <span className="auth-footer-link">CGU</span>
        <span className="auth-footer-link">Mentions légales</span>
      </div>
    </div>
  );
}

export default Register;
