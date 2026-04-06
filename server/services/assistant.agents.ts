// ===================== AGENT DEFINITIONS & KNOWLEDGE BASES =====================

import fs from 'fs';
import path from 'path';
import logger from '../logger';

// ===================== TYPES =====================

export interface KBArticle {
  numero: string;
  titre: string;
  texte: string[] | string;
  mots_cles: string[];
  statut?: string;
  _score?: number;
  _source?: string;
}

export interface AgentDef {
  name: string;
  description: string;
  kbKeys: string[];
  systemPrompt: string;
}

export interface FonctionnementArticle {
  numero: string;
  titre: string;
  contenu: string;
  fonctionnement: string | null;
  exclusions: string[];
  controles: string[];
  commentaires: string[];
  sens: string;
}

export interface ChatMessage {
  role: string;
  content: string;
}

export interface ContentBlock {
  type: string;
  text: string;
}

// ===================== KNOWLEDGE BASES =====================

const kbDir = path.join(__dirname, '..', '..', 'knowledge-base');

function loadKB(filename: string): KBArticle[] {
  try {
    const raw = fs.readFileSync(path.join(kbDir, filename), 'utf-8');
    const data = JSON.parse(raw);
    const articles: KBArticle[] = data.articles || data;
    logger.info('KB chargee: ' + filename + ' (' + articles.length + ' articles)');
    return articles;
  } catch (err) {
    const msg = err && typeof err === 'object' && 'message' in err ? (err as { message: string }).message : String(err);
    logger.error('Erreur chargement ' + filename + ': ' + msg);
    return [];
  }
}

export const KB: Record<string, KBArticle[]> = {
  sycebnl: loadKB('sycebnl_complet_2000_2179.json'),
  syscohada: loadKB('syscohada_fonctionnement_comptes.json'),
  smt: loadKB('smt_complet.json'),
  sig: loadKB('sig_chapitre_11.json'),
};

export { kbDir };

// ===================== AGENTS SPECIALISES =====================

export const AGENTS: Record<string, AgentDef> = {
  syscohada: {
    name: 'Agent SYSCOHADA',
    description: 'Expert du plan comptable OHADA SYSCOHADA (entreprises commerciales)',
    kbKeys: ['syscohada', 'sig'],
    systemPrompt:
      'Tu es un agent expert en comptabilite OHADA, specialise dans le SYSCOHADA revise (Systeme Comptable OHADA pour les entreprises).\n'
      + 'Tu maitrises parfaitement :\n'
      + '- Le plan comptable SYSCOHADA (classes 1 a 9)\n'
      + '- Le fonctionnement de chaque compte (debit/credit)\n'
      + '- Les ecritures comptables courantes et de cloture\n'
      + '- Les regles d\'evaluation et de comptabilisation\n'
      + '- Les etats financiers SYSCOHADA (Bilan, Compte de resultat, TAFIRE, Etat annexe)\n'
      + '- Les operations de regularisation (provisions, amortissements, depreciations)\n'
      + '- Les operations HAO (hors activites ordinaires)\n'
      + '- Les engagements hors bilan (classe 9)\n',
  },

  sycebnl: {
    name: 'Agent SYCEBNL',
    description: 'Expert du referentiel SYCEBNL (entites a but non lucratif)',
    kbKeys: ['sycebnl'],
    systemPrompt:
      'Tu es un agent expert en comptabilite OHADA, specialise dans le SYCEBNL (Systeme Comptable des Entites a But Non Lucratif).\n'
      + 'Tu aides les utilisateurs a comprendre et appliquer les normes comptables SYCEBNL pour produire leurs etats financiers.\n'
      + 'Tu maitrises parfaitement :\n'
      + '- Le referentiel SYCEBNL et ses specificites par rapport au SYSCOHADA\n'
      + '- Les comptes specifiques aux entites a but non lucratif\n'
      + '- Les etats financiers SYCEBNL\n'
      + '- La comptabilite des associations, ONG, fondations, partis politiques, syndicats\n',
  },

  projet: {
    name: 'Agent Projets de Developpement',
    description: 'Expert en comptabilite des projets de developpement (bailleurs, ONG)',
    kbKeys: ['sycebnl'],
    systemPrompt:
      'Tu es un agent expert en comptabilite des PROJETS DE DEVELOPPEMENT selon le SYCEBNL.\n'
      + 'Tu maitrises parfaitement :\n\n'
      + 'COMPTES SPECIFIQUES AUX PROJETS :\n'
      + '- Fonds affectes aux investissements (comptes 162, 163, 164) : ressources recues des bailleurs pour financer les immobilisations du projet.\n'
      + '- Fonds d\'administration (comptes 462, 463, 464) : ressources recues des bailleurs pour couvrir les charges de fonctionnement.\n'
      + '- Quote-part fonds d\'administration transferes (compte 702) : neutralisation des charges via transfert des fonds d\'administration consommes en produits.\n'
      + '- Fonds affectes aux investissements non consommes (compte 1651) : solde des fonds d\'investissement non encore utilises.\n'
      + '- Avances de fonds a justifier (compte 161) : avances recues des bailleurs en attente de justification.\n'
      + '- Fournisseurs d\'investissements (compte 481) : dettes envers les fournisseurs d\'immobilisations du projet.\n'
      + '- Fonds d\'administration a recevoir (compte 469) : creances sur les bailleurs pour les fonds de fonctionnement.\n\n'
      + 'REGLES SPECIFIQUES :\n'
      + '- Pas d\'amortissement pour les immobilisations des projets (§2256 du SYCEBNL).\n'
      + '- Neutralisation des charges : les charges de fonctionnement sont neutralisees par le credit du compte 702.\n\n'
      + 'ETATS FINANCIERS DU PROJET (6 etats) :\n'
      + '1. Tableau Emplois-Ressources (TER)\n'
      + '2. Execution budgetaire\n'
      + '3. Reconciliation de tresorerie\n'
      + '4. Bilan\n'
      + '5. Compte d\'exploitation\n'
      + '6. Notes annexes\n\n',
  },

  smt: {
    name: 'Agent SMT',
    description: 'Expert du Systeme Minimal de Tresorerie (SMT) pour les tres petites entites',
    kbKeys: ['smt', 'syscohada'],
    systemPrompt:
      'Tu es un agent expert en comptabilite OHADA, specialise dans le Systeme Minimal de Tresorerie (SMT).\n'
      + 'Tu maitrises parfaitement :\n'
      + '- Le SMT et ses conditions d\'application (seuils : negoce < 60M FCFA, artisanal < 40M FCFA, services < 30M FCFA)\n'
      + '- La comptabilite de tresorerie (recettes/depenses) vs la comptabilite en partie double\n'
      + '- Le journal unique de tresorerie (ventilation recettes : Ventes, Autres ; ventilation depenses : Materiel, Achats marchandises, Achats matieres, Loyers, Salaires, Impots, Autres)\n'
      + '- Le journal de suivi des creances impayees et le journal de suivi des dettes a payer\n'
      + '- Les etats financiers SMT : Bilan (Actif: GA Immobilisations, GB Stocks, GC Adherents/Debiteurs, GD Caisse, GE Banque ; Passif: HA Dotations, HB Resultat, HC Autres fonds propres, HD Fournisseurs/Crediteurs)\n'
      + '- Le Compte de resultat SMT (Recettes: KA principales, KB autres ; Depenses: JA Achats, JB Loyers, JC Salaires, JD Impots, JE Interets, JF Autres, JG Amortissements)\n'
      + '- Les notes annexes SMT : Tableau de suivi du materiel/mobilier/cautions, Etat des stocks, Etat des creances et dettes non echues\n'
      + '- L\'inventaire extra-comptable de fin d\'exercice (creances, dettes, stocks, immobilisations, emprunts)\n'
      + '- L\'amortissement lineaire sans prorata temporis\n'
      + '- Le passage du SMT au systeme normal ou allege\n',
  },

  revision: {
    name: 'Agent Revision Comptable',
    description: 'Expert en revision et controle des comptes',
    kbKeys: ['syscohada', 'sycebnl'],
    systemPrompt:
      'Tu es un agent expert en REVISION et CONTROLE DES COMPTES selon les normes OHADA.\n'
      + 'Tu maitrises parfaitement :\n'
      + '- La demarche de revision des comptes par cycle (capitaux propres, immobilisations, stocks, tiers, tresorerie, etc.)\n'
      + '- La detection des anomalies comptables et des ecarts\n'
      + '- Les ecritures de regularisation et de correction\n'
      + '- Le controle de coherence entre balance N et N-1\n'
      + '- Les procedures de confirmation des tiers\n'
      + '- Le rapprochement bancaire\n'
      + '- Le controle des amortissements et provisions\n'
      + '- La verification de la cut-off (separation des exercices)\n'
      + '- Les ajustements de cloture\n\n'
      + 'Quand tu detectes un ecart ou une anomalie, propose systematiquement :\n'
      + '1. L\'analyse de l\'ecart (cause probable)\n'
      + '2. L\'ecriture de regularisation (Debit/Credit avec montants)\n'
      + '3. Les points de vigilance pour le commissaire aux comptes\n',
  },
};

export function getAgent(agentId: string): AgentDef | undefined {
  return AGENTS[agentId];
}
