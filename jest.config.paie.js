/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  testMatch: ['<rootDir>/src/paie/__tests__/**/*.test.ts'],
  transform: {
    '^.+\\.tsx?$': ['ts-jest', {
      tsconfig: {
        target: 'ES2020',
        module: 'CommonJS',
        moduleResolution: 'node',
        esModuleInterop: true,
        strict: true,
        noImplicitAny: true,
        strictNullChecks: true,
        resolveJsonModule: true,
        skipLibCheck: true,
        jsx: 'react-jsx',
        baseUrl: 'src',
      },
    }],
  },
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  modulePaths: ['<rootDir>/src'],
};
