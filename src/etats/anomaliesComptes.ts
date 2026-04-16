// ===================== DETECTION D'ANOMALIES DE SOLDE =====================
// Basé sur le fonctionnement des comptes SYSCOHADA révisé

import { BalanceLigne } from '../types';

export type SoldeAttendu = 'debiteur' | 'crediteur' | 'les_deux';

export interface AnomalieCompte {
  type: 'solde_inverse' | 'solde_residuel' | 'desequilibre';
  severity: 'error' | 'warning';
  message: string;
}

export interface AnomalieEquilibre {
  section: 'SI' | 'MVT' | 'SF';
  label: string;
  ecart: number;
}

export function detectDesequilibres(lignes: BalanceLigne[]): AnomalieEquilibre[] {
  const anomalies: AnomalieEquilibre[] = [];

  const totalSID = lignes.reduce((s, l) => s + (parseFloat(String(l.si_debit)) || 0), 0);
  const totalSIC = lignes.reduce((s, l) => s + (parseFloat(String(l.si_credit)) || 0), 0);
  const ecartSI = totalSID - totalSIC;
  if (Math.abs(ecartSI) >= 0.01) {
    anomalies.push({ section: 'SI', label: 'Soldes initiaux déséquilibrés', ecart: ecartSI });
  }

  const totalDebit = lignes.reduce((s, l) => s + (parseFloat(String(l.debit)) || 0), 0);
  const totalCredit = lignes.reduce((s, l) => s + (parseFloat(String(l.credit)) || 0), 0);
  const ecartMVT = totalDebit - totalCredit;
  if (Math.abs(ecartMVT) >= 0.01) {
    anomalies.push({ section: 'MVT', label: 'Mouvements déséquilibrés', ecart: ecartMVT });
  }

  const totalSD = lignes.reduce((s, l) => s + (parseFloat(String(l.solde_debiteur)) || 0), 0);
  const totalSC = lignes.reduce((s, l) => s + (parseFloat(String(l.solde_crediteur)) || 0), 0);
  const ecartSF = totalSD - totalSC;
  if (Math.abs(ecartSF) >= 0.01) {
    anomalies.push({ section: 'SF', label: 'Soldes finaux déséquilibrés', ecart: ecartSF });
  }

  return anomalies;
}

// Solde normal attendu par compte selon le fonctionnement SYSCOHADA
export function getSoldeAttendu(numero: string): SoldeAttendu {
  const c = numero.replace(/\s/g, '');
  const c2 = c.substring(0, 2);
  const c3 = c.substring(0, 3);

  // ==================== CLASSE 1 — CAPITAUX PROPRES ====================
  // Normalement créditeur (ressources permanentes).
  // Exceptions à solde débiteur (pertes / contre-parties) :
  // - 109 : Capital souscrit non appelé (actif)
  // - 129 : Report à nouveau débiteur (pertes antérieures)
  // - 139 : Résultat net de l'exercice : perte
  // - 1309 : Résultat en instance d'affectation : Perte (sous-compte de 130)
  const c4 = c.substring(0, 4);
  if (c3 === '109' || c3 === '129' || c3 === '139') return 'debiteur';
  if (c4 === '1309') return 'debiteur';
  if (c.startsWith('1')) return 'crediteur';

  // ==================== CLASSE 2 — IMMOBILISATIONS ====================
  // Normalement débiteur (actif immobilisé)
  // Sauf 28 (Amortissements) = créditeur (en diminution de l'actif)
  // Sauf 29 (Provisions pour dépréciation) = créditeur
  if (c2 === '28') return 'crediteur';
  if (c2 === '29') return 'crediteur';
  if (c.startsWith('2')) return 'debiteur';

  // ==================== CLASSE 3 — STOCKS ====================
  // Normalement débiteur (actif circulant)
  // Sauf 39 (Dépréciations des stocks) = créditeur
  if (c2 === '39') return 'crediteur';
  if (c.startsWith('3')) return 'debiteur';

  // ==================== CLASSE 4 — TIERS ====================

  // 40 — Fournisseurs : créditeur (dette)
  // Sauf 409 (Avances et acomptes versés aux fournisseurs) = débiteur (créance)
  if (c3 === '409') return 'debiteur';
  if (c2 === '40') return 'crediteur';

  // 41 — Clients : débiteur (créance)
  // Sauf 419 (Avances et acomptes reçus des clients) = créditeur (dette)
  if (c3 === '419') return 'crediteur';
  if (c2 === '41') return 'debiteur';

  // 42 — Personnel
  // 421 (Avances au personnel) = débiteur (créance sur le salarié)
  // 422 (Rémunérations dues) = créditeur (dette envers le salarié)
  // 423-428 = créditeur (dettes)
  if (c3 === '421') return 'debiteur';
  if (c2 === '42') return 'crediteur';

  // 43 — Organismes sociaux = créditeur (dettes sociales)
  if (c2 === '43') return 'crediteur';

  // 44 — État et collectivités publiques
  // 441 (État, impôt sur les bénéfices) = créditeur (dette fiscale)
  // 442 (État, autres impôts et taxes) = créditeur (dette fiscale)
  // 443 (État, TVA facturée/collectée) = créditeur (TVA à reverser)
  // 4441 (État, TVA due) = créditeur (dette TVA envers l'État)
  // 4449 (État, crédit de TVA à reporter) = débiteur (créance sur l'État)
  // 445 (État, TVA récupérable) = débiteur (créance TVA)
  // 446 (État, autres taxes sur le CA) = créditeur
  // 447 (État, impôts retenus à la source) = créditeur (dette)
  // 449 (État, créances et dettes diverses) = variable
  if (c3 === '441' || c3 === '442' || c3 === '443' || c3 === '446' || c3 === '447') return 'crediteur';
  if (c.substring(0, 4) === '4441') return 'crediteur';
  if (c.substring(0, 4) === '4449') return 'debiteur';
  if (c3 === '444') return 'les_deux';
  if (c3 === '445') return 'debiteur';
  if (c2 === '44') return 'les_deux';

  // 45 — Organismes internationaux / Associés = variable
  if (c2 === '45') return 'les_deux';

  // 46 — Débiteurs et créditeurs divers = variable
  if (c2 === '46') return 'les_deux';

  // 47 — Comptes transitoires ou d'attente = variable
  if (c2 === '47') return 'les_deux';

  // 48 — Créances et dettes HAO = variable
  if (c2 === '48') return 'les_deux';

  // 49 — Dépréciations et risques provisionnés (Tiers) = créditeur
  if (c2 === '49') return 'crediteur';

  if (c.startsWith('4')) return 'les_deux';

  // ==================== CLASSE 5 — TRESORERIE ====================
  // Normalement débiteur (actif disponible)
  // 50 (Titres de placement) = débiteur
  // 51 (Valeurs à encaisser) = débiteur
  // 52 (Banques) = débiteur (avoir en banque)
  // 53 (Établissements financiers) = débiteur
  // 54 (Instruments de trésorerie) = les deux
  // 56 (Banques, crédits de trésorerie / découvert) = créditeur
  // 57 (Caisse) = débiteur
  // 58 (Régies d'avances et accréditifs) = débiteur
  // 59 (Dépréciations et risques provisionnés) = créditeur
  if (c2 === '56') return 'crediteur';
  if (c2 === '59') return 'crediteur';
  if (c2 === '54') return 'les_deux';
  if (c.startsWith('5')) return 'debiteur';

  // ==================== CLASSE 6 — CHARGES ====================
  // Normalement débiteur (consommations)
  // Sauf 603 (Variations des stocks de biens achetés) = variable
  // Sauf 659 (Charges provisionnées d'exploitation) = débiteur mais peut être ajusté
  if (c3 === '603') return 'les_deux';
  if (c.startsWith('6')) return 'debiteur';

  // ==================== CLASSE 7 — PRODUITS ====================
  // Normalement créditeur (ressources)
  // Sauf 73 (Variations des stocks de biens produits) = variable (débiteur si destockage)
  if (c2 === '73') return 'les_deux';
  if (c.startsWith('7')) return 'crediteur';

  // ==================== CLASSE 8 — HAO + IMPOTS ====================
  // Charges HAO = débiteur : 81, 83, 85, 87, 89
  // Produits HAO = créditeur : 82, 84, 86, 88
  if (c2 === '81' || c2 === '83' || c2 === '85' || c2 === '87' || c2 === '89') return 'debiteur';
  if (c2 === '82' || c2 === '84' || c2 === '86' || c2 === '88') return 'crediteur';
  if (c.startsWith('8')) return 'les_deux';

  // ==================== CLASSE 9 — ENGAGEMENTS HORS BILAN ====================
  if (c.startsWith('9')) return 'les_deux';

  return 'les_deux';
}

export function getLibelleSoldeAttendu(sa: SoldeAttendu): string {
  if (sa === 'debiteur') return 'Solde débiteur attendu';
  if (sa === 'crediteur') return 'Solde créditeur attendu';
  return 'Solde variable';
}

export function detectAnomalies(ligne: BalanceLigne): AnomalieCompte[] {
  const anomalies: AnomalieCompte[] = [];
  const sd = parseFloat(String(ligne.solde_debiteur)) || 0;
  const sc = parseFloat(String(ligne.solde_crediteur)) || 0;
  const soldeAttendu = getSoldeAttendu(ligne.numero_compte);

  // Solde inversé
  if (soldeAttendu === 'debiteur' && sc > 0.5 && sd < 0.5) {
    anomalies.push({
      type: 'solde_inverse',
      severity: 'error',
      message: 'Solde créditeur anormal — ce compte devrait avoir un solde débiteur',
    });
  }
  if (soldeAttendu === 'crediteur' && sd > 0.5 && sc < 0.5) {
    anomalies.push({
      type: 'solde_inverse',
      severity: 'error',
      message: 'Solde débiteur anormal — ce compte devrait avoir un solde créditeur',
    });
  }

  // Compte de gestion (6/7/8) avec solde initial = clôture N-1 incorrecte
  const siD = parseFloat(String(ligne.si_debit)) || 0;
  const siC = parseFloat(String(ligne.si_credit)) || 0;
  const c1 = ligne.numero_compte.charAt(0);
  if ((c1 === '6' || c1 === '7' || c1 === '8') && (siD > 0.5 || siC > 0.5)) {
    anomalies.push({
      type: 'solde_residuel',
      severity: 'warning',
      message: 'Compte de gestion avec solde initial — vérifier que l\'exercice précédent a été correctement clôturé',
    });
  }

  return anomalies;
}
