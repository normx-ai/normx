import { createCipheriv, createDecipheriv, randomBytes, createHmac, scryptSync } from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;

interface EncryptedData {
  iv: string;
  data: string;
  tag: string;
}

function getKey(): Buffer {
  const keyEnv = process.env.ENCRYPTION_KEY;
  if (!keyEnv) {
    throw new Error('ENCRYPTION_KEY non definie. Generez une cle avec: node -e "require(\'crypto\').randomBytes(32).toString(\'base64\')"');
  }
  const key = Buffer.from(keyEnv, 'base64');
  if (key.length !== 32) {
    throw new Error('ENCRYPTION_KEY doit faire 32 bytes (256 bits) en base64.');
  }
  return key;
}

export function encrypt(plaintext: string): string {
  const key = getKey();
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv, { authTagLength: AUTH_TAG_LENGTH });

  let encrypted = cipher.update(plaintext, 'utf8', 'base64');
  encrypted += cipher.final('base64');
  const authTag = cipher.getAuthTag();

  const result: EncryptedData = {
    iv: iv.toString('base64'),
    data: encrypted,
    tag: authTag.toString('base64'),
  };

  return Buffer.from(JSON.stringify(result)).toString('base64');
}

export function decrypt(ciphertext: string): string {
  const key = getKey();
  const parsed: EncryptedData = JSON.parse(Buffer.from(ciphertext, 'base64').toString('utf8'));

  const iv = Buffer.from(parsed.iv, 'base64');
  const authTag = Buffer.from(parsed.tag, 'base64');
  const decipher = createDecipheriv(ALGORITHM, key, iv, { authTagLength: AUTH_TAG_LENGTH });
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(parsed.data, 'base64', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

export function hashSensitiveId(id: string): string {
  const key = getKey();
  const hmac = createHmac('sha256', key);
  hmac.update(id);
  return hmac.digest('hex').slice(0, 32);
}

export function hashPassword(password: string, existingSalt?: string): { hash: string; salt: string } {
  const saltBuffer = existingSalt ? Buffer.from(existingSalt, 'base64') : randomBytes(16);
  const hash = scryptSync(password, saltBuffer, 64);
  return {
    hash: hash.toString('hex'),
    salt: saltBuffer.toString('base64'),
  };
}

export function verifyPassword(password: string, storedHash: string, storedSalt: string): boolean {
  const { hash } = hashPassword(password, storedSalt);
  return hash === storedHash;
}

// Field-level helpers for DB read/write
export function encryptField(value: string | null): string | null {
  if (!value) return null;
  return encrypt(value);
}

export function decryptField(value: string | null): string | null {
  if (!value) return null;
  try {
    return decrypt(value);
  } catch {
    return value; // Return as-is if not encrypted (migration period)
  }
}
