/**
 * Singleton plan comptable SYCEBNL
 * Charge une seule fois en memoire, partage entre toutes les routes
 */

import path from 'path';

export interface CompteComptable {
  numero: string;
  libelle: string;
  classe?: string;
  [key: string]: string | undefined;
}

const data: CompteComptable[] = require(path.join(__dirname, 'plan_comptable_sycebnl.json'));

export default data;
