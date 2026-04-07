/**
 * Service Ecritures - NormX Multi-Tenant
 * Gestion des ecritures comptables avec schema tenant
 */

import pool from '../db';
import { createLogger } from '../logger';
import cache from '../utils/cache';

const log = createLogger('ecritures');
import { getValidatedSchemaName } from '../utils/tenant.utils';
import { withTransaction } from '../utils/withTransaction';

// ============ INTERFACES ============

interface EcritureLigne {
  numero_compte: string;
  libelle_compte?: string;
  debit?: number | string;
  credit?: number | string;
  tiers_id?: number | null;
}

interface CreateEcritureInput {
  exercice_id: number;
  date_ecriture: string;
  journal?: string;
  numero_piece?: string;
  libelle: string;
  lignes: EcritureLigne[];
}

interface EcritureFilters {
  journal?: string;
  statut?: string;
  date_du?: string;
  date_au?: string;
  search?: string;
}

interface GrandLivreFilters {
  compte?: string;
  journal?: string;
  date_du?: string;
  date_au?: string;
}

interface GrandLivreTiersFilters {
  tiers_id?: string;
  type_tiers?: string;
  date_du?: string;
  date_au?: string;
}

interface BalanceTiersFilters {
  type_tiers?: string;
  date_du?: string;
  date_au?: string;
}

interface EcheancierFilters {
  type_tiers?: string;
  date_du?: string;
  date_au?: string;
  statut?: string;
}

interface LettrageEcrituresFilters {
  statut?: string;
  annee_de?: string;
  annee_a?: string;
}

// ============ ECRITURES CRUD ============

export async function createEcriture(schema: string, input: CreateEcritureInput) {
  const s = getValidatedSchemaName(schema);
  const { exercice_id, date_ecriture, journal, numero_piece, libelle, lignes } = input;

  return withTransaction(async (client) => {
    const ecr = await client.query(
      `INSERT INTO "${s}".ecritures (exercice_id, date_ecriture, journal, numero_piece, libelle)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [exercice_id, date_ecriture, journal || 'OD', numero_piece || null, libelle]
    );
    const ecritureId: number = ecr.rows[0].id;

    if (lignes.length > 0) {
      const values: (string | number | boolean | null)[] = [];
      const placeholders = lignes.map((l, i) => {
        const o = i * 6;
        values.push(ecritureId, l.numero_compte, l.libelle_compte || '', parseFloat(String(l.debit)) || 0, parseFloat(String(l.credit)) || 0, l.tiers_id || null);
        return `($${o+1}, $${o+2}, $${o+3}, $${o+4}, $${o+5}, $${o+6})`;
      });
      await client.query(
        `INSERT INTO "${s}".ecriture_lignes (ecriture_id, numero_compte, libelle_compte, debit, credit, tiers_id)
         VALUES ${placeholders.join(', ')}`,
        values,
      );
    }

    return ecr.rows[0];
  });
}

export async function listEcritures(schema: string, exercice_id: number, filters: EcritureFilters, pagination?: { limit: number; offset: number }) {
  const s = getValidatedSchemaName(schema);
  const { journal, statut, date_du, date_au, search } = filters;

  let whereClause = ` WHERE e.exercice_id = $1`;
  const params: (string | number)[] = [exercice_id];
  let idx = 2;

  if (journal) {
    whereClause += ` AND e.journal = $${idx}`;
    params.push(journal);
    idx++;
  }
  if (statut) {
    whereClause += ` AND e.statut = $${idx}`;
    params.push(statut);
    idx++;
  }
  if (date_du) {
    whereClause += ` AND e.date_ecriture >= $${idx}`;
    params.push(date_du);
    idx++;
  }
  if (date_au) {
    whereClause += ` AND e.date_ecriture <= $${idx}`;
    params.push(date_au);
    idx++;
  }
  if (search) {
    whereClause += ` AND (e.libelle ILIKE $${idx} OR e.numero_piece ILIKE $${idx})`;
    params.push('%' + search + '%');
    idx++;
  }

  // Count total
  const countParams = [...params];
  const countQuery = `SELECT COUNT(DISTINCT e.id) AS total FROM "${s}".ecritures e${whereClause}`;
  const countResult = await pool.query(countQuery, countParams);
  const total = parseInt(countResult.rows[0].total, 10);

  let query = `
    SELECT e.*, json_agg(
      json_build_object('id', el.id, 'numero_compte', el.numero_compte, 'libelle_compte', el.libelle_compte, 'debit', el.debit, 'credit', el.credit, 'tiers_id', el.tiers_id, 'tiers_nom', t.nom)
      ORDER BY el.id
    ) AS lignes
    FROM "${s}".ecritures e
    JOIN "${s}".ecriture_lignes el ON el.ecriture_id = e.id
    LEFT JOIN "${s}".tiers t ON t.id = el.tiers_id
    ${whereClause}
     GROUP BY e.id ORDER BY e.date_ecriture, e.id`;

  if (pagination) {
    query += ` LIMIT $${idx} OFFSET $${idx + 1}`;
    params.push(pagination.limit, pagination.offset);
  }

  const result = await pool.query(query, params);
  return { rows: result.rows, total };
}

export async function validerEcritures(schema: string, ids: number[], userId: number | null) {
  const s = getValidatedSchemaName(schema);
  const result = await pool.query(
    `UPDATE "${s}".ecritures SET statut = 'validee', validee_par = $1, date_validation = NOW()
     WHERE id = ANY($2) AND statut = 'brouillard'
     RETURNING id`,
    [userId, ids]
  );
  return result;
}

export async function devaliderEcritures(schema: string, ids: number[]) {
  const s = getValidatedSchemaName(schema);
  const result = await pool.query(
    `UPDATE "${s}".ecritures SET statut = 'brouillard', validee_par = NULL, date_validation = NULL
     WHERE id = ANY($1) AND statut = 'validee'
     RETURNING id`,
    [ids]
  );
  return result;
}

export async function updateEcriture(schema: string, id: number, input: { date_ecriture: string; journal?: string; numero_piece?: string; libelle: string; lignes: EcritureLigne[] }) {
  const s = getValidatedSchemaName(schema);
  const { date_ecriture, journal, numero_piece, libelle, lignes } = input;

  // Verifier statut
  const check = await pool.query(`SELECT statut FROM "${s}".ecritures WHERE id = $1`, [id]);
  if (check.rows.length === 0) return { notFound: true };
  if (check.rows[0].statut === 'validee') return { forbidden: true };

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    await client.query(
      `UPDATE "${s}".ecritures SET date_ecriture = $1, journal = $2, numero_piece = $3, libelle = $4 WHERE id = $5`,
      [date_ecriture, journal || 'OD', numero_piece || null, libelle, id]
    );

    await client.query(`DELETE FROM "${s}".ecriture_lignes WHERE ecriture_id = $1`, [id]);

    if (lignes.length > 0) {
      const values: (string | number | boolean | null)[] = [];
      const placeholders = lignes.map((l, i) => {
        const o = i * 6;
        values.push(id, l.numero_compte, l.libelle_compte || '', parseFloat(String(l.debit)) || 0, parseFloat(String(l.credit)) || 0, l.tiers_id || null);
        return `($${o+1}, $${o+2}, $${o+3}, $${o+4}, $${o+5}, $${o+6})`;
      });
      await client.query(
        `INSERT INTO "${s}".ecriture_lignes (ecriture_id, numero_compte, libelle_compte, debit, credit, tiers_id)
         VALUES ${placeholders.join(', ')}`,
        values,
      );
    }

    await client.query('COMMIT');
    return { success: true };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    try { client.release(); } catch { /* ignore */ }
  }
}

export async function deleteEcriture(schema: string, id: number) {
  const s = getValidatedSchemaName(schema);
  // Atomic: DELETE seulement si non validee (evite race condition TOCTOU)
  const result = await pool.query(
    `DELETE FROM "${s}".ecritures WHERE id = $1 AND statut != 'validee' RETURNING *`,
    [id]
  );
  if (result.rows.length === 0) {
    // Verifier si elle existe pour distinguer notFound vs forbidden
    const check = await pool.query(`SELECT statut FROM "${s}".ecritures WHERE id = $1`, [id]);
    if (check.rows.length === 0) return { notFound: true };
    return { forbidden: true };
  }
  return { success: true };
}

// ============ GRAND LIVRE ============

export async function getGrandLivre(schema: string, exercice_id: number, filters: GrandLivreFilters, pagination?: { limit: number; offset: number }) {
  const s = getValidatedSchemaName(schema);
  const { compte, journal, date_du, date_au } = filters;

  let whereClause = ` WHERE e.exercice_id = $1 AND e.statut = 'validee'`;
  const params: (string | number)[] = [exercice_id];
  let idx = 2;

  if (compte) {
    whereClause += ` AND el.numero_compte LIKE $${idx}`;
    params.push(compte + '%');
    idx++;
  }
  if (journal) {
    whereClause += ` AND e.journal = $${idx}`;
    params.push(journal);
    idx++;
  }
  if (date_du) {
    whereClause += ` AND e.date_ecriture >= $${idx}`;
    params.push(date_du);
    idx++;
  }
  if (date_au) {
    whereClause += ` AND e.date_ecriture <= $${idx}`;
    params.push(date_au);
    idx++;
  }

  const countParams = [...params];
  const countQuery = `SELECT COUNT(*) AS total FROM "${s}".ecriture_lignes el JOIN "${s}".ecritures e ON e.id = el.ecriture_id${whereClause}`;
  const countResult = await pool.query(countQuery, countParams);
  const total = parseInt(countResult.rows[0].total, 10);

  let query = `
    SELECT el.numero_compte, el.libelle_compte, el.debit, el.credit,
           e.date_ecriture, e.libelle AS libelle_ecriture, e.numero_piece, e.journal
    FROM "${s}".ecriture_lignes el
    JOIN "${s}".ecritures e ON e.id = el.ecriture_id
    ${whereClause}
     ORDER BY el.numero_compte, e.date_ecriture, e.id`;

  if (pagination) {
    query += ` LIMIT $${idx} OFFSET $${idx + 1}`;
    params.push(pagination.limit, pagination.offset);
  }

  const result = await pool.query(query, params);
  return { rows: result.rows, total };
}

// ============ BALANCE GENEREE ============

export async function getBalanceFromEcritures(schema: string, exercice_id: number) {
  const s = getValidatedSchemaName(schema);
  const result = await pool.query(
    `SELECT el.numero_compte,
            MAX(el.libelle_compte) AS libelle_compte,
            SUM(el.debit) AS debit,
            SUM(el.credit) AS credit,
            GREATEST(SUM(el.debit) - SUM(el.credit), 0) AS solde_debiteur,
            GREATEST(SUM(el.credit) - SUM(el.debit), 0) AS solde_crediteur
     FROM "${s}".ecriture_lignes el
     JOIN "${s}".ecritures e ON e.id = el.ecriture_id
     WHERE e.exercice_id = $1 AND e.statut = 'validee'
     GROUP BY el.numero_compte
     ORDER BY el.numero_compte`,
    [exercice_id]
  );
  return result.rows;
}

// ============ GRAND LIVRE TIERS ============

export async function getGrandLivreTiers(schema: string, exercice_id: number, filters: GrandLivreTiersFilters) {
  const s = getValidatedSchemaName(schema);
  const { tiers_id, type_tiers, date_du, date_au } = filters;

  let query = `
    SELECT el.numero_compte, el.libelle_compte, el.debit, el.credit, el.tiers_id,
           t.nom AS tiers_nom, t.code_tiers, t.type AS tiers_type,
           e.date_ecriture, e.libelle AS libelle_ecriture, e.numero_piece, e.journal
    FROM "${s}".ecriture_lignes el
    JOIN "${s}".ecritures e ON e.id = el.ecriture_id
    JOIN "${s}".tiers t ON t.id = el.tiers_id
    WHERE e.exercice_id = $1 AND e.statut = 'validee' AND el.tiers_id IS NOT NULL`;
  const params: (string | number)[] = [exercice_id];
  let idx = 2;

  if (tiers_id) {
    query += ` AND el.tiers_id = $${idx}`;
    params.push(tiers_id);
    idx++;
  }
  if (type_tiers) {
    query += ` AND t.type = $${idx}`;
    params.push(type_tiers);
    idx++;
  }
  if (date_du) {
    query += ` AND e.date_ecriture >= $${idx}`;
    params.push(date_du);
    idx++;
  }
  if (date_au) {
    query += ` AND e.date_ecriture <= $${idx}`;
    params.push(date_au);
    idx++;
  }

  query += ` ORDER BY t.nom, e.date_ecriture, e.id LIMIT 5000`;
  const result = await pool.query(query, params);
  return result.rows;
}

// ============ BALANCE TIERS ============

export async function getBalanceTiers(schema: string, exercice_id: number, filters: BalanceTiersFilters, pagination?: { limit: number; offset: number }) {
  const s = getValidatedSchemaName(schema);
  const { type_tiers, date_du, date_au } = filters;

  let whereClause = ` WHERE e.exercice_id = $1 AND e.statut = 'validee' AND el.tiers_id IS NOT NULL`;
  const params: (string | number)[] = [exercice_id];
  let idx = 2;

  if (type_tiers) {
    whereClause += ` AND t.type = $${idx}`;
    params.push(type_tiers);
    idx++;
  }
  if (date_du) {
    whereClause += ` AND e.date_ecriture >= $${idx}`;
    params.push(date_du);
    idx++;
  }
  if (date_au) {
    whereClause += ` AND e.date_ecriture <= $${idx}`;
    params.push(date_au);
    idx++;
  }

  const countParams = [...params];
  const countQuery = `SELECT COUNT(DISTINCT el.tiers_id) AS total FROM "${s}".ecriture_lignes el JOIN "${s}".ecritures e ON e.id = el.ecriture_id JOIN "${s}".tiers t ON t.id = el.tiers_id${whereClause}`;
  const countResult = await pool.query(countQuery, countParams);
  const total = parseInt(countResult.rows[0].total, 10);

  let query = `
    SELECT el.tiers_id,
           t.nom AS tiers_nom, t.code_tiers, t.type AS tiers_type, t.compte_comptable,
           SUM(el.debit) AS debit,
           SUM(el.credit) AS credit,
           GREATEST(SUM(el.debit) - SUM(el.credit), 0) AS solde_debiteur,
           GREATEST(SUM(el.credit) - SUM(el.debit), 0) AS solde_crediteur
    FROM "${s}".ecriture_lignes el
    JOIN "${s}".ecritures e ON e.id = el.ecriture_id
    JOIN "${s}".tiers t ON t.id = el.tiers_id
    ${whereClause}
     GROUP BY el.tiers_id, t.nom, t.code_tiers, t.type, t.compte_comptable
             ORDER BY t.type, t.nom`;

  if (pagination) {
    query += ` LIMIT $${idx} OFFSET $${idx + 1}`;
    params.push(pagination.limit, pagination.offset);
  }

  const result = await pool.query(query, params);
  return { rows: result.rows, total };
}

// ============ STATS ============

export async function getStats(schema: string, exercice_id: number) {
  const cacheKey = `stats:${schema}:${exercice_id}`;
  const cached = cache.get<{ nb_ecritures: number; total_debit: number; total_credit: number; nb_comptes: number }>(cacheKey);
  if (cached) return cached;

  const s = getValidatedSchemaName(schema);

  const result = await pool.query(
    `SELECT
       COUNT(DISTINCT e.id) AS nb_ecritures,
       COALESCE(SUM(el.debit), 0) AS total_debit,
       COALESCE(SUM(el.credit), 0) AS total_credit,
       COUNT(DISTINCT el.numero_compte) AS nb_comptes
     FROM "${s}".ecritures e
     LEFT JOIN "${s}".ecriture_lignes el ON el.ecriture_id = e.id
     WHERE e.exercice_id = $1`,
    [exercice_id]
  );

  const row = result.rows[0];
  const stats = {
    nb_ecritures: parseInt(row.nb_ecritures, 10),
    total_debit: parseFloat(row.total_debit),
    total_credit: parseFloat(row.total_credit),
    nb_comptes: parseInt(row.nb_comptes, 10),
  };

  cache.set(cacheKey, stats, 60_000); // 1 minute TTL
  return stats;
}

// ============ RAPPORTS ============

export async function getJournalCentralisateur(schema: string, exercice_id: number) {
  const s = getValidatedSchemaName(schema);
  const result = await pool.query(`
    SELECT e.journal,
           EXTRACT(MONTH FROM e.date_ecriture)::int AS mois,
           COUNT(DISTINCT e.id) AS nb_ecritures,
           COALESCE(SUM(el.debit), 0) AS total_debit,
           COALESCE(SUM(el.credit), 0) AS total_credit
    FROM "${s}".ecritures e
    JOIN "${s}".ecriture_lignes el ON el.ecriture_id = e.id
    WHERE e.exercice_id = $1 AND e.statut = 'validee'
    GROUP BY e.journal, EXTRACT(MONTH FROM e.date_ecriture)
    ORDER BY e.journal, mois
  `, [exercice_id]);
  return result.rows;
}

export async function getBalanceAgee(schema: string, exercice_id: number) {
  const s = getValidatedSchemaName(schema);
  const result = await pool.query(`
    SELECT el.tiers_id, t.nom AS tiers_nom, t.code_tiers, t.type AS tiers_type,
           e.date_ecriture, el.debit, el.credit, el.lettrage_code
    FROM "${s}".ecriture_lignes el
    JOIN "${s}".ecritures e ON e.id = el.ecriture_id
    JOIN "${s}".tiers t ON t.id = el.tiers_id
    WHERE e.exercice_id = $1 AND e.statut = 'validee'
      AND el.tiers_id IS NOT NULL
      AND (el.lettrage_code IS NULL OR el.lettrage_code = '')
    ORDER BY t.nom, e.date_ecriture
    LIMIT 5000
  `, [exercice_id]);
  return result.rows;
}

export async function getTresorerie(schema: string, exercice_id: number) {
  const s = getValidatedSchemaName(schema);
  const result = await pool.query(`
    SELECT EXTRACT(MONTH FROM e.date_ecriture)::int AS mois,
           el.numero_compte,
           COALESCE(SUM(el.debit), 0) AS total_debit,
           COALESCE(SUM(el.credit), 0) AS total_credit
    FROM "${s}".ecriture_lignes el
    JOIN "${s}".ecritures e ON e.id = el.ecriture_id
    WHERE e.exercice_id = $1 AND e.statut = 'validee'
      AND el.numero_compte LIKE '5%'
    GROUP BY mois, el.numero_compte
    ORDER BY el.numero_compte, mois
  `, [exercice_id]);
  return result.rows;
}

export async function getRepartitionCharges(schema: string, exercice_id: number) {
  const s = getValidatedSchemaName(schema);
  const result = await pool.query(`
    SELECT LEFT(el.numero_compte, 2) AS poste,
           el.numero_compte, el.libelle_compte,
           COALESCE(SUM(el.debit), 0) AS total_debit,
           COALESCE(SUM(el.credit), 0) AS total_credit
    FROM "${s}".ecriture_lignes el
    JOIN "${s}".ecritures e ON e.id = el.ecriture_id
    WHERE e.exercice_id = $1 AND e.statut = 'validee'
      AND el.numero_compte LIKE '6%'
    GROUP BY el.numero_compte, el.libelle_compte
    ORDER BY el.numero_compte
  `, [exercice_id]);
  return result.rows;
}

export async function getComparatif(schema: string, exercice_id: number, exercice_id_n1: number | null) {
  const s = getValidatedSchemaName(schema);
  const balN = await pool.query(`
    SELECT LEFT(el.numero_compte, 2) AS poste,
           COALESCE(SUM(el.debit), 0) AS debit, COALESCE(SUM(el.credit), 0) AS credit
    FROM "${s}".ecriture_lignes el JOIN "${s}".ecritures e ON e.id = el.ecriture_id
    WHERE e.exercice_id = $1 AND e.statut = 'validee'
    GROUP BY LEFT(el.numero_compte, 2) ORDER BY poste
  `, [exercice_id]);

  let balN1 = { rows: [] as Record<string, string | number>[] };
  if (exercice_id_n1) {
    balN1 = await pool.query(`
      SELECT LEFT(el.numero_compte, 2) AS poste,
             COALESCE(SUM(el.debit), 0) AS debit, COALESCE(SUM(el.credit), 0) AS credit
      FROM "${s}".ecriture_lignes el JOIN "${s}".ecritures e ON e.id = el.ecriture_id
      WHERE e.exercice_id = $1 AND e.statut = 'validee'
      GROUP BY LEFT(el.numero_compte, 2) ORDER BY poste
    `, [exercice_id_n1]);
  }
  return { n: balN.rows, n1: balN1.rows };
}

export async function getTableauBord(schema: string, exercice_id: number) {
  const s = getValidatedSchemaName(schema);

  // Une seule requete pour les 3 agregations (classes, mensuel, tresorerie)
  const result = await pool.query(`
    WITH base AS (
      SELECT el.numero_compte, el.debit, el.credit, e.date_ecriture
      FROM "${s}".ecriture_lignes el
      JOIN "${s}".ecritures e ON e.id = el.ecriture_id
      WHERE e.exercice_id = $1 AND e.statut = 'validee'
    )
    SELECT 'classe' AS metric, LEFT(numero_compte, 1) AS key, NULL::int AS mois,
           COALESCE(SUM(debit), 0) AS val1, COALESCE(SUM(credit), 0) AS val2
    FROM base GROUP BY LEFT(numero_compte, 1)
    UNION ALL
    SELECT 'mensuel' AS metric, NULL AS key, EXTRACT(MONTH FROM date_ecriture)::int AS mois,
           COALESCE(SUM(CASE WHEN numero_compte LIKE '7%' THEN credit - debit ELSE 0 END), 0) AS val1,
           COALESCE(SUM(CASE WHEN numero_compte LIKE '6%' THEN debit - credit ELSE 0 END), 0) AS val2
    FROM base GROUP BY EXTRACT(MONTH FROM date_ecriture)::int
    UNION ALL
    SELECT 'treso' AS metric, NULL AS key, NULL AS mois,
           COALESCE(SUM(debit), 0) AS val1, COALESCE(SUM(credit), 0) AS val2
    FROM base WHERE numero_compte LIKE '5%'
    ORDER BY metric, key, mois
  `, [exercice_id]);

  const classes: { classe: string; debit: number; credit: number }[] = [];
  const mensuel: { mois: number; produits: number; charges: number }[] = [];
  let tresorerie = { debit: 0, credit: 0 };

  for (const row of result.rows) {
    if (row.metric === 'classe') {
      classes.push({ classe: row.key, debit: row.val1, credit: row.val2 });
    } else if (row.metric === 'mensuel') {
      mensuel.push({ mois: row.mois, produits: row.val1, charges: row.val2 });
    } else if (row.metric === 'treso') {
      tresorerie = { debit: row.val1, credit: row.val2 };
    }
  }

  return { classes, mensuel, tresorerie };
}

export async function getEcheancier(schema: string, exercice_id: number, filters: EcheancierFilters) {
  const s = getValidatedSchemaName(schema);
  const { type_tiers, date_du, date_au } = filters;

  let query = `
    SELECT el.id, el.debit, el.credit, el.lettrage_code, el.tiers_id,
           t.nom AS tiers_nom, t.type AS tiers_type,
           e.date_ecriture AS date_echeance, e.numero_piece, e.libelle
    FROM "${s}".ecriture_lignes el
    JOIN "${s}".ecritures e ON e.id = el.ecriture_id
    JOIN "${s}".tiers t ON t.id = el.tiers_id
    WHERE e.exercice_id = $1 AND e.statut = 'validee' AND el.tiers_id IS NOT NULL`;
  const params: (string | number)[] = [exercice_id];
  let idx = 2;

  if (type_tiers) { query += ` AND t.type = $${idx}`; params.push(type_tiers); idx++; }
  if (date_du) { query += ` AND e.date_ecriture >= $${idx}`; params.push(date_du); idx++; }
  if (date_au) { query += ` AND e.date_ecriture <= $${idx}`; params.push(date_au); idx++; }

  query += ` ORDER BY e.date_ecriture, t.nom LIMIT 5000`;
  const result = await pool.query(query, params);
  return result.rows;
}

// ============ LETTRAGE ============

export async function getLettreTiers(schema: string, exercice_id: number, type_tiers?: string) {
  const s = getValidatedSchemaName(schema);

  let query = `
    SELECT t.id, t.nom, t.code_tiers, t.type, t.compte_comptable,
           COALESCE(SUM(el.debit), 0) AS total_debit,
           COALESCE(SUM(el.credit), 0) AS total_credit,
           COALESCE(SUM(el.debit), 0) - COALESCE(SUM(el.credit), 0) AS solde
    FROM "${s}".tiers t
    LEFT JOIN "${s}".ecriture_lignes el ON el.tiers_id = t.id
    LEFT JOIN "${s}".ecritures e ON e.id = el.ecriture_id AND e.exercice_id = $1 AND e.statut = 'validee'
    WHERE t.actif = TRUE`;
  const params: (string | number | string[])[] = [exercice_id];
  let idx = 2;

  if (type_tiers) {
    const types = type_tiers.split(',');
    query += ` AND t.type = ANY($${idx}::text[])`;
    params.push(types);
    idx++;
  }
  query += ` GROUP BY t.id, t.nom, t.code_tiers, t.type, t.compte_comptable ORDER BY t.type, t.nom`;
  const result = await pool.query(query, params);
  return result.rows;
}

export async function getLettreEcritures(schema: string, exercice_id: number, tiers_id: number, filters: LettrageEcrituresFilters) {
  const s = getValidatedSchemaName(schema);
  const { statut, annee_de, annee_a } = filters;

  let query = `
    SELECT el.id, el.numero_compte, el.libelle_compte, el.debit, el.credit, el.lettrage_code, el.tiers_id,
           e.date_ecriture, e.libelle AS libelle_ecriture, e.numero_piece, e.journal, e.id AS ecriture_id
    FROM "${s}".ecriture_lignes el
    JOIN "${s}".ecritures e ON e.id = el.ecriture_id
    WHERE e.exercice_id = $1 AND el.tiers_id = $2 AND e.statut = 'validee'`;
  const params: (string | number)[] = [exercice_id, tiers_id];
  let idx = 3;

  if (statut === 'non_lettrees') {
    query += ` AND (el.lettrage_code IS NULL OR el.lettrage_code = '')`;
  } else if (statut === 'lettrees') {
    query += ` AND el.lettrage_code IS NOT NULL AND el.lettrage_code != ''`;
  }
  if (annee_de) {
    query += ` AND EXTRACT(YEAR FROM e.date_ecriture) >= $${idx}`;
    params.push(parseInt(annee_de, 10));
    idx++;
  }
  if (annee_a) {
    query += ` AND EXTRACT(YEAR FROM e.date_ecriture) <= $${idx}`;
    params.push(parseInt(annee_a, 10));
    idx++;
  }

  query += ` ORDER BY e.date_ecriture, e.id, el.id`;
  const result = await pool.query(query, params);
  return result.rows;
}

export async function lettrer(schema: string, ligneIds: number[]) {
  const s = getValidatedSchemaName(schema);

  // Verifier equilibre
  const check = await pool.query(
    `SELECT COALESCE(SUM(debit), 0) - COALESCE(SUM(credit), 0) AS ecart FROM "${s}".ecriture_lignes WHERE id = ANY($1::int[])`,
    [ligneIds]
  );
  const ecart = parseFloat(check.rows[0].ecart);
  if (Math.abs(ecart) > 0.01) {
    return { error: `Ecart non nul: ${ecart.toFixed(2)}. Les lignes selectionnees doivent s'equilibrer.` };
  }

  // Verifier pas deja lettrees
  const already = await pool.query(
    `SELECT COUNT(*) FROM "${s}".ecriture_lignes WHERE id = ANY($1::int[]) AND lettrage_code IS NOT NULL AND lettrage_code != ''`,
    [ligneIds]
  );
  if (parseInt(already.rows[0].count, 10) > 0) {
    return { error: 'Certaines lignes sont deja lettrees.' };
  }

  // Generer code unique
  const lastCode = await pool.query(
    `SELECT MAX(el.lettrage_code) AS last_code FROM "${s}".ecriture_lignes el
     WHERE el.lettrage_code IS NOT NULL AND el.lettrage_code != ''`
  );
  let newCode = 'AAA';
  if (lastCode.rows[0].last_code) {
    const lc: string = lastCode.rows[0].last_code;
    const chars = lc.split('').map(c => c.charCodeAt(0));
    chars[2]++;
    if (chars[2] > 90) { chars[2] = 65; chars[1]++; }
    if (chars[1] > 90) { chars[1] = 65; chars[0]++; }
    newCode = chars.map(c => String.fromCharCode(c)).join('');
  }

  await pool.query(
    `UPDATE "${s}".ecriture_lignes SET lettrage_code = $1 WHERE id = ANY($2::int[])`,
    [newCode, ligneIds]
  );
  return { code: newCode, count: ligneIds.length };
}

export async function delettrer(schema: string, lettrageCode: string) {
  const s = getValidatedSchemaName(schema);
  const result = await pool.query(
    `UPDATE "${s}".ecriture_lignes SET lettrage_code = NULL
     WHERE lettrage_code = $1 AND ecriture_id IN (SELECT id FROM "${s}".ecritures)`,
    [lettrageCode]
  );
  return { deleted: result.rowCount };
}
