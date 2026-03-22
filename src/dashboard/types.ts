import { NormxModule } from '../types';

export interface MenuItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ size?: number }>;
  hasArrow?: boolean;
  children?: MenuChild[];
  disabled?: boolean;
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
