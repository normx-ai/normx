import React from 'react';
import { LuUsers, LuBuilding2 } from 'react-icons/lu';

export type PortailSection = 'clients' | 'cabinet';

interface PortailSidebarProps {
  active: PortailSection;
  onChange: (section: PortailSection) => void;
  cabinetNom: string;
}

export default function PortailSidebar({ active, onChange, cabinetNom }: PortailSidebarProps): React.ReactElement {
  return (
    <aside className="portail-sidebar">
      <div className="portail-sidebar-header">
        <span className="portail-sidebar-title">Espace cabinet</span>
      </div>
      <nav className="portail-sidebar-nav">
        <button
          className={`portail-sidebar-item ${active === 'clients' ? 'active' : ''}`}
          onClick={() => onChange('clients')}
        >
          <LuUsers size={16} />
          <span>Clients et dossiers</span>
        </button>
        <button
          className={`portail-sidebar-item ${active === 'cabinet' ? 'active' : ''}`}
          onClick={() => onChange('cabinet')}
        >
          <LuBuilding2 size={16} />
          <span>Mon cabinet</span>
        </button>
      </nav>
      <div className="portail-sidebar-footer">{cabinetNom}</div>
    </aside>
  );
}
