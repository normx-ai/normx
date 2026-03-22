// ===================== ANALYSE INTELLIGENTE DE LA BALANCE GÉNÉRALE =====================
// Croise les comptes entre eux selon les règles SYSCOHADA révisé
// Détecte les mauvaises imputations et propose des corrections

import { BalanceLigne } from '../types';

// ==================== TYPES ====================

export interface AnomalieImputation {
  type: 'contrepartie_absente' | 'contrepartie_incorrecte' | 'incoherence_mouvements' | 'compte_mal_utilise';
  severity: 'error' | 'warning' | 'info';
  compteSource: string;
  libelleSource: string;
  compteTrouve?: string;
  libelleTrouve?: string;
  compteAttendu: string;
  libelleAttendu: string;
  montant?: number;
  message: string;
  suggestion?: {
    compteDebit: string;
    compteCredit: string;
    montant: number;
    libelle: string;
  };
}

// ==================== RÈGLES DE CONTREPARTIE SYSCOHADA ====================

interface RegleContropartie {
  // Comptes du bilan concernés (préfixe)
  compteBilan: string;
  libelleBilan: string;
  // Comptes de dotation attendus (préfixes)
  dotations: string[];
  libellesDotations: string[];
  // Comptes de reprise attendus (préfixes)
  reprises: string[];
  libellesReprises: string[];
  // Comptes souvent confondus (mauvaises imputations courantes)
  // usageLegitimeBilan : si ce préfixe bilan existe dans la balance, le compte confondu est légitime et ne doit pas être signalé
  confusions?: { compte: string; libelle: string; usageLegitimeBilan?: string }[];
  // Le mouvement sur le compte bilan qui déclenche la vérification
  // 'credit' = dotation (augmentation du passif/diminution de l'actif)
  // 'debit' = reprise (diminution du passif/augmentation de l'actif)
  sensDotation: 'credit' | 'debit';
}

const REGLES_CONTREPARTIES: RegleContropartie[] = [
  // ==================== CLASSE 1 ====================

  // 15x — Provisions réglementées
  {
    compteBilan: '15',
    libelleBilan: 'Provisions réglementées',
    dotations: ['851'],
    libellesDotations: ['Dotations aux provisions réglementées'],
    reprises: ['861'],
    libellesReprises: ['Reprises de provisions réglementées'],
    confusions: [
      // 852 n'est une confusion que si aucun amort HAO (pas de 28x qui justifierait un 852)
      { compte: '852', libelle: 'Dotations aux amortissements HAO', usageLegitimeBilan: '28' },
      { compte: '854', libelle: 'Dotations aux provisions pour risques HAO', usageLegitimeBilan: '19' },
      { compte: '862', libelle: 'Reprises d\'amortissements HAO', usageLegitimeBilan: '28' },
      { compte: '864', libelle: 'Reprises de provisions pour risques HAO', usageLegitimeBilan: '19' },
    ],
    sensDotation: 'credit',
  },

  // 14x — Subventions d'investissement
  {
    compteBilan: '14',
    libelleBilan: 'Subventions d\'investissement',
    dotations: [],
    libellesDotations: [],
    reprises: ['865'],
    libellesReprises: ['Reprises de subventions d\'investissement'],
    sensDotation: 'credit',
  },

  // 16x — Emprunts et dettes assimilées
  {
    compteBilan: '16',
    libelleBilan: 'Emprunts et dettes assimilées',
    dotations: [],
    libellesDotations: [],
    reprises: [],
    libellesReprises: [],
    sensDotation: 'credit',
  },

  // 19x — Provisions pour risques et charges
  {
    compteBilan: '19',
    libelleBilan: 'Provisions pour risques et charges',
    dotations: ['6911', '6971', '854'],
    libellesDotations: [
      'Dotations aux provisions pour risques d\'exploitation',
      'Dotations aux provisions pour risques financiers',
      'Dotations aux provisions pour risques HAO',
    ],
    reprises: ['7911', '7971', '864'],
    libellesReprises: [
      'Reprises de provisions pour risques d\'exploitation',
      'Reprises de provisions pour risques financiers',
      'Reprises de provisions pour risques HAO',
    ],
    sensDotation: 'credit',
  },

  // ==================== CLASSE 2 ====================
  // Les comptes d'actif (20x-27x) n'ont pas de contrepartie dotation/reprise directe.
  // Les mouvements sur ces comptes = acquisitions/cessions, pas des dotations.
  // Les règles de dotation/reprise concernent les 28x, 29x (amortissements/dépréciations).

  // 28x — Amortissements des immobilisations
  {
    compteBilan: '28',
    libelleBilan: 'Amortissements',
    dotations: ['6812', '6813', '681'],
    libellesDotations: [
      'Dotations aux amortissements des immo incorporelles',
      'Dotations aux amortissements des immo corporelles',
      'Dotations aux amortissements d\'exploitation',
    ],
    reprises: ['798'],
    libellesReprises: ['Reprises d\'amortissements'],
    sensDotation: 'credit',
  },

  // 29x — Dépréciations des immobilisations
  {
    compteBilan: '29',
    libelleBilan: 'Dépréciations des immobilisations',
    dotations: ['6913', '6914', '6972'],
    libellesDotations: [
      'Dotations aux dépréciations des immo incorporelles',
      'Dotations aux dépréciations des immo corporelles',
      'Dotations aux dépréciations des immo financières',
    ],
    reprises: ['7913', '7914', '7972'],
    libellesReprises: [
      'Reprises de dépréciations des immo incorporelles',
      'Reprises de dépréciations des immo corporelles',
      'Reprises de dépréciations des immo financières',
    ],
    sensDotation: 'credit',
  },

  // ==================== CLASSE 3 ====================
  // Les comptes de stocks (31x-38x) sont des comptes d'actif.
  // Leurs mouvements = entrées/sorties de stock, pas des dotations/reprises.
  // La cohérence stocks ↔ variations (603x/73x) est vérifiée dans REGLES_COHERENCE.

  // 39x — Dépréciations des stocks
  {
    compteBilan: '39',
    libelleBilan: 'Dépréciations des stocks',
    dotations: ['6915'],
    libellesDotations: ['Dotations aux dépréciations des stocks'],
    reprises: ['7915'],
    libellesReprises: ['Reprises de dépréciations des stocks'],
    sensDotation: 'credit',
  },

  // ==================== CLASSE 4 ====================
  // Les comptes de tiers (40x-44x) sont des comptes courants.
  // Leurs mouvements = opérations courantes, pas des dotations/reprises.
  // La cohérence tiers ↔ charges/produits est vérifiée dans REGLES_COHERENCE.

  // 49x — Dépréciations des comptes de tiers
  {
    compteBilan: '49',
    libelleBilan: 'Dépréciations des comptes de tiers',
    dotations: ['6594', '6599'],
    libellesDotations: [
      'Charges provisionnées — dépréciations des créances',
      'Charges provisionnées — risques provisionnés',
    ],
    reprises: ['7594', '7599'],
    libellesReprises: [
      'Reprises de charges provisionnées — dépréciations',
      'Reprises de charges provisionnées — risques',
    ],
    sensDotation: 'credit',
  },

  // ==================== CLASSE 5 ====================
  // Le compte 50x (titres de placement) est un compte d'actif.
  // Les mouvements = acquisitions/cessions, pas des dotations.
  // La cohérence dépréciations ↔ charges est vérifiée via 59x.

  // 59x — Dépréciations des comptes de trésorerie
  {
    compteBilan: '59',
    libelleBilan: 'Dépréciations des comptes de trésorerie',
    dotations: ['679'],
    libellesDotations: ['Charges provisionnées financières'],
    reprises: ['779'],
    libellesReprises: ['Reprises de charges provisionnées financières'],
    sensDotation: 'credit',
  },
];

// ==================== RÈGLES DE COHÉRENCE INTER-COMPTES ====================

interface RegleCoherence {
  // Si ce groupe de comptes existe avec des mouvements...
  siCompte: string;
  libelleCompte: string;
  // ...alors ce groupe devrait aussi exister
  alorsCompte: string;
  libelleAttendu: string;
  message: string;
  severity: 'warning' | 'info';
}

const REGLES_COHERENCE: RegleCoherence[] = [
  // Amortissements ↔ Dotations
  { siCompte: '28', libelleCompte: 'Amortissements', alorsCompte: '681', libelleAttendu: 'Dotations aux amortissements', message: 'Les amortissements (28x) ont des mouvements mais aucune dotation aux amortissements (681x) n\'est constatée', severity: 'warning' },

  // Provisions réglementées ↔ Dotations HAO
  { siCompte: '15', libelleCompte: 'Provisions réglementées', alorsCompte: '851', libelleAttendu: 'Dotations aux provisions réglementées', message: 'Les provisions réglementées (15x) varient mais le compte 851 (Dotations HAO prov. régl.) est absent', severity: 'warning' },

  // Provisions risques ↔ Dotations
  { siCompte: '19', libelleCompte: 'Provisions pour risques', alorsCompte: '691', libelleAttendu: 'Dotations aux provisions d\'exploitation', message: 'Les provisions pour risques (19x) varient mais aucune dotation (691x) n\'est constatée', severity: 'warning' },

  // Dépréciations stocks ↔ Dotations
  { siCompte: '39', libelleCompte: 'Dépréciations des stocks', alorsCompte: '6915', libelleAttendu: 'Dotations aux dépréciations des stocks', message: 'Les dépréciations de stocks (39x) varient mais aucune dotation (6915) n\'est constatée', severity: 'warning' },

  // Dépréciations tiers ↔ Charges provisionnées
  { siCompte: '49', libelleCompte: 'Dépréciations des tiers', alorsCompte: '659', libelleAttendu: 'Charges provisionnées d\'exploitation', message: 'Les dépréciations de tiers (49x) varient mais aucune charge provisionnée (659x) n\'est constatée', severity: 'warning' },

  // Dépréciations immo ↔ Dotations
  { siCompte: '29', libelleCompte: 'Dépréciations des immobilisations', alorsCompte: '691', libelleAttendu: 'Dotations aux dépréciations', message: 'Les dépréciations d\'immobilisations (29x) varient mais aucune dotation correspondante n\'est constatée', severity: 'warning' },

  // Personnel ↔ Charges de personnel
  { siCompte: '42', libelleCompte: 'Personnel — dettes', alorsCompte: '66', libelleAttendu: 'Charges de personnel', message: 'Des dettes envers le personnel (42x) existent mais aucune charge de personnel (66x) n\'est constatée', severity: 'warning' },

  // Organismes sociaux ↔ Charges sociales
  { siCompte: '43', libelleCompte: 'Organismes sociaux', alorsCompte: '664', libelleAttendu: 'Charges sociales', message: 'Des dettes sociales (43x) existent mais aucune charge sociale (664x) n\'est constatée', severity: 'warning' },

  // Emprunts ↔ Intérêts
  { siCompte: '16', libelleCompte: 'Emprunts', alorsCompte: '671', libelleAttendu: 'Intérêts des emprunts', message: 'Des emprunts (16x) existent mais aucun intérêt (671x) n\'est constaté — vérifier', severity: 'info' },

  // Subventions ↔ Reprises
  { siCompte: '14', libelleCompte: 'Subventions d\'investissement', alorsCompte: '865', libelleAttendu: 'Reprises de subventions d\'investissement', message: 'Des subventions d\'investissement (14x) existent mais aucune reprise (865) n\'est constatée — vérifier la quote-part à reprendre', severity: 'info' },

  // Clients ↔ Ventes
  { siCompte: '41', libelleCompte: 'Clients', alorsCompte: '70', libelleAttendu: 'Ventes', message: 'Des créances clients (41x) existent mais aucune vente (70x) n\'est constatée', severity: 'warning' },

  // Fournisseurs ↔ Achats
  { siCompte: '40', libelleCompte: 'Fournisseurs', alorsCompte: '60', libelleAttendu: 'Achats', message: 'Des dettes fournisseurs (40x) existent mais aucun achat (60x-62x) n\'est constaté', severity: 'warning' },

  // Stocks ↔ Variation de stocks
  { siCompte: '31', libelleCompte: 'Stocks de marchandises', alorsCompte: '6031', libelleAttendu: 'Variation des stocks de marchandises', message: 'Des stocks de marchandises (31x) varient mais aucune variation de stocks (6031) n\'est constatée', severity: 'warning' },

  // TVA collectée ↔ Ventes
  { siCompte: '443', libelleCompte: 'TVA facturée', alorsCompte: '70', libelleAttendu: 'Ventes', message: 'De la TVA collectée (443) existe mais aucune vente (70x) n\'est constatée', severity: 'warning' },

  // TVA déductible ↔ Achats
  { siCompte: '445', libelleCompte: 'TVA récupérable', alorsCompte: '60', libelleAttendu: 'Achats', message: 'De la TVA déductible (445) existe mais aucun achat (60x) n\'est constaté', severity: 'warning' },

  // IS ↔ Résultat
  { siCompte: '441', libelleCompte: 'État, impôt sur les bénéfices', alorsCompte: '891', libelleAttendu: 'Impôts sur les bénéfices', message: 'Une dette d\'IS (441) existe mais aucune charge d\'IS (891) n\'est constatée', severity: 'warning' },

  // Dépréciations trésorerie ↔ Charges
  { siCompte: '59', libelleCompte: 'Dépréciations de trésorerie', alorsCompte: '679', libelleAttendu: 'Charges provisionnées financières', message: 'Les dépréciations de trésorerie (59x) varient mais aucune charge provisionnée financière (679) n\'est constatée', severity: 'warning' },

  // Crédit-bail ↔ Redevances
  { siCompte: '17', libelleCompte: 'Dettes de crédit-bail', alorsCompte: '623', libelleAttendu: 'Redevances de crédit-bail', message: 'Des dettes de crédit-bail (17x) existent mais aucune redevance (623x) n\'est constatée', severity: 'info' },
];

// ==================== MOTEUR D'ANALYSE ====================

function hasCompteWithMovement(lignes: BalanceLigne[], prefix: string): boolean {
  return lignes.some(l => {
    if (!l.numero_compte.startsWith(prefix)) return false;
    const mvtD = parseFloat(String(l.debit)) || 0;
    const mvtC = parseFloat(String(l.credit)) || 0;
    return mvtD > 0.5 || mvtC > 0.5;
  });
}

function hasCompte(lignes: BalanceLigne[], prefix: string): boolean {
  return lignes.some(l => l.numero_compte.startsWith(prefix));
}

function getComptes(lignes: BalanceLigne[], prefix: string): BalanceLigne[] {
  return lignes.filter(l => l.numero_compte.startsWith(prefix));
}

function totalMouvement(lignes: BalanceLigne[], prefix: string, sens: 'debit' | 'credit'): number {
  return lignes
    .filter(l => l.numero_compte.startsWith(prefix))
    .reduce((s, l) => s + (parseFloat(String(sens === 'debit' ? l.debit : l.credit)) || 0), 0);
}

function totalSolde(lignes: BalanceLigne[], prefix: string, sens: 'debiteur' | 'crediteur'): number {
  return lignes
    .filter(l => l.numero_compte.startsWith(prefix))
    .reduce((s, l) => s + (parseFloat(String(sens === 'debiteur' ? l.solde_debiteur : l.solde_crediteur)) || 0), 0);
}

export function analyserBalance(lignes: BalanceLigne[]): AnomalieImputation[] {
  const anomalies: AnomalieImputation[] = [];

  // ==================== 1. Vérification des contreparties ====================
  for (const regle of REGLES_CONTREPARTIES) {
    const comptesBilan = getComptes(lignes, regle.compteBilan);
    if (comptesBilan.length === 0) continue;

    // Vérifier s'il y a des mouvements sur les comptes du bilan
    const hasMvt = comptesBilan.some(l => {
      const mvtD = parseFloat(String(l.debit)) || 0;
      const mvtC = parseFloat(String(l.credit)) || 0;
      return mvtD > 0.5 || mvtC > 0.5;
    });
    if (!hasMvt) continue;

    // Calculer le mouvement total côté dotation
    const mvtDotation = comptesBilan.reduce((s, l) => {
      return s + (parseFloat(String(regle.sensDotation === 'credit' ? l.credit : l.debit)) || 0);
    }, 0);
    const mvtReprise = comptesBilan.reduce((s, l) => {
      return s + (parseFloat(String(regle.sensDotation === 'credit' ? l.debit : l.credit)) || 0);
    }, 0);

    // Vérifier les dotations attendues
    if (mvtDotation > 0.5 && regle.dotations.length > 0) {
      const dotationTrouvee = regle.dotations.some(d => hasCompte(lignes, d));

      if (!dotationTrouvee) {
        // Chercher s'il y a une confusion avec un autre compte
        // Un compte confondu n'est signalé que si son usage légitime (son propre poste bilan) n'existe pas
        const confusionTrouvee = regle.confusions?.find(c => {
          if (!hasCompteWithMovement(lignes, c.compte)) return false;
          // Si le compte a un usage légitime et que ce poste bilan existe, ce n'est pas une confusion
          if (c.usageLegitimeBilan && hasCompte(lignes, c.usageLegitimeBilan)) return false;
          return true;
        });

        if (confusionTrouvee) {
          const montantConfusion = totalSolde(lignes, confusionTrouvee.compte, 'debiteur');
          anomalies.push({
            type: 'contrepartie_incorrecte',
            severity: 'error',
            compteSource: regle.compteBilan + 'x',
            libelleSource: regle.libelleBilan,
            compteTrouve: confusionTrouvee.compte,
            libelleTrouve: confusionTrouvee.libelle,
            compteAttendu: regle.dotations[0],
            libelleAttendu: regle.libellesDotations[0],
            montant: montantConfusion,
            message: `Le compte ${confusionTrouvee.compte} (${confusionTrouvee.libelle}) semble utilisé à la place du ${regle.dotations[0]} (${regle.libellesDotations[0]}) pour les ${regle.libelleBilan}`,
            suggestion: montantConfusion > 0 ? {
              compteDebit: regle.dotations[0],
              compteCredit: confusionTrouvee.compte,
              montant: montantConfusion,
              libelle: `Reclassement : ${confusionTrouvee.compte} → ${regle.dotations[0]} (${regle.libellesDotations[0]})`,
            } : undefined,
          });
        } else {
          anomalies.push({
            type: 'contrepartie_absente',
            severity: 'warning',
            compteSource: regle.compteBilan + 'x',
            libelleSource: regle.libelleBilan,
            compteAttendu: regle.dotations.join(' / '),
            libelleAttendu: regle.libellesDotations.join(' / '),
            montant: mvtDotation,
            message: `Les ${regle.libelleBilan} (${regle.compteBilan}x) ont un mouvement ${regle.sensDotation} mais aucun compte de dotation (${regle.dotations.join('/')}) n'est présent dans la balance`,
          });
        }
      }
    }

    // Vérifier les reprises attendues
    if (mvtReprise > 0.5 && regle.reprises.length > 0) {
      const repriseTrouvee = regle.reprises.some(r => hasCompte(lignes, r));

      if (!repriseTrouvee) {
        const confusionReprise = regle.confusions?.find(c => {
          // Chercher parmi les confusions celles qui sont des reprises (86x, 79x, 78x)
          const p1 = c.compte.charAt(0);
          if (!((p1 === '7' || p1 === '8') && hasCompteWithMovement(lignes, c.compte))) return false;
          if (c.usageLegitimeBilan && hasCompte(lignes, c.usageLegitimeBilan)) return false;
          return true;
        });

        if (confusionReprise) {
          const montantConfusion = totalSolde(lignes, confusionReprise.compte, 'crediteur');
          anomalies.push({
            type: 'contrepartie_incorrecte',
            severity: 'error',
            compteSource: regle.compteBilan + 'x',
            libelleSource: regle.libelleBilan,
            compteTrouve: confusionReprise.compte,
            libelleTrouve: confusionReprise.libelle,
            compteAttendu: regle.reprises[0],
            libelleAttendu: regle.libellesReprises[0],
            montant: montantConfusion,
            message: `Le compte ${confusionReprise.compte} (${confusionReprise.libelle}) semble utilisé à la place du ${regle.reprises[0]} (${regle.libellesReprises[0]}) pour les ${regle.libelleBilan}`,
            suggestion: montantConfusion > 0 ? {
              compteDebit: confusionReprise.compte,
              compteCredit: regle.reprises[0],
              montant: montantConfusion,
              libelle: `Reclassement : ${confusionReprise.compte} → ${regle.reprises[0]} (${regle.libellesReprises[0]})`,
            } : undefined,
          });
        } else {
          anomalies.push({
            type: 'contrepartie_absente',
            severity: 'warning',
            compteSource: regle.compteBilan + 'x',
            libelleSource: regle.libelleBilan,
            compteAttendu: regle.reprises.join(' / '),
            libelleAttendu: regle.libellesReprises.join(' / '),
            montant: mvtReprise,
            message: `Les ${regle.libelleBilan} (${regle.compteBilan}x) ont un mouvement ${regle.sensDotation === 'credit' ? 'débit' : 'crédit'} mais aucun compte de reprise (${regle.reprises.join('/')}) n'est présent dans la balance`,
          });
        }
      }
    }
  }

  // ==================== 2. Vérification de cohérence inter-comptes ====================
  for (const regle of REGLES_COHERENCE) {
    if (!hasCompteWithMovement(lignes, regle.siCompte)) continue;
    if (hasCompte(lignes, regle.alorsCompte)) continue;

    anomalies.push({
      type: 'incoherence_mouvements',
      severity: regle.severity,
      compteSource: regle.siCompte + 'x',
      libelleSource: regle.libelleCompte,
      compteAttendu: regle.alorsCompte,
      libelleAttendu: regle.libelleAttendu,
      message: regle.message,
    });
  }

  return anomalies;
}
