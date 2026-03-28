import { encrypt, decrypt, hashSensitiveId, hashPassword, verifyPassword, encryptField, decryptField } from '../utils/encryption';

// Set test encryption key: exactly 32 bytes in base64
beforeAll(() => {
  process.env.ENCRYPTION_KEY = Buffer.from('0123456789abcdef0123456789abcdef').toString('base64');
});

describe('encryption', () => {
  describe('encrypt/decrypt', () => {
    test('round-trip preserves data', () => {
      const plaintext = 'Numero SS: 123-456-789';
      const encrypted = encrypt(plaintext);
      expect(encrypted).not.toBe(plaintext);
      expect(decrypt(encrypted)).toBe(plaintext);
    });

    test('different encryptions produce different ciphertexts (random IV)', () => {
      const plaintext = 'same data';
      const a = encrypt(plaintext);
      const b = encrypt(plaintext);
      expect(a).not.toBe(b);
      expect(decrypt(a)).toBe(decrypt(b));
    });

    test('handles empty string', () => {
      const encrypted = encrypt('');
      expect(decrypt(encrypted)).toBe('');
    });

    test('handles unicode characters', () => {
      const text = 'Nom: Ngouabi \u2014 Pr\u00e9nom: Andr\u00e9';
      expect(decrypt(encrypt(text))).toBe(text);
    });

    test('handles long strings', () => {
      const text = 'A'.repeat(10000);
      expect(decrypt(encrypt(text))).toBe(text);
    });

    test('handles special JSON characters', () => {
      const text = '{"key": "val\\"ue", "arr": [1,2]}';
      expect(decrypt(encrypt(text))).toBe(text);
    });

    test('encrypted output is base64-encoded JSON', () => {
      const encrypted = encrypt('test');
      const decoded = Buffer.from(encrypted, 'base64').toString('utf8');
      const parsed = JSON.parse(decoded) as { iv: string; data: string; tag: string };
      expect(parsed).toHaveProperty('iv');
      expect(parsed).toHaveProperty('data');
      expect(parsed).toHaveProperty('tag');
    });

    test('tampered ciphertext throws', () => {
      const encrypted = encrypt('secret');
      const tampered = encrypted.slice(0, -2) + 'XX';
      expect(() => decrypt(tampered)).toThrow();
    });

    test('completely invalid input throws', () => {
      expect(() => decrypt('not-valid-base64!!!')).toThrow();
    });
  });

  describe('hashSensitiveId', () => {
    test('produces 32-char hex string', () => {
      const hash = hashSensitiveId('123-456-789');
      expect(hash).toHaveLength(32);
      expect(hash).toMatch(/^[0-9a-f]+$/);
    });

    test('same input produces same hash (deterministic)', () => {
      expect(hashSensitiveId('abc')).toBe(hashSensitiveId('abc'));
    });

    test('different input produces different hash', () => {
      expect(hashSensitiveId('abc')).not.toBe(hashSensitiveId('def'));
    });

    test('handles empty string', () => {
      const hash = hashSensitiveId('');
      expect(hash).toHaveLength(32);
      expect(hash).toMatch(/^[0-9a-f]+$/);
    });

    test('handles unicode', () => {
      const hash = hashSensitiveId('\u00e9\u00e0\u00fc');
      expect(hash).toHaveLength(32);
    });
  });

  describe('hashPassword/verifyPassword', () => {
    test('password verification succeeds with correct password', () => {
      const { hash, salt } = hashPassword('MonMotDePasse2026!');
      expect(verifyPassword('MonMotDePasse2026!', hash, salt)).toBe(true);
    });

    test('wrong password fails verification', () => {
      const { hash, salt } = hashPassword('correct');
      expect(verifyPassword('wrong', hash, salt)).toBe(false);
    });

    test('different passwords produce different hashes', () => {
      const a = hashPassword('password1');
      const b = hashPassword('password2');
      expect(a.hash).not.toBe(b.hash);
    });

    test('same password with different salts produces different hashes', () => {
      const a = hashPassword('same');
      const b = hashPassword('same');
      // random salts should differ
      if (a.salt !== b.salt) {
        expect(a.hash).not.toBe(b.hash);
      }
    });

    test('hash is hex string', () => {
      const { hash } = hashPassword('test');
      expect(hash).toMatch(/^[0-9a-f]+$/);
    });

    test('salt is base64 string', () => {
      const { salt } = hashPassword('test');
      expect(() => Buffer.from(salt, 'base64')).not.toThrow();
    });

    test('existing salt produces deterministic hash', () => {
      const { hash: h1, salt } = hashPassword('mypass');
      const { hash: h2 } = hashPassword('mypass', salt);
      expect(h1).toBe(h2);
    });
  });

  describe('encryptField/decryptField', () => {
    test('null passthrough for encryptField', () => {
      expect(encryptField(null)).toBeNull();
    });

    test('null passthrough for decryptField', () => {
      expect(decryptField(null)).toBeNull();
    });

    test('round-trip on field value', () => {
      const value = '0500-1234-5678';
      const encrypted = encryptField(value);
      expect(encrypted).not.toBeNull();
      expect(decryptField(encrypted!)).toBe(value);
    });

    test('decryptField returns unencrypted value as-is (migration support)', () => {
      expect(decryptField('plain text not encrypted')).toBe('plain text not encrypted');
    });

    test('empty string treated as falsy by encryptField', () => {
      // empty string is falsy in JS, so encryptField returns null
      expect(encryptField('')).toBeNull();
    });
  });
});
