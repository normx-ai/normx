// Grand livre et balance des tiers derives des ecritures validees.

import pool from '../../db';
import { getValidatedSchemaName } from '../../utils/tenant.utils';
import type { BalanceTiersFilters, GrandLivreTiersFilters } from './types';

export async function getGrandLivreTiers(
  schema: string,
  exercice_id: number,
  filters: GrandLivreTiersFilters,
) {
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

  if (tiers_id) { query += ` AND el.tiers_id = $${idx}`; params.push(tiers_id); idx++; }
  if (type_tiers) { query += ` AND t.type = $${idx}`; params.push(type_tiers); idx++; }
  if (date_du) { query += ` AND e.date_ecriture >= $${idx}`; params.push(date_du); idx++; }
  if (date_au) { query += ` AND e.date_ecriture <= $${idx}`; params.push(date_au); idx++; }

  query += ` ORDER BY t.nom, e.date_ecriture, e.id LIMIT $${idx} OFFSET $${idx + 1}`;
  params.push(filters.limit ?? 1000, filters.offset ?? 0);
  const result = await pool.query(query, params);
  return result.rows;
}

export async function getBalanceTiers(
  schema: string,
  exercice_id: number,
  filters: BalanceTiersFilters,
  pagination?: { limit: number; offset: number },
) {
  const s = getValidatedSchemaName(schema);
  const { type_tiers, date_du, date_au } = filters;

  let whereClause = ` WHERE e.exercice_id = $1 AND e.statut = 'validee' AND el.tiers_id IS NOT NULL`;
  const params: (string | number)[] = [exercice_id];
  let idx = 2;

  if (type_tiers) { whereClause += ` AND t.type = $${idx}`; params.push(type_tiers); idx++; }
  if (date_du) { whereClause += ` AND e.date_ecriture >= $${idx}`; params.push(date_du); idx++; }
  if (date_au) { whereClause += ` AND e.date_ecriture <= $${idx}`; params.push(date_au); idx++; }

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
