/**
 * Service TVA - NormX Multi-Tenant
 * Gestion des declarations TVA avec schema tenant
 */

import pool from '../db';
import logger from '../logger';
import { getValidatedSchemaName } from '../utils/tenant.utils';

// ============ INTERFACES ============

interface TvaLigneInput {
  declaration_id: number;
  onglet: string;
  groupe?: string;
  reference?: string;
  libelle?: string;
  montant_net?: number | string;
  taux_taxe?: number | string;
  montant_taxe?: number | string;
  date_document?: string;
  avoir?: boolean;
}

interface TvaLigneUpdateInput {
  onglet?: string;
  groupe?: string;
  reference?: string;
  libelle?: string;
  montant_net?: number | string;
  taux_taxe?: number | string;
  montant_taxe?: number | string;
  date_document?: string;
  avoir?: boolean;
}

// ============ HELPERS ============

async function recalcTotals(schema: string, declarationId: number, client?: { query: (sql: string, params: (string | number)[]) => Promise<{ rows: Record<string, string>[] }> }) {
  const s = getValidatedSchemaName(schema);
  const db = client || pool;
  const result = await db.query(
    `SELECT
       COALESCE(SUM(CASE WHEN onglet = 'collectee' THEN montant_taxe ELSE 0 END), 0) AS tva_collectee,
       COALESCE(SUM(CASE WHEN onglet = 'deductible' THEN montant_taxe ELSE 0 END), 0) AS tva_deductible
     FROM "${s}".declaration_tva_lignes
     WHERE declaration_id = $1`,
    [declarationId],
  );
  const collectee = parseFloat(result.rows[0].tva_collectee);
  const deductible = parseFloat(result.rows[0].tva_deductible);
  const payer = collectee - deductible;
  await db.query(
    `UPDATE "${s}".declarations_tva
     SET montant_tva_collectee = $1, montant_tva_deductible = $2, montant_tva_payer = $3, updated_at = NOW()
     WHERE id = $4`,
    [collectee, deductible, payer, declarationId],
  );
  return { collectee, deductible, payer };
}

// ============ DECLARATIONS ============

export async function getDeclarations(schema: string, exerciceId: number) {
  const s = getValidatedSchemaName(schema);

  const existing = await pool.query(
    `SELECT id, mois, type_declaration, statut, montant_tva_collectee, montant_tva_deductible, montant_tva_payer
     FROM "${s}".declarations_tva
     WHERE exercice_id = $1
     ORDER BY mois`,
    [exerciceId],
  );

  if (existing.rows.length > 0) {
    return existing.rows;
  }

  // Auto-creation des 12 mois
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    for (let mois = 1; mois <= 12; mois++) {
      await client.query(
        `INSERT INTO "${s}".declarations_tva (exercice_id, mois)
         VALUES ($1, $2)
         ON CONFLICT (exercice_id, mois, type_declaration) DO NOTHING`,
        [exerciceId, mois],
      );
    }
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }

  const result = await pool.query(
    `SELECT id, mois, type_declaration, statut, montant_tva_collectee, montant_tva_deductible, montant_tva_payer
     FROM "${s}".declarations_tva
     WHERE exercice_id = $1
     ORDER BY mois`,
    [exerciceId],
  );
  return result.rows;
}

export async function getDeclarationDetail(schema: string, id: number) {
  const s = getValidatedSchemaName(schema);

  const decl = await pool.query(
    `SELECT * FROM "${s}".declarations_tva WHERE id = $1`,
    [id],
  );
  if (decl.rows.length === 0) return null;

  const lignes = await pool.query(
    `SELECT * FROM "${s}".declaration_tva_lignes WHERE declaration_id = $1 ORDER BY onglet, id`,
    [id],
  );

  const lignesParOnglet: Record<string, Record<string, string | number | boolean>[]> = {};
  for (const ligne of lignes.rows) {
    if (!lignesParOnglet[ligne.onglet]) {
      lignesParOnglet[ligne.onglet] = [];
    }
    lignesParOnglet[ligne.onglet].push(ligne);
  }

  return { ...decl.rows[0], lignes: lignesParOnglet };
}

export async function getLignesByOnglet(schema: string, declarationId: number, onglet: string) {
  const s = getValidatedSchemaName(schema);
  const result = await pool.query(
    `SELECT * FROM "${s}".declaration_tva_lignes
     WHERE declaration_id = $1 AND onglet = $2
     ORDER BY id`,
    [declarationId, onglet],
  );
  return result.rows;
}

export async function getMontantsComptes(schema: string, exerciceId: number, mois: string, comptes: string) {
  const s = getValidatedSchemaName(schema);

  const exResult = await pool.query(`SELECT annee FROM "${s}".exercices WHERE id = $1`, [exerciceId]);
  if (exResult.rows.length === 0) return null;
  const annee = exResult.rows[0].annee;
  const m = parseInt(mois, 10);
  const dateDebut = `${annee}-${String(m).padStart(2, '0')}-01`;
  const lastDay = new Date(annee, m, 0).getDate();
  const dateFin = `${annee}-${String(m).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

  const comptePrefixes = comptes.split(',').map((c: string) => c.trim()).filter(Boolean);
  if (comptePrefixes.length === 0) return { lignes: [], total_debit: 0, total_credit: 0, solde: 0 };

  const likeConditions = comptePrefixes.map((_: string, i: number) => `el.numero_compte LIKE $${i + 4}`).join(' OR ');
  const params: (string | number)[] = [exerciceId, dateDebut, dateFin, ...comptePrefixes.map((p: string) => p + '%')];

  const result = await pool.query(`
    SELECT el.numero_compte, el.libelle_compte,
           e.date_ecriture, e.libelle AS libelle_ecriture, e.numero_piece,
           el.debit, el.credit
    FROM "${s}".ecriture_lignes el
    JOIN "${s}".ecritures e ON e.id = el.ecriture_id
    WHERE e.exercice_id = $1 AND e.statut = 'validee'
      AND e.date_ecriture >= $2 AND e.date_ecriture <= $3
      AND (${likeConditions})
    ORDER BY el.numero_compte, e.date_ecriture
  `, params);

  const totalDebit = result.rows.reduce((sum: number, r: Record<string, string>) => sum + parseFloat(r.debit || '0'), 0);
  const totalCredit = result.rows.reduce((sum: number, r: Record<string, string>) => sum + parseFloat(r.credit || '0'), 0);

  return {
    lignes: result.rows,
    total_debit: totalDebit,
    total_credit: totalCredit,
    solde: totalCredit - totalDebit,
  };
}

// ============ LIGNES CRUD ============

export async function addLigne(schema: string, input: TvaLigneInput) {
  const s = getValidatedSchemaName(schema);
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const result = await client.query(
      `INSERT INTO "${s}".declaration_tva_lignes
       (declaration_id, onglet, groupe, reference, libelle, montant_net, taux_taxe, montant_taxe, date_document, avoir)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING *`,
      [
        input.declaration_id,
        input.onglet,
        input.groupe || null,
        input.reference || null,
        input.libelle || null,
        parseFloat(String(input.montant_net)) || 0,
        parseFloat(String(input.taux_taxe)) || 0,
        parseFloat(String(input.montant_taxe)) || 0,
        input.date_document || null,
        input.avoir || false,
      ],
    );

    const totals = await recalcTotals(s, input.declaration_id, client);
    await client.query('COMMIT');

    return { ligne: result.rows[0], totals };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export async function updateLigne(schema: string, id: number, input: TvaLigneUpdateInput) {
  const s = getValidatedSchemaName(schema);
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const existing = await client.query(
      `SELECT declaration_id FROM "${s}".declaration_tva_lignes WHERE id = $1`,
      [id],
    );
    if (existing.rows.length === 0) {
      await client.query('ROLLBACK');
      return null;
    }
    const declarationId: number = existing.rows[0].declaration_id;

    const result = await client.query(
      `UPDATE "${s}".declaration_tva_lignes SET
         onglet = COALESCE($1, onglet),
         groupe = $2,
         reference = $3,
         libelle = $4,
         montant_net = COALESCE($5, montant_net),
         taux_taxe = COALESCE($6, taux_taxe),
         montant_taxe = COALESCE($7, montant_taxe),
         date_document = $8,
         avoir = COALESCE($9, avoir)
       WHERE id = $10
       RETURNING *`,
      [
        input.onglet || null,
        input.groupe !== undefined ? input.groupe : null,
        input.reference !== undefined ? input.reference : null,
        input.libelle !== undefined ? input.libelle : null,
        input.montant_net !== undefined ? parseFloat(String(input.montant_net)) : null,
        input.taux_taxe !== undefined ? parseFloat(String(input.taux_taxe)) : null,
        input.montant_taxe !== undefined ? parseFloat(String(input.montant_taxe)) : null,
        input.date_document || null,
        input.avoir !== undefined ? input.avoir : null,
        id,
      ],
    );

    const totals = await recalcTotals(s, declarationId, client);
    await client.query('COMMIT');

    return { ligne: result.rows[0], totals };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export async function deleteLigne(schema: string, id: number) {
  const s = getValidatedSchemaName(schema);
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const existing = await client.query(
      `SELECT declaration_id FROM "${s}".declaration_tva_lignes WHERE id = $1`,
      [id],
    );
    if (existing.rows.length === 0) {
      await client.query('ROLLBACK');
      return null;
    }
    const declarationId: number = existing.rows[0].declaration_id;

    await client.query(
      `DELETE FROM "${s}".declaration_tva_lignes WHERE id = $1`,
      [id],
    );

    const totals = await recalcTotals(s, declarationId, client);
    await client.query('COMMIT');

    return { totals };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

// ============ IMPORT ECRITURES ============

export async function importerEcritures(schema: string, declarationId: number) {
  const s = getValidatedSchemaName(schema);
  const client = await pool.connect();
  try {
    const declResult = await client.query(
      `SELECT * FROM "${s}".declarations_tva WHERE id = $1`,
      [declarationId],
    );
    if (declResult.rows.length === 0) {
      client.release();
      return { notFound: 'Declaration non trouvee.' };
    }
    const decl = declResult.rows[0];

    const exResult = await client.query(
      `SELECT * FROM "${s}".exercices WHERE id = $1`,
      [decl.exercice_id],
    );
    if (exResult.rows.length === 0) {
      client.release();
      return { notFound: 'Exercice non trouve.' };
    }
    const exercice = exResult.rows[0];
    const annee = exercice.annee;
    const mois = decl.mois;

    const dateDebut = `${annee}-${String(mois).padStart(2, '0')}-01`;
    const lastDay = new Date(annee, mois, 0).getDate();
    const dateFin = `${annee}-${String(mois).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

    await client.query('BEGIN');

    await client.query(
      `DELETE FROM "${s}".declaration_tva_lignes WHERE declaration_id = $1`,
      [decl.id],
    );

    // TVA collectee : comptes 443x
    const collectee = await client.query(`
      SELECT el.numero_compte, el.libelle_compte,
             e.date_ecriture, e.libelle AS libelle_ecriture, e.numero_piece,
             el.debit, el.credit
      FROM "${s}".ecriture_lignes el
      JOIN "${s}".ecritures e ON e.id = el.ecriture_id
      WHERE e.exercice_id = $1 AND e.statut = 'validee'
        AND e.date_ecriture >= $2 AND e.date_ecriture <= $3
        AND el.numero_compte LIKE '443%'
      ORDER BY e.date_ecriture, e.id
    `, [decl.exercice_id, dateDebut, dateFin]);

    for (const row of collectee.rows) {
      const montantTaxe = parseFloat(row.credit) - parseFloat(row.debit);
      if (Math.abs(montantTaxe) < 0.01) continue;
      const taux = row.numero_compte.startsWith('4435') ? 5 : 18;
      const montantNet = Math.round((Math.abs(montantTaxe) / taux) * 100);
      await client.query(
        `INSERT INTO "${s}".declaration_tva_lignes
         (declaration_id, onglet, groupe, reference, libelle, montant_net, taux_taxe, montant_taxe, date_document, avoir)
         VALUES ($1, 'collectee', $2, $3, $4, $5, $6, $7, $8, $9)`,
        [
          decl.id,
          row.numero_compte,
          row.numero_piece || '',
          row.libelle_ecriture || row.libelle_compte || '',
          Math.abs(montantNet),
          taux,
          Math.abs(montantTaxe),
          row.date_ecriture,
          montantTaxe < 0,
        ],
      );
    }

    // TVA deductible : comptes 445x
    const deductible = await client.query(`
      SELECT el.numero_compte, el.libelle_compte,
             e.date_ecriture, e.libelle AS libelle_ecriture, e.numero_piece,
             el.debit, el.credit
      FROM "${s}".ecriture_lignes el
      JOIN "${s}".ecritures e ON e.id = el.ecriture_id
      WHERE e.exercice_id = $1 AND e.statut = 'validee'
        AND e.date_ecriture >= $2 AND e.date_ecriture <= $3
        AND el.numero_compte LIKE '445%'
      ORDER BY e.date_ecriture, e.id
    `, [decl.exercice_id, dateDebut, dateFin]);

    for (const row of deductible.rows) {
      const montantTaxe = parseFloat(row.debit) - parseFloat(row.credit);
      if (Math.abs(montantTaxe) < 0.01) continue;
      const taux = row.numero_compte.startsWith('4455') ? 5 : 18;
      const montantNet = Math.round((Math.abs(montantTaxe) / taux) * 100);
      await client.query(
        `INSERT INTO "${s}".declaration_tva_lignes
         (declaration_id, onglet, groupe, reference, libelle, montant_net, taux_taxe, montant_taxe, date_document, avoir)
         VALUES ($1, 'deductible', $2, $3, $4, $5, $6, $7, $8, $9)`,
        [
          decl.id,
          row.numero_compte,
          row.numero_piece || '',
          row.libelle_ecriture || row.libelle_compte || '',
          Math.abs(montantNet),
          taux,
          Math.abs(montantTaxe),
          row.date_ecriture,
          montantTaxe < 0,
        ],
      );
    }

    const totals = await recalcTotals(s, decl.id, client);

    if (decl.statut === 'nouvelle') {
      await client.query(
        `UPDATE "${s}".declarations_tva SET statut = 'brouillon', updated_at = NOW() WHERE id = $1`,
        [decl.id],
      );
    }

    await client.query('COMMIT');

    return {
      nb_collectee: collectee.rows.length,
      nb_deductible: deductible.rows.length,
      totals,
    };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

// ============ STATUT ============

export async function updateDeclarationStatut(schema: string, id: number, statut: string) {
  const s = getValidatedSchemaName(schema);
  const transitions: Record<string, string[]> = {
    nouvelle: ['brouillon'],
    brouillon: ['validee', 'nouvelle'],
    validee: ['transmise', 'brouillon'],
    transmise: [],
  };

  const decl = await pool.query(
    `SELECT statut FROM "${s}".declarations_tva WHERE id = $1`,
    [id],
  );
  if (decl.rows.length === 0) return { notFound: true };

  const currentStatut: string = decl.rows[0].statut;
  const allowed = transitions[currentStatut] || [];
  if (!allowed.includes(statut)) {
    return { forbidden: true, message: `Transition non autorisee: ${currentStatut} -> ${statut}. Transitions possibles: ${allowed.join(', ') || 'aucune'}` };
  }

  const result = await pool.query(
    `UPDATE "${s}".declarations_tva SET statut = $1, updated_at = NOW() WHERE id = $2 RETURNING *`,
    [statut, id],
  );
  return { declaration: result.rows[0] };
}
