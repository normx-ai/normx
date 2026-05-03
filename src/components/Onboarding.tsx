import React, { useEffect, useRef, useState } from 'react';
import { clientFetch } from '../lib/api';
import { api } from '../lib/apiEndpoints';
import type { NormxModule, Entite } from '../types';
import type { OnboardingPrefill } from '../lib/queries';
import { ENABLED_MODULES, isModuleEnabled } from '../config/modules';
import OnboardingLayout from './onboarding/OnboardingLayout';
import OnboardingStepEntite, { type TenantType } from './onboarding/OnboardingStepEntite';
import OnboardingStepModules, { type ModuleOption } from './onboarding/OnboardingStepModules';
import OnboardingStepExercice from './onboarding/OnboardingStepExercice';

interface OnboardingProps {
  userName: string;
  onComplete: (entite: Entite) => void;
  defaultModule?: string | null;
  prefill?: OnboardingPrefill;
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
];

// Filtre en temps reel : seuls les modules actives sont montres
const MODULES: ModuleOption[] = ALL_MODULES.filter((m) => isModuleEnabled(m.id));

export default function Onboarding({ userName, onComplete, defaultModule, prefill }: OnboardingProps): React.JSX.Element {
  const singleModuleMode = MODULES.length === 1;
  const [step, setStep] = useState<1 | 2 | 3>(1);

  // Pre-remplissage depuis le JWT Keycloak (attributs custom saisis a l'inscription).
  // Si prefill.tenantType + prefill.modules sont la, le wizard saute les etapes
  // 1 et 2 et auto-soumet la creation du tenant des le montage.
  const prefilledModules: NormxModule[] = prefill?.modules
    ? (prefill.modules.filter((m): m is NormxModule => MODULES.some(opt => opt.id === m)))
    : [];

  const initialModules: NormxModule[] = prefilledModules.length > 0
    ? prefilledModules
    : singleModuleMode
      ? MODULES.map((m) => m.id)
      : defaultModule && MODULES.some((m) => m.id === defaultModule)
        ? [defaultModule as NormxModule]
        : [];

  const [selectedModules, setSelectedModules] = useState<NormxModule[]>(initialModules);
  const [entiteNom, setEntiteNom] = useState(prefill?.nom || '');
  const [tenantType, setTenantType] = useState<TenantType>(prefill?.tenantType || 'enterprise');

  const currentYear = new Date().getFullYear();
  const [exerciceAnnee, setExerciceAnnee] = useState<number>(currentYear);
  const [exerciceDebut, setExerciceDebut] = useState<string>(`${currentYear}-01-01`);
  const [exerciceFin, setExerciceFin] = useState<string>(`${currentYear}-12-31`);
  const [createdTenantId, setCreatedTenantId] = useState<number | null>(null);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const isCabinet = tenantType === 'cabinet';
  // Compta + etats sont envoyes ensemble au backend quand le mode 'complete'
  // est choisi : la compta inclut nativement les etats mais on garde les
  // deux modules actifs cote tenant pour que les ecrans 'Etats financiers'
  // restent accessibles meme en mode compta complete.
  const finalModules = isCabinet ? [...ENABLED_MODULES] : selectedModules;
  const canFinish = (isCabinet || selectedModules.length > 0) && entiteNom.trim().length > 0 && !saving;

  const toggleModule = (id: NormxModule): void => {
    setSelectedModules((prev) => {
      let next = prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id];
      // Compta active automatiquement etats (la compta produit nativement
      // les etats financiers : on garde le module etats pour que les ecrans
      // soient accessibles).
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

  // Ref pour eviter double-trigger de l'auto-submit (useEffect declare plus bas).
  const autoSubmitDone = useRef(false);

  const handleCreateTenant = async (): Promise<void> => {
    if (!entiteNom.trim()) return;
    setSaving(true);
    setError('');
    try {
      const resp = await clientFetch(api.tenant.setup, {
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

  // Auto-skip etapes 1 et 2 si tout est pre-rempli depuis le JWT.
  // L'utilisateur a deja saisi nom/type/modules a l'inscription Keycloak,
  // pas besoin de les redemander -> on cree le tenant et on saute a
  // l'etape 3 (creation exercice). Garde ref pour eviter double-trigger.
  useEffect(() => {
    if (autoSubmitDone.current) return;
    const fullyPrefilled = !!(prefill?.nom?.trim() && prefill?.tenantType && prefill?.modules?.length);
    if (fullyPrefilled && step === 1 && !saving && !createdTenantId) {
      autoSubmitDone.current = true;
      handleCreateTenant();
    }
  }, [prefill, step, saving, createdTenantId]);

  const handleCreateExercice = async (): Promise<void> => {
    if (!exerciceAnnee || !exerciceDebut || !exerciceFin) {
      setError("Tous les champs de l'exercice sont requis.");
      return;
    }
    setSaving(true);
    setError('');
    try {
      const resp = await clientFetch(api.tenant.exercice, {
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
