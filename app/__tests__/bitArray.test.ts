import { BigInteger } from '@modern-dev/jsbn';
import cases from 'jest-in-case';
import * as BA from '../lib/bitArray';

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

const testCases: [
  string,
  BA.BitArray,
  BigInteger,
  number,
  number,
  string,
  string,
  number[]
][] = [];
for (let i = 0; i < 1000; i += 1) {
  const a = randomB32();
  const b = BA.fromString(a, 32);
  const c = new BigInteger(a, 32);
  const d = randomB32();
  const and = BA.toString(BA.and(b, BA.fromString(d, 32)), 32);
  testCases.push([
    a,
    b,
    c,
    BA.bitLength(b),
    BA.bitCount(b),
    d,
    and,
    activebits(c),
  ]);
}

test('test setBit', () => {
  for (const testCase of testCases) {
    const s32 = testCase[0];
    const activeBits = testCase[7];
    const bitmap = BA.zero();
    for (const activeBit of activeBits) {
      BA.setBit(bitmap, activeBit);
    }
    expect(BA.toString(bitmap, 32)).toEqual(s32);
    expect(BA.activeBits(bitmap)).toEqual(activeBits);
  }
});

test('test fromString/toString', () => {
  for (const testCase of testCases) {
    expect(BA.toString(BA.fromString(testCase[0], 32), 32)).toEqual(
      testCase[0]
    );
  }
  for (const testCase of testCases) {
    expect(new BigInteger(testCase[0], 32).toString(32)).toEqual(testCase[0]);
  }
});

test('test bitLength', () => {
  for (const testCase of testCases) {
    expect(testCase[2].bitLength()).toEqual(testCase[3]);
  }

  for (const testCase of testCases) {
    expect(BA.bitLength(testCase[1])).toEqual(testCase[3]);
  }
});

test('test bitCount', () => {
  for (const testCase of testCases) {
    expect(testCase[2].bitCount()).toEqual(testCase[4]);
  }
  for (const testCase of testCases) {
    expect(BA.bitCount(testCase[1])).toEqual(testCase[4]);
  }
});

test('test and', () => {
  for (const testCase of testCases) {
    expect(
      testCase[2].and(new BigInteger(testCase[5], 32)).toString(32)
    ).toEqual(testCase[6]);
  }
  for (const testCase of testCases) {
    expect(
      BA.toString(BA.and(testCase[1], BA.fromString(testCase[5], 32)), 32)
    ).toEqual(testCase[6]);
  }
});

test('test activeBits', () => {
  for (const testCase of testCases) {
    expect(activebits(testCase[2])).toEqual(testCase[7]);
  }

  for (const testCase of testCases) {
    expect(BA.activeBits(testCase[1])).toEqual(testCase[7]);
  }
});

cases(
  'test fromString/toString round trip',
  (opts) => {
    expect(BA.toString(BA.fromString(opts.name, 32), 32)).toEqual(
      opts.name.toLowerCase()
    );
    expect(
      BA.toString(
        BA.fromString(BA.toString(BA.fromString(opts.name, 32), 64), 64),
        32
      )
    ).toEqual(opts.name.toLowerCase());
  },
  [
    { name: '0' },
    { name: '1' },
    { name: 'a' },
    { name: 'D' },
    { name: 'DDDDD' },
    { name: 'kjakAEOKP342EOKC1209' },
    { name: '918239182391aenokt823981232014890198417430598' },
  ]
);

cases(
  'test from b32 to b64',
  (opts) => {
    expect(BA.toString(BA.fromString(opts.name, 32), 64)).toEqual(opts.b64);
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
    {
      name: '918239182391aenokt823981232014890198417430598',
      b64: '2gE4d8k26AaDnNjG13iw8xy04y4w2B10D8c1kE',
    },
  ]
);

cases(
  'test bitLength()',
  (opts) => {
    expect(BA.bitLength(BA.fromString(opts.name, 32))).toEqual(opts.len);
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

cases(
  'test bitCount()',
  (opts) => {
    expect(BA.bitCount(BA.fromString(opts.name, 32))).toEqual(opts.len);
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

cases(
  'test and()',
  (opts) => {
    const first = BA.fromString(opts.a, 32);
    BA.inPlaceAnd(first, BA.fromString(opts.b, 32));
    expect(BA.toString(first, 32)).toEqual(opts.c);

    expect(
      BA.toString(
        BA.and(BA.fromString(opts.a, 32), BA.fromString(opts.b, 32)),
        32
      )
    ).toEqual(opts.c);

    expect(
      new BigInteger(opts.a, 32).and(new BigInteger(opts.b, 32)).toString(32)
    ).toEqual(opts.c);
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
    {
      name: 'big',
      a: '1024983509813509814590915',
      b: '43509845019840981502985',
      c: '101001011000800500905',
    },
  ]
);
