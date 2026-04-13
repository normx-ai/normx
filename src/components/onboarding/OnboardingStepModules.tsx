import React from 'react';
import type { NormxModule } from '../../types';

const PRIMARY = '#D4A843';
const DARK = '#1A3A5C';

export interface ModuleOption {
  id: NormxModule;
  label: string;
  desc: string;
  color: string;
  features: string[];
}

interface OnboardingStepModulesProps {
  modules: ModuleOption[];
  selectedModules: NormxModule[];
  onToggleModule: (id: NormxModule) => void;
  onSelectAll: () => void;
  entiteNom: string;
  isCabinet: boolean;
  onBack: () => void;
  onFinish: () => void;
  saving: boolean;
  canFinish: boolean;
  error: string;
}

function OnboardingStepModules({
  modules,
  selectedModules,
  onToggleModule,
  onSelectAll,
  entiteNom,
  isCabinet,
  onBack,
  onFinish,
  saving,
  canFinish,
  error,
}: OnboardingStepModulesProps): React.JSX.Element {
  const comptaIncludesEtats = selectedModules.includes('compta');
  const allSelected = selectedModules.length === modules.length;

  return (
    <>
      {/* Tout sélectionner */}
      <div
        onClick={onSelectAll}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '12px 16px',
          marginBottom: 16,
          border: `2px solid ${allSelected ? PRIMARY : 'rgba(0,0,0,0.08)'}`,
          cursor: 'pointer',
          background: allSelected ? 'rgba(212,168,67,0.06)' : '#fff',
        }}
      >
        <div style={{
          width: 22, height: 22, borderRadius: 6,
          border: `2px solid ${allSelected ? PRIMARY : '#d1d5db'}`,
          background: allSelected ? PRIMARY : '#fff',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 14, color: '#fff', fontWeight: 700, flexShrink: 0,
        }}>
          {allSelected && '✓'}
        </div>
        <div>
          <div style={{ fontSize: 15, fontWeight: 700, color: DARK }}>Tous les modules</div>
          <div style={{ fontSize: 12, color: '#6b7280' }}>{modules.map((m) => m.label).join(' + ')}</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${modules.length}, 1fr)`, gap: 12, marginBottom: 32 }}>
        {modules.map((m) => {
          const selected = selectedModules.includes(m.id);
          const disabled = m.id === 'etats' && comptaIncludesEtats;
          return (
            <div
              key={m.id}
              onClick={() => !disabled && onToggleModule(m.id)}
              style={{
                border: `2px solid ${selected ? m.color : 'rgba(0,0,0,0.08)'}`,
                padding: 20,
                cursor: disabled ? 'default' : 'pointer',
                background: selected ? `${m.color}08` : '#fff',
                opacity: disabled ? 0.5 : 1,
                transition: 'all 0.2s',
                position: 'relative',
              }}
            >
              <div style={{
                position: 'absolute', top: 12, right: 12,
                width: 22, height: 22, borderRadius: 6,
                border: `2px solid ${selected ? m.color : '#d1d5db'}`,
                background: selected ? m.color : '#fff',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 14, color: '#fff', fontWeight: 700,
              }}>
                {selected && '✓'}
              </div>
              <div style={{ fontSize: 20, fontWeight: 800, color: m.color, marginBottom: 4 }}>{m.label}</div>
              <div style={{ fontSize: 12, color: '#6b7280', marginBottom: disabled ? 4 : 12 }}>{m.desc}</div>
              {disabled && <div style={{ fontSize: 11, color: '#2563eb', fontWeight: 600, marginBottom: 8 }}>Inclus dans Compta</div>}
              <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                {m.features.map((f, i) => (
                  <li key={i} style={{ fontSize: 12, color: '#374151', padding: '2px 0', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ color: m.color, fontSize: 14 }}>&#10003;</span> {f}
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>

      {/* Résumé entité */}
      <div style={{
        background: 'rgba(212,168,67,0.06)',
        border: '1px solid rgba(212,168,67,0.2)',
        borderRadius: 0,
        padding: 16,
        marginBottom: 24,
      }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: DARK, marginBottom: 4 }}>
          {entiteNom}
        </div>
        <div style={{ fontSize: 13, color: '#6b7280' }}>
          {isCabinet ? 'Cabinet comptable' : 'Entreprise'}
        </div>
      </div>

      {error && (
        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', padding: '10px 14px', marginBottom: 16, fontSize: 14, color: '#dc2626' }}>
          {error}
        </div>
      )}

      <div style={{ display: 'flex', gap: 12 }}>
        <button
          onClick={onBack}
          style={{
            flex: 1,
            padding: '14px 28px',
            background: '#fff',
            color: DARK,
            border: '1.5px solid rgba(0,0,0,0.12)',
            borderRadius: 0,
            fontSize: 15,
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          Retour
        </button>
        <button
          onClick={onFinish}
          disabled={!canFinish}
          style={{
            flex: 2,
            padding: '14px 28px',
            background: canFinish ? PRIMARY : '#e5e7eb',
            color: canFinish ? DARK : '#9ca3af',
            border: 'none',
            borderRadius: 0,
            fontSize: 16,
            fontWeight: 700,
            cursor: canFinish ? 'pointer' : 'default',
          }}
        >
          {saving ? 'Création...' : 'Continuer'}
        </button>
      </div>
    </>
  );
}

export default OnboardingStepModules;
