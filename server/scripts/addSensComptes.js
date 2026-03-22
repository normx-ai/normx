#!/usr/bin/env node
// Ajoute le champ "sens" (solde normal) à chaque compte des plans comptables
// Règles OHADA :
// Classe 1 : Créditeur (sauf 109, 129, 139 → Débiteur)
// Classe 2 : Débiteur (sauf 28x, 29x → Créditeur)
// Classe 3 : Débiteur (sauf 39x → Créditeur)
// Classe 4 : Mixte (40-42 fournisseurs créditeur, 41 clients débiteur, etc.)
// Classe 5 : Débiteur (sauf 56x, 59x → Créditeur)
// Classe 6 : Débiteur
// Classe 7 : Créditeur
// Classe 8 : Mixte (81, 83, 85 → Débiteur ; 82, 84, 86 → Créditeur)
// Classe 9 : Débiteur

const fs = require('fs');
const path = require('path');

function getSens(numero) {
  const n = numero.toString();
  const c1 = n.charAt(0);
  const c2 = n.substring(0, 2);
  const c3 = n.substring(0, 3);

  // Classe 1 — Ressources durables → Créditeur
  if (c1 === '1') {
    // Exceptions débitrices
    if (c3 === '109') return 'debiteur'; // Apporteurs, capital souscrit non appelé
    if (c3 === '129') return 'debiteur'; // Report à nouveau débiteur
    if (c3 === '139') return 'debiteur'; // Résultat net : perte
    if (c2 === '15') return 'crediteur'; // Provisions réglementées
    if (c2 === '16') return 'crediteur'; // Emprunts et dettes
    if (c2 === '17') return 'crediteur'; // Dettes de location-acquisition
    if (c2 === '18') return 'crediteur'; // Dettes liées à des participations
    if (c2 === '19') return 'crediteur'; // Provisions pour risques et charges
    return 'crediteur';
  }

  // Classe 2 — Actif immobilisé → Débiteur
  if (c1 === '2') {
    if (c2 === '28') return 'crediteur'; // Amortissements
    if (c2 === '29') return 'crediteur'; // Dépréciations
    return 'debiteur';
  }

  // Classe 3 — Stocks → Débiteur
  if (c1 === '3') {
    if (c2 === '39') return 'crediteur'; // Dépréciations des stocks
    return 'debiteur';
  }

  // Classe 4 — Tiers → Mixte selon sous-classe
  if (c1 === '4') {
    // Tester c3 (sous-comptes) AVANT c2 (comptes principaux)
    if (c3 === '445') return 'debiteur';  // État, TVA récupérable
    if (c3 === '449') return 'debiteur';  // État, créances fiscales
    if (c3 === '444') return 'debiteur';  // État, TVA due ou crédit de TVA
    if (c3 === '441') return 'crediteur'; // État, impôts sur bénéfices
    if (c3 === '443') return 'crediteur'; // État, TVA facturée
    if (c3 === '447') return 'crediteur'; // État, impôts retenus à la source
    if (c3 === '462') return 'debiteur';  // Créances sur cessions (SYCEBNL: fonds admin)
    if (c3 === '465') return 'crediteur'; // Associés, dividendes à payer
    if (c3 === '467') return 'debiteur';  // Actionnaires, restant dû sur capital appelé
    if (c3 === '471') return 'debiteur';  // Comptes d'attente débiteurs
    if (c3 === '472') return 'crediteur'; // Comptes d'attente créditeurs
    if (c3 === '476') return 'debiteur';  // Charges constatées d'avance
    if (c3 === '477') return 'crediteur'; // Produits constatés d'avance
    if (c3 === '478') return 'debiteur';  // Écarts de conversion actif
    if (c3 === '479') return 'crediteur'; // Écarts de conversion passif
    if (c3 === '485') return 'debiteur';  // Créances sur cessions d'immobilisations
    if (c3 === '491') return 'crediteur'; // Dépréciations des comptes clients
    if (c3 === '499') return 'crediteur'; // Provisions pour risques à court terme
    // Puis c2 (comptes principaux)
    if (c2 === '40') return 'crediteur'; // Fournisseurs et comptes rattachés
    if (c2 === '41') return 'debiteur';  // Clients et comptes rattachés
    if (c2 === '42') return 'crediteur'; // Personnel
    if (c2 === '43') return 'crediteur'; // Organismes sociaux
    if (c2 === '44') return 'crediteur'; // État et collectivités publiques (par défaut)
    if (c2 === '45') return 'debiteur';  // Organismes internationaux
    if (c2 === '46') return 'crediteur'; // Associés et groupe
    if (c2 === '47') return 'debiteur';  // Débiteurs et créditeurs divers
    if (c2 === '48') return 'crediteur'; // Fournisseurs d'investissements
    if (c2 === '49') return 'crediteur'; // Dépréciations et provisions pour risques CT
    return 'debiteur';
  }

  // Classe 5 — Trésorerie → Débiteur
  if (c1 === '5') {
    if (c2 === '56') return 'crediteur'; // Banques, crédits de trésorerie
    if (c2 === '59') return 'crediteur'; // Dépréciations et provisions trésorerie
    return 'debiteur';
  }

  // Classe 6 — Charges → Débiteur
  if (c1 === '6') return 'debiteur';

  // Classe 7 — Produits → Créditeur
  if (c1 === '7') return 'crediteur';

  // Classe 8 — Comptes spéciaux (HAO)
  if (c1 === '8') {
    if (c2 === '81') return 'debiteur';  // Valeur comptable des cessions
    if (c2 === '82') return 'crediteur'; // Produits des cessions
    if (c2 === '83') return 'debiteur';  // Charges HAO
    if (c2 === '84') return 'crediteur'; // Produits HAO
    if (c2 === '85') return 'debiteur';  // Dotations HAO
    if (c2 === '86') return 'crediteur'; // Reprises HAO
    if (c2 === '87') return 'debiteur';  // Participation des travailleurs
    if (c2 === '88') return 'debiteur';  // Subventions d'équilibre (SYCEBNL)
    if (c2 === '89') return 'debiteur';  // Impôts sur résultat
    return 'debiteur';
  }

  // Classe 9 — Engagements hors bilan → Débiteur
  if (c1 === '9') return 'debiteur';

  return 'debiteur';
}

function addSens(filePath) {
  const raw = fs.readFileSync(filePath, 'utf-8');
  const plan = JSON.parse(raw);

  let modified = 0;
  for (const compte of plan) {
    const sens = getSens(compte.numero);
    if (compte.sens !== sens) {
      compte.sens = sens;
      modified++;
    }
  }

  fs.writeFileSync(filePath, JSON.stringify(plan, null, 2) + '\n', 'utf-8');
  console.log(`${path.basename(filePath)}: ${plan.length} comptes, ${modified} sens ajoutés`);
}

// Traiter les deux plans
const dataDir = path.join(__dirname, '..', 'data');
addSens(path.join(dataDir, 'plan_comptable_syscohada.json'));
addSens(path.join(dataDir, 'plan_comptable_sycebnl.json'));

console.log('\nTerminé !');
