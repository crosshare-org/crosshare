// __test-utils__/custom-jest-environment.js
// Stolen from: https://github.com/ipfs/jest-environment-aegir/blob/master/src/index.js
// Overcomes error from jest internals.. this thing: https://github.com/facebook/jest/issues/6248
'use strict';

// eslint-disable-next-line
const JSDomEnvironment = require('jest-environment-jsdom');

class MyEnvironment extends JSDomEnvironment {
  constructor(config) {
    super(
      Object.assign({}, config, {
        globals: Object.assign({}, config.globals, {
          Uint32Array: Uint32Array,
          Uint8Array: Uint8Array,
          ArrayBuffer: ArrayBuffer,
        }),
      }),
    );
  }

  async setup() {
    /* noop */ }

  async teardown() {
    /* noop */ }

}

module.exports = MyEnvironment;