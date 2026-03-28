import { calculerBulletin } from '../utils/calculPaie';

describe('calculerBulletin', () => {
  test('calcul de base - salaire minimum (SMIG)', () => {
    const result = calculerBulletin({ salaireBase: 70400 });
    expect(result.salaire_base).toBe(70400);
    expect(result.cnss_salariale).toBeGreaterThan(0);
    expect(result.its).toBeGreaterThanOrEqual(0);
    expect(result.net_a_payer).toBeLessThan(70400);
    expect(result.net_a_payer).toBeGreaterThan(0);
    expect(result.devise).toBe('XAF');
  });

  test('CNSS salariale plafonnee a 1 200 000', () => {
    const result = calculerBulletin({ salaireBase: 2000000 });
    // CNSS 4% plafonned on min(brut, 1 200 000) = 48 000
    expect(result.cnss_salariale).toBe(48000);
  });

  test('CNSS salariale sous le plafond', () => {
    const result = calculerBulletin({ salaireBase: 500000 });
    // 4% of 500 000 = 20 000
    expect(result.cnss_salariale).toBe(20000);
  });

  test('quotient familial reduit ITS', () => {
    const celibataire = calculerBulletin({
      salaireBase: 500000,
      situation: 'celibataire',
      nombreEnfants: 0,
    });
    const marie3enfants = calculerBulletin({
      salaireBase: 500000,
      situation: 'marie',
      nombreEnfants: 3,
    });
    expect(marie3enfants.its).toBeLessThan(celibataire.its);
  });

  test('CAMU nulle quand brut taxable sous 500 000', () => {
    const result = calculerBulletin({ salaireBase: 400000 });
    expect(result.camu_salariale).toBe(0);
  });

  test('CAMU appliquee quand brut taxable au-dessus de 500 000', () => {
    const result = calculerBulletin({ salaireBase: 800000 });
    expect(result.camu_salariale).toBeGreaterThan(0);
  });

  test('TOL centre-ville = 5000', () => {
    const result = calculerBulletin({ salaireBase: 500000, zoneTOL: 'centre_ville' });
    expect(result.taxe_locaux).toBe(5000);
  });

  test('TOL peripherie = 1000', () => {
    const result = calculerBulletin({ salaireBase: 500000, zoneTOL: 'peripherie' });
    expect(result.taxe_locaux).toBe(1000);
  });

  test('taxe regionale en janvier', () => {
    const janvier = calculerBulletin({ salaireBase: 500000, moisJanvier: true });
    const mars = calculerBulletin({ salaireBase: 500000, moisJanvier: false });
    expect(janvier.taxe_regionale).toBe(2400);
    expect(mars.taxe_regionale).toBe(0);
  });

  test('PNI excedent reintegre dans base imposable', () => {
    const sansPNI = calculerBulletin({ salaireBase: 500000 });
    const avecPNI = calculerBulletin({
      salaireBase: 500000,
      pniPrimes: [{ code: 'TRANSPORT', montant: 200000 }],
    });
    expect(avecPNI.pni_excedent).toBeGreaterThan(0);
    // ITS should be higher because excess PNI is added to taxable base
    expect(avecPNI.its).toBeGreaterThanOrEqual(sansPNI.its);
  });

  test('PNI sous le plafond - pas d excedent', () => {
    const result = calculerBulletin({
      salaireBase: 1000000,
      pniPrimes: [{ code: 'TRANSPORT', montant: 50000 }],
    });
    // 15% of 1M = 150k, 50k < 150k
    expect(result.pni_excedent).toBe(0);
    expect(result.pni_total_admis).toBe(50000);
  });

  test('cout employeur > net a payer', () => {
    const result = calculerBulletin({ salaireBase: 500000 });
    expect(result.cout_total_employeur).toBeGreaterThan(result.net_a_payer);
  });

  test('net a payer est un entier (arrondi)', () => {
    const result = calculerBulletin({ salaireBase: 333333 });
    expect(Number.isInteger(result.net_a_payer)).toBe(true);
  });

  test('prime anciennete ajoutee avec convention COMMERCE', () => {
    const result = calculerBulletin({
      salaireBase: 300000,
      conventionCode: 'COMMERCE',
      anneesAnciennete: 5,
    });
    expect(result.prime_anciennete).toBeGreaterThan(0);
  });

  test('prime anciennete nulle si < debut', () => {
    const result = calculerBulletin({
      salaireBase: 300000,
      conventionCode: 'COMMERCE',
      anneesAnciennete: 1,
    });
    expect(result.prime_anciennete).toBe(0);
  });

  test('brut = salaire_presence + avantages nature', () => {
    const result = calculerBulletin({
      salaireBase: 500000,
      avantagesNature: { logement: 100000 },
    });
    expect(result.brut).toBe(result.salaire_presence + result.total_avantages_nature);
  });

  test('total_gains = brut + indemnites exonerees', () => {
    const result = calculerBulletin({
      salaireBase: 500000,
      indemnites: [{ libelle: 'Transport', montant: 30000 }],
    });
    expect(result.total_gains).toBe(result.brut + result.total_indemnites_exonerees);
  });

  test('non-resident a un ITS forfaitaire de 20%', () => {
    const resident = calculerBulletin({ salaireBase: 1000000, profil: 'national' });
    const nonResident = calculerBulletin({ salaireBase: 1000000, profil: 'non_resident' });
    // Non-resident ITS = 20% forfaitaire, should differ from progressive
    expect(nonResident.its).not.toBe(resident.its);
  });

  test('primes imposables augmentent le brut', () => {
    const sansPrime = calculerBulletin({ salaireBase: 500000 });
    const avecPrime = calculerBulletin({ salaireBase: 500000, primesImposables: 100000 });
    expect(avecPrime.brut).toBe(sansPrime.brut + 100000);
  });

  test('heures sup augmentent le salaire de presence', () => {
    const sansHS = calculerBulletin({ salaireBase: 500000 });
    const avecHS = calculerBulletin({ salaireBase: 500000, heuresSup: 50000 });
    expect(avecHS.salaire_presence).toBe(sansHS.salaire_presence + 50000);
  });
});
