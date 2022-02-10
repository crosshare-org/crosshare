// __test-utils__/custom-jest-environment.js
// Stolen from: https://github.com/ipfs/jest-environment-aegir/blob/master/src/index.js
// Overcomes error from jest internals.. this thing: https://github.com/facebook/jest/issues/6248

import * as JSDomEnvironment from 'jest-environment-jsdom';

import { TextDecoder, TextEncoder } from 'util';

class MyEnvironment extends JSDomEnvironment {
  constructor(config) {
    super(
      Object.assign({}, config, {
        globals: Object.assign({}, config.globals, {
          Uint32Array: Uint32Array,
          Uint8Array: Uint8Array,
          ArrayBuffer: ArrayBuffer,
          setImmediate: setImmediate,
          TextEncoder: TextEncoder,
          TextDecoder: TextDecoder,
        }),
      })
    );
  }

  async setup() {
    /* noop */
  }

  async teardown() {
    /* noop */
  }
}

module.exports = MyEnvironment;