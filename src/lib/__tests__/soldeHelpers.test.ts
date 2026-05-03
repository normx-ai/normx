import { soldeNet, soldeDebiteur, soldeCrediteur, sumSoldes } from '../soldeHelpers';

describe('soldeNet', () => {
  test('debit > credit => positif', () => {
    expect(soldeNet({ debit: 1000, credit: 300 })).toBe(700);
  });

  test('credit > debit => negatif', () => {
    expect(soldeNet({ debit: 300, credit: 1000 })).toBe(-700);
  });

  test('parse string', () => {
    expect(soldeNet({ debit: '1000.50', credit: '500' })).toBe(500.5);
  });

  test('null/undefined => 0', () => {
    expect(soldeNet({ debit: null, credit: null })).toBe(0);
    expect(soldeNet({ debit: undefined, credit: 100 })).toBe(-100);
  });
});

describe('soldeDebiteur', () => {
  test('debit > credit => debit - credit', () => {
    expect(soldeDebiteur({ debit: 1000, credit: 300 })).toBe(700);
  });

  test('credit > debit => 0', () => {
    expect(soldeDebiteur({ debit: 100, credit: 500 })).toBe(0);
  });
});

describe('soldeCrediteur', () => {
  test('credit > debit => credit - debit', () => {
    expect(soldeCrediteur({ debit: 100, credit: 500 })).toBe(400);
  });

  test('debit > credit => 0', () => {
    expect(soldeCrediteur({ debit: 1000, credit: 300 })).toBe(0);
  });
});

describe('sumSoldes', () => {
  test('totalise debit, credit et net', () => {
    const lignes = [
      { debit: 100, credit: 50 },
      { debit: 200, credit: 80 },
    ];
    expect(sumSoldes(lignes)).toEqual({ debit: 300, credit: 130, net: 170 });
  });

  test('liste vide', () => {
    expect(sumSoldes([])).toEqual({ debit: 0, credit: 0, net: 0 });
  });

  test('mix string/number', () => {
    const lignes = [
      { debit: '100.5', credit: 0 },
      { debit: 50, credit: '25' },
    ];
    expect(sumSoldes(lignes)).toEqual({ debit: 150.5, credit: 25, net: 125.5 });
  });
});
