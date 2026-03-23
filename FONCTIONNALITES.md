# Normx — Fonctionnalités

## 1. Comptabilité

### Saisie des écritures
- Saisie multi-journaux (OD, achats, ventes, banque, caisse, etc.)
- Validation automatique débit = crédit
- Vérification des comptes contre le plan comptable SYSCOHADA/SYCEBNL
- Détection des anomalies de sens (solde inversé)

### Balance générale
- Colonnes : Statut (coche/croix), Compte, Débit, Crédit, Solde, Sens attendu
- Détection automatique des soldes inversés par rapport aux règles SYSCOHADA
- Résumé des anomalies (erreurs + avertissements)
- Export PDF, Excel, CSV

### Balance des tiers
- Ventilation par type (client, fournisseur, bailleur, personnel)
- Colonnes : Code, Tiers, Type, Compte, Débit, Crédit, Solde débiteur, Solde créditeur
- Filtres par mois, date, recherche
- Export PDF, Excel, CSV

### Grand livre
- Par compte avec solde cumulé
- Par tiers avec groupement
- Filtres par date, journal, compte
- Export PDF, Excel, CSV

### Lettrage
- Lettrage des écritures par compte
- Rapprochement automatique

### Journaux comptables
- Consultation par journal et par période

---

## 2. États financiers

### Import des balances (N et N-1)
- Formats : Excel (.xlsx) ou CSV (séparateur point-virgule)
- Colonnes attendues : Compte, Libellé, SI Débit, SI Crédit, Débit, Crédit, SF Débit, SF Crédit
- Détection automatique :
  - Comptes non reconnus dans le plan SYSCOHADA (avec suggestions)
  - Comptes à plus de 6 chiffres (troncature suggérée)
  - Comptes non repris dans les états financiers (Bilan, CR, TFT)
  - Anomalies de sens (solde inversé) avec impact TFT
- Colonne Statut (coche verte / croix rouge / triangle jaune) par compte
- Correction interactive des comptes

### SYSCOHADA
- Page de garde
- Fiches d'identification R1, R2, R3
- Fiche R4 — Notes applicables (éditable, A/N-A par note)
- Bilan Actif + Passif
- Compte de résultat
- TFT (Tableau des Flux de Trésorerie) avec diagnostic :
  - Équilibre global (ZH = ZI)
  - Affectation du résultat (131, 465, dividendes)
  - Comptes non captés (uniquement si écart)
  - Cohérence des sous-totaux (ZB, ZC, ZD, ZE, ZF, ZG)
  - Anomalies de sens avec impact par poste TFT (FA, FD, FE, FK, FO, ZI)
- 36 Notes annexes (Note 1 à Note 37, hors 3F) :
  - Titres uniformes h3 centré souligné majuscules
  - Navigation flèches précédent/suivant entre les notes
  - Padding uniforme (5px 8px, fontSize 11)
  - Bulles d'information sur les notes 1, 3A, 3B, 3C, 3D, 3E
  - Note 1 : dettes garanties, montants éditables, paysage, bulle info
  - Note 2 : informations obligatoires, 4 sections encadrées
  - Note 3A : immobilisations brutes (comptes 221-229, 246-249)
  - Note 3B : biens en location-acquisition
  - Note 3C : amortissements
  - Note 3D : cessions, saisie manuelle complète, indicateurs balance (81/82)
  - Note 3E : réévaluations, connectée à Note 3A, coûts historiques depuis balance (si_debit), écarts/provisions pré-remplis depuis 3A
  - Note 4 : immobilisations financières, paysage
  - Note 5 : actif/dettes HAO (fournisseurs invest / FNP / effets séparés)
  - Note 6 : stocks avec colonne variation de stock (N - N-1)
  - Note 7 à Note 37 : toutes fonctionnelles avec données balance

### SYCEBNL
- Bilan Actif + Passif
- Compte de résultat
- TFT SYCEBNL

### Projets de développement
- Tableau Emplois-Ressources (TER)
- Exécution budgétaire
- Réconciliation de trésorerie
- Bilan projet
- Compte d'exploitation

### SMT (Système Minimal de Trésorerie)
- Bilan SMT
- Compte de résultat SMT
- Notes annexes SMT
- Journal de trésorerie SMT
- Journaux SMT

---

## 3. Révision de comptes

### 12 onglets de révision
| Onglet | Contrôles automatisés |
|--------|----------------------|
| Capitaux propres | Affectation résultat, réserve légale, niveau KP |
| Provisions réglementées | Réglementées, dérogatoires, risques et charges |
| Subventions | Amortissable / non amortissable, rapprochement |
| Dettes financières | Prêts, intérêts, courus, autres charges |
| Immobilisations | Inventaire, fichier immo, encours, sorties, amortissements, charges |
| Stocks | Inventaire, valorisation, variations, route, dépréciations |
| Fournisseurs | Réconciliation, FAR, débiteurs, avances, devises, circularisation |
| Clients | Recouvrabilité, douteux, dépréciations, devises, circularisation, PAR |
| État (IS, TVA) | IS, TVA collectée/déductible, impôts, dettes, redressements |
| Trésorerie | Rapprochement, caisse, titres, virements internes, devises, circularisation |
| Personnel | Cadrage charges, congés payés, avances, dettes sociales |
| Autres tiers | CCA, PCA, comptes d'attente, divers, écarts conversion |

### Fonctionnalités transversales
- **AlertesCompte** : détection automatique anomalies de sens + exclusions OHADA (11 règles)
- **FonctionnementCompte** : référence JO OHADA pliable (contenu, débit/crédit, exclusions, commentaires, contrôles)
- Journal OD avec suggestions d'écritures
- Sauvegarde/chargement par API

---

## 4. Assistant IA

- Multi-agents : SYSCOHADA, SYCEBNL, Projets, SMT, Révision
- Routing automatique selon le contenu du message
- Titre et suggestions adaptés au type d'entité
- RAG Qdrant — 359 points indexés :
  - Fonctionnement des comptes classes 1-8 (81 comptes avec contenu, débit/crédit, exclusions, commentaires, contrôles)
  - Chapitre 6 Ressources Durables (93 articles §700-§770)
  - KB SYSCOHADA (40 articles)
  - KB SYCEBNL (125 articles)
  - KB SMT (20 articles)
- Mémoire utilisateur (clé-valeur persistante)
- Modèle : Claude Sonnet (Anthropic SDK)
- Embeddings : paraphrase-multilingual-MiniLM-L12-v2 (384 dim)

---

## 5. Plan comptable enrichi

- SYSCOHADA : 1 409 comptes avec champ `sens` (debiteur/crediteur/mixte)
- SYCEBNL : 1 140 comptes avec champ `sens`
- Comptes 603/73 marqués `mixte` (variation de stocks)
- API `/api/assistant/fonctionnement-comptes` pour les données KB

---

## 6. Rapports

- Soldes Intermédiaires de Gestion (SIG)
- Tableau de bord
- Répartition des charges
- Suivi de trésorerie
- Comparatif N/N-1

---

## 7. Paie Congo-Brazzaville

### Moteur de calcul
- Calcul complet du bulletin de paie conforme au CGI 2026
- CNSS salariale (4%, plafond 1 200 000) et patronale (vieillesse 8%, AF 10.03%, AT 2.25%)
- CAMU (0.5% sur fraction > 500 000 FCFA)
- TUS (7.5% résident, 6% non-résident)
- ITS (barème progressif)
- TOL (Taxe d'Occupation de Logement)
- Taxe régionale
- Prime d'ancienneté automatique

### Conventions collectives (6+)
| Convention | Grille salariale | Primes spécifiques |
|-----------|-----------------|-------------------|
| Convention générale du travail | Oui | Heures sup (+25%/+50%), dimanche/fériés (+100%) |
| Pétrole | 17 cat × 8 éch (2023) | Ancienneté, 13e mois, quart, offshore, onshore, séparation, panier, caisse, intéressement |
| Commerce | Oui | Primes conventionnelles |
| Banques, Assurances, Microfinance | Oui | Primes conventionnelles |
| Hôtellerie et Catering | Oui | Primes conventionnelles |
| Domestique de Maison | Oui | Primes conventionnelles |
| Information et Communication | Oui | Primes conventionnelles |

### Composants
- Bulletin de paie (génération/affichage)
- Assistant création salarié (wizard)
- Assistant création établissement (wizard)
- Liste des salariés
- Gestion des absences
- Organismes sociaux
- Assistant déclarations sociales/fiscales
- Tableau de bord paie

### Textes légaux intégrés
- Code du travail (salaire)
- Taxe unique sur les salaires
- CAMU (Assurance Maladie Universelle)

---

## 8. Infrastructure

- Multi-entités / multi-exercices / multi-cabinets
- Gestion des exercices (ouvert / clôturé / réouvert)
- Authentification (login / register)
- Paramètres entité (nom, sigle, adresse, NIF, dirigeants)
- Données sauvegardées en JSONB (notes, ajustements, commentaires)
- Export PDF / Excel / CSV sur tous les états
- Stack : React 19 + TypeScript / Node.js Express / PostgreSQL / Qdrant / Claude API
