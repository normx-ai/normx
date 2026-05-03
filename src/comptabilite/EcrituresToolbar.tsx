import React from 'react';
import { LuSearch, LuColumns3, LuDownload } from 'react-icons/lu';
import type { StatutTab } from './SaisieJournal.types';

export interface EcrituresToolbarProps {
  searchTerm: string;
  setSearchTerm: (v: string) => void;
  activeTab: StatutTab;
  setActiveTab: (t: StatutTab) => void;
  countAll: number;
  countBrouillard: number;
  countValidee: number;
}

interface TabDef { key: StatutTab; label: string; count: number }

function EcrituresToolbar({
  searchTerm,
  setSearchTerm,
  activeTab,
  setActiveTab,
  countAll,
  countBrouillard,
  countValidee,
}: EcrituresToolbarProps): React.JSX.Element {
  const tabs: TabDef[] = [
    { key: 'all', label: 'Toutes', count: countAll },
    { key: 'brouillard', label: 'Brouillard', count: countBrouillard },
    { key: 'validee', label: 'Validées', count: countValidee },
  ];

  return (
    <div className="saisie-table-toolbar">
      <div className="saisie-toolbar-tabs" role="tablist">
        {tabs.map(t => (
          <button
            key={t.key}
            type="button"
            role="tab"
            aria-selected={activeTab === t.key}
            className={'saisie-toolbar-tab' + (activeTab === t.key ? ' active' : '')}
            onClick={() => setActiveTab(t.key)}
          >
            {t.label} <span className="saisie-toolbar-count">{t.count}</span>
          </button>
        ))}
      </div>
      <div className="saisie-toolbar-actions">
        <div className="saisie-toolbar-search">
          <LuSearch />
          <input
            type="text"
            value={searchTerm}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
            placeholder="Rechercher pièce, libellé, compte…"
          />
        </div>
        <button type="button" className="saisie-icon-btn" title="Colonnes">
          <LuColumns3 size={16} />
        </button>
        <button type="button" className="saisie-icon-btn" title="Exporter">
          <LuDownload size={16} />
        </button>
      </div>
    </div>
  );
}

export default EcrituresToolbar;
