/**
 * Singleton plan comptable SYCEBNL
 * Charge une seule fois en memoire, partage entre toutes les routes
 */

import path from 'path';
import type { CompteComptable } from '../types/comptes';

// Re-export pour les anciens callers qui importent le type d'ici
export type { CompteComptable };

// Le JSON a quelques champs additionnels (commentaire, sens) gerés par le type
// CompteComptable de server/types/comptes.ts.
type PlanCompteRaw = CompteComptable & Record<string, unknown>;
const data: PlanCompteRaw[] = require(path.join(__dirname, 'plan_comptable_sycebnl.json'));

export default data;
