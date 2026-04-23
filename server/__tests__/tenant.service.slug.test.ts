import { generateClientSlug, generateSelfClientSlug } from '../services/tenant.service';
import { slugToSchemaName } from '../utils/tenant.utils';

describe('tenant.service slug helpers', () => {
  describe('generateClientSlug', () => {
    test('commence par la lettre c', () => {
      expect(generateClientSlug(42)).toMatch(/^c_/);
    });

    test('contient l id du cabinet', () => {
      expect(generateClientSlug(42)).toMatch(/^c_42_/);
    });

    test('a la forme c_<id>_<timestamp>_<4hex>', () => {
      expect(generateClientSlug(42)).toMatch(/^c_42_\d{13}_[0-9a-z]{4}$/);
    });

    test('produit un slug valide pour PostgreSQL (<= 63 chars avec prefixe tenant_)', () => {
      const schema = slugToSchemaName(generateClientSlug(999999999));
      expect(schema.length).toBeLessThanOrEqual(63);
      expect(schema).toMatch(/^tenant_c_/);
    });

    test('produit des slugs differents a l appel rapproche (suffixe aleatoire)', () => {
      const slugs = new Set<string>();
      for (let i = 0; i < 50; i++) {
        slugs.add(generateClientSlug(1));
      }
      // 50 appels, au pire quelques collisions Date.now() mais le random doit differencier
      expect(slugs.size).toBeGreaterThan(40);
    });
  });

  describe('generateSelfClientSlug', () => {
    test('stable pour un cabinet donne', () => {
      expect(generateSelfClientSlug(42)).toBe('c_42_self');
      expect(generateSelfClientSlug(42)).toBe('c_42_self');
    });

    test('produit un slug valide pour PostgreSQL', () => {
      const schema = slugToSchemaName(generateSelfClientSlug(999999999));
      expect(schema.length).toBeLessThanOrEqual(63);
      expect(schema).toBe('tenant_c_999999999_self');
    });
  });
});
