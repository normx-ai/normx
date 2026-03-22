/**
 * Organismes sociaux et fiscaux - Congo-Brazzaville
 * Référence : CGI 2026, Code de Sécurité Sociale, TFNC4
 */

const ORGANISMES = {
  cnss: {
    code: 'CNSS',
    nom: 'Caisse Nationale de Sécurité Sociale',
    sigle: 'CNSS',
    type: 'securite_sociale',
    branches: {
      af: {
        code: 'AF',
        nom: 'Allocations Familiales',
        description: 'Allocations familiales',
        taux_patronal: 10.03,
        taux_salarial: 0,
        plafond: 600000,
      },
      pvid: {
        code: 'PVID',
        nom: 'Pension Vieillesse, Invalidité, Décès',
        description: 'Assurance vieillesse, invalidité et décès',
        taux_patronal: 8.00,
        taux_salarial: 4.00,
        plafond: 1200000,
      },
      at: {
        code: 'AT',
        nom: 'Accidents du Travail',
        description: 'Accidents du travail et maladies professionnelles',
        taux_patronal: 2.25,
        taux_salarial: 0,
        plafond: null, // Pas de plafond
        note: 'Taux variable selon le secteur d\'activité (1% à 5%)',
      },
      fnc: {
        code: 'FNC',
        nom: 'Fonds National de Chômage',
        description: 'Contribution au fonds national contre le chômage',
        taux_patronal: 0,
        taux_salarial: 0,
        note: 'Non encore opérationnel au Congo-Brazzaville',
      },
    },
    totaux: {
      taux_patronal_total: 20.28, // 8 + 10.03 + 2.25
      taux_salarial_total: 4.00,
    },
  },

  camu: {
    code: 'CAMU',
    nom: 'Caisse d\'Assurance Maladie Universelle',
    sigle: 'CAMU',
    type: 'assurance_maladie',
    branches: {
      camu: {
        code: 'CAMU',
        nom: 'Caisse d\'Assurance Maladie Universelle',
        description: '0,5% salarial sur fraction > 500 000 FCFA (Art. 3-4 TFNC4-CAMU)',
        taux_salarial: 0.5,
        taux_patronal: 0,
        seuil: 500000,
        note: '0,5% sur la fraction du salaire brut (après CNSS) supérieure à 500 000 FCFA',
      },
    },
  },

  // ACPE et FONEA : pas de cotisation directe
  // Financés par redistribution de la TUS (voir tus.repartition)
  // ACPE = 10% de la TUS | FONEA = 23% de la TUS

  direction_impots: {
    code: 'DGI',
    nom: 'Direction Générale des Impôts',
    sigle: 'DGI',
    type: 'fiscal',
    impots: {
      its: {
        code: 'ITS',
        nom: 'Impôt sur les Traitements et Salaires',
        description: 'Barème progressif annuel (Art. 116 CGI)',
        type_prelevement: 'salarial',
        bareme: [
          { min: 0, max: 615000, taux: 0, forfait: 1200 },
          { min: 615000, max: 1500000, taux: 10 },
          { min: 1500000, max: 3500000, taux: 15 },
          { min: 3500000, max: 5000000, taux: 20 },
          { min: 5000000, max: null, taux: 30 },
        ],
        frais_professionnels: 20,
        taux_non_resident: 20,
      },
      tus: {
        code: 'TUS',
        nom: 'Taxe Unique sur les Salaires',
        description: 'Charge patronale (Art. 6 TFNC4-TUS)',
        type_prelevement: 'patronal',
        taux_resident: 7.5,
        taux_non_resident: 6.0,
        repartition: {
          etat: 27,
          figa: 10,
          fonea: 23,
          acpe: 10,
          fnh: 5,
          fds: 5,
          camu: 5,
          autres: 15,
        },
        note: 'La TUS finance plusieurs organismes par redistribution',
      },
      tol: {
        code: 'TOL',
        nom: 'Taxe d\'Occupation des Locaux',
        description: 'Taxe mensuelle selon la zone',
        type_prelevement: 'salarial',
        centre_ville: 5000,
        peripherie: 1000,
      },
      taxe_regionale: {
        code: 'TR',
        nom: 'Taxe Régionale',
        description: 'Taxe annuelle prélevée en janvier',
        type_prelevement: 'salarial',
        montant_annuel: 2400,
        mois_prelevement: 'janvier',
      },
    },
  },
};

/**
 * Résumé des cotisations par organisme pour affichage
 */
export function getResumeOrganismes() {
  return [
    {
      organisme: 'CNSS',
      nom: ORGANISMES.cnss.nom,
      lignes: [
        { label: 'PVID (Pension Vieillesse)', patronal: '8,00%', salarial: '4,00%', plafond: '1 200 000' },
        { label: 'AF (Allocations Familiales)', patronal: '10,03%', salarial: '-', plafond: '600 000' },
        { label: 'AT (Accidents du Travail)', patronal: '2,25%', salarial: '-', plafond: '600 000' },
      ],
    },
    {
      organisme: 'CAMU',
      nom: ORGANISMES.camu.nom,
      lignes: [
        { label: 'CAMU', patronal: '-', salarial: '0,50%', plafond: '> 500 000' },
      ],
    },
    {
      organisme: 'DGI',
      nom: ORGANISMES.direction_impots.nom,
      lignes: [
        { label: 'ITS (barème progressif)', patronal: '-', salarial: 'Barème', plafond: '-' },
        { label: 'TUS - IMPOT (part DGI)', patronal: '1,50%', salarial: '-', plafond: 'Sans' },
        { label: 'TUS - CNSS (part organismes)', patronal: '6,00%', salarial: '-', plafond: 'Sans' },
        { label: 'TOL', patronal: '-', salarial: '5 000 / 1 000', plafond: '-' },
        { label: 'Taxe Régionale', patronal: '-', salarial: '2 400/an', plafond: '-' },
      ],
    },
    // ACPE et FONEA : pas de cotisation directe, financés via TUS
  ];
}

/**
 * Liste des organismes pour les déclarations
 */
export function getOrganismesDeclarations() {
  return [
    {
      code: 'CNSS',
      nom: 'CNSS - Caisse Nationale de Sécurité Sociale',
      declarations: ['DNS (Déclaration Nominative des Salaires)', 'DISA (Déclaration Individuelle des Salaires Annuels)'],
      periodicite: 'Mensuelle (DNS) / Annuelle (DISA)',
      echeance: 'Avant le 15 du mois suivant',
    },
    {
      code: 'CAMU',
      nom: 'CAMU - Assurance Maladie Universelle',
      declarations: ['Déclaration CAMU'],
      periodicite: 'Mensuelle',
      echeance: 'Avant le 15 du mois suivant',
    },
    {
      code: 'DGI',
      nom: 'DGI - Direction Générale des Impôts',
      declarations: ['ITS mensuel', 'TUS mensuel', 'Déclaration annuelle des salaires (DAS)'],
      periodicite: 'Mensuelle / Annuelle',
      echeance: 'Avant le 15 du mois suivant',
    },
    // ACPE : déclaration mouvement personnel gérée hors paie
  ];
}

export default ORGANISMES;
