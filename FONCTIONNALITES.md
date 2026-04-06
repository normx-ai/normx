# Normx — Fonctionnalites

Derniere mise a jour : 2026-04-06

---

## 1. Comptabilite

### Saisie des ecritures
- Saisie multi-journaux (OD, achats, ventes, banque, caisse)
- Validation automatique debit = credit
- Verification des comptes contre le plan comptable SYSCOHADA/SYCEBNL
- Detection des anomalies de sens (solde inverse)

### Balance generale
- Colonnes : Statut, Compte, Debit, Credit, Solde, Sens attendu
- Detection automatique des soldes inverses par rapport aux regles SYSCOHADA
- Resume des anomalies (erreurs + avertissements)
- Export PDF, Excel

### Balance des tiers
- Ventilation par type (client, fournisseur, bailleur, personnel)
- Colonnes : Code, Tiers, Type, Compte, Debit, Credit, Solde debiteur, Solde crediteur
- Filtres par mois, date, recherche
- Export PDF, Excel

### Grand livre
- Par compte avec solde cumule
- Par tiers avec groupement
- Filtres par date, journal, compte
- Export PDF, Excel

### Lettrage
- Lettrage des ecritures par compte
- Rapprochement automatique

### Journaux comptables
- Consultation par journal et par periode

### Declarations TVA
- Interface complete avec onglets collectee / deductible / impots
- Gestion detaillee des lignes de declaration
- Export des declarations

---

## 2. Etats financiers

### Import des balances (N et N-1)
- Formats : Excel (.xlsx) ou CSV (separateur point-virgule)
- Colonnes attendues : Compte, Libelle, SI Debit, SI Credit, Debit, Credit, SF Debit, SF Credit
- Detection automatique :
  - Comptes non reconnus dans le plan SYSCOHADA (avec suggestions)
  - Comptes a plus de 6 chiffres (troncature suggeree)
  - Comptes non repris dans les etats financiers (Bilan, CR, TFT)
  - Anomalies de sens (solde inverse) avec impact TFT
- Colonne Statut (coche verte / croix rouge / triangle jaune) par compte
- Correction interactive des comptes

### SYSCOHADA
- Page de garde
- Fiches d'identification R1, R2, R3
- Fiche R4 — Notes applicables (editable, A/N-A par note)
- Bilan Actif + Passif
- Compte de resultat
- TFT (Tableau des Flux de Tresorerie) avec diagnostic :
  - Equilibre global (ZH = ZI)
  - Affectation du resultat (131, 465, dividendes)
  - Comptes non captes (uniquement si ecart)
  - Coherence des sous-totaux (ZB, ZC, ZD, ZE, ZF, ZG)
  - Anomalies de sens avec impact par poste TFT (FA, FD, FE, FK, FO, ZI)
- 36 Notes annexes (Note 1 a Note 37, hors 3F) :
  - Navigation fleches precedent/suivant entre les notes
  - Bulles d'information sur les notes 1, 3A, 3B, 3C, 3D, 3E
  - Note 1 : dettes garanties, montants editables, paysage
  - Note 2 : informations obligatoires, 4 sections encadrees
  - Note 3A : immobilisations brutes (comptes 221-229, 246-249)
  - Note 3B : biens en location-acquisition
  - Note 3C : amortissements
  - Note 3D : cessions, saisie manuelle complete, indicateurs balance (81/82)
  - Note 3E : reevaluations, connectee a Note 3A, couts historiques depuis balance
  - Note 4 : immobilisations financieres, paysage
  - Note 5 : actif/dettes HAO (fournisseurs invest / FNP / effets separes)
  - Note 6 : stocks avec colonne variation de stock (N - N-1)
  - Note 7 a Note 37 : toutes fonctionnelles avec donnees balance

### SYCEBNL
- Bilan Actif + Passif
- Compte de resultat
- TFT SYCEBNL

### Projets de developpement
- Tableau Emplois-Ressources (TER)
- Execution budgetaire
- Reconciliation de tresorerie
- Bilan projet
- Compte d'exploitation

### SMT (Systeme Minimal de Tresorerie)
- Bilan SMT
- Compte de resultat SMT
- Notes annexes SMT
- Journal de tresorerie SMT
- Journaux SMT

---

## 3. Revision de comptes

### 12 onglets de revision
| Onglet | Controles automatises |
|--------|----------------------|
| Capitaux propres | Affectation resultat, reserve legale, niveau KP |
| Provisions reglementees | Reglementees, derogatoires, risques et charges |
| Subventions | Amortissable / non amortissable, rapprochement |
| Dettes financieres | Prets, interets, courus, autres charges |
| Immobilisations | Inventaire, fichier immo, encours, sorties, amortissements, charges |
| Stocks | Inventaire, valorisation, variations, route, depreciations |
| Fournisseurs | Reconciliation, FAR, debiteurs, avances, devises, circularisation |
| Clients | Recouvrabilite, douteux, depreciations, devises, circularisation, PAR |
| Etat (IS, TVA) | IS, TVA collectee/deductible, impots, dettes, redressements |
| Tresorerie | Rapprochement bancaire, caisse, titres, virements internes, devises |
| Personnel | Cadrage charges, conges payes, avances, dettes sociales |
| Autres tiers | CCA, PCA, comptes d'attente, divers, ecarts conversion |

### Fonctionnalites transversales
- AlertesCompte : detection automatique anomalies de sens + exclusions OHADA (11 regles)
- FonctionnementCompte : reference JO OHADA pliable (contenu, debit/credit, exclusions, commentaires, controles)
- Journal OD avec suggestions d'ecritures
- Sauvegarde/chargement par API

---

## 4. Assistant IA

- Multi-agents : SYSCOHADA, SYCEBNL, Projets, SMT, Revision
- Routing automatique selon le contenu du message
- Titre et suggestions adaptes au type d'entite
- RAG Qdrant — 359 points indexes :
  - Fonctionnement des comptes classes 1-8 (81 comptes avec contenu, debit/credit, exclusions, commentaires, controles)
  - Chapitre 6 Ressources Durables (93 articles)
  - KB SYSCOHADA (40 articles)
  - KB SYCEBNL (125 articles)
  - KB SMT (20 articles)
- Memoire utilisateur (cle-valeur persistante)
- Modele : Claude Sonnet (Anthropic SDK)
- Embeddings : paraphrase-multilingual-MiniLM-L12-v2 (384 dim)

---

## 5. Plan comptable enrichi

- SYSCOHADA : 1 409 comptes avec champ `sens` (debiteur/crediteur/mixte)
- SYCEBNL : 1 140 comptes avec champ `sens`
- Comptes 603/73 marques `mixte` (variation de stocks)
- API `/api/assistant/fonctionnement-comptes` pour les donnees KB

---

## 6. Rapports

- Soldes Intermediaires de Gestion (SIG)
- Tableau de bord
- Repartition des charges
- Suivi de tresorerie
- Comparatif N/N-1

---

## 7. Paie Congo-Brazzaville

### Moteur de calcul
- Calcul complet du bulletin de paie conforme au CGI 2026
- CNSS salariale (4%, plafond 1 200 000) et patronale (vieillesse 8%, AF 10.03%, AT 2.25%)
- CAMU (0.5% sur fraction > 500 000 FCFA)
- TUS (7.5% resident, 6% non-resident)
- ITS (bareme progressif)
- TOL (Taxe d'Occupation de Logement)
- Taxe regionale
- Prime d'anciennete automatique

### 16 conventions collectives
| Convention | Grille salariale | Primes specifiques |
|-----------|-----------------|-------------------|
| Convention generale du travail | Oui | Heures sup (+25%/+50%), dimanche/feries (+100%) |
| Petrole | 17 cat x 8 ech | Anciennete, 13e mois, quart, offshore, onshore, separation, panier, caisse, interessement |
| Para-petrole | Oui | Primes conventionnelles |
| BTP | Oui | Primes conventionnelles |
| Commerce | Oui | Primes conventionnelles |
| Industrie | Oui | Primes conventionnelles |
| Banques, Assurances, Microfinance | Oui | Primes conventionnelles |
| Agriculture et Foret | Oui | Primes conventionnelles |
| Forestiere | Oui | Primes conventionnelles |
| Auxiliaires de Transport | Oui | Primes conventionnelles |
| Transport Aerien | Oui | Primes conventionnelles |
| Hotellerie et Catering | Oui | Primes conventionnelles |
| Miniere | Oui | Primes conventionnelles |
| Domestique de Maison | Oui | Primes conventionnelles |
| Peche Maritime | Oui | Primes conventionnelles |
| Information et Communication | Oui | Primes conventionnelles |

Chaque convention inclut : anciennete, heures supplementaires, primes, indemnites, majorations, licenciement avec references aux articles du code du travail.

### Composants
- Bulletin de paie (generation/affichage)
- Assistant creation salarie (wizard)
- Assistant creation etablissement (wizard)
- Liste des salaries
- Gestion des absences
- Organismes sociaux
- Assistant declarations sociales/fiscales
- Tableau de bord paie

### Exports paie
- PDF : bulletins de paie, bordereau CNSS, livre de paie
- Excel : bulletins, livre de paie, declarations

### Textes legaux integres
- Code du travail (salaire)
- Taxe unique sur les salaires
- CAMU (Assurance Maladie Universelle)

---

## 8. Infrastructure et securite

### Multi-tenant
- Isolation par schema PostgreSQL (un schema par tenant)
- Row-Level Security (RLS) active sur toutes les tables
- Types de tenant : entreprise, cabinet comptable, client (sous cabinet)
- Gestion des clients pour les cabinets (CRUD, recherche, tri)

### Authentification et autorisation
- Keycloak SSO (OpenID Connect, JWT RS256)
- Cookies httpOnly (pas de tokens en localStorage)
- Refresh automatique avant expiration
- RBAC par module : 7 roles (admin, comptable, gestionnaire_paie, reviseur, gestionnaire, lecture_seule, employe)
- 4 actions par module : lire, creer, modifier, supprimer
- 6 modules : compta, paie, etats, revision, assistant, admin
- Verification croisee tenant JWT vs tenant resolu

### Onboarding
- Wizard 2 etapes pour les nouveaux utilisateurs
- Etape 1 : nom de l'entite + type (entreprise ou cabinet)
- Etape 2 : selection des modules (compta, etats, paie)

### Notifications
- Systeme de notifications temps reel
- Cloche avec badge compteur non-lus
- Marquer comme lu / tout marquer / supprimer
- Polling toutes les 30 secondes

### Audit et securite
- Audit log automatique par tenant (action, module, entite, IP, timestamp)
- Trace des switchs cabinet vers client
- Rate limiting : global (300/15min), auth (10/h), assistant IA (30/h)
- Helmet CSP, CORS configure, requetes parametrees
- Validation regex des noms de schema

### Exercices et entites
- Multi-entites / multi-exercices
- Gestion des exercices (ouvert / cloture / reouvert)
- Parametres entite (nom, sigle, adresse, NIF, dirigeants)
- Donnees sauvegardees en JSONB (notes, ajustements, commentaires)

### Landing page
- Page marketing avec navigation, hero anime, fonctionnalites, tarifs
- Dropdown produits (NORMX AI, NORMX Tax, NORMX Legal)
- Responsive design

### Stack technique
- Frontend : React 19 + TypeScript
- Backend : Node.js Express 5
- Base de donnees : PostgreSQL (multi-schema + RLS)
- Recherche vectorielle : Qdrant
- IA : Claude API (Anthropic SDK)
- Auth : Keycloak SSO
- Deploy : GitHub Actions + Docker + Nginx
