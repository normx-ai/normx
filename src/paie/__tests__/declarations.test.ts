import {
  genererBordereauCNSS,
  genererDAS,
  genererDeclarationNominative,
  verifierDeclaration,
} from '../data/declarations';
import type { BulletinResume, DeclarationCNSS, DeclarationDAS } from '../data/declarations';

function makeBulletin(overrides: Partial<BulletinResume> = {}): BulletinResume {
  return {
    id: 's1',
    nom: 'Ngouabi',
    prenom: 'Andre',
    mois: 3,
    annee: 2026,
    salaire_base: 400000,
    brut: 500000,
    cnss_salariale: 20000,
    cnss_patronale_vieillesse: 40000,
    cnss_patronale_af: 50150,
    cnss_patronale_at: 11250,
    its: 15000,
    tus_impot: 7500,
    tus_cnss: 30000,
    camu_salariale: 0,
    taxe_locaux: 5000,
    net_a_payer: 425000,
    ...overrides,
  };
}

describe('declarations', () => {
  describe('genererBordereauCNSS', () => {
    test('genere un bordereau avec les bons champs', () => {
      const bulletins = [makeBulletin()];
      const result = genererBordereauCNSS(bulletins, 'ACME SARL', 'CNSS-001', 3, 2026);

      expect(result.mois).toBe(3);
      expect(result.annee).toBe(2026);
      expect(result.employeur).toBe('ACME SARL');
      expect(result.numero_cnss).toBe('CNSS-001');
      expect(result.lignes).toHaveLength(1);
    });

    test('plafond1 (PVID) ne depasse pas 1 200 000', () => {
      const bulletins = [makeBulletin({ brut: 2000000 })];
      const result = genererBordereauCNSS(bulletins, 'ACME', 'CNSS-001', 3, 2026);
      expect(result.lignes[0].plafond1).toBe(1200000);
    });

    test('plafond2 (AF/AT) ne depasse pas 600 000', () => {
      const bulletins = [makeBulletin({ brut: 2000000 })];
      const result = genererBordereauCNSS(bulletins, 'ACME', 'CNSS-001', 3, 2026);
      expect(result.lignes[0].plafond2).toBe(600000);
    });

    test('plafonds egaux au brut si brut < plafond', () => {
      const bulletins = [makeBulletin({ brut: 400000 })];
      const result = genererBordereauCNSS(bulletins, 'ACME', 'CNSS-001', 3, 2026);
      expect(result.lignes[0].plafond1).toBe(400000);
      expect(result.lignes[0].plafond2).toBe(400000);
    });

    test('totaux correspondent a la somme des lignes', () => {
      const bulletins = [
        makeBulletin({ id: 's1', brut: 500000, cnss_salariale: 20000 }),
        makeBulletin({ id: 's2', brut: 800000, cnss_salariale: 32000, nom: 'Sassou' }),
      ];
      const result = genererBordereauCNSS(bulletins, 'ACME', 'CNSS-001', 3, 2026);

      expect(result.totaux.brut_total).toBe(1300000);
      expect(result.totaux.cnss_salariale_total).toBe(52000);
      expect(result.totaux.total_a_verser).toBe(
        result.totaux.cnss_salariale_total + result.totaux.cnss_patronale_total
      );
    });

    test('bordereau vide si aucun bulletin', () => {
      const result = genererBordereauCNSS([], 'ACME', 'CNSS-001', 3, 2026);
      expect(result.lignes).toHaveLength(0);
      expect(result.totaux.brut_total).toBe(0);
    });
  });

  describe('genererDAS', () => {
    test('genere une DAS annuelle', () => {
      const mois1 = [makeBulletin({ mois: 1 })];
      const mois2 = [makeBulletin({ mois: 2 })];
      const result = genererDAS([mois1, mois2], 'ACME SARL', 'NUI-001', 2026);

      expect(result.annee).toBe(2026);
      expect(result.employeur).toBe('ACME SARL');
      expect(result.nui).toBe('NUI-001');
      expect(result.lignes).toHaveLength(1); // same salarie across months
    });

    test('cumule les montants sur 12 mois', () => {
      const months = Array.from({ length: 12 }, (_, i) => [
        makeBulletin({ mois: i + 1, brut: 500000, its: 15000, cnss_salariale: 20000, net_a_payer: 425000 }),
      ]);
      const result = genererDAS(months, 'ACME', 'NUI-001', 2026);

      expect(result.lignes[0].brut_annuel).toBe(6000000);
      expect(result.lignes[0].its_annuel).toBe(180000);
      expect(result.lignes[0].cnss_salariale_annuel).toBe(240000);
      expect(result.totaux.brut_total).toBe(6000000);
    });

    test('separe les salaries differents', () => {
      const months = [[
        makeBulletin({ id: 's1', nom: 'Ngouabi' }),
        makeBulletin({ id: 's2', nom: 'Sassou' }),
      ]];
      const result = genererDAS(months, 'ACME', 'NUI-001', 2026);
      expect(result.lignes).toHaveLength(2);
    });

    test('DAS vide si aucun bulletin', () => {
      const result = genererDAS([], 'ACME', 'NUI-001', 2026);
      expect(result.lignes).toHaveLength(0);
      expect(result.totaux.brut_total).toBe(0);
    });
  });

  describe('genererDeclarationNominative', () => {
    test('genere une declaration nominative complete', () => {
      const bulletin = makeBulletin();
      const result = genererDeclarationNominative(bulletin, 'SS-123');

      expect(result.salarie_nom).toBe('Ngouabi');
      expect(result.salarie_prenom).toBe('Andre');
      expect(result.numero_ss).toBe('SS-123');
      expect(result.mois).toBe(3);
      expect(result.annee).toBe(2026);
      expect(result.brut).toBe(500000);
      expect(result.cnss_salariale).toBe(20000);
      expect(result.its).toBe(15000);
      expect(result.net_a_payer).toBe(425000);
    });
  });

  describe('verifierDeclaration', () => {
    test('declaration CNSS valide', () => {
      const bulletins = [makeBulletin()];
      const declaration = genererBordereauCNSS(bulletins, 'ACME', 'CNSS-001', 3, 2026);
      const result = verifierDeclaration(declaration);
      expect(result.valide).toBe(true);
      expect(result.erreurs).toHaveLength(0);
    });

    test('CNSS invalide si employeur manquant', () => {
      const bulletins = [makeBulletin()];
      const declaration = genererBordereauCNSS(bulletins, '', 'CNSS-001', 3, 2026);
      const result = verifierDeclaration(declaration);
      expect(result.valide).toBe(false);
      expect(result.erreurs.some(e => e.includes('Employeur'))).toBe(true);
    });

    test('CNSS invalide si numero_cnss manquant', () => {
      const bulletins = [makeBulletin()];
      const declaration = genererBordereauCNSS(bulletins, 'ACME', '', 3, 2026);
      const result = verifierDeclaration(declaration);
      expect(result.valide).toBe(false);
      expect(result.erreurs.some(e => e.includes('CNSS'))).toBe(true);
    });

    test('CNSS invalide si aucune ligne', () => {
      const declaration = genererBordereauCNSS([], 'ACME', 'CNSS-001', 3, 2026);
      const result = verifierDeclaration(declaration);
      expect(result.valide).toBe(false);
    });

    test('CNSS invalide si brut negatif', () => {
      const declaration: DeclarationCNSS = {
        mois: 3, annee: 2026, employeur: 'ACME', numero_cnss: 'CNSS-001',
        lignes: [{
          nom: 'Test', prenom: 'User', numero_ss: 'SS-1',
          brut: -100, plafond1: 0, plafond2: 0,
          cnss_salariale: 0, cnss_patronale_pvid: 0, cnss_patronale_af: 0, cnss_patronale_at: 0,
        }],
        totaux: { brut_total: -100, cnss_salariale_total: 0, cnss_patronale_total: 0, total_a_verser: 0 },
      };
      const result = verifierDeclaration(declaration);
      expect(result.valide).toBe(false);
      expect(result.erreurs.some(e => e.includes('gatif'))).toBe(true);
    });

    test('DAS valide', () => {
      const months = [[makeBulletin()]];
      const declaration = genererDAS(months, 'ACME', 'NUI-001', 2026);
      const result = verifierDeclaration(declaration);
      expect(result.valide).toBe(true);
    });

    test('DAS invalide si NUI manquant', () => {
      const months = [[makeBulletin()]];
      const declaration = genererDAS(months, 'ACME', '', 2026);
      const result = verifierDeclaration(declaration);
      expect(result.valide).toBe(false);
      expect(result.erreurs.some(e => e.includes('NUI'))).toBe(true);
    });

    test('DAS invalide si brut annuel negatif', () => {
      const declaration: DeclarationDAS = {
        annee: 2026, employeur: 'ACME', nui: 'NUI-001',
        lignes: [{ nom: 'Test', prenom: 'User', brut_annuel: -500, its_annuel: 0, cnss_salariale_annuel: 0, net_annuel: 0 }],
        totaux: { brut_total: -500, its_total: 0, cnss_total: 0, net_total: 0 },
      };
      const result = verifierDeclaration(declaration);
      expect(result.valide).toBe(false);
    });
  });
});
