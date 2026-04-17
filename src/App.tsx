import React from 'react';
import { KeycloakProvider, useKeycloak } from './auth/KeycloakProvider';
import Dashboard from './dashboard/Dashboard';
import Onboarding from './components/Onboarding';
import Toast from './components/Toast';
import type { Entite, NormxModule } from './types';
import { ENABLED_MODULES, filterEnabledModules } from './config/modules';
import './App.css';

// Intercepteur global : cookies httpOnly + header X-Client-Slug pour les cabinets
const originalFetch = window.fetch;
window.fetch = function (input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
  if (url.startsWith('/api')) {
    const headers = new Headers(init?.headers);
    // Injecter le slug du client selectionne (cabinet → client)
    const clientSlug = sessionStorage.getItem('normx_client_slug');
    if (clientSlug) {
      headers.set('X-Client-Slug', clientSlug);
    }
    init = { ...init, credentials: 'include', headers };
  }
  return originalFetch.call(window, input, init);
};

function AppContent(): React.JSX.Element {
  const { user, isAuthenticated, isLoading, login, logout } = useKeycloak();
  const [entites, setEntites] = React.useState<Entite[]>([]);
  const [currentEntite, setCurrentEntite] = React.useState<Entite | null>(null);
  const [toast, setToast] = React.useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [onboardingDone, setOnboardingDone] = React.useState<boolean | null>(null);
  const [tenantLoading, setTenantLoading] = React.useState(true);
  const [tenantName, setTenantName] = React.useState('');
  const [tenantType, setTenantType] = React.useState<string>('');
  const [subscriptionRequired, setSubscriptionRequired] = React.useState(false);

  // Charger le tenant + entites depuis l'API. Extrait dans un callback
  // pour pouvoir le rappeler apres l'onboarding (sinon tenantType reste '',
  // isCabinet reste false et le cabinet atterrit dans un module au lieu du portail).
  const loadTenantAndEntites = React.useCallback(async (): Promise<void> => {
    try {
      const r = await fetch('/api/tenant/me', { credentials: 'include' });
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

      // Pour un cabinet sans dossier client actif, atterrir sur le portail.
      // Mais si un client_slug est sauvegardé (l'utilisateur travaillait sur
      // un dossier client), on conserve le module pour que F5 reste sur la
      // même page. Le slug est lu plus bas (ligne ~72) puis réinjecté.
      if (data.tenant.type === 'cabinet' && !sessionStorage.getItem('normx_client_slug')) {
        sessionStorage.removeItem('normx_activeModule');
      }

      // Charger les entités depuis l'API
      try {
        // Ne PAS envoyer X-Client-Slug ici : on veut la liste complete du cabinet
        const savedSlug = sessionStorage.getItem('normx_client_slug');
        sessionStorage.removeItem('normx_client_slug');
        const entitesRes = await fetch('/api/entites', { credentials: 'include' });
        if (entitesRes.ok) {
          const rawList: Entite[] = await entitesRes.json();
          // Filtrer les modules non actives (compta/paie pour l'instant)
          const entitesList: Entite[] = rawList.map((e) => ({
            ...e,
            modules: filterEnabledModules((e.modules || []) as NormxModule[]),
          }));
          setEntites(entitesList);
          if (entitesList.length > 0) {
            // Restaurer le client selectionne avant l'actualisation
            const restored = savedSlug ? entitesList.find((e) => e.slug === savedSlug) : null;
            const selected = restored || entitesList[0];
            setCurrentEntite(selected);
            if (selected.slug) {
              sessionStorage.setItem('normx_client_slug', selected.slug);
            }
          }
        } else {
          // Fallback : utiliser le tenant comme entité
          const t = data.tenant;
          const rawModules = (t.settings?.modules as NormxModule[]) || [];
          const modules = filterEnabledModules(rawModules);
          const entite: Entite = {
            id: t.id,
            nom: t.nom,
            type_activite: 'entreprise',
            offre: 'etats',
            modules,
          };
          setEntites([entite]);
          setCurrentEntite(entite);
        }
      } catch {
        // Fallback : on force aux modules actives
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
  }, []);

  React.useEffect(() => {
    if (!isAuthenticated) {
      setTenantLoading(false);
      // Retirer le flag pour que la landing accepte un retour sans auth
      try { localStorage.removeItem('normx_auth'); } catch (_e) { /* ignore */ }
      return;
    }
    // Poser le flag pour que la landing puisse detecter une session existante
    // et rediriger automatiquement vers /app lors d'un refresh sur /.
    try { localStorage.setItem('normx_auth', '1'); } catch (_e) { /* ignore */ }
    // Forcer l'URL a /app si on est sur la racine pour que F5 ne retombe
    // pas sur la landing. /app est servie par la React app via nginx.
    if (window.location.pathname === '/') {
      window.history.replaceState({}, '', '/app' + window.location.search + window.location.hash);
    }
    loadTenantAndEntites();
  }, [isAuthenticated, loadTenantAndEntites]);

  const handleLogout = (): void => {
    setEntites([]);
    setCurrentEntite(null);
    try { localStorage.removeItem('normx_auth'); } catch (_e) { /* ignore */ }
    logout();
  };

  const handleSwitchEntite = (entite: Entite): void => {
    setCurrentEntite(entite);
    // Stocker le slug du client pour le header X-Client-Slug
    if (entite.slug) {
      sessionStorage.setItem('normx_client_slug', entite.slug);
    } else {
      sessionStorage.removeItem('normx_client_slug');
    }
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

  if (isLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#faf8f5' }}>
        <div style={{ textAlign: 'center' }}>
          <img src="/logo-carre.png" alt="NORMX Finance" style={{ width: 80, height: 80, borderRadius: 16, display: 'block' }} />
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    // Landing HTML statique servie par nginx — ici on lance l'auth Keycloak
    login();
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#faf8f5' }}>
        <div style={{ textAlign: 'center' }}>
          <img src="/logo-carre.png" alt="NORMX Finance" style={{ width: 80, height: 80, borderRadius: 16, display: 'block' }} />
          <p style={{ color: '#6b7280', marginTop: 16 }}>Redirection vers la connexion...</p>
        </div>
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

  if (tenantLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#faf8f5' }}>
        <div style={{ textAlign: 'center' }}>
          <img src="/logo-carre.png" alt="NORMX Finance" style={{ width: 80, height: 80, borderRadius: 16, display: 'block' }} />
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
        onComplete={() => {
          // Recharger tenant + entites depuis l'API apres l'onboarding
          // pour que tenantType (cabinet vs entreprise) soit a jour et que
          // le Dashboard atterrisse sur le portail au lieu d'un module.
          setTenantLoading(true);
          loadTenantAndEntites();
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
        isCabinet={tenantType === 'cabinet'}
        entiteName={ent ? ent.nom : tenantName || 'Mon Entité'}
        entiteId={ent ? ent.id : 0}
        userId={user ? parseInt(user.sub.replace(/-/g, '').substring(0, 8), 16) : 0}
        typeActivite={ent ? ent.type_activite : 'entreprise'}
        offre={ent?.offre || 'etats'}
        modules={ent ? ent.modules || [] : []}
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
