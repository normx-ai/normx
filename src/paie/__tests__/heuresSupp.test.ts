import { calculerHeuresSupplementaires } from '../data/heuresSupplementaires';
import type { HeuresSupInput } from '../data/heuresSupplementaires';

describe('calculerHeuresSupplementaires', () => {
  const baseInput: HeuresSupInput = {
    salaireHoraire: 2000,
    heuresNormales: 40,
    heuresTravaillees: 40,
    conventionCode: '',
    heuresNuit: 0,
    heuresDimancheFerie: 0,
  };

  test('aucune heure sup si heuresTravaillees = heuresNormales', () => {
    const result = calculerHeuresSupplementaires(baseInput);
    expect(result.totalHeuresSup).toBe(0);
    expect(result.montantTotal).toBe(0);
    expect(result.detail).toHaveLength(0);
  });

  test('convention generale - heures 41-48 a +25%', () => {
    const input: HeuresSupInput = {
      ...baseInput,
      heuresTravaillees: 48,
    };
    const result = calculerHeuresSupplementaires(input);
    // Tranche 41-48: de=41-40=1, a=48-40=8, largeur=7, then 1h remains -> 50% tranche
    const tranche25 = result.detail.find(d => d.taux === 25);
    expect(tranche25).toBeDefined();
    expect(tranche25!.heures).toBe(7);
    expect(tranche25!.montant).toBe(Math.round(2000 * 7 * 25 / 100));
  });

  test('convention generale - heures au-dela 48 a +50%', () => {
    const input: HeuresSupInput = {
      ...baseInput,
      heuresTravaillees: 55,
    };
    const result = calculerHeuresSupplementaires(input);
    // Tranche 41-48: largeur=7h at 25%, remaining 8h at 50% (49+)
    const tranche25 = result.detail.find(d => d.taux === 25);
    const tranche50 = result.detail.find(d => d.taux === 50);
    expect(tranche25).toBeDefined();
    expect(tranche50).toBeDefined();
    expect(tranche25!.heures).toBe(7);
    expect(tranche50!.heures).toBe(8);
  });

  test('heures dimanche/ferie a +100% (convention generale)', () => {
    const input: HeuresSupInput = {
      ...baseInput,
      heuresDimancheFerie: 8,
    };
    const result = calculerHeuresSupplementaires(input);
    const dimanche = result.detail.find(d => d.taux === 100);
    expect(dimanche).toBeDefined();
    expect(dimanche!.heures).toBe(8);
    expect(dimanche!.montant).toBe(Math.round(2000 * 8 * 100 / 100));
  });

  test('heures nuit avec convention PETROLE a +60%', () => {
    const input: HeuresSupInput = {
      ...baseInput,
      conventionCode: 'PETROLE',
      heuresNuit: 6,
    };
    const result = calculerHeuresSupplementaires(input);
    const nuit = result.detail.find(d => d.heures === 6);
    expect(nuit).toBeDefined();
    expect(nuit!.taux).toBe(60);
    expect(nuit!.montant).toBe(Math.round(2000 * 6 * 60 / 100));
  });

  test('convention PETROLE dimanche/ferie a +110%', () => {
    const input: HeuresSupInput = {
      ...baseInput,
      conventionCode: 'PETROLE',
      heuresDimancheFerie: 4,
    };
    const result = calculerHeuresSupplementaires(input);
    const dimFerie = result.detail.find(d => d.taux === 110);
    expect(dimFerie).toBeDefined();
    expect(dimFerie!.heures).toBe(4);
  });

  test('montant total est la somme des details', () => {
    const input: HeuresSupInput = {
      ...baseInput,
      heuresTravaillees: 55,
      heuresNuit: 4,
      heuresDimancheFerie: 2,
    };
    const result = calculerHeuresSupplementaires(input);
    const somme = result.detail.reduce((s, d) => s + d.montant, 0);
    expect(result.montantTotal).toBe(somme);
  });

  test('totalHeuresSup est la somme des heures des details', () => {
    const input: HeuresSupInput = {
      ...baseInput,
      heuresTravaillees: 50,
      heuresNuit: 3,
    };
    const result = calculerHeuresSupplementaires(input);
    const sommeHeures = result.detail.reduce((s, d) => s + d.heures, 0);
    expect(result.totalHeuresSup).toBe(sommeHeures);
  });

  test('convention COMMERCE - premier palier a +10%', () => {
    const input: HeuresSupInput = {
      ...baseInput,
      conventionCode: 'COMMERCE',
      heuresTravaillees: 45,
    };
    const result = calculerHeuresSupplementaires(input);
    const tranche10 = result.detail.find(d => d.taux === 10);
    expect(tranche10).toBeDefined();
    expect(tranche10!.heures).toBe(5);
  });

  test('convention inconnue utilise convention generale', () => {
    const input: HeuresSupInput = {
      ...baseInput,
      conventionCode: 'INEXISTANTE',
      heuresTravaillees: 48,
    };
    const result = calculerHeuresSupplementaires(input);
    // Should use default convention with 25% for 41-48
    const tranche25 = result.detail.find(d => d.taux === 25);
    expect(tranche25).toBeDefined();
  });

  test('montants sont arrondis', () => {
    const input: HeuresSupInput = {
      salaireHoraire: 1333, // may produce non-integer when multiplied by taux
      heuresNormales: 40,
      heuresTravaillees: 45,
      conventionCode: '',
      heuresNuit: 0,
      heuresDimancheFerie: 0,
    };
    const result = calculerHeuresSupplementaires(input);
    for (const d of result.detail) {
      expect(Number.isInteger(d.montant)).toBe(true);
    }
  });
});
