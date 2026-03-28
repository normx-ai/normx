import { calculerPNI } from '../data/pni';
import type { PNIInput } from '../data/pni';

describe('calculerPNI', () => {
  test('under 15% cap - all admitted', () => {
    const primes: PNIInput[] = [{ code: 'TRANSPORT', montant: 50000 }];
    const result = calculerPNI(1000000, primes);
    expect(result.totalDeclare).toBe(50000);
    expect(result.plafond).toBe(150000); // 15% of 1M
    expect(result.totalAdmis).toBe(50000);
    expect(result.excedent).toBe(0);
  });

  test('over 15% cap - excess calculated', () => {
    const primes: PNIInput[] = [{ code: 'TRANSPORT', montant: 200000 }];
    const result = calculerPNI(1000000, primes);
    expect(result.plafond).toBe(150000);
    expect(result.totalAdmis).toBe(150000);
    expect(result.excedent).toBe(50000);
  });

  test('exactly at 15% cap - zero excess', () => {
    const primes: PNIInput[] = [{ code: 'TRANSPORT', montant: 150000 }];
    const result = calculerPNI(1000000, primes);
    expect(result.totalAdmis).toBe(150000);
    expect(result.excedent).toBe(0);
  });

  test('empty primes - zero result', () => {
    const result = calculerPNI(500000, []);
    expect(result.totalDeclare).toBe(0);
    expect(result.excedent).toBe(0);
    expect(result.totalAdmis).toBe(0);
  });

  test('multiple primes summed', () => {
    const primes: PNIInput[] = [
      { code: 'TRANSPORT', montant: 80000 },
      { code: 'PANIER', montant: 80000 },
    ];
    const result = calculerPNI(1000000, primes);
    expect(result.totalDeclare).toBe(160000);
    expect(result.excedent).toBe(10000); // 160k - 150k cap
  });

  test('plafond is rounded', () => {
    // 15% of 333333 = 49999.95 -> 50000 rounded
    const result = calculerPNI(333333, [{ code: 'TRANSPORT', montant: 100000 }]);
    expect(result.plafond).toBe(Math.round(333333 * 15 / 100));
  });

  test('zero brut gives zero plafond', () => {
    const result = calculerPNI(0, [{ code: 'TRANSPORT', montant: 50000 }]);
    expect(result.plafond).toBe(0);
    expect(result.excedent).toBe(50000);
  });

  test('primes array is preserved in result', () => {
    const primes: PNIInput[] = [{ code: 'TRANSPORT', montant: 50000 }];
    const result = calculerPNI(1000000, primes);
    expect(result.primes).toBe(primes);
  });
});
