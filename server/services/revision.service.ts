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

  // Reset tous les soldes revises
  await pool.query(
    `UPDATE "${s}".balance_lignes SET solde_debiteur_revise = NULL, solde_crediteur_revise = NULL WHERE balance_id = $1`,
    [balanceId],
  );

  // Appliquer les impacts
  for (const compte of comptesImpactes) {
    const impact = impactParCompte[compte];
    const ligneResult = await pool.query(
      `SELECT id, solde_debiteur, solde_crediteur FROM "${s}".balance_lignes WHERE balance_id = $1 AND numero_compte = $2`,
      [balanceId, compte],
    );
    if (ligneResult.rows.length === 0) continue;

    const ligne = ligneResult.rows[0];
    const sd = parseFloat(ligne.solde_debiteur) || 0;
    const sc = parseFloat(ligne.solde_crediteur) || 0;
    const soldeNet = (sc - sd) + impact.credit - impact.debit;
    const newSD = soldeNet < 0 ? Math.abs(soldeNet) : 0;
    const newSC = soldeNet >= 0 ? soldeNet : 0;

    await pool.query(
      `UPDATE "${s}".balance_lignes SET solde_debiteur_revise = $1, solde_crediteur_revise = $2 WHERE id = $3`,
      [newSD, newSC, ligne.id],
    );
  }
}
