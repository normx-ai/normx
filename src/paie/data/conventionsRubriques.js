/* ========================================
   RUBRIQUES PAR CONVENTION COLLECTIVE - Congo-Brazzaville
   Chaque convention definit ses primes, indemnites et avantages
   specifiques qui apparaissent sur le bulletin de paie.
   ======================================== */

// Structure commune d'une rubrique:
// { code, label, type: 'prime'|'indemnite'|'majoration'|'avantage',
//   mode: 'pourcentage'|'fixe'|'horaire'|'variable',
//   taux, montant, base, conditions, article }

export const CONVENTIONS_RUBRIQUES = {
  // ---- Convention generale du travail (par defaut) ----
  '': {
    label: 'Convention générale du travail',
    anciennete: { debut: 2, tauxDepart: 2, increment: 1, max: 25, base: 'salaire_base' },
    heuresSupp: [
      { de: 41, a: 48, taux: 25, label: '+25% (41e-48e heure)' },
      { de: 49, a: 999, taux: 50, label: '+50% (au-dela 48e)' },
      { type: 'dimanche_ferie', taux: 100, label: '+100% (dim/feries)' },
    ],
    primes: [
      { code: 'PRIME_FIN_ANNEE', label: 'Prime de fin d\'année', type: 'prime', mode: 'variable', article: 'Usage' },
    ],
    indemnites: [
      { code: 'IND_TRANSPORT', label: 'Indemnité de transport', type: 'indemnite', mode: 'variable', article: 'Usage' },
    ],
    licenciement: [
      { de: 1, a: 5, taux: 25 },
      { de: 6, a: 10, taux: 30 },
      { de: 11, a: 15, taux: 35 },
      { de: 16, a: 20, taux: 40 },
    ],
  },

  // ---- PETROLE ----
  PETROLE: {
    label: 'Pétrole',
    anciennete: { debut: 2, tauxDepart: 2, increment: 1, max: 32, base: 'salaire_base' },
    heuresSupp: [
      { de: 41, a: 46, taux: 15, label: '+15% (1re-6e heure)' },
      { de: 47, a: 48, taux: 30, label: '+30% (7e-8e heure)' },
      { type: 'nuit', taux: 60, label: '+60% (nuit)' },
      { type: 'dimanche_ferie', taux: 110, label: '+110% (dim/feries)' },
    ],
    primes: [
      { code: 'PRIME_ANCIENNETE', label: 'Prime d\'ancienneté', type: 'prime', mode: 'pourcentage', base: 'salaire_base', article: 'Art. 57' },
      { code: 'PRIME_FIN_ANNEE', label: 'Prime de fin d\'année (13e mois)', type: 'prime', mode: 'pourcentage', taux: 100, base: 'salaire_base_plus_anciennete', article: 'Art. 58', conditions: 'Prorata si < 12 mois' },
      { code: 'PRIME_QUART', label: 'Prime de quart / poste', type: 'prime', mode: 'variable', article: 'Art. 59', conditions: 'Travail poste ou en quart' },
      { code: 'PRIME_OFFSHORE', label: 'Prime off-shore', type: 'prime', mode: 'variable', article: 'Art. 60', conditions: 'Travail en mer' },
      { code: 'PRIME_ONSHORE', label: 'Prime on-shore', type: 'prime', mode: 'variable', article: 'Art. 61', conditions: 'Sites terrestres' },
      { code: 'PRIME_SEPARATION', label: 'Prime de séparation', type: 'prime', mode: 'variable', article: 'Art. 62', conditions: 'Éloignement domicile familial' },
      { code: 'PRIME_PANIER', label: 'Prime de panier', type: 'prime', mode: 'variable', article: 'Art. 63' },
      { code: 'PRIME_CAISSE', label: 'Prime de caisse', type: 'prime', mode: 'variable', article: 'Art. 64' },
      { code: 'PRIME_INTERESSEMENT', label: 'Prime d\'intéressement', type: 'prime', mode: 'variable', article: 'Art. 65' },
      { code: 'PRIME_INSALUBRITE', label: 'Prime d\'insalubrité', type: 'prime', mode: 'variable', article: 'Art. 67' },
      { code: 'PRIME_PENIBILITE', label: 'Prime de pénibilité', type: 'prime', mode: 'variable', article: 'Art. 68' },
      { code: 'PRIME_STE_BARBE', label: 'Prime de Sainte Barbe', type: 'prime', mode: 'variable', article: 'Art. 69' },
      { code: 'PRIME_DIPLOME', label: 'Prime de diplôme', type: 'prime', mode: 'variable', article: 'Art. 70' },
    ],
    indemnites: [
      { code: 'IND_TRANSPORT', label: 'Indemnité de transport', type: 'indemnite', mode: 'variable', article: 'Art. 71' },
      { code: 'IND_LOGEMENT', label: 'Indemnité de logement', type: 'indemnite', mode: 'variable', article: 'Art. 72' },
      { code: 'IND_CONFORT_DOMESTIQUE', label: 'Indemnité de confort domestique', type: 'indemnite', mode: 'variable', article: 'Art. 73' },
      { code: 'IND_DEPLACEMENT', label: 'Indemnité de déplacement', type: 'indemnite', mode: 'variable', article: 'Art. 74' },
    ],
    licenciement: [
      { de: 1, a: 5, taux: 30 },
      { de: 6, a: 10, taux: 35 },
      { de: 11, a: 15, taux: 40 },
      { de: 16, a: 20, taux: 45 },
      { de: 21, a: 999, taux: 50, note: '50-100% selon ancienneté' },
    ],
  },

  // ---- BTP ----
  BTP: {
    label: 'Batiment et Travaux Publics (BTP)',
    anciennete: { debut: 2, tauxDepart: 2, increment: 1, max: 28, base: 'salaire_base' },
    heuresSupp: [
      { de: 41, a: 46, taux: 10, label: '+10% (41e-46e)' },
      { de: 47, a: 55, taux: 25, label: '+25% (47e-55e)' },
      { de: 56, a: 999, taux: 50, label: '+50% (au-dela 55e)' },
      { type: 'dimanche_ferie', taux: 100, label: '+100% (dim/feries)' },
    ],
    primes: [
      { code: 'PRIME_ANCIENNETE', label: 'Prime d\'ancienneté', type: 'prime', mode: 'pourcentage', base: 'salaire_base', article: 'Art. 46' },
      { code: 'PRIME_FIN_ANNEE', label: 'Prime de fin d\'année', type: 'prime', mode: 'pourcentage', taux: 33.33, base: 'salaire_base', article: 'Art. 47', conditions: '1/3 du salaire base mensuel moyen' },
      { code: 'PRIME_PANIER', label: 'Prime de panier', type: 'prime', mode: 'fixe', montant: 650, unite: 'jour', article: 'Art. 48' },
      { code: 'PRIME_INSALUBRITE', label: 'Prime d\'insalubrité', type: 'prime', mode: 'fixe', montant: 450, unite: 'jour', article: 'Art. 49' },
      { code: 'PRIME_RISQUE', label: 'Prime de risque', type: 'prime', mode: 'fixe', montant: 500, unite: 'jour', article: 'Art. 50' },
      { code: 'PRIME_CAISSE', label: 'Prime de caisse', type: 'prime', mode: 'bareme', article: 'Art. 51',
        bareme: [
          { seuil: 50000, montant: 3000 },
          { seuil: 200000, montant: 5000 },
          { seuil: 500000, montant: 8000 },
          { seuil: 1000000, montant: 10000 },
          { seuil: 999999999, montant: 15000 },
        ]
      },
    ],
    indemnites: [
      { code: 'IND_TRANSPORT', label: 'Indemnité de transport', type: 'indemnite', mode: 'fixe', montant: 5200, unite: 'mois', article: 'Art. 52' },
      { code: 'IND_VELO', label: 'Indemnité de vélo', type: 'indemnite', mode: 'fixe', montant: 3000, unite: 'mois', article: 'Art. 53' },
      { code: 'IND_VELOMOTEUR', label: 'Indemnité de vélo-moteur', type: 'indemnite', mode: 'fixe', montant: 5000, unite: 'mois', article: 'Art. 54' },
      { code: 'IND_DEPLACEMENT', label: 'Indemnité de déplacement', type: 'indemnite', mode: 'variable', article: 'Art. 55', conditions: '4x SMIG (<50km), 6x SMIG (>50km)' },
    ],
    majorations: [
      { code: 'MAJ_CAP_BEP', label: 'Majoration diplôme CAP/BEP', mode: 'fixe', montant: 1500, unite: 'mois' },
      { code: 'MAJ_BT_BP', label: 'Majoration diplôme BT/BP', mode: 'fixe', montant: 3000, unite: 'mois' },
      { code: 'MAJ_BTS_DUT', label: 'Majoration diplôme BTS/DUT', mode: 'fixe', montant: 5000, unite: 'mois' },
      { code: 'MAJ_INGENIEUR', label: 'Majoration diplôme ingénieur', mode: 'fixe', montant: 10000, unite: 'mois' },
      { code: 'MAJ_LANGUE_PARLEE', label: 'Majoration langue (parlée)', mode: 'fixe', montant: 5000, unite: 'mois' },
      { code: 'MAJ_LANGUE_ECRITE', label: 'Majoration langue (parlée + écrite)', mode: 'fixe', montant: 8000, unite: 'mois' },
    ],
    licenciement: [
      { de: 1, a: 5, taux: 35 },
      { de: 6, a: 10, taux: 40 },
      { de: 11, a: 999, taux: 45 },
    ],
  },

  // ---- COMMERCE ----
  COMMERCE: {
    label: 'Commerce',
    anciennete: { debut: 2, tauxDepart: 2, increment: 1, max: 25, base: 'salaire_base' },
    heuresSupp: [
      { de: 41, a: 46, taux: 10, label: '+10% (41e-46e)' },
      { de: 47, a: 55, taux: 25, label: '+25% (47e-55e)' },
      { de: 56, a: 999, taux: 50, label: '+50% (au-dela 55e)' },
      { type: 'dimanche_ferie', taux: 100, label: '+100% (dim/feries)' },
    ],
    primes: [
      { code: 'PRIME_ANCIENNETE', label: 'Prime d\'ancienneté', type: 'prime', mode: 'pourcentage', base: 'salaire_base', article: 'Art. 39' },
      { code: 'PRIME_FIN_ANNEE', label: 'Prime de fin d\'année', type: 'prime', mode: 'pourcentage', taux: 100, base: 'salaire_base', article: 'Art. 40', conditions: '>= 12 mois de presence' },
      { code: 'PRIME_CAISSE_PRINCIPALE', label: 'Prime de caisse principale', type: 'prime', mode: 'fixe', montant: 30000, unite: 'mois', article: 'Art. 41' },
      { code: 'PRIME_CAISSE_SECONDAIRE', label: 'Prime de caisse secondaire', type: 'prime', mode: 'fixe', montant: 15000, unite: 'mois', article: 'Art. 42' },
      { code: 'PRIME_PANIER', label: 'Prime de panier', type: 'prime', mode: 'fixe', montant: 2000, unite: 'jour', article: 'Art. 43' },
      { code: 'PRIME_ENTRETIEN_TENUE', label: 'Prime d\'entretien de tenue', type: 'prime', mode: 'fixe', montant: 1500, unite: 'mois', article: 'Art. 44' },
    ],
    indemnites: [
      { code: 'IND_TRANSPORT', label: 'Indemnité de transport', type: 'indemnite', mode: 'fixe', montant: 25000, unite: 'mois', article: 'Art. 45', conditions: 'Minimum 25 000 FCFA' },
      { code: 'IND_VELO', label: 'Indemnité de vélo', type: 'indemnite', mode: 'fixe', montant: 4000, unite: 'mois', article: 'Art. 46' },
      { code: 'IND_VELOMOTEUR', label: 'Indemnité de vélo-moteur', type: 'indemnite', mode: 'fixe', montant: 10000, unite: 'mois', article: 'Art. 46' },
      { code: 'IND_VEHICULE', label: 'Indemnité de véhicule', type: 'indemnite', mode: 'fixe', montant: 100000, unite: 'mois', article: 'Art. 46' },
    ],
    majorations: [
      { code: 'MAJ_CAP_BEP', label: 'Majoration diplôme CAP/BEP', mode: 'fixe', montant: 3000, unite: 'mois' },
      { code: 'MAJ_BT_BP', label: 'Majoration diplôme BT/BP', mode: 'fixe', montant: 5000, unite: 'mois' },
      { code: 'MAJ_BTS_DUT', label: 'Majoration diplôme BTS/DUT', mode: 'fixe', montant: 7000, unite: 'mois' },
      { code: 'MAJ_LICENCE', label: 'Majoration diplôme Licence+', mode: 'fixe', montant: 8000, unite: 'mois' },
      { code: 'MAJ_LANGUE_PARLEE', label: 'Majoration langue (parlée)', mode: 'fixe', montant: 5000, unite: 'mois' },
      { code: 'MAJ_LANGUE_ECRITE', label: 'Majoration langue (parlée + écrite)', mode: 'fixe', montant: 7000, unite: 'mois' },
    ],
    licenciement: [
      { de: 1, a: 5, taux: 30 },
      { de: 6, a: 10, taux: 38 },
      { de: 11, a: 15, taux: 44 },
      { de: 16, a: 999, taux: 50 },
    ],
  },

  // ---- INDUSTRIE ----
  INDUSTRIE: {
    label: 'Industrie',
    anciennete: { debut: 3, tauxDepart: 3, increment: 1, max: 25, base: 'salaire_base' },
    heuresSupp: [
      { de: 41, a: 46, taux: 10, label: '+10% (41e-46e)' },
      { de: 47, a: 55, taux: 25, label: '+25% (47e-55e)' },
      { de: 56, a: 999, taux: 50, label: '+50% (au-dela 55e)' },
      { type: 'dimanche_ferie', taux: 100, label: '+100% (dim/feries)' },
    ],
    primes: [
      { code: 'PRIME_ANCIENNETE', label: 'Prime d\'ancienneté', type: 'prime', mode: 'pourcentage', base: 'salaire_base', article: 'Art. 37' },
      { code: 'PRIME_FIN_ANNEE', label: 'Prime de fin d\'année', type: 'prime', mode: 'pourcentage', taux: 100, base: 'salaire_base', article: 'Art. 38', conditions: '1 mois base + 20% prime ancienneté' },
      { code: 'PRIME_PANIER', label: 'Prime de panier', type: 'prime', mode: 'fixe', montant: 1750, unite: 'jour', article: 'Art. 39', conditions: 'Minimum 1 750 FCFA/jour' },
    ],
    indemnites: [
      { code: 'IND_TRANSPORT', label: 'Indemnité de transport', type: 'indemnite', mode: 'variable', article: 'Art. 40', conditions: '100% cout abonnement transport en commun' },
    ],
    majorations: [
      { code: 'MAJ_CAP_BEP', label: 'Majoration diplôme CAP/BEP', mode: 'fixe', montant: 3800, unite: 'mois' },
      { code: 'MAJ_BT_BP', label: 'Majoration diplôme BT/BP', mode: 'fixe', montant: 5000, unite: 'mois' },
      { code: 'MAJ_BTS_DUT', label: 'Majoration diplôme BTS/DUT', mode: 'fixe', montant: 7500, unite: 'mois' },
      { code: 'MAJ_INGENIEUR', label: 'Majoration diplôme ingénieur/master', mode: 'fixe', montant: 10000, unite: 'mois' },
      { code: 'MAJ_LANGUE_PARLEE', label: 'Majoration langue (parlée)', mode: 'fixe', montant: 5000, unite: 'mois' },
      { code: 'MAJ_LANGUE_ECRITE', label: 'Majoration langue (parlée + écrite)', mode: 'fixe', montant: 7000, unite: 'mois' },
    ],
    licenciement: [
      { de: 1, a: 5, taux: 31 },
      { de: 6, a: 10, taux: 36 },
      { de: 11, a: 15, taux: 40 },
      { de: 16, a: 999, taux: 45 },
    ],
  },

  // ---- BAM (Banques, Assurances, Microfinance) ----
  BAM: {
    label: 'Banques, Assurances et Microfinance (BAM)',
    anciennete: { debut: 2, tauxDepart: 7, increment: 1, max: 40, base: 'salaire_base', note: '+2%/an a partir de 16 ans' },
    heuresSupp: [
      { de: 41, a: 48, taux: 25, label: '+25% (8 premieres heures)' },
      { de: 49, a: 999, taux: 50, label: '+50% (au-dela)' },
      { type: 'dimanche_ferie', taux: 100, label: '+100% (dim/feries)' },
    ],
    primes: [
      { code: 'PRIME_ANCIENNETE', label: 'Prime d\'ancienneté', type: 'prime', mode: 'pourcentage', base: 'salaire_base', article: 'Art. 41' },
      { code: 'PRIME_FIN_ANNEE', label: 'Gratification de fin d\'année', type: 'prime', mode: 'pourcentage', taux: 100, base: 'salaire_brut', article: 'Art. 42', conditions: '>= 6 mois (prorata)' },
      { code: 'PRIME_BILAN', label: 'Prime de bilan', type: 'prime', mode: 'variable', article: 'Art. 43' },
      { code: 'PRIME_LOGEMENT', label: 'Prime de logement', type: 'prime', mode: 'pourcentage', taux: 20, base: 'salaire_base', article: 'Art. 44', conditions: 'Min 40 000 FCFA si pas de logement fourni' },
      { code: 'PRIME_DIPLOME_BTS', label: 'Prime diplôme BTS/DUT', type: 'prime', mode: 'fixe', montant: 8500, unite: 'mois', article: 'Art. 45' },
      { code: 'PRIME_DIPLOME_LICENCE', label: 'Prime diplôme Licence', type: 'prime', mode: 'fixe', montant: 12500, unite: 'mois', article: 'Art. 45' },
      { code: 'PRIME_DIPLOME_MASTER1', label: 'Prime diplôme Maîtrise/Master 1', type: 'prime', mode: 'fixe', montant: 15000, unite: 'mois', article: 'Art. 45' },
      { code: 'PRIME_DIPLOME_MASTER2', label: 'Prime diplôme Master 2/DEA/DESS', type: 'prime', mode: 'fixe', montant: 17500, unite: 'mois', article: 'Art. 45' },
      { code: 'PRIME_DIPLOME_DOCTORAT', label: 'Prime diplôme Doctorat', type: 'prime', mode: 'fixe', montant: 22500, unite: 'mois', article: 'Art. 45' },
    ],
    indemnites: [
      { code: 'IND_TRANSPORT', label: 'Indemnité de transport', type: 'indemnite', mode: 'fixe', montant: 35000, unite: 'mois', article: 'Art. 46', conditions: 'Minimum 35 000 FCFA' },
      { code: 'IND_TRANSPORT_VOITURE', label: 'Indemnité transport voiture', type: 'indemnite', mode: 'fixe', montant: 60000, unite: 'mois', article: 'Art. 46' },
      { code: 'IND_TRANSPORT_2ROUES', label: 'Indemnité transport 2 roues', type: 'indemnite', mode: 'fixe', montant: 15000, unite: 'mois', article: 'Art. 46' },
      { code: 'IND_INSTALLATION', label: 'Indemnité d\'installation', type: 'indemnite', mode: 'variable', article: 'Art. 47', conditions: '2 mois de salaire brut (mutation)' },
    ],
    licenciement: [
      { de: 1, a: 5, mois: 1.5, note: '1,5 mois/an' },
      { de: 6, a: 10, mois: 2.5, note: '2,5 mois/an' },
      { de: 11, a: 20, mois: 3.5, note: '3,5 mois/an' },
      { de: 21, a: 999, mois: 4.5, note: '4,5 mois/an, plafond 40 mois' },
    ],
  },

  // ---- AGRI_FORET ----
  AGRI_FORET: {
    label: 'Agriculture et Foret',
    anciennete: { debut: 3, tauxDepart: 3, increment: 1, max: 29, base: 'salaire_base' },
    heuresSupp: [
      { de: 41, a: 46, taux: 10, label: '+10% (6 premieres)' },
      { de: 47, a: 999, taux: 25, label: '+25% (heures suivantes jour)' },
      { type: 'nuit', taux: 50, label: '+50% (nuit/repos/feries)' },
      { type: 'nuit_ferie', taux: 100, label: '+100% (nuit + repos/feries)' },
    ],
    primes: [
      { code: 'PRIME_ANCIENNETE', label: 'Prime d\'ancienneté', type: 'prime', mode: 'pourcentage', base: 'salaire_base', article: 'Art. 56' },
      { code: 'PRIME_FIN_ANNEE', label: 'Prime de fin d\'année', type: 'prime', mode: 'pourcentage', taux: 100, base: 'salaire_base', article: 'Art. 57' },
      { code: 'PRIME_INTERIM', label: 'Prime d\'interim', type: 'prime', mode: 'pourcentage', taux: 70, base: 'salaire_base', article: 'Art. 58' },
    ],
    indemnites: [
      { code: 'IND_TRANSPORT', label: 'Indemnité de transport', type: 'indemnite', mode: 'variable', article: 'Art. 63', conditions: '100% abonnement transport en commun' },
      { code: 'IND_DEPLACEMENT', label: 'Indemnité de déplacement', type: 'indemnite', mode: 'variable', article: 'Art. 62', conditions: '3x/6x/10x salaire horaire min' },
      { code: 'IND_MUTATION', label: 'Indemnité de mutation', type: 'indemnite', mode: 'fixe', montant: 300000, unite: 'evenement', article: 'Art. 59' },
    ],
    majorations: [
      { code: 'MAJ_DIPLOME_PETIT', label: 'Majoration diplôme (petits)', mode: 'fixe', montant: 4000, unite: 'mois' },
      { code: 'MAJ_DIPLOME_SECONDAIRE', label: 'Majoration diplôme (secondaires)', mode: 'fixe', montant: 6000, unite: 'mois' },
      { code: 'MAJ_DIPLOME_SUPERIEUR', label: 'Majoration diplôme (supérieurs)', mode: 'fixe', montant: 10000, unite: 'mois' },
      { code: 'MAJ_LANGUE_TRADUCTION', label: 'Majoration langue traduction', mode: 'fixe', montant: 7000, unite: 'mois' },
      { code: 'MAJ_LANGUE_REDACTION', label: 'Majoration langue redaction', mode: 'fixe', montant: 10000, unite: 'mois' },
    ],
    licenciement: [
      { de: 1, a: 5, taux: 30 },
      { de: 6, a: 10, taux: 35 },
      { de: 11, a: 999, taux: 40 },
    ],
    avantages: [
      { code: 'AV_HOSPITALISATION', label: 'Hospitalisation', mode: 'pourcentage', taux: 60, article: 'Art. 66' },
      { code: 'AV_PHARMACIE', label: 'Frais pharmaceutiques', mode: 'pourcentage', taux: 45, article: 'Art. 67' },
    ],
  },

  // ---- FORESTIERE ----
  FORESTIERE: {
    label: 'Forestière',
    anciennete: { debut: 3, tauxDepart: 3, increment: 1, max: 29, base: 'salaire_base' },
    heuresSupp: [
      { de: 41, a: 46, taux: 10, label: '+10% (6 premieres)' },
      { de: 47, a: 999, taux: 25, label: '+25% (heures suivantes jour)' },
      { type: 'nuit', taux: 50, label: '+50% (nuit/repos/feries)' },
      { type: 'nuit_ferie', taux: 100, label: '+100% (nuit + repos/feries)' },
    ],
    primes: [
      { code: 'PRIME_ANCIENNETE', label: 'Prime d\'ancienneté', type: 'prime', mode: 'pourcentage', base: 'salaire_base', article: 'Art. 56' },
      { code: 'PRIME_FIN_ANNEE', label: 'Prime de fin d\'année', type: 'prime', mode: 'pourcentage', taux: 100, base: 'salaire_base', article: 'Art. 57' },
      { code: 'PRIME_CAISSE_PRINCIPALE', label: 'Prime de caisse principale', type: 'prime', mode: 'fixe', montant: 12000, unite: 'mois', article: 'Art. 58' },
      { code: 'PRIME_CAISSE_SECONDAIRE', label: 'Prime de caisse secondaire', type: 'prime', mode: 'fixe', montant: 7000, unite: 'mois', article: 'Art. 58' },
      { code: 'PRIME_VELOMOTEUR', label: 'Prime vélo-moteur', type: 'prime', mode: 'fixe', montant: 6000, unite: 'mois', article: 'Art. 58' },
      { code: 'PRIME_VELO', label: 'Prime velo', type: 'prime', mode: 'fixe', montant: 4000, unite: 'mois', article: 'Art. 58' },
    ],
    indemnites: [
      { code: 'IND_PANIER', label: 'Indemnité de panier', type: 'indemnite', mode: 'variable', article: 'Art. 61', conditions: '4x salaire horaire min 1ere catégorie' },
      { code: 'IND_TRANSPORT', label: 'Indemnité de transport', type: 'indemnite', mode: 'variable', article: 'Art. 63', conditions: '100% abonnement transport en commun' },
      { code: 'IND_DEPLACEMENT', label: 'Indemnité de déplacement', type: 'indemnite', mode: 'variable', article: 'Art. 62', conditions: '3x/6x/10x salaire horaire min' },
    ],
    majorations: [
      { code: 'MAJ_DIPLOME_PETIT', label: 'Majoration diplôme (petits)', mode: 'fixe', montant: 4000, unite: 'mois', article: 'Art. 59' },
      { code: 'MAJ_DIPLOME_SECONDAIRE', label: 'Majoration diplôme (secondaires)', mode: 'fixe', montant: 6000, unite: 'mois', article: 'Art. 59' },
      { code: 'MAJ_DIPLOME_SUPERIEUR', label: 'Majoration diplôme (supérieurs)', mode: 'fixe', montant: 10000, unite: 'mois', article: 'Art. 59' },
      { code: 'MAJ_LANGUE_TRADUCTION', label: 'Majoration langue traduction', mode: 'fixe', montant: 7000, unite: 'mois', article: 'Art. 60' },
      { code: 'MAJ_LANGUE_REDACTION', label: 'Majoration langue redaction', mode: 'fixe', montant: 10000, unite: 'mois', article: 'Art. 60' },
      { code: 'MAJ_STENO', label: 'Majoration stenographie', mode: 'fixe', montant: 8000, unite: 'mois', article: 'Art. 60' },
    ],
    avantages: [
      { code: 'AV_HOSPITALISATION', label: 'Hospitalisation', mode: 'pourcentage', taux: 60, article: 'Art. 66' },
      { code: 'AV_PHARMACIE', label: 'Frais pharmaceutiques', mode: 'pourcentage', taux: 45, article: 'Art. 67' },
    ],
  },

  // ---- AUXILIAIRES_TRANSPORT ----
  AUXILIAIRES_TRANSPORT: {
    label: 'Auxiliaires de Transport',
    anciennete: { debut: 2, tauxDepart: 2, increment: 1, max: 25, base: 'salaire_base' },
    heuresSupp: [
      { de: 41, a: 48, taux: 25, label: '+25% (jour)' },
      { de: 49, a: 999, taux: 50, label: '+50% (au-dela)' },
      { type: 'dimanche_ferie', taux: 100, label: '+100% (dim/feries)' },
    ],
    primes: [
      { code: 'PRIME_ANCIENNETE', label: 'Prime d\'ancienneté', type: 'prime', mode: 'pourcentage', base: 'salaire_base' },
      { code: 'PRIME_FIN_ANNEE', label: 'Prime de fin d\'année', type: 'prime', mode: 'variable' },
    ],
    indemnites: [
      { code: 'IND_TRANSPORT', label: 'Indemnité de transport', type: 'indemnite', mode: 'variable' },
    ],
    licenciement: [
      { de: 1, a: 5, taux: 25 },
      { de: 6, a: 10, taux: 35 },
      { de: 11, a: 15, taux: 40 },
      { de: 16, a: 20, taux: 45 },
      { de: 21, a: 999, taux: 50 },
    ],
    avantages: [
      { code: 'AV_FUNERAILLES', label: 'Frais funérailles', mode: 'fixe', montant: 250000 },
    ],
  },

  // ---- TRANSPORT_AERIEN ----
  TRANSPORT_AERIEN: {
    label: 'Transport Aérien',
    anciennete: { debut: 2, tauxDepart: 2, increment: 1, max: 25, base: 'salaire_base' },
    heuresSupp: [
      { de: 41, a: 45, taux: 10, label: '+10% (5 premieres)' },
      { de: 46, a: 999, taux: 25, label: '+25% (heures suivantes jour)' },
      { type: 'nuit', taux: 50, label: '+50% (nuit/repos/feries)' },
      { type: 'nuit_ferie', taux: 100, label: '+100% (nuit + repos/feries)' },
    ],
    primes: [
      { code: 'PRIME_ANCIENNETE', label: 'Prime d\'ancienneté', type: 'prime', mode: 'pourcentage', base: 'salaire_base', article: 'Art. 48' },
      { code: 'PRIME_FIN_ANNEE', label: 'Prime de fin d\'année (13e mois)', type: 'prime', mode: 'pourcentage', taux: 100, base: 'salaire_brut', article: 'Art. 51' },
      { code: 'PRIME_PANIER', label: 'Prime de panier', type: 'prime', mode: 'fixe', montant: 1500, unite: 'repas', article: 'Art. 49' },
    ],
    indemnites: [
      { code: 'IND_TRANSPORT', label: 'Indemnité de transport', type: 'indemnite', mode: 'fixe', montant: 18000, unite: 'mois', article: 'Art. 50', conditions: 'Non transporte' },
      { code: 'IND_TRANSPORT_CADRE', label: 'Indemnité transport cadre/maîtrise', type: 'indemnite', mode: 'fixe', montant: 23000, unite: 'mois', article: 'Art. 50', conditions: 'Cadres/maîtrise avec voiture' },
      { code: 'IND_LOGEMENT_CADRE', label: 'Indemnité logement cadre', type: 'indemnite', mode: 'fixe', montant: 85000, unite: 'mois', article: 'Art. 37', conditions: '+8 500/enfant' },
      { code: 'IND_LOGEMENT_MAITRISE', label: 'Indemnité logement maîtrise', type: 'indemnite', mode: 'fixe', montant: 65000, unite: 'mois', article: 'Art. 37', conditions: '+6 500/enfant' },
      { code: 'IND_LOGEMENT_EMPLOYE', label: 'Indemnité logement employe', type: 'indemnite', mode: 'fixe', montant: 55000, unite: 'mois', article: 'Art. 37', conditions: '+5 500/enfant' },
    ],
    majorations: [
      { code: 'MAJ_DIPLOME_PETIT', label: 'Majoration diplôme (petits)', mode: 'fixe', montant: 2500, unite: 'mois', article: 'Art. 53' },
      { code: 'MAJ_DIPLOME_SECONDAIRE', label: 'Majoration diplôme (secondaires)', mode: 'fixe', montant: 5000, unite: 'mois', article: 'Art. 53' },
      { code: 'MAJ_DIPLOME_SUPERIEUR', label: 'Majoration diplôme (supérieurs)', mode: 'fixe', montant: 10000, unite: 'mois', article: 'Art. 53' },
    ],
    licenciement: [
      { de: 1, a: 5, taux: 25 },
      { de: 6, a: 10, taux: 35 },
      { de: 11, a: 15, taux: 40 },
      { de: 16, a: 20, taux: 45 },
      { de: 21, a: 999, taux: 50 },
    ],
    avantages: [
      { code: 'AV_HOSPITALISATION', label: 'Hospitalisation', mode: 'pourcentage', taux: 100, article: 'Art. 57' },
      { code: 'AV_PHARMACIE', label: 'Frais pharmaceutiques', mode: 'pourcentage', taux: 50, article: 'Art. 58' },
    ],
  },

  // ---- HOTELLERIE_CATERING ----
  HOTELLERIE_CATERING: {
    label: 'Hôtellerie et Catering',
    anciennete: { debut: 2, tauxDepart: 5, increment: 1, max: 30, base: 'salaire_base' },
    heuresSupp: [
      { de: 41, a: 48, taux: 25, label: '+25% (jour)' },
      { de: 49, a: 999, taux: 50, label: '+50% (au-dela)' },
      { type: 'dimanche_ferie', taux: 100, label: '+100% (dim/feries)' },
    ],
    primes: [
      { code: 'PRIME_ANCIENNETE', label: 'Prime d\'ancienneté', type: 'prime', mode: 'pourcentage', base: 'salaire_base', article: 'Art. 55' },
      { code: 'PRIME_FIN_ANNEE', label: 'Prime de fin d\'année', type: 'prime', mode: 'pourcentage', taux: 100, base: 'salaire_base', article: 'Art. 62' },
      { code: 'PRIME_PANIER', label: 'Prime de panier', type: 'prime', mode: 'fixe', montant: 2000, unite: 'jour', article: 'Art. 56', conditions: 'Minimum 2 000 FCFA' },
      { code: 'PRIME_REPAS', label: 'Prime de repas', type: 'prime', mode: 'fixe', montant: 12000, unite: 'mois', article: 'Art. 57' },
      { code: 'PRIME_CAISSE_PRINCIPALE', label: 'Prime de caisse principale', type: 'prime', mode: 'fixe', montant: 15000, unite: 'mois', article: 'Art. 60' },
      { code: 'PRIME_CAISSE_SECONDAIRE', label: 'Prime de caisse secondaire', type: 'prime', mode: 'fixe', montant: 10000, unite: 'mois', article: 'Art. 60' },
      { code: 'PRIME_RISQUE', label: 'Prime de risque', type: 'prime', mode: 'fixe', montant: 10000, unite: 'mois', article: 'Art. 61' },
      { code: 'PRIME_MER_CHANTIER', label: 'Prime mer/chantier', type: 'prime', mode: 'fixe', montant: 15000, unite: 'mois', article: 'Art. 72', conditions: 'Catering offshore' },
      { code: 'PRIME_ROULEMENT', label: 'Prime de roulement', type: 'prime', mode: 'fixe', montant: 15000, unite: 'mois', article: 'Art. 72' },
      { code: 'PRIME_ELOIGNEMENT', label: 'Prime d\'éloignement', type: 'prime', mode: 'fixe', montant: 9000, unite: 'mois', article: 'Art. 72' },
      { code: 'PRIME_PLATEFORME', label: 'Prime plateforme', type: 'prime', mode: 'fixe', montant: 9000, unite: 'mois', article: 'Art. 72' },
      { code: 'PRIME_NUIT', label: 'Prime de nuit', type: 'prime', mode: 'fixe', montant: 2500, unite: 'jour', article: 'Art. 72' },
      { code: 'PRIME_CHEF_CUISINE', label: 'Prime responsabilite chef cuisine', type: 'prime', mode: 'variable', article: 'Art. 72', conditions: '50 000-75 000 FCFA' },
    ],
    indemnites: [
      { code: 'IND_TRANSPORT', label: 'Indemnité de transport', type: 'indemnite', mode: 'fixe', montant: 15000, unite: 'mois', article: 'Art. 58' },
      { code: 'IND_VELOMOTEUR', label: 'Indemnité vélo-moteur', type: 'indemnite', mode: 'fixe', montant: 15000, unite: 'mois', article: 'Art. 61' },
      { code: 'IND_VOITURE', label: 'Indemnité voiture', type: 'indemnite', mode: 'fixe', montant: 50000, unite: 'mois', article: 'Art. 61' },
    ],
    majorations: [
      { code: 'MAJ_BET_BEP', label: 'Majoration diplôme BET/BEP', mode: 'fixe', montant: 10000, unite: 'mois', article: 'Art. 64' },
      { code: 'MAJ_BTS', label: 'Majoration diplôme BTS', mode: 'fixe', montant: 15000, unite: 'mois', article: 'Art. 64' },
      { code: 'MAJ_LANGUE_TRADUCTION', label: 'Majoration langue traduction', mode: 'fixe', montant: 9000, unite: 'mois', article: 'Art. 65' },
      { code: 'MAJ_LANGUE_REDACTION', label: 'Majoration langue redaction', mode: 'fixe', montant: 12000, unite: 'mois', article: 'Art. 65' },
    ],
    licenciement: [
      { de: 1, a: 5, taux: 50 },
      { de: 6, a: 10, taux: 60 },
      { de: 11, a: 999, taux: 70 },
    ],
  },

  // ---- MINIERE ----
  MINIERE: {
    label: 'Exploitation Minière',
    anciennete: { debut: 2, tauxDepart: 5, increment: 1, max: 30, base: 'salaire_base' },
    heuresSupp: [
      { de: 41, a: 999, taux: 25, label: '+25% (jour)' },
      { type: 'nuit', taux: 50, label: '+50% (nuit/repos/feries)' },
      { type: 'nuit_ferie', taux: 100, label: '+100% (nuit + repos/feries)' },
    ],
    primes: [
      { code: 'PRIME_ANCIENNETE', label: 'Prime d\'ancienneté', type: 'prime', mode: 'pourcentage', base: 'salaire_base', article: 'Art. 55' },
      { code: 'PRIME_FIN_ANNEE', label: 'Prime de fin d\'année', type: 'prime', mode: 'pourcentage', taux: 100, base: 'salaire_base', article: 'Art. 62' },
      { code: 'PRIME_PANIER', label: 'Prime de panier', type: 'prime', mode: 'fixe', montant: 2000, unite: 'jour', article: 'Art. 56', conditions: 'Minimum 2 000 FCFA' },
      { code: 'PRIME_REPAS', label: 'Prime de repas', type: 'prime', mode: 'fixe', montant: 12000, unite: 'mois', article: 'Art. 57' },
      { code: 'PRIME_CAISSE_PRINCIPALE', label: 'Prime de caisse principale', type: 'prime', mode: 'fixe', montant: 15000, unite: 'mois', article: 'Art. 60' },
      { code: 'PRIME_CAISSE_SECONDAIRE', label: 'Prime de caisse secondaire', type: 'prime', mode: 'fixe', montant: 10000, unite: 'mois', article: 'Art. 60' },
      { code: 'PRIME_RISQUE', label: 'Prime de risque', type: 'prime', mode: 'fixe', montant: 10000, unite: 'mois', article: 'Art. 61' },
    ],
    indemnites: [
      { code: 'IND_TRANSPORT', label: 'Indemnité de transport', type: 'indemnite', mode: 'fixe', montant: 15000, unite: 'mois', article: 'Art. 58' },
      { code: 'IND_VELOMOTEUR', label: 'Indemnité vélo-moteur', type: 'indemnite', mode: 'fixe', montant: 15000, unite: 'mois', article: 'Art. 61' },
      { code: 'IND_VOITURE', label: 'Indemnité voiture', type: 'indemnite', mode: 'fixe', montant: 50000, unite: 'mois', article: 'Art. 61' },
    ],
    majorations: [
      { code: 'MAJ_BET_BEP', label: 'Majoration diplôme BET/BEP', mode: 'fixe', montant: 10000, unite: 'mois', article: 'Art. 64' },
      { code: 'MAJ_BTS', label: 'Majoration diplôme BTS', mode: 'fixe', montant: 15000, unite: 'mois', article: 'Art. 64' },
      { code: 'MAJ_LANGUE_TRADUCTION', label: 'Majoration langue traduction', mode: 'fixe', montant: 9000, unite: 'mois', article: 'Art. 65' },
      { code: 'MAJ_LANGUE_REDACTION', label: 'Majoration langue redaction', mode: 'fixe', montant: 12000, unite: 'mois', article: 'Art. 65' },
    ],
  },

  // ---- DOMESTIQUE ----
  DOMESTIQUE: {
    label: 'Domestique de Maison',
    anciennete: { debut: 3, tauxDepart: 3, increment: 1, max: 25, base: 'salaire_base' },
    heuresSupp: [
      { de: 41, a: 48, taux: 25, label: '+25% (jour)' },
      { de: 49, a: 999, taux: 50, label: '+50% (au-dela)' },
      { type: 'dimanche_ferie', taux: 100, label: '+100% (dim/feries)' },
    ],
    primes: [
      { code: 'PRIME_ANCIENNETE', label: 'Prime d\'ancienneté', type: 'prime', mode: 'pourcentage', base: 'salaire_base' },
    ],
    indemnites: [
      { code: 'IND_TRANSPORT', label: 'Indemnité de transport', type: 'indemnite', mode: 'variable', conditions: '>= 45% abonnement transport' },
      { code: 'IND_SOINS', label: 'Soins medicaux', type: 'indemnite', mode: 'pourcentage', taux: 50 },
    ],
    licenciement: [
      { de: 1, a: 5, taux: 15 },
      { de: 6, a: 10, taux: 20 },
      { de: 11, a: 15, taux: 25 },
      { de: 16, a: 999, taux: 30 },
    ],
  },

  // ---- PECHE_MARITIME ----
  PECHE_MARITIME: {
    label: 'Pêche Maritime Industrielle',
    anciennete: { debut: 2, tauxDepart: 2, increment: 1, max: 25, base: 'salaire_base' },
    heuresSupp: [
      { de: 41, a: 48, taux: 25, label: '+25% (jour)' },
      { de: 49, a: 999, taux: 50, label: '+50% (au-dela)' },
      { type: 'dimanche_ferie', taux: 100, label: '+100% (dim/feries)' },
    ],
    primes: [
      { code: 'PRIME_ANCIENNETE', label: 'Prime d\'ancienneté', type: 'prime', mode: 'pourcentage', base: 'salaire_base' },
      { code: 'PRIME_GODAILLE', label: 'Godaille (poisson)', type: 'prime', mode: 'variable', conditions: 'Droit au poisson pour consommation personnelle' },
    ],
    indemnites: [
      { code: 'IND_TRANSPORT', label: 'Indemnité de transport', type: 'indemnite', mode: 'variable' },
    ],
  },

  // ---- NTIC ----
  NTIC: {
    label: 'NTIC',
    anciennete: { debut: 3, tauxDepart: 5, increment: 2, max: 40, base: 'salaire_base', note: '+2%/an a partir de 5e année' },
    heuresSupp: [
      { de: 41, a: 48, taux: 25, label: '+25% (jour)' },
      { de: 49, a: 999, taux: 50, label: '+50% (au-dela)' },
      { type: 'dimanche_ferie', taux: 100, label: '+100% (dim/feries)' },
    ],
    primes: [
      { code: 'PRIME_ANCIENNETE', label: 'Prime d\'ancienneté', type: 'prime', mode: 'pourcentage', base: 'salaire_base', article: 'Art. 58' },
      { code: 'PRIME_13E_MOIS', label: '13e mois', type: 'prime', mode: 'pourcentage', taux: 100, base: 'salaire_brut_imposable', article: 'Art. 59', conditions: 'Mois de reference (nov ou juil)' },
      { code: 'PRIME_DIPLOME_CEP', label: 'Prime diplôme CEP', type: 'prime', mode: 'fixe', montant: 4000, unite: 'mois', article: 'Art. 61' },
      { code: 'PRIME_DIPLOME_BEPC', label: 'Prime diplôme BEMT/BEPC', type: 'prime', mode: 'fixe', montant: 10000, unite: 'mois', article: 'Art. 61' },
      { code: 'PRIME_DIPLOME_BAC', label: 'Prime diplôme Bac/BTS', type: 'prime', mode: 'fixe', montant: 15000, unite: 'mois', article: 'Art. 61' },
      { code: 'PRIME_DIPLOME_SUP', label: 'Prime diplôme supérieur', type: 'prime', mode: 'fixe', montant: 30000, unite: 'mois', article: 'Art. 61' },
      { code: 'PRIME_LANGUE', label: 'Prime de langue', type: 'prime', mode: 'fixe', montant: 40000, unite: 'mois', article: 'Art. 62' },
      { code: 'PRIME_CAISSE', label: 'Prime de caisse/solde', type: 'prime', mode: 'pourcentage', taux: 30, base: 'salaire_base', article: 'Art. 66' },
      { code: 'PRIME_ORDINATEUR', label: 'Prime ordinateur', type: 'prime', mode: 'fixe', montant: 8000, unite: 'mois', article: 'Art. 67' },
      { code: 'PRIME_PANIER', label: 'Prime de panier', type: 'prime', mode: 'fixe', montant: 3000, unite: 'repas', article: 'Art. 68', conditions: 'Max 2/jour = 6 000/jour' },
      { code: 'PRIME_INSALUBRITE', label: 'Prime d\'insalubrité', type: 'prime', mode: 'fixe', montant: 500, unite: 'jour', article: 'Art. 69' },
      { code: 'PRIME_RISQUE_CHAUFFEUR', label: 'Prime risque chauffeur', type: 'prime', mode: 'fixe', montant: 1500, unite: 'jour', article: 'Art. 69' },
      { code: 'PRIME_ASTREINTE', label: 'Prime astreinte offshore', type: 'prime', mode: 'fixe', montant: 15000, unite: 'mois', article: 'Art. 69' },
    ],
    indemnites: [
      { code: 'IND_TRANSPORT_EXEC', label: 'Indemnité transport (exécution)', type: 'indemnite', mode: 'fixe', montant: 60000, unite: 'mois', article: 'Art. 63' },
      { code: 'IND_TRANSPORT_MAITRISE', label: 'Indemnité transport (maîtrise)', type: 'indemnite', mode: 'fixe', montant: 75000, unite: 'mois', article: 'Art. 63' },
      { code: 'IND_TRANSPORT_CADRE', label: 'Indemnité transport (cadre)', type: 'indemnite', mode: 'fixe', montant: 75000, unite: 'mois', article: 'Art. 63' },
      { code: 'IND_VEHICULE_VELOMOTEUR', label: 'Indemnité véhicule vélomoteur', type: 'indemnite', mode: 'fixe', montant: 40000, unite: 'mois', article: 'Art. 64' },
      { code: 'IND_VEHICULE_BUREAU', label: 'Indemnité véhicule bureau', type: 'indemnite', mode: 'fixe', montant: 200000, unite: 'mois', article: 'Art. 64' },
      { code: 'IND_VEHICULE_EXPLOIT', label: 'Indemnité véhicule exploitation', type: 'indemnite', mode: 'fixe', montant: 250000, unite: 'mois', article: 'Art. 64' },
      { code: 'IND_LOGEMENT_EXEC', label: 'Indemnité logement (exécution)', type: 'indemnite', mode: 'fixe', montant: 10000, unite: 'mois', article: 'Art. 65' },
      { code: 'IND_LOGEMENT_MAITRISE', label: 'Indemnité logement (maîtrise)', type: 'indemnite', mode: 'fixe', montant: 15000, unite: 'mois', article: 'Art. 65' },
      { code: 'IND_LOGEMENT_CADRE', label: 'Indemnité logement (cadre)', type: 'indemnite', mode: 'fixe', montant: 100000, unite: 'mois', article: 'Art. 65', conditions: '100-250K selon catégorie' },
    ],
    licenciement: [
      { de: 1, a: 3, mois: 2 },
      { de: 3, a: 5, mois: 3 },
      { de: 5, a: 10, mois: 4 },
      { de: 10, a: 999, mois: 6, note: '+25%/an supplémentaire' },
    ],
    avantages: [
      { code: 'AV_DECES', label: 'Frais deces (inhumation)', mode: 'fixe', montant: 1300000, article: 'Art. 42' },
      { code: 'AV_FUNERAILLES', label: 'Frais funérailles', mode: 'fixe', montant: 300000, article: 'Art. 42' },
    ],
  },

  // ---- PARA_PETROLE ----
  PARA_PETROLE: {
    label: 'Para-Pétrole',
    anciennete: { debut: 3, tauxDepart: 5, increment: 2, max: 40, base: 'salaire_base', note: '+2%/an a partir de 5e année' },
    heuresSupp: [
      { de: 41, a: 48, taux: 25, label: '+25% (jour)' },
      { de: 49, a: 999, taux: 50, label: '+50% (au-dela)' },
      { type: 'dimanche_ferie', taux: 100, label: '+100% (dim/feries)' },
    ],
    primes: [
      { code: 'PRIME_ANCIENNETE', label: 'Prime d\'ancienneté', type: 'prime', mode: 'pourcentage', base: 'salaire_base', article: 'Art. 58' },
      { code: 'PRIME_13E_MOIS', label: '13e mois', type: 'prime', mode: 'variable', article: 'Art. 59' },
      { code: 'PRIME_DIPLOME', label: 'Prime de diplôme', type: 'prime', mode: 'variable', article: 'Art. 61' },
      { code: 'PRIME_LANGUE', label: 'Prime de langue', type: 'prime', mode: 'variable', article: 'Art. 62' },
      { code: 'PRIME_CAISSE', label: 'Prime de caisse', type: 'prime', mode: 'variable', article: 'Art. 66' },
      { code: 'PRIME_ORDINATEUR', label: 'Prime ordinateur', type: 'prime', mode: 'variable', article: 'Art. 67' },
      { code: 'PRIME_PANIER', label: 'Prime de panier', type: 'prime', mode: 'variable', article: 'Art. 68' },
      { code: 'PRIME_ASTREINTE', label: 'Prime astreinte offshore', type: 'prime', mode: 'variable', article: 'Art. 69' },
    ],
    indemnites: [
      { code: 'IND_TRANSPORT', label: 'Indemnité de transport', type: 'indemnite', mode: 'variable', article: 'Art. 63' },
      { code: 'IND_VEHICULE', label: 'Indemnité véhicule', type: 'indemnite', mode: 'variable', article: 'Art. 64' },
      { code: 'IND_LOGEMENT', label: 'Indemnité de logement', type: 'indemnite', mode: 'variable', article: 'Art. 65' },
    ],
    licenciement: [
      { de: 1, a: 3, mois: 2 },
      { de: 3, a: 5, mois: 3 },
      { de: 5, a: 10, mois: 4 },
      { de: 10, a: 999, mois: 6, note: '+25%/an supplémentaire' },
    ],
    avantages: [
      { code: 'AV_DECES', label: 'Frais deces', mode: 'fixe', montant: 1300000, article: 'Art. 42' },
      { code: 'AV_FUNERAILLES', label: 'Frais funérailles', mode: 'fixe', montant: 300000, article: 'Art. 42' },
    ],
  },

  // ---- INFO_COMM ----
  INFO_COMM: {
    label: 'Information et Communication',
    anciennete: { debut: 2, tauxDepart: 5, increment: 0, max: 20, base: 'salaire_base',
      paliers: [
        { de: 2, a: 5, taux: 5 },
        { de: 6, a: 10, taux: 7 },
        { de: 11, a: 15, taux: 10 },
        { de: 16, a: 20, taux: 15 },
        { de: 21, a: 999, taux: 20 },
      ]
    },
    heuresSupp: [
      { de: 41, a: 48, taux: 25, label: '+25% (jour)' },
      { de: 49, a: 999, taux: 50, label: '+50% (au-dela)' },
      { type: 'dimanche_ferie', taux: 100, label: '+100% (dim/feries)' },
    ],
    primes: [
      { code: 'PRIME_ANCIENNETE', label: 'Prime d\'ancienneté', type: 'prime', mode: 'pourcentage', base: 'salaire_base', article: 'Art. 58' },
      { code: 'PRIME_FIN_ANNEE', label: 'Prime de fin d\'année', type: 'prime', mode: 'pourcentage', taux: 100, base: 'salaire_base_plus_anciennete', article: 'Art. 59', conditions: 'Sous reserve atteinte objectif annuel' },
      { code: 'PRIME_PANIER', label: 'Prime de panier', type: 'prime', mode: 'fixe', montant: 2000, unite: 'jour', article: 'Art. 62' },
      { code: 'PRIME_EQUIPEMENT_STAGE', label: 'Prime equipement stage etranger', type: 'prime', mode: 'fixe', montant: 50000, unite: 'evenement', article: 'Art. 63' },
    ],
    indemnites: [
      { code: 'IND_TRANSPORT', label: 'Indemnité de transport', type: 'indemnite', mode: 'fixe', montant: 10000, unite: 'mois', article: 'Art. 60' },
      { code: 'IND_MISSION_EMPLOYE', label: 'Frais de mission employe', type: 'indemnite', mode: 'fixe', montant: 25000, unite: 'jour', article: 'Art. 55' },
      { code: 'IND_MISSION_MAITRISE', label: 'Frais de mission maîtrise', type: 'indemnite', mode: 'fixe', montant: 40000, unite: 'jour', article: 'Art. 55' },
      { code: 'IND_MISSION_CADRE', label: 'Frais de mission cadre', type: 'indemnite', mode: 'fixe', montant: 50000, unite: 'jour', article: 'Art. 55' },
    ],
    licenciement: [
      { de: 1, a: 5, mois: 1, note: '1 mois/an' },
      { de: 6, a: 10, mois: 1.5, note: '1,5 mois/an' },
      { de: 11, a: 15, mois: 2, note: '2 mois/an' },
      { de: 16, a: 20, mois: 2.5, note: '2,5 mois/an' },
      { de: 21, a: 999, mois: 3, note: '3 mois/an, max 33 mois' },
    ],
    avantages: [
      { code: 'AV_PHARMACIE', label: 'Pharmacie travailleur', mode: 'pourcentage', taux: 50, article: 'Art. 67' },
      { code: 'AV_PHARMACIE_FAMILLE', label: 'Pharmacie famille', mode: 'pourcentage', taux: 30, article: 'Art. 67' },
      { code: 'AV_HOSPITALISATION', label: 'Hospitalisation', mode: 'pourcentage', taux: 50, article: 'Art. 67' },
    ],
  },
};

// ---- Fonctions utilitaires ----

/**
 * Retourne les rubriques d'une convention
 */
export function getRubriquesConvention(conventionCode) {
  return CONVENTIONS_RUBRIQUES[conventionCode] || CONVENTIONS_RUBRIQUES[''];
}

/**
 * Retourne toutes les primes applicables pour un salarie selon sa convention
 */
export function getPrimesConvention(conventionCode) {
  const conv = getRubriquesConvention(conventionCode);
  return conv.primes || [];
}

/**
 * Retourne toutes les indemnites applicables pour un salarie selon sa convention
 */
export function getIndemnitésConvention(conventionCode) {
  const conv = getRubriquesConvention(conventionCode);
  return conv.indemnites || [];
}

/**
 * Retourne les majorations diplome/langue si definies
 */
export function getMajorationsConvention(conventionCode) {
  const conv = getRubriquesConvention(conventionCode);
  return conv.majorations || [];
}

/**
 * Calcule la prime d'anciennete selon la convention
 */
export function calculerPrimeAnciennete(conventionCode, anneesAnciennete, salaireBase) {
  const conv = getRubriquesConvention(conventionCode);
  const anc = conv.anciennete;
  if (!anc || anneesAnciennete < anc.debut) return 0;

  let taux = 0;
  if (anc.paliers) {
    // Systeme par paliers (Info & Comm)
    for (const p of anc.paliers) {
      if (anneesAnciennete >= p.de && anneesAnciennete <= p.a) {
        taux = p.taux;
        break;
      }
    }
  } else {
    // Systeme incremental standard
    taux = anc.tauxDepart + (anneesAnciennete - anc.debut) * anc.increment;
    taux = Math.min(taux, anc.max);
  }

  return Math.round(salaireBase * taux / 100);
}

/**
 * Calcule les heures supplémentaires selon la convention
 */
export function calculerHeuresSupp(conventionCode, heuresTravaillees, tauxHoraire, estDimancheFerie = false, estNuit = false) {
  const conv = getRubriquesConvention(conventionCode);
  const hs = conv.heuresSupp || [];
  let montant = 0;

  if (heuresTravaillees <= 40) return 0;

  const heuresSupp = heuresTravaillees - 40;

  if (estDimancheFerie) {
    const tauxFerie = hs.find(h => h.type === 'dimanche_ferie')?.taux || 100;
    return Math.round(heuresSupp * tauxHoraire * (1 + tauxFerie / 100));
  }

  if (estNuit) {
    const tauxNuit = hs.find(h => h.type === 'nuit')?.taux || 50;
    return Math.round(heuresSupp * tauxHoraire * (1 + tauxNuit / 100));
  }

  let heuresRestantes = heuresSupp;
  for (const tranche of hs.filter(h => !h.type)) {
    const debut = tranche.de - 41;
    const fin = tranche.a - 40;
    const heuresDansTranche = Math.min(Math.max(heuresRestantes - debut, 0), fin - debut);
    if (heuresDansTranche > 0) {
      montant += Math.round(heuresDansTranche * tauxHoraire * (1 + tranche.taux / 100));
    }
  }

  return montant;
}

/**
 * Retourne le bareme de licenciement selon la convention
 */
export function getBaremeLicenciement(conventionCode) {
  const conv = getRubriquesConvention(conventionCode);
  return conv.licenciement || [];
}

/**
 * Retourne le resume des specificites pour affichage
 */
export function getResumeConvention(conventionCode) {
  const conv = getRubriquesConvention(conventionCode);
  return {
    label: conv.label,
    ancienneteMax: conv.anciennete?.max || 0,
    ancienneteDebut: conv.anciennete?.debut || 0,
    nbPrimes: (conv.primes || []).length,
    nbIndemnités: (conv.indemnites || []).length,
    nbMajorations: (conv.majorations || []).length,
    heuresSupp: conv.heuresSupp || [],
  };
}

export default CONVENTIONS_RUBRIQUES;
