import {
  buildPlanComptableSensMap,
  getSoldeAttendu,
  getLibelleSoldeAttendu,
  isCompteStandard,
  detectAnomalies,
  detectDesequilibres,
  PlanCompteEntry,
} from '../anomaliesComptes';
import type { BalanceLigne } from '../../types';

const SAMPLE_PLAN: PlanCompteEntry[] = [
  { numero: '10', libelle: 'Capital', sens: 'crediteur' },
  { numero: '101', libelle: 'Capital social', sens: 'crediteur' },
  { numero: '411', libelle: 'Clients', sens: 'debiteur' },
  { numero: '601', libelle: 'Achats', sens: 'debiteur' },
  { numero: '701', libelle: 'Ventes', sens: 'crediteur' },
  { numero: '46', libelle: 'Comptes mixtes', sens: 'mixte' },
];

const PLAN = buildPlanComptableSensMap(SAMPLE_PLAN);

function makeLigne(overrides: Partial<BalanceLigne>): BalanceLigne {
  return {
    numero_compte: '411',
    libelle_compte: '',
    si_debit: 0,
    si_credit: 0,
    debit: 0,
    credit: 0,
    solde_debiteur: 0,
    solde_crediteur: 0,
    ...overrides,
  } as BalanceLigne;
}

describe('buildPlanComptableSensMap', () => {
  test('construit la map avec les sens normalises', () => {
    expect(PLAN.size).toBe(6);
    expect(PLAN.get('411')).toBe('debiteur');
    expect(PLAN.get('101')).toBe('crediteur');
    expect(PLAN.get('46')).toBe('les_deux'); // mixte normalise
  });
});

describe('getSoldeAttendu', () => {
  test('match exact', () => {
    expect(getSoldeAttendu('411', PLAN)).toBe('debiteur');
  });

  test('match par prefixe (compte detaille)', () => {
    // 4111 n est pas dans le plan, mais 411 oui -> debiteur
    expect(getSoldeAttendu('4111', PLAN)).toBe('debiteur');
  });

  test('plan vide => les_deux (pas de faux positif)', () => {
    expect(getSoldeAttendu('411', undefined)).toBe('les_deux');
    expect(getSoldeAttendu('411', new Map())).toBe('les_deux');
  });

  test('compte sans match => les_deux', () => {
    expect(getSoldeAttendu('99999', PLAN)).toBe('les_deux');
  });

  test('mixte normalise en les_deux', () => {
    expect(getSoldeAttendu('46', PLAN)).toBe('les_deux');
  });
});

describe('getLibelleSoldeAttendu', () => {
  test('libelles des trois sens', () => {
    expect(getLibelleSoldeAttendu('debiteur')).toBe('Solde débiteur attendu');
    expect(getLibelleSoldeAttendu('crediteur')).toBe('Solde créditeur attendu');
    expect(getLibelleSoldeAttendu('les_deux')).toBe('Solde variable');
  });
});

describe('isCompteStandard', () => {
  test('compte avec prefixe 3 chiffres dans plan', () => {
    expect(isCompteStandard('41100', PLAN)).toBe(true);
  });

  test('compte court accepte par defaut', () => {
    expect(isCompteStandard('10', PLAN)).toBe(true);
  });

  test('compte hors plan rejete', () => {
    expect(isCompteStandard('999999', PLAN)).toBe(false);
  });
});

describe('detectAnomalies', () => {
  test('compte 411 (debiteur attendu) avec solde crediteur => anomalie solde_inverse error', () => {
    const ligne = makeLigne({ numero_compte: '411', solde_crediteur: 1000 });
    const anomalies = detectAnomalies(ligne, PLAN);
    expect(anomalies.some((a) => a.type === 'solde_inverse' && a.severity === 'error')).toBe(true);
  });

  test('compte 701 (crediteur attendu) avec solde debiteur => anomalie solde_inverse', () => {
    const ligne = makeLigne({ numero_compte: '701', solde_debiteur: 500 });
    const anomalies = detectAnomalies(ligne, PLAN);
    expect(anomalies.some((a) => a.type === 'solde_inverse')).toBe(true);
  });

  test('compte de gestion (6) avec solde initial => warning solde_residuel', () => {
    const ligne = makeLigne({ numero_compte: '601', si_debit: 100, debit: 100 });
    const anomalies = detectAnomalies(ligne, PLAN);
    expect(anomalies.some((a) => a.type === 'solde_residuel')).toBe(true);
  });

  test('compte hors plan SYSCOHADA => warning compte_hors_plan', () => {
    const ligne = makeLigne({ numero_compte: '999999' });
    const anomalies = detectAnomalies(ligne, PLAN);
    expect(anomalies.some((a) => a.type === 'compte_hors_plan')).toBe(true);
  });

  test('compte coherent : aucune anomalie', () => {
    const ligne = makeLigne({ numero_compte: '411', solde_debiteur: 1000 });
    const anomalies = detectAnomalies(ligne, PLAN);
    expect(anomalies.filter((a) => a.severity === 'error')).toHaveLength(0);
  });
});

describe('detectDesequilibres', () => {
  test('balance equilibree : aucune anomalie', () => {
    const lignes = [
      makeLigne({ debit: 100, credit: 0, si_debit: 50, si_credit: 0, solde_debiteur: 150 }),
      makeLigne({ debit: 0, credit: 100, si_debit: 0, si_credit: 50, solde_crediteur: 150 }),
    ];
    expect(detectDesequilibres(lignes)).toEqual([]);
  });

  test('mouvements desequilibres', () => {
    const lignes = [
      makeLigne({ debit: 100, credit: 0 }),
      makeLigne({ debit: 0, credit: 80 }),
    ];
    const a = detectDesequilibres(lignes);
    expect(a.find((x) => x.section === 'MVT')).toBeDefined();
    expect(a.find((x) => x.section === 'MVT')?.ecart).toBeCloseTo(20, 2);
  });

  test('soldes initiaux desequilibres', () => {
    const lignes = [
      makeLigne({ si_debit: 100, si_credit: 0 }),
      makeLigne({ si_debit: 0, si_credit: 50 }),
    ];
    const a = detectDesequilibres(lignes);
    expect(a.find((x) => x.section === 'SI')).toBeDefined();
  });

  test('soldes finaux desequilibres', () => {
    const lignes = [
      makeLigne({ solde_debiteur: 100 }),
      makeLigne({ solde_crediteur: 50 }),
    ];
    const a = detectDesequilibres(lignes);
    expect(a.find((x) => x.section === 'SF')).toBeDefined();
  });

  test('tolerance 0.01 : ecart sub-centime ignore', () => {
    const lignes = [
      makeLigne({ debit: 100.005, credit: 0 }),
      makeLigne({ debit: 0, credit: 100 }),
    ];
    const a = detectDesequilibres(lignes);
    expect(a.find((x) => x.section === 'MVT')).toBeUndefined();
  });
});
