// Analyse factuelle du TFT : compare les postes calcules aux comptes de
// la balance, detecte les ecarts, les provisions non captees, les
// anomalies de sens et les comptes a variation non couverts.

import type { BalanceLigne } from '../../types';
import {
  formatMontant, matchesComptes,
  getSD, getSC,
  sumSoldeDebiteur, sumSoldeCrediteur,
} from './soldes';
import { computeAllFlux } from './calculs';

export interface DiagnosticItem {
  poste: string;
  type: 'erreur' | 'alerte' | 'info';
  message: string;
  comptes?: { num: string; lib: string; montant: number }[];
  montant?: number;
}

// Liste les comptes de la BG qui matchent un prefixe avec leur variation (N vs N-1).
function comptesAvecVariation(
  lN: BalanceLigne[],
  lN1: BalanceLigne[],
  prefixes: string[],
  excludes: string[] = [],
  seuil = 1,
): { num: string; lib: string; montant: number }[] {
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
      montant: ecart,
    });
  }

  // ===== 2. COHERENCE PROVISIONS (19) vs DOTATIONS (69) / REPRISES (79) =====
  const provPrefixes = ['15', '19'];
  const provComptes = comptesAvecVariation(lN, lN1, provPrefixes, [], 1000);
  const totalVarProv = provComptes.reduce((s, c) => s + c.montant, 0);
  const dotProv = Math.round(sumSoldeDebiteur(lN, ['69']));
  const repProv = Math.round(sumSoldeCrediteur(lN, ['79']));
  const dotNetProv = dotProv - repProv;
  const ecartProv = Math.round(-totalVarProv - dotNetProv);

  if (Math.abs(ecartProv) >= 1000) {
    diag.push({
      poste: 'FA',
      type: 'alerte',
      message: 'Variation provisions (15+19) = ' + formatMontant(-totalVarProv)
        + ' vs Dotations provisions nettes (69-79) = ' + formatMontant(dotNetProv)
        + '. Ecart : ' + formatMontant(ecartProv) + '.',
      comptes: provComptes,
      montant: ecartProv,
    });
  }

  // ===== 3. DECOMPOSITION PAR POSTE — comptes de la BG avec variation =====
  const posteDecompositions: { ref: string; label: string; prefixes: string[]; excludes: string[] }[] = [
    { ref: 'ZA', label: 'Tresorerie ouverture', prefixes: ['50','51','52','53','54','55','57','581','582','564','565','561','566'], excludes: [] },
    { ref: 'FB', label: 'Actif circulant HAO', prefixes: ['488'], excludes: ['4988'] },
    { ref: 'FC', label: 'Stocks', prefixes: ['31','32','33','34','35','36','37','38'], excludes: ['39'] },
    { ref: 'FD', label: 'Creances', prefixes: ['409','41','42','43','44','45','46','47','185'], excludes: ['419','478','414','461','467','458','4494','4751'] },
    { ref: 'FE', label: 'Passif circulant', prefixes: ['40','419','481','482','484','4998','42','43','44','185','45','46','47','499','599'], excludes: ['409','404','465','467','472','4726','4752'] },
    { ref: 'FF', label: 'Immob incorporelles', prefixes: ['21','281','291'], excludes: [] },
    { ref: 'FG', label: 'Immob corporelles', prefixes: ['22','23','24','282','283','284','292','293','294'], excludes: [] },
    { ref: 'FH', label: 'Immob financieres', prefixes: ['26','27'], excludes: ['2714','2766'] },
    // FK praticien capte aussi 11/12/13 (via MvtD/MvtC) + 4613/4619 (via SD/MvtC)
    { ref: 'FK', label: 'Capital + Reserves/RAN/Resultat', prefixes: ['10','11','12','13','4613','4619','4581','467'], excludes: ['106'] },
    { ref: 'FL', label: 'Subventions invest', prefixes: ['14','799','4494','4582'], excludes: [] },
    { ref: 'FM', label: 'Prelevement capital', prefixes: ['4619','103','104'], excludes: [] },
    { ref: 'FN', label: 'Dividendes', prefixes: ['465'], excludes: [] },
    { ref: 'FO/FP/FQ', label: 'Dettes financieres', prefixes: ['16','17','18'], excludes: [] },
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
        montant: total,
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

  const nonCaptes = comptesAvecVariation(lN, lN1, ['1', '2', '3', '4'], allCaptedPrefixes, 1000);
  const vraiNonCaptes = nonCaptes.filter(c => !allCaptedPrefixes.some(p => c.num.startsWith(p)));

  if (vraiNonCaptes.length > 0) {
    const totalNC = vraiNonCaptes.reduce((s, c) => s + c.montant, 0);
    diag.push({
      poste: 'BG',
      type: 'alerte',
      message: vraiNonCaptes.length + ' compte(s) avec variation non capte(s) par le TFT, total ' + formatMontant(Math.round(totalNC)) + '.',
      comptes: vraiNonCaptes,
      montant: Math.round(totalNC),
    });
  }

  // ===== 4bis. COHERENCE DES SOUS-TOTAUX =====
  const checks: [string, number, string, number][] = [
    ['ZB', flux.ZB, 'FA+FB+FC+FD+FE', flux.FA + (flux.FB || 0) + (flux.FC || 0) + (flux.FD || 0) + (flux.FE || 0)],
    ['ZC', flux.ZC, 'FF+FG+FH+FI+FJ', (flux.FF || 0) + (flux.FG || 0) + (flux.FH || 0) + (flux.FI || 0) + (flux.FJ || 0)],
    ['ZD', flux.ZD, 'FK+FL+FM+FN', (flux.FK || 0) + (flux.FL || 0) + (flux.FM || 0) + (flux.FN || 0)],
    ['ZE', flux.ZE, 'FO+FP+FQ', (flux.FO || 0) + (flux.FP || 0) + (flux.FQ || 0)],
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
  const sensRules: { prefix: string; sens: 'debiteur' | 'crediteur'; poste: string; impact: string }[] = [
    { prefix: '101', sens: 'crediteur', poste: 'FK', impact: 'Un capital debiteur fausse le poste FK (augmentation de capital) du TFT.' },
    { prefix: '11', sens: 'crediteur', poste: 'FK', impact: 'Des reserves debitrices faussent le poste FK et peuvent indiquer une absorption de pertes non comptabilisee.' },
    { prefix: '14', sens: 'crediteur', poste: 'FL', impact: "Une subvention d'investissement debitrice fausse le poste FL (subventions recues)." },
    { prefix: '15', sens: 'crediteur', poste: 'FA', impact: 'Une provision reglementee debitrice fausse la CAFG (poste FA) car les dotations/reprises HAO sont neutralisees.' },
    { prefix: '16', sens: 'crediteur', poste: 'FO', impact: "Un emprunt debiteur fausse le poste FO/FP (emprunts) : la variation sera interpretee comme un remboursement au lieu d'un tirage." },
    { prefix: '19', sens: 'crediteur', poste: 'FA', impact: 'Une provision pour risques debitrice fausse la CAFG car les dotations aux provisions sont neutralisees dans FA.' },
    { prefix: '28', sens: 'crediteur', poste: 'FA', impact: 'Un amortissement debiteur fausse la CAFG car les dotations aux amortissements sont neutralisees dans FA.' },
    { prefix: '29', sens: 'crediteur', poste: 'FA', impact: 'Une provision pour depreciation debitrice fausse la CAFG (neutralisation des dotations/reprises).' },
    { prefix: '39', sens: 'crediteur', poste: 'FC', impact: 'Une depreciation de stocks debitrice fausse le poste FC (variation des stocks).' },
    { prefix: '40', sens: 'crediteur', poste: 'FE', impact: 'Un fournisseur debiteur fausse le poste FE (passif circulant) : la variation sera inversee.' },
    { prefix: '41', sens: 'debiteur', poste: 'FD', impact: 'Un client crediteur fausse le poste FD (creances) : la variation sera inversee.' },
    { prefix: '42', sens: 'crediteur', poste: 'FE', impact: 'Un compte personnel debiteur (sauf 421) fausse le poste FE (passif circulant).' },
    { prefix: '43', sens: 'crediteur', poste: 'FE', impact: 'Un organisme social debiteur fausse le poste FE (passif circulant).' },
    { prefix: '49', sens: 'crediteur', poste: 'FD', impact: 'Une depreciation de creances debitrice fausse le poste FD (creances nettes).' },
    { prefix: '52', sens: 'debiteur', poste: 'ZI', impact: "Un compte banque crediteur indique un decouvert. Verifier qu'il est bien classe en tresorerie passif pour le calcul de ZI." },
    { prefix: '57', sens: 'debiteur', poste: 'ZI', impact: "Un compte caisse crediteur est une anomalie grave (presomption d'irregularite). Impact direct sur la tresorerie finale ZI." },
  ];

  for (const l of lN) {
    const num = (l.numero_compte || '').trim();
    if (!num || num.length <= 2) continue;
    const sd = getSD(l);
    const sc = getSC(l);
    if (sd < 0.5 && sc < 0.5) continue;

    for (const rule of sensRules) {
      if (!num.startsWith(rule.prefix)) continue;
      if (num.startsWith('109') || num.startsWith('129') || num.startsWith('139')) continue;
      if (num.startsWith('409')) continue;
      if (num.startsWith('419')) continue;
      if (num.startsWith('421')) continue;
      if (num.startsWith('445')) continue;

      const estInverse = (rule.sens === 'crediteur' && sd > 0.5 && sc < 0.5)
        || (rule.sens === 'debiteur' && sc > 0.5 && sd < 0.5);
      if (estInverse) {
        diag.push({
          poste: rule.poste,
          type: 'alerte',
          message: num + ' ' + (l.libelle_compte || '') + ' : solde '
            + (sd > 0.5 ? 'debiteur' : 'crediteur') + ' de ' + formatMontant(Math.round(sd > 0.5 ? sd : sc))
            + ' (sens attendu : ' + rule.sens + ').',
          montant: Math.round(sd > 0.5 ? sd : sc),
        });
      }
      break;
    }
  }

  // ===== 5bis. RECONCILIATION DE L'ECART : comptes orphelins uniquement =====
  if (ecart !== 0) {
    function trouverPoste(num: string): string | null {
      for (const p of posteDecompositions) {
        if (matchesComptes(num, p.prefixes) && !matchesComptes(num, p.excludes || [])) return p.ref;
      }
      return null;
    }

    type CompteVar = { num: string; lib: string; montant: number };
    const orphelins: CompteVar[] = [];
    const seen = new Set<string>();

    for (const l of lN) {
      const num = (l.numero_compte || '').trim();
      if (!num || !/^[1-5]/.test(num)) continue;
      seen.add(num);
      if (trouverPoste(num) !== null) continue;
      const netN = getSD(l) - getSC(l);
      const prev = lN1.find(p => (p.numero_compte || '').trim() === num);
      const netN1 = prev ? getSD(prev) - getSC(prev) : 0;
      const v = Math.round(netN - netN1);
      if (Math.abs(v) >= 1000) {
        orphelins.push({ num, lib: l.libelle_compte || '', montant: v });
      }
    }
    for (const l of lN1) {
      const num = (l.numero_compte || '').trim();
      if (!num || !/^[1-5]/.test(num) || seen.has(num)) continue;
      if (trouverPoste(num) !== null) continue;
      const netN1 = getSD(l) - getSC(l);
      const v = Math.round(-netN1);
      if (Math.abs(v) >= 1000) {
        orphelins.push({ num, lib: l.libelle_compte || '', montant: v });
      }
    }
    orphelins.sort((a, b) => Math.abs(b.montant) - Math.abs(a.montant));

    const sommeOrphelins = orphelins.reduce((s, c) => s + c.montant, 0);
    const couvertureExacte = Math.abs(sommeOrphelins - ecart) < 1;

    if (orphelins.length === 0) {
      diag.push({
        poste: 'Reconciliation',
        type: 'alerte',
        message: 'Ecart de bouclage de ' + formatMontant(ecart) + ' FCFA, mais aucun compte orphelin '
          + 'identifie. Cause probable : anomalie de sens (cf. alertes ci-dessus) ou erreur d\'arrondi cumulee. '
          + 'Verifier la coherence des balances N et N-1 ou la saisie d\'ecritures non equilibrees.',
        montant: ecart,
      });
    } else {
      const explication = couvertureExacte
        ? 'La somme des variations orphelines (' + formatMontant(sommeOrphelins) + ') correspond exactement a l\'ecart de bouclage (' + formatMontant(ecart) + '). Ce sont les comptes responsables.'
        : 'La somme des variations orphelines est ' + formatMontant(sommeOrphelins) + ' alors que l\'ecart de bouclage est ' + formatMontant(ecart) + '. Difference ' + formatMontant(ecart - sommeOrphelins) + ' FCFA = autres causes (anomalies de sens, voir alertes ci-dessus).';
      diag.push({
        poste: 'Reconciliation',
        type: 'erreur',
        message: orphelins.length + ' compte(s) du bilan ont une variation NON captee par le TFT (= flux non rattachables). '
          + explication
          + ' Action : reclasser ces comptes vers un compte standard SYSCOHADA, ou verifier la saisie.',
        comptes: orphelins.map(c => ({ num: c.num, lib: c.lib, montant: c.montant })),
        montant: ecart,
      });
    }
  }

  // ===== 6. RESUME =====
  const nbAlertes = diag.filter(d => d.type === 'alerte').length;
  const nbErreurs = diag.filter(d => d.type === 'erreur').length;
  if (ecart === 0 && nbAlertes === 0) {
    diag.push({ poste: 'Resume', type: 'info', message: 'Aucun probleme detecte. Le TFT est complet et equilibre.' });
  } else if (ecart === 0 && nbAlertes > 0) {
    diag.push({ poste: 'Resume', type: 'info', message: 'Le TFT est equilibre. ' + nbAlertes + " point(s) d'attention a verifier." });
  } else {
    diag.push({
      poste: 'Resume',
      type: 'erreur',
      message: nbErreurs + ' erreur(s) et ' + nbAlertes + ' alerte(s). Corriger la balance pour equilibrer le TFT.',
    });
  }

  return diag;
}
