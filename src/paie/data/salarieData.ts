/* ========================================
   DONNEES DU WIZARD SALARIE - Normx Paie Congo
   ======================================== */
import type { WizardStep, SelectOption, NiveauDiplome, ClassificationItem } from '../types/paie.types';
import type { SalarieForm } from '../components/wizardTypes';

// Les 15 etapes du wizard creation salarie (sans parametres_declaration / DSN)
export const SALARIE_STEPS: WizardStep[] = [
  { id: 'identite', label: 'Identité' },
  { id: 'adresse', label: 'Adresse' },
  { id: 'banque', label: 'Banque' },
  { id: 'contrat', label: 'Contrat' },
  { id: 'anciennetes', label: 'Anciennetés' },
  { id: 'emploi', label: 'Emploi' },
  { id: 'formations', label: 'Formations, diplômes' },
  { id: 'classification', label: 'Classification' },
  { id: 'salaire_horaires', label: 'Salaire et horaires' },
  { id: 'administratif', label: 'Administratif' },
  { id: 'indemnites', label: 'Indemnités arrêt travail' },
  { id: 'parametres', label: 'Paramètres' },
  { id: 'parametres_bulletin', label: 'Paramètres du bulletin' },
  { id: 'organismes', label: 'Organismes' },
  { id: 'contrats_sociaux', label: 'Contrats sociaux' },
];

export const CIVILITES: string[] = ['Monsieur', 'Madame'];

export const SITUATIONS_FAMILIALES: string[] = [
  'Célibataire', 'Marié(e)', 'Divorcé(e)', 'Séparé(e)', 'Veuf/veuve',
];

export const PAYS: SelectOption[] = [
  { value: 'CONGO', label: 'CONGO' },
  { value: 'CAMEROUN', label: 'CAMEROUN' },
  { value: 'GABON', label: 'GABON' },
  { value: 'RDC', label: 'RDC' },
  { value: 'CENTRAFRIQUE', label: 'CENTRAFRIQUE' },
  { value: 'TCHAD', label: 'TCHAD' },
  { value: 'GUINEE_EQUATORIALE', label: 'GUINEE EQUATORIALE' },
  { value: 'FRANCE', label: 'FRANCE' },
  { value: 'AUTRE', label: 'AUTRE' },
];

// Types de contrat Congo
export const TYPES_CONTRAT: string[] = [
  'CDI - Contrat à Durée Indéterminée',
  'CDD - Contrat à Durée Déterminée',
  'Contrat journalier',
  'Contrat saisonnier',
  'Contrat d\'apprentissage',
  'Stage',
];

export const CONTRATS_PARTICULIERS: string[] = [
  'Aucun',
  'Contrat aide',
  "Contrat d'insertion",
];

export const FORMES_AMENAGEMENT_TEMPS: SelectOption[] = [
  { value: '', label: 'Sélectionnez...' },
  { value: 'TEMPS_PARTIEL', label: 'Temps partiel' },
  { value: 'FORFAIT_JOURS', label: 'Forfait jours' },
  { value: 'FORFAIT_HEURES', label: 'Forfait heures' },
];

export const NIVEAUX_DIPLOME: NiveauDiplome[] = [
  { code: '01', label: "Scolarité obligatoire" },
  { code: '02', label: "Formation d'un an après le collège" },
  { code: '03', label: "Niveau CAP ou BEP" },
  { code: '04', label: "Niveau baccalauréat" },
  { code: '05', label: "Niveau bac+2 : BTS, DUT, etc." },
  { code: '06', label: "Niveau bac+3/bac+4 : licence, maîtrise" },
  { code: '07', label: "Niveau bac+5 : master, ingénieur" },
];

export const CATEGORIES_SALARIE: SelectOption[] = [
  { value: '', label: 'Sélectionnez...' },
  { value: 'MANOEUVRE', label: 'Manoeuvre' },
  { value: 'OUVRIER', label: 'Ouvrier' },
  { value: 'EMPLOYE', label: 'Employé' },
  { value: 'AGENT_MAITRISE', label: 'Agent de maîtrise' },
  { value: 'CADRE', label: 'Cadre' },
  { value: 'CADRE_SUPERIEUR', label: 'Cadre supérieur' },
];

export const HEURES: SelectOption[] = Array.from({ length: 24 }, (_, i) => ({
  value: String(i).padStart(2, '0'),
  label: String(i).padStart(2, '0'),
}));

export const MINUTES: SelectOption[] = [
  { value: '00', label: '00' },
  { value: '15', label: '15' },
  { value: '30', label: '30' },
  { value: '45', label: '45' },
];

export const TYPES_SALAIRE: string[] = ['Mensuel', 'Horaire', 'Forfait jour', 'Forfait heure'];

export const JOURS_PAIEMENT: string[] = ['Dernier jour du mois', '25', '28', '1er du mois suivant'];

export const JOURS_SEMAINE: string[] = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];

export const STATUTS_JOUR: string[] = ['Ouvert', 'Fermé', 'Férié'];

// Planning par defaut Congo: 8h/jour, 40h/semaine
export const DEFAULT_PLANNING_SALARIE: { jour: string; statut: string; heures: string }[] = JOURS_SEMAINE.map((jour, i) => ({
  jour,
  statut: i < 5 ? 'Ouvert' : i === 5 ? 'Fermé' : 'Férié',
  heures: '8,00',
}));

export const SECTIONS_ADMINISTRATIF: { id: string; label: string; hasHelp: boolean }[] = [
  { id: 'penibilite', label: 'Pénibilité au travail', hasHelp: true },
  { id: 'sante_travail', label: 'Service de santé au travail', hasHelp: false },
  { id: 'permis', label: 'Permis de conduire', hasHelp: false },
  { id: 'formation_cpf', label: 'Formation professionnelle', hasHelp: false },
  { id: 'entretien', label: 'Entretien professionnel', hasHelp: false },
];

export const ANCIENNETE_LIGNES: { id: string; label: string; hasHelp: boolean }[] = [
  { id: 'profession', label: "Date d'entrée dans la profession ou dans le métier", hasHelp: true },
  { id: 'college', label: "Date d'entrée dans la catégorie professionnelle", hasHelp: false },
  { id: 'groupe', label: "Date d'entrée dans le groupe", hasHelp: false },
  { id: 'classification', label: "Date d'entrée dans la classification", hasHelp: false },
  { id: 'temps_travail', label: "Date d'entrée dans cette modalité de temps de travail", hasHelp: false },
  { id: 'poste', label: "Date d'entrée dans le poste", hasHelp: false },
  { id: 'contrat', label: "Date d'ancienneté dans le contrat", hasHelp: true },
  { id: 'vie_pro', label: "Date d'entrée dans la vie professionnelle", hasHelp: false },
];

export const METHODES_CALCUL_MAINTIEN: SelectOption[] = [
  { value: '', label: 'Sélectionnez...' },
  { value: 'jours_ouvres', label: 'Jours ouvrés' },
  { value: 'jours_ouvrables', label: 'Jours ouvrables' },
  { value: 'jours_calendaires', label: 'Jours calendaires' },
];

export const DEDUCTIONS_FORFAITAIRES: SelectOption[] = [
  { value: '', label: 'Aucune' },
  { value: '10', label: '10%' },
  { value: '20', label: '20%' },
  { value: '30', label: '30%' },
];

export const STATUTS_SALARIE: SelectOption[] = [
  { value: '', label: 'Sélectionnez...' },
  { value: 'cadre', label: 'Cadre' },
  { value: 'non_cadre', label: 'Non cadre' },
  { value: 'apprenti', label: 'Apprenti' },
];

export const FACTEURS_PENIBILITE: string[] = [
  'Manutentions manuelles de charges',
  'Postures pénibles',
  'Vibrations mécaniques',
  'Agents chimiques dangereux',
  'Températures extrêmes',
  'Bruit',
  'Travail de nuit',
  'Travail répétitif',
];

export const APTITUDES: string[] = ['Apte', 'Apte avec réserves', 'Inapte temporaire', 'Inapte définitif'];

export const SECTEURS_CONTRAT: string[] = ['Privé', 'Public', 'Associatif', 'Particulier employeur'];

// Grille de classification Congo
export const CLASSIFICATION_GRID: ClassificationItem[] = [
  { niveau: '1', coefficient: '100', description: 'Manoeuvre ordinaire' },
  { niveau: '2', coefficient: '130', description: 'Manoeuvre spécialisé' },
  { niveau: '3', coefficient: '155', description: 'Ouvrier / Employé' },
  { niveau: '4', coefficient: '185', description: 'Ouvrier qualifié' },
  { niveau: '5', coefficient: '225', description: 'Agent de maîtrise' },
  { niveau: '6', coefficient: '300', description: 'Cadre' },
  { niveau: '7', coefficient: '400', description: 'Cadre supérieur' },
  { niveau: '8', coefficient: '600', description: 'Cadre dirigeant' },
];

export const CODES_CLASSIFICATION_QUALIFICATION: string[] = [
  'Manoeuvre ordinaire',
  'Manoeuvre spécialisé',
  'Ouvrier non qualifié',
  'Ouvrier qualifié',
  'Employé',
  'Employé qualifié',
  'Agent de maîtrise',
  'Cadre',
];

// Les 16 conventions collectives du Congo-Brazzaville
export const CONVENTIONS_COLLECTIVES: SelectOption[] = [
  { value: '', label: 'Convention générale du travail' },
  { value: 'AGRI_FORET', label: 'Agriculture et Forêt' },
  { value: 'AUXILIAIRES_TRANSPORT', label: 'Auxiliaires de Transport' },
  { value: 'BAM', label: 'Banques, Assurances et Microfinance (BAM)' },
  { value: 'BTP', label: 'Bâtiment et Travaux Publics (BTP)' },
  { value: 'COMMERCE', label: 'Commerce' },
  { value: 'DOMESTIQUE', label: 'Domestique de Maison' },
  { value: 'FORESTIERE', label: 'Forestière' },
  { value: 'HOTELLERIE_CATERING', label: 'Hôtellerie et Catering' },
  { value: 'INDUSTRIE', label: 'Industrie' },
  { value: 'INFO_COMM', label: 'Information et Communication' },
  { value: 'MINIERE', label: 'Exploitation Minière' },
  { value: 'NTIC', label: 'NTIC' },
  { value: 'PARA_PETROLE', label: 'Para-Pétrole' },
  { value: 'PECHE_MARITIME', label: 'Pêche Maritime Industrielle' },
  { value: 'PETROLE', label: 'Pétrole' },
  { value: 'TRANSPORT_AERIEN', label: 'Transport Aérien' },
];

export const ABSENCES_CONGES_PAYEES: string[] = [
  'Congés payés',
  'Congé maladie',
  'Congé maternité',
  'Congé paternité',
  'Congé sans solde',
  'Absence injustifiée',
  'Congé formation',
];

export function getEmptySalarieForm(): SalarieForm {
  return {
    identite: {
      code: '', civilite: 'Madame', nom: '', prenom: '', nom_jeune_fille: '',
      situation_familiale: '', nb_enfants: '0',
      date_naissance: '', num_ss: '', num_provisoire: false,
      nationalite: 'CONGO', commune_naissance: '', departement_naissance: '',
      pays_naissance: 'CONGO', salarie_etranger: false, photo: null,
    },
    adresse: {
      numero_voie: '', complement: '', code_postal: '', ville: '',
      pays: 'CONGO', code_distribution: '',
      email_pro: '', email_perso: '', telephone1: '', telephone2: '',
    },
    banque: {
      code_bic: '', pays: 'CONGO', nom_banque: '', titulaire: '',
      iban: '', banque: '', guichet: '', num_compte: '', cle_rib: '',
    },
    contrat: {
      date_embauche: '', heure_embauche_h: '08', heure_embauche_m: '00',
      type_contrat: '', contrat_particulier: '',
      fin_periode_essai: '', date_fin_previsionnelle: '',
      exclu_effectifs: false, en_sommeil: false, amenagement_temps: '',
      boeth: false,
    },
    anciennetes: {
      date_anciennete: '', lignes: {},
      mois_anciennete_profession: '0,000', mois_anciennete_entreprise: '0,000',
    },
    emploi: {
      etablissement: '', convention_collective: '',
      emploi: '', qualification: '', profil: '', categorie: '',
      taux_at: '2,2500', risque: '', section_at: '',
    },
    formations: { diplome: '' },
    classification: {
      emploi_conventionnel: '', categorie_conventionnelle: '',
      niveau: '', coefficient: '', indice: '',
    },
    salaire_horaires: {
      horaire_mensuel: '173,330',
      heures_jour: '8,00',
      heures_sup_mensualisees: false,
      complement_heures: false,
      planning: DEFAULT_PLANNING_SALARIE,
      type_salaire: 'Mensuel',
      salaire_base: '0',
      indemnite_cp_mensuelle: false,
      remunere_smic: false,
      remunere_bareme: false,
    },
    administratif: {
      penibilite: {}, sante_travail: {}, permis: {},
      formation_cpf: {}, entretien: {},
    },
    indemnites: {},
    parametres: {},
    parametres_bulletin: {},
    organismes: {},
    contrats_sociaux: {},
  };
}

export default {
  SALARIE_STEPS, CIVILITES, SITUATIONS_FAMILIALES, PAYS, TYPES_CONTRAT,
  CONTRATS_PARTICULIERS, FORMES_AMENAGEMENT_TEMPS, NIVEAUX_DIPLOME,
  CATEGORIES_SALARIE, HEURES, MINUTES, TYPES_SALAIRE, JOURS_PAIEMENT,
  JOURS_SEMAINE, STATUTS_JOUR, DEFAULT_PLANNING_SALARIE,
  SECTIONS_ADMINISTRATIF, ANCIENNETE_LIGNES, METHODES_CALCUL_MAINTIEN,
  DEDUCTIONS_FORFAITAIRES, STATUTS_SALARIE, getEmptySalarieForm,
};
