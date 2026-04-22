# Plan de suite des corrections — 2026-04-22

Issu de l'analyse `AUDIT_2026-04-20.md`. La centralisation `apiEndpoints.ts` a été livrée (commits `e4b8c48` → `ab83041`, 335 URLs migrées).

## Priorités restantes

### 1. Committer les fichiers non trackés (rapide)

Fichiers à intégrer au repo :

- `knowledge-base/audcif_articles.json` (123 K)
- `knowledge-base/syscohada_cadre_conceptuel_chap1_2.json` (26 K)
- `knowledge-base/syscohada_cadre_conceptuel_chap3.json` (46 K)
- `knowledge-base/syscohada_cadre_conceptuel_chap4.json` (39 K)
- `knowledge-base/syscohada_cadre_conceptuel_chap5.json` (41 K)
- `knowledge-base/syscohada_cadre_conceptuel_chap7.json` (9 K)
- `knowledge-base/syscohada_definitions_termes_chap6.json` (24 K)
- `knowledge-base/syscohada_ops_chap1.json` (19 K)
- `server/data/formation.md` (2,6 K)

À arbitrer :

- `Formation/ Capsule_1_0/*.mp3` — binaires ~1,8 MB total, plutôt destinés à un stockage média externe (pas git).

Action post-commit : relancer l'indexation Qdrant pour les nouvelles KB.

### 2. Petits nettoyages (rapide)

- 4 `console.*` résiduels dans `src` + `server` → supprimer ou passer en `logger`.
- Styles inline `src/etats/BilanSMT.tsx:190-200` → externaliser en CSS.
- Documenter la matrice RBAC 7×4×6 (commentaire en tête de `server/middleware/requireModule.ts` ou `server/README.md`).

### 3. Migration `useFetchEntity` (~50 composants)

Le hook existe (`src/hooks/useFetchEntity.ts`), pilote validé sur `SaisieJournal` + `TiersPage`. Migrer le pattern récurrent `useState + useEffect + clientFetch` vers le hook.

Approche : module par module, comme `apiEndpoints`. Un commit par module.

### 4. Couverture Jest

- Lancer `react-scripts test --coverage --watchAll=false`
- Analyser les trous, surtout `server/services/` et `src/paie/`
- Cibler d'abord les zones à risque (calculs CGI, moteur TFT, lettrage).

### 5. Contrôles AUDCIF manquants (chantier métier)

Composants bannière à créer dans `src/etats/banners/` :

- Art. 34 — Intangibilité bilan d'ouverture (prérequis : balance N + N-1)
- Art. 34 — Non-compensation Actif/Passif
- Art. 43-49 — Dépréciation/amortissement comptes classe 2 sans 28/29

Plus lourd, à planifier à part.

## Ordre proposé

1 → 2 → 3 → 4 → 5
