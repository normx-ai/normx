// Types + configuration des types de tiers (membre/fournisseur/bailleur/personnel).

import React from 'react';
import { LuUsers, LuTruck, LuHandshake, LuUser } from 'react-icons/lu';

export interface TiersData {
  contact_nom?: string;
  contact_fonction?: string;
  notes?: string;
}

export interface TiersItem {
  id: number;
  code_tiers: string;
  nom: string;
  type: string;
  compte_comptable: string;
  telephone: string;
  email: string;
  adresse: string;
  data: TiersData;
}

export interface TiersForm {
  type: string;
  code_tiers: string;
  nom: string;
  compte_comptable: string;
  telephone: string;
  email: string;
  adresse: string;
  data: TiersData;
}

export interface TypeTiersConfig {
  value: string;
  label: string;
  icon: React.ComponentType<{ size?: number }>;
  prefixes: string[];
  compteDefaut: string;
  color: string;
}

export const TYPES_TIERS: TypeTiersConfig[] = [
  { value: 'membre', label: 'Membre / Apporteur', icon: LuUsers, prefixes: ['411', '418', '451', '452', '453'], compteDefaut: '451', color: '#D4A843' },
  { value: 'fournisseur', label: 'Fournisseur', icon: LuTruck, prefixes: ['401', '402', '408', '409', '481'], compteDefaut: '401', color: '#dc2626' },
  { value: 'bailleur', label: 'Bailleur / Partenaire', icon: LuHandshake, prefixes: ['462', '463', '464', '469'], compteDefaut: '462', color: '#059669' },
  { value: 'personnel', label: 'Personnel', icon: LuUser, prefixes: ['421', '422', '425', '428'], compteDefaut: '421', color: '#d97706' },
];

export function getTypeConfig(type: string): TypeTiersConfig {
  return TYPES_TIERS.find(t => t.value === type) || TYPES_TIERS[0];
}

export function generateCodeTiers(type: string, existing: TiersItem[]): string {
  const prefixes: Record<string, string> = { membre: 'MBR', fournisseur: 'FRN', bailleur: 'BAI', personnel: 'PER' };
  const prefix = prefixes[type] || 'TRS';
  const filtered = existing.filter(t => t.type === type);
  const nums = filtered.map(t => {
    const m = (t.code_tiers || '').match(/(\d+)$/);
    return m ? parseInt(m[1], 10) : 0;
  });
  const next = (nums.length > 0 ? Math.max(...nums) : 0) + 1;
  return prefix + '-' + String(next).padStart(3, '0');
}

export const EMPTY_FORM: TiersForm = {
  type: 'membre',
  code_tiers: '',
  nom: '',
  compte_comptable: '451',
  telephone: '',
  email: '',
  adresse: '',
  data: { contact_nom: '', contact_fonction: '', notes: '' },
};
