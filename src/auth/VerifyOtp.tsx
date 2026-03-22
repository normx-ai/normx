import React, { useState, useEffect } from 'react';
import API_BASE from '../utils/api';
import './Auth.css';

interface VerifyOtpProps {
  email: string;
  otpCode: string;
  onVerified: () => void;
}

interface VerifyOtpResponse {
  error?: string;
}

interface SendOtpResponse {
  devCode?: string;
  error?: string;
}

function VerifyOtp({ email, otpCode: initialOtpCode, onVerified }: VerifyOtpProps): React.ReactElement {
  const [code, setCode] = useState<string>('');
  const [displayOtp, setDisplayOtp] = useState<string>(initialOtpCode || '');
  const [error, setError] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [renvoyerLoading, setRenvoyerLoading] = useState<boolean>(false);
  const [renvoyerMessage, setRenvoyerMessage] = useState<string>('');

  useEffect(() => {
    if (email) {
      fetch(`${API_BASE}/api/send-otp-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      }).catch(() => {});
    }
  }, [email]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch(`${API_BASE}/api/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code }),
      });
      const data: VerifyOtpResponse = await res.json();
      if (!res.ok) setError(data.error || 'Erreur de vérification.');
      else onVerified();
    } catch {
      setError('Impossible de contacter le serveur.');
    } finally {
      setLoading(false);
    }
  };

  const handleRenvoyer = async (): Promise<void> => {
    setRenvoyerLoading(true);
    setRenvoyerMessage('');
    try {
      const res = await fetch(`${API_BASE}/api/send-otp-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data: SendOtpResponse = await res.json();
      if (res.ok) {
        setRenvoyerMessage('Un nouveau code a été envoyé.');
        if (data.devCode) setDisplayOtp(data.devCode);
      }
    } catch {} finally {
      setRenvoyerLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo-block">
          <div className="auth-logo-icon">N</div>
          <div className="auth-logo">NORMX <span className="auth-logo-accent">AI</span></div>
        </div>
        <h2>Vérifiez votre identité</h2>
        <p className="auth-subtitle">
          Un code de vérification a été envoyé à <strong>{email}</strong>.
        </p>

        {process.env.NODE_ENV === 'development' && displayOtp && (
          <div style={{ background: '#eff6ff', color: '#C09935', padding: '8px 12px', marginBottom: 12, fontSize: 13, textAlign: 'center' }}>
            Code OTP (dev) : <strong>{displayOtp}</strong>
          </div>
        )}

        {error && <div className="auth-error">{error}</div>}
        {renvoyerMessage && <div className="auth-success">{renvoyerMessage}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="otp">Saisissez le code a 6 chiffres</label>
            <input id="otp" type="text" value={code} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))} maxLength={6} placeholder="000000" required />
          </div>
          <button type="submit" className="btn-primary" disabled={loading || code.length !== 6}>
            {loading ? 'Vérification...' : 'Vérifier'}
          </button>
        </form>

        <div className="reset-links">
          <button className="link-btn" onClick={handleRenvoyer} disabled={renvoyerLoading}>
            {renvoyerLoading ? 'Envoi...' : 'Renvoyer le code'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default VerifyOtp;
