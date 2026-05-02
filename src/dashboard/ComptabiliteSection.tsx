/**
 * Section "Comptabilite" : journal, grand livre, balance, lettrage,
 * grand livre tiers, balance tiers, journaux, balance agee, echeancier.
 * Une seule branche regroupant tous les onglets du module compta qui
 * partagent le meme selecteur d'exercice.
 */

import React from 'react';
import { ExerciceSelector, ExerciceSelectorProps } from './ExerciceManager';
import {
  SaisieJournal, GrandLivre, BalanceGenerale, Lettrage,
  GrandLivreTiers, BalanceTiers, Journaux, BalanceAgee, Echeancier,
} from './lazyModules';

interface ComptabiliteSectionProps {
  activeTab: string;
  entiteId: number;
  entiteName: string;
  entiteSigle: string;
  entiteAdresse: string;
  entiteNif: string;
  exerciceId: number | null;
  currentExAnnee: number;
  currentExDateDebut?: string;
  currentExDateFin?: string;
  exerciceSelectorProps: ExerciceSelectorProps;
  openTab: (id: string) => void;
}

const COMPTA_TABS = new Set([
  'journal', 'journaux', 'grand_livre', 'balance', 'lettrage',
  'grand_livre_tiers', 'balance_tiers', 'balance_agee', 'echeancier',
]);

export function isComptabiliteTab(tab: string): boolean {
  return COMPTA_TABS.has(tab);
}

export function ComptabiliteSection({
  activeTab, entiteId, entiteName, entiteSigle, entiteAdresse, entiteNif,
  exerciceId, currentExAnnee, currentExDateDebut, currentExDateFin,
  exerciceSelectorProps, openTab,
}: ComptabiliteSectionProps): React.ReactElement {
  const onBack = () => openTab('accueil');
  return (
    <div>
      <ExerciceSelector {...exerciceSelectorProps} />
      {!exerciceId && <div className="empty-state-msg">Créez un exercice pour commencer la saisie.</div>}
      {exerciceId && activeTab === 'journal' && (
        <SaisieJournal entiteId={entiteId} exerciceId={exerciceId} exerciceAnnee={currentExAnnee}
          exerciceDateDebut={currentExDateDebut} exerciceDateFin={currentExDateFin} onBack={onBack} />
      )}
      {exerciceId && activeTab === 'grand_livre' && (
        <GrandLivre entiteId={entiteId} exerciceId={exerciceId} exerciceAnnee={currentExAnnee} entiteName={entiteName} entiteSigle={entiteSigle} entiteAdresse={entiteAdresse} entiteNif={entiteNif} onBack={onBack} />
      )}
      {exerciceId && activeTab === 'balance' && (
        <BalanceGenerale entiteId={entiteId} exerciceId={exerciceId} entiteName={entiteName} entiteSigle={entiteSigle} entiteAdresse={entiteAdresse} entiteNif={entiteNif} exerciceAnnee={currentExAnnee} onBack={onBack} />
      )}
      {exerciceId && activeTab === 'lettrage' && (
        <Lettrage entiteId={entiteId} exerciceId={exerciceId} exerciceAnnee={currentExAnnee} onBack={onBack} />
      )}
      {exerciceId && activeTab === 'grand_livre_tiers' && (
        <GrandLivreTiers entiteId={entiteId} exerciceId={exerciceId} exerciceAnnee={currentExAnnee} entiteName={entiteName} entiteSigle={entiteSigle} entiteAdresse={entiteAdresse} entiteNif={entiteNif} onBack={onBack} />
      )}
      {exerciceId && activeTab === 'balance_tiers' && (
        <BalanceTiers entiteId={entiteId} exerciceId={exerciceId} exerciceAnnee={currentExAnnee} entiteName={entiteName} entiteSigle={entiteSigle} entiteAdresse={entiteAdresse} entiteNif={entiteNif} onBack={onBack} />
      )}
      {exerciceId && activeTab === 'journaux' && (
        <Journaux entiteId={entiteId} exerciceId={exerciceId} exerciceAnnee={currentExAnnee} entiteName={entiteName} onBack={onBack} />
      )}
      {exerciceId && activeTab === 'balance_agee' && (
        <BalanceAgee entiteId={entiteId} exerciceId={exerciceId} exerciceAnnee={currentExAnnee} onBack={onBack} />
      )}
      {exerciceId && activeTab === 'echeancier' && (
        <Echeancier entiteId={entiteId} exerciceId={exerciceId} exerciceAnnee={currentExAnnee} onBack={onBack} />
      )}
    </div>
  );
}
