// Lettrage des ecritures tiers : lister les tiers lettrables, lettrer un
// groupe de lignes equilibrees (avec code alphanum genere), delettrer.

import pool from '../../db';
import { getValidatedSchemaName } from '../../utils/tenant.utils';
import type { LettrageEcrituresFilters } from './types';

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

export async function getLettreEcritures(
  schema: string,
  exercice_id: number,
  tiers_id: number,
  filters: LettrageEcrituresFilters,
) {
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
  if (annee_de) { query += ` AND EXTRACT(YEAR FROM e.date_ecriture) >= $${idx}`; params.push(parseInt(annee_de, 10)); idx++; }
  if (annee_a) { query += ` AND EXTRACT(YEAR FROM e.date_ecriture) <= $${idx}`; params.push(parseInt(annee_a, 10)); idx++; }

  query += ` ORDER BY e.date_ecriture, e.id, el.id`;
  const result = await pool.query(query, params);
  return result.rows;
}

export async function lettrer(schema: string, ligneIds: number[]) {
  const s = getValidatedSchemaName(schema);

  // Equilibre : debit = credit sur le groupe
  const check = await pool.query(
    `SELECT COALESCE(SUM(debit), 0) - COALESCE(SUM(credit), 0) AS ecart FROM "${s}".ecriture_lignes WHERE id = ANY($1::int[])`,
    [ligneIds],
  );
  const ecart = parseFloat(check.rows[0].ecart);
  if (Math.abs(ecart) > 0.01) {
    return { error: `Ecart non nul: ${ecart.toFixed(2)}. Les lignes selectionnees doivent s'equilibrer.` };
  }

  // Aucune ligne deja lettree
  const already = await pool.query(
    `SELECT COUNT(*) FROM "${s}".ecriture_lignes WHERE id = ANY($1::int[]) AND lettrage_code IS NOT NULL AND lettrage_code != ''`,
    [ligneIds],
  );
  if (parseInt(already.rows[0].count, 10) > 0) {
    return { error: 'Certaines lignes sont deja lettrees.' };
  }

  // Generer le prochain code alphanum AAA..ZZZ
  const lastCode = await pool.query(
    `SELECT MAX(el.lettrage_code) AS last_code FROM "${s}".ecriture_lignes el
     WHERE el.lettrage_code IS NOT NULL AND el.lettrage_code != ''`,
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
    [newCode, ligneIds],
  );
  return { code: newCode, count: ligneIds.length };
}

export async function delettrer(schema: string, lettrageCode: string) {
  const s = getValidatedSchemaName(schema);
  const result = await pool.query(
    `UPDATE "${s}".ecriture_lignes SET lettrage_code = NULL
     WHERE lettrage_code = $1 AND ecriture_id IN (SELECT id FROM "${s}".ecritures)`,
    [lettrageCode],
  );
  return { deleted: result.rowCount };
}
