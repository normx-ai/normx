// TFT SYSCOHADA — prefixes de comptes + definition des lignes du tableau.
// Ref : Le Praticien Comptable OHADA p. 1274-1282.

import type { TFTRow } from '../../types';

export const PRODUITS_PREFIXES: string[] = ['70', '71', '72', '73', '75', '77', '78', '79', '82', '84', '86', '88'];
export const CHARGES_PREFIXES: string[] = ['60', '61', '62', '63', '64', '65', '66', '67', '68', '69', '81', '83', '85', '87', '89'];
export const DOTATIONS_PREFIXES: string[] = ['68', '69'];
export const REPRISES_PREFIXES_TFT: string[] = ['79'];

export const TFT_ROWS: TFTRow[] = [
  { ref: 'ZA', type: 'indent', note: 'A', libelle: 'Tresorerie nette au 1er janvier (Tresorerie actif N-1 - Tresorerie passif N-1)' },

  { type: 'section', libelle: 'Flux de tresorerie provenant des activites operationnelles' },
  { ref: 'FA', type: 'indent', note: '', libelle: "Capacite d'Autofinancement Globale (CAFG)" },
  { ref: 'FB', type: 'indent', note: '', libelle: "- Variation de l'actif circulant HAO" },
  { ref: 'FC', type: 'indent', note: '', libelle: '- Variation des stocks' },
  { ref: 'FD', type: 'indent', note: '', libelle: '- Variation des creances' },
  { ref: 'FE', type: 'indent', note: '', libelle: '+ Variation du passif circulant' },
  { type: 'label', libelle: 'Variation du BF lie aux activites operationnelles (FB+FC+FD+FE)' },
  { ref: 'ZB', type: 'subtotal', note: 'B', libelle: 'Flux de tresorerie provenant des activites operationnelles (somme FA a FE)' },

  { type: 'section', libelle: "Flux de tresorerie provenant des activites d'investissement" },
  { ref: 'FF', type: 'indent', note: '', libelle: "- Decaissements lies aux acquisitions d'immobilisations incorporelles" },
  { ref: 'FG', type: 'indent', note: '', libelle: "- Decaissements lies aux acquisitions d'immobilisations corporelles" },
  { ref: 'FH', type: 'indent', note: '', libelle: "- Decaissements lies aux acquisitions d'immobilisations financieres" },
  { ref: 'FI', type: 'indent', note: '', libelle: "+ Encaissements lies aux cessions d'immobilisations incorporelles et corporelles" },
  { ref: 'FJ', type: 'indent', note: '', libelle: "+ Encaissements lies aux cessions d'immobilisations financieres" },
  { ref: 'ZC', type: 'subtotal', note: 'C', libelle: "Flux de tresorerie provenant des activites d'investissement (somme FF a FJ)" },

  { type: 'section', libelle: 'Flux de tresorerie provenant du financement par les capitaux propres' },
  { ref: 'FK', type: 'indent', note: '', libelle: '+ Augmentations de capital par apports nouveaux' },
  { ref: 'FL', type: 'indent', note: '', libelle: "+ Subventions d'investissement recues" },
  { ref: 'FM', type: 'indent', note: '', libelle: '- Prelevements sur le capital' },
  { ref: 'FN', type: 'indent', note: '', libelle: '- Dividendes verses' },
  { ref: 'ZD', type: 'subtotal', note: 'D', libelle: 'Flux de tresorerie provenant des capitaux propres (somme FK a FN)' },

  { type: 'section', libelle: 'Tresorerie provenant du financement par les capitaux etrangers' },
  { ref: 'FO', type: 'indent', note: '', libelle: '+ Emprunts' },
  { ref: 'FP', type: 'indent', note: '', libelle: '+ Autres dettes financieres' },
  { ref: 'FQ', type: 'indent', note: '', libelle: '- Remboursements des emprunts et autres dettes financieres' },
  { ref: 'ZE', type: 'subtotal', note: 'E', libelle: 'Flux de tresorerie provenant des capitaux etrangers (somme FO a FQ)' },

  { ref: 'ZF', type: 'result', note: 'F', libelle: 'Flux de tresorerie provenant des activites de financement (D+E)' },
  { ref: 'ZG', type: 'result', note: 'G', libelle: 'VARIATION DE LA TRESORERIE NETTE DE LA PERIODE (B+C+F)' },
  { ref: 'ZH', type: 'total', note: 'H', libelle: 'Tresorerie nette au 31 Decembre (G+A)' },
  { ref: 'ZI', type: 'indent', note: '', libelle: 'Controle : Tresorerie actif N - Tresorerie passif N' },
];
