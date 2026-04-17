import React, { useState } from 'react';
import { clientFetch } from '../lib/api';
import type { NormxModule, Entite } from '../types';
import { ENABLED_MODULES, isModuleEnabled } from '../config/modules';
import OnboardingLayout from './onboarding/OnboardingLayout';
import OnboardingStepEntite, { type TenantType } from './onboarding/OnboardingStepEntite';
import OnboardingStepModules, { type ModuleOption } from './onboarding/OnboardingStepModules';
import OnboardingStepExercice from './onboarding/OnboardingStepExercice';

interface OnboardingProps {
  userName: string;
  onComplete: (entite: Entite) => void;
  defaultModule?: string | null;
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

export default function Onboarding({ userName, onComplete, defaultModule }: OnboardingProps): React.JSX.Element {
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

  const currentYear = new Date().getFullYear();
  const [exerciceAnnee, setExerciceAnnee] = useState<number>(currentYear);
  const [exerciceDebut, setExerciceDebut] = useState<string>(`${currentYear}-01-01`);
  const [exerciceFin, setExerciceFin] = useState<string>(`${currentYear}-12-31`);
  const [createdTenantId, setCreatedTenantId] = useState<number | null>(null);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const isCabinet = tenantType === 'cabinet';
  const cleanModules = (mods: NormxModule[]): NormxModule[] =>
    mods.includes('compta') ? mods.filter((m) => m !== 'etats') : mods;
  const finalModules = isCabinet ? cleanModules([...ENABLED_MODULES]) : cleanModules(selectedModules);
  const canFinish = (isCabinet || selectedModules.length > 0) && entiteNom.trim().length > 0 && !saving;

  const toggleModule = (id: NormxModule): void => {
    const comptaIncludesEtats = selectedModules.includes('compta');
    if (id === 'etats' && comptaIncludesEtats) return;
    setSelectedModules((prev) => {
      let next = prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id];
      if (id === 'compta' && next.includes('compta') && !next.includes('etats')) {
        next = [...next, 'etats'];
      }
      return next;
    });
  };

  const selectAll = (): void => {
    if (selectedModules.length === MODULES.length) setSelectedModules([]);
    else setSelectedModules(MODULES.map((m) => m.id));
  };

  const handleCreateTenant = async (): Promise<void> => {
    if (!entiteNom.trim()) return;
    setSaving(true);
    setError('');
    try {
      const resp = await clientFetch('/api/tenant/setup', {
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

  const handleCreateExercice = async (): Promise<void> => {
    if (!exerciceAnnee || !exerciceDebut || !exerciceFin) {
      setError("Tous les champs de l'exercice sont requis.");
      return;
    }
    setSaving(true);
    setError('');
    try {
      const resp = await clientFetch('/api/tenant/exercice', {
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
        throw new Error(data.error || "Erreur lors de la creation de l'exercice.");
      }
      onComplete({
        id: createdTenantId || 1,
        nom: entiteNom.trim(),
        type_activite: 'entreprise',
        offre: finalModules.includes('compta') ? 'comptabilite' : 'etats',
        modules: finalModules,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur lors de la creation de l'exercice");
      setSaving(false);
    }
  };

  const handleSkipExercice = (): void => {
    onComplete({
      id: createdTenantId || 1,
      nom: entiteNom.trim(),
      type_activite: 'entreprise',
      offre: finalModules.includes('compta') ? 'comptabilite' : 'etats',
      modules: finalModules,
    });
  };

  const handleContinueStep1 = (): void => {
    if (!entiteNom.trim()) return;
    if (tenantType === 'cabinet' || singleModuleMode) {
      handleCreateTenant();
    } else {
      setStep(2);
    }
  };

  const handleAnneeChange = (annee: number): void => {
    setExerciceAnnee(annee);
    setExerciceDebut(`${annee}-01-01`);
    setExerciceFin(`${annee}-12-31`);
  };

  const subtitle = step === 1 ? 'Configurez votre entité'
    : step === 2 ? 'Sélectionnez vos modules'
    : 'Creez votre premier exercice';
  const showStep2 = !singleModuleMode && !isCabinet;

  return (
    <OnboardingLayout userName={userName} step={step} showStep2={showStep2} subtitle={subtitle}>
      {step === 1 && (
        <OnboardingStepEntite
          entiteNom={entiteNom}
          onEntiteNomChange={setEntiteNom}
          tenantType={tenantType}
          onTenantTypeChange={setTenantType}
          onContinue={handleContinueStep1}
          saving={saving}
          error={error}
        />
      )}

      {step === 2 && (
        <OnboardingStepModules
          modules={MODULES}
          selectedModules={selectedModules}
          onToggleModule={toggleModule}
          onSelectAll={selectAll}
          entiteNom={entiteNom}
          isCabinet={isCabinet}
          onBack={() => setStep(1)}
          onFinish={handleCreateTenant}
          saving={saving}
          canFinish={canFinish}
          error={error}
        />
      )}

      {step === 3 && (
        <OnboardingStepExercice
          annee={exerciceAnnee}
          dateDebut={exerciceDebut}
          dateFin={exerciceFin}
          onAnneeChange={handleAnneeChange}
          onDateDebutChange={setExerciceDebut}
          onDateFinChange={setExerciceFin}
          onCreate={handleCreateExercice}
          onSkip={handleSkipExercice}
          saving={saving}
          error={error}
        />
      )}
    </OnboardingLayout>
  );
}
