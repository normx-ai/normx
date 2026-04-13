import React, { useState } from 'react';
import type { NormxModule, Entite } from '../types';
import { ENABLED_MODULES, isModuleEnabled } from '../config/modules';

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

const ALL_MODULES: ModuleOption[] = [
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

// Filtre en temps reel : seuls les modules actives sont montres
const MODULES: ModuleOption[] = ALL_MODULES.filter((m) => isModuleEnabled(m.id));

type TenantType = 'enterprise' | 'cabinet';

const TENANT_TYPES: { id: TenantType; label: string; desc: string; icon: string }[] = [
  { id: 'enterprise', label: 'Entreprise', desc: 'Je gère ma propre comptabilité', icon: '🏢' },
  { id: 'cabinet', label: 'Cabinet comptable', desc: 'Je gère la comptabilité de mes clients', icon: '📊' },
];

export default function Onboarding({ userName, onComplete, defaultModule }: OnboardingProps): React.JSX.Element {
  // Si un seul module est actif, on skip l'etape de selection (auto-assignee)
  const singleModuleMode = MODULES.length === 1;
  const [step, setStep] = useState<1 | 2 | 3>(1);

  const initialModules: NormxModule[] = singleModuleMode
    ? MODULES.map((m) => m.id)
    : defaultModule && MODULES.some((m) => m.id === defaultModule)
      ? [defaultModule as NormxModule]
      : [];

  const [selectedModules, setSelectedModules] = useState<NormxModule[]>(initialModules);
  const [entiteNom, setEntiteNom] = useState('');
  const [tenantType, setTenantType] = useState<TenantType>('enterprise');

  // Etape 3 : premier exercice
  const currentYear = new Date().getFullYear();
  const [exerciceAnnee, setExerciceAnnee] = useState<number>(currentYear);
  const [exerciceDebut, setExerciceDebut] = useState<string>(`${currentYear}-01-01`);
  const [exerciceFin, setExerciceFin] = useState<string>(`${currentYear}-12-31`);
  const [createdTenantId, setCreatedTenantId] = useState<number | null>(null);

  const comptaIncludesEtats = selectedModules.includes('compta');

  const toggleModule = (id: NormxModule): void => {
    if (id === 'etats' && comptaIncludesEtats) return; // etats grise si compta coche
    setSelectedModules((prev) => {
      let next = prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id];
      // Si on coche compta, ajouter etats automatiquement
      if (id === 'compta' && next.includes('compta') && !next.includes('etats')) {
        next = [...next, 'etats'];
      }
      return next;
    });
  };

  const selectAll = (): void => {
    if (selectedModules.length === MODULES.length) {
      setSelectedModules([]);
    } else {
      setSelectedModules(MODULES.map((m) => m.id));
    }
  };

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const isCabinet = tenantType === 'cabinet';
  const cleanModules = (mods: NormxModule[]): NormxModule[] =>
    mods.includes('compta') ? mods.filter((m) => m !== 'etats') : mods;
  const finalModules = isCabinet ? cleanModules([...ENABLED_MODULES]) : cleanModules(selectedModules);
  const canFinish = (isCabinet || selectedModules.length > 0) && entiteNom.trim() && !saving;

  // Etape 1-2 : creer le tenant
  const handleCreateTenant = async (): Promise<void> => {
    if (!canFinish) return;
    setSaving(true);
    setError('');

    try {
      const resp = await fetch('/api/tenant/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          nom: entiteNom.trim(),
          type: tenantType,
          modules: finalModules,
        }),
      });

      if (!resp.ok) {
        const data = await resp.json().catch(() => ({}));
        throw new Error(data.error || 'Erreur serveur (' + resp.status + ')');
      }

      const data = await resp.json();
      setCreatedTenantId(data.tenant?.id || 1);
      setSaving(false);
      setStep(3);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la configuration');
      setSaving(false);
    }
  };

  // Etape 3 : creer le premier exercice + finaliser
  const handleCreateExercice = async (): Promise<void> => {
    if (!exerciceAnnee || !exerciceDebut || !exerciceFin) {
      setError('Tous les champs de l\'exercice sont requis.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const resp = await fetch('/api/tenant/exercice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          annee: exerciceAnnee,
          date_debut: exerciceDebut,
          date_fin: exerciceFin,
        }),
      });
      if (!resp.ok) {
        const data = await resp.json().catch(() => ({}));
        throw new Error(data.error || 'Erreur lors de la creation de l\'exercice.');
      }

      const entite: Entite = {
        id: createdTenantId || 1,
        nom: entiteNom.trim(),
        type_activite: 'entreprise',
        offre: finalModules.includes('compta') ? 'comptabilite' : 'etats',
        modules: finalModules,
      };
      onComplete(entite);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la creation de l\'exercice');
      setSaving(false);
    }
  };

  // Bouton "Continuer sans creer d'exercice" : l'user peut skipper et le faire plus tard
  const handleSkipExercice = (): void => {
    const entite: Entite = {
      id: createdTenantId || 1,
      nom: entiteNom.trim(),
      type_activite: 'entreprise',
      offre: finalModules.includes('compta') ? 'comptabilite' : 'etats',
      modules: finalModules,
    };
    onComplete(entite);
  };

  const allSelected = selectedModules.length === MODULES.length;

  return (
    <div style={{ minHeight: '100vh', background: BG, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ background: '#fff', borderRadius: 0, border: '1px solid rgba(0,0,0,0.08)', boxShadow: '0 8px 32px rgba(0,0,0,0.06)', maxWidth: 720, width: '100%', padding: 48 }}>

        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <img src="/logo-horizontal.png" alt="NORMX" style={{ height: 36, width: 'auto', display: 'inline-block', marginBottom: 16 }} />
          <h1 style={{ fontSize: 28, fontWeight: 900, color: DARK, margin: '0 0 8px' }}>
            Bienvenue{userName ? `, ${userName.split(' ')[0]}` : ''} !
          </h1>
          <p style={{ color: '#6b7280', fontSize: 15 }}>
            {step === 1 ? 'Configurez votre entité' : step === 2 ? 'Sélectionnez vos modules' : 'Creez votre premier exercice'}
          </p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 16 }}>
            <div style={{ width: 32, height: 4, borderRadius: 2, background: PRIMARY }} />
            {!singleModuleMode && !isCabinet && (
              <div style={{ width: 32, height: 4, borderRadius: 2, background: step >= 2 ? PRIMARY : '#e5e7eb' }} />
            )}
            <div style={{ width: 32, height: 4, borderRadius: 2, background: step >= 3 ? PRIMARY : '#e5e7eb' }} />
          </div>
        </div>

        {/* Step 1 — Nom + Type */}
        {step === 1 && (
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
                {TENANT_TYPES.map(t => {
                  const selected = tenantType === t.id;
                  return (
                    <div
                      key={t.id}
                      onClick={() => setTenantType(t.id)}
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
              onClick={() => {
                if (!entiteNom.trim()) return;
                // Cabinet ou mode single-module : on skip la selection de modules et on cree le tenant direct,
                // puis on passe a l'etape exercice
                if (tenantType === 'cabinet' || singleModuleMode) {
                  handleCreateTenant();
                } else {
                  setStep(2);
                }
              }}
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
        )}

        {/* Step 2 — Sélection des modules */}
        {step === 2 && (
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
                const disabled = m.id === 'etats' && comptaIncludesEtats;
                return (
                  <div
                    key={m.id}
                    onClick={() => toggleModule(m.id)}
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
                {tenantType === 'cabinet' ? 'Cabinet comptable' : 'Entreprise'}
              </div>
            </div>

            {error && (
              <div style={{ background: '#fef2f2', border: '1px solid #fecaca', padding: '10px 14px', marginBottom: 16, fontSize: 14, color: '#dc2626' }}>
                {error}
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
                  borderRadius: 0,
                  fontSize: 15,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Retour
              </button>
              <button
                onClick={handleCreateTenant}
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
                  cursor: entiteNom.trim() ? 'pointer' : 'default',
                }}
              >
                {saving ? 'Création...' : 'Continuer'}
              </button>
            </div>
          </>
        )}

        {/* Step 3 — Premier exercice */}
        {step === 3 && (
          <>
            <div style={{ marginBottom: 20, padding: '14px 16px', background: 'rgba(212,168,67,0.06)', border: '1px solid rgba(212,168,67,0.2)' }}>
              <p style={{ fontSize: 13, color: '#6b7280', margin: 0, lineHeight: 1.6 }}>
                Un exercice comptable correspond a une annee fiscale. Vous pourrez ensuite importer
                votre balance et generer vos etats financiers pour cette periode.
              </p>
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 14, fontWeight: 600, color: DARK, marginBottom: 6 }}>
                Annee de l'exercice
              </label>
              <input
                type="number"
                value={exerciceAnnee}
                onChange={(e) => {
                  const annee = parseInt(e.target.value, 10) || currentYear;
                  setExerciceAnnee(annee);
                  setExerciceDebut(`${annee}-01-01`);
                  setExerciceFin(`${annee}-12-31`);
                }}
                style={{
                  width: '100%',
                  padding: '12px 14px',
                  border: '1.5px solid rgba(0,0,0,0.12)',
                  fontSize: 15,
                  outline: 'none',
                }}
              />
            </div>

            <div style={{ display: 'flex', gap: 12, marginBottom: 24 }}>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', fontSize: 14, fontWeight: 600, color: DARK, marginBottom: 6 }}>
                  Date de debut
                </label>
                <input
                  type="date"
                  value={exerciceDebut}
                  onChange={(e) => setExerciceDebut(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '12px 14px',
                    border: '1.5px solid rgba(0,0,0,0.12)',
                    fontSize: 15,
                    outline: 'none',
                  }}
                />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', fontSize: 14, fontWeight: 600, color: DARK, marginBottom: 6 }}>
                  Date de fin
                </label>
                <input
                  type="date"
                  value={exerciceFin}
                  onChange={(e) => setExerciceFin(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '12px 14px',
                    border: '1.5px solid rgba(0,0,0,0.12)',
                    fontSize: 15,
                    outline: 'none',
                  }}
                />
              </div>
            </div>

            {error && (
              <div style={{ background: '#fef2f2', border: '1px solid #fecaca', padding: '10px 14px', marginBottom: 16, fontSize: 14, color: '#dc2626' }}>
                {error}
              </div>
            )}

            <div style={{ display: 'flex', gap: 12 }}>
              <button
                onClick={handleSkipExercice}
                disabled={saving}
                style={{
                  flex: 1,
                  padding: '14px 28px',
                  background: '#fff',
                  color: DARK,
                  border: '1.5px solid rgba(0,0,0,0.12)',
                  fontSize: 15,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Plus tard
              </button>
              <button
                onClick={handleCreateExercice}
                disabled={saving}
                style={{
                  flex: 2,
                  padding: '14px 28px',
                  background: saving ? '#e5e7eb' : PRIMARY,
                  color: saving ? '#9ca3af' : DARK,
                  border: 'none',
                  fontSize: 16,
                  fontWeight: 700,
                  cursor: saving ? 'default' : 'pointer',
                }}
              >
                {saving ? 'Création...' : 'Créer l\'exercice'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
