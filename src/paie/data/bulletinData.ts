// Donnees structure bulletin de paie Congo
import type { BulletinSection } from '../types/paie.types';

export const BULLETIN_SECTIONS: Record<string, BulletinSection> = {
  elements_brut: {
    label: 'Elements du brut',
    lignes: [
      { code: 'SAL_BASE', libelle: 'Salaire de base' },
      { code: 'PRIMES', libelle: 'Primes et indemnites' },
      { code: 'HEURES_SUP', libelle: 'Heures supplementaires' },
      { code: 'AVANTAGES', libelle: 'Avantages en nature' },
    ],
  },
  cotisations_salariales: {
    label: 'Cotisations salariales',
    lignes: [
      { code: 'CNSS_RET', libelle: 'CNSS - Pension vieillesse (PVID)', taux: '4,00%' },
      { code: 'CAMU', libelle: 'CAMU - Assurance maladie', taux: '2,27%' },
    ],
  },
  cotisations_patronales: {
    label: 'Cotisations patronales',
    lignes: [
      { code: 'CNSS_PF', libelle: 'CNSS - Prestations familiales', taux: '10,03%' },
      { code: 'CNSS_RET_P', libelle: 'CNSS - Pension vieillesse (PVID)', taux: '8,00%' },
      { code: 'CNSS_AT', libelle: 'CNSS - Risques professionnels', taux: '2,25%' },
      { code: 'FNC', libelle: 'CNSS - Fonds National de Credit', taux: '2,00%' },
      { code: 'CAMU_P', libelle: 'CAMU - Assurance maladie', taux: '4,55%' },
      { code: 'ACPE', libelle: 'ACPE / FONEA - Emploi', taux: '0,50%' },
    ],
  },
  fiscalite: {
    label: 'Fiscalite',
    lignes: [
      { code: 'ITS', libelle: 'ITS - Impot sur les Traitements et Salaires' },
      { code: 'TUS', libelle: 'TUS - Taxe Unique sur les Salaires (patronal)' },
    ],
  },
};

export const BULLETIN_TOGGLES: {
  vue_clarifiee: boolean;
  vue_detaillee: boolean;
  afficher_cotis_patronales: boolean;
  afficher_fiscalite: boolean;
} = {
  vue_clarifiee: true,
  vue_detaillee: false,
  afficher_cotis_patronales: false,
  afficher_fiscalite: true,
};

export default { BULLETIN_SECTIONS, BULLETIN_TOGGLES };
