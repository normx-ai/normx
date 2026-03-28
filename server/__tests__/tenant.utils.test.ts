import { sanitizeSchemaName, getValidatedSchemaName, slugToSchemaName } from '../utils/tenant.utils';

describe('tenant.utils', () => {
  describe('sanitizeSchemaName', () => {
    test('accepts valid slug', () => {
      expect(sanitizeSchemaName('congo_enterprise')).toBe('congo_enterprise');
    });

    test('lowercases input', () => {
      expect(sanitizeSchemaName('Congo_Enterprise')).toBe('congo_enterprise');
    });

    test('replaces invalid chars with underscore', () => {
      expect(sanitizeSchemaName('congo-enterprise')).toBe('congo_enterprise');
    });

    test('replaces spaces with underscore', () => {
      expect(sanitizeSchemaName('congo enterprise')).toBe('congo_enterprise');
    });

    test('replaces dots with underscore', () => {
      expect(sanitizeSchemaName('congo.enterprise')).toBe('congo_enterprise');
    });

    test('handles multiple consecutive invalid chars', () => {
      const result = sanitizeSchemaName('congo--enterprise');
      expect(result).toBe('congo__enterprise');
    });

    test('accepts single letter', () => {
      expect(sanitizeSchemaName('a')).toBe('a');
    });

    test('accepts max length (63 chars)', () => {
      const slug = 'a' + '_b'.repeat(31);
      expect(sanitizeSchemaName(slug)).toBe(slug);
    });

    test('rejects empty string', () => {
      expect(() => sanitizeSchemaName('')).toThrow();
    });

    test('rejects string starting with number after normalization', () => {
      expect(() => sanitizeSchemaName('123abc')).toThrow();
    });

    test('rejects string over 63 chars', () => {
      expect(() => sanitizeSchemaName('a'.repeat(64))).toThrow();
    });

    test('trims whitespace before processing', () => {
      expect(sanitizeSchemaName('  congo  ')).toBe('congo');
    });
  });

  describe('getValidatedSchemaName', () => {
    test('accepts valid schema name', () => {
      expect(getValidatedSchemaName('tenant_congo')).toBe('tenant_congo');
    });

    test('lowercases input', () => {
      expect(getValidatedSchemaName('TENANT_CONGO')).toBe('tenant_congo');
    });

    test('accepts name with numbers', () => {
      expect(getValidatedSchemaName('tenant_v2')).toBe('tenant_v2');
    });

    test('rejects SQL injection attempt with semicolons', () => {
      expect(() => getValidatedSchemaName('tenant"; DROP TABLE--')).toThrow();
    });

    test('rejects dots (schema traversal)', () => {
      expect(() => getValidatedSchemaName('tenant.public')).toThrow();
    });

    test('rejects hyphens', () => {
      expect(() => getValidatedSchemaName('tenant-congo')).toThrow();
    });

    test('rejects empty string', () => {
      expect(() => getValidatedSchemaName('')).toThrow();
    });

    test('rejects string starting with underscore', () => {
      expect(() => getValidatedSchemaName('_tenant')).toThrow();
    });

    test('rejects single quote injection', () => {
      expect(() => getValidatedSchemaName("tenant'; --")).toThrow();
    });

    test('rejects parentheses', () => {
      expect(() => getValidatedSchemaName('tenant()')).toThrow();
    });
  });

  describe('slugToSchemaName', () => {
    test('prefixes with tenant_', () => {
      expect(slugToSchemaName('congo')).toBe('tenant_congo');
    });

    test('sanitizes before prefixing', () => {
      expect(slugToSchemaName('Congo')).toBe('tenant_congo');
    });

    test('handles slug with special chars', () => {
      expect(slugToSchemaName('congo-brazza')).toBe('tenant_congo_brazza');
    });

    test('long slug still valid after prefix', () => {
      // 'tenant_' = 7 chars, so slug can be max 63 - 7 = 56 after sanitize
      // but the prefix is applied AFTER sanitize, so total must be <= 63
      const shortSlug = 'a'.repeat(50);
      const result = slugToSchemaName(shortSlug);
      expect(result).toBe('tenant_' + shortSlug);
      expect(result.length).toBeLessThanOrEqual(63);
    });
  });
});
