import pool from '../db';
import { getValidatedSchemaName } from '../utils/tenant.utils';

export type LigneType = 'reintegration' | 'deduction' | 'deficit_reportable' | 'ard';

export type LigneMetadata = Record<string, unknown>;

export interface LigneResultatFiscal {
  id: number;
  exercice_id: number;
  type: LigneType;
  libelle: string;
  montant: number;
  article: string;
  ordre: number;
  metadata: LigneMetadata;
}

export interface LigneInput {
  type: LigneType;
  libelle: string;
  montant: number;
  article?: string;
  metadata?: LigneMetadata;
}

export async function listLignes(
  schema: string,
  exerciceId: number,
): Promise<LigneResultatFiscal[]> {
  const s = getValidatedSchemaName(schema);
  const result = await pool.query(
    `SELECT id, exercice_id, type, libelle, montant, article, ordre, metadata
     FROM "${s}".resultat_fiscal_lignes
     WHERE exercice_id = $1
     ORDER BY type, ordre, id`,
    [exerciceId],
  );
  return result.rows.map(r => ({
    ...r,
    montant: parseFloat(String(r.montant)) || 0,
    metadata: (r.metadata ?? {}) as LigneMetadata,
  }));
}

// Remplacement atomique : on supprime tout pour cet exercice puis on insère
// les nouvelles lignes. Préserve l'ordre via la position dans le tableau.
export async function replaceLignes(
  schema: string,
  exerciceId: number,
  lignes: LigneInput[],
): Promise<LigneResultatFiscal[]> {
  const s = getValidatedSchemaName(schema);
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(
      `DELETE FROM "${s}".resultat_fiscal_lignes WHERE exercice_id = $1`,
      [exerciceId],
    );

    if (lignes.length > 0) {
      const values: (string | number)[] = [];
      const placeholders: string[] = [];
      lignes.forEach((l, i) => {
        const o = i * 7;
        placeholders.push(`($${o+1}, $${o+2}, $${o+3}, $${o+4}, $${o+5}, $${o+6}, $${o+7})`);
        values.push(
          exerciceId,
          l.type,
          l.libelle || '',
          l.montant || 0,
          l.article || '',
          i,
          JSON.stringify(l.metadata ?? {}),
        );
      });
      await client.query(
        `INSERT INTO "${s}".resultat_fiscal_lignes
           (exercice_id, type, libelle, montant, article, ordre, metadata)
         VALUES ${placeholders.join(', ')}`,
        values,
      );
    }

    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }

  return listLignes(s, exerciceId);
}
