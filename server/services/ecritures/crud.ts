// Ecritures — CRUD : creation, liste, validation, mise a jour, suppression.

import pool from '../../db';
import { getValidatedSchemaName } from '../../utils/tenant.utils';
import { withTransaction } from '../../utils/withTransaction';
import type { CreateEcritureInput, EcritureFilters, EcritureLigne } from './types';

export async function createEcriture(schema: string, input: CreateEcritureInput) {
  const s = getValidatedSchemaName(schema);
  const { exercice_id, date_ecriture, journal, numero_piece, libelle, lignes } = input;

  return withTransaction(async (client) => {
    const ecr = await client.query(
      `INSERT INTO "${s}".ecritures (exercice_id, date_ecriture, journal, numero_piece, libelle)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [exercice_id, date_ecriture, journal || 'OD', numero_piece || null, libelle],
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

export async function listEcritures(
  schema: string,
  exercice_id: number,
  filters: EcritureFilters,
  pagination?: { limit: number; offset: number },
) {
  const s = getValidatedSchemaName(schema);
  const { journal, statut, date_du, date_au, search } = filters;

  let whereClause = ` WHERE e.exercice_id = $1`;
  const params: (string | number)[] = [exercice_id];
  let idx = 2;

  if (journal) { whereClause += ` AND e.journal = $${idx}`; params.push(journal); idx++; }
  if (statut) { whereClause += ` AND e.statut = $${idx}`; params.push(statut); idx++; }
  if (date_du) { whereClause += ` AND e.date_ecriture >= $${idx}`; params.push(date_du); idx++; }
  if (date_au) { whereClause += ` AND e.date_ecriture <= $${idx}`; params.push(date_au); idx++; }
  if (search) { whereClause += ` AND (e.libelle ILIKE $${idx} OR e.numero_piece ILIKE $${idx})`; params.push('%' + search + '%'); idx++; }

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
  return pool.query(
    `UPDATE "${s}".ecritures SET statut = 'validee', validee_par = $1, date_validation = NOW()
     WHERE id = ANY($2) AND statut = 'brouillard'
     RETURNING id`,
    [userId, ids],
  );
}

export async function devaliderEcritures(schema: string, ids: number[]) {
  const s = getValidatedSchemaName(schema);
  return pool.query(
    `UPDATE "${s}".ecritures SET statut = 'brouillard', validee_par = NULL, date_validation = NULL
     WHERE id = ANY($1) AND statut = 'validee'
     RETURNING id`,
    [ids],
  );
}

export async function updateEcriture(
  schema: string,
  id: number,
  input: { date_ecriture: string; journal?: string; numero_piece?: string; libelle: string; lignes: EcritureLigne[] },
) {
  const s = getValidatedSchemaName(schema);
  const { date_ecriture, journal, numero_piece, libelle, lignes } = input;

  const check = await pool.query(`SELECT statut FROM "${s}".ecritures WHERE id = $1`, [id]);
  if (check.rows.length === 0) return { notFound: true };
  if (check.rows[0].statut === 'validee') return { forbidden: true };

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    await client.query(
      `UPDATE "${s}".ecritures SET date_ecriture = $1, journal = $2, numero_piece = $3, libelle = $4 WHERE id = $5`,
      [date_ecriture, journal || 'OD', numero_piece || null, libelle, id],
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
  // Atomic : DELETE seulement si non validee (evite race TOCTOU).
  const result = await pool.query(
    `DELETE FROM "${s}".ecritures WHERE id = $1 AND statut != 'validee' RETURNING *`,
    [id],
  );
  if (result.rows.length === 0) {
    const check = await pool.query(`SELECT statut FROM "${s}".ecritures WHERE id = $1`, [id]);
    if (check.rows.length === 0) return { notFound: true };
    return { forbidden: true };
  }
  return { success: true };
}
