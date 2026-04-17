import React, { createContext, useContext, useMemo } from 'react';
import type { TypeActivite } from '../types';

type Referentiel = 'syscohada' | 'sycebnl' | 'smt';

interface ReferentielContextValue {
  referentiel: Referentiel;
  label: string;
  apiParam: string;
  typeActivite: TypeActivite;
}

const ReferentielContext = createContext<ReferentielContextValue>({
  referentiel: 'syscohada',
  label: 'SYSCOHADA',
  apiParam: '?referentiel=syscohada',
  typeActivite: 'entreprise',
});

function resolveReferentiel(typeActivite: TypeActivite): Referentiel {
  switch (typeActivite) {
    case 'association':
    case 'ordre_professionnel':
      return 'sycebnl';
    case 'smt':
      return 'smt';
    case 'projet_developpement':
      return 'sycebnl';
    default:
      return 'syscohada';
  }
}

function resolveLabel(ref: Referentiel): string {
  switch (ref) {
    case 'sycebnl': return 'SYCEBNL';
    case 'smt': return 'SMT';
    default: return 'SYSCOHADA';
  }
}

interface ReferentielProviderProps {
  typeActivite: TypeActivite;
  children: React.ReactNode;
}

export function ReferentielProvider({ typeActivite, children }: ReferentielProviderProps): React.JSX.Element {
  const value = useMemo<ReferentielContextValue>(() => {
    const ref = resolveReferentiel(typeActivite);
    return {
      referentiel: ref,
      label: resolveLabel(ref),
      apiParam: `?referentiel=${ref}`,
      typeActivite,
    };
  }, [typeActivite]);

  return (
    <ReferentielContext.Provider value={value}>
      {children}
    </ReferentielContext.Provider>
  );
}

export function useReferentiel(): ReferentielContextValue {
  return useContext(ReferentielContext);
}
