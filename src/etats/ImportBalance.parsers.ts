import * as XLSX from 'xlsx';
import { BalanceLigne } from '../types';

export function mapHeaders(headers: string[]): Record<string, number> {
  const colMap: Record<string, number> = {};
  const lc = headers.map(h => h.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\n/g, ' '));

  // Collect all "solde ... debit" and "solde ... credit" columns by index
  const soldeDebitCols: number[] = [];
  const soldeCreditCols: number[] = [];

  lc.forEach((h, i) => {
    // Compte
    if ((h.includes('compte') || h.includes('cpte')) && (h.includes('num') || h.includes('n°') || h === 'compte' || h === 'cpte')) {
      if (colMap.numero_compte === undefined) colMap.numero_compte = i;
    }
    else if (h === 'numero' || h === 'compte' || h === 'cpte' || h === 'n° cpte' || h === 'n° compte') {
      if (colMap.numero_compte === undefined) colMap.numero_compte = i;
    }
    // Libellé
    else if (h.includes('libelle') || h.includes('intitule') || h.includes('designation')) {
      if (colMap.libelle_compte === undefined) colMap.libelle_compte = i;
    }
    // SF Débit / Solde final débit
    else if ((h.includes('sf') && h.includes('debit')) || (h.includes('solde') && (h.includes('final') || h.includes('fin')) && h.includes('debit'))) {
      colMap.solde_debiteur = i;
    }
    // SF Crédit / Solde final crédit
    else if ((h.includes('sf') && h.includes('credit')) || (h.includes('solde') && (h.includes('final') || h.includes('fin')) && h.includes('credit'))) {
      colMap.solde_crediteur = i;
    }
    // SI Débit / Solde initial débit
    else if ((h.includes('si') && !h.includes('solde') && h.includes('debit')) || (h.includes('solde') && (h.includes('initial') || h.includes('debut')) && h.includes('debit'))) {
      colMap.si_debit = i;
    }
    // SI Crédit / Solde initial crédit
    else if ((h.includes('si') && !h.includes('solde') && h.includes('credit')) || (h.includes('solde') && (h.includes('initial') || h.includes('debut')) && h.includes('credit'))) {
      colMap.si_credit = i;
    }
    // Débit (mouvement)
    else if (h === 'debit' || (h.includes('mouvement') && h.includes('debit')) || (h.includes('mvt') && h.includes('debit'))) {
      if (colMap.debit === undefined) colMap.debit = i;
    }
    // Crédit (mouvement)
    else if (h === 'credit' || (h.includes('mouvement') && h.includes('credit')) || (h.includes('mvt') && h.includes('credit'))) {
      if (colMap.credit === undefined) colMap.credit = i;
    }
    // Solde générique débiteur — collect all for later disambiguation
    else if (h.includes('solde') && h.includes('debit')) {
      soldeDebitCols.push(i);
    }
    // Solde générique créditeur
    else if (h.includes('solde') && h.includes('credit')) {
      soldeCreditCols.push(i);
    }
  });

  // Disambiguate: if we have 2 "solde debit" cols, first is SI, second is SF
  if (soldeDebitCols.length === 2 && colMap.si_debit === undefined && colMap.solde_debiteur === undefined) {
    colMap.si_debit = soldeDebitCols[0];
    colMap.solde_debiteur = soldeDebitCols[1];
  } else if (soldeDebitCols.length === 1) {
    if (colMap.solde_debiteur === undefined) colMap.solde_debiteur = soldeDebitCols[0];
  }

  if (soldeCreditCols.length === 2 && colMap.si_credit === undefined && colMap.solde_crediteur === undefined) {
    colMap.si_credit = soldeCreditCols[0];
    colMap.solde_crediteur = soldeCreditCols[1];
  } else if (soldeCreditCols.length === 1) {
    if (colMap.solde_crediteur === undefined) colMap.solde_crediteur = soldeCreditCols[0];
  }

  // Fallback par position seulement si aucun header n'a été reconnu
  const hasAnyMatch = Object.keys(colMap).length > 0;
  if (!hasAnyMatch) {
    // Format 6 colonnes : Compte, Libellé, Débit, Crédit, Solde D, Solde C
    colMap.numero_compte = 0;
    colMap.libelle_compte = 1;
    colMap.debit = 2;
    colMap.credit = 3;
    colMap.solde_debiteur = 4;
    colMap.solde_crediteur = 5;
  } else {
    if (colMap.numero_compte === undefined) colMap.numero_compte = 0;
    if (colMap.libelle_compte === undefined) colMap.libelle_compte = 1;
  }

  return colMap;
}

type CellValue = string | number | boolean | null;

export const parseNum = (val: CellValue): number => {
  if (val == null) return 0;
  if (typeof val === 'number') return val;
  return parseFloat(String(val).replace(/\s/g, '').replace(',', '.')) || 0;
};

export function rowsToBalanceLignes(rows: CellValue[][], headers: string[]): BalanceLigne[] {
  const colMap = mapHeaders(headers);
  return rows.map(cols => ({
    numero_compte: String(cols[colMap.numero_compte] ?? '').trim(),
    libelle_compte: String(cols[colMap.libelle_compte] ?? '').trim(),
    si_debit: colMap.si_debit !== undefined ? parseNum(cols[colMap.si_debit]) : 0,
    si_credit: colMap.si_credit !== undefined ? parseNum(cols[colMap.si_credit]) : 0,
    debit: parseNum(cols[colMap.debit]),
    credit: parseNum(cols[colMap.credit]),
    solde_debiteur: parseNum(cols[colMap.solde_debiteur]),
    solde_crediteur: parseNum(cols[colMap.solde_crediteur]),
  })).filter(l => l.numero_compte);
}

export function parseCSV(text: string): BalanceLigne[] {
  const lines = text.trim().split('\n');
  if (lines.length < 2) return [];
  const headers = lines[0].split(';').map(h => h.trim());
  const rows = lines.slice(1).filter(l => l.trim()).map(line => line.split(';').map(c => c.trim()));
  return rowsToBalanceLignes(rows, headers);
}

export function parseExcel(buffer: ArrayBuffer): BalanceLigne[] {
  const wb = XLSX.read(buffer, { type: 'array' });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const data: CellValue[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' }) as CellValue[][];
  if (data.length < 2) return [];
  const headers = (data[0] as string[]).map(h => String(h));
  return rowsToBalanceLignes(data.slice(1), headers);
}

export function formatMontant(val: number): string {
  if (!val || val === 0) return '';
  return val.toLocaleString('fr-FR', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

// ========== Interfaces ==========

export interface PlanCompte {
  numero: string;
  libelle: string;
  classe: number;
}

export interface CompteAnomalie {
  ligneId: number;
  numero: string;
  libelle: string;
  suggestion: PlanCompte | null;
  similarites: PlanCompte[];
}

// ========== Analyse constants & helpers ==========

// Tous les préfixes couverts par Bilan, CR et TFT (SYSCOHADA)
export const ETATS_PREFIXES: string[] = [
  // Bilan Actif
  '211','2181','2191','212','213','214','2193','215','216','217','218','2198',
  '22','231','232','233','237','2391','234','235','238','2392','2393',
  '24','245','2495','251','252','26','27','485','488',
  '31','32','33','34','35','36','37','38',
  '409','41','419','185','42','43','44','45','46','47','478',
  '50','51','52','53','54','55','57','581','582',
  // Bilan Actif — amortissements/dépréciations
  '2811','2818','2911','2918','2919','2812','2813','2814','2912','2913','2914',
  '2815','2816','2915','2916','2817','282','292',
  '2831','2832','2833','2837','2931','2932','2933','2937','2939',
  '2834','2835','2838','2934','2935','2938','284','294','2949','2845','2945',
  '2951','2952','296','297','498','39',
  '490','491','492','493','494','495','496','497',
  '590','591','592','593','594',
  // Bilan Passif
  '101','102','103','104','109','105','106','111','112','113','118',
  '12','14','15','16','181','182','183','184','17','19',
  '481','482','484','4998',
  '40','479','499','599','564','565','561','566',
  // CR Produits
  '701','702','703','704','705','706','707','72','71','75','781',
  '791','798','799','77','797','787','82','84','86','88',
  // CR Charges
  '601','602','604','605','608','61','62','63','64','65','66',
  '681','691','67','697','81','83','85','87','89',
  // CR Variations
  '6031','6032','6033','73',
];

// Vérifier si un compte est couvert par au moins un préfixe des états financiers
export function isCompteInEtats(num: string): boolean {
  return ETATS_PREFIXES.some(prefix => num.startsWith(prefix));
}

// Similarité simple entre 2 chaînes (Jaccard sur bigrammes)
function similarity(a: string, b: string): number {
  const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, ' ').trim();
  const bigrams = (s: string): Set<string> => {
    const bg = new Set<string>();
    const w = norm(s);
    for (let i = 0; i < w.length - 1; i++) bg.add(w.slice(i, i + 2));
    return bg;
  };
  const bgA = bigrams(a);
  const bgB = bigrams(b);
  if (bgA.size === 0 || bgB.size === 0) return 0;
  let inter = 0;
  bgA.forEach(g => { if (bgB.has(g)) inter++; });
  return inter / (bgA.size + bgB.size - inter);
}

// Trouver le compte du plan le plus proche par numéro (même préfixe)
export function findSuggestionByNumero(num: string, planComptable: PlanCompte[]): PlanCompte | null {
  for (let len = Math.min(num.length, 6); len >= 2; len--) {
    const prefix = num.slice(0, len);
    const match = planComptable.find(p => p.numero === prefix);
    if (match) return match;
  }
  return null;
}

// Trouver les comptes avec libellé similaire (même classe)
export function findSimilarByLibelle(num: string, libelle: string, planComptable: PlanCompte[]): PlanCompte[] {
  const classe = num.slice(0, 1);
  const candidates = planComptable.filter(p =>
    String(p.classe) === classe && p.numero.length >= 3 && p.numero.length <= 6
  );
  const scored = candidates
    .map(p => ({ ...p, score: similarity(libelle, p.libelle) }))
    .filter(p => p.score > 0.3)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);
  return scored;
}
