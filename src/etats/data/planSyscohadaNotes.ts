// ==========================================================================
// Mapping compte comptable SYSCOHADA → rubrique des notes annexes
// ==========================================================================
// Source de verite unique pour la classification des comptes dans les notes.
// Chaque entree lie un compte (ou un prefixe) a une rubrique d'une note donnee.
// Les Note*.tsx consomment via buildRubriques(noteId).
//
// Convention :
// - numero : prefixe de compte tel que present dans la balance (ex '6011').
//   Le compute utilise `numero_compte.startsWith(numero)`.
// - label  : libelle de la rubrique dans la note.
// - note   : identifiant de la note (ex 'note_22_sys').
// - group  : sous-groupe optionnel pour totaux intermediaires.
// - isTotal: true pour les lignes de sous-total (pas de numero, juste affichage).
// ==========================================================================

export interface NoteCompteEntry {
  numero: string;
  label: string;
  note: string;
  group?: string;
  isTotal?: boolean;
  bold?: boolean;
}

export interface Rubrique {
  label: string;
  prefixes: string[];
  group?: string;
  isTotal?: boolean;
  bold?: boolean;
}

export const PLAN_NOTES_SYSCOHADA: NoteCompteEntry[] = [
  // ==========================================
  // Note 22 — Achats
  // ==========================================
  // Achats de marchandises (60)
  { numero: '6011', label: 'Achats dans la région', note: 'note_22_sys', group: 'marchandises' },
  { numero: '6012', label: 'Achats hors région', note: 'note_22_sys', group: 'marchandises' },
  { numero: '6013', label: 'Achats groupe', note: 'note_22_sys', group: 'marchandises' },
  { numero: '6014', label: 'Achats groupe', note: 'note_22_sys', group: 'marchandises' },
  { numero: '', label: 'TOTAL : ACHATS DE MARCHANDISES', note: 'note_22_sys', group: 'marchandises', isTotal: true, bold: true },
  // Achats matières premières (602)
  { numero: '6021', label: 'Achats dans la région', note: 'note_22_sys', group: 'matieres' },
  { numero: '6022', label: 'Achats hors région', note: 'note_22_sys', group: 'matieres' },
  { numero: '6023', label: 'Achats groupe', note: 'note_22_sys', group: 'matieres' },
  { numero: '6024', label: 'Achats groupe', note: 'note_22_sys', group: 'matieres' },
  { numero: '', label: 'TOTAL : ACHATS MATIERES PREMIERES ET FOURNITURES LIEES', note: 'note_22_sys', group: 'matieres', isTotal: true, bold: true },
  // Autres achats détaillés (604, 605, 608)
  { numero: '6041', label: 'Matières consommables', note: 'note_22_sys', group: 'autres' },
  { numero: '6042', label: 'Matières combustibles', note: 'note_22_sys', group: 'autres' },
  { numero: '6043', label: "Produits d'entretien", note: 'note_22_sys', group: 'autres' },
  { numero: '6044', label: "Fournitures d'atelier, d'usine et de magasin", note: 'note_22_sys', group: 'autres' },
  { numero: '6046', label: "Fournitures d'atelier, d'usine et de magasin", note: 'note_22_sys', group: 'autres' },
  { numero: '6051', label: 'Eau', note: 'note_22_sys', group: 'autres' },
  { numero: '6052', label: 'Electricité', note: 'note_22_sys', group: 'autres' },
  { numero: '6053', label: 'Autres énergies', note: 'note_22_sys', group: 'autres' },
  { numero: '6054', label: "Fournitures d'entretien", note: 'note_22_sys', group: 'autres' },
  { numero: '6047', label: 'Fourniture de bureau', note: 'note_22_sys', group: 'autres' },
  { numero: '6055', label: 'Fourniture de bureau', note: 'note_22_sys', group: 'autres' },
  { numero: '6056', label: 'Petit matériel et outillages', note: 'note_22_sys', group: 'autres' },
  { numero: '6057', label: 'Achats études, prestations de services, de travaux matériels et équipements', note: 'note_22_sys', group: 'autres' },
  { numero: '6058', label: 'Achats études, prestations de services, de travaux matériels et équipements', note: 'note_22_sys', group: 'autres' },
  { numero: '6081', label: "Achats d'emballages", note: 'note_22_sys', group: 'autres' },
  { numero: '6082', label: "Achats d'emballages", note: 'note_22_sys', group: 'autres' },
  { numero: '6083', label: "Achats d'emballages", note: 'note_22_sys', group: 'autres' },
  { numero: '6015', label: 'Frais sur achats', note: 'note_22_sys', group: 'autres' },
  { numero: '6025', label: 'Frais sur achats', note: 'note_22_sys', group: 'autres' },
  { numero: '6045', label: 'Frais sur achats', note: 'note_22_sys', group: 'autres' },
  { numero: '6085', label: 'Frais sur achats', note: 'note_22_sys', group: 'autres' },
  { numero: '6019', label: 'Rabais, remises et ristournes obtenus', note: 'note_22_sys', group: 'autres' },
  { numero: '6029', label: 'Rabais, remises et ristournes obtenus', note: 'note_22_sys', group: 'autres' },
  { numero: '6049', label: 'Rabais, remises et ristournes obtenus', note: 'note_22_sys', group: 'autres' },
  { numero: '6059', label: 'Rabais, remises et ristournes obtenus', note: 'note_22_sys', group: 'autres' },
  { numero: '6089', label: 'Rabais, remises et ristournes obtenus', note: 'note_22_sys', group: 'autres' },
  { numero: '', label: 'TOTAL : AUTRES ACHATS', note: 'note_22_sys', group: 'autres', isTotal: true, bold: true },

  // ==========================================
  // Note 23 — Transports
  // ==========================================
  { numero: '612', label: 'Transports sur ventes', note: 'note_23_sys' },
  { numero: '613', label: 'Transports pour le compte de tiers', note: 'note_23_sys' },
  { numero: '614', label: 'Transports du personnel', note: 'note_23_sys' },
  { numero: '616', label: 'Transports de plis', note: 'note_23_sys' },
  { numero: '618', label: 'Autres frais de transport', note: 'note_23_sys' },

  // ==========================================
  // Note 24 — Services extérieurs
  // ==========================================
  { numero: '621', label: 'Sous-traitance générale', note: 'note_24_sys' },
  { numero: '622', label: 'Locations et charges locatives', note: 'note_24_sys' },
  { numero: '623', label: 'Redevances de location-acquisition', note: 'note_24_sys' },
  { numero: '624', label: 'Entretien, réparations et maintenance', note: 'note_24_sys' },
  { numero: '625', label: "Primes d'assurance", note: 'note_24_sys' },
  { numero: '626', label: 'Etudes, recherches et documentation', note: 'note_24_sys' },
  { numero: '627', label: 'Publicité, publications, relations publiques', note: 'note_24_sys' },
  { numero: '628', label: 'Frais de télécommunications', note: 'note_24_sys' },
  { numero: '631', label: 'Frais bancaires', note: 'note_24_sys' },
  { numero: '632', label: "Rémunérations d'intermédiaires et de conseils", note: 'note_24_sys' },
  { numero: '633', label: 'Frais de formation du personnel', note: 'note_24_sys' },
  { numero: '634', label: 'Redevances pour brevets, licences, logiciels, concessions et droits similaires', note: 'note_24_sys' },
  { numero: '635', label: 'Cotisations', note: 'note_24_sys' },
  { numero: '637', label: "Personnel extérieur à l'entité", note: 'note_24_sys' },
  { numero: '638', label: 'Autres charges externes', note: 'note_24_sys' },
];

/**
 * Construit la liste des Rubrique pour une note donnee en agregant les
 * entrees par label+group. Les prefixes sont fusionnes automatiquement
 * quand plusieurs comptes partagent le meme label.
 */
export function buildRubriques(noteId: string): Rubrique[] {
  const result: Rubrique[] = [];
  const indexByKey = new Map<string, number>();
  for (const entry of PLAN_NOTES_SYSCOHADA) {
    if (entry.note !== noteId) continue;
    // Lignes de total : ajoutees telles quelles, dans l'ordre
    if (entry.isTotal) {
      result.push({
        label: entry.label,
        prefixes: [],
        group: entry.group,
        isTotal: true,
        bold: entry.bold,
      });
      continue;
    }
    // Lignes normales : fusionner par (label, group)
    const key = entry.label + '|' + (entry.group || '');
    const existing = indexByKey.get(key);
    if (existing !== undefined) {
      result[existing].prefixes.push(entry.numero);
    } else {
      indexByKey.set(key, result.length);
      result.push({
        label: entry.label,
        prefixes: [entry.numero],
        group: entry.group,
      });
    }
  }
  return result;
}
