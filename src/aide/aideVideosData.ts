/**
 * Catalogue des videos d'aide NormX (categories + liste).
 *
 * Extrait de AideVideos.tsx pour separer la data du composant de presentation.
 * Ajouter une video : completer la liste VIDEOS avec une nouvelle entree.
 * Ajouter une categorie : completer CATEGORIES + utiliser le `id` dans VIDEOS.
 */

import { LuPlay, LuBookOpen, LuPenLine, LuChartBarIncreasing, LuCalculator, LuFileText } from 'react-icons/lu';
import type { IconType } from 'react-icons';

export interface Video {
  id: string;
  titre: string;
  description: string;
  duree: string;
  youtubeId: string;
  categorie: string;
}

export interface Categorie {
  id: string;
  label: string;
  icon: IconType;
}

export const CATEGORIES: Categorie[] = [
  { id: 'tous', label: 'Tous', icon: LuPlay },
  { id: 'sig', label: 'SIG — Cas pratiques', icon: LuCalculator },
  { id: 'saisie', label: 'Saisie comptable', icon: LuPenLine },
  { id: 'etats', label: 'États financiers', icon: LuChartBarIncreasing },
  { id: 'fiscalite', label: 'Fiscalité Congo', icon: LuFileText },
  { id: 'guide', label: 'Guide NORMX Finance', icon: LuBookOpen },
];

export const VIDEOS: Video[] = [
  // SIG — Cas pratiques
  {
    id: 'sig-1-mc',
    titre: '1. Marge commerciale (MC)',
    description: 'Calcul de la marge commerciale : ventes 980 000, achats 850 000, stocks. Résultat : SC 80 000.',
    duree: '8 min',
    youtubeId: '',
    categorie: 'sig',
  },
  {
    id: 'sig-2-va',
    titre: '2. Valeur ajoutée (VA)',
    description: 'Détermination de la VA : matières premières, produits finis, transports, services extérieurs.',
    duree: '10 min',
    youtubeId: '',
    categorie: 'sig',
  },
  {
    id: 'sig-3-ebe',
    titre: '3. Excédent brut d\'exploitation (EBE)',
    description: 'EBE = VA - Charges du personnel. Exemple : 60 500 - 17 500 = 43 000.',
    duree: '7 min',
    youtubeId: '',
    categorie: 'sig',
  },
  {
    id: 'sig-4-re',
    titre: '4. Résultat d\'exploitation (RE)',
    description: 'Exemple complet MC → VA → EBE → RE avec dotations aux amortissements et provisions.',
    duree: '15 min',
    youtubeId: '',
    categorie: 'sig',
  },
  {
    id: 'sig-5-rf',
    titre: '5. Résultat financier (RF)',
    description: 'Crédit-bail, escomptes, pertes de change. RF = 29 000 - 17 000 = SD 12 000.',
    duree: '8 min',
    youtubeId: '',
    categorie: 'sig',
  },
  {
    id: 'sig-6-rao',
    titre: '6. Résultat des activités ordinaires (RAO)',
    description: 'RAO = RE + RF = 466 000 - 12 000 = SC 454 000.',
    duree: '6 min',
    youtubeId: '',
    categorie: 'sig',
  },
  {
    id: 'sig-7-rhao',
    titre: '7. Résultat HAO (RHAO)',
    description: 'Cessions d\'immobilisations, provisions réglementées, subventions d\'équilibre.',
    duree: '10 min',
    youtubeId: '',
    categorie: 'sig',
  },
  {
    id: 'sig-8-rn',
    titre: '8. Résultat net (RN)',
    description: 'RN = RAO + RHAO - Participation - IS (28% Congo). Exemple complet jusqu\'à l\'affectation.',
    duree: '12 min',
    youtubeId: '',
    categorie: 'sig',
  },
  // Saisie comptable
  {
    id: 'saisie-1-journal',
    titre: 'Saisie des écritures au journal',
    description: 'Comment saisir les écritures comptables dans Normx : débit, crédit, pièces justificatives.',
    duree: '10 min',
    youtubeId: '',
    categorie: 'saisie',
  },
  {
    id: 'saisie-2-lettrage',
    titre: 'Lettrage des comptes tiers',
    description: 'Rapprocher les factures et les règlements : lettrage automatique et manuel.',
    duree: '8 min',
    youtubeId: '',
    categorie: 'saisie',
  },
  {
    id: 'saisie-3-tva',
    titre: 'Déclaration de TVA',
    description: 'Générer et vérifier la déclaration de TVA depuis les écritures saisies.',
    duree: '7 min',
    youtubeId: '',
    categorie: 'saisie',
  },
  // États financiers
  {
    id: 'etats-1-bilan',
    titre: 'Bilan SYSCOHADA',
    description: 'Lire et comprendre le bilan : actif immobilisé, actif circulant, capitaux propres, dettes.',
    duree: '12 min',
    youtubeId: '',
    categorie: 'etats',
  },
  {
    id: 'etats-2-cr',
    titre: 'Compte de résultat SYSCOHADA',
    description: 'Structure du compte de résultat : les 8 SIG, du CA au résultat net.',
    duree: '10 min',
    youtubeId: '',
    categorie: 'etats',
  },
  // Fiscalité Congo
  {
    id: 'fiscal-1-is',
    titre: 'Impôt sur les sociétés (IS) — Congo',
    description: 'Taux IS 28%, minimum de perception 1%, charges non déductibles (CGI 2026).',
    duree: '15 min',
    youtubeId: '',
    categorie: 'fiscalite',
  },
];
