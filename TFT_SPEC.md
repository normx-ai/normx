# TFT SYSCOHADA — Spécification basée sur le Guide d'Application

Source : Guide d'application SYSCOHADA (t1-t8.png)

## Principe fondamental

Chaque compte non-trésorerie (classes 1-4) doit être capté **exactement 1 fois** dans le TFT.
- Comptes CR (classes 6-8) → FA (CAFG)
- Comptes trésorerie (classe 5) → ZA/ZI
- Comptes bilan (classes 1-4) → FB à FQ

## ZA — Trésorerie nette au 1er janvier

```
= Trésorerie actif N-1 (BQ+BR+BS)
- SC(4726)_N-1
- Trésorerie passif N-1 (DQ+DR)
```

## FA — CAFG (Capacité d'Autofinancement Globale)

Méthode soustractive :
```
= Résultat net
+ Dotations (681, 691, 697)
- Reprises (791, 797, 798, 799)
+ SD(81) VNC cessions
- SC(82) Produits cessions
```

## FB — Variation actif circulant HAO

```
= -(variation BA excl variation 485)
+ SD(47818)_N - SD(47818)_N-1     écart conversion actif HAO
- SC(47918)_N + SC(47918)_N-1     écart conversion passif HAO
```

BA = actifNet(['485','488'], ['498'])
Exclusion 485 : -SD(485)_N + SD(485)_N-1

## FC — Variation des stocks

```
= -(variation BB)
```

BB = actifNet(['31'-'38'], ['39'])

## FD — Variation des créances et emplois assimilés

Poste BG = BH + BI + BJ, à l'exclusion de :
- 414 : créances liées aux immobilisations
- 467 : apporteurs restant dû sur capital appelé
- 458 : organismes internationaux, fonds de dotation
- 4494 : État subvention d'investissement à recevoir
- 4751 : compte transitoire ajustement SYSCOHADA

```
= -(variation BH+BI+BJ)
+ SD(excl)_N - SD(excl)_N-1       retrait variation comptes exclus
+ MvtD(2714, 2766)_N              créances location-financement
+ SD(4781)_N - SD(4781)_N-1       écart conversion actif exploitation
- SC(4791)_N + SC(4791)_N-1       écart conversion passif exploitation
```

NB: utiliser préfixe 4781 (pas 47811) pour capter les comptes non subdivisés (ex: 478100)

## FE — Variation du passif circulant

Poste DP, à l'exclusion de :
- 404 : fournisseurs d'immobilisations
- 481, 482 : fournisseurs d'investissements
- 465 : associés dividendes à payer
- 467 : apporteurs restant dû sur capital appelé
- 4752 : compte transitoire ajustement SYSCOHADA
- 472 : versements restant à effectuer sur titres

```
= variation DP
- SC(excl)_N + SC(excl)_N-1       retrait variation comptes exclus
+ SC(4793)_N - SC(4793)_N-1       écart conversion diminution dettes
- SD(4783)_N + SD(4783)_N-1       écart conversion augmentation dettes
```

## ZB = FA + FB + FC + FD + FE

## FF — Décaissements acquisitions immob incorporelles

```
= -(variation AD brut)
- MvtD(251) + MvtC(251)           avances et acomptes
- MvtD(ffSup, 281) + MvtC(ffSup)  fournisseurs invest + amortissements
- SD(6541, 811)                    VNC cessions incorporelles
```

ffSup = ['4041', '4046', '4811', '48161', '48171', '48181', '4821']

## FG — Décaissements acquisitions immob corporelles

```
= -(variation AI brut)
- MvtD(252) + MvtC(252)           avances et acomptes
- MvtD(fgSup, 282-284) + MvtC(17, 19842, fgSup)
+ MvtC(106, 154)                  réévaluation (non-cash)
- SD(6542, 812)                    VNC cessions corporelles
```

fgSup = ['4042', '4047', '4812', '48162', '48172', '48182', '481800', '4822']

NB: 481800 (FNP non subdivisé) ajouté pour capter les comptes non subdivisés

## FH — Décaissements acquisitions immob financières

```
= -(MvtD(26, 27) excl 2714, 2766)
- MvtD(4813) + MvtC(4813)
- SD(4782) + SC(4792)
```

NB: pas de MvtC(106,154) ici — déjà dans FG

## FI — Encaissements cessions immob incorp et corp

```
= SC(754, 821, 822)
- MvtD(414, 485) excl 4856
+ MvtC(414, 485) excl 4856
```

## FJ — Encaissements cessions immob financières

```
= SC(826)
+ MvtC(27) excl 2714, 2766
- MvtD(4856) + MvtC(4856)
```

## ZC = FF + FG + FH + FI + FJ

## FK — Augmentation de capital par apports nouveaux

```
= SC(101, 102, 1051)_N - SC(101, 102, 1051)_N-1
- SD(109, 4613, 467, 4581)_N
- MvtD(11, 12, 130, 131)_N
+ MvtC(103, 104, 11, 12, 139, 4619, 465)_N
```

## FL — Subventions d'investissement reçues

```
= SC(14)_N - SC(14)_N-1
+ SC(799)_N
- SD(4494, 4582)_N
```

## FM — Prélèvements sur le capital

```
= -(MvtD(4619) + MvtD(103, 104))
```

## FN — Dividendes versés

```
= -MvtD(465)
```

## ZD = FK + FL + FM + FN

## FO — Emprunts

```
= MvtC(161, 162, 1661, 1662)
- MvtD(4713)
+ SD(4784)
```

## FP — Autres dettes financières

```
= MvtC(163-168 excl 1661/1662, 181-183)
```

## FQ — Remboursements emprunts et dettes financières

```
= -(MvtD(16, 17, 181-183) - SC(4794))
```

## ZE = FO + FP + FQ
## ZF = ZD + ZE
## ZG = ZB + ZC + ZF
## ZH = ZG + ZA
## ZI = Trésorerie actif N - SC(4726)_N - Trésorerie passif N

## Comptes NON captés (fuites identifiées)

Les comptes suivants ne sont dans AUCUNE formule :
- **106** : variation passif non captée (seul MvtC soustrait de FG)
- **154** : idem
- **15x** (hors 154) : provisions pour risques (ex: 155, 156...)
- **19x** : provisions réglementées (ex: 196)
- **29x** : dépréciations d'immobilisations

### Solution proposée

Ces comptes sont des **éléments non-cash** dont la dotation/reprise passe par le CR (681/691/697/791/797).
Le CAFG neutralise déjà la charge CR. Il faut aussi capter la variation bilan.

Option : ajouter la variation nette de ces comptes dans FP (autres dettes financières) ou créer un poste dédié.
