// jest.config.js
import nextJest from 'next/jest.js';

const createJestConfig = nextJest({
  // Provide the path to your Next.js app to load next.config.js and .env files in your test environment
  dir: './',
});

//const esModules = ['@firebase'];

/** @type {import('jest').Config} */
const customJestConfig = {
  moduleDirectories: ['node_modules', '<rootDir>/'],
  moduleNameMapper: {
    '^@firebase/auth$': require.resolve('@firebase/auth'),
    '^@firebase/util$': require.resolve('@firebase/util'),
    '^@firebase/firestore$': require.resolve('@firebase/firestore'),
    '^@firebase/storage$': require.resolve('@firebase/storage'),
    '^firebase/auth$': require.resolve('firebase/auth'),
    '^firebase/firestore$': require.resolve('firebase/firestore'),
},
    
  testEnvironment: 'jest-environment-jsdom',
  "setupFilesAfterEnv": [
    "<rootDir>/setupTestsAfterEnv.ts"
  ],
  "extensionsToTreatAsEsm": [".ts", ".tsx"],
};

// createJestConfig is exported this way to ensure that next/jest can load the Next.js config which is async
// eslint-disable-next-line import/no-anonymous-default-export
export default async () => {
  const jestConfig = await createJestConfig(customJestConfig)();
  return jestConfig;
};
  