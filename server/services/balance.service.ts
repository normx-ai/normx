/**
 * Service Balance - NormX Multi-Tenant
 * Gestion des exercices et balances importees avec schema tenant
 */

import pool from '../db';
import { createLogger } from '../logger';

const log = createLogger('balance');
import { getValidatedSchemaName } from '../utils/tenant.utils';

// ============ INTERFACES ============

interface BalanceLigne {
  numero_compte?: string;
  libelle_compte?: string;
  si_debit?: number | string;
  si_credit?: number | string;
  debit?: number | string;
  credit?: number | string;
  solde_debiteur?: number | string;
  solde_crediteur?: number | string;
}

interface ImportBalanceInput {
  exercice_id: number;
  type_balance: string;
  nom_fichier?: string;
  lignes: BalanceLigne[];
}

// ============ EXERCICES ============

export async function createExercice(
  schema: string,
  annee: number,
  duree_mois: number,
  date_debut?: string,
  date_fin?: string,
) {
  const s = getValidatedSchemaName(schema);
  const duree = duree_mois || 12;

  // Limiter a 2 exercices
  const countResult = await pool.query(
    `SELECT COUNT(*) FROM "${s}".exercices`,
  );
  if (parseInt(countResult.rows[0].count, 10) >= 2) {
    return { error: 'Maximum 2 exercices par entite.' };
  }

  const existing = await pool.query(
    `SELECT * FROM "${s}".exercices WHERE annee = $1`,
    [annee],
  );
  if (existing.rows.length > 0) return { existing: existing.rows[0] };

  const dateDebut = date_debut || `${annee}-01-01`;
  const dateFin = date_fin || (() => {
    if (duree <= 12) {
      const dernierJour = new Date(annee, duree, 0).getDate();
      return `${annee}-${duree.toString().padStart(2, '0')}-${dernierJour.toString().padStart(2, '0')}`;
    }
    const moisRestant = duree - 12;
    const dernierJour = new Date(annee + 1, moisRestant, 0).getDate();
    return `${annee + 1}-${moisRestant.toString().padStart(2, '0')}-${dernierJour.toString().padStart(2, '0')}`;
  })();

  const result = await pool.query(
    `INSERT INTO "${s}".exercices (annee, date_debut, date_fin, duree_mois) VALUES ($1, $2, $3, $4) RETURNING *`,
    [annee, dateDebut, dateFin, duree],
  );
  return { created: result.rows[0] };
}

export async function listExercices(schema: string) {
  const s = getValidatedSchemaName(schema);
  const result = await pool.query(
    `SELECT * FROM "${s}".exercices ORDER BY annee DESC`,
  );
  return result.rows;
}

export async function cloturerExercice(schema: string, id: number) {
  const s = getValidatedSchemaName(schema);
  const result = await pool.query(
    `UPDATE "${s}".exercices SET statut = 'cloture' WHERE id = $1 AND statut = 'ouvert' RETURNING *`,
    [id],
  );
  return result.rows.length > 0 ? result.rows[0] : null;
}

export async function rouvrirExercice(schema: string, id: number) {
  const s = getValidatedSchemaName(schema);
  const result = await pool.query(
    `UPDATE "${s}".exercices SET statut = 'ouvert' WHERE id = $1 AND statut = 'cloture' RETURNING *`,
    [id],
  );
  return result.rows.length > 0 ? result.rows[0] : null;
}

// ============ BALANCES IMPORTEES ============

export async function importBalance(schema: string, input: ImportBalanceInput) {
  const s = getValidatedSchemaName(schema);
  const { exercice_id, type_balance, nom_fichier, lignes } = input;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Supprimer ancienne balance du meme type
    const oldBalance = await client.query(
      `SELECT id FROM "${s}".balances WHERE exercice_id = $1 AND type_balance = $2`,
      [exercice_id, type_balance],
    );
    if (oldBalance.rows.length > 0) {
      await client.query(`DELETE FROM "${s}".balances WHERE id = $1`, [oldBalance.rows[0].id]);
      if (type_balance === 'N') {
        await client.query(
          `DELETE FROM "${s}".revision_data WHERE exercice_id = $1`,
          [exercice_id],
        );
      }
    }

    // Creer la balance
    const balResult = await client.query(
      `INSERT INTO "${s}".balances (exercice_id, type_balance, nom_fichier) VALUES ($1, $2, $3) RETURNING *`,
      [exercice_id, type_balance, nom_fichier || null],
    );
    const balanceId: number = balResult.rows[0].id;

    // Bulk insert des lignes
    if (lignes.length > 0) {
      const values: unknown[] = [];
      const placeholders = lignes.map((l, i) => {
        const o = i * 9;
        values.push(
          balanceId,
          l.numero_compte || '',
          l.libelle_compte || '',
          parseFloat(String(l.si_debit)) || 0,
          parseFloat(String(l.si_credit)) || 0,
          parseFloat(String(l.debit)) || 0,
          parseFloat(String(l.credit)) || 0,
          parseFloat(String(l.solde_debiteur)) || 0,
          parseFloat(String(l.solde_crediteur)) || 0,
        );
        return `($${o+1}, $${o+2}, $${o+3}, $${o+4}, $${o+5}, $${o+6}, $${o+7}, $${o+8}, $${o+9})`;
      });
      await client.query(
        `INSERT INTO "${s}".balance_lignes (balance_id, numero_compte, libelle_compte, si_debit, si_credit, debit, credit, solde_debiteur, solde_crediteur)
         VALUES ${placeholders.join(', ')}`,
        values,
      );
    }

    await client.query('COMMIT');
    return { balance: balResult.rows[0], nb_lignes: lignes.length };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    try { client.release(); } catch { /* ignore */ }
  }
}

export async function deleteBalance(schema: string, balanceId: number) {
  const s = getValidatedSchemaName(schema);
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await client.query(
      `DELETE FROM "${s}".balances WHERE id = $1 RETURNING *`,
      [balanceId],
    );
    if (result.rows.length === 0) {
      await client.query('ROLLBACK');
      return null;
    }

    const deleted = result.rows[0];
    if (deleted.type_balance === 'N') {
      await client.query(
        `DELETE FROM "${s}".revision_data WHERE exercice_id = $1`,
        [deleted.exercice_id],
      );
    }
    await client.query('COMMIT');
    return deleted;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    try { client.release(); } catch { /* ignore */ }
  }
}

export async function updateBalanceLigne(
  schema: string,
  ligneId: number,
  fields: Record<string, string | number | undefined>,
) {
  const s = getValidatedSchemaName(schema);
  const updates: string[] = [];
  const values: (string | number)[] = [];
  let idx = 1;

  if (fields.numero_compte !== undefined) { updates.push(`numero_compte = $${idx++}`); values.push(String(fields.numero_compte).trim()); }
  if (fields.libelle_compte !== undefined) { updates.push(`libelle_compte = $${idx++}`); values.push(String(fields.libelle_compte).trim()); }
  if (fields.si_debit !== undefined) { updates.push(`si_debit = $${idx++}`); values.push(parseFloat(String(fields.si_debit)) || 0); }
  if (fields.si_credit !== undefined) { updates.push(`si_credit = $${idx++}`); values.push(parseFloat(String(fields.si_credit)) || 0); }
  if (fields.debit !== undefined) { updates.push(`debit = $${idx++}`); values.push(parseFloat(String(fields.debit)) || 0); }
  if (fields.credit !== undefined) { updates.push(`credit = $${idx++}`); values.push(parseFloat(String(fields.credit)) || 0); }
  if (fields.solde_debiteur !== undefined) { updates.push(`solde_debiteur = $${idx++}`); values.push(parseFloat(String(fields.solde_debiteur)) || 0); }
  if (fields.solde_crediteur !== undefined) { updates.push(`solde_crediteur = $${idx++}`); values.push(parseFloat(String(fields.solde_crediteur)) || 0); }

  if (updates.length === 0) return { noUpdate: true };

  values.push(ligneId);
  const result = await pool.query(
    `UPDATE "${s}".balance_lignes SET ${updates.join(', ')} WHERE id = $${idx} RETURNING *`,
    values,
  );
  if (result.rows.length === 0) return null;
  return result.rows[0];
}

export async function getBalance(schema: string, exercice_id: number, type_balance: string) {
  const s = getValidatedSchemaName(schema);

  const balResult = await pool.query(
    `SELECT * FROM "${s}".balances WHERE exercice_id = $1 AND type_balance = $2`,
    [exercice_id, type_balance],
  );
  if (balResult.rows.length === 0) return { balance: null, lignes: [] };

  const balance = balResult.rows[0];
  const lignesResult = await pool.query(
    `SELECT * FROM "${s}".balance_lignes WHERE balance_id = $1 ORDER BY numero_compte`,
    [balance.id],
  );

  return { balance, lignes: lignesResult.rows };
}

export async function updateRevisionLigne(
  schema: string,
  ligneId: number,
  fields: { debit_revise?: number | null; credit_revise?: number | null; solde_debiteur_revise?: number | null; solde_crediteur_revise?: number | null; note_revision?: string | null },
) {
  const s = getValidatedSchemaName(schema);
  const result = await pool.query(
    `UPDATE "${s}".balance_lignes SET
      debit_revise = $1, credit_revise = $2,
      solde_debiteur_revise = $3, solde_crediteur_revise = $4,
      note_revision = $5
     WHERE id = $6 RETURNING *`,
    [
      fields.debit_revise !== undefined ? fields.debit_revise : null,
      fields.credit_revise !== undefined ? fields.credit_revise : null,
      fields.solde_debiteur_revise !== undefined ? fields.solde_debiteur_revise : null,
      fields.solde_crediteur_revise !== undefined ? fields.solde_crediteur_revise : null,
      fields.note_revision || null,
      ligneId,
    ],
  );
  if (result.rows.length === 0) return null;
  return result.rows[0];
}

export async function updateBalanceStatut(
  schema: string,
  balanceId: number,
  statut: string,
  userId?: number | null,
  revision_notes?: string,
) {
  const s = getValidatedSchemaName(schema);

  const updates = ['statut = $1'];
  const values: (string | number | null)[] = [statut];
  let idx = 2;

  if (statut === 'revise' || statut === 'valide') {
    updates.push(`revise_par = $${idx}`);
    values.push(userId || null);
    idx++;
    updates.push(`date_revision = NOW()`);
  }
  if (revision_notes !== undefined) {
    updates.push(`revision_notes = $${idx}`);
    values.push(revision_notes);
    idx++;
  }

  values.push(balanceId);
  const result = await pool.query(
    `UPDATE "${s}".balances SET ${updates.join(', ')} WHERE id = $${idx} RETURNING *`,
    values,
  );
  if (result.rows.length === 0) return null;
  return result.rows[0];
}
