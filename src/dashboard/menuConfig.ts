import {
  LuHouse, LuChartBarIncreasing, LuSettings, LuBot,
  LuPenLine, LuBookOpen, LuCalculator, LuUpload,
  LuSearchCheck, LuWrench, LuUsers, LuTruck, LuHandshake,
  LuFileCheck, LuBriefcase, LuCircleHelp, LuListOrdered,
  LuLayoutDashboard, LuChartPie, LuUser, LuFileSpreadsheet,
  LuClipboardList, LuWallet, LuBookMarked, LuArrowLeftRight,
  LuScale, LuReceipt, LuFileText,
} from 'react-icons/lu';
import { TypeActivite, NormxModule, EtatFinancier } from '../types';
import { MenuItem } from './types';
import { ETATS_FINANCIERS_SYS, LIASSE_FISCALE_SYS } from './constants';

interface BuildMenuItemsParams {
  activeModule: NormxModule | null;
  typeActivite: TypeActivite;
  exerciceId: number | null;
  etats: EtatFinancier[];
}

export function buildMenuItems({ activeModule, typeActivite, exerciceId, etats }: BuildMenuItemsParams): MenuItem[] {
  const items: (MenuItem | false)[] = [
    { id: 'accueil', label: 'Accueil', icon: LuHouse },
  ];
  const noExercice: boolean = !exerciceId;
  const isEntreprise = typeActivite === 'entreprise';

  if (activeModule === 'compta') {
    items.push(
      {
        id: 'saisie', label: 'Saisie', icon: LuPenLine, hasArrow: true, disabled: noExercice,
        children: [
          { id: 'journal', label: 'Saisie écritures', icon: LuPenLine },
          { id: 'lettrage', label: 'Lettrage', icon: LuArrowLeftRight },
        ]
      },
      {
        id: 'consultation', label: 'Consultation', icon: LuBookOpen, hasArrow: true, disabled: noExercice,
        children: [
          { id: '_compta_gen', label: 'Compta générale', isHeader: true },
          { id: 'journaux', label: 'Journaux', icon: LuClipboardList },
          { id: 'grand_livre', label: 'Grand livre', icon: LuBookMarked },
          { id: 'balance', label: 'Balance générale', icon: LuCalculator },
          { id: '_tiers_header', label: 'Tiers', isHeader: true },
          { id: 'grand_livre_tiers', label: 'Grand livre tiers', icon: LuBookMarked },
          { id: 'balance_tiers', label: 'Balance tiers', icon: LuCalculator },
          { id: 'balance_agee', label: 'Balance âgée', icon: LuScale },
          { id: 'echeancier', label: 'Échéancier', icon: LuReceipt },
        ]
      },
      {
        id: 'tiers_section', label: 'Tiers', icon: LuUsers, hasArrow: true, disabled: noExercice,
        children: [
          { id: 'tiers_membres', label: 'Membres', icon: LuUsers },
          { id: 'tiers_fournisseurs', label: 'Fournisseurs', icon: LuTruck },
          { id: 'tiers_bailleurs', label: 'Bailleurs', icon: LuHandshake },
          { id: 'tiers_personnel', label: 'Personnel', icon: LuUser },
        ]
      },
      { id: 'declarations_tva', label: 'Déclaration', icon: LuFileCheck, disabled: noExercice },
      {
        id: 'etats', label: 'États financiers', icon: LuChartBarIncreasing, hasArrow: true, disabled: noExercice,
        children: isEntreprise
          ? ETATS_FINANCIERS_SYS.map((e: EtatFinancier) => ({ id: e.id, label: e.titre, icon: e.navIcon }))
          : etats.map((e: EtatFinancier) => ({ id: e.id, label: e.titre, icon: e.navIcon })),
      },
      isEntreprise && {
        id: 'liasse_fiscale', label: 'Liasse fiscale', icon: LuBriefcase, hasArrow: true, disabled: noExercice,
        children: [
          ...LIASSE_FISCALE_SYS.map((e: EtatFinancier) => ({ id: e.id, label: e.titre, icon: e.navIcon })),
          { id: '_ef_header', label: 'États financiers', isHeader: true },
          ...ETATS_FINANCIERS_SYS.map((e: EtatFinancier) => ({ id: e.id, label: e.titre, icon: e.navIcon })),
        ],
      },
    );
  }

  if (activeModule === 'etats') {
    items.push(
      {
        id: 'donnees', label: 'Données', icon: LuFileSpreadsheet, hasArrow: true, disabled: noExercice,
        children: [
          { id: 'import_balance', label: 'Import balance', icon: LuUpload },
          { id: 'revision_comptes', label: 'Révision comptes', icon: LuSearchCheck },
          { id: 'balance_revisee', label: 'BG Révisée', icon: LuFileCheck },
        ]
      },
      {
        id: 'etats', label: 'États financiers', icon: LuChartBarIncreasing, hasArrow: true, disabled: noExercice,
        children: isEntreprise
          ? ETATS_FINANCIERS_SYS.map((e: EtatFinancier) => ({ id: e.id, label: e.titre, icon: e.navIcon }))
          : etats.map((e: EtatFinancier) => ({ id: e.id, label: e.titre, icon: e.navIcon })),
      },
      isEntreprise && {
        id: 'liasse_fiscale', label: 'Liasse fiscale', icon: LuBriefcase, hasArrow: true, disabled: noExercice,
        children: [
          ...LIASSE_FISCALE_SYS.map((e: EtatFinancier) => ({ id: e.id, label: e.titre, icon: e.navIcon })),
          { id: '_ef_header', label: 'États financiers', isHeader: true },
          ...ETATS_FINANCIERS_SYS.map((e: EtatFinancier) => ({ id: e.id, label: e.titre, icon: e.navIcon })),
        ],
      },
    );
  }

  items.push(
    {
      id: 'rapports_section', label: 'Rapports', icon: LuChartBarIncreasing, hasArrow: true, disabled: noExercice,
      children: [
        { id: 'tableau_bord', label: 'Tableau de bord financier', icon: LuLayoutDashboard },
        { id: 'repartition_charges', label: 'Répartition des charges', icon: LuChartPie },
        { id: 'suivi_tresorerie', label: 'Suivi de trésorerie', icon: LuWallet },
        { id: 'comparatif', label: 'Comparatif N / N-1', icon: LuArrowLeftRight },
        { id: 'sig', label: 'Soldes Intermédiaires (SIG)', icon: LuListOrdered },
      ]
    },
    {
      id: 'outils', label: 'Outils', icon: LuWrench, hasArrow: true,
      children: [
        { id: 'assistant', label: 'Assistant IA', icon: LuBot },
        { id: 'aide_videos', label: 'Aide & Vidéos', icon: LuCircleHelp },
        { id: 'parametres', label: 'Paramètres', icon: LuSettings },
      ]
    },
  );

  return items.filter((item): item is MenuItem => Boolean(item));
}
