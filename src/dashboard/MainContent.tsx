import React, { useState, useEffect, Suspense, lazy } from 'react';
import { LuHandHelping, LuLock, LuTriangleAlert, LuArrowUpRight } from 'react-icons/lu';
import { TypeActivite, Offre, NormxModule, EtatFinancier, Exercice, Entite } from '../types';
import { ExerciceSelector } from './ExerciceManager';

// Lazy-loaded modules — Etats financiers
const ImportBalance = lazy(() => import('../etats/ImportBalance'));
const BilanSYCEBNL = lazy(() => import('../etats/BilanSYCEBNL'));
const CompteResultatSYCEBNL = lazy(() => import('../etats/CompteResultatSYCEBNL'));
const TFT_SYCEBNL = lazy(() => import('../etats/TFT_SYCEBNL'));
const TER_Projet = lazy(() => import('../etats/TER_Projet'));
const ExecBudgetaire_Projet = lazy(() => import('../etats/ExecBudgetaire_Projet'));
const ReconcTresorerie_Projet = lazy(() => import('../etats/ReconcTresorerie_Projet'));
const BilanProjet = lazy(() => import('../etats/BilanProjet'));
const CompteExploitation_Projet = lazy(() => import('../etats/CompteExploitation_Projet'));
const BilanSMT = lazy(() => import('../etats/BilanSMT'));
const CompteResultatSMT = lazy(() => import('../etats/CompteResultatSMT'));
const NotesAnnexesSMT = lazy(() => import('../etats/NotesAnnexesSMT'));
const JournauxSMT = lazy(() => import('../etats/JournauxSMT'));
const JournalTresorerieSMT = lazy(() => import('../etats/JournalTresorerieSMT'));
const BilanSYSCOHADA = lazy(() => import('../etats/BilanSYSCOHADA'));
const CompteResultatSYSCOHADA = lazy(() => import('../etats/CompteResultatSYSCOHADA'));
const TFT_SYSCOHADA = lazy(() => import('../etats/TFT_SYSCOHADA'));
const PageDeGarde = lazy(() => import('../etats/PageDeGarde'));
const FicheIdentification = lazy(() => import('../etats/FicheIdentification'));
const FicheR3 = lazy(() => import('../etats/FicheR3'));
const FicheR4 = lazy(() => import('../etats/FicheR4'));
const ResultatFiscal = lazy(() => import('../etats/ResultatFiscal'));

// Lazy-loaded modules — Notes annexes
const Note1 = lazy(() => import('../etats/notes/Note1'));
const Note2 = lazy(() => import('../etats/notes/Note2'));
const Note3A = lazy(() => import('../etats/notes/Note3A'));
const Note3B = lazy(() => import('../etats/notes/Note3B'));
const Note3C = lazy(() => import('../etats/notes/Note3C'));
const Note3D = lazy(() => import('../etats/notes/Note3D'));
const Note3E = lazy(() => import('../etats/notes/Note3E'));
const Note4 = lazy(() => import('../etats/notes/Note4'));
const Note5 = lazy(() => import('../etats/notes/Note5'));
const Note6 = lazy(() => import('../etats/notes/Note6'));
const Note7 = lazy(() => import('../etats/notes/Note7'));
const Note8 = lazy(() => import('../etats/notes/Note8'));
const Note8A = lazy(() => import('../etats/notes/Note8A'));
const Note9 = lazy(() => import('../etats/notes/Note9'));
const Note10 = lazy(() => import('../etats/notes/Note10'));
const Note11 = lazy(() => import('../etats/notes/Note11'));
const Note12 = lazy(() => import('../etats/notes/Note12'));
const Note13 = lazy(() => import('../etats/notes/Note13'));
const Note14 = lazy(() => import('../etats/notes/Note14'));
const Note15A = lazy(() => import('../etats/notes/Note15A'));
const Note15B = lazy(() => import('../etats/notes/Note15B'));
const Note16A = lazy(() => import('../etats/notes/Note16A'));
const Note16B = lazy(() => import('../etats/notes/Note16B'));
const Note16C = lazy(() => import('../etats/notes/Note16C'));
const Note17 = lazy(() => import('../etats/notes/Note17'));
const Note18 = lazy(() => import('../etats/notes/Note18'));
const Note19 = lazy(() => import('../etats/notes/Note19'));
const Note20 = lazy(() => import('../etats/notes/Note20'));
const Note21 = lazy(() => import('../etats/notes/Note21'));
const Note22 = lazy(() => import('../etats/notes/Note22'));
const Note23 = lazy(() => import('../etats/notes/Note23'));
const Note24 = lazy(() => import('../etats/notes/Note24'));
const Note25 = lazy(() => import('../etats/notes/Note25'));
const Note26 = lazy(() => import('../etats/notes/Note26'));
const Note27A = lazy(() => import('../etats/notes/Note27A'));
const Note27B = lazy(() => import('../etats/notes/Note27B'));
const Note28 = lazy(() => import('../etats/notes/Note28'));
const Note29 = lazy(() => import('../etats/notes/Note29'));
const Note30 = lazy(() => import('../etats/notes/Note30'));
const Note31 = lazy(() => import('../etats/notes/Note31'));
const Note32 = lazy(() => import('../etats/notes/Note32'));
const Note33 = lazy(() => import('../etats/notes/Note33'));
const Note34 = lazy(() => import('../etats/notes/Note34'));
const Note35 = lazy(() => import('../etats/notes/Note35'));
const Note36 = lazy(() => import('../etats/notes/Note36'));
const Note37 = lazy(() => import('../etats/notes/Note37'));

// Lazy-loaded modules — Comptabilite
const SaisieJournal = lazy(() => import('../comptabilite/SaisieJournal'));
const GrandLivre = lazy(() => import('../comptabilite/GrandLivre'));
const BalanceGenerale = lazy(() => import('../comptabilite/BalanceGenerale'));
const TiersPage = lazy(() => import('../comptabilite/TiersPage'));
const GrandLivreTiers = lazy(() => import('../comptabilite/GrandLivreTiers'));
const BalanceTiers = lazy(() => import('../comptabilite/BalanceTiers'));
const Lettrage = lazy(() => import('../comptabilite/Lettrage'));
const Journaux = lazy(() => import('../comptabilite/Journaux'));
const Echeancier = lazy(() => import('../comptabilite/Journaux').then(m => ({ default: m.Echeancier })));
const BalanceAgee = lazy(() => import('../comptabilite/Journaux').then(m => ({ default: m.BalanceAgee })));
const DeclarationTVA = lazy(() => import('../comptabilite/DeclarationTVA'));

// Lazy-loaded modules — Revision
const RevisionComptes = lazy(() => import('../revision/RevisionComptes'));
const BalanceRevisee = lazy(() => import('../revision/BalanceRevisee'));

// Lazy-loaded modules — Rapports
const Rapports = lazy(() => import('../rapports/Rapports'));
const SoldesIntermediaires = lazy(() => import('../rapports/SoldesIntermediaires'));
const TableauBord = lazy(() => import('../rapports/TableauBord'));
const RepartitionCharges = lazy(() => import('../rapports/RepartitionCharges'));
const SuiviTresorerie = lazy(() => import('../rapports/SuiviTresorerie'));
const ComparatifNN1 = lazy(() => import('../rapports/ComparatifNN1'));

// Lazy-loaded modules — Outils
const AssistantChat = lazy(() => import('../assistant/AssistantChat'));
const AideVideos = lazy(() => import('../aide/AideVideos'));
const ParametresEntite = lazy(() => import('../settings/ParametresEntite'));

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

  // Charger la balance pour détecter les notes avec/sans données
  const [balanceLignes, setBalanceLignes] = useState<{ numero_compte: string; solde_debiteur: number; solde_crediteur: number }[]>([]);
  useEffect(() => {
    if (!entiteId || !exerciceId) return;
    const balSrc = offre === 'comptabilite' ? 'ecritures' : 'import';
    const url = balSrc === 'ecritures'
      ? '/api/ecritures/balance/' + entiteId + '/' + exerciceId
      : '/api/balance/' + entiteId + '/' + exerciceId + '/N';
    fetch(url)
      .then(r => r.json())
      .then(data => setBalanceLignes(data.lignes || []))
      .catch(() => setBalanceLignes([]));
  }, [entiteId, exerciceId, offre]);

  // Charger les params d'entite (contient les saisies manuelles des notes et choix R4)
  const [entiteParams, setEntiteParams] = useState<Record<string, string>>({});
  useEffect(() => {
    if (!entiteId) return;
    fetch('/api/entites/' + entiteId)
      .then(r => r.json())
      .then(ent => setEntiteParams(ent.data || {}))
      .catch(() => setEntiteParams({}));
  }, [entiteId]);

  // Mapping note_id_sys → préfixes de comptes
  const NOTE_ACCOUNT_MAP: Record<string, string[]> = {
    note_1_sys: ['16', '17'],
    note_2_sys: [], // toujours applicable (informations obligatoires)
    note_3a_sys: ['21', '22', '23', '24', '25'],
    note_3b_sys: [],  // manuelle (biens en location-acquisition)
    note_3c_sys: ['28'],
    note_3d_sys: ['21', '22', '23', '24', '25'],
    note_3e_sys: ['21', '22', '23', '24', '25'],
    note_4_sys: ['26', '27'],
    note_5_sys: ['48', '481', '482', '483', '484', '485'],
    note_6_sys: ['31', '32', '33', '34', '35', '36', '37', '38', '39'],
    note_7_sys: ['41'],
    note_8_sys: ['42', '43', '44', '45', '46', '471', '472', '473', '474', '476'],
    note_8a_sys: ['4751', '4752'],
    note_9_sys: ['50'],
    note_10_sys: ['51'],
    note_11_sys: ['52', '53', '54', '55', '56', '57', '58'],
    note_12_sys: ['478', '479'],
    note_13_sys: ['10'],
    note_14_sys: ['11'],
    note_15a_sys: ['14', '15'],
    note_15b_sys: ['12', '13'],
    note_16a_sys: ['16', '17'],
    note_16b_sys: ['19'],
    note_16c_sys: [],  // manuel
    note_17_sys: ['40'],
    note_18_sys: ['42', '43', '44'],
    note_19_sys: ['47', '48', '49'],
    note_20_sys: ['52', '56'],
    note_21_sys: ['70', '71', '72', '73', '74', '75', '76', '77', '78'],
    note_22_sys: ['60'],
    note_23_sys: ['61'],
    note_24_sys: ['62', '63'],
    note_25_sys: ['64'],
    note_26_sys: ['65', '66', '67', '68'],
    note_27a_sys: ['66'],
    note_27b_sys: ['66'],
    note_28_sys: ['29', '39', '49', '59'],
    note_29_sys: ['77', '67'],
    note_30_sys: ['82', '83', '84', '85', '86'],
    note_31_sys: ['12', '13'],
    note_32_sys: ['70', '71', '72', '73'],
    note_33_sys: ['60'],
    note_34_sys: [], // toujours applicable (synthèse)
    note_35_sys: [], // manuel
    note_36_sys: [], // toujours applicable (table des codes)
    note_37_sys: ['89'],
  };

  // Notes toujours visibles (informations obligatoires, syntheses, etc.)
  const ALWAYS_VISIBLE_NOTES = ['note_2_sys', 'note_34_sys', 'note_36_sys'];

  // Notes manuelles : visibles si l'utilisateur a saisi des donnees
  const MANUAL_NOTE_PARAMS: Record<string, string> = {
    note_3b_sys: 'note3b_values',
    note_16c_sys: 'note16c_values',
    note_35_sys: 'note35_values',
  };

  const noteHasData = (noteId: string): boolean => {
    // Toujours afficher certaines notes obligatoires
    if (ALWAYS_VISIBLE_NOTES.includes(noteId)) return true;

    const prefixes = NOTE_ACCOUNT_MAP[noteId];

    // Notes manuelles : verifier si des donnees ont ete saisies
    if (!prefixes || prefixes.length === 0) {
      const paramKey = MANUAL_NOTE_PARAMS[noteId];
      if (paramKey) {
        const val = entiteParams[paramKey];
        if (!val) return false;
        try {
          const parsed = JSON.parse(val);
          return Object.keys(parsed).length > 0;
        } catch { return false; }
      }
      // Pas de mapping et pas de param = ne pas afficher
      return false;
    }

    // Notes avec prefixes : verifier la balance
    return balanceLignes.some(l => {
      const num = (l.numero_compte || '').trim();
      return prefixes.some(p => num.startsWith(p)) &&
        ((parseFloat(String(l.solde_debiteur)) || 0) !== 0 || (parseFloat(String(l.solde_crediteur)) || 0) !== 0);
    });
  };

  const etatBaseProps = {
    entiteName, entiteSigle, entiteAdresse, entiteNif,
    typeActivite, entiteId, offre,
    onBack: () => openTab('accueil'),
  };

  const IMPLEMENTED_ETATS = [
    'bilan_actif', 'bilan_passif', 'compte_resultat', 'flux_tresorerie',
    'emplois_ressources', 'execution_budgetaire', 'reconciliation_tresorerie',
    'bilan_projet', 'compte_exploitation',
    'bilan_smt', 'compte_resultat_smt', 'notes_annexes_smt', 'journal_tresorerie_smt', 'journaux_smt',
    'page_garde_sys', 'fiche_identification_sys', 'fiche_r2_sys', 'fiche_r3_sys', 'fiche_r4_sys',
    'notes_annexes_sys', 'note_1_sys', 'note_2_sys', 'note_3a_sys', 'note_3b_sys', 'note_3c_sys', 'note_3d_sys', 'note_3e_sys', 'note_4_sys', 'note_5_sys', 'note_6_sys', 'note_7_sys', 'note_8_sys', 'note_8a_sys', 'note_9_sys', 'note_10_sys', 'note_11_sys', 'note_12_sys', 'note_13_sys', 'note_14_sys', 'note_15a_sys', 'note_15b_sys', 'note_16a_sys', 'note_16b_sys', 'note_16c_sys', 'note_17_sys', 'note_18_sys', 'note_19_sys', 'note_20_sys', 'note_21_sys', 'note_22_sys', 'note_23_sys', 'note_24_sys', 'note_25_sys', 'note_26_sys', 'note_27a_sys', 'note_27b_sys', 'note_28_sys', 'note_29_sys', 'note_30_sys', 'note_31_sys', 'note_32_sys', 'note_33_sys', 'note_34_sys', 'note_35_sys', 'note_36_sys', 'note_37_sys',
    'bilan_actif_sys', 'bilan_passif_sys', 'compte_resultat_sys', 'tafire', 'resultat_fiscal_sys',
  ];

  // Liste des notes annexes pour affichage en cards
  const NOTES_ANNEXES = [
    { id: 'note_1_sys', titre: 'Note 1', desc: 'Dettes garanties par des sûretés réelles' },
    { id: 'note_2_sys', titre: 'Note 2', desc: 'Informations obligatoires' },
    { id: 'note_3a_sys', titre: 'Note 3A', desc: 'Immobilisation brute' },
    { id: 'note_3b_sys', titre: 'Note 3B', desc: 'Biens pris en location-acquisition' },
    { id: 'note_3c_sys', titre: 'Note 3C', desc: 'Immobilisations : Amortissements' },
    { id: 'note_3d_sys', titre: 'Note 3D', desc: 'Plus-values et moins-values de cession' },
    { id: 'note_3e_sys', titre: 'Note 3E', desc: 'Réévaluations effectuées' },
    { id: 'note_4_sys', titre: 'Note 4', desc: 'Immobilisations financières' },
    { id: 'note_5_sys', titre: 'Note 5', desc: 'Actif circulant HAO et Dettes circulantes HAO' },
    { id: 'note_6_sys', titre: 'Note 6', desc: 'Stocks et en cours' },
    { id: 'note_7_sys', titre: 'Note 7', desc: 'Clients' },
    { id: 'note_8_sys', titre: 'Note 8', desc: 'Autres créances' },
    { id: 'note_8a_sys', titre: 'Note 8A', desc: 'Étalement des charges immobilisées' },
    { id: 'note_9_sys', titre: 'Note 9', desc: 'Titres de placement' },
    { id: 'note_10_sys', titre: 'Note 10', desc: 'Valeurs à encaisser' },
    { id: 'note_11_sys', titre: 'Note 11', desc: 'Disponibilités' },
    { id: 'note_12_sys', titre: 'Note 12', desc: 'Écarts de conversion et Transferts de charges' },
    { id: 'note_13_sys', titre: 'Note 13', desc: 'Capital' },
    { id: 'note_14_sys', titre: 'Note 14', desc: 'Primes et réserves' },
    { id: 'note_15a_sys', titre: 'Note 15A', desc: 'Subventions et provisions réglementées' },
    { id: 'note_15b_sys', titre: 'Note 15B', desc: 'Autres fonds propres' },
    { id: 'note_16a_sys', titre: 'Note 16A', desc: 'Dettes financières et ressources assimilées' },
    { id: 'note_16b_sys', titre: 'Note 16B', desc: 'Engagements de retraite et avantages assimilés' },
    { id: 'note_16c_sys', titre: 'Note 16C', desc: 'Actifs et passifs éventuels' },
    { id: 'note_17_sys', titre: 'Note 17', desc: 'Fournisseurs d\'exploitation' },
    { id: 'note_18_sys', titre: 'Note 18', desc: 'Dettes fiscales et sociales' },
    { id: 'note_19_sys', titre: 'Note 19', desc: 'Autres dettes et provisions pour risques à court terme' },
    { id: 'note_20_sys', titre: 'Note 20', desc: 'Banques, crédit d\'escompte et de trésorerie' },
    { id: 'note_21_sys', titre: 'Note 21', desc: 'Chiffre d\'affaires et autres produits' },
    { id: 'note_22_sys', titre: 'Note 22', desc: 'Achats' },
    { id: 'note_23_sys', titre: 'Note 23', desc: 'Transports' },
    { id: 'note_24_sys', titre: 'Note 24', desc: 'Services extérieurs' },
    { id: 'note_25_sys', titre: 'Note 25', desc: 'Impôts et taxes' },
    { id: 'note_26_sys', titre: 'Note 26', desc: 'Autres charges' },
    { id: 'note_27a_sys', titre: 'Note 27A', desc: 'Charges de personnel' },
    { id: 'note_27b_sys', titre: 'Note 27B', desc: 'Effectifs, masse salariale et personnel extérieur' },
    { id: 'note_28_sys', titre: 'Note 28', desc: 'Provisions et dépréciations inscrites au bilan' },
    { id: 'note_29_sys', titre: 'Note 29', desc: 'Charges et revenus financiers' },
    { id: 'note_30_sys', titre: 'Note 30', desc: 'Autres charges et produits HAO' },
    { id: 'note_31_sys', titre: 'Note 31', desc: 'Répartition du résultat des cinq derniers exercices' },
    { id: 'note_32_sys', titre: 'Note 32', desc: 'Production de l\'exercice' },
    { id: 'note_33_sys', titre: 'Note 33', desc: 'Achats destinés à la production' },
    { id: 'note_34_sys', titre: 'Note 34', desc: 'Fiche de synthèse des principaux indicateurs financiers' },
    { id: 'note_35_sys', titre: 'Note 35', desc: 'Informations sociales, environnementales et sociétales' },
    { id: 'note_36_sys', titre: 'Note 36', desc: 'Table des codes' },
    { id: 'note_37_sys', titre: 'Note 37', desc: 'Détermination impôts sur le résultat' },
  ];

  // Filtrer les notes : masquer celles sans données dans la balance
  const filteredNotes = NOTES_ANNEXES.filter(n => noteHasData(n.id));

  // ===================== Alerte bascule SMT → SYSCOHADA =====================
  const [smtAlert, setSmtAlert] = useState<{ show: boolean; ca: number; seuil: number } | null>(null);
  const [smtAlertDismissed, setSmtAlertDismissed] = useState(false);

  useEffect(() => {
    if (typeActivite !== 'smt' || !entiteId || !exerciceId) { setSmtAlert(null); return; }
    // Charger la balance pour calculer le CA (comptes 70x)
    const fetchCA = async () => {
      try {
        const offr = etatBaseProps.offre;
        let lignes: { numero_compte: string; solde_crediteur?: number; solde_crediteur_revise?: number; solde_debiteur?: number; solde_debiteur_revise?: number }[] = [];
        if (offr === 'comptabilite') {
          const res = await fetch(`/api/ecritures/balance/${entiteId}/${exerciceId}`);
          const data = await res.json();
          lignes = data.lignes || [];
        } else {
          const res = await fetch(`/api/balance/${entiteId}/${exerciceId}/N`);
          const data = await res.json();
          lignes = data.lignes || [];
        }
        // CA = somme soldes créditeurs des comptes 70x
        let ca = 0;
        lignes.forEach((l) => {
          const num = (l.numero_compte || '').trim();
          if (num.startsWith('70') || num.startsWith('71')) {
            const sc = parseFloat(String(l.solde_crediteur_revise ?? l.solde_crediteur)) || 0;
            const sd = parseFloat(String(l.solde_debiteur_revise ?? l.solde_debiteur)) || 0;
            ca += sc - sd;
          }
        });
        // Seuils OHADA : négoce 60M, artisanal 40M, services 30M — on prend le plus bas (30M) comme alerte générale
        // et 60M comme seuil max
        const seuilMin = 30000000;
        const seuilMax = 60000000;
        if (ca > seuilMin) {
          setSmtAlert({ show: true, ca: Math.round(ca), seuil: ca > seuilMax ? seuilMax : seuilMin });
        } else {
          setSmtAlert(null);
        }
      } catch { setSmtAlert(null); }
    };
    fetchCA();
  }, [typeActivite, entiteId, exerciceId, etatBaseProps.offre]);

  return (
    <main className="dashboard-main">
      <Suspense fallback={<div style={{ padding: 40, textAlign: 'center' }}>Chargement...</div>}>
      {/* ACCUEIL */}
      {activeTab === 'accueil' && (
        <div>
          <div className="main-header">
            <h1>Bienvenue, {userName ? userName.split(' ')[0] : 'Utilisateur'} <LuHandHelping /></h1>
            <ExerciceSelector {...exerciceSelectorProps} />
          </div>

          {/* Alerte bascule SMT → SYSCOHADA */}
          {smtAlert?.show && !smtAlertDismissed && (
            <div style={{
              background: 'linear-gradient(135deg, #FEF3CD 0%, #FFF8E1 100%)',
              border: '1px solid #F0C674',
              borderRadius: 10,
              padding: '16px 20px',
              margin: '0 24px 16px',
              display: 'flex',
              alignItems: 'flex-start',
              gap: 14,
              boxShadow: '0 2px 8px rgba(212,168,67,0.15)',
            }}>
              <LuTriangleAlert size={24} style={{ color: '#D4A843', flexShrink: 0, marginTop: 2 }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: 14, color: '#8B6914', marginBottom: 4 }}>
                  Chiffre d'affaires au-dessus du seuil SMT
                </div>
                <p style={{ fontSize: 13, color: '#6B5317', margin: '0 0 8px', lineHeight: 1.5 }}>
                  Votre CA de l'exercice en cours est de <strong>{Math.round(smtAlert.ca).toLocaleString('fr-FR')} FCFA</strong>,
                  ce qui dépasse le seuil de <strong>{smtAlert.seuil.toLocaleString('fr-FR')} FCFA</strong>.
                  Selon l'Acte uniforme OHADA (art. 13), si ce dépassement se confirme sur deux exercices consécutifs,
                  vous devez basculer vers le <strong>système normal SYSCOHADA</strong>.
                </p>
                <div style={{ display: 'flex', gap: 10 }}>
                  <button
                    onClick={() => openTab('parametres')}
                    style={{
                      background: '#D4A843', color: '#fff', border: 'none', borderRadius: 6,
                      padding: '6px 14px', fontSize: 12, fontWeight: 600, cursor: 'pointer',
                      display: 'flex', alignItems: 'center', gap: 4,
                    }}
                  >
                    <LuArrowUpRight size={14} /> Basculer vers SYSCOHADA
                  </button>
                  <button
                    onClick={() => setSmtAlertDismissed(true)}
                    style={{
                      background: 'transparent', color: '#8B6914', border: '1px solid #D4A843', borderRadius: 6,
                      padding: '6px 14px', fontSize: 12, cursor: 'pointer',
                    }}
                  >
                    Rappeler plus tard
                  </button>
                </div>
              </div>
            </div>
          )}

          <div className="welcome-banner">
            <div className="welcome-text">
              <h3>NORMX {moduleLabel} - {getTypeLabel(typeActivite)}</h3>
              <p>
                {activeModule === 'compta'
                  ? 'Gérez votre comptabilité : saisie des écritures, journaux, grand livre, balance et déclarations.'
                  : typeActivite === 'entreprise'
                  ? 'Produisez vos états financiers SYSCOHADA : bilan, compte de résultat, TFT et notes annexes.'
                  : typeActivite === 'projet_developpement'
                  ? 'Produisez vos états financiers SYCEBNL pour projets de développement.'
                  : 'Produisez vos états financiers SYCEBNL : bilan, compte de résultat, tableau des flux de trésorerie et notes annexes.'
                }
              </p>
            </div>
          </div>

          {!exerciceId && (
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
      )}

      {/* TIERS */}
      {(activeTab === 'tiers_membres' || activeTab === 'tiers_fournisseurs' || activeTab === 'tiers_bailleurs' || activeTab === 'tiers_personnel') && (
        <TiersPage
          entiteId={entiteId}
          entiteName={entiteName}
          defaultType={activeTab === 'tiers_membres' ? 'membre' : activeTab === 'tiers_fournisseurs' ? 'fournisseur' : activeTab === 'tiers_bailleurs' ? 'bailleur' : 'personnel'}
          onBack={() => openTab('accueil')}
        />
      )}

      {/* COMPTABILITE */}
      {(activeTab === 'journal' || activeTab === 'journaux' || activeTab === 'grand_livre' || activeTab === 'balance' || activeTab === 'lettrage' || activeTab === 'grand_livre_tiers' || activeTab === 'balance_tiers' || activeTab === 'balance_agee' || activeTab === 'echeancier') && (() => {
        return (<div>
          <ExerciceSelector {...exerciceSelectorProps} />
          {!exerciceId && <div className="empty-state-msg">Créez un exercice pour commencer la saisie.</div>}
          {exerciceId && activeTab === 'journal' && (
            <SaisieJournal entiteId={entiteId} exerciceId={exerciceId} exerciceAnnee={currentExAnnee} onBack={() => openTab('accueil')} />
          )}
          {exerciceId && activeTab === 'grand_livre' && (
            <GrandLivre entiteId={entiteId} exerciceId={exerciceId} exerciceAnnee={currentExAnnee} entiteName={entiteName} entiteSigle={entiteSigle} entiteAdresse={entiteAdresse} entiteNif={entiteNif} onBack={() => openTab('accueil')} />
          )}
          {exerciceId && activeTab === 'balance' && (
            <BalanceGenerale entiteId={entiteId} exerciceId={exerciceId} entiteName={entiteName} entiteSigle={entiteSigle} entiteAdresse={entiteAdresse} entiteNif={entiteNif} exerciceAnnee={currentExAnnee} onBack={() => openTab('accueil')} />
          )}
          {exerciceId && activeTab === 'lettrage' && (
            <Lettrage entiteId={entiteId} exerciceId={exerciceId} exerciceAnnee={currentExAnnee} onBack={() => openTab('accueil')} />
          )}
          {exerciceId && activeTab === 'grand_livre_tiers' && (
            <GrandLivreTiers entiteId={entiteId} exerciceId={exerciceId} exerciceAnnee={currentExAnnee} entiteName={entiteName} entiteSigle={entiteSigle} entiteAdresse={entiteAdresse} entiteNif={entiteNif} onBack={() => openTab('accueil')} />
          )}
          {exerciceId && activeTab === 'balance_tiers' && (
            <BalanceTiers entiteId={entiteId} exerciceId={exerciceId} exerciceAnnee={currentExAnnee} entiteName={entiteName} entiteSigle={entiteSigle} entiteAdresse={entiteAdresse} entiteNif={entiteNif} onBack={() => openTab('accueil')} />
          )}
          {exerciceId && activeTab === 'journaux' && (
            <Journaux entiteId={entiteId} exerciceId={exerciceId} exerciceAnnee={currentExAnnee} entiteName={entiteName} onBack={() => openTab('accueil')} />
          )}
          {exerciceId && activeTab === 'balance_agee' && (
            <BalanceAgee entiteId={entiteId} exerciceId={exerciceId} exerciceAnnee={currentExAnnee} onBack={() => openTab('accueil')} />
          )}
          {exerciceId && activeTab === 'echeancier' && (
            <Echeancier entiteId={entiteId} exerciceId={exerciceId} exerciceAnnee={currentExAnnee} onBack={() => openTab('accueil')} />
          )}
        </div>);
      })()}

      {/* DECLARATIONS TVA */}
      {activeTab === 'declarations_tva' && (
        <div>
          <ExerciceSelector {...exerciceSelectorProps} />
          {!exerciceId && <div className="empty-state-msg">Créez un exercice pour commencer.</div>}
          {exerciceId && (
            <DeclarationTVA
              entiteId={entiteId}
              exerciceId={exerciceId}
              exerciceAnnee={currentExAnnee}
              entiteName={entiteName}
              entiteSigle={entiteSigle}
              entiteNif={entiteNif}
              entiteAdresse={entiteAdresse}
              onBack={() => openTab('accueil')}
              onGoToParametres={() => openTab('parametres')}
            />
          )}
        </div>
      )}

      {/* DONNEES */}
      {activeTab === 'import_balance' && (
        <div>
          <ExerciceSelector {...exerciceSelectorProps} />
          {!exerciceId && <div className="empty-state-msg">Créez un exercice pour accéder à l'import de balance.</div>}
          {exerciceId && <ImportBalance entiteId={entiteId} userId={userId} exerciceId={exerciceId} exerciceAnnee={currentExAnnee} />}
        </div>
      )}
      {activeTab === 'revision_comptes' && (
        <div>
          <ExerciceSelector {...exerciceSelectorProps} />
          {!exerciceId && <div className="empty-state-msg">Créez un exercice pour accéder à la révision.</div>}
          {exerciceId && (
            <RevisionComptes
              entiteId={entiteId}
              exerciceId={exerciceId}
              exerciceAnnee={currentExAnnee}
              entiteName={entiteName}
            />
          )}
        </div>
      )}
      {activeTab === 'balance_revisee' && (
        <div>
          <ExerciceSelector {...exerciceSelectorProps} />
          {!exerciceId && <div className="empty-state-msg">Créez un exercice pour voir la balance révisée.</div>}
          {exerciceId && (
            <BalanceRevisee
              entiteId={entiteId}
              exerciceId={exerciceId}
              exerciceAnnee={currentExAnnee}
            />
          )}
        </div>
      )}

      {/* ETATS FINANCIERS */}
      {activeTab === 'bilan_actif' && <BilanSYCEBNL page="actif" {...etatBaseProps} />}
      {activeTab === 'bilan_passif' && <BilanSYCEBNL page="passif" {...etatBaseProps} />}
      {activeTab === 'compte_resultat' && <CompteResultatSYCEBNL {...etatBaseProps} />}
      {activeTab === 'flux_tresorerie' && <TFT_SYCEBNL {...etatBaseProps} />}
      {activeTab === 'emplois_ressources' && <TER_Projet {...etatBaseProps} />}
      {activeTab === 'execution_budgetaire' && <ExecBudgetaire_Projet {...etatBaseProps} />}
      {activeTab === 'reconciliation_tresorerie' && <ReconcTresorerie_Projet {...etatBaseProps} />}
      {activeTab === 'bilan_projet' && <BilanProjet {...etatBaseProps} />}
      {activeTab === 'compte_exploitation' && <CompteExploitation_Projet {...etatBaseProps} />}
      {activeTab === 'bilan_smt' && <BilanSMT {...etatBaseProps} />}
      {activeTab === 'compte_resultat_smt' && <CompteResultatSMT {...etatBaseProps} />}
      {activeTab === 'notes_annexes_smt' && <NotesAnnexesSMT {...etatBaseProps} />}
      {activeTab === 'journal_tresorerie_smt' && <JournalTresorerieSMT {...etatBaseProps} />}
      {activeTab === 'journaux_smt' && <JournauxSMT {...etatBaseProps} />}
      {activeTab === 'page_garde_sys' && <PageDeGarde {...etatBaseProps} />}
      {activeTab === 'fiche_identification_sys' && <FicheIdentification {...etatBaseProps} page="R1" onGoToParametres={() => openTab('parametres')} />}
      {activeTab === 'fiche_r2_sys' && <FicheIdentification {...etatBaseProps} page="R2" onGoToParametres={() => openTab('parametres')} />}
      {activeTab === 'fiche_r3_sys' && <FicheR3 {...etatBaseProps} onGoToParametres={() => openTab('parametres')} />}
      {activeTab === 'fiche_r4_sys' && <FicheR4 {...etatBaseProps} onGoToParametres={() => openTab('parametres')} />}
      {/* Navigation entre notes */}
      {filteredNotes.some(n => n.id === activeTab) && (() => {
        const idx = filteredNotes.findIndex(n => n.id === activeTab);
        const prev = idx > 0 ? filteredNotes[idx - 1] : null;
        const next = idx < filteredNotes.length - 1 ? filteredNotes[idx + 1] : null;
        const current = filteredNotes[idx];
        return (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 20px', background: '#f8f9fb', borderBottom: '1px solid #e5e7eb' }}>
            <button
              onClick={() => prev && openTab(prev.id)}
              disabled={!prev}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 14px', border: '1px solid #d1d5db', borderRadius: 6, background: prev ? '#fff' : '#f3f4f6', color: prev ? '#1e40af' : '#9ca3af', fontSize: 12, fontWeight: 600, cursor: prev ? 'pointer' : 'default' }}
            >
              <span style={{ fontSize: 16 }}>&larr;</span> {prev ? prev.titre + ' — ' + prev.desc : ''}
            </button>
            <span style={{ fontSize: 13, fontWeight: 700, color: '#334155' }}>{current?.titre}</span>
            <button
              onClick={() => next && openTab(next.id)}
              disabled={!next}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 14px', border: '1px solid #d1d5db', borderRadius: 6, background: next ? '#fff' : '#f3f4f6', color: next ? '#1e40af' : '#9ca3af', fontSize: 12, fontWeight: 600, cursor: next ? 'pointer' : 'default' }}
            >
              {next ? next.titre + ' — ' + next.desc : ''} <span style={{ fontSize: 16 }}>&rarr;</span>
            </button>
          </div>
        );
      })()}
      {activeTab === 'note_1_sys' && <Note1 {...etatBaseProps} onGoToParametres={() => openTab('parametres')} />}
      {activeTab === 'note_2_sys' && <Note2 {...etatBaseProps} onGoToParametres={() => openTab('parametres')} />}
      {activeTab === 'note_3a_sys' && <Note3A {...etatBaseProps} onGoToParametres={() => openTab('parametres')} />}
      {activeTab === 'note_3b_sys' && <Note3B {...etatBaseProps} onGoToParametres={() => openTab('parametres')} />}
      {activeTab === 'note_3c_sys' && <Note3C {...etatBaseProps} onGoToParametres={() => openTab('parametres')} />}
      {activeTab === 'note_3d_sys' && <Note3D {...etatBaseProps} onGoToParametres={() => openTab('parametres')} />}
      {activeTab === 'note_3e_sys' && <Note3E {...etatBaseProps} onGoToParametres={() => openTab('parametres')} />}
      {activeTab === 'note_4_sys' && <Note4 {...etatBaseProps} onGoToParametres={() => openTab('parametres')} />}
      {activeTab === 'note_5_sys' && <Note5 {...etatBaseProps} onGoToParametres={() => openTab('parametres')} />}
      {activeTab === 'note_6_sys' && <Note6 {...etatBaseProps} onGoToParametres={() => openTab('parametres')} />}
      {activeTab === 'note_7_sys' && <Note7 {...etatBaseProps} onGoToParametres={() => openTab('parametres')} />}
      {activeTab === 'note_8_sys' && <Note8 {...etatBaseProps} onGoToParametres={() => openTab('parametres')} />}
      {activeTab === 'note_8a_sys' && <Note8A {...etatBaseProps} onGoToParametres={() => openTab('parametres')} />}
      {activeTab === 'note_9_sys' && <Note9 {...etatBaseProps} onGoToParametres={() => openTab('parametres')} />}
      {activeTab === 'note_10_sys' && <Note10 {...etatBaseProps} onGoToParametres={() => openTab('parametres')} />}
      {activeTab === 'note_11_sys' && <Note11 {...etatBaseProps} onGoToParametres={() => openTab('parametres')} />}
      {activeTab === 'note_12_sys' && <Note12 {...etatBaseProps} onGoToParametres={() => openTab('parametres')} />}
      {activeTab === 'note_13_sys' && <Note13 {...etatBaseProps} onGoToParametres={() => openTab('parametres')} />}
      {activeTab === 'note_14_sys' && <Note14 {...etatBaseProps} onGoToParametres={() => openTab('parametres')} />}
      {activeTab === 'note_15a_sys' && <Note15A {...etatBaseProps} onGoToParametres={() => openTab('parametres')} />}
      {activeTab === 'note_15b_sys' && <Note15B {...etatBaseProps} onGoToParametres={() => openTab('parametres')} />}
      {activeTab === 'note_16a_sys' && <Note16A {...etatBaseProps} onGoToParametres={() => openTab('parametres')} />}
      {activeTab === 'note_16b_sys' && <Note16B {...etatBaseProps} onGoToParametres={() => openTab('parametres')} />}
      {activeTab === 'note_16c_sys' && <Note16C {...etatBaseProps} onGoToParametres={() => openTab('parametres')} />}
      {activeTab === 'note_17_sys' && <Note17 {...etatBaseProps} onGoToParametres={() => openTab('parametres')} />}
      {activeTab === 'note_18_sys' && <Note18 {...etatBaseProps} onGoToParametres={() => openTab('parametres')} />}
      {activeTab === 'note_19_sys' && <Note19 {...etatBaseProps} onGoToParametres={() => openTab('parametres')} />}
      {activeTab === 'note_20_sys' && <Note20 {...etatBaseProps} onGoToParametres={() => openTab('parametres')} />}
      {activeTab === 'note_21_sys' && <Note21 {...etatBaseProps} onGoToParametres={() => openTab('parametres')} />}
      {activeTab === 'note_22_sys' && <Note22 {...etatBaseProps} onGoToParametres={() => openTab('parametres')} />}
      {activeTab === 'note_23_sys' && <Note23 {...etatBaseProps} onGoToParametres={() => openTab('parametres')} />}
      {activeTab === 'note_24_sys' && <Note24 {...etatBaseProps} onGoToParametres={() => openTab('parametres')} />}
      {activeTab === 'note_25_sys' && <Note25 {...etatBaseProps} onGoToParametres={() => openTab('parametres')} />}
      {activeTab === 'note_26_sys' && <Note26 {...etatBaseProps} onGoToParametres={() => openTab('parametres')} />}
      {activeTab === 'note_27a_sys' && <Note27A {...etatBaseProps} onGoToParametres={() => openTab('parametres')} />}
      {activeTab === 'note_27b_sys' && <Note27B {...etatBaseProps} onGoToParametres={() => openTab('parametres')} />}
      {activeTab === 'note_28_sys' && <Note28 {...etatBaseProps} onGoToParametres={() => openTab('parametres')} />}
      {activeTab === 'note_29_sys' && <Note29 {...etatBaseProps} onGoToParametres={() => openTab('parametres')} />}
      {activeTab === 'note_30_sys' && <Note30 {...etatBaseProps} onGoToParametres={() => openTab('parametres')} />}
      {activeTab === 'note_31_sys' && <Note31 {...etatBaseProps} onGoToParametres={() => openTab('parametres')} />}
      {activeTab === 'note_32_sys' && <Note32 {...etatBaseProps} onGoToParametres={() => openTab('parametres')} />}
      {activeTab === 'note_33_sys' && <Note33 {...etatBaseProps} onGoToParametres={() => openTab('parametres')} />}
      {activeTab === 'note_34_sys' && <Note34 {...etatBaseProps} onGoToParametres={() => openTab('parametres')} />}
      {activeTab === 'note_35_sys' && <Note35 {...etatBaseProps} onGoToParametres={() => openTab('parametres')} />}
      {activeTab === 'note_36_sys' && <Note36 {...etatBaseProps} onGoToParametres={() => openTab('parametres')} />}
      {activeTab === 'note_37_sys' && <Note37 {...etatBaseProps} onGoToParametres={() => openTab('parametres')} />}
      {/* NOTES ANNEXES — Cards horizontales */}
      {activeTab === 'notes_annexes_sys' && (
        <div style={{ padding: '20px 24px' }}>
          <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 16, color: '#1a1a1a' }}>Notes annexes SYSCOHADA</h2>
          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
            gap: 14,
          }}>
            {filteredNotes.map(note => (
              <div key={note.id} onClick={() => openTab(note.id)} style={{
                background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8,
                padding: '16px 20px', cursor: 'pointer', transition: 'box-shadow 0.15s, border-color 0.15s',
                display: 'flex', alignItems: 'center', gap: 14,
              }}
                onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.borderColor = '#D4A843'; (e.currentTarget as HTMLDivElement).style.boxShadow = '0 2px 8px rgba(212,168,67,0.15)'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.borderColor = '#e5e7eb'; (e.currentTarget as HTMLDivElement).style.boxShadow = 'none'; }}
              >
                <div style={{
                  width: 44, height: 44, borderRadius: 8, background: '#1A3A5C',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: '#fff', fontWeight: 700, fontSize: 13, flexShrink: 0,
                }}>
                  {note.titre.replace('Note ', 'N')}
                </div>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 14, color: '#1a1a1a' }}>{note.titre}</div>
                  <div style={{ fontSize: 12, color: '#666', marginTop: 2 }}>{note.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'bilan_actif_sys' && <BilanSYSCOHADA page="actif" {...etatBaseProps} />}
      {activeTab === 'bilan_passif_sys' && <BilanSYSCOHADA page="passif" {...etatBaseProps} />}
      {activeTab === 'compte_resultat_sys' && <CompteResultatSYSCOHADA {...etatBaseProps} />}
      {activeTab === 'tafire' && <TFT_SYSCOHADA {...etatBaseProps} />}
      {activeTab === 'resultat_fiscal_sys' && <ResultatFiscal {...etatBaseProps} />}
      {etats.some(e => e.id === activeTab) && !IMPLEMENTED_ETATS.includes(activeTab) && (
        <div className="placeholder-content">
          <h2>{etats.find(e => e.id === activeTab)?.titre}</h2>
          <p>Module en cours de développement.</p>
        </div>
      )}

      {/* OUTILS */}
      {activeTab === 'assistant' && <AssistantChat userName={userName} userId={userId} typeActivite={typeActivite} />}
      {activeTab === 'rapports' && (
        <div>
          <ExerciceSelector {...exerciceSelectorProps} />
          {!exerciceId && <div className="empty-state-msg">Sélectionnez un exercice pour voir les rapports.</div>}
          {exerciceId && (
            <Rapports entiteId={entiteId} exerciceId={exerciceId} exerciceAnnee={currentExAnnee} exercices={exercices} offre={offre} entiteName={entiteName} entiteSigle={entiteSigle} entiteAdresse={entiteAdresse} entiteNif={entiteNif} />
          )}
        </div>
      )}
      {['sig', 'tableau_bord', 'repartition_charges', 'suivi_tresorerie', 'comparatif'].includes(activeTab) && (
        <div>
          <ExerciceSelector {...exerciceSelectorProps} />
          {!exerciceId && <div className="empty-state-msg">Sélectionnez un exercice pour voir ce rapport.</div>}
          {exerciceId && activeTab === 'sig' && (
            <SoldesIntermediaires entiteId={entiteId} exerciceId={exerciceId} exerciceAnnee={currentExAnnee} exercices={exercices} offre={offre} entiteName={entiteName} entiteSigle={entiteSigle} entiteAdresse={entiteAdresse} entiteNif={entiteNif} onBack={() => openTab('accueil')} />
          )}
          {exerciceId && activeTab === 'tableau_bord' && (
            <TableauBord entiteId={entiteId} exerciceId={exerciceId} exerciceAnnee={currentExAnnee} exercices={exercices} offre={offre} entiteName={entiteName} entiteSigle={entiteSigle} entiteAdresse={entiteAdresse} entiteNif={entiteNif} onBack={() => openTab('accueil')} />
          )}
          {exerciceId && activeTab === 'repartition_charges' && (
            <RepartitionCharges entiteId={entiteId} exerciceId={exerciceId} exerciceAnnee={currentExAnnee} exercices={exercices} offre={offre} entiteName={entiteName} entiteSigle={entiteSigle} entiteAdresse={entiteAdresse} entiteNif={entiteNif} onBack={() => openTab('accueil')} />
          )}
          {exerciceId && activeTab === 'suivi_tresorerie' && (
            <SuiviTresorerie entiteId={entiteId} exerciceId={exerciceId} exerciceAnnee={currentExAnnee} exercices={exercices} offre={offre} entiteName={entiteName} entiteSigle={entiteSigle} entiteAdresse={entiteAdresse} entiteNif={entiteNif} onBack={() => openTab('accueil')} />
          )}
          {exerciceId && activeTab === 'comparatif' && (
            <ComparatifNN1 entiteId={entiteId} exerciceId={exerciceId} exerciceAnnee={currentExAnnee} exercices={exercices} offre={offre} entiteName={entiteName} entiteSigle={entiteSigle} entiteAdresse={entiteAdresse} entiteNif={entiteNif} onBack={() => openTab('accueil')} />
          )}
        </div>
      )}
      {activeTab === 'aide_videos' && <AideVideos />}
      {activeTab === 'parametres' && (
        <ParametresEntite entiteId={entiteId} onUpdate={(data: Record<string, string>) => {
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
