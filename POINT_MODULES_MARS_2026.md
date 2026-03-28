# Point Normx — Mars 2026

> **Dernière mise à jour : 28/03/2026** — Phase 1 (base SYCEBNL) terminée

### Avancement Phase 1 — Base de connaissances SYCEBNL : TERMINÉE

| Tâche | Statut | Fichier |
|-------|--------|---------|
| Partie 1 — Définitions + Cadre conceptuel (p.33-67) | **FAIT** | `sycebnl_partie1_definitions_cadre_conceptuel.json` |
| Partie 2 — Fonctionnement comptes classe 1 (p.106-132) | **FAIT** | `sycebnl_fonctionnement_comptes_classe1.json` |
| Partie 2 — Fonctionnement comptes classe 2 (p.133-164) | **FAIT** | `sycebnl_fonctionnement_comptes_classe2.json` |
| Partie 2 — Fonctionnement comptes classes 3-4 (p.165-217) | **FAIT** | `sycebnl_fonctionnement_comptes_classe3_4.json` |
| Partie 2 — Fonctionnement comptes classes 5-9 (p.218-308) | **FAIT** | `sycebnl_fonctionnement_comptes_classe5_6_7_8_9.json` |
| Partie 3 — Opérations spécifiques (p.309-338) | **FAIT** | `sycebnl_partie3_operations_specifiques.json` |
| Partie 4 — États financiers + TFT méthode directe (p.339-435) | **FAIT** | `sycebnl_partie4_etats_financiers_tft.json` |

**7 fichiers JSON, ~94 articles, 438 pages du PDF SYCEBNL-2022 traitées. Base SYCEBNL = 100%.**

### Avancement Phase 2 — États financiers

| Tâche | Statut | Fichier |
|-------|--------|---------|
| TFT SYCEBNL aligné méthode directe | **FAIT 28/03** | `TFT_SYCEBNL.tsx` (codes FA-FQ/ZA-ZG) |
| Composant Résultat fiscal | **FAIT 28/03** | `ResultatFiscal.tsx` (IS/IBA, CGI Congo 2026) |
| DSF | **DÉJÀ FAIT** | Couverte par la liasse existante |
| Notes 3F/3G | **À faire** | — |

### Avancement Phase 3 — Paie

| Tâche | Statut | Détail |
|-------|--------|--------|
| Persistance bulletins | **FAIT 28/03** | `saveBulletin` (upsert), `getBulletin`, `genererBulletinsBatch` + routes API + contrainte UNIQUE |

**Build vérifié : zero erreur TypeScript, compilation OK.**
**Projet poussé sur GitHub : https://github.com/normx-ai/normx (28/03/2026)**

### Avancement Infra & Securite

| Tache | Statut | Detail |
|-------|--------|--------|
| Keycloak SSO | **FAIT 28/03** | auth.normx-ai.com, realm normx, 3 clients (tax, app, legal), 6 roles |
| Brute force protection | **FAIT 28/03** | 5 tentatives → 15 min blocage |
| CGI-242 → Keycloak | **FAIT 28/03** | Backend JWKS + frontend redirect + role fiscaliste |
| Legal → Keycloak | **FAIT 28/03** | Backend JWKS + frontend redirect + role legal + auto-creation user |
| Securite Legal (10 points) | **FAIT 28/03** | Rate limiting, CORS, PrismaClient singleton, cleanup fichiers, 131 any→0 |
| Police Inter | **FAIT 28/03** | Harmonisee sur les 3 projets |
| Landing normx-ai.com | **FAIT 28/03** | Style Pennylane, formulaire contact, 3 produits |
| Repos GitHub unifies | **FAIT 28/03** | normx-ai/normx, normx-ai/tax, normx-ai/legal |

### 4 sites en ligne

| Site | URL | Status |
|------|-----|--------|
| Landing | https://normx-ai.com | 200 |
| Tax (CGI-242) | https://tax.normx-ai.com | 200 |
| Legal | https://legal.normx-ai.com | 200 |
| Keycloak SSO | https://auth.normx-ai.com | 302 |

### Avancement Base SYSCOHADA RAG — 65%

| Chapitre | Titre | Statut |
|----------|-------|--------|
| 1 | Concepts fondamentaux | Absent |
| 2 | Actifs immobilises | Absent |
| 3 | Actifs circulants | Absent |
| 4 | Passifs / Tiers | Absent |
| 5 | Tresorerie | Absent |
| **6** | **Ressources durables** | **Fait** (93 articles) |
| **7** | **Amortissements** | **Fait 28/03** (13 articles) |
| **8** | **Provisions et depreciations** | **Fait 28/03** (8 articles) |
| 9 | Cloture / operations fin d'exercice | Absent |
| **10** | **Produits par nature** | **Fait 28/03** (7 articles) |
| **11** | **SIG** | **Fait** (31 articles) |
| **12** | **Operations pour compte de tiers** | **Fait 28/03** (3 articles) |
| **13** | **Operations en participation et GIE** | **Fait 28/03** (9 articles) |
| + | **Fonctionnement comptes classes 1-8** | **Fait** (81 articles) |

### Audit plan comptable SYSCOHADA — TERMINÉ 28/03

- 1 409 comptes, classes 1-9 completes
- Bilan ACTIF/PASSIF : 95%+ couverture
- Compte de resultat : 100% couverture
- Sens debit/credit : 99% conforme
- Incoherences : **0**
- Comptes obsoletes (6811, 6872, 865, 206) : confirmes supprimes dans le SYSCOHADA revise

### Deploiement 28/03 — 5 sites en ligne

| Site | URL | Status | CI/CD |
|------|-----|--------|-------|
| Landing | https://normx-ai.com | 200 | Via CGI-242 workflow |
| Tax (CGI-242) | https://tax.normx-ai.com | 200 | GitHub Actions auto |
| Legal | https://legal.normx-ai.com | 200 | GitHub Actions auto |
| Compta (Normx) | https://app.normx-ai.com | 200 | GitHub Actions auto |
| Keycloak SSO | https://auth.normx-ai.com | 302 | Docker manuel |

### Realisations du 28/03

| # | Realisation |
|---|------------|
| 1 | Base SYCEBNL 100% (7 JSON, 94 articles) |
| 2 | TFT SYCEBNL methode directe |
| 3 | Composant ResultatFiscal.tsx (IS/IBA CGI 2026) |
| 4 | Persistance bulletins paie (API + DB) |
| 5 | Landing page style Pennylane + formulaire contact + accents |
| 6 | Police Inter harmonisee 3 projets |
| 7 | Keycloak deploye (realm normx, 3 clients, 6 roles, brute force) |
| 8 | CGI-242 migre vers Keycloak + role fiscaliste |
| 9 | Legal migre vers Keycloak + role legal + auto-creation user |
| 10 | 10 problemes securite Legal corriges + 131 any→0 |
| 11 | Base SYSCOHADA ch. 7,8,10,12,13 (30%→65%) + audit plan comptable |
| 12 | Rapprochement bancaire backend (PDF/CSV/Excel + matching auto) |
| 13 | 3 repos GitHub unifies sous normx-ai + secrets + workflows CI/CD |
| 14 | Cause racine DB Legal fixee (conflit DNS postgres) |
| 15 | Normx deploye sur app.normx-ai.com |
| 16 | Landing Tax refaite style Pennylane + Showcase 4 sections |
| 17 | Dashboard Tax ameliore (actions 2x2, stats barre or/bleu, sans douanes/hydrocarbures) |
| 18 | Registration Keycloak activee |

**Prochaine session :**
- Harmoniser style or/bleu (#D4A843/#1A3A5C) sur les 3 apps (Legal, Normx, Tax)
- Completer SYSCOHADA chapitres 1-5 et 9
- Backend absences
- Screenshots pour remplacer les images Pennylane
- Rapprochement bancaire frontend

---

## 1. MODULE PAIE (~85% complet)

### Ce qui est fait

- **Moteur de calcul CGI 2026** : ITS, CNSS (sal+pat), CAMU, TUS, TOL, taxe régionale, PNI — tout conforme
- **Bulletin de paie** : rendu complet, print-ready, toutes les rubriques
- **6+ conventions collectives** : Générale, Pétrole, BTP, Commerce, BAM, Hôtellerie (avec grilles salariales)
- **Gestion salariés** : wizard multi-étapes complet (identité, contrat, classification, salaire, indemnités)
- **Gestion établissements** : wizard complet
- **Avantages en nature** : forfait Art. 115 CGI (logement, domesticité, électricité, voiture, téléphone, nourriture)
- **Déclarations** : CNSS, DAS, Nominative — génération fonctionnelle
- **Livre de paie** : multi-vues, charges fiscales/sociales
- **Heures supplémentaires** : par tranches, conventions spécifiques
- **Exports** : PDF, Excel
- **Tests** : bonne couverture (calculs, déclarations, heures sup, PNI, workflow)

### Ce qui manque

| Priorité | Fonctionnalité | Détail |
|----------|---------------|--------|
| ~~P1~~ | ~~Persistance bulletins~~ | **FAIT 28/03** — saveBulletin, getBulletin, batch + routes POST/GET + UNIQUE |
| **P1** | Absences | UI présente, backend non branché |
| **P1** | Intégration comptabilité | Pas de génération auto d'OD (comptes 42x, 43x, 44x) |
| **P2** | Import batch salariés | Pas d'import Excel/CSV d'employés |
| **P2** | Workflow validation | Pas de circuit approbation (RH → Comptabilité) |
| **P2** | Piste d'audit | Pas de traçabilité des modifications |
| **P2** | Déclarations avancées | Pas de suivi dépôt, pas d'e-transmission CNSS/DGI |
| **P3** | Prêts/avances/retenues volontaires | Non implémenté |
| **P3** | Rapports analytiques | Pas de suivi masse salariale par département, turnover |
| **P3** | Provisions sociales Art. 35 | Non implémenté |

---

## 2. MODULE COMPTABILITÉ (~90% complet)

### Ce qui est fait

- **Saisie d'écritures** : multi-journaux (OD, ACH, VTE, BQ, CAI, SUB, DOT, AMO, RAN), validation débit=crédit, workflow brouillard→validée
- **Plan comptable** : SYSCOHADA (1 409 comptes) + SYCEBNL (1 140 comptes)
- **Grand livre** : par compte avec solde cumulé, exports PDF/Excel/CSV
- **Balance générale** : détection d'anomalies, comparatif N/N-1
- **Balance/Grand livre tiers** : par type (client, fournisseur, bailleur, personnel)
- **Lettrage** : matching automatique avec codes alphabétiques, dé-lettrage
- **Gestion tiers** : CRUD complet, soft delete
- **Déclaration TVA** : mensuelle, onglets, lignes détaillées, statut
- **Journaux** : listing par période et type
- **Rapports** : SIG, Tableau de bord, Répartition charges, Suivi trésorerie, Comparatif N/N-1, Journal centralisateur, Balance âgée, Échéancier
- **Import balance** : Excel/CSV avec détection anomalies et révision
- **Gestion exercices** : création, clôture, réouverture
- **Multi-tenant** : isolation par schéma PostgreSQL

### Ce qui manque

| Priorité | Fonctionnalité | Détail |
|----------|---------------|--------|
| **P1** | Rapprochement bancaire | Pas d'import relevé ni matching auto/manuel |
| **P1** | Import batch écritures | Pas d'import CSV/Excel d'écritures |
| **P2** | Écritures de clôture auto | Transfert résultat, A-nouveaux automatiques |
| **P2** | Pièces jointes | Pas de lien facture/reçu sur les écritures |
| **P2** | Workflow approbation | Seul le statut validé/brouillard existe |
| **P3** | Comptabilité analytique | Pas de centres de coûts/projets |
| **P3** | Multi-devises | Non supporté |
| **P3** | Budget vs Réel | Pas de suivi budgétaire |
| **P3** | Consolidation | Pas de multi-entités |

---

## 3. MODULE ÉTATS FINANCIERS (~92% complet)

### Ce qui est fait

- **SYSCOHADA (entreprises)** : Bilan, Compte de résultat (avec HAO), TFT 3 ans, Liasse complète (Page de garde, R1-R4, 37 notes annexes)
- **SYCEBNL (associations/ONG)** : Bilan, CR, TFT, 5 notes
- **SMT (trésorerie simplifiée)** : Bilan/CR simplifiés, Journal de trésorerie, Journaux de suivi
- **Projets de développement** : TER, Exécution budgétaire, Réconciliation trésorerie, Bilan projet, Compte exploitation
- **Import balance** : multi-format, détection anomalies, révision
- **Assistant IA RAG** : 4 agents spécialisés (SYSCOHADA, SYCEBNL, SMT, Révision, Projets), base de connaissances ~1 Mo, recherche vectorielle Qdrant + fallback keyword
- **Export PDF** : tous les états avec jsPDF + html2canvas
- **Comparatif N/N-1/N-2** sur le TFT

### Ce qui manque

| Priorité | Fonctionnalité | Détail |
|----------|---------------|--------|
| ~~P1~~ | ~~Résultat fiscal~~ | **FAIT 28/03** — `ResultatFiscal.tsx` (IS 28%/25%/33%, IBA 30%, min. perception, réintégrations/déductions CGI 2026) |
| ~~P1~~ | ~~DSF complète~~ | **DÉJÀ COUVERTE** par la liasse existante (Page de garde, R1-R4, Bilan, CR, TFT, 37 Notes) |
| **P2** | Liasse 60 pages SYSCOHADA | Templates complets manquants |
| **P2** | Notes 3F/3G | Composants manquants dans les notes annexes |
| **P2** | Tests unitaires TFT | Calculs complexes non testés |
| **P3** | Analyse ratios | Liquidité, rentabilité, solvabilité — pas d'outil dédié |
| **P3** | Consolidation multi-entités | Non supportée |
| **P3** | Formats reporting bailleurs | Pour les projets de développement |
| **P3** | Déclarations fiscales spécifiques | CVAE, TFPF, ISIC, Patente — absentes |

---

## Synthèse globale

| Module | Complétude | Prêt production | Priorité #1 |
|--------|-----------|----------------|-------------|
| **Paie** | ~85% | Calculs OK, persistance incomplète | Persistance bulletins + intégration compta |
| **Comptabilité** | ~90% | Fonctionnel | Rapprochement bancaire + import batch |
| **États** | ~92% | SYSCOHADA quasi complet | Résultat fiscal + DSF |
