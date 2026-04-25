/**
 * Rendu des etats financiers (SYCEBNL, projet, SMT, SYSCOHADA, fiches)
 * en fonction de activeTab. Un unique mapping activeTab -> Component pour
 * eviter la cascade de ternaires.
 */

import React from 'react';
import type { TypeActivite, Offre } from '../types';
import {
  BilanSYCEBNL, CompteResultatSYCEBNL, TFT_SYCEBNL,
  TER_Projet, ExecBudgetaire_Projet, ReconcTresorerie_Projet,
  BilanProjet, CompteExploitation_Projet,
  BilanSMT, CompteResultatSMT, NotesAnnexesSMT, JournalTresorerieSMT, JournauxSMT,
  PageDeGarde, FicheIdentification, FicheR3, FicheR4,
  BilanSYSCOHADA, CompteResultatSYSCOHADA, TFT_SYSCOHADA, ResultatFiscal,
  LiasseComplete,
} from './lazyModules';

interface EtatBaseProps {
  entiteName: string;
  entiteSigle: string;
  entiteAdresse: string;
  entiteNif: string;
  typeActivite: TypeActivite;
  entiteId: number;
  offre: Offre;
  onBack: () => void;
}

interface EtatsSectionProps {
  activeTab: string;
  etatBaseProps: EtatBaseProps;
  openTab: (id: string) => void;
}

export function EtatsSection({ activeTab, etatBaseProps, openTab }: EtatsSectionProps): React.ReactElement | null {
  const goParams = () => openTab('parametres');

  switch (activeTab) {
    case 'bilan_actif': return <BilanSYCEBNL page="actif" {...etatBaseProps} />;
    case 'bilan_passif': return <BilanSYCEBNL page="passif" {...etatBaseProps} />;
    case 'compte_resultat': return <CompteResultatSYCEBNL {...etatBaseProps} />;
    case 'flux_tresorerie': return <TFT_SYCEBNL {...etatBaseProps} />;
    case 'emplois_ressources': return <TER_Projet {...etatBaseProps} />;
    case 'execution_budgetaire': return <ExecBudgetaire_Projet {...etatBaseProps} />;
    case 'reconciliation_tresorerie': return <ReconcTresorerie_Projet {...etatBaseProps} />;
    case 'bilan_projet': return <BilanProjet {...etatBaseProps} />;
    case 'compte_exploitation': return <CompteExploitation_Projet {...etatBaseProps} />;
    case 'bilan_smt': return <BilanSMT {...etatBaseProps} />;
    case 'compte_resultat_smt': return <CompteResultatSMT {...etatBaseProps} />;
    case 'notes_annexes_smt': return <NotesAnnexesSMT {...etatBaseProps} />;
    case 'journal_tresorerie_smt': return <JournalTresorerieSMT {...etatBaseProps} />;
    case 'journaux_smt': return <JournauxSMT {...etatBaseProps} />;
    case 'page_garde_sys': return <PageDeGarde {...etatBaseProps} />;
    case 'fiche_identification_sys': return <FicheIdentification {...etatBaseProps} page="R1" onGoToParametres={goParams} />;
    case 'fiche_r2_sys': return <FicheIdentification {...etatBaseProps} page="R2" onGoToParametres={goParams} />;
    case 'fiche_r3_sys': return <FicheR3 {...etatBaseProps} onGoToParametres={goParams} />;
    case 'fiche_r4_sys': return <FicheR4 {...etatBaseProps} onGoToParametres={goParams} />;
    case 'bilan_actif_sys': return <BilanSYSCOHADA page="actif" {...etatBaseProps} />;
    case 'bilan_passif_sys': return <BilanSYSCOHADA page="passif" {...etatBaseProps} />;
    case 'compte_resultat_sys': return <CompteResultatSYSCOHADA {...etatBaseProps} />;
    case 'tft': return <TFT_SYSCOHADA {...etatBaseProps} />;
    case 'resultat_fiscal_sys': return <ResultatFiscal {...etatBaseProps} />;
    case 'liasse_complete_sys': return <LiasseComplete {...etatBaseProps} />;
    default: return null;
  }
}
