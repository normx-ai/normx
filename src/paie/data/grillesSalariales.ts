/* ========================================
   GRILLES SALARIALES PAR CONVENTION COLLECTIVE
   Congo-Brazzaville — Montants en FCFA
   ======================================== */
import type { GrilleSalariale, SelectOption } from '../types/paie.types';

export const GRILLES_SALARIALES: Record<string, GrilleSalariale> = {

  // ---- PETROLE — Grille signée le 23 février 2023, effet 01/01/2023, +3% ----
  PETROLE: {
    label: 'Pétrole',
    dateEffet: '2023-01-01',
    source: 'Grille salariale signée le 23 février 2023',
    categories: [
      { cat: 1, college: 'Exécution', echelons: [241000, 247000, 253000, 259000, 265000, 271000, 277000, 283000] },
      { cat: 2, college: 'Exécution', echelons: [253000, 260000, 267000, 274000, 281000, 288000, 295000, 302000] },
      { cat: 3, college: 'Exécution', echelons: [268000, 276000, 284000, 292000, 300000, 308000, 316000, 324000] },
      { cat: 4, college: 'Exécution', echelons: [286000, 295000, 304000, 313000, 322000, 331000, 340000, 349000] },
      { cat: 5, college: 'Exécution', echelons: [308000, 318000, 328000, 338000, 348000, 358000, 368000, 378000] },
      { cat: 6, college: 'Exécution', echelons: [335000, 346000, 357000, 368000, 379000, 390000, 401000, 412000] },
      { cat: 7, college: 'Exécution', echelons: [368000, 380000, 392000, 404000, 416000, 428000, 440000, 452000] },
      { cat: 8, college: 'Exécution', echelons: [408000, 422000, 436000, 450000, 464000, 478000, 492000, 506000] },
      { cat: 9, college: 'Exécution', echelons: [457000, 473000, 489000, 505000, 521000, 537000, 553000, 569000] },
      { cat: 10, college: 'Exécution', echelons: [517000, 535000, 553000, 571000, 589000, 607000, 625000, 643000] },
      { cat: 11, college: 'Exécution', echelons: [590000, 611000, 632000, 653000, 674000, 695000, 716000, 737000] },
      { cat: 12, college: 'Maîtrise', echelons: [681000, 706000, 731000, 756000, 781000, 806000, 831000, 856000] },
      { cat: 13, college: 'Maîtrise', echelons: [795000, 825000, 855000, 885000, 915000, 945000, 975000, 1005000] },
      { cat: 14, college: 'Cadres', echelons: [940000, 976000, 1012000, 1048000, 1084000, 1120000, 1156000, 1192000] },
      { cat: 15, college: 'Cadres', echelons: [1125000, 1169000, 1213000, 1257000, 1301000, 1345000, 1389000, 1433000] },
      { cat: 16, college: 'Cadres', echelons: [1365000, 1420000, 1475000, 1530000, 1585000, 1640000, 1695000, 1750000] },
      { cat: 17, college: 'Cadres', echelons: [1680000, 1750000, 1820000, 1890000, 1960000, 2030000, 2100000, 2170000] },
      { cat: 18, college: 'Cadres', echelons: [2100000, 2190000, 2280000, 2370000, 2460000, 2550000, 2640000, 2730000] },
      { cat: 19, college: 'Cadres', echelons: [2670000, 2790000, 2910000, 3030000, 3150000, 3270000, 3390000, 3510000] },
      { cat: 20, college: 'Cadres', echelons: [3445000, 3570000, 3695000, 3820000, 3945000, 4070000, 4195000, 4315000] },
    ],
  },

  // ---- COMMERCE — Protocole d'accord grille salariale du 05 Avril 2024, effet Janvier 2025 ----
  COMMERCE: {
    label: 'Commerce',
    dateEffet: '2025-01-01',
    source: 'Protocole d\'accord du 05 Avril 2024 — +12% (Cat 1-2), +9% (Cat 3-4), +7% (Cat 5-7), +5% (Cat 8-10)',
    categories: [
      { cat: 1, college: 'Exécution', echelons: [71000, 72139, 73278, 74417, 75556] },
      { cat: 2, college: 'Exécution', echelons: [76695, 78037, 79379, 80720, 82061] },
      { cat: 3, college: 'Exécution', echelons: [81169, 82475, 83780, 85086, 86391] },
      { cat: 4, college: 'Exécution', echelons: [87697, 91934, 96171, 100408, 104645] },
      { cat: 5, college: 'Maîtrise', echelons: [105939, 109342, 112745, 118978, 118978] },
      { cat: 6, college: 'Maîtrise', echelons: [122956, 126647, 130339, 134030, 137720] },
      { cat: 7, college: 'Maîtrise', echelons: [141411, 149081, 156751, 164421, 172090] },
      { cat: 8, college: 'Cadres', echelons: [173250, 174636, 176022, 177408, 178794] },
      { cat: 9, college: 'Cadres', echelons: [180180] },
      { cat: 10, college: 'Cadres', echelons: [222915] },
    ],
  },

  // ---- BAM — Valeur du point d'indice : 805 FCFA (01/06/2011) ----
  BAM: {
    label: 'Banques, Assurances et Microfinance',
    dateEffet: '2011-06-01',
    source: 'Convention BAM — Valeur du point : 805 FCFA',
    valeurPoint: 805,
    categories: [
      { cat: 3, college: 'Exécution', echelons: [80500, 84525, 88550, 92575, 96600] },
      { cat: 4, college: 'Exécution', echelons: [100625, 105455, 110285, 115115, 119945] },
      { cat: 5, college: 'Maîtrise', echelons: [124775, 131215, 137655, 144095, 150535] },
      { cat: 6, college: 'Maîtrise', echelons: [156975, 165025, 173075, 181125, 189175] },
      { cat: 7, college: 'Cadres', echelons: [197225, 208495, 219765, 231035, 242305] },
      { cat: 8, college: 'Cadres', echelons: [253575, 268065, 282555, 297045, 311535] },
      { cat: 9, college: 'Cadres', echelons: [326025, 345730, 365435, 385140, 404845] },
    ],
  },

  // ---- HOTELLERIE_CATERING — Grille annexée ----
  HOTELLERIE_CATERING: {
    label: 'Hôtellerie et Catering',
    dateEffet: '2010-03-01',
    source: 'Convention Hôtellerie et Catering — Pointe-Noire, 1er mars 2010',
    categories: [
      { cat: 1, college: 'Exécution', echelons: [54936, 56026, 57116] },
      { cat: 2, college: 'Exécution', echelons: [58206, 60604, 63874] },
      { cat: 3, college: 'Exécution', echelons: [61476, 64746, 66381] },
      { cat: 4, college: 'Exécution', echelons: [68016, 71613, 74937] },
      { cat: 5, college: 'Exécution', echelons: [77826, 83712, 85674] },
      { cat: 6, college: 'Maîtrise', echelons: [87636, 90906, 95811] },
      { cat: 7, college: 'Maîtrise', echelons: [102024, 106602, 109218] },
      { cat: 8, college: 'Cadres', echelons: [112488, 117066, 122952] },
      { cat: 9, college: 'Cadres', echelons: [128838, 134724, 138321] },
      { cat: 10, college: 'Cadres', echelons: [141918, 143989, 146060] },
      { cat: 11, college: 'Cadres', echelons: [148131, 158758] },
      { cat: 12, college: 'Hors catégorie', echelons: [169386] },
    ],
  },

  // ---- DOMESTIQUE — Grille annexée ----
  DOMESTIQUE: {
    label: 'Domestique de Maison',
    dateEffet: '2010-01-01',
    source: 'Convention domestique de maison',
    categories: [
      { cat: 1, college: 'Exécution', echelons: [40370, 41620] },
      { cat: 2, college: 'Exécution', echelons: [42870, 44120] },
      { cat: 3, college: 'Exécution', echelons: [45870, 47120] },
      { cat: 4, college: 'Exécution', echelons: [49370, 51370] },
      { cat: 5, college: 'Exécution', echelons: [53370, 55870] },
    ],
  },

  // ---- INFO_COMM — Système indiciel ----
  INFO_COMM: {
    label: 'Information et Communication',
    dateEffet: '2015-01-01',
    source: 'Convention Info & Comm — Système indiciel (10 échelons/catégorie)',
    categories: [
      { cat: 1, college: 'Exécution', echelons: [55850, 60513, 65175, 69838, 76825, 80025, 83225, 86425, 93488, 97800] },
      { cat: 2, college: 'Exécution', echelons: [60500, 65388, 70275, 75163, 82050, 85338, 88625, 91913, 99300, 103600] },
      { cat: 3, college: 'Exécution', echelons: [65000, 70556, 76113, 81669, 87225, 91781, 96338, 100894, 105006, 109450] },
      { cat: 4, college: 'Exécution', echelons: [69700, 75431, 81163, 86894, 92625, 97394, 102163, 106931, 111288, 115550] },
      { cat: 5, college: 'Maîtrise', echelons: [74700, 80656, 86613, 92569, 98525, 104481, 110438, 116394, 119394, 122350] },
      { cat: 6, college: 'Maîtrise', echelons: [80050, 86344, 92638, 98931, 105225, 111519, 117813, 124106, 127263, 130400] },
      { cat: 7, college: 'Maîtrise', echelons: [94400, 100913, 107425, 113938, 120525, 127038, 133550, 140063, 144400, 148700] },
      { cat: 8, college: 'Cadres', echelons: [132700, 137188, 141675, 146163, 150625, 157700, 164775, 171850, 177450, 183000] },
      { cat: 9, college: 'Cadres', echelons: [172000, 176375, 180750, 185125, 191500, 197875, 204250, 207563, 212250, 217000] },
    ],
  },

  // ---- PARA_PETROLE — Même grille que NTIC (conventions très similaires) ----
  // Grille non fournie dans le PDF, référence NTIC

  // ---- Conventions sans grille dans les PDFs fournis ----
  // BTP, INDUSTRIE, NTIC, FORESTIERE, AGRI_FORET, MINIERE,
  // TRANSPORT_AERIEN, AUXILIAIRES_TRANSPORT, PECHE_MARITIME
  // => grilles en annexes séparées non incluses dans les fichiers PDF
};

/**
 * Retourne la grille salariale d'une convention
 */
export function getGrille(conventionCode: string): GrilleSalariale | null {
  return GRILLES_SALARIALES[conventionCode] || null;
}

/**
 * Retourne les catégories disponibles pour une convention
 */
export function getCategoriesGrille(conventionCode: string): { value: string; label: string; college: string; nbEchelons: number }[] {
  const grille = getGrille(conventionCode);
  if (!grille) return [];
  return grille.categories.map(c => ({
    value: String(c.cat),
    label: `Cat ${c.cat} — ${c.college}`,
    college: c.college,
    nbEchelons: c.echelons.length,
  }));
}

/**
 * Retourne les échelons pour une catégorie donnée
 */
export function getEchelonsGrille(conventionCode: string, categorie: string | number): { value: string; label: string; montant: number }[] {
  const grille = getGrille(conventionCode);
  if (!grille) return [];
  const cat = grille.categories.find(c => String(c.cat) === String(categorie));
  if (!cat) return [];
  return cat.echelons.map((montant, i) => ({
    value: String(i + 1),
    label: `Ech ${i + 1} — ${new Intl.NumberFormat('fr-FR').format(montant)} FCFA`,
    montant,
  }));
}

/**
 * Retourne le salaire de base pour une convention/catégorie/échelon
 */
export function getSalaireBase(conventionCode: string, categorie: string | number, echelon: string | number): number | null {
  const grille = getGrille(conventionCode);
  if (!grille) return null;
  const cat = grille.categories.find(c => String(c.cat) === String(categorie));
  if (!cat) return null;
  const idx = parseInt(String(echelon), 10) - 1;
  if (idx < 0 || idx >= cat.echelons.length) return null;
  return cat.echelons[idx];
}

export default GRILLES_SALARIALES;
