/**
 * Service Rubriques - NormX Paie
 * CRUD pour les rubriques de paie dynamiques (lignes de bulletin)
 * Congo-Brazzaville - ITS uniquement (Art. 116 CGI 2026)
 * Multi-tenant : isolation par schema PostgreSQL
 */

import pool from '../db';
import logger from '../logger';
import { getValidatedSchemaName } from '../utils/tenant.utils';

// ============ INTERFACES ============

export interface Rubrique {
  id: number;
  code: string;
  libelle: string;
  type: 'gain' | 'retenue' | 'cotisation' | 'indemnite' | 'avantage';
  mode: 'pourcentage' | 'fixe' | 'horaire' | 'variable';
  taux: number | null;
  montant: number | null;
  plafond: number | null;
  base: string | null;
  imposable: boolean;
  actif: boolean;
  ordre: number;
}

export interface CreateRubriqueInput {
  code: string;
  libelle: string;
  type: string;
  mode: string;
  taux?: number;
  montant?: number;
  plafond?: number;
  base?: string;
  imposable?: boolean;
  actif?: boolean;
  ordre?: number;
}

export interface UpdateRubriqueInput {
  libelle?: string;
  type?: string;
  mode?: string;
  taux?: number;
  montant?: number;
  plafond?: number;
  base?: string;
  imposable?: boolean;
  actif?: boolean;
  ordre?: number;
}

// ============ RUBRIQUES PAR DEFAUT (Congo-Brazzaville) ============

interface RubriqueDefaut {
  code: string;
  libelle: string;
  type: 'gain' | 'retenue' | 'cotisation' | 'indemnite' | 'avantage';
  mode: 'pourcentage' | 'fixe' | 'horaire' | 'variable';
  taux: number | null;
  montant: number | null;
  plafond: number | null;
  base: string | null;
  imposable: boolean;
  ordre: number;
}

const RUBRIQUES_DEFAUT: RubriqueDefaut[] = [
  {
    code: 'SAL_BASE',
    libelle: 'Salaire de base',
    type: 'gain',
    mode: 'fixe',
    taux: null,
    montant: null,
    plafond: null,
    base: null,
    imposable: true,
    ordre: 10,
  },
  {
    code: 'CNSS_SAL',
    libelle: 'CNSS salariale (4%)',
    type: 'retenue',
    mode: 'pourcentage',
    taux: 4.0,
    montant: null,
    plafond: 1200000,
    base: 'brut',
    imposable: false,
    ordre: 100,
  },
  {
    code: 'CNSS_PAT_PVID',
    libelle: 'CNSS patronale vieillesse (8%)',
    type: 'cotisation',
    mode: 'pourcentage',
    taux: 8.0,
    montant: null,
    plafond: 1200000,
    base: 'brut',
    imposable: false,
    ordre: 110,
  },
  {
    code: 'CNSS_PAT_AF',
    libelle: 'CNSS patronale alloc. familiales (10,03%)',
    type: 'cotisation',
    mode: 'pourcentage',
    taux: 10.03,
    montant: null,
    plafond: 600000,
    base: 'brut',
    imposable: false,
    ordre: 120,
  },
  {
    code: 'CNSS_PAT_AT',
    libelle: 'CNSS patronale accidents travail (2,25%)',
    type: 'cotisation',
    mode: 'pourcentage',
    taux: 2.25,
    montant: null,
    plafond: 600000,
    base: 'brut',
    imposable: false,
    ordre: 130,
  },
  {
    code: 'ITS',
    libelle: 'ITS (Impot sur les Traitements et Salaires)',
    type: 'retenue',
    mode: 'pourcentage',
    taux: null,
    montant: null,
    plafond: null,
    base: 'net_imposable',
    imposable: false,
    ordre: 200,
  },
  {
    code: 'TUS_IMPOT',
    libelle: 'TUS part impot (1,5%)',
    type: 'cotisation',
    mode: 'pourcentage',
    taux: 1.5,
    montant: null,
    plafond: null,
    base: 'brut',
    imposable: false,
    ordre: 210,
  },
  {
    code: 'TUS_CNSS',
    libelle: 'TUS part CNSS (6%)',
    type: 'cotisation',
    mode: 'pourcentage',
    taux: 6.0,
    montant: null,
    plafond: null,
    base: 'brut',
    imposable: false,
    ordre: 220,
  },
  {
    code: 'TOL',
    libelle: 'TOL (Taxe d\'Occupation des Locaux)',
    type: 'retenue',
    mode: 'fixe',
    taux: null,
    montant: 5000,
    plafond: null,
    base: null,
    imposable: false,
    ordre: 300,
  },
  {
    code: 'CAMU',
    libelle: 'CAMU (Assurance Maladie Universelle 0,5%)',
    type: 'retenue',
    mode: 'pourcentage',
    taux: 0.5,
    montant: null,
    plafond: null,
    base: 'net_imposable',
    imposable: false,
    ordre: 310,
  },
  {
    code: 'TAXE_REG',
    libelle: 'Taxe regionale (2 400 FCFA/an)',
    type: 'retenue',
    mode: 'fixe',
    taux: null,
    montant: 2400,
    plafond: null,
    base: null,
    imposable: false,
    ordre: 320,
  },
];

// ============ CRUD ============

export async function getRubriques(schema: string): Promise<Rubrique[]> {
  const s = getValidatedSchemaName(schema);
  const result = await pool.query(
    `SELECT * FROM "${s}".rubriques ORDER BY ordre ASC, code ASC`,
  );
  return result.rows;
}

export async function getRubriquesByType(schema: string, type: string): Promise<Rubrique[]> {
  const s = getValidatedSchemaName(schema);
  const result = await pool.query(
    `SELECT * FROM "${s}".rubriques WHERE type = $1 ORDER BY ordre ASC, code ASC`,
    [type],
  );
  return result.rows;
}

export async function createRubrique(schema: string, input: CreateRubriqueInput): Promise<Rubrique> {
  const s = getValidatedSchemaName(schema);
  const {
    code, libelle, type, mode,
    taux, montant, plafond, base,
    imposable, actif, ordre,
  } = input;

  const result = await pool.query(
    `INSERT INTO "${s}".rubriques (code, libelle, type, mode, taux, montant, plafond, base, imposable, actif, ordre)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
     RETURNING *`,
    [
      code, libelle, type, mode,
      taux ?? null, montant ?? null, plafond ?? null, base ?? null,
      imposable ?? true, actif ?? true, ordre ?? 0,
    ],
  );
  logger.info('Rubrique creee: %s (%s) dans schema %s', code, libelle, s);
  return result.rows[0];
}

export async function updateRubrique(schema: string, id: number, input: UpdateRubriqueInput): Promise<Rubrique | null> {
  const s = getValidatedSchemaName(schema);
  const {
    libelle, type, mode,
    taux, montant, plafond, base,
    imposable, actif, ordre,
  } = input;

  const result = await pool.query(
    `UPDATE "${s}".rubriques SET
      libelle = COALESCE($1, libelle),
      type = COALESCE($2, type),
      mode = COALESCE($3, mode),
      taux = COALESCE($4, taux),
      montant = COALESCE($5, montant),
      plafond = COALESCE($6, plafond),
      base = COALESCE($7, base),
      imposable = COALESCE($8, imposable),
      actif = COALESCE($9, actif),
      ordre = COALESCE($10, ordre),
      updated_at = NOW()
    WHERE id = $11 RETURNING *`,
    [
      libelle ?? null, type ?? null, mode ?? null,
      taux ?? null, montant ?? null, plafond ?? null, base ?? null,
      imposable ?? null, actif ?? null, ordre ?? null,
      id,
    ],
  );
  if (result.rows[0]) {
    logger.info('Rubrique mise a jour: id=%d dans schema %s', id, s);
  }
  return result.rows[0] || null;
}

export async function deleteRubrique(schema: string, id: number): Promise<boolean> {
  const s = getValidatedSchemaName(schema);
  const result = await pool.query(
    `UPDATE "${s}".rubriques SET actif = false, updated_at = NOW() WHERE id = $1 RETURNING id`,
    [id],
  );
  if (result.rows.length > 0) {
    logger.info('Rubrique desactivee: id=%d dans schema %s', id, s);
  }
  return result.rows.length > 0;
}

export async function initRubriquesDefaut(schema: string): Promise<Rubrique[]> {
  const s = getValidatedSchemaName(schema);

  // Verifier si des rubriques existent deja
  const existing = await pool.query(
    `SELECT COUNT(*) as count FROM "${s}".rubriques`,
  );

  if (Number(existing.rows[0].count) > 0) {
    logger.info('Rubriques par defaut ignorees: schema %s a deja %s rubrique(s)', s, existing.rows[0].count);
    return getRubriques(schema);
  }

  // Inserer les rubriques par defaut
  const inserted: Rubrique[] = [];
  for (const rub of RUBRIQUES_DEFAUT) {
    const result = await pool.query(
      `INSERT INTO "${s}".rubriques (code, libelle, type, mode, taux, montant, plafond, base, imposable, actif, ordre)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, true, $10)
       ON CONFLICT (code) DO NOTHING
       RETURNING *`,
      [
        rub.code, rub.libelle, rub.type, rub.mode,
        rub.taux, rub.montant, rub.plafond, rub.base,
        rub.imposable, rub.ordre,
      ],
    );
    if (result.rows[0]) {
      inserted.push(result.rows[0]);
    }
  }

  logger.info('Rubriques par defaut initialisees: %d rubrique(s) pour schema %s', inserted.length, s);
  return inserted;
}
