import React from 'react';
import { Exercice, Offre } from '../types';

export type ReportId = 'tableau_bord' | 'repartition_charges' | 'suivi_tresorerie' | 'comparatif' | 'journal_centralisateur' | 'balance_agee' | 'sig';

export interface RapportCard {
  id: ReportId;
  label: string;
  desc: string;
  Icon: React.ComponentType<{ size: number }>;
}

export interface RapportsProps {
  entiteId: number;
  exerciceId: number;
  exerciceAnnee: number;
  exercices?: Exercice[];
  offre: Offre;
  entiteName: string;
  entiteSigle: string;
  entiteAdresse: string;
  entiteNif: string;
}

export interface SubReportProps {
  entiteId: number;
  exerciceId: number;
  exerciceAnnee: number;
  exercices: Exercice[];
  offre: Offre;
  entiteName: string;
  entiteSigle: string;
  entiteAdresse: string;
  entiteNif: string;
  onBack: () => void;
}

export interface ReportWrapperProps {
  title: string;
  subtitle?: string;
  onBack: () => void;
  onExport?: () => void;
  children: React.ReactNode;
}

export interface KpiCardProps {
  label: string;
  value: string;
  color: string;
}

export interface EmptyProps {
  msg?: string;
}

export const MOIS_LABELS: string[] = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];
export const MOIS_FULL: string[] = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];

export const CLASSE_LABELS: Record<string, string> = {
  '1': 'Comptes de ressources durables',
  '2': 'Comptes d\'actif immobilisé',
  '3': 'Comptes de stocks',
  '4': 'Comptes de tiers',
  '5': 'Comptes de trésorerie',
  '6': 'Comptes de charges',
  '7': 'Comptes de produits',
  '8': 'Comptes des autres charges/produits',
};

export const POSTE_LABELS: Record<string, string> = {
  // Classe 1 — Ressources durables
  '10': 'Capital',
  '11': 'Réserves',
  '12': 'Report à nouveau',
  '13': 'Résultat net de l\'exercice',
  '14': 'Subventions d\'investissement',
  '15': 'Provisions réglementées et fonds assimilés',
  '16': 'Emprunts et dettes assimilées',
  '17': 'Dettes de crédit-bail et contrats assimilés',
  '18': 'Dettes liées à des participations',
  '19': 'Provisions financières pour risques et charges',
  // Classe 2 — Actif immobilisé
  '20': 'Charges immobilisées',
  '21': 'Immobilisations incorporelles',
  '22': 'Terrains',
  '23': 'Bâtiments, installations',
  '24': 'Matériel',
  '25': 'Avances et acomptes sur immobilisations',
  '26': 'Titres de participation',
  '27': 'Autres immobilisations financières',
  '28': 'Amortissements des immobilisations',
  '29': 'Dépréciations des immobilisations',
  // Classe 3 — Stocks
  '30': 'Stocks et en-cours',
  '31': 'Marchandises',
  '32': 'Matières premières et fournitures',
  '33': 'Autres approvisionnements',
  '34': 'Produits en cours',
  '35': 'Services en cours',
  '36': 'Produits finis',
  '37': 'Produits intermédiaires et résiduels',
  '38': 'Stocks en cours de route',
  '39': 'Dépréciations des stocks',
  // Classe 4 — Tiers
  '40': 'Fournisseurs et comptes rattachés',
  '41': 'Clients et comptes rattachés',
  '42': 'Personnel',
  '43': 'Organismes sociaux',
  '44': 'État et collectivités publiques',
  '45': 'Organismes internationaux',
  '46': 'Associés et groupe',
  '47': 'Débiteurs et créditeurs divers',
  '48': 'Créances et dettes HAO',
  '49': 'Dépréciations et risques provisionnés',
  // Classe 5 — Trésorerie
  '50': 'Titres de placement',
  '51': 'Valeurs à encaisser',
  '52': 'Banques',
  '53': 'Établissements financiers',
  '54': 'Instruments de trésorerie',
  '55': 'Organismes financiers spécialisés',
  '56': 'Banques, crédits de trésorerie',
  '57': 'Caisse',
  '58': 'Régies d\'avances, accréditifs',
  '59': 'Dépréciations des titres de placement',
  // Classe 6 — Charges
  '60': 'Achats et variations de stocks',
  '61': 'Transports',
  '62': 'Services extérieurs A',
  '63': 'Services extérieurs B',
  '64': 'Impôts et taxes',
  '65': 'Autres charges',
  '66': 'Charges de personnel',
  '67': 'Frais financiers et charges assimilées',
  '68': 'Dotations aux amortissements',
  '69': 'Dotations aux provisions',
  // Classe 7 — Produits
  '70': 'Ventes',
  '71': 'Subventions d\'exploitation',
  '72': 'Production immobilisée',
  '73': 'Variations des stocks de biens produits',
  '75': 'Autres produits',
  '77': 'Revenus financiers et produits assimilés',
  '78': 'Transferts de charges',
  '79': 'Reprises de provisions et dépréciations',
  // Classe 8 — Comptes des autres charges et produits
  '81': 'Valeurs comptables des cessions d\'immobilisations',
  '82': 'Produits des cessions d\'immobilisations',
  '83': 'Charges HAO',
  '84': 'Produits HAO',
  '85': 'Dotations HAO',
  '86': 'Reprises HAO',
  '87': 'Participation des travailleurs',
  '88': 'Subventions d\'équilibre',
  '89': 'Impôts sur le résultat',
};

export const fmt = (v: number): string => { const n = typeof v === 'number' ? v : parseFloat(String(v)); if (!n) return ''; return n.toLocaleString('fr-FR'); };

export const tableStyle: React.CSSProperties = { width: '100%', borderCollapse: 'collapse', fontSize: 14 };
export const thStyleR: React.CSSProperties = { padding: '10px 10px', fontSize: 13, fontWeight: 600, color: '#fff', background: '#1A3A5C', textAlign: 'center', whiteSpace: 'nowrap' };
export const tdStyleR: React.CSSProperties = { padding: '9px 10px', borderBottom: '1px solid #eee', fontSize: 14 };
