// Grand livre : liste paginee des lignes d'ecriture validees, filtrees
// par compte, journal et fenetre de dates.

import pool from '../../db';
import { getValidatedSchemaName } from '../../utils/tenant.utils';
import type { GrandLivreFilters } from './types';

export async function getGrandLivre(
  schema: string,
  exercice_id: number,
  filters: GrandLivreFilters,
  pagination?: { limit: number; offset: number },
) {
  const s = getValidatedSchemaName(schema);
  const { compte, journal, date_du, date_au } = filters;

  let whereClause = ` WHERE e.exercice_id = $1 AND e.statut = 'validee'`;
  const params: (string | number)[] = [exercice_id];
  let idx = 2;

  if (compte) { whereClause += ` AND el.numero_compte LIKE $${idx}`; params.push(compte + '%'); idx++; }
  if (journal) { whereClause += ` AND e.journal = $${idx}`; params.push(journal); idx++; }
  if (date_du) { whereClause += ` AND e.date_ecriture >= $${idx}`; params.push(date_du); idx++; }
  if (date_au) { whereClause += ` AND e.date_ecriture <= $${idx}`; params.push(date_au); idx++; }

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
