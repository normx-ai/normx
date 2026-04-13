import React from 'react';

const PRIMARY = '#D4A843';
const DARK = '#1A3A5C';
const BG = '#faf8f5';

interface OnboardingLayoutProps {
  userName: string;
  step: 1 | 2 | 3;
  showStep2: boolean;
  subtitle: string;
  children: React.ReactNode;
}

function OnboardingLayout({ userName, step, showStep2, subtitle, children }: OnboardingLayoutProps): React.JSX.Element {
  return (
    <div style={{ minHeight: '100vh', background: BG, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ background: '#fff', borderRadius: 0, border: '1px solid rgba(0,0,0,0.08)', boxShadow: '0 8px 32px rgba(0,0,0,0.06)', maxWidth: 720, width: '100%', padding: 48 }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <img src="/logo-horizontal.png" alt="NORMX" style={{ height: 36, width: 'auto', display: 'inline-block', marginBottom: 16 }} />
          <h1 style={{ fontSize: 28, fontWeight: 900, color: DARK, margin: '0 0 8px' }}>
            Bienvenue{userName ? `, ${userName.split(' ')[0]}` : ''} !
          </h1>
          <p style={{ color: '#6b7280', fontSize: 15 }}>{subtitle}</p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 16 }}>
            <div style={{ width: 32, height: 4, borderRadius: 2, background: PRIMARY }} />
            {showStep2 && (
              <div style={{ width: 32, height: 4, borderRadius: 2, background: step >= 2 ? PRIMARY : '#e5e7eb' }} />
            )}
            <div style={{ width: 32, height: 4, borderRadius: 2, background: step >= 3 ? PRIMARY : '#e5e7eb' }} />
          </div>
        </div>
        {children}
      </div>
    </div>
  );
}

export default OnboardingLayout;
