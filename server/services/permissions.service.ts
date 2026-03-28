/**
 * Service Permissions - NormX
 * Gestion des permissions par module pour chaque utilisateur dans un schema tenant.
 */

import pool from '../db';
import logger from '../logger';
import { getValidatedSchemaName } from '../utils/tenant.utils';

// ============ INTERFACES ============

export interface Permission {
  id: number;
  utilisateur_id: string;
  module: string;
  peut_lire: boolean;
  peut_creer: boolean;
  peut_modifier: boolean;
  peut_supprimer: boolean;
}

export type ModuleNormx = 'compta' | 'paie' | 'etats' | 'revision' | 'assistant' | 'admin';
export type ActionPermission = 'lire' | 'creer' | 'modifier' | 'supprimer';

const ALL_MODULES: ModuleNormx[] = ['compta', 'paie', 'etats', 'revision', 'assistant', 'admin'];

const ACTION_COLUMN_MAP: Record<ActionPermission, string> = {
  lire: 'peut_lire',
  creer: 'peut_creer',
  modifier: 'peut_modifier',
  supprimer: 'peut_supprimer',
};

interface PermissionFlags {
  peut_lire: boolean;
  peut_creer: boolean;
  peut_modifier: boolean;
  peut_supprimer: boolean;
}

// ============ FONCTIONS ============

function rowToPermission(row: Record<string, string | number | boolean>): Permission {
  return {
    id: Number(row.id),
    utilisateur_id: String(row.utilisateur_id),
    module: String(row.module),
    peut_lire: Boolean(row.peut_lire),
    peut_creer: Boolean(row.peut_creer),
    peut_modifier: Boolean(row.peut_modifier),
    peut_supprimer: Boolean(row.peut_supprimer),
  };
}

export async function getPermissions(schema: string, utilisateurId: string): Promise<Permission[]> {
  const validSchema = getValidatedSchemaName(schema);
  const query = `SELECT * FROM "${validSchema}".permissions_modules WHERE utilisateur_id = $1 ORDER BY module`;
  const result = await pool.query(query, [utilisateurId]);
  return result.rows.map(rowToPermission);
}

export async function getPermission(
  schema: string,
  utilisateurId: string,
  module: ModuleNormx
): Promise<Permission | null> {
  const validSchema = getValidatedSchemaName(schema);
  const query = `SELECT * FROM "${validSchema}".permissions_modules WHERE utilisateur_id = $1 AND module = $2`;
  const result = await pool.query(query, [utilisateurId, module]);
  if (result.rows.length === 0) return null;
  return rowToPermission(result.rows[0]);
}

export async function setPermission(
  schema: string,
  utilisateurId: string,
  module: ModuleNormx,
  perms: PermissionFlags
): Promise<Permission> {
  const validSchema = getValidatedSchemaName(schema);
  const query = `
    INSERT INTO "${validSchema}".permissions_modules
      (utilisateur_id, module, peut_lire, peut_creer, peut_modifier, peut_supprimer)
    VALUES ($1, $2, $3, $4, $5, $6)
    ON CONFLICT (utilisateur_id, module)
    DO UPDATE SET
      peut_lire = EXCLUDED.peut_lire,
      peut_creer = EXCLUDED.peut_creer,
      peut_modifier = EXCLUDED.peut_modifier,
      peut_supprimer = EXCLUDED.peut_supprimer
    RETURNING *
  `;
  const result = await pool.query(query, [
    utilisateurId,
    module,
    perms.peut_lire,
    perms.peut_creer,
    perms.peut_modifier,
    perms.peut_supprimer,
  ]);
  return rowToPermission(result.rows[0]);
}

export async function deletePermission(
  schema: string,
  utilisateurId: string,
  module: ModuleNormx
): Promise<boolean> {
  const validSchema = getValidatedSchemaName(schema);
  const query = `DELETE FROM "${validSchema}".permissions_modules WHERE utilisateur_id = $1 AND module = $2`;
  const result = await pool.query(query, [utilisateurId, module]);
  return (result.rowCount ?? 0) > 0;
}

export async function hasPermission(
  schema: string,
  utilisateurId: string,
  module: ModuleNormx,
  action: ActionPermission
): Promise<boolean> {
  const validSchema = getValidatedSchemaName(schema);
  const column = ACTION_COLUMN_MAP[action];
  const query = `SELECT ${column} AS allowed FROM "${validSchema}".permissions_modules WHERE utilisateur_id = $1 AND module = $2`;
  const result = await pool.query(query, [utilisateurId, module]);
  if (result.rows.length === 0) return false;
  return Boolean(result.rows[0].allowed);
}

export async function initDefaultPermissions(
  schema: string,
  utilisateurId: string,
  role: string
): Promise<void> {
  const rolePermissions = buildRolePermissions(role);

  for (const entry of rolePermissions) {
    await setPermission(schema, utilisateurId, entry.module, entry.perms);
  }

  logger.info('Permissions initialisees pour %s (role: %s, schema: %s)', utilisateurId, role, schema);
}

// ============ HELPERS INTERNES ============

interface ModulePermissionEntry {
  module: ModuleNormx;
  perms: PermissionFlags;
}

function allTrue(): PermissionFlags {
  return { peut_lire: true, peut_creer: true, peut_modifier: true, peut_supprimer: true };
}

function readOnly(): PermissionFlags {
  return { peut_lire: true, peut_creer: false, peut_modifier: false, peut_supprimer: false };
}

function none(): PermissionFlags {
  return { peut_lire: false, peut_creer: false, peut_modifier: false, peut_supprimer: false };
}

function buildRolePermissions(role: string): ModulePermissionEntry[] {
  switch (role) {
    case 'admin':
      return ALL_MODULES.map((m) => ({ module: m, perms: allTrue() }));

    case 'comptable':
      return [
        { module: 'compta', perms: allTrue() },
        { module: 'etats', perms: allTrue() },
        { module: 'paie', perms: readOnly() },
        { module: 'revision', perms: readOnly() },
        { module: 'assistant', perms: none() },
        { module: 'admin', perms: none() },
      ];

    case 'gestionnaire_paie':
      return [
        { module: 'paie', perms: allTrue() },
        { module: 'compta', perms: readOnly() },
        { module: 'etats', perms: none() },
        { module: 'revision', perms: none() },
        { module: 'assistant', perms: none() },
        { module: 'admin', perms: none() },
      ];

    case 'reviseur':
      return [
        { module: 'revision', perms: allTrue() },
        { module: 'compta', perms: readOnly() },
        { module: 'etats', perms: readOnly() },
        { module: 'paie', perms: none() },
        { module: 'assistant', perms: none() },
        { module: 'admin', perms: none() },
      ];

    case 'lecture_seule':
      return ALL_MODULES.map((m) => ({ module: m, perms: readOnly() }));

    default:
      // Role inconnu : lecture seule par defaut
      return ALL_MODULES.map((m) => ({ module: m, perms: readOnly() }));
  }
}
