/* eslint-disable @typescript-eslint/ban-ts-comment */

const b64ToI: Array<number> = [];
const iToB64: Array<string> = [];
const numBase = '0'.charCodeAt(0);
const lowerCaseBase = 'a'.charCodeAt(0);
const upperCaseBase = 'A'.charCodeAt(0);
for (let i = 0; i <= 9; ++i) {
  b64ToI[numBase + i] = i;
  iToB64[i] = String.fromCharCode(numBase + i);
}
for (let i = 0; i < 26; ++i) {
  b64ToI[lowerCaseBase + i] = i + 10;
  iToB64[i + 10] = String.fromCharCode(lowerCaseBase + i);
  b64ToI[upperCaseBase + i] = i + 36;
  iToB64[i + 36] = String.fromCharCode(upperCaseBase + i);
}
b64ToI['-'.charCodeAt(0)] = 62;
iToB64[62] = '-';
b64ToI['_'.charCodeAt(0)] = 63;
iToB64[63] = '_';

function popCount(v: number): number {
  v -= (v >>> 1) & 0x55555555;
  v = (v & 0x33333333) + ((v >>> 2) & 0x33333333);
  return (((v + (v >>> 4)) & 0xf0f0f0f) * 0x1010101) >>> 24;
}

export type BitArray = Array<number>;

export function zero() {
  return [0];
}

export function fromString(input: string, base: 32 | 64): BitArray {
  if (base === 32) {
    input = input.toLowerCase();
  }
  // We only use 30 bits out of 32 max but it keeps everything simple
  const bitsPerChar = base === 32 ? 5 : 6;
  const charsPerNum = base === 32 ? 6 : 5;

  const nums: Array<number> = [];
  let usedInts = 0;

  for (let i = 0; i < input.length; ++i) {
    const index = input.length - i - 1;
    // @ts-expect-error
    const x: number = b64ToI[input.charCodeAt(index)];
    const mod = i % charsPerNum;
    if (mod === 0) {
      nums[usedInts++] = x;
    } else {
      nums[usedInts - 1] |= x << (mod * bitsPerChar);
    }
  }
  return nums;
}

export function isZero(ba: BitArray): boolean {
  return ba.length === 0 || (ba.length === 1 && ba[0] === 0);
}

function clamp(ba: BitArray) {
  while (ba.length > 1 && ba[ba.length - 1] === 0) {
    ba.pop();
  }
}

export function setBit(ba: BitArray, index: number) {
  const numIndex = Math.floor(index / 30);
  const rem = index % 30;
  for (let i = ba.length; i < numIndex + 1; i += 1) {
    ba.push(0);
  }
  ba[numIndex] |= 1 << rem;
}

export function toString(ba: BitArray, base: 32 | 64) {
  const bitsPerChar = base === 32 ? 5 : 6;
  const charsPerNum = base === 32 ? 6 : 5;
  const mask = (1 << bitsPerChar) - 1;
  let s = '';
  for (let i = ba.length - 1; i >= 0; --i) {
    for (let j = charsPerNum - 1; j >= 0; --j) {
      // @ts-expect-error
      const char = iToB64[(ba[i] >> (j * bitsPerChar)) & mask];
      if (s || char !== '0') {
        s += char;
      }
    }
  }
  return s || '0';
}

export function bitLength(ba: BitArray): number {
  if (!ba.length) {
    return 0;
  }
  // @ts-expect-error
  return 30 * (ba.length - 1) + (32 - Math.clz32(ba[ba.length - 1]));
}

/** TODO we can make a faster version if we expect bit array to be sparse */
export function bitCount(ba: BitArray): number {
  let sum = 0;
  for (let i = 0; i < ba.length; i += 1) {
    if (ba[i]) {
      // @ts-expect-error
      sum += popCount(ba[i]);
    }
  }
  return sum;
}

export function and(ba: BitArray, other: BitArray) {
  const nums: Array<number> = [];
  const usedInts = Math.min(ba.length, other.length);

  for (let i = 0; i < usedInts; ++i) {
    // @ts-expect-error
    nums[i] = ba[i] & other[i];
  }

  clamp(nums);
  return nums;
}

export function inPlaceAnd(ba: BitArray, other: BitArray) {
  for (let i = 0; i < ba.length; ++i) {
    if (i < other.length) {
      // @ts-expect-error
      ba[i] &= other[i];
    } else {
      ba[i] = 0;
    }
  }
  clamp(ba);
}

export function activeBits(ba: BitArray): Array<number> {
  const ret = [];
  for (let i = ba.length - 1; i >= 0; i--) {
    let num = ba[i];
    while (num !== 0) {
      // @ts-expect-error
      const t = 31 - Math.clz32(num);
      // @ts-expect-error
      num ^= 1 << t;
      ret.push(i * 30 + t);
    }
  }
  return ret;
}
