import '@testing-library/jest-dom';
import { matchers, createSerializer } from '@emotion/jest';
import { jest } from '@jest/globals';

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

  // ref: https://jestjs.io/docs/manual-mocks#mocking-methods-which-are-not-implemented-in-jsdom
  // ref: https://github.com/jsdom/jsdom/issues/2524
  Object.defineProperty(window, 'TextEncoder', {
    writable: true,
    value: util.TextEncoder,
  });
  Object.defineProperty(window, 'TextDecoder', {
    writable: true,
    value: util.TextDecoder,
  });
}

import * as util from 'util';

jest.setTimeout(40000);
