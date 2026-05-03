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

// 2 vraies options mutuellement exclusives :
// - 'full' : compta complete (saisie + etats inclus) -> ['compta', 'etats']
// - 'etats-only' : etats financiers seuls (import balance) -> ['etats']
type Mode = 'full' | 'etats-only';

interface ModeOption {
  id: Mode;
  label: string;
  desc: string;
  features: string[];
  modules: NormxModule[];
}

const MODE_OPTIONS: ModeOption[] = [
  {
    id: 'full',
    label: 'Comptabilité complète',
    desc: 'Saisie quotidienne + états financiers + liasse fiscale, le tout en un seul espace',
    features: [
      'Saisie SYSCOHADA · 1 409 comptes',
      'Grand livre, balance, lettrage',
      'États financiers automatiques',
      'Liasse fiscale (36 notes)',
    ],
    modules: ['compta', 'etats'],
  },
  {
    id: 'etats-only',
    label: 'États financiers uniquement',
    desc: 'Import de balance Excel pour générer les états, sans saisie comptable',
    features: [
      'Import balance Excel/CSV',
      'Bilan, Compte de résultat, TFT',
      'Notes annexes SYSCOHADA',
      'Pas de saisie d\'écritures',
    ],
    modules: ['etats'],
  },
];

function OnboardingStepModules({
  modules,
  selectedModules,
  onToggleModule,
  entiteNom,
  isCabinet,
  onBack,
  onFinish,
  saving,
  canFinish,
  error,
}: OnboardingStepModulesProps): React.JSX.Element {
  // Filtre les modes disponibles selon ce qui est active dans ENABLED_MODULES
  const availableModes = MODE_OPTIONS.filter(opt =>
    opt.modules.every(m => modules.some(mod => mod.id === m))
  );

  const currentMode: Mode | null = (() => {
    if (selectedModules.includes('compta')) return 'full';
    if (selectedModules.includes('etats') && !selectedModules.includes('compta')) return 'etats-only';
    return null;
  })();

  const selectMode = (mode: ModeOption): void => {
    // Toggle pour aligner sur la signature parent : on coche tout ce qui doit
    // l'etre, on decoche le reste.
    modules.forEach(m => {
      const shouldBeOn = mode.modules.includes(m.id);
      const isOn = selectedModules.includes(m.id);
      if (shouldBeOn !== isOn) onToggleModule(m.id);
    });
  };

  return (
    <>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 12, marginBottom: 24 }}>
        {availableModes.map((opt) => {
          const selected = currentMode === opt.id;
          return (
            <div
              key={opt.id}
              onClick={() => selectMode(opt)}
              style={{
                border: `2px solid ${selected ? PRIMARY : 'rgba(0,0,0,0.08)'}`,
                padding: 20,
                cursor: 'pointer',
                background: selected ? `${PRIMARY}08` : '#fff',
                transition: 'all 0.2s',
                position: 'relative',
                display: 'flex',
                gap: 14,
                alignItems: 'flex-start',
              }}
            >
              <div style={{
                width: 20, height: 20, borderRadius: '50%',
                border: `2px solid ${selected ? PRIMARY : '#d1d5db'}`,
                background: '#fff',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0, marginTop: 2,
              }}>
                {selected && (
                  <div style={{ width: 10, height: 10, borderRadius: '50%', background: PRIMARY }} />
                )}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 16, fontWeight: 700, color: DARK, marginBottom: 4 }}>{opt.label}</div>
                <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 12 }}>{opt.desc}</div>
                <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4 }}>
                  {opt.features.map((f, i) => (
                    <li key={i} style={{ fontSize: 12, color: '#374151', display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ color: PRIMARY, fontSize: 14 }}>&#10003;</span> {f}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          );
        })}
      </div>

      <div style={{
        background: 'rgba(212,168,67,0.06)',
        border: '1px solid rgba(212,168,67,0.2)',
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
            flex: 1, padding: '14px 28px', background: '#fff', color: DARK,
            border: '1.5px solid rgba(0,0,0,0.12)', fontSize: 15, fontWeight: 600, cursor: 'pointer',
          }}
        >
          Retour
        </button>
        <button
          onClick={onFinish}
          disabled={!canFinish}
          style={{
            flex: 2, padding: '14px 28px',
            background: canFinish ? PRIMARY : '#e5e7eb',
            color: canFinish ? DARK : '#9ca3af',
            border: 'none', fontSize: 16, fontWeight: 700,
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
