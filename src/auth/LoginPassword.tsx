import React, { useState } from 'react';
import { User, Entite } from '../types';
import './Auth.css';

interface LoginPasswordProps {
  email: string;
  onNext: (user: User, otp: string, entites?: Entite[]) => void;
  onBack: () => void;
}

interface LoginResponse {
  user: User;
  entites: Entite[];
  otp: string;
  error?: string;
}

function LoginPassword({ email, onNext, onBack }: LoginPasswordProps): React.ReactElement {
  const [password, setPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data: LoginResponse = await res.json();
      if (!res.ok) setError(data.error || 'Erreur de connexion.');
      else onNext(data.user, data.otp, data.entites);
    } catch {
      setError('Impossible de contacter le serveur.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo-block">
          <div className="auth-logo-icon">N</div>
          <div className="auth-logo">NORMX <span className="auth-logo-accent">AI</span></div>
        </div>
        <h2>Connexion</h2>
        {error && <div className="auth-error">{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Adresse e-mail</label>
            <div className="email-display">
              <span>{email}</span>
              <button type="button" className="link-btn" onClick={onBack}>Modifier</button>
            </div>
          </div>
          <div className="form-group">
            <label htmlFor="password">Mot de passe</label>
            <div className="password-field">
              <input id="password" type={showPassword ? 'text' : 'password'} value={password} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)} required />
              <button type="button" className="toggle-password" onClick={() => setShowPassword(!showPassword)}>
                {showPassword ? '\u{1F648}' : '\u{1F441}'}
              </button>
            </div>
          </div>
          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? 'Connexion...' : 'Connexion'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default LoginPassword;
