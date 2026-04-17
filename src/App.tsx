import React from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { KeycloakProvider, useKeycloak } from './auth/KeycloakProvider';
import { ClientProvider, useClient } from './contexts/ClientContext';
import { setApiClientSlug } from './lib/api';
import { useTenant, useEntites } from './lib/queries';
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
  React.useEffect(() => {
    if (entites.length > 0 && !currentEntite) {
      const selected = entites[0];
      setCurrentEntite(selected);
      if (selected.slug) {
        setClientSlug(selected.slug);
        setApiClientSlug(selected.slug);
      }
    }
  }, [entites, currentEntite, setClientSlug]);

  // Redirect /app vers la bonne page (une seule fois).
  React.useEffect(() => {
    if (initialRedirectDone.current || tenantLoading || entitesLoading || !tenant) return;
    if (location.pathname === '/app' || location.pathname === '/app/') {
      initialRedirectDone.current = true;
      if (tenant.type === 'cabinet') {
        navigate('/app/portail', { replace: true });
      } else {
        const firstMod = ENABLED_MODULES.find(m => isModuleEnabled(m));
        navigate(`/app/${firstMod || 'compta'}/accueil`, { replace: true });
      }
    }
  }, [tenantLoading, entitesLoading, tenant, location.pathname, navigate]);

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
  };

  const handleEntiteCreated = (entite: Entite): void => {
    if (!currentEntite) setCurrentEntite(entite);
  };
  const handleEntiteUpdated = (entite: Entite): void => {
    if (currentEntite?.id === entite.id) setCurrentEntite(entite);
  };
  const handleEntiteDeleted = (id: number): void => {
    if (currentEntite?.id === id) setCurrentEntite(entites.find(e => e.id !== id) || null);
  };

  // ==================== LOADING / AUTH / ONBOARDING ====================

  if (authLoading || (isAuthenticated && (tenantLoading || entitesLoading))) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#faf8f5' }}>
        <img src="/logo-carre.png" alt="NORMX Finance" style={{ width: 80, height: 80, borderRadius: 16 }} />
      </div>
    );
  }

  if (!isAuthenticated) {
    login();
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#faf8f5' }}>
        <img src="/logo-carre.png" alt="NORMX Finance" style={{ width: 80, height: 80, borderRadius: 16 }} />
        <p style={{ color: '#6b7280', marginTop: 16 }}>Redirection vers la connexion...</p>
      </div>
    );
  }

  if (subscriptionRequired) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#faf8f5' }}>
        <div style={{ textAlign: 'center', maxWidth: 440, padding: 32 }}>
          <img src="/logo-carre.png" alt="NORMX Finance" style={{ width: 48, height: 48, borderRadius: 12, margin: '0 auto 16px', display: 'block' }} />
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
