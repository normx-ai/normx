# Contrôles automatiques AUDCIF — Normx États

Spécification des contrôles de conformité AUDCIF (Acte uniforme relatif au
droit comptable et à l'information financière, Journal Officiel OHADA,
113 articles adoptés le 26 janvier 2017 à Brazzaville) à implémenter dans
le module Normx États.

Chaque contrôle se matérialise par :
- Un hook de détection (`use*Anomaly`) qui calcule l'anomalie depuis les
  lignes de balance
- Un composant bandeau (`Banner*.tsx`) dans `src/etats/banners/` qui
  affiche l'anomalie avec détail et éventuelle action corrective
- Une intégration dans `ImportBalanceAnalyse.tsx` (page de balance)
- Éventuellement une intégration dans le bilan écran (avec masquage PDF)

## Contrôles déjà implémentés

### ✅ Art. 20 AUDCIF — Correction d'erreur d'exercice antérieur

> « La correction d'une erreur significative commise au cours d'un
> exercice antérieur doit être opérée par ajustement du compte report
> à nouveau. »

**Détection** : compte 13 (Résultat net de l'exercice / Résultat en
instance d'affectation) avec solde non nul alors que les classes 6-8
sont encore mouvementées → indique un résiduel d'exercices antérieurs
qui aurait dû être porté en compte 12.

**Composant** : `src/etats/banners/BannerCompte13Art20.tsx`

**Action corrective** : bouton « Appliquer l'ajustement Art. 20 »
qui neutralise le résiduel via la colonne révision non destructive
(`solde_*_revise`) et le reporte sur 121 (si bénéfice) ou 129 (si perte).

### ✅ Équilibre SI / Mouvements / Solde final (non AUDCIF direct mais prérequis)

**Détection** : écarts non nuls sur l'une des trois sections de la balance,
y compris le cas où SI et mouvements se compensent et masquent l'erreur
dans le solde final.

**Composant** : `src/etats/banners/BannerBalanceEquilibre.tsx`

## Contrôles à implémenter (priorité 1)

### 🔲 Art. 34 AUDCIF — Intangibilité du bilan d'ouverture

> « le bilan d'ouverture d'un exercice doit correspondre au bilan de
> clôture de l'exercice précédent »

**Détection** : pour chaque compte de classe 1, 2, 3, 4 ou 5 apparaissant
à la fois dans la balance N et N-1, vérifier que la SI nette en N
(`si_debit − si_credit`) est égale au solde final net en N-1
(`solde_debiteur − solde_crediteur`).

**Exclusions légitimes** :
- Classes 6, 7, 8 : réinitialisation automatique à chaque exercice
- Compte 13 : mouvement par écriture d'affectation du résultat à
  l'ouverture (un delta équivalent au résultat net N-1 est attendu)
- Comptes nouvellement créés en N (pas de référence N-1)
- Comptes supprimés en N (pas de suite)

**Seuil de tolérance** : 0,5 FCFA pour absorber les arrondis.

**Affichage** : tableau listant les comptes avec la SI N, le SF N-1 et
l'écart, trié par ordre décroissant d'écart absolu.

**Action corrective** : aucune automatique (la correction doit venir
d'un retraitement des écritures d'à-nouveaux dans le logiciel source).
Bandeau informatif seulement.

**Prérequis** : il faut que les deux balances N et N-1 soient chargées
dans le contexte de l'analyse. C'est déjà le cas dans le bilan
(`lignesN` + `lignesN1`), pas dans l'analyse d'import individuelle. Donc
le contrôle doit se positionner sur la page bilan, pas sur l'import
direct.

**Composant prévu** : `src/etats/banners/BannerIntangibiliteBilan.tsx`

### 🔲 Art. 34 AUDCIF — Non-compensation Actif/Passif

> « toute compensation, non juridiquement fondée, entre postes d'actif
> et postes de passif dans le Bilan et entre postes de charges et
> postes de produits dans le Compte de résultat est interdite »

**Détection** : identifier les comptes qui devraient figurer dans un
seul sens (actif ou passif) mais qui présentent simultanément un solde
débiteur et un solde créditeur significatifs, signe d'une compensation
dans la balance.

Cas typiques à flagger :
- Comptes 41x (Clients) avec SD et SC simultanément non nuls → il faut
  séparer créances (41) et avances reçues (419)
- Comptes 40x (Fournisseurs) avec SD et SC simultanément non nuls →
  il faut séparer dettes (40) et avances versées (409)
- Comptes 42x (Personnel) avec SD et SC simultanément non nuls →
  séparer 421 (débiteur) de 422-428 (créditeur)
- Comptes 44x (État, impôts) avec SD et SC simultanément non nuls

**Seuil** : ignorer si le plus petit des deux soldes est inférieur à
0,1 % du plus grand (sinon on flagge des arrondis non significatifs).

**Affichage** : tableau listant les comptes à solde mixte avec SD, SC,
ratio, et suggestion de classement (par ex. « proposer 419 pour la
partie créditrice »).

**Action corrective** : bouton « Éclater la ligne » qui crée
automatiquement une nouvelle ligne dans la balance pour la contrepartie
(ex : garde 411 en débit pur, crée 419 en crédit pur, via révision
non destructive).

**Composant prévu** : `src/etats/banners/BannerNonCompensation.tsx`

### 🔲 Art. 43-49 AUDCIF — Dépréciation/amortissement à la clôture

> Art. 43 : « Si la valeur d'inventaire est inférieure à la valeur
> d'entrée, cette dernière est corrigée par une dépréciation »
> Art. 46 : « A la clôture de chaque exercice, une entité doit
> apprécier s'il existe un quelconque indice qu'un actif a subi une
> perte de valeur »
> Art. 49 : « Il doit être procédé, dans l'exercice, à tous
> amortissements, dépréciations et provisions nécessaires pour couvrir
> les pertes de valeurs, les risques et les charges probables, même en
> cas d'absence ou d'insuffisance de bénéfice »

**Détection** : pour chaque compte de classe 2 (immobilisations) avec
solde brut non nul, vérifier :
1. Qu'il existe un compte 28 (amortissement) OU 29 (dépréciation)
   associé (même racine sur 3 chiffres)
2. Que le ratio `amortissement / brut` a évolué entre N-1 et N (si
   aucune dotation n'a été passée sur un actif amortissable ayant
   bougé, c'est suspect)

Cas typiques à flagger :
- 211 Terrains : pas d'amortissement attendu (exclu du contrôle 1 mais
  contrôle 2 sur dépréciation 291 possible)
- 212 Bâtiments sans 2812 associé → dotation manquante
- 242 Matériel de transport sans 2842 associé → dotation manquante
- 411 Clients sans 491 associé et supérieur à un seuil → contrôle de
  provision pour créances douteuses manquante (Art. 49)

**Seuil** : présence ou absence de dotation. Pas de détection
« insuffisance » (trop subjectif).

**Affichage** : tableau listant les immobilisations sans amortissement
ni dépréciation, avec le brut N, le brut N-1 si disponible, et une
indication de catégorie (amortissable / non amortissable).

**Action corrective** : aucune (le comptable doit passer les écritures
dans le logiciel source). Bandeau informatif seulement, avec lien vers
la liste des articles concernés.

**Composant prévu** : `src/etats/banners/BannerAmortissementsObligatoires.tsx`

## Contrôles à implémenter (priorité 2)

### 🔲 Art. 40-41 AUDCIF — Permanence des méthodes

Détection des changements de méthode non documentés via comparaison
N/N-1 des ratios clés (durée moyenne d'amortissement par catégorie,
taux de dépréciation, etc.). Signaler si variation > 20 %.

Complexe : nécessite une base de ratios de référence et la gestion des
justifications (le changement peut être volontaire et documenté).
Reporté en P2.

### 🔲 Art. 48 AUDCIF — Classement provisions selon échéance

Nécessite une info échéance par ligne qui n'est pas disponible dans
une simple balance. Reporté en P2 (nécessite une évolution du modèle
de données pour stocker l'échéance).

### 🔲 Art. 54-58 AUDCIF — Conversion des créances/dettes en devises

Détection des comptes libellés en devises via mots-clés dans le libellé
et contrôle qu'une écriture d'écart de conversion a été passée en fin
d'exercice. Reporté en P2 (détection hasardeuse via libellé).

## Architecture cible

```
src/etats/banners/
├── BannerAmortissementsObligatoires.tsx     ← P1 (à implémenter)
├── BannerBalanceEquilibre.tsx               ✓ implémenté
├── BannerCompte13Art20.tsx                  ✓ implémenté
├── BannerIntangibiliteBilan.tsx             ← P1 (à implémenter)
└── BannerNonCompensation.tsx                ← P1 (à implémenter)
```

Chaque fichier expose :
1. Un hook `use*Anomaly(lignes[, lignesN1])` qui retourne `null` ou un
   objet d'anomalie typé
2. Un composant React par défaut qui prend l'anomalie + props UI (open,
   onToggle, éventuellement onApply) et retourne le bandeau

## Ordre d'implémentation proposé

1. **Non-compensation (Art. 34)** — le plus immédiat, ne nécessite que
   la balance N, détection basique sur les classes 40/41/42/44
2. **Amortissements obligatoires (Art. 43-49)** — nécessite N et N-1
   mais logique simple, pas d'action corrective
3. **Intangibilité du bilan d'ouverture (Art. 34)** — plus complexe car
   nécessite les 2 balances en contexte, à positionner dans le bilan
   plutôt que l'analyse d'import

Chaque contrôle sera commité séparément pour faciliter le rollback si
un faux positif apparaît.
