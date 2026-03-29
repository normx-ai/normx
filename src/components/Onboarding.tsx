import React, { useState } from 'react';
import type { TypeActivite, NormxModule, Entite } from '../types';

interface OnboardingProps {
  userName: string;
  onComplete: (entite: Entite) => void;
  defaultModule?: string | null;
}

const PRIMARY = '#D4A843';
const DARK = '#1A3A5C';
const BG = '#faf8f5';

interface ModuleOption {
  id: NormxModule;
  label: string;
  desc: string;
  color: string;
  features: string[];
}

const MODULES: ModuleOption[] = [
  {
    id: 'compta',
    label: 'Compta',
    desc: 'Comptabilité SYSCOHADA / SYCEBNL',
    color: '#2563eb',
    features: ['Saisie comptable', 'GL, BG', 'Déclarations', 'Plan comptable OHADA'],
  },
  {
    id: 'etats',
    label: 'États',
    desc: 'États financiers et résultat fiscal',
    color: '#059669',
    features: ['Bilan', 'Compte de résultat', 'TFT & Notes', 'Résultat fiscal'],
  },
  {
    id: 'paie',
    label: 'Paie',
    desc: 'Gestion de la paie Congo',
    color: '#d97706',
    features: ['Bulletins de paie', 'DAS I, II, III', 'États sociaux', 'État fiscal'],
  },
];

const TYPES_ACTIVITE: { id: TypeActivite; label: string }[] = [
  { id: 'entreprise', label: 'Entreprise' },
  { id: 'association', label: 'Association / ONG' },
  { id: 'ordre_professionnel', label: 'Ordre professionnel' },
  { id: 'projet_developpement', label: 'Projet de développement' },
  { id: 'smt', label: 'SMT (Système Minimal de Trésorerie)' },
];

export default function Onboarding({ userName, onComplete, defaultModule }: OnboardingProps): React.JSX.Element {
  const [step, setStep] = useState<1 | 2>(1);
  const [selectedModules, setSelectedModules] = useState<NormxModule[]>(
    defaultModule && MODULES.some(m => m.id === defaultModule) ? [defaultModule as NormxModule] : []
  );
  const [entiteNom, setEntiteNom] = useState('');
  const [typeActivite, setTypeActivite] = useState<TypeActivite>('entreprise');

  const toggleModule = (id: NormxModule): void => {
    setSelectedModules(prev =>
      prev.includes(id) ? prev.filter(m => m !== id) : [...prev, id]
    );
  };

  const selectAll = (): void => {
    if (selectedModules.length === MODULES.length) {
      setSelectedModules([]);
    } else {
      setSelectedModules(MODULES.map(m => m.id));
    }
  };

  const [saving, setSaving] = useState(false);

  const handleFinish = async (): Promise<void> => {
    if (selectedModules.length === 0 || !entiteNom.trim() || saving) return;
    setSaving(true);

    try {
      // Appeler l'API pour créer/configurer le tenant
      const token = localStorage.getItem('normx_kc_access_token');
      const resp = await fetch('/api/tenant/setup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          nom: entiteNom.trim(),
          type: typeActivite === 'smt' ? 'enterprise' : 'enterprise',
          modules: selectedModules,
        }),
      });

      if (!resp.ok) throw new Error('Erreur serveur');

      const entite: Entite = {
        id: 1,
        nom: entiteNom.trim(),
        type_activite: typeActivite,
        offre: selectedModules.includes('compta') ? 'comptabilite' : 'etats',
        modules: selectedModules,
      };
      localStorage.setItem('normx_onboarding_done', 'true');
      localStorage.setItem('normx_entite', JSON.stringify(entite));
      onComplete(entite);
    } catch {
      setSaving(false);
    }
  };

  const allSelected = selectedModules.length === MODULES.length;

  return (
    <div style={{ minHeight: '100vh', background: BG, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ background: '#fff', borderRadius: 0, border: '1px solid rgba(0,0,0,0.08)', boxShadow: '0 8px 32px rgba(0,0,0,0.06)', maxWidth: 720, width: '100%', padding: 48 }}>

        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ width: 48, height: 48, borderRadius: 0, background: PRIMARY, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, fontWeight: 900, color: DARK, marginBottom: 12 }}>N</div>
          <h1 style={{ fontSize: 28, fontWeight: 900, color: DARK, margin: '0 0 8px' }}>
            Bienvenue{userName ? `, ${userName.split(' ')[0]}` : ''} !
          </h1>
          <p style={{ color: '#6b7280', fontSize: 15 }}>
            {step === 1 ? 'Sélectionnez vos modules' : 'Configurez votre entité'}
          </p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 16 }}>
            <div style={{ width: 32, height: 4, borderRadius: 2, background: PRIMARY }} />
            <div style={{ width: 32, height: 4, borderRadius: 2, background: step >= 2 ? PRIMARY : '#e5e7eb' }} />
          </div>
        </div>

        {/* Step 1 — Sélection des modules */}
        {step === 1 && (
          <>
            {/* Tout sélectionner */}
            <div
              onClick={selectAll}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '12px 16px',
                marginBottom: 16,
                border: `2px solid ${allSelected ? PRIMARY : 'rgba(0,0,0,0.08)'}`,
                borderRadius: 0,
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
                <div style={{ fontSize: 12, color: '#6b7280' }}>Compta + États + Paie</div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 32 }}>
              {MODULES.map(m => {
                const selected = selectedModules.includes(m.id);
                return (
                  <div
                    key={m.id}
                    onClick={() => toggleModule(m.id)}
                    style={{
                      border: `2px solid ${selected ? m.color : 'rgba(0,0,0,0.08)'}`,
                      borderRadius: 0,
                      padding: 20,
                      cursor: 'pointer',
                      background: selected ? `${m.color}08` : '#fff',
                      transition: 'all 0.2s',
                      position: 'relative',
                    }}
                  >
                    {/* Checkbox */}
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
                    <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 12 }}>{m.desc}</div>
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
            <button
              onClick={() => selectedModules.length > 0 && setStep(2)}
              disabled={selectedModules.length === 0}
              style={{
                width: '100%',
                padding: '14px 28px',
                background: selectedModules.length > 0 ? PRIMARY : '#e5e7eb',
                color: selectedModules.length > 0 ? DARK : '#9ca3af',
                border: 'none',
                borderRadius: 0,
                fontSize: 16,
                fontWeight: 700,
                cursor: selectedModules.length > 0 ? 'pointer' : 'default',
              }}
            >
              Continuer
            </button>
          </>
        )}

        {/* Step 2 — Infos entité */}
        {step === 2 && (
          <>
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', fontSize: 14, fontWeight: 600, color: DARK, marginBottom: 6 }}>
                Nom de votre entité
              </label>
              <input
                type="text"
                value={entiteNom}
                onChange={e => setEntiteNom(e.target.value)}
                placeholder="Ex : OMEGA SERVICES SARL"
                style={{
                  width: '100%',
                  padding: '12px 14px',
                  border: '1.5px solid rgba(0,0,0,0.12)',
                  borderRadius: 0,
                  fontSize: 15,
                  outline: 'none',
                }}
              />
            </div>

            <div style={{ marginBottom: 28 }}>
              <label style={{ display: 'block', fontSize: 14, fontWeight: 600, color: DARK, marginBottom: 6 }}>
                Type d'activité
              </label>
              <select
                value={typeActivite}
                onChange={e => setTypeActivite(e.target.value as TypeActivite)}
                style={{
                  width: '100%',
                  padding: '12px 14px',
                  border: '1.5px solid rgba(0,0,0,0.12)',
                  borderRadius: 0,
                  fontSize: 15,
                  outline: 'none',
                  background: '#fff',
                }}
              >
                {TYPES_ACTIVITE.map(t => (
                  <option key={t.id} value={t.id}>{t.label}</option>
                ))}
              </select>
            </div>

            {/* Résumé modules */}
            <div style={{
              background: 'rgba(212,168,67,0.06)',
              border: '1px solid rgba(212,168,67,0.2)',
              borderRadius: 0,
              padding: 16,
              marginBottom: 24,
            }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: DARK, marginBottom: 8 }}>
                Modules sélectionnés
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {selectedModules.map(id => {
                  const m = MODULES.find(mod => mod.id === id);
                  if (!m) return null;
                  return (
                    <span key={id} style={{
                      padding: '4px 12px',
                      borderRadius: 0,
                      fontSize: 13,
                      fontWeight: 600,
                      background: `${m.color}15`,
                      color: m.color,
                    }}>
                      {m.label}
                    </span>
                  );
                })}
              </div>
            </div>

            <div style={{ display: 'flex', gap: 12 }}>
              <button
                onClick={() => setStep(1)}
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
                onClick={handleFinish}
                disabled={!entiteNom.trim()}
                style={{
                  flex: 2,
                  padding: '14px 28px',
                  background: entiteNom.trim() ? PRIMARY : '#e5e7eb',
                  color: entiteNom.trim() ? DARK : '#9ca3af',
                  border: 'none',
                  borderRadius: 0,
                  fontSize: 16,
                  fontWeight: 700,
                  cursor: entiteNom.trim() ? 'pointer' : 'default',
                }}
              >
                Commencer
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
