import React from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { KeycloakProvider, useKeycloak } from './auth/KeycloakProvider';
import { ClientProvider, useClient } from './contexts/ClientContext';
import { setApiClientSlug } from './lib/api';
import { useTenant, useEntites, useInvalidateEntites } from './lib/queries';
import Dashboard from './dashboard/Dashboard';
import Onboarding from './components/Onboarding';
import Toast from './components/Toast';
import type { Entite, NormxModule } from './types';
import { ENABLED_MODULES, isModuleEnabled } from './config/modules';
import './App.css';

function AppContent(): React.JSX.Element {
  const { user, isAuthenticated, isLoading: authLoading, login, logout } = useKeycloak();
  const navigate = useNavigate();
  const location = useLocation();
  const { setClientSlug } = useClient();
  const [currentEntite, setCurrentEntite] = React.useState<Entite | null>(null);
  const [toast, setToast] = React.useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const initialRedirectDone = React.useRef(false);

  // ==================== DATA FETCHING (React Query) ====================
  // Le cache evite les refetch au refresh → rendu instantane.
  const {
    data: tenantData,
    isLoading: tenantLoading,
    error: tenantError,
  } = useTenant();

  const tenant = tenantData?.tenant;
  const onboardingRequired = tenantData?.onboardingRequired || !tenant;
  const subscriptionRequired = tenantError?.message === 'SUBSCRIPTION_REQUIRED';

  const {
    data: entites = [],
    isLoading: entitesLoading,
  } = useEntites(!!tenant && !onboardingRequired);

  // Selectionner l'entite courante quand les entites arrivent.
  // Le query param ?e=<id> persiste le dossier actif dans l'URL pour
  // que F5 restaure le bon dossier (et donc les bons modules).
  React.useEffect(() => {
    if (entites.length === 0 || currentEntite) return;
    const params = new URLSearchParams(location.search);
    const savedId = params.get('e');
    const restored = savedId ? entites.find(ent => String(ent.id) === savedId) : null;
    const selected = restored || entites[0];
    setCurrentEntite(selected);
    if (selected.slug) {
      setClientSlug(selected.slug);
      setApiClientSlug(selected.slug);
    }
  }, [entites, currentEntite, setClientSlug, location.search]);

  // Routing centralise : seule source de verite pour les redirections post-auth.
  // Deux responsabilites :
  // 1. Redirection initiale post-login (une seule fois apres chargement
  //    tenant + entites) :
  //    - Cabinet : toujours sur le portail (liste des clients), independamment
  //      de l'URL preservee par Keycloak. Sinon le cabinet retombe direct dans
  //      la compta de son client_self quand il revient sur l'app.
  //    - Entreprise/client : si on est sur /app, /app/ ou /auth/callback,
  //      rediriger vers le 1er module actif. Sinon respecter le deep-link.
  // 2. Validation continue : quand currentEntite change (changement de
  //    dossier), si le module dans l'URL n'est pas active pour le nouveau
  //    dossier, rediriger vers son 1er module. Cette logique etait avant
  //    dans Dashboard.tsx, deplacee ici pour eviter une race condition au
  //    premier mount entre les deux effets concurrents.
  React.useEffect(() => {
    if (tenantLoading || entitesLoading || !tenant) return;
    if (entites.length > 0 && !currentEntite) return;

    const path = location.pathname;
    const onPortail = path.startsWith('/app/portail');
    const onApp = path === '/app' || path === '/app/';
    const onCallback = path === '/auth/callback';

    // 1. Redirection initiale (une seule fois)
    if (!initialRedirectDone.current) {
      initialRedirectDone.current = true;
      if (tenant.type === 'cabinet' && !onPortail) {
        navigate('/app/portail', { replace: true });
        return;
      }
      if (tenant.type !== 'cabinet' && (onApp || onCallback)) {
        const enabledMods = (currentEntite?.modules || []).filter(isModuleEnabled);
        const first = enabledMods[0] || ENABLED_MODULES.find(isModuleEnabled) || 'compta';
        const suffix = currentEntite ? `?e=${currentEntite.id}` : '';
        navigate(`/app/${first}/accueil${suffix}`, { replace: true });
        return;
      }
    }

    // 2. Validation continue : module dans URL doit etre actif pour currentEntite
    if (currentEntite) {
      const match = path.match(/^\/app\/([^/]+)/);
      const urlMod = match?.[1];
      if (urlMod && ENABLED_MODULES.includes(urlMod as NormxModule)) {
        const enabledMods = (currentEntite.modules || []).filter(isModuleEnabled);
        if (!enabledMods.includes(urlMod as NormxModule)) {
          const fallback = enabledMods[0];
          const target = fallback
            ? `/app/${fallback}/accueil?e=${currentEntite.id}`
            : '/app/portail';
          navigate(target, { replace: true });
        }
      }
    }
  }, [tenantLoading, entitesLoading, tenant, currentEntite, entites.length, location.pathname, navigate]);

  // ==================== HANDLERS ====================

  const handleLogout = (): void => {
    setCurrentEntite(null);
    setClientSlug(null);
    setApiClientSlug(null);
    logout();
  };

  const handleSwitchEntite = (entite: Entite): void => {
    setCurrentEntite(entite);
    const slug = entite.slug || null;
    setClientSlug(slug);
    setApiClientSlug(slug);
    const params = new URLSearchParams(location.search);
    params.set('e', String(entite.id));
    navigate(location.pathname + '?' + params.toString(), { replace: true });
  };

  const invalidateEntites = useInvalidateEntites();

  const handleEntiteCreated = (entite: Entite): void => {
    invalidateEntites();
    if (!currentEntite) setCurrentEntite(entite);
  };
  const handleEntiteUpdated = (entite: Entite): void => {
    invalidateEntites();
    if (currentEntite?.id === entite.id) setCurrentEntite(entite);
  };
  const handleEntiteDeleted = (id: number): void => {
    invalidateEntites();
    if (currentEntite?.id === id) setCurrentEntite(entites.find(e => e.id !== id) || null);
  };

  // ==================== LOADING / AUTH / ONBOARDING ====================

  if (authLoading || (isAuthenticated && (tenantLoading || entitesLoading))) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#0F2A42' }}>
        <img src="/NF-white.png" alt="NORMX Finance" style={{ width: 400, height: 'auto' }} />
      </div>
    );
  }

  if (!isAuthenticated) {
    login();
    return (
      <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#0F2A42' }}>
        <img src="/NF-white.png" alt="NORMX Finance" style={{ width: 400, height: 'auto' }} />
        <p style={{ color: '#cbd5e1', marginTop: 24 }}>Redirection vers la connexion...</p>
      </div>
    );
  }

  if (subscriptionRequired) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#faf8f5' }}>
        <div style={{ textAlign: 'center', maxWidth: 440, padding: 32 }}>
          <img src="/logo-principal.png" alt="NORMX Finance" style={{ width: 140, height: 140, margin: '0 auto 16px', display: 'block' }} />
          <h2 style={{ fontSize: 22, fontWeight: 700, color: '#0F2A42', marginBottom: 12 }}>Abonnement requis</h2>
          <p style={{ color: '#6b7280', fontSize: 15, lineHeight: 1.6, marginBottom: 24 }}>
            Votre compte n'a pas acces a NORMX Finance. Contactez-nous pour activer votre abonnement.
          </p>
          <a href="mailto:info-contact@normx-ai.com" style={{ display: 'inline-block', padding: '12px 24px', background: '#D4A843', color: '#0F2A42', fontWeight: 700, borderRadius: 8, textDecoration: 'none', marginBottom: 12 }}>
            Contacter NORMX AI
          </a>
          <br />
          <button onClick={logout} style={{ marginTop: 8, background: 'none', border: 'none', color: '#6b7280', fontSize: 14, cursor: 'pointer' }}>
            Se deconnecter
          </button>
        </div>
      </div>
    );
  }

  if (onboardingRequired) {
    return (
      <Onboarding
        userName={user?.name || ''}
        defaultModule={null}
        prefill={tenantData?.prefill}
        onComplete={() => {
          window.location.reload();
        }}
      />
    );
  }

  // ==================== DASHBOARD ====================

  const ent = currentEntite;
  const dashboardProps = {
    userName: user ? user.name : 'Utilisateur',
    isCabinet: tenant?.type === 'cabinet',
    entiteName: ent ? ent.nom : tenant?.nom || 'Mon Entité',
    entiteId: ent ? ent.id : 0,
    userId: user ? parseInt(user.sub.replace(/-/g, '').substring(0, 8), 16) : 0,
    typeActivite: ent ? ent.type_activite : ('entreprise' as const),
    offre: ent?.offre || ('etats' as const),
    modules: ent ? ent.modules || [] : [],
    entiteSigle: ent ? ent.sigle || '' : '',
    entiteAdresse: ent ? ent.adresse || '' : '',
    entiteNif: ent ? ent.nif || '' : '',
    entites,
    onSwitchEntite: handleSwitchEntite,
    onEntiteCreated: handleEntiteCreated,
    onEntiteUpdated: handleEntiteUpdated,
    onEntiteDeleted: handleEntiteDeleted,
    onLogout: handleLogout,
  };

  return (
    <>
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      <Routes>
        <Route path="/app/portail" element={<Dashboard {...dashboardProps} />} />
        <Route path="/app/portail/cabinet" element={<Dashboard {...dashboardProps} />} />
        <Route path="/app/:module/:tab" element={<Dashboard {...dashboardProps} />} />
        <Route path="/app/:module" element={<Dashboard {...dashboardProps} />} />
        <Route path="/app" element={<Dashboard {...dashboardProps} />} />
        <Route path="*" element={<Navigate to="/app" replace />} />
      </Routes>
    </>
  );
}

function App(): React.JSX.Element {
  return (
    <KeycloakProvider>
      <ClientProvider>
        <AppContent />
      </ClientProvider>
    </KeycloakProvider>
  );
}

export default App;
