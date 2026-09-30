/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/*.test.ts'],
  maxWorkers: 1,
  modulePathIgnorePatterns: ['<rootDir>/dist/'],
};
