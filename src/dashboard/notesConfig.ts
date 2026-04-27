/**
 * Configuration des notes annexes SYSCOHADA :
 * - NOTES_ANNEXES : metadonnees (id, titre, description)
 * - NOTE_ACCOUNT_MAP : prefixes de comptes qui rendent la note pertinente
 * - ALWAYS_VISIBLE_NOTES : toujours affichees (informations obligatoires)
 * - MANUAL_NOTE_PARAMS : notes manuelles, visibles si l'utilisateur a saisi des donnees
 * - IMPLEMENTED_ETATS : liste des etats financiers ayant un rendu dedie
 */

export interface NoteAnnexe {
  id: string;
  titre: string;
  desc: string;
}

export const NOTES_ANNEXES: NoteAnnexe[] = [
  { id: 'note_1_sys', titre: 'Note 1', desc: 'Dettes garanties par des sûretés réelles' },
  { id: 'note_2_sys', titre: 'Note 2', desc: 'Informations obligatoires' },
  { id: 'note_3a_sys', titre: 'Note 3A', desc: 'Immobilisation brute' },
  { id: 'note_3b_sys', titre: 'Note 3B', desc: 'Biens pris en location-acquisition' },
  { id: 'note_3c_sys', titre: 'Note 3C', desc: 'Immobilisations : Amortissements' },
  { id: 'note_3d_sys', titre: 'Note 3D', desc: 'Plus-values et moins-values de cession' },
  { id: 'note_3e_sys', titre: 'Note 3E', desc: 'Réévaluations effectuées' },
  { id: 'note_3f_sys', titre: 'Note 3F', desc: 'Charges immobilisées' },
  { id: 'note_4_sys', titre: 'Note 4', desc: 'Immobilisations financières' },
  { id: 'note_5_sys', titre: 'Note 5', desc: 'Actif circulant HAO et Dettes circulantes HAO' },
  { id: 'note_6_sys', titre: 'Note 6', desc: 'Stocks et en cours' },
  { id: 'note_7_sys', titre: 'Note 7', desc: 'Clients' },
  { id: 'note_8_sys', titre: 'Note 8', desc: 'Autres créances' },
  { id: 'note_8a_sys', titre: 'Note 8A', desc: 'Étalement des charges immobilisées' },
  { id: 'note_9_sys', titre: 'Note 9', desc: 'Titres de placement' },
  { id: 'note_10_sys', titre: 'Note 10', desc: 'Valeurs à encaisser' },
  { id: 'note_11_sys', titre: 'Note 11', desc: 'Disponibilités' },
  { id: 'note_12_sys', titre: 'Note 12', desc: 'Écarts de conversion et Transferts de charges' },
  { id: 'note_13_sys', titre: 'Note 13', desc: 'Capital' },
  { id: 'note_14_sys', titre: 'Note 14', desc: 'Primes et réserves' },
  { id: 'note_15a_sys', titre: 'Note 15A', desc: 'Subventions et provisions réglementées' },
  { id: 'note_15b_sys', titre: 'Note 15B', desc: 'Autres fonds propres' },
  { id: 'note_16a_sys', titre: 'Note 16A', desc: 'Dettes financières et ressources assimilées' },
  { id: 'note_16b_sys', titre: 'Note 16B', desc: 'Engagements de retraite et avantages assimilés' },
  { id: 'note_16c_sys', titre: 'Note 16C', desc: 'Actifs et passifs éventuels' },
  { id: 'note_17_sys', titre: 'Note 17', desc: "Fournisseurs d'exploitation" },
  { id: 'note_18_sys', titre: 'Note 18', desc: 'Dettes fiscales et sociales' },
  { id: 'note_19_sys', titre: 'Note 19', desc: 'Autres dettes et provisions pour risques à court terme' },
  { id: 'note_20_sys', titre: 'Note 20', desc: "Banques, crédit d'escompte et de trésorerie" },
  { id: 'note_21_sys', titre: 'Note 21', desc: "Chiffre d'affaires et autres produits" },
  { id: 'note_22_sys', titre: 'Note 22', desc: 'Achats' },
  { id: 'note_23_sys', titre: 'Note 23', desc: 'Transports' },
  { id: 'note_24_sys', titre: 'Note 24', desc: 'Services extérieurs' },
  { id: 'note_25_sys', titre: 'Note 25', desc: 'Impôts et taxes' },
  { id: 'note_26_sys', titre: 'Note 26', desc: 'Autres charges' },
  { id: 'note_27a_sys', titre: 'Note 27A', desc: 'Charges de personnel' },
  { id: 'note_27b_sys', titre: 'Note 27B', desc: 'Effectifs, masse salariale et personnel extérieur' },
  { id: 'note_28_sys', titre: 'Note 28', desc: 'Provisions et dépréciations inscrites au bilan' },
  { id: 'note_29_sys', titre: 'Note 29', desc: 'Charges et revenus financiers' },
  { id: 'note_30_sys', titre: 'Note 30', desc: 'Autres charges et produits HAO' },
  { id: 'note_31_sys', titre: 'Note 31', desc: 'Répartition du résultat des cinq derniers exercices' },
  { id: 'note_32_sys', titre: 'Note 32', desc: "Production de l'exercice" },
  { id: 'note_33_sys', titre: 'Note 33', desc: 'Achats destinés à la production' },
  { id: 'note_34_sys', titre: 'Note 34', desc: 'Fiche de synthèse des principaux indicateurs financiers' },
  { id: 'note_35_sys', titre: 'Note 35', desc: 'Informations sociales, environnementales et sociétales' },
  { id: 'note_36_sys', titre: 'Note 36', desc: 'Table des codes' },
  { id: 'note_37_sys', titre: 'Note 37', desc: 'Détermination impôts sur le résultat' },
];

export const NOTE_ACCOUNT_MAP: Record<string, string[]> = {
  note_1_sys: ['16', '17'],
  note_2_sys: [],
  note_3a_sys: ['21', '22', '23', '24', '25'],
  note_3b_sys: ['17'],
  note_3c_sys: ['28'],
  note_3d_sys: ['81', '82', '654', '754'],
  note_3e_sys: ['106'],
  note_3f_sys: ['20', '206', '781'],
  note_4_sys: ['26', '27'],
  note_5_sys: ['48', '498'],
  note_6_sys: ['31', '32', '33', '34', '35', '36', '37', '38', '39'],
  note_7_sys: ['41'],
  note_8_sys: ['42', '43', '44', '45', '46', '471', '472', '473', '474', '476'],
  note_8a_sys: ['4751', '4752'],
  note_9_sys: ['50'],
  note_10_sys: ['51'],
  note_11_sys: ['52', '53', '54', '55', '56', '57', '58'],
  note_12_sys: ['478', '479', '781', '787'],
  note_13_sys: ['10'],
  note_14_sys: ['105', '11'],
  note_15a_sys: ['14', '15'],
  note_15b_sys: ['167'],
  note_16a_sys: ['16', '17'],
  note_16b_sys: ['197'],
  note_16c_sys: [],
  note_17_sys: ['40'],
  note_18_sys: ['42', '43', '44'],
  note_19_sys: ['47', '48', '49'],
  note_20_sys: ['56'],
  note_21_sys: ['70', '71', '72', '73', '74', '75', '76', '77', '78'],
  note_22_sys: ['60'],
  note_23_sys: ['61'],
  note_24_sys: ['62', '63'],
  note_25_sys: ['64'],
  note_26_sys: ['65'],
  note_27a_sys: ['66'],
  note_27b_sys: ['66'],
  note_28_sys: ['29', '39', '49', '59'],
  note_29_sys: ['77', '67'],
  note_30_sys: ['83', '84', '85', '86', '87', '88'],
  note_31_sys: ['12', '13'],
  note_32_sys: ['70', '71', '72', '73'],
  note_33_sys: ['60'],
  note_34_sys: [],
  note_35_sys: [],
  note_36_sys: [],
  note_37_sys: ['89'],
};

export const ALWAYS_VISIBLE_NOTES = ['note_2_sys', 'note_34_sys', 'note_36_sys'];

export const MANUAL_NOTE_PARAMS: Record<string, string> = {
  note_16c_sys: 'note16c_values',
  note_35_sys: 'note35_values',
};

export const IMPLEMENTED_ETATS = [
  'bilan_actif', 'bilan_passif', 'compte_resultat', 'flux_tresorerie',
  'emplois_ressources', 'execution_budgetaire', 'reconciliation_tresorerie',
  'bilan_projet', 'compte_exploitation',
  'bilan_smt', 'compte_resultat_smt', 'notes_annexes_smt', 'journal_tresorerie_smt', 'journaux_smt',
  'page_garde_sys', 'fiche_identification_sys', 'fiche_r2_sys', 'fiche_r3_sys', 'fiche_r4_sys',
  'notes_annexes_sys',
  'note_1_sys', 'note_2_sys', 'note_3a_sys', 'note_3b_sys', 'note_3c_sys', 'note_3d_sys', 'note_3e_sys', 'note_3f_sys',
  'note_4_sys', 'note_5_sys', 'note_6_sys', 'note_7_sys', 'note_8_sys', 'note_8a_sys', 'note_9_sys',
  'note_10_sys', 'note_11_sys', 'note_12_sys', 'note_13_sys', 'note_14_sys',
  'note_15a_sys', 'note_15b_sys', 'note_16a_sys', 'note_16b_sys', 'note_16c_sys',
  'note_17_sys', 'note_18_sys', 'note_19_sys', 'note_20_sys', 'note_21_sys',
  'note_22_sys', 'note_23_sys', 'note_24_sys', 'note_25_sys', 'note_26_sys',
  'note_27a_sys', 'note_27b_sys', 'note_28_sys', 'note_29_sys', 'note_30_sys',
  'note_31_sys', 'note_32_sys', 'note_33_sys', 'note_34_sys', 'note_35_sys',
  'note_36_sys', 'note_37_sys',
  'bilan_actif_sys', 'bilan_passif_sys', 'compte_resultat_sys', 'tft', 'resultat_fiscal_sys',
  'liasse_complete_sys',
];
