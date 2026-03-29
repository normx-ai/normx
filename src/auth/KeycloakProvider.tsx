import React, { createContext, useContext, useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  exchangeCode,
  refreshAccessToken,
  parseToken,
  getLoginUrl,
  getLogoutUrl,
  isTokenExpired,
} from '../paie/data/keycloak';
import type { KeycloakUser } from '../paie/data/keycloak';

interface KeycloakContextValue {
  user: KeycloakUser | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: () => void;
  logout: () => void;
}

const KeycloakContext = createContext<KeycloakContextValue | null>(null);

const TOKEN_STORAGE_KEY = 'normx_kc_access_token';
const REFRESH_STORAGE_KEY = 'normx_kc_refresh_token';

interface KeycloakProviderProps {
  children: React.ReactNode;
}

export function KeycloakProvider({ children }: KeycloakProviderProps): React.ReactElement {
  const [accessToken, setAccessToken] = useState<string | null>(
    () => localStorage.getItem(TOKEN_STORAGE_KEY)
  );
  const [refreshToken, setRefreshToken] = useState<string | null>(
    () => localStorage.getItem(REFRESH_STORAGE_KEY)
  );
  const [user, setUser] = useState<KeycloakUser | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTokens = useCallback(() => {
    setAccessToken(null);
    setRefreshToken(null);
    setUser(null);
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    localStorage.removeItem(REFRESH_STORAGE_KEY);
    if (refreshTimerRef.current) {
      clearTimeout(refreshTimerRef.current);
      refreshTimerRef.current = null;
    }
  }, []);

  const storeTokens = useCallback((access: string, refresh: string) => {
    setAccessToken(access);
    setRefreshToken(refresh);
    localStorage.setItem(TOKEN_STORAGE_KEY, access);
    localStorage.setItem(REFRESH_STORAGE_KEY, refresh);

    try {
      const parsed = parseToken(access);
      setUser(parsed);
    } catch {
      clearTokens();
    }
  }, [clearTokens]);

  const scheduleRefresh = useCallback((access: string, refresh: string) => {
    if (refreshTimerRef.current) {
      clearTimeout(refreshTimerRef.current);
    }

    // Parse expiry and refresh 60 seconds before
    const parts = access.split('.');
    if (parts.length !== 3) return;

    interface ExpPayload { exp?: number }
    const payload = JSON.parse(atob(parts[1])) as ExpPayload;
    if (!payload.exp) return;

    const msUntilExpiry = payload.exp * 1000 - Date.now();
    const refreshIn = Math.max(msUntilExpiry - 60_000, 5_000);

    refreshTimerRef.current = setTimeout(() => {
      refreshAccessToken(refresh)
        .then((tokens) => {
          storeTokens(tokens.access_token, tokens.refresh_token);
          scheduleRefresh(tokens.access_token, tokens.refresh_token);
        })
        .catch(() => {
          clearTokens();
        });
    }, refreshIn);
  }, [storeTokens, clearTokens]);

  // Handle redirect from Keycloak with authorization code
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');

    if (code) {
      const redirectUri = `${window.location.origin}${window.location.pathname}`;
      // Clean URL immediately
      window.history.replaceState({}, document.title, window.location.pathname);

      exchangeCode(code, redirectUri)
        .then((tokens) => {
          storeTokens(tokens.access_token, tokens.refresh_token);
          scheduleRefresh(tokens.access_token, tokens.refresh_token);
          setIsLoading(false);
        })
        .catch(() => {
          clearTokens();
          setIsLoading(false);
        });
      return;
    }

    // No code in URL — check stored tokens
    if (accessToken && !isTokenExpired(accessToken)) {
      try {
        const parsed = parseToken(accessToken);
        setUser(parsed);
        if (refreshToken) {
          scheduleRefresh(accessToken, refreshToken);
        }
      } catch {
        clearTokens();
      }
    } else if (refreshToken) {
      // Access token expired but we have a refresh token
      refreshAccessToken(refreshToken)
        .then((tokens) => {
          storeTokens(tokens.access_token, tokens.refresh_token);
          scheduleRefresh(tokens.access_token, tokens.refresh_token);
        })
        .catch(() => {
          clearTokens();
        });
    } else {
      clearTokens();
    }

    setIsLoading(false);
  }, [scheduleRefresh]);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (refreshTimerRef.current) {
        clearTimeout(refreshTimerRef.current);
      }
    };
  }, []);

  const login = useCallback(() => {
    // Sauvegarder le paramètre module pour le restaurer après Keycloak
    const moduleParam = new URLSearchParams(window.location.search).get('module');
    if (moduleParam) {
      sessionStorage.setItem('normx_redirect_module', moduleParam);
    }
    const redirectUri = `${window.location.origin}${window.location.pathname}`;
    window.location.href = getLoginUrl(redirectUri);
  }, []);

  const logout = useCallback(() => {
    const redirectUri = window.location.origin;
    clearTokens();
    window.location.href = getLogoutUrl(redirectUri);
  }, [clearTokens]);

  const value = useMemo<KeycloakContextValue>(() => ({
    user,
    accessToken,
    isAuthenticated: user !== null && accessToken !== null,
    isLoading,
    login,
    logout,
  }), [user, accessToken, isLoading, login, logout]);

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
