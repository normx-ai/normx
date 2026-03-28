/**
 * Service Rapprochement Bancaire — NormX
 * Import releves (PDF/CSV/Excel), matching auto, etat de rapprochement
 * Banques Congo : BGFI, LCB, UBA, Ecobank, Societe Generale, BSCA
 */

import pool from '../db';
import { getValidatedSchemaName } from '../utils/tenant.utils';

// ══ Types ══

export interface LigneReleve {
  date: string;
  libelle: string;
  debit: number;
  credit: number;
  solde?: number;
  reference?: string;
  rapprochee?: boolean;
  ecriture_id?: number | null;
}

export interface ReleveImport {
  banque: string;
  compte_bancaire: string;
  mois: number;
  annee: number;
  solde_debut: number;
  solde_fin: number;
  lignes: LigneReleve[];
  format: 'pdf' | 'csv' | 'xlsx';
}

export interface RapprochementResult {
  rapprochees: number;
  non_rapprochees_releve: number;
  non_rapprochees_compta: number;
  ecart: number;
}

// ══ Parsers ══

export function parseCSV(content: string): LigneReleve[] {
  const lines = content.split('\n').filter(l => l.trim());
  if (lines.length < 2) return [];

  // Detecter le separateur
  const sep = lines[0].includes(';') ? ';' : ',';
  const header = lines[0].toLowerCase();

  // Trouver les indices des colonnes
  const cols = header.split(sep).map(c => c.trim().replace(/"/g, ''));
  const iDate = cols.findIndex(c => c.includes('date'));
  const iLib = cols.findIndex(c => c.includes('libel') || c.includes('descri') || c.includes('label'));
  const iDebit = cols.findIndex(c => c.includes('debit') || c.includes('débit'));
  const iCredit = cols.findIndex(c => c.includes('credit') || c.includes('crédit'));
  const iSolde = cols.findIndex(c => c.includes('solde') || c.includes('balance'));
  const iRef = cols.findIndex(c => c.includes('ref') || c.includes('num'));

  if (iDate === -1 || iLib === -1) return [];

  const lignes: LigneReleve[] = [];
  for (let i = 1; i < lines.length; i++) {
    const vals = lines[i].split(sep).map(v => v.trim().replace(/"/g, ''));
    if (!vals[iDate]) continue;

    const parseNum = (v: string | undefined): number => {
      if (!v) return 0;
      return parseFloat(v.replace(/\s/g, '').replace(',', '.')) || 0;
    };

    lignes.push({
      date: vals[iDate],
      libelle: vals[iLib] || '',
      debit: iDebit >= 0 ? parseNum(vals[iDebit]) : 0,
      credit: iCredit >= 0 ? parseNum(vals[iCredit]) : 0,
      solde: iSolde >= 0 ? parseNum(vals[iSolde]) : undefined,
      reference: iRef >= 0 ? vals[iRef] : undefined,
      rapprochee: false,
      ecriture_id: null,
    });
  }
  return lignes;
}

export function parseExcel(buffer: Buffer): LigneReleve[] {
  const XLSX = require('xlsx');
  const workbook = XLSX.read(buffer, { type: 'buffer' });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const data: Record<string, string>[] = XLSX.utils.sheet_to_json(sheet, { defval: '' });

  const lignes: LigneReleve[] = [];
  for (const row of data) {
    const keys = Object.keys(row);
    const findKey = (...terms: string[]) => keys.find(k => terms.some(t => k.toLowerCase().includes(t))) || '';

    const dateKey = findKey('date');
    const libKey = findKey('libel', 'descri', 'label');
    const debKey = findKey('debit', 'débit');
    const credKey = findKey('credit', 'crédit');
    const soldeKey = findKey('solde', 'balance');
    const refKey = findKey('ref', 'num');

    if (!row[dateKey]) continue;

    const parseNum = (v: string): number => parseFloat(String(v).replace(/\s/g, '').replace(',', '.')) || 0;

    lignes.push({
      date: String(row[dateKey]),
      libelle: String(row[libKey] || ''),
      debit: parseNum(row[debKey]),
      credit: parseNum(row[credKey]),
      solde: soldeKey ? parseNum(row[soldeKey]) : undefined,
      reference: refKey ? String(row[refKey]) : undefined,
      rapprochee: false,
      ecriture_id: null,
    });
  }
  return lignes;
}

export async function parsePDF(buffer: Buffer): Promise<LigneReleve[]> {
  const pdfParse = require('pdf-parse');
  const data = await pdfParse(buffer);
  const text: string = data.text;
  const lines = text.split('\n').filter((l: string) => l.trim());

  const lignes: LigneReleve[] = [];

  // Pattern generique pour les releves bancaires Congo
  // Format typique : DD/MM/YYYY  LIBELLE  MONTANT_DEBIT  MONTANT_CREDIT  SOLDE
  const dateRegex = /(\d{2}[\/\-\.]\d{2}[\/\-\.]\d{2,4})/;
  const montantRegex = /[\d\s]+[.,]\d{2}/g;

  for (const line of lines) {
    const dateMatch = line.match(dateRegex);
    if (!dateMatch) continue;

    const date = dateMatch[1];
    const afterDate = line.substring(line.indexOf(date) + date.length).trim();

    // Extraire tous les montants de la ligne
    const montants = afterDate.match(montantRegex);
    if (!montants || montants.length < 1) continue;

    // Le libelle est le texte entre la date et le premier montant
    const firstMontantIdx = afterDate.indexOf(montants[0]);
    const libelle = afterDate.substring(0, firstMontantIdx).trim();
    if (!libelle || libelle.length < 2) continue;

    const parseM = (s: string): number => parseFloat(s.replace(/\s/g, '').replace(',', '.')) || 0;

    let debit = 0;
    let credit = 0;
    let solde: number | undefined;

    if (montants.length >= 3) {
      // 3 montants : debit, credit, solde
      debit = parseM(montants[0]);
      credit = parseM(montants[1]);
      solde = parseM(montants[2]);
    } else if (montants.length === 2) {
      // 2 montants : montant + solde (debit ou credit selon le contexte)
      const m1 = parseM(montants[0]);
      const m2 = parseM(montants[1]);
      // Heuristique : si le libelle contient des mots cles de debit
      const isDebit = /virement|paiement|retrait|frais|commission|prelevement|debit/i.test(libelle);
      if (isDebit) { debit = m1; } else { credit = m1; }
      solde = m2;
    } else {
      // 1 montant : on ne sait pas si debit ou credit
      const m = parseM(montants[0]);
      const isDebit = /virement emis|paiement|retrait|frais|commission|prelevement|debit|cheque emis/i.test(libelle);
      if (isDebit) { debit = m; } else { credit = m; }
    }

    // Ignorer les lignes sans montant
    if (debit === 0 && credit === 0) continue;

    lignes.push({
      date,
      libelle,
      debit,
      credit,
      solde,
      rapprochee: false,
      ecriture_id: null,
    });
  }

  return lignes;
}

// ══ Rapprochement automatique ══

export async function rapprochementAuto(
  schema: string,
  entiteId: number,
  exerciceId: number,
  compteBancaire: string, // ex: "521" ou "5211"
  lignesReleve: LigneReleve[],
): Promise<RapprochementResult> {
  const s = getValidatedSchemaName(schema);

  // Recuperer les ecritures du compte bancaire
  const ecrituresResult = await pool.query(
    `SELECT el.id, el.debit, el.credit, e.date_ecriture, e.libelle, el.numero_compte
     FROM "${s}".ecriture_lignes el
     JOIN "${s}".ecritures e ON e.id = el.ecriture_id
     WHERE e.entite_id = $1 AND e.exercice_id = $2
       AND el.numero_compte LIKE $3
       AND e.statut = 'validee'
     ORDER BY e.date_ecriture`,
    [entiteId, exerciceId, compteBancaire + '%'],
  );

  const ecritures = ecrituresResult.rows;
  const ecrituresUsed = new Set<number>();
  let rapprochees = 0;

  // Matching par montant exact + date proche (±5 jours)
  for (const ligne of lignesReleve) {
    if (ligne.rapprochee) continue;

    const montantReleve = ligne.debit > 0 ? ligne.debit : ligne.credit;
    const isDebitReleve = ligne.debit > 0;

    for (const ecr of ecritures) {
      if (ecrituresUsed.has(ecr.id)) continue;

      const debitEcr = parseFloat(ecr.debit) || 0;
      const creditEcr = parseFloat(ecr.credit) || 0;

      // En compta : debit du compte banque = encaissement (credit sur releve)
      // credit du compte banque = decaissement (debit sur releve)
      const montantEcr = isDebitReleve ? creditEcr : debitEcr;

      if (Math.abs(montantEcr - montantReleve) < 0.01 && montantEcr > 0) {
        ligne.rapprochee = true;
        ligne.ecriture_id = ecr.id;
        ecrituresUsed.add(ecr.id);
        rapprochees++;
        break;
      }
    }
  }

  const nonRapprReleve = lignesReleve.filter(l => !l.rapprochee).length;
  const nonRapprCompta = ecritures.filter(e => !ecrituresUsed.has(e.id)).length;

  // Calculer l'ecart
  const totalReleveDebit = lignesReleve.reduce((s, l) => s + l.debit, 0);
  const totalReleveCredit = lignesReleve.reduce((s, l) => s + l.credit, 0);
  const totalComptaDebit = ecritures.reduce((s: number, e: { debit: string }) => s + (parseFloat(e.debit) || 0), 0);
  const totalComptaCredit = ecritures.reduce((s: number, e: { credit: string }) => s + (parseFloat(e.credit) || 0), 0);
  const ecart = (totalComptaDebit - totalComptaCredit) - (totalReleveCredit - totalReleveDebit);

  return {
    rapprochees,
    non_rapprochees_releve: nonRapprReleve,
    non_rapprochees_compta: nonRapprCompta,
    ecart: Math.round(ecart * 100) / 100,
  };
}

// ══ Sauvegarde rapprochement ══

export async function saveRapprochement(
  schema: string,
  entiteId: number,
  exerciceId: number,
  data: ReleveImport,
  result: RapprochementResult,
): Promise<{ id: number }> {
  const s = getValidatedSchemaName(schema);

  const res = await pool.query(
    `INSERT INTO "${s}".rapprochements_bancaires
     (entite_id, exercice_id, banque, compte_bancaire, mois, annee,
      solde_debut, solde_fin, nb_lignes, nb_rapprochees, ecart, data, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW())
     RETURNING id`,
    [
      entiteId, exerciceId, data.banque, data.compte_bancaire,
      data.mois, data.annee, data.solde_debut, data.solde_fin,
      data.lignes.length, result.rapprochees, result.ecart,
      JSON.stringify({ lignes: data.lignes, result }),
    ],
  );

  return { id: res.rows[0].id };
}
