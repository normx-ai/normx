import React, { useRef, useState, useEffect } from 'react';
import { LuBriefcase, LuChevronDown } from 'react-icons/lu';
import { Entite } from '../types';
import { getTypeLabel } from './constants';

interface DossierSelectorProps {
  entiteName: string;
  entiteId: number;
  entites: Entite[];
  onSwitchEntite: (entite: Entite) => void;
  onNewDossier: () => void;
}

export default function DossierSelector({ entiteName, entiteId, entites, onSwitchEntite, onNewDossier }: DossierSelectorProps): React.ReactElement {
  const [open, setOpen] = useState<boolean>(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent): void => {
      if (open && ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  return (
    <div className="dossier-switcher-wrapper" ref={ref}>
      <button className="dossier-switcher-btn" onClick={() => setOpen(!open)}>
        <LuBriefcase size={14} />
        <span>{entiteName || 'Mon Entité'}</span>
        {entites.length > 1 && <LuChevronDown size={12} />}
      </button>
      {open && entites.length > 1 && (
        <div className="dossier-switcher-dropdown">
          <div className="module-switcher-header">{'DOSSIERS'}</div>
          {entites.map((ent: Entite) => (
            <button
              key={ent.id}
              className={`module-switcher-item ${ent.id === entiteId ? 'active' : ''}`}
              onClick={() => { onSwitchEntite(ent); setOpen(false); }}
            >
              <LuBriefcase size={14} />
              <span>{ent.nom}</span>
              <span style={{ fontSize: 10, color: '#999', marginLeft: 'auto' }}>{getTypeLabel(ent.type_activite)}</span>
            </button>
          ))}
          <button
            className="module-switcher-item"
            style={{ borderTop: '1px solid #e5e7eb', color: '#D4A843', fontWeight: 600 }}
            onClick={() => { setOpen(false); onNewDossier(); }}
          >
            + Nouveau dossier
          </button>
        </div>
      )}
    </div>
  );
}
