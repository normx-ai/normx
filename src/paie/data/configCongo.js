// Configuration unique Congo-Brazzaville pour le wizard établissement

const CONFIG_CONGO = {
  organismes: [
    {
      key: 'cnss', label: 'CNSS (Caisse Nationale de Sécurité Sociale)',
      description: 'Sécurité sociale obligatoire',
      champs: [
        { id: 'cnss_numero', label: 'N° employeur CNSS', placeholder: 'Ex: 123456', required: true },
        { id: 'cnss_centre', label: 'Centre CNSS', placeholder: 'Brazzaville / Pointe-Noire' },
        { id: 'cnss_date_affiliation', label: 'Date d\'affiliation', type: 'date' },
      ],
      taux: [
        { label: 'PVID - Salarial', valeur: '4,00%', plafond: '1 200 000' },
        { label: 'PVID - Patronal', valeur: '8,00%', plafond: '1 200 000' },
        { label: 'AF - Patronal', valeur: '10,03%', plafond: '600 000' },
        { label: 'AT - Patronal', valeur: '2,25%', plafond: '600 000' },
      ],
    },
    {
      key: 'camu', label: 'CAMU (Assurance Maladie Universelle)',
      description: 'CAMU - 0,5% salarial sur fraction > 500 000 FCFA',
      champs: [
        { id: 'camu_numero', label: 'N° CAMU', placeholder: 'Numéro CAMU' },
        { id: 'camu_date', label: 'Date d\'affiliation', type: 'date' },
      ],
      taux: [
        { label: 'CAMU - Salarial', valeur: '0,50%', plafond: '> 500 000' },
      ],
    },
    {
      key: 'impots', label: 'Direction Générale des Impôts (DGI)',
      description: 'ITS, TUS, TOL, Taxe régionale',
      champs: [
        { id: 'nui', label: 'NUI (Numéro Unique d\'Identification)', source: 'nui', readOnly: true },
        { id: 'centre_impots', label: 'Centre des impôts (Art. 129)', type: 'select', options: ['UPE (Petites Entreprises - CA < 100M)', 'UME (Moyennes Entreprises - CA 100M à 2 Mds)', 'UGE (Grandes Entreprises - CA >= 2 Mds)'] },
        { id: 'regime_fiscal', label: 'Régime fiscal', type: 'select', options: ['Réel normal', 'Réel simplifié', 'Forfaitaire', 'Impôt Global Forfaitaire (IGF)'] },
      ],
      taux: [
        { label: 'ITS - Salarial', valeur: 'Barème progressif', plafond: '-' },
        { label: 'TUS - Patronal (résident)', valeur: '7,50%', plafond: 'Sans' },
        { label: 'TUS - Patronal (non-résident)', valeur: '6,00%', plafond: 'Sans' },
        { label: 'TOL - Centre-ville', valeur: '5 000 FCFA/mois', plafond: '-' },
        { label: 'TOL - Périphérie', valeur: '1 000 FCFA/mois', plafond: '-' },
        { label: 'Taxe régionale', valeur: '2 400 FCFA/an', plafond: 'Janvier' },
      ],
    },
  ],
  parametresSections: [
    { key: 'planning', label: 'Planning hebdomadaire', component: 'PlanningSection' },
    { key: 'paiement', label: 'Paiement', component: 'PaiementSection' },
  ],
  tauxSections: [
    { key: 'taux_cnss', label: 'Taux CNSS', type: 'table_fixe',
      lignes: [
        { element: 'PVID - Salarial', valeur: '4.00', unite: '%', plafond: '1 200 000' },
        { element: 'PVID - Patronal', valeur: '8.00', unite: '%', plafond: '1 200 000' },
        { element: 'AF - Patronal', valeur: '10.03', unite: '%', plafond: '600 000' },
        { element: 'AT - Patronal', valeur: '2.25', unite: '%', plafond: '600 000' },
      ] },
    { key: 'taux_camu', label: 'Taux CAMU (CAMU)', type: 'table_fixe',
      lignes: [
        { element: 'CAMU - Salarial', valeur: '0.50', unite: '%', plafond: '> 500 000' },
      ] },
    { key: 'taux_fiscal', label: 'Taxes (DGI)', type: 'table_fixe',
      lignes: [
        { element: 'ITS - Salarial', valeur: 'Barème', unite: 'progressif' },
        { element: 'TUS - IMPOT (part DGI)', valeur: '1.50', unite: '% (20% de 7,5%)' },
        { element: 'TUS - CNSS (part organismes)', valeur: '6.00', unite: '% (80% de 7,5%)' },
        { element: 'TUS - Total', valeur: '7.50', unite: '%' },
        { element: 'TUS - Non-résident', valeur: '6.00', unite: '%' },
        { element: 'TUS - Pétrolier', valeur: '2.50', unite: '%' },
        { element: 'TOL - Centre-ville', valeur: '5 000', unite: 'FCFA/mois' },
        { element: 'TOL - Périphérie', valeur: '1 000', unite: 'FCFA/mois' },
        { element: 'Taxe régionale', valeur: '2 400', unite: 'FCFA/an (janv.)' },
      ] },
  ],
  planningDefaults: { heuresJour: '8', heuresSemaine: 40, heuresMois: 173.33 },
  steps: ['identite', 'adresse', 'banques', 'contacts', 'organismes', 'param_organismes', 'taux', 'parametres', 'retraite', 'specificites'],
  identifiantLabel: 'NUI',
  identifiantPlaceholder: 'Numéro Unique d\'Identification',
};

export default CONFIG_CONGO;
