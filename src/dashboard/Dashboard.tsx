import React, { useState, useEffect, useRef, useCallback, Suspense, lazy } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { LuHouse, LuFileText } from 'react-icons/lu';
import { ReferentielProvider } from '../contexts/ReferentielContext';
const Paie = lazy(() => import('../paie/Paie'));
import GestionClients from './GestionClients';
import { TypeActivite, Offre, NormxModule, EtatFinancier, Entite } from '../types';
import { ENABLED_MODULES, isModuleEnabled } from '../config/modules';
import { MenuItem, MenuChild, TabItem } from './types';
import ConfirmModal from '../components/ConfirmModal';
import Topbar from './Topbar';
import { ExerciceModal } from './ExerciceManager';
import ComptaSidebar from './ComptaSidebar';
import TabsBar from './TabsBar';
import MainContent from './MainContent';
import FloatingCalculator from '../components/FloatingCalculator';
import DossierSelector from './DossierSelector';
import PortailSidebar, { PortailSection } from './PortailSidebar';
import CabinetPanel from './CabinetPanel';
import { MODULE_LIST, getEtats } from './constants';
import { buildMenuItems } from './menuConfig';
import { useExercices } from './useExercices';
import './Dashboard.css';

interface DashboardProps {
  userName: string;
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

function Dashboard({ userName, isCabinet = false, entiteName, entiteId, userId, typeActivite, offre = 'comptabilite', modules = [], entiteSigle = '', entiteAdresse = '', entiteNif = '', entites = [], onSwitchEntite, onEntiteCreated, onEntiteUpdated, onEntiteDeleted, onLogout }: DashboardProps): React.ReactElement {
  const navigate = useNavigate();
  const location = useLocation();
  const urlParams = useParams<{ module?: string; tab?: string }>();

  // ---- Navigation URL-driven : l'URL est la source de verite ----
  // /app/portail          → portail cabinet, clients list
  // /app/portail/cabinet  → portail cabinet, panel "Mon cabinet"
  // /app/:module/:tab     → module (compta|etats|paie) + tab (accueil|journal|balance|...)
  const enabledModules: NormxModule[] = modules.filter((m) => isModuleEnabled(m));

  const activeModule: NormxModule | null = (() => {
    const mod = urlParams.module;
    if (mod && ['compta', 'etats', 'paie'].includes(mod) && isModuleEnabled(mod as NormxModule)) {
      return mod as NormxModule;
    }
    return null;
  })();

  const activeTab: string = urlParams.tab || 'accueil';

  const portailSection: PortailSection = location.pathname.includes('/portail/cabinet') ? 'cabinet' : 'clients';

  const setActiveModule = useCallback((mod: NormxModule | null) => {
    if (!mod) navigate('/app/portail');
    else navigate(`/app/${mod}/accueil`);
  }, [navigate]);

  const setActiveTab = useCallback((tab: string) => {
    if (activeModule) navigate(`/app/${activeModule}/${tab}`);
  }, [navigate, activeModule]);

  const setPortailSection = useCallback((section: PortailSection) => {
    navigate(section === 'cabinet' ? '/app/portail/cabinet' : '/app/portail');
  }, [navigate]);

  const [moduleSwitcherOpen, setModuleSwitcherOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const cabinetEntite = entites.find((e) => e.type_activite === 'cabinet');
  const clientEntites = entites.filter((e) => e.type_activite !== 'cabinet');
  const moduleSwitcherRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);

  const [openTabs, setOpenTabs] = useState<TabItem[]>(
    [{ id: 'accueil', label: 'Accueil', icon: LuHouse, closable: false }]
  );
  const [activeSection, setActiveSection] = useState<string | null>(null);

  // Synchroniser l'onglet actif avec la liste des onglets ouverts.
  // Quand l'URL change et le tab n'est pas dans openTabs, on l'ajoute.
  useEffect(() => {
    if (activeTab && activeTab !== 'accueil' && !openTabs.some(t => t.id === activeTab)) {
      setOpenTabs(prev => [...prev, { id: activeTab, label: activeTab, icon: LuFileText, closable: true }]);
    }
  }, [activeTab, openTabs]);

  // Exercice + confirm modal logic
  const ex = useExercices(entiteId);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent): void => {
      if (moduleSwitcherOpen && moduleSwitcherRef.current && !moduleSwitcherRef.current.contains(e.target as Node)) setModuleSwitcherOpen(false);
      if (userMenuOpen && userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) setUserMenuOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [moduleSwitcherOpen, userMenuOpen]);

  const availableModules: NormxModule[] = enabledModules.length > 0 ? enabledModules : ['etats'];
  const hasModule = (mod: NormxModule): boolean => {
    if (!isModuleEnabled(mod)) return false;
    if (!availableModules.includes(mod)) return false;
    if (mod === 'etats' && availableModules.includes('compta')) return false;
    return true;
  };
  const etats: EtatFinancier[] = getEtats(typeActivite);

  const switchModule = (mod: NormxModule): void => {
    if (!isModuleEnabled(mod)) return;
    setModuleSwitcherOpen(false);
    setOpenTabs([{ id: 'accueil', label: 'Accueil', icon: LuHouse, closable: false }]);
    setActiveSection(null);
    navigate(`/app/${mod}/accueil`);
  };

  // Menu items
  const MENU_ITEMS: MenuItem[] = React.useMemo(
    () => buildMenuItems({ activeModule, typeActivite, exerciceId: ex.exerciceId, etats }),
    [activeModule, typeActivite, ex.exerciceId, etats]
  );

  const findMenuItem = React.useCallback((id: string): { label: string; icon: React.ComponentType<{ size?: number }> } => {
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
  }, [MENU_ITEMS, etats]);

  // Restaurer les icones des onglets apres rechargement de page
  useEffect(() => {
    setOpenTabs(prev => prev.map(t => {
      if (t.id === 'accueil') return { ...t, icon: LuHouse };
      const info = findMenuItem(t.id);
      return { ...t, icon: info.icon, label: info.label };
    }));
  }, [activeModule, findMenuItem]);

  const openTab = (id: string): void => {
    if (activeModule) {
      navigate(`/app/${activeModule}/${id}`);
    }
    setOpenTabs((prev: TabItem[]) => {
      if (prev.some(t => t.id === id)) return prev;
      const info = findMenuItem(id);
      return [...prev, { id, label: info.label, icon: info.icon, closable: true }];
    });
  };

  const closeTab = (id: string): void => {
    setOpenTabs((prev: TabItem[]) => {
      const next = prev.filter(t => t.id !== id);
      if (activeTab === id) {
        const fallback = next.length > 0 ? next[next.length - 1].id : 'accueil';
        if (activeModule) navigate(`/app/${activeModule}/${fallback}`);
      }
      return next;
    });
  };

  const handleMenuClick = (item: MenuItem): void => {
    if (item.hasArrow) {
      if (activeSection === item.id) { setActiveSection(null); }
      else {
        setActiveSection(item.id);
        if (item.children?.length) {
          const first = item.children.find(c => !c.isHeader);
          if (first) openTab(first.id);
        }
      }
    } else { openTab(item.id); setActiveSection(null); }
  };

  const parentSection: string | null = (() => {
    for (const item of MENU_ITEMS) {
      if (item.children?.some(c => c.id === activeTab)) return item.id;
    }
    return null;
  })();

  // Dossier selector — le cabinet n'est pas un dossier, on le filtre
  const dossierSelector = (
    <DossierSelector
      entiteName={entiteName} entiteId={entiteId} entites={clientEntites}
      onSwitchEntite={(ent: Entite) => { onSwitchEntite(ent); navigate('/app/portail'); }}
      onNewDossier={() => openTab('nouveau_dossier')}
    />
  );

  const topbarProps = {
    userName, userId, activeModule,
    moduleSwitcherOpen, setModuleSwitcherOpen,
    userMenuOpen, setUserMenuOpen,
    moduleSwitcherRef, userMenuRef,
    moduleList: MODULE_LIST.filter((m) => isModuleEnabled(m.id)), hasModule,
    onSwitchModule: switchModule,
    onGoToPortail: () => navigate('/app/portail'),
    onLogout, isCabinet,
  };

  const exerciceSelectorProps = {
    exercices: ex.exercices, exerciceId: ex.exerciceId, exerciceLoading: ex.exerciceLoading, currentExStatut: ex.currentExStatut,
    onSelectExercice: (id: number) => ex.setExerciceId(id),
    onOpenExerciceModal: ex.openExerciceModal,
    onCloturerExercice: ex.cloturerExercice,
    onRouvrirExercice: ex.rouvrirExercice,
  };

  const confirmModalElement = (
    <ConfirmModal
      open={ex.confirmModal.open} title={ex.confirmModal.title} message={ex.confirmModal.message}
      variant={ex.confirmModal.variant} confirmLabel={ex.confirmModal.confirmLabel}
      onConfirm={ex.confirmModal.onConfirm} onCancel={ex.closeConfirmModal}
    />
  );

  const exerciceModalElement = (
    <ExerciceModal
      show={ex.showExerciceModal} onClose={ex.closeExerciceModal}
      onCreate={ex.createExercice} loading={ex.exerciceLoading} error={ex.exerciceError}
      dateDebut={ex.newExDateDebut} dateFin={ex.newExDateFin}
      onDateDebutChange={ex.setNewExDateDebut} onDateFinChange={ex.setNewExDateFin}
      dureeMois={ex.dureeMois}
    />
  );

  // Si le module dans l'URL n'est pas disponible pour cette entite,
  // rediriger vers le portail ou le premier module actif.
  // Ne PAS rediriger tant que les modules ne sont pas charges (modules.length === 0
  // signifie que le fetch entites est encore en cours, pas que le module est invalide).
  useEffect(() => {
    if (modules.length === 0) return;
    if (activeModule && !enabledModules.includes(activeModule)) {
      const first = ENABLED_MODULES.find(m => enabledModules.includes(m));
      navigate(first ? `/app/${first}/accueil` : '/app/portail', { replace: true });
    }
  }, [activeModule, enabledModules, modules.length, navigate]);

  // ==================== CHARGEMENT ====================
  if (!activeModule && !isCabinet && modules.length === 0) {
    return (
      <div className="dashboard" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#faf8f5' }}>
        <div style={{ textAlign: 'center' }}>
          <img src="/logo-carre.png" alt="NORMX Finance" style={{ width: 80, height: 80, borderRadius: 16, display: 'block' }} />
        </div>
      </div>
    );
  }

  // ==================== PORTAIL (Cabinet) ====================
  if (!activeModule) {
    return (
      <div className="dashboard">
        <Topbar {...topbarProps} moduleLabel="AI" dossierSelector={dossierSelector} />
        <div className="portail-body portail-body-with-sidebar">
          <PortailSidebar
            active={portailSection}
            onChange={setPortailSection}
            cabinetNom={cabinetEntite?.nom || entiteName}
          />
          <div className="portail-main">
            {portailSection === 'clients' ? (
              <GestionClients
                entites={clientEntites} currentEntiteId={entiteId}
                onSelectEntite={(ent: Entite) => { onSwitchEntite(ent); }}
                onEntiteCreated={onEntiteCreated} onEntiteUpdated={onEntiteUpdated} onEntiteDeleted={onEntiteDeleted}
                onOpenModule={(ent: Entite, mod: NormxModule) => { onSwitchEntite(ent); navigate(`/app/${mod}/accueil`); }}
              />
            ) : (
              <CabinetPanel cabinet={cabinetEntite} clientsCount={clientEntites.length} />
            )}
          </div>
        </div>
        {exerciceModalElement}
        {confirmModalElement}
      </div>
    );
  }

  // ==================== PAIE ====================
  if (activeModule === 'paie') {
    return (
      <div className="dashboard">
        <Topbar {...topbarProps} moduleLabel="Paie" dossierSelector={dossierSelector} />
        <div style={{ flex: 1, overflow: 'auto' }}>
          <Suspense fallback={<div style={{ padding: 40, textAlign: 'center' }}>Chargement...</div>}>
            <Paie entiteId={entiteId} />
          </Suspense>
        </div>
        {confirmModalElement}
      </div>
    );
  }

  // ==================== COMPTA / ETATS ====================
  const moduleLabel = activeModule === 'compta' ? 'Comptabilité' : 'États';

  return (
    <ReferentielProvider typeActivite={typeActivite}>
      <div className="dashboard">
        <Topbar {...topbarProps} moduleLabel={moduleLabel} entiteName={entiteName} typeActivite={typeActivite} showCompanyInfo />
        <div className="dashboard-body">
          <ComptaSidebar
            menuItems={MENU_ITEMS} activeTab={activeTab} activeSection={activeSection}
            parentSection={parentSection} sidebarCollapsed={sidebarCollapsed} moduleLabel={moduleLabel}
            onToggleSidebar={() => setSidebarCollapsed(!sidebarCollapsed)}
            onMenuClick={handleMenuClick} onChildClick={openTab} onCloseSection={() => setActiveSection(null)}
          />
          <MainContent
            activeTab={activeTab} activeModule={activeModule} userName={userName} userId={userId}
            entiteId={entiteId} entiteName={entiteName} entiteSigle={entiteSigle}
            entiteAdresse={entiteAdresse} entiteNif={entiteNif} typeActivite={typeActivite}
            offre={offre} etats={etats} moduleLabel={moduleLabel}
            openTab={openTab} onEntiteUpdated={onEntiteUpdated} {...exerciceSelectorProps}
          />
        </div>
        <TabsBar openTabs={openTabs} activeTab={activeTab} onSelectTab={setActiveTab} onCloseTab={closeTab} />
        {exerciceModalElement}
        {confirmModalElement}
        <FloatingCalculator />
      </div>
    </ReferentielProvider>
  );
}

export default Dashboard;
