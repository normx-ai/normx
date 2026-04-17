import React from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { KeycloakProvider, useKeycloak } from './auth/KeycloakProvider';
import { ClientProvider, useClient } from './contexts/ClientContext';
import { cabinetFetch, setApiClientSlug } from './lib/api';
import Dashboard from './dashboard/Dashboard';
import Onboarding from './components/Onboarding';
import Toast from './components/Toast';
import type { Entite, NormxModule } from './types';
import { ENABLED_MODULES, filterEnabledModules, isModuleEnabled } from './config/modules';
import './App.css';

function AppContent(): React.JSX.Element {
  const { user, isAuthenticated, isLoading, login, logout } = useKeycloak();
  const navigate = useNavigate();
  const location = useLocation();
  const { setClientSlug } = useClient();
  const [entites, setEntites] = React.useState<Entite[]>([]);
  const [currentEntite, setCurrentEntite] = React.useState<Entite | null>(null);
  const [toast, setToast] = React.useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [onboardingDone, setOnboardingDone] = React.useState<boolean | null>(null);
  const [tenantLoading, setTenantLoading] = React.useState(true);
  const [tenantName, setTenantName] = React.useState('');
  const [tenantType, setTenantType] = React.useState<string>('');
  const [subscriptionRequired, setSubscriptionRequired] = React.useState(false);
  const initialRedirectDone = React.useRef(false);

  const loadTenantAndEntites = React.useCallback(async (): Promise<void> => {
    try {
      const r = await cabinetFetch('/api/tenant/me');
      if (r.status === 403) {
        const err = await r.json().catch(() => ({}));
        if (err.code === 'SUBSCRIPTION_REQUIRED') {
          setSubscriptionRequired(true);
          setTenantLoading(false);
          return;
        }
      }
      const data = await r.json();
      if (!data) return;
      if (data.onboardingRequired || !data.tenant) {
        setOnboardingDone(false);
        setTenantLoading(false);
        return;
      }

      setTenantName(data.tenant.nom || '');
      setTenantType(data.tenant.type || '');

      try {
        const entitesRes = await cabinetFetch('/api/entites');
        if (entitesRes.ok) {
          const rawList: Entite[] = await entitesRes.json();
          const entitesList: Entite[] = rawList.map((e) => ({
            ...e,
            modules: filterEnabledModules((e.modules || []) as NormxModule[]),
          }));
          setEntites(entitesList);
          if (entitesList.length > 0) {
            const selected = entitesList[0];
            setCurrentEntite(selected);
            if (selected.slug) {
              setClientSlug(selected.slug);
              setApiClientSlug(selected.slug);
            }
          }
        } else {
          const t = data.tenant;
          const rawModules = (t.settings?.modules as NormxModule[]) || [];
          const modules = filterEnabledModules(rawModules);
          const entite: Entite = {
            id: t.id, nom: t.nom, type_activite: 'entreprise', offre: 'etats', modules,
          };
          setEntites([entite]);
          setCurrentEntite(entite);
        }
      } catch {
        const t = data.tenant;
        const modules = [...ENABLED_MODULES];
        setEntites([{ id: t.id, nom: t.nom, type_activite: 'entreprise', offre: 'etats', modules }]);
      }

      setOnboardingDone(true);
      setTenantLoading(false);
    } catch {
      setOnboardingDone(false);
      setTenantLoading(false);
    }
  }, [setClientSlug]);

  React.useEffect(() => {
    if (!isAuthenticated) {
      setTenantLoading(false);
      return;
    }
    loadTenantAndEntites();
  }, [isAuthenticated, loadTenantAndEntites]);

  // Redirect /app vers la bonne page (une seule fois apres le chargement).
  React.useEffect(() => {
    if (initialRedirectDone.current || tenantLoading || !onboardingDone) return;
    if (location.pathname === '/app' || location.pathname === '/app/') {
      initialRedirectDone.current = true;
      if (tenantType === 'cabinet') {
        navigate('/app/portail', { replace: true });
      } else {
        const firstMod = ENABLED_MODULES.find(m => isModuleEnabled(m));
        navigate(`/app/${firstMod || 'compta'}/accueil`, { replace: true });
      }
    }
  }, [tenantLoading, onboardingDone, tenantType, location.pathname, navigate]);

  const handleLogout = (): void => {
    setEntites([]);
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
    setEntites(prev => [...prev, entite]);
    if (!currentEntite) setCurrentEntite(entite);
  };
  const handleEntiteUpdated = (entite: Entite): void => {
    setEntites(prev => prev.map(e => e.id === entite.id ? entite : e));
    if (currentEntite?.id === entite.id) setCurrentEntite(entite);
  };
  const handleEntiteDeleted = (id: number): void => {
    setEntites(prev => prev.filter(e => e.id !== id));
    if (currentEntite?.id === id) setCurrentEntite(entites.find(e => e.id !== id) || null);
  };

  if (isLoading || tenantLoading) {
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

  if (onboardingDone === false) {
    return (
      <Onboarding
        userName={user?.name || ''}
        defaultModule={null}
        onComplete={() => {
          setTenantLoading(true);
          loadTenantAndEntites();
        }}
      />
    );
  }

  const ent = currentEntite;
  const dashboardProps = {
    userName: user ? user.name : 'Utilisateur',
    isCabinet: tenantType === 'cabinet',
    entiteName: ent ? ent.nom : tenantName || 'Mon Entité',
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
