import React from 'react';
import { LuChevronLeft, LuChevronRight, LuFileText, LuPlus } from 'react-icons/lu';
import { MenuItem, MenuChild } from './types';
import { groupMenuItems } from './menuGroups';
import { useReferentiel } from '../contexts/ReferentielContext';

interface ComptaSidebarProps {
  menuItems: MenuItem[];
  activeTab: string;
  activeSection: string | null;
  parentSection: string | null;
  sidebarCollapsed: boolean;
  moduleLabel: string;
  entiteName: string;
  userName: string;
  exerciceAnnee?: number;
  canCreateEcriture: boolean;
  onCreateEcriture: () => void;
  onToggleSidebar: () => void;
  onMenuClick: (item: MenuItem) => void;
  onChildClick: (childId: string) => void;
  onCloseSection: () => void;
}

const initials = (name: string): string => {
  const parts = (name || '').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

function ComptaSidebar({
  menuItems, activeTab, activeSection, parentSection,
  sidebarCollapsed, moduleLabel,
  entiteName, userName, exerciceAnnee,
  canCreateEcriture, onCreateEcriture,
  onToggleSidebar, onMenuClick, onChildClick, onCloseSection,
}: ComptaSidebarProps): React.ReactElement {
  const { label: referentielLabel } = useReferentiel();
  const grouped = groupMenuItems(menuItems);
  const entiteInitials = initials(entiteName);
  const userInitials = initials(userName);
  const metaParts = [referentielLabel, exerciceAnnee].filter(Boolean).join(' · ');

  return (
    <>
      <aside className={`compta-sidebar ${sidebarCollapsed ? 'collapsed' : ''}`}>
        {/* Switcher societe */}
        <div className="compta-sidebar-society">
          <div className="compta-society-trigger" title={entiteName}>
            <div className="compta-society-avatar">{entiteInitials}</div>
            {!sidebarCollapsed && (
              <div className="compta-society-info">
                <div className="compta-society-name">{entiteName || '—'}</div>
                {metaParts && <div className="compta-society-meta">{metaParts}</div>}
              </div>
            )}
            {!sidebarCollapsed && (
              <button
                type="button"
                className="compta-sidebar-toggle"
                onClick={onToggleSidebar}
                aria-label="Réduire le menu"
                title="Réduire le menu"
              >
                <LuChevronLeft size={16} />
              </button>
            )}
          </div>
          {sidebarCollapsed && (
            <button
              type="button"
              className="compta-sidebar-toggle compta-sidebar-toggle-collapsed"
              onClick={onToggleSidebar}
              aria-label="Déplier le menu"
              title="Déplier le menu"
            >
              <LuChevronRight size={16} />
            </button>
          )}
        </div>

        {/* CTA Nouvelle ecriture */}
        {canCreateEcriture && (
          <div className="compta-sidebar-cta">
            <button
              type="button"
              className="compta-cta-primary"
              onClick={onCreateEcriture}
              title="Nouvelle écriture"
            >
              <LuPlus size={16} />
              {!sidebarCollapsed && <span>Nouvelle écriture</span>}
            </button>
          </div>
        )}

        {/* Groupes de menus */}
        <nav className="compta-sidebar-nav">
          {grouped.map(g => (
            <div key={g.group} className="compta-nav-group">
              {!sidebarCollapsed && <div className="compta-nav-group-label">{g.label}</div>}
              {g.items.map(item => {
                const IconComp = item.icon;
                const isParentActive = parentSection === item.id;
                const isActive = activeTab === item.id || isParentActive || activeSection === item.id;
                return (
                  <button
                    key={item.id}
                    className={`compta-nav-item ${isActive ? 'active' : ''} ${item.disabled ? 'disabled' : ''}`}
                    onClick={() => { if (!item.disabled) onMenuClick(item); }}
                    title={item.disabled ? 'Créez un exercice pour accéder à cette section' : item.label}
                  >
                    <span className="compta-nav-icon"><IconComp /></span>
                    {!sidebarCollapsed && (
                      <>
                        <span className="compta-nav-label">{item.label}</span>
                        {item.hasArrow && (
                          <span className="compta-nav-arrow">
                            <LuChevronRight size={14} />
                          </span>
                        )}
                      </>
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </nav>

        {/* Footer profil utilisateur */}
        <div className="compta-sidebar-profile">
          <div className="compta-profile-avatar">{userInitials}</div>
          {!sidebarCollapsed && (
            <div className="compta-profile-info">
              <div className="compta-profile-name">{userName || 'Utilisateur'}</div>
              <div className="compta-profile-meta">{moduleLabel}</div>
            </div>
          )}
        </div>
      </aside>

      {/* Sidebar 2 : sous-menus */}
      {activeSection && (() => {
        const section = menuItems.find((m) => m.id === activeSection);
        if (!section || !section.children) return null;
        return (
          <aside className="compta-sidebar-2">
            <div className="sidebar-2-header">
              <span className="sidebar-2-title">{section.label}</span>
            </div>
            <nav className="sidebar-2-nav">
              {section.children.map((child: MenuChild) => {
                if (child.isHeader) {
                  return (
                    <div key={child.id} className="sidebar-2-section-header" data-first={child.id === '_compta_gen' || undefined}>
                      {child.label}
                    </div>
                  );
                }
                const ChildIcon = child.icon || LuFileText;
                return (
                  <button
                    key={child.id}
                    className={`sidebar-2-item ${activeTab === child.id ? 'active' : ''}`}
                    onClick={() => { onChildClick(child.id); }}
                  >
                    <span className="sidebar-2-icon"><ChildIcon size={15} /></span>
                    <span>{child.label}</span>
                  </button>
                );
              })}
            </nav>
            <button
              type="button"
              className="sidebar-2-close"
              onClick={onCloseSection}
              aria-label="Fermer le sous-menu"
            >
              <LuChevronLeft size={14} /> Fermer
            </button>
          </aside>
        );
      })()}
    </>
  );
}

export default ComptaSidebar;
