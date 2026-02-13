// jest.config.js
import nextJest from 'next/jest.js';

const createJestConfig = nextJest({
  // Provide the path to your Next.js app to load next.config.js and .env files in your test environment
  dir: './',
});

//const esModules = ['@firebase'];

/** @type {import('jest').Config} */
const customJestConfig = {
  testPathIgnorePatterns: ['<rootDir>/pages', '<rootDir>/nextjs'],
  testEnvironment: 'jest-environment-jsdom',
  setupFilesAfterEnv: ['<rootDir>/setupTestsAfterEnv.ts'],
  roots: ['<rootDir>/__tests__'],
  extensionsToTreatAsEsm: ['.ts', '.tsx'],
  moduleNameMapper: {
    '^(\\.\\.?\\/.+)\\.js$': '$1',
  },
};

// createJestConfig is exported this way to ensure that next/jest can load the Next.js config which is async
const cJC = async () => {
  const jestConfig = await createJestConfig(customJestConfig)();
  return jestConfig;
};
export default cJC;
