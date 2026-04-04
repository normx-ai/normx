import React from 'react';
import { KeycloakProvider, useKeycloak } from './auth/KeycloakProvider';
import LandingPage from './landing/LandingPage';
import Dashboard from './dashboard/Dashboard';
import Onboarding from './components/Onboarding';
import Toast from './components/Toast';
import type { Entite } from './types';
import './App.css';

// Intercepteur global : injecter le token Keycloak sur toutes les requêtes /api
const originalFetch = window.fetch;
window.fetch = function (input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
  if (url.startsWith('/api')) {
    const token = localStorage.getItem('normx_kc_access_token');
    if (token) {
      const headers = new Headers(init?.headers);
      if (!headers.has('Authorization')) {
        headers.set('Authorization', `Bearer ${token}`);
      }
      init = { ...init, headers };
    }
  }
  return originalFetch.call(window, input, init);
};

function AppContent(): React.JSX.Element {
  const { user, accessToken, isAuthenticated, isLoading, login, logout } = useKeycloak();
  const [entites, setEntites] = React.useState<Entite[]>([]);
  const [currentEntite, setCurrentEntite] = React.useState<Entite | null>(null);
  const [toast, setToast] = React.useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [onboardingDone, setOnboardingDone] = React.useState<boolean | null>(null);
  const [tenantLoading, setTenantLoading] = React.useState(true);

  // Charger le tenant depuis l'API au login
  React.useEffect(() => {
    if (!isAuthenticated || !accessToken) {
      setTenantLoading(false);
      return;
    }

    const headers = { 'Authorization': `Bearer ${accessToken}` };

    fetch('/api/tenant/me', { headers })
      .then(r => r.json())
      .then(async (data) => {
        if (data.onboardingRequired || !data.tenant) {
          setOnboardingDone(false);
          setTenantLoading(false);
          return;
        }

        // Charger les entités depuis l'API
        try {
          const entitesRes = await fetch('/api/entites', { headers });
          if (entitesRes.ok) {
            const entitesList: Entite[] = await entitesRes.json();
            setEntites(entitesList);
            if (entitesList.length > 0) setCurrentEntite(entitesList[0]);
          } else {
            // Fallback : utiliser le tenant comme entité
            const t = data.tenant;
            const modules = (t.settings?.modules as string[]) || ['compta', 'etats', 'paie'];
            const entite: Entite = {
              id: t.id,
              nom: t.nom,
              type_activite: 'entreprise',
              offre: modules.includes('compta') ? 'comptabilite' : 'etats',
              modules: modules as ('compta' | 'etats' | 'paie')[],
            };
            setEntites([entite]);
            setCurrentEntite(entite);
          }
        } catch {
          // Fallback
          const t = data.tenant;
          const modules = (t.settings?.modules as string[]) || ['compta', 'etats', 'paie'];
          setEntites([{ id: t.id, nom: t.nom, type_activite: 'entreprise', offre: modules.includes('compta') ? 'comptabilite' : 'etats', modules: modules as ('compta' | 'etats' | 'paie')[] }]);
        }

        setOnboardingDone(true);
        setTenantLoading(false);
      })
      .catch(() => {
        setOnboardingDone(false);
        setTenantLoading(false);
      });
  }, [isAuthenticated, accessToken]);

  const handleLogout = (): void => {
    setEntites([]);
    setCurrentEntite(null);
    logout();
  };

  const handleSwitchEntite = (entite: Entite): void => setCurrentEntite(entite);
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

  if (isLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#faf8f5' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: 48, height: 48, borderRadius: 12, background: '#D4A843', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', fontSize: 24, fontWeight: 900, color: '#0F2A42' }}>N</div>
          <p style={{ color: '#6b7280', fontSize: 14 }}>Chargement...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LandingPage onLogin={login} />;
  }

  if (tenantLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#faf8f5' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: 48, height: 48, borderRadius: 12, background: '#D4A843', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', fontSize: 24, fontWeight: 900, color: '#0F2A42' }}>N</div>
          <p style={{ color: '#6b7280', fontSize: 14 }}>Chargement...</p>
        </div>
      </div>
    );
  }

  // Onboarding pour les nouveaux utilisateurs
  if (onboardingDone === false) {
    const moduleParam = new URLSearchParams(window.location.search).get('module')
      || sessionStorage.getItem('normx_redirect_module');
    return (
      <Onboarding
        userName={user?.name || ''}
        defaultModule={moduleParam}
        onComplete={(entite) => {
          setEntites([entite]);
          setCurrentEntite(entite);
          setOnboardingDone(true);
        }}
      />
    );
  }

  const ent = currentEntite;

  return (
    <>
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      <Dashboard
        userName={user ? user.name : 'Utilisateur'}
        isCabinet={entites.length > 1}
        entiteName={ent ? ent.nom : 'Mon Entité'}
        entiteId={ent ? ent.id : 0}
        userId={user ? parseInt(user.sub.replace(/-/g, '').substring(0, 8), 16) : 0}
        typeActivite={ent ? ent.type_activite : 'entreprise'}
        offre={ent ? ent.offre || 'comptabilite' : 'comptabilite'}
        modules={ent ? ent.modules || ['compta', 'etats', 'paie'] : ['compta', 'etats', 'paie']}
        entiteSigle={ent ? ent.sigle || '' : ''}
        entiteAdresse={ent ? ent.adresse || '' : ''}
        entiteNif={ent ? ent.nif || '' : ''}
        entites={entites}
        onSwitchEntite={handleSwitchEntite}
        onEntiteCreated={handleEntiteCreated}
        onEntiteUpdated={handleEntiteUpdated}
        onEntiteDeleted={handleEntiteDeleted}
        onLogout={handleLogout}
      />
    </>
  );
}

function App(): React.JSX.Element {
  return (
    <KeycloakProvider>
      <AppContent />
    </KeycloakProvider>
  );
}

export default App;
