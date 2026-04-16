# Plan de test bout-en-bout — Comptabilité Normx

Objectif : valider le module Comptabilité dans le flux réel d'un cabinet
ou d'une entreprise. Chaque section couvre une étape du cycle comptable,
avec les points à vérifier et les bugs connus ou attendus.

Chaque case ☐ est à cocher `✅` après test OK, `❌` après test KO, ou
`⚠️` avec note si comportement ambigu.

Dossier de test recommandé : créer un nouveau dossier `TEST COMPTA`
dans OMEGA Cabinet avec le module `compta`, exercice 2025 (01/01/2025
au 31/12/2025). Ne pas utiliser DAISY DEL (reste en mode Etats).

---

## 1. Création dossier et paramétrage

### 1.1 Création du dossier
- ✅ Formulaire de création client expose bien le module « Comptabilité »
- ✅ Création du tenant aboutit sans erreur côté frontend et backend
- ✅ Le schéma Postgres `tenant_<slug>` est bien provisionné
- ✅ Les tables compta (ecritures, journaux, plans_compte, etc.) existent
- ✅ Le dossier apparaît dans la liste des clients du cabinet
- ✅ Formulaire : un seul module coché par défaut (compta) pour respecter
      l'exclusion mutuelle compta/etats. Corrigé dans `GestionClients.tsx`
      avec une fonction `defaultModule()` qui priorise compta si activé.

### 1.2 Paramétrage initial
- ☐ Le plan comptable SYSCOHADA est chargé par défaut (1409 comptes)
- ☐ Possibilité d'ajouter / désactiver des comptes du plan
- ☐ Liste des journaux par défaut : Achats (AC), Ventes (VT), Caisse (CA),
      Banque (BQ), OD
- ☐ Possibilité d'ajouter un journal personnalisé
- ☐ Paramètres TVA (taux par défaut, type de régime) modifiables

### 1.3 Exercice comptable
- ☐ Création d'un exercice 01/01/2025 → 31/12/2025
- ☐ Validation : un seul exercice ouvert à la fois
- ☐ Impossible de créer un exercice qui chevauche un autre
- ☐ L'exercice apparaît dans le sélecteur de la topbar

---

## 2. Saisie d'écritures

### 2.1 Journal d'achats — facture fournisseur simple
Saisir une facture : HT 100 000, TVA 18% = 18 000, TTC 118 000.
- ☐ Débit 601 (Achats) : 100 000 / Débit 4452 (TVA déductible) : 18 000
      / Crédit 401 (Fournisseurs) : 118 000
- ☐ Le contrôle équilibre D = C bloque la validation si déséquilibre
- ☐ La saisie du libellé, du numéro de pièce et de la date est propagée
      sur toutes les lignes de l'écriture
- ☐ Choix du tiers (fournisseur) autocomplète le compte 401Xxx si tiers
      déjà créé, sinon propose la création

### 2.2 Journal de ventes — facture client
Facture : HT 200 000, TVA 18% = 36 000, TTC 236 000.
- ☐ Débit 411 (Clients) : 236 000 / Crédit 701 (Ventes) : 200 000
      / Crédit 4431 (TVA collectée) : 36 000
- ☐ Numérotation automatique facture N° ?
- ☐ Lien tiers-client

### 2.3 Journal de caisse
- ☐ Encaissement espèces 50 000 : Débit 571 (Caisse) / Crédit 411
- ☐ Décaissement espèces 20 000 : Débit 6XX / Crédit 571
- ☐ Solde caisse jamais négatif (blocage ou warning si tentative)

### 2.4 Journal de banque
- ☐ Encaissement chèque client : Débit 521 / Crédit 411
- ☐ Paiement fournisseur par virement : Débit 401 / Crédit 521
- ☐ Frais bancaires : Débit 6313 / Crédit 521

### 2.5 Journal d'OD (opérations diverses)
- ☐ Écriture de régularisation : Débit 471 / Crédit 42X
- ☐ Virement de compte à compte (contrepassation)
- ☐ Écriture sur plusieurs mois/exercices (distinguer)

### 2.6 Écritures multi-lignes
- ☐ Saisir une écriture à 5+ lignes (facture avec plusieurs natures de
      charges / produits)
- ☐ Possibilité d'éditer / supprimer une ligne avant validation
- ☐ Totalisation automatique D et C en pied de saisie

### 2.7 Validation et verrouillage
- ☐ Une écriture validée apparaît dans le grand livre
- ☐ Possibilité de modifier une écriture non clôturée
- ☐ Impossible de modifier une écriture d'un exercice clôturé
- ☐ Impossible de modifier une écriture d'une période lettrée/rapprochée
      (selon config)

---

## 3. Consultation

### 3.1 Grand livre
- ☐ Liste toutes écritures d'un compte choisi
- ☐ Filtre par période
- ☐ Filtre par journal
- ☐ Affiche solde progressif (cumul débit/crédit/solde)
- ☐ Clic sur une ligne → détail de l'écriture
- ☐ Export PDF / Excel

### 3.2 Balance générale
- ☐ Affiche tous les comptes mouvementés avec SI, mouvements, solde
- ☐ Totaux débit = crédit (sinon anomalie signalée)
- ☐ Ventilation par classe
- ☐ Filtre par compte (de-à)
- ☐ Export PDF / Excel
- ☐ Détection d'anomalies de sens (via plan comptable)

### 3.3 Journal centralisé
- ☐ Toutes écritures d'une période, tous journaux confondus
- ☐ Tri chronologique
- ☐ Filtre par journal

### 3.4 Extrait de compte individuel
- ☐ Ouverture d'un compte → historique des mouvements
- ☐ Solde à date

---

## 4. TVA

### 4.1 Paramétrage TVA
- ☐ Taux normal 18% (Congo) par défaut
- ☐ Taux réduit 5% si applicable
- ☐ Régime normal / simplifié

### 4.2 Déclaration mensuelle
- ☐ Écran déclaration TVA du mois : agrégats automatiques
- ☐ Base TVA collectée (442x) = somme TVA sur ventes du mois
- ☐ Base TVA déductible (4452x) = somme TVA sur achats du mois
- ☐ Solde à payer / crédit à reporter
- ☐ Écriture de clôture TVA générée automatiquement à la validation
- ☐ Export formulaire déclaration

### 4.3 Cas particuliers
- ☐ Achat avec TVA non récupérable (frais de mission, véhicules tourisme)
- ☐ Facture d'avoir : réduction de TVA collectée ou déductible
- ☐ Autoliquidation (si applicable)

---

## 5. Tiers et lettrage

### 5.1 Gestion des tiers
- ☐ Création d'un client avec N° de compte 411X
- ☐ Création d'un fournisseur avec N° de compte 401X
- ☐ Fiche tiers : identification, contact, solde
- ☐ Extrait de compte tiers

### 5.2 Lettrage
- ☐ Apparier facture client 411 avec son encaissement banque / caisse
- ☐ Apparier facture fournisseur 401 avec son décaissement
- ☐ Lettrage partiel (facture payée en plusieurs fois)
- ☐ Délettrage possible
- ☐ Balance âgée par tiers
- ☐ Export relance client (facture non lettrée > N jours)

---

## 6. Rapprochement bancaire

- ☐ Import relevé bancaire (CSV / Excel / OFX)
- ☐ Pointage manuel : cocher les écritures qui correspondent au relevé
- ☐ Pointage automatique par montant / libellé
- ☐ Ecart rapprochement = solde compta - solde relevé
- ☐ Génération du tableau de rapprochement (édition mensuelle)

---

## 7. Clôture

### 7.1 Clôture mensuelle
- ☐ Verrouillage des écritures d'un mois (plus de saisie)
- ☐ Réouverture possible (avec trace d'audit)

### 7.2 Opérations de clôture d'exercice
- ☐ Écritures d'inventaire :
  - Variation de stocks (603 / 73)
  - Dotations aux amortissements (68 / 28)
  - Dotations aux provisions (69 / 29)
  - Dotations aux dépréciations
  - Régularisation charges constatées d'avance (476)
  - Régularisation produits constatés d'avance (477)
  - Charges à payer (408)
  - Produits à recevoir (418)
- ☐ Calcul et écriture de l'IS (89 / 441) si applicable
- ☐ Clôture des comptes de gestion (classes 6, 7, 8) sur compte 13
- ☐ Affectation du résultat (AG) : 13 → 11 / 12
- ☐ Bilan d'ouverture de N+1 = bilan de clôture de N (Art. 34 AUDCIF)

### 7.3 Verrouillage définitif
- ☐ Après validation finale : plus aucune modification possible
- ☐ Archive PDF complète (FEC, grand livre, balance, journaux, états)

---

## 8. États financiers (générés depuis compta)

- ☐ Bilan SYSCOHADA reflète les soldes de classe 1-5 au 31/12
- ☐ Actif = Passif (équilibre vérifié)
- ☐ Compte de résultat reflète les soldes classes 6-7-8
- ☐ Résultat net du CR = solde compte 13 après clôture
- ☐ TFT calcule correctement trésorerie début/fin et variations
- ☐ Notes annexes 1 à 34 alimentées depuis la compta
- ☐ Cohérence bilan / CR / TFT : contrôles automatiques

---

## 9. Cas limites et régressions

### 9.1 Performance
- ☐ Saisie fluide sur 1 000 écritures déjà en base
- ☐ Grand livre reste rapide sur 10 000 lignes
- ☐ Export PDF Bilan < 10 secondes

### 9.2 Isolation multi-tenant
- ☐ Les écritures de DAISY DEL ne sont jamais visibles depuis OMEGA self
- ☐ Le switch de dossier via Dossier Selector recharge complètement
      la vue

### 9.3 Révision et audit trail
- ☐ Chaque modification d'écriture génère une entrée dans audit_log
- ☐ Impossible de supprimer une écriture validée (seulement contre-passer)
- ☐ Export FEC (Fichier des Écritures Comptables) conforme

### 9.4 Erreurs attendues à corriger
- Lister ici au fur et à mesure des tests les bugs identifiés

---

## Ordre de test recommandé

1. Section 1 — paramétrage (bloquant pour la suite)
2. Section 2 — saisie (2.1, 2.2, 2.3, 2.4 en priorité, le reste ensuite)
3. Section 3.1 et 3.2 — consultation de base
4. Section 4 — TVA
5. Section 5 — tiers et lettrage
6. Section 7.1 — clôture mensuelle (avant d'aller plus loin)
7. Section 6 — rapprochement bancaire
8. Section 8 — états financiers
9. Section 7.2 — clôture d'exercice (à la fin)
10. Section 9 — tests de robustesse

---

## Méthode de signalement des bugs

Pour chaque bug trouvé :
1. Description courte (1 ligne)
2. Étapes pour reproduire
3. Comportement observé
4. Comportement attendu
5. Capture d'écran si UI
6. Numéro de section de ce document

Je consolide au fur et à mesure dans `BUGS_COMPTA.md` et on dispatch
en lots de commits par thématique.
