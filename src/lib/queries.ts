/**
 * Hooks React Query pour le data fetching centralise.
 *
 * Chaque hook gere : cache, revalidation background, retry, loading/error.
 * Le cache evite les appels reseau au refresh (rendu instantane depuis
 * les donnees connues) tout en revalidant silencieusement en arriere-plan.
 *
 * staleTime : combien de temps la donnee est consideree fraiche (pas de
 * refetch si < staleTime depuis le dernier fetch).
 * gcTime : combien de temps la donnee reste en cache apres que le composant
 * qui l'utilisait a ete demonte.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { cabinetFetch, clientFetch } from './api';
import type { Entite, NormxModule } from '../types';
import { filterEnabledModules } from '../config/modules';

// ==================== TENANT ====================

interface TenantData {
  tenant: {
    id: number;
    nom: string;
    type: 'enterprise' | 'cabinet' | 'client';
    slug: string;
    schema_name: string;
    plan: string;
    actif: boolean;
    settings: Record<string, unknown> | null;
    created_at: string;
  };
  onboardingRequired?: boolean;
}

export function useTenant() {
  return useQuery<TenantData | null>({
    queryKey: ['tenant', 'me'],
    queryFn: async () => {
      const r = await cabinetFetch('/api/tenant/me');
      if (r.status === 403) {
        const err = await r.json().catch(() => ({}));
        if (err.code === 'SUBSCRIPTION_REQUIRED') {
          throw new Error('SUBSCRIPTION_REQUIRED');
        }
      }
      if (!r.ok) throw new Error('Erreur chargement tenant');
      return r.json();
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    retry: 1,
  });
}

// ==================== ENTITES ====================

export function useEntites(enabled: boolean) {
  return useQuery<Entite[]>({
    queryKey: ['entites'],
    queryFn: async () => {
      const r = await cabinetFetch('/api/entites');
      if (!r.ok) throw new Error('Erreur chargement entites');
      const raw: Entite[] = await r.json();
      return raw.map(e => ({
        ...e,
        modules: filterEnabledModules((e.modules || []) as NormxModule[]),
      }));
    },
    staleTime: 2 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    enabled,
  });
}

// ==================== PLAN COMPTABLE ====================

interface CompteComptable {
  numero: string;
  libelle: string;
  classe?: number | string;
  sens?: string;
}

export function usePlanComptable(referentiel: string) {
  return useQuery<CompteComptable[]>({
    queryKey: ['plan-comptable', referentiel],
    queryFn: async () => {
      const r = await clientFetch(`/api/plan-comptable?referentiel=${referentiel}`);
      if (!r.ok) throw new Error('Erreur chargement plan comptable');
      const data = await r.json();
      return Array.isArray(data) ? data : data.data || data.comptes || [];
    },
    staleTime: 60 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
  });
}

// ==================== JOURNAUX ====================

interface Journal {
  id: number;
  code: string;
  libelle: string;
  type: string;
  contrepartie_defaut: string | null;
  actif: boolean;
  nb_ecritures: number;
}

export function useJournaux() {
  return useQuery<Journal[]>({
    queryKey: ['journaux'],
    queryFn: async () => {
      const r = await clientFetch('/api/journaux');
      if (!r.ok) throw new Error('Erreur chargement journaux');
      return r.json();
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });
}

// ==================== TVA CONFIG ====================

interface TvaConfig {
  id: number;
  taux_normal: string;
  taux_reduit: string | null;
  regime: string;
  numero_assujetti: string | null;
}

export function useTvaConfig() {
  return useQuery<TvaConfig>({
    queryKey: ['tva-config'],
    queryFn: async () => {
      const r = await clientFetch('/api/tva-config');
      if (!r.ok) throw new Error('Erreur chargement TVA');
      return r.json();
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });
}

// ==================== ECRITURES ====================

interface EcritureAPI {
  id: number;
  journal: string;
  date_ecriture: string;
  libelle: string;
  numero_piece: string;
  statut: string;
  lignes: Array<{
    numero_compte: string;
    libelle_compte: string;
    debit: number;
    credit: number;
    tiers_id?: number;
  }>;
}

export function useEcritures(entiteId: number, exerciceId: number, filters?: Record<string, string>) {
  const params = new URLSearchParams(filters || {});
  const qs = params.toString() ? '?' + params.toString() : '';
  return useQuery<EcritureAPI[]>({
    queryKey: ['ecritures', entiteId, exerciceId, filters],
    queryFn: async () => {
      const r = await clientFetch(`/api/ecritures/${entiteId}/${exerciceId}${qs}`);
      if (!r.ok) throw new Error('Erreur chargement ecritures');
      const data = await r.json();
      return Array.isArray(data) ? data : data.ecritures || [];
    },
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
    enabled: entiteId > 0 && exerciceId > 0,
  });
}

// ==================== INVALIDATION ====================

export function useInvalidateEcritures() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: ['ecritures'] });
}

export function useInvalidateEntites() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: ['entites'] });
}
