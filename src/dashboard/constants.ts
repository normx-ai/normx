import {
  LuScale, LuReceipt, LuArrowLeftRight, LuFileText,
  LuTable, LuClipboardList, LuWallet, LuBookOpen,
  LuCoins, LuFileSpreadsheet, LuUsers, LuFileCheck,
} from 'react-icons/lu';
import { TypeActivite, EtatFinancier } from '../types';
import { ModuleInfo } from './types';

export const MODULE_LIST: ModuleInfo[] = [
  { id: 'compta', label: 'Comptabilité', icon: LuBookOpen, desc: 'Saisie, consultation, états financiers' },
  { id: 'etats', label: 'États financiers', icon: LuFileSpreadsheet, desc: 'Import balance, révision comptable, états financiers' },
  { id: 'paie', label: 'Paie', icon: LuCoins, desc: 'Bulletins, salariés, déclarations' },
];

export const ETATS_ASSOCIATION: EtatFinancier[] = [
  { id: 'bilan_actif', titre: 'Bilan - Actif', short: 'Actif', desc: 'Actif immobilisé, circulant et trésorerie', navIcon: LuScale },
  { id: 'bilan_passif', titre: 'Bilan - Passif', short: 'Passif', desc: 'Fonds propres, dettes et trésorerie', navIcon: LuScale },
  { id: 'compte_resultat', titre: 'Compte de résultat', short: 'CR', desc: 'Produits et charges de l\'exercice', navIcon: LuReceipt },
  { id: 'flux_tresorerie', titre: 'Tableau des flux de trésorerie', short: 'TFT', desc: 'Entrées et sorties de liquidités', navIcon: LuArrowLeftRight },
  { id: 'notes_annexes', titre: 'Notes annexes', short: 'Notes', desc: 'Informations complémentaires', navIcon: LuFileText },
];

export const ETATS_SMT: EtatFinancier[] = [
  { id: 'bilan_smt', titre: 'Bilan SMT', short: 'Bilan', desc: 'Bilan simplifié du SMT', navIcon: LuScale },
  { id: 'compte_resultat_smt', titre: 'Compte de résultat SMT', short: 'CR', desc: 'Revenus et charges du SMT', navIcon: LuReceipt },
  { id: 'notes_annexes_smt', titre: 'Notes annexes SMT', short: 'Notes', desc: 'Suivi matériel, stocks, créances et dettes', navIcon: LuFileText },
  { id: 'journal_tresorerie_smt', titre: 'Journal de trésorerie SMT', short: 'Trésorerie', desc: 'Journal mensuel recettes/dépenses avec ventilation', navIcon: LuWallet },
  { id: 'journaux_smt', titre: 'Journaux de suivi SMT', short: 'Journaux', desc: 'Créances impayées et dettes à payer', navIcon: LuClipboardList },
];

export const ETATS_FINANCIERS_SYS: EtatFinancier[] = [
  { id: 'bilan_actif_sys', titre: 'Bilan - Actif', short: 'Actif', desc: 'Actif immobilisé, circulant et trésorerie', navIcon: LuScale },
  { id: 'bilan_passif_sys', titre: 'Bilan - Passif', short: 'Passif', desc: 'Capitaux propres, dettes et provisions', navIcon: LuScale },
  { id: 'compte_resultat_sys', titre: 'Compte de résultat', short: 'CR', desc: 'Produits et charges de l\'exercice', navIcon: LuReceipt },
  { id: 'tafire', titre: 'TFT', short: 'TFT', desc: 'Tableau des flux de trésorerie', navIcon: LuArrowLeftRight },
  { id: 'notes_annexes_sys', titre: 'Notes annexes', short: 'Notes', desc: 'Informations complémentaires', navIcon: LuFileText },
];

export const LIASSE_FISCALE_SYS: EtatFinancier[] = [
  { id: 'page_garde_sys', titre: 'Page de garde', short: 'Garde', desc: 'Page de garde officielle des états financiers', navIcon: LuFileCheck },
  { id: 'fiche_identification_sys', titre: 'Fiche R1', short: 'R1', desc: 'Fiche d\'identification et renseignements divers', navIcon: LuFileText },
  { id: 'fiche_r2_sys', titre: 'Fiche R2', short: 'R2', desc: 'Informations juridiques et activité de l\'entité', navIcon: LuFileText },
  { id: 'fiche_r3_sys', titre: 'Fiche R3', short: 'R3', desc: 'Dirigeants et Membres du Conseil d\'Administration', navIcon: LuUsers },
  { id: 'fiche_r4_sys', titre: 'Fiche R4', short: 'R4', desc: 'Notes annexes — Applicabilité', navIcon: LuClipboardList },
  { id: 'resultat_fiscal_sys', titre: 'Résultat fiscal', short: 'Rés. fiscal', desc: 'Détermination du résultat fiscal', navIcon: LuCoins },
];

export const ETATS_ENTREPRISE: EtatFinancier[] = [...ETATS_FINANCIERS_SYS, ...LIASSE_FISCALE_SYS];

export const ETATS_PROJET: EtatFinancier[] = [
  { id: 'emplois_ressources', titre: 'Tableau emplois-ressources', short: 'TER', desc: 'Emplois et ressources du projet', navIcon: LuTable },
  { id: 'execution_budgetaire', titre: 'Exécution budgétaire', short: 'Exec. Budg.', desc: 'Suivi du budget prévisionnel', navIcon: LuClipboardList },
  { id: 'reconciliation_tresorerie', titre: 'Réconciliation de trésorerie', short: 'Reconc.', desc: 'Rapprochement des soldes', navIcon: LuWallet },
  { id: 'bilan_projet', titre: 'Bilan', short: 'Bilan', desc: 'Actif et passif du projet', navIcon: LuScale },
  { id: 'compte_exploitation', titre: 'Compte d\'exploitation', short: 'C. Exploit.', desc: 'Charges et produits du projet', navIcon: LuReceipt },
  { id: 'notes_annexes_projet', titre: 'Notes annexes', short: 'Notes', desc: 'Informations complémentaires', navIcon: LuBookOpen },
];

export function getEtats(typeActivite: TypeActivite): EtatFinancier[] {
  if (typeActivite === 'entreprise') return ETATS_ENTREPRISE;
  if (typeActivite === 'projet_developpement') return ETATS_PROJET;
  if (typeActivite === 'smt') return ETATS_SMT;
  return ETATS_ASSOCIATION;
}

export function getTypeLabel(typeActivite: TypeActivite): string {
  switch (typeActivite) {
    case 'entreprise': return 'Entreprise (SYSCOHADA)';
    case 'association': return 'Association';
    case 'ordre_professionnel': return 'Ordre professionnel';
    case 'projet_developpement': return 'Projet de développement';
    case 'smt': return 'Entreprise (SMT)';
    default: return 'Entité';
  }
}
