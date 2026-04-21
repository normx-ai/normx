/**
 * Source unique des URLs d'API consommees cote frontend.
 *
 * Convention :
 * - Endpoint statique : export direct (`api.journaux.list`).
 * - Endpoint parametre : fonction builder typee (`api.balance.byExercice(id, exId, 'N')`).
 * - Query string optionnelle : passer un objet via `withQuery` (les valeurs nulles/vides
 *   sont ignorees, aucun `?` n'est ajoute si l'objet est vide).
 *
 * Regle : aucun composant ne doit ecrire `/api/...` en dur. Tout passe par `api.*`.
 */

type Id = number;

export type QueryParams = Record<string, string | number | boolean | null | undefined>;

export function withQuery(base: string, params?: QueryParams): string {
  if (!params) return base;
  const usp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v === null || v === undefined || v === '') continue;
    usp.append(k, String(v));
  }
  const qs = usp.toString();
  return qs ? `${base}?${qs}` : base;
}

export const api = {
  auth: {
    callback: '/api/auth/callback',
    logout: '/api/auth/logout',
    me: '/api/auth/me',
    refresh: '/api/auth/refresh',
  },

  tenant: {
    me: '/api/tenant/me',
    setup: '/api/tenant/setup',
    exercice: '/api/tenant/exercice',
  },

  entites: {
    list: '/api/entites',
    byId: (id: Id): string => `/api/entites/${id}`,
  },

  journaux: {
    list: '/api/journaux',
    byId: (id: Id): string => `/api/journaux/${id}`,
  },

  tiers: {
    root: '/api/tiers',
    byEntite: (entiteId: Id): string => `/api/tiers/${entiteId}`,
    byId: (id: Id): string => `/api/tiers/${id}`,
  },

  planComptable: {
    byReferentiel: (referentiel: string): string =>
      `/api/plan-comptable?referentiel=${encodeURIComponent(referentiel)}`,
    search: (prefix: string): string =>
      `/api/plan-comptable?search=${encodeURIComponent(prefix)}`,
  },

  comptesCustom: {
    list: '/api/comptes-custom',
    planFusionne: '/api/comptes-custom/plan-fusionne',
    byId: (id: Id): string => `/api/comptes-custom/${id}`,
  },

  balance: {
    /** Base utilisee par SoldesIntermediaires pour commutter avec /api/ecritures/balance. */
    base: '/api/balance',
    import: '/api/balance/import',
    byId: (balanceId: Id): string => `/api/balance/${balanceId}`,
    byExercice: (entiteId: Id, exerciceId: Id, periode: 'N' | 'N-1'): string =>
      `/api/balance/${entiteId}/${exerciceId}/${periode}`,
    statut: (balanceId: Id): string => `/api/balance/statut/${balanceId}`,
    ligne: (ligneId: Id): string => `/api/balance/ligne/${ligneId}`,
    revision: (ligneId: Id): string => `/api/balance/revision/${ligneId}`,
    exercice: '/api/balance/exercice',
    exerciceById: (id: Id): string => `/api/balance/exercices/${id}`,
    exercicesByEntite: (entiteId: Id): string => `/api/balance/exercices/${entiteId}`,
    cloturerExercice: (exerciceId: Id): string => `/api/balance/exercice/${exerciceId}/cloturer`,
    rouvrirExercice: (exerciceId: Id): string => `/api/balance/exercice/${exerciceId}/rouvrir`,
  },

  ecritures: {
    root: '/api/ecritures',
    byId: (id: Id): string => `/api/ecritures/${id}`,
    list: (entiteId: Id, exerciceId: Id, params?: QueryParams): string =>
      withQuery(`/api/ecritures/${entiteId}/${exerciceId}`, params),
    valider: '/api/ecritures/valider',
    devalider: '/api/ecritures/devalider',
    stats: (entiteId: Id, exerciceId: Id): string =>
      `/api/ecritures/stats/${entiteId}/${exerciceId}`,
    balance: (entiteId: Id, exerciceId: Id): string =>
      `/api/ecritures/balance/${entiteId}/${exerciceId}`,
    balanceBase: '/api/ecritures/balance',
    balanceTiers: (entiteId: Id, exerciceId: Id): string =>
      `/api/ecritures/balance-tiers/${entiteId}/${exerciceId}`,
    comptes: (entiteId: Id, exerciceId: Id): string =>
      `/api/ecritures/comptes/${entiteId}/${exerciceId}`,
    grandLivre: (entiteId: Id, exerciceId: Id, params?: QueryParams): string =>
      withQuery(`/api/ecritures/grand-livre/${entiteId}/${exerciceId}`, params),
    grandLivreTiers: (entiteId: Id, exerciceId: Id, params?: QueryParams): string =>
      withQuery(`/api/ecritures/grand-livre-tiers/${entiteId}/${exerciceId}`, params),
    lettrage: {
      lettrer: '/api/ecritures/lettrage/lettrer',
      delettrer: '/api/ecritures/lettrage/delettrer',
      tiers: (entiteId: Id, exerciceId: Id, params?: QueryParams): string =>
        withQuery(`/api/ecritures/lettrage/tiers/${entiteId}/${exerciceId}`, params),
      ecritures: (entiteId: Id, exerciceId: Id, tiersId: Id, params?: QueryParams): string =>
        withQuery(`/api/ecritures/lettrage/ecritures/${entiteId}/${exerciceId}/${tiersId}`, params),
    },
    rapports: {
      balanceAgee: (entiteId: Id, exerciceId: Id, params?: QueryParams): string =>
        withQuery(`/api/ecritures/rapports/balance-agee/${entiteId}/${exerciceId}`, params),
      comparatif: (entiteId: Id, exerciceId: Id, params?: QueryParams): string =>
        withQuery(`/api/ecritures/rapports/comparatif/${entiteId}/${exerciceId}`, params),
      echeancier: (entiteId: Id, exerciceId: Id, params?: QueryParams): string =>
        withQuery(`/api/ecritures/rapports/echeancier/${entiteId}/${exerciceId}`, params),
      tresorerie: (entiteId: Id, exerciceId: Id): string =>
        `/api/ecritures/rapports/tresorerie/${entiteId}/${exerciceId}`,
      journalCentralisateur: (entiteId: Id, exerciceId: Id): string =>
        `/api/ecritures/rapports/journal-centralisateur/${entiteId}/${exerciceId}`,
      repartitionCharges: (entiteId: Id, exerciceId: Id): string =>
        `/api/ecritures/rapports/repartition-charges/${entiteId}/${exerciceId}`,
      tableauBord: (entiteId: Id, exerciceId: Id): string =>
        `/api/ecritures/rapports/tableau-bord/${entiteId}/${exerciceId}`,
    },
  },

  revision: {
    onglet: (entiteId: Id, exerciceId: Id, onglet: RevisionOnglet): string =>
      `/api/revision/${entiteId}/${exerciceId}/${onglet}`,
  },

  notifications: {
    byUser: (userId: Id): string => `/api/notifications/${userId}`,
    unreadCount: (userId: Id): string => `/api/notifications/${userId}/unread-count`,
    readAll: (userId: Id): string => `/api/notifications/read-all/${userId}`,
    byId: (id: Id): string => `/api/notifications/${id}`,
    read: (id: Id): string => `/api/notifications/${id}/read`,
  },

  assistant: {
    chat: '/api/assistant/chat',
    fonctionnementComptes: '/api/assistant/fonctionnement-comptes',
    conversations: (userId: Id): string => `/api/assistant/conversations/${userId}`,
    conversationById: (convId: Id): string => `/api/assistant/conversations/${convId}`,
    conversationMessages: (convId: Id): string =>
      `/api/assistant/conversations/${convId}/messages`,
    memory: (userId: Id): string => `/api/assistant/memory/${userId}`,
    memoryById: (id: Id): string => `/api/assistant/memory/${id}`,
  },

  ocrImport: {
    extract: '/api/ocr-import/extract',
  },
} as const;

export type RevisionOnglet =
  | 'all-od'
  | 'autres-tiers'
  | 'clients'
  | 'df'
  | 'etat'
  | 'fourn'
  | 'immo'
  | 'kp'
  | 'personnel'
  | 'prov'
  | 'stocks'
  | 'subv'
  | 'treso';
