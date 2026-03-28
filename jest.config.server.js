/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  testMatch: ['<rootDir>/server/__tests__/**/*.test.ts'],
  transform: {
    '^.+\\.tsx?$': ['ts-jest', {
      tsconfig: 'tsconfig.server.json',
    }],
  },
  testEnvironment: 'node',
  moduleDirectories: ['node_modules'],
  moduleNameMapper: {
    '^../utils/(.*)$': '<rootDir>/server/utils/$1',
    '^../services/(.*)$': '<rootDir>/server/services/$1',
    '^../middleware/(.*)$': '<rootDir>/server/middleware/$1',
  },
};
