/**
 * Service Workflow Bulletin — NormX Paie
 * Gestion des statuts de bulletin et cloture de periode.
 * Conforme CGI 2026 — ITS uniquement (Art. 116)
 * Multi-tenant : isolation par schema PostgreSQL
 */

import pool from '../db';
import logger from '../logger';
import { getValidatedSchemaName } from '../utils/tenant.utils';

// ============ INTERFACES ============

export type BulletinData = Record<string, string | number | boolean | null>;

export type StatutBulletin = 'brouillon' | 'valide' | 'verrouille';

export interface BulletinWorkflow {
  id: string;
  salarie_id: string;
  mois: number;
  annee: number;
  statut: StatutBulletin;
  date_creation: string;
  date_validation: string | null;
  date_verrouillage: string | null;
  valide_par: string | null;
}

export interface PeriodeCloture {
  mois: number;
  annee: number;
  cloturee: boolean;
  date_cloture: string | null;
  nb_bulletins: number;
  nb_valides: number;
  nb_verrouilles: number;
}

export interface CumulAnnuel {
  salarie_id: string;
  nom: string;
  prenom: string;
  annee: number;
  brut_cumule: number;
  cnss_salariale_cumule: number;
  its_cumule: number;
  net_cumule: number;
  mois_travailles: number;
}

// ============ CREER / SAUVEGARDER UN BULLETIN ============

export async function saveBulletin(
  schema: string,
  salarieId: number,
  mois: number,
  annee: number,
  data: BulletinData,
): Promise<BulletinWorkflow> {
  const s = getValidatedSchemaName(schema);

  // Upsert : si un bulletin existe deja pour ce salarie/mois/annee, on le met a jour
  const result = await pool.query(
    `INSERT INTO "${s}".bulletins_paie (salarie_id, mois, annee, data, statut)
     VALUES ($1, $2, $3, $4, 'brouillon')
     ON CONFLICT (salarie_id, mois, annee)
     DO UPDATE SET data = $4, statut = CASE
       WHEN "${s}".bulletins_paie.statut = 'verrouille' THEN "${s}".bulletins_paie.statut
       ELSE 'brouillon'
     END
     RETURNING id, salarie_id, mois, annee, statut, created_at AS date_creation,
               date_validation, date_verrouillage, valide_par`,
    [salarieId, mois, annee, JSON.stringify(data)],
  );

  const row = result.rows[0];
  logger.info('Bulletin sauvegarde salarie=%d mois=%d/%d schema=%s', salarieId, mois, annee, s);
  return row;
}

// ============ RECUPERER UN BULLETIN ============

export async function getBulletin(
  schema: string,
  salarieId: number,
  mois: number,
  annee: number,
): Promise<{ id: number; data: BulletinData; statut: string } | null> {
  const s = getValidatedSchemaName(schema);
  const result = await pool.query(
    `SELECT id, data, statut FROM "${s}".bulletins_paie
     WHERE salarie_id = $1 AND mois = $2 AND annee = $3`,
    [salarieId, mois, annee],
  );
  return result.rows[0] || null;
}

// ============ GENERER BULLETINS POUR TOUS LES SALARIES D'UNE PERIODE ============

export async function genererBulletinsBatch(
  schema: string,
  mois: number,
  annee: number,
  bulletins: { salarieId: number; data: BulletinData }[],
): Promise<number> {
  const s = getValidatedSchemaName(schema);
  let count = 0;

  for (const b of bulletins) {
    await pool.query(
      `INSERT INTO "${s}".bulletins_paie (salarie_id, mois, annee, data, statut)
       VALUES ($1, $2, $3, $4, 'brouillon')
       ON CONFLICT (salarie_id, mois, annee)
       DO UPDATE SET data = $4, statut = CASE
         WHEN "${s}".bulletins_paie.statut = 'verrouille' THEN "${s}".bulletins_paie.statut
         ELSE 'brouillon'
       END`,
      [b.salarieId, mois, annee, JSON.stringify(b.data)],
    );
    count++;
  }

  logger.info('Batch %d bulletins generes mois=%d/%d schema=%s', count, mois, annee, s);
  return count;
}

// ============ BULLETINS PAR PERIODE ============

export async function getBulletinsByPeriode(
  schema: string,
  mois: number,
  annee: number,
): Promise<BulletinWorkflow[]> {
  const s = getValidatedSchemaName(schema);
  const result = await pool.query(
    `SELECT b.id, b.salarie_id, b.mois, b.annee, b.statut,
            b.date_creation, b.date_validation, b.date_verrouillage, b.valide_par
     FROM "${s}".bulletins_paie b
     JOIN "${s}".salaries sa ON sa.id = b.salarie_id
     WHERE b.mois = $1 AND b.annee = $2
     ORDER BY b.date_creation ASC`,
    [mois, annee],
  );
  return result.rows;
}

// ============ MISE A JOUR STATUT ============

export async function updateStatutBulletin(
  schema: string,
  bulletinId: string,
  statut: StatutBulletin,
  validePar: string | null,
): Promise<BulletinWorkflow | null> {
  const s = getValidatedSchemaName(schema);
  let query: string;
  let params: (string | null)[];

  if (statut === 'valide') {
    query = `UPDATE "${s}".bulletins_paie
             SET statut = $1, date_validation = NOW(), valide_par = $2
             WHERE id = $3 RETURNING *`;
    params = [statut, validePar, bulletinId];
  } else if (statut === 'verrouille') {
    query = `UPDATE "${s}".bulletins_paie
             SET statut = $1, date_verrouillage = NOW()
             WHERE id = $2 RETURNING *`;
    params = [statut, bulletinId];
  } else {
    query = `UPDATE "${s}".bulletins_paie
             SET statut = $1, date_validation = NULL, date_verrouillage = NULL, valide_par = NULL
             WHERE id = $2 RETURNING *`;
    params = [statut, bulletinId];
  }

  const result = await pool.query(query, params);
  const row: BulletinWorkflow | undefined = result.rows[0];

  if (row) {
    logger.info('Bulletin %s -> statut "%s" dans schema %s', bulletinId, statut, s);
  }

  return row || null;
}

// ============ CLOTURE PERIODE ============

export async function getCloturePeriode(
  schema: string,
  mois: number,
  annee: number,
): Promise<PeriodeCloture | null> {
  const s = getValidatedSchemaName(schema);
  const result = await pool.query(
    `SELECT
       $1::int AS mois,
       $2::int AS annee,
       COALESCE(cp.cloturee, false) AS cloturee,
       cp.date_cloture,
       COUNT(b.id)::int AS nb_bulletins,
       COUNT(b.id) FILTER (WHERE b.statut = 'valide')::int AS nb_valides,
       COUNT(b.id) FILTER (WHERE b.statut = 'verrouille')::int AS nb_verrouilles
     FROM "${s}".salaries sa
     LEFT JOIN "${s}".bulletins_paie b
       ON b.salarie_id = sa.id AND b.mois = $1 AND b.annee = $2
     LEFT JOIN "${s}".periodes_cloture cp
       ON cp.mois = $1 AND cp.annee = $2
     GROUP BY cp.cloturee, cp.date_cloture`,
    [mois, annee],
  );

  return result.rows[0] || null;
}

export async function cloturerPeriodeDB(
  schema: string,
  mois: number,
  annee: number,
): Promise<PeriodeCloture> {
  const s = getValidatedSchemaName(schema);

  // Verifier que tous les bulletins sont verrouilles
  const periode = await getCloturePeriode(schema, mois, annee);

  if (!periode) {
    throw new Error(`Aucun bulletin trouve pour la periode ${mois}/${annee}`);
  }
  if (periode.cloturee) {
    throw new Error(`La periode ${mois}/${annee} est deja cloturee`);
  }
  if (periode.nb_verrouilles !== periode.nb_bulletins || periode.nb_bulletins === 0) {
    throw new Error(
      `Impossible de cloturer : ${periode.nb_verrouilles}/${periode.nb_bulletins} bulletins verrouilles`,
    );
  }

  // Inserer ou mettre a jour la cloture
  await pool.query(
    `INSERT INTO "${s}".periodes_cloture (mois, annee, cloturee, date_cloture)
     VALUES ($1, $2, true, NOW())
     ON CONFLICT (mois, annee) DO UPDATE SET
       cloturee = true,
       date_cloture = NOW()`,
    [mois, annee],
  );

  logger.info('Periode %d/%d cloturee dans schema %s', mois, annee, s);

  const updated = await getCloturePeriode(schema, mois, annee);
  if (!updated) {
    throw new Error('Erreur lors de la recuperation de la periode cloturee');
  }
  return updated;
}

// ============ CUMULS ANNUELS ============

export async function getCumulsAnnuels(
  schema: string,
  annee: number,
): Promise<CumulAnnuel[]> {
  const s = getValidatedSchemaName(schema);
  const result = await pool.query(
    `SELECT
       sa.id AS salarie_id,
       sa.data->>'nom' AS nom,
       sa.data->>'prenom' AS prenom,
       $1::int AS annee,
       COALESCE(SUM((b.data->>'brut')::numeric), 0)::float AS brut_cumule,
       COALESCE(SUM((b.data->>'cnss_salariale')::numeric), 0)::float AS cnss_salariale_cumule,
       COALESCE(SUM((b.data->>'its')::numeric), 0)::float AS its_cumule,
       COALESCE(SUM((b.data->>'net_a_payer')::numeric), 0)::float AS net_cumule,
       COUNT(b.id)::int AS mois_travailles
     FROM "${s}".salaries sa
     LEFT JOIN "${s}".bulletins_paie b
       ON b.salarie_id = sa.id AND b.annee = $1
     GROUP BY sa.id, sa.data->>'nom', sa.data->>'prenom'
     ORDER BY sa.data->>'nom' ASC, sa.data->>'prenom' ASC`,
    [annee],
  );

  return result.rows;
}
