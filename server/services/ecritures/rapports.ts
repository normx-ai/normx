// Rapports derives des ecritures validees : journal centralisateur,
// balance agee, tresorerie, repartition charges, comparatif N/N-1,
// tableau de bord, echeancier.

import pool from '../../db';
import { getValidatedSchemaName } from '../../utils/tenant.utils';
import type { EcheancierFilters } from './types';

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

export async function getBalanceAgee(
  schema: string,
  exercice_id: number,
  pagination: { limit: number; offset: number } = { limit: 1000, offset: 0 },
) {
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
    LIMIT $2 OFFSET $3
  `, [exercice_id, pagination.limit, pagination.offset]);
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

export async function getComparatif(
  schema: string,
  exercice_id: number,
  exercice_id_n1: number | null,
) {
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

export async function getEcheancier(
  schema: string,
  exercice_id: number,
  filters: EcheancierFilters,
) {
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

  query += ` ORDER BY e.date_ecriture, t.nom LIMIT $${idx} OFFSET $${idx + 1}`;
  params.push(filters.limit ?? 1000, filters.offset ?? 0);
  const result = await pool.query(query, params);
  return result.rows;
}
