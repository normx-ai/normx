import {
  fmt,
  fmtDate,
  parseInputNumber,
  fmtM,
  fmtMontant,
  fmtMontantParens,
  MOIS,
  fmtRelativeTime,
  fmtDayRelative,
} from '../formatters';

describe('fmt', () => {
  test('formate un entier', () => {
    expect(fmt(1234)).toBe('1 234');
  });

  test('arrondit a l entier', () => {
    expect(fmt(1234.7)).toBe('1 235');
  });

  test('chaine vide pour valeur < 0.5', () => {
    expect(fmt(0.4)).toBe('');
    expect(fmt(0)).toBe('');
  });

  test('chaine vide pour NaN', () => {
    expect(fmt('abc')).toBe('');
  });

  test('parse string numerique', () => {
    expect(fmt('1234')).toBe('1 234');
  });
});

describe('parseInputNumber', () => {
  test('format francais avec espaces et virgule', () => {
    expect(parseInputNumber('1 234,56')).toBe(1234.56);
  });

  test('format avec points (separateurs milliers)', () => {
    expect(parseInputNumber('1.234.567')).toBe(1234567);
  });

  test('chaine vide retourne 0', () => {
    expect(parseInputNumber('')).toBe(0);
  });

  test('non numerique retourne 0', () => {
    expect(parseInputNumber('abc')).toBe(0);
  });

  test('virgule decimale preservee', () => {
    expect(parseInputNumber('123,45')).toBe(123.45);
  });
});

describe('fmtDate', () => {
  test('date string ISO', () => {
    expect(fmtDate('2026-05-03')).toBe('03/05/2026');
  });

  test('null/undefined => chaine vide', () => {
    expect(fmtDate(null)).toBe('');
    expect(fmtDate(undefined)).toBe('');
  });

  test('date invalide => chaine vide', () => {
    expect(fmtDate('not-a-date')).toBe('');
  });

  test('Date object', () => {
    const d = new Date('2026-01-15');
    expect(fmtDate(d)).toBe('15/01/2026');
  });
});

describe('fmtM', () => {
  test('arrondit et formate', () => {
    expect(fmtM(1234.7)).toBe('1 235');
  });

  test('zero ou vide => chaine vide', () => {
    expect(fmtM(0)).toBe('');
  });
});

describe('fmtMontant', () => {
  test('zero => "0"', () => {
    expect(fmtMontant(0)).toBe('0');
    expect(fmtMontant(null)).toBe('0');
  });

  test('valeur normale arrondie', () => {
    expect(fmtMontant(1234)).toBe('1 234');
  });

  test('abbreviate Md', () => {
    expect(fmtMontant(1_500_000_000, { abbreviate: true })).toBe('1,5 Md');
  });

  test('abbreviate M', () => {
    expect(fmtMontant(2_500_000, { abbreviate: true })).toBe('2,5 M');
  });

  test('abbreviate k', () => {
    expect(fmtMontant(1500, { abbreviate: true })).toBe('2 k');
  });
});

describe('fmtMontantParens', () => {
  test('positif', () => {
    expect(fmtMontantParens(1234)).toBe('1 234');
  });

  test('negatif entre parentheses', () => {
    expect(fmtMontantParens(-1234)).toBe('(1 234)');
  });

  test('zero', () => {
    expect(fmtMontantParens(0)).toBe('0');
  });
});

describe('MOIS', () => {
  test('12 mois en francais', () => {
    expect(MOIS).toHaveLength(12);
    expect(MOIS[0]).toBe('Janvier');
    expect(MOIS[11]).toBe('Decembre');
  });
});

describe('fmtRelativeTime', () => {
  test('a l instant pour < 1 min', () => {
    const now = new Date();
    expect(fmtRelativeTime(now)).toBe("A l'instant");
  });

  test('il y a X min', () => {
    const past = new Date(Date.now() - 5 * 60_000);
    expect(fmtRelativeTime(past)).toBe('Il y a 5 min');
  });

  test('il y a Xh', () => {
    const past = new Date(Date.now() - 3 * 3600_000);
    expect(fmtRelativeTime(past)).toBe('Il y a 3h');
  });

  test('il y a Xj', () => {
    const past = new Date(Date.now() - 2 * 86400_000);
    expect(fmtRelativeTime(past)).toBe('Il y a 2j');
  });
});

describe('fmtDayRelative', () => {
  test('aujourd hui', () => {
    expect(fmtDayRelative(new Date())).toMatch(/[Aa]ujourd/);
  });
});
