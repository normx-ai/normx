import {
  peutValider,
  peutVerrouiller,
  peutDeverrouiller,
  validerBulletin,
  verrouillerBulletin,
  peutCloturerPeriode,
  cloturerPeriode,
  calculerCumulsAnnuels,
} from '../data/workflow';
import type { BulletinWorkflow, PeriodeCloture } from '../data/workflow';
import type { BulletinResume } from '../data/declarations';

describe('workflow', () => {
  const baseBulletin: BulletinWorkflow = {
    id: '1',
    salarie_id: 's1',
    mois: 3,
    annee: 2026,
    statut: 'brouillon',
    date_creation: '2026-03-01',
    date_validation: null,
    date_verrouillage: null,
    valide_par: null,
  };

  describe('peutValider', () => {
    test('brouillon peut etre valide', () => {
      expect(peutValider(baseBulletin)).toBe(true);
    });

    test('valide ne peut pas etre re-valide', () => {
      expect(peutValider({ ...baseBulletin, statut: 'valide' })).toBe(false);
    });

    test('verrouille ne peut pas etre valide', () => {
      expect(peutValider({ ...baseBulletin, statut: 'verrouille' })).toBe(false);
    });
  });

  describe('peutVerrouiller', () => {
    test('valide peut etre verrouille', () => {
      expect(peutVerrouiller({ ...baseBulletin, statut: 'valide' })).toBe(true);
    });

    test('brouillon ne peut pas etre verrouille', () => {
      expect(peutVerrouiller(baseBulletin)).toBe(false);
    });

    test('verrouille ne peut pas etre re-verrouille', () => {
      expect(peutVerrouiller({ ...baseBulletin, statut: 'verrouille' })).toBe(false);
    });
  });

  describe('peutDeverrouiller', () => {
    test('verrouille peut etre deverrouille', () => {
      expect(peutDeverrouiller({ ...baseBulletin, statut: 'verrouille' })).toBe(true);
    });

    test('brouillon ne peut pas etre deverrouille', () => {
      expect(peutDeverrouiller(baseBulletin)).toBe(false);
    });

    test('valide ne peut pas etre deverrouille', () => {
      expect(peutDeverrouiller({ ...baseBulletin, statut: 'valide' })).toBe(false);
    });
  });

  describe('validerBulletin', () => {
    test('sets statut to valide', () => {
      const result = validerBulletin(baseBulletin, 'admin-user');
      expect(result.statut).toBe('valide');
    });

    test('sets valide_par', () => {
      const result = validerBulletin(baseBulletin, 'admin-user');
      expect(result.valide_par).toBe('admin-user');
    });

    test('sets date_validation to ISO string', () => {
      const result = validerBulletin(baseBulletin, 'admin-user');
      expect(result.date_validation).not.toBeNull();
      expect(() => new Date(result.date_validation!)).not.toThrow();
    });

    test('preserves other fields', () => {
      const result = validerBulletin(baseBulletin, 'admin-user');
      expect(result.id).toBe('1');
      expect(result.salarie_id).toBe('s1');
      expect(result.mois).toBe(3);
      expect(result.annee).toBe(2026);
    });

    test('does not mutate original', () => {
      validerBulletin(baseBulletin, 'admin');
      expect(baseBulletin.statut).toBe('brouillon');
    });

    test('throws if bulletin not brouillon', () => {
      const valide = { ...baseBulletin, statut: 'valide' as const };
      expect(() => validerBulletin(valide, 'admin')).toThrow();
    });
  });

  describe('verrouillerBulletin', () => {
    test('sets statut to verrouille', () => {
      const valide: BulletinWorkflow = { ...baseBulletin, statut: 'valide' };
      const result = verrouillerBulletin(valide);
      expect(result.statut).toBe('verrouille');
    });

    test('sets date_verrouillage', () => {
      const valide: BulletinWorkflow = { ...baseBulletin, statut: 'valide' };
      const result = verrouillerBulletin(valide);
      expect(result.date_verrouillage).not.toBeNull();
    });

    test('throws if bulletin is brouillon', () => {
      expect(() => verrouillerBulletin(baseBulletin)).toThrow();
    });

    test('throws if bulletin is already verrouille', () => {
      const verrouille: BulletinWorkflow = { ...baseBulletin, statut: 'verrouille' };
      expect(() => verrouillerBulletin(verrouille)).toThrow();
    });
  });

  describe('peutCloturerPeriode', () => {
    test('peut cloturer si tous verrouilles', () => {
      const periode: PeriodeCloture = {
        mois: 3, annee: 2026, cloturee: false, date_cloture: null,
        nb_bulletins: 5, nb_valides: 0, nb_verrouilles: 5,
      };
      expect(peutCloturerPeriode(periode)).toBe(true);
    });

    test('ne peut pas cloturer si certains non verrouilles', () => {
      const periode: PeriodeCloture = {
        mois: 3, annee: 2026, cloturee: false, date_cloture: null,
        nb_bulletins: 5, nb_valides: 2, nb_verrouilles: 3,
      };
      expect(peutCloturerPeriode(periode)).toBe(false);
    });

    test('ne peut pas cloturer si deja cloturee', () => {
      const periode: PeriodeCloture = {
        mois: 3, annee: 2026, cloturee: true, date_cloture: '2026-04-01',
        nb_bulletins: 5, nb_valides: 0, nb_verrouilles: 5,
      };
      expect(peutCloturerPeriode(periode)).toBe(false);
    });

    test('ne peut pas cloturer si aucun bulletin', () => {
      const periode: PeriodeCloture = {
        mois: 3, annee: 2026, cloturee: false, date_cloture: null,
        nb_bulletins: 0, nb_valides: 0, nb_verrouilles: 0,
      };
      expect(peutCloturerPeriode(periode)).toBe(false);
    });
  });

  describe('cloturerPeriode', () => {
    test('sets cloturee to true', () => {
      const periode: PeriodeCloture = {
        mois: 3, annee: 2026, cloturee: false, date_cloture: null,
        nb_bulletins: 5, nb_valides: 0, nb_verrouilles: 5,
      };
      const result = cloturerPeriode(periode);
      expect(result.cloturee).toBe(true);
      expect(result.date_cloture).not.toBeNull();
    });

    test('throws if not all verrouilles', () => {
      const periode: PeriodeCloture = {
        mois: 3, annee: 2026, cloturee: false, date_cloture: null,
        nb_bulletins: 5, nb_valides: 2, nb_verrouilles: 3,
      };
      expect(() => cloturerPeriode(periode)).toThrow();
    });

    test('does not mutate original', () => {
      const periode: PeriodeCloture = {
        mois: 3, annee: 2026, cloturee: false, date_cloture: null,
        nb_bulletins: 5, nb_valides: 0, nb_verrouilles: 5,
      };
      cloturerPeriode(periode);
      expect(periode.cloturee).toBe(false);
    });
  });

  describe('calculerCumulsAnnuels', () => {
    const makeBulletin = (id: string, mois: number, brut: number): BulletinResume => ({
      id,
      nom: 'Ngouabi',
      prenom: 'Andre',
      mois,
      annee: 2026,
      salaire_base: brut * 0.8,
      brut,
      cnss_salariale: brut * 0.04,
      cnss_patronale_vieillesse: brut * 0.08,
      cnss_patronale_af: brut * 0.1,
      cnss_patronale_at: brut * 0.0225,
      its: brut * 0.05,
      tus_impot: brut * 0.015,
      tus_cnss: brut * 0.06,
      camu_salariale: 0,
      taxe_locaux: 5000,
      net_a_payer: brut * 0.85,
    });

    test('cumule correctement un seul salarie sur 3 mois', () => {
      const bulletins = [
        makeBulletin('s1', 1, 500000),
        makeBulletin('s1', 2, 500000),
        makeBulletin('s1', 3, 500000),
      ];
      const cumuls = calculerCumulsAnnuels(bulletins);
      expect(cumuls).toHaveLength(1);
      expect(cumuls[0].brut_cumule).toBe(1500000);
      expect(cumuls[0].mois_travailles).toBe(3);
    });

    test('separe deux salaries differents', () => {
      const bulletins = [
        makeBulletin('s1', 1, 500000),
        makeBulletin('s2', 1, 300000),
      ];
      const cumuls = calculerCumulsAnnuels(bulletins);
      expect(cumuls).toHaveLength(2);
    });

    test('retourne tableau vide si aucun bulletin', () => {
      expect(calculerCumulsAnnuels([])).toHaveLength(0);
    });
  });
});
