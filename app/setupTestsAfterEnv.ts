import '@testing-library/jest-dom';
import { matchers, createSerializer } from '@emotion/jest';

// Add the custom matchers provided by 'jest-emotion'
expect.extend(matchers);
expect.addSnapshotSerializer(createSerializer());

// Give tests a blank slate
if (
  typeof sessionStorage !== 'undefined' &&
  typeof localStorage !== 'undefined'
) {
  sessionStorage.clear();
  localStorage.clear();
}

// We need to add this mock since JSDOM doesn't support matchMedia
if (typeof window !== 'undefined') {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: jest.fn().mockImplementation((query) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: jest.fn(), // deprecated
      removeListener: jest.fn(), // deprecated
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    })),
  });
}

jest.setTimeout(40000);
