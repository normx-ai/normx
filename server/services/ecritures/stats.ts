// Statistiques globales de l'exercice (nb ecritures, totaux debit/credit,
// nb comptes distincts). Cache memoire 60s.

import pool from '../../db';
import cache from '../../utils/cache';
import { getValidatedSchemaName } from '../../utils/tenant.utils';

interface Stats {
  nb_ecritures: number;
  total_debit: number;
  total_credit: number;
  nb_comptes: number;
}

export async function getStats(schema: string, exercice_id: number): Promise<Stats> {
  const cacheKey = `stats:${schema}:${exercice_id}`;
  const cached = cache.get<Stats>(cacheKey);
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
    [exercice_id],
  );

  const row = result.rows[0];
  const stats: Stats = {
    nb_ecritures: parseInt(row.nb_ecritures, 10),
    total_debit: parseFloat(row.total_debit),
    total_credit: parseFloat(row.total_credit),
    nb_comptes: parseInt(row.nb_comptes, 10),
  };

  cache.set(cacheKey, stats, 60_000);
  return stats;
}
