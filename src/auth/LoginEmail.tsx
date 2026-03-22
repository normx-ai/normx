import React, { useState } from 'react';
import './Auth.css';

interface LoginEmailProps {
  onNext: (email: string) => void;
  onRegister: () => void;
}

function LoginEmail({ onNext, onRegister }: LoginEmailProps): React.ReactElement {
  const [email, setEmail] = useState<string>('');
  const [error, setError] = useState<string>('');

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>): void => {
    e.preventDefault();
    if (!email.trim()) {
      setError('Veuillez saisir votre adresse e-mail.');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
      setError('Adresse e-mail invalide.');
      return;
    }
    setError('');
    onNext(email.trim());
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo-block">
          <div className="auth-logo-icon">N</div>
          <div className="auth-logo">NORMX <span className="auth-logo-accent">AI</span></div>
        </div>
        <p className="auth-tagline">Comptabilité, États financiers & Paie</p>

        <h2>Connectez-vous</h2>
        <p className="auth-subtitle">Saisissez votre e-mail pour commencer.</p>

        {error && <div className="auth-error">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="email">E-mail <span className="required">*</span></label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => { setEmail(e.target.value); setError(''); }}
              placeholder="votre@email.com"
              autoComplete="email"
              required
            />
          </div>
          <button type="submit" className="btn-primary">Continuer</button>
        </form>

        <div className="auth-switch">
          Pas encore de compte ?{' '}
          <button className="link-btn" onClick={onRegister}>Créer une entité</button>
        </div>
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

export default LoginEmail;
