// Feature flag : quels modules NORMX sont actuellement vendus / visibles ?
// Modifier UNIQUEMENT cette liste pour activer/desactiver des modules
// (et retirer le filet de securite plus bas).
//
// Tant qu'un module n'est pas dans ENABLED_MODULES, il est :
// - invisible dans le dashboard (sidebar, switcher)
// - filtre du form de creation/edition de client
// - force hors de activeModule au boot
// - ne reçoit aucun appel navigate() / setActiveModule()

import type { NormxModule } from '../types';

export const ENABLED_MODULES: readonly NormxModule[] = ['compta', 'etats'];

export function isModuleEnabled(m: NormxModule): boolean {
  return ENABLED_MODULES.includes(m);
}

export function filterEnabledModules(modules: NormxModule[]): NormxModule[] {
  return modules.filter(isModuleEnabled);
}
