import React, { useState, useEffect, useRef } from 'react';
import {
  LuHouse, LuFileSpreadsheet, LuChartBarIncreasing,
  LuSettings, LuUser, LuLock, LuLogOut,
  LuChevronDown, LuChevronLeft, LuChevronRight,
  LuHandHelping, LuBot, LuX,
  LuScale, LuReceipt, LuArrowLeftRight, LuFileText,
  LuTable, LuClipboardList, LuWallet, LuBookOpen,
  LuPenLine, LuBookMarked, LuCalculator, LuUpload,
  LuSearchCheck, LuWrench, LuUsers, LuTruck, LuHandshake,
  LuFileCheck, LuBriefcase, LuCoins, LuCircleHelp, LuListOrdered,
  LuLayoutDashboard, LuChartPie
} from 'react-icons/lu';
// @ts-ignore
import Paie from '../paie/Paie';
import GestionClients from './GestionClients';
import { TypeActivite, Offre, NormxModule, EtatFinancier, Exercice, Entite } from '../types';
import { MenuItem, MenuChild, TabItem, ModuleInfo } from './types';
import ConfirmModal from '../components/ConfirmModal';
import Topbar from './Topbar';
import { ExerciceModal } from './ExerciceManager';
import ComptaSidebar from './ComptaSidebar';
import TabsBar from './TabsBar';
import MainContent from './MainContent';
import FloatingCalculator from '../components/FloatingCalculator';
import './Dashboard.css';

interface DashboardProps {
  userName: string;
  cabinetName: string;
  cabinetId: number;
  isCabinet: boolean;
  entiteName: string;
  entiteId: number;
  userId: number;
  typeActivite: TypeActivite;
  offre: Offre;
  modules: NormxModule[];
  entiteSigle: string;
  entiteAdresse: string;
  entiteNif: string;
  entites: Entite[];
  onSwitchEntite: (entite: Entite) => void;
  onEntiteCreated: (entite: Entite) => void;
  onEntiteUpdated: (entite: Entite) => void;
  onEntiteDeleted: (id: number) => void;
  onLogout: () => void;
}

const MODULE_LIST: ModuleInfo[] = [
  { id: 'compta', label: 'Comptabilité', icon: LuBookOpen, desc: 'Saisie, consultation, états financiers' },
  { id: 'etats', label: 'États financiers', icon: LuFileSpreadsheet, desc: 'Import balance, révision comptable, états financiers' },
  { id: 'paie', label: 'Paie', icon: LuCoins, desc: 'Bulletins, salariés, déclarations' },
];

const ETATS_ASSOCIATION: EtatFinancier[] = [
  { id: 'bilan_actif', titre: 'Bilan - Actif', short: 'Actif', desc: 'Actif immobilisé, circulant et trésorerie', navIcon: LuScale },
  { id: 'bilan_passif', titre: 'Bilan - Passif', short: 'Passif', desc: 'Fonds propres, dettes et trésorerie', navIcon: LuScale },
  { id: 'compte_resultat', titre: 'Compte de résultat', short: 'CR', desc: 'Produits et charges de l\'exercice', navIcon: LuReceipt },
  { id: 'flux_tresorerie', titre: 'Tableau des flux de trésorerie', short: 'TFT', desc: 'Entrées et sorties de liquidités', navIcon: LuArrowLeftRight },
  { id: 'notes_annexes', titre: 'Notes annexes', short: 'Notes', desc: 'Informations complémentaires', navIcon: LuFileText },
];

const ETATS_SMT: EtatFinancier[] = [
  { id: 'bilan_smt', titre: 'Bilan SMT', short: 'Bilan', desc: 'Bilan simplifié du SMT', navIcon: LuScale },
  { id: 'compte_resultat_smt', titre: 'Compte de résultat SMT', short: 'CR', desc: 'Revenus et charges du SMT', navIcon: LuReceipt },
  { id: 'notes_annexes_smt', titre: 'Notes annexes SMT', short: 'Notes', desc: 'Suivi matériel, stocks, créances et dettes', navIcon: LuFileText },
  { id: 'journal_tresorerie_smt', titre: 'Journal de trésorerie SMT', short: 'Trésorerie', desc: 'Journal mensuel recettes/dépenses avec ventilation', navIcon: LuWallet },
  { id: 'journaux_smt', titre: 'Journaux de suivi SMT', short: 'Journaux', desc: 'Créances impayées et dettes à payer', navIcon: LuClipboardList },
];

// États financiers SYSCOHADA (sidebar "États financiers")
const ETATS_FINANCIERS_SYS: EtatFinancier[] = [
  { id: 'bilan_actif_sys', titre: 'Bilan - Actif', short: 'Actif', desc: 'Actif immobilisé, circulant et trésorerie', navIcon: LuScale },
  { id: 'bilan_passif_sys', titre: 'Bilan - Passif', short: 'Passif', desc: 'Capitaux propres, dettes et provisions', navIcon: LuScale },
  { id: 'compte_resultat_sys', titre: 'Compte de résultat', short: 'CR', desc: 'Produits et charges de l\'exercice', navIcon: LuReceipt },
  { id: 'tafire', titre: 'TFT', short: 'TFT', desc: 'Tableau des flux de trésorerie', navIcon: LuArrowLeftRight },
  { id: 'notes_annexes_sys', titre: 'Notes annexes', short: 'Notes', desc: 'Informations complémentaires', navIcon: LuFileText },
];

// Liasse fiscale SYSCOHADA (sidebar "Liasse fiscale")
const LIASSE_FISCALE_SYS: EtatFinancier[] = [
  { id: 'page_garde_sys', titre: 'Page de garde', short: 'Garde', desc: 'Page de garde officielle des états financiers', navIcon: LuFileCheck },
  { id: 'fiche_identification_sys', titre: 'Fiche R1', short: 'R1', desc: 'Fiche d\'identification et renseignements divers', navIcon: LuFileText },
  { id: 'fiche_r2_sys', titre: 'Fiche R2', short: 'R2', desc: 'Informations juridiques et activité de l\'entité', navIcon: LuFileText },
  { id: 'fiche_r3_sys', titre: 'Fiche R3', short: 'R3', desc: 'Dirigeants et Membres du Conseil d\'Administration', navIcon: LuUsers },
  { id: 'fiche_r4_sys', titre: 'Fiche R4', short: 'R4', desc: 'Notes annexes — Applicabilité', navIcon: LuClipboardList },
  { id: 'resultat_fiscal_sys', titre: 'Résultat fiscal', short: 'Rés. fiscal', desc: 'Détermination du résultat fiscal', navIcon: LuCoins },
];

// Tous les états entreprise (pour accueil cards + IMPLEMENTED_ETATS)
const ETATS_ENTREPRISE: EtatFinancier[] = [...ETATS_FINANCIERS_SYS, ...LIASSE_FISCALE_SYS];

const ETATS_PROJET: EtatFinancier[] = [
  { id: 'emplois_ressources', titre: 'Tableau emplois-ressources', short: 'TER', desc: 'Emplois et ressources du projet', navIcon: LuTable },
  { id: 'execution_budgetaire', titre: 'Exécution budgétaire', short: 'Exec. Budg.', desc: 'Suivi du budget prévisionnel', navIcon: LuClipboardList },
  { id: 'reconciliation_tresorerie', titre: 'Réconciliation de trésorerie', short: 'Reconc.', desc: 'Rapprochement des soldes', navIcon: LuWallet },
  { id: 'bilan_projet', titre: 'Bilan', short: 'Bilan', desc: 'Actif et passif du projet', navIcon: LuScale },
  { id: 'compte_exploitation', titre: 'Compte d\'exploitation', short: 'C. Exploit.', desc: 'Charges et produits du projet', navIcon: LuReceipt },
  { id: 'notes_annexes_projet', titre: 'Notes annexes', short: 'Notes', desc: 'Informations complémentaires', navIcon: LuBookOpen },
];

function getEtats(typeActivite: TypeActivite): EtatFinancier[] {
  if (typeActivite === 'entreprise') return ETATS_ENTREPRISE;
  if (typeActivite === 'projet_developpement') return ETATS_PROJET;
  if (typeActivite === 'smt') return ETATS_SMT;
  return ETATS_ASSOCIATION;
}

function getTypeLabel(typeActivite: TypeActivite): string {
  switch (typeActivite) {
    case 'entreprise': return 'Entreprise (SYSCOHADA)';
    case 'association': return 'Association';
    case 'ordre_professionnel': return 'Ordre professionnel';
    case 'projet_developpement': return 'Projet de développement';
    case 'smt': return 'Entreprise (SMT)';
    default: return 'Entité';
  }
}

function Dashboard({ userName, cabinetName = '', cabinetId = 0, isCabinet = false, entiteName, entiteId, userId, typeActivite, offre = 'comptabilite', modules = [], entiteSigle = '', entiteAdresse = '', entiteNif = '', entites = [], onSwitchEntite, onEntiteCreated, onEntiteUpdated, onEntiteDeleted, onLogout }: DashboardProps): React.ReactElement {
  const [activeModule, setActiveModule] = useState<NormxModule | null>(null);
  const [moduleSwitcherOpen, setModuleSwitcherOpen] = useState<boolean>(false);
  const [dossierSwitcherOpen, setDossierSwitcherOpen] = useState<boolean>(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(false);
  const [userMenuOpen, setUserMenuOpen] = useState<boolean>(false);
  const moduleSwitcherRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const dossierSwitcherRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent): void => {
      if (moduleSwitcherOpen && moduleSwitcherRef.current && !moduleSwitcherRef.current.contains(e.target as Node)) {
        setModuleSwitcherOpen(false);
      }
      if (userMenuOpen && userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
      if (dossierSwitcherOpen && dossierSwitcherRef.current && !dossierSwitcherRef.current.contains(e.target as Node)) {
        setDossierSwitcherOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [moduleSwitcherOpen, userMenuOpen, dossierSwitcherOpen]);

  const [activeTab, setActiveTab] = useState<string>('accueil');
  const [openTabs, setOpenTabs] = useState<TabItem[]>([{ id: 'accueil', label: 'Accueil', icon: LuHouse, closable: false }]);
  const [exerciceId, setExerciceId] = useState<number | null>(null);
  const [exercices, setExercices] = useState<Exercice[]>([]);
  const [exerciceLoading, setExerciceLoading] = useState<boolean>(false);
  const [activeSection, setActiveSection] = useState<string | null>(null);

  const availableModules: NormxModule[] = modules.length > 0
    ? modules
    : offre === 'comptabilite' ? ['compta', 'etats'] : ['etats'];

  const hasModule = (mod: NormxModule): boolean => availableModules.includes(mod);
  const etats: EtatFinancier[] = getEtats(typeActivite);

  // Fetch exercices — reset quand on change de dossier client
  React.useEffect(() => {
    if (!entiteId) return;
    setExerciceId(null);
    setExercices([]);
    fetch('/api/balance/exercices/' + entiteId)
      .then((r: Response) => r.json())
      .then((data: Exercice[]) => {
        setExercices(data);
        if (data.length > 0) {
          const now: Date = new Date();
          const year: number = now.getFullYear();
          const month: number = now.getMonth();
          const preferYear: number = month <= 2 ? year - 1 : year;
          const pick: Exercice = data.find((e: Exercice) => e.annee === preferYear)
            || data.find((e: Exercice) => e.annee === year)
            || data.find((e: Exercice) => e.annee === year - 1)
            || data[0];
          setExerciceId(pick.id);
        }
      })
      .catch(() => {});
  }, [entiteId]);

  // Exercice modal state
  const [showExerciceModal, setShowExerciceModal] = useState<boolean>(false);
  const [newExDateDebut, setNewExDateDebut] = useState<string>(`${new Date().getFullYear()}-01-01`);
  const [newExDateFin, setNewExDateFin] = useState<string>(`${new Date().getFullYear()}-12-31`);
  const [exerciceError, setExerciceError] = useState<string>('');

  const calcDureeMois = (debut: string, fin: string): number => {
    const d1 = new Date(debut);
    const d2 = new Date(fin);
    return (d2.getFullYear() - d1.getFullYear()) * 12 + (d2.getMonth() - d1.getMonth()) + 1;
  };

  const openExerciceModal = (): void => {
    if (exercices.length >= 2) {
      setExerciceError('Maximum 2 exercices par entité.');
      return;
    }
    const y = new Date().getFullYear();
    setNewExDateDebut(`${y}-01-01`);
    setNewExDateFin(`${y}-12-31`);
    setExerciceError('');
    setShowExerciceModal(true);
  };

  const createExercice = async (): Promise<void> => {
    const duree = calcDureeMois(newExDateDebut, newExDateFin);
    if (duree !== 18 && (duree < 7 || duree > 12)) {
      setExerciceError('Durée invalide (' + duree + ' mois). Autorisé : 7 à 12 mois ou 18 mois.');
      return;
    }
    const annee = new Date(newExDateDebut).getFullYear();
    setExerciceLoading(true);
    setExerciceError('');
    try {
      const res: Response = await fetch('/api/balance/exercice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entite_id: entiteId, annee, duree_mois: duree, date_debut: newExDateDebut, date_fin: newExDateFin }),
      });
      const data = await res.json();
      if (res.ok) {
        setExercices((prev: Exercice[]) => [data, ...prev]);
        setExerciceId(data.id);
        setShowExerciceModal(false);
      } else {
        setExerciceError(data.error || 'Erreur lors de la création.');
      }
    } catch {
      setExerciceError('Impossible de contacter le serveur.');
    } finally {
      setExerciceLoading(false);
    }
  };

  // Module switcher
  const switchModule = (mod: NormxModule): void => {
    setActiveModule(mod);
    setModuleSwitcherOpen(false);
    setActiveTab('accueil');
    setOpenTabs([{ id: 'accueil', label: 'Accueil', icon: LuHouse, closable: false }]);
    setActiveSection(null);
  };

  // Confirm modal
  const [confirmModal, setConfirmModal] = useState<{
    open: boolean;
    title: string;
    message: string;
    variant: 'danger' | 'archive' | 'warning';
    confirmLabel?: string;
    onConfirm: () => void;
  }>({ open: false, title: '', message: '', variant: 'danger', onConfirm: () => {} });

  const cloturerExercice = (exId: number): void => {
    setConfirmModal({
      open: true,
      title: 'Clôturer l\'exercice',
      message: 'Les écritures ne pourront plus être modifiées après la clôture. Confirmer ?',
      variant: 'warning',
      confirmLabel: 'Clôturer',
      onConfirm: async () => {
        setConfirmModal(prev => ({ ...prev, open: false }));
        try {
          const res: Response = await fetch(`/api/balance/exercice/${exId}/cloturer`, { method: 'PUT' });
          if (res.ok) {
            const updated: Exercice = await res.json();
            setExercices((prev: Exercice[]) => prev.map(e => e.id === exId ? updated : e));
          }
        } catch { /* silently */ }
      },
    });
  };

  const rouvrirExercice = (exId: number): void => {
    setConfirmModal({
      open: true,
      title: 'Rouvrir l\'exercice',
      message: 'L\'exercice sera de nouveau modifiable. Confirmer ?',
      variant: 'warning',
      confirmLabel: 'Rouvrir',
      onConfirm: async () => {
        setConfirmModal(prev => ({ ...prev, open: false }));
        try {
          const res: Response = await fetch(`/api/balance/exercice/${exId}/rouvrir`, { method: 'PUT' });
          if (res.ok) {
            const updated: Exercice = await res.json();
            setExercices((prev: Exercice[]) => prev.map(e => e.id === exId ? updated : e));
          }
        } catch { /* silently */ }
      },
    });
  };

  const currentExStatut: string = exercices.find((e: Exercice) => e.id === exerciceId)?.statut || 'ouvert';

  // Menu items
  const buildMenuItems = (): MenuItem[] => {
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
  };

  const MENU_ITEMS: MenuItem[] = buildMenuItems();

  const findMenuItem = (id: string): { label: string; icon: React.ComponentType<{ size?: number }> } => {
    for (const item of MENU_ITEMS) {
      if (item.id === id) return { label: item.label, icon: item.icon };
      if (item.children) {
        const child: MenuChild | undefined = item.children.find((c: MenuChild) => c.id === id);
        if (child) return { label: child.label, icon: child.icon || LuFileText };
      }
    }
    const etat: EtatFinancier | undefined = etats.find((e: EtatFinancier) => e.id === id);
    if (etat) return { label: etat.titre, icon: etat.navIcon };
    return { label: id, icon: LuFileText };
  };

  const openTab = (id: string): void => {
    setActiveTab(id);
    setOpenTabs((prev: TabItem[]) => {
      if (prev.some((t: TabItem) => t.id === id)) return prev;
      const info = findMenuItem(id);
      return [...prev, { id, label: info.label, icon: info.icon, closable: true }];
    });
  };

  const closeTab = (id: string): void => {
    setOpenTabs((prev: TabItem[]) => {
      const next: TabItem[] = prev.filter((t: TabItem) => t.id !== id);
      if (activeTab === id) {
        setActiveTab(next.length > 0 ? next[next.length - 1].id : 'accueil');
      }
      return next;
    });
  };

  const handleMenuClick = (item: MenuItem): void => {
    if (item.hasArrow) {
      if (activeSection === item.id) {
        setActiveSection(null);
      } else {
        setActiveSection(item.id);
        if (item.children && item.children.length > 0) {
          const first: MenuChild | undefined = item.children.find((c: MenuChild) => !c.isHeader);
          if (first) openTab(first.id);
        }
      }
    } else {
      openTab(item.id);
      setActiveSection(null);
    }
  };

  const getParentSection = (): string | null => {
    for (const item of MENU_ITEMS) {
      if (item.children) {
        if (item.children.some((c: MenuChild) => c.id === activeTab)) return item.id;
      }
    }
    return null;
  };
  const parentSection: string | null = getParentSection();

  // Dossier selector (shared between portail + paie)
  const renderDossierSelector = (): React.ReactElement => (
    <div className="dossier-switcher-wrapper" ref={dossierSwitcherRef}>
      <button className="dossier-switcher-btn" onClick={() => setDossierSwitcherOpen(!dossierSwitcherOpen)}>
        <LuBriefcase size={14} />
        <span>{entiteName || 'Mon Entité'}</span>
        {entites.length > 1 && <LuChevronDown size={12} />}
      </button>
      {dossierSwitcherOpen && entites.length > 1 && (
        <div className="dossier-switcher-dropdown">
          <div className="module-switcher-header">{cabinetName ? cabinetName.toUpperCase() : 'DOSSIERS'}</div>
          {entites.map((ent: Entite) => (
            <button
              key={ent.id}
              className={`module-switcher-item ${ent.id === entiteId ? 'active' : ''}`}
              onClick={() => { onSwitchEntite(ent); setDossierSwitcherOpen(false); setActiveModule(null); }}
            >
              <LuBriefcase size={14} />
              <span>{ent.nom}</span>
              <span style={{ fontSize: 10, color: '#999', marginLeft: 'auto' }}>{getTypeLabel(ent.type_activite)}</span>
            </button>
          ))}
          <button
            className="module-switcher-item"
            style={{ borderTop: '1px solid #e5e7eb', color: '#D4A843', fontWeight: 600 }}
            onClick={() => { setDossierSwitcherOpen(false); openTab('nouveau_dossier'); }}
          >
            + Nouveau dossier
          </button>
        </div>
      )}
    </div>
  );

  // Shared topbar props
  const topbarProps = {
    userName, userId,
    activeModule,
    moduleSwitcherOpen, setModuleSwitcherOpen,
    userMenuOpen, setUserMenuOpen,
    moduleSwitcherRef, userMenuRef,
    moduleList: MODULE_LIST,
    hasModule,
    onSwitchModule: switchModule,
    onGoToPortail: () => setActiveModule(null),
    onLogout,
  };

  // Shared exercice selector props
  const exerciceSelectorProps = {
    exercices, exerciceId, exerciceLoading, currentExStatut,
    onSelectExercice: (id: number) => setExerciceId(id),
    onOpenExerciceModal: openExerciceModal,
    onCloturerExercice: cloturerExercice,
    onRouvrirExercice: rouvrirExercice,
  };

  // Shared confirm modal rendering
  const confirmModalElement = (
    <ConfirmModal
      open={confirmModal.open}
      title={confirmModal.title}
      message={confirmModal.message}
      variant={confirmModal.variant}
      confirmLabel={confirmModal.confirmLabel}
      onConfirm={confirmModal.onConfirm}
      onCancel={() => setConfirmModal(prev => ({ ...prev, open: false }))}
    />
  );

  // ==================== PORTAIL (no module selected) ====================
  if (!activeModule) {
    return (
      <div className="dashboard">
        <Topbar {...topbarProps} moduleLabel="AI" dossierSelector={renderDossierSelector()} />
        <div className="portail-body portail-body-full">
          <GestionClients
            entites={entites}
            cabinetId={cabinetId}
            currentEntiteId={entiteId}
            onSelectEntite={(ent: Entite) => { onSwitchEntite(ent); }}
            onEntiteCreated={onEntiteCreated}
            onEntiteUpdated={onEntiteUpdated}
            onEntiteDeleted={onEntiteDeleted}
            onOpenModule={(ent: Entite, mod: NormxModule) => { onSwitchEntite(ent); setTimeout(() => switchModule(mod), 100); }}
          />
        </div>
        <ExerciceModal
          show={showExerciceModal}
          onClose={() => setShowExerciceModal(false)}
          onCreate={createExercice}
          loading={exerciceLoading}
          error={exerciceError}
          dateDebut={newExDateDebut}
          dateFin={newExDateFin}
          onDateDebutChange={setNewExDateDebut}
          onDateFinChange={setNewExDateFin}
          dureeMois={calcDureeMois(newExDateDebut, newExDateFin)}
        />
        {confirmModalElement}
      </div>
    );
  }

  // ==================== MODULE PAIE ====================
  if (activeModule === 'paie') {
    return (
      <div className="dashboard">
        <Topbar {...topbarProps} moduleLabel="Paie" dossierSelector={renderDossierSelector()} />
        <div style={{ flex: 1, overflow: 'auto' }}>
          <Paie cabinetId={entiteId} />
        </div>
        {confirmModalElement}
      </div>
    );
  }

  // ==================== MODULE COMPTA / ETATS ====================
  const moduleLabel: string = activeModule === 'compta' ? 'Comptabilité' : 'États';

  return (
    <div className="dashboard">
      <Topbar
        {...topbarProps}
        moduleLabel={moduleLabel}
        entiteName={entiteName}
        typeActivite={typeActivite}
        showCompanyInfo
      />

      <div className="dashboard-body">
        <ComptaSidebar
          menuItems={MENU_ITEMS}
          activeTab={activeTab}
          activeSection={activeSection}
          parentSection={parentSection}
          sidebarCollapsed={sidebarCollapsed}
          moduleLabel={moduleLabel}
          onToggleSidebar={() => setSidebarCollapsed(!sidebarCollapsed)}
          onMenuClick={handleMenuClick}
          onChildClick={openTab}
          onCloseSection={() => setActiveSection(null)}
        />

        <MainContent
          activeTab={activeTab}
          activeModule={activeModule}
          userName={userName}
          userId={userId}
          entiteId={entiteId}
          entiteName={entiteName}
          entiteSigle={entiteSigle}
          entiteAdresse={entiteAdresse}
          entiteNif={entiteNif}
          typeActivite={typeActivite}
          offre={offre}
          etats={etats}
          moduleLabel={moduleLabel}
          openTab={openTab}
          onEntiteUpdated={onEntiteUpdated}
          {...exerciceSelectorProps}
        />
      </div>

      <TabsBar
        openTabs={openTabs}
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        onCloseTab={closeTab}
      />

      <ExerciceModal
        show={showExerciceModal}
        onClose={() => setShowExerciceModal(false)}
        onCreate={createExercice}
        loading={exerciceLoading}
        error={exerciceError}
        dateDebut={newExDateDebut}
        dateFin={newExDateFin}
        onDateDebutChange={setNewExDateDebut}
        onDateFinChange={setNewExDateFin}
        dureeMois={calcDureeMois(newExDateDebut, newExDateFin)}
      />
      {confirmModalElement}
      <FloatingCalculator />
    </div>
  );
}

export default Dashboard;
