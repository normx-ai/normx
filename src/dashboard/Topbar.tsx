import React from 'react';
import {
  LuChevronDown, LuUser, LuSettings, LuLock, LuLogOut, LuBriefcase,
} from 'react-icons/lu';
import { NormxModule, Entite, TypeActivite } from '../types';
import { ModuleInfo } from './types';
import NotificationBell from '../components/NotificationBell';
import ModuleSwitcherDropdown from './ModuleSwitcherDropdown';

function getTypeLabel(typeActivite: TypeActivite): string {
  switch (typeActivite) {
    case 'entreprise': return 'Entreprise (SYSCOHADA)';
    case 'association': return 'Association';
    case 'ordre_professionnel': return 'Ordre professionnel';
    case 'projet_developpement': return 'Projet de développement';
    case 'smt': return 'Entité SMT';
    default: return 'Entité';
  }
}

interface TopbarProps {
  userName: string;
  userId: number;
  moduleLabel: string;
  activeModule: NormxModule | null;
  moduleSwitcherOpen: boolean;
  setModuleSwitcherOpen: (open: boolean) => void;
  userMenuOpen: boolean;
  setUserMenuOpen: (open: boolean) => void;
  moduleSwitcherRef: React.RefObject<HTMLDivElement | null>;
  userMenuRef: React.RefObject<HTMLDivElement | null>;
  moduleList: ModuleInfo[];
  hasModule: (mod: NormxModule) => boolean;
  onSwitchModule: (mod: NormxModule) => void;
  onGoToPortail: () => void;
  onLogout: () => void;
  isCabinet?: boolean;
  // Dossier selector (portail + paie)
  dossierSelector?: React.ReactNode;
  // Compta/etats: entité info in topbar
  entiteName?: string;
  typeActivite?: TypeActivite;
  showCompanyInfo?: boolean;
}

function Topbar({
  userName, userId, moduleLabel, activeModule,
  moduleSwitcherOpen, setModuleSwitcherOpen,
  userMenuOpen, setUserMenuOpen,
  moduleSwitcherRef, userMenuRef,
  moduleList, hasModule, onSwitchModule, onGoToPortail, onLogout,
  isCabinet = false,
  dossierSelector,
  entiteName, typeActivite, showCompanyInfo,
}: TopbarProps): React.ReactElement {
  const showPortailLink = activeModule !== null && isCabinet;
  const isComptaOrEtats = activeModule === 'compta' || activeModule === 'etats';

  return (
    <header className="topbar">
      <div className="topbar-left">
        <div className="topbar-logo">
          NORMX <span className="topbar-logo-accent">{moduleLabel}</span>
          <div className="module-switcher-wrapper" ref={moduleSwitcherRef}>
            <button className="module-switcher-btn" onClick={() => setModuleSwitcherOpen(!moduleSwitcherOpen)}>
              <LuChevronDown size={14} />
            </button>
            {moduleSwitcherOpen && (
              <ModuleSwitcherDropdown
                modules={moduleList}
                activeModule={activeModule}
                hasModule={hasModule}
                onSwitch={(mod) => { onSwitchModule(mod); setModuleSwitcherOpen(false); }}
                onGoToPortail={() => { onGoToPortail(); setModuleSwitcherOpen(false); }}
                showPortailLink={showPortailLink}
              />
            )}
          </div>
        </div>
      </div>
      <div className="topbar-right">
        <NotificationBell userId={userId} />
        <div className="topbar-user-wrapper" ref={userMenuRef}>
          <button className="topbar-user-btn" onClick={() => setUserMenuOpen(!userMenuOpen)}>
            <span className="user-avatar">{userName ? userName.charAt(0) : 'U'}</span>
            {userName || 'Utilisateur'} <LuChevronDown className="dropdown-arrow-icon" />
          </button>
          {userMenuOpen && (
            <div className="dropdown-menu user-dropdown">
              <button onClick={() => setUserMenuOpen(false)}><span className="menu-icon"><LuUser /></span> Mon profil</button>
              {isComptaOrEtats && (
                <>
                  <button onClick={() => setUserMenuOpen(false)}><span className="menu-icon"><LuSettings /></span> Paramètres</button>
                  <button onClick={() => setUserMenuOpen(false)}><span className="menu-icon"><LuLock /></span> Confidentialite</button>
                </>
              )}
              <button onClick={() => { setUserMenuOpen(false); onLogout(); }}><span className="menu-icon"><LuLogOut /></span> Se déconnecter</button>
            </div>
          )}
        </div>
        {dossierSelector}
        {showCompanyInfo && entiteName && typeActivite && (
          <>
            <span className="topbar-company">
              {entiteName || 'Mon Entité'}
              <span className={`type-badge ${typeActivite}`}>{getTypeLabel(typeActivite)}</span>
            </span>
            <button className="topbar-aide-btn">Aide</button>
          </>
        )}
      </div>
    </header>
  );
}

export default Topbar;
