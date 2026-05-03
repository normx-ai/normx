import React from 'react';
import { LuStar, LuPlus, LuX, LuFileText } from 'react-icons/lu';
import type { MenuItem, MenuChild } from './types';

export interface SidebarFavoritesProps {
  favorites: string[];
  menuItems: MenuItem[];
  activeTab: string;
  collapsed: boolean;
  onOpen: (id: string) => void;
  onAdd: (id: string) => void;
  onRemove: (id: string) => void;
  isFavorite: (id: string) => boolean;
}

interface ResolvedFav {
  id: string;
  label: string;
  Icon: React.ComponentType<{ size?: number }>;
}

// Resout un id en MenuItem ou MenuChild en parcourant l'arbre des menus.
function resolve(id: string, items: MenuItem[]): ResolvedFav | null {
  for (const it of items) {
    if (it.id === id) return { id, label: it.label, Icon: it.icon };
    if (it.children) {
      const child: MenuChild | undefined = it.children.find(c => c.id === id && !c.isHeader);
      if (child) return { id, label: child.label, Icon: child.icon || LuFileText };
    }
  }
  return null;
}

function SidebarFavorites({
  favorites, menuItems, activeTab, collapsed,
  onOpen, onAdd, onRemove, isFavorite,
}: SidebarFavoritesProps): React.JSX.Element | null {
  if (collapsed) return null;

  const resolved: ResolvedFav[] = favorites
    .map(id => resolve(id, menuItems))
    .filter((r): r is ResolvedFav => r !== null);

  const canPin = !!activeTab && !isFavorite(activeTab) && resolve(activeTab, menuItems) !== null;

  if (resolved.length === 0 && !canPin) return null;

  return (
    <div className="compta-sidebar-favorites">
      <div className="compta-favorites-header">
        <div className="compta-favorites-title">
          <LuStar size={11} />
          <span>Favoris</span>
        </div>
        {canPin && (
          <button
            type="button"
            className="compta-favorites-add"
            onClick={() => onAdd(activeTab)}
            aria-label="Ajouter aux favoris"
            title={`Épingler la page courante`}
          >
            <LuPlus size={14} />
          </button>
        )}
      </div>
      {resolved.map(f => {
        const isActive = activeTab === f.id;
        return (
          <div
            key={f.id}
            className={`compta-fav-item ${isActive ? 'active' : ''}`}
          >
            <button
              type="button"
              className="compta-fav-link"
              onClick={() => onOpen(f.id)}
              title={f.label}
            >
              <span className="compta-fav-dot" />
              <span className="compta-fav-label">{f.label}</span>
            </button>
            <button
              type="button"
              className="compta-fav-remove"
              onClick={() => onRemove(f.id)}
              aria-label={`Retirer ${f.label} des favoris`}
              title="Retirer des favoris"
            >
              <LuX size={12} />
            </button>
          </div>
        );
      })}
    </div>
  );
}

export default SidebarFavorites;
