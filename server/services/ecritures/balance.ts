// Balance derivee des ecritures validees : agregation par compte avec
// solde debiteur / crediteur (non negatifs).

import pool from '../../db';
import { getValidatedSchemaName } from '../../utils/tenant.utils';

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
    [exercice_id],
  );
  return result.rows;
}
