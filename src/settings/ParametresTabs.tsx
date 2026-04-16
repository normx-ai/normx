import React, { useState } from 'react';
import { LuUser, LuBookOpen, LuFileText, LuReceipt } from 'react-icons/lu';
import ParametresEntite from './ParametresEntite';
import PlanComptableTab from './PlanComptableTab';
import JournauxTab from './JournauxTab';
import TvaTab from './TvaTab';

type TabId = 'identification' | 'plan_comptable' | 'journaux' | 'tva';

interface Tab {
  id: TabId;
  label: string;
  icon: React.ComponentType<{ size?: number }>;
}

const TABS: Tab[] = [
  { id: 'identification', label: 'Identification', icon: LuUser },
  { id: 'plan_comptable', label: 'Plan comptable', icon: LuBookOpen },
  { id: 'journaux', label: 'Journaux', icon: LuFileText },
  { id: 'tva', label: 'TVA', icon: LuReceipt },
];

interface ParametresTabsProps {
  entiteId: number;
  onUpdate?: (data: Record<string, string>) => void;
}

export default function ParametresTabs({ entiteId, onUpdate }: ParametresTabsProps): React.ReactElement {
  const [active, setActive] = useState<TabId>('identification');

  return (
    <div style={{ maxWidth: 1120, margin: '0 auto', padding: '20px 24px' }}>
      <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: '#1a1a1a', marginBottom: 20 }}>
        Paramètres du dossier
      </h2>

      <div style={{ display: 'flex', gap: 4, borderBottom: '2px solid #e5e7eb', marginBottom: 24 }}>
        {TABS.map(t => {
          const Icon = t.icon;
          const isActive = active === t.id;
          return (
            <button key={t.id} onClick={() => setActive(t.id)} style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '10px 18px', background: 'transparent', border: 'none',
              borderBottom: isActive ? '3px solid #D4A843' : '3px solid transparent',
              marginBottom: -2, cursor: 'pointer',
              fontSize: 14, fontWeight: isActive ? 700 : 500,
              color: isActive ? '#0F2A42' : '#6b7280',
            }}>
              <Icon size={16} />
              {t.label}
            </button>
          );
        })}
      </div>

      <div>
        {active === 'identification' && <ParametresEntite entiteId={entiteId} onUpdate={onUpdate} />}
        {active === 'plan_comptable' && <PlanComptableTab />}
        {active === 'journaux' && <JournauxTab />}
        {active === 'tva' && <TvaTab />}
      </div>
    </div>
  );
}
