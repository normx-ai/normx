import type { BalanceLigne, TFTRow } from '../types';

// ===================== TABLEAU DES FLUX DE TRESORERIE — SYSCOHADA =====================
// Ref: Le Praticien Comptable OHADA p.1274-1282
// Formules detaillees conformes aux tableaux de correspondance du PDF

export const PRODUITS_PREFIXES: string[] = ['70', '71', '72', '73', '75', '77', '78', '79', '82', '84', '86', '88'];
export const CHARGES_PREFIXES: string[] = ['60', '61', '62', '63', '64', '65', '66', '67', '68', '69', '81', '83', '85', '87', '89'];
export const DOTATIONS_PREFIXES: string[] = ['68', '69'];
export const REPRISES_PREFIXES_TFT: string[] = ['79'];

// ===================== TFT ROWS =====================
export const TFT_ROWS: TFTRow[] = [
  { ref: 'ZA', type: 'indent', note: 'A', libelle: 'Tresorerie nette au 1er janvier (Tresorerie actif N-1 - Tresorerie passif N-1)' },

  { type: 'section', libelle: 'Flux de tresorerie provenant des activites operationnelles' },
  { ref: 'FA', type: 'indent', note: '', libelle: 'Capacite d\'Autofinancement Globale (CAFG)' },
  { ref: 'FB', type: 'indent', note: '', libelle: '- Variation de l\'actif circulant HAO' },
  { ref: 'FC', type: 'indent', note: '', libelle: '- Variation des stocks' },
  { ref: 'FD', type: 'indent', note: '', libelle: '- Variation des creances' },
  { ref: 'FE', type: 'indent', note: '', libelle: '+ Variation du passif circulant' },
  { type: 'label', libelle: 'Variation du BF lie aux activites operationnelles (FB+FC+FD+FE)' },
  { ref: 'ZB', type: 'subtotal', note: 'B', libelle: 'Flux de tresorerie provenant des activites operationnelles (somme FA a FE)' },

  { type: 'section', libelle: 'Flux de tresorerie provenant des activites d\'investissement' },
  { ref: 'FF', type: 'indent', note: '', libelle: '- Decaissements lies aux acquisitions d\'immobilisations incorporelles' },
  { ref: 'FG', type: 'indent', note: '', libelle: '- Decaissements lies aux acquisitions d\'immobilisations corporelles' },
  { ref: 'FH', type: 'indent', note: '', libelle: '- Decaissements lies aux acquisitions d\'immobilisations financieres' },
  { ref: 'FI', type: 'indent', note: '', libelle: '+ Encaissements lies aux cessions d\'immobilisations incorporelles et corporelles' },
  { ref: 'FJ', type: 'indent', note: '', libelle: '+ Encaissements lies aux cessions d\'immobilisations financieres' },
  { ref: 'ZC', type: 'subtotal', note: 'C', libelle: 'Flux de tresorerie provenant des activites d\'investissement (somme FF a FJ)' },

  { type: 'section', libelle: 'Flux de tresorerie provenant du financement par les capitaux propres' },
  { ref: 'FK', type: 'indent', note: '', libelle: '+ Augmentations de capital par apports nouveaux' },
  { ref: 'FL', type: 'indent', note: '', libelle: '+ Subventions d\'investissement recues' },
  { ref: 'FM', type: 'indent', note: '', libelle: '- Prelevements sur le capital' },
  { ref: 'FN', type: 'indent', note: '', libelle: '- Dividendes verses' },
  { ref: 'ZD', type: 'subtotal', note: 'D', libelle: 'Flux de tresorerie provenant des capitaux propres (somme FK a FN)' },

  { type: 'section', libelle: 'Tresorerie provenant du financement par les capitaux etrangers' },
  { ref: 'FO', type: 'indent', note: '', libelle: '+ Emprunts' },
  { ref: 'FP', type: 'indent', note: '', libelle: '+ Autres dettes financieres' },
  { ref: 'FQ', type: 'indent', note: '', libelle: '- Remboursements des emprunts et autres dettes financieres' },
  { ref: 'ZE', type: 'subtotal', note: 'E', libelle: 'Flux de tresorerie provenant des capitaux etrangers (somme FO a FQ)' },

  { ref: 'ZF', type: 'result', note: 'F', libelle: 'Flux de tresorerie provenant des activites de financement (D+E)' },
  { ref: 'ZG', type: 'result', note: 'G', libelle: 'VARIATION DE LA TRESORERIE NETTE DE LA PERIODE (B+C+F)' },
  { ref: 'ZH', type: 'total', note: 'H', libelle: 'Tresorerie nette au 31 Decembre (G+A)' },
  { ref: 'ZI', type: 'indent', note: '', libelle: 'Controle : Tresorerie actif N - Tresorerie passif N' },
];

export function formatMontant(val: number): string {
  if (!val || val === 0) return '';
  const neg = val < 0;
  const abs = Math.abs(Math.round(val));
  const formatted = abs.toLocaleString('fr-FR');
  return neg ? '(' + formatted + ')' : formatted;
}

export function matchesComptes(numCompte: string, prefixes: string[]): boolean {
  return prefixes.some(p => numCompte.startsWith(p));
}

// ===================== HELPERS — Soldes et mouvements =====================

export function getSD(l: BalanceLigne): number { return parseFloat(String(l.solde_debiteur_revise ?? l.solde_debiteur)) || 0; }
export function getSC(l: BalanceLigne): number { return parseFloat(String(l.solde_crediteur_revise ?? l.solde_crediteur)) || 0; }

// Solde debiteur net (SD - SC)
export function sumSoldeDebiteur(lignes: BalanceLigne[], prefixes: string[], excludes: string[] = []): number {
  let total = 0;
  for (const l of lignes) {
    const num = (l.numero_compte || '').trim();
    if (matchesComptes(num, prefixes) && !matchesComptes(num, excludes))
      total += getSD(l) - getSC(l);
  }
  return total;
}

// Solde crediteur net (SC - SD)
export function sumSoldeCrediteur(lignes: BalanceLigne[], prefixes: string[], excludes: string[] = []): number {
  let total = 0;
  for (const l of lignes) {
    const num = (l.numero_compte || '').trim();
    if (matchesComptes(num, prefixes) && !matchesComptes(num, excludes))
      total += getSC(l) - getSD(l);
  }
  return total;
}

// Solde debiteur brut (SD uniquement, sans nettoyer SC)
export function rawSD(lignes: BalanceLigne[], prefixes: string[], excludes: string[] = []): number {
  let total = 0;
  for (const l of lignes) {
    const num = (l.numero_compte || '').trim();
    if (matchesComptes(num, prefixes) && !matchesComptes(num, excludes))
      total += getSD(l);
  }
  return total;
}

// Solde crediteur brut (SC uniquement)
export function rawSC(lignes: BalanceLigne[], prefixes: string[], excludes: string[] = []): number {
  let total = 0;
  for (const l of lignes) {
    const num = (l.numero_compte || '').trim();
    if (matchesComptes(num, prefixes) && !matchesComptes(num, excludes))
      total += getSC(l);
  }
  return total;
}

// Mouvement debit (total des debits de la periode)
export function sumMvtDebit(lignes: BalanceLigne[], prefixes: string[], excludes: string[] = []): number {
  let total = 0;
  for (const l of lignes) {
    const num = (l.numero_compte || '').trim();
    if (matchesComptes(num, prefixes) && !matchesComptes(num, excludes))
      total += parseFloat(String(l.debit)) || 0;
  }
  return total;
}

// Mouvement credit (total des credits de la periode)
export function sumMvtCredit(lignes: BalanceLigne[], prefixes: string[], excludes: string[] = []): number {
  let total = 0;
  for (const l of lignes) {
    const num = (l.numero_compte || '').trim();
    if (matchesComptes(num, prefixes) && !matchesComptes(num, excludes))
      total += parseFloat(String(l.credit)) || 0;
  }
  return total;
}

// ===================== HELPERS — Valeurs bilan =====================

// Actif net = brut (SD-SC) - amort/deprec (SC-SD), avec gestion des comptes partages (debitOnly)
export function actifNet(lignes: BalanceLigne[], brutPfx: string[], amortPfx: string[] = [], brutExcl: string[] = [], amortExcl: string[] = [], debitOnlyPfx: string[] = []): number {
  let brut = 0, amort = 0;
  for (const l of lignes) {
    const num = (l.numero_compte || '').trim();
    const sd = getSD(l), sc = getSC(l);
    if (matchesComptes(num, brutPfx) && !matchesComptes(num, brutExcl)) {
      if (debitOnlyPfx.length > 0 && matchesComptes(num, debitOnlyPfx)) {
        if (sd > sc) brut += sd - sc;
      } else {
        brut += sd - sc;
      }
    }
    if (amortPfx.length > 0 && matchesComptes(num, amortPfx) && !matchesComptes(num, amortExcl))
      amort += sc - sd;
  }
  return brut - amort;
}

// Passif value (crediteur), avec gestion des comptes partages (creditOnly) et debitAccount
export function passifVal(lignes: BalanceLigne[], comptes: string[], exclude: string[] = [], creditOnlyPfx: string[] = []): number {
  let val = 0;
  for (const l of lignes) {
    const num = (l.numero_compte || '').trim();
    const sd = getSD(l), sc = getSC(l);
    if (matchesComptes(num, comptes) && !matchesComptes(num, exclude)) {
      if (creditOnlyPfx.length > 0 && matchesComptes(num, creditOnlyPfx)) {
        if (sc > sd) val += sc - sd;
      } else {
        val += sc - sd;
      }
    }
  }
  return val;
}

// ===================== REFS BILAN pour TFT =====================

// BA: Actif circulant HAO net
export function bilanBA(l: BalanceLigne[]): number { return actifNet(l, ['485', '488'], ['498']); }

// BB: Stocks et encours nets
export function bilanBB(l: BalanceLigne[]): number { return actifNet(l, ['31', '32', '33', '34', '35', '36', '37', '38'], ['39']); }

// BH: Fournisseurs, avances versees net
export function bilanBH(l: BalanceLigne[]): number { return actifNet(l, ['409'], ['490']); }

// BI: Clients net (excl 419 = avances recues, debitOnly pour comptes 41)
export function bilanBI(l: BalanceLigne[]): number { return actifNet(l, ['41'], ['491'], ['419'], [], ['41']); }

// BJ: Autres creances net (excl 478 = ecart conversion actif, debitOnly pour 42-47)
export function bilanBJ(l: BalanceLigne[]): number {
  return actifNet(l, ['185', '42', '43', '44', '45', '46', '47'],
    ['492', '493', '494', '495', '496', '497'], ['478'], [], ['42', '43', '44', '45', '46', '47']);
}

// Construit des lignes virtuelles ou solde_debiteur = si_debit et solde_crediteur = si_credit
// Permet de reutiliser bilanTresoActif/bilanTresoPassif avec les soldes d'ouverture
function lignesFromSI(lignes: BalanceLigne[]): BalanceLigne[] {
  return lignes.map(l => ({
    ...l,
    solde_debiteur: parseFloat(String(l.si_debit ?? 0)) || 0,
    solde_crediteur: parseFloat(String(l.si_credit ?? 0)) || 0,
  }));
}

// Tresorerie actif nette: BQ + BR + BS
export function bilanTresoActif(l: BalanceLigne[]): number {
  const BQ = actifNet(l, ['50'], ['590']);
  const BR = actifNet(l, ['51'], ['591']);
  const BS = actifNet(l, ['52', '53', '54', '55', '57', '581', '582'], ['592', '593', '594'], [], [], ['52', '53']);
  return BQ + BR + BS;
}

// DP: Total passif circulant (DH+DI+DJ+DK+DM+DN)
export function bilanDP(l: BalanceLigne[]): number {
  const DH = passifVal(l, ['481', '482', '484', '4998']);
  const DI = passifVal(l, ['419']);
  const DJ = passifVal(l, ['40'], ['409']);
  const DK = passifVal(l, ['42', '43', '44'], [], ['42', '43', '44']);
  const DM = passifVal(l, ['185', '45', '46', '47'], ['479'], ['185', '45', '46', '47']);
  const DN = passifVal(l, ['499', '599'], ['4998']);
  return DH + DI + DJ + DK + DM + DN;
}

// Tresorerie passif: DQ + DR
export function bilanTresoPassif(l: BalanceLigne[]): number {
  const DQ = passifVal(l, ['564', '565']);
  const DR = passifVal(l, ['52', '53', '561', '566'], [], ['52', '53']);
  return DQ + DR;
}

// AD: Immobilisations incorporelles brut (tout compte 21)
export function bilanAD_brut(l: BalanceLigne[]): number { return sumSoldeDebiteur(l, ['21']); }

// AI: Immobilisations corporelles brut (comptes 22, 23, 24 — sauf 251, 252 qui sont les avances AP)
export function bilanAI_brut(l: BalanceLigne[]): number { return sumSoldeDebiteur(l, ['22', '23', '24']); }

// ===================== RESULTAT NET et CAFG =====================

export function computeResultatNet(lignes: BalanceLigne[]): number {
  let produits = 0, charges = 0;
  for (const l of lignes) {
    const num = (l.numero_compte || '').trim();
    const sd = getSD(l), sc = getSC(l);
    if (PRODUITS_PREFIXES.some(p => num.startsWith(p))) produits += sc - sd;
    if (CHARGES_PREFIXES.some(p => num.startsWith(p))) charges += sd - sc;
  }
  return produits - charges;
}

// CAFG (methode soustractive) = Resultat net + Dotations nettes + VNC cessions - Produits cessions
// NB: 81/82 s'annulent avec FF/FG/FI dans ZG (effet net = 0)
export function computeCAFG(lignes: BalanceLigne[]): number {
  const resultatNet = computeResultatNet(lignes);
  const dotations = sumSoldeDebiteur(lignes, DOTATIONS_PREFIXES);
  const reprises = sumSoldeCrediteur(lignes, REPRISES_PREFIXES_TFT);
  const chargesCessions = sumSoldeDebiteur(lignes, ['81']);
  const produitsCessions = sumSoldeCrediteur(lignes, ['82']);
  return resultatNet + (dotations - reprises) + (chargesCessions - produitsCessions);
}

// ===================== COMPUTE ALL FLUX =====================
// A reconstruire pas a pas selon le guide d'application SYSCOHADA

export function computeAllFlux(lN: BalanceLigne[], lN1Raw: BalanceLigne[]): Record<string, number> {
  const data: Record<string, number> = {};

  // Si pas de balance N-1, utiliser les Soldes Initiaux (SI) de la balance N
  const lN1 = lN1Raw.length > 0 ? lN1Raw : lignesFromSI(lN);

  // ZA — Tresorerie nette au 1er janvier
  data.ZA = bilanTresoActif(lN1) - rawSC(lN1, ['4726']) - bilanTresoPassif(lN1);

  // FA — CAFG
  data.FA = computeCAFG(lN);

  // FB — Variation actif circulant HAO (guide t4)
  // BA excl 485 = seulement 488 net de 498
  data.FB = -(actifNet(lN, ['488'], ['498']) - actifNet(lN1, ['488'], ['498']));

  // FC — Variation des stocks (guide t4)
  data.FC = -(bilanBB(lN) - bilanBB(lN1));

  // FD — Variation des creances et emplois assimiles (guide t4)
  // Poste BG = BH + BI + BJ
  // Exclusions: 414, 467, 458, 4494, 4751 (variation retiree N et N-1)
  // + ecarts de conversion exploitation: 4781 (actif, exclu de BI via 478)
  // + creances location-financement: MvtD(2714, 2766)
  const fdExcl = ['414', '467', '458', '4494', '4751'];
  const FD_raw = (bilanBH(lN) + bilanBI(lN) + bilanBJ(lN))
    - (bilanBH(lN1) + bilanBI(lN1) + bilanBJ(lN1))
    - rawSD(lN, fdExcl) + rawSD(lN1, fdExcl)
    + sumMvtDebit(lN, ['2714', '2766'])
    + rawSD(lN, ['4781']) - rawSD(lN1, ['4781'])
    - rawSC(lN, ['4791']) + rawSC(lN1, ['4791']);
  data.FD = -FD_raw;

  // FE — Variation du passif circulant (guide t4)
  // Poste DP excl: 404, 481, 482, 467, 4752, 472
  // + ecarts conversion dettes: 4793 (diminution), 4783 (augmentation)
  const feExcl = ['404', '481', '482', '467', '4752', '472'];
  data.FE = (bilanDP(lN) - bilanDP(lN1))
    - rawSC(lN, feExcl) + rawSC(lN1, feExcl)
    + rawSC(lN, ['4793']) - rawSC(lN1, ['4793'])
    - rawSD(lN, ['4783']) + rawSD(lN1, ['4783']);

  // Totaux
  data.ZB = data.FA + data.FB + data.FC + data.FD + data.FE;

  // FF — Decaissements acquisitions immob incorporelles (guide t5)
  // 1. Investissement reconstitue =
  //    variation AD nette + dotations amort/deprec (281,291) + VNC cessions (811)
  //    - reevaluation incorp (1061) - provisions demantelement incorp (19841)
  // 2. Decaissement = investissement - variation fournisseurs invest incorp
  //    - variation avances versees (251)
  //
  // AD net = brut(21) - amort(281) - deprec(291)
  const adNet_N = actifNet(lN, ['21'], ['281', '291']);
  const adNet_N1 = actifNet(lN1, ['21'], ['281', '291']);
  const dotAmortIncorp = sumMvtCredit(lN, ['281', '291']);
  const vncCessIncorp = rawSD(lN, ['811']);
  const reevalIncorp = sumMvtCredit(lN, ['1061']);
  const provDemantelIncorp = sumMvtCredit(lN, ['19841']);
  const investIncorp = (adNet_N - adNet_N1) + dotAmortIncorp + vncCessIncorp
    - reevalIncorp - provDemantelIncorp;
  // Fournisseurs invest incorporelles
  // NB: on utilise les sous-comptes subdivises (48211, pas 4821) pour eviter
  // de capter les comptes non subdivises (482100) qui vont dans FG par defaut
  const ffFourPfx = ['4041', '4046', '4811', '48161', '48171', '48181', '48211'];
  const varFourIncorp = rawSC(lN, ffFourPfx) - rawSC(lN1, ffFourPfx);
  // Avances versees incorporelles
  const varAvancesIncorp = rawSD(lN, ['251']) - rawSD(lN1, ['251']);
  data.FF = -(investIncorp - varFourIncorp + varAvancesIncorp);

  // FG — Decaissements acquisitions immob corporelles (guide t5/t6)
  // AI net = brut(22,23,24) - amort(282,283,284) - deprec(292,293,294)
  const aiNet_N = actifNet(lN, ['22', '23', '24'], ['282', '283', '284', '292', '293', '294']);
  const aiNet_N1 = actifNet(lN1, ['22', '23', '24'], ['282', '283', '284', '292', '293', '294']);
  const dotAmortCorp = sumMvtCredit(lN, ['282', '283', '284', '292', '293', '294']);
  const vncCessCorp = rawSD(lN, ['812']);
  const reevalCorp = sumMvtCredit(lN, ['106', '154']);
  const provDemantelCorp = sumMvtCredit(lN, ['19842']);
  const locationAcquisCorp = sumMvtCredit(lN, ['17']);
  const creancesLT = sumMvtDebit(lN, ['2714']);
  const investCorp = (aiNet_N - aiNet_N1) + dotAmortCorp + vncCessCorp
    - reevalCorp - provDemantelCorp - locationAcquisCorp - creancesLT;
  // Fournisseurs invest corporelles (non subdivises 4812xx, 481800, 482 vont ici par defaut)
  const fgFourPfx = ['4042', '4047', '4812', '48162', '48172', '48182', '481800', '48212', '482100'];
  const varFourCorp = rawSC(lN, fgFourPfx) - rawSC(lN1, fgFourPfx);
  // Avances versees corporelles
  const varAvancesCorp = rawSD(lN, ['252']) - rawSD(lN1, ['252']);
  data.FG = -(investCorp - varFourCorp + varAvancesCorp);

  // FH — Decaissements acquisitions immob financieres (guide t5/t7)
  // MvtD(26,27 sauf 2714,2766) + MvtD(4813) - MvtC(4813)
  // + SD(4782) ecart conversion actif - SC(4792) ecart conversion passif
  // NB: MvtC(106,154) deja captee dans FG — pas de double soustraction
  const FH_raw = sumMvtDebit(lN, ['26', '27'], ['2714', '2766'])
    + sumMvtDebit(lN, ['4813']) - sumMvtCredit(lN, ['4813'])
    + rawSD(lN, ['4782']) - rawSC(lN, ['4792']);
  data.FH = -FH_raw;

  // FI — Encaissements cessions immob incorp et corp (guide t6/t7)
  // SC(754, 821, 822) - MvtD(414, 485 sauf 4856) + MvtC(414, 485 sauf 4856)
  data.FI = rawSC(lN, ['754', '821', '822'])
    - sumMvtDebit(lN, ['414', '485'], ['4856'])
    + sumMvtCredit(lN, ['414', '485'], ['4856']);

  // FJ — Encaissements cessions immob financieres (guide t7)
  // SC(826) + MvtC(27 sauf 2714, 2766) - MvtD(4856) + MvtC(4856)
  data.FJ = rawSC(lN, ['826'])
    + sumMvtCredit(lN, ['27'], ['2714', '2766'])
    - sumMvtDebit(lN, ['4856']) + sumMvtCredit(lN, ['4856']);

  // ZC
  data.ZC = data.FF + data.FG + data.FH + data.FI + data.FJ;

  // FK — Augmentation de capital par apport nouveau (guide t7)
  // Variation classe 10 (excl 106 reevaluation, excl 109 non appele)
  // - SD(467) apporteurs restant du sur capital appele
  // - SD(4581) fonds de dotation a recevoir
  const varCapital = rawSC(lN, ['101', '102', '103', '104', '105', '1051'])
    - rawSC(lN1, ['101', '102', '103', '104', '105', '1051']);
  data.FK = varCapital
    - rawSD(lN, ['109', '467', '4581']);

  // FL — Subventions d'investissement recues (guide t7)
  // Variation compte 14 (excl quote-part viree au resultat)
  // - variation 4582 subventions a recevoir
  // - variation 4494 Etat subvention a recevoir
  data.FL = rawSC(lN, ['14']) - rawSC(lN1, ['14'])
    - (rawSD(lN, ['4494', '4582']) - rawSD(lN1, ['4494', '4582']));

  // FM — Prelevement sur le capital (guide t7)
  // Variation classe 10 negative (excl 106, 109) = reductions de capital
  // En pratique c'est deja dans FK via la variation
  // FM separe seulement si on veut distinguer augmentation/reduction
  data.FM = 0;

  // FN — Dividendes verses (guide t7)
  // Mouvement debit du compte 465
  data.FN = -sumMvtDebit(lN, ['465']);

  // ZD
  data.ZD = data.FK + data.FL + data.FM + data.FN;
  // FO — Emprunts (guide t7)
  // Variation des comptes 16 en augmentation (nouveaux emprunts)
  // = MvtC(161,162,1661,1662) comme encaissement
  // - MvtD(4713) ajustement
  // + SD(4784) ecart conversion
  data.FO = sumMvtCredit(lN, ['161', '162', '1661', '1662'])
    - sumMvtDebit(lN, ['4713'])
    + rawSD(lN, ['4784']);

  // FP — Autres dettes financieres (guide t7)
  // MvtC des autres dettes (163-168 sauf 1661/1662, 181-183)
  data.FP = sumMvtCredit(lN, ['163', '164', '165', '166', '167', '168', '181', '182', '183'], ['1661', '1662']);

  // FQ — Remboursements emprunts et dettes financieres (guide t7)
  // MvtD(16, 17, 181-183) = remboursements y compris location-acquisition
  // - SC(4794) ecart conversion
  data.FQ = -(sumMvtDebit(lN, ['16', '17', '181', '182', '183']) - rawSC(lN, ['4794']));

  // ZE
  data.ZE = data.FO + data.FP + data.FQ;
  data.ZF = data.ZD + data.ZE;
  data.ZG = data.ZB + data.ZC + data.ZF;
  data.ZH = data.ZG + data.ZA;

  // ZI — Controle
  data.ZI = bilanTresoActif(lN) - rawSC(lN, ['4726']) - bilanTresoPassif(lN);

  return data;
}

// ===================== DIAGNOSTIC TFT =====================
// Analyse la balance et oriente l'utilisateur vers les corrections
// Ne compare avec aucun corrige externe — tout vient des donnees

export interface DiagnosticItem {
  poste: string;
  type: 'erreur' | 'alerte' | 'info';
  message: string;
  suggestion?: string;
  montant?: number;
}

export function diagnosticTFT(lN: BalanceLigne[], lN1: BalanceLigne[]): DiagnosticItem[] {
  const diag: DiagnosticItem[] = [];

  const flux = computeAllFlux(lN, lN1);
  const ecart = Math.round(flux.ZH - flux.ZI);

  // ===== 1. EQUILIBRE GLOBAL =====
  if (ecart === 0) {
    diag.push({ poste: 'TFT', type: 'info', message: 'TFT equilibre (ZH = ZI).' });
  } else {
    diag.push({
      poste: 'TFT',
      type: 'erreur',
      message: 'Ecart de bouclage de ' + formatMontant(ecart) + '.',
      suggestion: 'Verifier les points ci-dessous. Si aucune alerte, l\'ecart peut provenir de comptes renumerotes entre N et N-1 (ex: 462000 devenu 462001) ou de comptes avec solde nul non importes.',
      montant: ecart
    });
  }

  // ===== 2. AFFECTATION DU RESULTAT =====
  let mvtD131 = 0, mvtC11 = 0, mvtC12 = 0, mvtC465 = 0, mvtD465 = 0, mvtC462 = 0;
  let has131 = false;
  for (const l of lN) {
    const num = (l.numero_compte || '').trim();
    const d = parseFloat(String(l.debit)) || 0;
    const c = parseFloat(String(l.credit)) || 0;
    if (num.startsWith('131') || num.startsWith('130')) { mvtD131 += d; has131 = true; }
    if (num.startsWith('11')) mvtC11 += c;
    if (num.startsWith('12')) mvtC12 += c;
    if (num.startsWith('465')) { mvtC465 += c; mvtD465 += d; }
    if (num.startsWith('462')) mvtC462 += c;
  }

  // Cas 3 : 131 non solde (pas de mouvement debit)
  if (has131 && mvtD131 === 0) {
    diag.push({
      poste: 'Affectation',
      type: 'alerte',
      message: 'Le resultat anterieur (compte 131) n\'a pas ete solde.',
      suggestion: 'Passer l\'ecriture d\'affectation du resultat de l\'exercice precedent : '
        + 'Dr 131 / Cr 111 (reserves) + Cr 121 (report a nouveau) + Cr 465 (dividendes).'
    });
  }

  if (mvtD131 > 0) {
    const affecte = mvtC11 + mvtC12 + mvtC465;
    const ecartAffect = Math.round(mvtD131 - affecte);

    if (ecartAffect > 1) {
      // Seulement si ecart positif = montant non affecte (dividendes manquants)
      // Un ecart negatif signifie que les MvtC incluent d'autres ecritures (normal)
      // Cas 1 : 465 absent, 462 a des mouvements
      if (mvtC465 === 0 && mvtD465 === 0 && mvtC462 > 0) {
        diag.push({
          poste: 'FN',
          type: 'alerte',
          message: 'Dividendes de ' + formatMontant(ecartAffect) + ' probablement verses via le compte courant associe (462).',
          suggestion: 'L\'ecriture correcte pour le TFT est :\n'
            + '1) Dr 131 / Cr 465 = ' + formatMontant(ecartAffect) + ' (declaration dividendes)\n'
            + '2) Dr 465 / Cr 462 = ' + formatMontant(ecartAffect) + ' (mise en compte courant)\n'
            + 'Cela permet au TFT de capter les dividendes dans le poste FN. '
            + 'Reimporter la balance avec le compte 465 (meme si son solde final est nul).',
          montant: ecartAffect
        });
      }
      // Cas 2 : 465 absent, pas de 462
      else if (mvtC465 === 0 && mvtD465 === 0 && mvtC462 === 0) {
        diag.push({
          poste: 'FN',
          type: 'alerte',
          message: 'Ecart d\'affectation de ' + formatMontant(ecartAffect) + '. Le compte 465 (Dividendes a payer) est absent.',
          suggestion: 'Verifier si des dividendes ont ete distribues :\n'
            + '- Si oui : passer l\'ecriture Dr 131 / Cr 465 puis Dr 465 / Cr 521 (banque) et reimporter.\n'
            + '- Si non : verifier les autres contreparties de l\'affectation du resultat.',
          montant: ecartAffect
        });
      }
      // Cas general : affectation incomplete
      else {
        diag.push({
          poste: 'Affectation',
          type: 'alerte',
          message: 'Affectation du resultat incomplete. Dr 131 = ' + formatMontant(mvtD131)
            + ', Cr (11+12+465) = ' + formatMontant(affecte) + '. Ecart : ' + formatMontant(ecartAffect) + '.',
          suggestion: 'Verifier l\'ecriture d\'affectation du resultat anterieur. '
            + 'La somme des credits (reserves + report + dividendes) doit egal le debit du compte 131.',
          montant: ecartAffect
        });
      }
    }
  }

  // ===== 3. COMPTES BILAN NON CAPTES =====
  // Comptes captes explicitement par les formules ou implicitement
  const captedPrefixes = [
    // CR -> FA (CAFG)
    '60','61','62','63','64','65','66','67','68','69',
    '70','71','72','73','75','77','78','79',
    '81','82','83','84','85','86','87','88','89',
    // Tresorerie -> ZA/ZI
    '50','51','52','53','54','55','57','581','582','564','565','561','566','590','591','592','593','594',
    // Affectation resultat -> implicitement capte par FA + FN
    '11','12','13',
    // Provisions -> non-cash, neutralise par CAFG (dotation/reprise dans CR)
    '15','19',
    // FB (actif circ HAO)
    '488','498',
    // FC (stocks)
    '31','32','33','34','35','36','37','38','39',
    // FD (creances BH+BI)
    '409','41','419','490','491','185','42','43','44','45','46','47','478',
    '492','493','494','495','496','497',
    // FE (passif circ DP)
    '40','481','482','484','4998','479','499','599',
    // FF (immob incorp)
    '21','281','291','251','4041','4046','4811','48161','48171','48181','48211',
    // FG (immob corp)
    '22','23','24','282','283','284','292','293','294','252',
    '4042','4047','4812','48162','48172','48182','481800','48212','482100',
    '106','154','17','19842',
    // FH (immob fin)
    '26','27','4813','4782','4792',
    // FI (cessions incorp/corp)
    '414','485','754','821','822',
    // FJ (cessions fin)
    '826','4856',
    // FK (capital)
    '101','102','103','104','105','1051','109','467','4581',
    // FL (subventions)
    '14','4494','4582',
    // FN (dividendes)
    '465',
    // FO/FP/FQ (dettes financieres)
    '161','162','1661','1662','4713','4784',
    '163','164','165','166','167','168','181','182','183',
    '16','4794',
    // Ecarts conversion
    '4781','4791','4793','4783','47818','47918','4726',
    // Exclusions FD/FE (captes dans d'autres postes)
    '458','4751','4752','472','404',
    // VNC / pertes cessions
    '811','812','6541','6542',
  ];

  const nonCaptes: { num: string; lib: string; variation: number }[] = [];
  for (const l of lN) {
    const num = (l.numero_compte || '').trim();
    if (!num || num[0] >= '5') continue;
    const netN = getSD(l) - getSC(l);
    const lPrev = lN1.find(p => (p.numero_compte || '').trim() === num);
    const netN1 = lPrev ? getSD(lPrev) - getSC(lPrev) : 0;
    const variation = netN - netN1;
    if (Math.abs(variation) < 1) continue;
    if (!captedPrefixes.some(p => num.startsWith(p))) {
      nonCaptes.push({ num, lib: l.libelle_compte || '', variation });
    }
  }
  for (const l of lN1) {
    const num = (l.numero_compte || '').trim();
    if (!num || num[0] >= '5') continue;
    if (lN.some(n => (n.numero_compte || '').trim() === num)) continue;
    const netN1 = getSD(l) - getSC(l);
    if (Math.abs(netN1) < 1) continue;
    if (!captedPrefixes.some(p => num.startsWith(p))) {
      nonCaptes.push({ num, lib: l.libelle_compte || '', variation: -netN1 });
    }
  }

  for (const c of nonCaptes) {
    const num = c.num;
    let suggestion = 'Verifier le classement de ce compte dans le plan comptable SYSCOHADA '
      + 'et s\'assurer qu\'il utilise un numero conforme.';

    // Suggestion contextuelle selon la nature du compte
    if (num.startsWith('10')) {
      suggestion = 'Ce compte de capitaux propres n\'est pas reconnu. '
        + 'Les comptes 101-105 sont dans FK, 106 dans FG, 109 dans FK. '
        + 'Verifier le numero de compte.';
    } else if (num[0] === '2') {
      suggestion = 'Ce compte d\'immobilisation n\'est pas reconnu. '
        + 'Verifier s\'il s\'agit d\'une immob incorporelle (21), corporelle (22-24), ou financiere (26-27).';
    } else if (num[0] === '4') {
      suggestion = 'Ce compte de tiers n\'est pas reconnu par les formules du TFT. '
        + 'Verifier s\'il devrait etre dans les creances (FD), le passif circulant (FE), '
        + 'ou les fournisseurs d\'investissement (FF/FG).';
    }

    diag.push({
      poste: num,
      type: 'alerte',
      message: num + ' ' + c.lib + ' : variation de ' + formatMontant(Math.round(c.variation)) + ' non reconnue par le TFT.',
      suggestion,
      montant: Math.round(c.variation)
    });
  }

  // ===== 4. COHERENCE DES SOUS-TOTAUX =====
  const checks: [string, number, string, number][] = [
    ['ZB', flux.ZB, 'FA+FB+FC+FD+FE', flux.FA + (flux.FB||0) + (flux.FC||0) + (flux.FD||0) + (flux.FE||0)],
    ['ZC', flux.ZC, 'FF+FG+FH+FI+FJ', (flux.FF||0) + (flux.FG||0) + (flux.FH||0) + (flux.FI||0) + (flux.FJ||0)],
    ['ZD', flux.ZD, 'FK+FL+FM+FN', (flux.FK||0) + (flux.FL||0) + (flux.FM||0) + (flux.FN||0)],
    ['ZE', flux.ZE, 'FO+FP+FQ', (flux.FO||0) + (flux.FP||0) + (flux.FQ||0)],
    ['ZF', flux.ZF, 'ZD+ZE', flux.ZD + flux.ZE],
    ['ZG', flux.ZG, 'ZB+ZC+ZF', flux.ZB + flux.ZC + flux.ZF],
  ];
  for (const [ref, val, formula, expected] of checks) {
    if (Math.abs(val - expected) > 1) {
      diag.push({
        poste: ref,
        type: 'erreur',
        message: ref + ' incoherent : ' + formatMontant(Math.round(val)) + ' vs ' + formula + ' = ' + formatMontant(Math.round(expected)),
      });
    }
  }

  // ===== 5. RESUME =====
  // Renumeroter les sections

  const nbAlertes = diag.filter(d => d.type === 'alerte').length;
  const nbErreurs = diag.filter(d => d.type === 'erreur').length;
  if (ecart === 0 && nbAlertes === 0) {
    diag.push({ poste: 'Resume', type: 'info', message: 'Aucun probleme detecte. Le TFT est complet et equilibre.' });
  } else if (ecart === 0 && nbAlertes > 0) {
    diag.push({ poste: 'Resume', type: 'info', message: 'Le TFT est equilibre. ' + nbAlertes + ' point(s) d\'attention a verifier.' });
  } else {
    diag.push({
      poste: 'Resume',
      type: 'erreur',
      message: nbErreurs + ' erreur(s) et ' + nbAlertes + ' alerte(s). Corriger la balance pour equilibrer le TFT.',
    });
  }

  return diag;
}
