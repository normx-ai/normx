// Catégories de saisie des éléments variables - Congo
import type { CategorieSaisie } from '../types/paie.types';

export const CATEGORIES_SAISIE: CategorieSaisie[] = [
  {
    id: 'primes',
    label: 'Primes et indemnités',
    elements: [
      { code: 'PRIME_ANCIENNETE', libelle: 'Prime d\'ancienneté', type: 'montant' },
      { code: 'PRIME_TRANSPORT', libelle: 'Indemnité de transport', type: 'montant' },
      { code: 'PRIME_LOGEMENT', libelle: 'Indemnité de logement', type: 'montant' },
      { code: 'PRIME_RESPONSABILITE', libelle: 'Prime de responsabilité', type: 'montant' },
      { code: 'PRIME_RENDEMENT', libelle: 'Prime de rendement', type: 'montant' },
      { code: 'PRIME_RISQUE', libelle: 'Prime de risque', type: 'montant' },
      { code: 'PRIME_SALISSURE', libelle: 'Prime de salissure', type: 'montant' },
      { code: 'PRIME_PANIER', libelle: 'Prime de panier', type: 'montant' },
      { code: 'GRATIFICATION', libelle: 'Gratification / 13e mois', type: 'montant' },
    ],
  },
  {
    id: 'heures',
    label: 'Heures',
    elements: [
      { code: 'HS_25', libelle: 'Heures supp. 25%', type: 'heures', taux_majoration: 25 },
      { code: 'HS_50', libelle: 'Heures supp. 50%', type: 'heures', taux_majoration: 50 },
      { code: 'HS_75', libelle: 'Heures supp. 75% (nuit)', type: 'heures', taux_majoration: 75 },
      { code: 'HS_100', libelle: 'Heures supp. 100% (dimanche/ferie)', type: 'heures', taux_majoration: 100 },
    ],
  },
  {
    id: 'absences',
    label: 'Absences et retenues',
    elements: [
      { code: 'ABS_INJUSTIFIEE', libelle: 'Absence injustifiée', type: 'jours' },
      { code: 'RETARD', libelle: 'Retard', type: 'heures' },
      { code: 'MISE_PIED', libelle: 'Mise à pied', type: 'jours' },
    ],
  },
  {
    id: 'avantages',
    label: 'Avantages en nature',
    elements: [
      { code: 'AVN_LOGEMENT', libelle: 'Avantage en nature logement', type: 'montant' },
      { code: 'AVN_VEHICULE', libelle: 'Avantage en nature véhicule', type: 'montant' },
      { code: 'AVN_NOURRITURE', libelle: 'Avantage en nature nourriture', type: 'montant' },
    ],
  },
];

export default CATEGORIES_SAISIE;
