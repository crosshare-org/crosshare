// jest.config.js
import nextJest from 'next/jest.js';

const createJestConfig = nextJest({
  // Provide the path to your Next.js app to load next.config.js and .env files in your test environment
  dir: './',
});

//const esModules = ['@firebase'];

/** @type {import('jest').Config} */
const customJestConfig = {
  testPathIgnorePatterns: [
    '<rootDir>/pages',
    '<rootDir>/nextjs',

    // TODO These are tests that are failing after the firebase/ESM upgrade.
    // We should rewrite/remove each of them.
    '<rootDir>/__tests__/FollowButton.test.tsx',
    '<rootDir>/__tests__/Builder.test.tsx',
    '<rootDir>/__tests__/ClueText.test.tsx',
    '<rootDir>/__tests__/ConstructorPage.test.tsx',
    '<rootDir>/__tests__/Puzzle.test.tsx',
    '<rootDir>/__tests__/upload.test.tsx',
    '<rootDir>/__tests__/edit.test.tsx',
    '<rootDir>/__tests__/analytics.test.ts',
    '<rootDir>/__tests__/stats.test.ts',
    '<rootDir>/__tests__/notifications.test.ts',
    '<rootDir>/__tests__/follow.test.tsx',
  ],
  testEnvironment: 'jest-environment-jsdom',
  setupFilesAfterEnv: ['<rootDir>/setupTestsAfterEnv.ts'],
  roots: ['<rootDir>/__tests__'],
  extensionsToTreatAsEsm: ['.ts', '.tsx'],
  prettierPath: require.resolve('prettier-2'),
  moduleNameMapper: {
    '^(\\.\\.?\\/.+)\\.js$': '$1',
  },
};

// createJestConfig is exported this way to ensure that next/jest can load the Next.js config which is async
// eslint-disable-next-line import/no-anonymous-default-export
export default async () => {
  const jestConfig = await createJestConfig(customJestConfig)();
  return jestConfig;
};
