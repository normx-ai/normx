import React, { createContext, useContext, useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { getLoginUrl, getLogoutUrl } from './keycloak';
import type { KeycloakUser } from './keycloak';
import { api } from '../lib/apiEndpoints';

// Format retourne par /api/auth/me et /api/auth/callback
interface AuthApiUser {
  sub: string;
  email?: string;
  name?: string;
  preferred_username?: string;
  roles?: string[];
}

// /api/auth/me ajoute expires_in (TTL restant du JWT) pour le refresh proactif.
interface AuthMeResponse extends AuthApiUser {
  expires_in: number;
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
        const res = await fetch(api.auth.refresh, {
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

  // Verifier la session au chargement (cookie httpOnly).
  // Retourne expires_in (TTL reel du JWT) pour programmer le refresh proactif.
  const checkSession = useCallback(async (): Promise<number | null> => {
    try {
      const res = await fetch(api.auth.me, { credentials: 'include' });
      if (!res.ok) {
        clearSession();
        return null;
      }
      const data = await res.json() as AuthMeResponse;
      setUser(apiUserToKeycloakUser(data));
      return data.expires_in;
    } catch {
      clearSession();
      return null;
    }
  }, [clearSession]);

  // Handle redirect from Keycloak avec authorization code
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');

    if (code) {
      const redirectUri = `${window.location.origin}${window.location.pathname}`;
      // Nettoyer les query params (?code=...&state=...) de l'URL tout en
      // conservant le pathname (ex: /app/compta/saisie). React Router affichera
      // la bonne page une fois l'echange termine.
      window.history.replaceState({}, document.title, window.location.pathname);

      fetch(api.auth.callback, {
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
    // Le serveur renvoie expires_in (TTL reel du JWT) : on programme le
    // refresh proactif sur cette valeur, plus aucune estimation en dur.
    checkSession().then((expiresIn) => {
      if (expiresIn !== null) {
        scheduleRefresh(expiresIn);
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

  // L'intercepteur fetch (csrf-fetch.ts) dispatche 'auth:expired' quand un
  // refresh silencieux echoue : on redirige vers Keycloak login pour relancer
  // un flow OIDC propre, sans laisser l'utilisateur dans un etat 401.
  useEffect(() => {
    const handler = () => {
      clearSession();
      const redirectUri = `${window.location.origin}${window.location.pathname}`;
      window.location.href = getLoginUrl(redirectUri);
    };
    window.addEventListener('auth:expired', handler);
    return () => window.removeEventListener('auth:expired', handler);
  }, [clearSession]);

  const login = useCallback(() => {
    // Le module est maintenant encode dans le pathname (ex: /app/compta/saisie),
    // pas besoin de le sauvegarder separement. Keycloak redirigera vers
    // la meme URL apres auth, et React Router affichera la bonne page.
    const redirectUri = `${window.location.origin}${window.location.pathname}`;
    window.location.href = getLoginUrl(redirectUri);
  }, []);

  const logout = useCallback(() => {
    const redirectUri = window.location.origin;
    // Supprimer les cookies cote serveur
    fetch(api.auth.logout, { method: 'POST', credentials: 'include' }).catch(() => {});
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
