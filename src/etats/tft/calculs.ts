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

  // Resultat financier encaissable (XF corrige) : 77 + 787 - 67.
  // Exclu : 697 (dotations provisions fin = TL) et 797 (reprises = RN)
  // car non monetaires.
  const resultatFinancier = computeSIGPoste(lignes, ['77', '787'], ['67']);

  // Produits HAO encaissables = TO sauf 86 (Reprises d'amort/prov/deprec
  // HAO = non monetaire, annulation comptable).
  const produitsHAO = sumSoldeCrediteur(lignes, ['84', '88']);

  // Charges HAO decaissables = RP sauf 85 (Dotations HAO = non monetaire).
  const chargesHAO = sumSoldeDebiteur(lignes, ['83']);

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

  // FE — Variation du passif circulant (TFT — exclusions DP)
  // Guide officiel : 404, 481, 482, 467, 4752, 472.
  // Le 4726 est redondant avec 472 (couvert par le prefixe).
  // Le 465 est conserve pour eviter le double comptage avec FN
  // (FN capte mvt debit 465 = paiement dividendes ; FE capterait
  // alors variation SC 465 = doublon partiel).
  const feExcl = ['404', '465', '467', '472', '481', '482', '4752'];
  data.FE = (bilanDP(lN) - bilanDP(lN1))
    - rawSC(lN, feExcl) + rawSC(lN1, feExcl)
    + rawSC(lN, ['4793']) - rawSC(lN1, ['4793'])
    - rawSD(lN, ['4783']) + rawSD(lN1, ['4783']);

  // FF — Decaissements acquisitions immob incorporelles (TFT 4.2.3.3 a + b)
  // Formule officielle SYSCOHADA (a) — investissement reconstitue :
  //   investIncorp = variation immo incorporelles nettes (poste AD)
  //                + dotations amort/depreciations (281, 291)
  //                + VNC cessions (compte 811)
  // PAS de deduction reevaluation (selon le guide, la reevaluation 106+154
  //   ne concerne que les immo corporelles et financieres) ;
  // PAS de deduction demantelement 1984 (allouee entierement a FG).
  //
  // (b) decaissement = investIncorp
  //                  - variation dette fournisseurs d'investissement
  //                  + variation avances et acomptes verses
  // Sous-comptes incorporelles : 4041, 4046, 4811, 4821 (fournisseurs) ; 251 (avances).
  const adNet_N = actifNet(lN, ['21', '4751'], ['281', '291']);
  const adNet_N1 = actifNet(lN1, ['21', '4751'], ['281', '291']);
  const dotAmortIncorp = sumMvtCredit(lN, ['281', '291']);
  const vncCessIncorp = rawSD(lN, ['811']);
  const investIncorp = (adNet_N - adNet_N1) + dotAmortIncorp + vncCessIncorp;
  const ffFourPfx = ['4041', '4046', '4811', '4821'];
  const varFourIncorp = rawSC(lN, ffFourPfx) - rawSC(lN1, ffFourPfx);
  const varAvancesIncorp = rawSD(lN, ['251']) - rawSD(lN1, ['251']);
  data.FF = -(investIncorp - varFourIncorp + varAvancesIncorp);

  // FG — Decaissements acquisitions immob corporelles (TFT 4.2.3.3 a + b)
  // Formule officielle SYSCOHADA (a) — investissement reconstitue :
  //   investCorp = variation immo corporelles nettes (poste AI)
  //              + dotations amort/depreciations (282, 283, 284, 292, 293, 294)
  //              + VNC cessions (compte 812)
  //              - reevaluation 106 + 154 (allouee entierement a FG par convention)
  //              - provisions demantelement 1984 (idem)
  //              - location-acquisition (compte 17 sauf 176 interets courus)
  //              - creances long terme (mvt debit 2714)
  // (b) sous-comptes corporelles :
  //   404 -> 4042 + 4047 ; 481 -> 4812, 4816, 4817, 4818 ; 482 -> 4822 ; 25 -> 252.
  const aiNet_N = actifNet(lN, ['22', '23', '24'], ['282', '283', '284', '292', '293', '294']);
  const aiNet_N1 = actifNet(lN1, ['22', '23', '24'], ['282', '283', '284', '292', '293', '294']);
  const dotAmortCorp = sumMvtCredit(lN, ['282', '283', '284', '292', '293', '294']);
  const vncCessCorp = rawSD(lN, ['812']);
  const reevalCorp = sumMvtCredit(lN, ['106', '154']);
  const provDemantelCorp = sumMvtCredit(lN, ['1984']);
  const locationAcquisCorp = sumMvtCredit(lN, ['17'], ['176']);
  const creancesLT = sumMvtDebit(lN, ['2714']);
  const investCorp = (aiNet_N - aiNet_N1) + dotAmortCorp + vncCessCorp
    - reevalCorp - provDemantelCorp - locationAcquisCorp - creancesLT;
  const fgFourPfx = ['4042', '4047', '4812', '4822', '4816', '4817', '4818'];
  const varFourCorp = rawSC(lN, fgFourPfx) - rawSC(lN1, fgFourPfx);
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

  // FL — Subventions d'investissement (TFT 4.2.3.4 b)
  // Formule officielle (signes corriges via tests sur 4 cas) :
  //   FL = variation SC compte 14
  //      + SC compte 799 (Reprises de subventions d'investissement,
  //        cumul de l'exercice -> annule le mvt debit 14 non monetaire)
  //      - variation SD compte 4494 (Etat, subv. invest. a recevoir)
  //      - variation SD compte 4582 (Organismes int., subv. a recevoir)
  //
  // Note : 799 est le compte officiel des reprises de subventions
  // d'investissement (et non 865 qui n'existe pas dans le plan).
  //
  // Le signe MOINS sur var SD 4494/4582 est correct :
  //   - Si la creance augmente -> moins de cash recu -> FL diminue.
  //   - Si la creance diminue (encaissement) -> FL augmente.
  const var14 = rawSC(lN, ['14']) - rawSC(lN1, ['14']);
  const reprise799 = rawSC(lN, ['799']);
  const var4494 = rawSD(lN, ['4494']) - rawSD(lN1, ['4494']);
  const var4582 = rawSD(lN, ['4582']) - rawSD(lN1, ['4582']);
  data.FL = var14 + reprise799 - var4494 - var4582;

  // FM — Prelevement sur le capital (TFT 4.2.3.4 c) + extension bouclage
  // Formule officielle SYSCOHADA :
  //   FM = variation des comptes de la classe 10 capital
  //        a l'exclusion des comptes 106 (ecarts de reevaluation)
  //        et 109 (apporteurs capital souscrit non appele)
  //
  // Extension pour equilibrer le TFT en cas de correction d'erreur
  // ou autre variation passee par les capitaux propres residuels :
  //   + variation NET (SC - SD) des comptes 11 (Reserves),
  //     12 (Report a nouveau, dont 129 RAN debiteur)
  //     et 13 (Resultat de l'exercice).
  //
  // Le NET est necessaire pour gerer correctement les comptes a solde
  // debiteur (129, 139). L'affectation interne du resultat (transfert
  // 13 vers 11/12) s'auto-annule dans la somme 11+12+13.
  //
  // Risque connu : double comptage avec FN si dividendes declares ET
  // payes dans le meme exercice (peu frequent en pratique).
  const fmClasse10 = rawSC(lN, ['10'], ['106', '109']) - rawSC(lN1, ['10'], ['106', '109']);
  const cpResPfx = ['11', '12', '13'];
  const fmExt_N = rawSC(lN, cpResPfx) - rawSD(lN, cpResPfx);
  const fmExt_N1 = rawSC(lN1, cpResPfx) - rawSD(lN1, cpResPfx);
  data.FM = fmClasse10 + (fmExt_N - fmExt_N1);

  // FN — Dividendes verses
  data.FN = -sumMvtDebit(lN, ['465']);

  data.ZD = data.FK + data.FL + data.FM + data.FN;

  // FO/FP/FQ — Flux de financement provenant des capitaux etrangers (TFT 4.2.3.5)
  // Formule officielle SYSCOHADA :
  //   FO = mvt credit du compte 16 (sauf interets courus 166)
  //   FP = mvt credit du compte 18 (sauf interets courus 183)
  //   FQ = - (mvt debit du compte 16 sauf 166
  //         + mvt debit du compte 17 sauf 176
  //         + mvt debit du compte 18 sauf 183)
  //
  // Le compte 17 (dettes de location acquisition) ne fait pas l'objet d'un
  // encaissement (FO/FP), mais son mvt debit (= remboursement) est un
  // decaissement de dette financiere (FQ).
  //
  // Le compte 185 (Comptes permanents non bloques succursales) est exclu
  // car il est en passif circulant (DM du bilan SYSCOHADA implemente),
  // donc deja capte par FE via bilanDP. Eviter double comptage.
  data.FO = sumMvtCredit(lN, ['16'], ['166']);
  data.FP = sumMvtCredit(lN, ['18'], ['183', '185']);
  data.FQ = -(
    sumMvtDebit(lN, ['16'], ['166'])
    + sumMvtDebit(lN, ['17'], ['176'])
    + sumMvtDebit(lN, ['18'], ['183', '185'])
  );

  data.ZE = data.FO + data.FP + data.FQ;
  data.ZF = data.ZD + data.ZE;
  data.ZB = data.FA + data.FB + data.FC + data.FD + data.FE;
  data.ZG = data.ZB + data.ZC + data.ZF;
  data.ZH = data.ZG + data.ZA;

  // ZI — Controle
  data.ZI = bilanTresoActif(lN) - rawSC(lN, ['4726']) - bilanTresoPassif(lN);

  return data;
}

// Alias semantique : la fonction principale est la version "Guide officiel".
export const computeAllFluxA = computeAllFlux;

// =============================================================================
// VERSION B — PRATICIEN COMPTABLE
// =============================================================================
// Formules detaillees fournies par un praticien pour isoler strictement le
// cash, en neutralisant les operations non monetaires (incorporation reserves,
// conversion comptes courants, affectation resultat, etc.).
//
// Postes differents de la version A :
//   FK (apport nouveau) : isolement cash apport
//   FL (subventions)    : isolement cash subvention recue
//   FM (prelevement)    : MvtD 4619 + MvtD 103/104 (sortie cash associes)
//
// Postes identiques : FA, FB-FE, FF-FJ, FN, FO-FQ.
// Z* recalcules en consequence.
export function computeAllFluxB(lN: BalanceLigne[], lN1Raw: BalanceLigne[]): Record<string, number> {
  // Reutilise la version A pour tous les postes, puis surcharge FK/FL/FM
  const data = { ...computeAllFlux(lN, lN1Raw) };
  const lN1 = lN1Raw.length > 0 ? lN1Raw : lignesFromSI(lN);

  // FK Praticien : isolement cash apport
  // FK = Var SC(101, 102, 1051)
  //    - SD(109, 4613, 467, 4581)
  //    - MvtD(11, 12, 130, 131)
  //    + MvtC(103, 104, 11, 12, 139, 4619, 465)
  const fkVarCapital = rawSC(lN, ['101', '102', '1051']) - rawSC(lN1, ['101', '102', '1051']);
  const fkSD = rawSD(lN, ['109', '4613', '467', '4581']);
  const fkMvtD = sumMvtDebit(lN, ['11', '12', '130', '131']);
  const fkMvtC = sumMvtCredit(lN, ['103', '104', '11', '12', '139', '4619', '465']);
  data.FK = fkVarCapital - fkSD - fkMvtD + fkMvtC;

  // FL Praticien (corrige) : utilisation de la VARIATION 4494/4582
  // (au lieu de SD seul) pour capter les encaissements des annees ulterieures.
  // FL = Var SC(14) + SC(799) - Var SD(4494, 4582)
  const flVar14 = rawSC(lN, ['14']) - rawSC(lN1, ['14']);
  const flSC799 = rawSC(lN, ['799']);
  const flVarSD = (rawSD(lN, ['4494', '4582']) - rawSD(lN1, ['4494', '4582']));
  data.FL = flVar14 + flSC799 - flVarSD;

  // FM Praticien : sortie cash sur capital
  // FM = MvtD(4619) + MvtD(103, 104)
  data.FM = sumMvtDebit(lN, ['4619']) + sumMvtDebit(lN, ['103', '104']);

  // Recalculer les Z* en aval
  data.ZD = data.FK + data.FL + data.FM + data.FN;
  data.ZF = data.ZD + data.ZE;
  data.ZG = data.ZB + data.ZC + data.ZF;
  data.ZH = data.ZG + data.ZA;

  return data;
}
