import React, { createContext, useContext, useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { getLoginUrl, getLogoutUrl } from '../paie/data/keycloak';
import type { KeycloakUser } from '../paie/data/keycloak';

// Format retourne par /api/auth/me et /api/auth/callback
interface AuthApiUser {
  sub: string;
  email?: string;
  name?: string;
  preferred_username?: string;
  roles?: string[];
}

function apiUserToKeycloakUser(u: AuthApiUser): KeycloakUser {
  return {
    sub: u.sub,
    email: u.email || '',
    name: u.name || '',
    preferredUsername: u.preferred_username || '',
    roles: u.roles || [],
  };
}

interface KeycloakContextValue {
  user: KeycloakUser | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: () => void;
  logout: () => void;
}

const KeycloakContext = createContext<KeycloakContextValue | null>(null);

interface KeycloakProviderProps {
  children: React.ReactNode;
}

export function KeycloakProvider({ children }: KeycloakProviderProps): React.ReactElement {
  const [user, setUser] = useState<KeycloakUser | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Nettoyer les anciens tokens localStorage (migration)
  useEffect(() => {
    localStorage.removeItem('normx_kc_access_token');
    localStorage.removeItem('normx_kc_refresh_token');
  }, []);

  const clearSession = useCallback(() => {
    setUser(null);
    if (refreshTimerRef.current) {
      clearTimeout(refreshTimerRef.current);
      refreshTimerRef.current = null;
    }
  }, []);

  const scheduleRefresh = useCallback((expiresIn: number) => {
    if (refreshTimerRef.current) {
      clearTimeout(refreshTimerRef.current);
    }
    // Rafraichir 60 secondes avant expiration, minimum 5 secondes
    const refreshIn = Math.max((expiresIn - 60) * 1000, 5000);

    refreshTimerRef.current = setTimeout(async () => {
      try {
        const res = await fetch('/api/auth/refresh', {
          method: 'POST',
          credentials: 'include',
        });
        if (!res.ok) {
          clearSession();
          return;
        }
        const data = await res.json() as { user: AuthApiUser; expires_in: number };
        setUser(apiUserToKeycloakUser(data.user));
        scheduleRefresh(data.expires_in);
      } catch {
        clearSession();
      }
    }, refreshIn);
  }, [clearSession]);

  // Verifier la session au chargement (cookie httpOnly)
  const checkSession = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/me', { credentials: 'include' });
      if (!res.ok) {
        clearSession();
        return false;
      }
      const data = await res.json() as AuthApiUser;
      setUser(apiUserToKeycloakUser(data));
      return true;
    } catch {
      clearSession();
      return false;
    }
  }, [clearSession]);

  // Handle redirect from Keycloak avec authorization code
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');

    if (code) {
      const redirectUri = `${window.location.origin}${window.location.pathname}`;
      // Nettoyer l'URL immediatement
      window.history.replaceState({}, document.title, window.location.pathname);

      // Echanger le code via le backend (qui stocke les tokens en cookies httpOnly)
      fetch('/api/auth/callback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ code, redirect_uri: redirectUri }),
      })
        .then(async (res) => {
          if (!res.ok) throw new Error('Echange de code echoue');
          const data = await res.json() as { user: AuthApiUser; expires_in: number };
          setUser(apiUserToKeycloakUser(data.user));
          scheduleRefresh(data.expires_in);
          setIsLoading(false);
        })
        .catch(() => {
          clearSession();
          setIsLoading(false);
        });
      return;
    }

    // Pas de code dans l'URL — verifier la session existante via cookie
    checkSession().then((ok) => {
      if (ok) {
        // Session valide, programmer le refresh (on estime 5 min par defaut)
        scheduleRefresh(300);
      }
      setIsLoading(false);
    });
  }, [scheduleRefresh, checkSession, clearSession]);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (refreshTimerRef.current) {
        clearTimeout(refreshTimerRef.current);
      }
    };
  }, []);

  const login = useCallback(() => {
    // Sauvegarder le parametre module pour le restaurer apres Keycloak
    const moduleParam = new URLSearchParams(window.location.search).get('module');
    if (moduleParam) {
      sessionStorage.setItem('normx_redirect_module', moduleParam);
    }
    const redirectUri = `${window.location.origin}${window.location.pathname}`;
    window.location.href = getLoginUrl(redirectUri);
  }, []);

  const logout = useCallback(() => {
    const redirectUri = window.location.origin;
    // Supprimer les cookies cote serveur
    fetch('/api/auth/logout', { method: 'POST', credentials: 'include' }).catch(() => {});
    clearSession();
    window.location.href = getLogoutUrl(redirectUri);
  }, [clearSession]);

  const value = useMemo<KeycloakContextValue>(() => ({
    user,
    accessToken: null, // Plus de token cote client — tout passe par cookies httpOnly
    isAuthenticated: user !== null,
    isLoading,
    login,
    logout,
  }), [user, isLoading, login, logout]);

  return (
    <KeycloakContext.Provider value={value}>
      {children}
    </KeycloakContext.Provider>
  );
}

export function useKeycloak(): KeycloakContextValue {
  const context = useContext(KeycloakContext);
  if (!context) {
    throw new Error('useKeycloak doit etre utilise dans un KeycloakProvider.');
  }
  return context;
}
