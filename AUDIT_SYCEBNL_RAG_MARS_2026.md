# Audit SYCEBNL — Base de connaissances RAG — Mars 2026

> **Dernière mise à jour : 28 mars 2026** — Phase 1 terminée, SYCEBNL complété à 100%

## Source : `SYCEBNL-2022_fr.pdf` (33 Mo) dans `/normx/`

---

## 1. Couverture par section

| Section | Paragraphes | Articles | Couverture | Statut |
|---------|-------------|----------|------------|--------|
| Introduction & Adoption | §2000–§2006 | 7 | 100% | Complet |
| Cadre conceptuel & principes | §2007–§2049 | 10 | **100%** | **Complété le 28/03** |
| Comptabilité des dons/legs | §2050–§2060 | ~11 | 100% | Complet |
| Règles détaillées dons/legs | §2061–§2109 | ~22 | **100%** | **Complété le 28/03** (via Partie 3 ch.4) |
| Fonds propres/affectés/cotisations | §2110–§2142 | ~28 | **100%** | **Complété le 28/03** (via Partie 3 ch.1-2-5) |
| Charges par activité | §2150–§2163 | 6 | **100%** | **Complété le 28/03** (via classes 6-7-8) |
| États financiers (Bilan, CR, TFT, Notes) | §2170–§2179 | 19 | **100%** | **TFT méthode directe ajouté le 28/03** |
| Fonctionnement comptes classes 1-9 | p.106–308 | 69 | **100%** | **Créé le 28/03** (4 fichiers JSON) |
| Opérations spécifiques EBNL | p.309–338 | 6 | **100%** | **Créé le 28/03** |
| Comptabilité des projets | §2250–§2287 | 32 | 100% | Complet |
| Tables de correspondance | §2319–§2322 | 4 | 100% | Complet |
| Système SMT | §2240–§2248 | 9 | 100% | Complet |
| Acte Uniforme | §2400–§2405 | 6 | 100% | Complet |

**Estimation globale : ~100% du guide SYCEBNL-2022 (438 pages)**

---

## 2. Fichiers de la base de connaissances

### Fichiers existants (avant le 28/03)

| Fichier | Taille | Articles | Contenu |
|---------|--------|----------|---------|
| `sycebnl_complet_2000_2179.json` | 174 Ko | 125 | Fichier principal (§2000–§2322) |
| `sycebnl_complet_2000_2115.json` | 56 Ko | 51 | Sous-ensemble ancien (§2000–§2115) |
| `tft_formules.json` | 14 Ko | 26 formules | SYSCOHADA uniquement (non touché) |
| 60 fichiers `page_*.json` | ~200 Ko | ~180 | Pages du Praticien Comptable OHADA |

### Fichiers ajoutés le 28/03/2026

| Fichier | Articles | Contenu |
|---------|----------|---------|
| `sycebnl_partie1_definitions_cadre_conceptuel.json` | 10 | 44 définitions + cadre conceptuel (postulats, conventions, évaluation) |
| `sycebnl_partie4_etats_financiers_tft.json` | 9 | Bilan, CR, **TFT méthode directe** (codes FA-FQ/ZA-ZG), Notes 1-35 |
| `sycebnl_fonctionnement_comptes_classe1.json` | 10 | Classe 1 — Dotation, Réserves, Fonds affectés, Emprunts, Provisions |
| `sycebnl_fonctionnement_comptes_classe2.json` | 10 | Classe 2 — Immobilisations, Amortissements, Dépréciations |
| `sycebnl_fonctionnement_comptes_classe3_4.json` | 19 | Classes 3-4 — Stocks, Dons en nature, Tiers, Personnel |
| `sycebnl_fonctionnement_comptes_classe5_6_7_8_9.json` | 30 | Classes 5-9 — Trésorerie, Charges, Produits, HAO, Contributions volontaires |
| `sycebnl_partie3_operations_specifiques.json` | 6 | Fonds propres, Fonds affectés/reportés, Projets, Dons, Cotisations, Opérations spécifiques |

**Total ajouté : 7 fichiers, ~94 articles**

---

## 3. TFT SYCEBNL — Diagnostic

### TFT officiel SYCEBNL (méthode directe) — Ajouté le 28/03

```
ZA : Trésorerie nette au 1er janvier
FA : + Encaissement des cotisations
FB : + Encaissement des subventions d'exploitation et d'équilibre
FC : + Encaissement des revenus liés à la générosité
FD : + Encaissement des revenus des manifestations
FE : + Encaissement des autres revenus
FF : - Décaissement des sommes versées aux fournisseurs
FG : - Décaissement des sommes versées au personnel
FH : - Autres décaissements
ZB : Flux de trésorerie activités opérationnelles (FA à FH)
FI : - Décaissements acquisitions immo incorporelles et corporelles
FJ : - Décaissements acquisitions immo financières
FK : + Encaissements cessions immo incorporelles et corporelles
FL : + Encaissements cessions immo financières
ZC : Flux de trésorerie activités d'investissement (FI à FL)
FM : + Encaissement des dotations et autres fonds propres
FN : + Subventions d'investissement reçues
FO : - Décaissement des dotations et autres fonds propres
ZD : Flux fonds propres (FM à FO)
FP : + Encaissement provenant des emprunts et autres dettes financières
FQ : - Remboursements des emprunts et autres dettes financières
ZE : Flux fonds étrangers (FP à FQ)
ZF : Variation trésorerie nette (B+C+D+E)
ZG : Trésorerie nette au 31 décembre (G+A)
```

### Verdict TFT — Mis à jour

| Élément | Statut | Détail |
|---------|--------|--------|
| Définition TFT (§2177) | Présent | Complet |
| Formules détaillées TFT SYCEBNL | **Présent** | **Ajouté le 28/03 — méthode directe, codes FA-FQ/ZA-ZG** |
| `tft_formules.json` | SYSCOHADA uniquement | Non touché — reste pour le SYSCOHADA |
| Comparaison TFT SYCEBNL vs SYSCOHADA | **Présent** | **Article dédié aux différences ajouté** |
| Composant `TFT_SYCEBNL.tsx` | **Aligné 28/03** | Méthode directe, codes FA-FQ/ZA-ZG conformes SYCEBNL-2022 |
| `TFT_helpers.ts` | Implémenté | Logique de calcul fonctionnelle (36 Ko) |

**La base RAG contient les formules TFT SYCEBNL. Le composant React `TFT_SYCEBNL.tsx` a été aligné le 28/03/2026 sur la méthode directe officielle (codes FA-FQ/ZA-ZG).**

---

## 4. Sections complétées le 28/03/2026

| Section | Fichier créé | Articles |
|---------|-------------|----------|
| Cadre conceptuel (§2007–§2049) | `sycebnl_partie1_definitions_cadre_conceptuel.json` | 10 |
| TFT SYCEBNL méthode directe | `sycebnl_partie4_etats_financiers_tft.json` | 9 |
| Fonctionnement comptes classes 1-9 | 4 fichiers `sycebnl_fonctionnement_comptes_*.json` | 69 |
| Opérations spécifiques (dons, fonds, cotisations) | `sycebnl_partie3_operations_specifiques.json` | 6 |

**Rien ne reste à extraire du PDF SYCEBNL-2022.**

---

## 5. Synthèse — Mise à jour

| Question | Réponse |
|----------|---------|
| La base SYCEBNL est-elle complète ? | **Oui (100%)** — 4 parties couvertes, 438 pages traitées |
| Le TFT SYCEBNL est-il complet ? | **Oui** — méthode directe avec codes FA-FQ/ZA-ZG documentée |
| Le TFT fonctionne-t-il ? | Oui — mais le composant React utilise encore une adaptation SYSCOHADA à corriger |
| Que reste-t-il à faire ? | **SYCEBNL terminé.** Prochaine étape : compléter SYSCOHADA (~30%) ou Phase 2 (Résultat fiscal, DSF) |

---

## 6. Comparaison avec les autres référentiels — Mise à jour

| Référentiel | Base complète ? | TFT complet ? | Formules dans la base ? |
|-------------|----------------|---------------|-------------------------|
| **SYCEBNL** | **Oui (100%)** | **Oui** | **Oui (méthode directe)** |
| SYSCOHADA | Non (~30%) | Oui | Oui (`tft_formules.json`) |
| SMT | Oui (100%) | N/A | N/A |
