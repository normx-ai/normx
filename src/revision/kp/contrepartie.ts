// Determination de la contrepartie probable d'un ecart sur un compte capital propre.
// Les regles suivent la logique OHADA (affectation resultat, reserves, dividendes,
// incorporation capital, dotation publique, primes, reevaluation, appel de capital).

import type { BalanceLigne } from '../../types';
import type { KPLigne } from '../revisionTypes';
import type { MouvementAnalyse } from './analyses';

export interface ContrepartieRef {
  compte: string;
  libelle: string;
}

export function findContrepartie(
  compte: string,
  ecartPositif: boolean,
  analyses: MouvementAnalyse[],
  lignes: KPLigne[],
  balanceN: BalanceLigne[],
): ContrepartieRef {
  const p3 = compte.substring(0, 3);

  // Resultat (131/139/130)
  if (p3 === '131' || p3 === '130' || p3 === '139') {
    if (ecartPositif) {
      const ran = analyses.find(a => a.compte.startsWith('121'));
      return ran ? { compte: ran.compte, libelle: 'Report à nouveau' } : { compte: '121000', libelle: 'Report à nouveau' };
    }
    const a11 = analyses.find(a => a.compte.startsWith('11') && a.debit > 0.5);
    if (a11) return { compte: a11.compte, libelle: 'Réserves (absorption pertes)' };
    const ran = analyses.find(a => a.compte.startsWith('121'));
    if (ran) return { compte: ran.compte, libelle: 'Report à nouveau' };
    const a103 = analyses.find(a => a.compte.startsWith('103'));
    if (a103) return { compte: a103.compte, libelle: 'Capital personnel' };
    return { compte: '121000', libelle: 'Report à nouveau' };
  }

  // Reserves (111-118)
  if (p3 >= '111' && p3 <= '118') {
    if (ecartPositif) {
      const res131 = analyses.find(a => a.compte.startsWith('131'));
      if (res131 && Math.abs(res131.variation) > 0.5) return { compte: res131.compte, libelle: 'Résultat net' };
      const ran = analyses.find(a => a.compte.startsWith('121'));
      return ran ? { compte: ran.compte, libelle: 'Report à nouveau' } : { compte: '131000', libelle: 'Résultat net' };
    }
    const a101 = analyses.find(a => a.compte.startsWith('101'));
    if (a101 && a101.credit > 0.5) return { compte: a101.compte, libelle: 'Capital social (incorporation)' };
    const a465 = analyses.find(a => a.compte.startsWith('465'));
    if (a465) return { compte: a465.compte, libelle: 'Associés, dividendes à payer' };
    const a129 = analyses.find(a => a.compte.startsWith('129'));
    if (a129) return { compte: a129.compte, libelle: 'Report à nouveau débiteur (absorption pertes)' };
    const ran = analyses.find(a => a.compte.startsWith('121'));
    return ran ? { compte: ran.compte, libelle: 'Report à nouveau' } : { compte: '121000', libelle: 'Report à nouveau' };
  }

  // RAN (121/129)
  if (p3 === '121' || p3 === '129') {
    if (ecartPositif) {
      const res131 = analyses.find(a => a.compte.startsWith('131'));
      return res131 ? { compte: res131.compte, libelle: 'Résultat net : Bénéfice' } : { compte: '131000', libelle: 'Résultat net : Bénéfice' };
    }
    const a465 = analyses.find(a => a.compte.startsWith('465'));
    if (a465 && a465.credit > 0.5) return { compte: a465.compte, libelle: 'Associés, dividendes à payer' };
    const a139 = analyses.find(a => a.compte.startsWith('139'));
    if (a139) return { compte: a139.compte, libelle: 'Résultat net : Perte' };
    const res131 = analyses.find(a => a.compte.startsWith('131'));
    const resultatSolde = res131 && Math.abs(res131.sf) < 0.5;
    if (resultatSolde) {
      const reserveEnEcart = lignes.find(l => l.compte.startsWith('111') && Math.abs(l.ecart) > 0.5);
      if (reserveEnEcart) return { compte: reserveEnEcart.compte, libelle: 'Réserve légale' };
      const autreReserve = lignes.find(l => (l.compte.startsWith('112') || l.compte.startsWith('113') || l.compte.startsWith('118')) && Math.abs(l.ecart) > 0.5);
      if (autreReserve) return { compte: autreReserve.compte, libelle: autreReserve.designation };
    }
    return res131 ? { compte: res131.compte, libelle: 'Résultat net' } : { compte: '139000', libelle: 'Résultat net : Perte' };
  }

  // 101 — Capital social
  if (p3 === '101') {
    const a109 = analyses.find(a => a.compte.startsWith('109'));
    if (a109 && Math.abs(a109.debit) > 0.5) return { compte: a109.compte, libelle: 'Capital souscrit non appelé' };
    const a46 = analyses.find(a => a.compte.startsWith('46'));
    if (a46) return { compte: a46.compte, libelle: 'Associés et groupe' };
    const a105 = analyses.find(a => a.compte.startsWith('105'));
    if (a105) return { compte: a105.compte, libelle: 'Primes liées au capital' };
    return { compte: '461000', libelle: 'Associés, opérations sur le capital' };
  }

  // 102 — Capital par dotation
  if (p3 === '102') {
    const a4493 = analyses.find(a => a.compte.startsWith('4493'));
    if (a4493) return { compte: a4493.compte, libelle: 'État, fonds de dotation à recevoir' };
    const a45 = analyses.find(a => a.compte.startsWith('45'));
    if (a45) return { compte: a45.compte, libelle: 'Organismes internationaux' };
    return { compte: '449300', libelle: 'État, fonds de dotation à recevoir' };
  }

  // 103 — Capital personnel
  if (p3 === '103') {
    const a104 = analyses.find(a => a.compte.startsWith('104'));
    if (a104) return { compte: a104.compte, libelle: "Compte de l'exploitant" };
    if (ecartPositif) {
      const a131 = analyses.find(a => a.compte.startsWith('131'));
      if (a131) return { compte: a131.compte, libelle: 'Résultat net : Bénéfice' };
    } else {
      const a139 = analyses.find(a => a.compte.startsWith('139'));
      if (a139) return { compte: a139.compte, libelle: 'Résultat net : Perte' };
    }
    return { compte: '104000', libelle: "Compte de l'exploitant" };
  }

  // 104 — Compte de l'exploitant
  if (p3 === '104') {
    const a103 = analyses.find(a => a.compte.startsWith('103'));
    if (a103) return { compte: a103.compte, libelle: 'Capital personnel' };
    return { compte: '103000', libelle: 'Capital personnel' };
  }

  // 105 — Primes
  if (p3 === '105') {
    if (ecartPositif) {
      const a46 = analyses.find(a => a.compte.startsWith('46'));
      if (a46) return { compte: a46.compte, libelle: 'Associés' };
      return { compte: '461000', libelle: 'Associés, opérations sur le capital' };
    }
    const a101 = analyses.find(a => a.compte.startsWith('101'));
    if (a101 && a101.credit > 0) return { compte: a101.compte, libelle: 'Capital social (incorporation)' };
    const a12 = analyses.find(a => a.compte.startsWith('12'));
    if (a12) return { compte: a12.compte, libelle: 'Report à nouveau (absorption pertes)' };
    return { compte: '101000', libelle: 'Capital social' };
  }

  // 106 — Ecarts de reevaluation
  if (p3 === '106') {
    if (!ecartPositif) {
      const a10 = analyses.find(a => a.compte.startsWith('101'));
      if (a10) return { compte: a10.compte, libelle: 'Capital social (incorporation)' };
      return { compte: '101000', libelle: 'Capital social' };
    }
    return { compte: '______', libelle: '(actifs réévalués)' };
  }

  // 109 — Capital souscrit non appele
  if (p3 === '109') {
    if (ecartPositif) {
      const a467 = analyses.find(a => a.compte.startsWith('467'));
      if (a467) return { compte: a467.compte, libelle: 'Actionnaires, restant dû sur capital appelé' };
      return { compte: '467000', libelle: 'Actionnaires, restant dû sur capital appelé' };
    }
    const cap = analyses.find(a => a.compte.startsWith('101'));
    return cap ? { compte: cap.compte, libelle: 'Capital social' } : { compte: '101000', libelle: 'Capital social' };
  }

  // Defaut : chercher le compte avec le mouvement symetrique le plus proche
  const montantRef = ecartPositif
    ? balanceN.find(l => l.numero_compte === compte)?.credit || 0
    : balanceN.find(l => l.numero_compte === compte)?.debit || 0;

  if (montantRef > 0) {
    const match = analyses.find(a => a.compte !== compte && (
      (ecartPositif && Math.abs((a.debit || 0) - montantRef) < montantRef * 0.1) ||
      (!ecartPositif && Math.abs((a.credit || 0) - montantRef) < montantRef * 0.1)
    ));
    if (match) return { compte: match.compte, libelle: match.libelle };
  }

  return { compte: '______', libelle: '(à déterminer)' };
}
