import React from 'react';
import { LuHouse } from 'react-icons/lu';
import { NormxModule } from '../types';
import { ModuleInfo } from './types';

interface ModuleSwitcherDropdownProps {
  modules: ModuleInfo[];
  activeModule: NormxModule | null;
  hasModule: (mod: NormxModule) => boolean;
  onSwitch: (mod: NormxModule) => void;
  onGoToPortail: () => void;
  showPortailLink: boolean;
}

function ModuleSwitcherDropdown({ modules, activeModule, hasModule, onSwitch, onGoToPortail, showPortailLink }: ModuleSwitcherDropdownProps): React.ReactElement {
  return (
    <div className="module-switcher-dropdown">
      {showPortailLink && (
        <button
          className="module-switcher-item module-switcher-portail"
          onClick={onGoToPortail}
        >
          <LuHouse size={16} />
          <span>Clients et dossiers</span>
        </button>
      )}
      <div className="module-switcher-header">
        {showPortailLink ? "CHANGER D'APPLICATION" : 'OUVRIR UNE APPLICATION'}
      </div>
      {modules.filter(m => hasModule(m.id)).map(mod => {
        const ModIcon: React.ComponentType<{ size?: number }> = mod.icon;
        return (
          <button
            key={mod.id}
            className={`module-switcher-item ${mod.id === activeModule ? 'active' : ''}`}
            onClick={() => onSwitch(mod.id)}
          >
            <ModIcon size={16} />
            <span>{mod.label}</span>
          </button>
        );
      })}
    </div>
  );
}

export default ModuleSwitcherDropdown;
