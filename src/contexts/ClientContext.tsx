import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';

interface ClientContextValue {
  clientSlug: string | null;
  setClientSlug: (slug: string | null) => void;
}

const ClientContext = createContext<ClientContextValue>({
  clientSlug: null,
  setClientSlug: () => {},
});

export function ClientProvider({ children }: { children: React.ReactNode }): React.JSX.Element {
  const [clientSlug, setClientSlugState] = useState<string | null>(null);

  const setClientSlug = useCallback((slug: string | null) => {
    setClientSlugState(slug);
  }, []);

  const value = useMemo(() => ({ clientSlug, setClientSlug }), [clientSlug, setClientSlug]);

  return (
    <ClientContext.Provider value={value}>
      {children}
    </ClientContext.Provider>
  );
}

export function useClient(): ClientContextValue {
  return useContext(ClientContext);
}
