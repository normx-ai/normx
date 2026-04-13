import React from 'react';

const PRIMARY = '#D4A843';
const DARK = '#1A3A5C';

export type TenantType = 'enterprise' | 'cabinet';

const TENANT_TYPES: { id: TenantType; label: string; desc: string; icon: string }[] = [
  { id: 'enterprise', label: 'Entreprise', desc: 'Je gère ma propre comptabilité', icon: '🏢' },
  { id: 'cabinet', label: 'Cabinet comptable', desc: 'Je gère la comptabilité de mes clients', icon: '📊' },
];

interface OnboardingStepEntiteProps {
  entiteNom: string;
  onEntiteNomChange: (value: string) => void;
  tenantType: TenantType;
  onTenantTypeChange: (t: TenantType) => void;
  onContinue: () => void;
  saving: boolean;
  error: string;
}

function OnboardingStepEntite({ entiteNom, onEntiteNomChange, tenantType, onTenantTypeChange, onContinue, saving, error }: OnboardingStepEntiteProps): React.JSX.Element {
  return (
    <>
      <div style={{ marginBottom: 20 }}>
        <label style={{ display: 'block', fontSize: 14, fontWeight: 600, color: DARK, marginBottom: 6 }}>
          Nom de votre entité
        </label>
        <input
          type="text"
          value={entiteNom}
          onChange={(e) => onEntiteNomChange(e.target.value)}
          placeholder="Ex : OMEGA SERVICES SARL"
          style={{
            width: '100%',
            padding: '12px 14px',
            border: '1.5px solid rgba(0,0,0,0.12)',
            fontSize: 15,
            outline: 'none',
          }}
        />
      </div>

      <div style={{ marginBottom: 28 }}>
        <label style={{ display: 'block', fontSize: 14, fontWeight: 600, color: DARK, marginBottom: 10 }}>
          Je suis
        </label>
        <div style={{ display: 'flex', gap: 12 }}>
          {TENANT_TYPES.map((t) => {
            const selected = tenantType === t.id;
            return (
              <div
                key={t.id}
                onClick={() => onTenantTypeChange(t.id)}
                style={{
                  flex: 1,
                  border: `2px solid ${selected ? PRIMARY : 'rgba(0,0,0,0.08)'}`,
                  padding: 20,
                  cursor: 'pointer',
                  background: selected ? 'rgba(212,168,67,0.06)' : '#fff',
                  transition: 'all 0.2s',
                  textAlign: 'center',
                }}
              >
                <div style={{ fontSize: 28, marginBottom: 8 }}>{t.icon}</div>
                <div style={{ fontSize: 15, fontWeight: 700, color: DARK, marginBottom: 4 }}>{t.label}</div>
                <div style={{ fontSize: 12, color: '#6b7280' }}>{t.desc}</div>
              </div>
            );
          })}
        </div>
      </div>

      <button
        onClick={onContinue}
        disabled={!entiteNom.trim() || saving}
        style={{
          width: '100%',
          padding: '14px 28px',
          background: entiteNom.trim() ? PRIMARY : '#e5e7eb',
          color: entiteNom.trim() ? DARK : '#9ca3af',
          border: 'none',
          fontSize: 16,
          fontWeight: 700,
          cursor: entiteNom.trim() ? 'pointer' : 'default',
        }}
      >
        {saving ? 'Création...' : 'Continuer'}
      </button>
      {error && (
        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', padding: '10px 14px', marginTop: 12, fontSize: 14, color: '#dc2626' }}>
          {error}
        </div>
      )}
    </>
  );
}

export default OnboardingStepEntite;
