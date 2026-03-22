import React from 'react';
import { LuX } from 'react-icons/lu';
import { TabItem } from './types';

interface TabsBarProps {
  openTabs: TabItem[];
  activeTab: string;
  onSelectTab: (id: string) => void;
  onCloseTab: (id: string) => void;
}

function TabsBar({ openTabs, activeTab, onSelectTab, onCloseTab }: TabsBarProps): React.ReactElement | null {
  if (openTabs.length <= 1) return null;
  return (
    <div className="tabs-bar-bottom">
      {openTabs.map((tab: TabItem) => {
        const TabIcon: React.ComponentType<{ size?: number }> = tab.icon;
        return (
          <div
            key={tab.id}
            className={`tab-item ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => onSelectTab(tab.id)}
          >
            <TabIcon size={14} />
            <span className="tab-label">{tab.label}</span>
            {tab.closable && (
              <button
                className="tab-close"
                onClick={(e: React.MouseEvent<HTMLButtonElement>) => { e.stopPropagation(); onCloseTab(tab.id); }}
              >
                <LuX size={12} />
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}

export default TabsBar;
