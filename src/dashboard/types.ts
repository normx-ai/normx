import { NormxModule } from '../types';

export type MenuGroup = 'pilotage' | 'quotidien' | 'cloture' | 'outils';

export type MenuBadgeVariant = 'urgent' | 'warning' | 'info' | 'neutral';

export interface MenuBadge {
  text: string;
  variant: MenuBadgeVariant;
  title?: string;
}

export interface MenuItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ size?: number }>;
  hasArrow?: boolean;
  children?: MenuChild[];
  disabled?: boolean;
  group?: MenuGroup;
  badge?: MenuBadge;
}

export interface MenuChild {
  id: string;
  label: string;
  icon?: React.ComponentType<{ size?: number }>;
  isHeader?: boolean;
}

export interface TabItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ size?: number }>;
  closable: boolean;
}

export interface ModuleInfo {
  id: NormxModule;
  label: string;
  icon: React.ComponentType<{ size?: number }>;
  desc: string;
}
