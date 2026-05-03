import { reloadEnvForTests } from '../config/env';

const ORIGINAL_ENV = process.env;

afterEach(() => {
  process.env = ORIGINAL_ENV;
});

function setEnv(overrides: Record<string, string | undefined>): void {
  process.env = { ...ORIGINAL_ENV, ...overrides };
}

const VALID_BASE: Record<string, string> = {
  KEYCLOAK_URL: 'https://auth.example.com',
  KEYCLOAK_REALM: 'normx',
  KEYCLOAK_CLIENT_ID: 'normx-frontend',
  ENCRYPTION_KEY: 'a'.repeat(32),
  DB_HOST: 'localhost',
  DB_NAME: 'normx_db',
  DB_USER: 'normx',
};

describe('env validation', () => {
  test('valide une config minimale correcte', () => {
    setEnv({ ...VALID_BASE, NODE_ENV: undefined });
    const env = reloadEnvForTests();
    expect(env.PORT).toBe(5002);
    expect(env.LOG_LEVEL).toBe('info');
    expect(env.NODE_ENV).toBe('development');
  });

  test('crash si KEYCLOAK_URL absent', () => {
    setEnv({ ...VALID_BASE, KEYCLOAK_URL: undefined });
    expect(() => reloadEnvForTests()).toThrow(/Configuration env invalide/);
  });

  test('crash si ENCRYPTION_KEY trop court', () => {
    setEnv({ ...VALID_BASE, ENCRYPTION_KEY: 'short' });
    expect(() => reloadEnvForTests()).toThrow(/Configuration env invalide/);
  });

  test('crash si ni DATABASE_URL ni DB_HOST/DB_NAME/DB_USER', () => {
    setEnv({ ...VALID_BASE, DB_HOST: undefined, DB_NAME: undefined, DB_USER: undefined });
    expect(() => reloadEnvForTests()).toThrow(/Configuration env invalide/);
  });

  test('accepte DATABASE_URL seule (sans DB_*)', () => {
    setEnv({
      KEYCLOAK_URL: 'https://auth.example.com',
      KEYCLOAK_REALM: 'normx',
      KEYCLOAK_CLIENT_ID: 'normx-frontend',
      ENCRYPTION_KEY: 'a'.repeat(32),
      DATABASE_URL: 'postgres://u:p@host:5432/db',
      DB_HOST: undefined,
      DB_NAME: undefined,
      DB_USER: undefined,
    });
    expect(() => reloadEnvForTests()).not.toThrow();
  });

  test('ANTHROPIC_API_KEY rejete si format invalide', () => {
    setEnv({ ...VALID_BASE, ANTHROPIC_API_KEY: 'invalid-prefix' });
    expect(() => reloadEnvForTests()).toThrow(/Configuration env invalide/);
  });

  test('ANTHROPIC_API_KEY accepte si commence par sk-ant-', () => {
    setEnv({ ...VALID_BASE, ANTHROPIC_API_KEY: 'sk-ant-1234' });
    const env = reloadEnvForTests();
    expect(env.ANTHROPIC_API_KEY).toBe('sk-ant-1234');
  });

  test('ALLOWED_ORIGINS parse en tableau CSV', () => {
    setEnv({ ...VALID_BASE, ALLOWED_ORIGINS: 'http://a.com, http://b.com ,http://c.com' });
    const env = reloadEnvForTests();
    expect(env.ALLOWED_ORIGINS).toEqual(['http://a.com', 'http://b.com', 'http://c.com']);
  });

  test('AUTO_MIGRATE_TENANTS=true => boolean true', () => {
    setEnv({ ...VALID_BASE, AUTO_MIGRATE_TENANTS: 'true' });
    expect(reloadEnvForTests().AUTO_MIGRATE_TENANTS).toBe(true);
  });

  test('AUTO_MIGRATE_TENANTS absent ou !=true => boolean false', () => {
    setEnv({ ...VALID_BASE, AUTO_MIGRATE_TENANTS: 'no' });
    expect(reloadEnvForTests().AUTO_MIGRATE_TENANTS).toBe(false);
  });

  test('PORT non numerique => crash', () => {
    setEnv({ ...VALID_BASE, PORT: 'abc' });
    expect(() => reloadEnvForTests()).toThrow();
  });
});
