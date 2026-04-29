// Calculs TFT : resultat net, EBE, CAFG, et l'ensemble des flux ZA..ZI
// conformement au guide SYSCOHADA.

import type { BalanceLigne } from '../../types';
import { PRODUITS_PREFIXES, CHARGES_PREFIXES } from './constants';
import {
  getSD, getSC,
  sumSoldeDebiteur, sumSoldeCrediteur, rawSD, rawSC,
  sumMvtDebit, sumMvtCredit,
} from './soldes';
import {
  actifNet,
  lignesFromSI,
  bilanBB, bilanBH, bilanBI, bilanBJ,
  bilanDP, bilanTresoActif, bilanTresoPassif,
} from './bilan';

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
  // EBE = Produits exploitation encaissables (70-75, 781)
  //     - Charges exploitation decaissables (60-66)
  // Exclut automatiquement 68, 69, 659, 679, 79, 759, 779.
  // 791 / 798 / 799 sont des reprises (poste TJ) qui viennent APRES l'EBE.
  const produitsExploit = ['70', '71', '72', '73', '75', '781'];
  const chargesExploit = ['60', '61', '62', '63', '64', '65', '66'];
  return computeSIGPoste(lignes, produitsExploit, chargesExploit);
}

export function computeCAFG(lignes: BalanceLigne[]): number {
  const ebe = computeEBE(lignes);

  // VNC cessions courantes (SD 654) - Produits cessions (SC 754)
  const vnc654 = rawSD(lignes, ['654']);
  const prod754 = rawSC(lignes, ['754']);

  // Resultat financier encaissable uniquement : 77 + 787 - 67.
  // Exclu : 697 (dotations provisions fin) et 797 (reprises provisions fin).
  const resultatFinancier = computeSIGPoste(lignes, ['77', '787'], ['67']);

  const produitsHAO = sumSoldeCrediteur(lignes, ['84', '86', '88']);
  const chargesHAO = sumSoldeDebiteur(lignes, ['83', '85']);
  const participation = sumSoldeDebiteur(lignes, ['87']);
  const impotResultat = sumSoldeDebiteur(lignes, ['89']);

  return ebe + vnc654 - prod754 + resultatFinancier + produitsHAO - chargesHAO - participation - impotResultat;
}

// ===================== COMPUTE ALL FLUX =====================
// Reconstruit pas a pas selon le guide d'application SYSCOHADA.

export function computeAllFlux(lN: BalanceLigne[], lN1Raw: BalanceLigne[]): Record<string, number> {
  const data: Record<string, number> = {};

  // Si pas de balance N-1, utiliser les Soldes Initiaux (SI) de la balance N
  const lN1 = lN1Raw.length > 0 ? lN1Raw : lignesFromSI(lN);

  // ZA — Tresorerie nette au 1er janvier
  data.ZA = bilanTresoActif(lN1) - rawSC(lN1, ['4726']) - bilanTresoPassif(lN1);

  // FA — CAFG
  data.FA = computeCAFG(lN);

  // FB — Variation actif circulant HAO
  data.FB = -(actifNet(lN, ['488'], ['4988']) - actifNet(lN1, ['488'], ['4988']));

  // FC — Variation des stocks
  data.FC = -(bilanBB(lN) - bilanBB(lN1));

  // FD — Variation des creances et emplois assimiles
  const fdExcl = ['414', '461', '467', '458', '4494', '4751'];
  const FD_raw = (bilanBH(lN) + bilanBI(lN) + bilanBJ(lN))
    - (bilanBH(lN1) + bilanBI(lN1) + bilanBJ(lN1))
    - rawSD(lN, fdExcl) + rawSD(lN1, fdExcl)
    + sumMvtDebit(lN, ['2714', '2766'])
    + rawSD(lN, ['4781']) - rawSD(lN1, ['4781'])
    - rawSC(lN, ['4791']) + rawSC(lN1, ['4791']);
  data.FD = -FD_raw;

  // FE — Variation du passif circulant
  const feExcl = ['404', '465', '467', '472', '4726', '481', '482', '4752'];
  data.FE = (bilanDP(lN) - bilanDP(lN1))
    - rawSC(lN, feExcl) + rawSC(lN1, feExcl)
    + rawSC(lN, ['4793']) - rawSC(lN1, ['4793'])
    - rawSD(lN, ['4783']) + rawSD(lN1, ['4783']);

  // FF — Decaissements acquisitions immob incorporelles
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
  const FH_raw = sumMvtDebit(lN, ['26', '27'], ['2714', '2766'])
    + sumMvtDebit(lN, ['4813']) - sumMvtCredit(lN, ['4813'])
    + rawSD(lN, ['4782']) - rawSC(lN, ['4792']);
  data.FH = -FH_raw;

  // FI — Encaissements cessions immob incorp et corp
  data.FI = rawSC(lN, ['754', '821', '822'])
    - sumMvtDebit(lN, ['414', '485'], ['4856'])
    + sumMvtCredit(lN, ['414', '485'], ['4856']);

  // FJ — Encaissements cessions immob financieres
  data.FJ = rawSC(lN, ['826'])
    + sumMvtCredit(lN, ['27'], ['2714', '2766'])
    - sumMvtDebit(lN, ['4856']) + sumMvtCredit(lN, ['4856']);

  data.ZC = data.FF + data.FG + data.FH + data.FI + data.FJ;

  // FK — Augmentation de capital par apport nouveau (TFT4 a)
  // Formule officielle SYSCOHADA :
  // FK = variation des comptes de la classe 10 capital
  //      a l'exclusion des comptes 106 (ecarts de reevaluation)
  //      et 109 (apporteurs capital souscrit non appele)
  //    + variation du compte 467 Apporteurs restant du sur capital appele
  //    + variation du compte 4581 Organismes internationaux, fonds de dotation a recevoir
  const fkExcl = ['106', '109'];
  const varClasse10 = rawSC(lN, ['10'], fkExcl) - rawSC(lN1, ['10'], fkExcl);
  const var467 = rawSD(lN, ['467']) - rawSD(lN1, ['467']);
  const var4581 = rawSD(lN, ['4581']) - rawSD(lN1, ['4581']);
  data.FK = varClasse10 + var467 + var4581;

  // FL — Subventions d'investissement (TFT4 b)
  // Formule officielle SYSCOHADA :
  // FL = variation du compte 14 (a l'exclusion de la quote part viree au resultat)
  //    + variation des comptes 4582 et 4494
  //    + avances recues sur subvention (compte non specifie dans le guide, omis)
  //
  // "Quote part viree au resultat" = mvt debit 14 vers 865 (non monetaire).
  // L'exclure = annuler ce mvt debit en ajoutant le mvt credit 865 cumule
  // de l'exercice (= rawSC 865, les comptes de classe 8 demarrant a 0).
  const var14_excl = (rawSC(lN, ['14']) - rawSC(lN1, ['14'])) + rawSC(lN, ['865']);
  const var4494 = rawSD(lN, ['4494']) - rawSD(lN1, ['4494']);
  const var4582 = rawSD(lN, ['4582']) - rawSD(lN1, ['4582']);
  data.FL = var14_excl + var4494 + var4582;

  // FM — Prelevement sur le capital
  // Formule officielle SYSCOHADA TFT4 :
  // FM = variation des comptes de la classe 10 capital
  //      a l'exclusion des comptes 106 (ecarts de reevaluation)
  //      et 109 (apporteurs capital souscrit non appele)
  data.FM = rawSC(lN, ['10'], ['106', '109']) - rawSC(lN1, ['10'], ['106', '109']);

  // FN — Dividendes verses
  data.FN = -sumMvtDebit(lN, ['465']);

  data.ZD = data.FK + data.FL + data.FM + data.FN;

  // FO — Emprunts (MvtC 161,162,1661,1662 + SD 4784)
  data.FO = sumMvtCredit(lN, ['161', '162', '1661', '1662']) + rawSD(lN, ['4784']);

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
