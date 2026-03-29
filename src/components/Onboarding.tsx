import React, { useState } from 'react';
import type { TypeActivite, Offre, NormxModule, Entite } from '../types';

interface OnboardingProps {
  userName: string;
  onComplete: (entite: Entite) => void;
  defaultModule?: string | null;
}

const PRIMARY = '#D4A843';
const DARK = '#1A3A5C';
const BG = '#faf8f5';

interface OffreOption {
  id: string;
  label: string;
  desc: string;
  modules: NormxModule[];
  offre: Offre;
  color: string;
  features: string[];
}

const OFFRES: OffreOption[] = [
  {
    id: 'compta',
    label: 'Compta',
    desc: 'Comptabilité SYSCOHADA / SYCEBNL',
    modules: ['compta'],
    offre: 'comptabilite',
    color: '#2563eb',
    features: ['Saisie comptable', 'GL, BG', 'Déclarations TVA', 'Plan comptable OHADA'],
  },
  {
    id: 'etats',
    label: 'États',
    desc: 'États financiers et résultat fiscal',
    modules: ['etats'],
    offre: 'etats',
    color: '#059669',
    features: ['Bilan', 'Compte de résultat', 'TFT & Notes', 'Résultat fiscal IS/IBA'],
  },
  {
    id: 'paie',
    label: 'Paie',
    desc: 'Gestion de la paie Congo',
    modules: ['paie'],
    offre: 'comptabilite',
    color: '#d97706',
    features: ['Bulletins de paie', 'DAS I, II, III', 'États sociaux', 'État fiscal'],
  },
  {
    id: 'complet',
    label: 'Complet',
    desc: 'Tous les modules inclus',
    modules: ['compta', 'etats', 'paie'],
    offre: 'comptabilite',
    color: PRIMARY,
    features: ['Comptabilité', 'États financiers', 'Paie', 'Tous les modules'],
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
  const [selectedOffre, setSelectedOffre] = useState<string>(
    defaultModule && OFFRES.some(o => o.id === defaultModule) ? defaultModule : ''
  );
  const [entiteNom, setEntiteNom] = useState('');
  const [typeActivite, setTypeActivite] = useState<TypeActivite>('entreprise');

  const offre = OFFRES.find(o => o.id === selectedOffre);

  const handleFinish = (): void => {
    if (!offre || !entiteNom.trim()) return;
    const entite: Entite = {
      id: 1,
      nom: entiteNom.trim(),
      type_activite: typeActivite,
      offre: offre.offre,
      modules: offre.modules,
    };
    localStorage.setItem('normx_onboarding_done', 'true');
    onComplete(entite);
  };

  return (
    <div style={{ minHeight: '100vh', background: BG, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ background: '#fff', borderRadius: 16, border: '1px solid rgba(0,0,0,0.08)', boxShadow: '0 8px 32px rgba(0,0,0,0.06)', maxWidth: 720, width: '100%', padding: 48 }}>

        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ width: 48, height: 48, borderRadius: 12, background: PRIMARY, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, fontWeight: 900, color: DARK, marginBottom: 12 }}>N</div>
          <h1 style={{ fontSize: 28, fontWeight: 900, color: DARK, margin: '0 0 8px' }}>
            Bienvenue{userName ? `, ${userName.split(' ')[0]}` : ''} !
          </h1>
          <p style={{ color: '#6b7280', fontSize: 15 }}>
            {step === 1 ? 'Choisissez votre offre pour commencer' : 'Configurez votre entité'}
          </p>
          {/* Steps */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 16 }}>
            <div style={{ width: 32, height: 4, borderRadius: 2, background: PRIMARY }} />
            <div style={{ width: 32, height: 4, borderRadius: 2, background: step >= 2 ? PRIMARY : '#e5e7eb' }} />
          </div>
        </div>

        {/* Step 1 — Choix de l'offre */}
        {step === 1 && (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12, marginBottom: 32 }}>
              {OFFRES.map(o => (
                <div
                  key={o.id}
                  onClick={() => setSelectedOffre(o.id)}
                  style={{
                    border: `2px solid ${selectedOffre === o.id ? o.color : 'rgba(0,0,0,0.08)'}`,
                    borderRadius: 12,
                    padding: 20,
                    cursor: 'pointer',
                    background: selectedOffre === o.id ? `${o.color}08` : '#fff',
                    transition: 'all 0.2s',
                  }}
                >
                  <div style={{ fontSize: 18, fontWeight: 800, color: o.color, marginBottom: 4 }}>{o.label}</div>
                  <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 12 }}>{o.desc}</div>
                  <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                    {o.features.map((f, i) => (
                      <li key={i} style={{ fontSize: 12, color: '#374151', padding: '2px 0', display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ color: o.color, fontSize: 14 }}>&#10003;</span> {f}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
            <button
              onClick={() => selectedOffre && setStep(2)}
              disabled={!selectedOffre}
              style={{
                width: '100%',
                padding: '14px 28px',
                background: selectedOffre ? PRIMARY : '#e5e7eb',
                color: selectedOffre ? DARK : '#9ca3af',
                border: 'none',
                borderRadius: 10,
                fontSize: 16,
                fontWeight: 700,
                cursor: selectedOffre ? 'pointer' : 'default',
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
                  borderRadius: 10,
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
                  borderRadius: 10,
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

            {/* Résumé offre */}
            {offre && (
              <div style={{
                background: `${offre.color}08`,
                border: `1px solid ${offre.color}30`,
                borderRadius: 10,
                padding: 16,
                marginBottom: 24,
              }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: offre.color, marginBottom: 4 }}>
                  Offre sélectionnée : NORMX {offre.label}
                </div>
                <div style={{ fontSize: 13, color: '#6b7280' }}>{offre.desc}</div>
              </div>
            )}

            <div style={{ display: 'flex', gap: 12 }}>
              <button
                onClick={() => setStep(1)}
                style={{
                  flex: 1,
                  padding: '14px 28px',
                  background: '#fff',
                  color: DARK,
                  border: '1.5px solid rgba(0,0,0,0.12)',
                  borderRadius: 10,
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
                  borderRadius: 10,
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
