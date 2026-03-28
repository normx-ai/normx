/**
 * Hook usePermissions - NormX
 * Derive les permissions par module depuis les roles Keycloak de l'utilisateur.
 */

import { useMemo } from 'react';
import { useKeycloak } from '../auth/KeycloakProvider';

type ModuleNormx = 'compta' | 'paie' | 'etats' | 'revision' | 'assistant' | 'admin';

interface ModulePermissions {
  module: ModuleNormx;
  peut_lire: boolean;
  peut_creer: boolean;
  peut_modifier: boolean;
  peut_supprimer: boolean;
}

interface UsePermissionsResult {
  permissions: ModulePermissions[];
  canRead: (module: ModuleNormx) => boolean;
  canCreate: (module: ModuleNormx) => boolean;
  canEdit: (module: ModuleNormx) => boolean;
  canDelete: (module: ModuleNormx) => boolean;
  isLoading: boolean;
}

const ALL_MODULES: ModuleNormx[] = ['compta', 'paie', 'etats', 'revision', 'assistant', 'admin'];

interface PermFlags {
  peut_lire: boolean;
  peut_creer: boolean;
  peut_modifier: boolean;
  peut_supprimer: boolean;
}

function allTrue(): PermFlags {
  return { peut_lire: true, peut_creer: true, peut_modifier: true, peut_supprimer: true };
}

function readOnly(): PermFlags {
  return { peut_lire: true, peut_creer: false, peut_modifier: false, peut_supprimer: false };
}

function none(): PermFlags {
  return { peut_lire: false, peut_creer: false, peut_modifier: false, peut_supprimer: false };
}

function buildPermissionsForRoles(roles: string[]): ModulePermissions[] {
  const isAdmin = roles.includes('admin');
  if (isAdmin) {
    return ALL_MODULES.map((m) => ({ module: m, ...allTrue() }));
  }

  // Accumuler les permissions de tous les roles (union: le plus permissif gagne)
  const permsMap = new Map<ModuleNormx, PermFlags>();
  for (const m of ALL_MODULES) {
    permsMap.set(m, none());
  }

  for (const role of roles) {
    const rolePerms = getRoleModulePerms(role);
    for (const entry of rolePerms) {
      const current = permsMap.get(entry.module);
      if (current) {
        permsMap.set(entry.module, {
          peut_lire: current.peut_lire || entry.perms.peut_lire,
          peut_creer: current.peut_creer || entry.perms.peut_creer,
          peut_modifier: current.peut_modifier || entry.perms.peut_modifier,
          peut_supprimer: current.peut_supprimer || entry.perms.peut_supprimer,
        });
      }
    }
  }

  const result: ModulePermissions[] = [];
  for (const m of ALL_MODULES) {
    const flags = permsMap.get(m);
    if (flags) {
      result.push({ module: m, ...flags });
    }
  }
  return result;
}

interface RoleModuleEntry {
  module: ModuleNormx;
  perms: PermFlags;
}

function getRoleModulePerms(role: string): RoleModuleEntry[] {
  switch (role) {
    case 'comptable':
      return [
        { module: 'compta', perms: allTrue() },
        { module: 'etats', perms: allTrue() },
        { module: 'paie', perms: readOnly() },
        { module: 'revision', perms: readOnly() },
      ];

    case 'gestionnaire_paie':
      return [
        { module: 'paie', perms: allTrue() },
        { module: 'compta', perms: readOnly() },
      ];

    case 'reviseur':
      return [
        { module: 'revision', perms: allTrue() },
        { module: 'compta', perms: readOnly() },
        { module: 'etats', perms: readOnly() },
      ];

    case 'lecture_seule':
      return ALL_MODULES.map((m) => ({ module: m, perms: readOnly() }));

    default:
      return [];
  }
}

export function usePermissions(): UsePermissionsResult {
  const { user, isLoading } = useKeycloak();

  const roles = user?.roles ?? [];

  const permissions = useMemo(() => buildPermissionsForRoles(roles), [roles]);

  const canRead = useMemo(() => {
    return (module: ModuleNormx): boolean => {
      const perm = permissions.find((p) => p.module === module);
      return perm?.peut_lire ?? false;
    };
  }, [permissions]);

  const canCreate = useMemo(() => {
    return (module: ModuleNormx): boolean => {
      const perm = permissions.find((p) => p.module === module);
      return perm?.peut_creer ?? false;
    };
  }, [permissions]);

  const canEdit = useMemo(() => {
    return (module: ModuleNormx): boolean => {
      const perm = permissions.find((p) => p.module === module);
      return perm?.peut_modifier ?? false;
    };
  }, [permissions]);

  const canDelete = useMemo(() => {
    return (module: ModuleNormx): boolean => {
      const perm = permissions.find((p) => p.module === module);
      return perm?.peut_supprimer ?? false;
    };
  }, [permissions]);

  return {
    permissions,
    canRead,
    canCreate,
    canEdit,
    canDelete,
    isLoading,
  };
}
