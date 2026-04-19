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
  if (val === 0 || val === null || val === undefined) return '0';
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

// ===================== CAFG — Methode officielle SYSCOHADA =====================
// Conforme au guide d'application SYSCOHADA (CAF.png / CAF1.png).
// Construite a partir des postes du Compte de Resultat (SIG), pas des
// comptes individuels. L'EBE exclut nativement les dotations/reprises/
// provisions (68, 69, 659, 79, 759) donc pas de probleme de matching
// avec les variations de provisions au bilan.
//
// CAFG = EBE (poste XD)
//      + SD compte 654 (VNC cessions courantes d'immobilisations)
//      - SC compte 754 (produits cessions courantes d'immobilisations)
//      + Resultat financier (poste XF = TK + TL + TM - RM - RN)
//      + Autres produits HAO (poste TO)
//      - Autres charges HAO (poste RP)
//      - Participation des travailleurs (poste RQ)
//      - Impots sur le resultat (poste RS)

function computeSIGPoste(lignes: BalanceLigne[], prodComptes: string[], chrgComptes: string[]): number {
  let val = 0;
  for (const l of lignes) {
    const num = (l.numero_compte || '').trim();
    const sd = getSD(l), sc = getSC(l);
    if (prodComptes.some(p => num.startsWith(p))) val += sc - sd;
    if (chrgComptes.some(p => num.startsWith(p))) val -= sd - sc;
  }
  return val;
}

export function computeEBE(lignes: BalanceLigne[]): number {
  // EBE = XC - RK
  // XC = XA + XB = Marge commerciale + Valeur ajoutee
  // XA = TA - RA - RB
  // XB = TB + TC + TD + TE + TF + TG + TH + TI - RC - RD - RE - RF - RG - RH - RI - RJ
  // XC = XA + XB
  // XD = XC - RK
  // En pratique : Produits exploitation encaissables (70-75, 781) - Charges exploitation decaissables (60-66)
  // Cela exclut automatiquement 68, 69, 659, 679, 79, 759, 779
  const produitsExploit = ['70', '71', '72', '73', '75', '781'];
  const chargesExploit = ['60', '61', '62', '63', '64', '65', '66'];
  // 791/798/799 sont des reprises (poste TJ) qui viennent APRES l'EBE
  return computeSIGPoste(lignes, produitsExploit, chargesExploit);
}

export function computeCAFG(lignes: BalanceLigne[]): number {
  const ebe = computeEBE(lignes);

  // VNC cessions courantes (SD compte 654) - Produits cessions (SC compte 754)
  const vnc654 = rawSD(lignes, ['654']);
  const prod754 = rawSC(lignes, ['754']);

  // Resultat financier ENCAISSABLE (pas le poste XF complet).
  // Le tableau detaille CAF.png ne retient que les elements cash :
  // + Revenus financiers (77) + Transferts charges financieres (787)
  // - Frais financiers (67)
  // EXCLUS : 697 (dotations provisions fin) et 797 (reprises provisions fin)
  // car ce sont des elements non-cash.
  const resultatFinancier = computeSIGPoste(lignes, ['77', '787'], ['67']);

  // Produits HAO (poste TO = 84, 86, 88)
  const produitsHAO = sumSoldeCrediteur(lignes, ['84', '86', '88']);

  // Charges HAO (poste RP = 83, 85)
  const chargesHAO = sumSoldeDebiteur(lignes, ['83', '85']);

  // Participation (poste RQ = 87)
  const participation = sumSoldeDebiteur(lignes, ['87']);

  // Impots sur le resultat (poste RS = 89)
  const impotResultat = sumSoldeDebiteur(lignes, ['89']);

  return ebe + vnc654 - prod754 + resultatFinancier + produitsHAO - chargesHAO - participation - impotResultat;
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

  // FB — Variation actif circulant HAO
  // 488000 = autres creances HAO (brut)
  // 498800 = depreciation autres creances HAO
  // Exclu: 485xxx (creances cessions immob → capte par FI/FJ)
  data.FB = -(actifNet(lN, ['488'], ['4988']) - actifNet(lN1, ['488'], ['4988']));

  // FC — Variation des stocks
  data.FC = -(bilanBB(lN) - bilanBB(lN1));

  // FD — Variation des creances et emplois assimiles
  // Poste BG = BH + BI + BJ
  // Exclusions (non exploitation — captes dans investissement ou financement):
  //   414 = creances cessions immob (→ FI)
  //   461 = capital appele non verse (→ FK)
  //   467 = apporteurs restant du (→ FK)
  //   458 = organismes internationaux (→ FL)
  //   4494 = Etat subvention invest (→ FL)
  //   4751 = compte transitoire SYSCOHADA (non-cash)
  // Ecarts conversion exploitation: 4781 (actif), 4791 (passif)
  // Creances location-financement: MvtD(2714, 2766)
  const fdExcl = ['414', '461', '467', '458', '4494', '4751'];
  const FD_raw = (bilanBH(lN) + bilanBI(lN) + bilanBJ(lN))
    - (bilanBH(lN1) + bilanBI(lN1) + bilanBJ(lN1))
    - rawSD(lN, fdExcl) + rawSD(lN1, fdExcl)
    + sumMvtDebit(lN, ['2714', '2766'])
    + rawSD(lN, ['4781']) - rawSD(lN1, ['4781'])
    - rawSC(lN, ['4791']) + rawSC(lN1, ['4791']);
  data.FD = -FD_raw;

  // FE — Variation du passif circulant
  // Exclusions (non exploitation — captes dans investissement ou financement):
  //   404 = fournisseurs immobilisations (→ FF/FG)
  //   465 = dividendes a payer (→ FN)
  //   467 = apporteurs restant du (→ FK)
  //   472 = versements titres non liberes (tresorerie)
  //   481 = fournisseurs investissements (→ FF/FG)
  //   482 = fournisseurs invest effets a payer (→ FF/FG)
  //   4752 = compte transitoire SYSCOHADA (non-cash)
  // Ecarts conversion dettes: 4793 (diminution), 4783 (augmentation)
  const feExcl = ['404', '465', '467', '472', '4726', '481', '482', '4752'];
  data.FE = (bilanDP(lN) - bilanDP(lN1))
    - rawSC(lN, feExcl) + rawSC(lN1, feExcl)
    + rawSC(lN, ['4793']) - rawSC(lN1, ['4793'])
    - rawSD(lN, ['4783']) + rawSD(lN1, ['4783']);

  // FF — Decaissements acquisitions immob incorporelles
  // AD net = brut(21, 4751) - amort(281) - deprec(291)
  // 4751 = ancien compte 20 (charges immobilisees transitoires SYSCOHADA)
  // Investissement = variation AD nette + dotations amort + VNC(811)
  //   - reevaluation(1061) - provisions demantelement(1984)
  // Decaissement = investissement - variation fournisseurs(4041,4046,4811) - variation avances(251)
  const adNet_N = actifNet(lN, ['21', '4751'], ['281', '291']);
  const adNet_N1 = actifNet(lN1, ['21', '4751'], ['281', '291']);
  const dotAmortIncorp = sumMvtCredit(lN, ['281', '291']);
  const vncCessIncorp = rawSD(lN, ['811']);
  const reevalIncorp = sumMvtCredit(lN, ['1061']);
  const provDemantelIncorp = sumMvtCredit(lN, ['1984']);
  const investIncorp = (adNet_N - adNet_N1) + dotAmortIncorp + vncCessIncorp
    - reevalIncorp - provDemantelIncorp;
  const ffFourPfx = ['4041', '4046', '4811'];
  const varFourIncorp = rawSC(lN, ffFourPfx) - rawSC(lN1, ffFourPfx);
  const varAvancesIncorp = rawSD(lN, ['251']) - rawSD(lN1, ['251']);
  data.FF = -(investIncorp - varFourIncorp + varAvancesIncorp);

  // FG — Decaissements acquisitions immob corporelles
  // AI net = brut(22,23,24) - amort(282,283,284) - deprec(292,293,294)
  // Investissement = variation AI nette + dotations amort + VNC(812)
  //   - reevaluation(106,154) - provisions demantelement(19842)
  //   - location-acquisition(17) - creances LT(2714)
  // Decaissement = investissement - variation fournisseurs(4042,4047,481,482 sauf 4811,4813)
  //   - variation avances(252)
  // NB: 481/482 capte TOUT ce qui est exclu de FE (sauf 4811=incorp dans FF et 4813=financ dans FH)
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
  const fgFourPfx = ['4042', '4047', '481', '482'];
  const fgFourExcl = ['4811', '4813'];
  const varFourCorp = rawSC(lN, fgFourPfx, fgFourExcl) - rawSC(lN1, fgFourPfx, fgFourExcl);
  const varAvancesCorp = rawSD(lN, ['252']) - rawSD(lN1, ['252']);
  data.FG = -(investCorp - varFourCorp + varAvancesCorp);

  // FH — Decaissements acquisitions immob financieres
  // MvtD(26,27 sauf 2714,2766) + MvtD(4813) - MvtC(4813)
  // + SD(4782) ecart conversion actif - SC(4792) ecart conversion passif
  const FH_raw = sumMvtDebit(lN, ['26', '27'], ['2714', '2766'])
    + sumMvtDebit(lN, ['4813']) - sumMvtCredit(lN, ['4813'])
    + rawSD(lN, ['4782']) - rawSC(lN, ['4792']);
  data.FH = -FH_raw;

  // FI — Encaissements cessions immob incorp et corp
  // SC(754,821,822) - MvtD(414,485 sauf 4856) + MvtC(414,485 sauf 4856)
  data.FI = rawSC(lN, ['754', '821', '822'])
    - sumMvtDebit(lN, ['414', '485'], ['4856'])
    + sumMvtCredit(lN, ['414', '485'], ['4856']);

  // FJ — Encaissements cessions immob financieres
  // SC(826) + MvtC(27 sauf 2714,2766) - MvtD(4856) + MvtC(4856)
  data.FJ = rawSC(lN, ['826'])
    + sumMvtCredit(lN, ['27'], ['2714', '2766'])
    - sumMvtDebit(lN, ['4856']) + sumMvtCredit(lN, ['4856']);

  data.ZC = data.FF + data.FG + data.FH + data.FI + data.FJ;

  // FK — Augmentation de capital par apport nouveau
  // Variation classe 10 (excl 106,109) - SD(461,467,4581)
  const varCapital = rawSC(lN, ['101', '102', '103', '104', '105', '1051'])
    - rawSC(lN1, ['101', '102', '103', '104', '105', '1051']);
  data.FK = varCapital - rawSD(lN, ['109', '461', '467', '4581']);

  // FL — Subventions d'investissement recues
  // Variation 14 - variation SD(4494,4582)
  data.FL = rawSC(lN, ['14']) - rawSC(lN1, ['14'])
    - (rawSD(lN, ['4494', '4582']) - rawSD(lN1, ['4494', '4582']));

  // FM — Prelevement sur le capital
  data.FM = 0;

  // FN — Dividendes verses
  data.FN = -sumMvtDebit(lN, ['465']);

  data.ZD = data.FK + data.FL + data.FM + data.FN;

  // FO — Emprunts
  // FO — Emprunts
  // MvtC(161,162,1661,1662) + SD(4784) ecart conversion
  // NB: 4713 (crediteurs divers) retire car deja dans FE via DP
  data.FO = sumMvtCredit(lN, ['161', '162', '1661', '1662'])
    + rawSD(lN, ['4784']);

  // FP — Autres dettes financieres
  data.FP = sumMvtCredit(lN, ['163', '164', '165', '166', '167', '168', '181', '182', '183'], ['1661', '1662']);

  // FQ — Remboursements emprunts et dettes financieres
  data.FQ = -(sumMvtDebit(lN, ['16', '17', '181', '182', '183']) - rawSC(lN, ['4794']));

  data.ZE = data.FO + data.FP + data.FQ;
  data.ZF = data.ZD + data.ZE;
  data.ZB = data.FA + data.FB + data.FC + data.FD + data.FE;
  data.ZG = data.ZB + data.ZC + data.ZF;
  data.ZH = data.ZG + data.ZA;

  // ZI — Controle
  data.ZI = bilanTresoActif(lN) - rawSC(lN, ['4726']) - bilanTresoPassif(lN);

  return data;
}

// ===================== DIAGNOSTIC TFT =====================
// Analyse FACTUELLE de chaque poste du TFT a partir de la balance
// importee. Pas d'interpretation ni de speculation — uniquement des
// constats chiffres et des verifications de coherence croisee.

export interface DiagnosticItem {
  poste: string;
  type: 'erreur' | 'alerte' | 'info';
  message: string;
  comptes?: { num: string; lib: string; montant: number }[];
  montant?: number;
}

// Variation nette d'un compte entre N et N-1
function variation(lN: BalanceLigne[], lN1: BalanceLigne[], prefixes: string[], excludes: string[] = []): number {
  const netN = sumSoldeDebiteur(lN, prefixes, excludes);
  const netN1 = sumSoldeDebiteur(lN1, prefixes, excludes);
  return netN - netN1;
}

// Liste les comptes de la BG qui matchent un prefixe avec leur variation
function comptesAvecVariation(lN: BalanceLigne[], lN1: BalanceLigne[], prefixes: string[], excludes: string[] = [], seuil = 1): { num: string; lib: string; montant: number }[] {
  const result: { num: string; lib: string; montant: number }[] = [];
  for (const l of lN) {
    const num = (l.numero_compte || '').trim();
    if (!matchesComptes(num, prefixes) || matchesComptes(num, excludes)) continue;
    const netN = getSD(l) - getSC(l);
    const prev = lN1.find(p => (p.numero_compte || '').trim() === num);
    const netN1 = prev ? getSD(prev) - getSC(prev) : 0;
    const v = netN - netN1;
    if (Math.abs(v) >= seuil) result.push({ num, lib: l.libelle_compte || '', montant: Math.round(v) });
  }
  for (const l of lN1) {
    const num = (l.numero_compte || '').trim();
    if (!matchesComptes(num, prefixes) || matchesComptes(num, excludes)) continue;
    if (lN.some(n => (n.numero_compte || '').trim() === num)) continue;
    const netN1 = getSD(l) - getSC(l);
    if (Math.abs(netN1) >= seuil) result.push({ num, lib: l.libelle_compte || '', montant: Math.round(-netN1) });
  }
  return result.sort((a, b) => Math.abs(b.montant) - Math.abs(a.montant));
}

export function diagnosticTFT(lN: BalanceLigne[], lN1: BalanceLigne[]): DiagnosticItem[] {
  const diag: DiagnosticItem[] = [];
  const flux = computeAllFlux(lN, lN1);
  const ecart = Math.round(flux.ZH - flux.ZI);

  // ===== 1. EQUILIBRE GLOBAL =====
  if (ecart === 0) {
    diag.push({ poste: 'TFT', type: 'info', message: 'TFT equilibre (ZH = ZI).', montant: 0 });
  } else {
    diag.push({
      poste: 'TFT',
      type: 'erreur',
      message: 'Ecart de bouclage de ' + formatMontant(ecart) + '. ZH = ' + formatMontant(Math.round(flux.ZH)) + ', ZI = ' + formatMontant(Math.round(flux.ZI)) + '.',
      montant: ecart
    });
  }

  // ===== 2. COHERENCE PROVISIONS (19) vs DOTATIONS (69) / REPRISES (79) =====
  // Verifier que chaque provision du bilan a une dotation/reprise correspondante
  // dans le CR. Si ce n'est pas le cas, le TFT ne peut pas boucler car la CAFG
  // (basee sur le CR) ne neutralise pas la variation de provision.
  const provPrefixes = ['15', '19'];
  const provComptes = comptesAvecVariation(lN, lN1, provPrefixes, [], 1000);
  const totalVarProv = provComptes.reduce((s, c) => s + c.montant, 0);
  const dotNet = Math.round(sumSoldeDebiteur(lN, ['68', '69']) - sumSoldeCrediteur(lN, ['78', '79']));
  const ecartProv = Math.round(-totalVarProv - dotNet);

  if (Math.abs(ecartProv) >= 1000) {
    diag.push({
      poste: 'FA',
      type: 'alerte',
      message: 'Variation provisions (15+19) = ' + formatMontant(-totalVarProv)
        + ' vs Dotations nettes (68+69-78-79) = ' + formatMontant(dotNet)
        + '. Ecart : ' + formatMontant(ecartProv) + '.',
      comptes: provComptes,
      montant: ecartProv
    });
  }

  // ===== 3. DECOMPOSITION PAR POSTE — comptes de la BG avec variation =====
  // Pour chaque poste du TFT, lister les comptes qui y contribuent.
  const posteDecompositions: { ref: string; label: string; prefixes: string[]; excludes: string[] }[] = [
    { ref: 'ZA', label: 'Tresorerie ouverture', prefixes: ['50','51','52','53','54','55','57','581','582','564','565','561','566'], excludes: [] },
    { ref: 'FB', label: 'Actif circulant HAO', prefixes: ['488'], excludes: ['4988'] },
    { ref: 'FC', label: 'Stocks', prefixes: ['31','32','33','34','35','36','37','38'], excludes: ['39'] },
    { ref: 'FD', label: 'Creances', prefixes: ['409','41','42','43','44','45','46','47','185'], excludes: ['419','478','414','461','467','458','4494','4751'] },
    { ref: 'FE', label: 'Passif circulant', prefixes: ['40','419','481','482','484','4998','42','43','44','185','45','46','47','499','599'], excludes: ['409','404','465','467','472','4726','4752'] },
    { ref: 'FF', label: 'Immob incorporelles', prefixes: ['21','281','291'], excludes: [] },
    { ref: 'FG', label: 'Immob corporelles', prefixes: ['22','23','24','282','283','284','292','293','294'], excludes: [] },
    { ref: 'FH', label: 'Immob financieres', prefixes: ['26','27'], excludes: ['2714','2766'] },
    { ref: 'FK', label: 'Capital', prefixes: ['101','102','103','104','105','109'], excludes: [] },
    { ref: 'FL', label: 'Subventions invest', prefixes: ['14'], excludes: [] },
    { ref: 'FN', label: 'Dividendes', prefixes: ['465'], excludes: [] },
    { ref: 'FO/FP/FQ', label: 'Dettes financieres', prefixes: ['16','17','181','182','183'], excludes: [] },
  ];

  for (const p of posteDecompositions) {
    const comptes = comptesAvecVariation(lN, lN1, p.prefixes, p.excludes, 1000);
    if (comptes.length > 0) {
      const total = comptes.reduce((s, c) => s + c.montant, 0);
      diag.push({
        poste: p.ref,
        type: 'info',
        message: p.ref + ' (' + p.label + ') : ' + comptes.length + ' compte(s), variation totale ' + formatMontant(total) + '.',
        comptes,
        montant: total
      });
    }
  }

  // ===== 4. COMPTES BILAN AVEC VARIATION NON CAPTES =====
  const allCaptedPrefixes = [
    '60','61','62','63','64','65','66','67','68','69',
    '70','71','72','73','75','77','78','79',
    '81','82','83','84','85','86','87','88','89',
    '50','51','52','53','54','55','57','581','582','564','565','561','566',
    '590','591','592','593','594',
    '11','12','13','15','19','29',
    '488','498','31','32','33','34','35','36','37','38','39',
    '409','41','419','490','491','185','42','43','44','45','46','47','478',
    '492','493','494','495','496','497',
    '40','481','482','484','4998','479','499','599',
    '21','281','291','251','4041','4046','4811',
    '22','23','24','282','283','284','292','293','294','252',
    '4042','4047','106','154','17','19842',
    '26','27','4813','4782','4792',
    '414','485','754','821','822','826','4856',
    '101','102','103','104','105','1051','109','467','4581',
    '14','4494','4582','465',
    '161','162','1661','1662','4784',
    '163','164','165','166','167','168','181','182','183',
    '16','4794',
    '4781','4791','4793','4783','4726',
    '458','4751','4752','472','404','811','812',
  ];

  const nonCaptes = comptesAvecVariation(lN, lN1, ['1','2','3','4'], allCaptedPrefixes, 1000);
  // Filtrer : ne garder que ceux qui ne sont PAS dans la liste des prefixes captes
  const vraiNonCaptes = nonCaptes.filter(c => !allCaptedPrefixes.some(p => c.num.startsWith(p)));

  if (vraiNonCaptes.length > 0) {
    const totalNC = vraiNonCaptes.reduce((s, c) => s + c.montant, 0);
    diag.push({
      poste: 'BG',
      type: 'alerte',
      message: vraiNonCaptes.length + ' compte(s) avec variation non capte(s) par le TFT, total ' + formatMontant(Math.round(totalNC)) + '.',
      comptes: vraiNonCaptes,
      montant: Math.round(totalNC)
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

  // ===== 5. ANOMALIES DE SENS (impact TFT) =====
  // Detecter les comptes dont le solde est inverse par rapport au sens normal SYSCOHADA
  // et qui peuvent fausser les postes du TFT
  const sensRules: { prefix: string; sens: 'debiteur' | 'crediteur'; poste: string; impact: string }[] = [
    // Classe 1 — Ressources durables (crediteur)
    { prefix: '101', sens: 'crediteur', poste: 'FK', impact: 'Un capital debiteur fausse le poste FK (augmentation de capital) du TFT.' },
    { prefix: '11', sens: 'crediteur', poste: 'FK', impact: 'Des reserves debitrices faussent le poste FK et peuvent indiquer une absorption de pertes non comptabilisee.' },
    { prefix: '14', sens: 'crediteur', poste: 'FL', impact: 'Une subvention d\'investissement debitrice fausse le poste FL (subventions recues).' },
    { prefix: '15', sens: 'crediteur', poste: 'FA', impact: 'Une provision reglementee debitrice fausse la CAFG (poste FA) car les dotations/reprises HAO sont neutralisees.' },
    { prefix: '16', sens: 'crediteur', poste: 'FO', impact: 'Un emprunt debiteur fausse le poste FO/FP (emprunts) : la variation sera interpretee comme un remboursement au lieu d\'un tirage.' },
    { prefix: '19', sens: 'crediteur', poste: 'FA', impact: 'Une provision pour risques debitrice fausse la CAFG car les dotations aux provisions sont neutralisees dans FA.' },
    // Classe 2 — Actif immobilise (debiteur, sauf 28/29)
    { prefix: '28', sens: 'crediteur', poste: 'FA', impact: 'Un amortissement debiteur fausse la CAFG car les dotations aux amortissements sont neutralisees dans FA.' },
    { prefix: '29', sens: 'crediteur', poste: 'FA', impact: 'Une provision pour depreciation debitrice fausse la CAFG (neutralisation des dotations/reprises).' },
    // Classe 3 — Stocks (debiteur, sauf 39)
    { prefix: '39', sens: 'crediteur', poste: 'FC', impact: 'Une depreciation de stocks debitrice fausse le poste FC (variation des stocks).' },
    // Classe 4 — Tiers
    { prefix: '40', sens: 'crediteur', poste: 'FE', impact: 'Un fournisseur debiteur fausse le poste FE (passif circulant) : la variation sera inversee.' },
    { prefix: '41', sens: 'debiteur', poste: 'FD', impact: 'Un client crediteur fausse le poste FD (creances) : la variation sera inversee.' },
    { prefix: '42', sens: 'crediteur', poste: 'FE', impact: 'Un compte personnel debiteur (sauf 421) fausse le poste FE (passif circulant).' },
    { prefix: '43', sens: 'crediteur', poste: 'FE', impact: 'Un organisme social debiteur fausse le poste FE (passif circulant).' },
    { prefix: '49', sens: 'crediteur', poste: 'FD', impact: 'Une depreciation de creances debitrice fausse le poste FD (creances nettes).' },
    // Classe 5 — Tresorerie (debiteur, sauf 56/59)
    { prefix: '52', sens: 'debiteur', poste: 'ZI', impact: 'Un compte banque crediteur indique un decouvert. Verifier qu\'il est bien classe en tresorerie passif pour le calcul de ZI.' },
    { prefix: '57', sens: 'debiteur', poste: 'ZI', impact: 'Un compte caisse crediteur est une anomalie grave (presomption d\'irregularite). Impact direct sur la tresorerie finale ZI.' },
  ];

  for (const l of lN) {
    const num = (l.numero_compte || '').trim();
    if (!num || num.length <= 2) continue;
    const sd = getSD(l);
    const sc = getSC(l);
    if (sd < 0.5 && sc < 0.5) continue; // pas de solde

    for (const rule of sensRules) {
      if (!num.startsWith(rule.prefix)) continue;
      // Exceptions connues
      if (num.startsWith('109') || num.startsWith('129') || num.startsWith('139')) continue; // debiteur normal
      if (num.startsWith('409')) continue; // avances fournisseurs = debiteur normal
      if (num.startsWith('419')) continue; // avances clients = crediteur normal
      if (num.startsWith('421')) continue; // avances personnel = debiteur normal
      if (num.startsWith('445')) continue; // TVA recuperable = debiteur normal

      const estInverse = (rule.sens === 'crediteur' && sd > 0.5 && sc < 0.5) ||
                         (rule.sens === 'debiteur' && sc > 0.5 && sd < 0.5);
      if (estInverse) {
        diag.push({
          poste: rule.poste,
          type: 'alerte',
          message: num + ' ' + (l.libelle_compte || '') + ' : solde '
            + (sd > 0.5 ? 'debiteur' : 'crediteur') + ' de ' + formatMontant(Math.round(sd > 0.5 ? sd : sc))
            + ' (sens attendu : ' + rule.sens + ').',
          montant: Math.round(sd > 0.5 ? sd : sc)
        });
      }
      break;
    }
  }

  // ===== 6. RESUME =====
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
