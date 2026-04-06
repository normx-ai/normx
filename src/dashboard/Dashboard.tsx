import React, { useState, useEffect, useRef, Suspense, lazy } from 'react';
import { LuHouse, LuFileText } from 'react-icons/lu';
const Paie = lazy(() => import('../paie/Paie'));
import GestionClients from './GestionClients';
import { TypeActivite, Offre, NormxModule, EtatFinancier, Entite } from '../types';
import { MenuItem, MenuChild, TabItem } from './types';
import ConfirmModal from '../components/ConfirmModal';
import Topbar from './Topbar';
import { ExerciceModal } from './ExerciceManager';
import ComptaSidebar from './ComptaSidebar';
import TabsBar from './TabsBar';
import MainContent from './MainContent';
import FloatingCalculator from '../components/FloatingCalculator';
import DossierSelector from './DossierSelector';
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
  const [activeModule, setActiveModule] = useState<NormxModule | null>(() => {
    const params = new URLSearchParams(window.location.search);
    const mod = params.get('module') || sessionStorage.getItem('normx_redirect_module');
    sessionStorage.removeItem('normx_redirect_module');
    if (mod === 'compta' || mod === 'etats' || mod === 'paie') {
      window.history.replaceState({}, '', window.location.pathname);
      return mod;
    }
    // Cabinet : rester sur le portail (null = page clients/dossiers)
    if (isCabinet) return null;
    // Non-cabinet : aller directement sur le premier module disponible
    if (modules.length > 0) return modules[0];
    return null;
  });
  const [moduleSwitcherOpen, setModuleSwitcherOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const moduleSwitcherRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const [activeTab, setActiveTab] = useState('accueil');
  const [openTabs, setOpenTabs] = useState<TabItem[]>([{ id: 'accueil', label: 'Accueil', icon: LuHouse, closable: false }]);
  const [activeSection, setActiveSection] = useState<string | null>(null);

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

  const availableModules: NormxModule[] = modules.length > 0 ? modules : ['etats'];
  const hasModule = (mod: NormxModule): boolean => {
    if (!availableModules.includes(mod)) return false;
    if (mod === 'etats' && availableModules.includes('compta')) return false;
    return true;
  };
  const etats: EtatFinancier[] = getEtats(typeActivite);

  const switchModule = (mod: NormxModule): void => {
    setActiveModule(mod);
    setModuleSwitcherOpen(false);
    setActiveTab('accueil');
    setOpenTabs([{ id: 'accueil', label: 'Accueil', icon: LuHouse, closable: false }]);
    setActiveSection(null);
  };

  // Menu items
  const MENU_ITEMS: MenuItem[] = buildMenuItems({ activeModule, typeActivite, exerciceId: ex.exerciceId, etats });

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
      if (prev.some(t => t.id === id)) return prev;
      const info = findMenuItem(id);
      return [...prev, { id, label: info.label, icon: info.icon, closable: true }];
    });
  };

  const closeTab = (id: string): void => {
    setOpenTabs((prev: TabItem[]) => {
      const next = prev.filter(t => t.id !== id);
      if (activeTab === id) setActiveTab(next.length > 0 ? next[next.length - 1].id : 'accueil');
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

  // Dossier selector
  const dossierSelector = (
    <DossierSelector
      entiteName={entiteName} entiteId={entiteId} entites={entites}
      onSwitchEntite={(ent: Entite) => { onSwitchEntite(ent); setActiveModule(null); }}
      onNewDossier={() => openTab('nouveau_dossier')}
    />
  );

  const topbarProps = {
    userName, userId, activeModule,
    moduleSwitcherOpen, setModuleSwitcherOpen,
    userMenuOpen, setUserMenuOpen,
    moduleSwitcherRef, userMenuRef,
    moduleList: MODULE_LIST, hasModule,
    onSwitchModule: switchModule,
    onGoToPortail: () => setActiveModule(null),
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

  // Si modules changent (ex: switch client), re-selectionner le premier module pour non-cabinet
  useEffect(() => {
    if (!activeModule && !isCabinet && modules.length > 0) setActiveModule(modules[0]);
  }, [modules]); // eslint-disable-line

  // Reset module if not available after client switch
  useEffect(() => {
    if (activeModule && modules.length > 0 && !modules.includes(activeModule)) {
      if (activeModule === 'etats' && modules.includes('compta')) return;
      setActiveModule(null);
    }
  }, [modules, activeModule]);

  // ==================== CHARGEMENT ====================
  if (!activeModule && !isCabinet && modules.length === 0) {
    return (
      <div className="dashboard" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#faf8f5' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: 48, height: 48, borderRadius: 12, background: '#D4A843', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', fontSize: 24, fontWeight: 900, color: '#0F2A42', animation: 'pulse 1.5s infinite' }}>N</div>
          <p style={{ color: '#6b7280', fontSize: 14 }}>Chargement des modules...</p>
        </div>
      </div>
    );
  }

  // ==================== PORTAIL (Cabinet) ====================
  if (!activeModule) {
    return (
      <div className="dashboard">
        <Topbar {...topbarProps} moduleLabel="AI" dossierSelector={dossierSelector} />
        <div className="portail-body portail-body-full">
          <GestionClients
            entites={entites} currentEntiteId={entiteId}
            onSelectEntite={(ent: Entite) => { onSwitchEntite(ent); }}
            onEntiteCreated={onEntiteCreated} onEntiteUpdated={onEntiteUpdated} onEntiteDeleted={onEntiteDeleted}
            onOpenModule={(ent: Entite, mod: NormxModule) => { onSwitchEntite(ent); setTimeout(() => switchModule(mod), 100); }}
          />
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
  );
}

export default Dashboard;
