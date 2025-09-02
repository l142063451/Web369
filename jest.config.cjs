const nextJest = require('next/jest')

const createJestConfig = nextJest({
  dir: './',
})

/** @type {import('jest').Config} */
const config = {
  testEnvironment: 'node',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testPathIgnorePatterns: ['<rootDir>/tests/e2e/'],
  collectCoverageFrom: [
    'app/**/*.{ts,tsx}',
    'components/**/*.{ts,tsx}',
    'lib/**/*.{ts,tsx}',
    '!**/*.d.ts',
    '!**/node_modules/**',
    '!**/tests/**'
  ],
  coverageThreshold: { 
    global: { 
      branches: 80, 
      functions: 85, 
      lines: 85, 
      statements: 85 
    } 
  },
  moduleNameMapper: { '^@/(.*)$': '<rootDir>/$1' },
}

module.exports = createJestConfig(config)