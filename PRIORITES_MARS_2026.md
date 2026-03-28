# Priorités Normx — Mars 2026

## Ordre d'exécution recommandé

### Phase 1 — Base de connaissances SYCEBNL — TERMINÉE le 28/03/2026

| # | Tâche | Module | Statut | Fichier créé |
|---|-------|--------|--------|-------------|
| 1 | ~~Extraire §2007–§2049 (cadre conceptuel)~~ | RAG | **FAIT** | `sycebnl_partie1_definitions_cadre_conceptuel.json` |
| 2 | ~~Extraire formules TFT SYCEBNL (méthode directe)~~ | RAG | **FAIT** | `sycebnl_partie4_etats_financiers_tft.json` |
| 3 | ~~Extraire dons/legs/cotisations/opérations spécifiques~~ | RAG | **FAIT** | `sycebnl_partie3_operations_specifiques.json` |
| 3b | ~~Fonctionnement comptes classes 1-9 (p.106-308)~~ | RAG | **FAIT** | 4 fichiers `sycebnl_fonctionnement_comptes_*.json` |
| 4 | Compléter les chapitres SYSCOHADA manquants (1–5, 7–10, 12) | RAG | **À faire** | Agent SYSCOHADA couvre seulement 30% |

### Phase 2 — États financiers (composants manquants visibles)

| # | Tâche | Module | Statut | Impact |
|---|-------|--------|--------|--------|
| 4b | ~~Aligner TFT_SYCEBNL.tsx sur méthode directe officielle~~ | États | **FAIT 28/03** | Codes FA-FQ/ZA-ZG conformes SYCEBNL-2022 |
| 5 | ~~Implémenter le composant Résultat fiscal~~ | États | **FAIT 28/03** | `ResultatFiscal.tsx` créé + branché (IS 28%/25%/33%, IBA 30%, min. perception, réintégrations/déductions CGI 2026) |
| 6 | ~~DSF (Déclaration Statistique et Fiscale)~~ | États | **DÉJÀ FAIT** | Couverte par la liasse existante (Page de garde, R1-R4, Bilan, CR, TFT, 37 Notes) |
| 7 | ~~Notes 3F/3G~~ | États | **NON APPLICABLE** | Notes 3 complètes (3A-3E SYSCOHADA). Note3F.tsx est une note SYCEBNL, pas une lacune. |

### Phase 3 — Paie (persistance et intégration)

| # | Tâche | Module | Effort | Impact |
|---|-------|--------|--------|--------|
| 8 | Persistance des bulletins en base | Paie | Moyen | Calculs fonctionnels mais bulletins perdus à chaque session |
| 9 | Brancher le backend absences | Paie | Faible | UI présente, backend non connecté |
| 10 | Intégration comptabilité (OD automatiques 42x, 43x, 44x) | Paie | Élevé | Pas de lien paie → écritures comptables |
| 11 | Import batch salariés (Excel/CSV) | Paie | Moyen | Saisie manuelle uniquement |

### Phase 4 — Comptabilité (fonctionnalités attendues)

| # | Tâche | Module | Effort | Impact |
|---|-------|--------|--------|--------|
| 12 | Rapprochement bancaire | Compta | Élevé | Fonctionnalité essentielle absente |
| 13 | Import batch écritures (Excel/CSV) | Compta | Moyen | Saisie manuelle uniquement |
| 14 | Écritures de clôture automatiques | Compta | Moyen | Transfert résultat + A-nouveaux manuels |
| 15 | Pièces jointes sur écritures | Compta | Moyen | Pas de lien facture/reçu |

### Phase 5 — Améliorations transversales

| # | Tâche | Module | Effort | Impact |
|---|-------|--------|--------|--------|
| 16 | Piste d'audit (qui, quoi, quand) | Tous | Moyen | Aucune traçabilité des modifications |
| 17 | Workflow approbation | Paie + Compta | Élevé | Pas de circuit validation multi-rôle |
| 18 | Tests unitaires TFT | États | Faible | Calculs complexes non testés |
| 19 | Analyse ratios financiers | États | Moyen | Liquidité, rentabilité, solvabilité absents |
| 20 | Comptabilité analytique | Compta | Élevé | Pas de centres de coûts/projets |

---

## Synthèse par phase

| Phase | Tâches | Effort global | Résultat attendu |
|-------|--------|---------------|------------------|
| **1 — Base de connaissances SYCEBNL** | 1–3b | ~~Faible~~ | **TERMINÉ** — SYCEBNL 100%, reste SYSCOHADA (#4) |
| **2a — TFT SYCEBNL méthode directe** | 4b | ~~Faible~~ | **TERMINÉ** — `TFT_SYCEBNL.tsx` aligné sur codes FA-FQ/ZA-ZG |
| **2b — Résultat fiscal** | 5 | ~~Moyen~~ | **TERMINÉ** — `ResultatFiscal.tsx` (IS/IBA, CGI Congo 2026, build OK) |
| **2c — DSF** | 6 | — | **DÉJÀ FAIT** — couverte par la liasse existante |
| **2 — États financiers** | 5–7 | Moyen | Plus de composants vides visibles |
| **3 — Paie** | 8–11 | Moyen à élevé | Module paie réellement exploitable |
| **4 — Comptabilité** | 12–15 | Élevé | Module comptabilité complet |
| **5 — Transversal** | 16–20 | Élevé | Qualité professionnelle |
