/**
 * Rapports et SIG : onglets qui partagent le meme selecteur d'exercice et
 * le meme jeu de props (entiteId, exerciceId, donnees entite).
 */

import React from 'react';
import type { Offre, Exercice } from '../types';
import { ExerciceSelector, ExerciceSelectorProps } from './ExerciceManager';
import {
  Rapports, SoldesIntermediaires, TableauBord,
  RepartitionCharges, SuiviTresorerie, ComparatifNN1,
} from './lazyModules';

interface RapportsSectionProps {
  activeTab: string;
  entiteId: number;
  entiteName: string;
  entiteSigle: string;
  entiteAdresse: string;
  entiteNif: string;
  exerciceId: number | null;
  currentExAnnee: number;
  exercices: Exercice[];
  offre: Offre;
  exerciceSelectorProps: ExerciceSelectorProps;
  openTab: (id: string) => void;
}

const RAPPORTS_SUBTABS = new Set(['sig', 'tableau_bord', 'repartition_charges', 'suivi_tresorerie', 'comparatif']);

export function isRapportsSubTab(tab: string): boolean {
  return RAPPORTS_SUBTABS.has(tab);
}

export function RapportsSection(props: RapportsSectionProps): React.ReactElement {
  const { activeTab, entiteId, entiteName, entiteSigle, entiteAdresse, entiteNif,
    exerciceId, currentExAnnee, exercices, offre, exerciceSelectorProps, openTab } = props;
  const onBack = () => openTab('accueil');
  const shared = {
    entiteId, exerciceId: exerciceId as number, exerciceAnnee: currentExAnnee,
    exercices, offre, entiteName, entiteSigle, entiteAdresse, entiteNif, onBack,
  };

  if (activeTab === 'rapports') {
    return (
      <div>
        <ExerciceSelector {...exerciceSelectorProps} />
        {!exerciceId && <div className="empty-state-msg">Sélectionnez un exercice pour voir les rapports.</div>}
        {exerciceId && (
          <Rapports entiteId={entiteId} exerciceId={exerciceId} exerciceAnnee={currentExAnnee} exercices={exercices} offre={offre} entiteName={entiteName} entiteSigle={entiteSigle} entiteAdresse={entiteAdresse} entiteNif={entiteNif} />
        )}
      </div>
    );
  }

  return (
    <div>
      <ExerciceSelector {...exerciceSelectorProps} />
      {!exerciceId && <div className="empty-state-msg">Sélectionnez un exercice pour voir ce rapport.</div>}
      {exerciceId && activeTab === 'sig' && <SoldesIntermediaires {...shared} />}
      {exerciceId && activeTab === 'tableau_bord' && <TableauBord {...shared} />}
      {exerciceId && activeTab === 'repartition_charges' && <RepartitionCharges {...shared} />}
      {exerciceId && activeTab === 'suivi_tresorerie' && <SuiviTresorerie {...shared} />}
      {exerciceId && activeTab === 'comparatif' && <ComparatifNN1 {...shared} />}
    </div>
  );
}
