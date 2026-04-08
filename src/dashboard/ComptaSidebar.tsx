import React from 'react';
import { LuChevronLeft, LuChevronRight, LuFileText } from 'react-icons/lu';
import { MenuItem, MenuChild } from './types';

interface ComptaSidebarProps {
  menuItems: MenuItem[];
  activeTab: string;
  activeSection: string | null;
  parentSection: string | null;
  sidebarCollapsed: boolean;
  moduleLabel: string;
  onToggleSidebar: () => void;
  onMenuClick: (item: MenuItem) => void;
  onChildClick: (childId: string) => void;
  onCloseSection: () => void;
}

function ComptaSidebar({
  menuItems, activeTab, activeSection, parentSection,
  sidebarCollapsed, moduleLabel,
  onToggleSidebar, onMenuClick, onChildClick, onCloseSection,
}: ComptaSidebarProps): React.ReactElement {
  return (
    <>
      {/* Sidebar principale */}
      <aside className={`compta-sidebar ${sidebarCollapsed ? 'collapsed' : ''}`}>
        <div className="compta-sidebar-header">
          {!sidebarCollapsed && <span className="compta-sidebar-title">Navigation</span>}
        </div>

        <button className="compta-sidebar-toggle" onClick={onToggleSidebar}>
          {sidebarCollapsed ? <LuChevronRight /> : <LuChevronLeft />}
        </button>

        <nav className="compta-sidebar-nav">
          {menuItems.map((item: MenuItem) => {
            const IconComp: React.ComponentType<{ size?: number }> = item.icon;
            const isParentActive: boolean = parentSection === item.id;
            return (
              <div key={item.id}>
                <button
                  className={`compta-nav-item ${activeTab === item.id || isParentActive || activeSection === item.id ? 'active' : ''} ${item.disabled ? 'disabled' : ''}`}
                  onClick={() => { if (!item.disabled) onMenuClick(item); }}
                  title={item.disabled ? 'Créez un exercice pour accéder à cette section' : ''}
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
              </div>
            );
          })}
        </nav>

        {!sidebarCollapsed && (
          <div className="compta-sidebar-bottom">
            <img src="/logo-carre-dark.png" alt="NORMX Finance" style={{ height: 28, width: 'auto', marginRight: 6, verticalAlign: 'middle' }} />
            {moduleLabel}
          </div>
        )}
      </aside>

      {/* Sidebar 2 : sous-menus */}
      {activeSection && (() => {
        const section: MenuItem | undefined = menuItems.find((m: MenuItem) => m.id === activeSection);
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
                    <div key={child.id} style={{ padding: '10px 14px 4px', fontSize: 11, fontWeight: 700, color: '#888', textTransform: 'uppercase', letterSpacing: 0.5, borderTop: child.id !== '_compta_gen' ? '1px solid #eee' : 'none', marginTop: child.id !== '_compta_gen' ? 6 : 0 }}>
                      {child.label}
                    </div>
                  );
                }
                const ChildIcon: React.ComponentType<{ size?: number }> = child.icon || LuFileText;
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
          </aside>
        );
      })()}
    </>
  );
}

export default ComptaSidebar;
