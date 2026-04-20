// Analyse des mouvements des comptes capitaux propres (classes 10-13).
// Extrait SI / debit / credit / SF et deduit la nature economique du mouvement
// (affectation resultat, augmentation capital, dividendes, primes, etc.).
// Utilise par RevisionKP pour la decomposition contrepartie et les suggestions.

import type { BalanceLigne } from '../../types';
import { soldeCreditNet } from '../revisionTypes';

export interface MouvementAnalyse {
  compte: string;
  libelle: string;
  si: number;
  debit: number;
  credit: number;
  sf: number;
  variation: number;
  nature: string;
}

function describeMouvement(p3: string, d: number, c: number, si: number, sf: number): string {
  const fmtN = (n: number): string => n.toLocaleString('fr-FR');

  if (p3 === '131' || p3 === '130') {
    if (d > 0 && Math.abs(d - si) < 0.5 && Math.abs(sf) < 0.5) return 'Résultat N-1 entièrement affecté (soldé)';
    if (d > 0) return `Résultat partiellement affecté (${fmtN(d)} distribué)`;
  } else if (p3 === '121') {
    if (c > 0 && d > 0) return `RAN : reçu ${fmtN(c)} (affectation résultat), sorti ${fmtN(d)} (dividendes/autres)`;
    if (c > 0) return `RAN : reçu ${fmtN(c)} (affectation résultat)`;
  } else if (p3 === '101') {
    if (c > 0 && d === 0) return `Augmentation de capital de ${fmtN(c)} (apports ou incorporation)`;
    if (d > 0 && c === 0) return `Réduction de capital de ${fmtN(d)} (absorption pertes ou remboursement)`;
    if (d > 0 && c > 0) return `Mouvements capital D=${fmtN(d)} C=${fmtN(c)}`;
  } else if (p3 === '102') {
    if (c > 0 && d === 0) return `Dotation publique reçue de ${fmtN(c)}`;
    if (d > 0 && c === 0) return `Reprise contractuelle de dettes de ${fmtN(d)}`;
    if (d > 0 && c > 0) return `Mouvements dotation D=${fmtN(d)} C=${fmtN(c)}`;
  } else if (p3 === '103') {
    if (c > 0 && d === 0) return `Apports définitifs exploitant de ${fmtN(c)}`;
    if (d > 0 && c === 0) return `Affectation perte / retraits nets de ${fmtN(d)}`;
    if (d > 0 && c > 0) return `Apports ${fmtN(c)}, retraits/affectation ${fmtN(d)}`;
  } else if (p3 === '104') {
    if (c > 0 && d > 0) return `Apports temporaires ${fmtN(c)}, prélèvements ${fmtN(d)}`;
    if (c > 0) return `Apports temporaires exploitant de ${fmtN(c)}`;
    if (d > 0) return `Prélèvements exploitant de ${fmtN(d)}`;
  } else if (p3 === '105') {
    if (c > 0 && d === 0) return `Primes constatées ${fmtN(c)} (émission/fusion/apport/conversion)`;
    if (d > 0 && c === 0) return `Incorporation ou imputation primes ${fmtN(d)}`;
    if (d > 0 && c > 0) return `Primes : constatées ${fmtN(c)}, incorporées/imputées ${fmtN(d)}`;
  } else if (p3 === '106') {
    if (c > 0 && d === 0) return `Écart de réévaluation constaté de ${fmtN(c)}`;
    if (d > 0) return `Incorporation écart de réévaluation au capital de ${fmtN(d)}`;
  } else if (p3 === '109') {
    if (d > 0 && c === 0) return `Capital souscrit non appelé ${fmtN(d)} (création/augmentation)`;
    if (c > 0 && d === 0) return `Appel de capital de ${fmtN(c)}`;
    if (d > 0 && c > 0) return `Non appelé ${fmtN(d)}, appelé ${fmtN(c)}`;
  } else if (p3 === '111' || p3 === '112' || p3 === '113' || p3 === '118') {
    if (c > 0 && d === 0) return `Affectation résultat aux réserves ${fmtN(c)}`;
    if (d > 0 && c === 0) return `Prélèvement sur réserves ${fmtN(d)} (incorporation capital, distribution ou absorption pertes)`;
    if (c > 0 && d > 0) return `Affectation ${fmtN(c)}, prélèvement ${fmtN(d)}`;
  } else if (p3 === '121' || p3 === '129') {
    if (c > 0 && d === 0) return `RAN : bénéfice non affecté ${fmtN(c)}`;
    if (d > 0 && c === 0) return `RAN : pertes reportées ou dividendes distribués ${fmtN(d)}`;
    if (c > 0 && d > 0) return `RAN : reçu ${fmtN(c)} (affectation), sorti ${fmtN(d)} (pertes/dividendes)`;
  }
  return '';
}

export function computeAnalyses(balanceN: BalanceLigne[]): MouvementAnalyse[] {
  return balanceN
    .filter(l => {
      const p3 = l.numero_compte.substring(0, 3);
      return p3 >= '100' && p3 <= '139';
    })
    .map(l => {
      const si = (parseFloat(String(l.si_credit ?? 0)) || 0) - (parseFloat(String(l.si_debit ?? 0)) || 0);
      const d = parseFloat(String(l.debit)) || 0;
      const c = parseFloat(String(l.credit)) || 0;
      const sf = soldeCreditNet(l);
      const p3 = l.numero_compte.substring(0, 3);
      const nature = describeMouvement(p3, d, c, si, sf);

      return { compte: l.numero_compte, libelle: l.libelle_compte, si, debit: d, credit: c, sf, variation: sf - si, nature };
    });
}
