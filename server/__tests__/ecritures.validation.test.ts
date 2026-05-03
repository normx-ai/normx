import {
  validateEcritureLines,
  assertEcritureLinesValid,
  isCompteValide,
} from '../services/ecritures/validation';
import { ValidationError } from '../errors';

describe('isCompteValide', () => {
  test('compte exactement dans le plan SYCEBNL', () => {
    // Le plan contient explicitement 10, 101, 1011 (Dotation)
    expect(isCompteValide('1011')).toBe(true);
  });

  test('compte trop precis : trim trailing zeros et recherche prefixes', () => {
    // '101100' tronque -> '1011' qui est dans le plan
    expect(isCompteValide('101100')).toBe(true);
  });

  test('compte non standard mais matche prefixe : valide', () => {
    // '109999' tronque -> '109' / '10' (ce dernier dans le plan)
    expect(isCompteValide('109999')).toBe(true);
  });

  test('compte trop court (1 char) refuse meme si match potentiel', () => {
    expect(isCompteValide('9')).toBe(false);
  });
});

describe('validateEcritureLines', () => {
  test('ecriture equilibree avec comptes valides : OK', () => {
    const r = validateEcritureLines([
      { numero_compte: '411', debit: 1000, credit: 0 },
      { numero_compte: '701', debit: 0, credit: 1000 },
    ]);
    expect(r.valid).toBe(true);
  });

  test('debit/credit en string : parse correctement', () => {
    const r = validateEcritureLines([
      { numero_compte: '411', debit: '1500.50', credit: 0 },
      { numero_compte: '701', debit: 0, credit: '1500.50' },
    ]);
    expect(r.valid).toBe(true);
  });

  test('ecriture desequilibree : retourne erreur', () => {
    const r = validateEcritureLines([
      { numero_compte: '411', debit: 1000, credit: 0 },
      { numero_compte: '701', debit: 0, credit: 999 },
    ]);
    expect(r.valid).toBe(false);
    expect(r.error).toMatch(/desequilibree/);
  });

  test('tolerance 0.01 sur l equilibre', () => {
    const r = validateEcritureLines([
      { numero_compte: '411', debit: 1000.005, credit: 0 },
      { numero_compte: '701', debit: 0, credit: 1000 },
    ]);
    expect(r.valid).toBe(true); // 0.005 < tolerance 0.01
  });

  test('compte invalide : signale les comptes fautifs', () => {
    // Le plan SYCEBNL ne contient PAS le prefixe '30' (le 3 est inexistant)
    const r = validateEcritureLines([
      { numero_compte: '30100', debit: 100, credit: 0 },
      { numero_compte: '701', debit: 0, credit: 100 },
    ]);
    expect(r.valid).toBe(false);
    expect(r.error).toMatch(/Comptes invalides.*30100/);
  });

  test('lignes a 0 (ni debit ni credit) ignorees pour validation comptes', () => {
    const r = validateEcritureLines([
      { numero_compte: '411', debit: 100, credit: 0 },
      { numero_compte: '701', debit: 0, credit: 100 },
      { numero_compte: '99999', debit: 0, credit: 0 }, // mauvais compte mais montant nul = ok
    ]);
    expect(r.valid).toBe(true);
  });

  test('liste vide : equilibre 0=0 OK, pas de comptes a verifier', () => {
    const r = validateEcritureLines([]);
    expect(r.valid).toBe(true);
  });
});

describe('assertEcritureLinesValid', () => {
  test('OK : pas d exception', () => {
    expect(() =>
      assertEcritureLinesValid([
        { numero_compte: '411', debit: 100, credit: 0 },
        { numero_compte: '701', debit: 0, credit: 100 },
      ]),
    ).not.toThrow();
  });

  test('KO : ValidationError avec message metier', () => {
    expect(() =>
      assertEcritureLinesValid([
        { numero_compte: '411', debit: 100, credit: 0 },
        { numero_compte: '701', debit: 0, credit: 50 },
      ]),
    ).toThrow(ValidationError);
  });
});
