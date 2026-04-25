/**
 * Declaration centralisee des modules charges paresseusement par MainContent.
 * Regroupe par famille (etats, notes, compta, revision, rapports, outils) pour
 * alleger le fichier principal du dashboard.
 */

import { lazy } from 'react';

// Etats financiers
export const ImportBalance = lazy(() => import('../etats/ImportBalance'));
export const BilanSYCEBNL = lazy(() => import('../etats/BilanSYCEBNL'));
export const CompteResultatSYCEBNL = lazy(() => import('../etats/CompteResultatSYCEBNL'));
export const TFT_SYCEBNL = lazy(() => import('../etats/TFT_SYCEBNL'));
export const TER_Projet = lazy(() => import('../etats/TER_Projet'));
export const ExecBudgetaire_Projet = lazy(() => import('../etats/ExecBudgetaire_Projet'));
export const ReconcTresorerie_Projet = lazy(() => import('../etats/ReconcTresorerie_Projet'));
export const BilanProjet = lazy(() => import('../etats/BilanProjet'));
export const CompteExploitation_Projet = lazy(() => import('../etats/CompteExploitation_Projet'));
export const BilanSMT = lazy(() => import('../etats/BilanSMT'));
export const CompteResultatSMT = lazy(() => import('../etats/CompteResultatSMT'));
export const NotesAnnexesSMT = lazy(() => import('../etats/NotesAnnexesSMT'));
export const JournauxSMT = lazy(() => import('../etats/JournauxSMT'));
export const JournalTresorerieSMT = lazy(() => import('../etats/JournalTresorerieSMT'));
export const BilanSYSCOHADA = lazy(() => import('../etats/BilanSYSCOHADA'));
export const CompteResultatSYSCOHADA = lazy(() => import('../etats/CompteResultatSYSCOHADA'));
export const TFT_SYSCOHADA = lazy(() => import('../etats/TFT_SYSCOHADA'));
export const PageDeGarde = lazy(() => import('../etats/PageDeGarde'));
export const FicheIdentification = lazy(() => import('../etats/FicheIdentification'));
export const FicheR3 = lazy(() => import('../etats/FicheR3'));
export const FicheR4 = lazy(() => import('../etats/FicheR4'));
export const ResultatFiscal = lazy(() => import('../etats/ResultatFiscal'));
export const LiasseComplete = lazy(() => import('../etats/LiasseComplete'));

// Notes annexes
export const Note1 = lazy(() => import('../etats/notes/Note1'));
export const Note2 = lazy(() => import('../etats/notes/Note2'));
export const Note3A = lazy(() => import('../etats/notes/Note3A'));
export const Note3B = lazy(() => import('../etats/notes/Note3B'));
export const Note3C = lazy(() => import('../etats/notes/Note3C'));
export const Note3D = lazy(() => import('../etats/notes/Note3D'));
export const Note3E = lazy(() => import('../etats/notes/Note3E'));
export const Note4 = lazy(() => import('../etats/notes/Note4'));
export const Note5 = lazy(() => import('../etats/notes/Note5'));
export const Note6 = lazy(() => import('../etats/notes/Note6'));
export const Note7 = lazy(() => import('../etats/notes/Note7'));
export const Note8 = lazy(() => import('../etats/notes/Note8'));
export const Note8A = lazy(() => import('../etats/notes/Note8A'));
export const Note9 = lazy(() => import('../etats/notes/Note9'));
export const Note10 = lazy(() => import('../etats/notes/Note10'));
export const Note11 = lazy(() => import('../etats/notes/Note11'));
export const Note12 = lazy(() => import('../etats/notes/Note12'));
export const Note13 = lazy(() => import('../etats/notes/Note13'));
export const Note14 = lazy(() => import('../etats/notes/Note14'));
export const Note15A = lazy(() => import('../etats/notes/Note15A'));
export const Note15B = lazy(() => import('../etats/notes/Note15B'));
export const Note16A = lazy(() => import('../etats/notes/Note16A'));
export const Note16B = lazy(() => import('../etats/notes/Note16B'));
export const Note16C = lazy(() => import('../etats/notes/Note16C'));
export const Note17 = lazy(() => import('../etats/notes/Note17'));
export const Note18 = lazy(() => import('../etats/notes/Note18'));
export const Note19 = lazy(() => import('../etats/notes/Note19'));
export const Note20 = lazy(() => import('../etats/notes/Note20'));
export const Note21 = lazy(() => import('../etats/notes/Note21'));
export const Note22 = lazy(() => import('../etats/notes/Note22'));
export const Note23 = lazy(() => import('../etats/notes/Note23'));
export const Note24 = lazy(() => import('../etats/notes/Note24'));
export const Note25 = lazy(() => import('../etats/notes/Note25'));
export const Note26 = lazy(() => import('../etats/notes/Note26'));
export const Note27A = lazy(() => import('../etats/notes/Note27A'));
export const Note27B = lazy(() => import('../etats/notes/Note27B'));
export const Note28 = lazy(() => import('../etats/notes/Note28'));
export const Note29 = lazy(() => import('../etats/notes/Note29'));
export const Note30 = lazy(() => import('../etats/notes/Note30'));
export const Note31 = lazy(() => import('../etats/notes/Note31'));
export const Note32 = lazy(() => import('../etats/notes/Note32'));
export const Note33 = lazy(() => import('../etats/notes/Note33'));
export const Note34 = lazy(() => import('../etats/notes/Note34'));
export const Note35 = lazy(() => import('../etats/notes/Note35'));
export const Note36 = lazy(() => import('../etats/notes/Note36'));
export const Note37 = lazy(() => import('../etats/notes/Note37'));

// Comptabilite
export const SaisieJournal = lazy(() => import('../comptabilite/SaisieJournal'));
export const GrandLivre = lazy(() => import('../comptabilite/GrandLivre'));
export const BalanceGenerale = lazy(() => import('../comptabilite/BalanceGenerale'));
export const TiersPage = lazy(() => import('../comptabilite/TiersPage'));
export const GrandLivreTiers = lazy(() => import('../comptabilite/GrandLivreTiers'));
export const BalanceTiers = lazy(() => import('../comptabilite/BalanceTiers'));
export const Lettrage = lazy(() => import('../comptabilite/Lettrage'));
export const Journaux = lazy(() => import('../comptabilite/Journaux'));
export const Echeancier = lazy(() => import('../comptabilite/Journaux').then(m => ({ default: m.Echeancier })));
export const BalanceAgee = lazy(() => import('../comptabilite/Journaux').then(m => ({ default: m.BalanceAgee })));

// Revision
export const RevisionComptes = lazy(() => import('../revision/RevisionComptes'));
export const BalanceRevisee = lazy(() => import('../revision/BalanceRevisee'));

// Rapports
export const Rapports = lazy(() => import('../rapports/Rapports'));
export const SoldesIntermediaires = lazy(() => import('../rapports/SoldesIntermediaires'));
export const TableauBord = lazy(() => import('../rapports/TableauBord'));
export const RepartitionCharges = lazy(() => import('../rapports/RepartitionCharges'));
export const SuiviTresorerie = lazy(() => import('../rapports/SuiviTresorerie'));
export const ComparatifNN1 = lazy(() => import('../rapports/ComparatifNN1'));

// Outils
export const AssistantChat = lazy(() => import('../assistant/AssistantChat'));
export const AideVideos = lazy(() => import('../aide/AideVideos'));
export const ParametresTabs = lazy(() => import('../settings/ParametresTabs'));
