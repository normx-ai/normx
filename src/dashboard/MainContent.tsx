import React, { Suspense } from 'react';
import { TypeActivite, Offre, NormxModule, EtatFinancier, Exercice, Entite } from '../types';
import { ExerciceSelector } from './ExerciceManager';
import { NOTES_ANNEXES, IMPLEMENTED_ETATS } from './notesConfig';
import { useSmtAlert } from './SmtAlert';
import { AccueilSection } from './AccueilSection';
import { ComptabiliteSection, isComptabiliteTab } from './ComptabiliteSection';
import { NotesNavigation, NoteRenderer, NotesGrid } from './NotesSection';
import { EtatsSection } from './EtatsSection';
import { RapportsSection, isRapportsSubTab } from './RapportsSection';
import {
  ImportBalance,
  TiersPage, AssistantChat, AideVideos, ParametresTabs,
} from './lazyModules';

interface MainContentProps {
  activeTab: string;
  activeModule: NormxModule;
  userName: string;
  userId: number;
  entiteId: number;
  entiteName: string;
  entiteSigle: string;
  entiteAdresse: string;
  entiteNif: string;
  typeActivite: TypeActivite;
  offre: Offre;
  etats: EtatFinancier[];
  exerciceId: number | null;
  exercices: Exercice[];
  exerciceLoading: boolean;
  currentExStatut: string;
  moduleLabel: string;
  onSelectExercice: (id: number) => void;
  onOpenExerciceModal: () => void;
  onCloturerExercice: (id: number) => void;
  onRouvrirExercice: (id: number) => void;
  openTab: (id: string) => void;
  onEntiteUpdated?: (entite: Entite) => void;
}

function MainContent(props: MainContentProps): React.ReactElement {
  const {
    activeTab, activeModule, userName, userId,
    entiteId, entiteName, entiteSigle, entiteAdresse, entiteNif,
    typeActivite, offre, etats,
    exerciceId, exercices, exerciceLoading, currentExStatut, moduleLabel,
    onSelectExercice, onOpenExerciceModal, onCloturerExercice, onRouvrirExercice,
    openTab,
    onEntiteUpdated,
  } = props;

  const exerciceSelectorProps = {
    exercices, exerciceId, exerciceLoading, currentExStatut,
    onSelectExercice, onOpenExerciceModal, onCloturerExercice, onRouvrirExercice,
  };

  const currentExAnnee: number = exercices.find(e => e.id === exerciceId)?.annee ?? new Date().getFullYear();

  // Affiche toutes les notes annexes officielles SYSCOHADA, meme vides.
  // L'utilisateur saisit/complete chaque note a son rythme.
  const filteredNotes = NOTES_ANNEXES;

  const smtAlert = useSmtAlert(typeActivite, entiteId, exerciceId, offre);

  const etatBaseProps = {
    entiteName, entiteSigle, entiteAdresse, entiteNif,
    typeActivite, entiteId, offre,
    onBack: () => openTab('accueil'),
  };

  const isTiersTab = ['tiers_membres', 'tiers_fournisseurs', 'tiers_bailleurs', 'tiers_personnel'].includes(activeTab);
  const tiersDefaultType = activeTab === 'tiers_membres' ? 'membre'
    : activeTab === 'tiers_fournisseurs' ? 'fournisseur'
    : activeTab === 'tiers_bailleurs' ? 'bailleur' : 'personnel';

  return (
    <main className="dashboard-main">
      <Suspense fallback={<div style={{ padding: 40, textAlign: 'center' }}>Chargement...</div>}>

      {activeTab === 'accueil' && (
        <AccueilSection
          userName={userName}
          typeActivite={typeActivite}
          activeModule={activeModule}
          moduleLabel={moduleLabel}
          etats={etats}
          entiteId={entiteId}
          exerciceId={exerciceId}
          exerciceLoading={exerciceLoading}
          exerciceSelectorProps={exerciceSelectorProps}
          smtAlert={smtAlert}
          onOpenExerciceModal={onOpenExerciceModal}
          openTab={openTab}
        />
      )}

      {isTiersTab && (
        <TiersPage
          entiteId={entiteId}
          entiteName={entiteName}
          defaultType={tiersDefaultType}
          onBack={() => openTab('accueil')}
        />
      )}

      {isComptabiliteTab(activeTab) && (
        <ComptabiliteSection
          activeTab={activeTab}
          entiteId={entiteId}
          entiteName={entiteName}
          entiteSigle={entiteSigle}
          entiteAdresse={entiteAdresse}
          entiteNif={entiteNif}
          exerciceId={exerciceId}
          currentExAnnee={currentExAnnee}
          exerciceSelectorProps={exerciceSelectorProps}
          openTab={openTab}
        />
      )}

      {activeTab === 'import_balance' && (
        <div>
          <ExerciceSelector {...exerciceSelectorProps} />
          {!exerciceId && <div className="empty-state-msg">Créez un exercice pour accéder à l'import de balance.</div>}
          {exerciceId && <ImportBalance entiteId={entiteId} userId={userId} exerciceId={exerciceId} exerciceAnnee={currentExAnnee} />}
        </div>
      )}

      <NotesNavigation filteredNotes={filteredNotes} activeTab={activeTab} openTab={openTab} />
      <NoteRenderer activeTab={activeTab} etatBaseProps={etatBaseProps} openTab={openTab} />
      {activeTab === 'notes_annexes_sys' && <NotesGrid filteredNotes={filteredNotes} openTab={openTab} />}

      <EtatsSection activeTab={activeTab} etatBaseProps={etatBaseProps} openTab={openTab} />

      {etats.some(e => e.id === activeTab) && !IMPLEMENTED_ETATS.includes(activeTab) && (
        <div className="placeholder-content">
          <h2>{etats.find(e => e.id === activeTab)?.titre}</h2>
          <p>Module en cours de développement.</p>
        </div>
      )}

      {activeTab === 'assistant' && <AssistantChat userName={userName} userId={userId} typeActivite={typeActivite} />}

      {(activeTab === 'rapports' || isRapportsSubTab(activeTab)) && (
        <RapportsSection
          activeTab={activeTab}
          entiteId={entiteId}
          entiteName={entiteName}
          entiteSigle={entiteSigle}
          entiteAdresse={entiteAdresse}
          entiteNif={entiteNif}
          exerciceId={exerciceId}
          currentExAnnee={currentExAnnee}
          exercices={exercices}
          offre={offre}
          exerciceSelectorProps={exerciceSelectorProps}
          openTab={openTab}
        />
      )}

      {activeTab === 'aide_videos' && <AideVideos />}

      {activeTab === 'parametres' && (
        <ParametresTabs entiteId={entiteId} onUpdate={(data: Record<string, string>) => {
          if (onEntiteUpdated) {
            onEntiteUpdated({
              id: entiteId,
              nom: data.nom || entiteName,
              sigle: data.sigle || entiteSigle,
              adresse: data.adresse || entiteAdresse,
              nif: data.nif || entiteNif,
              type_activite: typeActivite,
              offre,
            } as Entite);
          }
        }} />
      )}

      </Suspense>
    </main>
  );
}

export default MainContent;
