import cases from 'jest-in-case';

import { BitArray } from '../lib/bitArray';
import { BigInteger } from '@modern-dev/jsbn';

const B32 = '0123456789abcdefghijklmnopqrstuv';
function randomB32() {
  let result = '1';
  for (let i = 100; i > 0; --i) {
    result += B32[Math.floor(Math.random() * 32)];
  }
  return result;
}

const ONE = new BigInteger('1', 10);
const ZERO = new BigInteger('0', 10);
function activebits(a: BigInteger) {
  const active: number[] = [];
  while (!a.equals(ZERO)) {
    const b = a.bitLength() - 1;
    active.push(b);
    a = a.subtract(ONE.shiftLeft(b));
  }
  return active;
}

const testCases: Array<[string, BitArray, BigInteger, number, number, string, string, number[]]> = [];
for (let i = 0; i < 1000; i += 1) {
  const a = randomB32();
  const b = BitArray.fromString(a, 32);
  const c = new BigInteger(a, 32);
  const d = randomB32();
  const and = b.and(BitArray.fromString(d, 32)).toString(32);
  testCases.push([a, b, c, b.bitLength(), b.bitCount(), d, and, activebits(c)]);
}

test('test setBit', () => {
  for (let i = 0; i < testCases.length; i += 1) {
    const s32 = testCases[i][0];
    const activeBits = testCases[i][7];
    const bitmap = BitArray.zero();
    for (let j = 0; j < activeBits.length; j += 1) {
      bitmap.setBit(activeBits[j]);
    }
    expect(bitmap.toString(32)).toEqual(s32);
  }
});

test('test fromString/toString performance', () => {
  const ourStart = performance.now();
  for (let i = 0; i < testCases.length; i += 1) {
    expect(BitArray.fromString(testCases[i][0], 32).toString(32)).toEqual(testCases[i][0]);
  }
  const ourTotal = performance.now() - ourStart;

  const theirStart = performance.now();
  for (let i = 0; i < testCases.length; i += 1) {
    expect(new BigInteger(testCases[i][0], 32).toString(32)).toEqual(testCases[i][0]);
  }
  const theirTotal = performance.now() - theirStart;

  expect(ourTotal).toBeLessThanOrEqual(1.5 * theirTotal);
});

test('test bitLength performance', () => {
  const theirStart = performance.now();
  for (let i = 0; i < testCases.length; i += 1) {
    expect(testCases[i][2].bitLength()).toEqual(testCases[i][3]);
  }
  const theirTotal = performance.now() - theirStart;

  const ourStart = performance.now();
  for (let i = 0; i < testCases.length; i += 1) {
    expect(testCases[i][1].bitLength()).toEqual(testCases[i][3]);
  }
  const ourTotal = performance.now() - ourStart;

  expect(ourTotal).toBeLessThanOrEqual(1.5 * theirTotal);
});

test('test bitCount performance', () => {
  const theirStart = performance.now();
  for (let i = 0; i < testCases.length; i += 1) {
    expect(testCases[i][2].bitCount()).toEqual(testCases[i][4]);
  }
  const theirTotal = performance.now() - theirStart;

  const ourStart = performance.now();
  for (let i = 0; i < testCases.length; i += 1) {
    expect(testCases[i][1].bitCount()).toEqual(testCases[i][4]);
  }
  const ourTotal = performance.now() - ourStart;

  expect(ourTotal).toBeLessThanOrEqual(1.5 * theirTotal);
});

test('test and performance', () => {
  const theirStart = performance.now();
  for (let i = 0; i < testCases.length; i += 1) {
    expect(testCases[i][2].and(new BigInteger(testCases[i][5], 32)).toString(32)).toEqual(testCases[i][6]);
  }
  const theirTotal = performance.now() - theirStart;

  const ourStart = performance.now();
  for (let i = 0; i < testCases.length; i += 1) {
    expect(testCases[i][1].and(BitArray.fromString(testCases[i][5], 32)).toString(32)).toEqual(testCases[i][6]);
  }
  const ourTotal = performance.now() - ourStart;

  expect(ourTotal).toBeLessThanOrEqual(1.5 * theirTotal);
});

test('test activeBits performance', () => {
  const theirStart = performance.now();
  for (let i = 0; i < testCases.length; i += 1) {
    expect(activebits(testCases[i][2])).toEqual(testCases[i][7]);
  }
  const theirTotal = performance.now() - theirStart;

  const ourStart = performance.now();
  for (let i = 0; i < testCases.length; i += 1) {
    expect(testCases[i][1].activeBits()).toEqual(testCases[i][7]);
  }
  const ourTotal = performance.now() - ourStart;

  expect(ourTotal).toBeLessThanOrEqual(1.5 * theirTotal);
});

cases('test fromString/toString round trip', opts => {
  expect(BitArray.fromString(opts.name, 32).toString(32)).toEqual(opts.name.toLowerCase());
  expect(BitArray.fromString(BitArray.fromString(opts.name, 32).toString(64), 64).toString(32)).toEqual(opts.name.toLowerCase());
},
[
  { name: '0' },
  { name: '1' },
  { name: 'a' },
  { name: 'D' },
  { name: 'DDDDD' },
  { name: 'kjakAEOKP342EOKC1209' },
  { name: '918239182391aenokt823981232014890198417430598' }
]
);

cases('test from b32 to b64', opts => {
  expect(BitArray.fromString(opts.name, 32).toString(64)).toEqual(opts.b64);
},
[
  { name: '0', b64: '0' },
  { name: '1', b64: '1' },
  { name: 'a', b64: 'a' },
  { name: 'D', b64: 'd' },
  { name: '10', b64: 'w' },
  { name: '1v', b64: '_' },
  { name: 'DDDDD', b64: 'RHmJ' },
  { name: 'kjakAEOKP342EOKC1209', b64: 'ajlhjIkOcwDoEM8w9' },
  { name: '918239182391aenokt823981232014890198417430598', b64: '2gE4d8k26AaDnNjG13iw8xy04y4w2B10D8c1kE' },
]
);

cases('test bitLength()', opts => {
  expect(BitArray.fromString(opts.name, 32).bitLength()).toEqual(opts.len);
  expect(new BigInteger(opts.name, 32).bitLength()).toEqual(opts.len);
},
[
  { name: '0', len: 0 },
  { name: '1', len: 1 },
  { name: 'a', len: 4 },
  { name: '11', len: 6 },
  { name: '91823918239182398123', len: 99 },
  { name: '918239182391823981232014890198417430598', len: 194 },
]
);

cases('test bitCount()', opts => {
  expect(BitArray.fromString(opts.name, 32).bitCount()).toEqual(opts.len);
  expect(new BigInteger(opts.name, 32).bitCount()).toEqual(opts.len);
},
[
  { name: '0', len: 0 },
  { name: '1', len: 1 },
  { name: 'a', len: 2 },
  { name: 'b', len: 3 },
  { name: '10', len: 1 },
  { name: '11', len: 2 },
  { name: '91823918239182398123', len: 28 },
  { name: '918239182391823981232014890198417430598', len: 51 },
]
);

cases('test and()', opts => {
  expect(BitArray.fromString(opts.a, 32).and(BitArray.fromString(opts.b, 32)).toString(32)).toEqual(opts.c);
  expect(new BigInteger(opts.a, 32).and(new BigInteger(opts.b, 32)).toString(32)).toEqual(opts.c);
},
[
  { name: '0', a: '0', b: '0', c: '0' },
  { name: '0a', a: '1', b: '0', c: '0' },
  { name: '0b', a: '0', b: '1', c: '0' },
  { name: '0c', a: '30294815098', b: '0', c: '0' },
  { name: '0d', a: '0', b: '1584398751098450', c: '0' },
  { name: '1', a: '1', b: '1', c: '1' },
  { name: '1a', a: '1', b: '333415461221', c: '1' },
  { name: '1b', a: '543', b: '1', c: '1' },
  { name: '1c', a: '1', b: '2', c: '0' },
  { name: '1d', a: '63456262', b: '1', c: '0' },
  { name: 'big', a: '1024983509813509814590915', b: '43509845019840981502985', c: '101001011000800500905' },
]
);
