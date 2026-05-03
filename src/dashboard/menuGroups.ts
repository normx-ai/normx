import type { MenuItem, MenuGroup } from './types';

export interface GroupedMenu {
  group: MenuGroup;
  label: string;
  items: MenuItem[];
}

const GROUP_ORDER: MenuGroup[] = ['pilotage', 'quotidien', 'cloture', 'outils'];

const GROUP_LABELS: Record<MenuGroup, string> = {
  pilotage: 'Pilotage',
  quotidien: 'Quotidien',
  cloture: 'Clôture',
  outils: 'Outils',
};

// Regroupe les MenuItem par leur champ `group`. Les items sans group
// sont rattaches a 'outils' par defaut. L'ordre est fige (pilotage
// d'abord, outils en dernier) pour que la lecture suive le rythme
// metier d'un comptable.
export function groupMenuItems(items: MenuItem[]): GroupedMenu[] {
  const buckets = new Map<MenuGroup, MenuItem[]>();
  for (const it of items) {
    const g = it.group || 'outils';
    if (!buckets.has(g)) buckets.set(g, []);
    buckets.get(g)!.push(it);
  }
  return GROUP_ORDER
    .filter(g => buckets.has(g))
    .map(g => ({ group: g, label: GROUP_LABELS[g], items: buckets.get(g)! }));
}
