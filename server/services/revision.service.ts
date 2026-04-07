/**
 * Service Revision - NormX Multi-Tenant
 * Gestion des donnees de revision avec schema tenant
 */

import pool from '../db';
import logger from '../logger';
import { getValidatedSchemaName } from '../utils/tenant.utils';

// ============ INTERFACES ============

interface OdEcriture {
  montant?: number | string;
  compteDebit?: string;
  compteCredit?: string;
}

interface RevisionData {
  odEcritures?: OdEcriture[];
  lignes?: Record<string, string | number | boolean | null>[];
  [key: string]: string | number | boolean | null | OdEcriture[] | Record<string, string | number | boolean | null>[] | undefined;
}

// ============ QUERIES ============

export async function getAllOd(schema: string, exercice_id: number) {
  const s = getValidatedSchemaName(schema);
  const result = await pool.query(
    `SELECT data FROM "${s}".revision_data WHERE exercice_id = $1`,
    [exercice_id],
  );
  const allOd: OdEcriture[] = [];
  for (const row of result.rows) {
    const revData: RevisionData = typeof row.data === 'string' ? JSON.parse(row.data) : row.data;
    if (revData.odEcritures && Array.isArray(revData.odEcritures)) {
      allOd.push(...revData.odEcritures);
    }
  }
  return allOd;
}

export async function getSection(schema: string, exercice_id: number, section: string) {
  const s = getValidatedSchemaName(schema);
  const result = await pool.query(
    `SELECT data FROM "${s}".revision_data WHERE exercice_id = $1 AND section = $2`,
    [exercice_id, section],
  );
  if (result.rows.length === 0) return { lignes: [] };
  return result.rows[0].data;
}

export async function saveSection(schema: string, exercice_id: number, section: string, data: RevisionData) {
  const s = getValidatedSchemaName(schema);

  const existing = await pool.query(
    `SELECT id FROM "${s}".revision_data WHERE exercice_id = $1 AND section = $2`,
    [exercice_id, section],
  );
  if (existing.rows.length > 0) {
    await pool.query(
      `UPDATE "${s}".revision_data SET data = $1, updated_at = NOW() WHERE id = $2`,
      [JSON.stringify(data), existing.rows[0].id],
    );
  } else {
    await pool.query(
      `INSERT INTO "${s}".revision_data (exercice_id, section, data) VALUES ($1, $2, $3)`,
      [exercice_id, section, JSON.stringify(data)],
    );
  }

  // Appliquer les OD sur la balance N
  await applyOdToBalance(s, exercice_id);
}

// ============ APPLIQUER OD SUR BALANCE ============

async function applyOdToBalance(schema: string, exerciceId: number) {
  const s = getValidatedSchemaName(schema);

  // Trouver la balance N
  const balResult = await pool.query(
    `SELECT id FROM "${s}".balances WHERE exercice_id = $1 AND type_balance = 'N'`,
    [exerciceId],
  );
  if (balResult.rows.length === 0) return;
  const balanceId: number = balResult.rows[0].id;

  // Recuperer tous les OD
  const allRevisions = await pool.query(
    `SELECT data FROM "${s}".revision_data WHERE exercice_id = $1`,
    [exerciceId],
  );

  const impactParCompte: Record<string, { debit: number; credit: number }> = {};
  for (const row of allRevisions.rows) {
    const revData: RevisionData = typeof row.data === 'string' ? JSON.parse(row.data) : row.data;
    if (!revData.odEcritures) continue;
    for (const od of revData.odEcritures) {
      const montant = parseFloat(String(od.montant)) || 0;
      if (montant === 0) continue;
      if (od.compteDebit && od.compteDebit !== '______') {
        if (!impactParCompte[od.compteDebit]) impactParCompte[od.compteDebit] = { debit: 0, credit: 0 };
        impactParCompte[od.compteDebit].debit += montant;
      }
      if (od.compteCredit && od.compteCredit !== '______') {
        if (!impactParCompte[od.compteCredit]) impactParCompte[od.compteCredit] = { debit: 0, credit: 0 };
        impactParCompte[od.compteCredit].credit += montant;
      }
    }
  }

  const comptesImpactes = Object.keys(impactParCompte);
  if (comptesImpactes.length === 0) {
    await pool.query(
      `UPDATE "${s}".balance_lignes SET solde_debiteur_revise = NULL, solde_crediteur_revise = NULL WHERE balance_id = $1`,
      [balanceId],
    );
    return;
  }

  // Batch UPDATE : reset + appliquer les impacts en une seule requete via CTE
  // Construire la table des impacts comme VALUES
  const impactValues: string[] = [];
  const params: (number | string)[] = [balanceId];
  let idx = 2;

  for (const compte of comptesImpactes) {
    const impact = impactParCompte[compte];
    impactValues.push(`($${idx}::text, $${idx + 1}::numeric, $${idx + 2}::numeric)`);
    params.push(compte, impact.debit, impact.credit);
    idx += 3;
  }

  await pool.query(
    `WITH impacts(numero_compte, impact_debit, impact_credit) AS (
       VALUES ${impactValues.join(', ')}
     )
     UPDATE "${s}".balance_lignes bl SET
       solde_debiteur_revise = CASE
         WHEN (COALESCE(bl.solde_crediteur, 0) - COALESCE(bl.solde_debiteur, 0) + i.impact_credit - i.impact_debit) < 0
         THEN ABS(COALESCE(bl.solde_crediteur, 0) - COALESCE(bl.solde_debiteur, 0) + i.impact_credit - i.impact_debit)
         ELSE 0
       END,
       solde_crediteur_revise = CASE
         WHEN (COALESCE(bl.solde_crediteur, 0) - COALESCE(bl.solde_debiteur, 0) + i.impact_credit - i.impact_debit) >= 0
         THEN COALESCE(bl.solde_crediteur, 0) - COALESCE(bl.solde_debiteur, 0) + i.impact_credit - i.impact_debit
         ELSE 0
       END
     FROM impacts i
     WHERE bl.balance_id = $1 AND bl.numero_compte = i.numero_compte`,
    params,
  );

  // Reset les comptes non impactes
  await pool.query(
    `UPDATE "${s}".balance_lignes SET solde_debiteur_revise = NULL, solde_crediteur_revise = NULL
     WHERE balance_id = $1 AND numero_compte NOT IN (${comptesImpactes.map((_, i) => `$${i + 2}`).join(', ')})`,
    [balanceId, ...comptesImpactes],
  );
}
