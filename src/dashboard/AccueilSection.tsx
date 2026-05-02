/**
 * Section "Accueil" du dashboard : en-tete + alerte SMT eventuelle +
 * banniere de bienvenue + CTA creation d'exercice + grille des etats.
 */

import React from 'react';
import { LuHandHelping, LuLock } from 'react-icons/lu';
import { TypeActivite, NormxModule, EtatFinancier } from '../types';
import { ExerciceSelector, ExerciceSelectorProps } from './ExerciceManager';
import { SmtAlertBanner } from './SmtAlert';
import ComptaDashboard from '../comptabilite/ComptaDashboard';

interface SmtAlertState { show: boolean; ca: number; seuil: number; }

interface AccueilSectionProps {
  userName: string;
  typeActivite: TypeActivite;
  activeModule: NormxModule;
  moduleLabel: string;
  etats: EtatFinancier[];
  entiteId: number;
  exerciceId: number | null;
  exerciceLoading: boolean;
  exerciceSelectorProps: ExerciceSelectorProps;
  smtAlert: SmtAlertState | null;
  onOpenExerciceModal: () => void;
  openTab: (id: string) => void;
}

function getTypeLabel(typeActivite: TypeActivite): string {
  switch (typeActivite) {
    case 'entreprise': return 'Entreprise (SYSCOHADA)';
    case 'association': return 'Association';
    case 'ordre_professionnel': return 'Ordre professionnel';
    case 'projet_developpement': return 'Projet de développement';
    case 'smt': return 'Entité SMT';
    default: return 'Entité';
  }
}

function getBannerText(activeModule: NormxModule, typeActivite: TypeActivite): string {
  if (activeModule === 'compta') {
    return 'Gérez votre comptabilité : saisie des écritures, journaux, grand livre, balance et déclarations.';
  }
  if (typeActivite === 'entreprise') {
    return 'Produisez vos états financiers SYSCOHADA : bilan, compte de résultat, TFT et notes annexes.';
  }
  if (typeActivite === 'projet_developpement') {
    return 'Produisez vos états financiers SYCEBNL pour projets de développement.';
  }
  return 'Produisez vos états financiers SYCEBNL : bilan, compte de résultat, tableau des flux de trésorerie et notes annexes.';
}

export function AccueilSection({
  userName, typeActivite, activeModule, moduleLabel, etats,
  entiteId, exerciceId, exerciceLoading, exerciceSelectorProps,
  smtAlert, onOpenExerciceModal, openTab,
}: AccueilSectionProps): React.ReactElement {
  // Compta + exercice ouvert : afficher le tableau de bord interactif
  if (exerciceId && activeModule === 'compta') {
    return (
      <div>
        <div className="main-header">
          <h1>Bienvenue, {userName ? userName.split(' ')[0] : 'Utilisateur'} <LuHandHelping /></h1>
          <ExerciceSelector {...exerciceSelectorProps} />
        </div>
        {smtAlert && <SmtAlertBanner alert={smtAlert} onOpenParametres={() => openTab('parametres')} />}
        <ComptaDashboard
          entiteId={entiteId}
          exerciceId={exerciceId}
          openTab={openTab}
        />
      </div>
    );
  }

  return (
    <div>
      <div className="main-header">
        <h1>Bienvenue, {userName ? userName.split(' ')[0] : 'Utilisateur'} <LuHandHelping /></h1>
        <ExerciceSelector {...exerciceSelectorProps} />
      </div>

      {smtAlert && <SmtAlertBanner alert={smtAlert} onOpenParametres={() => openTab('parametres')} />}

      <div className="welcome-banner">
        <div className="welcome-text">
          <h3>NORMX {moduleLabel} - {getTypeLabel(typeActivite)}</h3>
          <p>{getBannerText(activeModule, typeActivite)}</p>
        </div>
      </div>

      {!exerciceId && !exerciceLoading && (
        <div className="accueil-no-exercice">
          <div className="accueil-no-exercice-icon"><LuLock size={40} /></div>
          <h3>Aucun exercice comptable</h3>
          <p>Créez votre premier exercice pour débloquer la saisie, la consultation, les tiers et les états financiers.</p>
          <button
            className="accueil-create-exercice-btn"
            onClick={onOpenExerciceModal}
            disabled={exerciceLoading}
          >
            Créer un exercice
          </button>
        </div>
      )}

      {exerciceId && activeModule === 'etats' && (
        <div className="etats-grid">
          {etats.map((etat: EtatFinancier) => (
            <div key={etat.id} className="etat-card" onClick={() => openTab(etat.id)}>
              <div className="etat-card-icon">{React.createElement(etat.navIcon, { size: 28 })}</div>
              <h3>{etat.titre}</h3>
              <p>{etat.desc}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
